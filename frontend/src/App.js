/**
 * App Component
 *
 * Root component for the Price Intelligence frontend.
 * Now includes routing and dashboard layout.
 */

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import PricingForm from "./components/PricingForm";
import BulkAnalysis from "./components/BulkAnalysis";
// Lazy load components for better performance
const PricingHistory = React.lazy(() => import("./components/PricingHistory"));
const PriceAlerts = React.lazy(() => import("./components/PriceAlerts"));
import "./App.css";

function App() {
  return (
    <Router>
      <div className="app">
        <React.Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="pricing" element={<PricingForm />} />
              <Route path="bulk-analysis" element={<BulkAnalysis />} />
              <Route path="history" element={<PricingHistory />} />
              <Route path="alerts" element={<PriceAlerts />} />
            </Route>
          </Routes>
        </React.Suspense>
      </div>
    </Router>
  );
}

export default App;
