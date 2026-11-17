"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import RoleSwitcher from "@/components/RoleSwitcher";
import GlobalSearch from "@/components/GlobalSearch";
import { InstallAppButton } from "@/components/InstallApp";
import { SEARCH_SECTIONS } from "@/lib/searchRules";
import { useAppearance } from "@/lib/appearanceContext";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { appName, nav } = useAppearance();

  // Names and icons follow what the admin chose in Settings > Appearance.
  const sections = SEARCH_SECTIONS.map((key) => ({ key, label: nav[key].label, icon: nav[key].icon, href: `/${key}` }));

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <div className="relative">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-7 rounded-md p-1.5 text-surface/70 hover:bg-white/10 hover:text-surface"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 border-b border-hairline bg-surface px-3 py-2 sm:px-4 sm:py-2.5">
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="flex size-10 items-center justify-center rounded-md text-ink hover:bg-ink/5"
            >
              <Menu size={20} />
            </button>
            <p className="hidden font-display text-base font-bold tracking-tight text-ink sm:block">
              {appName}
            </p>
          </div>
          <GlobalSearch sections={sections} clientPages phoneOverlay className="sm:max-w-md sm:flex-1" />
          <div className="ml-auto flex items-center gap-2">
            <InstallAppButton compact />
            <RoleSwitcher />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto max-w-4xl px-3 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
