import assert from "node:assert/strict";
import {
  ACTIONS,
  DEFAULT_PROFILE,
  FACTORS,
  buildInsights,
  calculateActionSavings,
  calculateFootprint,
  normalizeProfile,
  recommendActions,
  formatKg
} from "../src/carbon.js";

// --- 1. normalizeProfile Tests ---

// Default profile merge
const defaultNormalized = normalizeProfile();
assert.equal(defaultNormalized.carKm, DEFAULT_PROFILE.carKm);
assert.equal(defaultNormalized.diet, DEFAULT_PROFILE.diet);

// Input clamping (Under limits)
const underLimitProfile = normalizeProfile({
  carKm: -50,
  publicKm: -10,
  flights: -2,
  electricityKwh: -100,
  renewableShare: -10,
  wasteBags: -5,
  shoppingSpend: -500
});
assert.equal(underLimitProfile.carKm, 0);
assert.equal(underLimitProfile.publicKm, 0);
assert.equal(underLimitProfile.flights, 0);
assert.equal(underLimitProfile.electricityKwh, 0);
assert.equal(underLimitProfile.renewableShare, 0);
assert.equal(underLimitProfile.wasteBags, 0);
assert.equal(underLimitProfile.shoppingSpend, 0);

// Input clamping (Over limits)
const overLimitProfile = normalizeProfile({
  carKm: 600,
  publicKm: 400,
  flights: 50,
  electricityKwh: 1500,
  renewableShare: 120,
  wasteBags: 25,
  shoppingSpend: 6000
});
assert.equal(overLimitProfile.carKm, 500);
assert.equal(overLimitProfile.publicKm, 300);
assert.equal(overLimitProfile.flights, 30);
assert.equal(overLimitProfile.electricityKwh, 1200);
assert.equal(overLimitProfile.renewableShare, 100);
assert.equal(overLimitProfile.wasteBags, 20);
assert.equal(overLimitProfile.shoppingSpend, 5000);

// Invalid properties (diet fallback, NaN/null inputs)
assert.equal(normalizeProfile({ diet: "unknown-diet" }).diet, "mixed");
assert.equal(normalizeProfile({ diet: "plantFocused" }).diet, "plantFocused");
assert.equal(normalizeProfile({ diet: "meatHeavy" }).diet, "meatHeavy");
assert.equal(normalizeProfile({ carKm: "abc" }).carKm, 0); // clampNumber falls back to min
assert.equal(normalizeProfile({ carKm: null }).carKm, 0);
assert.equal(normalizeProfile({ carKm: 250.5 }).carKm, 250.5); // floats allowed

// --- 2. calculateFootprint Tests ---

// Low-emissions profile footprint math check
const lowProfile = normalizeProfile({
  carKm: 0,
  publicKm: 0,
  flights: 0,
  electricityKwh: 0,
  renewableShare: 100,
  diet: "plantFocused",
  wasteBags: 0,
  shoppingSpend: 0
});
const lowFootprint = calculateFootprint(lowProfile);
assert.equal(lowFootprint.categories.transport, 0);
assert.equal(lowFootprint.categories.flights, 0);
assert.equal(lowFootprint.categories.home, 0);
assert.equal(lowFootprint.categories.food, 1050);
assert.equal(lowFootprint.categories.waste, 0);
assert.equal(lowFootprint.categories.purchases, 0);
assert.equal(lowFootprint.totalKg, 1050);
assert.equal(lowFootprint.totalTonnes, 1.05);
assert.equal(lowFootprint.largestKey, "food");
assert.equal(lowFootprint.largestLabel, "Food");

// Standard profile calculation math check
const stdProfile = normalizeProfile({
  carKm: 100, // 100 * 0.192 * 52 = 998.4
  publicKm: 50, // 50 * 0.045 * 52 = 117
  flights: 2,  // 2 * 255 = 510
  electricityKwh: 200, // 200 * (0.385 * 0.5) * 12 = 462
  renewableShare: 50,
  diet: "mixed", // 1650
  wasteBags: 3,  // 3 * 2.7 * 52 = 421.2
  shoppingSpend: 100 // 100 * 0.42 * 12 = 504
});
const stdFootprint = calculateFootprint(stdProfile);
assert.deepEqual(stdFootprint.profile, stdProfile);
assert.equal(stdFootprint.categories.transport, (100 * 0.192 + 50 * 0.045) * 52);
assert.equal(stdFootprint.categories.flights, 2 * 255);
assert.equal(stdFootprint.categories.home, 200 * (0.385 * 0.5) * 12);
assert.equal(stdFootprint.categories.food, 1650);
assert.equal(stdFootprint.categories.waste, 3 * 2.7 * 52);
assert.equal(stdFootprint.categories.purchases, 100 * 0.42 * 12);

