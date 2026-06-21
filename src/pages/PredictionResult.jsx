import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Plot from '../charts/Plot.jsx';
import { usePrediction } from '../state/PredictionContext.jsx';
import { fetchModelStats } from '../api/client';
import SeverityBadge from '../components/SeverityBadge.jsx';
import { LoadingBlock, ErrorBanner, EmptyState } from '../components/Feedback.jsx';
import { plotlyDarkLayout, plotlyConfig, SEVERITY_COLOR } from '../charts/plotlyTheme';
import { RECOMMENDED_RESPONSE } from '../data/responsePlaybook';
import './PredictionResult.css';

function Toast({ message, show, onDismiss }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  return (
    <div className={`toast ${show ? 'show' : ''}`}>
      {message}
    </div>
  );
}

export default function PredictionResult() {
  const navigate = useNavigate();
  const { result, fileName } = usePrediction();

  const [selectedRowId, setSelectedRowId] = useState(0);
  const [sortKey, setSortKey] = useState('row_id');
  const [sortDir, setSortDir] = useState('asc');
  const [importanceSortDesc, setImportanceSortDesc] = useState(true);

  const [modelStats, setModelStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!result) return;
    let active = true;
    setStatsLoading(true);
    fetchModelStats(result.summary.model_used)
      .then((data) => active && setModelStats(data))
      .catch((e) => active && setStatsError(e.message || 'Failed to load model stats.'))
      .finally(() => active && setStatsLoading(false));
    return () => {
      active = false;
    };
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

  const selectedRow = result ? result.rows.find((r) => r.row_id === selectedRowId) || result.rows[0] : null;

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function exportCsv() {
    if (!result) return;
    const headers = ['row_id', 'predicted_class', 'confidence', 'severity', 'model_used', 'inference_time_ms'];
    const lines = [headers.join(',')];
    result.rows.forEach((r) => {
      lines.push([r.row_id, r.predicted_class, r.confidence, r.severity, r.model_used, r.inference_time_ms].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prediction_report.csv';
    a.click();
    URL.revokeObjectURL(url);
    setShowToast(true);
  }

  if (!result) {
    return (
      <div className="page-result">
        <div className="page-header">
          <h2>Prediction Result</h2>
        </div>
        <EmptyState
          title="No classification run yet"
          hint="Submit a file or manual entry on Analyse Traffic to see results here."
        />
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/analyse')}>
          Go to Analyse Traffic
        </button>
      </div>
    );
  }

  const playbook = RECOMMENDED_RESPONSE[selectedRow.severity] || RECOMMENDED_RESPONSE.Low;

  const probChart = (
    <Plot
      data={[
        {
          x: Object.values(selectedRow.probabilities),
          y: Object.keys(selectedRow.probabilities),
          type: 'bar',
          orientation: 'h',
          marker: { color: Object.keys(selectedRow.probabilities).map((k) => SEVERITY_COLOR[k] || '#4ea8de') },
          hovertemplate: '<b>%{y}</b><br>%{x:.1%}<extra></extra>',
        },
      ]}
      layout={plotlyDarkLayout({
        height: 230,
        margin: { t: 10, r: 30, b: 30, l: 70 },
        xaxis: { tickformat: '.0%', range: [0, 1], gridcolor: '#1c2536' },
      })}
      config={plotlyConfig}
      style={{ width: '100%' }}
      useResizeHandler
    />
  );

  const importanceEntries = modelStats ? Object.entries(modelStats.feature_importance) : [];
  importanceEntries.sort((a, b) => (importanceSortDesc ? b[1] - a[1] : a[1] - b[1]));

  const importanceChart = modelStats && (
    <Plot
      data={[
        {
          x: importanceEntries.map((e) => e[1]),
          y: importanceEntries.map((e) => e[0]),
          type: 'bar',
          orientation: 'h',
          marker: { color: '#2dd4f0' },
          hovertemplate: '<b>%{y}</b><br>importance %{x:.3f}<extra></extra>',
        },
      ]}
      layout={plotlyDarkLayout({
        height: 280,
        margin: { t: 10, r: 30, b: 30, l: 100 },
        yaxis: { automargin: true },
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
          {fileName} · {result.summary.total_rows} rows classified · model: {result.summary.model_used}
        </p>
      </div>

      <div className="card card-pad">
        <div className="section-title">
          <span>Per-row results</span>
          <span className="eyebrow">Click a row for detail</span>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('row_id')}>Row {sortKey === 'row_id' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}</th>
                <th onClick={() => toggleSort('predicted_class')}>Predicted class {sortKey === 'predicted_class' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}</th>
                <th onClick={() => toggleSort('severity')}>Severity {sortKey === 'severity' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}</th>
                <th onClick={() => toggleSort('confidence')}>Confidence {sortKey === 'confidence' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}</th>
                <th onClick={() => toggleSort('inference_time_ms')}>Inference {sortKey === 'inference_time_ms' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => (
                <tr
                  key={r.row_id}
                  className={r.row_id === selectedRow.row_id ? 'row-selected' : ''}
                  onClick={() => setSelectedRowId(r.row_id)}
                >
                  <td className="num">#{r.row_id}</td>
                  <td>{r.predicted_class}</td>
                  <td>
                    <SeverityBadge level={r.severity} />
                  </td>
                  <td className="num">{(r.confidence * 100).toFixed(1)}%</td>
                  <td className="num">{r.inference_time_ms} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="result-grid">
        <div className="card card-pad verdict-card">
          <div className="eyebrow">Row #{selectedRow.row_id} verdict</div>
          <div className="verdict-class" style={{ color: SEVERITY_COLOR[selectedRow.predicted_class] }}>
            {selectedRow.predicted_class}
          </div>
          <div className="verdict-confidence num">{(selectedRow.confidence * 100).toFixed(1)}% confidence</div>
          <div className="verdict-meta">
            <span>Model: <strong>{selectedRow.model_used}</strong></span>
            <span>Inference: <strong className="num">{selectedRow.inference_time_ms} ms</strong></span>
          </div>
          <SeverityBadge level={selectedRow.severity} />
        </div>

        <div className="card card-pad">
          <div className="section-title">
            <span>Class probability distribution</span>
          </div>
          {probChart}
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 18 }}>
        <div className="section-title">
          <span>Feature importance — {result.summary.model_used}</span>
          <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setImportanceSortDesc((v) => !v)}>
            Sort: {importanceSortDesc ? 'highest first' : 'lowest first'}
          </button>
        </div>
        {statsLoading && <LoadingBlock label="Loading feature importance" />}
        {statsError && <ErrorBanner message={statsError} />}
        {!statsLoading && !statsError && importanceChart}
      </div>

      <div className="card card-pad" style={{ marginTop: 18 }}>
        <div className="section-title">
          <span>Recommended response</span>
          <span className="eyebrow">Urgency: {playbook.urgency}</span>
        </div>
        <p className="playbook-text">{playbook.action}</p>
      </div>

      <div className="action-row">
        <button className="btn" onClick={() => navigate('/')} type="button">
          Back to dashboard
        </button>
        <button className="btn btn-primary" onClick={exportCsv} type="button">
          Export report (.csv)
        </button>
      </div>
      
      <Toast message="Report exported" show={showToast} onDismiss={() => setShowToast(false)} />
    </div>
  );
}