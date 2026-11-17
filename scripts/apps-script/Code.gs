// Google Apps Script for the Ram Pharmacy dashboard backup.
// Runs on Google's servers as YOU, so there are no tokens to expire and nothing to keep running.
//
// Every 15 minutes it asks your site "is the daily backup due?" (the time is the one you set in
// Settings -> Backups). When it is, the site sends the Excel file and this script saves it to
// your Drive folder, then tells the site it worked so Settings shows the result.
//
// SETUP (about 5 minutes)
//  1. https://script.google.com -> New project -> delete the sample code -> paste this whole file.
//  2. Fill in SITE_URL and DRIVE_FOLDER_ID below.
//       DRIVE_FOLDER_ID = the same value as GOOGLE_DRIVE_FOLDER_ID in your .env
//       (or open the Drive folder: the ID is the last part of its web address).
//  3. Project Settings (gear icon) -> Time zone -> Africa/Nairobi.
//     Same page -> Script properties -> Add property:  CRON_SECRET = same value as on the site.
//  4. In the editor pick `installTrigger` from the function list -> Run. Approve the permission
//     prompts (Google may say "unverified app" - that is just your own script: Advanced -> Go to...).
//  5. Pick `runBackupNow` -> Run. A backup file should appear in the Drive folder within seconds.
//  6. On the site: Settings -> turn on "Daily backup" and Save.

const SITE_URL = 'https://YOUR-SITE.vercel.app';          // no trailing slash
const DRIVE_FOLDER_ID = 'PASTE-YOUR-DRIVE-FOLDER-ID';
const FILE_PREFIX = 'RAM-PHAM-Backup-';
const KEEP_DAYS = 60;   // backups older than this go to the Drive trash. 0 = never delete.

// Runs every 15 minutes by the trigger. Does nothing unless the site says a backup is due.
function checkAndBackup() { run_(false); }

// Run this by hand any time to take a backup immediately (ignores the schedule).
function runBackupNow() { run_(true); }

// Run once to start the 15-minute checks (safe to run again; it replaces the old trigger).
function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('checkAndBackup').timeBased().everyMinutes(15).create();
}

function run_(force) {
  let res;
  try {
    res = UrlFetchApp.fetch(SITE_URL + '/api/cron/backup-file' + (force ? '?force=1' : ''), {
      headers: { 'x-backup-key': secret_() },
      muteHttpExceptions: true,
    });
  } catch (e) {
    report_(force, 'Could not reach the site: ' + e);
    return;
  }

  const code = res.getResponseCode();
  if (code === 204) return; // not due yet
  if (code !== 200) {
    report_(force, 'The site answered ' + code + ': ' + res.getContentText().slice(0, 200));
    return;
  }

  try {
    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
    const blob = res.getBlob().setName(FILE_PREFIX + stamp + '.xlsx');
    const file = DriveApp.getFolderById(DRIVE_FOLDER_ID).createFile(blob);
    tell_({ ok: true, manual: force, fileUrl: file.getUrl() });
    prune_();
  } catch (e) {
    report_(force, 'Could not save to Drive: ' + e);
  }
}

function secret_() {
  return PropertiesService.getScriptProperties().getProperty('CRON_SECRET');
}

// Tell the site how it went (shown in Settings; a success also marks today's backup as done).
function tell_(payload) {
  try {
    UrlFetchApp.fetch(SITE_URL + '/api/cron/backup-file', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-backup-key': secret_() },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
  } catch (e) { /* the site may be down; nothing more to do */ }
}

// On a failure: record it on the site, and email you - at most once a day, so a long outage
// does not fill your inbox. The script keeps retrying every 15 minutes on its own.
function report_(force, message) {
  tell_({ ok: false, manual: force, error: message });
  const props = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  if (props.getProperty('LAST_ERROR_MAIL') !== today) {
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Pharmacy backup problem', message);
    props.setProperty('LAST_ERROR_MAIL', today);
  }
}

function prune_() {
  if (!KEEP_DAYS) return;
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  const files = DriveApp.getFolderById(DRIVE_FOLDER_ID).getFiles();
  while (files.hasNext()) {
    const f = files.next();
    if (f.getName().indexOf(FILE_PREFIX) === 0 && f.getDateCreated().getTime() < cutoff) {
      f.setTrashed(true);
    }
  }
}
