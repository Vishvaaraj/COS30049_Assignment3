export function normalizeSeverity(value) {
  if (!value) return null;
  const key = String(value).trim().toLowerCase();
  const map = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
  return map[key] || value;
}

export const SEVERITY_DISPLAY_ORDER = ['Low', 'Medium', 'High', 'Critical'];

const SEVERITY_RANK = Object.fromEntries(SEVERITY_DISPLAY_ORDER.map((level, index) => [level, index]));

export function compareSeverity(a, b) {
  const av = SEVERITY_RANK[normalizeSeverity(a)] ?? 99;
  const bv = SEVERITY_RANK[normalizeSeverity(b)] ?? 99;
  return av - bv;
}

export function severityFromKmeans(predictedClass, confidence) {
  if (predictedClass === 'Normal') return 'Low';
  if (confidence >= 0.62) return 'Critical';
  if (confidence >= 0.48) return 'High';
  if (confidence >= 0.36) return 'Medium';
  return 'High';
}

export function resolveRowSeverity(row, model) {
  if (model === 'kmeans') {
    return severityFromKmeans(row.predicted_class, row.confidence);
  }
  return normalizeSeverity(row.severity);
}
