export function buildOutputCsv(result) {
  if (!result?.rows) return '';
  const headers = ['row_id', 'predicted_class', 'confidence', 'severity', 'model_used', 'inference_time_ms'];
  const lines = [headers.join(',')];
  result.rows.forEach((r) => {
    lines.push([r.row_id, r.predicted_class, r.confidence, r.severity, r.model_used, r.inference_time_ms].join(','));
  });
  return lines.join('\n');
}

export function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
