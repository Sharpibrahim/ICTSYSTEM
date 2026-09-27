# ICT Club Management System

A complete, self-hosted management system for an ICT club / student tech society. It tracks
**members, cabinet, reports, meetings, courses, activities, attendance, certificates, notes and projects** —
with a live dashboard, attendance registers, a report-writing studio and printable certificates.

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
| **Dashboard** | Live club statistics: attendance trend, membership growth, department mix, project status, task deadlines, upcoming meetings/activities, best & worst attendance, skills cloud, recent activity. |
| **Members** | Full member profiles (reg. number, contacts, department, year, skills, interests, bio), attendance rate per member, card & table views, CSV import and export. |
| **Cabinet** | Executive positions with term of office, order of precedence, responsibilities and achievements — current and past administrations. |
| **Meetings** | Agendas, minutes, decisions and action items, chairperson and minute taker, venue/mode, status, plus a one-click attendance register per meeting. |
| **Activities** | Workshops, hackathons, outreach, competitions… with budget vs. spent, partners, expected vs. actual participants and outcomes. |
| **Courses** | Course catalogue (code, level, instructor, schedule, capacity, fee), syllabus, enrollment, automatic enrollment of members and bulk certificate issuing to completers. |
| **Attendance** | Register sheet for every meeting / activity / course / project session: mark Present, Late, Absent, Excused or Left Early, record check-in times, mark-all-present, then save the whole register in one action. Insights tab ranks members and sessions. |
| **Reports** | **Reports Studio** turns live data into a written official report (11 sections) that can be copied, downloaded or saved as a report record with an approval workflow (Draft → Submitted → Under Review → Approved/Rejected → Archived). |
| **Certificates** | Issue certificates/awards, auto-numbered (`ICTC/2026/0001`) with verification codes, printable certificate layout, public verification page (`/verify`). |
| **Notes** | Colour-coded sticky-note board for announcements, meeting notes, ideas, resources and to-dos, with visibility rules (Public / Cabinet only / Private). |
| **Projects** | Project portfolio with objectives, tech stack, team roster, progress, priority, deadlines, repos/demos — plus a task board (drag between columns) linked to each project. |
| **User accounts** | Admin / cabinet / member access levels, linking accounts to member profiles, password change, activity log, JSON backup and full CSV export. |

Everything is searchable, filterable, sortable and exportable to CSV.

---

## Quick start

```bash
# 1. install the root, server and client dependencies (one command)
npm run setup

# 2. load the demo club (42 members, 12 meetings, 14 activities, 10 courses,
#    ~800 attendance records, 34 certificates, 10 projects…)
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
npm run build            # builds the client into client/dist
npm --prefix server start  # API + the built client served from http://localhost:4000
```

---

## Demo accounts

| Role | Email | Password | Can do |
| --- | --- | --- | --- |
| **Administrator** | `admin@ictclub.org` | `admin123` | Everything, including user accounts, settings and backups |
| **Cabinet member** | `cabinet@ictclub.org` | `cabinet123` | All records, attendance, reports, certificates — no user management |
| **Member** | `member@ictclub.org` | `member123` | Read-only access plus their own notes/reports/tasks |

New members can self-register from the sign-in screen (they receive member-level access).
The login screen has one-click buttons that fill in each demo account.

---

## How the system is organised

```
shared/schema.js      ← single source of truth: every record type, field, option list and rule
      │
      ├── server/src/crud.js   builds REST endpoints, SQL, validation and permissions from the schema
      │        └── server/src/routes.js  dashboard analytics, attendance registers, reports data,
      │                                  certificate verification, exports, backups, settings
      │
      └── client/src/pages/…   renders tables, forms, boards and charts from the same schema
```

Because both sides read one schema file, adding a field or a whole new module is a one-file change:
add it to `shared/schema.js` (**and** add the matching `CREATE TABLE` line in `server/src/db.js`), and the
API, list view, filters, form, detail page, CSV export and search pick it up automatically.

---

## Modules in detail

### Members
- Profiles include registration number, email, phone, gender, date of birth, department, programme,
  year of study, club role and status, join date, skills, interests, address, emergency contact, photo and bio.
