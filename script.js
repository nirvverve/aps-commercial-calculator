import { poolStandards, chlorineTypes, goldenNumbers } from './config.js';
import { renderAlkalinityDisplay } from './AlkalinityDisplay.js';
import { renderCalciumHardnessDisplay } from './CalciumHardnessDisplay.js';
import { renderPhDisplay } from './PhDisplay.js';
import { renderCyaDisplay } from './CyaDisplay.js';
import { renderTdsDisplay } from './TdsDisplay.js';
import { formatChlorineDose } from './ChlorineDoseUtils.js';
import { renderChlorineScaleDisplay } from './ChlorineScaleDisplay.js';
import { renderLSIScale, renderLSIComponentsTable } from './LsiDisplay.js';
import { renderWaterBalanceSteps } from './WaterBalanceDisplay.js';
import { getSaltDose } from './SaltDoseUtils.js';
import { renderTodayDosageCards } from './WaterBalanceUtils.js';
import { renderBreakpointChlorination } from './BreakpointChlorinationDisplay.js';
export { advancedLSI };

// --- State and Pool Type Buttons ---
const stateOptionsDiv = document.getElementById('stateOptions');
const poolTypeOptionsDiv = document.getElementById('poolTypeOptions');

// List your supported states and pool types
const stateList = ["Arizona", "Florida", "Texas"];
let selectedState = null;

stateList.forEach(state => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'state-type-btn';
  btn.textContent = state;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.state-type-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedState = state;
  });
  stateOptionsDiv.appendChild(btn);
});

const poolTypeList = ["pool", "spa"];
let selectedPoolType = null;

poolTypeList.forEach(type => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pool-type-btn';
  btn.textContent = type.charAt(0).toUpperCase() + type.slice(1);
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pool-type-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedPoolType = type;
  });
  poolTypeOptionsDiv.appendChild(btn);
});

// --- LSI FACTOR TABLES (from calculator.js) ---
const ALKALINITY_FACTORS = [
    { ppm: 5, factor: 0.7 }, { ppm: 25, factor: 1.4 }, { ppm: 50, factor: 1.7 },
    { ppm: 75, factor: 1.9 }, { ppm: 100, factor: 2.0 }, { ppm: 125, factor: 2.1 },
    { ppm: 150, factor: 2.2 }, { ppm: 200, factor: 2.3 }, { ppm: 250, factor: 2.4 },
    { ppm: 300, factor: 2.5 }, { ppm: 400, factor: 2.6 }, { ppm: 800, factor: 2.9 },
    { ppm: 1000, factor: 3.0 }
  ];
  
  const CALCIUM_FACTORS = [
    { ppm: 5, factor: 0.3 }, { ppm: 25, factor: 1.0 }, { ppm: 50, factor: 1.3 },
    { ppm: 75, factor: 1.5 }, { ppm: 100, factor: 1.6 }, { ppm: 125, factor: 1.7 },
    { ppm: 150, factor: 1.8 }, { ppm: 200, factor: 1.9 }, { ppm: 250, factor: 2.0 },
    { ppm: 300, factor: 2.1 }, { ppm: 400, factor: 2.2 }, { ppm: 800, factor: 2.5 },
    { ppm: 1000, factor: 2.6 }
  ];
  
  const TEMP_FACTORS = [
    { temp: 32, factor: 0.1 }, { temp: 37, factor: 0.1 }, { temp: 46, factor: 0.2 },
    { temp: 53, factor: 0.3 }, { temp: 60, factor: 0.4 }, { temp: 66, factor: 0.5 },
    { temp: 76, factor: 0.6 }, { temp: 84, factor: 0.7 }, { temp: 94, factor: 0.8 },
    { temp: 104, factor: 0.9 }, { temp: 128, factor: 1.0 }
  ];
  
  // TDS correction per calculator.js
  function getTDSFactor(tds) {
    if (tds <= 800) return 12.1;
    if (tds <= 1500) return 12.2;
    if (tds <= 2900) return 12.3;
    if (tds <= 5500) return 12.4;
    return 12.5;
  }
  
  // Always use the next factor up (ceiling logic)
  function getFactorCeil(value, table, key = 'ppm') {
    for (let i = 0; i < table.length; i++) {
      if (value <= table[i][key]) return table[i].factor;
    }
    // If value is above all, return the last factor
    return table[table.length - 1].factor;
  }
