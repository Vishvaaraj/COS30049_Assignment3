import React from 'react';

export default function StatCard({ label, value, sub, accent }) {
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
    </div>
  );
}