- Each member record shows live **attendance rate**, course registrations, certificates and project teams.
- **Import**: paste CSV data (headers: `full_name, reg_number, email, phone, department, year_of_study, status, …`).
- **Export**: any list can be downloaded as CSV, respecting the filters you applied.

### Cabinet
- Positions carry a term (e.g. `2025/2026`), start/end dates, status (Active/Past/Suspended),
  official email, responsibilities and achievements. Lower *display order* numbers appear first.
- Past administrations are kept for history — the term filter switches between them.

### Meetings
- Records the type (General Assembly, Cabinet Meeting, Committee Meeting, AGM, Emergency…),
  date/time, venue, mode (Physical/Online/Hybrid), online link, chairperson and minute taker.
- Stores the **agenda**, **minutes**, **resolutions/decisions** and **action items** as long text.
- The detail page shows the linked **attendance register** (present/absent counts are computed live).

### Activities
- Category (Workshop, Bootcamp, Hackathon, Competition, Outreach, Community Service, Seminar,
  Tech Talk, Exhibition, Sports, Social Event, Fundraiser), dates, venue, mode, lead organiser, partner.
- Financial tracking: **budget vs. amount spent** per activity; the Reports Studio totals them.
- Expected vs. actual participants and an outcomes/highlights field for post-event write-ups.

### Courses, enrolments & certificates
- Course catalogue with code, category, level, instructor, schedule, duration, venue, capacity, fee,
  certificate flag, syllabus and status (Upcoming/Ongoing/Completed/Cancelled).
- **Enrol active members** in one click, or add enrolments individually with progress, score and remarks.
- **Issue certificates** to everyone who completed a course — numbered, with verification codes and
  duplicate protection.

### Attendance
1. Open **Attendance → Register**, pick the session type (Meeting / Activity / Course / Project) and the session.
2. The roster lists every active member. Choose a status per member, add check-in times and remarks.
   Use “Mark all present”, “`Status` → unmarked” quick buttons, or search to find a member fast.
3. **Save register** writes the whole sheet in one request (creates, updates and clears rows).
4. The **Insights** tab ranks members and sessions, shows turnout against the club target and lists
   members who need follow-up.

### Reports Studio
- Date-ranged statistics for membership, attendance, meetings, activities, finances, courses,
  certificates, projects and the executive committee — printable straight from the browser.
- **Generate report** writes an 11-section draft (Introduction, Membership, Attendance, Meetings,
  Activities & Finance, Courses & Certificates, Projects, Executive Committee, Challenges,
  Recommendations, Conclusion) with real numbers and signature lines. Copy it, download it as `.txt`,
  or save it as a report record that flows through the approval workflow.

### Certificates
- Types: Participation, Completion, Achievement, Appreciation, Leadership, Award, Membership.
- Auto number (`ICTC/<year>/<sequence>`), auto verification code (`ICT-XXXXXX`), issue date, issuer,
  signatory, grade/remark and citation text.
- **Preview & print** renders a framed certificate (print to PDF straight from the browser).
- **Public verification**: `/verify` (no login) — anyone can confirm a certificate by code or number.

### Notes & projects
- Notes use colour-coded cards with categories, tags, pinning and visibility rules.
- Projects group a team (with roles), objectives, tech stack, budget, links and a **task board**
  (To Do → In Progress → Blocked → In Review → Done) where cards can be dragged between columns.

---

## Permissions

| Capability | Admin | Cabinet | Member |
| --- | :-: | :-: | :-: |
| View dashboard, records and statistics | ✅ | ✅ | ✅ |
| Create / edit / delete club records (members, meetings, activities, courses, attendance, reports, certificates, notes, projects) | ✅ | ✅ | ❌ |
| Create & edit **their own** notes, reports and tasks | ✅ | ✅ | ✅ |
| Approve reports / issue certificates | ✅ | ✅ | ❌ |
| User accounts, club settings, JSON backup | ✅ | Settings only | ❌ |
| See private & cabinet-only notes | ✅ | ✅ | ❌ |

Members cannot approve their own reports (the status is forced back to *Draft*), cannot see other
user accounts, and cannot delete records they do not own. All rules are enforced server-side in
`server/src/crud.js` (`rowScope`, `canWriteRow`, `canDeleteRow`) — not just hidden in the UI.

