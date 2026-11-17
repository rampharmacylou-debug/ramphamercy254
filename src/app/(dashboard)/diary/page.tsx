"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { NotebookPen, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import Drawer from "@/components/Drawer";
import RefTag from "@/components/RefTag";
import PaidBadge from "@/components/PaidBadge";
import SearchFilterBar from "@/components/SearchFilterBar";
import { usePrefillSearch } from "@/hooks/usePrefillSearch";
import { TextField, SelectField } from "@/components/fields";
import { useApiCollection } from "@/hooks/useApiCollection";
import { useRole } from "@/lib/roleContext";
import { DiaryEntry, InvoiceAction, PaidStatus, SavedClient } from "@/lib/types";
import DiaryTags from "@/components/DiaryTags";
import DynamicIcon from "@/components/DynamicIcon";
import { INVOICE_KEYS, PAID_KEYS } from "@/lib/diaryConfig";
import { useDiaryConfig } from "@/lib/diaryConfigContext";

function isoToday() { return new Date().toISOString().slice(0, 10); }
function fmtDate(iso: string) { return new Date(iso + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }); }
function fmtKsh(n: number) { return `KSh ${n.toLocaleString("en-KE")}`; }

type Form = {
  clientId: string; clientName: string; date: string; itemsTaken: string; qty: string; transport: string; paidStatus: PaidStatus;
  invoiceAction: InvoiceAction | ""; // "" = not chosen yet (new entries must choose one)
  hasDiscount: boolean;
  discountPercent: string;
};
const BLANK: Form = { clientId: "", clientName: "", date: isoToday(), itemsTaken: "", qty: "1", transport: "", paidStatus: "unpaid", invoiceAction: "", hasDiscount: false, discountPercent: "" };

