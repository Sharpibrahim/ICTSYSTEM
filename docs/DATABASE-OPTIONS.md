# Database options for MRHS ICT CLUB MASTER

Right now the platform is **local-first**: every record lives in the browser that
created it (LocalStorage for records, IndexedDB for photos and uploads), and the
club archive is kept by exporting JSON backups to OneDrive / Google Drive
(see `CLOUD-STORAGE.md` and `ONEDRIVE.md`).

That is the cheapest and most reliable option when a device may be offline — but
it means records are **per device**. This document compares the realistic
alternatives if the club wants a shared database, and says what each one would
take to connect to this app.

The data layer was written to be swappable: every module talks to `Store`
(`js/core/store.js`), so adding a backend means writing **one adapter**
(roughly 400–800 lines) rather than changing the 21 modules.

---

## 1. The options at a glance

| Option | What it is | Free tier (check current terms) | Works offline? | Setup effort in this app | Verdict for the club |
|---|---|---|---|---|---|
| **Stay local + cloud backup** *(current)* | Browser storage + JSON backups in OneDrive/Drive | Free forever | Yes, fully | none | ✅ **Keep this as the safety net**, always |
| **Supabase** | Hosted PostgreSQL + auth + storage + REST/realtime | 500 MB database, 1 GB files, 5 GB egress/month, 50 000 users, 2 projects; **project pauses after 7 days idle**; Pro $25/month | No (browser needs the network) | High — schema, RLS policies, auth mapping, sync | ✅ Best "real database" choice if the school has steady internet |
| **Firebase (Firestore)** | Google's NoSQL document store + auth | 50 000 reads, 20 000 writes, 20 000 deletes **per day**, 1 GiB stored, 10 GiB/month egress; auth free to 50 000 users | Yes — offline persistence is built in and syncs later | High — adapter + security rules | ✅ Best if network is patchy and you want automatic sync |
| **PocketBase** | A single ~15 MB program (Go) with SQLite, auth, file storage, admin UI and REST/realtime API | Free (MIT); you supply the machine | On the school LAN yes; off-site no | Medium — REST adapter, no cloud account needed | ✅ Best zero-cost option; run it on the school PC |
| **Turso / libSQL** | Cloud SQLite with an HTTP API and local "embedded replicas" | Free tier in the 3–5 GB range with hundreds of millions of row reads/month | Reads can be local; writes need the network | High | ⚠️ Good, but same effort as Supabase with fewer features |
| **Google Sheets + Apps Script** | A Sheet used as a table, published through an Apps Script web app | Free (Sheets limit: 10 million cells; Apps Script: 6 min per run, 90 min of triggers/day, 30 simultaneous runs on a personal account) | No | Medium | ⚠️ Fine as a **readable reporting mirror**, not as the live database — concurrent edits and quotas bite |
| **NocoDB / Baserow** | Self-hosted spreadsheet-style database with an automatic REST API | Free self-hosted (Baserow core is MIT; NocoDB Community Edition unlimited users self-hosted); cloud plans from ~$5–20/month | No | Medium–high | ⚠️ Great if teachers want to browse/edit records in a grid; the app still needs an adapter |
| **MySQL/MariaDB + PHP on school hosting** | The classic cPanel hosting package many schools already pay for | Usually already paid for | No | High | ⚠️ Only if the school already has hosting and someone comfortable with PHP |

---

## 2. Recommendation

**Keep the local-first app + weekly cloud backups (already built), and add a
shared backend only when the club genuinely needs several officers working on the
same live records.** When that day comes:

1. **If the school has steady internet → Supabase.**
   Real PostgreSQL (proper tables, foreign keys, reports in SQL), built-in user
   accounts, and the app can talk to it directly from the browser with the public
   "anon" key plus row-level security. Watch the 7-day idle pause: a free project
   that is not touched during a holiday must be un-paused from the dashboard, or
   use the paid Pro plan at $25/month when the club can afford it.

2. **If the network is unreliable → Firebase.**
   Firestore keeps changes on the device and syncs when a connection appears,
   which matches how a Ugandan school actually works: enter data now, upload
   later. The free daily quotas (50 000 reads / 20 000 writes) are far above what
   a club of a few hundred members produces.

