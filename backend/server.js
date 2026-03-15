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
const { calculatePricing } = require("./pricingLogic");

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
