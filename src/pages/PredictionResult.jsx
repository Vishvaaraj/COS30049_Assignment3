import React, { useEffect, useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import Plot from '../charts/Plot.jsx';

import { usePrediction } from '../state/PredictionContext.jsx';

import SeverityBadge from '../components/SeverityBadge.jsx';

import { EmptyState, LoadingBlock, ErrorBanner } from '../components/Feedback.jsx';

import { downloadTextFile, buildOutputCsv } from '../utils/predictionCsv';

import { resolveRowSeverity, compareSeverity } from '../utils/severity';

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



function RunSessionPanel({ run, isOpen, onToggle, onToast }) {

  const result = run.result;

  const [expandedRowId, setExpandedRowId] = useState(null);

  const [sortKey, setSortKey] = useState('row_id');

  const [sortDir, setSortDir] = useState('asc');



  useEffect(() => {

    if (!isOpen) setExpandedRowId(null);

  }, [isOpen]);



  const summary = useMemo(() => {

    if (!result?.rows?.length) return null;

    const avgConfidence = result.rows.reduce((s, r) => s + r.confidence, 0) / result.rows.length;

    const avgInference = result.rows.reduce((s, r) => s + r.inference_time_ms, 0) / result.rows.length;

    return { avgConfidence, avgInference };

  }, [result]);



  const modelId = run.model || result?.summary?.model_used;

  const displayRows = useMemo(() => {
    if (!result?.rows) return [];
    return result.rows.map((row) => ({
      ...row,
      severity: resolveRowSeverity(row, modelId),
    }));
  }, [result, modelId]);

  const sortedRows = useMemo(() => {

    if (!displayRows.length) return [];

    const rows = [...displayRows];

    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (sortKey === 'severity') {
        const diff = compareSeverity(av, bv);
        return sortDir === 'asc' ? diff : -diff;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return rows;

  }, [displayRows, sortKey, sortDir]);



  const warningRows = useMemo(

    () => (result ? result.rows.filter((r) => r.warnings && r.warnings.length > 0) : []),

    [result]

  );



  function toggleSort(key) {

    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));

    else {

      setSortKey(key);

      setSortDir(key === 'severity' ? 'asc' : 'desc');

    }

  }



  function toggleExpand(rowId) {

    setExpandedRowId((prev) => (prev === rowId ? null : rowId));

  }



  function exportCsv() {

    if (!result?.rows?.length) return;

    const base = run.fileName.replace(/\.[^.]+$/, '') || 'prediction';

    downloadTextFile(buildOutputCsv(result, modelId), `${base}-results.csv`);

    onToast('Results exported');

  }



  function downloadInputCsv() {

    if (!run.inputCsv) return;

    const base = run.fileName.replace(/\.[^.]+$/, '') || 'input';

    downloadTextFile(run.inputCsv, `${base}-input.csv`);

    onToast('Input data exported');

  }



  if (!result) return null;



  const classCounts = result.summary.class_counts;

  const classLabels = Object.keys(classCounts);



  const summaryDonut = (

    <Plot

      data={[

        {

          type: 'pie',

          labels: classLabels,

          values: Object.values(classCounts),

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

    <div className={`run-session ${isOpen ? 'run-session-open' : ''}`}>

      <button type="button" className="run-session-header" onClick={() => onToggle(run.id)} aria-expanded={isOpen}>

        <span className="run-session-chevron" aria-hidden>

          {isOpen ? '▾' : '▸'}

        </span>

        <div className="run-session-title">

          <span className="run-session-time num">{new Date(run.timestamp).toLocaleString()}</span>

          <span className="run-session-meta">

            {run.fileName} · {run.rowCount} rows · {run.model.replace('_', ' ')}

          </span>

        </div>

        {!isOpen && <span className="run-session-preview">Top class: {run.topClass}</span>}

      </button>



      {isOpen && (

        <div className="run-session-body">

          {run.inputCsvTruncated && (

            <div className="card card-pad input-truncated-hint">

              Input CSV was too large to store in Supabase. Re-export is unavailable for this run.

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



          <div className="run-session-actions run-session-actions-top">

            {run.inputCsv && (

              <button className="btn btn-secondary" onClick={downloadInputCsv} type="button">

                Download input (.csv)

              </button>

            )}

            <button className="btn btn-primary" onClick={exportCsv} type="button">

              Export results (.csv)

            </button>

          </div>



          <div className="card card-pad run-session-section">

            <div className="section-title">

              <span>Confidence distribution by predicted class</span>

              <span className="eyebrow">Low-confidence peaks = uncertain predictions</span>

            </div>

            {confidenceHistogram}

          </div>



          {warningRows.length > 0 && (

            <div className="card card-pad warnings-panel">

              <div className="section-title">

                <span>Data quality warnings</span>

                <span className="eyebrow">

                  {warningRows.length} row{warningRows.length !== 1 ? 's' : ''}

                </span>

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



          <div className="card card-pad run-session-section">

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

                      Class{' '}

                      {sortKey === 'predicted_class' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}

                    </th>

                    <th onClick={() => toggleSort('severity')}>

                      Severity {sortKey === 'severity' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}

                    </th>

                    <th onClick={() => toggleSort('confidence')}>

                      Confidence{' '}

                      {sortKey === 'confidence' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}

                    </th>

                    <th onClick={() => toggleSort('inference_time_ms')}>

                      Inference{' '}

                      {sortKey === 'inference_time_ms' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}

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



        </div>

      )}

    </div>

  );

}



export default function PredictionResult() {

  const navigate = useNavigate();

  const { runs, runsLoading, runsError, clearRunHistory, refreshRuns } = usePrediction();



  const [expandedRunIds, setExpandedRunIds] = useState(() => new Set());

  const [showToast, setShowToast] = useState(false);

  const [toastMessage, setToastMessage] = useState('Report exported');



  useEffect(() => {

    if (runs.length === 0) return;

    setExpandedRunIds((prev) => {

      const valid = new Set(runs.map((r) => r.id));

      const kept = new Set([...prev].filter((id) => valid.has(id)));

      if (kept.size === 0) kept.add(runs[0].id);

      return kept;

    });

  }, [runs]);



  function toggleRun(runId) {

    setExpandedRunIds((prev) => {

      const next = new Set(prev);

      if (next.has(runId)) next.delete(runId);

      else next.add(runId);

      return next;

    });

  }



  function expandAll() {

    setExpandedRunIds(new Set(runs.map((r) => r.id)));

  }



  function collapseAll() {

    setExpandedRunIds(new Set());

  }



  function handleToast(message) {

    setToastMessage(message);

    setShowToast(true);

  }



  if (runsLoading) {

    return (

      <div className="page-result">

        <div className="page-header">

          <h2>Prediction Result</h2>

        </div>

        <LoadingBlock label="Loading prediction history from Supabase" />

      </div>

    );

  }



  if (runsError && runs.length === 0) {

    return (

      <div className="page-result">

        <div className="page-header">

          <h2>Prediction Result</h2>

        </div>

        <ErrorBanner message={runsError} onRetry={refreshRuns} />

      </div>

    );

  }



  if (runs.length === 0) {

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



  const expandedCount = expandedRunIds.size;



  return (

    <div className="page-result">

      <div className="page-header">

        <h2>Prediction Result</h2>

        <p className="page-sub">

          {runs.length} batch run{runs.length !== 1 ? 's' : ''} stored · expand each session for full details

        </p>

      </div>



      <div className="run-sessions-toolbar">

        <span className="eyebrow">

          {expandedCount} of {runs.length} expanded

        </span>

        <div className="run-sessions-toolbar-actions">

          <button type="button" className="btn" onClick={expandAll}>

            Expand all

          </button>

          <button type="button" className="btn" onClick={collapseAll}>

            Collapse all

          </button>

        </div>

      </div>



      <div className="run-sessions-list">

        {runs.map((run) => (

          <RunSessionPanel

            key={run.id}

            run={run}

            isOpen={expandedRunIds.has(run.id)}

            onToggle={toggleRun}

            onToast={handleToast}

          />

        ))}

      </div>



      <div className="action-row">

        <button className="btn" onClick={() => navigate('/')} type="button">

          Back to dashboard

        </button>

        <button className="btn btn-secondary" onClick={() => navigate('/analyse')} type="button">

          Run another batch

        </button>

        <button className="btn btn-danger-outline" onClick={clearRunHistory} type="button">

          Clear history

        </button>

      </div>



      <Toast message={toastMessage} show={showToast} onDismiss={() => setShowToast(false)} />

    </div>

  );

}


