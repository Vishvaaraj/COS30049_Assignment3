import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { checkServerHealth } from '../api/client';
import './Layout.css';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: GridIcon },
  { to: '/analyse', label: 'Analyse Traffic', icon: UploadIcon },
  { to: '/result', label: 'Prediction Result', icon: TargetIcon },
  { to: '/visualisation', label: 'Data Visualisation', icon: ChartIcon },
];

const PAGE_LABELS = {
  '/': 'Dashboard',
  '/analyse': 'Analyse Traffic',
  '/result': 'Prediction Result',
  '/visualisation': 'Data Visualisation',
};

const HF_SPACE_URL =
  import.meta.env.VITE_HF_SPACE_URL || 'https://huggingface.co/spaces/Vishvaaraj/COS30049-GP14-Assign3';

export default function Layout({ children }) {
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [serverLive, setServerLive] = useState(false);
  const [serverBusy, setServerBusy] = useState(false);
  const busyRef = useRef(false);
  const location = useLocation();
  const currentPage = PAGE_LABELS[location.pathname] ?? 'Dashboard';

  useEffect(() => {
    function onBusy(event) {
      const busy = Boolean(event.detail?.busy);
      busyRef.current = busy;
      setServerBusy(busy);
      if (busy) setServerLive(true);
    }

    window.addEventListener('netguard:server-busy', onBusy);
    return () => window.removeEventListener('netguard:server-busy', onBusy);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      if (busyRef.current) return;
      const ok = await checkServerHealth();
      if (!cancelled && !busyRef.current) setServerLive(ok);
    }

    ping();
    const interval = setInterval(ping, 20000);
    const onBusyEnded = (event) => {
      if (!event.detail?.busy) ping();
    };
    window.addEventListener('netguard:server-busy', onBusyEnded);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('netguard:server-busy', onBusyEnded);
    };
  }, []);

  const statusLabel = serverBusy ? 'Running' : serverLive ? 'Live' : 'Offline';
  const statusClass = serverBusy
    ? 'status-pulse-busy'
    : serverLive
      ? 'status-pulse-live'
      : 'status-pulse-offline';

  return (
    <div className={`shell ${collapsed ? 'shell-collapsed' : ''}`}>
      <aside className={`sidebar ${navOpen ? 'sidebar-open' : ''} ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="sidebar-top">
          <button
            className="sidebar-collapse-btn"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed((v) => !v)}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>

          <div className="brand">
            <div className="brand-name">NetGuard</div>
            <div className="brand-credit">Made by Group 14</div>
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
              title={label}
            >
              <Icon />
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <button className="nav-toggle" aria-label="Toggle navigation" onClick={() => setNavOpen((v) => !v)}>
            <MenuIcon />
          </button>

          <span className="topbar-page-label">{currentPage}</span>

          <div className="topbar-right">
            <div
              className={`status-pulse ${statusClass}`}
              role="status"
              aria-label={
                serverBusy
                  ? 'Backend is processing a request'
                  : serverLive
                    ? 'Backend connected'
                    : 'Backend offline — please start the Hugging Face Space server'
              }
            >
              <span className="pulse-dot">
                {(serverLive || serverBusy) && <span className="pulse-ring" />}
              </span>
              <span className="status-text">{statusLabel}</span>
            </div>
            {!serverLive && !serverBusy && (
              <p className="status-offline-hint">
                Please start the server on{' '}
                <a href={HF_SPACE_URL} target="_blank" rel="noopener noreferrer">
                  Hugging Face
                </a>
              </p>
            )}
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
function CollapseIcon({ collapsed }) {
  return (
    <svg {...iconProps()}>
      {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
    </svg>
  );
}
