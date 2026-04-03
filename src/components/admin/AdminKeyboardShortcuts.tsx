"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Admin keyboard shortcuts.
 * g+d = dashboard, g+l = leads, g+k = kanban, g+a = analytics,
 * g+s = search, / = focus search
 */
export function AdminKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    let gPressed = false;
    let gTimer: ReturnType<typeof setTimeout>;

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "g") {
        gPressed = true;
        clearTimeout(gTimer);
        gTimer = setTimeout(() => { gPressed = false; }, 500);
        return;
      }

      if (gPressed) {
        gPressed = false;
        const routes: Record<string, string> = {
          d: "/admin",
          l: "/admin/leads",
          k: "/admin/kanban",
          a: "/admin/analytics",
          s: "/admin/search",
          p: "/admin/priority-queue",
          t: "/admin/team",
          b: "/admin/branding",
          w: "/admin/webhooks",
          f: "/admin/flow-editor",
          e: "/admin/errors",
          i: "/admin/install",
        };
        if (routes[e.key]) {
          e.preventDefault();
          router.push(routes[e.key]);
        }
        return;
      }

      // / = focus search
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        router.push("/admin/search");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(gTimer);
    };
  }, [router]);

  return null;
}
