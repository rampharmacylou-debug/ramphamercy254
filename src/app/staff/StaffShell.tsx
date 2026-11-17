"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Eye, LogOut, User } from "lucide-react";
import DynamicIcon from "@/components/DynamicIcon";
import GlobalSearch from "@/components/GlobalSearch";
import { InstallAppButton } from "@/components/InstallApp";
import { StaffConfig, visibleTabs } from "@/lib/staffTabs";
import { StaffConfigProvider } from "@/lib/staffConfigContext";
import { useAppearance } from "@/lib/appearanceContext";

export default function StaffShell({
  config,
  isAdmin,
  userName,
  children,
}: {
  config: StaffConfig;
  isAdmin: boolean;
  /** Shown when a staff member is signed in (null for admins and when sign-in is switched off). */
  userName: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { appName } = useAppearance();
  const tabs = visibleTabs(config);
  const [leaving, setLeaving] = useState(false);

  async function logout() {
    setLeaving(true);
    await fetch("/api/auth/staff-logout", { method: "POST" }).catch(() => {});
    window.location.assign("/login?as=staff");
  }

  return (
    <StaffConfigProvider config={config}>
      <div className="min-h-dvh bg-canvas">
        <div className="border-b border-hairline bg-ink text-surface">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4">
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold tracking-tight">{appName}</p>
              <p className="flex items-center gap-1 text-xs text-surface/50">
                <Eye size={11} /> Staff view — read only
              </p>
            </div>

            {/* Tabs sit in the header on tablets and computers; on phones they move to the bottom bar. */}
            <nav aria-label="Staff sections" className="hidden flex-wrap justify-end gap-1 sm:flex">
              {tabs.map(({ key, href, label, icon }) => {
                const active = pathname?.startsWith(href);
                return (
                  <Link
                    key={key}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors ${
                      active ? "bg-white/10 font-medium text-surface" : "text-surface/60 hover:bg-white/5 hover:text-surface"
                    }`}
                  >
                    <DynamicIcon name={icon} size={15} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <InstallAppButton variant="dark" compact />
              {userName && (
                <span className="flex max-w-[9rem] items-center gap-1.5 text-xs text-surface/70" title={userName}>
                  <User size={13} className="shrink-0" />
                  <span className="truncate">{userName}</span>
                </span>
              )}
              {userName && (
                <button
                  onClick={logout}
                  disabled={leaving}
                  aria-label="Log out"
                  className="flex h-9 items-center gap-1.5 rounded-md border border-white/20 px-3 text-xs text-surface/70 hover:bg-white/5 hover:text-surface disabled:opacity-60"
                >
                  <LogOut size={13} />
                  <span className="hidden sm:inline">{leaving ? "Signing out…" : "Log out"}</span>
                </button>
              )}
              {isAdmin && (
                <Link
                  href="/products"
                  className="flex h-9 items-center rounded-md border border-white/20 px-3 text-xs text-surface/70 hover:bg-white/5 hover:text-surface"
                >
                  Admin →
                </Link>
              )}
            </div>
          </div>

          {tabs.length > 0 && (
            <div className="mx-auto max-w-5xl px-4 pb-3 sm:px-8 sm:pb-4">
              <GlobalSearch sections={tabs} className="max-w-xl" />
            </div>
          )}
        </div>

        <main className="mx-auto max-w-5xl px-3 py-5 pb-24 sm:px-8 sm:py-10 sm:pb-10">{children}</main>

        {/* Phone navigation: big icon + name buttons along the bottom edge */}
        <nav
          aria-label="Staff sections"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
        >
          <ul className="grid" style={{ gridTemplateColumns: `repeat(${Math.max(tabs.length, 1)}, minmax(0, 1fr))` }}>
            {tabs.map(({ key, href, label, icon }) => {
              const active = pathname?.startsWith(href);
              return (
                <li key={key}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium ${
                      active ? "text-accent" : "text-muted"
                    }`}
                  >
                    <DynamicIcon name={icon} size={20} />
                    <span className="max-w-full truncate">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </StaffConfigProvider>
  );
}
