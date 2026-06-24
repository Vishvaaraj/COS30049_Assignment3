import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Plot from '../charts/Plot.jsx';
import { usePrediction } from '../state/PredictionContext.jsx';
import SeverityBadge from '../components/SeverityBadge.jsx';
import { EmptyState } from '../components/Feedback.jsx';
import { downloadTextFile } from '../utils/predictionCsv';
import { plotlyDarkLayout, plotlyConfig, SEVERITY_COLOR, ACCENT_BEACON } from '../charts/plotlyTheme';
import { FEATURE_SPECS } from '../data/featureSpecs';
import './PredictionResult.css';

function Toast({ message, show, onDismiss }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onDismiss, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  return <div className={`toast ${show ? 'show' : ''}`}>{message}</div>;
}

function ClassBadge({ cls }) {
  return (
    <span className="class-badge" style={{ '--class-color': SEVERITY_COLOR[cls] || ACCENT_BEACON }}>
      {cls}
    </span>
  );
}

function ProbabilityBars({ probabilities }) {
  const entries = Object.entries(probabilities || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className="prob-bars">
      {entries.map(([cls, prob]) => (
        <div className="prob-bar-row" key={cls}>
          <span className="prob-bar-label">{cls}</span>
          <div className="prob-bar-track">
            <div
              className="prob-bar-fill"
              style={{ width: `${prob * 100}%`, background: SEVERITY_COLOR[cls] || ACCENT_BEACON }}
            />
          </div>
          <span className="prob-bar-value num">{(prob * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

export default function PredictionResult() {
  const navigate = useNavigate();
  const { result, fileName, runs, selectedRunId, setSelectedRunId, selectedRun } = usePrediction();

  const [expandedRowId, setExpandedRowId] = useState(null);
  const [sortKey, setSortKey] = useState('row_id');
  const [sortDir, setSortDir] = useState('asc');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Report exported');

  useEffect(() => {
    setExpandedRowId(null);
  }, [selectedRunId]);

  const summary = useMemo(() => {
    if (!result) return null;
    const avgConfidence = result.rows.reduce((s, r) => s + r.confidence, 0) / result.rows.length;
    const avgInference = result.rows.reduce((s, r) => s + r.inference_time_ms, 0) / result.rows.length;
    return { avgConfidence, avgInference };
  }, [result]);

  const sortedRows = useMemo(() => {
    if (!result) return [];
    const rows = [...result.rows];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [result, sortKey, sortDir]);

  const warningRows = useMemo(
    () => (result ? result.rows.filter((r) => r.warnings && r.warnings.length > 0) : []),
    [result]
  );

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function toggleExpand(rowId) {
    setExpandedRowId((prev) => (prev === rowId ? null : rowId));
  }

  function exportCsv() {
    if (!selectedRun?.outputCsv) return;
    const base = selectedRun.fileName.replace(/\.[^.]+$/, '') || 'prediction';
    downloadTextFile(selectedRun.outputCsv, `${base}-results.csv`);
    setToastMessage('Results exported');
    setShowToast(true);
  }

  function downloadInputCsv() {
    if (!selectedRun?.inputCsv) return;
    const base = selectedRun.fileName.replace(/\.[^.]+$/, '') || 'input';
    downloadTextFile(selectedRun.inputCsv, `${base}-input.csv`);
    setToastMessage('Input data exported');
    setShowToast(true);
  }

  if (!result || runs.length === 0) {
    return (
      <div className="page-result">
        <div className="page-header">
          <h2>Prediction Result</h2>
        </div>
        <EmptyState title="No classification run yet" hint="Submit a file or manual entry on Analyse Traffic to see results here." />
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/analyse')}>
          Go to Analyse Traffic
        </button>
      </div>
    );
  }

  const classCounts = result.summary.class_counts;
  const classLabels = Object.keys(classCounts);
  const classValues = Object.values(classCounts);

  const summaryDonut = (
    <Plot
      data={[
        {
          type: 'pie',
          labels: classLabels,
          values: classValues,
          hole: 0.55,
          marker: { colors: classLabels.map((c) => SEVERITY_COLOR[c] || ACCENT_BEACON) },
          textinfo: 'label+value',
          hovertemplate: '<b>%{label}</b><br>%{value} rows<extra></extra>',
        },
      ]}
      layout={plotlyDarkLayout({ height: 160, margin: { t: 0, r: 0, b: 0, l: 0 }, showlegend: false })}
      config={{ ...plotlyConfig, displayModeBar: false }}
      style={{ width: 140, height: 160 }}
    />
  );

  const confidenceHistogram = (
    <Plot
      data={classLabels.map((cls) => ({
        x: result.rows.filter((r) => r.predicted_class === cls).map((r) => r.confidence),
        type: 'histogram',
        name: cls,
        opacity: 0.75,
        marker: { color: SEVERITY_COLOR[cls] || ACCENT_BEACON },
        xbins: { start: 0, end: 1, size: 0.1 },
      }))}
      layout={plotlyDarkLayout({
        height: 240,
        barmode: 'overlay',
        margin: { t: 10, r: 20, b: 40, l: 44 },
        xaxis: { title: 'Confidence', tickformat: '.0%', range: [0, 1] },
        yaxis: { title: 'Rows', gridcolor: '#232C36' },
      })}
      config={plotlyConfig}
      style={{ width: '100%' }}
      useResizeHandler
    />
  );

  return (
    <div className="page-result">
      <div className="page-header">
        <h2>Prediction Result</h2>
        <p className="page-sub">
          {fileName} · {result.summary.total_rows} rows · {result.summary.model_used.replace('_', ' ')}
        </p>
      </div>

      {runs.length > 1 && (
        <div className="card card-pad run-history-bar">
          <div className="section-title">
            <span>Run history</span>
            <span className="eyebrow">{runs.length} saved run{runs.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="run-history-list">
            {runs.map((run) => (
              <button
                key={run.id}
                type="button"
                className={`run-history-item ${run.id === selectedRunId ? 'run-history-item-active' : ''}`}
                onClick={() => setSelectedRunId(run.id)}
              >
                <span className="run-history-time num">{new Date(run.timestamp).toLocaleString()}</span>
                <span className="run-history-meta">
                  {run.fileName} · {run.rowCount} rows · {run.model.replace('_', ' ')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedRun?.inputCsvTruncated && (
        <div className="card card-pad input-truncated-hint">
          Input CSV was too large to store in the browser. Re-export is unavailable for this run; run classification again if you need a copy.
        </div>
      )}

      <div className="card card-pad result-summary-header">
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="eyebrow">Total rows</span>
            <span className="summary-stat-value num">{result.summary.total_rows}</span>
          </div>
          <div className="summary-stat">
            <span className="eyebrow">Avg confidence</span>
            <span className="summary-stat-value num">{(summary.avgConfidence * 100).toFixed(1)}%</span>
          </div>
          <div className="summary-stat">
            <span className="eyebrow">Avg inference</span>
            <span className="summary-stat-value num">{summary.avgInference.toFixed(1)} ms</span>
          </div>
          <div className="summary-stat">
            <span className="eyebrow">Model</span>
            <span className="summary-stat-value">{result.summary.model_used.replace('_', ' ')}</span>
          </div>
        </div>
        <div className="summary-breakdown">
          <div className="summary-breakdown-chart">{summaryDonut}</div>
          <div className="summary-breakdown-legend">
            {classLabels.map((cls) => (
              <div className="summary-legend-row" key={cls}>
                <span className="legend-swatch" style={{ background: SEVERITY_COLOR[cls] }} />
                <span>{cls}</span>
                <span className="num legend-count">{classCounts[cls]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {warningRows.length > 0 && (
        <div className="card card-pad warnings-panel">
          <div className="section-title">
            <span>Data quality warnings</span>
            <span className="eyebrow">{warningRows.length} row{warningRows.length !== 1 ? 's' : ''}</span>
          </div>
          <ul className="warnings-list">
            {warningRows.map((r) =>
              r.warnings.map((w, i) => (
                <li key={`${r.row_id}-${i}`}>
                  <span className="num">Row #{r.row_id}</span> — {w}
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      <div className="card card-pad" style={{ marginTop: 18 }}>
        <div className="section-title">
          <span>Per-row results</span>
          <span className="eyebrow">Expand a row for full probability distribution</span>
        </div>
        <div className="data-table-wrap">
          <table className="data-table result-table">
            <thead>
              <tr>
                <th aria-label="Expand" />
                <th onClick={() => toggleSort('row_id')}>
                  Row {sortKey === 'row_id' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                </th>
                <th onClick={() => toggleSort('predicted_class')}>
                  Class {sortKey === 'predicted_class' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                </th>
                <th onClick={() => toggleSort('severity')}>
                  Severity {sortKey === 'severity' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                </th>
                <th onClick={() => toggleSort('confidence')}>
                  Confidence {sortKey === 'confidence' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                </th>
                <th onClick={() => toggleSort('inference_time_ms')}>
                  Inference {sortKey === 'inference_time_ms' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => (
                <React.Fragment key={r.row_id}>
                  <tr className="result-row" onClick={() => toggleExpand(r.row_id)}>
                    <td className="expand-cell">{expandedRowId === r.row_id ? '▾' : '▸'}</td>
                    <td className="num">#{r.row_id}</td>
                    <td>
                      <ClassBadge cls={r.predicted_class} />
                    </td>
                    <td>
                      <SeverityBadge level={r.severity} />
                    </td>
                    <td className="num">{(r.confidence * 100).toFixed(1)}%</td>
                    <td className="num">{r.inference_time_ms} ms</td>
                  </tr>
                  {expandedRowId === r.row_id && (
                    <tr className="expanded-row">
                      <td colSpan={6}>
                        <div className="expanded-content">
                          <div className="expanded-section">
                            <div className="expanded-title">Probability distribution</div>
                            <ProbabilityBars probabilities={r.probabilities} />
                          </div>
                          <div className="expanded-section">
                            <div className="expanded-title">Submitted features</div>
                            <dl className="feature-dl">
                              {FEATURE_SPECS.map((f) => (
                                <div className="feature-dl-item" key={f.key}>
                                  <dt>{f.label}</dt>
                                  <dd className="num">{r.features?.[f.key] ?? '—'}</dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 18 }}>
        <div className="section-title">
          <span>Confidence distribution by predicted class</span>
          <span className="eyebrow">Low-confidence peaks = uncertain predictions</span>
        </div>
        {confidenceHistogram}
      </div>

      <div className="action-row">
        <button className="btn" onClick={() => navigate('/')} type="button">
          Back to dashboard
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/analyse')} type="button">
          Run another batch
        </button>
        {selectedRun?.inputCsv && (
          <button className="btn btn-secondary" onClick={downloadInputCsv} type="button">
            Download input (.csv)
          </button>
        )}
        <button className="btn btn-primary" onClick={exportCsv} type="button">
          Export results (.csv)
        </button>
      </div>

      <Toast message={toastMessage} show={showToast} onDismiss={() => setShowToast(false)} />
    </div>
  );
}
