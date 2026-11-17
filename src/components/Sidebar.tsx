"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye } from "lucide-react";
import DynamicIcon from "@/components/DynamicIcon";
import { NAV_ITEMS } from "@/lib/appearance";
import { useAppearance } from "@/lib/appearanceContext";

type Props = { onNavigate?: () => void };

export default function Sidebar({ onNavigate }: Props) {
  const pathname = usePathname();
  const { appName, nav } = useAppearance();

  return (
    <aside className="flex h-full w-64 max-w-[85vw] shrink-0 flex-col overflow-y-auto bg-ink text-surface md:w-60">
      <div className="px-6 py-7">
        <p className="font-display text-[1.05rem] font-bold tracking-tight text-surface">
          {appName}
        </p>
        <p className="mt-1 text-xs text-surface/55">Admin dashboard</p>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ key, href }) => {
            const { label, icon } = nav[key];
            const active = pathname?.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors md:py-2.5 ${
                    active
                      ? "pennant bg-white/10 font-medium text-surface"
                      : "text-surface/65 hover:bg-white/5 hover:text-surface"
                  }`}
                >
                  <DynamicIcon name={icon} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Staff view link */}
      <div className="px-3 pb-3">
        <Link
          href="/staff/products"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-md border border-white/15 px-3 py-2.5 text-sm text-surface/60 transition-colors hover:bg-white/5 hover:text-surface"
        >
          <Eye size={15} />
          Open staff view
        </Link>
      </div>

      <div className="px-6 py-4 text-xs text-surface/35">
        Stored in local database.
      </div>
    </aside>
  );
}
