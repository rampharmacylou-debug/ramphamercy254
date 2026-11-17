"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Lock, ShieldCheck, Users } from "lucide-react";
import { useAppearance } from "@/lib/appearanceContext";
import { InstallAppButton } from "@/components/InstallApp";

type Mode = "staff" | "admin";

export default function LoginForm({ initialMode, next }: { initialMode: Mode; next: string | null }) {
  const { appName } = useAppearance();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestAllowed, setGuestAllowed] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);

  // If the admin switched staff sign-in off, offer a way in without an account.
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setGuestAllowed(d.staffLoginRequired === false))
      .catch(() => {});
  }, []);

  function switchMode(m: Mode) {
    setMode(m);
    setError("");
    setPassword("");
    setTimeout(() => firstField.current?.focus(), 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || (mode === "staff" && !username.trim())) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(mode === "staff" ? "/api/auth/staff-login" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "staff" ? { username, password } : { password }),
      });
      if (res.ok) {
        window.location.assign(next ?? (mode === "staff" ? "/staff" : "/products"));
        return;
      }
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not sign in.");
      setPassword("");
      firstField.current?.focus();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  const tabClass = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
      active ? "bg-ink text-surface shadow-sm" : "text-muted hover:text-ink"
    }`;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-8">
      <div className="w-full max-w-sm rounded-xl border border-hairline bg-surface p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink text-surface">
            <Lock size={18} />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold tracking-tight text-ink">Sign in</h1>
            <p className="truncate text-xs text-muted">{appName}</p>
          </div>
        </div>

        <div role="tablist" aria-label="Who is signing in" className="mb-4 flex gap-1 rounded-lg border border-hairline bg-canvas p-1">
          <button type="button" role="tab" aria-selected={mode === "staff"} onClick={() => switchMode("staff")} className={tabClass(mode === "staff")}>
            <Users size={14} /> Staff
          </button>
          <button type="button" role="tab" aria-selected={mode === "admin"} onClick={() => switchMode("admin")} className={tabClass(mode === "admin")}>
            <ShieldCheck size={14} /> Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "staff" && (
            <input
              ref={firstField}
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              placeholder="Username"
              aria-label="Username"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              className="w-full rounded-md border border-hairline bg-white px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
            />
          )}

          <div className="relative">
            <input
              ref={mode === "admin" ? firstField : undefined}
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder={mode === "admin" ? "Admin password" : "Password"}
              aria-label={mode === "admin" ? "Admin password" : "Password"}
              autoFocus={mode === "admin"}
              autoComplete="current-password"
              className="w-full rounded-md border border-hairline bg-white py-2.5 pl-3 pr-11 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center text-muted hover:text-ink"
              tabIndex={-1}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password || (mode === "staff" && !username.trim())}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-60"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
            {loading ? "Checking…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted">
          {mode === "staff"
            ? "Forgot your password? Ask the admin to reset it."
            : "The admin password is set in Settings (or in the .env file)."}
        </p>

        {guestAllowed && (
          <Link href="/staff/products" className="mt-3 block text-center text-xs text-muted hover:text-ink hover:underline">
            Continue to the staff view without signing in →
          </Link>
        )}

        <div className="mt-4 border-t border-hairline pt-4 empty:hidden">
          <InstallAppButton variant="link" iosHelp />
        </div>
      </div>
    </div>
  );
}
