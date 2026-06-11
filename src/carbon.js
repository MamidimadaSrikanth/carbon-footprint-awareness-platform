/**
 * Carbon footprint calculator engine and configuration constants.
 * Handles emission factors, profile normalization, footprint calculations,
 * action recommendations, and insight generation.
 */

/**
 * Conversion and annual scaling factors.
 * Named constants to replace magic numbers in math calculations.
 */
const PERCENT_CONVERSION = 100;
const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;
const KG_PER_TONNE = 1000;
const TARGET_KG = 2000;
const LOW_RENEWABLE_THRESHOLD = 50;
const HIGH_HOME_EMISSIONS_THRESHOLD = 900;

/**
 * Standard user inputs for carbon footprint calculations when no state is saved.
 * @type {Readonly<{carKm: number, publicKm: number, flights: number, electricityKwh: number, renewableShare: number, diet: string, wasteBags: number, shoppingSpend: number}>}
 */
export const DEFAULT_PROFILE = Object.freeze({
  carKm: 120,
  publicKm: 40,
  flights: 1,
  electricityKwh: 350,
  renewableShare: 20,
  diet: "mixed",
  wasteBags: 3,
  shoppingSpend: 250
});

/**
 * Annual emission coefficients (factors) per activity unit in kilograms of CO2e.
 * @type {Readonly<{carKgPerKm: number, publicTransitKgPerKm: number, shortFlightKg: number, electricityKgPerKwh: number, wasteBagKg: number, shoppingKgPerDollar: number, dietAnnualKg: Readonly<{plantFocused: number, mixed: number, meatHeavy: number}>}>}
 */
export const FACTORS = Object.freeze({
  carKgPerKm: 0.192,
  publicTransitKgPerKm: 0.045,
  shortFlightKg: 255,
  electricityKgPerKwh: 0.385,
  wasteBagKg: 2.7,
  shoppingKgPerDollar: 0.42,
  dietAnnualKg: Object.freeze({
    plantFocused: 1050,
    mixed: 1650,
    meatHeavy: 2450
  })
});

/**
 * Available carbon reduction actions list.
 * @type {ReadonlyArray<{id: string, category: string, title: string, impactKg: number, effort: string}>}
 */
export const ACTIONS = Object.freeze([
  {
    id: "bike-two-days",
    category: "Transport",
    title: "Replace two car trips with walking, biking, or transit",
    impactKg: 520,
    effort: "Medium"
  },
  {
    id: "efficient-driving",
    category: "Transport",
    title: "Plan errands together and drive efficiently",
    impactKg: 210,
    effort: "Low"
  },
  {
    id: "skip-flight",
    category: "Flights",
    title: "Replace one short flight with rail, bus, or a virtual meeting",
    impactKg: 255,
    effort: "Medium"
  },
  {
    id: "renewable-power",
    category: "Home energy",
    title: "Move electricity plan toward renewable supply",
    impactKg: 620,
    effort: "Medium"
  },
  {
    id: "smart-thermostat",
    category: "Home energy",
    title: "Reduce heating and cooling demand by 2 degrees",
    impactKg: 330,
    effort: "Low"
  },
  {
    id: "plant-protein",
    category: "Food",
    title: "Choose plant protein for five meals each week",
    impactKg: 410,
    effort: "Low"
  },
  {
    id: "food-waste",
    category: "Waste",
    title: "Plan meals and compost food scraps",
    impactKg: 190,
    effort: "Low"
  },
  {
    id: "buy-less",
    category: "Purchases",
    title: "Delay non-essential purchases for 30 days",
    impactKg: 360,
    effort: "Medium"
  }
]);

/**
 * Input categories constraints (min/max boundaries) for clamping checks.
 */
