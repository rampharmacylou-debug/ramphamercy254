// Plain rules for staff accounts (no database, no cookies), so they can be tested and shared.

export const STAFF_SESSION_HOUR_OPTIONS = [1, 4, 8, 12, 24, 72, 168] as const;
export const DEFAULT_STAFF_SESSION_HOURS = 12;

export function clampSessionHours(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return DEFAULT_STAFF_SESSION_HOURS;
  return Math.min(168, Math.max(1, n));
}

// ── Usernames and passwords ──────────────────────────────────────────────────

export const MIN_STAFF_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export function normalizeUsername(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

export function validUsername(u: string) {
  return /^[a-z0-9._-]{3,32}$/.test(u);
}

export function passwordProblem(p: unknown): string | null {
  if (typeof p !== "string" || p.length < MIN_STAFF_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_STAFF_PASSWORD_LENGTH} characters.`;
  }
  if (p.length > MAX_PASSWORD_LENGTH) return `Password can be at most ${MAX_PASSWORD_LENGTH} characters.`;
  return null;
}

