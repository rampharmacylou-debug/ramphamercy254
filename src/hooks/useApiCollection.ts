"use client";

import { useCallback, useEffect, useState } from "react";

export type ApiCollectionState<T> = {
  items: T[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  add: (payload: Omit<T, "id">) => Promise<void>;
  update: (id: string, payload: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

// The last answer for each address, kept in memory while the tab stays open. Going back to a page shows
// it instantly while fresh data loads in the background. A full page reload (or signing out) starts empty.
const memory = new Map<string, unknown[]>();

// A 401 means the sign-in has ended (or was never done): send the person to the right sign-in tab
// instead of showing a confusing error.
function handleUnauthorized(res: Response) {
  if (res.status === 401 && typeof window !== "undefined") {
    memory.clear();
    const staff = window.location.pathname.startsWith("/staff");
    window.location.assign(staff ? "/login?as=staff" : "/login?as=admin");
    throw new Error("Please sign in.");
  }
}

export function useApiCollection<T extends { id: string }>(
  endpoint: string,
  dataKey: string,
): ApiCollectionState<T> {
  const [items, setItems] = useState<T[]>(() => (memory.get(endpoint) as T[] | undefined) ?? []);
  const [loading, setLoading] = useState(() => !memory.has(endpoint));
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setError(null);

    try {
      const res = await fetch(endpoint, {
        cache: "no-store",
      });

      handleUnauthorized(res);
      if (!res.ok) {
        throw new Error(`Server error ${res.status}`);
      }

      const data = await res.json();
      const rows: T[] = data[dataKey] ?? [];

      memory.set(endpoint, rows);
      setItems(rows);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [endpoint, dataKey]);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(
    async (payload: Omit<T, "id">) => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      handleUnauthorized(res);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to create (${res.status})`);
      }

      await load();
    },
    [endpoint, load],
  );

  const update = useCallback(
    async (id: string, payload: Partial<T>) => {
      const res = await fetch(`${endpoint}/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      handleUnauthorized(res);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to update (${res.status})`);
      }

      await load();
    },
    [endpoint, load],
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`${endpoint}/${id}`, {
        method: "DELETE",
      });

      handleUnauthorized(res);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Failed to delete (${res.status})`);
      }

      await load();
    },
    [endpoint, load],
  );

  return {
    items,
    loading,
    error,
    lastUpdated,
    add,
    update,
    remove,
    reload: load,
  };
}
