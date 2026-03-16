/**
 * AI Service – Gemini-powered pricing insights
 *
 * Wraps Google Generative AI SDK to produce natural-language
 * strategy recommendations from raw pricing data.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

const MODEL_NAME = "gemini-2.0-flash";

let model = null;

function getModel() {
  if (model) return model;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: MODEL_NAME });
  return model;
}

/**
 * Generate a strategic pricing insight for a single product analysis.
 */
async function generatePricingInsight({
  productId,
  ownPrice,
  competitorPrice,
  elasticity,
  optimalPriceBand,
  markdownTiming,
}) {
  const m = getModel();
  if (!m) {
    return { insight: null, error: "GEMINI_API_KEY not configured" };
  }

  const prompt = `You are a senior D2C pricing strategist. A brand just ran a competitive price analysis. Based on the data below, provide a concise strategic insight in 3-4 bullet points. Cover: (1) why this optimal price makes sense, (2) competitive positioning, (3) risk factors, and (4) a concrete next step.

Data:
- Product: ${productId}
- Brand's current price: $${ownPrice}
- Competitor price: $${competitorPrice}
- Demand elasticity: ${elasticity}
- Recommended optimal price: $${optimalPriceBand}
- Markdown timing recommendation: ${markdownTiming}
- Price gap vs competitor: ${(((ownPrice - competitorPrice) / competitorPrice) * 100).toFixed(1)}%

Rules:
- Be specific to the numbers provided – do NOT give generic advice.
- Each bullet should be 1-2 sentences max.
- Use plain language a product manager can act on.
- Do NOT use markdown headers or bold text. Use simple bullet points with "•".`;

  try {
    const result = await m.generateContent(prompt);
    const text = result.response.text();
    return { insight: text.trim() };
  } catch (err) {
    console.error("Gemini pricing insight error:", err.message);
    return { insight: null, error: "Failed to generate AI insight" };
  }
}

/**
 * Generate a portfolio-level summary from dashboard statistics.
 */
async function generateDashboardSummary({
  totalAnalyses,
  uniqueProducts,
  last30Days,
  avgOptimalPrice,
  markdownStats,
}) {
  const m = getModel();
  if (!m) {
    return { summary: null, error: "GEMINI_API_KEY not configured" };
  }

  const immediatePercent = totalAnalyses > 0
    ? ((markdownStats.immediate / totalAnalyses) * 100).toFixed(0)
    : 0;
  const holdPercent = totalAnalyses > 0
    ? ((markdownStats.hold / totalAnalyses) * 100).toFixed(0)
    : 0;
  const monitorPercent = totalAnalyses > 0
    ? ((markdownStats.monitor / totalAnalyses) * 100).toFixed(0)
    : 0;

  const prompt = `You are a senior D2C pricing strategist reviewing a brand's pricing portfolio. Based on the summary data below, provide 3-4 bullet points covering: (1) overall portfolio health assessment, (2) the most pressing opportunity or risk, (3) a trend observation, and (4) a recommended priority action.

Portfolio Data:
- Total analyses run: ${totalAnalyses}
- Unique products tracked: ${uniqueProducts}
- Analyses in last 30 days: ${last30Days}
- Average optimal price across products: $${avgOptimalPrice}
- Markdown timing breakdown:
  • Immediate (overpriced, needs markdown): ${markdownStats.immediate} (${immediatePercent}%)
  • Hold (well-priced): ${markdownStats.hold} (${holdPercent}%)
  • Monitor (competitive range): ${markdownStats.monitor} (${monitorPercent}%)

Rules:
- Be specific to the numbers provided – do NOT give generic advice.
- Each bullet should be 1-2 sentences max.
- Use plain language a product manager can act on.
- Do NOT use markdown headers or bold text. Use simple bullet points with "•".`;

  try {
    const result = await m.generateContent(prompt);
    const text = result.response.text();
    return { summary: text.trim() };
  } catch (err) {
    console.error("Gemini dashboard summary error:", err.message);
    return { summary: null, error: "Failed to generate AI summary" };
  }
}

module.exports = {
  generatePricingInsight,
  generateDashboardSummary,
};
