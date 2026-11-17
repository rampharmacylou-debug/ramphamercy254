import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { resolveAppearance } from "@/lib/appearance";
import { APPEARANCE_TAG, getAppearance } from "@/lib/appearanceServer";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return NextResponse.json({ appearance: await getAppearance() });
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  // resolveAppearance throws away anything unknown and fixes bad values.
  const appearance = resolveAppearance(body);
  try {
    await prisma.appearanceConfig.upsert({
      where: { id: "appearance" },
      create: { id: "appearance", config: appearance },
      update: { config: appearance },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not save. Run `npm run db:migrate` once, then restart the app." },
      { status: 500 },
    );
  }
  revalidateTag(APPEARANCE_TAG);
  return NextResponse.json({ appearance });
}
