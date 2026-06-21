import React from 'react';
import Plot from '../charts/Plot.jsx';
import { plotlyDarkLayout, plotlyConfig } from '../charts/plotlyTheme';

export default function StatCard({ label, value, sub, accent, sparklineData, sparklineColor }) {
  const hasSparkline = sparklineData && sparklineData.length > 1;

  const sparkline = hasSparkline && (
    <div className="stat-sparkline">
      <Plot
        data={[
          {
            x: sparklineData.map((_, i) => i),
            y: sparklineData,
            type: 'scatter',
            mode: 'lines',
            line: { color: sparklineColor || accent || 'var(--accent-beacon)', width: 1.5 },
            fill: 'tozeroy',
            fillcolor: sparklineColor ? `${sparklineColor}22` : 'rgba(232,163,61,0.08)',
            hoverinfo: 'skip',
          },
        ]}
        layout={plotlyDarkLayout({
          height: 36,
          margin: { t: 0, r: 0, b: 0, l: 0 },
          xaxis: { visible: false, fixedrange: true },
          yaxis: { visible: false, fixedrange: true },
          showlegend: false,
        })}
        config={{ ...plotlyConfig, displayModeBar: false, staticPlot: true }}
        style={{ width: '100%', height: 36 }}
        useResizeHandler
      />
    </div>
  );

  return (
    <div
      className="card card-pad stat-card"
      style={accent ? { '--stat-accent': accent } : undefined}
    >
      <div className="eyebrow">{label}</div>
      <div className="stat-value num" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
      {sparkline}
    </div>
  );
}
