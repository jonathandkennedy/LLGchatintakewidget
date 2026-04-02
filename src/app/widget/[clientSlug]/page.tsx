import { WidgetRuntime } from "@/components/widget/runtime/WidgetRuntime";

export default function WidgetHostPage({ params }: { params: { clientSlug: string } }) {
  return (
    <main style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
      padding: 0,
      background: "transparent",
    }}>
      <WidgetRuntime clientSlug={params.clientSlug} />
    </main>
  );
}
