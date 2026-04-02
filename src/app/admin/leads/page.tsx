import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  q?: string;
};

async function getLeads(searchParams: SearchParams) {
  let builder = supabaseAdmin
    .from("leads")
    .select("id, created_at, status, matter_type, first_name, last_name, phone_e164, incident_state, incident_city")
    .order("created_at", { ascending: false })
    .limit(100);

  if (searchParams.status) builder = builder.eq("status", searchParams.status);
  if (searchParams.q) builder = builder.or(`first_name.ilike.%${searchParams.q}%,last_name.ilike.%${searchParams.q}%,phone_e164.ilike.%${searchParams.q}%`);

  const { data } = await builder;
  return data ?? [];
}

export default async function AdminLeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const leads = await getLeads(searchParams);

  const exportParams = new URLSearchParams();
  if (searchParams.status) exportParams.set("status", searchParams.status);
  if (searchParams.q) exportParams.set("q", searchParams.q);
  const exportUrl = `/intakeapp/api/admin/leads/export${exportParams.toString() ? "?" + exportParams.toString() : ""}`;

  return (
    <main className="page-shell">
      <section className="panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="eyebrow">Admin inbox</div>
            <h1>Leads</h1>
            <p className="muted text-sm" style={{ marginTop: 4 }}>Filter recent leads, open a detail page, and update statuses.</p>
          </div>
          <a href={exportUrl} className="export-btn" download>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </a>
        </div>

        <form className="filter-grid" action="/admin/leads">
          <input className="text-input" type="text" name="q" defaultValue={searchParams.q ?? ""} placeholder="Search name or phone" />
          <select className="text-input" name="status" defaultValue={searchParams.status ?? ""}>
            <option value="">All statuses</option>
            <option value="started">started</option>
            <option value="intake_completed">intake_completed</option>
            <option value="transfer_attempted">transfer_attempted</option>
            <option value="call_connected">call_connected</option>
            <option value="callback_pending">callback_pending</option>
            <option value="closed_contacted">closed_contacted</option>
          </select>
          <button className="primary-button" type="submit">Apply filters</button>
        </form>

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Matter type</th>
              <th>Status</th>
              <th>Location</th>
              <th>Phone</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown lead";
              const location = [lead.incident_city, lead.incident_state].filter(Boolean).join(", ") || "\u2014";
              return (
                <tr key={lead.id}>
                  <td><Link href={`/admin/leads/${lead.id}`}>{name}</Link></td>
                  <td>{lead.matter_type ?? "\u2014"}</td>
                  <td><span className="status-chip">{lead.status}</span></td>
                  <td>{location}</td>
                  <td>{lead.phone_e164 ?? "\u2014"}</td>
                  <td>{new Date(lead.created_at).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
