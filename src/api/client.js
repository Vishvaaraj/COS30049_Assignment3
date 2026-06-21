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
    return { message: 'Could not reach the server. Check your connection or try again.', status: null };
  }
  return { message: error.message || 'Something went wrong.', status: null };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export async function fetchAlerts(limit = 10) {
  if (USE_MOCK) {
    await delay(300);
    return mockAlerts.slice(0, limit);
  }
  try {
    const { data } = await http.get('/alerts', { params: { limit } });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function submitPrediction(file, model = 'random_forest') {
  if (USE_MOCK) {
    await delay(900);
    const rowCount = Math.max(1, Math.min(50, file?.estimatedRows || 12));
    return generateMockPredictionResults(rowCount, model);
  }
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', model);
    const { data } = await http.post('/predict', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function fetchSyntheticData({ count = 25, mix = 'realistic', jitter = 0.08 } = {}) {
  if (USE_MOCK) {
    await delay(400);
    return generateMockSyntheticCsv(count, mix, jitter);
  }
  try {
    const { data } = await http.get('/synthetic-data', {
      params: { count, mix, jitter },
      responseType: 'text',
    });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
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
