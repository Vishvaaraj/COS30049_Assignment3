import React, { useEffect, useMemo, useState } from 'react';
import Plot from '../charts/Plot.jsx';
import { fetchDatasetStats, fetchModelStats } from '../api/client';
import { usePrediction } from '../state/PredictionContext.jsx';
import { LoadingBlock, ErrorBanner } from '../components/Feedback.jsx';
import { plotlyDarkLayout, plotlyConfig, SEVERITY_COLOR, ACCENT_BEACON, ACCENT_SONAR } from '../charts/plotlyTheme';
import { CORRELATION_FEATURES, CORRELATION_NSL_KDD, CORRELATION_PRIMARY } from '../data/correlationData';
import './DataVisualisation.css';

const METRICS = ['precision', 'recall', 'f1'];

export default function DataVisualisation() {
  const { result } = usePrediction();

  const [datasetStats, setDatasetStats] = useState(null);
  const [rfStats, setRfStats] = useState(null);
  const [xgbStats, setXgbStats] = useState(null);
  const [kmStats, setKmStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterClass, setFilterClass] = useState(null);
  const [metricClassFilter, setMetricClassFilter] = useState('All');
  const [perClassMetric, setPerClassMetric] = useState('f1');
  const [corrDataset, setCorrDataset] = useState('NSL-KDD');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [ds, rf, xgb, km] = await Promise.all([
        fetchDatasetStats(),
        fetchModelStats('random_forest'),
        fetchModelStats('xgboost'),
        fetchModelStats('kmeans'),
      ]);
      setDatasetStats(ds);
      setRfStats(rf);
      setXgbStats(xgb);
      setKmStats(km);
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
  const metricClasses = ['All', ...classes];

  const expectedSupport = useMemo(() => {
    if (!rfStats) return null;
    const support = {};
    classes.forEach((c) => {
      support[c] = rfStats.per_class[c]?.support ?? 0;
    });
    return support;
  }, [rfStats, classes]);

  const liveClassCounts = result?.summary?.class_counts ?? null;

  const donutChart = datasetStats && (
    <Plot
      data={[
        {
          type: 'pie',
          labels: classes,
          values: Object.values(datasetStats.class_distribution),
          hole: 0.58,
          marker: { colors: classes.map((c) => SEVERITY_COLOR[c] || ACCENT_SONAR) },
          textinfo: 'label+percent',
          hovertemplate: '<b>%{label}</b><br>%{value:,} flows (%{percent})<extra></extra>',
          pull: classes.map((c) => (c === filterClass ? 0.06 : 0)),
        },
      ]}
      layout={plotlyDarkLayout({ height: 300, margin: { t: 10, r: 10, b: 10, l: 10 }, showlegend: true })}
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

  const metricLabel = perClassMetric.charAt(0).toUpperCase() + perClassMetric.slice(1);

  const perClassChart = rfStats && xgbStats && (
    <Plot
      data={[
        {
          x: classes,
          y: classes.map((c) => rfStats.per_class[c]?.[perClassMetric] ?? 0),
          type: 'bar',
          name: 'Random Forest',
          marker: {
            color: ACCENT_BEACON,
            opacity: classes.map((c) => (metricClassFilter !== 'All' && c !== metricClassFilter ? 0.25 : 1)),
          },
          hovertemplate: `<b>%{x}</b><br>RF ${metricLabel}: %{y:.2f}<extra></extra>`,
        },
        {
          x: classes,
          y: classes.map((c) => xgbStats.per_class[c]?.[perClassMetric] ?? 0),
          type: 'bar',
          name: 'XGBoost',
          marker: {
            color: ACCENT_SONAR,
            opacity: classes.map((c) => (metricClassFilter !== 'All' && c !== metricClassFilter ? 0.25 : 1)),
          },
          hovertemplate: `<b>%{x}</b><br>XGBoost ${metricLabel}: %{y:.2f}<extra></extra>`,
        },
      ]}
      layout={plotlyDarkLayout({
        height: 320,
        barmode: 'group',
        margin: { t: 10, r: 10, b: 36, l: 44 },
        yaxis: { title: metricLabel, range: [0, 1.05], gridcolor: '#232C36' },
      })}
      config={plotlyConfig}
      style={{ width: '100%' }}
      useResizeHandler
    />
  );

  const importanceFeatures = rfStats
    ? [...new Set([...Object.keys(rfStats.feature_importance || {}), ...Object.keys(xgbStats?.feature_importance || {})])]
    : [];

  const importanceChart = rfStats && xgbStats && (
    <Plot
      data={[
        {
          x: importanceFeatures.map((f) => rfStats.feature_importance[f] ?? 0),
          y: importanceFeatures,
          type: 'bar',
          orientation: 'h',
          name: 'Random Forest',
          marker: { color: ACCENT_BEACON },
          hovertemplate: '<b>%{y}</b><br>RF: %{x:.3f}<extra></extra>',
        },
        {
          x: importanceFeatures.map((f) => xgbStats.feature_importance[f] ?? 0),
          y: importanceFeatures,
          type: 'bar',
          orientation: 'h',
          name: 'XGBoost',
          marker: { color: ACCENT_SONAR },
          hovertemplate: '<b>%{y}</b><br>XGBoost: %{x:.3f}<extra></extra>',
        },
      ]}
      layout={plotlyDarkLayout({
        height: 320,
        barmode: 'group',
        margin: { t: 10, r: 30, b: 30, l: 100 },
        yaxis: { automargin: true },
      })}
      config={plotlyConfig}
      style={{ width: '100%' }}
      useResizeHandler
    />
  );

  const distributionCompareChart = expectedSupport && liveClassCounts && (
    <Plot
      data={[
        {
          x: classes,
          y: classes.map((c) => expectedSupport[c] ?? 0),
          type: 'bar',
          name: 'Training support (expected)',
          marker: { color: ACCENT_SONAR },
          hovertemplate: '<b>%{x}</b><br>Training support: %{y:,}<extra></extra>',
        },
        {
          x: classes,
          y: classes.map((c) => liveClassCounts[c] ?? 0),
          type: 'bar',
          name: 'Last batch (live)',
          marker: { color: ACCENT_BEACON },
          hovertemplate: '<b>%{x}</b><br>Live batch: %{y:,}<extra></extra>',
        },
      ]}
      layout={plotlyDarkLayout({
        height: 300,
        barmode: 'group',
        margin: { t: 10, r: 10, b: 36, l: 50 },
        yaxis: { title: 'Row count', gridcolor: '#232C36' },
      })}
      config={plotlyConfig}
      style={{ width: '100%' }}
      useResizeHandler
    />
  );

  const kmClasses = kmStats ? Object.keys(kmStats.per_class || {}) : [];

  const kmChart = kmStats && (
    <Plot
      data={METRICS.map((m, i) => ({
        x: kmClasses,
        y: kmClasses.map((c) => kmStats.per_class[c]?.[m] ?? 0),
        type: 'bar',
        name: m.charAt(0).toUpperCase() + m.slice(1),
        marker: { color: [ACCENT_BEACON, ACCENT_SONAR, '#ECC54A'][i] },
        hovertemplate: `<b>%{x}</b><br>${m}: %{y:.2f}<extra></extra>`,
      }))}
      layout={plotlyDarkLayout({
        height: 260,
        barmode: 'group',
        margin: { t: 10, r: 10, b: 36, l: 44 },
        yaxis: { title: 'Score', range: [0, 1.05], gridcolor: '#232C36' },
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
            [0.5, '#121821'],
            [1, '#F2495E'],
          ],
          zmin: -0.5,
          zmax: 1,
          texttemplate: '%{z:.2f}',
          textfont: { size: 10, color: '#E7EDF2' },
          hovertemplate: '<b>%{y} × %{x}</b><br>corr: %{z:.2f}<extra></extra>',
          colorbar: { tickfont: { color: '#8694A1' } },
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

  const allModels = [
    { id: 'random_forest', label: 'Random Forest', stats: rfStats },
    { id: 'xgboost', label: 'XGBoost', stats: xgbStats },
    { id: 'kmeans', label: 'K-Means', stats: kmStats },
  ];

  return (
    <div className="page-viz">
      <div className="page-header">
        <h2>Data Visualisation</h2>
        <p className="page-sub">Dataset composition and model performance from the Assignment 2 evaluation.</p>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {!error && (
        <>
          <div className="macro-scoreboard card card-pad">
            <div className="section-title">
              <span>Macro metrics scoreboard</span>
              <span className="eyebrow">Precision · Recall · F1 · Accuracy</span>
            </div>
            <div className="macro-grid">
              {allModels.map(({ id, label, stats }) =>
                stats ? (
                  <div className="macro-item" key={id}>
                    <div className="macro-model-name">{label}</div>
                    <div className="macro-metrics">
                      <div><span className="eyebrow">Accuracy</span><span className="num macro-val">{(stats.accuracy * 100).toFixed(2)}%</span></div>
                      <div><span className="eyebrow">Macro P</span><span className="num macro-val">{stats.macro_precision != null ? (stats.macro_precision * 100).toFixed(1) + '%' : '—'}</span></div>
                      <div><span className="eyebrow">Macro R</span><span className="num macro-val">{stats.macro_recall != null ? (stats.macro_recall * 100).toFixed(1) + '%' : '—'}</span></div>
                      <div><span className="eyebrow">Macro F1</span><span className="num macro-val">{stats.macro_f1 != null ? (stats.macro_f1 * 100).toFixed(1) + '%' : '—'}</span></div>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>

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
                    <button onClick={() => setFilterClass(null)} aria-label="Clear filter">×</button>
                  </span>
                </div>
              )}
            </div>

            <div className="card card-pad">
              <div className="section-title">
                <span>Per-class {metricLabel} — RF vs XGBoost</span>
                <div className="filter-controls">
                  <div className="metric-toggle">
                    {METRICS.map((m) => (
                      <button
                        key={m}
                        className={`mini-toggle ${perClassMetric === m ? 'mini-toggle-active' : ''}`}
                        onClick={() => setPerClassMetric(m)}
                      >
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </button>
                    ))}
                  </div>
                  <select onChange={(e) => setMetricClassFilter(e.target.value)} value={metricClassFilter}>
                    {metricClasses.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </div>
              {loading ? <LoadingBlock label="Loading model comparison" /> : perClassChart}
            </div>
          </div>

          <div className="viz-grid" style={{ marginTop: 18 }}>
            <div className="card card-pad">
              <div className="section-title">
                <span>Feature importance — RF vs XGBoost</span>
              </div>
              {loading ? <LoadingBlock label="Loading importance" /> : importanceChart}
            </div>

            <div className="card card-pad">
              <div className="section-title">
                <span>K-Means — Normal vs Anomaly</span>
                <span className="eyebrow">Precision · Recall · F1</span>
              </div>
              {loading ? <LoadingBlock label="Loading K-Means stats" /> : kmChart}
            </div>
          </div>

          {liveClassCounts && expectedSupport && (
            <div className="card card-pad" style={{ marginTop: 18 }}>
              <div className="section-title">
                <span>Expected distribution vs. last batch</span>
                <span className="eyebrow">Training support vs. live class_counts — not a confusion matrix</span>
              </div>
              {distributionCompareChart}
            </div>
          )}

          {!liveClassCounts && (
            <div className="card card-pad distribution-hint" style={{ marginTop: 18 }}>
              <p>Run a classification on Analyse Traffic to compare your batch&apos;s class_counts against training support.</p>
            </div>
          )}

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
