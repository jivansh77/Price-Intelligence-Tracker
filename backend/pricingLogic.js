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
