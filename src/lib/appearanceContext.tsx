"use client";

import { createContext, useContext } from "react";
import { Appearance, DEFAULT_APPEARANCE, StatCardId } from "@/lib/appearance";

const AppearanceContext = createContext<Appearance>(DEFAULT_APPEARANCE);

export function AppearanceProvider({ value, children }: { value: Appearance; children: React.ReactNode }) {
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

/** The app name and which stat cards are switched on, as set by the admin. */
export function useAppearance() {
  const a = useContext(AppearanceContext);
  return {
    appName: a.appName,
    nav: a.nav,
    isCardVisible: (id: StatCardId) => !a.hiddenCards.includes(id),
  };
}
