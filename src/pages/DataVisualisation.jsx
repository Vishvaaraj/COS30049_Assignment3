import React, { useEffect, useState } from 'react';
import Plot from '../charts/Plot.jsx';
import { fetchDatasetStats, fetchModelStats } from '../api/client';
import { LoadingBlock, ErrorBanner } from '../components/Feedback.jsx';
import { plotlyDarkLayout, plotlyConfig, SEVERITY_COLOR } from '../charts/plotlyTheme';
import { CORRELATION_FEATURES, CORRELATION_NSL_KDD, CORRELATION_PRIMARY } from '../data/correlationData';
import './DataVisualisation.css';

export default function DataVisualisation() {
  const [datasetStats, setDatasetStats] = useState(null);
  const [rfStats, setRfStats] = useState(null);
  const [xgbStats, setXgbStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterClass, setFilterClass] = useState(null);
  const [corrDataset, setCorrDataset] = useState('NSL-KDD');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [ds, rf, xgb] = await Promise.all([
        fetchDatasetStats(),
        fetchModelStats('random_forest'),
        fetchModelStats('xgboost'),
      ]);
      setDatasetStats(ds);
      setRfStats(rf);
      setXgbStats(xgb);
    } catch (e) {
      setError(e.message || 'Failed to load visualisation data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const classes = datasetStats ? Object.keys(datasetStats.class_distribution) : [];

  const donutChart = datasetStats && (
    <Plot
      data={[
        {
          type: 'pie',
          labels: classes,
          values: Object.values(datasetStats.class_distribution),
          hole: 0.58,
          marker: { colors: classes.map((c) => SEVERITY_COLOR[c] || '#4ea8de') },
          textinfo: 'label+percent',
          hovertemplate: '<b>%{label}</b><br>%{value:,} flows (%{percent})<extra></extra>',
          pull: classes.map((c) => (c === filterClass ? 0.06 : 0)),
        },
      ]}
      layout={plotlyDarkLayout({
        height: 300,
        margin: { t: 10, r: 10, b: 10, l: 10 },
        showlegend: true,
      })}
      config={plotlyConfig}
      style={{ width: '100%' }}
      useResizeHandler
      onClick={(e) => {
        const label = e.points?.[0]?.label;
        if (!label) return;
        setFilterClass((prev) => (prev === label ? null : label));
      }}
    />
  );

  const f1Chart = rfStats && xgbStats && (
    <Plot
      data={[
        {
          x: classes,
          y: classes.map((c) => rfStats.per_class[c]?.f1 ?? 0),
          type: 'bar',
          name: 'Random Forest',
          marker: {
            color: '#2dd4f0',
            opacity: classes.map((c) => (filterClass && c !== filterClass ? 0.25 : 1)),
          },
          hovertemplate: '<b>%{x}</b><br>RF F1: %{y:.2f}<extra></extra>',
        },
        {
          x: classes,
          y: classes.map((c) => xgbStats.per_class[c]?.f1 ?? 0),
          type: 'bar',
          name: 'XGBoost',
          marker: {
            color: '#f3c344',
            opacity: classes.map((c) => (filterClass && c !== filterClass ? 0.25 : 1)),
          },
          hovertemplate: '<b>%{x}</b><br>XGBoost F1: %{y:.2f}<extra></extra>',
        },
      ]}
      layout={plotlyDarkLayout({
        height: 320,
        barmode: 'group',
        margin: { t: 10, r: 10, b: 36, l: 44 },
        yaxis: { title: 'F1 score', range: [0, 1.05], gridcolor: '#1c2536' },
      })}
      config={plotlyConfig}
      style={{ width: '100%' }}
      useResizeHandler
    />
  );

  const corrMatrix = corrDataset === 'NSL-KDD' ? CORRELATION_NSL_KDD : CORRELATION_PRIMARY;

  const heatmap = (
    <Plot
      data={[
        {
          z: corrMatrix,
          x: CORRELATION_FEATURES,
          y: CORRELATION_FEATURES,
          type: 'heatmap',
          colorscale: [
            [0, '#1b3a6b'],
            [0.5, '#11161f'],
            [1, '#f4495f'],
          ],
          zmin: -0.5,
          zmax: 1,
          texttemplate: '%{z:.2f}',
          textfont: { size: 10, color: '#e8edf6' },
          hovertemplate: '<b>%{y} × %{x}</b><br>corr: %{z:.2f}<extra></extra>',
          colorbar: { tickfont: { color: '#8b96ac' } },
        },
      ]}
      layout={plotlyDarkLayout({
        height: 430,
        margin: { t: 10, r: 10, b: 80, l: 100 },
        xaxis: { tickangle: -40 },
      })}
      config={plotlyConfig}
      style={{ width: '100%' }}
      useResizeHandler
    />
  );

  return (
    <div className="page-viz">
      <div className="page-header">
        <h2>Data Visualisation</h2>
        <p className="page-sub">Dataset composition and model performance from the Assignment 2 evaluation.</p>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {!error && (
        <>
          <div className="viz-grid">
            <div className="card card-pad">
              <div className="section-title">
                <span>Dataset class distribution</span>
                <span className="eyebrow">Click a slice to filter</span>
              </div>
              {loading ? <LoadingBlock label="Loading distribution" /> : donutChart}
              {filterClass && (
                <div className="filter-chip-row">
                  <span className="filter-chip">
                    Filtered: {filterClass}
                    <button onClick={() => setFilterClass(null)} aria-label="Clear filter">
                      ×
                    </button>
                  </span>
                </div>
              )}
            </div>

            <div className="card card-pad">
              <div className="section-title">
                <span>Per-class F1 score — RF vs XGBoost</span>
              </div>
              {loading ? <LoadingBlock label="Loading model comparison" /> : f1Chart}
            </div>
          </div>

          <div className="card card-pad" style={{ marginTop: 18 }}>
            <div className="section-title">
              <span>Feature correlation heatmap</span>
              <div className="corr-toggle">
                <button
                  className={`mini-toggle ${corrDataset === 'NSL-KDD' ? 'mini-toggle-active' : ''}`}
                  onClick={() => setCorrDataset('NSL-KDD')}
                >
                  NSL-KDD
                </button>
                <button
                  className={`mini-toggle ${corrDataset === 'Primary' ? 'mini-toggle-active' : ''}`}
                  onClick={() => setCorrDataset('Primary')}
                >
                  Primary
                </button>
              </div>
            </div>
            {heatmap}
          </div>
        </>
      )}
    </div>
  );
}
