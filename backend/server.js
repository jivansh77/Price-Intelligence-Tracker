/**
 * Price Intelligence Backend Server
 *
 * A simple Express server that exposes a POST /api/price endpoint.
 * It accepts product pricing data and returns an optimal price band
 * along with markdown timing recommendations for D2C brands.
 *
 * // TODO: Deploy this server on EC2 (t2.micro)
 */

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { calculatePricing } = require("./pricingLogic");

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Enable CORS so the React frontend (localhost:3000) can call this API.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
  })
);

// Parse incoming JSON request bodies.
app.use(bodyParser.json());

// ---------------------------------------------------------------------------
// In-memory storage (demo only)
// ---------------------------------------------------------------------------

// TODO: Replace in-memory storage with DynamoDB putItem / getItem
const pricingHistory = [];

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * POST /api/price
 *
 * Expects JSON body:
 *   {
 *     productId: string,
 *     ownPrice: number,
 *     competitorPrice: number,
 *     elasticity?: number   // defaults to 1.5 if omitted
 *   }
 *
 * Returns JSON:
 *   {
 *     productId: string,
 *     optimalPriceBand: number,
 *     markdownTiming: string
 *   }
 */
app.post("/api/price", (req, res) => {
  const { productId, ownPrice, competitorPrice, elasticity } = req.body;

  // --- Input validation ---------------------------------------------------
  if (!productId || ownPrice == null || competitorPrice == null) {
    return res.status(400).json({
      error:
        "Missing required fields. Please provide productId, ownPrice, and competitorPrice.",
    });
  }

  const ownPriceNum = parseFloat(ownPrice);
  const competitorPriceNum = parseFloat(competitorPrice);
  const elasticityNum = elasticity != null ? parseFloat(elasticity) : 1.5;

  if (isNaN(ownPriceNum) || isNaN(competitorPriceNum) || isNaN(elasticityNum)) {
    return res.status(400).json({
      error: "ownPrice, competitorPrice, and elasticity must be valid numbers.",
    });
  }

  if (ownPriceNum <= 0 || competitorPriceNum <= 0) {
    return res.status(400).json({
      error: "Prices must be positive numbers.",
    });
  }

  // --- Calculate optimal pricing ------------------------------------------
  const { optimalPriceBand, markdownTiming } = calculatePricing(
    ownPriceNum,
    competitorPriceNum,
    elasticityNum
  );

  // Build the result object
  const result = {
    productId,
    ownPrice: ownPriceNum,
    competitorPrice: competitorPriceNum,
    elasticity: elasticityNum,
    optimalPriceBand: parseFloat(optimalPriceBand.toFixed(2)),
    markdownTiming,
    timestamp: new Date().toISOString(),
  };

  // TODO: Replace with DynamoDB putItem to persist pricing recommendations
  pricingHistory.push(result);

  return res.json({
    productId: result.productId,
    optimalPriceBand: result.optimalPriceBand,
    markdownTiming: result.markdownTiming,
  });
});

/**
 * GET /api/price/history
 *
 * Returns the in-memory pricing history (demo only).
 * TODO: Replace with DynamoDB scan / query
 */
app.get("/api/price/history", (_req, res) => {
  return res.json(pricingHistory);
});

/**
 * GET /api/health
 * Simple health-check endpoint.
 */
app.get("/api/health", (_req, res) => {
  return res.json({ status: "ok" });
});

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Price Intelligence API running on http://localhost:${PORT}`);
});

module.exports = app;
