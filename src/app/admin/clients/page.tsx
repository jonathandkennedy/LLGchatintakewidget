import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function getClients() {
  const { data } = await supabaseAdmin
    .from("clients")
    .select("id, name, slug, status, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default async function AdminClientsPage() {
  const clients = await getClients();

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Clients</h1>
        <Link href="/admin/clients/new" className="primary-button" style={{ width: "auto", display: "inline-flex" }}>+ New Client</Link>
      </div>

      <section className="admin-card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 32 }}>No clients yet. Create your first client to get started.</td></tr>
            )}
            {clients.map((client) => (
              <tr key={client.id}>
                <td><strong>{client.name}</strong></td>
                <td className="muted">{client.slug}</td>
                <td><span className={`status-chip ${client.status === "active" ? "success" : ""}`}>{client.status}</span></td>
                <td>{new Date(client.created_at).toLocaleDateString()}</td>
                <td><Link href={`/admin/clients/${client.id}`}>Edit →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