export const LIMITS = Object.freeze({
  carKm: { min: 0, max: 500 },
  publicKm: { min: 0, max: 300 },
  flights: { min: 0, max: 30 },
  electricityKwh: { min: 0, max: 1200 },
  renewableShare: { min: 0, max: 100 },
  wasteBags: { min: 0, max: 20 },
  shoppingSpend: { min: 0, max: 5000 }
});

/**
 * UI display labels corresponding to internal category keys.
 * @type {Readonly<{transport: string, flights: string, home: string, food: string, waste: string, purchases: string}>}
 */
const CATEGORY_LABELS = Object.freeze({
  transport: "Transport",
  flights: "Flights",
  home: "Home energy",
  food: "Food",
  waste: "Waste",
  purchases: "Purchases"
});

/**
 * Parses user input profile values, applies defaults, and clamps to safe boundaries.
 * @param {object} [profile={}] - Raw user carbon inputs.
 * @returns {{carKm: number, publicKm: number, flights: number, electricityKwh: number, renewableShare: number, diet: string, wasteBags: number, shoppingSpend: number}} The normalized user profile.
 */
export function normalizeProfile(profile = {}) {
  const merged = { ...DEFAULT_PROFILE, ...profile };
  return {
    carKm: clampNumber(merged.carKm, LIMITS.carKm.min, LIMITS.carKm.max),
    publicKm: clampNumber(merged.publicKm, LIMITS.publicKm.min, LIMITS.publicKm.max),
    flights: clampNumber(merged.flights, LIMITS.flights.min, LIMITS.flights.max),
    electricityKwh: clampNumber(merged.electricityKwh, LIMITS.electricityKwh.min, LIMITS.electricityKwh.max),
    renewableShare: clampNumber(merged.renewableShare, LIMITS.renewableShare.min, LIMITS.renewableShare.max),
    diet: FACTORS.dietAnnualKg[merged.diet] ? merged.diet : DEFAULT_PROFILE.diet,
    wasteBags: clampNumber(merged.wasteBags, LIMITS.wasteBags.min, LIMITS.wasteBags.max),
    shoppingSpend: clampNumber(merged.shoppingSpend, LIMITS.shoppingSpend.min, LIMITS.shoppingSpend.max)
  };
}

/**
 * Calculates carbon emissions in kilograms of CO2e per year across all categories.
 * @param {object} profile - Normalized user footprint profile.
 * @returns {{profile: object, categories: object, totalKg: number, totalTonnes: number, largestKey: string, largestLabel: string}} Footprint estimate details.
 */
export function calculateFootprint(profile) {
  const data = normalizeProfile(profile);
  const electricityFactor = FACTORS.electricityKgPerKwh * (1 - data.renewableShare / PERCENT_CONVERSION);
  const categories = {
    transport: (data.carKm * FACTORS.carKgPerKm + data.publicKm * FACTORS.publicTransitKgPerKm) * WEEKS_PER_YEAR,
    flights: data.flights * FACTORS.shortFlightKg,
    home: data.electricityKwh * electricityFactor * MONTHS_PER_YEAR,
    food: FACTORS.dietAnnualKg[data.diet],
    waste: data.wasteBags * FACTORS.wasteBagKg * WEEKS_PER_YEAR,
    purchases: data.shoppingSpend * FACTORS.shoppingKgPerDollar * MONTHS_PER_YEAR
  };
  const totalKg = Object.values(categories).reduce((sum, value) => sum + value, 0);
  const largestKey = Object.entries(categories).sort((a, b) => b[1] - a[1])[0][0];

  return {
    profile: data,
    categories,
    totalKg,
    totalTonnes: totalKg / KG_PER_TONNE,
    largestKey,
    largestLabel: CATEGORY_LABELS[largestKey]
  };
}

/**
 * Recommends action plans, flagging recommended items and sorting relevant ones to the top.
 * @param {object} profile - Normalized user footprint profile.
 * @param {string[]} [selectedActionIds=[]] - Array of checked action IDs.
 * @returns {object[]} Recommendations array sorted with prioritized categories first.
 */
