import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_TTL, SESSION_COOKIE, createSessionToken } from "@/lib/auth";
import {
  checkAdminPassword,
  clearFailedLogins,
  clientKey,
  isHttps,
  recordFailedLogin,
  throttleStatus,
} from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const key = clientKey(req);
  const throttle = throttleStatus(key);
  if (throttle.locked) {
    const mins = Math.ceil(throttle.retryAfterSec / 60);
    return NextResponse.json(
      { error: `Too many wrong attempts. Try again in about ${mins} minute${mins === 1 ? "" : "s"}.` },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ error: "Enter the admin password." }, { status: 400 });
  }

  const result = await checkAdminPassword(password);
  if (!result.ok && result.reason === "not-configured") {
    return NextResponse.json(
      { error: "No admin password is set. Add ADMIN_PASSWORD to the .env file and restart the app." },
      { status: 503 },
    );
  }
  if (!result.ok) {
    recordFailedLogin(key);
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  clearFailedLogins(key);
  const token = await createSessionToken("admin", ADMIN_SESSION_TTL);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(req),
    path: "/",
    maxAge: ADMIN_SESSION_TTL,
  });
  return res;
}
