import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STAFF_COOKIE, verifyStaffToken } from "@/lib/auth";
import { AdminAccess, getAdminAccess, hashPassword } from "@/lib/adminAuth";
import { DEFAULT_STAFF_SESSION_HOURS, clampSessionHours } from "@/lib/staffRules";

export * from "@/lib/staffRules";

// ─────────────────────────────────────────────────────────────────────────────
// Staff authentication
//
//  • The admin creates staff accounts (Settings > Staff sign-in): a username + password each.
//  • Staff sign in on /login. They get a signed cookie that lasts as long as the admin chose.
//  • EVERY staff page and data request is checked on the server against the database, so an account that
//    is disabled, deleted, or "signed out everywhere" stops working immediately.
//  • The admin can switch sign-in off (not recommended): then the staff view is open to anyone with the link.
//  • If the sign-in tables are missing (database update not run yet), we stay LOCKED, never open.
// ─────────────────────────────────────────────────────────────────────────────

export type StaffAccessSettings = { requireLogin: boolean; sessionHours: number };

const LOCKED_DEFAULTS: StaffAccessSettings = { requireLogin: true, sessionHours: DEFAULT_STAFF_SESSION_HOURS };

export async function getStaffAccessSettings(): Promise<StaffAccessSettings> {
  try {
    const row = await prisma.staffAccess.findUnique({ where: { id: "staff" } });
    if (!row) return LOCKED_DEFAULTS;
    return { requireLogin: row.requireLogin, sessionHours: clampSessionHours(row.sessionHours) };
  } catch {
    return LOCKED_DEFAULTS;
  }
}

// Checked when the username doesn't exist, so a wrong username takes as long as a wrong password.
let dummy: Promise<string> | null = null;
export function dummyPasswordHash() {
  dummy ??= hashPassword("not-a-real-password-just-for-timing");
  return dummy;
}

// ── Who is making this request? ──────────────────────────────────────────────

export type Viewer =
  | { kind: "admin"; via: AdminAccess["via"] }
  | { kind: "staff"; userId: string; username: string; name: string | null }
  | { kind: "open" } // staff sign-in switched off by the admin: anyone may read the staff view
  | { kind: "none" }; // not signed in

export type SignedInViewer = Exclude<Viewer, { kind: "none" }>;

export async function getViewer(adminAccess?: AdminAccess): Promise<Viewer> {
  const access = adminAccess ?? (await getAdminAccess());
  if (access.isAdmin) return { kind: "admin", via: access.via };

  const store = await cookies();
  const token = store.get(STAFF_COOKIE)?.value;
  if (token) {
    const payload = await verifyStaffToken(token);
    if (payload) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.uid },
          select: { id: true, username: true, name: true, role: true, active: true, tokenVersion: true },
        });
        if (user && user.role === "staff" && user.active && user.tokenVersion === payload.tv) {
          return { kind: "staff", userId: user.id, username: user.username, name: user.name };
        }
      } catch {
        // Database problem: fall through (treated as not signed in).
      }
    }
  }

  const settings = await getStaffAccessSettings();
  return settings.requireLogin ? { kind: "none" } : { kind: "open" };
}

/** For API route handlers: the signed-in viewer, or a 401 response to send straight back. */
export async function requireViewer(): Promise<SignedInViewer | NextResponse> {
  const viewer = await getViewer();
  if (viewer.kind === "none") {
    return NextResponse.json({ error: "Please sign in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return viewer;
}
