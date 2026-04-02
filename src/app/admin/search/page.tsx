import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string };

async function search(query: string) {
  const q = `%${query}%`;

  const [{ data: leads }, { data: clients }] = await Promise.all([
    supabaseAdmin
      .from("leads")
      .select("id, first_name, last_name, phone_e164, email, matter_type, status, lead_score_tier")
      .or(`first_name.ilike.${q},last_name.ilike.${q},phone_e164.ilike.${q},email.ilike.${q},incident_summary.ilike.${q}`)
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("clients")
      .select("id, name, slug")
      .or(`name.ilike.${q},slug.ilike.${q}`)
      .limit(10),
  ]);

  return { leads: leads ?? [], clients: clients ?? [] };
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const query = searchParams.q?.trim() ?? "";
  const results = query.length >= 2 ? await search(query) : null;

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Search</h1>
      </div>

      <form action="" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="text-input" name="q" defaultValue={query} placeholder="Search leads, clients, phone numbers, emails..." autoFocus style={{ flex: 1, fontSize: 16, padding: "14px 18px" }} />
          <button className="primary-button" type="submit" style={{ width: "auto" }}>Search</button>
        </div>
      </form>

      {results && (
        <>
          {/* Leads */}
          <section className="admin-card" style={{ marginBottom: 20 }}>
            <h2>Leads ({results.leads.length})</h2>
            {results.leads.length === 0 ? (
              <p className="muted text-sm" style={{ marginTop: 8 }}>No leads match &ldquo;{query}&rdquo;</p>
            ) : (
              <table className="table" style={{ marginTop: 12 }}>
                <thead>
                  <tr><th>Name</th><th>Phone</th><th>Email</th><th>Matter</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {results.leads.map((lead) => {
                    const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown";
                    return (
                      <tr key={lead.id}>
                        <td>
                          <Link href={`/admin/leads/${lead.id}`}>{name}</Link>
                          {lead.lead_score_tier && <span className={`score-badge score-${lead.lead_score_tier}`} style={{ marginLeft: 6, fontSize: 10 }}>{lead.lead_score_tier}</span>}
                        </td>
                        <td>{lead.phone_e164 ?? "\u2014"}</td>
                        <td>{lead.email ?? "\u2014"}</td>
                        <td>{lead.matter_type?.replace(/_/g, " ") ?? "\u2014"}</td>
                        <td><span className="status-chip">{lead.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {/* Clients */}
          <section className="admin-card">
            <h2>Clients ({results.clients.length})</h2>
            {results.clients.length === 0 ? (
              <p className="muted text-sm" style={{ marginTop: 8 }}>No clients match &ldquo;{query}&rdquo;</p>
            ) : (
              <table className="table" style={{ marginTop: 12 }}>
                <thead><tr><th>Name</th><th>Slug</th><th></th></tr></thead>
                <tbody>
                  {results.clients.map((client) => (
                    <tr key={client.id}>
                      <td><strong>{client.name}</strong></td>
                      <td><code className="muted text-sm">{client.slug}</code></td>
                      <td><Link href={`/admin/clients/${client.id}`} className="admin-link">View &rarr;</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      {query && query.length < 2 && <p className="muted">Enter at least 2 characters to search.</p>}
    </div>
  );
}
