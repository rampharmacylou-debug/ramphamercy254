"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle, AlertTriangle, CheckCircle2, KeyRound, LogOut, Plus, ShieldCheck, Trash2, Unlock, UserCheck, UserX, Users, Wand2,
} from "lucide-react";

type StaffUser = {
  id: string;
  username: string;
  name: string | null;
  active: boolean;
  locked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};
type AccessSettings = { requireLogin: boolean; sessionHours: number };
type Msg = { kind: "success" | "error"; text: string } | null;

const SESSION_OPTIONS = [
  { hours: 1, label: "1 hour" },
  { hours: 4, label: "4 hours" },
  { hours: 8, label: "8 hours (one shift)" },
  { hours: 12, label: "12 hours" },
  { hours: 24, label: "1 day" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" },
];

const inputCls =
  "w-full rounded-md border border-hairline bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/40";
const btnCls =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-hairline px-3 py-2 text-xs font-medium text-ink hover:bg-canvas disabled:opacity-50";

function Banner({ msg }: { msg: Msg }) {
  if (!msg) return null;
  const ok = msg.kind === "success";
  return (
    <p
      role="status"
      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
        ok ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"
      }`}
    >
      {ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" />}
      <span>{msg.text}</span>
    </p>
  );
}

// Easy-to-read password: no look-alike letters (0/O, 1/l/I).
function generatePassword(length = 10) {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function when(iso: string | null) {
  if (!iso) return "Never signed in";
  return `Last signed in ${new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;
}

export default function StaffAccessPanel() {
  // ── sign-in rules ─────────────────────────────────────────────────────────
  const [access, setAccess] = useState<AccessSettings | null>(null);
  const [savedAccess, setSavedAccess] = useState<AccessSettings | null>(null);
  const [accessBusy, setAccessBusy] = useState(false);
  const [accessMsg, setAccessMsg] = useState<Msg>(null);

  // ── accounts ──────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<StaffUser[] | null>(null);
  const [listError, setListError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [userMsg, setUserMsg] = useState<Msg>(null);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState("");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/staff-users", { cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Could not load staff accounts.");
      setUsers(d.users);
      setListError("");
    } catch (e) {
      setUsers([]);
      setListError(e instanceof Error ? e.message : "Could not load staff accounts.");
    }
  }, []);

  useEffect(() => {
    loadUsers();
    fetch("/api/settings/staff-access", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setAccess(d.settings);
        setSavedAccess(d.settings);
      })
      .catch(() => {});
  }, [loadUsers]);

  async function saveAccess() {
    if (!access) return;
    setAccessBusy(true);
    setAccessMsg(null);
    try {
      const res = await fetch("/api/settings/staff-access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(access),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Could not save.");
      setSavedAccess(d.settings);
      setAccess(d.settings);
      setAccessMsg({ kind: "success", text: "Saved." });
    } catch (e) {
      setAccessMsg({ kind: "error", text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setAccessBusy(false);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setUserMsg(null);
    try {
      const res = await fetch("/api/settings/staff-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Could not create the account.");
      setUserMsg({
        kind: "success",
        text: `Account created. Give ${name.trim() || username.trim().toLowerCase()} the username “${username.trim().toLowerCase()}” and the password you chose.`,
      });
      setName(""); setUsername(""); setPassword("");
      await loadUsers();
    } catch (err) {
      setUserMsg({ kind: "error", text: err instanceof Error ? err.message : "Could not create the account." });
    } finally {
      setCreating(false);
    }
  }

  async function act(user: StaffUser, body: Record<string, unknown>, done: string) {
    setBusyId(user.id);
    setUserMsg(null);
    try {
      const res = await fetch(`/api/settings/staff-users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "That didn't work.");
      setUserMsg({ kind: "success", text: done });
      setResetFor(null);
      setResetPw("");
      await loadUsers();
    } catch (err) {
      setUserMsg({ kind: "error", text: err instanceof Error ? err.message : "That didn't work." });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(user: StaffUser) {
    if (!window.confirm(`Delete the account “${user.username}”? They will be signed out and can't sign in again.`)) return;
    setBusyId(user.id);
    setUserMsg(null);
    try {
      const res = await fetch(`/api/settings/staff-users/${user.id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Could not delete.");
      setUserMsg({ kind: "success", text: `Deleted ${user.username}.` });
      await loadUsers();
    } catch (err) {
      setUserMsg({ kind: "error", text: err instanceof Error ? err.message : "Could not delete." });
    } finally {
      setBusyId(null);
    }
  }

  const accessChanged =
    access && savedAccess && (access.requireLogin !== savedAccess.requireLogin || access.sessionHours !== savedAccess.sessionHours);

  return (
    <div className="space-y-4">
      <div className="border-t border-hairline pt-6">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink">Staff sign-in</h2>
        <p className="mt-1 text-sm text-muted">
          Staff sign in with their own username and password before they can see any pharmacy data. Create an account for
          each person, and switch it off or reset it any time.
        </p>
      </div>

      {/* Rules */}
      <div className="space-y-4 rounded-lg border border-hairline bg-surface p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={18} className="text-accent" />
          <h3 className="font-display text-base font-semibold text-ink">Sign-in rules</h3>
        </div>

        {access ? (
          <>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-text">
              <input
                type="checkbox"
                checked={access.requireLogin}
                onChange={(e) => { setAccess({ ...access, requireLogin: e.target.checked }); setAccessMsg(null); }}
                className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
              />
              <span>
                <b className="font-medium text-ink">Staff must sign in</b>
                <span className="block text-xs text-muted">Recommended. Without a sign-in, staff data is not protected.</span>
              </span>
            </label>

            {!access.requireLogin && (
              <p className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>
                  With sign-in off, <b>anyone who has the web address</b> can read the staff view (products, diary, clients,
                  transport). Only do this on a private network.
                </span>
              </p>
            )}

            <div className="max-w-xs">
              <label htmlFor="sessionHours" className="text-sm font-medium text-ink">Stay signed in for</label>
              <select
                id="sessionHours"
                value={access.sessionHours}
                onChange={(e) => { setAccess({ ...access, sessionHours: Number(e.target.value) }); setAccessMsg(null); }}
                className={`${inputCls} mt-1.5`}
              >
                {SESSION_OPTIONS.map((o) => <option key={o.hours} value={o.hours}>{o.label}</option>)}
              </select>
              <p className="mt-1 text-xs text-muted">Applies to the next time someone signs in.</p>
            </div>

            <Banner msg={accessMsg} />
            <button
              onClick={saveAccess}
              disabled={accessBusy || !accessChanged}
              className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-50"
            >
              {accessBusy ? "Saving…" : "Save sign-in rules"}
            </button>
          </>
        ) : (
          <p className="text-sm text-muted">Loading…</p>
        )}
      </div>

      {/* Accounts */}
      <div className="space-y-4 rounded-lg border border-hairline bg-surface p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <Users size={18} className="text-accent" />
          <h3 className="font-display text-base font-semibold text-ink">Staff accounts</h3>
        </div>

        {listError && <Banner msg={{ kind: "error", text: listError }} />}

        {users && users.length === 0 && !listError && (
          <p className="rounded-md border border-dashed border-hairline px-3 py-4 text-center text-sm text-muted">
            No staff accounts yet. Add the first one below. Until you do, staff cannot sign in.
          </p>
        )}

        <ul className="space-y-3">
          {users?.map((u) => {
            const busy = busyId === u.id;
            return (
              <li key={u.id} className={`rounded-md border border-hairline p-3 sm:p-4 ${u.active ? "" : "bg-canvas/60"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{u.name || u.username}</p>
                    <p className="truncate font-mono text-xs text-muted">{u.username}</p>
                    <p className="mt-0.5 text-xs text-muted">{when(u.lastLoginAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${u.active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                      {u.active ? "Active" : "Switched off"}
                    </span>
                    {u.locked && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">Paused (wrong passwords)</span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button className={btnCls} disabled={busy} onClick={() => { setResetFor(resetFor === u.id ? null : u.id); setResetPw(""); }}>
                    <KeyRound size={13} /> Reset password
                  </button>
                  <button
                    className={btnCls}
                    disabled={busy}
                    onClick={() =>
                      act(u, { action: "set-active", active: !u.active }, u.active ? `${u.username} is switched off and signed out.` : `${u.username} can sign in again.`)
                    }
                  >
                    {u.active ? <UserX size={13} /> : <UserCheck size={13} />} {u.active ? "Switch off" : "Switch on"}
                  </button>
                  <button className={btnCls} disabled={busy} onClick={() => act(u, { action: "sign-out" }, `${u.username} was signed out of every device.`)}>
                    <LogOut size={13} /> Sign out everywhere
                  </button>
                  {u.locked && (
                    <button className={btnCls} disabled={busy} onClick={() => act(u, { action: "unlock" }, `${u.username} can try again now.`)}>
                      <Unlock size={13} /> Unpause
                    </button>
                  )}
                  <button className={`${btnCls} border-danger/30 text-danger hover:bg-danger/10`} disabled={busy} onClick={() => remove(u)}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>

                {resetFor === u.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      value={resetPw}
                      onChange={(e) => setResetPw(e.target.value)}
                      placeholder="New password (8+ characters)"
                      aria-label={`New password for ${u.username}`}
                      autoComplete="off"
                      className={`${inputCls} min-w-[200px] flex-1`}
                    />
                    <button type="button" className={btnCls} onClick={() => setResetPw(generatePassword())}>
                      <Wand2 size={13} /> Make one
                    </button>
                    <button
                      className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-surface hover:bg-accent/90 disabled:opacity-50"
                      disabled={busy || resetPw.length < 8}
                      onClick={() => act(u, { action: "reset-password", password: resetPw }, `New password set for ${u.username}: ${resetPw}. Give it to them now; it can't be shown again.`)}
                    >
                      Set password
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <Banner msg={userMsg} />

        <form onSubmit={createUser} className="space-y-3 border-t border-hairline pt-4">
          <p className="text-sm font-medium text-ink">Add a staff account</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Mary W.)" aria-label="Name" maxLength={60} className={inputCls} />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username (e.g. mary)"
              aria-label="Username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={32}
              required
              className={inputCls}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (8+ characters)"
              aria-label="Password"
              autoComplete="off"
              required
              className={`${inputCls} min-w-[200px] flex-1`}
            />
            <button type="button" className={btnCls} onClick={() => setPassword(generatePassword())}>
              <Wand2 size={13} /> Make one
            </button>
          </div>
          <button
            type="submit"
            disabled={creating || username.trim().length < 3 || password.length < 8}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-50"
          >
            <Plus size={15} /> {creating ? "Adding…" : "Add account"}
          </button>
          <p className="text-xs text-muted">
            The password is stored scrambled and can&apos;t be looked up later, so write it down for them. Anyone can be given a
            new one with <b>Reset password</b>.
          </p>
        </form>
      </div>
    </div>
  );
}
