import { fetchActivityLogs, postActivityLog } from '../api/client';

export function normalizeLogEntry(row) {
  return {
    id: row.id ?? `local-${row.created_at}`,
    timestamp: new Date(row.created_at ?? row.timestamp),
    message: row.message,
  };
}

export async function loadActivityLog(limit = 200) {
  const rows = await fetchActivityLogs(limit);
  return rows.map(normalizeLogEntry);
}

export async function appendActivityLog(message) {
  const saved = await postActivityLog(message);
  return normalizeLogEntry(saved);
}
