import { buildOutputCsv } from './predictionCsv';
import { resolveRowSeverity } from './severity';

const MAX_INPUT_CSV_CHARS = 250_000;

export function normalizeResultRows(result, model) {
  if (!result?.rows || !model) return result;
  return {
    ...result,
    rows: result.rows.map((row) => ({
      ...row,
      severity: resolveRowSeverity(row, model),
    })),
  };
}

/** Map API / Supabase snake_case row → frontend run shape */
export function normalizeRun(row) {
  if (!row) return null;
  const model = row.model ?? row.result_json?.summary?.model_used ?? row.result?.summary?.model_used;
  const rawResult = row.result_json ?? row.result;
  const result = normalizeResultRows(rawResult, model);
  return {
    id: String(row.id),
    timestamp: row.created_at || row.timestamp,
    fileName: row.file_name ?? row.fileName,
    model,
    rowCount: row.row_count ?? row.rowCount,
    topClass: row.top_class ?? row.topClass ?? '—',
    inputCsv: row.input_csv ?? row.inputCsv ?? null,
    inputCsvTruncated: Boolean(row.input_csv_truncated ?? row.inputCsvTruncated),
    outputCsv: row.output_csv ?? row.outputCsv ?? '',
    result,
  };
}

export function buildRunPayload({ fileName, inputCsv, result }) {
  const classCounts = result.summary.class_counts;
  const topClass = Object.entries(classCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  const truncated = Boolean(inputCsv && inputCsv.length > MAX_INPUT_CSV_CHARS);

  return {
    file_name: fileName,
    model: result.summary.model_used,
    row_count: result.summary.total_rows,
    top_class: topClass,
    input_csv: truncated ? null : inputCsv || null,
    output_csv: buildOutputCsv(result, result.summary.model_used),
    result_json: result,
    input_csv_truncated: truncated,
  };
}

export function buildLocalRun({ fileName, inputCsv, result }) {
  const payload = buildRunPayload({ fileName, inputCsv, result });
  const model = result.summary.model_used;
  return normalizeRun({
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
    ...payload,
    model,
    input_csv: inputCsv && inputCsv.length <= MAX_INPUT_CSV_CHARS ? inputCsv : null,
    output_csv: payload.output_csv,
    result_json: normalizeResultRows(result, model),
  });
}
