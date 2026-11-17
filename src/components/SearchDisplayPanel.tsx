"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, RotateCcw, Search } from "lucide-react";
import DynamicIcon from "@/components/DynamicIcon";
import { useAppearance } from "@/lib/appearanceContext";
import { useDiaryConfig } from "@/lib/diaryConfigContext";
import { detailContextFromDiary } from "@/lib/searchContext";
import {
  MAX_POPUP_LABEL,
  SEARCH_SECTIONS,
  SECTION_FIELDS,
  SearchDisplay,
  SearchSection,
  buildDetails,
  buildTooltip,
  defaultSearchDisplay,
  mainText,
} from "@/lib/searchRules";

type Msg = { kind: "success" | "error"; text: string } | null;

// Made-up rows, only used to show what a result will look like with the current choices.
const SAMPLE: Record<SearchSection, Record<string, unknown>> = {
  products: { product: "Panadol 500mg", sku: "PAN-500", no: "1042", packsize: "24 tablets", unitPrice: 6.25, price: 150, barcode: "6001234567890" },
  clients: { clientName: "Mary Wanjiku", phone: "0712 345 678", routeName: "Westlands", phamPrice: 200, riderPrice: 120 },
  diary: { clientName: "Mary Wanjiku", itemsTaken: "Panadol x2, Vitamin C", date: "2026-10-02", qty: 3, transport: 150, paidStatus: "partial", invoiceAction: "goes", discountPercent: 10 },
  transport: { clientName: "Mary Wanjiku", riderName: "Peter", routeName: "Westlands", phamPrice: 200, riderPrice: 120 },
};

const TONE: Record<SearchSection, string> = {
  products: "bg-emerald-100 text-emerald-800",
  clients: "bg-sky-100 text-sky-800",
  diary: "bg-amber-100 text-amber-800",
  transport: "bg-violet-100 text-violet-800",
};