// Total Kg match
const computedTotal = Object.values(stdFootprint.categories).reduce((s, v) => s + v, 0);
assert.equal(stdFootprint.totalKg, computedTotal);

// --- 3. recommendActions Tests ---

const testProfile = normalizeProfile({
  carKm: 500, // Make transport largest
  publicKm: 0,
  flights: 0,
  electricityKwh: 0,
  renewableShare: 100,
  diet: "plantFocused",
  wasteBags: 0,
  shoppingSpend: 0
});

// Recommend actions logic checks
const recs = recommendActions(testProfile, ["bike-two-days"]);

// Check if selected state matches list
const bikeAction = recs.find(r => r.id === "bike-two-days");
assert.ok(bikeAction);
assert.equal(bikeAction.selected, true);

const drivingAction = recs.find(r => r.id === "efficient-driving");
assert.ok(drivingAction);
assert.equal(drivingAction.selected, false);

// Check if category matching largest source is prioritized
// Transport is largest, so Transport AND Flights actions should be recommended
assert.equal(bikeAction.recommended, true); // Category: Transport
assert.equal(drivingAction.recommended, true); // Category: Transport

const flightAction = recs.find(r => r.id === "skip-flight");
assert.ok(flightAction);
assert.equal(flightAction.recommended, true); // Flight matches Transport largest-source rule

const foodAction = recs.find(r => r.id === "plant-protein");
assert.ok(foodAction);
assert.equal(foodAction.recommended, false); // Food is not largest category

// Verify sorting order: recommended actions first, then sorted by impactKg descending
for (let i = 0; i < recs.length - 1; i++) {
  const current = recs[i];
  const next = recs[i + 1];
  if (current.recommended && !next.recommended) {
    // Correctly sorted recommended first
    continue;
  }
  if (!current.recommended && next.recommended) {
    assert.fail("Non-recommended action sorted before recommended action");
  }
  // If recommended status is same, sort by impactKg descending
  assert.ok(current.impactKg >= next.impactKg, "Actions should be sorted by impactKg descending within recommendation groups");
}

// --- 4. calculateActionSavings Tests ---

assert.equal(calculateActionSavings([]), 0);
assert.equal(calculateActionSavings(["bike-two-days", "skip-flight"]), 520 + 255);
assert.equal(calculateActionSavings(["non-existent-action-id"]), 0); // Ignore invalid action ids

// --- 5. buildInsights Tests ---

// Scenario A: Standard profile with low savings
const insightsA = buildInsights(stdProfile, []);
assert.ok(insightsA.length >= 3);
assert.ok(insightsA[0].includes("Food is your largest source"), "Should report food as largest category");
assert.ok(insightsA[1].includes("Start with one low-effort action"), "Should nudge user to add actions when selected savings is zero");
assert.ok(insightsA[2].includes("above a 2-tonne climate-aligned annual target"), "Should report gap to target");

// Scenario B: Meat heavy diet + home energy insight triggers
const highEnergyHeavyMeatProfile = normalizeProfile({
  carKm: 0,
  publicKm: 0,
  flights: 0,
  electricityKwh: 1000, // Home energy: 1000 * 0.385 * 12 = 4620 kg (high category emissions)
  renewableShare: 10,
  diet: "meatHeavy",
  wasteBags: 0,
  shoppingSpend: 0
});
const insightsB = buildInsights(highEnergyHeavyMeatProfile, ["renewable-power"]);
assert.ok(insightsB.some(ins => ins.includes("renewable electricity share")), "Should trigger renewable share recommendation");
assert.ok(insightsB.some(ins => ins.includes("plant-forward meals")), "Should trigger plant-forward meals recommendation");

// Scenario C: Climate-aligned achieved
const climateAlignedProfile = normalizeProfile({
  carKm: 0,
  publicKm: 0,
  flights: 0,
  electricityKwh: 0,
  renewableShare: 100,
  diet: "plantFocused",
  wasteBags: 0,
  shoppingSpend: 0
});
const insightsC = buildInsights(climateAlignedProfile, ["bike-two-days"]); // Total footprint 1050 kg, savings 520 kg
assert.ok(insightsC.some(ins => ins.includes("bring you within a 2-tonne")), "Should congratulate user on climate alignment");
assert.ok(insightsC.some(ins => ins.includes("reduce about")), "Should report selected savings reduction info");

// --- 6. formatKg Tests ---

assert.equal(formatKg(0), "0");
assert.equal(formatKg(1250), "1,250");
assert.equal(formatKg(9876543.21), "9,876,543");
assert.equal(formatKg(-543.6), "-544"); // Rounding test

console.log("All extended carbon calculations and insights tests passed successfully!");
