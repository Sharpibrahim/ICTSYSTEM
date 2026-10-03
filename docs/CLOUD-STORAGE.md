# Cloud storage for MRHS ICT CLUB MASTER

The platform keeps every record **in the browser on the device that entered it**
(LocalStorage + IndexedDB, see `js/core/store.js`). That is deliberate: it needs no
server, works on a phone in a classroom with no data bundle, and nothing about
students ever leaves the school. The trade-off is that nothing is shared between
devices, and clearing browsing data erases everything.

This note explains how to keep the club's records safe in the cloud today, and
which cloud option to choose if the club later wants several people working on
the same live data.

---

## 1. What actually needs storing

| Item | Typical size | How it is produced |
|---|---|---|
| Records backup (members, attendance, courses, finance, certificates…) | 1–6 MB per term | **Settings → Data → Download backup (JSON)** |
| Exported CSV / print-outs (PDFs) | 100 KB–2 MB each | module **Export** and **Print** buttons |
| Certificate background image | ≤ 4 MB | **Certificates → Certificate background → Upload my image** |
| Gallery photos, scanned documents, meeting attachments | 1–8 MB each | module uploads (stored in IndexedDB) |

Total for a normal year: **well under 2 GB.**

---

## 2. Recommendation (start here)

**Use Google Drive with a free Google Workspace for Education account, or the
club's existing school Google account.**

Why this one:

- **Free and legitimate for schools.** Google Workspace for Education Fundamentals
  is free for accredited schools (pooled storage, admin controls); a plain Google
  account gives 15 GB free, which is already several years of backups.
- **Works well on the phones the club actually has** (Android is dominant in
  Uganda; the Drive app is pre-installed, and files can be kept available offline).
- **Shared ownership.** Put the folder inside the school's account, not a
  student's personal one, so records survive when members graduate.
- **Versioned and recoverable.** Drive keeps 30 days of versions/recycle bin, so
  an accidental overwrite of the backup file is not fatal.
- **No lock-in.** A JSON backup is a plain file; any provider can hold it.

### Set-up that takes ten minutes

1. Sign in to the school Google account (or create `mrhs.ictclub@gmail.com` if the
   school has no domain and share ownership with the ICT teacher and the Patron).
2. Create this folder structure once:

   ```
   MRHS ICT Club/
     ├── 01 Backups/            ← the JSON backups (see step 3)
     ├── 02 Certificates/       ← PDFs of issued certificates, named by serial
     ├── 03 Reports/            ← exported weekly / termly / annual reports
     ├── 04 Documents/          ← constitution, constitution drafts, minutes PDFs
     └── 05 Photos/             ← activity and gallery evidence
   ```

3. On the admin device: **Settings → Data → Download backup**, then drag the file
   into `01 Backups/` with the date in the name —
   `mrhs-ict-backup-2026-10-03.json`. Do this **at the end of every week** (there is
   a reminder in the app's manual, section *Settings → Data*).
4. Right-click the `MRHS ICT Club` folder → **Share** → add the Patron, the
   President and the ICT teacher as **Editor**; share `02 Certificates` with the
   Patron only if the club wants that.
5. In the Drive app on the two club phones, open the folder → **⋮ → Make available
   offline**, so a backup can be taken and read without a bundle.
6. Give the folder to the next set of officers in the handover — that folder *is*
   the club's archive.

### Restoring

On a new or wiped device: open the app → **Settings → Data → Restore backup** →
choose the newest JSON file (merge to add to existing records, replace to start
clean). The app tells you how many records each option will affect before it
acts.

---

## 3. Alternatives, and when they are the better answer

| Option | Best for | Watch out for |
|---|---|---|
| **Google Drive** (Workspace for Education or a shared school account) | The default recommendation: free, familiar, phone-friendly, shared ownership | Too many shared "school" accounts can lock the file; keep the folder in the school account |
| **Microsoft OneDrive / Microsoft 365 A1** | Schools already using Office 365 — 1 TB per user, free A1 plan for education | Web app on low-end phones is heavier than Drive |
| **Dropbox / pCloud / Mega** | Cheap paid plans, strong file versioning | Smaller free tiers, no education plan, another password to manage |
| **A 3-2-1 habit: Drive + a USB stick + a printed termly report** | Truly resilient, zero recurring cost, papers survive a lost account | Manual; needs one person to own it each term |

**Do not rely on:** WhatsApp or email attachments as the only copy (files expire,
are hard to find later); a single member's personal account (they graduate);
a memory card or laptop alone (loss, theft, breakage).

---

## 4. If the club wants live multi-user data later

The storage layer is deliberately swappable (`js/core/store.js` exposes the same
API whether backed by LocalStorage or a server), so this is an upgrade, not a
rewrite. A sensible stack for a Ugandan secondary school:

| Need | Suggested service | Cost |
|---|---|---|
| Database for all records | **Supabase** (Postgres + auth + row-level security) or **Neon** | Free tier is comfortably enough for a club |
| Login for staff/officers | Supabase Auth, or the school's Google Workspace | Free |
| Photos, scans, uploaded backgrounds | **Cloudflare R2** (no egress charges) or Supabase Storage | ~$0–2 a month |
| Hosting the app itself | any static host (the app is plain HTML/CSS/JS — Cloudflare Pages, Netlify, GitHub Pages) | Free |
| Automatic nightly backup of the database | Supabase scheduled backup, or a GitHub Action dumping the tables into Drive | Free |

Two practical cautions for Uganda: keep an **offline-first** mode (bad network is
normal), and pay for any paid tier with the club's own **school-issued account and
mobile money receipt**, recorded in **Finance → Expenses → Internet**, so the
subscription never depends on one student's personal card.

Which to choose: **start with Google Drive (Section 2) now.** Move to Supabase +
Cloudflare R2 only when the club genuinely needs several officers working on the
same live records at the same time — that is a real project (accounts, permissions,
data-protection consent for student records), and it is worth doing deliberately.

---

## 5. Data-minimal practice (school policy)

- Only keep what the club needs: no national ID numbers, no parent phone numbers
  unless the club uses them for a genuine purpose, no medical notes.
- The demo records shipped with the platform are clearly labelled *sample data*
  (Settings → Appearance → "Show sample data badges"); remove them before going
  live with **Settings → Data → Reset & re-seed** (replace option) or by deleting
  each record.
- Before uploading anything to the cloud, agree in a cabinet meeting who may see
  it and how long it is kept; record that decision in the minutes.
- Certificate PDFs and reports are the two things worth keeping long-term; a
  termly backup plus those PDFs is a complete archive.
