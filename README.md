# Carbon Footprint Awareness Platform

A dependency-free web app that helps individuals understand, track, and reduce their carbon footprint through simple inputs, category-level estimates, personalized recommendations, and an action plan.

## Features

- Carbon estimate across transport, flights, home energy, food, waste, and purchases.
- Personalized insights based on the user's highest-impact categories.
- Action planner with completion tracking and estimated CO2e savings.
- Local-only storage: no network requests, no third-party scripts, and no personal data upload.
- Keyboard-friendly, screen-reader-friendly UI with semantic controls and visible focus states.
- Unit-tested calculation logic.

## Run Locally

```bash
npm run serve
```

Open `http://localhost:4173`.

## Test

```bash
npm test
```

## Submission Notes

The repository is intentionally small and uses vanilla HTML, CSS, and JavaScript. It is suitable for a GitHub repository under the 10 MB requirement.

## Project Structure

```text
assets/          Visual assets
src/app.js       UI state, rendering, and interactions
src/carbon.js    Pure calculation and recommendation logic
src/styles.css   Responsive, accessible interface styles
tests/           Unit tests for core carbon calculations
```