export default function DiaryPage() {
  const { isAdmin } = useRole();
  const cfg = useDiaryConfig(); // wording and on/off switches from Settings > Diary
  const { items: entries, loading: entriesLoading, add, update, remove } = useApiCollection<DiaryEntry>("/api/diary", "entries");
  const { items: clients, loading: clientsLoading } = useApiCollection<SavedClient>("/api/clients", "clients");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(BLANK);
  const [search, setSearch] = useState("");
  usePrefillSearch(setSearch);
  const [paidFilter, setPaidFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedClients = useMemo(() => [...clients].sort((a, b) => a.clientName.localeCompare(b.clientName)), [clients]);
  const sorted = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date)), [entries]);
  const paidOptions = useMemo(
    () => [{ value: "all", label: "All payment status" }, ...PAID_KEYS.map((k) => ({ value: k, label: cfg.paid.labels[k] }))],
    [cfg.paid.labels],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((e) => {
      const matchSearch = !q || e.clientName.toLowerCase().includes(q) || e.itemsTaken.toLowerCase().includes(q);
      return matchSearch && (!cfg.paid.enabled || paidFilter === "all" || e.paidStatus === paidFilter);
    });
  }, [sorted, search, paidFilter, cfg.paid.enabled]);

  function sevenDaysAgo() { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); }
  const last7 = entries.filter((e) => e.date >= sevenDaysAgo()).length;
  const outstanding = entries.filter((e) => e.paidStatus !== "paid").length;

  function openCreate() { setEditId(null); setForm(BLANK); setError(null); setOpen(true); }
  function openEdit(e: DiaryEntry) { setEditId(e.id); setForm({ clientId: e.clientId ?? "", clientName: e.clientName, date: e.date, itemsTaken: e.itemsTaken, qty: String(e.qty), transport: String(e.transport), paidStatus: e.paidStatus, invoiceAction: e.invoiceAction ?? "", hasDiscount: (e.discountPercent ?? 0) > 0, discountPercent: (e.discountPercent ?? 0) > 0 ? String(e.discountPercent) : "" }); setError(null); setOpen(true); }

  function pickClient(clientId: string) {
    if (!clientId) { setForm((f) => ({ ...f, clientId: "", clientName: "" })); return; }
    const c = clients.find((x) => x.id === clientId);
    if (c) setForm((f) => ({ ...f, clientId, clientName: c.clientName }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName.trim() || !form.itemsTaken.trim()) return;
    if (cfg.invoice.enabled && cfg.invoice.required && !form.invoiceAction && !editId) { setError(cfg.invoice.missingMessage); return; }
    const pct = cfg.discount.enabled && form.hasDiscount ? Number(form.discountPercent) : 0;
    if (cfg.discount.enabled && form.hasDiscount && (!Number.isFinite(pct) || pct <= 0 || pct > 100)) { setError(`Enter a discount between 1 and 100 percent, or choose “${cfg.discount.noLabel}”.`); return; }
    setSaving(true); setError(null);
    try {
      // Only the parts that are switched on are sent, so saving never wipes a value the form doesn't show.
      const payload = {
        clientId: form.clientId || undefined, clientName: form.clientName.trim(), date: form.date || isoToday(), itemsTaken: form.itemsTaken.trim(),
        ...(cfg.qty.enabled && { qty: Number(form.qty) || 0 }),
        ...(cfg.transport.enabled && { transport: Number(form.transport) || 0 }),
        ...(cfg.paid.enabled && { paidStatus: form.paidStatus }),
        ...(cfg.invoice.enabled && { invoiceAction: form.invoiceAction || undefined }),
        ...(cfg.discount.enabled && { discountPercent: pct }),
      };
      if (editId) await update(editId, payload); else await add(payload as Omit<DiaryEntry, "id">); // the server fills in anything switched off
      setOpen(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this diary entry?")) return;
    await remove(id);
  }

  if (entriesLoading || clientsLoading) return <div className="py-20 text-center text-sm text-muted">Loading diary…</div>;

  return (
    <div className="space-y-8">
      <PageHeader title="Diary" description={cfg.pageDescription} actionLabel="New entry" onAction={openCreate} />
      <div className={`grid grid-cols-1 gap-4 ${cfg.paid.enabled ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <StatCard id="diary.entries" label="Entries logged" value={String(entries.length)} />
        <StatCard id="diary.last7" label="Last 7 days" value={String(last7)} />
        {cfg.paid.enabled && <StatCard id="diary.outstanding" label="Outstanding" value={String(outstanding)} hint={outstanding ? "Not fully paid" : "All settled"} />}
      </div>
      <SearchFilterBar
        searchValue={search} onSearchChange={setSearch} searchPlaceholder={`Search by client or ${cfg.itemsLabel.toLowerCase()}…`}
        {...(cfg.paid.enabled ? { filterValue: paidFilter, onFilterChange: setPaidFilter, filterOptions: paidOptions } : {})}
      />

      {sorted.length === 0 ? (
        <EmptyState icon={NotebookPen} title="No entries yet" description="Log what a client took today — items, quantity, transport, and payment status." actionLabel="Write an entry" onAction={openCreate} />
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-10 text-center text-sm text-muted">No entries match your search or filter.</p>
      ) : (
        <ol className="space-y-3">
          {filtered.map((entry) => {
            const idx = sorted.findIndex((e) => e.id === entry.id);
            return (
              <li key={entry.id} className="group rounded-lg border border-hairline bg-surface px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <RefTag>DIA-{String(sorted.length - idx).padStart(3, "0")}</RefTag>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-ink">
                          {entry.clientId ? <Link href={`/clients/${entry.clientId}`} className="hover:underline">{entry.clientName}</Link> : entry.clientName}
                        </p>
                        <PaidBadge status={entry.paidStatus} />
                      </div>
                      {(cfg.invoice.enabled || cfg.discount.enabled) && <div className="mt-1.5 flex flex-wrap items-center gap-2"><DiaryTags invoiceAction={entry.invoiceAction} discountPercent={entry.discountPercent} /></div>}
                      <p className="mt-1.5 font-mono text-xs text-muted">{fmtDate(entry.date)}</p>
                      <p className="mt-2 text-sm text-text/80">{[entry.itemsTaken, cfg.qty.enabled ? `${cfg.qty.label} ${entry.qty}` : null, cfg.transport.enabled && entry.transport ? `${cfg.transport.label} ${fmtKsh(entry.transport)}` : null].filter(Boolean).join(" · ")}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => openEdit(entry)} aria-label="Edit entry" title="Edit entry" className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(entry.id)} aria-label="Delete entry" title="Delete entry" className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger"><Trash2 size={15} /></button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} title={editId ? "Edit entry" : "New diary entry"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SelectField label="Client" value={form.clientId} onChange={(e) => pickClient(e.target.value)}>
            <option value="">+ One-off client</option>
            {sortedClients.map((c) => <option key={c.id} value={c.id}>{c.clientName}</option>)}
          </SelectField>
          {!form.clientId && <TextField label="Client name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="e.g. Mary W." required autoFocus />}
          <TextField label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          <TextField label={cfg.itemsLabel} value={form.itemsTaken} onChange={(e) => setForm({ ...form, itemsTaken: e.target.value })} placeholder="e.g. Helmet — full face" required />
          {(cfg.qty.enabled || cfg.transport.enabled) && (
            <div className={`grid gap-4 ${cfg.qty.enabled && cfg.transport.enabled ? "grid-cols-2" : "grid-cols-1"}`}>
              {cfg.qty.enabled && <TextField label={cfg.qty.label} type="number" min={0} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />}
              {cfg.transport.enabled && <TextField label={`${cfg.transport.label} (KSh)`} type="number" min={0} value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} />}
            </div>
          )}
          {cfg.paid.enabled && (
            <SelectField label={cfg.paid.title} value={form.paidStatus} onChange={(e) => setForm({ ...form, paidStatus: e.target.value as PaidStatus })}>
              <option value="unpaid">{cfg.paid.labels.unpaid}</option><option value="partial">{cfg.paid.labels.partial}</option><option value="paid">{cfg.paid.labels.paid}</option>
            </SelectField>
          )}

          {cfg.invoice.enabled && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">{cfg.invoice.title} {cfg.invoice.required && !editId && <span className="text-danger">*</span>}</legend>
            <p className="text-xs text-muted">{cfg.invoice.question}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {/* Options the admin switched off are not offered, except the one this entry already has. */}
              {INVOICE_KEYS.filter((k) => cfg.invoice.actions[k].enabled || form.invoiceAction === k).map((k) => {
                const o = cfg.invoice.actions[k];
                const active = form.invoiceAction === k;
                return (
                  <label key={k} className={`cursor-pointer rounded-md border px-3 py-2.5 text-sm transition ${active ? "border-accent bg-accent/10 ring-1 ring-accent" : "border-hairline hover:bg-canvas"}`}>
                    <input type="radio" name="invoiceAction" value={k} checked={active} onChange={() => setForm({ ...form, invoiceAction: k })} className="sr-only" />
                    <span className="flex items-center gap-1.5 font-medium text-ink"><DynamicIcon name={o.icon} size={14} />{o.label}</span>
                    <span className="block text-xs text-muted">{o.hint}</span>
                  </label>
                );
              })}
            </div>
            {editId && !form.invoiceAction && <p className="text-xs text-muted">{cfg.invoice.oldEntryMessage}</p>}
          </fieldset>
          )}

          {cfg.discount.enabled && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">{cfg.discount.title}</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className={`cursor-pointer rounded-md border px-3 py-2.5 text-center text-sm font-medium transition ${!form.hasDiscount ? "border-accent bg-accent/10 ring-1 ring-accent" : "border-hairline hover:bg-canvas"}`}>
                <input type="radio" name="discountMode" checked={!form.hasDiscount} onChange={() => setForm({ ...form, hasDiscount: false, discountPercent: "" })} className="sr-only" />
                {cfg.discount.noLabel}
              </label>
              <label className={`cursor-pointer rounded-md border px-3 py-2.5 text-center text-sm font-medium transition ${form.hasDiscount ? "border-accent bg-accent/10 ring-1 ring-accent" : "border-hairline hover:bg-canvas"}`}>
                <input type="radio" name="discountMode" checked={form.hasDiscount} onChange={() => setForm({ ...form, hasDiscount: true })} className="sr-only" />
                {cfg.discount.yesLabel}
              </label>
            </div>
            {form.hasDiscount && (
              <div className="space-y-2">
                <TextField label="Discount (%)" type="number" min={1} max={100} step="0.5" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} placeholder="e.g. 10" autoFocus />
                <div className="flex flex-wrap gap-2">
                  {cfg.discount.quick.map((q) => (
                    <button key={q} type="button" onClick={() => setForm({ ...form, discountPercent: String(q) })} className={`rounded-full border px-3 py-1 text-xs font-medium ${form.discountPercent === String(q) ? "border-accent bg-accent/10 text-accent" : "border-hairline text-muted hover:bg-canvas"}`}>{q}%</button>
                  ))}
                </div>
              </div>
            )}
          </fieldset>
          )}

          {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="flex-1 rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-60">{saving ? "Saving…" : editId ? "Save changes" : "Add entry"}</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-hairline px-4 py-2 text-sm font-medium text-muted hover:bg-canvas">Cancel</button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
