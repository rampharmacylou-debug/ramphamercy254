import { unstable_cache } from "next/cache";
import { cache } from "react";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SignedInViewer } from "@/lib/staffAuth";
import {
  StaffConfig,
  StaffTabKey,
  defaultStaffConfig,
  resolveStaffConfig,
  stripHiddenFields,
} from "@/lib/staffTabs";

export const STAFF_CONFIG_TAG = "staff-config";

// Read from the database at most once every few minutes (and again right after the admin saves the tabs).
// A database error is NOT cached: unstable_cache only keeps successful answers.
const loadConfig = unstable_cache(
  async () => {
    const row = await prisma.staffTabConfig.findUnique({ where: { id: "staff" } });
    return row ? resolveStaffConfig(row.config) : defaultStaffConfig();
  },
  ["staff-tab-config"],
  { tags: [STAFF_CONFIG_TAG], revalidate: 300 },
);

export const getStaffConfig = cache(async (): Promise<StaffConfig> => {
  try {
    return await loadConfig();
  } catch {
    // Table not created yet (migration not applied) → behave like before.
    return defaultStaffConfig();
  }
});

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * Admins get the full data. Staff only get the fields the admin chose to show,
 * and nothing at all for a tab the admin has hidden.
 * (The caller has already checked who is asking — see requireViewer in lib/staffAuth.ts.)
 */
export async function respondForRole<T extends Record<string, unknown>>(
  tab: StaffTabKey,
  key: string,
  rows: T[],
  viewer: SignedInViewer,
) {
  if (viewer.kind === "admin") return NextResponse.json({ [key]: rows }, { headers: NO_STORE });
  const config = await getStaffConfig();
  if (!config.tabs[tab].visible) return NextResponse.json({ [key]: [] }, { headers: NO_STORE });
  return NextResponse.json({ [key]: stripHiddenFields(tab, rows, config) }, { headers: NO_STORE });
}