3. **If the club wants zero recurring cost and to keep student data on campus →
   PocketBase on the school PC.**
   One program file plus one database file, run with `./pocketbase serve`, admin
   UI in the browser, automatic REST API. Put the app and PocketBase on the same
   machine and the club works over the school LAN with no internet at all. Pair it
   with the nightly JSON backup to OneDrive, because a single PC is a single point
   of failure (and use a UPS if power is unstable).

**Do not use Google Sheets as the live database.** It is superb as a mirror: the
club can see members, attendance and finance in a sheet they already understand,
and it costs nothing. But Sheets is not built for concurrent writes, Apps Script
caps simultaneous executions, and formulas break when rows move.

---

## 3. What connecting a backend actually means for this app

Whatever is chosen, the work is the same shape:

1. **Schema** — 26 collections today (members, attendance, meetings, courses,
   finance, certificates…). Each becomes a table/collection with the same field
   names so `Store.exportAll()` keeps working as the backup format.
2. **Adapter** — a new `js/core/sync.js` that mirrors `Store`'s API
   (`all/get/create/update/remove`) onto the backend, and a `js/core/backend.js`
   holding the credentials/endpoint in club settings.
3. **Offline queue** — writes go to LocalStorage first, are marked `dirty`, and
   are flushed to the backend when the network is available. Conflict rule:
   newest `updatedAt` wins per record, with a "these two records differ" report
   for anything suspicious.
4. **Auth** — the app's eight demo roles stay, but sign-in moves to the backend
   (Supabase Auth, Firebase Auth or PocketBase users) so the server decides who
   may write. Row-level rules must mirror the current permission matrix in
   `js/core/auth.js`.
5. **Files** — certificate backgrounds, gallery photos and documents move to the
   backend's file storage (Supabase Storage / Cloud Storage / PocketBase files),
   with the same 4 MB limits the app already enforces.
6. **Data-protection note** — once records leave the device, the club needs a
   written rule (in the minutes) about who may see student data and how long it is
   kept. See `CLOUD-STORAGE.md`, section 5.

Estimated effort: **2–4 focused weeks** for one backend done properly (schema,
adapter, offline queue, auth, testing), then a term of running both in parallel
(current local mode as the fallback) before switching over.

A cheaper half-step, possible in days, is a **one-way mirror**: keep the app
local-first exactly as it is, and push a copy of each collection to the chosen
service after every backup — a Supabase table, a Google Sheet, or an Airtable
base. The club gets shared *reading* and reporting without the risk of two people
editing the same record.

---

## 4. Rough money picture (Uganda)

| Item | Cost |
|---|---|
| Local-first app + OneDrive/Drive backups | **$0** |
| Supabase free / Firebase free / PocketBase self-hosted | **$0** (only the school's existing PC and internet) |
| Supabase Pro | $25/month ≈ UGX 90 000 — pay from the club account, keep the receipt in Finance → Expenses → Internet |
| Small VPS (for PocketBase off-campus or a self-hosted Supabase) | a few dollars a month from an African or European host; check school procurement rules before paying |
| Domain name for the app (optional) | ~$10–15/year |

Ask the school whether it already has hosting or a Microsoft 365 / Google
Workspace for Education tenant — using what is already paid for is always the
cheapest and easiest to hand over.

---

## 5. Decision checklist for the cabinet

Answer these before building anything:

1. How many people need to *enter* data, and on how many devices at once?
2. Is there internet in the ICT lab every time records are entered? (If no —
   Firebase or LAN-only PocketBase.)
3. Who owns the account, and does it belong to the school rather than a student?
4. Who is responsible for the monthly cost, and how is it paid?
5. What is the written rule about who may see student records?
6. What is the fallback if the service is down or the school changes hands?

Until 1–4 have clear answers, the current setup (local-first + weekly OneDrive
backup) is not a compromise — it is the safest configuration.

---

*Figures checked early 2026 from each provider's public pricing pages; free tiers
change, so re-check before committing. Sources: Supabase pricing, Firebase
pricing, Turso pricing, PocketBase documentation, Google Apps Script quota
documentation, Baserow/NocoDB project documentation.*