// --- Chlorine Type Buttons ---
const chlorineTypeOptionsDiv = document.getElementById('chlorineTypeOptions');
let selectedChlorineType = null;

// Only show allowed chlorine types (exclude 10% liquid and 68% cal-hypo)
const allowedChlorineTypes = chlorineTypes.filter(type =>
  type.name !== "Liquid Chlorine (10%)" && type.name !== "Calcium Hypochlorite (68%)"
);

// Dynamically create clickable chlorine type buttons
allowedChlorineTypes.forEach(type => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'chlorine-type-btn';
  btn.textContent = type.name;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chlorine-type-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedChlorineType = type;
  });
  chlorineTypeOptionsDiv.appendChild(btn);
});

// --- Combined Chlorine Calculation (live update) ---
const freeChlorineInput = document.getElementById('freeChlorine');
const totalChlorineInput = document.getElementById('totalChlorine');
const combinedChlorineInput = document.getElementById('combinedChlorine');

function updateCombinedChlorine() {
  const fc = parseFloat(freeChlorineInput.value) || 0;
  const tc = parseFloat(totalChlorineInput.value) || 0;
  const cc = Math.max(tc - fc, 0);
  combinedChlorineInput.value = cc.toFixed(2);
}
freeChlorineInput.addEventListener('input', updateCombinedChlorine);
totalChlorineInput.addEventListener('input', updateCombinedChlorine);

// --- Form Inputs ---
const poolCapacityInput = document.getElementById('poolCapacity');
const cyaInput = document.getElementById('cya');
const phInput = document.getElementById('ph');
const alkalinityInput = document.getElementById('alkalinity');
const calciumInput = document.getElementById('calcium');
const saltLevelInput = document.getElementById('saltLevel');
const targetSaltLevelSelect = document.getElementById('targetSaltLevel');
const temperatureInput = document.getElementById('temperature');
const tdsInput = document.getElementById('tds');
const stateSelect = document.getElementById('stateSelect');
const poolTypeSelect = document.getElementById('poolTypeSelect');
const resultsDiv = document.getElementById('results');

// --- Advanced LSI Calculation (from calculation.js) ---
function advancedLSI({ ph, tempF, calcium, alkalinity, cya, tds }) {
    // CYA-corrected alkalinity
    let correctedAlk = parseFloat(alkalinity) - (parseFloat(cya) / 3);
    if (correctedAlk < 0) correctedAlk = 0;
  
    const alkFactor = getFactorCeil(correctedAlk, ALKALINITY_FACTORS);
    const calFactor = getFactorCeil(parseFloat(calcium), CALCIUM_FACTORS);
    const tempFactor = getFactorCeil(parseFloat(tempF), TEMP_FACTORS, 'temp');
    const tdsFactor = getTDSFactor(parseFloat(tds));
  
    // LSI formula: pH + calcium factor + alkalinity factor + temp factor - TDS factor
    return parseFloat(ph) + calFactor + alkFactor + tempFactor - tdsFactor;
}

// --- Helper: Get Standards for Current Selection ---
function getCurrentStandards() {
  const state = selectedState;
  const poolType = selectedPoolType;
  if (!state || !poolType) return null;
  return poolStandards[state][poolType];
}

// --- Helper: Range Warnings ---
function getWarnings(values, standards) {
  const warnings = [];
  if (values.freeChlorine < standards.freeChlorine.min)
    warnings.push(`Free Chlorine is below minimum (${standards.freeChlorine.min} ppm).`);
  if (values.freeChlorine > standards.freeChlorine.max)
    warnings.push(`Free Chlorine is above maximum (${standards.freeChlorine.max} ppm).`);
  if (standards.freeChlorine.cyaRatio && values.freeChlorine < values.cya * standards.freeChlorine.cyaRatio)
    warnings.push(`Free Chlorine is below 5% of CYA (min required: ${(values.cya * standards.freeChlorine.cyaRatio).toFixed(2)} ppm).`);
  if (values.ph < standards.pH.min || values.ph > standards.pH.max)
    warnings.push(`pH is out of range (${standards.pH.min} - ${standards.pH.max}).`);
  if (values.alkalinity < standards.alkalinity.min || values.alkalinity > standards.alkalinity.max)
    warnings.push(`Alkalinity is out of range (${standards.alkalinity.min} - ${standards.alkalinity.max} ppm).`);
  if (values.cya < standards.cya.min)
    warnings.push(`Cyanuric Acid is below minimum (${standards.cya.min} ppm).`);
  if (values.cya > standards.cya.max)
    warnings.push(`Cyanuric Acid is above maximum (${standards.cya.max} ppm).`);
  if (standards.calcium.min && values.calcium < standards.calcium.min)
    warnings.push(`Calcium Hardness is below minimum (${standards.calcium.min} ppm).`);
  if (standards.calcium.max && values.calcium > standards.calcium.max)
    warnings.push(`Calcium Hardness is above maximum (${standards.calcium.max} ppm).`);
  return warnings;
}

