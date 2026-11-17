import { unstable_cache } from "next/cache";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { DiaryConfig, defaultDiaryConfig, resolveDiaryConfig } from "@/lib/diaryConfig";

export const DIARY_CONFIG_TAG = "diary-config";

// Every page loads this, so it is kept for a few minutes (and refreshed right after the admin saves).
const load = unstable_cache(
  async (): Promise<DiaryConfig> => {
    const row = await prisma.diaryConfig.findUnique({ where: { id: "diary" } });
    return row ? resolveDiaryConfig(row.config) : defaultDiaryConfig();
  },
  ["diary-config"],
  { tags: [DIARY_CONFIG_TAG], revalidate: 300 },
);

export const getDiaryConfig = cache(async (): Promise<DiaryConfig> => {
  try {
    return await load();
  } catch {
    // Table not created yet (migration not applied) -> the original wording, nothing switched off.
    return defaultDiaryConfig();
  }
});
