import {
  ACTIONS,
  DEFAULT_PROFILE,
  buildInsights,
  calculateActionSavings,
  calculateFootprint,
  formatKg,
  normalizeProfile,
  recommendActions
} from "./carbon.js";

const storageKey = "carbonwise-state-v1";
const form = document.querySelector("#calculator-form");
const toast = document.querySelector("#toast");
const fields = [...form.elements].filter((element) => element.name);

const state = loadState();

init();

function init() {
  hydrateForm();
  bindNavigation();
  bindForm();
  bindActions();
  render();
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return {
      profile: normalizeProfile(parsed.profile),
      selectedActions: Array.isArray(parsed.selectedActions) ? parsed.selectedActions : [],
      completedActions: Array.isArray(parsed.completedActions) ? parsed.completedActions : []
    };
  } catch {
    return {
      profile: { ...DEFAULT_PROFILE },
      selectedActions: [],
      completedActions: []
    };
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function hydrateForm() {
  fields.forEach((field) => {
    field.value = state.profile[field.name];
    updateOutput(field);
  });
}

function bindNavigation() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  document.querySelectorAll("[data-view-jump]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.viewJump));
  });
}

function bindForm() {
  form.addEventListener("input", () => {
    state.profile = getProfileFromForm();
    fields.forEach(updateOutput);
    render();
  });

  document.querySelector("#save-profile").addEventListener("click", () => {
    state.profile = getProfileFromForm();
    saveState();
    showToast("Profile saved locally.");
  });
}

function bindActions() {
  document.querySelector("#action-list").addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    if (input.dataset.actionToggle) {
      toggleSet(state.selectedActions, input.dataset.actionToggle, input.checked);
    }
    if (input.dataset.completeToggle) {
      toggleSet(state.completedActions, input.dataset.completeToggle, input.checked);
      toggleSet(state.selectedActions, input.dataset.completeToggle, input.checked || state.selectedActions.includes(input.dataset.completeToggle));
      const planInput = document.querySelector(`input[data-action-toggle="${input.dataset.completeToggle}"]`);
      if (input.checked && planInput instanceof HTMLInputElement) {
        planInput.checked = true;
      }
    }
    saveState();
    renderOverview();
  });

  document.querySelector("#reset-actions").addEventListener("click", () => {
    state.selectedActions = [];
    state.completedActions = [];
    saveState();
    render();
    showToast("Action plan reset.");
  });
}

function getProfileFromForm() {
  const values = Object.fromEntries(fields.map((field) => [field.name, field.value]));
  return normalizeProfile(values);
}

function showView(name) {
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("is-visible", panel.dataset.panel === name);
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function render() {
  renderOverview();
  renderActions();
}

function renderOverview() {
  const estimate = calculateFootprint(state.profile);
  const savings = calculateActionSavings(state.selectedActions);
  const completed = state.completedActions.length;

  document.querySelector("#annual-total").textContent = `${estimate.totalTonnes.toFixed(1)} t`;
  document.querySelector("#largest-source").textContent = estimate.largestLabel;
  document.querySelector("#largest-source-detail").textContent = `${formatKg(estimate.categories[estimate.largestKey])} kg CO2e yearly`;
  document.querySelector("#planned-savings").textContent = `${formatKg(savings)} kg`;
  document.querySelector("#completed-actions").textContent = String(completed);
  document.querySelector("#completion-detail").textContent = `${completed} of ${ACTIONS.length} actions completed`;

  renderBars(estimate);
  renderInsights();
}

function renderBars(estimate) {
  const container = document.querySelector("#category-bars");
  container.replaceChildren();

  Object.entries(estimate.categories).forEach(([key, value]) => {
    const item = document.createElement("div");
    item.className = "bar-item";

    const label = document.createElement("span");
    label.textContent = labelForCategory(key);

    const valueLabel = document.createElement("strong");
    valueLabel.textContent = `${formatKg(value)} kg`;

    const track = document.createElement("span");
    track.className = "bar-track";
    const fill = document.createElement("span");
    fill.className = "bar-fill";
    fill.style.width = `${Math.max(4, (value / estimate.totalKg) * 100)}%`;
    track.append(fill);

    item.append(label, valueLabel, track);
    container.append(item);
  });
}

function renderInsights() {
  const list = document.querySelector("#insight-list");
  list.replaceChildren();

  buildInsights(state.profile, state.selectedActions).forEach((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    list.append(item);
  });
}

function renderActions() {
  const container = document.querySelector("#action-list");
  container.replaceChildren();

  recommendActions(state.profile, state.selectedActions).forEach((action) => {
    const selected = state.selectedActions.includes(action.id);
    const completed = state.completedActions.includes(action.id);
    const item = document.createElement("article");
    item.className = "action-card";

    const badge = document.createElement("span");
    badge.className = action.recommended ? "badge is-recommended" : "badge";
    badge.textContent = action.recommended ? "Recommended" : action.category;

    const title = document.createElement("h3");
    title.textContent = action.title;

    const meta = document.createElement("p");
    meta.textContent = `${action.category} - ${formatKg(action.impactKg)} kg CO2e/year - ${action.effort} effort`;

    const controls = document.createElement("div");
    controls.className = "action-controls";
    controls.append(
      makeCheckbox(`plan-${action.id}`, "Add to plan", selected, "actionToggle", action.id),
      makeCheckbox(`done-${action.id}`, "Completed", completed, "completeToggle", action.id)
    );

    item.append(badge, title, meta, controls);
    container.append(item);
  });
}

function makeCheckbox(id, labelText, checked, dataName, actionId) {
  const label = document.createElement("label");
  label.className = "check-label";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.checked = checked;
  input.dataset[dataName] = actionId;
  const text = document.createElement("span");
  text.textContent = labelText;
  label.append(input, text);
  return label;
}

function updateOutput(field) {
  const output = document.querySelector(`#${field.id}-output`);
  if (!output) return;
  const suffix = field.name === "renewableShare" ? "%" : field.name === "electricityKwh" ? " kWh" : " km";
  output.textContent = `${field.value}${suffix}`;
}

function toggleSet(values, id, enabled) {
  const set = new Set(values);
  if (enabled) set.add(id);
  else set.delete(id);
  values.splice(0, values.length, ...set);
}

function labelForCategory(key) {
  return {
    transport: "Transport",
    flights: "Flights",
    home: "Home energy",
    food: "Food",
    waste: "Waste",
    purchases: "Purchases"
  }[key];
}

let toastTimer;
function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}
