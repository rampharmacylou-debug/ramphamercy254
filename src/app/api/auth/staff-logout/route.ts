import { NextResponse } from "next/server";
import { STAFF_COOKIE } from "@/lib/auth";

// Ends this browser's staff session. (To end someone's sessions on every device, the admin uses
// "Sign out everywhere" in Settings > Staff sign-in.)
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(STAFF_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
