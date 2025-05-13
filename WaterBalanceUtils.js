// Color classes for each parameter
const PARAM_COLORS = {
  cya: 'cya-purple',
  alkalinity: 'alk-green',
  calcium: 'calcium-blue',
  ph: 'ph-red'
};

// Card background classes for each parameter (matches styles.css)
const PARAM_CARD_CLASS = {
  cya: 'chem-card cya',
  alkalinity: 'chem-card alk',
  calcium: 'chem-card ch',
  ph: 'chem-card ph',
  acid: 'chem-card acid',
  sodaash: 'chem-card ph'
};

// --- Helper Functions for Dose Calculations ---

// Estimate pH rise from sodium bicarbonate dose
function estimatePhRiseFromBicarb(alkalinityIncrease) {
  // Empirical: ~0.03 pH units per 10 ppm increase
  return (alkalinityIncrease / 10) * 0.03;
}

// Estimate pH drop from cyanuric acid dose
function estimatePhDropFromCya(cyaIncrease) {
  // Empirical: ~0.07 pH units per 10 ppm increase
  return (cyaIncrease / 10) * 0.07;
}

// Sodium bicarbonate dose (to raise alkalinity)
function alkalinityDose(current, target, gallons) {
  if (target <= current) return null;
  // 1.5 lbs sodium bicarb per 10,000 gal raises TA by 10 ppm
  const doseLbs = ((target - current) / 10) * 1.5 * (gallons / 10000);
  return doseLbs > 0
    ? `${doseLbs.toFixed(2)} lbs sodium bicarbonate`
    : null;
}

// Calcium chloride dose (to raise calcium hardness)
function calciumDose(current, target, gallons) {
  if (target <= current) return null;
  // 1.25 lbs calcium chloride per 10,000 gal raises CH by 10 ppm
  const doseLbs = ((target - current) / 10) * 1.25 * (gallons / 10000);
  return doseLbs > 0
    ? `${doseLbs.toFixed(2)} lbs calcium chloride`
    : null;
}

// Cyanuric acid dose (to raise CYA)
function cyaDose(current, target, gallons) {
  if (target <= current) return null;
  // 13 oz stabilizer per 10,000 gal raises CYA by 10 ppm
  const doseOz = ((target - current) / 10) * 13 * (gallons / 10000);
  return doseOz > 16
    ? `${(doseOz / 16).toFixed(2)} lbs (${doseOz.toFixed(1)} oz) stabilizer`
    : `${doseOz.toFixed(1)} oz stabilizer`;
}

// Acid dose to lower pH
function acidDose(current, target, gallons, alkalinity) {
  if (current <= target) return null;
  // PoolFactor and AlkFactor are simplified for demo purposes
  const poolFactor = 76 * (gallons / 10000);
  const alkFactor = alkalinity / 100;
  const acidFlOz = (current - target) * poolFactor * alkFactor;
  if (acidFlOz <= 0) return null;
  if (acidFlOz < 128) {
    return `${acidFlOz.toFixed(1)} fl oz muriatic acid (31.45%)`;
  } else {
    return `${(acidFlOz / 128).toFixed(2)} gal (${acidFlOz.toFixed(1)} fl oz) muriatic acid (31.45%)`;
  }
}

// Soda ash dose to raise pH
function sodaAshDose(current, target, gallons, alkalinity) {
  if (current >= target) return null;
  const diff = target - current;
  if (diff <= 0) return null;
  const ounces = (diff / 0.2) * 6 * (gallons / 10000);
  if (ounces <= 0) return null;
  if (ounces > 16) {
    return `${(ounces / 16).toFixed(2)} lbs (${ounces.toFixed(1)} oz) soda ash`;
  } else {
    return `${ounces.toFixed(1)} oz soda ash`;
  }
}

// --- Main Water Balance Steps Function ---

/**
 * Calculate water balance steps to reach golden numbers (or custom targets).
 * Returns { steps, notes }.
 */
