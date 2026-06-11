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
const fields = form ? [...form.elements].filter((element) => element.name) : [];

/**
 * Tracks the last recorded largest category key to avoid redundant re-renders of the actions view.
 * @type {string|null}
 */
let lastLargestKey = null;

const state = loadState();

init();

/**
 * Initializes the application state, binds listeners, and renders the UI.
 */
function init() {
  if (!form) return;
  hydrateForm();
  bindNavigation();
  bindForm();
  bindActions();
  render();
}

/**
 * Loads the application state from local storage.
 * Gracefully defaults to a clean profile and empty action plans on error.
 * @returns {{profile: object, selectedActions: string[], completedActions: string[]}} The active application state.
 */
function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return {
      profile: normalizeProfile(parsed.profile),
      selectedActions: Array.isArray(parsed.selectedActions) ? parsed.selectedActions : [],
      completedActions: Array.isArray(parsed.completedActions) ? parsed.completedActions : []
    };
  } catch (error) {
    console.error("Failed to load state from localStorage:", error);
    return {
      profile: { ...DEFAULT_PROFILE },
      selectedActions: [],
      completedActions: []
    };
  }
}

/**
 * Saves the application state to local storage.
 * Wraps saving operation in try-catch to prevent crash if storage is restricted or quota exceeded.
 */
function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save state to localStorage:", error);
  }
}

/**
 * Fills the form fields with values from the state and updates their label outputs.
 */
function hydrateForm() {
  fields.forEach((field) => {
    field.value = state.profile[field.name];
    updateOutput(field);
  });
}

/**
 * Binds click events to navigation tabs and view jump buttons.
 */
function bindNavigation() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  document.querySelectorAll("[data-view-jump]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.viewJump));
  });
}

/**
 * Binds input events to the calculator form for real-time updates and saves to local profile.
 */
function bindForm() {
  if (!form) return;
  form.addEventListener("input", () => {
    state.profile = getProfileFromForm();
    fields.forEach(updateOutput);
    renderOverview();
  });

  const saveBtn = document.querySelector("#save-profile");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      state.profile = getProfileFromForm();
      saveState();
      showToast("Profile saved locally.");
    });
  }
}

/**
 * Binds event listeners for selecting and completing actions in the actions tab.
 */
function bindActions() {
  const actionList = document.querySelector("#action-list");
  if (actionList) {
    actionList.addEventListener("change", (event) => {
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
  }

  const resetBtn = document.querySelector("#reset-actions");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      state.selectedActions = [];
      state.completedActions = [];
      saveState();
      render();
      showToast("Action plan reset.");
    });
  }
}

/**
 * Retrieves the profile inputs from the current form fields state and normalizes them.
 * @returns {object} The normalized user carbon profile inputs.
 */
function getProfileFromForm() {
  const values = Object.fromEntries(fields.map((field) => [field.name, field.value]));
  return normalizeProfile(values);
}

/**
 * Switches the active visible tab panel view.
 * @param {string} name - The name of the panel to show (dashboard, calculator, actions).
 */
function showView(name) {
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("is-visible", panel.dataset.panel === name);
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

/**
 * Triggers a full UI render (overview and action list).
 * Resets the last active category tracker to ensure a consistent initial render of the action list.
 */
function render() {
  const estimate = calculateFootprint(state.profile);
  lastLargestKey = estimate.largestKey;
  renderOverview();
  renderActions();
}

/**
 * Computes footprint and updates the metric cards, horizontal bar chart, and insights.
 * Re-renders the action list recommendation order only when the largest carbon contributor changes.
 */
function renderOverview() {
  const estimate = calculateFootprint(state.profile);
  const savings = calculateActionSavings(state.selectedActions);
  const completed = state.completedActions.length;

  const annualTotalEl = document.querySelector("#annual-total");
  if (annualTotalEl) annualTotalEl.textContent = `${estimate.totalTonnes.toFixed(1)} t`;

  const largestSourceEl = document.querySelector("#largest-source");
  if (largestSourceEl) largestSourceEl.textContent = estimate.largestLabel;

  const largestSourceDetailEl = document.querySelector("#largest-source-detail");
  if (largestSourceDetailEl) {
    largestSourceDetailEl.textContent = `${formatKg(estimate.categories[estimate.largestKey])} kg CO2e yearly`;
  }

  const plannedSavingsEl = document.querySelector("#planned-savings");
  if (plannedSavingsEl) plannedSavingsEl.textContent = `${formatKg(savings)} kg`;

  const completedActionsEl = document.querySelector("#completed-actions");
  if (completedActionsEl) completedActionsEl.textContent = String(completed);

  const completionDetailEl = document.querySelector("#completion-detail");
  if (completionDetailEl) {
    completionDetailEl.textContent = `${completed} of ${ACTIONS.length} actions completed`;
  }

  renderBars(estimate);
  renderInsights();

  // Optimizes performance: only re-sort and re-render actions list when the largest contributor category changes
  if (estimate.largestKey !== lastLargestKey) {
    lastLargestKey = estimate.largestKey;
    renderActions();
  }
}

/**
 * Renders the category breakdown horizontal bar charts on the dashboard.
 * Uses DocumentFragment to optimize performance and prevent reflows.
 * @param {object} estimate - The calculated carbon footprint estimate object.
 */
function renderBars(estimate) {
  const container = document.querySelector("#category-bars");
  if (!container) return;
  container.replaceChildren();

  const fragment = document.createDocumentFragment();

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
    fragment.append(item);
  });

  container.append(fragment);
}

