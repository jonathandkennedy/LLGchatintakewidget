import { supabaseAdmin } from "@/lib/supabase/admin";
import { estimateLeadValue } from "./lead-value";

type ROIMetrics = {
  totalLeads: number;
  totalEstimatedValue: number;
  avgLeadValue: number;
  bySource: Array<{
    source: string;
    leads: number;
    estimatedValue: number;
    avgValue: number;
  }>;
};

export async function getROIMetrics(clientId?: string, days = 30): Promise<ROIMetrics> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let builder = supabaseAdmin
    .from("leads")
    .select("id, matter_type, injury_status, injury_areas, medical_treatment_status, incident_state, session_id")
    .gte("created_at", since)
    .limit(500);

  if (clientId) builder = builder.eq("client_id", clientId);
  const { data: leads } = await builder;

  if (!leads || leads.length === 0) {
    return { totalLeads: 0, totalEstimatedValue: 0, avgLeadValue: 0, bySource: [] };
  }

  // Get UTM sources for these leads
  const sessionIds = leads.map((l) => l.session_id).filter(Boolean);
  const { data: sessions } = sessionIds.length > 0
    ? await supabaseAdmin
        .from("lead_sessions")
        .select("id, utm_source")
        .in("id", sessionIds)
    : { data: [] };

  const sessionSourceMap = new Map<string, string>();
  for (const s of sessions ?? []) {
    if (s.utm_source) sessionSourceMap.set(s.id, s.utm_source);
  }

  let totalValue = 0;
  const sourceData = new Map<string, { leads: number; value: number }>();

  for (const lead of leads) {
    const estimate = estimateLeadValue({
      matterType: lead.matter_type,
      injuryStatus: lead.injury_status,
      injuryAreas: lead.injury_areas,
      medicalTreatment: lead.medical_treatment_status,
      incidentState: lead.incident_state,
    });

    totalValue += estimate.midEstimate;

    const source = sessionSourceMap.get(lead.session_id) ?? "Direct";
    const existing = sourceData.get(source) ?? { leads: 0, value: 0 };
    existing.leads++;
    existing.value += estimate.midEstimate;
    sourceData.set(source, existing);
  }

  return {
    totalLeads: leads.length,
    totalEstimatedValue: totalValue,
    avgLeadValue: leads.length > 0 ? Math.round(totalValue / leads.length) : 0,
    bySource: [...sourceData.entries()]
      .map(([source, data]) => ({
        source,
        leads: data.leads,
        estimatedValue: data.value,
        avgValue: Math.round(data.value / data.leads),
      }))
      .sort((a, b) => b.estimatedValue - a.estimatedValue),
  };
}
