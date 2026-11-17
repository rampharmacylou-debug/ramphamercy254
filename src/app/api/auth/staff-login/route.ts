import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STAFF_COOKIE, createStaffToken } from "@/lib/auth";
import {
  clearFailedLogins,
  clientKey,
  isHttps,
  recordFailedLogin,
  throttleStatus,
  verifyPasswordHash,
} from "@/lib/adminAuth";
import { dummyPasswordHash, getStaffAccessSettings, normalizeUsername } from "@/lib/staffAuth";

const MAX_WRONG = 5; // wrong passwords before the account pauses
const LOCK_MINUTES = 10;

const tooMany = (minutes: number) =>
  NextResponse.json(
    { error: `Too many wrong attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.` },
    { status: 429 },
  );

export async function POST(req: NextRequest) {
  const ip = clientKey(req);
  const body = await req.json().catch(() => ({}));
  const username = normalizeUsername(body.username);
  const password = typeof body.password === "string" ? body.password : "";
  if (!username || !password) {
    return NextResponse.json({ error: "Enter your username and password." }, { status: 400 });
  }

  // Slow down guessing: per username + address, and per address overall (a shop shares one address, so the
  // overall limit is generous).
  const userKey = `staff:${username}:${ip}`;
  const ipKey = `staff-ip:${ip}`;
  for (const key of [userKey, ipKey]) {
    const t = throttleStatus(key);
    if (t.locked) return tooMany(Math.ceil(t.retryAfterSec / 60));
  }

  let user;
  try {
    user = await prisma.user.findUnique({ where: { username } });
  } catch {
    return NextResponse.json(
      { error: "Staff sign-in isn't ready yet. Ask the admin to run the database update (npm run db:migrate)." },
      { status: 503 },
    );
  }

  const now = new Date();
  if (user?.lockedUntil && user.lockedUntil > now) {
    return tooMany(Math.max(1, Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000)));
  }

  // Always do the same amount of work, so a wrong username can't be told apart from a wrong password.
  const canSignIn = Boolean(user && user.role === "staff" && user.active);
  const valid = await verifyPasswordHash(password, canSignIn ? user!.passwordHash : await dummyPasswordHash());

  if (!user || !canSignIn || !valid) {
    recordFailedLogin(userKey);
    recordFailedLogin(ipKey, 30);
    if (user && canSignIn) {
      const failed = user.failedLogins + 1;
      await prisma.user
        .update({
          where: { id: user.id },
          data:
            failed >= MAX_WRONG
              ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000) }
              : { failedLogins: failed },
        })
        .catch(() => {});
    }
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }

  clearFailedLogins(userKey);
  await prisma.user
    .update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: now } })
    .catch(() => {});

  const { sessionHours } = await getStaffAccessSettings();
  const ttl = sessionHours * 60 * 60;
  const token = await createStaffToken(user.id, user.tokenVersion, ttl);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(STAFF_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(req),
    path: "/",
    maxAge: ttl,
  });
  return res;
}
