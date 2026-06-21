import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { PredictionProvider } from './state/PredictionContext.jsx';
import './components/shared.css';

import Dashboard from './pages/Dashboard.jsx';
import AnalyseTraffic from './pages/AnalyseTraffic.jsx';
import PredictionResult from './pages/PredictionResult.jsx';
import DataVisualisation from './pages/DataVisualisation.jsx';

export default function App() {
  return (
    <PredictionProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analyse" element={<AnalyseTraffic />} />
          <Route path="/result" element={<PredictionResult />} />
          <Route path="/visualisation" element={<DataVisualisation />} />
        </Routes>
      </Layout>
    </PredictionProvider>
  );
}
