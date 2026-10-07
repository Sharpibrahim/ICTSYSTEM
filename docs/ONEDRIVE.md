# Connecting OneDrive / Microsoft 365 to MRHS ICT CLUB MASTER

The platform has no server of its own: records live in the browser. Two ways to
get backups into Microsoft 365 are built in, and both are in
**Settings → Data → Cloud backup**.

| | Route A — synced folder | Route B — OneDrive connector |
|---|---|---|
| Setup | none (10 minutes of folder organising) | one app registration in the school's Microsoft tenant |
| How it works | the browser writes the backup file into the OneDrive folder on the PC; the OneDrive client uploads it | the browser signs in to Microsoft and uploads the backup itself |
| Works on phones | yes, with the Drive/OneDrive mobile sync folder… not on iOS Safari (no folder API) | yes, any browser where the app is hosted |
| Needs internet at the moment of backup | no — the sync client uploads later | yes |
| Microsoft admin needed | no | yes (consent for `Files.ReadWrite.AppFolder`) |

**Start with Route A today; add Route B when the school's Microsoft admin can
grant five minutes.**

---

## Route A — back up into the OneDrive folder (the OneDrive sync client)

1. Install **OneDrive** on the PC that runs the club register (it is already
   installed on most Microsoft 365 school machines) and sign in with the school
   account.
2. In OneDrive, create the archive folder once:

   ```
   OneDrive - <School>/MRHS ICT Club/01 Backups/
   ```

3. In the app: **Settings → Data → Cloud backup → Choose backup folder** and pick
   that `01 Backups` folder. The browser asks for permission once; the app
   remembers the folder.
4. Press **Back up now**. The app writes
   `mrhs-ict-club-backup-2026-10-03.json` into the folder; OneDrive uploads it
   within seconds.
5. **Restore from folder** lists the backups in that folder and restores any of
   them (merge or replace) — useful when a device is wiped or replaced.

Notes

- The same folder trick works for Google Drive, Dropbox and a USB stick: any
  folder the browser can write to.
- Folder access needs Chrome, Edge, Brave or Opera **on a computer**. On phones,
  use Route B or the plain **Export backup (JSON)** button and share the file to
  OneDrive.
- If the app was opened from a file on disk or from a preview sandbox, folder
  access may be blocked by the browser — open the platform from its real address.

---

## Route B — direct upload with the OneDrive connector (Microsoft Graph)

This signs the app in to Microsoft with **OAuth 2.0 + PKCE**, no client secret,
and uploads into the app's *own* folder inside OneDrive
(`/Apps/MRHS ICT Club Master`). The app can only see that folder, never the rest
of the drive — that is what the `Files.ReadWrite.AppFolder` permission means.

### 1. Register the app (once, by the ICT teacher or school Microsoft administrator)

1. Go to <https://portal.azure.com> → **Microsoft Entra ID** → **App registrations**
   → **New registration**.
2. Name: `MRHS ICT Club Master`.
3. Supported account types: **Accounts in this organizational directory only**
   (single tenant) — or *any organizational directory* if the club is not tied to
   the school domain.
4. **Redirect URI**: platform **Single-page application (SPA)**, address =
   exactly what the app shows under **Settings → Data → Cloud backup → “Redirect
   address to register”** (button *How to set it up* copies it). For example
   `https://ict.mrhs.ac.ug/` — it must end in `/` and match the address the club
   actually opens the app from.
5. **Register**, then copy the **Application (client) ID** from the Overview page.

### 2. Grant the permissions

**API permissions** → *Add a permission* → *Microsoft Graph* → *Delegated
permissions*, and tick:

- `Files.ReadWrite.AppFolder` — write into the app's own OneDrive folder
- `User.Read` — show which account is signed in
- `offline_access` — keep the connection alive between visits

Then press **Grant admin consent for <School>** (may need the IT administrator).
No client secret is created: the SPA flow does not use one.

### 3. Connect in the app

1. **Settings → Data → Cloud backup** → paste the **Application (client) ID** (and
   the tenant if it is not `common`) → **Save connection details**.
2. Press **Connect OneDrive**, sign in with the school Microsoft account, approve
   the request. The card then shows *Connected · signed in as …*.
3. **Back up to OneDrive** uploads the club data immediately; **Restore from
   OneDrive** lists what is there and restores any file (merge or replace).

### What the app does and does not do

- Uploads and downloads only inside `/Apps/MRHS ICT Club Master` in the signed-in
  account's OneDrive.
- Stores the Microsoft access/refresh token in this browser under its own
  localStorage key. **Tokens are never written into a backup file.**
- Signs out with **Disconnect** (also revokes the browser's stored token).
- Sends the club's JSON straight from the browser to Microsoft — no third-party
  server in between.

### Troubleshooting

| Symptom | Fix |
|---|---|
| `AADSTS50011` redirect URI mismatch | The address in Entra ID must exactly equal the app's own address including the trailing `/` and `https`. Re-copy it with *How to set it up*. |
| `AADSTS65001` / consent required | Ask the administrator to press **Grant admin consent** on the API permissions page. |
| “Microsoft returned 403” | The `Files.ReadWrite.AppFolder` permission is missing or not consented. |
| The preview shows “could not reach Microsoft” | The sandbox preview has no internet. Open the app from its real address. |
| Sign-in opens but nothing happens | Pop-ups/redirects blocked, or the app is embedded in a frame — open the platform in its own tab. |

---

## Retention, and who owns the account

- Back up **once a week** and before every term; keep at least the last three
  terms.
- The `MRHS ICT Club` folder in OneDrive should be **shared with the Patron and
  the ICT teacher** and owned by the **school account**, so it survives members
  graduating.
- Consider a Power Automate flow on the folder (for example: notify the Patron on
  Teams/email when a new backup arrives, or move backups older than 12 months to
  an archive folder).
- Add a USB copy plus a printed termly report; see `docs/CLOUD-STORAGE.md` for the
  full comparison of cloud services and the upgrade path to a shared database
  (Supabase + Cloudflare R2) if the club ever needs live multi-user records.
