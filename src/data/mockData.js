// Mock data shaped EXACTLY like the real API contract agreed with backend.
// Swap is controlled by VITE_USE_MOCK in .env — see src/api/client.js.

import { FEATURES, CLASSES } from './constants.js';

export { FEATURES, CLASSES };

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
  total_records: 25192,
  class_distribution: {
    Normal: 13449,
    DoS: 9234,
    Probe: 2289,
    R2L: 209,
    U2R: 11,
  },
};

// Representative rows per class for mock synthetic bootstrap
const MOCK_CLASS_SAMPLES = {
  Normal: { duration: 12, protocol_type: 'tcp', service: 'http', flag: 'SF', src_bytes: 215, dst_bytes: 4503, count: 1, srv_count: 1, serror_rate: 0 },
  DoS: { duration: 0, protocol_type: 'tcp', service: 'http', flag: 'S0', src_bytes: 0, dst_bytes: 0, count: 511, srv_count: 511, serror_rate: 1 },
  Probe: { duration: 0, protocol_type: 'tcp', service: 'private', flag: 'REJ', src_bytes: 0, dst_bytes: 0, count: 12, srv_count: 1, serror_rate: 1 },
  R2L: { duration: 450, protocol_type: 'tcp', service: 'ftp', flag: 'SF', src_bytes: 0, dst_bytes: 0, count: 1, srv_count: 1, serror_rate: 0 },
  U2R: { duration: 0, protocol_type: 'tcp', service: 'other', flag: 'SF', src_bytes: 0, dst_bytes: 0, count: 1, srv_count: 1, serror_rate: 0 },
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
    macro_precision: 0.875,
    macro_recall: 0.875,
    macro_f1: 0.875,
    per_class: {
      Normal: { precision: 0.9, recall: 0.9, f1: 0.9, support: 13449 },
      Anomaly: { precision: 0.85, recall: 0.85, f1: 0.85, support: 11743 },
    },
    feature_importance: {
      src_bytes: 0.18,
      dst_bytes: 0.15,
      count: 0.1,
      srv_count: 0.09,
      serror_rate: 0.08,
      duration: 0.07,
      service: 0.06,
      flag: 0.05,
      protocol_type: 0.03,
    },
  },
};

// ---- GET /alerts -----------------------------------------------------
export const mockAlerts = [
  { id: 'a1', class: 'DoS', severity: 'Critical', confidence: 0.991, source_ip: '192.168.10.5', model_used: 'random_forest', timestamp: '2026-06-19T09:14:32Z' },
  { id: 'a2', class: 'R2L', severity: 'High', confidence: 0.872, source_ip: '172.16.0.1', model_used: 'xgboost', timestamp: '2026-06-19T09:11:07Z' },
  { id: 'a3', class: 'Probe', severity: 'Medium', confidence: 0.812, source_ip: '10.0.0.48', model_used: 'random_forest', timestamp: '2026-06-19T09:08:51Z' },
  { id: 'a4', class: 'DoS', severity: 'Critical', confidence: 0.967, source_ip: '192.168.10.8', model_used: 'random_forest', timestamp: '2026-06-19T09:03:20Z' },
  { id: 'a5', class: 'U2R', severity: 'Critical', confidence: 0.734, source_ip: '10.0.4.12', model_used: 'random_forest', timestamp: '2026-06-19T08:59:02Z' },
  { id: 'a6', class: 'Normal', severity: 'Low', confidence: 0.998, source_ip: '10.0.0.21', model_used: 'kmeans', timestamp: '2026-06-19T08:55:44Z' },
];

function gaussianJitter(value, jitterStrength) {
  const factor = 1 + (Math.random() * 2 - 1) * jitterStrength;
  return value * factor;
}

