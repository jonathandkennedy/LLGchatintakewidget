/**
 * Lead value estimation.
 * Predicts approximate case value based on matter type, injuries, and location.
 * Uses industry averages for personal injury cases.
 */

type LeadValueInput = {
  matterType: string | null;
  injuryStatus: string | null;
  injuryAreas: string[] | unknown;
  medicalTreatment: string | null;
  incidentState: string | null;
};

type ValueEstimate = {
  lowEstimate: number;
  highEstimate: number;
  midEstimate: number;
  confidence: "high" | "medium" | "low";
  factors: string[];
};

// Base case values by matter type (USD)
const MATTER_VALUES: Record<string, { low: number; high: number }> = {
  truck_accident: { low: 50000, high: 500000 },
  wrongful_death: { low: 100000, high: 1000000 },
  motorcycle_accident: { low: 30000, high: 300000 },
  car_accident: { low: 15000, high: 150000 },
  slip_fall: { low: 10000, high: 100000 },
  other_injury: { low: 5000, high: 75000 },
};

// Multipliers
const INJURY_MULTIPLIERS: Record<string, number> = {
  yes_injured: 1.0,
  someone_else_injured: 0.8,
  not_sure: 0.5,
  no_injuries: 0.1,
};

const TREATMENT_MULTIPLIERS: Record<string, number> = {
  yes: 1.3,       // Documented treatment increases value
  scheduled: 1.1,
  not_yet: 0.8,
  no: 0.5,
};

// States with higher average settlements
const HIGH_VALUE_STATES = ["California", "New York", "Florida", "Texas", "Illinois"];

function getInjuryCount(areas: unknown): number {
  if (Array.isArray(areas)) return areas.length;
  if (typeof areas === "string") {
    try { const parsed = JSON.parse(areas); return Array.isArray(parsed) ? parsed.length : 0; }
    catch { return 0; }
  }
  return 0;
}

export function estimateLeadValue(input: LeadValueInput): ValueEstimate {
  const factors: string[] = [];
  const base = MATTER_VALUES[input.matterType ?? ""] ?? MATTER_VALUES.other_injury;

  let low = base.low;
  let high = base.high;

  // Matter type factor
  factors.push(`Matter: ${input.matterType ?? "unknown"}`);

  // Injury status multiplier
  const injuryMult = INJURY_MULTIPLIERS[input.injuryStatus ?? ""] ?? 0.5;
  low *= injuryMult;
  high *= injuryMult;
  if (injuryMult >= 1.0) factors.push("Confirmed injuries");

  // Injury area count bonus (more areas = higher value)
  const areaCount = getInjuryCount(input.injuryAreas);
  if (areaCount >= 3) {
    low *= 1.3;
    high *= 1.5;
    factors.push(`Multiple injury areas (${areaCount})`);
  } else if (areaCount >= 1) {
    low *= 1.1;
    high *= 1.2;
  }

  // Medical treatment multiplier
  const treatmentMult = TREATMENT_MULTIPLIERS[input.medicalTreatment ?? ""] ?? 0.8;
  low *= treatmentMult;
  high *= treatmentMult;
  if (treatmentMult >= 1.3) factors.push("Active medical treatment");

  // State multiplier
  if (input.incidentState && HIGH_VALUE_STATES.some((s) => s.toLowerCase() === input.incidentState!.toLowerCase())) {
    low *= 1.2;
    high *= 1.3;
    factors.push(`High-value state: ${input.incidentState}`);
  }

  // Round to nearest $1000
  low = Math.round(low / 1000) * 1000;
  high = Math.round(high / 1000) * 1000;
  const mid = Math.round((low + high) / 2 / 1000) * 1000;

  // Confidence based on how much data we have
  let dataPoints = 0;
  if (input.matterType) dataPoints++;
  if (input.injuryStatus) dataPoints++;
  if (areaCount > 0) dataPoints++;
  if (input.medicalTreatment) dataPoints++;
  if (input.incidentState) dataPoints++;

  const confidence = dataPoints >= 4 ? "high" : dataPoints >= 2 ? "medium" : "low";

  return { lowEstimate: low, highEstimate: high, midEstimate: mid, confidence, factors };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}
