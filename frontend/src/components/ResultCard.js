/**
 * ResultCard Component
 *
 * Displays the pricing recommendation returned by the API:
 *   - Product ID
 *   - Optimal Price Band
 *   - Markdown Timing
 */

import React from "react";
import "./ResultCard.css";

/**
 * Map markdown timing values to a visual badge variant.
 */
const TIMING_VARIANT = {
  Immediate: "badge-immediate",
  Hold: "badge-hold",
  Monitor: "badge-monitor",
};

function ResultCard({ result }) {
  const { productId, optimalPriceBand, markdownTiming } = result;
  const badgeClass = TIMING_VARIANT[markdownTiming] || "badge-monitor";

  return (
    <div className="result-card">
      <h3 className="result-heading">Recommendation</h3>

      <div className="result-grid">
        {/* Product ID */}
        <div className="result-item">
          <span className="result-label">Product</span>
          <span className="result-value">{productId}</span>
        </div>

        {/* Optimal Price Band */}
        <div className="result-item">
          <span className="result-label">Optimal Price</span>
          <span className="result-value result-price">
            ${optimalPriceBand.toFixed(2)}
          </span>
        </div>

        {/* Markdown Timing */}
        <div className="result-item">
          <span className="result-label">Markdown Timing</span>
          <span className={`result-badge ${badgeClass}`}>{markdownTiming}</span>
        </div>
      </div>
    </div>
  );
}

export default ResultCard;
