/**
 * AI-powered incident classification using Claude API.
 * Analyzes the incident summary text and returns:
 * - Severity assessment
 * - Key facts extracted
 * - Recommended urgency level
 *
 * Requires ANTHROPIC_API_KEY env var.
 */

type ClassificationResult = {
  severity: "critical" | "high" | "medium" | "low";
  urgency: "immediate" | "same_day" | "next_day" | "standard";
  keyFacts: string[];
  liabilityIndicators: string[];
  summary: string;
};

const CLASSIFY_PROMPT = `You are a legal intake assistant. Analyze the following incident description and provide a structured assessment.

Respond in JSON format only:
{
  "severity": "critical" | "high" | "medium" | "low",
  "urgency": "immediate" | "same_day" | "next_day" | "standard",
  "keyFacts": ["fact1", "fact2", ...],
  "liabilityIndicators": ["indicator1", ...],
  "summary": "One sentence summary of the incident"
}

Severity guide:
- critical: life-threatening injuries, wrongful death, commercial vehicle, multiple victims
- high: significant injuries requiring hospitalization, clear liability
- medium: moderate injuries, some treatment needed
- low: minor injuries or property damage only

Urgency guide:
- immediate: statute of limitations concern, evidence at risk, critical injuries
- same_day: significant case that needs prompt attention
- next_day: standard case with clear details
- standard: minor case or unclear details

Incident description:`;

export async function classifyIncident(incidentSummary: string, matterType?: string | null): Promise<ClassificationResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("[ai] ANTHROPIC_API_KEY not set, skipping classification");
    return null;
  }

  if (!incidentSummary || incidentSummary.trim().length < 10) {
    return null;
  }

  const context = matterType ? `Matter type: ${matterType}\n` : "";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `${CLASSIFY_PROMPT}\n${context}${incidentSummary}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[ai] Classification API error:", response.status);
      return null;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const result = JSON.parse(jsonMatch[0]) as ClassificationResult;
    return result;
  } catch (err) {
    console.error("[ai] Classification failed:", err);
    return null;
  }
}

/**
 * Classify and store the result on the lead.
 */
export async function classifyAndStoreLead(
  leadId: string,
  incidentSummary: string,
  matterType?: string | null,
): Promise<void> {
  const { supabaseAdmin } = await import("@/lib/supabase/admin");

  const result = await classifyIncident(incidentSummary, matterType);
  if (!result) return;

  await supabaseAdmin.from("leads").update({
    ai_severity: result.severity,
    ai_urgency: result.urgency,
    ai_key_facts: result.keyFacts,
    ai_liability_indicators: result.liabilityIndicators,
    ai_summary: result.summary,
  }).eq("id", leadId);
}
