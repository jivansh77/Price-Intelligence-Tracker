/**
 * App Component
 *
 * Root component for the Price Intelligence frontend.
 * Renders the header and the PricingForm.
 */

import React from "react";
import PricingForm from "./components/PricingForm";
import "./App.css";

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Price Intelligence</h1>
        <p className="app-subtitle">
          Optimal pricing recommendations for D2C brands
        </p>
      </header>

      <main className="app-main">
        <PricingForm />
      </main>

      <footer className="app-footer">
        <p>Price Intelligence Prototype &middot; Built for D2C Brands</p>
      </footer>
    </div>
  );
}

export default App;
