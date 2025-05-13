// Provides rendering functions for the Langelier Saturation Index (LSI) scale and components table

import { goldenNumbers } from './config.js';

/**
 * Render the LSI horizontal scale/graph.
 * @param {number} lsi - The calculated LSI value.
 * @returns {string} - HTML string for the LSI scale.
 */
export function renderLSIScale(lsi) {
    // LSI range: -1.0 (corrosive) to +1.0 (scaling)
    const min = -1.0, max = 1.0;
    const percent = Math.max(0, Math.min(100, ((lsi - min) / (max - min)) * 100));
    let color = "#fbc02d"; // yellow (caution)
    if (lsi < -0.3) color = "#d32f2f"; // red (corrosive)
    if (lsi < 0.0) color = "#fbc02d"; // yellow (caution)
    else if (lsi > 0.3) color = "#1976d2"; // blue (scaling)
    else color = "#388e3c"; // green (balanced)

    return `
    <div class="lsi-scale-container">
      <div class="lsi-scale-labels">
        <span>Corrosive (-1.0)</span>
        <span>Balanced (0.0)</span>
        <span>Scaling (+1.0)</span>
      </div>
      <div class="lsi-scale-bar">
        <div class="lsi-scale-bar-bg"></div>
        <div class="lsi-scale-bar-indicator" style="left: ${percent}%; background: ${color};"></div>
        <div class="lsi-scale-value" style="left: ${percent}%;">
          ${lsi.toFixed(2)}
        </div>
      </div>
    </div>
    `;
}

/**
 * Render the LSI components summary table.
 * The "Golden Number" is the ideal/target value for each parameter, taken from config.js for the selected state and pool type.
 * @param {object} factors - Object containing LSI components and their factors.
 * @param {string} state - Selected state (e.g., "Arizona").
 * @param {string} poolType - Selected pool type ("pool" or "spa").
 * @returns {string} - HTML string for the LSI components table.
 */
export function renderLSIComponentsTable(factors, state, poolType) {
    // Fallback to 'pool' if poolType is not provided
    const type = poolType || 'pool';
    // Get golden numbers for the selected pool type
    const golden = (goldenNumbers[type]) ? goldenNumbers[type] : goldenNumbers['pool'];

    return `
    <table class="lsi-components-table">
      <thead>
        <tr>
          <th>Component</th>
          <th>Value</th>
          <th>Golden Number</th>
        </tr>
      </thead>
      <tbody>
        <tr class="field-ph">
          <td>pH</td>
          <td>${factors.ph}</td>
          <td>${golden.ph}</td>
        </tr>
        <tr class="field-alk">
          <td>Alkalinity (ppm)</td>
          <td>${factors.alk} <span style="font-size:0.9em;color:#757575;">(corrected: ${factors.correctedAlk.toFixed(1)})</span></td>
          <td>${golden.alkalinity}</td>
        </tr>
        <tr class="field-ch">
          <td>Calcium Hardness (ppm)</td>
          <td>${factors.calcium}</td>
          <td>${golden.calcium}</td>
        </tr>
        <tr class="field-temp">
          <td>Temperature (°F)</td>
          <td>${factors.tempF}</td>
          <td>77</td>
        </tr>
        <tr class="field-tds">
          <td>TDS (ppm)</td>
          <td>${factors.tds}</td>
          <td>1000</td>
        </tr>
        <tr class="field-cya">
          <td>Cyanuric Acid (ppm)</td>
          <td>${factors.cya}</td>
          <td>${golden.cya}</td>
        </tr>
      </tbody>
    </table>
    `;
}

// ... rest of code remains same