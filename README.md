# MRHS ICT CLUB MASTER

A complete digital management platform for the **Mbazzi Riverside High School ICT Club** — members, leadership, meetings, attendance, courses, projects, reports, certificates, resources and finances in one polished dashboard.

Built with **HTML5, CSS3 and vanilla JavaScript** (ES5-compatible, no framework, no build step). All data lives on the device: **LocalStorage** for records and **IndexedDB** for uploaded files, behind a single swappable data layer (`Store`).

> All people, contacts, marks and money amounts in the demo data are **sample/demo values** for a Ugandan secondary school. No real personal information is included.

---

## Running the app

No installation or build step is required.

```bash
# from this folder — any static file server works
python3 -m http.server 8080
# then open http://localhost:8080
```

Opening `index.html` directly from the file system also works in most browsers, but a local
server is recommended (it enables IndexedDB file storage and avoids `file://` restrictions).

**First run:** the app seeds a full academic-year demo dataset (32 members, 13 cabinet
positions, 12 courses, 1054 attendance records, transactions, certificates, gallery, tasks…).
This takes a moment on the boot screen. Everything can be wiped or re-seeded from
**Settings → Data**.

---

## Hosting

The project is a static site with no build step and no dependencies, so it can
be published from a phone in a few minutes. **Vercel** instructions — import the
repository, leave the build settings empty, deploy — are in
`docs/DEPLOY-VERCEL.md`, together with the custom-domain and update notes.
Nothing needs to be installed, compiled or configured: Vercel serves
`index.html`, `css/`, `js/` and `assets/` exactly as they are.

The deployment is only the application. Club records stay in the browser (and in
Firebase if the club connected it), so a redeploy can never touch them. Keep
downloading a JSON backup each term.

## Screen sizes

The layout is rebuilt, not shrunk, at every size — 320 px phones up to 4K
displays and everything between (1 366 × 768 office laptops, 1 024 px tablets,
iPad portrait, phones in landscape):

| Screen | What the platform does |
|---|---|
| ≥ 1 700 px | content column capped and centred so text does not stretch; larger type on 4K |
| 1 366 × 768 | full sidebar, tighter spacing, compact banner, shorter top bar |
| ~1 024 px | sidebar becomes an icon rail; two-column panels stay side by side |
| 768 px (tablet portrait) | sidebar becomes a drawer; data tables become one card per record with labelled values |
| 360–480 px (phones) | one column; dialogs are bottom sheets; 44 px touch targets; 16 px inputs (no iOS zoom); safe-area padding for notches |
| 320–360 px | statistic cards stay two-up (full width below 340 px); wide tables scroll in their own box |
| phone landscape | banner sheds secondary text; calendar and register get the height |
| 200 % browser zoom | takes the tablet layout rather than breaking |
| print | tables restored to full rows, A4, certificates A4 landscape |

Widths are fluid (`clamp()`), so there is no size at which the layout looks
cramped or sparse. `css/adaptive.css` holds the rules; the checks are in
`tools/` (see `tools/README.md`).

## Colour schemes

Eleven complete schemes ship with the platform — Azure & Cyan (default),
Indigo & Violet, Royal & Gold, Emerald & Teal, Midnight & Cyan, Plum & Rose,
Slate & Steel, Sunset & Coral, Teal & Sand, Sky & Ash and System Blue. Pick one
in **Settings → Appearance**; the whole application follows it at once,
including the sidebar, welcome banner, sign-in panel, tables, charts, ID cards
and certificates. The scheme is remembered per device and is included in JSON
backups (`settings.accent`).

Adding another is a copy-and-paste job: duplicate a block in `css/palette.css`,
change the hues, then add the name to `SCHEMES` in `js/core/shell.js`.

## Signing in

The eight club accounts (Administrator, Patron, President, Secretary, Treasurer, Training
Coordinator, Project Coordinator, Member) ship with the demonstration password **`demo1234`**, so
that a fresh copy of the app can be opened before the club has set anything up. The login screen
shows a **First-time setup** panel listing exactly those accounts while any of them still uses it.

