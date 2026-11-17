"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, X } from "lucide-react";

/*
 * Installable-app helpers.
 *  - <PwaRegister /> sits once in the root layout: it starts the service worker and remembers the
 *    browser's "you can install this" offer so a button can use it later, on any page.
 *  - <InstallAppButton /> shows an "Install app" button only when installing is actually possible
 *    (it hides itself once the app is installed or when opened from the installed app).
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const canPrompt = () => deferredPrompt !== null;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// iPhone/iPad Safari has no install offer; people add it from the Share menu instead.
function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function PwaRegister() {
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep it for our own button instead of the browser's mini bar
      deferredPrompt = e as InstallPromptEvent;
      notify();
    };
    const onInstalled = () => {
      deferredPrompt = null;
      notify();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // Only in the real (built) site; during `npm run dev` it would get in the way of live reloading.
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return null;
}

type Variant = "light" | "dark" | "link";

const STYLES: Record<Variant, string> = {
  light:
    "flex h-9 items-center gap-1.5 rounded-md border border-hairline bg-surface px-3 text-xs font-medium text-ink hover:bg-ink/5",
  dark:
    "flex h-9 items-center gap-1.5 rounded-md border border-white/20 px-3 text-xs text-surface/80 hover:bg-white/5 hover:text-surface",
  link: "mx-auto flex items-center justify-center gap-1.5 text-xs font-medium text-accent hover:underline",
};

export function InstallAppButton({
  variant = "light",
  iosHelp = false,
  compact = false,
}: {
  variant?: Variant;
  /** Also offer the "Add to Home Screen" steps on iPhone/iPad. */
  iosHelp?: boolean;
  /** Icon only on small screens. */
  compact?: boolean;
}) {
  const promptReady = useSyncExternalStore(subscribe, canPrompt, () => false);
  const [mounted, setMounted] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStandalone(isStandalone());
    setIos(isIosSafari());
  }, []);

  if (!mounted || standalone) return null;
  const offerIos = iosHelp && ios && !promptReady;
  if (!promptReady && !offerIos) return null;

  async function install() {
    if (offerIos) {
      setShowIos(true);
      return;
    }
    const e = deferredPrompt;
    if (!e) return;
    await e.prompt();
    await e.userChoice.catch(() => null);
    deferredPrompt = null; // the offer can only be used once
    notify();
  }

  return (
    <>
      <button type="button" onClick={install} className={STYLES[variant]} aria-label="Install app">
        <Download size={14} className="shrink-0" />
        <span className={compact ? "hidden sm:inline" : undefined}>Install app</span>
      </button>

      {showIos && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Install on iPhone or iPad">
          <div className="w-full max-w-sm rounded-xl bg-surface p-5 text-ink shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-base font-semibold">Install on iPhone or iPad</p>
              <button onClick={() => setShowIos(false)} aria-label="Close" className="rounded-md p-1.5 text-muted hover:bg-ink/5">
                <X size={16} />
              </button>
            </div>
            <ol className="space-y-2 text-sm text-text">
              <li className="flex items-start gap-2">
                <span className="font-semibold">1.</span>
                <span>
                  Tap the <Share size={14} className="inline -mt-0.5" /> <strong>Share</strong> button at the bottom of Safari.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">2.</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">3.</span>
                <span>Tap <strong>Add</strong>. The app appears on your home screen.</span>
              </li>
            </ol>
            <button onClick={() => setShowIos(false)} className="mt-4 w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-surface hover:bg-accent/90">
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