export function recommendActions(profile, selectedActionIds = []) {
  const estimate = calculateFootprint(profile);
  const selected = new Set(selectedActionIds);
  const sorted = [...ACTIONS].sort((a, b) => {
    const aMatches = categoryMatchesEstimate(a.category, estimate.largestLabel) ? 1 : 0;
    const bMatches = categoryMatchesEstimate(b.category, estimate.largestLabel) ? 1 : 0;
    return bMatches - aMatches || b.impactKg - a.impactKg;
  });

  return sorted.map((action) => ({
    ...action,
    selected: selected.has(action.id),
    recommended: categoryMatchesEstimate(action.category, estimate.largestLabel)
  }));
}

/**
 * Calculates total planned savings from the set of selected action IDs.
 * @param {string[]} [actionIds=[]] - Array of checked action IDs.
 * @returns {number} Sum of impact in kilograms of CO2e.
 */
export function calculateActionSavings(actionIds = []) {
  const selected = new Set(actionIds);
  return ACTIONS
    .filter((action) => selected.has(action.id))
    .reduce((sum, action) => sum + action.impactKg, 0);
}

/**
 * Generates dynamic, helpful text insights based on profile inputs and planned savings.
 * @param {object} profile - Normalized user footprint profile.
 * @param {string[]} [selectedActionIds=[]] - Array of checked action IDs.
 * @returns {string[]} An array of insight sentence strings.
 */
export function buildInsights(profile, selectedActionIds = []) {
  const estimate = calculateFootprint(profile);
  const savingsKg = calculateActionSavings(selectedActionIds);
  const progress = Math.min(100, Math.round((savingsKg / Math.max(estimate.totalKg, 1)) * 100));
  const gapKg = Math.max(0, estimate.totalKg - savingsKg - TARGET_KG);

  const insights = [
    `${estimate.largestLabel} is your largest source at ${formatKg(estimate.categories[estimate.largestKey])} kg CO2e each year.`,
    savingsKg > 0
      ? `Your selected actions can reduce about ${formatKg(savingsKg)} kg CO2e per year, roughly ${progress}% of your current estimate.`
      : "Start with one low-effort action to create momentum and make the dashboard personal.",
    gapKg > 0
      ? `After planned actions, you are about ${formatKg(gapKg)} kg above a 2-tonne climate-aligned annual target.`
      : "Your planned actions bring you within a 2-tonne climate-aligned annual target."
  ];

  if (estimate.profile.renewableShare < LOW_RENEWABLE_THRESHOLD && estimate.categories.home > HIGH_HOME_EMISSIONS_THRESHOLD) {
    insights.push("Increasing renewable electricity share is likely to produce a meaningful home-energy reduction.");
  }

  if (estimate.profile.diet === "meatHeavy") {
    insights.push("A few plant-forward meals each week can cut emissions without requiring an all-or-nothing diet change.");
  }

  return insights;
}

/**
 * Formats a raw numeric kilogram value to a rounded, comma-separated locale string.
 * @param {number} value - The raw number.
 * @returns {string} The formatted string (e.g. 1,500).
 */
export function formatKg(value) {
  return Math.round(value).toLocaleString("en-US");
}

/**
 * Helper to determine if an action category maps to the user's largest footprint contributor.
 * @param {string} actionCategory - Category of the action item.
 * @param {string} largestLabel - Label of the largest emissions contributor.
 * @returns {boolean} True if matching.
 */
function categoryMatchesEstimate(actionCategory, largestLabel) {
  if (largestLabel === "Transport" && actionCategory === "Flights") return true;
  return actionCategory === largestLabel;
}

/**
 * Utility helper to parse and clamp numbers within specified boundary ranges.
 * @param {*} value - The input value to parse.
 * @param {number} min - Lower boundary.
 * @param {number} max - Upper boundary.
 * @returns {number} The clamped output value.
 */
function clampNumber(value, min, max) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}
