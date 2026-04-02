import Link from "next/link";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/leads", label: "Leads", icon: "👤" },
  { href: "/admin/clients", label: "Clients", icon: "🏢" },
  { href: "/admin/analytics", label: "Analytics", icon: "📈" },
  { href: "/admin/flow-editor", label: "Flow Editor", icon: "🔀" },
  { href: "/admin/routing", label: "Routing", icon: "📞" },
  { href: "/admin/branding", label: "Branding", icon: "🎨" },
  { href: "/admin/install", label: "Install", icon: "📋" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <Link href="/admin">IntakeLLG</Link>
        </div>
        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="admin-nav-item">
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-nav-footer">
          <Link href="/widget-demo" className="admin-nav-item" target="_blank">
            <span className="admin-nav-icon">🔍</span>
            Widget Preview
          </Link>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
