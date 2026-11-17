import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { resolveDiaryConfig } from "@/lib/diaryConfig";
import { DIARY_CONFIG_TAG, getDiaryConfig } from "@/lib/diaryConfigServer";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return NextResponse.json({ config: await getDiaryConfig() }, { headers: { "Cache-Control": "no-store" } });
}

// Saves the diary wording and switches. Whatever is sent is cleaned up first (see resolveDiaryConfig).
export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const config = resolveDiaryConfig(body);
  try {
    await prisma.diaryConfig.upsert({
      where: { id: "diary" },
      create: { id: "diary", config },
      update: { config },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not save. Run `npm run db:migrate` once, then restart the app." },
      { status: 500 },
    );
  }
  revalidateTag(DIARY_CONFIG_TAG);
  return NextResponse.json({ config });
}
