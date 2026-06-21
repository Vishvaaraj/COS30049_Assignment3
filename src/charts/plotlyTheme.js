// Central place for Plotly theming so every chart on every page looks like
// it belongs to the same console rather than fighting Plotly's white
// default per-instance.

export function plotlyDarkLayout(overrides = {}) {
  return {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: {
      family: 'Inter, sans-serif',
      color: '#8b96ac',
      size: 12,
    },
    margin: { t: 20, r: 20, b: 40, l: 50 },
    xaxis: {
      gridcolor: '#1c2536',
      zerolinecolor: '#232b3d',
      color: '#8b96ac',
    },
    yaxis: {
      gridcolor: '#1c2536',
      zerolinecolor: '#232b3d',
      color: '#8b96ac',
    },
    legend: {
      bgcolor: 'transparent',
      font: { color: '#8b96ac' },
    },
    hoverlabel: {
      bgcolor: '#161d2b',
      bordercolor: '#232b3d',
      font: { color: '#e8edf6', family: 'JetBrains Mono, monospace', size: 12 },
    },
    ...overrides,
  };
}

export const plotlyConfig = {
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  responsive: true,
};

export const SEVERITY_COLOR = {
  Normal: '#34d399',
  DoS: '#f4495f',
  Probe: '#f3c344',
  R2L: '#fb923c',
  U2R: '#a855f7',
};