// --- Dose Visualization Table ---
function renderChlorineDoseTable({currentFC, poolVolume, chlorineType, minFC, maxFC, increment}) {
  let html = `<h3>Manual Chlorine Addition Guide</h3>
    <table class="dose-table">
    <thead>
    <tr>
    <th>Target FC (ppm)</th>
    <th>Dose Needed (${chlorineType.name})</th>
    </tr>
    </thead>
    <tbody>
  `;
  for (let fc = minFC; fc <= maxFC; fc += increment) {
    const dose = fc > currentFC
      ? ((fc - currentFC) * poolVolume * 0.00000834) / chlorineType.concentration
      : 0;
    html += `<tr>
      <td>${fc.toFixed(2)}</td>
      <td>${dose > 0
        ? formatChlorineDose({
            lbs: dose,
            poolType: selectedPoolType, // 'pool' or 'spa'
            chlorineType: chlorineType.id // 'liquid' or 'cal-hypo'
          })
        : '-'}</td>
      </tr>`;
  }
  html += `</tbody></table>`;
  return html;
}
// --- LSI Factors Helper ---
function getLSIFactors({ ph, tempF, calcium, alkalinity, cya, tds }) {
  // CYA-corrected alkalinity
  let correctedAlk = parseFloat(alkalinity) - (parseFloat(cya) / 3);
  if (correctedAlk < 0) correctedAlk = 0;

  const alkFactor = getFactorCeil(correctedAlk, ALKALINITY_FACTORS);
  const calFactor = getFactorCeil(parseFloat(calcium), CALCIUM_FACTORS);
  const tempFactor = getFactorCeil(parseFloat(tempF), TEMP_FACTORS, 'temp');
  const tdsFactor = getTDSFactor(parseFloat(tds));

  // LSI formula: pH + calcium factor + alkalinity factor + temp factor - TDS factor
  const lsi = parseFloat(ph) + calFactor + alkFactor + tempFactor - tdsFactor;

  return {
    lsi,
    ph: parseFloat(ph),
    alk: parseFloat(alkalinity),
    correctedAlk: correctedAlk,
    alkFactor,
    calcium: parseFloat(calcium),
    calFactor,
    tempF: parseFloat(tempF),
    tempFactor,
    tds: parseFloat(tds),
    tdsFactor,
    cya: parseFloat(cya)
  };
}
// --- Form Submission ---
document.getElementById('poolForm').addEventListener('submit', function(e) {
  e.preventDefault();

  // Validate chlorine type selection
  if (!selectedChlorineType) {
    alert('Please select a chlorine type.');
    return;
  }
  if (!selectedState) {
    alert('Please select a state.');
    return;
  }
  if (!selectedPoolType) {
    alert('Please select a pool type.');
    return;
  }
  // Gather all input values
  const values = {
    poolVolume: parseFloat(poolCapacityInput.value),
    freeChlorine: parseFloat(freeChlorineInput.value),
    totalChlorine: parseFloat(totalChlorineInput.value),
    cya: parseFloat(cyaInput.value),
    ph: parseFloat(phInput.value),
    alkalinity: parseFloat(alkalinityInput.value),
    calcium: parseFloat(calciumInput.value),
    saltLevel: parseFloat(saltLevelInput.value),
    targetSaltLevel: parseFloat(targetSaltLevelSelect.value),
    temperature: parseFloat(temperatureInput.value),
    tds: parseFloat(tdsInput.value)
  };
  // Expert Mode custom targets
  let customTargets = {};
  if (window.expertModeCheckbox && window.expertModeCheckbox.checked) {
    customTargets = {
      freeChlorine: parseFloat(window.targetInputs.freeChlorine.value),
      ph: parseFloat(window.targetInputs.ph.value),
      alkalinity: parseFloat(window.targetInputs.alkalinity.value),
      calcium: parseFloat(window.targetInputs.calcium.value),
      cya: parseFloat(window.targetInputs.cya.value),
      salt: parseFloat(window.targetInputs.salt.value)
    };
  }
  const standards = getCurrentStandards();
  if (!standards) {
    resultsDiv.innerHTML = `<p class="error">Please select state and pool type.</p>`;
    return;
  }

  // --- Advanced LSI Calculation ---
  const lsi = advancedLSI({
    ph: values.ph,
    tempF: values.temperature,
    calcium: values.calcium,
    alkalinity: values.alkalinity,
    cya: values.cya,
    tds: values.tds
  });

  // --- Warnings ---
  const warnings = getWarnings(values, standards);

  // --- Chlorine Dose Table ---
  // Determine min/max FC for table (use CYA ratio if higher)
  let minFC = standards.freeChlorine.min;
  if (standards.freeChlorine.cyaRatio) {
    const cyaMin = values.cya * standards.freeChlorine.cyaRatio;
    if (cyaMin > minFC) minFC = cyaMin;
  }
  let maxFC = standards.freeChlorine.max;
  // Table increments by 0.5 ppm
  const doseTableHTML = renderChlorineDoseTable({
    currentFC: values.freeChlorine,
    poolVolume: values.poolVolume,
    chlorineType: selectedChlorineType,
    minFC,
    maxFC,
    increment: 0.5
  });
  const BreakpointChlorinationHTML = renderBreakpointChlorination({
    freeChlorine: values.freeChlorine,
    totalChlorine: values.totalChlorine,
    poolVolume: values.poolVolume,
    chlorineType: selectedChlorineType
  });
  // --- Alkalinity and Calcium Hardness Displays ---
  const todayDosageCardsHTML = renderTodayDosageCards({
    poolType: selectedPoolType,
    poolVolume: values.poolVolume,
    current: {
      cya: values.cya,
      alkalinity: values.alkalinity,
      calcium: values.calcium,
      ph: values.ph
    },
    tempF: values.temperature,
    tds: values.tds,
    freeChlorine: values.freeChlorine,
    totalChlorine: values.totalChlorine,
    doseTableHTML,
    BreakpointChlorinationHTML
  });
  const saltDoseResult = getSaltDose({
    currentSalt: values.saltLevel,
    targetSalt: values.targetSaltLevel,
    poolVolume: values.poolVolume
  });
  const saltDoseHTML = `
  <div class="salt-dose-result">
    <h4>Salt Addition Recommendation</h4>
    <p>${saltDoseResult.display}</p>
  </div>
`;
  const alkDisplayHTML = renderAlkalinityDisplay({
    state: selectedState,
    poolType: selectedPoolType,
    currentAlk: values.alkalinity,
    poolVolume: values.poolVolume
  });
  const calciumDisplayHTML = renderCalciumHardnessDisplay({
    state: selectedState,
    poolType: selectedPoolType,
    currentCH: values.calcium,
    poolVolume: values.poolVolume
  });
  const pHDisplayHTML = renderPhDisplay({
    state: selectedState,
    poolType: selectedPoolType,
    currentPh: values.ph,
    poolVolume: values.poolVolume,
    alkalinity: values.alkalinity 
  })
  const CyaDisplayHTML = renderCyaDisplay({
    state: selectedState,
    poolType: selectedPoolType,
    currentCya: values.cya,
    poolVolume: values.poolVolume
  })
  const TdsDisplayHTML = renderTdsDisplay({
    currentTds: values.tds,
    poolVolume: values.poolVolume,
    state: selectedState,
    poolType: selectedPoolType
  })
  const ChlorineScaleDisplayHTML = renderChlorineScaleDisplay({
    state: selectedState,
    poolType: selectedPoolType,
    currentFC: values.freeChlorine,
    cya: values.cya
  })
  const lsiFactors = getLSIFactors({
    ph: values.ph,
    tempF: values.temperature,
    calcium: values.calcium,
    alkalinity: values.alkalinity,
    cya: values.cya,
    tds: values.tds
  });
const LSIScaleHTML = renderLSIScale(lsiFactors.lsi);
const LSIComponentsTableHTML = renderLSIComponentsTable(lsiFactors);
const waterBalanceStepsHTML = renderWaterBalanceSteps({
  poolType: selectedPoolType,
  poolVolume: values.poolVolume,
  current: {
    cya: values.cya,
    alkalinity: values.alkalinity,
    calcium: values.calcium,
    ph: values.ph
  }
});

resultsDiv.innerHTML = `
<h2>Full Details</h2>
    ${todayDosageCardsHTML}
<details class="compliance-summary-details" closed>
  <summary><strong>Is the Pool Compliant With State Code ?</strong></summary>
  <div class="compliance-summary-table-wrap">
    <div class="state-name"><strong>State:</strong> ${selectedState}</div>
    <table class="compliance-summary-table">
    <thead>
    <tr>
    <th>Parameter</th>
    <th>Current</th>
    <th>Min</th>
    <th>Max</th>
    <th>Status</th>
    </tr>
    </thead>
    <tbody>
    ${[
    {
    label: "Free Chlorine",
    current: values.freeChlorine,
    min: standards.freeChlorine.min,
    max: standards.freeChlorine.max,
    inRange: values.freeChlorine >= standards.freeChlorine.min && values.freeChlorine <= standards.freeChlorine.max
    },
    {
    label: "pH",
    current: values.ph,
    min: standards.pH.min,
    max: standards.pH.max,
    inRange: values.ph >= standards.pH.min && values.ph <= standards.pH.max
    },
    {
    label: "Alkalinity",
    current: values.alkalinity,
    min: standards.alkalinity.min,
    max: standards.alkalinity.max,
    inRange: values.alkalinity >= standards.alkalinity.min && values.alkalinity <= standards.alkalinity.max
    },
    {
    label: "Cyanuric Acid",
    current: values.cya,
    min: standards.cya.min,
    max: standards.cya.max,
    inRange: values.cya >= standards.cya.min && values.cya <= standards.cya.max
    },
    {
    label: "Calcium Hardness",
    current: values.calcium,
    min: standards.calcium.min,
    max: standards.calcium.max,
    inRange: values.calcium >= standards.calcium.min && values.calcium <= standards.calcium.max
    }
    ].map(row => `
    <tr class="${row.inRange ? 'compliant' : 'noncompliant'}">
    <td>${row.label}</td>
    <td>${row.current}</td>
    <td>${row.min}</td>
    <td>${row.max}</td>
    <td>${row.inRange ? '<span class="status-ok">&#10003;</span>' : '<span class="status-bad">&#10007;</span>'}</td>
    </tr>
    `).join('')}
    </tbody>
    </table>
    ${warnings.length > 0 ? `<ul class="compliance-warnings">${warnings.map(w => `<li>⚠️ ${w}</li>`).join('')}</ul>` : ''}
  </div>
</details>
<details class="water-balance-details" closed>
  <summary><strong>Is My Pool Balanced ?</strong></summary>
  <h2>LSI Scale</h2>
  <div class="water-balance-charts">
    ${LSIScaleHTML}
    ${LSIComponentsTableHTML}
    ${waterBalanceStepsHTML}
  </div>
</details>
<details class="sanitizer-details" closed>
  <summary><strong>Does My Pool Need To Be Shocked ?</strong></summary>
  <div class="sanitizer-parameter-charts">
    ${BreakpointChlorinationHTML}
  </div>
</details>
<details class="water-balance-details" closed>
  <summary><strong>Water Balance Detail</strong></summary>
  <div class="water-parameter-charts">
    ${pHDisplayHTML}
    ${alkDisplayHTML}
    ${calciumDisplayHTML}
    ${TdsDisplayHTML}
  </div>
</details>
<details class="sanitizer-details" closed>
  <summary><strong>Chlorine, CYA, and Manual Dosing Detail</strong></summary>
  <div class="sanitizer-parameter-charts">
    ${ChlorineScaleDisplayHTML}
    ${CyaDisplayHTML}
    ${doseTableHTML}
  </div>
</details>
<details class="salt-dose-details" closed>
  <summary><strong>Salt Dose Recommendation</strong></summary>
  <div class="salt-dose-parameter-charts">
    ${saltDoseHTML}
  </div>
</details>
`;
    });
