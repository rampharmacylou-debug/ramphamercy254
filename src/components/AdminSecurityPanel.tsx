"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, MonitorCheck, Trash2 } from "lucide-react";
import { useRole } from "@/lib/roleContext";

type Device = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  isThisMachine: boolean;
};

type Msg = { kind: "success" | "error"; text: string } | null;

const inputCls =
  "w-full rounded-md border border-hairline bg-white px-3 py-2 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/40";

function Banner({ msg }: { msg: Msg }) {
  if (!msg) return null;
  const ok = msg.kind === "success";
  return (
    <p
      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
        ok ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"
      }`}
    >
      {ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
      <span>{msg.text}</span>
    </p>
  );
}

export default function AdminSecurityPanel() {
  const { refresh } = useRole();

  // ── change password ────────────────────────────────────────────────────────
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (next !== confirm) {
      setPwMsg({ kind: "error", text: "The new passwords don't match." });
      return;
    }
    setPwBusy(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Could not change the password.");
      setCurrent(""); setNext(""); setConfirm("");
      setPwMsg({ kind: "success", text: "Admin password changed." });
    } catch (err) {
      setPwMsg({ kind: "error", text: err instanceof Error ? err.message : "Could not change the password." });
    } finally {
      setPwBusy(false);
    }
  }

  // ── trusted machines ───────────────────────────────────────────────────────
  const [devices, setDevices] = useState<Device[]>([]);
  const [label, setLabel] = useState("");
  const [devBusy, setDevBusy] = useState(false);
  const [devMsg, setDevMsg] = useState<Msg>(null);

  const loadDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/devices", { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      setDevices(d.devices ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadDevices(); }, [loadDevices]);

  const thisTrusted = devices.some((d) => d.isThisMachine);

  async function trustThisMachine(e: React.FormEvent) {
    e.preventDefault();
    setDevMsg(null);
    setDevBusy(true);
    try {
      const res = await fetch("/api/auth/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Could not trust this machine.");
      setLabel("");
      setDevMsg({ kind: "success", text: "This machine is now trusted and won't be asked for the password." });
      await loadDevices();
      await refresh();
    } catch (err) {
      setDevMsg({ kind: "error", text: err instanceof Error ? err.message : "Could not trust this machine." });
    } finally {
      setDevBusy(false);
    }
  }

  async function removeDevice(d: Device) {
    const warn = d.isThisMachine
      ? `Stop trusting THIS machine (“${d.label}”)? You'll need the password to get back into Admin on it.`
      : `Stop trusting “${d.label}”? It will need the password again.`;
    if (!window.confirm(warn)) return;
    setDevMsg(null);
    const res = await fetch(`/api/auth/devices?id=${encodeURIComponent(d.id)}`, { method: "DELETE" });
    if (!res.ok) {
      setDevMsg({ kind: "error", text: "Could not remove that machine." });
      return;
    }
    await loadDevices();
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div className="border-t border-hairline pt-6">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink">Admin security</h2>
        <p className="mt-1 text-sm text-muted">
          Who can open the Admin area. Staff view never needs a password.
        </p>
      </div>

      {/* Password */}
      <div className="rounded-lg border border-hairline bg-surface p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <KeyRound size={18} className="text-accent" />
          <h3 className="font-display text-base font-semibold text-ink">Admin password</h3>
        </div>
        <p className="text-sm text-muted">
          Until you change it here, the password is the <code>ADMIN_PASSWORD</code> value in the{" "}
          <code>.env</code> file. After you change it here, this one is used instead.
        </p>
        <form onSubmit={changePassword} className="grid max-w-md gap-3">
          <input type="password" autoComplete="current-password" placeholder="Current password"
            value={current} onChange={(e) => setCurrent(e.target.value)} className={inputCls} />
          <input type="password" autoComplete="new-password" placeholder="New password (8+ characters)"
            value={next} onChange={(e) => setNext(e.target.value)} className={inputCls} />
          <input type="password" autoComplete="new-password" placeholder="Repeat new password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
          <Banner msg={pwMsg} />
          <div>
            <button
              type="submit"
              disabled={pwBusy || !current || !next || !confirm}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-60"
            >
              {pwBusy ? "Saving…" : "Change password"}
            </button>
          </div>
        </form>
      </div>

      {/* Trusted machines */}
      <div className="rounded-lg border border-hairline bg-surface p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <MonitorCheck size={18} className="text-accent" />
          <h3 className="font-display text-base font-semibold text-ink">Trusted machines</h3>
        </div>
        <p className="text-sm text-muted">
          A trusted machine opens Admin <b>without</b> the password. Open the app on that PC, sign in,
          and press <b>Trust this machine</b> below. It applies to that one browser on that one PC — if
          you clear the browser&apos;s cookies or use a different browser, you&apos;ll need the password
          (or to trust it again). Only trust PCs that staff cannot use freely.
        </p>

        {!thisTrusted ? (
          <form onSubmit={trustThisMachine} className="flex max-w-md flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Name for this machine, e.g. Back-office PC"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={60}
              className={`${inputCls} flex-1 min-w-[220px]`}
            />
            <button
              type="submit"
              disabled={devBusy || !label.trim()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-60"
            >
              {devBusy ? "Saving…" : "Trust this machine"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-success">This machine is trusted.</p>
        )}

        <Banner msg={devMsg} />

        {devices.length === 0 ? (
          <p className="text-sm text-muted">No trusted machines yet.</p>
        ) : (
          <ul className="divide-y divide-hairline rounded-md border border-hairline">
            {devices.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-ink">
                    {d.label}
                    {d.isThisMachine && (
                      <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                        This machine
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    Added {new Date(d.createdAt).toLocaleDateString()}
                    {d.lastUsedAt ? ` · last used ${new Date(d.lastUsedAt).toLocaleString()}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => removeDevice(d)}
                  className="flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-muted hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 size={13} />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
