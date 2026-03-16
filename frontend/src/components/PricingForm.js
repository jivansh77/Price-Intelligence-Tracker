/**
 * PricingForm Component
 *
 * Renders a form for users to input their product pricing data, sends it to
 * the backend API, and displays the optimal price band + markdown timing.
 * Updated for dashboard layout.
 */

import React, { useState } from "react";
import ResultCard from "./ResultCard";
import AiInsight from "./AiInsight";
import "./PricingForm.css";

const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const API_URL = `${BASE_URL}/api/price`;
const AI_INSIGHT_URL = `${BASE_URL}/api/ai/pricing-insight`;

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

  // --- AI insight state ---------------------------------------------------
  const [aiInsight, setAiInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const fetchAiInsight = async (pricingResult, payload) => {
    setAiInsight(null);
    setAiError(null);
    setAiLoading(true);
    try {
      const resp = await fetch(AI_INSIGHT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          optimalPriceBand: pricingResult.optimalPriceBand,
          markdownTiming: pricingResult.markdownTiming,
        }),
      });
      const data = await resp.json();
      if (data.insight) {
        setAiInsight(data.insight);
      } else {
        setAiError(data.error || "AI insight unavailable");
      }
    } catch {
      setAiError("Could not reach AI service");
    } finally {
      setAiLoading(false);
    }
  };

  // --- Form submission handler --------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setAiInsight(null);
    setAiError(null);
    setLoading(true);

    const payload = {
      productId: productId.trim(),
      ownPrice: parseFloat(ownPrice),
      competitorPrice: parseFloat(competitorPrice),
    };

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
      fetchAiInsight(data, payload);
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
            <small>Higher values (&gt;1) indicate elastic demand, lower values (&lt;1) indicate inelastic demand</small>
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

        {/* AI Insight */}
        {(result || aiLoading) && (
          <AiInsight
            title="AI Strategy Insight"
            text={aiInsight}
            loading={aiLoading}
            error={aiError}
          />
        )}
      </div>
    </div>
  );
}

export default PricingForm;
