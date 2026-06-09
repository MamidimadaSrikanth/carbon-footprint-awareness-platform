import assert from "node:assert/strict";
import {
  ACTIONS,
  buildInsights,
  calculateActionSavings,
  calculateFootprint,
  normalizeProfile,
  recommendActions
} from "../src/carbon.js";

const lowCarbonProfile = normalizeProfile({
  carKm: 0,
  publicKm: 20,
  flights: 0,
  electricityKwh: 120,
  renewableShare: 100,
  diet: "plantFocused",
  wasteBags: 1,
  shoppingSpend: 50
});

const highCarbonProfile = normalizeProfile({
  carKm: 450,
  publicKm: 0,
  flights: 6,
  electricityKwh: 900,
  renewableShare: 0,
  diet: "meatHeavy",
  wasteBags: 8,
  shoppingSpend: 900
});

assert.equal(normalizeProfile({ carKm: -100 }).carKm, 0);
assert.equal(normalizeProfile({ carKm: 999 }).carKm, 500);
assert.equal(normalizeProfile({ diet: "unknown" }).diet, "mixed");

const lowEstimate = calculateFootprint(lowCarbonProfile);
const highEstimate = calculateFootprint(highCarbonProfile);

assert.ok(lowEstimate.totalKg > 0, "low estimate should be positive");
assert.ok(highEstimate.totalKg > lowEstimate.totalKg, "higher-impact profile should produce a larger estimate");
assert.equal(Object.keys(lowEstimate.categories).length, 6);

const selected = [ACTIONS[0].id, ACTIONS[3].id];
assert.equal(calculateActionSavings(selected), ACTIONS[0].impactKg + ACTIONS[3].impactKg);

const recommendations = recommendActions(highCarbonProfile, selected);
assert.ok(recommendations.some((action) => action.recommended), "recommendations should mark matching actions");
assert.equal(recommendations.find((action) => action.id === selected[0]).selected, true);

const insights = buildInsights(highCarbonProfile, selected);
assert.ok(insights.length >= 3);
assert.ok(insights[0].includes("largest source"));

console.log("All carbon calculation tests passed.");