function getWaterBalanceSteps({
  poolType = 'pool',
  poolVolume = 10000,
  current = { cya: 0, alkalinity: 0, calcium: 0, ph: 7.5 },
  targets = {},
  tempF = 77,
  tds = 1000
}) {
  // Example golden numbers (replace with your config.js import if needed)
  const goldenNumbers = {
    pool: { cya: 30, alkalinity: 100, calcium: 300, ph: 7.5 },
    spa: { cya: 30, alkalinity: 100, calcium: 150, ph: 7.5 }
  };
  let t = { ...goldenNumbers[poolType], ...targets };
  let notes = [];

  // Order: Alkalinity, Calcium, CYA, pH
  const steps = [];

  // --- Alkalinity Step ---
  let alkDose = alkalinityDose(current.alkalinity, t.alkalinity, poolVolume);
  let anticipatedPh = current.ph;
  let anticipatedPhNote = null;
  let anticipatedAcidDose = null;

  if (alkDose) {
    // Calculate anticipated pH rise from sodium bicarbonate
    const alkIncrease = t.alkalinity - current.alkalinity;
    const phRise = estimatePhRiseFromBicarb(alkIncrease);
    anticipatedPh = +(current.ph + phRise).toFixed(2);

    // If anticipated pH is above target, recommend acid dose
    if (anticipatedPh > t.ph) {
      anticipatedAcidDose = acidDose(anticipatedPh, t.ph, poolVolume, t.alkalinity);
      anticipatedPhNote = `Note: Adding sodium bicarbonate to raise alkalinity by ${alkIncrease} ppm is expected to raise pH from ${current.ph} to approximately ${anticipatedPh}. After the bicarb is fully dispersed (wait 30 minutes), test pH and add acid as needed to bring pH down to ${t.ph}. Recommended acid dose: ${anticipatedAcidDose}.`;
      notes.push(anticipatedPhNote);
    } else {
      anticipatedPhNote = `Note: Adding sodium bicarbonate to raise alkalinity by ${alkIncrease} ppm is expected to raise pH from ${current.ph} to approximately ${anticipatedPh}.`;
      notes.push(anticipatedPhNote);
    }
  }

  steps.push({
    key: 'alkalinity',
    parameter: 'Total Alkalinity',
    current: current.alkalinity,
    target: t.alkalinity,
    dose: alkDose,
    anticipatedPh: alkDose ? anticipatedPh : null,
    anticipatedAcidDose: anticipatedAcidDose
  });

  // --- Calcium Hardness Step ---
  steps.push({
    key: 'calcium',
    parameter: 'Calcium Hardness',
    current: current.calcium,
    target: t.calcium,
    dose: calciumDose(current.calcium, t.calcium, poolVolume)
  });

  // --- CYA Step ---
  let cyaStepDose = cyaDose(current.cya, t.cya, poolVolume);
  let anticipatedPhAfterCya = anticipatedPh;
  let cyaPhNote = null;
  let cyaSodaAshDose = null;

  if (cyaStepDose) {
    // Calculate anticipated pH drop from cyanuric acid
    const cyaIncrease = t.cya - current.cya;
    const phDrop = estimatePhDropFromCya(cyaIncrease);
    anticipatedPhAfterCya = +(anticipatedPh - phDrop).toFixed(2);

    // If anticipated pH after CYA is below target, recommend soda ash dose
    if (anticipatedPhAfterCya < t.ph) {
      cyaSodaAshDose = sodaAshDose(anticipatedPhAfterCya, t.ph, poolVolume, t.alkalinity);
      cyaPhNote = `Note: Adding cyanuric acid to raise CYA by ${cyaIncrease} ppm is expected to lower pH from ${anticipatedPh} to approximately ${anticipatedPhAfterCya}. After the CYA is fully dispersed (wait 30 minutes), test pH and add soda ash as needed to bring pH up to ${t.ph}. Recommended soda ash dose: ${cyaSodaAshDose}.`;
      notes.push(cyaPhNote);
    } else {
      cyaPhNote = `Note: Adding cyanuric acid to raise CYA by ${cyaIncrease} ppm is expected to lower pH from ${anticipatedPh} to approximately ${anticipatedPhAfterCya}.`;
      notes.push(cyaPhNote);
    }
  }

  steps.push({
    key: 'cya',
    parameter: 'Cyanuric Acid',
    current: current.cya,
    target: t.cya,
    dose: cyaStepDose,
    anticipatedPh: cyaStepDose ? anticipatedPhAfterCya : null,
    anticipatedSodaAshDose: cyaSodaAshDose
  });

  // --- pH Step (can be up or down) ---
  let phDose = null;
  if (current.ph > t.ph) {
    phDose = acidDose(current.ph, t.ph, poolVolume, current.alkalinity);
  } else if (current.ph < t.ph) {
    phDose = sodaAshDose(current.ph, t.ph, poolVolume, current.alkalinity);
  }
  steps.push({
    key: 'ph',
    parameter: 'pH',
    current: current.ph,
    target: t.ph,
    dose: phDose
  });

  return { steps, notes };
}

// --- Display Functions ---