// --- Expert Mode Logic ---
document.addEventListener('DOMContentLoaded', () => {
  // --- Expert Mode DOM lookups ---
  const expertModeCheckbox = document.getElementById('expertMode');
  const expertModeSection = document.getElementById('expertModeSection');
  const targetInputs = {
    freeChlorine: document.getElementById('targetFreeChlorine'),
    ph: document.getElementById('targetPh'),
    alkalinity: document.getElementById('targetAlkalinity'),
    calcium: document.getElementById('targetCalcium'),
    cya: document.getElementById('targetCya'),
    salt: document.getElementById('targetSalt')
  };
  const lsiCurrentDisplay = document.getElementById('lsiCurrentDisplay');
  const lsiTargetDisplay = document.getElementById('lsiTargetDisplay');

  // Check if elements exist before adding event listeners
  if (!expertModeCheckbox || !expertModeSection) {
    console.error('Expert Mode elements not found');
    return;
  }

  // Show/hide expert mode section
  expertModeCheckbox.addEventListener('change', () => {
    console.log('Expert mode checkbox changed:', expertModeCheckbox.checked);
    console.log('Expert mode section element:', expertModeSection);
    
    expertModeSection.style.display = expertModeCheckbox.checked ? 'block' : 'none';
    
    if (expertModeCheckbox.checked) {
      console.log('Expert mode enabled, pre-filling values');
      // Pre-fill with current golden numbers or last used targets
      const poolType = selectedPoolType || 'pool';
      console.log('Pool type:', poolType);
      console.log('Golden numbers:', goldenNumbers);
      
      const golden = goldenNumbers ? goldenNumbers[poolType] : {
        freeChlorine: 2,
        ph: 7.5,
        alkalinity: 90,
        calcium: 300,
        cya: 30,
        salt: 0
      };
      
      console.log('Using golden numbers:', golden);
      
      targetInputs.freeChlorine.value = golden.freeChlorine;
      targetInputs.ph.value = golden.ph;
      targetInputs.alkalinity.value = golden.alkalinity;
      targetInputs.calcium.value = golden.calcium;
      targetInputs.cya.value = golden.cya;
      targetInputs.salt.value = golden.salt || 0;
      updateLSIDisplay();
    }
  });
  // Update LSI displays when any target or current value changes
  Object.values(targetInputs).forEach(input => {
    if (input) input.addEventListener('input', updateLSIDisplay);
  });
  [
    document.getElementById('ph'),
    document.getElementById('alkalinity'),
    document.getElementById('calcium'),
    document.getElementById('cya'),
    document.getElementById('tds'),
    document.getElementById('temperature')
  ].forEach(input => {
    if (input) input.addEventListener('input', updateLSIDisplay);
  });

  function updateLSIDisplay() {
    // Get current values
    const current = {
      ph: parseFloat(document.getElementById('ph').value) || 0,
      alkalinity: parseFloat(document.getElementById('alkalinity').value) || 0,
      calcium: parseFloat(document.getElementById('calcium').value) || 0,
      cya: parseFloat(document.getElementById('cya').value) || 0,
      tds: parseFloat(document.getElementById('tds').value) || 1000,
      tempF: parseFloat(document.getElementById('temperature').value) || 77
    };
    // Get target values
    const targets = {
      ph: parseFloat(targetInputs.ph.value) || 0,
      alkalinity: parseFloat(targetInputs.alkalinity.value) || 0,
      calcium: parseFloat(targetInputs.calcium.value) || 0,
      cya: parseFloat(targetInputs.cya.value) || 0,
      tds: current.tds,
      tempF: current.tempF
    };
    // Calculate LSI for current and targets
    if (typeof advancedLSI === 'function') {
      const lsiCurrent = advancedLSI(current);
      const lsiTarget = advancedLSI(targets);
      if (lsiCurrentDisplay) lsiCurrentDisplay.textContent = lsiCurrent.toFixed(2);
      if (lsiTargetDisplay) lsiTargetDisplay.textContent = lsiTarget.toFixed(2);
    } else {
      if (lsiCurrentDisplay) lsiCurrentDisplay.textContent = '-';
      if (lsiTargetDisplay) lsiTargetDisplay.textContent = '-';
    }
  }

  // Make variables available globally for form submission
  window.expertModeCheckbox = expertModeCheckbox;
  window.targetInputs = targetInputs;
});

