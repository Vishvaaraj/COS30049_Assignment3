import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Plot from '../charts/Plot.jsx';
import { fetchDatasetStats, fetchModelStats, fetchAlerts } from '../api/client';
import { usePrediction } from '../state/PredictionContext.jsx';
import StatCard from '../components/StatCard.jsx';
import SeverityBadge from '../components/SeverityBadge.jsx';
import { LoadingBlock, ErrorBanner } from '../components/Feedback.jsx';
import { plotlyDarkLayout, plotlyConfig, SEVERITY_COLOR, ACCENT_BEACON, ACCENT_SONAR } from '../charts/plotlyTheme';
import { loadActivityLog, appendActivityLog } from '../utils/activityLog';
import './Dashboard.css';

const SEVERITY_LEVELS = ['All', 'Critical', 'High', 'Medium', 'Low'];
const ATTACK_CLASSES = ['All', 'Normal', 'DoS', 'Probe', 'R2L', 'U2R'];
const MODEL_IDS = ['random_forest', 'xgboost', 'kmeans'];
const MODEL_LABELS = { random_forest: 'Random Forest', xgboost: 'XGBoost', kmeans: 'K-Means' };
const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low'];
const ATTACK_CLASS_ORDER = ['Normal', 'DoS', 'Probe', 'R2L', 'U2R', 'Anomaly'];
const SEVERITY_CHART_COLOR = {
  Critical: '#F2495E',
  High: '#F2914A',
  Medium: '#ECC54A',
  Low: '#5C8AA6',
};
const ATTACK_CHART_COLOR = {
  Normal: '#2BA39A',
  DoS: '#F2495E',
  Probe: '#ECC54A',
  R2L: '#F2914A',
  U2R: '#C93D5A',
  Anomaly: '#E8A33D',
};

function normalizeSeverity(value) {
  if (!value) return null;
  const key = String(value).trim().toLowerCase();
  const map = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
  return map[key] || value;
}
const HISTORY_KEY = 'netguard_dashboard_history';
const MAX_SPARK = 20;

function alertsCountLabel(shown, loaded, total) {
  if (!total) return 'No alerts';
  const noun = `${total} alert${total === 1 ? '' : 's'}`;
  if (shown < loaded) {
    const base = loaded < total ? `${loaded} of ${noun}` : noun;
    return `${shown} shown · ${base}`;
  }
  if (loaded < total) return `${loaded} of ${noun}`;
  return noun;
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || { flows: [], threats: [], accuracy: [], alerts: [] };
  } catch {
    return { flows: [], threats: [], accuracy: [], alerts: [] };
  }
}

function pushHistory(key, value) {
  const hist = loadHistory();
  hist[key] = [...(hist[key] || []), value].slice(-MAX_SPARK);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
  } catch {
    /* ignore */
  }
  return hist;
}

