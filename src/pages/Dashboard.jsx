import React, { useEffect, useMemo, useState } from 'react';
import Plot from '../charts/Plot.jsx';
import { fetchDatasetStats, fetchModelStats, fetchAlerts } from '../api/client';
import StatCard from '../components/StatCard.jsx';
import SeverityBadge from '../components/SeverityBadge.jsx';
import { LoadingBlock, ErrorBanner } from '../components/Feedback.jsx';
import { plotlyDarkLayout, plotlyConfig, SEVERITY_COLOR } from '../charts/plotlyTheme';
import './Dashboard.css';

export default function Dashboard() {
  const [datasetStats, setDatasetStats] = useState(null);
  const [modelStats, setModelStats] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [ds, ms, al] = await Promise.all([
        fetchDatasetStats(),
        fetchModelStats('random_forest'),
        fetchAlerts(8),
      ]);
      setDatasetStats(ds);
      setModelStats(ms);
      setAlerts(al);
    } catch (e) {
      setError(e.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sortedAlerts = useMemo(() => {
    if (!alerts) return [];
    const sorted = [...alerts].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [alerts, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const totalFlows = datasetStats ? Object.values(datasetStats.class_distribution).reduce((a, b) => a + b, 0) : 0;
  const threatCount = datasetStats
    ? totalFlows - (datasetStats.class_distribution.Normal || 0)
    : 0;
  const threatPct = totalFlows ? ((threatCount / totalFlows) * 100).toFixed(1) : '0.0';
  const criticalAlerts = alerts ? alerts.filter((a) => a.severity === 'Critical').length : 0;

  const barChart = datasetStats && (
    <Plot
      data={[
        {
          x: Object.keys(datasetStats.class_distribution),
          y: Object.values(datasetStats.class_distribution),
          type: 'bar',
          marker: {
            color: Object.keys(datasetStats.class_distribution).map((k) => SEVERITY_COLOR[k] || '#4ea8de'),
          },
          hovertemplate: '<b>%{x}</b><br>%{y:,} flows<extra></extra>',
        },
      ]}
      layout={plotlyDarkLayout({
        height: 320,
        margin: { t: 10, r: 10, b: 36, l: 50 },
        yaxis: { title: 'Flow count', gridcolor: '#1c2536' },
      })}
      config={plotlyConfig}
      style={{ width: '100%' }}
      useResizeHandler
    />
  );

  return (
    <div className="page-dashboard">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p className="page-sub">Live overview of classified network traffic and recent alerts.</p>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {!error && (
        <>
          <div className="stat-grid">
            <StatCard
              label="Total flows analysed"
              value={loading ? '—' : totalFlows.toLocaleString()}
              sub={datasetStats ? 'NSL-KDD training corpus' : undefined}
            />
            <StatCard
              label="Threats detected"
              value={loading ? '—' : threatCount.toLocaleString()}
              sub={loading ? undefined : `${threatPct}% of traffic`}
              accent="var(--high)"
            />
            <StatCard
              label="Model accuracy"
              value={loading || !modelStats ? '—' : `${(modelStats.accuracy * 100).toFixed(2)}%`}
              sub="Random Forest · weighted"
              accent="var(--accent)"
            />
            <StatCard
              label="Active alerts"
              value={loading ? '—' : (alerts || []).length}
              sub={loading ? undefined : `${criticalAlerts} critical`}
              accent="var(--critical)"
            />
          </div>

          <div className="card card-pad" style={{ marginTop: 20 }}>
            <div className="section-title">
              <span>Traffic class distribution</span>
              <span className="eyebrow">Hover for exact counts</span>
            </div>
            {loading ? <LoadingBlock label="Loading distribution" /> : barChart}
          </div>

          <div className="card card-pad" style={{ marginTop: 20 }}>
            <div className="section-title">
              <span>Recent alerts</span>
              <span className="eyebrow">Click a column to sort</span>
            </div>
            {loading ? (
              <LoadingBlock label="Loading alerts" />
            ) : (
              <div className="data-table-wrap">
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
                    {sortedAlerts.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <SeverityBadge level={a.severity} />
                        </td>
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
        </>
      )}
    </div>
  );
}
