import { poolStandards, chlorineTypes } from './config.js';
import { renderAlkalinityDisplay } from './AlkalinityDisplay.js';
import { renderCalciumHardnessDisplay } from './CalciumHardnessDisplay.js';
import { renderPhDisplay } from './PhDisplay.js';
import { renderCyaDisplay } from './CyaDisplay.js';
import { renderTdsDisplay } from './TdsDisplay.js';
import { formatChlorineDose } from './ChlorineDoseUtils.js';
import { renderChlorineScaleDisplay } from './ChlorineScaleDisplay.js';
import { renderLSIScale, renderLSIComponentsTable } from './LsiDisplay.js';

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

// Dynamically create clickable chlorine type buttons
chlorineTypes.forEach(type => {
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
  const state = stateSelect.value;
  const poolType = poolTypeSelect.value;
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
  let html = `<h3>Chlorine Dose Table</h3>
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
            poolType: poolTypeSelect.value, // 'pool' or 'spa'
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

  // --- Alkalinity and Calcium Hardness Displays ---
  const alkDisplayHTML = renderAlkalinityDisplay({
    state: stateSelect.value,
    poolType: poolTypeSelect.value,
    currentAlk: values.alkalinity,
    poolVolume: values.poolVolume
  });
  const calciumDisplayHTML = renderCalciumHardnessDisplay({
    state: stateSelect.value,
    poolType: poolTypeSelect.value,
    currentCH: values.calcium,
    poolVolume: values.poolVolume
  });
  const pHDisplayHTML = renderPhDisplay({
    state: stateSelect.value,
    poolType: poolTypeSelect.value,
    currentPh: values.ph,
    poolVolume: values.poolVolume,
    alkalinity: values.alkalinity 
  })
  const CyaDisplayHTML = renderCyaDisplay({
    state: stateSelect.value,
    poolType: poolTypeSelect.value,
    currentCya: values.cya,
    poolVolume: values.poolVolume
  })
  const TdsDisplayHTML = renderTdsDisplay({
    currentTds: values.tds,
    poolVolume: values.poolVolume,
    state: stateSelect.value,
    poolType: poolTypeSelect.value
  })
  const ChlorineScaleDisplayHTML = renderChlorineScaleDisplay({
    state: stateSelect.value,
    poolType: poolTypeSelect.value,
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

  // --- Results Output ---
  resultsDiv.innerHTML = `
  <h2>Results</h2>
   <details class="water-balance-details" open>
     <summary><strong>Water Balance Detail</strong></summary>
     <div class="water-parameter-charts">
     ${pHDisplayHTML}
     ${alkDisplayHTML}
     ${calciumDisplayHTML}
     ${TdsDisplayHTML}
     </div>
   </details>
   <details class="sanitizer-details" open>
     <summary><strong>Sanitizer & Stabilizer Detail</strong></summary>
     <div class="sanitizer-parameter-charts">
     ${CyaDisplayHTML}
     ${ChlorineScaleDisplayHTML}
     ${doseTableHTML}
     </div>
   </details>
   <details class="compliance-summary-details" open>
     <summary><strong>Summary of Compliance With State Code</strong></summary>
     <div class="compliance-summary-table-wrap">
       <div class="state-name"><strong>State:</strong> ${stateSelect.value}</div>
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
     <div class="lsi-summary-section">
       <h3>Saturation Index Chart</h3>
       ${LSIScaleHTML}
       ${LSIComponentsTableHTML}
     </div>
   </details>
   `;
 });

// ... rest of code remains same