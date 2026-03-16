/**
 * AiInsight Component
 *
 * Reusable card that displays Gemini-generated strategic insights.
 * Shows a loading skeleton while the AI response is pending, and
 * gracefully handles error / unavailable states.
 */

import React from "react";
import { Sparkles } from "lucide-react";
import "./AiInsight.css";

function AiInsight({ title = "AI Strategy Insight", text, loading, error }) {
  return (
    <div className="ai-insight-card">
      <div className="ai-insight-header">
        <Sparkles size={18} className="ai-insight-icon" />
        <h3 className="ai-insight-title">{title}</h3>
        <span className="ai-badge">Gemini AI</span>
      </div>

      <div className="ai-insight-body">
        {loading && (
          <div className="ai-loading">
            <div className="ai-shimmer-line" />
            <div className="ai-shimmer-line short" />
            <div className="ai-shimmer-line" />
            <div className="ai-shimmer-line shorter" />
            <p className="ai-loading-label">Analyzing with AI...</p>
          </div>
        )}

        {!loading && error && (
          <p className="ai-error-text">{error}</p>
        )}

        {!loading && !error && text && (
          <div className="ai-insight-text">
            {text.split("\n").filter(Boolean).map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AiInsight;
