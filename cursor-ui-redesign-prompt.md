# Cursor Prompt — NetGuard AI UI Redesign

## Context
This is a React.js + Vite network traffic classification web app. The source files are:
- `src/components/Layout.jsx` — sidebar + topbar shell
- `src/components/Layout.css` — layout styles
- `src/index.css` — global CSS variables, tokens, utility classes
- `src/components/StatCard.jsx` — stat card component
- `src/components/shared.css` — shared card/table/feedback styles
- `src/pages/Dashboard.jsx / .css`
- `src/pages/AnalyseTraffic.jsx / .css`
- `src/pages/PredictionResult.jsx / .css`
- `src/pages/DataVisualisation.jsx / .css`

The UI currently looks like a generic AI-generated dark dashboard. The goal is to make it look and feel like a real, professional network monitoring tool (in the style of Grafana, Kibana, or Datadog's dark theme) — tight, information-dense, purposeful. Do NOT make it look playful or stylised.

---

## Change 1 — Remove AI branding from Layout.jsx

In `Layout.jsx`, **completely remove** the `ShieldIcon` component (the SVG function and its usage). Do not replace it with another decorative icon.

Replace the entire `.brand` block JSX with a **minimal wordmark** only:

```jsx
<div className="brand">
  <span className="brand-wordmark">NTA</span>
  <div className="brand-text">
    <div className="brand-name">NetGuard</div>
    <div className="brand-sub eyebrow">Traffic Analysis</div>
  </div>
</div>
```

In `Layout.css`, add:

```css
.brand-wordmark {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-dim);
  border-radius: 4px;
  padding: 4px 6px;
  flex-shrink: 0;
}
```

---

## Change 2 — Desktop-collapsible sidebar in Layout.jsx

The sidebar must be fully collapsible on desktop (not just hidden on mobile). When collapsed it becomes an **icon rail**: 52px wide, showing only icons, no labels. When expanded it is 220px wide.

### State

Add a second state variable for desktop collapse:

```jsx
const [collapsed, setCollapsed] = useState(false);
```

Keep the existing `navOpen` state for the mobile overlay behaviour.

### Shell class

Pass `collapsed` down via a class on `.shell`:

```jsx
<div className={`shell ${collapsed ? 'shell-collapsed' : ''}`}>
```

### Sidebar JSX

Wrap the sidebar like this:

```jsx
<aside className={`sidebar ${navOpen ? 'sidebar-open' : ''} ${collapsed ? 'sidebar-collapsed' : ''}`}>
  {/* Collapse toggle — visible only on desktop */}
  <button
    className="sidebar-collapse-btn"
    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    onClick={() => setCollapsed(v => !v)}
  >
    <CollapseIcon collapsed={collapsed} />
  </button>

  <div className="brand">
    {/* wordmark + text as above; hide brand-text when collapsed */}
    <span className="brand-wordmark">NTA</span>
    <div className="brand-text">
      <div className="brand-name">NetGuard</div>
      <div className="brand-sub eyebrow">Traffic Analysis</div>
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
        title={label}   /* shows as tooltip when collapsed */
      >
        <Icon />
        <span className="nav-label">{label}</span>
      </NavLink>
    ))}
  </nav>

  <div className="sidebar-footer">
    <div className="eyebrow sidebar-footer-text">Group 14 · COS30049</div>
    <div className="sidebar-footer-models sidebar-footer-text">RF · XGBoost · K-Means</div>
  </div>
</aside>
```

Add the `CollapseIcon` inline SVG function:

```jsx
function CollapseIcon({ collapsed }) {
  return (
    <svg {...iconProps()}>
      {collapsed
        ? <path d="M9 18l6-6-6-6" />
        : <path d="M15 18l-6-6 6-6" />}
    </svg>
  );
}
```

### Layout.css additions

Add these rules to `Layout.css`:

```css
/* Sidebar collapse toggle button */
.sidebar-collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: 0 0 18px auto;   /* sits top-right of sidebar */
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.sidebar-collapse-btn:hover {
  background: var(--surface-raised);
  color: var(--text-secondary);
  border-color: var(--text-tertiary);
}

/* Smooth sidebar width transition */
.sidebar {
  transition: width 0.2s ease;
  overflow: hidden;
}

/* Collapsed state — icon rail */
.sidebar-collapsed {
  width: 52px;
  padding-left: 8px;
  padding-right: 8px;
  align-items: center;
}
.sidebar-collapsed .brand-text,
.sidebar-collapsed .nav-label,
.sidebar-collapsed .sidebar-footer-text {
  display: none;
}
.sidebar-collapsed .brand {
  justify-content: center;
  padding-bottom: 16px;
}
.sidebar-collapsed .brand-wordmark {
  margin: 0 auto;
}
.sidebar-collapsed .nav-item {
  justify-content: center;
  padding: 10px;
  width: 36px;
  border-radius: var(--radius-sm);
}
.sidebar-collapsed .sidebar-collapse-btn {
  margin: 0 auto 18px;
}
.sidebar-collapsed .sidebar-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

/* Adjust main column when sidebar collapses */
.shell-collapsed .main-col {
  /* No extra changes needed — flex layout handles it */
}
```

Also update the `--sidebar-w` CSS variable usage. In `index.css`, add:

```css
.shell-collapsed {
  --sidebar-w: 52px;
}
```

---

## Change 3 — Topbar refinements in Layout.jsx / Layout.css

The topbar is currently a floating blurred bar. Make it denser and more like a real network tool bar.

In the topbar JSX, reorganise so the left side has: **[hamburger on mobile]** · **[breadcrumb page name that updates with route]** — and the right side has: **[status pulse]** · **[dataset chip]**.

Add a `useLocation` import from `react-router-dom` and derive the page label:

```jsx
import { NavLink, useLocation } from 'react-router-dom';

// inside Layout component:
const location = useLocation();
const PAGE_LABELS = { '/': 'Dashboard', '/analyse': 'Analyse Traffic', '/result': 'Prediction Result', '/visualisation': 'Data Visualisation' };
const currentPage = PAGE_LABELS[location.pathname] ?? 'Dashboard';
```

Topbar JSX:

```jsx
<header className="topbar">
  <button className="nav-toggle" aria-label="Toggle navigation" onClick={() => setNavOpen(v => !v)}>
    <MenuIcon />
  </button>

  <span className="topbar-page-label">{currentPage}</span>

  <div className="topbar-right">
    <div className="status-pulse" role="status" aria-label="Monitoring live">
      <span className="pulse-dot"><span className="pulse-ring" /></span>
      <span className="status-text">Live</span>
    </div>
    <span className="topbar-divider" aria-hidden="true" />
    <span className="dataset-chip eyebrow">NSL-KDD · 5-class</span>
  </div>
</header>
```

Add to `Layout.css`:

```css
.topbar-page-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.01em;
}
.topbar-divider {
  display: inline-block;
  width: 1px;
  height: 16px;
  background: var(--border);
  margin: 0 4px;
}
.topbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}
```

---

## Change 4 — StatCard visual improvements

In `shared.css`, update the stat card styles to look more information-dense and less "landing page":

```css
.stat-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  overflow: hidden;
}
/* Subtle left accent bar */
.stat-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 16px;
  bottom: 16px;
  width: 2px;
  background: var(--border);
  border-radius: 2px;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.1;
  font-family: var(--font-mono);
  font-feature-settings: 'tnum';
}
.stat-sub {
  font-size: 11.5px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}
```

In `StatCard.jsx`, pass an optional `accentColor` for the left border:

```jsx
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
```

Update the `::before` in `shared.css` to use the CSS variable:

```css
.stat-card::before {
  background: var(--stat-accent, var(--border));
}
```

---

## Change 5 — Global CSS token refinements in index.css

Make these adjustments to `index.css` to feel more like Grafana/Kibana (tighter, more muted, less glowy):

```css
:root {
  /* Slightly cooler bg — the current bg is almost the same as surface, deepen it */
  --bg: #080c12;
  --surface: #0e1420;
  --surface-raised: #141c2a;
  --surface-hover: #192132;
  --border: #1f2940;
  --border-soft: #161e2e;

  /* Reduce accent saturation slightly — real tools use muted accent colours */
  --accent: #22c7e0;
  --accent-dim: #104e5a;
  --accent-soft: rgba(34, 199, 224, 0.10);
}
```

Also ensure `.card` has a slightly tighter border-radius to look more enterprise:

```css
.card {
  border-radius: var(--radius-md);   /* was --radius-lg */
}
```

---

## Change 6 — Card header / section-title consistency

In `index.css`, update `.section-title` and `.card-pad`:

```css
.card-pad {
  padding: 16px 18px;   /* was 20px 22px — tighter */
}

.section-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);   /* was text-primary — subtler */
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-soft);   /* adds a separator line */
}
```

---

## Change 7 — Nothing overflows on narrow desktop

In `Dashboard.css`, ensure the grid is responsive and doesn't overflow:

```css
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
  margin-top: 18px;
}

@media (max-width: 1100px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

In `DataVisualisation.css` and any other page CSS that uses multi-column grids, apply the same `minmax(0, 1fr)` pattern to prevent content from overflowing its container.

---

## Change 8 — Sidebar nav active indicator style

In `Layout.css`, replace the current active item highlight with a left-border style (used by Grafana, Kibana):

```css
.nav-item-active {
  background: rgba(34, 199, 224, 0.08);
  color: var(--accent);
  border-left: 2px solid var(--accent);
  padding-left: 10px;   /* compensate for the 2px border */
}
/* When sidebar is collapsed, show the active border on the top instead */
.sidebar-collapsed .nav-item-active {
  border-left: none;
  border-bottom: 2px solid var(--accent);
  padding-left: 10px;
  padding-bottom: 8px;
}
```

---

## Change 9 — Topbar height

In `Layout.css`, tighten the topbar:

```css
.topbar {
  height: 48px;   /* was 60px */
  padding: 0 20px;
  background: var(--surface);   /* solid, no blur — more enterprise */
  backdrop-filter: none;
}
```

---

## Change 10 — Mobile: hide collapse button, keep hamburger

In `Layout.css`, inside the `@media (max-width: 1024px)` block:

```css
@media (max-width: 1024px) {
  .sidebar-collapse-btn {
    display: none;   /* collapse is desktop-only; mobile uses hamburger overlay */
  }
  /* Reset any collapsed state on mobile — sidebar is always full-width when open */
  .sidebar-collapsed {
    width: 232px;
    padding: 20px 16px;
    align-items: flex-start;
  }
  .sidebar-collapsed .brand-text,
  .sidebar-collapsed .nav-label,
  .sidebar-collapsed .sidebar-footer-text {
    display: block;
  }
  .sidebar-collapsed .nav-item {
    justify-content: flex-start;
    padding: 10px 12px;
    width: auto;
  }
}
```

---

## Summary of files to modify

| File | Changes |
|---|---|
| `src/components/Layout.jsx` | Remove ShieldIcon, new brand wordmark, add `collapsed` state + `CollapseIcon`, breadcrumb page label in topbar, reorganised topbar JSX |
| `src/components/Layout.css` | Collapse btn styles, `.sidebar-collapsed` icon-rail styles, topbar height/style, nav active border, topbar-page-label |
| `src/index.css` | Token values (bg, surface, accent), `.card` border-radius, `.card-pad` padding, `.section-title` style, `.shell-collapsed` var override |
| `src/components/shared.css` | `stat-card::before` accent bar, `stat-value` mono font, tighter sizing |
| `src/components/StatCard.jsx` | Pass `--stat-accent` CSS var for coloured left bar |
| `src/pages/Dashboard.css` | `minmax(0,1fr)` grids, responsive breakpoints |
| `src/pages/DataVisualisation.css` | `minmax(0,1fr)` on any multi-column grids |

Do NOT touch any chart logic, API calls, FastAPI backend, or ML model code. Only modify the listed CSS and JSX layout/component files.