The first time an officer signs in they are required to choose a password of their own — at least
8 characters, mixing letters and numbers — and the demonstration password can never be chosen.
Once every account has its own password the panel disappears. Use **Settings → Users** (administrators
only) to add officers or to issue a one-time password when somebody forgets theirs; the app shows it
once so it can be handed over in person.

Who changed what is recorded in the **audit trail** (My Account → *My recent activity*, or the full
trail under Settings → Data → **Audit trail**).

| Username | Role | What they can do |
|---|---|---|
| `admin` | Administrator | Everything, including settings, users and data tools |
| `patron` | Patron | Monitors the club; manages members, meetings, activities, reports, announcements |
| `president` | President | Full club operations: cabinet, meetings, activities, projects, members |
| `secretary` | Secretary | Meetings, minutes, attendance, reports, documents |
| `treasurer` | Treasurer | Full finance module, read-only elsewhere |
| `training` | Training Coordinator | Courses, training, resources, certificates |
| `projects` | Project Coordinator | Projects, project tasks, activities |
| `member` | Member | Club information plus their own records (attendance, certificates, profile) |

Only the **Administrator** role can open the built-in **User Manual** (`#/manual`);
every other role sees an access-restricted message there.

Permissions are enforced in three places: the sidebar navigation, the router (restricted pages
show an "access restricted" state) and every action button (`Auth.can(module, action)`).
The full matrix lives in `js/core/auth.js`.

---

## Modules (21 + administrator manual)

| # | Module | Highlights |
|---|---|---|
| 1 | **Dashboard** | Greeting, 10 live KPI cards, attendance & membership charts, upcoming events, active projects with progress, recent activity, announcements, quick actions |
| 2 | **Members** | Full member records, search/filter/sort, CSV export, printable profile, linked courses, projects, attendance and certificates — plus the **card studio** for CR80 membership cards |
| 3 | **Cabinet** | 13 club positions, responsibilities, terms, org chart view, appointment history, print, and **cabinet position cards** |
| 4 | **Meetings** | Scheduling, agendas, attendance, minutes, decisions and action items that become club tasks |
| 5 | **Attendance** | Recorder for meetings/courses/activities/training/events, Present/Absent/Late/Excused, dashboards, member history, monthly/term reports, printable sheets, QR check-in placeholder |
| 6 | **Courses** | 11 club courses, enrolment, lessons, progress, completion rates and certificate eligibility |
| 7 | **Activities** | 9 activity types with objectives, participants, outcomes, photos and reports |
| 8 | **Projects** | Problem/objectives, leader and team, technologies, status, tasks with progress, documents and results |
| 9 | **Reports** | Weekly/monthly/termly/activity/project/training/meeting/annual reports — create, edit, preview, print, export |
| 10 | **Certificates** | `MRHSICT-2026-CERT-0001` numbering, 6 certificate types, printable certificates, public verify-by-number page (`#/verify`), revocation |
| 11 | **Notes & Resources** | 10 resource categories, files/links/notes, tags, view counts |
| 12 | **Announcements** | Priority levels, expiry, pinned/featured announcements surfaced on the dashboard |
| 13 | **Tasks** | Kanban board + list view, assignment, priorities, deadlines, automatic overdue tracking, meeting action-item sync |
| 14 | **Calendar** | Month grid combining meetings, activities, training, project/report deadlines and certificate events |
| 15 | **Equipment** | Asset register with categories, condition, location, assignee, maintenance log and total value |
| 16 | **Finance** | Income & expenses by category, balance, transaction history, printable statements and receipts |
| 17 | **Achievements** | Competition and award records with members, photos and documents |
| 18 | **Gallery** | Albums by category with placeholder imagery, lightbox and captions |
| 19 | **Documents** | 9 document categories, versioning, confidentiality, search and filter |
| 20 | **Analytics** | Membership growth, attendance trends, course completion, project progress, participation, certificates and income vs expenses with plain-language insights |
| 21 | **Settings** | Club information, appearance (light/dark/system), user management with role matrix, notification preferences, backup/restore, **Firebase shared database**, CSV import, demo data reset |
| — | **User Manual** *(administrator only)* | 27-section searchable handbook: every module, the eight roles, term routines, troubleshooting, glossary — printable as a PDF (also shipped as `docs/MRHS-ICT-Club-Master-User-Manual.pdf`) |

