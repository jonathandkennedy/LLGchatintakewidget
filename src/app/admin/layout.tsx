import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { isAdminAuthenticated } from "@/lib/auth/admin-auth";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { AdminKeyboardShortcuts } from "@/components/admin/AdminKeyboardShortcuts";
import { LogoutButton } from "@/components/admin/LogoutButton";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "D" },
  { href: "/admin/leads", label: "Leads", icon: "L" },
  { href: "/admin/kanban", label: "Kanban", icon: "K" },
  { href: "/admin/priority-queue", label: "Priority", icon: "!" },
  { href: "/admin/search", label: "Search", icon: "S" },
  { href: "/admin/clients", label: "Clients", icon: "C" },
  { href: "/admin/analytics", label: "Analytics", icon: "A" },
  { href: "/admin/flow-editor", label: "Flow Editor", icon: "F" },
  { href: "/admin/routing", label: "Routing", icon: "R" },
  { href: "/admin/team", label: "Team", icon: "P" },
  { href: "/admin/branding", label: "Branding", icon: "B" },
  { href: "/admin/webhooks", label: "Webhooks", icon: "W" },
  { href: "/admin/ab-testing", label: "A/B Tests", icon: "T" },
  { href: "/admin/audit-log", label: "Audit Log", icon: "H" },
  { href: "/admin/errors", label: "Errors", icon: "X" },
  { href: "/admin/api-docs", label: "API Docs", icon: "?" },
  { href: "/admin/onboarding", label: "Setup Wizard", icon: "+" },
  { href: "/admin/email-templates", label: "Emails", icon: "E" },
  { href: "/admin/install", label: "Install", icon: "I" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  if (!isAdminAuthenticated()) {
    redirect("/admin/login");
  }

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
            <span className="admin-nav-icon">W</span>
            Widget Preview
          </Link>
          <LogoutButton />
        </div>
      </aside>
      <main className="admin-main">
        <AdminKeyboardShortcuts />
        <div className="admin-topbar">
          <NotificationBell />
        </div>
        {children}
      </main>
    </div>
  );
}
