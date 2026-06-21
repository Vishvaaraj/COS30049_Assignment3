export function plotlyDarkLayout(overrides = {}) {
  return {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: {
      family: 'IBM Plex Sans, sans-serif',
      color: '#8694A1',
      size: 12,
    },
    margin: { t: 20, r: 20, b: 40, l: 50 },
    xaxis: {
      gridcolor: '#232C36',
      zerolinecolor: '#232C36',
      color: '#8694A1',
    },
    yaxis: {
      gridcolor: '#232C36',
      zerolinecolor: '#232C36',
      color: '#8694A1',
    },
    legend: {
      bgcolor: 'transparent',
      font: { color: '#8694A1' },
    },
    hoverlabel: {
      bgcolor: '#1A222C',
      bordercolor: '#232C36',
      font: { color: '#E7EDF2', family: 'IBM Plex Mono, monospace', size: 12 },
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
  Normal: '#2BA39A',
  DoS: '#F2495E',
  Probe: '#ECC54A',
  R2L: '#F2914A',
  U2R: '#F2495E',
};

export const ACCENT_BEACON = '#E8A33D';
export const ACCENT_SONAR = '#2BA39A';
