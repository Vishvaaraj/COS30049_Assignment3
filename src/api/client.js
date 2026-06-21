import axios from 'axios';
import {
  mockAlerts,
  mockDatasetStats,
  mockModelStats,
  generateMockPredictionResults,
} from '../data/mockData';

// VITE_API_BASE_URL: set in .env once Nigel's FastAPI server has a URL
// (local: http://localhost:8000, deployed: Render/Railway URL).
// VITE_USE_MOCK: "true" while the backend isn't ready yet. Flip to "false"
// to hit the real API. See .env.example.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// Normalises any failure (network error, 4xx, 5xx) into one shape so every
// page can render the same kind of error banner instead of guessing.
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

// file: a File object (.csv) from the drag-and-drop zone or manual-entry blob
// model: which classifier to run inference with
export async function submitPrediction(file, model = 'random_forest') {
  if (USE_MOCK) {
    await delay(900);
    const rowCount = Math.max(1, Math.min(50, file?.estimatedRows || 12));
    return generateMockPredictionResults(rowCount);
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
