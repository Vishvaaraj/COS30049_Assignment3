import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { fetchPredictionRuns, savePredictionRun, clearPredictionRunsApi } from '../api/client';
import { buildLocalRun, buildRunPayload, normalizeRun, normalizeResultRows } from '../utils/predictionRun';

const LATENCY_KEY = 'netguard_inference_latency';
const MOCK_RUNS_KEY = 'netguard_mock_prediction_runs';

const PredictionContext = createContext(null);

function loadLatency() {
  try {
    return JSON.parse(localStorage.getItem(LATENCY_KEY)) || [];
  } catch {
    return [];
  }
}

function persistLatency(values) {
  try {
    localStorage.setItem(LATENCY_KEY, JSON.stringify(values));
  } catch {
    /* ignore */
  }
}

function loadMockRuns() {
  try {
    const raw = localStorage.getItem(MOCK_RUNS_KEY);
    return raw ? JSON.parse(raw).map(normalizeRun) : [];
  } catch {
    return [];
  }
}

function persistMockRuns(runs) {
  try {
    localStorage.setItem(MOCK_RUNS_KEY, JSON.stringify(runs));
  } catch {
    /* ignore */
  }
}

export function PredictionProvider({ children }) {
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runsError, setRunsError] = useState(null);
  const [inferenceLatencyHistory, setInferenceLatencyHistory] = useState(loadLatency);
  const [expandLatestRunOnResult, setExpandLatestRunOnResult] = useState(false);

  const clearExpandLatestRun = useCallback(() => {
    setExpandLatestRunOnResult(false);
  }, []);

  const selectedRun = useMemo(
    () => runs.find((r) => r.id === selectedRunId) ?? runs[0] ?? null,
    [runs, selectedRunId]
  );

  const result = selectedRun?.result ?? null;
  const fileName = selectedRun?.fileName ?? null;

  const refreshRuns = useCallback(async () => {
    setRunsLoading(true);
    setRunsError(null);
    try {
      const data = await fetchPredictionRuns(30);
      const normalized = data.map(normalizeRun).filter(Boolean);
      setRuns(normalized);
      setSelectedRunId((prev) => {
        if (prev && normalized.some((r) => r.id === prev)) return prev;
        return normalized[0]?.id ?? null;
      });
    } catch (e) {
      setRunsError(e.message || 'Failed to load prediction history.');
      const mockFallback = loadMockRuns();
      if (mockFallback.length > 0) {
        setRuns(mockFallback);
        setSelectedRunId(mockFallback[0]?.id ?? null);
      }
    } finally {
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRuns();
  }, [refreshRuns]);

  const recordRun = useCallback(
    async ({ fileName: name, inputCsv, result: data }) => {
      const model = data.summary?.model_used;
      const result = normalizeResultRows(data, model) ?? data;
      const avgMs =
        result.rows.length > 0 ? result.rows.reduce((s, r) => s + r.inference_time_ms, 0) / result.rows.length : 0;
      const optimistic = buildLocalRun({ fileName: name, inputCsv, result });
      setExpandLatestRunOnResult(true);
      setRuns((prev) => [optimistic, ...prev.filter((r) => r.id !== optimistic.id)].slice(0, 30));
      setSelectedRunId(optimistic.id);

      setInferenceLatencyHistory((prev) => {
        const next = [...prev, Math.round(avgMs * 10) / 10].slice(-20);
        persistLatency(next);
        return next;
      });

      try {
        const saved = await savePredictionRun(buildRunPayload({ fileName: name, inputCsv, result }));
        const normalized = normalizeRun(saved);
        setRuns((prev) => [normalized, ...prev.filter((r) => r.id !== optimistic.id)].slice(0, 30));
        setSelectedRunId(normalized.id);
      } catch (e) {
        console.warn('Could not save run to Supabase:', e);
        persistMockRuns([optimistic, ...loadMockRuns()].slice(0, 30));
      }

      window.dispatchEvent(new CustomEvent('netguard:prediction-complete'));
    },
    []
  );

  const clearRunHistory = useCallback(async () => {
    try {
      await clearPredictionRunsApi();
    } catch (e) {
      console.warn('Could not clear Supabase runs:', e);
    }
    setRuns([]);
    setSelectedRunId(null);
    localStorage.removeItem(MOCK_RUNS_KEY);
  }, []);

  const recentRuns = runs;

  return (
    <PredictionContext.Provider
      value={{
        result,
        fileName,
        runs,
        recentRuns,
        selectedRunId,
        selectedRun,
        setSelectedRunId,
        recordRun,
        clearRunHistory,
        refreshRuns,
        runsLoading,
        runsError,
        expandLatestRunOnResult,
        clearExpandLatestRun,
        inferenceLatencyHistory,
      }}
    >
      {children}
    </PredictionContext.Provider>
  );
}

export function usePrediction() {
  const ctx = useContext(PredictionContext);
  if (!ctx) throw new Error('usePrediction must be used within PredictionProvider');
  return ctx;
}
