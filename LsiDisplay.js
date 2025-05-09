// LsiDisplay.js
// Provides rendering functions for the Langelier Saturation Index (LSI) scale and components table

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
   * @param {object} factors - Object containing LSI components and their factors.
   * @param {number} factors.ph
   * @param {number} factors.alk
   * @param {number} factors.correctedAlk
   * @param {number} factors.alkFactor
   * @param {number} factors.calcium
   * @param {number} factors.calFactor
   * @param {number} factors.tempF
   * @param {number} factors.tempFactor
   * @param {number} factors.tds
   * @param {number} factors.tdsFactor
   * @param {number} factors.cya
   * @returns {string} - HTML string for the LSI components table.
   */
  export function renderLSIComponentsTable(factors) {
    // Use same color codes as in styles.css for each parameter
    return `
      <table class="lsi-components-table">
        <thead>
          <tr>
            <th>Component</th>
            <th>Value</th>
            <th>Factor/Correction</th>
          </tr>
        </thead>
        <tbody>
          <tr class="field-ph">
            <td>pH</td>
            <td>${factors.ph}</td>
            <td>-</td>
          </tr>
          <tr class="field-alk">
            <td>Alkalinity (ppm)</td>
            <td>${factors.alk} <span style="font-size:0.9em;color:#757575;">(corrected: ${factors.correctedAlk.toFixed(1)})</span></td>
            <td>${factors.alkFactor.toFixed(2)}</td>
          </tr>
          <tr class="field-ch">
            <td>Calcium Hardness (ppm)</td>
            <td>${factors.calcium}</td>
            <td>${factors.calFactor.toFixed(2)}</td>
          </tr>
          <tr class="field-temp">
            <td>Temperature (°F)</td>
            <td>${factors.tempF}</td>
            <td>${factors.tempFactor.toFixed(2)}</td>
          </tr>
          <tr class="field-tds">
            <td>TDS (ppm)</td>
            <td>${factors.tds}</td>
            <td>${factors.tdsFactor.toFixed(2)}</td>
          </tr>
          <tr class="field-cya">
            <td>Cyanuric Acid (ppm)</td>
            <td>${factors.cya}</td>
            <td>-</td>
          </tr>
        </tbody>
      </table>
    `;
  }