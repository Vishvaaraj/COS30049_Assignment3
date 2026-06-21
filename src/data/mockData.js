// Mock data shaped EXACTLY like the real API contract agreed with backend.
// This lets the front-end be built and demoed before /predict, /model-stats,
// /dataset-stats and /alerts exist for real. Swap is controlled by
// VITE_USE_MOCK in .env — see src/api/client.js.

export const FEATURES = [
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

export const CLASSES = ['Normal', 'DoS', 'Probe', 'R2L', 'U2R'];

export const SEVERITY_BY_CLASS = {
  Normal: 'Low',
  Probe: 'Medium',
  R2L: 'High',
  DoS: 'Critical',
  U2R: 'Critical',
};

export const MODELS = [
  { id: 'random_forest', label: 'Random Forest', accuracy: 0.9974 },
  { id: 'xgboost', label: 'XGBoost', accuracy: 0.9973 },
  { id: 'kmeans', label: 'K-Means', accuracy: 0.8739 },
];

// ---- GET /dataset-stats --------------------------------------------------
export const mockDatasetStats = {
  total_records: 125973,
  class_distribution: {
    Normal: 67343,
    DoS: 45927,
    Probe: 11656,
    R2L: 995,
    U2R: 52,
  },
};

// ---- GET /model-stats?model=random_forest --------------------------------
export const mockModelStats = {
  random_forest: {
    accuracy: 0.9974,
    macro_precision: 0.93,
    macro_recall: 0.97,
    macro_f1: 0.95,
    per_class: {
      DoS: { precision: 1.0, recall: 1.0, f1: 1.0, support: 9186 },
      Normal: { precision: 1.0, recall: 1.0, f1: 1.0, support: 13469 },
      Probe: { precision: 0.99, recall: 0.99, f1: 0.99, support: 2331 },
      R2L: { precision: 0.96, recall: 0.97, f1: 0.97, support: 199 },
      U2R: { precision: 0.69, recall: 0.9, f1: 0.78, support: 10 },
    },
    feature_importance: {
      src_bytes: 0.22,
      service: 0.185,
      dst_bytes: 0.133,
      srv_count: 0.101,
      count: 0.088,
      serror_rate: 0.087,
      duration: 0.07,
      flag: 0.068,
      protocol_type: 0.042,
    },
  },
  xgboost: {
    accuracy: 0.9973,
    macro_precision: 0.91,
    macro_recall: 0.98,
    macro_f1: 0.94,
    per_class: {
      DoS: { precision: 1.0, recall: 1.0, f1: 1.0, support: 9186 },
      Normal: { precision: 1.0, recall: 1.0, f1: 1.0, support: 13469 },
      Probe: { precision: 0.99, recall: 0.99, f1: 0.99, support: 2331 },
      R2L: { precision: 0.94, recall: 0.99, f1: 0.96, support: 199 },
      U2R: { precision: 0.64, recall: 0.9, f1: 0.75, support: 10 },
    },
    feature_importance: {
      src_bytes: 0.21,
      service: 0.178,
      dst_bytes: 0.141,
      srv_count: 0.098,
      count: 0.09,
      serror_rate: 0.085,
      duration: 0.073,
      flag: 0.071,
      protocol_type: 0.053,
    },
  },
  kmeans: {
    accuracy: 0.8739,
    per_class: {
      Normal: { precision: 0.9, recall: 0.9, f1: 0.9 },
      Anomaly: { precision: 0.85, recall: 0.85, f1: 0.85 },
    },
    feature_importance: [
        { feature: 'src_bytes', importance: 0.18 },
        { feature: 'dst_bytes', importance: 0.15 },
        { feature: 'logged_in', importance: 0.12 },
        { feature: 'count', importance: 0.1 },
        { feature: 'srv_serror_rate', importance: 0.08 },
        { feature: 'dst_host_srv_count', importance: 0.07 },
        { feature: 'dst_host_same_srv_rate', importance: 0.06 },
        { feature: 'dst_host_diff_srv_rate', importance: 0.05 },
        { feature: 'dst_host_serror_rate', importance: 0.04 },
        { feature: 'protocol_type', importance: 0.03 },
    ],
  },
};

// ---- GET /alerts -----------------------------------------------------
export const mockAlerts = [
  { id: 'a1', class: 'DoS', severity: 'Critical', confidence: 0.991, source_ip: '192.168.10.5', timestamp: '2026-06-19T09:14:32Z' },
  { id: 'a2', class: 'R2L', severity: 'High', confidence: 0.872, source_ip: '172.16.0.1', timestamp: '2026-06-19T09:11:07Z' },
  { id: 'a3', class: 'Probe', severity: 'Medium', confidence: 0.812, source_ip: '10.0.0.48', timestamp: '2026-06-19T09:08:51Z' },
  { id: 'a4', class: 'DoS', severity: 'Critical', confidence: 0.967, source_ip: '192.168.10.8', timestamp: '2026-06-19T09:03:20Z' },
  { id: 'a5', class: 'U2R', severity: 'Critical', confidence: 0.734, source_ip: '10.0.4.12', timestamp: '2026-06-19T08:59:02Z' },
  { id: 'a6', class: 'Normal', severity: 'Low', confidence: 0.998, source_ip: '10.0.0.21', timestamp: '2026-06-19T08:55:44Z' },
];

// ---- POST /predict (whole CSV -> one result per row) ----------------------
// Used by the Prediction Result page to render without a real upload yet.
export function generateMockPredictionResults(rowCount = 12) {
  const rows = Array.from({ length: rowCount }).map((_, i) => {
    const cls = CLASSES[Math.floor(Math.random() * CLASSES.length)];
    const confidence = Math.round((0.6 + Math.random() * 0.39) * 1000) / 1000;
    const remaining = 1 - confidence;
    const probabilities = {};
    let remainder = remaining;
    CLASSES.filter((c) => c !== cls).forEach((c, idx, arr) => {
      const isLast = idx === arr.length - 1;
      const share = isLast ? remainder : Math.random() * remainder;
      probabilities[c] = Math.round(share * 1000) / 1000;
      remainder -= share;
    });
    probabilities[cls] = confidence;

    return {
      row_id: i,
      predicted_class: cls,
      confidence,
      probabilities,
      model_used: 'random_forest',
      inference_time_ms: Math.round(20 + Math.random() * 60),
      severity: SEVERITY_BY_CLASS[cls],
      features: {
        duration: Math.round(Math.random() * 500),
        protocol_type: ['tcp', 'udp', 'icmp'][Math.floor(Math.random() * 3)],
        service: ['http', 'ftp_data', 'private', 'smtp'][Math.floor(Math.random() * 4)],
        flag: ['SF', 'S0', 'REJ'][Math.floor(Math.random() * 3)],
        src_bytes: Math.round(Math.random() * 5000),
        dst_bytes: Math.round(Math.random() * 5000),
        count: Math.round(Math.random() * 100),
        srv_count: Math.round(Math.random() * 100),
        serror_rate: Math.round(Math.random() * 100) / 100,
      },
    };
  });

  const class_counts = CLASSES.reduce((acc, c) => {
    acc[c] = rows.filter((r) => r.predicted_class === c).length;
    return acc;
  }, {});

  return {
    rows,
    summary: {
      total_rows: rows.length,
      class_counts,
      model_used: 'random_forest',
    },
  };
}