export default function Dashboard() {
  const { inferenceLatencyHistory } = usePrediction();

  const [datasetStats, setDatasetStats] = useState(null);
  const [allModelStats, setAllModelStats] = useState({});
  const [alerts, setAlerts] = useState(null);
  const [alertTotal, setAlertTotal] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [attackClassFilter, setAttackClassFilter] = useState('All');
  const [activityLog, setActivityLog] = useState([]);
  const [logFilter, setLogFilter] = useState('');
  const [sparkHistory, setSparkHistory] = useState(loadHistory);
  const [logsLoading, setLogsLoading] = useState(true);

  const addLogEntry = useCallback(async (message) => {
    const optimistic = { id: `local-${Date.now()}`, timestamp: new Date(), message };
    setActivityLog((prev) => [optimistic, ...prev].slice(0, 200));
    try {
      const saved = await appendActivityLog(message);
      setActivityLog((prev) => {
        const without = prev.filter((e) => e.id !== optimistic.id);
        return [saved, ...without].slice(0, 200);
      });
    } catch {
      /* keep optimistic entry */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadActivityLog(200)
      .then((entries) => {
        if (!cancelled) setActivityLog(entries);
      })
      .catch(() => {
        /* show empty log */
      })
      .finally(() => {
        if (!cancelled) setLogsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function applyAlertResponse(result) {
    const items = result.alerts ?? [];
    const total = result.total ?? items.length;
    setAlerts(items);
    setAlertTotal(total);
    return items;
  }

  async function load(isInitial = false) {
    if (isInitial) {
      setLoading(true);
      setError(null);
      addLogEntry('Dashboard loading — fetching dataset stats, model metrics, and alerts…');
    }
    try {
      if (isInitial) {
        const [ds, rf, xgb, km, alertResult] = await Promise.all([
          fetchDatasetStats(),
          fetchModelStats('random_forest'),
          fetchModelStats('xgboost'),
          fetchModelStats('kmeans'),
          fetchAlerts(),
        ]);
        const al = applyAlertResponse(alertResult);
        const totalAlerts = alertResult.total ?? al.length;
        setDatasetStats(ds);
        setAllModelStats({ random_forest: rf, xgboost: xgb, kmeans: km });

        const totalFlows = Object.values(ds.class_distribution).reduce((a, b) => a + b, 0);
        const threatCount = totalFlows - (ds.class_distribution.Normal || 0);
        const hist = {
          flows: pushHistory('flows', totalFlows),
          threats: pushHistory('threats', threatCount),
          accuracy: pushHistory('accuracy', Math.round(rf.accuracy * 10000) / 100),
          alerts: pushHistory('alerts', totalAlerts),
        };
        setSparkHistory(hist);
        const criticalCount = al.filter((a) => a.severity === 'Critical').length;
        const threatPctStr = totalFlows ? ((threatCount / totalFlows) * 100).toFixed(1) : '0.0';
        addLogEntry(
          `Dashboard loaded · ${totalFlows.toLocaleString()} training flows · ${threatCount.toLocaleString()} threats (${threatPctStr}%) · ${totalAlerts} alerts (${criticalCount} critical) · RF accuracy ${(rf.accuracy * 100).toFixed(2)}%`
        );
      } else {
        const alertResult = await fetchAlerts();
        const al = applyAlertResponse(alertResult);
        const totalAlerts = alertResult.total ?? al.length;
        setSparkHistory((prev) => ({ ...prev, alerts: pushHistory('alerts', totalAlerts).alerts }));
        const criticalCount = al.filter((a) => a.severity === 'Critical').length;
        const highCount = al.filter((a) => a.severity === 'High').length;
        const totalLabel = totalAlerts > al.length ? `${al.length} of ${totalAlerts}` : String(totalAlerts);
        addLogEntry(
          `Alerts refreshed · ${totalLabel} alerts · ${criticalCount} critical · ${highCount} high severity`
        );
      }
    } catch (e) {
      if (isInitial) {
        setError(e.message || 'Failed to load dashboard data.');
        addLogEntry(`Dashboard load failed · ${e.message || 'Could not reach the API'}`);
      } else {
        addLogEntry(`Alert refresh failed · ${e.message || 'Could not fetch alerts from the API'}`);
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    const pollInterval = setInterval(() => load(false), 15000);
    return () => clearInterval(pollInterval);
  }, []);

  const filteredAndSortedAlerts = useMemo(() => {
    if (!alerts) return [];
    let filtered = [...alerts];
    if (severityFilter !== 'All') filtered = filtered.filter((a) => a.severity === severityFilter);
    if (attackClassFilter !== 'All') filtered = filtered.filter((a) => a.class === attackClassFilter);
    return filtered.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [alerts, sortKey, sortDir, severityFilter, attackClassFilter]);

  const filteredLog = useMemo(() => {
    if (!logFilter.trim()) return activityLog;
    const q = logFilter.toLowerCase();
    return activityLog.filter((e) => e.message.toLowerCase().includes(q));
  }, [activityLog, logFilter]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const totalFlows = datasetStats ? Object.values(datasetStats.class_distribution).reduce((a, b) => a + b, 0) : 0;
  const threatCount = datasetStats ? totalFlows - (datasetStats.class_distribution.Normal || 0) : 0;
  const threatPct = totalFlows ? ((threatCount / totalFlows) * 100).toFixed(1) : '0.0';
  const criticalAlerts = alerts ? alerts.filter((a) => a.severity === 'Critical').length : 0;
  const avgLatency =
    inferenceLatencyHistory.length > 0
      ? (inferenceLatencyHistory.reduce((a, b) => a + b, 0) / inferenceLatencyHistory.length).toFixed(1)
      : null;

  const severityMix = useMemo(() => {
    const counts = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, 0]));
    for (const a of filteredAndSortedAlerts) {
      const level = normalizeSeverity(a.severity);
      if (level && level in counts) counts[level] += 1;
    }
    return counts;
  }, [filteredAndSortedAlerts]);

  const attackMix = useMemo(() => {
    const counts = {};
    for (const a of filteredAndSortedAlerts) {
      const cls = a.class || 'Unknown';
      counts[cls] = (counts[cls] || 0) + 1;
    }
    return counts;
  }, [filteredAndSortedAlerts]);

  const attackPieLabels = [...ATTACK_CLASS_ORDER.filter((c) => attackMix[c] > 0), ...Object.keys(attackMix).filter((c) => !ATTACK_CLASS_ORDER.includes(c))];
  const attackPieValues = attackPieLabels.map((c) => attackMix[c]);

  const barChart = datasetStats && (
    <Plot
      data={[
        {
          x: Object.keys(datasetStats.class_distribution),
          y: Object.values(datasetStats.class_distribution),
          type: 'bar',
          marker: { color: Object.keys(datasetStats.class_distribution).map((k) => SEVERITY_COLOR[k] || ACCENT_SONAR) },
          hovertemplate: '<b>%{x}</b><br>%{y:,} flows<extra></extra>',
        },
      ]}
      layout={plotlyDarkLayout({
        height: 300,
        margin: { t: 8, r: 12, b: 44, l: 52 },
        bargap: 0.28,
        yaxis: {
          title: { text: 'Flow count', standoff: 8 },
          gridcolor: '#232C36',
          automargin: true,
        },
        xaxis: { automargin: true },
      })}
      config={{ ...plotlyConfig, displayModeBar: false }}
      style={{ width: '100%', height: 300 }}
      useResizeHandler
    />
  );

  const attackTypeDonut = attackPieLabels.length > 0 && (
    <Plot
      data={[
        {
          type: 'pie',
          labels: attackPieLabels,
          values: attackPieValues,
          hole: 0.62,
          sort: false,
          direction: 'clockwise',
          marker: {
            colors: attackPieLabels.map((c) => ATTACK_CHART_COLOR[c] || ACCENT_SONAR),
          },
          textinfo: 'none',
          hovertemplate: '<b>%{label}</b><br>%{value} alerts<br>%{percent}<extra></extra>',
        },
      ]}
      layout={plotlyDarkLayout({
        height: 128,
        margin: { t: 4, r: 4, b: 4, l: 4 },
        showlegend: false,
      })}
      config={{ ...plotlyConfig, displayModeBar: false }}
      style={{ width: '100%', height: 128, maxWidth: 128 }}
      useResizeHandler
    />
  );

  return (
    <div className="page-dashboard">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p className="page-sub">Live overview of classified network traffic and recent alerts.</p>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => load(true)} />}

      {!error && (
        <>
          <div className="stat-grid">
            <StatCard
              label="Total flows analysed"
              value={loading ? '—' : totalFlows.toLocaleString()}
              sub={datasetStats ? 'NSL-KDD training corpus' : undefined}
              sparklineData={sparkHistory.flows}
              sparklineColor={ACCENT_SONAR}
            />
            <StatCard
              label="Threats detected"
              value={loading ? '—' : threatCount.toLocaleString()}
              sub={loading ? undefined : `${threatPct}% of traffic`}
              accent="var(--high)"
              sparklineData={sparkHistory.threats}
              sparklineColor="#F2914A"
            />
            <StatCard
              label="Model accuracy"
              value={loading || !allModelStats.random_forest ? '—' : `${(allModelStats.random_forest.accuracy * 100).toFixed(2)}%`}
              sub="Random Forest · weighted"
              accent="var(--accent-beacon)"
              sparklineData={sparkHistory.accuracy}
              sparklineColor={ACCENT_BEACON}
            />
            <StatCard
              label="Active alerts"
              value={loading ? '—' : alertTotal}
              sub={loading ? undefined : `${criticalAlerts} critical`}
              accent="var(--critical)"
              sparklineData={sparkHistory.alerts}
              sparklineColor="#F2495E"
            />
          </div>

          {avgLatency && (
            <div className="latency-strip card card-pad">
              <span className="eyebrow">Avg inference latency (recent runs)</span>
              <span className="latency-value num">{avgLatency} ms</span>
              <span className="latency-sub">from last {inferenceLatencyHistory.length} classification run{inferenceLatencyHistory.length !== 1 ? 's' : ''}</span>
            </div>
          )}

          <div className="model-compare-strip card card-pad">
            <div className="section-title">
              <span>Model comparison</span>
              <span className="eyebrow">Accuracy + macro F1</span>
            </div>
            <div className="model-compare-grid">
              {MODEL_IDS.map((id) => {
                const stats = allModelStats[id];
                if (!stats) return null;
                return (
                  <div className="model-compare-item" key={id}>
                    <div className="model-compare-name">{MODEL_LABELS[id]}</div>
                    <div className="model-compare-metrics">
                      <div>
                        <span className="eyebrow">Accuracy</span>
                        <span className="num model-compare-val">{(stats.accuracy * 100).toFixed(2)}%</span>
                      </div>
                      <div>
                        <span className="eyebrow">Macro F1</span>
                        <span className="num model-compare-val">
                          {stats.macro_f1 != null ? (stats.macro_f1 * 100).toFixed(1) + '%' : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="card card-pad distribution-card">
              <div className="section-title">
                <span>Traffic class distribution</span>
                <span className="eyebrow">Hover for exact counts</span>
              </div>
              <div className="distribution-chart-wrap">
                {loading ? <LoadingBlock label="Loading distribution" /> : barChart}
              </div>
            </div>

            <div className="card card-pad alerts-panel">
              <div className="section-title">
                <span>Recent alerts</span>
                <div className="alerts-title-meta">
                  <span className="eyebrow alerts-count">
                    {!loading && alerts
                      ? alertsCountLabel(filteredAndSortedAlerts.length, alerts.length, alertTotal)
                      : 'Loading alerts…'}
                  </span>
                  <div className="filter-controls">
                  <select onChange={(e) => setSeverityFilter(e.target.value)} value={severityFilter}>
                    {SEVERITY_LEVELS.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                  <select onChange={(e) => setAttackClassFilter(e.target.value)} value={attackClassFilter}>
                    {ATTACK_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
                </div>
              </div>
              <div className="alerts-layout">
                <div className="alerts-table-col">
                  {loading ? (
                    <LoadingBlock label="Loading alerts" />
                  ) : (
                    <div className="data-table-wrap alerts-table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th onClick={() => toggleSort('severity')}>
                              Severity {sortKey === 'severity' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                            </th>
                            <th onClick={() => toggleSort('class')}>
                              Attack type {sortKey === 'class' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                            </th>
                            <th onClick={() => toggleSort('source_ip')}>
                              Source IP {sortKey === 'source_ip' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                            </th>
                            <th onClick={() => toggleSort('confidence')}>
                              Confidence {sortKey === 'confidence' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                            </th>
                            <th onClick={() => toggleSort('timestamp')}>
                              Time {sortKey === 'timestamp' && <span className="sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAndSortedAlerts.map((a) => (
                            <tr key={a.id}>
                              <td><SeverityBadge level={a.severity} /></td>
                              <td>{a.class}</td>
                              <td className="num">{a.source_ip}</td>
                              <td className="num">{(a.confidence * 100).toFixed(1)}%</td>
                              <td className="num">{new Date(a.timestamp).toLocaleTimeString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                {!loading && alerts && alerts.length > 0 && (
                  <div className="severity-donut-col">
                    <div className="eyebrow severity-mix-title">Alert breakdown</div>
                    <div className="severity-mix-panel">
                      <div className="severity-donut-wrap">{attackTypeDonut}</div>
                      <div className="mix-legend-group">
                        <div className="mix-legend-heading">Attack type</div>
                        <ul className="severity-mix-legend">
                          {attackPieLabels.map((cls) => (
                            <li key={cls} className="severity-mix-row">
                              <span className="severity-mix-swatch" style={{ background: ATTACK_CHART_COLOR[cls] || ACCENT_SONAR }} />
                              <span>{cls}</span>
                              <span className="num severity-mix-count">{attackMix[cls]}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="mix-legend-group">
                        <div className="mix-legend-heading">Severity</div>
                        <ul className="severity-mix-legend">
                          {SEVERITY_ORDER.map((level) => (
                            <li key={level} className="severity-mix-row">
                              <span className="severity-mix-swatch" style={{ background: SEVERITY_CHART_COLOR[level] }} />
                              <span>{level}</span>
                              <span className="num severity-mix-count">{severityMix[level]}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card card-pad activity-log-card">
            <div className="section-title">
              <span>Activity log</span>
              <input
                className="log-filter-input"
                type="search"
                placeholder="Filter messages…"
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
              />
            </div>
            <div className="activity-log">
              {logsLoading ? (
                <LoadingBlock label="Loading activity log" />
              ) : (
                <>
                  {filteredLog.map((entry) => (
                    <div key={entry.id} className="log-entry">
                      <span className="log-timestamp">
                        {entry.timestamp.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' })}
                      </span>
                      <span className="log-message">{entry.message}</span>
                    </div>
                  ))}
                  {filteredLog.length === 0 && <div className="log-empty">No matching log entries.</div>}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
