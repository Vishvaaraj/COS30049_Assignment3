export function normalizeSeverity(value) {
  if (!value) return null;
  const key = String(value).trim().toLowerCase();
  const map = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
  return map[key] || value;
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
