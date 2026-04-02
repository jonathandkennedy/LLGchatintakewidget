import { WidgetDemo } from "@/components/widget/WidgetDemo";

export default function WidgetDemoPage() {
  return (
    <main style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0,
      background: "#f0f2f5",
    }}>
      <WidgetDemo />
    </main>
  );
}
