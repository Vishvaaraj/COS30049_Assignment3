// Validation specs for the 9 NSL-KDD features used by this project
// (duration, protocol_type, service, flag, src_bytes, dst_bytes, count,
// srv_count, serror_rate). Centralised here so the same rules can be
// reused if a second form ever needs them.

import { SERVICE_OPTIONS } from './serviceOptions';

export const PROTOCOL_OPTIONS = ['tcp', 'udp', 'icmp'];
export const FLAG_OPTIONS = ['SF', 'S0', 'S1', 'S2', 'S3', 'REJ', 'RSTR', 'RSTO', 'RSTOS0', 'SH', 'OTH'];

export const FEATURE_SPECS = [
  { key: 'duration', label: 'Duration', unit: 'sec', type: 'number', min: 0, max: 100000 },
  { key: 'protocol_type', label: 'Protocol type', type: 'select', options: PROTOCOL_OPTIONS },
  { key: 'service', label: 'Service', type: 'select', options: SERVICE_OPTIONS },
  { key: 'flag', label: 'Flag', type: 'select', options: FLAG_OPTIONS },
  { key: 'src_bytes', label: 'Source bytes', unit: 'bytes', type: 'number', min: 0, max: 10000000 },
  { key: 'dst_bytes', label: 'Destination bytes', unit: 'bytes', type: 'number', min: 0, max: 10000000 },
  { key: 'count', label: 'Count', unit: 'conns', type: 'number', min: 0, max: 1000 },
  { key: 'srv_count', label: 'Srv count', unit: 'conns', type: 'number', min: 0, max: 1000 },
  { key: 'serror_rate', label: 'SYN error rate', unit: 'ratio', type: 'number', min: 0, max: 1, step: 0.01 },
];

export function emptyFeatureState() {
  return FEATURE_SPECS.reduce((acc, f) => {
    acc[f.key] = '';
    return acc;
  }, {});
}

// Returns { [key]: errorMessage } for any invalid/missing field.
export function validateFeatures(values) {
  const errors = {};
  FEATURE_SPECS.forEach((f) => {
    const raw = values[f.key];
    if (raw === '' || raw === null || raw === undefined) {
      errors[f.key] = 'Required';
      return;
    }
    if (f.type === 'number') {
      const num = Number(raw);
      if (Number.isNaN(num)) {
        errors[f.key] = 'Must be a number';
      } else if (f.min !== undefined && num < f.min) {
        errors[f.key] = `Must be ≥ ${f.min}`;
      } else if (f.max !== undefined && num > f.max) {
        errors[f.key] = `Must be ≤ ${f.max}`;
      }
    }
    if (f.type === 'select' && f.options && !f.options.includes(raw)) {
      errors[f.key] = 'Choose a value';
    }
  });
  return errors;
}

export function featuresToCsvFile(values) {
  const headers = FEATURE_SPECS.map((f) => f.key).join(',');
  const row = FEATURE_SPECS.map((f) => values[f.key]).join(',');
  const csv = `${headers}\n${row}\n`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const file = new File([blob], 'manual-entry.csv', { type: 'text/csv' });
  file.estimatedRows = 1;
  return file;
}
