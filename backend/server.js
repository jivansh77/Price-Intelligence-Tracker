/**
 * Price Intelligence Backend Server
 *
 * Express server that exposes pricing endpoints.
 * Uses DynamoDB for persistent storage when AWS credentials are available,
 * falls back to in-memory storage for local development.
 */

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { calculatePricing, analyzePriceTrends, bulkPricingAnalysis } = require("./pricingLogic");
const { generatePricingInsight, generateDashboardSummary } = require("./aiService");

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------------------------------------------------------------------
// DynamoDB setup
// ---------------------------------------------------------------------------

const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE || "PricingHistory";
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

let dynamoDb = null;
let useDynamo = false;

try {
  const client = new DynamoDBClient({ region: AWS_REGION });
  dynamoDb = DynamoDBDocumentClient.from(client);
  useDynamo = true;
  console.log(`DynamoDB enabled – table: ${DYNAMODB_TABLE}, region: ${AWS_REGION}`);
} catch (err) {
  console.warn("DynamoDB client init failed; falling back to in-memory storage.", err.message);
}

const pricingHistory = [];

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
  })
);

app.use(bodyParser.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * POST /api/price
 *
 * Expects JSON body:
 *   { productId, ownPrice, competitorPrice, elasticity? }
 *
 * Returns:
 *   { productId, optimalPriceBand, markdownTiming }
 */
app.post("/api/price", async (req, res) => {
  const { productId, ownPrice, competitorPrice, elasticity } = req.body;

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

  const { optimalPriceBand, markdownTiming } = calculatePricing(
    ownPriceNum,
    competitorPriceNum,
    elasticityNum
  );

  const result = {
    productId,
    ownPrice: ownPriceNum,
    competitorPrice: competitorPriceNum,
    elasticity: elasticityNum,
    optimalPriceBand: parseFloat(optimalPriceBand.toFixed(2)),
    markdownTiming,
    timestamp: new Date().toISOString(),
  };

  if (useDynamo) {
    try {
      await dynamoDb.send(
        new PutCommand({
          TableName: DYNAMODB_TABLE,
          Item: {
            productId: result.productId,
            timestamp: result.timestamp,
            ownPrice: result.ownPrice,
            competitorPrice: result.competitorPrice,
            elasticity: result.elasticity,
            optimalPriceBand: result.optimalPriceBand,
            markdownTiming: result.markdownTiming,
          },
        })
      );
    } catch (err) {
      console.error("DynamoDB putItem failed:", err.message);
    }
  } else {
    pricingHistory.push(result);
  }

  return res.json({
    productId: result.productId,
    optimalPriceBand: result.optimalPriceBand,
    markdownTiming: result.markdownTiming,
  });
});

/**
 * GET /api/price/history
 *
 * Returns pricing history from DynamoDB (or in-memory fallback).
 */
app.get("/api/price/history", async (_req, res) => {
  if (useDynamo) {
    try {
      const data = await dynamoDb.send(
        new ScanCommand({ TableName: DYNAMODB_TABLE })
      );
      return res.json(data.Items || []);
    } catch (err) {
      console.error("DynamoDB scan failed:", err.message);
      return res.status(500).json({ error: "Failed to fetch history from DynamoDB." });
    }
  }
  return res.json(pricingHistory);
});

/**
 * POST /api/price/bulk
 * 
 * Bulk pricing analysis for multiple products
 * Expects JSON body: { products: [{ productId, ownPrice, competitorPrice, elasticity? }] }
 */
app.post("/api/price/bulk", async (req, res) => {
  const { products } = req.body;

  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({
      error: "Please provide an array of products with productId, ownPrice, and competitorPrice."
    });
  }

  try {
    const analysis = bulkPricingAnalysis(products);
    
    // Store bulk analysis results
    if (useDynamo) {
      const timestamp = new Date().toISOString();
      for (const product of analysis.products) {
        try {
          await dynamoDb.send(
            new PutCommand({
              TableName: DYNAMODB_TABLE,
              Item: {
                productId: product.productId,
                timestamp,
                ownPrice: product.ownPrice,
                competitorPrice: product.competitorPrice,
                elasticity: product.elasticity,
                optimalPriceBand: product.optimalPriceBand,
                markdownTiming: product.markdownTiming,
                priceGap: parseFloat(product.priceGap),
                bulkAnalysis: true
              }
            })
          );
        } catch (err) {
          console.error(`Failed to store product ${product.productId}:`, err.message);
        }
      }
    } else {
      analysis.products.forEach(product => {
        pricingHistory.push({
          ...product,
          timestamp: new Date().toISOString(),
          bulkAnalysis: true
        });
      });
    }

    return res.json(analysis);
  } catch (error) {
    console.error("Bulk analysis error:", error);
    return res.status(500).json({ error: "Failed to process bulk analysis" });
  }
});

