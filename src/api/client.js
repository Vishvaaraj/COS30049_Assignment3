import axios from 'axios';
import { FEATURES } from '../data/constants.js';
import {
  mockAlerts,
  mockDatasetStats,
  mockModelStats,
  generateMockPredictionResults,
  generateMockSyntheticCsv,
  generateMockSyntheticRow,
} from '../data/mockData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const MOCK_RUNS_KEY = 'netguard_mock_prediction_runs';
const MOCK_LOG_KEY = 'netguard_mock_activity_log';

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

function toApiError(error) {
  if (error.response) {
    return {
      message: error.response.data?.detail || error.response.data?.message || 'The server rejected the request.',
      status: error.response.status,
    };
  }
  if (error.request) {
    return {
      message:
        error.code === 'ECONNABORTED'
          ? 'Request timed out — try fewer rows or check the server is running.'
          : 'Could not reach the server. Check your connection or try again.',
      status: null,
    };
  }
  return { message: error.message || 'Something went wrong.', status: null };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let longRequestCount = 0;

function setServerBusy(busy) {
  window.dispatchEvent(new CustomEvent('netguard:server-busy', { detail: { busy } }));
}

async function withLongRequest(fn) {
  longRequestCount += 1;
  if (longRequestCount === 1) setServerBusy(true);
  try {
    return await fn();
  } finally {
    longRequestCount = Math.max(0, longRequestCount - 1);
    if (longRequestCount === 0) setServerBusy(false);
  }
}

export async function fetchDatasetStats() {
  if (USE_MOCK) {
    await delay(300);
    return mockDatasetStats;
  }
  try {
    const { data } = await http.get('/dataset-stats');
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function fetchModelStats(modelId = 'random_forest') {
  if (USE_MOCK) {
    await delay(300);
    return mockModelStats[modelId] || mockModelStats.random_forest;
  }
  try {
    const { data } = await http.get('/model-stats', { params: { model: modelId } });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function fetchAlerts(limit = 500) {
  if (USE_MOCK) {
    await delay(300);
    const alerts = mockAlerts.slice(0, limit);
    return { alerts, total: mockAlerts.length };
  }
  try {
    const { data } = await http.get('/alerts', { params: { limit } });
    if (Array.isArray(data)) {
      return { alerts: data, total: data.length };
    }
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function submitPrediction(file, model = 'random_forest') {
  return withLongRequest(async () => {
    if (USE_MOCK) {
      await delay(900);
      const rowCount = Math.max(1, Math.min(500, file?.estimatedRows || 12));
      return generateMockPredictionResults(rowCount, model);
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', model);
      const { data } = await http.post('/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: Math.max(120000, (file?.estimatedRows || 25) * 500),
      });
      return data;
    } catch (e) {
      throw toApiError(e);
    }
  });
}

export async function fetchSyntheticData({ count = 25, mix = 'realistic', jitter = 0.08 } = {}) {
  return withLongRequest(async () => {
    if (USE_MOCK) {
      await delay(Math.min(2000, 200 + count * 2));
      return generateMockSyntheticCsv(count, mix, jitter);
    }
    try {
      const { data } = await http.get('/synthetic-data', {
        params: { count, mix, jitter },
        responseType: 'text',
        timeout: Math.max(60000, count * 200),
      });
      return data;
    } catch (e) {
      throw toApiError(e);
    }
  });
}

export async function fetchRandomSampleRow({ mix = 'realistic', jitter = 0.08 } = {}) {
  if (USE_MOCK) {
    await delay(200);
    return generateMockSyntheticRow(mix, jitter);
  }
  const csv = await fetchSyntheticData({ count: 1, mix, jitter });
  const line = csv.trim().split('\n')[1];
  const values = line.split(',');
  return FEATURES.reduce((acc, f, i) => {
    acc[f] = values[i];
    return acc;
  }, {});
}

export function syntheticCsvToFile(csvText, filename = 'synthetic-traffic.csv') {
  const blob = new Blob([csvText], { type: 'text/csv' });
  const file = new File([blob], filename, { type: 'text/csv' });
  const lines = csvText.trim().split('\n');
  file.estimatedRows = Math.max(1, lines.length - 1);
  return file;
}

export async function downloadSyntheticCsv(params) {
  const csv = await fetchSyntheticData(params);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `synthetic-${params.mix || 'realistic'}-${params.count || 25}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function loadMockRunsFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_RUNS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveMockRunsToStorage(runs) {
  try {
    localStorage.setItem(MOCK_RUNS_KEY, JSON.stringify(runs));
  } catch {
    /* ignore */
  }
}

export async function fetchPredictionRuns(limit = 30) {
  if (USE_MOCK) {
    await delay(200);
    return loadMockRunsFromStorage().slice(0, limit);
  }
  try {
    const { data } = await http.get('/prediction-runs', { params: { limit } });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function savePredictionRun(payload) {
  if (USE_MOCK) {
    await delay(300);
    const saved = {
      id: `mock-${Date.now()}`,
      created_at: new Date().toISOString(),
      ...payload,
    };
    const next = [saved, ...loadMockRunsFromStorage()].slice(0, 30);
    saveMockRunsToStorage(next);
    return saved;
  }
  try {
    const { data } = await http.post('/prediction-runs', payload, { timeout: 60000 });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function clearPredictionRunsApi() {
  if (USE_MOCK) {
    localStorage.removeItem(MOCK_RUNS_KEY);
    return { ok: true };
  }
  try {
    const { data } = await http.delete('/prediction-runs');
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

function loadMockActivityLogs() {
  try {
    const raw = localStorage.getItem(MOCK_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMockActivityLogs(entries) {
  try {
    localStorage.setItem(MOCK_LOG_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

export async function fetchActivityLogs(limit = 200) {
  if (USE_MOCK) {
    await delay(150);
    return loadMockActivityLogs().slice(0, limit);
  }
  try {
    const { data } = await http.get('/activity-logs', { params: { limit } });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function postActivityLog(message) {
  if (USE_MOCK) {
    await delay(100);
    const entry = {
      id: `mock-${Date.now()}`,
      created_at: new Date().toISOString(),
      message,
    };
    const next = [entry, ...loadMockActivityLogs()].slice(0, 200);
    saveMockActivityLogs(next);
    return entry;
  }
  try {
    const { data } = await http.post('/activity-logs', { message });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function checkServerHealth() {
  if (USE_MOCK) return true;
  try {
    await http.get('/', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
