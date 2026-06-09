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

export const FACTORS = Object.freeze({
  carKgPerKm: 0.192,
  publicTransitKgPerKm: 0.045,
  shortFlightKg: 255,
  electricityKgPerKwh: 0.385,
  wasteBagKg: 2.7,
  shoppingKgPerDollar: 0.42,
  dietAnnualKg: {
    plantFocused: 1050,
    mixed: 1650,
    meatHeavy: 2450
  }
});

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

const CATEGORY_LABELS = Object.freeze({
  transport: "Transport",
  flights: "Flights",
  home: "Home energy",
  food: "Food",
  waste: "Waste",
  purchases: "Purchases"
});

export function normalizeProfile(profile = {}) {
  const merged = { ...DEFAULT_PROFILE, ...profile };
  return {
    carKm: clampNumber(merged.carKm, 0, 500),
    publicKm: clampNumber(merged.publicKm, 0, 300),
    flights: clampNumber(merged.flights, 0, 30),
    electricityKwh: clampNumber(merged.electricityKwh, 0, 1200),
    renewableShare: clampNumber(merged.renewableShare, 0, 100),
    diet: FACTORS.dietAnnualKg[merged.diet] ? merged.diet : DEFAULT_PROFILE.diet,
    wasteBags: clampNumber(merged.wasteBags, 0, 20),
    shoppingSpend: clampNumber(merged.shoppingSpend, 0, 5000)
  };
}

export function calculateFootprint(profile) {
  const data = normalizeProfile(profile);
  const electricityFactor = FACTORS.electricityKgPerKwh * (1 - data.renewableShare / 100);
  const categories = {
    transport: (data.carKm * FACTORS.carKgPerKm + data.publicKm * FACTORS.publicTransitKgPerKm) * 52,
    flights: data.flights * FACTORS.shortFlightKg,
    home: data.electricityKwh * electricityFactor * 12,
    food: FACTORS.dietAnnualKg[data.diet],
    waste: data.wasteBags * FACTORS.wasteBagKg * 52,
    purchases: data.shoppingSpend * FACTORS.shoppingKgPerDollar * 12
  };
  const totalKg = Object.values(categories).reduce((sum, value) => sum + value, 0);
  const largestKey = Object.entries(categories).sort((a, b) => b[1] - a[1])[0][0];

  return {
    profile: data,
    categories,
    totalKg,
    totalTonnes: totalKg / 1000,
    largestKey,
    largestLabel: CATEGORY_LABELS[largestKey]
  };
}

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

export function calculateActionSavings(actionIds = []) {
  const selected = new Set(actionIds);
  return ACTIONS
    .filter((action) => selected.has(action.id))
    .reduce((sum, action) => sum + action.impactKg, 0);
}

export function buildInsights(profile, selectedActionIds = []) {
  const estimate = calculateFootprint(profile);
  const savingsKg = calculateActionSavings(selectedActionIds);
  const targetKg = 2000;
  const progress = Math.min(100, Math.round((savingsKg / Math.max(estimate.totalKg, 1)) * 100));
  const gapKg = Math.max(0, estimate.totalKg - savingsKg - targetKg);

  const insights = [
    `${estimate.largestLabel} is your largest source at ${formatKg(estimate.categories[estimate.largestKey])} kg CO2e each year.`,
    savingsKg > 0
      ? `Your selected actions can reduce about ${formatKg(savingsKg)} kg CO2e per year, roughly ${progress}% of your current estimate.`
      : "Start with one low-effort action to create momentum and make the dashboard personal.",
    gapKg > 0
      ? `After planned actions, you are about ${formatKg(gapKg)} kg above a 2-tonne climate-aligned annual target.`
      : "Your planned actions bring you within a 2-tonne climate-aligned annual target."
  ];

  if (estimate.profile.renewableShare < 50 && estimate.categories.home > 900) {
    insights.push("Increasing renewable electricity share is likely to produce a meaningful home-energy reduction.");
  }

  if (estimate.profile.diet === "meatHeavy") {
    insights.push("A few plant-forward meals each week can cut emissions without requiring an all-or-nothing diet change.");
  }

  return insights;
}

export function formatKg(value) {
  return Math.round(value).toLocaleString("en-US");
}

function categoryMatchesEstimate(actionCategory, largestLabel) {
  if (largestLabel === "Transport" && actionCategory === "Flights") return true;
  return actionCategory === largestLabel;
}

function clampNumber(value, min, max) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}
