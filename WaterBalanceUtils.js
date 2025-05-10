
import { goldenNumbers } from './config.js';

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
 * Calculate water balance steps to reach golden numbers (or custom targets).
 * @param {object} params
 * @param {string} poolType - 'pool' or 'spa'
 * @param {number} poolVolume - gallons
 * @param {object} current - { cya, alkalinity, calcium, ph }
 * @param {object} [targets] - optional custom targets
 * @returns {Array} - Array of steps: { parameter, current, target, dose }
 */
export function getWaterBalanceSteps({ poolType, poolVolume, current, targets = {} }) {
  const t = { ...goldenNumbers[poolType], ...targets };

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
    dose: alkalinityDose(current.alkalinity, t.alkalinity, poolVolume)
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

  return steps;
}