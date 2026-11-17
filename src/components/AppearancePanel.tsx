"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Palette, RotateCcw } from "lucide-react";
import IconPicker from "@/components/IconPicker";
import {
  Appearance,
  COLOR_PRESETS,
  DEFAULT_APPEARANCE,
  MAX_APP_NAME_LENGTH,
  MAX_NAV_LABEL_LENGTH,
  NAV_ITEMS,
  STAT_CARD_GROUPS,
  STORE_BRAND_COLOR,
} from "@/lib/appearance";

type Msg = { kind: "success" | "error"; text: string } | null;

// Shows a change on screen straight away (before it is saved), so the admin can see what they are picking.
function preview(a: Appearance) {
  const root = document.documentElement;
  root.dataset.theme = a.theme;
  root.dataset.font = a.fontStyle;
  root.style.setProperty("--brand", a.brandColor);
}

function Choice({ selected, onClick, title, text }: { selected: boolean; onClick: () => void; title: string; text: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-lg border p-3 text-left transition-colors ${
        selected ? "border-accent bg-accent/10" : "border-hairline bg-surface hover:bg-ink/5"
      }`}
    >
      <span className="block text-sm font-medium text-ink">{title}</span>
      <span className="mt-0.5 block text-xs text-muted">{text}</span>
    </button>
  );
}

export default function AppearancePanel() {
  const router = useRouter();
  const [saved, setSaved] = useState<Appearance | null>(null);
  const [draft, setDraft] = useState<Appearance | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const savedRef = useRef<Appearance | null>(null);

  useEffect(() => {
    fetch("/api/settings/appearance", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const a: Appearance = d.appearance ?? DEFAULT_APPEARANCE;
        setSaved(a);
        setDraft(a);
        savedRef.current = a;
      })
      .catch(() => {
        setSaved(DEFAULT_APPEARANCE);
        setDraft(DEFAULT_APPEARANCE);
        savedRef.current = DEFAULT_APPEARANCE;
      });
    // Leaving the page without saving puts the saved look back.
    return () => {
      if (savedRef.current) preview(savedRef.current);
    };
  }, []);

  if (!draft || !saved) return null;

  function change(patch: Partial<Appearance>) {
    setMsg(null);
    setDraft((d) => {
      const next = { ...d!, ...patch };
      preview(next);
      return next;
    });
  }

  function toggleCard(id: string, show: boolean) {
    const hidden = new Set(draft!.hiddenCards);
    if (show) hidden.delete(id);
    else hidden.add(id);
    change({ hiddenCards: [...hidden] });
  }

  function setGroup(ids: readonly string[], show: boolean) {
    const hidden = new Set(draft!.hiddenCards);
    ids.forEach((id) => (show ? hidden.delete(id) : hidden.add(id)));
    change({ hiddenCards: [...hidden] });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/appearance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Could not save.");
      setSaved(d.appearance);
      setDraft(d.appearance);
      savedRef.current = d.appearance;
      preview(d.appearance);
      setMsg({ kind: "success", text: "Saved. Everyone sees the new look the next time the page loads." });
      router.refresh(); // reload the name and cards right away
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setSaving(false);
    }
  }

  const changed = JSON.stringify(draft) !== JSON.stringify(saved);
  const hiddenCount = draft.hiddenCards.length;

  return (
    <section className="mt-8 rounded-lg border border-hairline bg-surface p-5">
      <h2 className="flex items-center gap-1.5 font-display text-base font-semibold text-ink">
        <Palette size={16} /> Appearance
      </h2>
      <p className="mt-1 text-sm text-muted">
        Change how the app looks, and which small summary cards (the totals at the top of each page) are shown. You see
        changes straight away; press Save to keep them.
      </p>

      <div className="mt-5 space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="appName">App name</label>
          <input
            id="appName"
            value={draft.appName}
            maxLength={MAX_APP_NAME_LENGTH}
            onChange={(e) => change({ appName: e.target.value })}
            className="mt-1.5 w-full max-w-xs rounded-md border border-hairline bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
          />
          <p className="mt-1 text-xs text-muted">Shown in the sidebar, the staff view, the sign-in page and the browser tab.</p>
        </div>

        {/* Theme */}
        <div>
          <p className="text-sm font-medium text-ink">Theme</p>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            <Choice
              selected={draft.theme === "store"}
              onClick={() => change({ theme: "store" })}
              title="Pharmacy store theme"
              text="Same look as the pharmacy store website: white cards, soft tints of one main color."
            />
            <Choice
              selected={draft.theme === "classic"}
              onClick={() => change({ theme: "classic" })}
              title="Classic"
              text="The original cream and orange look."
            />
          </div>
        </div>

        {/* Brand color */}
        <div className={draft.theme === "classic" ? "opacity-50" : ""}>
          <p className="text-sm font-medium text-ink">Main color</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.name}
                aria-label={c.name}
                aria-pressed={draft.brandColor === c.value}
                onClick={() => change({ brandColor: c.value })}
                style={{ background: c.value }}
                className={`size-8 rounded-full border-2 ${draft.brandColor === c.value ? "border-ink" : "border-white shadow-sm"}`}
              />
            ))}
            <input
              type="color"
              aria-label="Pick any color"
              value={draft.brandColor}
              onChange={(e) => change({ brandColor: e.target.value })}
              className="size-8 cursor-pointer rounded-md border border-hairline bg-white p-0.5"
            />
            <span className="font-mono text-xs text-muted">{draft.brandColor}</span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {draft.theme === "classic"
              ? "The main color is used by the Pharmacy store theme."
              : `To match the pharmacy store exactly, use the same color as its Site settings (the store's default is ${STORE_BRAND_COLOR}).`}
          </p>
        </div>

        {/* Fonts */}
        <div>
          <p className="text-sm font-medium text-ink">Fonts</p>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            <Choice
              selected={draft.fontStyle === "store"}
              onClick={() => change({ fontStyle: "store" })}
              title="Same as the pharmacy store"
              text="Bricolage Grotesque for headings, Figtree for text."
            />
            <Choice
              selected={draft.fontStyle === "system"}
              onClick={() => change({ fontStyle: "system" })}
              title="System fonts"
              text="Whatever your computer uses. Fastest."
            />
          </div>
        </div>

        {/* Menu names and icons */}
        <div>
          <p className="text-sm font-medium text-ink">Menu names and icons</p>
          <p className="mt-0.5 text-xs text-muted">The items in the admin menu on the left. Pick an icon and type the name you want.</p>
          <ul className="mt-3 space-y-2">
            {NAV_ITEMS.map((item) => {
              const entry = draft.nav[item.key];
              const set = (patch: Partial<typeof entry>) =>
                change({ nav: { ...draft.nav, [item.key]: { ...entry, ...patch } } });
              return (
                <li key={item.key} className="flex items-center gap-2">
                  <IconPicker value={entry.icon} onChange={(icon) => set({ icon })} label={`Icon for ${entry.label}`} />
                  <input
                    value={entry.label}
                    maxLength={MAX_NAV_LABEL_LENGTH}
                    onChange={(e) => set({ label: e.target.value })}
                    aria-label={`Name of the ${item.defaultLabel} menu item`}
                    className="h-10 w-full max-w-xs rounded-md border border-hairline bg-white px-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
                  />
                  <span className="hidden text-xs text-muted sm:inline">was: {item.defaultLabel}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Stat cards */}
        <div>
          <p className="text-sm font-medium text-ink">
            Summary cards {hiddenCount > 0 && <span className="font-normal text-muted">({hiddenCount} hidden)</span>}
          </p>
          <p className="mt-0.5 text-xs text-muted">Tick the cards you want to see. Unticked cards disappear from that page.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {STAT_CARD_GROUPS.map((group) => {
              const ids = group.cards.map((c) => c.id);
              const allOn = ids.every((id) => !draft.hiddenCards.includes(id));
              return (
                <fieldset key={group.title} className="rounded-md border border-hairline p-3">
                  <legend className="flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted">
                    {group.title}
                    <button
                      type="button"
                      onClick={() => setGroup(ids, !allOn)}
                      className="font-normal normal-case text-accent underline-offset-2 hover:underline"
                    >
                      {allOn ? "hide all" : "show all"}
                    </button>
                  </legend>
                  <ul className="space-y-1.5">
                    {group.cards.map((card) => (
                      <li key={card.id}>
                        <label className="flex items-center gap-2 text-sm text-text">
                          <input
                            type="checkbox"
                            checked={!draft.hiddenCards.includes(card.id)}
                            onChange={(e) => toggleCard(card.id, e.target.checked)}
                            className="size-4 accent-[var(--accent)]"
                          />
                          {card.label}
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              );
            })}
          </div>
        </div>
      </div>

      {msg && (
        <p
          role="status"
          className={`mt-4 flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
            msg.kind === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          {msg.kind === "success" ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
          {msg.text}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={save}
          disabled={saving || !changed}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" />} Save appearance
        </button>
        <button
          onClick={() => change({ ...DEFAULT_APPEARANCE })}
          className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-2 text-sm text-text hover:bg-ink/5"
        >
          <RotateCcw size={13} /> Back to the pharmacy store look
        </button>
      </div>
    </section>
  );
}