/**
 * Renders personalized insights in the dashboard based on profile data and selected actions.
 */
function renderInsights() {
  const list = document.querySelector("#insight-list");
  if (!list) return;
  list.replaceChildren();

  const fragment = document.createDocumentFragment();

  buildInsights(state.profile, state.selectedActions).forEach((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    fragment.append(item);
  });

  list.append(fragment);
}

/**
 * Renders the action list recommendations.
 * Uses DocumentFragment to optimize insertion performance.
 */
function renderActions() {
  const container = document.querySelector("#action-list");
  if (!container) return;
  container.replaceChildren();

  const fragment = document.createDocumentFragment();

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
      makeCheckbox(`plan-${action.id}`, "Add to plan", selected, "actionToggle", action.id, action.title),
      makeCheckbox(`done-${action.id}`, "Completed", completed, "completeToggle", action.id, action.title)
    );

    item.append(badge, title, meta, controls);
    fragment.append(item);
  });

  container.append(fragment);
}

/**
 * Creates an accessible checkbox element with a label.
 * @param {string} id - The ID for the input element.
 * @param {string} labelText - The text for the checkbox label.
 * @param {boolean} checked - The initial checked state.
 * @param {string} dataName - The dataset property key (actionToggle, completeToggle).
 * @param {string} actionId - The ID of the action.
 * @param {string} actionTitle - The title of the action for descriptive screen-reader labels.
 * @returns {HTMLLabelElement} The constructed checkbox label.
 */
function makeCheckbox(id, labelText, checked, dataName, actionId, actionTitle) {
  const label = document.createElement("label");
  label.className = "check-label";
  label.htmlFor = id;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.checked = checked;
  input.dataset[dataName] = actionId;
  // Provide full accessibility context so screen readers announce which action this checkbox affects
  input.setAttribute("aria-label", `${labelText}: ${actionTitle}`);

  const text = document.createElement("span");
  text.textContent = labelText;
  label.append(input, text);
  return label;
}

/**
 * Updates the output display suffix/text adjacent to input range sliders.
 * @param {HTMLInputElement} field - The range input element.
 */
function updateOutput(field) {
  const output = document.querySelector(`#${field.id}-output`);
  if (!output) return;
  const suffix = field.name === "renewableShare" ? "%" : field.name === "electricityKwh" ? " kWh" : " km";
  output.textContent = `${field.value}${suffix}`;
}

/**
 * Toggles the inclusion of an item string in a target array list.
 * @param {string[]} values - The target array list.
 * @param {string} id - The item identifier.
 * @param {boolean} enabled - Whether to include the item.
 */
function toggleSet(values, id, enabled) {
  const set = new Set(values);
  if (enabled) set.add(id);
  else set.delete(id);
  values.splice(0, values.length, ...set);
}

/**
 * Maps category keys to human-readable label strings.
 * @param {string} key - The category key.
 * @returns {string} The formatted category name.
 */
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

/**
 * Timer identifier for auto-hiding active notifications.
 * @type {number|undefined}
 */
let toastTimer;

/**
 * Displays a short pop-up feedback message to the user.
 * @param {string} message - The message text to display.
 */
function showToast(message) {
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}
