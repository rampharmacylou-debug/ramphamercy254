"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Lets a page's own search box be filled from the address (e.g. /products?q=panadol), which is how the
 * global search sends you to a section with the result already filtered. Re-runs when the address changes
 * (the global search adds a small `s` number so choosing the same result twice still works).
 */
export function usePrefillSearch(setSearch: (value: string) => void) {
  const params = useSearchParams();
  const q = params.get("q");
  const nonce = params.get("s");
  useEffect(() => {
    if (q) setSearch(q);
  }, [q, nonce, setSearch]);
}
