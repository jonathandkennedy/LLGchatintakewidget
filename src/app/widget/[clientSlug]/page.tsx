import { WidgetRuntime } from "@/components/widget/runtime/WidgetRuntime";

export default function WidgetHostPage({ params }: { params: { clientSlug: string } }) {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "end end", padding: 12 }}>
      <WidgetRuntime clientSlug={params.clientSlug} />
    </main>
  );
}
