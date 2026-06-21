// Real values from A2 report — static because no backend
// endpoint exists for this yet, NOT mock/placeholder data. Do not delete.
// Transcribed directly from the Assignment 2 report (Figures 2a and 2b)
// so the heatmap shows real values rather than placeholders, until the
// backend serves this via an endpoint of its own.

export const CORRELATION_FEATURES = [
  'duration',
  'protocol_type',
  'service',
  'flag',
  'src_bytes',
  'dst_bytes',
  'count',
  'srv_count',
  'serror_rate',
];

export const CORRELATION_NSL_KDD = [
  [1.0, 0.04, 0.09, -0.06, 0.07, 0.03, -0.08, -0.04, -0.07],
  [0.04, 1.0, 0.03, 0.09, -0.0, -0.0, -0.06, 0.04, -0.08],
  [0.09, 0.03, 1.0, -0.3, -0.0, 0.0, 0.1, -0.26, 0.28],
  [-0.06, 0.09, -0.3, 1.0, -0.01, -0.0, -0.47, 0.2, -0.45],
  [0.07, -0.0, -0.0, -0.01, 1.0, 0.0, -0.01, -0.0, -0.0],
  [0.03, -0.0, 0.0, -0.0, 0.0, 1.0, -0.0, -0.0, -0.0],
  [-0.08, -0.06, 0.1, -0.47, -0.01, -0.0, 1.0, 0.47, 0.46],
  [-0.04, 0.04, -0.26, 0.2, -0.0, -0.0, 0.47, 1.0, -0.15],
  [-0.07, -0.08, 0.28, -0.45, -0.0, -0.0, 0.46, -0.15, 1.0],
];

export const CORRELATION_PRIMARY = [
  [1.0, 0.04, 0.1, -0.07, 0.08, 0.01, -0.08, -0.04, -0.07],
  [0.04, 1.0, 0.03, 0.09, -0.0, -0.0, -0.06, 0.03, -0.08],
  [0.1, 0.03, 1.0, -0.3, 0.01, -0.01, 0.09, -0.26, 0.27],
  [-0.07, 0.09, -0.3, 1.0, -0.01, 0.03, -0.47, 0.2, -0.46],
  [0.08, -0.0, 0.01, -0.01, 1.0, 0.0, -0.01, -0.0, -0.01],
  [0.01, -0.0, -0.01, 0.03, 0.0, 1.0, -0.03, -0.01, -0.02],
  [-0.08, -0.06, 0.09, -0.47, -0.01, -0.03, 1.0, 0.47, 0.46],
  [-0.04, 0.03, -0.26, 0.2, -0.0, -0.01, 0.47, 1.0, -0.15],
  [-0.07, -0.08, 0.27, -0.46, -0.01, -0.02, 0.46, -0.15, 1.0],
];