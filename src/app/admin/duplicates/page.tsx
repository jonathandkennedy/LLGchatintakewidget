import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function getDuplicates() {
  const { data } = await supabaseAdmin
    .from("leads")
    .select("id, first_name, last_name, phone_e164, email, matter_type, status, lead_score, lead_score_tier, created_at, is_duplicate, duplicate_of, duplicate_match_type")
    .eq("is_duplicate", true)
    .not("status", "eq", "merged")
    .order("created_at", { ascending: false })
    .limit(100);

  return data ?? [];
}

async function getLeadById(id: string) {
  const { data } = await supabaseAdmin
    .from("leads")
    .select("id, first_name, last_name, phone_e164, email, matter_type, status, lead_score_tier, created_at")
    .eq("id", id)
    .single();
  return data;
}

export default async function DuplicatesPage() {
  const duplicates = await getDuplicates();

  // Load the original leads for comparison
  const originals = new Map();
  for (const dup of duplicates) {
    if (dup.duplicate_of && !originals.has(dup.duplicate_of)) {
      const orig = await getLeadById(dup.duplicate_of);
      if (orig) originals.set(dup.duplicate_of, orig);
    }
  }

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Duplicate Review</h1>
        <p className="muted">Review flagged duplicates and merge or dismiss them.</p>
      </div>

      {duplicates.length === 0 ? (
        <section className="admin-card" style={{ textAlign: "center", padding: 40 }}>
          <h2 style={{ color: "var(--success)" }}>No Duplicates</h2>
          <p className="muted">All leads are unique. Duplicates are auto-detected when new leads are created.</p>
        </section>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {duplicates.map((dup) => {
            const name = [dup.first_name, dup.last_name].filter(Boolean).join(" ") || "Unknown";
            const original = originals.get(dup.duplicate_of);
            const origName = original ? [original.first_name, original.last_name].filter(Boolean).join(" ") || "Unknown" : "Unknown";

            return (
              <section key={dup.id} className="admin-card" style={{ borderLeft: "3px solid var(--warning)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span className="dup-badge">DUP</span>
                      <span className={`score-badge score-${dup.duplicate_match_type === "phone" ? "hot" : dup.duplicate_match_type === "email" ? "warm" : "medium"}`} style={{ fontSize: 10 }}>
                        Matched by {dup.duplicate_match_type}
                      </span>
                    </div>
                    <h3 style={{ margin: "4px 0" }}>
                      <Link href={`/admin/leads/${dup.id}`}>{name}</Link>
                    </h3>
                    <div className="muted text-sm">
                      {dup.phone_e164 ?? "No phone"} &middot; {dup.email ?? "No email"} &middot; {dup.matter_type ?? "Unknown"} &middot; {new Date(dup.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {dup.lead_score != null && <span className={`score-badge score-${dup.lead_score_tier ?? "cold"}`}>{dup.lead_score}</span>}
                  </div>
                </div>

                {original && (
                  <div style={{ marginTop: 12, padding: 12, background: "var(--border-light)", borderRadius: 8 }}>
                    <div className="muted text-sm" style={{ fontWeight: 600, marginBottom: 4 }}>Original Lead:</div>
                    <div style={{ fontSize: 14 }}>
                      <Link href={`/admin/leads/${original.id}`}><strong>{origName}</strong></Link>
                      {" "}&middot; {original.phone_e164 ?? "No phone"} &middot; {original.email ?? "No email"} &middot; {new Date(original.created_at).toLocaleDateString()}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <Link href={`/admin/leads/${dup.id}`} className="primary-button" style={{ width: "auto", padding: "8px 16px", fontSize: 13, textDecoration: "none" }}>Review &amp; Merge</Link>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
