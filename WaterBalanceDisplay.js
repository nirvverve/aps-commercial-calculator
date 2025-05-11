import { getWaterBalanceSteps } from './WaterBalanceUtils.js';

/**
 * Render a table of water balance steps (dosing order, current, target, dose).
 * @param {object} params
 * @param {string} poolType - 'pool' or 'spa'
 * @param {number} poolVolume - gallons
 * @param {object} current - { cya, alkalinity, calcium, ph }
 * @param {object} [targets] - optional custom targets
 * @param {number} [tempF] - water temperature (F)
 * @param {number} [tds] - total dissolved solids (ppm)
 * @returns {string} HTML
 */
export function renderWaterBalanceSteps({ poolType, poolVolume, current, targets = {}, tempF = 77, tds = 1000 }) {
  // getWaterBalanceSteps now returns { steps, notes }
  const { steps, notes } = getWaterBalanceSteps({ poolType, poolVolume, current, targets, tempF, tds });

  return `
    <div class="section water-balance-steps">
      <h3>Water Balance Adjustment Steps</h3>
      <table class="dose-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Parameter</th>
            <th>Current</th>
            <th>Target</th>
            <th>Dose Needed</th>
          </tr>
        </thead>
        <tbody>
          ${steps.map((step, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${step.parameter}</td>
              <td>${step.current !== undefined && step.current !== null ? step.current : '-'}</td>
              <td>${step.target !== undefined && step.target !== null ? step.target : '-'}</td>
              <td>${step.dose ? `<span class="dose">${step.dose}</span>` : '<em>None needed</em>'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${notes && notes.length > 0 ? `
        <div class="water-balance-notes" style="margin-top:1em;color:#b71c1c;">
          <strong>Note:</strong>
          <ul>
            ${notes.map(n => `<li>${n}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      <div style="margin-top:0.7em;font-size:0.98em;color:#757575;">
        <em>Adjust chemicals in the order shown above for best results.</em>
      </div>
    </div>
  `;
}