### Cross-cutting features

- **Global search** (`Ctrl/⌘ + K` or the top-bar search) across members, cabinet, meetings, courses, projects, activities, certificates, resources, documents and more — grouped by category with direct navigation.
- **Notification centre** for upcoming meetings and activities, overdue tasks, course/project deadlines, new announcements, low attendance and report deadlines.
- **Toasts, confirmations and undo** — destructive actions ask first and can be undone from the toast.
- **Empty, loading and error states** everywhere, with accessible labels, keyboard support and tooltips.
- **Print previews** for member profiles, ID cards, certificates, meeting minutes, reports and attendance sheets, each downloadable as a standalone HTML document for PDF printing.
- **Certificates** are print-first and locked to **A4 landscape (297 × 210 mm)**, with the club crest, recipient name, achievement, two signature lines and the serial number on top of the background. Two vector built-in designs ship with the platform: the default **Cream & ornate** (cream paper, double gold rule frame, corner scrollwork, faint centre medallion) and **Navy & gold** (cream paper, double gold rule frame, corner scrollwork, damask texture and a faint centre medallion); the design and the **content alignment** (top/middle/bottom, left/center/right, nudges and text size, with a live sample) are set from **Certificates → Certificate background** — the same window is on every certificate page, inside every certificate preview, and in **Settings → Club information → Certificate background** — where an A4-landscape PNG/JPEG can be uploaded as well (a soft scrim keeps the text readable over photos). Whatever is chosen renders identically on screen, on paper and in the exported HTML — printed on a **landscape A4 sheet** (the app turns the page sideways for the print job and fills it edge to edge); every other document (minutes, reports, ID-card sheets) keeps printing portrait. Previews: `docs/certificate-design-preview.png` and `docs/certificate-alignment-guide.png` (the three content anchors side by side).
- **Card studio** for member and cabinet cards: CR80 size (85.6 × 54 mm), front and reverse faces, photos or initials, barcode and membership code, signature lines, live preview, eight cards per A4 sheet (2 × 4) with cut guides, single-record printing from any detail page, and a self-contained HTML download for print shops.
- **Administrator handbook** built into the app (`#/manual`, visible only to the Administrator role and linked from the account menu) with instant search, expandable Q&A, and a print/PDF version.
- **Data tools** — full JSON backup/restore (merge or replace), CSV import, CSV export per module, **Remove sample records** (deletes exactly the shipped demonstration dataset, keeps accounts and anything the club entered) and **Empty every module** (start on real data: everything cleared, accounts and settings kept, typed confirmation).
- **Look** — a layered blue design system: azure for actions, cyan accents, indigo secondary data, raised cards with three shadow steps, gradient data marks, precise focus rings and quiet motion (view/list rise-in, reduced-motion aware). Light and dark themes share the palette; no webfonts, no CDN.
- **Shared database** — optional Firebase (Firestore) syncing so several officers work on the same live records. Local-first with an offline queue: edits are saved here and uploaded when there is internet, last write wins on `updatedAt`. Officer accounts, the audit log, verification codes and notifications are never uploaded. No SDK and no CDN — the connector uses the Firestore REST API (`docs/FIREBASE.md`).

---

## Project structure

