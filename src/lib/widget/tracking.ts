import { supabaseAdmin } from "@/lib/supabase/admin";

type TrackEventInput = {
  clientId?: string;
  sessionId?: string;
  leadId?: string;
  eventName: string;
  eventProperties?: Record<string, unknown>;
};

export async function trackWidgetEvent(input: TrackEventInput) {
  if (!input.eventName) {
    throw new Error("eventName is required");
  }

  const { error } = await supabaseAdmin.from("widget_events").insert({
    client_id: input.clientId ?? null,
    session_id: input.sessionId ?? null,
    lead_id: input.leadId ?? null,
    event_name: input.eventName,
    event_properties: input.eventProperties ?? {},
  });

  if (error) throw error;
}
