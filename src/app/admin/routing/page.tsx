import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { updateRoutingAction, deleteRoutingRuleAction, updateFallbackSettingsAction, addPhoneNumberAction } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = { clientId?: string };

async function getClients() {
  const { data } = await supabaseAdmin.from("clients").select("id, name").order("name");
  return data ?? [];
}

async function getRoutingData(clientId: string) {
  const [{ data: phoneNumbers }, { data: routingRules }, { data: fallbackSettings }] = await Promise.all([
    supabaseAdmin.from("client_phone_numbers").select("*").eq("client_id", clientId).order("created_at"),
    supabaseAdmin.from("routing_rules").select("*").eq("client_id", clientId).order("priority"),
    supabaseAdmin.from("fallback_settings").select("*").eq("client_id", clientId).maybeSingle(),
  ]);
  return { phoneNumbers: phoneNumbers ?? [], routingRules: routingRules ?? [], fallbackSettings };
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function RoutingPage({ searchParams }: { searchParams: SearchParams }) {
  const clients = await getClients();
  const clientId = searchParams.clientId ?? clients[0]?.id;
  const data = clientId ? await getRoutingData(clientId) : null;

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Routing &amp; Phone Numbers</h1>
        <p className="muted">Manage tracking numbers, forwarding rules, and fallback settings.</p>
      </div>

      <form className="filter-row" action="" style={{ marginBottom: 20 }}>
        <select className="text-input" name="clientId" defaultValue={clientId ?? ""} style={{ maxWidth: 320 }}>
          <option value="">Select a client</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="primary-button" type="submit" style={{ width: "auto" }}>Load</button>
      </form>

      {!clientId ? (
        <section className="admin-card"><p className="muted">Select a client above, or <Link href="/admin/clients/new">create one first</Link>.</p></section>
      ) : (
        <>
          {/* Phone Numbers */}
          <section className="admin-card">
            <h2>Tracking Numbers</h2>
            {data?.phoneNumbers.length === 0 ? (
              <p className="muted">No phone numbers assigned yet.</p>
            ) : (
              <table className="table">
                <thead><tr><th>Number</th><th>Provider</th><th>Voice</th><th>SMS</th><th>Primary</th></tr></thead>
                <tbody>
                  {data?.phoneNumbers.map((pn) => (
                    <tr key={pn.id}>
                      <td><strong>{pn.phone_number_e164}</strong></td>
                      <td>{pn.provider}</td>
                      <td>{pn.voice_enabled ? "✓" : "—"}</td>
                      <td>{pn.sms_enabled ? "✓" : "—"}</td>
                      <td>{pn.is_primary ? "✓" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <details style={{ marginTop: 16 }}>
              <summary className="admin-link" style={{ cursor: "pointer" }}>+ Add phone number</summary>
              <form action={addPhoneNumberAction} className="admin-form" style={{ marginTop: 12, maxWidth: 400 }}>
                <input type="hidden" name="clientId" value={clientId} />
                <label className="admin-label">
                  Phone Number (E.164)
                  <input className="text-input" name="phoneNumber" placeholder="+15551234567" required />
                </label>
                <p className="muted" style={{ fontSize: 13 }}>Enter the Telnyx number you&apos;ve purchased for this client. Must be in E.164 format (e.g. +15551234567).</p>
                <button className="primary-button" type="submit">Add Number</button>
              </form>
            </details>
          </section>

          {/* Routing Rules */}
          <section className="admin-card" style={{ marginTop: 20 }}>
            <h2>Forwarding Rules</h2>
            <p className="muted">Rules are evaluated in priority order. The first matching rule wins. If no rule matches, the first rule&apos;s destination is used as fallback.</p>
            {data?.routingRules.length === 0 ? (
              <p className="muted">No routing rules yet.</p>
            ) : (
              <table className="table">
                <thead><tr><th>Name</th><th>Days</th><th>Hours</th><th>Destination</th><th>Priority</th><th></th></tr></thead>
                <tbody>
                  {data?.routingRules.map((rule) => (
                    <tr key={rule.id}>
                      <td><strong>{rule.name}</strong></td>
                      <td>{(rule.days_of_week as number[]).map((d: number) => DAYS[d]).join(", ")}</td>
                      <td>{String(rule.start_time_local).slice(0, 5)} – {String(rule.end_time_local).slice(0, 5)}</td>
                      <td>{rule.destination_number_e164}</td>
                      <td>{rule.priority}</td>
                      <td>
                        <form action={deleteRoutingRuleAction} style={{ display: "inline" }}>
                          <input type="hidden" name="ruleId" value={rule.id} />
                          <button type="submit" className="admin-link" style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer" }}>Delete</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <details style={{ marginTop: 16 }}>
              <summary className="admin-link" style={{ cursor: "pointer" }}>+ Add routing rule</summary>
              <form action={updateRoutingAction} className="admin-form" style={{ marginTop: 12, maxWidth: 520 }}>
                <input type="hidden" name="clientId" value={clientId} />
                <label className="admin-label">
                  Rule Name
                  <input className="text-input" name="name" placeholder="e.g. Weekday business hours" required />
                </label>
                <label className="admin-label">
                  Destination Number (E.164)
                  <input className="text-input" name="destinationNumber" placeholder="+15559876543" required />
                </label>
                <label className="admin-label">
                  Timezone
                  <select className="text-input" name="timezone" defaultValue="America/Los_Angeles">
                    <option value="America/New_York">Eastern</option>
                    <option value="America/Chicago">Central</option>
                    <option value="America/Denver">Mountain</option>
                    <option value="America/Los_Angeles">Pacific</option>
                  </select>
                </label>
                <fieldset style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
                  <legend style={{ fontWeight: 600, fontSize: 14 }}>Active Days</legend>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {DAYS.map((day, i) => (
                      <label key={day} style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 14 }}>
                        <input type="checkbox" name="days" value={i} defaultChecked={i >= 1 && i <= 5} />
                        {day}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label className="admin-label">Start Time<input className="text-input" type="time" name="startTime" defaultValue="09:00" /></label>
                  <label className="admin-label">End Time<input className="text-input" type="time" name="endTime" defaultValue="17:00" /></label>
                </div>
                <label className="admin-label">
                  Priority (lower = higher priority)
                  <input className="text-input" type="number" name="priority" defaultValue="100" min="1" />
                </label>
                <button className="primary-button" type="submit">Add Rule</button>
              </form>
            </details>
          </section>

          {/* Fallback Settings */}
          <section className="admin-card" style={{ marginTop: 20 }}>
            <h2>Fallback &amp; Call Settings</h2>
            <form action={updateFallbackSettingsAction} className="admin-form" style={{ maxWidth: 520 }}>
              <input type="hidden" name="clientId" value={clientId} />
              <div className="checkbox-group">
                <label className="checkbox-label"><input type="checkbox" name="voicemailEnabled" defaultChecked={data?.fallbackSettings?.voicemail_enabled ?? true} /> Enable voicemail</label>
                <label className="checkbox-label"><input type="checkbox" name="whisperEnabled" defaultChecked={data?.fallbackSettings?.whisper_enabled ?? true} /> Enable whisper message</label>
                <label className="checkbox-label"><input type="checkbox" name="recordCalls" defaultChecked={data?.fallbackSettings?.record_calls ?? true} /> Record calls</label>
                <label className="checkbox-label"><input type="checkbox" name="smsFallbackEnabled" defaultChecked={data?.fallbackSettings?.sms_fallback_enabled ?? true} /> SMS fallback when call fails</label>
              </div>
              <label className="admin-label">
                Whisper / Callback Message
                <input className="text-input" name="callbackMessage" defaultValue={data?.fallbackSettings?.callback_message ?? "New website intake lead"} />
              </label>
              <label className="admin-label">
                SMS Fallback Message
                <textarea className="text-input" name="smsFallbackMessage" rows={3} defaultValue={data?.fallbackSettings?.sms_fallback_message ?? "We received your request and will call you back as soon as possible."} />
              </label>
              <button className="primary-button" type="submit">Save Settings</button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
