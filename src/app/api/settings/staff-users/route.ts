import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireAdmin } from "@/lib/adminAuth";
import { normalizeUsername, passwordProblem, validUsername } from "@/lib/staffAuth";

const NO_STORE = { "Cache-Control": "no-store" };

// List the staff accounts (never the passwords).
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const users = await prisma.user.findMany({ where: { role: "staff" }, orderBy: { createdAt: "asc" } });
    const now = Date.now();
    return NextResponse.json(
      {
        users: users.map((u) => ({
          id: u.id,
          username: u.username,
          name: u.name,
          active: u.active,
          locked: Boolean(u.lockedUntil && u.lockedUntil.getTime() > now),
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt,
        })),
      },
      { headers: NO_STORE },
    );
  } catch {
    return NextResponse.json(
      { error: "Run `npm run db:migrate` once, then restart the app." },
      { status: 500, headers: NO_STORE },
    );
  }
}

// Create a staff account.
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const username = normalizeUsername(body.username);
  const name = (typeof body.name === "string" ? body.name : "").trim().slice(0, 60) || null;

  if (!validUsername(username)) {
    return NextResponse.json(
      { error: "Username must be 3 to 32 characters: letters, numbers, dot, dash or underscore." },
      { status: 400 },
    );
  }
  const problem = passwordProblem(body.password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { username } }).catch(() => null);
  if (exists) return NextResponse.json({ error: "That username is already taken." }, { status: 409 });

  try {
    const user = await prisma.user.create({
      data: { username, name, role: "staff", passwordHash: await hashPassword(body.password) },
    });
    return NextResponse.json({ ok: true, id: user.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create the account." }, { status: 500 });
  }
}
