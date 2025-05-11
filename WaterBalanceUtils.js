import { goldenNumbers } from './config.js';
import { advancedLSI } from './script.js';

// --- Acid dose to lower alkalinity ---
// 1.6 quarts (51.2 fl oz) of 31.45% muriatic acid per 10,000 gal lowers TA by 10 ppm
function acidDoseForAlk(current, target, gallons) {
  if (current <= target) return null;
  const ppmDrop = current - target;
  const flOz = (ppmDrop / 10) * 51.2 * (gallons / 10000);
  if (flOz < 1) return null;
  if (flOz < 128) {
    return `${flOz.toFixed(1)} fl oz muriatic acid (31.45%)`;
  } else {
    return `${(flOz / 128).toFixed(2)} gal (${flOz.toFixed(1)} fl oz) muriatic acid (31.45%)`;
  }
}

// Find pH for target LSI, but never below 7.2
function findPhForTargetLSI({ targetLSI, tempF, calcium, alkalinity, cya, tds }) {
  let bestPh = 7.2;
  let minDiff = Infinity;
  for (let ph = 7.2; ph <= 7.8; ph += 0.01) {
    const lsi = advancedLSI({ ph, tempF, calcium, alkalinity, cya, tds });
    const diff = Math.abs(lsi - targetLSI);
    if (diff < minDiff) {
      minDiff = diff;
      bestPh = ph;
    }
  }
  return parseFloat(bestPh.toFixed(2));
}

// Example dose calculation helpers (simplified, adjust as needed)
function cyaDose(current, target, gallons) {
  if (target <= current) return null;
  // 13 oz stabilizer per 10,000 gal raises CYA by 10 ppm
  const doseOz = ((target - current) / 10) * 13 * (gallons / 10000);
  return doseOz > 16
    ? `${(doseOz / 16).toFixed(2)} lbs (${doseOz.toFixed(1)} oz) stabilizer`
    : `${doseOz.toFixed(1)} oz stabilizer`;
}

function alkalinityDose(current, target, gallons) {
  if (target <= current) return null;
  // 1.5 lbs sodium bicarb per 10,000 gal raises TA by 10 ppm
  const doseLbs = ((target - current) / 10) * 1.5 * (gallons / 10000);
  return doseLbs > 0
    ? `${doseLbs.toFixed(2)} lbs sodium bicarbonate`
    : null;
}

function calciumDose(current, target, gallons) {
  if (target <= current) return null;
  // 1.25 lbs calcium chloride per 10,000 gal raises CH by 10 ppm
  const doseLbs = ((target - current) / 10) * 1.25 * (gallons / 10000);
  return doseLbs > 0
    ? `${doseLbs.toFixed(2)} lbs calcium chloride`
    : null;
}

function acidDose(current, target, gallons, alkalinity) {
  if (current <= target) return null;
  // Use the same formula as in PhDisplay.js
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

function sodaAshDose(current, target, gallons, alkalinity) {
  if (current >= target) return null;
  // Use the same formula as in PhDisplay.js
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

/**
 * Calculate water balance steps to reach golden numbers (or custom targets),
 * with exception handling for unachievable source water and LSI-based pH adjustment.
 * @param {object} params
 * @param {string} poolType - 'pool' or 'spa'
 * @param {number} poolVolume - gallons
 * @param {object} current - { cya, alkalinity, calcium, ph }
 * @param {object} [targets] - optional custom targets
 * @param {number} [tempF] - water temperature (F)
 * @param {number} [tds] - total dissolved solids (ppm)
 * @returns {object} - { steps, notes }
 */
export function getWaterBalanceSteps({
  poolType,
  poolVolume,
  current,
  targets = {},
  tempF = 77,
  tds = 1000
}) {
  let t = { ...goldenNumbers[poolType], ...targets };
  let notes = [];

  // Exception: If calcium is above target, set target to current (can't lower)
  if (current.calcium > t.calcium) {
    t.calcium = current.calcium;
    notes.push(`Source water calcium hardness (${current.calcium} ppm) is above the ideal range. Target set to current value.`);
  }

  // Exception: If alkalinity is above target, recommend acid dose to lower it
  let alkAcidDose = null;
  if (current.alkalinity > t.alkalinity) {
    alkAcidDose = acidDoseForAlk(current.alkalinity, t.alkalinity, poolVolume);
    notes.push(`Muriatic acid can be used to lower total alkalinity from ${current.alkalinity} ppm to ${t.alkalinity} ppm.`);
  }

  // If either calcium or alkalinity is above ideal, recalculate pH target for balanced LSI (never below 7.2)
  if (
    current.calcium > goldenNumbers[poolType].calcium ||
    current.alkalinity > goldenNumbers[poolType].alkalinity
  ) {
    const newPh = findPhForTargetLSI({
      targetLSI: 0.0,
      tempF,
      calcium: t.calcium,
      alkalinity: t.alkalinity,
      cya: current.cya,
      tds
    });
    if (newPh < 7.2) {
      t.ph = 7.2;
      notes.push(`pH target adjusted to 7.2 (minimum allowed) to maintain balanced LSI with high calcium/alkalinity.`);
    } else if (newPh !== goldenNumbers[poolType].ph) {
      t.ph = newPh;
      notes.push(`pH target adjusted to ${newPh} to maintain balanced LSI with high calcium/alkalinity.`);
    }
  }

  // Order: CYA, Alkalinity, Calcium, pH
  const steps = [];

  // CYA
  steps.push({
    parameter: 'Cyanuric Acid',
    current: current.cya,
    target: t.cya,
    dose: cyaDose(current.cya, t.cya, poolVolume)
  });

  // Alkalinity
  steps.push({
    parameter: 'Total Alkalinity',
    current: current.alkalinity,
    target: t.alkalinity,
    dose: alkAcidDose || alkalinityDose(current.alkalinity, t.alkalinity, poolVolume)
  });

  // Calcium Hardness
  steps.push({
    parameter: 'Calcium Hardness',
    current: current.calcium,
    target: t.calcium,
    dose: calciumDose(current.calcium, t.calcium, poolVolume)
  });

  // pH (can be up or down)
  let phDose = null;
  if (current.ph > t.ph) {
    phDose = acidDose(current.ph, t.ph, poolVolume, current.alkalinity);
  } else if (current.ph < t.ph) {
    phDose = sodaAshDose(current.ph, t.ph, poolVolume, current.alkalinity);
  }
  steps.push({
    parameter: 'pH',
    current: current.ph,
    target: t.ph,
    dose: phDose
  });

  return { steps, notes };
}