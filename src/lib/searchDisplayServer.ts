import { unstable_cache } from "next/cache";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { SearchDisplay, defaultSearchDisplay, resolveSearchDisplay } from "@/lib/searchRules";

export const SEARCH_DISPLAY_TAG = "search-display";

const load = unstable_cache(
  async (): Promise<SearchDisplay> => {
    const row = await prisma.searchDisplayConfig.findUnique({ where: { id: "search" } });
    return row ? resolveSearchDisplay(row.config) : defaultSearchDisplay();
  },
  ["search-display"],
  { tags: [SEARCH_DISPLAY_TAG], revalidate: 300 },
);

export const getSearchDisplay = cache(async (): Promise<SearchDisplay> => {
  try {
    return await load();
  } catch {
    // Table not created yet (migration not applied) -> the standard layout.
    return defaultSearchDisplay();
  }
});
