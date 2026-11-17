"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import DynamicIcon from "@/components/DynamicIcon";
import type { IconKey } from "@/lib/iconKeys";
import {
  SEARCH_MIN_CHARS,
  SearchItem,
  SearchResponse,
  SearchSection,
  parseQuery,
} from "@/lib/searchRules";

export type SearchSectionInfo = { key: SearchSection; label: string; icon: IconKey; href: string };

type Props = {
  /** The sections this person can search, with the names and icons the admin chose. */
  sections: SearchSectionInfo[];
  /** Admins open a client's own page; staff go to the Clients list filtered to that client. */
  clientPages?: boolean;
  /** On phones show just a magnifier that opens a full-width search (used in the admin top bar). */
  phoneOverlay?: boolean;
  className?: string;
};

// A different colour per section, so the origin of a result is clear at a glance
// (the section name is always written next to it as well, so colour is never the only clue).
const TONE: Record<SearchSection, string> = {
  products: "bg-emerald-100 text-emerald-800",
  clients: "bg-sky-100 text-sky-800",
  diary: "bg-amber-100 text-amber-800",
  transport: "bg-violet-100 text-violet-800",
};

type Option = { id: string; href: string; kind: "item" | "all" };

const TIP_WIDTH = 288; // pop-up width in pixels (18rem)
const TIP_GAP = 8;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function Highlight({ text, words }: { text: string; words: string[] }) {
  if (words.length === 0 || !text) return <>{text}</>;
  const re = new RegExp(`(${[...words].sort((a, b) => b.length - a.length).map(escapeRe).join("|")})`, "ig");
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-accent/15 px-0.5 text-inherit">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export default function GlobalSearch({ sections, clientPages = false, phoneOverlay = false, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const uid = useId();
  const listId = `${uid}-list`;
  const tipId = `${uid}-tip`;

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const memory = useRef(new Map<string, { at: number; data: SearchResponse }>());

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);
  // Hover pop-up: where it sits, whether the pointer has left the list, and a counter that re-places it when the list scrolls.
  const [tip, setTip] = useState<{ id: string; top: number; left: number } | null>(null);
  const [pointerOut, setPointerOut] = useState(false);
  const [scrollTick, setScrollTick] = useState(0);

  const term = q.trim();
  const words = useMemo(() => parseQuery(term), [term]);
  const searchable = term.length >= SEARCH_MIN_CHARS;
  const names = sections.map((s) => s.label).join(", ");

  // ── fetch as you type ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchable) {
      setData(null);
      setLoading(false);
      setError("");
      return;
    }
    const key = term.toLowerCase();
    const hit = memory.current.get(key);
    if (hit && Date.now() - hit.at < 30_000) {
      setData(hit.data);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal, cache: "no-store" });
        if (res.status === 401) {
          window.location.assign(window.location.pathname.startsWith("/staff") ? "/login?as=staff" : "/login?as=admin");
          return;
        }
        if (!res.ok) throw new Error("search failed");
        const json: SearchResponse = await res.json();
        if (memory.current.size > 40) memory.current.clear();
        memory.current.set(key, { at: Date.now(), data: json });
        setData(json);
        setError("");
      } catch {
        if (ctrl.signal.aborted) return;
        setError("Search isn't working right now. Check your connection and try again.");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 180);

    // Old results stay on screen while the new ones load, so the list never flashes empty.
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [term, searchable]);

  // ── what is shown, and the keyboard order ─────────────────────────────────
  const groups = useMemo(
    () =>
      (data?.sections ?? [])
        .map((g) => ({ group: g, info: sections.find((s) => s.key === g.key) }))
        .filter((x): x is { group: SearchResponse["sections"][number]; info: SearchSectionInfo } => Boolean(x.info)),
    [data, sections],
  );

  const hrefs = useMemo(() => {
    const options: Option[] = [];
    const map = new Map<string, string>();
    const byId = new Map<string, { item: SearchItem; info: SearchSectionInfo }>();
    for (const { group, info } of groups) {
      for (const item of group.items) {
        const href =
          clientPages && info.key === "clients"
            ? `/clients/${item.id}`
            : `${info.href}?q=${encodeURIComponent(item.title)}`;
        const id = `${uid}-${info.key}-${item.id}`;
        options.push({ id, href, kind: "item" });
        map.set(`${info.key}:${item.id}`, id);
        byId.set(id, { item, info });
      }
      if (group.total > group.items.length) {
        const id = `${uid}-${info.key}-all`;
        options.push({ id, href: `${info.href}?q=${encodeURIComponent(data?.q ?? term)}`, kind: "all" });
        map.set(`${info.key}:all`, id);
      }
    }
    return { options, ids: map, byId };
  }, [groups, clientPages, uid, data, term]);

  const options = hrefs.options;

  useEffect(() => setActive(0), [data]);

  // ── hover pop-up with all the details of the highlighted result ───────────
  // Shown on computers and large tablets, to the side of the results list. It follows the mouse AND the
  // keyboard (the highlighted row), appears after a short pause so it doesn't flicker as the mouse passes over rows,
  // and is left out if the admin switched it off for that section (the server then sends no extra details).
  const activeId = options[active]?.id;
  const activeEntry = activeId ? hrefs.byId.get(activeId) : undefined;
  useEffect(() => {
    setTip(null);
    if (!open || pointerOut || !activeId || !activeEntry?.item.more?.length) return;
    if (typeof window === "undefined" || window.innerWidth < 768) return;
    const timer = setTimeout(() => {
      const row = document.getElementById(activeId);
      const panel = panelRef.current;
      if (!row || !panel) return;
      const r = row.getBoundingClientRect();
      const p = panel.getBoundingClientRect();
      let left = p.right + TIP_GAP; // beside the list, on its right...
      if (left + TIP_WIDTH > window.innerWidth - TIP_GAP) left = p.left - TIP_WIDTH - TIP_GAP; // ...or on its left
      if (left < TIP_GAP) return; // no room on either side
      const top = Math.max(TIP_GAP, Math.min(r.top, window.innerHeight - 280));
      setTip({ id: activeId, top, left });
    }, 160);
    return () => clearTimeout(timer);
  }, [open, pointerOut, activeId, activeEntry, scrollTick]);
  useEffect(() => {
    if (open && options[active]) document.getElementById(options[active].id)?.scrollIntoView?.({ block: "nearest" });
  }, [active, open, options]);

  // ── opening, closing, navigating ──────────────────────────────────────────
  const closeAll = useCallback(() => {
    setOpen(false);
    setMobileOpen(false);
  }, []);

  useEffect(() => closeAll(), [pathname, closeAll]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // "/" or Ctrl/Cmd+K from anywhere jumps to the search box.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      const wants = (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k");
      if (!wants) return;
      e.preventDefault();
      setMobileOpen(true);
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (mobileOpen) setTimeout(() => inputRef.current?.focus(), 0);
  }, [mobileOpen]);

  function go(base: string) {
    // `s` is a small changing number, so choosing the same result twice still refreshes the page's filter.
    router.push(`${base}${base.includes("?") ? "&" : "?"}s=${Date.now().toString(36)}`);
    closeAll();
    inputRef.current?.blur();
  }

  function onLinkClick(e: React.MouseEvent, base: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let "open in new tab" work
    e.preventDefault();
    go(base);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setPointerOut(false);
      if (options.length === 0) return;
      setActive((i) => (e.key === "ArrowDown" ? (i + 1) % options.length : (i - 1 + options.length) % options.length));
    } else if (e.key === "Enter") {
      const o = options[active] ?? options[0];
      if (o) {
        e.preventDefault();
        go(o.href);
      }
    } else if (e.key === "Escape") {
      if (open) setOpen(false);
      else if (q) setQ("");
      else inputRef.current?.blur();
      setMobileOpen(false);
    }
  }

  if (sections.length === 0) return null;

  const showPanel = open && (searchable || term.length === 0 || term.length < SEARCH_MIN_CHARS);
  const total = groups.reduce((n, g) => n + g.group.total, 0);
  const summary = !searchable ? "" : loading && !data ? "Searching" : error ? error : `${total} result${total === 1 ? "" : "s"}`;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {phoneOverlay && (
        <button
          type="button"
          aria-label="Search"
          onClick={() => {
            setMobileOpen(true);
            setOpen(true);
          }}
          className="flex size-10 items-center justify-center rounded-md text-ink hover:bg-ink/5 sm:hidden"
        >
          <Search size={20} />
        </button>
      )}
      {phoneOverlay && mobileOpen && <div className="fixed inset-0 z-40 bg-ink/40 sm:hidden" aria-hidden="true" onClick={closeAll} />}

      <div
        className={cn(
          phoneOverlay
            ? mobileOpen
              ? "fixed inset-x-0 top-0 z-50 bg-surface p-3 shadow-lg sm:static sm:z-auto sm:bg-transparent sm:p-0 sm:shadow-none"
              : "hidden sm:block"
            : "block",
        )}
      >
        <div className="relative flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={showPanel}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={showPanel && options[active] ? options[active].id : undefined}
              aria-label={`Search ${names}`}
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder={`Search ${sections.length > 2 ? "everything" : names}…`}
              className="h-10 w-full rounded-md border border-hairline bg-white pl-9 pr-16 text-sm text-text outline-none placeholder:text-muted/70 focus:border-accent focus:ring-1 focus:ring-accent/40"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {loading && <Loader2 size={15} className="animate-spin text-muted" aria-hidden="true" />}
              {q ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setQ("");
                    inputRef.current?.focus();
                  }}
                  className="flex size-7 items-center justify-center rounded text-muted hover:text-ink"
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd className="hidden rounded border border-hairline px-1.5 text-[11px] text-muted md:inline" aria-hidden="true">/</kbd>
              )}
            </div>
          </div>
          {phoneOverlay && mobileOpen && (
            <button type="button" onClick={closeAll} className="h-10 px-2 text-sm font-medium text-ink sm:hidden">
              Close
            </button>
          )}
        </div>

        <div className="sr-only" aria-live="polite">{summary}</div>

        {showPanel && (
          <div
            ref={panelRef}
            onMouseLeave={() => setPointerOut(true)}
            onScroll={() => setScrollTick((n) => n + 1)}
            className={cn(
              "z-50 overflow-y-auto overscroll-contain rounded-lg border border-hairline bg-surface text-text shadow-xl max-h-[65dvh] sm:max-h-[70vh]",
              phoneOverlay ? "mt-2 sm:absolute sm:inset-x-0 sm:top-full sm:mt-1" : "absolute inset-x-0 top-full mt-1",
            )}
          >
            {!searchable ? (
              <p className="px-4 py-4 text-sm text-muted">
                Type at least {SEARCH_MIN_CHARS} letters to search <b className="font-medium text-ink">{names}</b> at once.
              </p>
            ) : error ? (
              <p role="alert" className="px-4 py-4 text-sm text-danger">{error}</p>
            ) : !data ? (
              <p className="px-4 py-4 text-sm text-muted">Searching…</p>
            ) : groups.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted">
                No matches for &ldquo;<b className="font-medium text-ink">{term}</b>&rdquo; in {names}.
              </p>
            ) : (
              <ul id={listId} role="listbox" aria-label="Search results" className="py-1">
                {groups.map(({ group, info }) => (
                  <li key={info.key} role="presentation">
                    <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-hairline bg-canvas px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      <DynamicIcon name={info.icon} size={13} />
                      {info.label}
                      <span className="font-normal normal-case">
                        {group.total > group.items.length ? `${group.items.length} of ${group.total}` : group.total}
                      </span>
                    </div>
                    <ul role="presentation">
                      {group.items.map((item) => {
                        const id = hrefs.ids.get(`${info.key}:${item.id}`)!;
                        const opt = options.find((o) => o.id === id)!;
                        const isActive = options[active]?.id === id;
                        return (
                          <li key={item.id} role="presentation">
                            <a
                              id={id}
                              role="option"
                              aria-selected={isActive}
                              aria-describedby={tip?.id === id ? tipId : undefined}
                              href={opt.href}
                              onClick={(e) => onLinkClick(e, opt.href)}
                              onMouseEnter={() => {
                                setPointerOut(false);
                                setActive(options.findIndex((o) => o.id === id));
                              }}
                              className={cn("flex items-center gap-3 px-4 py-2.5", isActive ? "bg-accent/10" : "hover:bg-canvas")}
                            >
                              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", TONE[info.key])}>
                                <DynamicIcon name={info.icon} size={16} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-ink">
                                  <Highlight text={item.title} words={words} />
                                </span>
                                {item.meta.length > 0 && (
                                  <span className="block truncate text-xs text-muted">
                                    <Highlight text={item.meta.join(" · ")} words={words} />
                                  </span>
                                )}
                              </span>
                              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", TONE[info.key])}>{info.label}</span>
                            </a>
                          </li>
                        );
                      })}
                      {group.total > group.items.length && (() => {
                        const id = hrefs.ids.get(`${info.key}:all`)!;
                        const opt = options.find((o) => o.id === id)!;
                        const isActive = options[active]?.id === id;
                        return (
                          <li role="presentation">
                            <a
                              id={id}
                              role="option"
                              aria-selected={isActive}
                              href={opt.href}
                              onClick={(e) => onLinkClick(e, opt.href)}
                              onMouseEnter={() => {
                                setPointerOut(false);
                                setActive(options.findIndex((o) => o.id === id));
                              }}
                              className={cn("flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium text-accent", isActive ? "bg-accent/10" : "hover:bg-canvas")}
                            >
                              See all {group.total} in {info.label}
                              <ArrowRight size={14} />
                            </a>
                          </li>
                        );
                      })()}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
            {searchable && groups.length > 0 && (
              <p className="hidden border-t border-hairline px-4 py-2 text-[11px] text-muted md:block">
                ↑ ↓ to move &nbsp;·&nbsp; Enter to open &nbsp;·&nbsp; Esc to close
              </p>
            )}
          </div>
        )}
      </div>

      {tip && activeEntry && activeEntry.item.more && (
        <div
          id={tipId}
          role="tooltip"
          style={{ top: tip.top, left: tip.left, width: TIP_WIDTH }}
          className="pointer-events-none fixed z-[60] max-h-[70vh] overflow-y-auto rounded-lg border border-hairline bg-surface p-3 text-text shadow-xl"
        >
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", TONE[activeEntry.info.key])}>
            <DynamicIcon name={activeEntry.info.icon} size={12} />
            {activeEntry.info.label}
          </span>
          <p className="mt-1.5 break-words text-sm font-semibold text-ink">{activeEntry.item.title}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            {activeEntry.item.more.map((m, i) => (
              <div key={`${m.label}-${i}`} className="contents">
                <dt className="text-muted">{m.label}</dt>
                <dd className="break-words text-ink">{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
