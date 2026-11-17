"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_DIARY_CONFIG, DiaryConfig } from "@/lib/diaryConfig";

const Ctx = createContext<DiaryConfig>(DEFAULT_DIARY_CONFIG);

// A normal component, like the other providers (AppearanceProvider, RoleProvider). The server layout
// can only render components from a "use client" file, not a context object such as `Ctx.Provider`.
export function DiaryConfigProvider({ value, children }: { value: DiaryConfig; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The diary wording and switches the admin chose in Settings > Diary. */
export function useDiaryConfig(): DiaryConfig {
  return useContext(Ctx);
}