function renderTodayDosageCards({
  poolType,
  poolVolume,
  current,
  targets = {},
  tempF = 77,
  tds = 1000,
  freeChlorine,
  totalChlorine
}) {
  const { steps, notes } = getWaterBalanceSteps({ poolType, poolVolume, current, targets, tempF, tds });

  // Find the first parameter that needs adjustment (priority order)
  const firstStep = steps.find(step =>
    (step.current < step.target || step.current > step.target) && step.dose
  );

  // If nothing to add, show a message
  if (!firstStep) {
    return `
      <details class="today-dosage-details" open>
        <summary><strong>What Should I Add to the Pool Today?</strong></summary>
        <div style="margin:1em 0;">
          <em>All parameters are within target range. No chemical additions needed today.</em>
        </div>
      </details>
    `;
  }

  // Build the card(s) for today's additions
  let cardsHTML = '';
  // Main parameter card
  cardsHTML += `
    <div class="${PARAM_CARD_CLASS[firstStep.key] || 'chem-card'}">
      <strong>${firstStep.parameter}:</strong>
      <div style="margin:0.5em 0 0.2em 0;">
        ${firstStep.dose}
      </div>
      ${firstStep.anticipatedAcidDose ? `
        <div class="${PARAM_CARD_CLASS['acid']}">
          <strong>pH Adjustment (Acid):</strong>
          <div style="margin:0.5em 0 0.2em 0;">
            ${firstStep.anticipatedAcidDose}
          </div>
        </div>
      ` : ''}
      ${firstStep.anticipatedSodaAshDose ? `
        <div class="${PARAM_CARD_CLASS['sodaash']}">
          <strong>pH Adjustment (Soda Ash):</strong>
          <div style="margin:0.5em 0 0.2em 0;">
            ${firstStep.anticipatedSodaAshDose}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // If the pool needs to be shocked (combined chlorine > 0.6), add a card/note
  let shockNote = '';
  if (
    typeof freeChlorine === 'number' &&
    typeof totalChlorine === 'number' &&
    totalChlorine - freeChlorine > 0.6
  ) {
    shockNote = `
      <div class="chem-card fac" style="background:#fffde7;">
        <strong>Shock Needed:</strong>
        <div style="margin:0.5em 0 0.2em 0;">
          Combined chlorine is above 0.6 ppm.<br>
          <em>Consult "Does My Pool Need To Be Shocked?" for details.</em>
        </div>
      </div>
    `;
  }

  // Note for other parameters
  const otherParams = steps.filter(
    (step, idx) =>
      idx !== steps.indexOf(firstStep) &&
      (step.current < step.target || step.current > step.target) &&
      step.dose
  );
  let otherParamsNote = '';
  if (otherParams.length > 0) {
    otherParamsNote = `
      <div style="margin-top:1em;">
        <em>Other parameters should be adjusted in subsequent visits. See "Is My Pool Balanced?" for more detail.</em>
      </div>
    `;
  }

  return `
    <details class="today-dosage-details" open>
      <summary><strong>What Should I Add to the Pool Today?</strong></summary>
      <div style="margin:1em 0;">
        ${cardsHTML}
        ${shockNote}
        ${otherParamsNote}
      </div>
    </details>
  `;
}

function renderWaterBalanceSteps({ poolType, poolVolume, current, targets = {}, tempF = 77, tds = 1000, freeChlorine, totalChlorine }) {
  const { steps, notes } = getWaterBalanceSteps({ poolType, poolVolume, current, targets, tempF, tds });

  // Determine which parameters are out of range for the summary
  const outOfRangeSteps = steps.filter(step => {
    if (step.key === 'ph') return step.current !== step.target;
    return step.current < step.target || step.current > step.target;
  });

  // Water Balance Plan Summary
  const planSummary = outOfRangeSteps.length
    ? `<div class="water-balance-plan-summary" style="margin-bottom:1em;">
    <strong>Water Balance Plan Summary:</strong><br>
    Adjust the following parameters in this order, one per day:<br>
    <ol>
    ${outOfRangeSteps.map((step, idx) =>
    `<li>Day ${idx + 1}: <span class="${PARAM_COLORS[step.key]}">${step.parameter}</span></li>`
    ).join('')}
    </ol>
    </div>`
    : `<div class="water-balance-plan-summary" style="margin-bottom:1em;">
    <strong>Water Balance Plan Summary:</strong> All parameters are within target range.
    </div>`;

  // Table with color classes
  return `
    <style>
    .cya-purple { color: #8e24aa; font-weight: bold; }
    .alk-green { color: #388e3c; font-weight: bold; }
    .calcium-blue { color: #1976d2; font-weight: bold; }
    .ph-red { color: #d32f2f; font-weight: bold; }
    .dose-table tr.cya-purple td, .dose-table tr.cya-purple th { background: #f3e5f5; }
    .dose-table tr.alk-green td, .dose-table tr.alk-green th { background: #e8f5e9; }
    .dose-table tr.calcium-blue td, .dose-table tr.calcium-blue th { background: #e3f2fd; }
    .dose-table tr.ph-red td, .dose-table tr.ph-red th { background: #ffebee; }
    </style>
    <div class="section water-balance-steps">
    <h3>Water Balance Adjustment Steps</h3>
    ${planSummary}
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
    <tr class="${PARAM_COLORS[step.key] || ''}">
    <td>${idx + 1}</td>
    <td><span class="${PARAM_COLORS[step.key] || ''}">${step.parameter}</span></td>
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
    <em>Adjust chemicals in the order shown above for best results.  Adjust one parameter per day, preferably before the pool opens or right after it closes.</em>
    </div>
    </div>
  `;
}

// Export all main functions
export { renderTodayDosageCards, renderWaterBalanceSteps, getWaterBalanceSteps };