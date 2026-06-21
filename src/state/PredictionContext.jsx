import React, { createContext, useContext, useState, useCallback } from 'react';

const PredictionContext = createContext(null);

const RUNS_KEY = 'netguard_recent_runs';
const LATENCY_KEY = 'netguard_inference_latency';
const MAX_HISTORY = 20;

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function persistJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function PredictionProvider({ children }) {
  const [result, setResultState] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [recentRuns, setRecentRuns] = useState(() => loadJson(RUNS_KEY, []));
  const [inferenceLatencyHistory, setInferenceLatencyHistory] = useState(() => loadJson(LATENCY_KEY, []));

  const setResult = useCallback((data) => {
    setResultState(data);
    if (!data) return;

    const avgMs =
      data.rows.length > 0
        ? data.rows.reduce((s, r) => s + r.inference_time_ms, 0) / data.rows.length
        : 0;

    setInferenceLatencyHistory((prev) => {
      const next = [...prev, Math.round(avgMs * 10) / 10].slice(-MAX_HISTORY);
      persistJson(LATENCY_KEY, next);
      return next;
    });
  }, []);

  const recordRun = useCallback((run) => {
    setRecentRuns((prev) => {
      const next = [run, ...prev].slice(0, 10);
      persistJson(RUNS_KEY, next);
      return next;
    });
  }, []);

  return (
    <PredictionContext.Provider
      value={{
        result,
        setResult,
        fileName,
        setFileName,
        recentRuns,
        recordRun,
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
