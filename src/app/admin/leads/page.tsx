import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = { status?: string; q?: string; clientId?: string };

async function getLeads(searchParams: SearchParams) {
  let builder = supabaseAdmin
    .from("leads")
    .select("id, created_at, status, matter_type, first_name, last_name, phone_e164, email, incident_state, incident_city, client_id", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);

  if (searchParams.clientId) builder = builder.eq("client_id", searchParams.clientId);
  if (searchParams.status) builder = builder.eq("status", searchParams.status);
  if (searchParams.q) builder = builder.or(`first_name.ilike.%${searchParams.q}%,last_name.ilike.%${searchParams.q}%,phone_e164.ilike.%${searchParams.q}%,email.ilike.%${searchParams.q}%`);

  const { data, count } = await builder;
  return { items: data ?? [], total: count ?? 0 };
}

async function getClients() {
  const { data } = await supabaseAdmin.from("clients").select("id, name").order("name");
  return data ?? [];
}

export default async function AdminLeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ items: leads, total }, clients] = await Promise.all([
    getLeads(searchParams),
    getClients(),
  ]);

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Leads</h1>
        <span className="muted">{total} total</span>
      </div>

      <form className="filter-grid" action="">
        <input className="text-input" type="text" name="q" defaultValue={searchParams.q ?? ""} placeholder="Search name, phone, or email" />
        <select className="text-input" name="status" defaultValue={searchParams.status ?? ""}>
          <option value="">All statuses</option>
          <option value="opened">opened</option>
          <option value="started">started</option>
          <option value="in_progress">in_progress</option>
          <option value="intake_completed">intake_completed</option>
          <option value="transfer_attempted">transfer_attempted</option>
          <option value="call_connected">call_connected</option>
          <option value="callback_pending">callback_pending</option>
          <option value="closed_contacted">closed_contacted</option>
          <option value="closed_uncontacted">closed_uncontacted</option>
        </select>
        <button className="primary-button" type="submit">Filter</button>
      </form>

      {clients.length > 1 && (
        <form action="" style={{ marginBottom: 16 }}>
          <select className="text-input" name="clientId" defaultValue={searchParams.clientId ?? ""} style={{ maxWidth: 280 }} onChange="this.form.submit()">
            <option value="">All clients</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {searchParams.status && <input type="hidden" name="status" value={searchParams.status} />}
          {searchParams.q && <input type="hidden" name="q" value={searchParams.q} />}
        </form>
      )}

      <section className="admin-card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Matter</th>
              <th>Status</th>
              <th>Location</th>
              <th>Phone</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: 32 }}>No leads match your filters.</td></tr>
            )}
            {leads.map((lead) => {
              const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown lead";
              const location = [lead.incident_city, lead.incident_state].filter(Boolean).join(", ") || "—";
              return (
                <tr key={lead.id}>
                  <td><Link href={`/admin/leads/${lead.id}`}><strong>{name}</strong></Link></td>
                  <td>{lead.matter_type ?? "—"}</td>
                  <td><span className="status-chip">{lead.status}</span></td>
                  <td>{location}</td>
                  <td>{lead.phone_e164 ?? "—"}</td>
                  <td>{new Date(lead.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
