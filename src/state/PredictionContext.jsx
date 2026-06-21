import React, { createContext, useContext, useState } from 'react';

const PredictionContext = createContext(null);

export function PredictionProvider({ children }) {
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState(null);
  return (
    <PredictionContext.Provider value={{ result, setResult, fileName, setFileName }}>
      {children}
    </PredictionContext.Provider>
  );
}

export function usePrediction() {
  const ctx = useContext(PredictionContext);
  if (!ctx) throw new Error('usePrediction must be used within PredictionProvider');
  return ctx;
}