// --- Sodium Thiosulfate (Chlorine Neutralizer) Calculator ---

// Modal open/close logic
const openThioCalcBtn = document.getElementById('openThioCalc');
const thioCalcModal = document.getElementById('thioCalcModal');
const closeThioCalcBtn = document.getElementById('closeThioCalc');
const thioForm = document.getElementById('thioForm');
const thioResults = document.getElementById('thioResults');

openThioCalcBtn.addEventListener('click', () => {
  thioCalcModal.style.display = 'flex';
});
closeThioCalcBtn.addEventListener('click', () => {
  thioCalcModal.style.display = 'none';
  thioResults.innerHTML = '';
  thioForm.reset();
});
thioCalcModal.addEventListener('click', (e) => {
  if (e.target === thioCalcModal) {
    thioCalcModal.style.display = 'none';
    thioResults.innerHTML = '';
    thioForm.reset();
  }
});

// Sodium thiosulfate dose calculation
function calculateThioDose(currentFC, targetFC, poolVolume) {
  // 1.3 oz per 1 ppm per 10,000 gallons
  const ppmToRemove = currentFC - targetFC;
  if (ppmToRemove <= 0) return 0;
  return ppmToRemove * (poolVolume / 10000) * 1.3;
}
// Helper to format ounces as "X oz (Y lb Z oz)"
function formatOunces(oz) {
  const lbs = Math.floor(oz / 16);
  const remOz = oz % 16;
  if (lbs > 0) {
    return `${oz.toFixed(2)} oz (${lbs} lb${lbs > 1 ? 's' : ''} ${remOz.toFixed(2)} oz)`;
  } else {
    return `${oz.toFixed(2)} oz`;
  }
}

