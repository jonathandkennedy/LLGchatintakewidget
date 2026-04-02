"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/intakeapp/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button className="admin-nav-item admin-logout-btn" onClick={handleLogout}>
      <span className="admin-nav-icon">X</span>
      Sign out
    </button>
  );
}
