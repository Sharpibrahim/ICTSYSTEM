# ICT Club Management System

A complete, self-hosted management system for a **secondary school ICT club**. It tracks
**students, the executive committee, club dues, reports, meetings, activities, courses, attendance,
certificates, notes and projects** — with a live school dashboard, class-based attendance registers,
a dues register with receipts, and printable certificates.

Built for the way a secondary school actually runs: **classes S1–S6**, streams and houses, **Terms 1–3**,
class representatives, a **teacher patron**, **parent/guardian contacts** and termly club dues in
local currency (UGX by default).

Built with **React + Vite** on the front end and **Express + SQLite** (Node's built-in `node:sqlite`) on
the back end. No external database, no cloud services, no native build steps — `npm run dev` and you're in.

---

## Table of contents

- [Feature tour](#feature-tour)
- [Quick start](#quick-start)
- [Demo accounts](#demo-accounts)
- [How the system is organised](#how-the-system-is-organised)
- [Modules in detail](#modules-in-detail)
- [Permissions](#permissions)
- [Screens & views](#screens--views)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Testing](#testing)
- [Everyday tasks (recipes)](#everyday-tasks-recipes)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Project structure](#project-structure)

---

## Feature tour

| Module | What it does |
| --- | --- |
| **Dashboard** | Live school-club statistics: turnout trend, class sizes, dues collection (expected / collected / outstanding), students owing dues with guardian phone numbers, upcoming meetings and activities, task deadlines, best & weakest attendance, skills cloud, house and stream mix. |
| **Students** | Student and teacher profiles — admission number, **class S1–S6**, stream, house, club role, guardians' names and phone numbers, skills, interests, photo and notes — plus attendance rate per student, card & table views, CSV import and export. |
| **Executive Committee** | Positions from Chairperson and Treasurer to **Class Representative** and **Teacher Patron**, with term of office, display order, responsibilities and achievements — current and past committees. |
| **Club Dues** | Termly dues register: generate a term's dues for a whole class or the whole school, record part-payments, auto-calculated balances and statuses (Paid / Partial / Unpaid / Exempt), receipt numbers, payment method and a collection summary by class. |
| **Meetings** | Agendas, minutes, decisions and action items, chairperson and minute taker, venue/mode, status, plus a one-click attendance register per meeting. |
| **Activities** | Workshops, inter-house and inter-school competitions, ICT week, career day, outreach… with budget vs. spent, partners, expected vs. actual participants and outcomes. |
| **Courses** | Course catalogue (code, level, trainer, schedule, capacity, fee), syllabus, enrolment, one-click enrolment of active members and bulk certificate issuing to completers. |
| **Attendance** | Register sheet for every meeting / activity / course / project session: mark Present, Late, Absent, Excused, marked late or Left Early, record check-in times, mark-all-present, and see who still owes dues before you save. Insights tab ranks students and sessions. |
| **Reports** | **Reports Studio** turns live data into a written official report (13 sections, including club dues) that can be copied, downloaded or saved as a report record with an approval workflow (Draft → Submitted → Under Review → Approved/Rejected → Archived). |
| **Certificates** | Issue certificates and awards, auto-numbered (`ICTC/2026/0001`) with verification codes, printable certificate layout showing the recipient's class, public verification page (`/verify`). |
| **Notes** | Colour-coded sticky-note board for club announcements, meeting notes, course notes, examination tips, resources and to-dos, with visibility rules (Public / Executive only / Private). |
| **Projects** | Project portfolio with objectives, tools used, team roster, progress, priority, deadlines and repos — plus a task board (drag between columns) linked to each project. |
| **User accounts & settings** | Admin / executive / student access levels, linking accounts to student or teacher profiles, password change, school profile (patron, term, dues), activity log, JSON backup, full CSV export and a one-click **demo school data** loader. |

Everything is searchable, filterable, sortable and exportable to CSV.

---

## Quick start

```bash
# 1. install the root, server and client dependencies (one command)
npm run setup

# 2. load the demo school (82 members, 210 dues records, 1,178 attendance rows,
#    12 meetings, 16 activities, 11 courses, 48 certificates, 10 projects…)
npm run db:seed

# 3. start the API and the web app together
npm run dev
```

Then open **http://localhost:5173** and sign in with a demo account.

| Service | URL | Notes |
| --- | --- | --- |
| Web app (Vite dev server) | http://localhost:5173 | proxies `/api` to the API |
| API | http://localhost:4000 | `GET /api/health` for a quick check |
| SQLite database | `server/data/ictclub.db` | created on first run |

Production-style single-port run:

```bash
npm run build              # builds the client into client/dist
npm --prefix server start  # API + the built client served from http://localhost:4000
```

---

## Demo accounts

| Role | Email | Password | Can do |
| --- | --- | --- | --- |
| **Teacher patron / Administrator** | `admin@school.ac.ug` | `admin123` | Everything, including dues generation, user accounts, settings and backups |
| **Student executive** | `executive@school.ac.ug` | `executive123` | All club records, dues, attendance, reports and certificates — no user management |
| **Student member** | `member@school.ac.ug` | `member123` | Read-only access plus their own notes/reports/tasks |

Students can self-register from the sign-in screen (they receive member-level access, and can pick
their class while registering). The login screen has one-click buttons that fill in each demo account.

The demo school is **St. Bernard Secondary School**, club patron **Mr. Ssekandi John**, current term
**Term 1, 2026**, dues **UGX 10,000 per term**, attendance target **75%**.

### Loading the sample school data

The demo school is generated by one deterministic seeder, so the screens always look the same:

| Records | Count |
| --- | --- |
| Students in S1–S6 (plus teacher patrons and alumni) | 82 |
| Executive committee positions (incl. class representatives) | 18 |
| Club dues records across three terms | ~210 |
| Course registrations | 238 |
| Attendance records | ~1,200 |
| Meetings / activities / courses | 12 / 16 / 11 |
| Certificates / reports / notes | 48 / 12 / 12 |
| Projects, team members and tasks | 10 / 34 / 70 |

You can reload it at any time:

- **From the app** — sign in as the administrator, open **Settings → Demo school data → Load demo school data**.
  This replaces every record with a fresh sample school and keeps you signed in (the API issues a new session
  for the matching demo account), so you land straight back on a fully populated dashboard.
- **From the command line** — `npm run db:reset` wipes and reseeds, `npm run db:seed` fills an empty database.

Reloading from the command line (`npm run db:reset`) replaces the `sessions` table as well, so any browser tab
that was signed in is returned to the sign-in screen with an explanation — never a broken dashboard. A wrong
password is reported as “Incorrect password”, not as an ended session.

---

## How the system is organised

```
shared/schema.js      ← single source of truth: every record type, field, option list and rule
      │
      ├── server/src/crud.js   builds REST endpoints, SQL, validation and permissions from the schema
      │        └── server/src/routes.js  dashboard analytics, attendance registers, dues register,
      │                                  reports data, certificate verification, exports, backups,
      │                                  settings
      │
      └── client/src/pages/…   renders tables, forms, boards and charts from the same schema
```

Because both sides read one schema file, adding a field or a whole new module is a one-file change:
add it to `shared/schema.js` (**and** add the matching `CREATE TABLE` line in `server/src/db.js`), and the
API, list view, filters, form, detail page, CSV export and search pick it up automatically.

---

## Modules in detail

### Students
- Profiles include admission number, email, phone, gender, date of birth, **class (S1–S6)**, **stream**,
  **house**, club role (Student Member / Executive / Teacher Patron / Alumni / Guest), membership status,
  date joined the club, skills, interests, home address/village, **parent or guardian name, phone and
  relationship**, photo and bio.
- Each student record shows live **attendance rate**, course registrations, certificates, project teams
  and their **dues history**.
- **Import**: paste CSV data (headers: `full_name, admission_number, class_level, stream, house, guardian_name, guardian_phone, …`).
- **Export**: any list can be downloaded as CSV, respecting the filters you applied.

### Executive committee
- Positions carry a term (e.g. `2026`), start/end dates, status (Active/Past/Suspended), official email,
  responsibilities and achievements. Lower *display order* numbers appear first.
- Includes **Class Representatives** (one voice per class) and the **Teacher Patron**; past committees
  are kept for history — the term filter switches between them.

### Club dues
1. **Generate term dues** — pick the term and academic year, the amount (defaults to the amount set in
   Settings) and optionally one class; the system creates one dues record per active student and skips
   those who already have a record for that term.
2. **Record a payment** — open any record and enter the amount received; part-payments are allowed.
   The balance, status (Paid / Partial / Unpaid / Exempt) and a receipt number (`RCT/<year>/<sequence>`)
   are computed automatically, along with the payment method and who received it.
3. **Track collection** — the Club Dues page summarises expected, collected and outstanding totals by
   class; the dashboard shows students still owing together with their guardian phone number; the
   attendance register flags students who owe dues.

### Meetings
- Records the type (General Meeting, Executive Meeting, Class Representatives Meeting, Training Session,
  AGM, Emergency…), date/time, venue, mode (Physical/Online/Hybrid), online link, chairperson and minute
  taker.
- Stores the **agenda**, **minutes**, **resolutions/decisions** and **action items** as long text.
- The detail page shows the linked **attendance register** (present/absent counts are computed live).

### Activities
- Category (Workshop, Training, Bootcamp, Hackathon, **Inter-house Competition**, **Inter-school
  Competition**, Coding Challenge, Exhibition, ICT Week, Career Day, Science & Innovation Fair, Outreach,
  Assembly Presentation, Study Tour, Fundraiser…), dates, venue, mode, lead organiser, partner.
- Financial tracking: **budget vs. amount spent** per activity; the Reports Studio totals them.
- Expected vs. actual participants and an outcomes/highlights field for post-event write-ups.

### Courses, registrations & certificates
- Course catalogue with code, category, level, trainer, schedule, duration, venue, capacity, fee,
  certificate flag, syllabus and status (Upcoming/Ongoing/Completed/Cancelled).
- **Enrol active students** in one click, or add registrations individually with progress, score and remarks.
- **Issue certificates** to everyone who completed a course — numbered, with verification codes and
  duplicate protection.

### Attendance
1. Open **Attendance → Register**, pick the session type (Meeting / Activity / Course / Project) and the session.
2. The roster lists every active student, grouped so you can filter by **class**. Choose a status per
   student, add check-in times and remarks. Use “Mark all present”, `Status` → unmarked quick buttons,
   or search to find a student fast.
3. **Save register** writes the whole sheet in one request (creates, updates and clears rows).
4. The **Insights** tab ranks students and sessions, shows turnout against the club target and lists
   students who need follow-up.

### Reports Studio
- Date-ranged statistics for membership, attendance, meetings, activities, finances, **club dues**,
  courses, certificates, projects and the executive committee — printable straight from the browser.
- **Generate report** writes a 13-section draft (Introduction, Membership, Attendance, Meetings Held,
  Activities & Finance, **Club Dues**, Courses & Training, Certificates & Awards, Projects, Executive
  Committee, Challenges, Recommendations, Conclusion) with real numbers and signature lines. Copy it,
  download it as `.txt`, or save it as a report record that flows through the approval workflow.

### Certificates
- Types: Participation, Completion, Achievement, Appreciation, Leadership, Award, Best Student,
  Competition Winner, Membership.
- Auto number (`ICTC/<year>/<sequence>`), auto verification code (`ICT-XXXXXX`), issue date, issuer,
  signatory, grade/remark and citation text. The printed certificate shows the student's **class**.
- **Preview & print** renders a framed certificate (print to PDF straight from the browser).
- **Public verification**: `/verify` (no login) — guardians and schools can confirm a certificate by
  code or number.

### Notes & projects
- Notes use colour-coded cards with categories (club announcements, meeting notes, course notes,
  examination tips…), tags, pinning and visibility rules.
- Projects group a team (with roles), objectives, tools used, budget, links and a **task board**
  (To Do → In Progress → Blocked → In Review → Done) where cards can be dragged between columns.

---

## Permissions

| Capability | Teacher patron (admin) | Student executive | Student member |
| --- | :-: | :-: | :-: |
| View dashboard, records and statistics | ✅ | ✅ | ✅ |
| Create / edit / delete students, the executive committee, meetings, activities and courses | ✅ | ✅ | — |
| Maintain course registrations | ✅ | ✅ | — |
| Mark attendance registers | ✅ | ✅ | — |
| Record dues payments | ✅ | ✅ | — |
| Generate a term's dues register | ✅ | ✅ | — |
| Issue certificates | ✅ | ✅ | — |
| Add and edit their own notes, reports and project tasks | ✅ | ✅ | ✅ (own only) |
| Manage user accounts, settings and backups | ✅ | — | — |

---

## Screens & views

- **List view** — every module with search, filters, sorting, pagination and CSV export.
- **Card view** — students, courses, certificates, notes and projects render as rich cards.
- **Board view** — project tasks, course registrations and reports render as kanban columns (drag to change status).
- **Calendar view** — meetings and activities render on a month calendar with the month's schedule below.
- **Attendance register** — a purpose-built marking sheet with live summary counters and a dues warning.
- **Dues register** — balance-first table with a one-click payment dialog and receipt numbers.
- **Certificate preview** — print-ready framed certificate showing the recipient's class.
- **Public verification** — standalone page for checking a certificate.

---

## API reference

All endpoints are under `/api`. Everything except `health`, `auth/login`, `auth/signup` and
`verify/:code` requires an `Authorization: Bearer <token>` header.

### Collections (generic, available for every module)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/:resource` | List with `q` (search), filters (`field=value`, `field__ne/gte/lte/like/in`), `sort=field` or `-field`, `page`, `pageSize`, `all=1` |
| `GET` | `/api/:resource/:id` | Single record plus linked `relations` (attendance register, team, tasks, certificates, dues…) |
| `POST` | `/api/:resource` | Create (validated, permission-checked) |
| `PATCH` / `PUT` | `/api/:resource/:id` | Partial update |
| `DELETE` | `/api/:resource/:id` | Delete |

`:resource` ∈ `members, cabinet, meetings, activities, courses, enrollments, attendance, dues, reports,
certificates, notes, projects, project_members, project_tasks, users`.

**Examples**

```bash
curl "localhost:4000/api/members?class_level=S3&stream=A&sort=-full_name&pageSize=10"
curl "localhost:4000/api/dues?status=Unpaid&sort=-balance"
curl "localhost:4000/api/attendance?ref_type=meeting&ref_id=4&sort=-session_date"
curl "localhost:4000/api/search?q=robotics"
```

### Specialised endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` · `/api/auth/signup` · `/api/auth/logout` | Session handling |
| `GET` | `/api/auth/me` · `POST /api/auth/password` | Current user · change password |
| `GET` | `/api/meta` | The full schema, option lists and settings (used by the client) |
| `GET` | `/api/options/:resource` | Lightweight `{value,label,sub}` lists for dropdowns |
| `GET` | `/api/dashboard` | Every dashboard widget in one payload (including dues finance and defaulter watchlist) |
| `POST` | `/api/dues/generate` | Create a term's dues records for a class or the whole school |
| `POST` | `/api/dues/:id/payment` | Record a payment against one student's dues record |
| `GET` | `/api/dues/summary` | Collection totals, by class and by term |
| `GET` | `/api/attendance/register?ref_type=&ref_id=&class_level=` | Roster + existing marks + dues flags + summary |
| `POST` | `/api/attendance/register` | Bulk save a whole register |
| `POST` | `/api/attendance/mark-all` | Mark all active students present |
| `GET` | `/api/reports/data?from=&to=` | Statistics used by the Reports Studio (including dues) |
| `GET` | `/api/certificates/:id/printable` | Certificate + settings for printing |
| `GET` | `/api/verify/:code` | **Public** certificate verification |
| `GET` | `/api/export/:resource` | CSV download (honours filters) |
| `GET` | `/api/backup` | Full JSON backup (admin) |
| `GET`/`PUT` | `/api/settings` | School and club profile |
| `POST` | `/api/members/import` | Bulk student import |
| `POST` | `/api/courses/:id/enroll` | Enrol students into a course |
| `POST` | `/api/courses/:id/issue-certificates` | Issue certificates to completers |
| `GET` | `/api/activity` | Audit trail |

---

## Data model

```
members ──┬─< cabinet            (student or teacher holds a position for a term)
          ├─< enrollments >──── courses ──< certificates
          ├─< attendance  ────> (meeting | activity | course | project)
          ├─< dues               (one row per student per term)
          ├─< certificates
          ├─< reports            (author / reviewer)
          ├─< notes              (author)
          └─< project_members >── projects ──< project_tasks
```

- `attendance` links to **any** session through `ref_type` + `ref_id` (meeting, activity, course, project).
- `reports` and `certificates` use the same polymorphic pattern (`related_type` + `related_id`).
- `dues` stores the term, academic year, amount due and amount paid; the **balance** and **status** are
  derived on the server, and the receipt number is issued automatically when money is received.
- Every table has `created_at` / `updated_at`; deleting a parent cascades to its children where it
  makes sense (deleting a student removes their registrations, attendance, certificates, cabinet, dues
  and team rows).

---

## Testing

```bash
npm test              # API checks + every screen and interaction in the UI
npm run test:api      # 66 API checks (needs the API running)
npm run test:ui       # 42 screens + 8 interaction flows in jsdom
npm run test:flows    # 13 write flows: every action is saved and read back
npm run test:all      # everything above, in one go
```

- **API tests** (`server/test/api-test.mjs`, 66 checks) cover authentication, permissions, validation,
  filtering, sorting, pagination, CRUD, the dues register (generation, repeat generation, part-payments,
  receipts, summary, role guards), attendance bulk-save, analytics, exports, backups, certificate
  verification, the course/certificate automations and the demo-data reload endpoint (admin only,
  and it re-reads the dashboard afterwards).
- **UI smoke test** (`client/test/smoke.mjs`, 42 screens + 8 interactions) renders **every screen and every
  view mode** (table, cards, board, calendar, class-filtered registers, detail pages) against the live API
  in headless jsdom, failing on React errors, empty screens or values the API no longer sends. It then
  drives real interactions: opening the create form, filtering a list, marking attendance, switching list
  views, recording a dues payment, opening the dues generator and generating a report draft.
- **Write-flow test** (`client/test/flows.mjs`, 13 flows) proves the buttons really save: it fills the real
  forms, submits them, and then re-reads the API to confirm the change — create/edit/delete a student
  (including the chip-style interests field), record a dues payment and check the receipt plus the
  collection total, save an attendance register, register a completer and issue their certificate, save a
  generated report, create a note, save the club profile, and verify a certificate on the public page.
  Finally it reloads the demo school from Settings (and checks the user stays signed in), checks that an
  expired session drops the user back to the sign-in screen with an explanation, and that a wrong password
  is reported as a password problem rather than an ended session. It cleans up after itself, so it can be
  run repeatedly.
- Both UI suites are **role aware**: `AS=member node test/smoke.mjs` (or `cabinet`; the default is `admin`)
  signs in as that account. Member runs skip the screens only an admin may open and *assert that write
  controls are hidden* from read-only students; cabinet runs exercise the full student-executive flow.

> The tests add and remove their own records, but running them still changes demo data slightly
> (attendance marks, dues payments, issued certificates). Run `npm run db:reset` afterwards for a pristine
> demo school.

## Everyday tasks (recipes)

| Task | Steps |
| --- | --- |
| **Record attendance for today's club meeting** | Attendance → Register → choose the meeting → filter by class → set statuses (or “Mark all present”) → Save register |
| **Open the term's dues register** | Club Dues → *Generate term dues* → pick the term, year and amount → Generate |
| **Record a student's dues payment** | Club Dues → filter status *Unpaid* → click the receipt icon on the student's row → enter the amount → Save |
| **Chase outstanding dues** | Dashboard → *Students with outstanding dues* (shows the guardian's phone number) or Reports Studio → Club Dues section |
| **Take minutes** | Meetings → open the meeting → Edit → paste into *Minutes*, *Resolutions* and *Action items* → set status *Completed* |
| **Write the end-of-term report** | Reports Studio → set the date range → Generate report → Save as report record → edit and submit |
| **Give certificates to a class** | Courses → open the course → set registrations to *Completed* → *Issue certificates* → preview and print |
| **Register 40 new students** | Students → Import → paste CSV → review the preview → Import |
| **Plan an inter-house competition** | Activities → New activity (category *Inter-house Competition*, budget, partners, expected participants) → save, then Record attendance on the day |
| **Track a project** | Projects → New project → add team members under *Project team* → add tasks → drag tasks across the board as work progresses |
| **Verify a certificate** | Open `/verify`, type the code (e.g. `ICT-8A3F2C`) or the number (`ICTC/2026/0007`) |
| **Back up the club** | Settings → Download backup (JSON) — keep it with the club documents |

---

## Configuration

| Setting | Where | Default |
| --- | --- | --- |
| API port | `PORT` env var | `4000` |
| Bind address | `HOST` env var | `0.0.0.0` |
| Database file | `DB_PATH` env var | `server/data/ictclub.db` |
| Web dev port | `PORT` env var for the client | `5173` |
| API target for the dev proxy | `API_URL` env var | `http://localhost:4000` |
| Club name, school name, patron, academic year, current term, **dues per term**, currency, contacts, meeting day, attendance target | Settings screen (stored in the DB) | St. Bernard Secondary School defaults |

---

## Deployment

The simplest deployment is a single process serving both the API and the built client:

```bash
npm run setup
npm run build                 # → client/dist
npm run db:seed               # first time only
npm --prefix server start     # serves API + client on http://localhost:4000
```

Put it behind any reverse proxy (nginx, Caddy) or run it on a small VPS/Raspberry Pi in the school's
computer lab. Notes:

- The database is a single file — back it up by copying `server/data/ictclub.db` (or use *Settings → Download backup*).
- Sessions are opaque tokens stored in the `sessions` table (7-day expiry); signing out deletes the token.
- Passwords are hashed with `scrypt` and a per-user salt (Node `crypto`, no external dependency).
- To run on the school network, keep `HOST=0.0.0.0` and open the port; if it is exposed to the internet,
  put HTTPS in front of it.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| “No user accounts found” in the API log | Run `npm run db:seed` |
| Forgot the admin password | `npm run db:reset` (wipes data) or create a user directly in the DB with a scrypt hash |
| `Cannot find module 'node:sqlite'` | Node 22+ is required (the project uses the built-in SQLite driver) |
| Port already in use | Start with `PORT=4100 npm run dev:api` and `API_URL=http://localhost:4100 npm run dev:web` |
| Demo data has drifted | `npm run db:reset` restores the seeded school |
| Login fails after a database reset | Sign in again — the app now returns you to the sign-in screen with a message when a stored token is no longer valid |
| Dashboard shows an error instead of statistics | The session ended (the demo data was reloaded, or you signed out elsewhere). Sign in again; the app should already have returned you to the sign-in screen |

---

## Project structure

```
.
├── package.json                 root scripts (setup, dev, seed, test, build)
├── shared/
│   └── schema.js                every module, field, option list and permission rule
├── server/
│   ├── src/
│   │   ├── index.js             Express app, static client hosting
│   │   ├── db.js                node:sqlite connection, schema, helpers, settings
│   │   ├── auth.js              scrypt hashing, sessions, role guards
│   │   ├── crud.js              generic REST engine (SQL, validation, permissions, CSV)
│   │   ├── routes.js            dashboard, attendance registers, dues register, reports data, exports…
│   │   └── seed.js              demo school generator (npm run db:seed / db:reset)
│   ├── test/api-test.mjs        64 API regression checks
│   └── data/ictclub.db          SQLite database (created on first run, git-ignored)
└── client/
    ├── src/
    │   ├── App.jsx              routes + auth guard
    │   ├── api.js               fetch wrapper (bearer token, downloads)
    │   ├── auth.jsx             session context
    │   ├── hooks.js             option cache, debounce, async loader
    │   ├── icons.jsx            inline SVG icon set
    │   ├── styles.css           design system (light UI, dark sidebar, print styles)
    │   ├── components/          Layout, DataTable, RecordForm, RecordDetail, charts, certificate
    │   └── pages/               Dashboard, ResourcePage, RecordDetailPage, AttendancePage,
    │                            ReportsPage, SettingsPage, LoginPage, VerifyPage
    └── test/
        ├── smoke.mjs            headless render + interaction test (role aware)
        ├── flows.mjs            write-flow test: every action saved and read back
        └── ssr-entry.jsx        harness entry used by both test suites
```

---

*Built for school ICT club patrons and student executives who need to know who attended, who has paid
their dues, what was decided and what was spent — without spreadsheets.*
