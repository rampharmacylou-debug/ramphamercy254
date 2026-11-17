"use client";

import Link from "next/link";
import { useState } from "react";
import { ShieldCheck, Eye, LogOut, MonitorCheck } from "lucide-react";
import { useRole } from "@/lib/roleContext";

export default function RoleSwitcher() {
  const { via } = useRole();
  const [leaving, setLeaving] = useState(false);

  async function handleLogout() {
    setLeaving(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/login");
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg border border-hairline bg-canvas p-1">
        <span className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-surface shadow-sm">
          <ShieldCheck size={13} />
          <span className="hidden sm:inline">Admin</span>
        </span>
        <Link
          href="/staff/products"
          aria-label="Open the staff view"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
        >
          <Eye size={13} />
          <span className="hidden sm:inline">Staff</span>
        </Link>
      </div>

      {via === "password" && (
        <button
          onClick={handleLogout}
          disabled={leaving}
          aria-label="Log out"
          className="flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-muted hover:bg-canvas hover:text-ink disabled:opacity-60"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">{leaving ? "Signing out…" : "Log out"}</span>
        </button>
      )}
      {via === "trusted-device" && (
        <span
          title="This PC is a trusted machine, so it skips the admin password. Manage it in Settings."
          className="flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-xs text-muted"
        >
          <MonitorCheck size={13} />
          <span className="hidden sm:inline">Trusted PC</span>
        </span>
      )}
    </div>
  );
}
