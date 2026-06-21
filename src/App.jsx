import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { PredictionProvider } from './state/PredictionContext.jsx';
import { LoadingBlock } from './components/Feedback.jsx';
import './components/shared.css';

// Lazy-loaded so each page's JS (and Plotly, used on 3 of the 4 pages)
// only downloads when that route is actually visited, instead of all
// four pages loading upfront on first paint.
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const AnalyseTraffic = lazy(() => import('./pages/AnalyseTraffic.jsx'));
const PredictionResult = lazy(() => import('./pages/PredictionResult.jsx'));
const DataVisualisation = lazy(() => import('./pages/DataVisualisation.jsx'));

export default function App() {
  return (
      <PredictionProvider>
        <Layout>
          <Suspense fallback={<LoadingBlock label="Loading page" />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/analyse" element={<AnalyseTraffic />} />
              <Route path="/result" element={<PredictionResult />} />
              <Route path="/visualisation" element={<DataVisualisation />} />
            </Routes>
          </Suspense>
        </Layout>
      </PredictionProvider>
  );
}