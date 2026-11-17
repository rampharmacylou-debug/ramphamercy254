"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Role = "admin" | "staff";
export type AdminVia = "password" | "trusted-device" | null;

type RoleContextType = {
  role: Role;
  isAdmin: boolean;
  /** How the admin got in: typed the password, or this PC is a trusted machine. */
  via: AdminVia;
  /** Re-ask the server (e.g. after logging in or out). */
  refresh: () => Promise<void>;
};

const RoleContext = createContext<RoleContextType>({
  role: "staff",
  isAdmin: false,
  via: null,
  refresh: async () => {},
});

// The role now comes from the SERVER (signed session cookie or trusted-machine
// cookie), not from localStorage — so flipping a value in the browser no longer
// grants admin controls, and the API refuses admin actions anyway.
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [via, setVia] = useState<AdminVia>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const d = await res.json();
      setIsAdmin(Boolean(d.isAdmin));
      setVia(d.via ?? null);
    } catch {
      setIsAdmin(false);
      setVia(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <RoleContext.Provider
      value={{ role: isAdmin ? "admin" : "staff", isAdmin, via, refresh }}
    >
      {children}
    </RoleContext.Provider>
  );
}

/**
 * Used by the (already server-verified) admin area so admin controls render
 * immediately instead of flashing in after the /api/auth/me round-trip.
 */
export function AdminAreaProvider({
  via,
  children,
}: {
  via: AdminVia;
  children: React.ReactNode;
}) {
  const parent = useContext(RoleContext);
  return (
    <RoleContext.Provider value={{ ...parent, role: "admin", isAdmin: true, via }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
