"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, Eye, EyeOff, LayoutPanelTop, Lock, RotateCcw } from "lucide-react";
import IconPicker from "@/components/IconPicker";
import {
  MAX_LABEL_LENGTH,
  STAFF_TAB_DEFS,
  StaffConfig,
  StaffTabKey,
  defaultStaffConfig,
} from "@/lib/staffTabs";

type Msg = { kind: "success" | "error"; text: string } | null;

export default function StaffTabsPanel() {
  const [config, setConfig] = useState<StaffConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    fetch("/api/settings/staff-tabs", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setConfig(d.config ?? defaultStaffConfig()))
      .catch(() => setConfig(defaultStaffConfig()));
  }, []);

  if (!config) return null;

  function update(fn: (c: StaffConfig) => StaffConfig) {
    setMsg(null);
    setConfig((c) => (c ? fn(c) : c));
  }

  function setTab(key: StaffTabKey, patch: Partial<StaffConfig["tabs"][StaffTabKey]>) {
    update((c) => ({ ...c, tabs: { ...c.tabs, [key]: { ...c.tabs[key], ...patch } } }));
  }

  function toggleField(key: StaffTabKey, field: string) {
    update((c) => {
      const has = c.tabs[key].fields.includes(field);
      const fields = has ? c.tabs[key].fields.filter((f) => f !== field) : [...c.tabs[key].fields, field];
      return { ...c, tabs: { ...c.tabs, [key]: { ...c.tabs[key], fields } } };
    });
  }

  function move(key: StaffTabKey, dir: -1 | 1) {
    update((c) => {
      const i = c.order.indexOf(key);
      const j = i + dir;
      if (j < 0 || j >= c.order.length) return c;
      const order = [...c.order];
      [order[i], order[j]] = [order[j], order[i]];
      return { ...c, order };
    });
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/staff-tabs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Could not save.");
      setConfig(d.config);
      setMsg({ kind: "success", text: "Saved. Staff will see the new tabs the next time they open or refresh the page." });
    } catch (err) {
      setMsg({ kind: "error", text: err instanceof Error ? err.message : "Could not save." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-t border-hairline pt-6">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink">Staff view tabs</h2>
        <p className="mt-1 text-sm text-muted">
          Rename the tabs staff see, pick an icon for each, show or hide each tab, change their order, and choose which
          details each tab shows. Hidden details are not sent to staff at all.
        </p>
      </div>

      <div className="rounded-lg border border-hairline bg-surface p-5 space-y-5">
        <div className="flex items-center gap-2.5">
          <LayoutPanelTop size={18} className="text-accent" />
          <h3 className="font-display text-base font-semibold text-ink">Tabs</h3>
        </div>

        <ul className="space-y-4">
          {config.order.map((key, idx) => {
            const def = STAFF_TAB_DEFS.find((d) => d.key === key)!;
            const tab = config.tabs[key];
            return (
              <li key={key} className={`rounded-md border border-hairline p-4 ${tab.visible ? "" : "bg-canvas/60"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <IconPicker
                    value={tab.icon}
                    onChange={(icon) => setTab(key, { icon })}
                    label={`Icon for the ${tab.label} tab`}
                  />
                  <input
                    value={tab.label}
                    onChange={(e) => setTab(key, { label: e.target.value })}
                    maxLength={MAX_LABEL_LENGTH}
                    aria-label={`Name of the ${def.defaultLabel} tab`}
                    className="h-10 min-w-[140px] flex-1 rounded-md border border-hairline bg-white px-3 py-2 text-sm font-medium text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
                  />
                  <button
                    type="button"
                    onClick={() => setTab(key, { visible: !tab.visible })}
                    className={`flex h-10 items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium ${
                      tab.visible ? "border-hairline text-ink hover:bg-canvas" : "border-danger/30 bg-danger/10 text-danger"
                    }`}
                  >
                    {tab.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    {tab.visible ? "Shown to staff" : "Hidden"}
                  </button>
                  <button type="button" onClick={() => move(key, -1)} disabled={idx === 0} aria-label="Move tab up" className="flex size-10 items-center justify-center rounded-md border border-hairline text-muted hover:bg-canvas disabled:opacity-30">
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" onClick={() => move(key, 1)} disabled={idx === config.order.length - 1} aria-label="Move tab down" className="flex size-10 items-center justify-center rounded-md border border-hairline text-muted hover:bg-canvas disabled:opacity-30">
                    <ArrowDown size={14} />
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted">Original name: {def.defaultLabel}</p>

                <fieldset className="mt-3">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-muted">What this tab shows</legend>
                  <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                    {def.fields.map((f) => {
                      const on = tab.fields.includes(f.key);
                      return (
                        <label key={f.key} className={`flex items-center gap-2 text-sm ${f.locked ? "text-muted" : "cursor-pointer text-ink"}`}>
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={f.locked}
                            onChange={() => toggleField(key, f.key)}
                            className="h-4 w-4 rounded border-hairline"
                          />
                          {f.label}
                          {f.locked && <Lock size={11} className="text-muted" aria-label="Always shown" />}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </li>
            );
          })}
        </ul>

        {msg && (
          <p className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${msg.kind === "success" ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"}`}>
            {msg.kind === "success" ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
            <span>{msg.text}</span>
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} disabled={saving} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-60">
            {saving ? "Saving…" : "Save staff tabs"}
          </button>
          <button
            type="button"
            onClick={() => update(() => defaultStaffConfig())}
            className="flex items-center gap-1.5 rounded-md border border-hairline px-4 py-2 text-sm font-medium text-muted hover:bg-canvas"
          >
            <RotateCcw size={14} /> Reset to defaults
          </button>
        </div>
        <p className="text-xs text-muted">
          The lock means that detail is always shown (the tab can&apos;t work without it). Reset only changes the form —
          press Save to apply it.
        </p>
      </div>
    </div>
  );
}
