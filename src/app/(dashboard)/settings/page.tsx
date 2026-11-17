"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Cloud, HardDrive, Database, PlayCircle, Download, Clock } from "lucide-react";
import { useRole } from "@/lib/roleContext";
import AdminSecurityPanel from "@/components/AdminSecurityPanel";
import StaffTabsPanel from "@/components/StaffTabsPanel";
import StaffAccessPanel from "@/components/StaffAccessPanel";
import DiarySettingsPanel from "@/components/DiarySettingsPanel";
import SearchDisplayPanel from "@/components/SearchDisplayPanel";
import AppearancePanel from "@/components/AppearancePanel";

type BackupSettings = {
  id: string;
  enabled: boolean;
  backupTime: string;
  timezone: string;
  lastCheckAt: string | null;
  lastCheckSource: string | null;
  backupToGoogleDrive: boolean;
  backupToLocalFolder: boolean;
  localFolderPath: string | null;
  includeDatabaseDump: boolean;
  lastRunAt: string | null;
  lastStatus: "success" | "error" | null;
  lastError: string | null;
  lastFileUrl: string | null;
  lastLocalPath: string | null;
};

type SchedulerInfo = {
  started: boolean;
  lastTickAt: string | null;
  lastTickError: string | null;
  running: boolean;
  nextRunAt: string | null;
  dueNow: boolean;
  serverTime: string;
  timezone: string;
  cronConfigured: boolean;
  onVercel: boolean;
};

type Banner = { kind: "success" | "error"; message: string };