// Render the step table
function renderThioTable(currentFC, poolVolume) {
  let html = `
    <div style="background:#fffde7;border-left:5px solid #fbc02d;padding:12px 18px;margin-bottom:1em;border-radius:7px;">
      <strong>Note:</strong> Sodium thiosulfate can take up to two hours to work. Add <b>half</b> the required dose, wait two hours, and retest. If needed, add the remaining amount.
    </div>
    <h4>Dose Table (Sodium Thiosulfate Needed)</h4>
    <table class="dose-table" style="margin-top:1em;">
      <thead>
        <tr>
          <th>Target FC (ppm)</th>
          <th>Ounces Needed<br><span style="font-weight:normal;font-size:0.95em;">(dry oz, lbs &amp; oz)</span></th>
        </tr>
      </thead>
      <tbody>
  `;
  // 5 ppm steps from current down to 10
  for (let fc = Math.floor(currentFC / 5) * 5; fc > 10; fc -= 5) {
    if (fc < 0) break;
    if (fc < currentFC) {
      const dose = calculateThioDose(currentFC, fc, poolVolume);
      html += `<tr><td>${fc.toFixed(1)}</td><td>${formatOunces(dose)}</td></tr>`;
    }
  }
  // 1.0 ppm steps from 10 down to 0
  for (let fc = 10; fc >= 0; fc -= 1.0) {
    if (fc < 0) fc = 0;
    if (fc < currentFC) {
      const dose = calculateThioDose(currentFC, fc, poolVolume);
      html += `<tr><td>${fc.toFixed(1)}</td><td>${formatOunces(dose)}</td></tr>`;
    }
    if (fc === 0) break;
  }
  html += `</tbody></table>
    <div style="margin-top:1em;font-size:0.98em;color:#757575;">
      <em>Always retest pH and alkalinity after treatment.</em>
    </div>
  `;
  return html;
}

// Form submit handler
thioForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const poolVolume = parseFloat(document.getElementById('thioPoolVolume').value);
  const currentFC = parseFloat(document.getElementById('thioCurrentFC').value);
  const ph = parseFloat(document.getElementById('thioPH').value);

  // pH warning
  let warning = '';
  if (ph < 7.2) {
    warning = `<div style="color:#b71c1c;font-weight:bold;margin-bottom:0.7em;">Warning: pH is already low. Sodium thiosulfate may lower pH further. Adjust pH before neutralizing chlorine.</div>`;
  }

  thioResults.innerHTML = warning + renderThioTable(currentFC, poolVolume);
});
