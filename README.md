# Carbon Footprint Awareness Platform

## Project Overview

**Challenge 3: Carbon Footprint Awareness Platform**

Carbon Footprint Awareness Platform is a lightweight web application that helps individuals understand, track, and reduce their personal carbon footprint.

The application allows users to enter simple lifestyle details such as travel, electricity usage, diet, waste, and shopping habits. Based on these inputs, it calculates an estimated annual carbon footprint, shows category-wise emissions, identifies the biggest emission source, and provides personalized insights.

The main goal of this project is to make carbon awareness simple, practical, and easy to act on.

## Problem Statement

Design a solution that helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized insights.

## Solution Summary

This project solves the problem by providing a simple carbon calculator and action planner.

Users can:

- Enter everyday lifestyle information.
- View estimated annual carbon emissions.
- Understand which category creates the highest impact.
- Read personalized insights based on their data.
- Select practical actions to reduce emissions.
- Track completed actions and planned CO2e savings.

The application stores user inputs locally in the browser, so no login or server-side data storage is required.

## Live Demo

Deployed project link:

```text
https://mamidimadasrikanth.github.io/carbon-footprint-awareness-platform/
```

GitHub repository link:

```text
https://github.com/MamidimadaSrikanth/carbon-footprint-awareness-platform
```

## Key Features

- Carbon footprint calculator for lifestyle-based emissions.
- Annual footprint estimate in tonnes of CO2e.
- Category-wise breakdown for transport, flights, home energy, food, waste, and purchases.
- Dashboard showing annual footprint, biggest source, planned savings, and completed actions.
- Personalized insights based on the user's highest-impact categories.
- Action planner with recommended carbon reduction activities.
- Estimated yearly CO2e savings for each action.
- Completed action tracking.
- Local browser storage for saving profile and action progress.
- Responsive design for desktop and mobile screens.
- Accessible form labels, keyboard-friendly controls, and visible focus states.

## Technology Used

```text
HTML5       Application structure
CSS3        Styling and responsive design
JavaScript  Calculator logic and user interactions
Node.js     Local development server and tests
GitHub Pages Deployment
```

The project does not use any external frontend framework. It is built with plain HTML, CSS, and JavaScript to keep it small, fast, and easy to understand.

## Project Folder Structure

```text
carbon-footprint-awareness-platform/
|
|-- assets/
|   |-- ecosystem-panel.svg
|
|-- src/
|   |-- app.js
|   |-- carbon.js
|   |-- styles.css
|
|-- tests/
|   |-- carbon.test.mjs
|
|-- index.html
|-- package.json
|-- README.md
|-- server.mjs
```

File details:

- `index.html` contains the main page structure.
- `src/styles.css` contains all styling and responsive layout rules.
- `src/app.js` handles UI rendering, form updates, tabs, local storage, and action tracking.
- `src/carbon.js` contains carbon calculations, emission factors, recommendations, and insights.
- `tests/carbon.test.mjs` contains automated tests for the core calculation logic.
- `server.mjs` runs the local static server.
- `assets/ecosystem-panel.svg` contains the main visual asset.

## How to Run the Project Locally

Clone the repository:

```bash
git clone https://github.com/MamidimadaSrikanth/carbon-footprint-awareness-platform.git
```

Go inside the project folder:

```bash
cd carbon-footprint-awareness-platform
```

Run the project:

```bash
npm run serve
```

If you are using Windows PowerShell and `npm run serve` does not work, use:

```powershell
npm.cmd run serve
```

Open the project in your browser:

```text
http://localhost:4173
```

Use the browser address bar, not the search box.

Steps:

1. Open Chrome or Edge.
2. Press `Ctrl + L`.
3. Paste `http://localhost:4173`.
4. Press `Enter`.

## How to Use the Application

1. Open the application in the browser.
2. View the dashboard summary.
3. Click the **Calculator** tab.
4. Adjust lifestyle inputs such as car travel, flights, electricity, diet, waste, and shopping.
5. Review the updated annual footprint and category breakdown.
6. Click **Save profile** to save the inputs locally in the browser.
7. Click the **Actions** tab.
8. Select actions using **Add to plan**.
9. Mark actions as **Completed** when finished.
10. Check the updated planned savings and completed action count on the dashboard.

## How to Run Tests

Run tests:

```bash
npm test
```

For Windows PowerShell:

```powershell
npm.cmd test
```

Expected output:

```text
All carbon calculation tests passed.
```

## Security Considerations

- The app does not require login.
- No personal data is uploaded to a server.
- User data is stored only in browser local storage.
- No third-party scripts are used.
- The project uses static frontend files.
- The local server normalizes requested paths to avoid unsafe file access.

## Efficiency Considerations

- The project has no external frontend dependencies.
- The app is lightweight and loads quickly.
- Carbon calculations are simple and fast.
- UI updates are handled with plain JavaScript.
- The repository size is small and suitable for submission limits.

## Accessibility Considerations

- Form fields have proper labels.
- Buttons have clear readable names.
- The page includes a skip link.
- Focus states are visible for keyboard users.
- The layout is responsive on mobile and desktop.
- Images include alternative text.
- Status messages use accessible live regions.

## Testing Summary

The following checks were completed:

- Carbon calculation tests passed.
- Input normalization was tested.
- Higher-emission and lower-emission profiles were compared.
- Action savings calculation was tested.
- Recommendation logic was tested.
- Insight generation was tested.
- Calculator input changes update the dashboard.
- Action planner updates savings and completed count.
- Browser console showed no errors or warnings during verification.

## Challenge Evaluation Alignment

### Code Quality

The code is separated into clear files for structure, styling, UI behavior, calculation logic, and tests.

### Security

The app avoids external scripts and does not send user data to any external server.

### Efficiency

The project uses plain HTML, CSS, and JavaScript, keeping the app fast and lightweight.

### Testing

The main carbon calculation logic is covered with automated tests.

### Accessibility

The app uses semantic HTML, labeled controls, keyboard-friendly navigation, visible focus states, and responsive design.

## Future Improvements

- Add monthly progress tracking.
- Add downloadable carbon footprint reports.
- Add comparison with national or global averages.
- Add dark mode.
- Add multilingual support.
- Add region-specific emission factors.
- Add charts for long-term emission trends.

## Conclusion

Carbon Footprint Awareness Platform helps users understand their personal emissions and take small practical steps to reduce them. It is simple, lightweight, accessible, and suitable for a GitHub Pages-based web project submission.
