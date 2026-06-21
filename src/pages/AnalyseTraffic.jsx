import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { submitPrediction, fetchModelStats } from '../api/client';
import { usePrediction } from '../state/PredictionContext.jsx';
import { FEATURE_SPECS, emptyFeatureState, validateFeatures, featuresToCsvFile } from '../data/featureSpecs';
import { ErrorBanner } from '../components/Feedback.jsx';
import './AnalyseTraffic.css';

const AVAILABLE_MODELS = [
  { id: 'random_forest', label: 'Random Forest' },
  { id: 'xgboost', label: 'XGBoost' },
  { id: 'kmeans', label: 'K-Means' },
];

export default function AnalyseTraffic() {
  const navigate = useNavigate();
  const { setResult, setFileName } = usePrediction();

  const [mode, setMode] = useState('upload'); // 'upload' | 'manual'
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [fileSummary, setFileSummary] = useState(null); // { rows: number, cols: number }

  const [featureValues, setFeatureValues] = useState(emptyFeatureState());
  const [touched, setTouched] = useState({});

  const [model, setModel] = useState('random_forest');
  const [modelStats, setModelStats] = useState({});
  const [loadingStats, setLoadingStats] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    async function loadAllModelStats() {
      setLoadingStats(true);
      try {
        const statsPromises = AVAILABLE_MODELS.map((m) => fetchModelStats(m.id));
        const statsResults = await Promise.all(statsPromises);
        const statsMap = statsResults.reduce((acc, stats, index) => {
          acc[AVAILABLE_MODELS[index].id] = stats;
          return acc;
        }, {});
        setModelStats(statsMap);
      } catch (error) {
        console.error('Failed to load model stats', error);
        setSubmitError('Could not load model performance data. Please refresh the page.');
      } finally {
        setLoadingStats(false);
      }
    }
    loadAllModelStats();
  }, []);

  const errors = useMemo(() => validateFeatures(featureValues), [featureValues]);
  const manualValid = mode === 'manual' && Object.keys(errors).length === 0;

  const onDrop = useCallback((accepted, rejected) => {
    setFileError(null);
    setFileSummary(null);
    if (rejected && rejected.length > 0) {
      setFileError('Only .csv or .json files are accepted.');
      return;
    }
    const f = accepted[0];
    if (!f) return;

    f.text()
      .then((text) => {
        const lines = text.trim().split('\n');
        const header = lines[0] || '';
        const cols = header.split(',').filter(Boolean).length;
        const rows = lines.length > 1 ? lines.length - 1 : 0;
        setFileSummary({ rows, cols });
        f.estimatedRows = rows > 0 ? rows : 1;
      })
      .catch(() => {
        setFileError('Could not read the file contents.');
      });

    setFile(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'text/csv': ['.csv'], 'application/json': ['.json'] },
    maxSize: 50 * 1024 * 1024,
  });

  function handleFeatureChange(key, value) {
    setFeatureValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleBlur(key) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  const canSubmit = mode === 'upload' ? !!file && !fileError : manualValid;

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const payloadFile = mode === 'upload' ? file : featuresToCsvFile(featureValues);
      const data = await submitPrediction(payloadFile, model);
      setResult(data);
      setFileName(mode === 'upload' ? file.name : 'Manual entry');
      navigate('/result');
    } catch (e) {
      setSubmitError(e.message || 'Classification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetFields() {
    setFile(null);
    setFileError(null);
    setFileSummary(null);
    setFeatureValues(emptyFeatureState());
    setTouched({});
    setSubmitError(null);
  }

  function handleResetClick() {
    const hasData = (mode === 'upload' && file !== null) || (mode === 'manual' && Object.values(featureValues).some(v => v !== ''));
    if (hasData) {
      setShowResetModal(true);
    } else {
      resetFields();
    }
  }

  function confirmReset() {
    resetFields();
    setShowResetModal(false);
  }

  return (
    <div className="page-analyse">
      <div className="page-header">
        <h2>Analyse Traffic</h2>
        <p className="page-sub">Submit a capture file or enter feature values manually to classify network flows.</p>
      </div>

      <div className="analyse-grid">
        <div className="card card-pad">
          <div className="mode-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={mode === 'upload'}
              className={`mode-tab ${mode === 'upload' ? 'mode-tab-active' : ''}`}
              onClick={() => setMode('upload')}
            >
              Upload file
            </button>
            <button
              role="tab"
              aria-selected={mode === 'manual'}
              className={`mode-tab ${mode === 'manual' ? 'mode-tab-active' : ''}`}
              onClick={() => setMode('manual')}
            >
              Manual entry
            </button>
          </div>

          {mode === 'upload' ? (
            <div>
              <div
                {...getRootProps()}
                className={`dropzone ${isDragActive ? 'dropzone-active' : ''} ${fileError ? 'dropzone-error' : ''}`}
              >
                <input {...getInputProps()} />
                <UploadCloudIcon />
                {file ? (
                  <>
                    <div className="dropzone-filename">{file.name}</div>
                    <div className="dropzone-hint">{(file.size / 1024).toFixed(1)} KB · click or drop to replace</div>
                  </>
                ) : (
                  <>
                    <div className="dropzone-title">Drop your file here</div>
                    <div className="dropzone-hint">.csv or .json · up to 50 MB · predictions returned for every row</div>
                  </>
                )}
              </div>
              {file && fileSummary && (
                <div className="file-summary-row">
                  <span className={fileSummary.cols !== 9 ? 'field-error' : ''}>
                    Detected {fileSummary.rows} rows × {fileSummary.cols} columns.
                    {fileSummary.cols !== 9 && ' Warning: Expected 9 columns for NSL-KDD.'}
                  </span>
                </div>
              )}
              {fileError && <div className="field-error" style={{ marginTop: 10 }}>{fileError}</div>}
            </div>
          ) : (
            <div className="feature-grid">
              {FEATURE_SPECS.map((f) => {
                const showError = touched[f.key] && errors[f.key];
                return (
                  <div className="feature-field" key={f.key}>
                    <label htmlFor={f.key}>
                      {f.label}
                      {f.unit && <span className="feature-unit"> ({f.unit})</span>}
                    </label>
                    {f.type === 'select' ? (
                      <select
                        id={f.key}
                        value={featureValues[f.key]}
                        onChange={(e) => handleFeatureChange(f.key, e.target.value)}
                        onBlur={() => handleBlur(f.key)}
                        className={showError ? 'input-error' : ''}
                      >
                        <option value="" disabled>
                          Select…
                        </option>
                        {f.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={f.key}
                        type={f.type === 'number' ? 'number' : 'text'}
                        step={f.step}
                        placeholder={f.placeholder}
                        value={featureValues[f.key]}
                        onChange={(e) => handleFeatureChange(f.key, e.target.value)}
                        onBlur={() => handleBlur(f.key)}
                        className={showError ? 'input-error' : ''}
                      />
                    )}
                    {showError && <div className="field-error">{errors[f.key]}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div className="section-title">
            <span>Select model</span>
            <span className="eyebrow">Live accuracy from backend</span>
          </div>
          <div className="model-grid">
            {AVAILABLE_MODELS.map((m) => {
              const stats = modelStats[m.id];
              const accuracy = loadingStats ? 'Loading…' : stats ? `${(stats.accuracy * 100).toFixed(2)}%` : 'N/A';
              return (
                <button
                  key={m.id}
                  className={`model-card ${model === m.id ? 'model-card-active' : ''}`}
                  onClick={() => setModel(m.id)}
                  type="button"
                  disabled={loadingStats}
                >
                  <div className="model-name">{m.label}</div>
                  <div className="model-accuracy num">{accuracy}</div>
                  <div className="eyebrow">accuracy</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {submitError && (
        <div style={{ marginTop: 18 }}>
          <ErrorBanner message={submitError} onRetry={handleSubmit} />
        </div>
      )}

      <div className="action-row">
        <button className="btn" onClick={handleResetClick} type="button" disabled={submitting}>
          Reset fields
        </button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit || submitting} type="button">
          {submitting ? 'Running classification…' : 'Run classification'}
        </button>
      </div>

      {showResetModal && (
        <div className="modal-backdrop">
          <div className="modal-content card">
            <h3>Clear all entered values?</h3>
            <p>This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowResetModal(false)}>Cancel</button>
              <button className="btn btn-danger-outline" onClick={confirmReset}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadCloudIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 18a4.6 4.6 0 01-.6-9.16A6 6 0 0118 8.5a4 4 0 01-1 7.9" />
      <path d="M12 12v7" />
      <path d="M9.5 14.5L12 12l2.5 2.5" />
    </svg>
  );
}
