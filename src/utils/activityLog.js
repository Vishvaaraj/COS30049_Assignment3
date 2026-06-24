const LOG_KEY = 'netguard_activity_log';
const MAX_ENTRIES = 200;

export function loadActivityLog() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((e) => ({ ...e, timestamp: new Date(e.timestamp) }));
  } catch {
    return [];
  }
}

export function appendActivityLog(message) {
  const entry = { timestamp: new Date().toISOString(), message };
  const prev = loadActivityLog().map((e) => ({
    timestamp: e.timestamp.toISOString(),
    message: e.message,
  }));
  const next = [entry, ...prev].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  } catch {
    /* quota exceeded */
  }
  return next.map((e) => ({ ...e, timestamp: new Date(e.timestamp) }));
}
