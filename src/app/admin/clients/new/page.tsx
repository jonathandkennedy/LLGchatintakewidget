import Link from "next/link";
import { createClientAction } from "../../actions";

export default function NewClientPage() {
  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>New Client</h1>
        <Link href="/admin/clients" className="admin-link">← Back to clients</Link>
      </div>
      <section className="admin-card" style={{ maxWidth: 560 }}>
        <form action={createClientAction} className="admin-form">
          <label className="admin-label">
            Firm / Client Name
            <input className="text-input" name="name" required placeholder="e.g. Smith & Associates" />
          </label>
          <p className="muted" style={{ fontSize: 13 }}>A URL slug will be auto-generated from the name. This creates the client record, default branding, and fallback settings.</p>
          <button className="primary-button" type="submit">Create Client</button>
        </form>
      </section>
    </div>
  );
}
