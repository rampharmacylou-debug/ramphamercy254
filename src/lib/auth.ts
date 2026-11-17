import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "manifest_role";
const TTL = 60 * 60 * 24 * 30; // 30 days (legacy default)
export const ADMIN_SESSION_TTL = 60 * 60 * 12; // admin password login lasts 12 hours

export type Role = "admin" | "staff";
export type SessionPayload = { role: Role };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not set in .env");
  return new TextEncoder().encode(s);
}

export async function createSessionToken(role: Role, ttl: number = TTL) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role === "admin" || payload.role === "staff") {
      return { role: payload.role };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const SESSION_COOKIE_MAX_AGE = TTL;

// ── Staff sessions ───────────────────────────────────────────────────────────
// Staff get their own cookie, so signing in as staff can never replace (or be mistaken for) an admin session.
// The token carries the account id and its `tokenVersion`; the server checks both against the database on
// every request, so disabling an account or "signing out everywhere" takes effect immediately.
export const STAFF_COOKIE = "manifest_staff";

export type StaffTokenPayload = { uid: string; tv: number };

export async function createStaffToken(uid: string, tv: number, ttlSeconds: number) {
  return new SignJWT({ role: "staff", uid, tv })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret());
}

export async function verifyStaffToken(token: string): Promise<StaffTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role === "staff" && typeof payload.uid === "string" && typeof payload.tv === "number") {
      return { uid: payload.uid, tv: payload.tv };
    }
    return null;
  } catch {
    return null;
  }
}
