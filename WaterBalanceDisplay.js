
import { getWaterBalanceSteps } from './WaterBalanceUtils.js';

/**
 * Render a table of water balance steps (dosing order, current, target, dose).
 * @param {object} params
 * @param {string} poolType - 'pool' or 'spa'
 * @param {number} poolVolume - gallons
 * @param {object} current - { cya, alkalinity, calcium, ph }
 * @param {object} [targets] - optional custom targets
 * @returns {string} HTML
 */
export function renderWaterBalanceSteps({ poolType, poolVolume, current, targets = {} }) {
  const steps = getWaterBalanceSteps({ poolType, poolVolume, current, targets });

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
      <div style="margin-top:0.7em;font-size:0.98em;color:#757575;">
        <em>Adjust chemicals in the order shown above for best results.</em>
      </div>
    </div>
  `;
}