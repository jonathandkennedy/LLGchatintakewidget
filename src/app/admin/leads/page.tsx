import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  q?: string;
  scoreTier?: string;
  matterType?: string;
  dateFrom?: string;
  dateTo?: string;
  assigned?: string;
  sort?: string;
};

async function getLeads(searchParams: SearchParams) {
  let builder = supabaseAdmin
    .from("leads")
    .select("id, created_at, status, matter_type, first_name, last_name, phone_e164, incident_state, incident_city, lead_score, lead_score_tier, is_duplicate, assigned_to_name")
    .limit(200);

  // Sort
  const sortField = searchParams.sort === "score" ? "lead_score" : "created_at";
  const sortAsc = searchParams.sort === "score" ? false : false;
  builder = builder.order(sortField, { ascending: sortAsc });

  if (searchParams.status) builder = builder.eq("status", searchParams.status);
  if (searchParams.q) builder = builder.or(`first_name.ilike.%${searchParams.q}%,last_name.ilike.%${searchParams.q}%,phone_e164.ilike.%${searchParams.q}%`);
  if (searchParams.scoreTier) builder = builder.eq("lead_score_tier", searchParams.scoreTier);
  if (searchParams.matterType) builder = builder.eq("matter_type", searchParams.matterType);
  if (searchParams.dateFrom) builder = builder.gte("created_at", searchParams.dateFrom);
  if (searchParams.dateTo) builder = builder.lte("created_at", searchParams.dateTo + "T23:59:59");
  if (searchParams.assigned === "unassigned") builder = builder.is("assigned_to", null);
  else if (searchParams.assigned) builder = builder.eq("assigned_to_name", searchParams.assigned);

  const { data } = await builder;
  return data ?? [];
}

export default async function AdminLeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const leads = await getLeads(searchParams);

  const exportParams = new URLSearchParams();
  if (searchParams.status) exportParams.set("status", searchParams.status);
  if (searchParams.q) exportParams.set("q", searchParams.q);
  const exportUrl = `/api/admin/leads/export${exportParams.toString() ? "?" + exportParams.toString() : ""}`;

  // Get unique assigned names for filter
  const assignedNames = [...new Set(leads.map((l) => l.assigned_to_name).filter(Boolean))];

  return (
    <main className="page-shell">
      <section className="panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="eyebrow">Admin inbox</div>
            <h1>Leads ({leads.length})</h1>
          </div>
          <a href={exportUrl} className="export-btn" download>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </a>
        </div>

        {/* Advanced Filters */}
        <form action="/admin/leads" className="advanced-filters">
          <div className="filter-row-wrap">
            <input className="text-input filter-input" type="text" name="q" defaultValue={searchParams.q ?? ""} placeholder="Search name or phone" />
            <select className="text-input filter-input" name="status" defaultValue={searchParams.status ?? ""}>
              <option value="">All statuses</option>
              <option value="started">started</option>
              <option value="intake_completed">intake_completed</option>
              <option value="transfer_attempted">transfer_attempted</option>
              <option value="call_connected">call_connected</option>
              <option value="callback_pending">callback_pending</option>
              <option value="closed_contacted">closed_contacted</option>
              <option value="closed_uncontacted">closed_uncontacted</option>
            </select>
            <select className="text-input filter-input" name="scoreTier" defaultValue={searchParams.scoreTier ?? ""}>
              <option value="">All scores</option>
              <option value="hot">Hot (90+)</option>
              <option value="warm">Warm (70-89)</option>
              <option value="medium">Medium (50-69)</option>
              <option value="cool">Cool (25-49)</option>
              <option value="cold">Cold (0-24)</option>
            </select>
            <select className="text-input filter-input" name="matterType" defaultValue={searchParams.matterType ?? ""}>
              <option value="">All matters</option>
              <option value="car_accident">Car Accident</option>
              <option value="truck_accident">Truck Accident</option>
              <option value="motorcycle_accident">Motorcycle Accident</option>
              <option value="slip_fall">Slip &amp; Fall</option>
              <option value="wrongful_death">Wrongful Death</option>
              <option value="other_injury">Other</option>
            </select>
          </div>
          <div className="filter-row-wrap">
            <label className="filter-date-label">
              From
              <input className="text-input filter-input" type="date" name="dateFrom" defaultValue={searchParams.dateFrom ?? ""} />
            </label>
            <label className="filter-date-label">
              To
              <input className="text-input filter-input" type="date" name="dateTo" defaultValue={searchParams.dateTo ?? ""} />
            </label>
            <select className="text-input filter-input" name="assigned" defaultValue={searchParams.assigned ?? ""}>
              <option value="">All assignments</option>
              <option value="unassigned">Unassigned</option>
              {assignedNames.map((n) => <option key={n} value={n!}>{n}</option>)}
            </select>
            <select className="text-input filter-input" name="sort" defaultValue={searchParams.sort ?? ""}>
              <option value="">Newest first</option>
              <option value="score">Highest score</option>
            </select>
            <button className="primary-button" type="submit" style={{ width: "auto", flexShrink: 0 }}>Filter</button>
          </div>
        </form>

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Score</th>
              <th>Matter</th>
              <th>Status</th>
              <th>Assigned</th>
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
                  <td>
                    <Link href={`/admin/leads/${lead.id}`}>{name}</Link>
                    {lead.is_duplicate && <span className="dup-badge" title="Possible duplicate">DUP</span>}
                  </td>
                  <td>{lead.lead_score != null ? <span className={`score-badge score-${lead.lead_score_tier ?? "cold"}`}>{lead.lead_score}</span> : "\u2014"}</td>
                  <td>{lead.matter_type ?? "\u2014"}</td>
                  <td><span className="status-chip">{lead.status}</span></td>
                  <td>{lead.assigned_to_name ?? <span className="muted text-sm">-</span>}</td>
                  <td>{location}</td>
                  <td>{lead.phone_e164 ?? "\u2014"}</td>
                  <td>{new Date(lead.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {leads.length === 0 && (
              <tr><td colSpan={8} className="muted" style={{ textAlign: "center", padding: 32 }}>No leads match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
