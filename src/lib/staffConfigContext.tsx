"use client";

import { createContext, useContext } from "react";
import { StaffConfig, StaffTabKey, defaultStaffConfig } from "@/lib/staffTabs";

const StaffConfigContext = createContext<StaffConfig>(defaultStaffConfig());

export function StaffConfigProvider({
  config,
  children,
}: {
  config: StaffConfig;
  children: React.ReactNode;
}) {
  return <StaffConfigContext.Provider value={config}>{children}</StaffConfigContext.Provider>;
}

/** The admin's settings for one staff tab: its name, whether it's on, and which fields show. */
export function useStaffTab(key: StaffTabKey) {
  const entry = useContext(StaffConfigContext).tabs[key];
  const fields = new Set(entry.fields);
  return { label: entry.label, visible: entry.visible, show: (field: string) => fields.has(field) };
}
