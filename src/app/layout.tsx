import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IntakeLLG Widget App",
  description: "Initialized Next.js starter for IntakeLLG widget + admin + APIs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
