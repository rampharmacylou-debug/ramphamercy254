import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { promisify } from "util";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// Admin authentication
//
//  • Password   – stored as a scrypt hash in the AdminAuth table. Until an admin
//                 changes it in Settings, the ADMIN_PASSWORD value in .env is used.
//  • Session    – signed cookie (see lib/auth.ts), 12 h, set after a correct password.
//  • Trusted PC – a browser that an admin marked as trusted in Settings carries a
//                 long-lived random token cookie. Only its SHA-256 hash is stored,
//                 so the admin can revoke it at any time and it skips the password.
// ─────────────────────────────────────────────────────────────────────────────

const scrypt = promisify(crypto.scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

export const DEVICE_COOKIE = "manifest_device";
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export const MIN_PASSWORD_LENGTH = 8;

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

function safeEqual(a: string, b: string) {
  // Compare fixed-length digests so length differences don't leak timing.
  return crypto.timingSafeEqual(
    crypto.createHash("sha256").update(a).digest(),
    crypto.createHash("sha256").update(b).digest(),
  );
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPasswordHash(password: string, stored: string) {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export type PasswordCheck =
  | { ok: true }
  | { ok: false; reason: "not-configured" | "wrong" };

export async function checkAdminPassword(password: string): Promise<PasswordCheck> {
  const row = await prisma.adminAuth.findUnique({ where: { id: "admin" } });
  if (row) {
    return (await verifyPasswordHash(password, row.passwordHash))
      ? { ok: true }
      : { ok: false, reason: "wrong" };
  }
  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envPassword) return { ok: false, reason: "not-configured" };
  return safeEqual(password, envPassword) ? { ok: true } : { ok: false, reason: "wrong" };
}

export async function setAdminPassword(newPassword: string) {
  const passwordHash = await hashPassword(newPassword);
  await prisma.adminAuth.upsert({
    where: { id: "admin" },
    create: { id: "admin", passwordHash },
    update: { passwordHash },
  });
}

// ── Who is making this request? ──────────────────────────────────────────────

export type AdminAccess = {
  isAdmin: boolean;
  via: "password" | "trusted-device" | null;
  /** Set whenever this browser carries a valid trusted-device cookie. */
  deviceId: string | null;
};

const HOUR = 60 * 60 * 1000;

async function findTrustedDevice(token: string | undefined) {
  if (!token) return null;
  try {
    const row = await prisma.trustedDevice.findUnique({ where: { tokenHash: sha256(token) } });
    if (row && (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > HOUR)) {
      // Fire-and-forget; not worth failing a request over.
      prisma.trustedDevice
        .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {});
    }
    return row;
  } catch {
    // Table missing (migration not applied yet) → treat as "not trusted".
    return null;
  }
}

export async function getAdminAccess(): Promise<AdminAccess> {
  const store = await cookies();

  const device = await findTrustedDevice(store.get(DEVICE_COOKIE)?.value);

  const sessionToken = store.get(SESSION_COOKIE)?.value;
  if (sessionToken) {
    const session = await verifySessionToken(sessionToken);
    if (session?.role === "admin") {
      return { isAdmin: true, via: "password", deviceId: device?.id ?? null };
    }
  }

  if (device) return { isAdmin: true, via: "trusted-device", deviceId: device.id };
  return { isAdmin: false, via: null, deviceId: null };
}

/** For API route handlers: returns a 401 response to send back, or null if allowed. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const access = await getAdminAccess();
  if (access.isAdmin) return null;
  return NextResponse.json({ error: "Admin login required." }, { status: 401 });
}

// ── Helpers shared by the auth routes ────────────────────────────────────────

export function isHttps(req: NextRequest) {
  return (
    req.nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https"
  );
}

export function newDeviceToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: sha256(token) };
}

// Simple in-memory brute-force limiter: 5 wrong passwords → 10 minute lockout
// per client address. (Resets when the server restarts — fine for a single PC.)
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; lockedUntil: number }>();

export function clientKey(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

export function throttleStatus(key: string) {
  const a = attempts.get(key);
  if (a && a.lockedUntil > Date.now()) {
    return { locked: true, retryAfterSec: Math.ceil((a.lockedUntil - Date.now()) / 1000) };
  }
  return { locked: false, retryAfterSec: 0 };
}

export function recordFailedLogin(key: string, max: number = MAX_ATTEMPTS) {
  const a = attempts.get(key);
  const expired = a && a.lockedUntil !== 0 && a.lockedUntil <= Date.now();
  const count = (expired || !a ? 0 : a.count) + 1;
  attempts.set(key, {
    count,
    lockedUntil: count >= max ? Date.now() + LOCKOUT_MS : 0,
  });
}

export function clearFailedLogins(key: string) {
  attempts.delete(key);
}