export default function SearchDisplayPanel() {
  const router = useRouter();
  const { nav } = useAppearance();
  const ctx = detailContextFromDiary(useDiaryConfig()); // the preview uses your diary wording, and leaves out diary parts you switched off
  const [saved, setSaved] = useState<SearchDisplay | null>(null);
  const [draft, setDraft] = useState<SearchDisplay | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    fetch("/api/settings/search", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const v: SearchDisplay = d.display ?? defaultSearchDisplay();
        setSaved(v);
        setDraft(v);
      })
      .catch(() => {
        setSaved(defaultSearchDisplay());
        setDraft(defaultSearchDisplay());
      });
  }, []);

  if (!draft || !saved) return null;

  function patch(key: SearchSection, next: Partial<SearchDisplay[SearchSection]>) {
    setMsg(null);
    setDraft((d) => {
      const cur = d![key];
      const merged = { ...cur, ...next };
      // The main line is never also listed as a detail.
      merged.details = merged.details.filter((x) => x !== merged.main);
      return { ...d!, [key]: merged };
    });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/search", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Could not save.");
      setSaved(j.display);
      setDraft(j.display);
      setMsg({ kind: "success", text: "Saved. The search box shows this from now on." });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setSaving(false);
    }
  }

  const changed = JSON.stringify(draft) !== JSON.stringify(saved);

  return (
    <section className="mt-8 space-y-4 rounded-lg border border-hairline bg-surface p-4 sm:p-5">
      <div>
        <h2 className="flex items-center gap-1.5 font-display text-base font-semibold text-ink">
          <Search size={16} /> Search results
        </h2>
        <p className="mt-1 text-sm text-muted">
          Choose what the search box shows for each result: the bold main line, and the details under it. Staff only ever see
          the details their tab is allowed to show (Staff view tabs, above), in the results and in the hover pop-up, whatever you pick here. The pop-up has its own list of fields, order and names below each section.
        </p>
      </div>

      {SEARCH_SECTIONS.map((key) => {
        const fields = SECTION_FIELDS[key];
        const cfg = draft[key];
        const sample = SAMPLE[key];
        const details = buildDetails(key, sample, cfg.details, ctx);
        const more = buildTooltip(key, sample, cfg.popupFields, ctx, cfg.popupLabels);
        // The editor lists the chosen fields first (in the admin's order), then the rest.
        const popupOrder = [...cfg.popupFields, ...fields.map((f) => f.key).filter((k) => !cfg.popupFields.includes(k))];
        const movePopup = (k: string, by: -1 | 1) => {
          const list = [...cfg.popupFields];
          const i = list.indexOf(k);
          const j = i + by;
          if (i < 0 || j < 0 || j >= list.length) return;
          [list[i], list[j]] = [list[j], list[i]];
          patch(key, { popupFields: list });
        };
        const name = nav[key].label;
        return (
          <div key={key} className="space-y-3 rounded-lg border border-hairline p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
                <span className={`flex size-7 items-center justify-center rounded-md ${TONE[key]}`}>
                  <DynamicIcon name={nav[key].icon} size={14} />
                </span>
                {name}
              </h3>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button type="button" onClick={() => patch(key, { details: [] })} className="rounded-full border border-hairline px-3 py-1.5 font-medium text-ink hover:bg-canvas">
                  Just the name
                </button>
                <button type="button" onClick={() => patch(key, defaultSearchDisplay()[key])} className="rounded-full border border-hairline px-3 py-1.5 font-medium text-ink hover:bg-canvas">
                  Standard
                </button>
                <button type="button" onClick={() => patch(key, { details: fields.filter((f) => f.key !== cfg.main).map((f) => f.key) })} className="rounded-full border border-hairline px-3 py-1.5 font-medium text-ink hover:bg-canvas">
                  Everything
                </button>
              </div>
            </div>

            <div className="max-w-xs">
              <label htmlFor={`main-${key}`} className="text-sm font-medium text-ink">Main line</label>
              <select
                id={`main-${key}`}
                value={cfg.main}
                onChange={(e) => patch(key, { main: e.target.value })}
                className="mt-1 w-full rounded-md border border-hairline bg-white px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
              >
                {fields.filter((f) => f.kind === "text").map((f) => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-ink">Details under it</legend>
              <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                {fields.filter((f) => f.key !== cfg.main).map((f) => (
                  <label key={f.key} className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-text">
                    <input
                      type="checkbox"
                      checked={cfg.details.includes(f.key)}
                      onChange={(e) =>
                        patch(key, {
                          details: e.target.checked
                            ? fields.filter((x) => x.key === f.key || cfg.details.includes(x.key)).map((x) => x.key)
                            : cfg.details.filter((x) => x !== f.key),
                        })
                      }
                      className="size-5 shrink-0 accent-[var(--accent)]"
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="flex min-h-10 cursor-pointer items-start gap-2.5 text-sm text-text">
              <input
                type="checkbox"
                checked={cfg.tooltip}
                onChange={(e) => patch(key, { tooltip: e.target.checked })}
                className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
              />
              <span>
                <b className="font-medium text-ink">Show all the details in a pop-up when hovering a result</b>
                <span className="block text-xs text-muted">On computers. Lists everything the person is allowed to see, not only the details chosen above.</span>
              </span>
            </label>

            {cfg.tooltip && (
              <div className="space-y-2 rounded-md border border-hairline p-3">
                <div>
                  <p className="text-sm font-medium text-ink">What the pop-up lists</p>
                  <p className="text-xs text-muted">
                    Tick the fields, put them in the order you want with the arrows, and type your own name for any of them. Staff still only see fields their tab allows.
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {popupOrder.map((k) => {
                    const f = fields.find((x) => x.key === k)!;
                    const on = cfg.popupFields.includes(k);
                    const idx = cfg.popupFields.indexOf(k);
                    return (
                      <li key={k} className="flex flex-wrap items-center gap-2">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) =>
                            patch(key, { popupFields: e.target.checked ? [...cfg.popupFields, k] : cfg.popupFields.filter((x) => x !== k) })
                          }
                          aria-label={`Show ${f.label} in the pop-up`}
                          className="size-5 shrink-0 accent-[var(--accent)]"
                        />
                        <input
                          value={cfg.popupLabels[k] ?? ""}
                          placeholder={f.label}
                          maxLength={MAX_POPUP_LABEL}
                          disabled={!on}
                          onChange={(e) => {
                            const labels = { ...cfg.popupLabels };
                            if (e.target.value.trim()) labels[k] = e.target.value;
                            else delete labels[k];
                            patch(key, { popupLabels: labels });
                          }}
                          aria-label={`Name for ${f.label} in the pop-up`}
                          className="h-10 min-w-[140px] flex-1 rounded-md border border-hairline bg-white px-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 disabled:opacity-40"
                        />
                        <button type="button" disabled={!on || idx === 0} onClick={() => movePopup(k, -1)} aria-label={`Move ${f.label} up`} className="flex size-10 items-center justify-center rounded-md border border-hairline text-muted hover:bg-canvas disabled:opacity-30">↑</button>
                        <button type="button" disabled={!on || idx === cfg.popupFields.length - 1} onClick={() => movePopup(k, 1)} aria-label={`Move ${f.label} down`} className="flex size-10 items-center justify-center rounded-md border border-hairline text-muted hover:bg-canvas disabled:opacity-30">↓</button>
                      </li>
                    );
                  })}
                </ul>
                {cfg.popupFields.length === 0 && <p className="text-xs text-danger">No field is ticked, so the pop-up will not appear.</p>}
              </div>
            )}

            {/* What one result will look like */}
            <div className="flex items-center gap-3 rounded-md border border-dashed border-hairline bg-canvas/60 px-3 py-2.5">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-md ${TONE[key]}`}>
                <DynamicIcon name={nav[key].icon} size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{mainText(key, sample, cfg.main)}</span>
                <span className="block truncate text-xs text-muted">{details.length ? details.join(" · ") : "No details"}</span>
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE[key]}`}>{name}</span>
            </div>
            {cfg.tooltip && more.length > 0 && (
              <div className="max-w-xs rounded-lg border border-hairline bg-surface p-3 text-text shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Pop-up on hover</p>
                <p className="mt-1 text-sm font-semibold text-ink">{mainText(key, sample, cfg.main)}</p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  {more.map((m) => (
                    <div key={m.label} className="contents">
                      <dt className="text-muted">{m.label}</dt>
                      <dd className="break-words text-ink">{m.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        );
      })}

      <p className="text-xs text-muted">
        Typing still finds a result by fields that are not shown (for example a barcode), as long as staff are allowed to see that
        field. Prices are shown but not searched.
      </p>

      {msg && (
        <p role="status" className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${msg.kind === "success" ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"}`}>
          {msg.kind === "success" ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
          <span>{msg.text}</span>
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={save} disabled={saving || !changed} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-50">
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "Saving…" : "Save search results"}
        </button>
        <button onClick={() => { setMsg(null); setDraft(defaultSearchDisplay()); }} className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas">
          <RotateCcw size={14} /> Back to standard
        </button>
      </div>
    </section>
  );
}