export default function SettingsPage() {
  const { isAdmin } = useRole();

  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [driveConfigured, setDriveConfigured] = useState(true);
  const [scheduler, setScheduler] = useState<SchedulerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingDump, setDownloadingDump] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);

  // Local, editable copies of the form fields
  const [enabled, setEnabled] = useState(false);
  const [backupTime, setBackupTime] = useState("20:00");
  const [toDrive, setToDrive] = useState(true);
  const [toLocal, setToLocal] = useState(false);
  const [localPath, setLocalPath] = useState("");
  const [includeDump, setIncludeDump] = useState(false);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(t);
  }, [banner]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/backup", { cache: "no-store" });
      const data = await res.json();
      const s: BackupSettings = data.settings;
      setSettings(s);
      setDriveConfigured(Boolean(data.driveConfigured));
      setScheduler(data.scheduler ?? null);
      setEnabled(s.enabled);
      setBackupTime(s.backupTime);
      setToDrive(s.backupToGoogleDrive);
      setToLocal(s.backupToLocalFolder);
      setLocalPath(s.localFolderPath ?? "");
      setIncludeDump(s.includeDatabaseDump);
    } catch {
      setBanner({ kind: "error", message: "Could not load backup settings." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    if (toLocal && !localPath.trim()) {
      setBanner({ kind: "error", message: "Enter a folder path before turning on local-folder backups." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/backup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          backupTime,
          // The time above is read in YOUR time zone, not the server's.
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          backupToGoogleDrive: toDrive,
          backupToLocalFolder: toLocal,
          localFolderPath: localPath,
          includeDatabaseDump: includeDump,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save.");
      setSettings(data.settings);
      setScheduler(data.scheduler ?? null);
      setBanner({ kind: "success", message: "Backup settings saved." });
    } catch (err) {
      setBanner({ kind: "error", message: err instanceof Error ? err.message : "Failed to save." });
    } finally {
      setSaving(false);
    }
  }

  async function handleRunNow() {
    setRunning(true);
    try {
      const res = await fetch("/api/settings/backup/run", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Backup failed.");
      const parts = [
        data.fileUrl ? "uploaded to Drive" : null,
        data.localPath ? `saved to ${data.localPath}` : null,
      ].filter(Boolean);
      setBanner({ kind: "success", message: `Backup complete — ${parts.join(" and ")}.` });
      await load();
    } catch (err) {
      setBanner({ kind: "error", message: err instanceof Error ? err.message : "Backup failed." });
    } finally {
      setRunning(false);
    }
  }

  async function downloadFile(url: string, fallbackName: string) {
    const res = await fetch(url);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Download failed.");
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="(.+)"/);
    const fileName = match?.[1] ?? fallbackName;

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  }

  async function handleDownloadNow() {
    setDownloading(true);
    try {
      await downloadFile("/api/settings/backup/download", "Manifest-Backup.xlsx");
    } catch (err) {
      setBanner({ kind: "error", message: err instanceof Error ? err.message : "Download failed." });
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadDumpNow() {
    setDownloadingDump(true);
    try {
      await downloadFile("/api/settings/backup/download-dump", "Manifest-Database-Backup.sql");
    } catch (err) {
      setBanner({ kind: "error", message: err instanceof Error ? err.message : "Download failed." });
    } finally {
      setDownloadingDump(false);
    }
  }

  const scheduleDirty =
    settings !== null && (enabled !== settings.enabled || backupTime !== settings.backupTime);

  function fmtNext(iso: string | null, dueNow: boolean, tz: string) {
    if (!iso) return null;
    if (dueNow) return "due now — will start within a minute";
    const d = new Date(iso);
    const day = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: tz });
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: tz });
    return day(d) === day(new Date()) ? `today at ${time}` : `tomorrow at ${time}`;
  }

  // Something (the app's timer, or the external trigger) should check the schedule every minute.
  const lastCheck = settings?.lastCheckAt ? new Date(settings.lastCheckAt) : null;
  // The Google Apps Script checks every 15 minutes; the app timer / cron-job.org check every minute.
  const maxGapMs = settings?.lastCheckSource === "apps-script" ? 35 * 60_000 : 3 * 60_000;
  const checkerAlive = lastCheck !== null && Date.now() - lastCheck.getTime() < maxGapMs;

  if (loading) return <div className="py-20 text-center text-sm text-muted">Loading settings…</div>;

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-10 text-center text-sm text-muted">
        Switch to Admin to manage backup settings.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-hairline pb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">Backups — where they go, what they include, and when.</p>
      </div>

      {banner && (
        <div className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${
          banner.kind === "success"
            ? "border-success/30 bg-success/10 text-success"
            : "border-danger/30 bg-danger/10 text-danger"
        }`}>
          {banner.kind === "success"
            ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
            : <AlertCircle size={17} className="mt-0.5 shrink-0" />}
          <span>{banner.message}</span>
        </div>
      )}

      {/* Quick, no-settings-needed downloads */}
      <div className="rounded-lg border border-hairline bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Download Excel now</h2>
            <p className="mt-1 text-sm text-muted">
              Products + Clients, exported right now, straight to your Downloads folder — no setup needed.
            </p>
          </div>
          <button
            onClick={handleDownloadNow}
            disabled={downloading}
            className="flex items-center gap-1.5 rounded-md border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-60"
          >
            <Download size={15} />
            {downloading ? "Preparing…" : "Download .xlsx"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
          <div>
            <h2 className="flex items-center gap-1.5 font-display text-base font-semibold text-ink">
              <Database size={15} />
              Download full database backup now
            </h2>
            <p className="mt-1 text-sm text-muted">
              Every table, not just Products/Clients — a raw <code>pg_dump</code> file, downloaded
              straight to your PC. Requires <code>pg_dump</code> to be installed (it is, alongside PostgreSQL).
            </p>
          </div>
          <button
            onClick={handleDownloadDumpNow}
            disabled={downloadingDump}
            className="flex items-center gap-1.5 rounded-md border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-60"
          >
            <Download size={15} />
            {downloadingDump ? "Running pg_dump…" : "Download .sql"}
          </button>
        </div>
      </div>

      {/* Destinations + schedule */}
      <div className="rounded-lg border border-hairline bg-surface p-5 space-y-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Cloud size={18} className="text-accent" />
            <h2 className="font-display text-base font-semibold text-ink">Backup destinations</h2>
          </div>
          <p className="mt-1.5 text-sm text-muted">
            Pick where backups should go. Both can be on at once. The daily schedule below and the
            &quot;Run backup now&quot; button both use whatever is checked here.
          </p>
        </div>

        {!driveConfigured && toDrive && (
          <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>
              Google Drive isn&apos;t configured yet. Set <code>GOOGLE_OAUTH_CLIENT_ID</code>,{" "}
              <code>GOOGLE_OAUTH_CLIENT_SECRET</code>, <code>GOOGLE_OAUTH_REFRESH_TOKEN</code> and{" "}
              <code>GOOGLE_DRIVE_FOLDER_ID</code> in your <code>.env</code> file, then restart the app.
            </span>
          </div>
        )}

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={toDrive}
            onChange={(e) => setToDrive(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-hairline accent-[var(--color-accent,theme(colors.blue.600))]"
          />
          <span>
            <span className="block font-medium text-ink">Upload to Google Drive</span>
            <span className="block text-muted">Goes to the shared backup folder configured in .env.</span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={toLocal}
            onChange={(e) => setToLocal(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-hairline accent-[var(--color-accent,theme(colors.blue.600))]"
          />
          <span className="flex-1">
            <span className="block font-medium text-ink">Save to a folder on this PC</span>
            <span className="block text-muted">
              Written directly to a folder on the server machine — useful for scheduled backups
              since there&apos;s no browser open to download into.
            </span>
            {toLocal && (
              <input
                type="text"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                placeholder="e.g. C:\ManifestBackups"
                className="mt-2 w-full rounded-md border border-hairline bg-white px-3 py-2 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
              />
            )}
          </span>
        </label>

        <label className={`flex items-start gap-3 text-sm ${!toLocal ? "opacity-50" : ""}`}>
          <input
            type="checkbox"
            checked={includeDump}
            disabled={!toLocal}
            onChange={(e) => setIncludeDump(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-hairline accent-[var(--color-accent,theme(colors.blue.600))]"
          />
          <span>
            <span className="flex items-center gap-1.5 font-medium text-ink">
              <Database size={14} />
              Also create a full database backup (pg_dump)
            </span>
            <span className="block text-muted">
              A complete raw copy of every table — not just Products/Clients — saved as a{" "}
              <code>.sql</code> file in the same local folder. Requires{" "}
              <code>pg_dump</code> to be installed (it is, alongside PostgreSQL).
              {!toLocal && " Turn on \u201cSave to a folder on this PC\u201d to use this."}
            </span>
          </span>
        </label>

        <div className="border-t border-hairline pt-5">
          <div className="flex items-center gap-2.5">
            <HardDrive size={18} className="text-accent" />
            <h2 className="font-display text-base font-semibold text-ink">Daily schedule</h2>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => setEnabled((v) => !v)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  enabled ? "bg-accent" : "bg-hairline"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    enabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-ink">
                {enabled ? "Daily backup enabled" : "Daily backup disabled"}
              </span>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium text-ink">Backup time</span>
              <input
                type="time"
                value={backupTime}
                onChange={(e) => setBackupTime(e.target.value)}
                className="rounded-md border border-hairline bg-white px-3 py-1.5 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
              />
            </label>
          </div>
        </div>

        {scheduleDirty && (
          <p className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>
              You changed the schedule but haven&apos;t saved it. Click <b>Save settings</b> —
              until then the timer keeps using the old time.
            </span>
          </p>
        )}

        {scheduler && (
          <div className="rounded-md bg-canvas px-3 py-2.5 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-ink">
              <Clock size={14} />
              {settings?.enabled
                ? `Next automatic backup: ${fmtNext(scheduler.nextRunAt, scheduler.dueNow, scheduler.timezone) ?? "—"}`
                : "Automatic backup is off (turn it on and click Save settings)."}
            </p>
            <p className="mt-1 text-xs text-muted">
              Time zone: {scheduler.timezone}.{" "}
              {lastCheck
                ? `Last check of the schedule: ${lastCheck.toLocaleTimeString()} (${settings?.lastCheckSource === "apps-script" ? "Google Apps Script" : settings?.lastCheckSource === "external" ? "external trigger" : "app timer"}).`
                : "The schedule has not been checked yet."}
            </p>
            {scheduler.lastTickError && (
              <p className="mt-1 text-xs text-danger">Timer error: {scheduler.lastTickError}</p>
            )}
          </div>
        )}

        {scheduler && settings?.enabled && !checkerAlive && (
          <div className="space-y-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
            <p className="flex items-start gap-2">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>
                Nothing has checked the schedule in the last few minutes, so the backup will not start by
                itself.{" "}
                {scheduler.onVercel
                  ? "This app runs on Vercel, which cannot keep a timer running. Set up the free trigger below."
                  : "Restart the app (Windows Service), or set up the free trigger below."}
              </span>
            </p>
            <details className="text-xs text-ink">
              <summary className="cursor-pointer font-medium">
                Recommended for Vercel + Google Drive: Google Apps Script (no tokens to expire)
              </summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>
                  Make sure <code>CRON_SECRET</code> is set on the server
                  {scheduler.cronConfigured ? " (already set)" : ""}.
                </li>
                <li>
                  Open <code>scripts/apps-script/Code.gs</code> from the project, paste it into a new
                  project at <b>script.google.com</b>, and follow the steps written at the top of the file.
                </li>
                <li>
                  The script runs in your Google account every 15 minutes, uses the time saved above, and
                  saves the Excel backup into your Drive folder. This message disappears once it has checked in.
                </li>
              </ol>
            </details>
            <details className="text-xs text-ink">
              <summary className="cursor-pointer font-medium">Alternative: a pinger such as cron-job.org</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>
                  Add an environment variable <code>CRON_SECRET</code> with a long random value
                  {scheduler.cronConfigured ? " (already set)" : ""}, then restart or redeploy the app.
                </li>
                <li>
                  Create a free job on <b>cron-job.org</b> that opens this address every 1 minute:
                  <br />
                  <code className="break-all">
                    {typeof window !== "undefined" ? window.location.origin : ""}/api/cron/backup?key=YOUR_CRON_SECRET
                  </code>
                </li>
                <li>It does nothing until the backup time is reached, so calling it every minute is safe.</li>
                {scheduler.onVercel && (
                  <li>On Vercel use Google Drive as the destination (a local folder is not available there).</li>
                )}
              </ol>
            </details>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          <button
            onClick={handleRunNow}
            disabled={running}
            className="flex items-center gap-1.5 rounded-md border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-60"
          >
            <PlayCircle size={15} />
            {running ? "Running…" : "Run backup now"}
          </button>
        </div>

        {settings?.lastRunAt && (
          <div className="border-t border-hairline pt-4 text-sm">
            <p className="text-muted">
              Last run: <span className="text-ink">{new Date(settings.lastRunAt).toLocaleString()}</span>{" "}
              —{" "}
              <span className={settings.lastStatus === "success" ? "text-success" : "text-danger"}>
                {settings.lastStatus === "success" ? "Success" : "Failed"}
              </span>
            </p>
            {settings.lastStatus === "error" && settings.lastError && (
              <p className="mt-1 text-danger">{settings.lastError}</p>
            )}
            {settings.lastFileUrl && (
              <a
                href={settings.lastFileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-accent hover:underline"
              >
                Open latest Drive backup →
              </a>
            )}
            {settings.lastLocalPath && (
              <p className="mt-1 text-muted">Local copy saved to: {settings.lastLocalPath}</p>
            )}
          </div>
        )}
      </div>

      <AppearancePanel />

      <StaffAccessPanel />

      <StaffTabsPanel />

      <SearchDisplayPanel />

      <DiarySettingsPanel />

      <AdminSecurityPanel />
    </div>
  );
}
