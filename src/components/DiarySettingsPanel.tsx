"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, NotebookPen, RotateCcw } from "lucide-react";
import DynamicIcon from "@/components/DynamicIcon";
import IconPicker from "@/components/IconPicker";
import {
  DiaryConfig,
  INVOICE_KEYS,
  MAX_LONG,
  MAX_SHORT,
  PAID_KEYS,
  defaultDiaryConfig,
  discountText,
  invoiceLabel,
} from "@/lib/diaryConfig";

type Msg = { kind: "success" | "error"; text: string } | null;

const inputCls =
  "w-full rounded-md border border-hairline bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/40";

function Switch({ checked, onChange, title, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; title: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-3 text-sm ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
      />
      <span>
        <b className="font-medium text-ink">{title}</b>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

function Text({ label, value, onChange, max = MAX_SHORT, placeholder }: { label: string; value: string; onChange: (v: string) => void; max?: number; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-ink">{label}</label>
      <input value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={`${inputCls} mt-1`} />
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border border-hairline p-4">
      <div>
        <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export default function DiarySettingsPanel() {
  const router = useRouter();
  const [saved, setSaved] = useState<DiaryConfig | null>(null);
  const [draft, setDraft] = useState<DiaryConfig | null>(null);
  const [quickText, setQuickText] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    fetch("/api/settings/diary", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const c: DiaryConfig = d.config ?? defaultDiaryConfig();
        setSaved(c);
        setDraft(c);
        setQuickText(c.discount.quick.join(", "));
      })
      .catch(() => {
        const c = defaultDiaryConfig();
        setSaved(c);
        setDraft(c);
        setQuickText(c.discount.quick.join(", "));
      });
  }, []);

  if (!draft || !saved) return null;
  const d = draft;

  function set(next: DiaryConfig) {
    setMsg(null);
    setDraft(next);
  }

  function setQuick(text: string) {
    setQuickText(text);
    const nums = text.split(/[ ,;]+/).map(Number).filter((n) => Number.isFinite(n) && n > 0 && n <= 100);
    set({ ...d, discount: { ...d.discount, quick: [...new Set(nums)].sort((a, b) => a - b).slice(0, 6) } });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/diary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Could not save.");
      setSaved(j.config);
      setDraft(j.config);
      setQuickText(j.config.discount.quick.join(", "));
      setMsg({ kind: "success", text: "Saved. The diary now uses this wording and these switches." });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    const c = defaultDiaryConfig();
    setMsg(null);
    setDraft(c);
    setQuickText(c.discount.quick.join(", "));
  }

  const changed = JSON.stringify(draft) !== JSON.stringify(saved);
  const onlyOneAction = INVOICE_KEYS.filter((k) => d.invoice.actions[k].enabled).length <= 1;

  return (
    <section className="mt-8 space-y-4 rounded-lg border border-hairline bg-surface p-4 sm:p-5">
      <div>
        <h2 className="flex items-center gap-1.5 font-display text-base font-semibold text-ink">
          <NotebookPen size={16} /> Diary
        </h2>
        <p className="mt-1 text-sm text-muted">
          Change the words used in the diary (mostly the invoice section) and switch off the parts you don&apos;t use. Entries you
          already saved keep their values, even for parts you switch off.
        </p>
      </div>

      <Group title="Invoice section" hint="Where the invoice goes for each diary entry.">
        <Switch checked={d.invoice.enabled} onChange={(v) => set({ ...d, invoice: { ...d.invoice, enabled: v } })} title="Show the invoice section" hint="Off hides it everywhere: the form, the tags on entries, and the staff view." />
        <div className={d.invoice.enabled ? "space-y-4" : "pointer-events-none space-y-4 opacity-50"}>
          <Switch checked={d.invoice.required} onChange={(v) => set({ ...d, invoice: { ...d.invoice, required: v } })} title="New entries must choose one" hint="Off lets an entry be saved without an invoice choice." />
          <div className="grid gap-3 sm:grid-cols-2">
            <Text label="Section title" value={d.invoice.title} onChange={(v) => set({ ...d, invoice: { ...d.invoice, title: v } })} />
            <Text label="Name for “no choice yet”" value={d.invoice.notSetLabel} onChange={(v) => set({ ...d, invoice: { ...d.invoice, notSetLabel: v } })} />
          </div>
          <Text label="Question shown above the choices" value={d.invoice.question} max={MAX_LONG} onChange={(v) => set({ ...d, invoice: { ...d.invoice, question: v } })} />
          <Text label="Message when someone tries to save without choosing" value={d.invoice.missingMessage} max={MAX_LONG} onChange={(v) => set({ ...d, invoice: { ...d.invoice, missingMessage: v } })} />
          <Text label="Message when editing an older entry with no choice" value={d.invoice.oldEntryMessage} max={MAX_LONG} onChange={(v) => set({ ...d, invoice: { ...d.invoice, oldEntryMessage: v } })} />

          <div className="space-y-3">
            <p className="text-sm font-medium text-ink">The choices</p>
            {INVOICE_KEYS.map((k) => {
              const a = d.invoice.actions[k];
              const patch = (p: Partial<typeof a>) => set({ ...d, invoice: { ...d.invoice, actions: { ...d.invoice.actions, [k]: { ...a, ...p } } } });
              return (
                <div key={k} className="space-y-2 rounded-md border border-hairline p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <IconPicker value={a.icon} onChange={(icon) => patch({ icon })} label={`Icon for the ${a.label} choice`} />
                    <input
                      value={a.label}
                      maxLength={MAX_SHORT}
                      onChange={(e) => patch({ label: e.target.value })}
                      aria-label={`Name of the ${k} choice`}
                      className="h-10 min-w-[140px] flex-1 rounded-md border border-hairline bg-white px-3 text-sm font-medium outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
                    />
                    <label className="flex items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={a.enabled}
                        disabled={a.enabled && onlyOneAction}
                        onChange={(e) => patch({ enabled: e.target.checked })}
                        className="size-5 accent-[var(--accent)]"
                      />
                      Offer this choice
                    </label>
                  </div>
                  <input
                    value={a.hint}
                    maxLength={MAX_LONG}
                    onChange={(e) => patch({ hint: e.target.value })}
                    aria-label={`Description of the ${k} choice`}
                    className={inputCls}
                  />
                </div>
              );
            })}
            {onlyOneAction && <p className="text-xs text-muted">At least one choice has to stay on.</p>}
          </div>
        </div>
      </Group>

      <Group title="Discount">
        <Switch checked={d.discount.enabled} onChange={(v) => set({ ...d, discount: { ...d.discount, enabled: v } })} title="Show the discount section" hint="Off hides it in the form and on entries." />
        <div className={d.discount.enabled ? "space-y-3" : "pointer-events-none space-y-3 opacity-50"}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Text label="Section title" value={d.discount.title} onChange={(v) => set({ ...d, discount: { ...d.discount, title: v } })} />
            <Text label="“No discount” wording" value={d.discount.noLabel} onChange={(v) => set({ ...d, discount: { ...d.discount, noLabel: v } })} />
            <Text label="“Give a discount” wording" value={d.discount.yesLabel} onChange={(v) => set({ ...d, discount: { ...d.discount, yesLabel: v } })} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Quick percentages</label>
            <input value={quickText} onChange={(e) => setQuick(e.target.value)} placeholder="5, 10, 15, 20" className={`${inputCls} mt-1 max-w-xs`} />
            <p className="mt-1 text-xs text-muted">Buttons shown when giving a discount. Separate with commas, up to 6.</p>
          </div>
        </div>
      </Group>

      <Group title="Payment status">
        <Switch checked={d.paid.enabled} onChange={(v) => set({ ...d, paid: { ...d.paid, enabled: v } })} title="Show payment status" hint="Off hides the paid badge, the payment filter and the “Outstanding” count." />
        <div className={d.paid.enabled ? "space-y-3" : "pointer-events-none space-y-3 opacity-50"}>
          <Text label="Field title" value={d.paid.title} onChange={(v) => set({ ...d, paid: { ...d.paid, title: v } })} />
          <div className="grid gap-3 sm:grid-cols-3">
            {PAID_KEYS.map((k) => (
              <Text key={k} label={`Wording for “${k === "partial" ? "partly paid" : k}”`} value={d.paid.labels[k]} onChange={(v) => set({ ...d, paid: { ...d.paid, labels: { ...d.paid.labels, [k]: v } } })} />
            ))}
          </div>
        </div>
      </Group>

      <Group title="Entry details">
        <div className="grid gap-3 sm:grid-cols-2">
          <Text label="Name for “items taken”" value={d.itemsLabel} onChange={(v) => set({ ...d, itemsLabel: v })} />
          <Text label="Text under the Diary title" value={d.pageDescription} max={200} onChange={(v) => set({ ...d, pageDescription: v })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Switch checked={d.qty.enabled} onChange={(v) => set({ ...d, qty: { ...d.qty, enabled: v } })} title="Show quantity" />
            <Text label="Quantity name" value={d.qty.label} onChange={(v) => set({ ...d, qty: { ...d.qty, label: v } })} />
          </div>
          <div className="space-y-2">
            <Switch checked={d.transport.enabled} onChange={(v) => set({ ...d, transport: { ...d.transport, enabled: v } })} title="Show transport charge" />
            <Text label="Transport name" value={d.transport.label} onChange={(v) => set({ ...d, transport: { ...d.transport, label: v } })} />
          </div>
        </div>
      </Group>

      {/* What it will look like */}
      <div className="space-y-2 rounded-lg border border-dashed border-hairline bg-canvas/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Preview</p>
        <div className="flex flex-wrap items-center gap-2">
          {d.invoice.enabled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-ink/8 px-2.5 py-1 text-xs font-medium text-ink">
              <DynamicIcon name={d.invoice.actions.goes.icon} size={13} />
              {d.invoice.title}: {invoiceLabel(d, "goes")}
            </span>
          )}
          {d.discount.enabled && <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">{discountText(d, 10)}</span>}
          {d.discount.enabled && <span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium text-muted">{discountText(d, 0)}</span>}
          {d.paid.enabled && <span className="rounded-full bg-danger/15 px-2.5 py-1 text-xs font-medium text-danger">{d.paid.labels.unpaid}</span>}
        </div>
        {d.invoice.enabled && (
          <div className="pt-1">
            <p className="text-sm font-medium text-ink">{d.invoice.title}{d.invoice.required && <span className="text-danger"> *</span>}</p>
            <p className="text-xs text-muted">{d.invoice.question}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {INVOICE_KEYS.filter((k) => d.invoice.actions[k].enabled).map((k) => (
                <div key={k} className="rounded-md border border-hairline bg-white px-3 py-2 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-ink"><DynamicIcon name={d.invoice.actions[k].icon} size={14} />{d.invoice.actions[k].label}</span>
                  <span className="block text-xs text-muted">{d.invoice.actions[k].hint}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {msg && (
        <p role="status" className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${msg.kind === "success" ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"}`}>
          {msg.kind === "success" ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
          <span>{msg.text}</span>
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={save} disabled={saving || !changed} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-50">
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "Saving…" : "Save diary settings"}
        </button>
        <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas">
          <RotateCcw size={14} /> Back to the original wording
        </button>
      </div>
    </section>
  );
}
