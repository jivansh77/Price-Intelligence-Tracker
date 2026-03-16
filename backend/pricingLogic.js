/**
 * Pricing Logic Module
 *
 * Contains the core business rules for calculating the optimal price band
 * and markdown timing for a D2C product given its own price, a competitor's
 * price, and a demand-elasticity factor.
 *
 * Rules:
 *  1. If ownPrice > competitorPrice * 1.1  →  optimal = competitor * 1.05,  markdown = "Immediate"
 *  2. If ownPrice < competitorPrice * 0.9  →  optimal = ownPrice,           markdown = "Hold"
 *  3. Else (competitive range):
 *       a. elasticity > 1  →  optimal = competitor * 0.98,  markdown = "Monitor"
 *       b. elasticity <= 1  →  optimal = competitor * 1.02,  markdown = "Monitor"
 */

/**
 * Calculate optimal price band and markdown timing.
 *
 * @param {number} ownPrice         – The brand's current price for the product.
 * @param {number} competitorPrice  – The main competitor's price.
 * @param {number} elasticity       – Demand elasticity factor (default 1.5).
 * @returns {{ optimalPriceBand: number, markdownTiming: string }}
 */
function calculatePricing(ownPrice, competitorPrice, elasticity = 1.5) {
  let optimalPriceBand;
  let markdownTiming;

  const upperThreshold = competitorPrice * 1.1; // 10 % above competitor
  const lowerThreshold = competitorPrice * 0.9; // 10 % below competitor

  if (ownPrice > upperThreshold) {
    // Own price is significantly higher than competitor – recommend a markdown.
    optimalPriceBand = competitorPrice * 1.05;
    markdownTiming = "Immediate";
  } else if (ownPrice < lowerThreshold) {
    // Own price is well below competitor – hold current price.
    optimalPriceBand = ownPrice;
    markdownTiming = "Hold";
  } else {
    // Prices are in a competitive range – decision depends on elasticity.
    if (elasticity > 1) {
      // Elastic demand: a small price drop can increase volume.
      optimalPriceBand = competitorPrice * 0.98;
      markdownTiming = "Monitor";
    } else {
      // Inelastic demand: slight premium is sustainable.
      optimalPriceBand = competitorPrice * 1.02;
      markdownTiming = "Monitor";
    }
  }

  return { optimalPriceBand, markdownTiming };
}

module.exports = { calculatePricing };

/**
 * Calculate price trend analysis for historical data
 */
function analyzePriceTrends(historicalData) {
  if (!historicalData || historicalData.length < 2) {
    return { trend: 'insufficient_data', recommendation: 'Need more data points' };
  }

  const sortedData = historicalData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const recent = sortedData.slice(-5); // Last 5 entries

  const avgOptimalPrice = recent.reduce((sum, item) => sum + item.optimalPriceBand, 0) / recent.length;
  const priceVariance = recent.reduce((sum, item) => sum + Math.pow(item.optimalPriceBand - avgOptimalPrice, 2), 0) / recent.length;

  let trend = 'stable';
  if (priceVariance > avgOptimalPrice * 0.1) {
    trend = 'volatile';
  } else if (recent[recent.length - 1].optimalPriceBand > recent[0].optimalPriceBand * 1.05) {
    trend = 'increasing';
  } else if (recent[recent.length - 1].optimalPriceBand < recent[0].optimalPriceBand * 0.95) {
    trend = 'decreasing';
  }

  return {
    trend,
    avgOptimalPrice: parseFloat(avgOptimalPrice.toFixed(2)),
    priceVariance: parseFloat(priceVariance.toFixed(2)),
    recommendation: getTrendRecommendation(trend)
  };
}

function getTrendRecommendation(trend) {
  switch (trend) {
    case 'increasing':
      return 'Market prices trending up - consider gradual price increases';
    case 'decreasing':
      return 'Market prices declining - monitor competitors closely';
    case 'volatile':
      return 'High price volatility detected - implement dynamic pricing strategy';
    default:
      return 'Stable pricing environment - maintain current strategy';
  }
}

/**
 * Bulk pricing analysis for multiple products
 */
function bulkPricingAnalysis(products) {
  const results = products.map(product => {
    const { productId, ownPrice, competitorPrice, elasticity = 1.5 } = product;
    const pricing = calculatePricing(ownPrice, competitorPrice, elasticity);

    return {
      productId,
      ownPrice,
      competitorPrice,
      elasticity,
      ...pricing,
      priceGap: ((ownPrice - competitorPrice) / competitorPrice * 100).toFixed(1),
      potentialRevenue: calculatePotentialRevenue(ownPrice, pricing.optimalPriceBand, elasticity)
    };
  });

  return {
    products: results,
    summary: {
      totalProducts: results.length,
      immediateActions: results.filter(p => p.markdownTiming === 'Immediate').length,
      holdRecommendations: results.filter(p => p.markdownTiming === 'Hold').length,
      monitorRecommendations: results.filter(p => p.markdownTiming === 'Monitor').length,
      avgPriceGap: (results.reduce((sum, p) => sum + parseFloat(p.priceGap), 0) / results.length).toFixed(1)
    }
  };
}

function calculatePotentialRevenue(currentPrice, optimalPrice, elasticity) {
  const priceChange = (optimalPrice - currentPrice) / currentPrice;
  const demandChange = -elasticity * priceChange;
  const revenueChange = (1 + priceChange) * (1 + demandChange) - 1;

  return {
    priceChange: (priceChange * 100).toFixed(1),
    demandChange: (demandChange * 100).toFixed(1),
    revenueImpact: (revenueChange * 100).toFixed(1)
  };
}

module.exports = {
  calculatePricing,
  analyzePriceTrends,
  bulkPricingAnalysis
};
