/**
 * PricingForm Component
 *
 * Renders a form for users to input their product pricing data, sends it to
 * the backend API, and displays the optimal price band + markdown timing.
 * Updated for dashboard layout.
 */

import React, { useState } from "react";
import ResultCard from "./ResultCard";
import "./PricingForm.css";

// Set REACT_APP_BACKEND_URL to the EC2 public address for production builds.
const API_URL = process.env.REACT_APP_BACKEND_URL 
  ? `${process.env.REACT_APP_BACKEND_URL}/api/price`
  : "http://localhost:5000/api/price";

function PricingForm() {
  // --- Form state ---------------------------------------------------------
  const [productId, setProductId] = useState("");
  const [ownPrice, setOwnPrice] = useState("");
  const [competitorPrice, setCompetitorPrice] = useState("");
  const [elasticity, setElasticity] = useState("");

  // --- Result / UI state --------------------------------------------------
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Form submission handler --------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    const payload = {
      productId: productId.trim(),
      ownPrice: parseFloat(ownPrice),
      competitorPrice: parseFloat(competitorPrice),
    };

    // Only include elasticity if the user provided a value.
    if (elasticity.trim() !== "") {
      payload.elasticity = parseFloat(elasticity);
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pricing-calculator">
      <div className="calculator-header">
        <h1>Price Calculator</h1>
        <p>Get instant pricing recommendations for your products</p>
      </div>

      <div className="calculator-content">
        <form className="pricing-form" onSubmit={handleSubmit}>
          <h2 className="form-heading">Enter Product Details</h2>

          {/* Product ID */}
          <div className="form-group">
            <label htmlFor="productId">Product ID</label>
            <input
              id="productId"
              type="text"
              placeholder="e.g. SKU-1234"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
            />
          </div>

          {/* Own Price */}
          <div className="form-group">
            <label htmlFor="ownPrice">Your Price ($)</label>
            <input
              id="ownPrice"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 49.99"
              value={ownPrice}
              onChange={(e) => setOwnPrice(e.target.value)}
              required
            />
          </div>

          {/* Competitor Price */}
          <div className="form-group">
            <label htmlFor="competitorPrice">Competitor Price ($)</label>
            <input
              id="competitorPrice"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 44.99"
              value={competitorPrice}
              onChange={(e) => setCompetitorPrice(e.target.value)}
              required
            />
          </div>

          {/* Elasticity (optional) */}
          <div className="form-group">
            <label htmlFor="elasticity">
              Demand Elasticity <span className="optional-tag">optional</span>
            </label>
            <input
              id="elasticity"
              type="number"
              step="0.1"
              min="0"
              placeholder="Default: 1.5"
              value={elasticity}
              onChange={(e) => setElasticity(e.target.value)}
            />
            <small>Higher values (>1) indicate elastic demand, lower values (<1) indicate inelastic demand</small>
          </div>

          {/* Submit button */}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Analyzing..." : "Get Recommendation"}
          </button>
        </form>

        {/* Error message */}
        {error && <div className="error-message">{error}</div>}

        {/* Result card */}
        {result && <ResultCard result={result} />}
      </div>
    </div>
  );
}

export default PricingForm;

export default PricingForm;
