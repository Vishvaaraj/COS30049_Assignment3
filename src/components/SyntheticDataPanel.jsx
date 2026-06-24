import React, { useState } from 'react';
import { downloadSyntheticCsv, fetchSyntheticData, syntheticCsvToFile } from '../api/client';
import { ErrorBanner } from './Feedback.jsx';

export const DEFAULT_SYNTH_SETTINGS = { count: 25, mix: 'realistic', jitter: 0.08 };

const MIX_OPTIONS = [
  { value: 'realistic', label: 'Realistic mix', hint: 'Same class proportions as training data' },
  { value: 'balanced', label: 'Balanced', hint: 'Equal rows per class' },
  { value: 'rare_focus', label: 'Rare-class focus', hint: 'Oversample R2L and U2R' },
  { value: 'single:Normal', label: 'Normal only', hint: 'All rows from Normal class' },
  { value: 'single:DoS', label: 'DoS only', hint: 'All rows from DoS class' },
  { value: 'single:Probe', label: 'Probe only', hint: 'All rows from Probe class' },
  { value: 'single:R2L', label: 'R2L only', hint: 'All rows from R2L class' },
  { value: 'single:U2R', label: 'U2R only', hint: 'All rows from U2R class' },
];

export default function SyntheticDataPanel({ settings, onSettingsChange, onLoadFile }) {
  const { count, mix, jitter } = settings;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleDownload() {
    setError(null);
    setLoading(true);
    try {
      await downloadSyntheticCsv({ count, mix, jitter });
    } catch (e) {
      setError(e.message || 'Download failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateAndLoad() {
    setError(null);
    setLoading(true);
    try {
      const csv = await fetchSyntheticData({ count, mix, jitter });
      const file = syntheticCsvToFile(csv);
      onLoadFile(file);
    } catch (e) {
      setError(e.message || 'Generation failed.');
    } finally {
      setLoading(false);
    }
  }

  const jitterLabel =
    jitter <= 0.05 ? 'Very close to real captures' : jitter <= 0.12 ? 'Moderate variation' : 'High stress-test variation';

  return (
    <div className="card card-pad synthetic-panel">
      <div className="section-title">
        <span>Test data generator</span>
        <span className="eyebrow">Bootstrap from real traffic</span>
      </div>

      <div className="synthetic-controls">
        <div className="synthetic-field">
          <label htmlFor="syn-count">Row count</label>
          <div className="synthetic-count-row">
            <input
              id="syn-count"
              type="range"
              min={5}
              max={500}
              step={5}
              value={count}
              onChange={(e) => onSettingsChange({ ...settings, count: Number(e.target.value) })}
            />
            <span className="num synthetic-count-value">{count}</span>
          </div>
        </div>

        <div className="synthetic-field">
          <label htmlFor="syn-mix">Class mix</label>
          <select
            id="syn-mix"
            value={mix}
            onChange={(e) => onSettingsChange({ ...settings, mix: e.target.value })}
          >
            {MIX_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="synthetic-hint">{MIX_OPTIONS.find((o) => o.value === mix)?.hint}</span>
        </div>

        <div className="synthetic-field">
          <label htmlFor="syn-jitter">Jitter strength</label>
          <div className="synthetic-count-row">
            <input
              id="syn-jitter"
              type="range"
              min={0}
              max={0.3}
              step={0.01}
              value={jitter}
              onChange={(e) => onSettingsChange({ ...settings, jitter: Number(e.target.value) })}
            />
            <span className="num synthetic-count-value">{jitter.toFixed(2)}</span>
          </div>
          <span className="synthetic-hint">
            {jitterLabel} — higher = less like real captured traffic, more stress-test
          </span>
        </div>
      </div>

      <div className="synthetic-actions">
        <button className="btn btn-secondary" type="button" onClick={handleDownload} disabled={loading}>
          Download CSV
        </button>
        <button className="btn btn-primary" type="button" onClick={handleGenerateAndLoad} disabled={loading}>
          {loading ? `Generating ${count} rows…` : 'Generate & load into uploader'}
        </button>
      </div>

      <p className="synthetic-caption">
        Rows are built from real recorded traffic with small variations — not invented from scratch — so predictions stay meaningful.
        Up to 500 rows per batch.
      </p>

      {error && (
        <div style={{ marginTop: 12 }}>
          <ErrorBanner message={error} />
        </div>
      )}
    </div>
  );
}