---

## Screens & views

- **Table view** — every module, sortable columns, pagination, row actions, CSV export.
- **Card view** — members, courses, certificates, notes and projects render as rich cards.
- **Board view** — project tasks, enrolments and reports render as kanban columns (drag to change status).
- **Calendar view** — meetings and activities render on a month calendar with the month's schedule below.
- **Attendance register** — a purpose-built marking sheet with live summary counters.
- **Certificate preview** — print-ready framed certificate.
- **Public verification** — standalone page for checking a certificate.

---

## API reference

All endpoints are under `/api`. Everything except `health`, `auth/login`, `auth/signup` and
`verify/:code` requires an `Authorization: Bearer <token>` header.

### Collections (generic, available for every module)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/:resource` | List with `q` (search), filters (`field=value`, `field__ne/gte/lte/like/in`), `sort=field` or `-field`, `page`, `pageSize`, `all=1` |
| `GET` | `/api/:resource/:id` | Single record plus linked `relations` (attendance register, team, tasks, certificates…) |
| `POST` | `/api/:resource` | Create (validated, permission-checked) |
| `PATCH` / `PUT` | `/api/:resource/:id` | Partial update |
| `DELETE` | `/api/:resource/:id` | Delete |

`:resource` ∈ `members, cabinet, meetings, activities, courses, enrollments, attendance, reports, certificates, notes, projects, project_members, project_tasks, users`.

**Examples**

```bash
curl "localhost:4000/api/members?status=Active&department=Computer%20Science&sort=-full_name&pageSize=10"
curl "localhost:4000/api/attendance?ref_type=meeting&ref_id=4&sort=-session_date"
curl "localhost:4000/api/search?q=hackathon"
```

### Specialised endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` · `/api/auth/signup` · `/api/auth/logout` | Session handling |
| `GET` | `/api/auth/me` · `POST /api/auth/password` | Current user · change password |
| `GET` | `/api/meta` | The full schema, option lists and settings (used by the client) |
| `GET` | `/api/options/:resource` | Lightweight `{value,label,sub}` lists for dropdowns |
| `GET` | `/api/dashboard` | Every dashboard widget in one payload |
| `GET` | `/api/attendance/register?ref_type=&ref_id=` | Roster + existing marks + summary |
| `POST` | `/api/attendance/register` | Bulk save a whole register |
| `POST` | `/api/attendance/mark-all` | Mark all active members present |
| `GET` | `/api/reports/data?from=&to=` | Statistics used by the Reports Studio |
| `GET` | `/api/certificates/:id/printable` | Certificate + settings for printing |
| `GET` | `/api/verify/:code` | **Public** certificate verification |
| `GET` | `/api/export/:resource` | CSV download (honours filters) |
| `GET` | `/api/backup` | Full JSON backup (admin) |
| `GET`/`PUT` | `/api/settings` | Club profile |
| `POST` | `/api/members/import` | Bulk member import |
| `POST` | `/api/courses/:id/enroll` | Enrol members into a course |
| `POST` | `/api/courses/:id/issue-certificates` | Issue certificates to completers |
| `GET` | `/api/activity` | Audit trail |

---

## Data model

```
members ──┬─< cabinet            (member holds a position for a term)
          ├─< enrollments >──── courses ──< certificates
          ├─< attendance  ────> (meeting | activity | course | project)
          ├─< certificates
          ├─< reports            (author / reviewer)
          ├─< notes              (author)
          └─< project_members >── projects ──< project_tasks
```

- `attendance` links to **any** session through `ref_type` + `ref_id` (meeting, activity, course, project).
- `reports` and `certificates` use the same polymorphic pattern (`related_type` + `related_id`).
- Every table has `created_at` / `updated_at`; deleting a parent cascades to its children where it
  makes sense (deleting a member removes their enrolment, attendance, certificates, cabinet and team rows).

---

## Testing

```bash
npm test              # API tests, then the UI smoke test
npm run test:api      # 54 API checks (needs the API running)
npm run test:ui       # renders all 24 screens + 5 interaction flows in jsdom
```