function allocateClassCounts(total, mix) {
  const dist = mockDatasetStats.class_distribution;
  const classes = CLASSES;

  if (mix.startsWith('single:')) {
    const cls = mix.slice('single:'.length);
    return { [cls]: total };
  }

  if (mix === 'balanced') {
    const perClass = Math.floor(total / classes.length);
    const counts = Object.fromEntries(classes.map((c) => [c, perClass]));
    counts[classes[0]] += total - perClass * classes.length;
    return counts;
  }

  if (mix === 'rare_focus') {
    const rare = Math.floor(total * 0.35);
    const r2l = Math.floor(rare / 2);
    const u2r = rare - r2l;
    const rest = total - rare;
    const mainTotal = dist.Normal + dist.DoS + dist.Probe;
    return {
      Normal: Math.round((dist.Normal / mainTotal) * rest),
      DoS: Math.round((dist.DoS / mainTotal) * rest),
      Probe: rest - Math.round((dist.Normal / mainTotal) * rest) - Math.round((dist.DoS / mainTotal) * rest),
      R2L: r2l,
      U2R: u2r,
    };
  }

  // realistic — proportional to training distribution
  const grand = Object.values(dist).reduce((a, b) => a + b, 0);
  const counts = {};
  let assigned = 0;
  classes.forEach((c, i) => {
    if (i === classes.length - 1) {
      counts[c] = total - assigned;
    } else {
      counts[c] = Math.max(0, Math.round((dist[c] / grand) * total));
      assigned += counts[c];
    }
  });
  return counts;
}

function jitterRow(base, jitter) {
  const numericKeys = ['duration', 'src_bytes', 'dst_bytes', 'count', 'srv_count', 'serror_rate'];
  const row = { ...base };
  numericKeys.forEach((k) => {
    let v = gaussianJitter(base[k], jitter);
    if (k === 'serror_rate') v = Math.min(1, Math.max(0, v));
    else v = Math.max(0, Math.round(v));
    row[k] = k === 'serror_rate' ? Math.round(v * 1000) / 1000 : v;
  });
  return row;
}

export function generateMockSyntheticCsv(count = 25, mix = 'realistic', jitter = 0.08) {
  const classCounts = allocateClassCounts(Math.min(500, Math.max(1, count)), mix);
  const rows = [];
  Object.entries(classCounts).forEach(([cls, n]) => {
    const sample = MOCK_CLASS_SAMPLES[cls] || MOCK_CLASS_SAMPLES.Normal;
    for (let i = 0; i < n; i += 1) {
      rows.push(jitterRow(sample, jitter));
    }
  });
  // shuffle
  for (let i = rows.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  const header = FEATURES.join(',');
  const body = rows.map((r) => FEATURES.map((f) => r[f]).join(',')).join('\n');
  return `${header}\n${body}\n`;
}

export function generateMockSyntheticRow(mix = 'realistic', jitter = 0.08) {
  const csv = generateMockSyntheticCsv(1, mix, jitter);
  const line = csv.trim().split('\n')[1];
  const values = line.split(',');
  return FEATURES.reduce((acc, f, i) => {
    acc[f] = values[i];
    return acc;
  }, {});
}

// ---- POST /predict (whole CSV -> one result per row) ----------------------
export function generateMockPredictionResults(rowCount = 12, model = 'random_forest') {
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

    const features = generateMockSyntheticRow('realistic', 0.05);
    const warnings =
      i === 0 && Math.random() > 0.5
        ? ["Unseen value 'unknown_svc' in column 'service' was replaced with fallback 'other'."]
        : undefined;

    return {
      row_id: i,
      predicted_class: cls,
      confidence,
      probabilities,
      model_used: model,
      inference_time_ms: Math.round(20 + Math.random() * 60),
      severity: SEVERITY_BY_CLASS[cls],
      features: Object.fromEntries(
        Object.entries(features).map(([k, v]) => [k, k === 'serror_rate' || ['duration', 'src_bytes', 'dst_bytes', 'count', 'srv_count'].includes(k) ? Number(v) : v])
      ),
      ...(warnings ? { warnings } : {}),
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
      model_used: model,
    },
  };
}
