import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { buildOutputCsv } from '../utils/predictionCsv';

const RUNS_KEY = 'netguard_prediction_runs';
const LATENCY_KEY = 'netguard_inference_latency';
const MAX_RUNS = 15;
const MAX_INPUT_CSV_CHARS = 250_000;

const PredictionContext = createContext(null);

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
    /* quota exceeded */
  }
}

export function PredictionProvider({ children }) {
  const [runs, setRuns] = useState(() => loadJson(RUNS_KEY, []));
  const [selectedRunId, setSelectedRunId] = useState(() => loadJson(RUNS_KEY, [])[0]?.id ?? null);
  const [inferenceLatencyHistory, setInferenceLatencyHistory] = useState(() => loadJson(LATENCY_KEY, []));

  const selectedRun = useMemo(
    () => runs.find((r) => r.id === selectedRunId) ?? runs[0] ?? null,
    [runs, selectedRunId]
  );

  const result = selectedRun?.result ?? null;
  const fileName = selectedRun?.fileName ?? null;

  const recordRun = useCallback(({ fileName: name, inputCsv, result: data }) => {
    const avgMs =
      data.rows.length > 0 ? data.rows.reduce((s, r) => s + r.inference_time_ms, 0) / data.rows.length : 0;

    const classCounts = data.summary.class_counts;
    const topClass = Object.entries(classCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

    const run = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      fileName: name,
      model: data.summary.model_used,
      rowCount: data.summary.total_rows,
      topClass,
      result: data,
      inputCsv: inputCsv && inputCsv.length <= MAX_INPUT_CSV_CHARS ? inputCsv : null,
      inputCsvTruncated: Boolean(inputCsv && inputCsv.length > MAX_INPUT_CSV_CHARS),
      outputCsv: buildOutputCsv(data),
    };

    setRuns((prev) => {
      const next = [run, ...prev].slice(0, MAX_RUNS);
      persistJson(RUNS_KEY, next);
      return next;
    });
    setSelectedRunId(run.id);

    setInferenceLatencyHistory((prev) => {
      const next = [...prev, Math.round(avgMs * 10) / 10].slice(-20);
      persistJson(LATENCY_KEY, next);
      return next;
    });

    window.dispatchEvent(new CustomEvent('netguard:prediction-complete'));
  }, []);

  const clearRunHistory = useCallback(() => {
    setRuns([]);
    setSelectedRunId(null);
    persistJson(RUNS_KEY, []);
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
