import { WidgetDemo } from "@/components/widget/WidgetDemo";

export default function WidgetDemoPage() {
  return (
    <main className="page-shell">
      <div className="hero">
        <section className="panel">
          <div className="eyebrow">Widget prototype</div>
          <h1>Guided intake widget demo</h1>
          <p className="muted">This is a local visual demo of the default screen flow. It does not require Supabase or Telnyx to render.</p>
        </section>
        <section>
          <WidgetDemo />
        </section>
      </div>
    </main>
  );
}
