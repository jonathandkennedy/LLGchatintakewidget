/**
 * Sentiment/urgency analysis from lead text fields.
 * Runs locally using keyword matching (no API needed).
 * Fast and free - complements the Claude classification.
 */

type SentimentResult = {
  urgencyScore: number; // 0-10
  emotionalTone: "distressed" | "concerned" | "neutral" | "calm";
  urgencySignals: string[];
};

// High urgency keywords and phrases
const URGENT_KEYWORDS = [
  { pattern: /hospital|emergency|ER|ambulance|911/i, signal: "Emergency medical involvement", weight: 3 },
  { pattern: /surgery|operation|ICU|intensive care/i, signal: "Surgical/intensive care needed", weight: 3 },
  { pattern: /paralyz|paralysis|can't walk|can't move/i, signal: "Paralysis or mobility loss", weight: 4 },
  { pattern: /death|died|killed|fatal/i, signal: "Fatality involved", weight: 5 },
  { pattern: /child|children|baby|infant|kid|minor/i, signal: "Minor involved", weight: 3 },
  { pattern: /hit.?and.?run|fled|left the scene/i, signal: "Hit and run", weight: 3 },
  { pattern: /drunk|DUI|DWI|intoxicat/i, signal: "Impaired driver", weight: 3 },
  { pattern: /commercial|semi|18.?wheel|big rig|tractor/i, signal: "Commercial vehicle", weight: 2 },
  { pattern: /no insurance|uninsured/i, signal: "Uninsured motorist", weight: 2 },
  { pattern: /police report|filed a report/i, signal: "Police report filed", weight: 1 },
  { pattern: /witness|camera|dashcam/i, signal: "Evidence available", weight: 1 },
];

// Emotional distress signals
const DISTRESS_KEYWORDS = [
  /scared|terrified|afraid|frightened/i,
  /can't sleep|nightmare|anxiety|panic/i,
  /help me|please help|desperate|urgent/i,
  /pain|suffering|agony|excruciating/i,
  /lost my job|can't work|bills|debt/i,
  /crying|depressed|hopeless/i,
];

// Calm/neutral signals
const CALM_KEYWORDS = [
  /just checking|wondering|curious/i,
  /minor|small|fender bender|scratch/i,
  /no rush|whenever|at your convenience/i,
];

export function analyzeSentiment(text: string): SentimentResult {
  if (!text || text.trim().length < 5) {
    return { urgencyScore: 0, emotionalTone: "neutral", urgencySignals: [] };
  }

  let totalWeight = 0;
  const signals: string[] = [];

  // Check urgent keywords
  for (const kw of URGENT_KEYWORDS) {
    if (kw.pattern.test(text)) {
      totalWeight += kw.weight;
      signals.push(kw.signal);
    }
  }

  // Check emotional distress
  let distressCount = 0;
  for (const kw of DISTRESS_KEYWORDS) {
    if (kw.test(text)) distressCount++;
  }
  if (distressCount > 0) {
    totalWeight += distressCount;
    signals.push(`Emotional distress (${distressCount} signals)`);
  }

  // Check calm signals (reduce score)
  let calmCount = 0;
  for (const kw of CALM_KEYWORDS) {
    if (kw.test(text)) calmCount++;
  }
  totalWeight -= calmCount * 2;

  // Normalize to 0-10
  const urgencyScore = Math.max(0, Math.min(10, totalWeight));

  // Determine tone
  let emotionalTone: SentimentResult["emotionalTone"];
  if (distressCount >= 3) emotionalTone = "distressed";
  else if (distressCount >= 1 || urgencyScore >= 5) emotionalTone = "concerned";
  else if (calmCount >= 2) emotionalTone = "calm";
  else emotionalTone = "neutral";

  return { urgencyScore, emotionalTone, urgencySignals: signals };
}
