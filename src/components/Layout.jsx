import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Layout.css';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: GridIcon },
  { to: '/analyse', label: 'Analyse Traffic', icon: UploadIcon },
  { to: '/result', label: 'Prediction Result', icon: TargetIcon },
  { to: '/visualisation', label: 'Data Visualisation', icon: ChartIcon },
];

export default function Layout({ children }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="shell">
      <aside className={`sidebar ${navOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <ShieldIcon />
          </span>
          <div>
            <div className="brand-name">AI4Cyber</div>
            <div className="brand-sub eyebrow">Anomaly Console</div>
          </div>
        </div>

        <nav className="nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
              onClick={() => setNavOpen(false)}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="eyebrow">Group 14 · COS30049</div>
          <div className="sidebar-footer-models">RF · XGBoost · K-Means</div>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <button className="nav-toggle" aria-label="Toggle navigation" onClick={() => setNavOpen((v) => !v)}>
            <MenuIcon />
          </button>

          <div className="status-pulse" role="status" aria-label="Monitoring live">
            <span className="pulse-dot">
              <span className="pulse-ring" />
            </span>
            <span className="status-text">Monitoring live</span>
          </div>

          <div className="topbar-right">
            <span className="dataset-chip eyebrow">NSL-KDD · 5-class</span>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}

/* ---- inline icon set: kept tiny and stroke-based so they read as part of
   the same console rather than a mismatched icon pack ---- */
function iconProps(extra = {}) {
  return { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', ...extra };
}
function GridIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
    </svg>
  );
}
function TargetIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 19V9" />
      <path d="M11 19V5" />
      <path d="M18 19v-7" />
      <path d="M3 19h18" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg {...iconProps({ width: 20, height: 20, stroke: 'none', fill: 'currentColor' })}>
      <path d="M12 2l8 3.2v6.1c0 5-3.4 8.7-8 10.7-4.6-2-8-5.7-8-10.7V5.2L12 2z" />
    </svg>
  );
}