```
index.html                 single-page layout: login, app shell, overlays, print area
css/
  style.css                design tokens, reset, boot/login, shell, print, keyframes
  components.css           cards, tables, badges, forms, modals, charts, module extras
  responsive.css           desktop / laptop / tablet / mobile (drawer, stacked tables)
js/
  core/                    app framework (no module knows about another)
    icons.js               inline SVG sprite (no external icon fonts)
    utils.js               helpers: dates, numbers, money, CSV, files, formatting
    store.js               data layer: collections, events, backup/restore, IndexedDB files
    data.js                demo seed, role definitions, catalogues, placeholders
    auth.js                sessions, password hashing, role/permission matrix
    ui.js                  UI kit: cards, tables, badges, modals, toasts, states
    forms.js               schema-driven forms, validation, attendance grid, file fields
    charts.js              dependency-free SVG chart renderers (line, bar, donut, hbar, heatmap)
    crud.js                create/edit/delete/duplicate flows, code previews, export
    print.js               printable documents + preview modal + print stylesheet
    cards.js               card studio: member ID cards and cabinet position cards
    certbg.js              certificate backgrounds: 2 built-in designs + club-uploaded image
    cloud.js               cloud backup connectors: synced folder + Microsoft OneDrive (Graph)
    sync.js                shared-database sync (Firebase Firestore REST) with an offline queue
    metrics.js             every statistic used by dashboards and analytics
    router.js              hash router with params, guards and error boundaries
    module.js              declarative list/detail/CRUD module builder
    shell.js               sidebar, top bar, theme, command palette, notifications
  modules/                 one file per module (22 files, same public shape)
    manual.js              administrator handbook content + searchable, printable view
  app.js                   boot sequence and global wiring
assets/logo/logo.svg       club mark used in the app, login screen and printed documents
docs/MRHS-ICT-Club-Master-User-Manual.pdf   printable copy of the in-app manual
docs/certificate-design-preview.png        rendered preview of the certificate design
docs/certificate-template-background.svg   the default navy & gold certificate artwork
docs/certificate-background.svg            the classic cream certificate artwork
docs/certificate-alignment-guide.png       the three content anchors side by side
docs/CLOUD-STORAGE.md                      where to keep backups and which cloud service to use
docs/ONEDRIVE.md                           connecting Microsoft 365 / OneDrive (both routes, step by step)
docs/DATABASE-OPTIONS.md                    shared-database choices (Supabase, Firebase, PocketBase, Sheets) and what each needs
docs/FIREBASE.md                           the Firebase shared database: setup, rules, behaviour, troubleshooting
```

### Data layer

`Store` is the only component that touches persistence, so it can be replaced by a REST/SDK
backend without changing a single module:

```js
Store.init()                       // open LocalStorage + IndexedDB
Store.all('members')               // read a collection
Store.insert('members', record)    // create
Store.update('members', id, patch) // update
Store.remove('members', id)        // delete
Store.on('change', fn)             // react to any write
Store.exportAll() / importAll(json, 'merge' | 'replace')
Store.resetDemoData()
```

Files (photos, documents, gallery images) are kept in IndexedDB and referenced by id, keeping
LocalStorage small. If a browser blocks storage, the app shows a clear message instead of
failing silently.

### Record identifiers

`MRHS-ICT-M001` members · `MRHS-ICT-C001` courses · `MRHS-ICT-MTG-001` meetings ·
`MRHS-ICT-A001` activities · `MRHS-ICT-P001` projects · `MRHS-ICT-R001` reports ·
`MRHSICT-2026-CERT-0001` certificates · `MRHS-ICT-EQ-0001` equipment ·
`INC-/EXP-0001` transactions.

Attendance rate is always **Present ÷ Expected × 100**, with "Late" counting as attended
(configurable in Settings).

---

## Accessibility & responsiveness

- Semantic landmarks, skip-friendly navigation, ARIA roles on tabs, dialogs, menus and the command palette, and visible focus styles throughout.
- All icons are inline SVG with `aria-hidden` decoration; every form control has a label.
- Keyboard support: `Tab`/`Shift+Tab` through every control, `Esc` closes dialogs, `Ctrl/⌘+K` opens search, arrow keys navigate the chart tooltips.
- Layouts for desktop, laptop, tablet and mobile: the sidebar becomes a drawer, wide tables reflow into label/value cards, forms drop to a single column, stat and record grids stack.
- Light, dark and system themes with AA-contrast text and `prefers-reduced-motion` support.

---

## Current limitations

- There is **no server required** — data is per-browser by default; use backup/restore to move data between devices, or connect the optional Firebase shared database (Settings → Data) so connected devices exchange records automatically.
- QR check-in is a designed placeholder; the attendance data model and reporting are already in place.
- Demo data is generated deterministically for a Ugandan secondary school; replace it from **Settings → Data → Reset** once real records are entered.

---

© 2026 Mbazzi Riverside High School ICT Club — built as a self-contained offline-first web app.
