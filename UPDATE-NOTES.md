# Update notes (Oct 2026)

## How to apply
1. Copy every file in this zip over your project, keeping the same paths.
2. Delete `src/components/PinDialog.tsx` (old, unused, called an API that didn't exist).
3. Add to `.env`:  `ADMIN_PASSWORD="your-strong-password"`   (8+ characters)
4. Run:  `npm run db:migrate`   (adds AdminAuth, TrustedDevice, BackupSettings.lastScheduledRunAt)
5. Run:  `npx prisma generate` then `npm run build`, and restart the Windows Service.

## What changed
- Automatic backup timer: fixed (see "Timer" below) + live status in Settings.
- Staff: new Diary tab; Diary and Clients lists stay hidden until you type.
- Admin: password login (/login), admin-only API protection, Settings -> Admin security
  (change password, trusted machines that skip the password).

## Timer — what was wrong
The old check skipped the day's backup whenever `lastRunAt` was today. But `lastRunAt` is also set by
"Run backup now" and by failed attempts, so testing with the button (or one failure) cancelled that
day's timed backup, and moving the time to later the same day never fired. The timer now has its own
`lastScheduledRunAt`; saving a new time that is still ahead today makes it fire today. Also: no double
start if a backup takes over a minute, Settings shows "Next automatic backup", the server time, and
whether the timer is running, and warns if you changed the schedule but didn't press Save.

---

# Update 2 — Diary: invoice choice + discount

New fields on each diary entry:
- **Invoice** (required for new entries): **Goes** (invoice goes with the client), **Stays** (stays here),
  or **In the diary** (recorded in the physical diary book).
- **Discount**: **No discount**, or **Give a discount** with a percentage (1–100, quick buttons 5/10/15/20).

Shown as badges on the Diary list, the client's page (Diary status) and the Staff diary tab.
Old entries are untouched: they show "Invoice: Not set" and "No discount" until edited.

To apply: copy the files over your project, then run `npm run db:migrate`
(applies `20261006100000_add_diary_invoice_and_discount`), `npx prisma generate`,
`npm run build`, and restart the service.

---

# Update 3 — Two-way product pricing + editable staff tabs

**Pricing:** in Products → Add/Edit, type the **Unit Price** and the **Price** fills in (Pack Size × Unit
Price), or type the **Price** and the **Unit Price** fills in (Price ÷ Pack Size). Changing the Pack Size
recalculates whichever of the two you did *not* type last. Works only when the Pack Size is a plain number
(e.g. 35); for "24x2" type both by hand. The server also fills the missing one on save and on Excel import
(only when blank — it never overwrites a value that is there). Note: blank price cells in an import are now
stored as empty instead of 0.

**Staff tabs (Settings → Staff view tabs):** rename each tab, show/hide it, reorder them, and tick which
details each tab shows. Hidden details are removed on the server, so staff never receive them.
The "Transport route" tab is available but hidden by default (as before). "Rider price" is off by default —
staff no longer receive it (before, the data was sent to the browser even though the page didn't show it).

To apply: copy the files over your project, run `npm run db:migrate`
(adds `20261007100000_add_staff_tab_config`), `npx prisma generate`, `npm run build`, restart the service.

---

# Update 4 — Whole-number prices + backup at the time you set

## What you do (this whole folder is already updated)
1. Replace your project folder with this one. Keep your own `.env` file (copy it back in).
2. Open a terminal in the folder and run these, one after another:
   - `npm install`
   - `npm run db:migrate`
   - `npx prisma generate`
   - `npm run build`
3. Restart the app / Windows Service.
4. Open Settings > Backups. Turn on the daily backup, choose the time, press **Save settings**.
5. Check the line under it: **"Last check of the schedule: (time) (app timer)"**. If that shows a recent time, the timer is alive and the backup will start at your time.

## What changed
- **Prices:** when Price or Unit Price is worked out automatically it is rounded to a whole number
  (100 / 35 = 2.857 becomes 3). Anything you type yourself is kept exactly.
- **Backup time zone:** the time you pick is now read in YOUR time zone (saved from your browser), not the server clock.
- **Backup catch-up:** if the app was off at the backup time, the backup runs as soon as the app is back, the same day.
- **Settings page:** shows the time zone, the last time the schedule was checked, and a red warning with steps if nothing is checking.
- **install.ps1:** fixed the Windows Service start command (it pointed at a file Node cannot run).

## Only if the app is NOT on your own always-on PC (for example it runs on Vercel)
A timer cannot run there. Add an environment variable `CRON_SECRET` (any long random text), redeploy, then on
cron-job.org create a free job that opens `https://YOUR-SITE/api/cron/backup?key=YOUR_CRON_SECRET` every 1 minute.
Use Google Drive as the backup destination there.

---

# Update 5 — Appearance settings (same look as the pharmacy store) + choose your summary cards

## What you do (this whole folder is already updated)
1. Replace your project folder with this one. Keep your own `.env` file (copy it back in).
2. In a terminal inside the folder run, one after another:
   - `npm install`
   - `npm run db:migrate`
   - `npm run build`   (needs internet once, to download the store's fonts)
3. Restart the app / Windows Service.
4. Open **Settings > Appearance**.

## What is new
- **Pharmacy store theme (now the default):** white cards, soft tints of one main color and the store's fonts
  (Bricolage Grotesque + Figtree), so this app and the store website look like the same product.
- **Settings > Appearance** lets the admin change: the app name (sidebar, staff view, sign-in page, browser tab),
  the theme (Pharmacy store or the original Classic look), the main color (presets or any color), and the fonts.
  Changes show instantly; press **Save appearance** to keep them for everyone.
- **Summary cards:** every small total at the top of a page (Products tracked, Rider total, Outstanding, and so on,
  including the Staff view ones) has a tick box. Untick it and it disappears from that page.
- To match the store exactly, put the same main color you used in the store's Site settings.


---

# Update — Google Drive backup without tokens (Google Apps Script "pull")

**Why:** the old Drive upload needs a Google login token (refresh token) that expires (every 7 days while the
Google app is in "Testing"), and Vercel cannot keep a timer running. Now a small script *inside your Google
account* asks the site every 15 minutes "is the backup due?" and saves the file to Drive itself.
No tokens, nothing to keep running, works on Vercel.

**New / changed files**
- `src/app/api/cron/backup-file/route.ts` (new) — GET: 204 = not due, 200 = the .xlsx; POST: "saved" / "failed".
  Uses the Settings schedule (time, time zone, on/off) and the same once-per-day rule. Secret = `CRON_SECRET`.
- `scripts/apps-script/Code.gs` (new) — paste into script.google.com (steps are at the top of the file).
- `src/app/(dashboard)/settings/page.tsx` — knows the 15-minute checker, shows "Google Apps Script" as the last
  checker, and shows the setup help.

**To apply:** copy the files over the project (same paths). No database migration, no new packages.
Add `CRON_SECRET` to the server environment if it is not there yet (Vercel -> Settings -> Environment Variables), redeploy.
Then follow the steps at the top of `Code.gs`.

**After it works:** in Settings turn OFF "Upload to Google Drive" and stop any cron-job.org job for
`/api/cron/backup`, so the old token-based path no longer runs and records errors.
"Run backup now" still uses the old path; to take an instant Drive backup run `runBackupNow` in the script.

---

# Update — Staff sign-in, icon control, faster and phone-friendly

## 1. Staff sign-in (staff data is no longer public)
**Before:** anyone who knew the website address could open `/staff/...` and the data addresses
(`/api/products`, `/api/clients`, `/api/diary`, `/api/transport`) with no password, and `/api/clients/<id>`
returned a whole client file (details, every trip, every diary entry).
**Now:**
- Staff sign in on `/login` (Staff tab) with a **username + password the admin creates**. The admin signs in on the Admin tab as before.
- Every staff page and every data request is checked on the server. The full client file is admin-only.
- **Settings > Staff sign-in** (admin): add staff accounts, reset a password, switch an account off, "Sign out everywhere", delete,
  unpause an account, choose how long a session lasts (1 hour to 7 days), and (not recommended) switch staff sign-in off.
- Disabling, deleting, resetting a password or "Sign out everywhere" takes effect immediately (the session is checked in the database each time).
- 5 wrong passwords pause that account for 10 minutes. Passwords are stored scrambled (scrypt), never in plain text.
- If the database update has not been run, staff data stays LOCKED (never open by accident).

## 2. Icons and names from the admin
- **Settings > Staff view tabs:** each tab now has an icon picker next to its name (50 icons).
- **Settings > Appearance > Menu names and icons:** rename the admin menu items (Products, Diary, ...) and pick their icons.

## 3. Faster
- Appearance and staff-tab settings are cached and refreshed the moment the admin saves.
- Going back to a page shows the last data instantly while fresh data loads.
- Loading skeletons on both areas.

## 4. Phones
- Staff view has a bottom icon bar on phones; tables turn into one card per row; bigger tap targets; no zoom when typing on iPhone;
  correct screen height on mobile browsers; compact top bar in the admin.

## How to apply (order matters)
1. Copy the files over the project (same paths).
2. Update the database (adds columns and one table; nothing is deleted). Run this on your computer with `DATABASE_URL`/`DIRECT_URL` pointing at the live database:  `npm run db:migrate`.  Do it BEFORE deploying: the build does not run migrations for you.
3. Run `npm run dev`, sign in as admin, open **Settings > Staff sign-in** and **create the staff accounts**.
   Until you do, staff cannot sign in (that is the point).
4. Redeploy. Tell staff to sign in at `/login` (Staff tab).

Note: a "trusted PC" (Settings > Admin security) acts as admin without a password, so do not mark a shared counter PC as trusted.

---

# Update — One live search for the whole app (admin and staff)

A search box now sits in the top bar of the admin (magnifier on phones) and under the title in the staff view.
- **Live:** results appear as you type (after 2 letters), no Enter needed. Old results stay on screen while new ones load.
- **Across everything:** one box searches Products, Clients, Diary and Transport at once. Several words must all match, in any order
  ("mary westlands").
- **Shows where each result comes from:** results are grouped under a section header, and every row has a coloured icon and a
  label with the section name (Products, Clients, Diary, Transport). The names and icons are the ones you chose in Settings.
- **Opens the right place:** in the admin a client result opens that client's page; the other results open the section with
  the search already filled in. "See all 23 in Products" opens the full list. In the staff view every result opens the section list, filtered.
- **Keyboard:** `/` or Ctrl/Cmd+K jumps to the box, arrow keys move, Enter opens, Esc closes.
- **Staff only find what they may see:** the server checks the tab is switched on and only matches on fields the admin shows
  on that tab (Settings > Staff view tabs). A hidden phone number or barcode can't be found by searching for it.
- The search box on each page (Products, Diary, ...) still works as before, and is now filled in when you arrive from the global search.

Files: `src/app/api/search/route.ts`, `src/lib/searchRules.ts`, `src/components/GlobalSearch.tsx`, `src/hooks/usePrefillSearch.ts`;
changed: `DashboardShell.tsx`, `app/staff/StaffShell.tsx`, `SearchFilterBar.tsx` and the 8 section pages (one line each).
No database change, no new packages. Just copy the files over and redeploy.

---

# Update — Diary controls, search results you choose, and a hover pop-up

## 1. Diary: edit the wording and switch parts off  (Settings > Diary)
- **Invoice section:** switch the whole section on/off, choose whether new entries *must* pick an option, and edit every message:
  the section title, the question, the "choose one" error message, the "not set" wording, the older-entry message, and for each
  choice (Goes / Stays / In the diary) its name, description and icon, plus an on/off switch for the choice (one always stays on).
- **Discount:** on/off, title, "no discount" / "give a discount" wording, and the quick percentage buttons (e.g. 5, 10, 15, 20).
- **Payment status:** on/off, field title and the three wordings. Off also removes the paid badge, the payment filter and the "Outstanding" count.
- **Entry details:** rename "Items taken", switch Quantity and Transport on/off and rename them, and edit the text under the Diary title.
- The new wording shows in the admin diary, the staff diary, the client page, the search box, and the form; the staff tab settings still apply on top.
- **Safe for existing data:** a part you switch off is simply not shown or asked for. Entries you already saved keep their values
  (editing an entry no longer overwrites fields the form doesn't show).

## 2. Search results: you choose what shows  (Settings > Search results)
- For each section pick the bold **main line** and the **details** under it. Products now show **pack size, unit price and price** by default.
  New choices: unit price, price, rider/pham price, quantity, transport, paid status, invoice, discount.
- Quick buttons: *Just the name*, *Standard*, *Everything*, and a live preview of one result.
- Staff only ever get what their tab allows (Staff view tabs): a price or barcode hidden from staff never appears in the results,
  in the pop-up, and can't be matched. Typing still finds results by fields that aren't shown (e.g. barcode) when staff may see them.

## 3. Hover pop-up
Hovering (or moving to with the arrow keys) a search result opens a pop-up beside the list with **all** the details the person may see
(full names, nothing cut short), headed by the section name. It uses your wording and leaves out diary parts you switched off.
Switch it off per section under Settings > Search results. Computers only: on phones the rows already show the details.

## How to apply
1. Copy the files over the project (same paths). No new packages.
2. Update the database (adds two small settings tables; nothing is deleted): `npm run db:migrate`  (before deploying).
3. Redeploy. Until the migration is run, everything keeps working with the original wording and nothing switched off.

---

# Fix — "Element type is invalid. Received a promise that resolves to: Context" (v9 -> v10)
`src/lib/diaryConfigContext.tsx` exported the raw context provider (`Ctx.Provider`) from a client file, and the server layout
tried to render it. Next.js can only render components from client files, so the diary provider is now a normal wrapper
component, like AppearanceProvider and RoleProvider. Only that one file changed.

---

# Update — The hover pop-up is editable (v11)

Settings > Search results: under each section, **What the pop-up lists**:
- **Tick** the fields to show (untick the ones you don't want).
- **Order** them with the up/down arrows.
- **Rename** any of them (for example “Price” instead of “Pham price”). Leave a name empty to keep the usual one.
- The preview shows the pop-up as you edit. Switch the pop-up off for a section, or untick every field, and it won't appear.
- Staff still only see fields their tab allows, in your order and with your names.

Nothing saved yet = every field in the usual order, exactly as before. No database change: just copy the files and redeploy.
Files: `src/lib/searchRules.ts`, `src/app/api/search/route.ts`, `src/components/SearchDisplayPanel.tsx`.
