/**
 * Lead scoring engine.
 *
 * Computes a 0-100 score based on:
 * - Matter type (case value potential)
 * - Injury severity (confirmed injuries, multiple areas)
 * - Medical treatment (already seeking care = stronger case)
 * - Location (in-state vs out-of-state)
 * - Recency (recent incidents are more actionable)
 * - Contact completeness (phone + email = more reachable)
 *
 * Score tiers:
 *   90-100  Hot      - High-value, urgent, strong case signals
 *   70-89   Warm     - Good potential, follow up promptly
 *   50-69   Medium   - Worth pursuing, standard follow-up
 *   25-49   Cool     - Lower priority, may still convert
 *   0-24    Cold     - Unlikely to convert or low value
 */

type LeadData = {
  matter_type?: string | null;
  injury_status?: string | null;
  injury_areas?: string[] | string | null;
  medical_treatment_status?: string | null;
  incident_state?: string | null;
  incident_date_range?: string | null;
  phone_e164?: string | null;
  email?: string | null;
  incident_summary?: string | null;
};

type ScoreBreakdown = {
  total: number;
  tier: "hot" | "warm" | "medium" | "cool" | "cold";
  factors: Array<{ label: string; points: number; maxPoints: number }>;
};

// Matter type scores (max 25 points)
const MATTER_SCORES: Record<string, number> = {
  truck_accident: 25,       // High value - commercial insurance
  wrongful_death: 25,       // Highest severity
  motorcycle_accident: 22,  // Often severe injuries
  car_accident: 20,         // Most common, solid value
  slip_fall: 15,            // Varies widely
  other_injury: 10,         // Unknown potential
};

// Injury status scores (max 20 points)
const INJURY_SCORES: Record<string, number> = {
  yes_injured: 20,
  someone_else_injured: 15,
  not_sure: 8,
  no_injuries: 2,
};

// Medical treatment scores (max 15 points)
const TREATMENT_SCORES: Record<string, number> = {
  yes: 15,          // Already in treatment = documented
  scheduled: 12,    // Proactive about care
  not_yet: 8,       // May still seek treatment
  no: 4,            // Weaker documentation
};

// Incident recency scores (max 15 points)
const RECENCY_SCORES: Record<string, number> = {
  today: 15,
  last_7_days: 14,
  last_30_days: 12,
  last_12_months: 8,
  over_1_year: 3,   // May be near statute of limitations
  unknown: 5,
};

// Target states (firm's service area) - max 10 points
const TARGET_STATES = ["Washington", "Arizona", "California", "Nevada"];

function getInjuryAreas(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

export function scoreLeadData(data: LeadData): ScoreBreakdown {
  const factors: ScoreBreakdown["factors"] = [];

  // 1. Matter type (0-25)
  const matterPoints = MATTER_SCORES[data.matter_type ?? ""] ?? 5;
  factors.push({ label: "Matter type", points: matterPoints, maxPoints: 25 });

  // 2. Injury status (0-20)
  const injuryPoints = INJURY_SCORES[data.injury_status ?? ""] ?? 0;
  factors.push({ label: "Injury status", points: injuryPoints, maxPoints: 20 });

  // 3. Injury areas count bonus (0-10)
  const areas = getInjuryAreas(data.injury_areas);
  const areaPoints = Math.min(areas.length * 3, 10);
  if (areas.length > 0) {
    factors.push({ label: `Injury areas (${areas.length})`, points: areaPoints, maxPoints: 10 });
  } else {
    factors.push({ label: "Injury areas", points: 0, maxPoints: 10 });
  }

  // 4. Medical treatment (0-15)
  const treatmentPoints = TREATMENT_SCORES[data.medical_treatment_status ?? ""] ?? 0;
  factors.push({ label: "Medical treatment", points: treatmentPoints, maxPoints: 15 });

  // 5. Location - in service area (0-10)
  const inState = TARGET_STATES.some((s) => s.toLowerCase() === (data.incident_state ?? "").toLowerCase());
  const locationPoints = inState ? 10 : 3;
  factors.push({ label: "Location", points: locationPoints, maxPoints: 10 });

  // 6. Recency (0-15)
  const recencyPoints = RECENCY_SCORES[data.incident_date_range ?? ""] ?? 5;
  factors.push({ label: "Recency", points: recencyPoints, maxPoints: 15 });

  // 7. Contact completeness (0-5)
  let contactPoints = 0;
  if (data.phone_e164) contactPoints += 3;
  if (data.email) contactPoints += 2;
  factors.push({ label: "Contact info", points: contactPoints, maxPoints: 5 });

  const total = Math.min(factors.reduce((sum, f) => sum + f.points, 0), 100);

  let tier: ScoreBreakdown["tier"];
  if (total >= 90) tier = "hot";
  else if (total >= 70) tier = "warm";
  else if (total >= 50) tier = "medium";
  else if (total >= 25) tier = "cool";
  else tier = "cold";

  return { total, tier, factors };
}

export function getScoreLabel(tier: string): string {
  switch (tier) {
    case "hot": return "Hot";
    case "warm": return "Warm";
    case "medium": return "Medium";
    case "cool": return "Cool";
    case "cold": return "Cold";
    default: return "Unknown";
  }
}