- **API tests** (`server/test/api-test.mjs`) cover authentication, permissions, validation, filtering,
  sorting, pagination, CRUD, attendance bulk-save, analytics, exports, backups, certificate verification
  and the course/certificate automations.
- **UI smoke test** (`client/test/smoke.mjs`) renders every screen against the live API in a headless
  jsdom environment and fails on React errors or empty screens; it also drives real interactions —
  opening the create form, filtering a list, marking attendance, opening the task board and generating
  a report draft.

> The tests add and remove their own records, but running them changes demo data slightly
> (attendance marks, issued certificates). Run `npm run db:reset` afterwards for a pristine demo club.

---

## Everyday tasks (recipes)

| Task | Steps |
| --- | --- |
| **Record attendance for today's meeting** | Attendance → Register → choose the meeting → set statuses (or “Mark all present”) → Save register |
| **Take minutes** | Meetings → open the meeting → Edit → paste into *Minutes*, *Resolutions* and *Action items* → set status *Completed* |
| **Write the end-of-semester report** | Reports Studio → set the date range → Generate report → Save as report record → edit and submit |
| **Give certificates to a class** | Courses → open the course → set enrolments to *Completed* → *Issue certificates* → preview and print |
| **Register 40 new members** | Members → Import → paste CSV → review the preview → Import |
| **Plan a hackathon** | Activities → New activity (category *Hackathon*, budget, partners, expected participants) → save, then Record attendance on the day |
| **Track a project** | Projects → New project → add team members under *Project team* → add tasks → drag tasks across the board as work progresses |
| **Verify a certificate** | Open `/verify`, type the code (e.g. `ICT-8A3F2C`) or the number (`ICTC/2026/0007`) |
| **Back up the club** | Settings → Download backup (JSON) — keep it with your club documents |

---

## Configuration

| Setting | Where | Default |
| --- | --- | --- |
| API port | `PORT` env var | `4000` |
| Bind address | `HOST` env var | `0.0.0.0` |
| Database file | `DB_PATH` env var | `server/data/ictclub.db` |
| Web dev port | `PORT` env var for the client | `5173` |
| API target for the dev proxy | `API_URL` env var | `http://localhost:4000` |
| Club name, tagline, institution, academic year, currency, contacts, meeting frequency, attendance target | Settings screen (stored in the DB) | ICT Club defaults |

---

## Deployment

The simplest deployment is a single process serving both the API and the built client:

```bash
npm run setup
npm run build                 # → client/dist
npm run db:seed               # first time only
npm --prefix server start     # serves API + client on http://localhost:4000
```

Put it behind any reverse proxy (nginx, Caddy) or run it on a small VPS/Raspberry Pi. Notes:

- The database is a single file — back it up by copying `server/data/ictclub.db` (or use *Settings → Download backup*).
- Sessions are opaque tokens stored in the `sessions` table (7-day expiry); signing out deletes the token.
- Passwords are hashed with `scrypt` and a per-user salt (Node `crypto`, no external dependency).
- To run on a network, keep `HOST=0.0.0.0` and open the port; the app itself is served over plain HTTP, so
  put HTTPS in front of it if it is exposed to the internet.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| “No user accounts found” in the API log | Run `npm run db:seed` |
| Forgot the admin password | `npm run db:reset` (wipes data) or create a user directly in the DB with a scrypt hash |
| `Cannot find module 'node:sqlite'` | Node 22+ is required (the project uses the built-in SQLite driver) |
| Port already in use | Start with `PORT=4100 npm run dev:api` and `API_URL=http://localhost:4100 npm run dev:web` |
| Demo data has drifted | `npm run db:reset` restores the seeded club |
| Login fails after changing `JWT`/session data | Sign out and sign in again (`localStorage` token may be stale) |

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
│   │   ├── routes.js            dashboard, attendance registers, reports data, exports…
│   │   └── seed.js              demo club generator (npm run db:seed / db:reset)
│   ├── test/api-test.mjs        54 API regression checks
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
    └── test/smoke.mjs           headless render + interaction test
```

---

*Built for club executives who need to know who attended, what it cost, and what was decided — without spreadsheets.*
