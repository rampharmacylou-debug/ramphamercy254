import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

// Ends the password session. A trusted-device cookie (if any) is untouched —
// remove the machine under Settings → Trusted machines to revoke that.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
