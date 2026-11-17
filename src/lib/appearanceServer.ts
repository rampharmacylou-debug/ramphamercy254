import { unstable_cache } from "next/cache";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { Appearance, DEFAULT_APPEARANCE, resolveAppearance } from "@/lib/appearance";

export const APPEARANCE_TAG = "appearance";

// Every page asks for this, so it is kept for a few minutes (and refreshed right after the admin saves).
const load = unstable_cache(
  async (): Promise<Appearance> => {
    const row = await prisma.appearanceConfig.findUnique({ where: { id: "appearance" } });
    return row ? resolveAppearance(row.config) : DEFAULT_APPEARANCE;
  },
  ["appearance-config"],
  { tags: [APPEARANCE_TAG], revalidate: 300 },
);

export const getAppearance = cache(async (): Promise<Appearance> => {
  try {
    return await load();
  } catch {
    // Table not created yet (migration not applied) -> use the defaults instead of crashing.
    return DEFAULT_APPEARANCE;
  }
});