/**
 * GET /api/analytics/trends/:productId
 * 
 * Get pricing trends for a specific product
 */
app.get("/api/analytics/trends/:productId", async (req, res) => {
  const { productId } = req.params;

  try {
    let historicalData = [];

    if (useDynamo) {
      const data = await dynamoDb.send(
        new ScanCommand({
          TableName: DYNAMODB_TABLE,
          FilterExpression: "productId = :pid",
          ExpressionAttributeValues: {
            ":pid": productId
          }
        })
      );
      historicalData = data.Items || [];
    } else {
      historicalData = pricingHistory.filter(item => item.productId === productId);
    }

    const trends = analyzePriceTrends(historicalData);
    
    return res.json({
      productId,
      dataPoints: historicalData.length,
      trends,
      history: historicalData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20)
    });
  } catch (error) {
    console.error("Trends analysis error:", error);
    return res.status(500).json({ error: "Failed to analyze trends" });
  }
});

/**
 * GET /api/analytics/dashboard
 * 
 * Dashboard summary statistics
 */
app.get("/api/analytics/dashboard", async (req, res) => {
  try {
    let allData = [];

    if (useDynamo) {
      const data = await dynamoDb.send(new ScanCommand({ TableName: DYNAMODB_TABLE }));
      allData = data.Items || [];
    } else {
      allData = pricingHistory;
    }

    const last30Days = allData.filter(item => {
      const itemDate = new Date(item.timestamp);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return itemDate >= thirtyDaysAgo;
    });

    const uniqueProducts = [...new Set(allData.map(item => item.productId))];
    
    const markdownStats = {
      immediate: allData.filter(item => item.markdownTiming === 'Immediate').length,
      hold: allData.filter(item => item.markdownTiming === 'Hold').length,
      monitor: allData.filter(item => item.markdownTiming === 'Monitor').length
    };

    return res.json({
      totalAnalyses: allData.length,
      last30Days: last30Days.length,
      uniqueProducts: uniqueProducts.length,
      markdownStats,
      recentProducts: uniqueProducts.slice(-10),
      avgOptimalPrice: allData.length > 0 ? 
        (allData.reduce((sum, item) => sum + Number(item.optimalPriceBand), 0) / allData.length).toFixed(2) : 0
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

// ---------------------------------------------------------------------------
// AI-powered insight routes
// ---------------------------------------------------------------------------

/**
 * POST /api/ai/pricing-insight
 *
 * Generates a Gemini-powered strategic insight for a single pricing analysis.
 */
app.post("/api/ai/pricing-insight", async (req, res) => {
  const { productId, ownPrice, competitorPrice, elasticity, optimalPriceBand, markdownTiming } = req.body;

  if (!productId || optimalPriceBand == null) {
    return res.status(400).json({ error: "Missing pricing data for AI insight." });
  }

  try {
    const result = await generatePricingInsight({
      productId,
      ownPrice,
      competitorPrice,
      elasticity,
      optimalPriceBand,
      markdownTiming,
    });
    return res.json(result);
  } catch (err) {
    console.error("AI pricing insight route error:", err.message);
    return res.status(500).json({ insight: null, error: "AI service unavailable" });
  }
});

/**
 * POST /api/ai/dashboard-summary
 *
 * Generates a Gemini-powered portfolio summary from dashboard stats.
 */
app.post("/api/ai/dashboard-summary", async (req, res) => {
  const { totalAnalyses, uniqueProducts, last30Days, avgOptimalPrice, markdownStats } = req.body;

  if (totalAnalyses == null) {
    return res.status(400).json({ error: "Missing dashboard data for AI summary." });
  }

  try {
    const result = await generateDashboardSummary({
      totalAnalyses,
      uniqueProducts,
      last30Days,
      avgOptimalPrice,
      markdownStats,
    });
    return res.json(result);
  } catch (err) {
    console.error("AI dashboard summary route error:", err.message);
    return res.status(500).json({ summary: null, error: "AI service unavailable" });
  }
});

/**
 * GET /api/health
 */
app.get("/api/health", (_req, res) => {
  return res.json({ status: "ok", dynamo: useDynamo });
});

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Price Intelligence API running on http://localhost:${PORT}`);
});

module.exports = app;
