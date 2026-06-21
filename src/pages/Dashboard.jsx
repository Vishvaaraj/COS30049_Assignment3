import React, { useEffect, useMemo, useState } from 'react';
import Plot from '../charts/Plot.jsx';
import { fetchDatasetStats, fetchModelStats, fetchAlerts } from '../api/client';
import StatCard from '../components/StatCard.jsx';
import SeverityBadge from '../components/SeverityBadge.jsx';
import { LoadingBlock, ErrorBanner } from '../components/Feedback.jsx';
import { plotlyDarkLayout, plotlyConfig, SEVERITY_COLOR } from '../charts/plotlyTheme';
import './Dashboard.css';

const SEVERITY_LEVELS = ['All', 'Critical', 'High', 'Medium', 'Low'];
const ATTACK_CLASSES = ['All', 'Normal', 'DoS', 'Probe', 'R2L', 'U2R'];

export default function Dashboard() {
  const [datasetStats, setDatasetStats] = useState(null);
  const [modelStats, setModelStats] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true); // For initial page load
  const [sortKey, setSortKey] = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [attackClassFilter, setAttackClassFilter] = useState('All');
  const [activityLog, setActivityLog] = useState([]);

  const addLogEntry = (message) => {
    const newEntry = {
      timestamp: new Date(),
      message,
    };
    setActivityLog((prevLog) => [newEntry, ...prevLog].slice(0, 30));
  };

  async function load(isInitial = false) {
    if (isInitial) {
      setLoading(true);
      setError(null);
      addLogEntry('Dashboard loading...');
    }
    try {
      // Only fetch everything on initial load.
      if (isInitial) {
        const [ds, ms, al] = await Promise.all([
          fetchDatasetStats(),
          fetchModelStats('random_forest'),
          fetchAlerts(50), // Fetch more alerts for filtering
        ]);
        setDatasetStats(ds);
        setModelStats(ms);
        setAlerts(al);
        addLogEntry('Dashboard loaded successfully.');
      } else {
        // On polls, just refresh alerts.
        const al = await fetchAlerts(50);
        setAlerts(al);
        addLogEntry('Alerts refreshed.');
      }
    } catch (e) {
      if (isInitial) {
        setError(e.message || 'Failed to load dashboard data.');
        addLogEntry(`Error: ${e.message}`);
      } else {
        console.error('Failed to poll for new alerts:', e);
        addLogEntry('Error refreshing alerts.');
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    load(true); // Initial load
    const pollInterval = setInterval(() => {
      load(false); // Subsequent polls
    }, 15000);

    return () => clearInterval(pollInterval); // Cleanup on unmount
  }, []);

  const filteredAndSortedAlerts = useMemo(() => {
    if (!alerts) return [];
    let filtered = [...alerts];
    if (severityFilter !== 'All') {
      filtered = filtered.filter((a) => a.severity === severityFilter);
    }
    if (attackClassFilter !== 'All') {
      filtered = filtered.filter((a) => a.class === attackClassFilter);
    }
    const sorted = filtered.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [alerts, sortKey, sortDir, severityFilter, attackClassFilter]);

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

      {error && <ErrorBanner message={error} onRetry={() => load(true)} />}

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

          <div className="dashboard-grid">
            <div className="card card-pad">
              <div className="section-title">
                <span>Traffic class distribution</span>
                <span className="eyebrow">Hover for exact counts</span>
              </div>
              {loading ? <LoadingBlock label="Loading distribution" /> : barChart}
            </div>

            <div className="card card-pad">
              <div className="section-title">
                <span>Recent alerts</span>
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
                      {filteredAndSortedAlerts.map((a) => (
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
          </div>
          <div className="card card-pad" style={{ marginTop: 20 }}>
            <div className="section-title">
              <span>Activity Log</span>
            </div>
            <div className="activity-log">
              {activityLog.map((entry, index) => (
                <div key={index} className="log-entry">
                  <span className="log-timestamp">{entry.timestamp.toLocaleTimeString()}</span>
                  <span className="log-message">{entry.message}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
