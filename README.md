# ICT Club Management System

A complete, self-hosted management system for a **secondary school ICT club**. It tracks
**students, the executive committee, club dues, reports, meetings, activities, courses, attendance,
certificates, notes and projects** — with a live school dashboard, class-based attendance registers,
a dues register with receipts, and printable certificates.

Built for the way a secondary school actually runs: **classes S1–S6**, streams and houses, **Terms 1–3**,
class representatives, a **teacher patron**, **parent/guardian contacts** and termly club dues in
local currency (UGX by default).

Built with **plain HTML, CSS and JavaScript** on the front end and **Express + SQLite** (Node's built-in
`node:sqlite`) on the back end. No framework, no bundler, no build step, no external database and no
cloud services — the files in `web/` are exactly what the browser runs, so `npm run serve` and you're in.

---

## Table of contents

- [Feature tour](#feature-tour)
- [Quick start](#quick-start)
- [Signing in](#signing-in)
- [Starting empty, or with the sample school](#starting-empty-or-with-the-sample-school)
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
| **User accounts & settings** | Admin / executive / student access levels, usernames or emails for signing in, linking accounts to student or teacher profiles, password change, school profile (patron, term, dues), activity log, JSON backup and full CSV export. |

Everything is searchable, filterable, sortable and exportable to CSV.

---

## Quick start

```bash
# one command does everything: installs what is missing, prepares the database
# and starts the server (there is nothing to build)
npm run serve
```

Or step by step, if you prefer to see each stage:

```bash
npm run setup      # install the dependencies
npm run db:seed    # create the administrator account (only if the database is empty)
npm run dev        # start the server and restart it when a file changes
```

The system starts **empty**: one administrator account and the club settings, no students, meetings
or payments. Load the sample school only for training or demonstrations — see
[Starting empty, or with the sample school](#starting-empty-or-with-the-sample-school).

`npm run serve -- --check` just reports what is installed and seeded without starting anything.

Then open **http://localhost:4000** and sign in — the one address serves both the app and the API.

| Service | URL | Notes |
| --- | --- | --- |
| Web app | http://localhost:4000 | the same server also answers `/api` |
| API | http://localhost:4000/api | `GET /api/health` for a quick check |
| SQLite database | `server/data/ictclub.db` | created on first run |

Editing the app is just editing `web/` — refresh the browser and the change is there.

---

## Signing in

There is one administrator account — the teacher who runs the club:

| Username | Email | Password |
| --- | --- | --- |
| `Sharp` | `sharp@school.ac.ug` | `SunnyDay@2026` |

You can type **either the username or the email** on the sign-in screen (the field accepts both). The
password box has a reveal button and warns you if Caps Lock is on, because passwords are case-sensitive.

Everyone else gets their own account, created in either of two ways:

- **By the club** — Administration → User Accounts → *New user account*, choosing the access level
  (Administrator / Student executive / Student member) and optionally linking the account to a
  student or teacher profile.
- **By the student** — *Register as a student* on the sign-in screen; self-registered accounts get
  read-only access plus their own notes, reports and tasks.

To change the administrator credentials, or to recover from a lost password:

```bash
npm --prefix server run admin                                    # reset to Sharp / SunnyDay@2026
npm --prefix server run admin -- --password "NewPass@2026"        # choose your own password
npm --prefix server run admin -- --username "Amina" --email amina@school.ac.ug --password "Secret@123"
```

The command creates the account if it is missing, updates it if it exists, links it to the teacher
patron profile and removes the login accounts that earlier versions shipped with.

---

## Starting empty, or with the sample school

A new installation holds exactly one account (the administrator) and the club settings — no students,
meetings or payments. Enter your own records from the Students, Meetings and Club dues screens, or set
the school up first in **Settings → Club profile** (school name, patron, term, dues per term).

| Command | What it does |
| --- | --- |
| `npm run db:seed` | Creates the administrator account and the club settings **only if the database has no account yet** — safe to run any time |
| `npm run db:reset` | **Erases every club record** and leaves the empty system behind (one administrator account). Use it to clear practice entries before the club starts for real |
| `npm run db:demo` | Erases everything and loads the sample secondary school — for training and demonstrations, never for a live club |

All three act on the database file `server/data/ictclub.db`.

### The sample school (training only)

`npm run db:demo` loads a realistic school so club officers can practise on screens that look real. It
is generated by one deterministic seeder:

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

The sample school is **St. Bernard Secondary School**, club patron **Mr. Ssekandi John**, current term
**Term 1, 2026**, dues **UGX 10,000 per term**, attendance target **75%**. The administrator account is the
same one the empty system uses.

Loading or erasing data replaces the `sessions` table as well, so any browser tab that was signed in is
returned to the sign-in screen — with a short explanation if the session really ended, and silently if the
database was replaced (a fresh installation is not an expired session). Type in the fields and the notice
clears at once; a wrong password is reported as “Incorrect password” rather than as an ended session.

Because it wipes records, loading the sample school is a command-line action only: nothing in the app can
replace the club's real data. Administrators can still take a **JSON backup** from Settings before
experimenting.

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
      └── web/js/views/…      renders tables, forms, boards and charts from the same schema
```

Because both sides read one schema file, adding a field or a whole new module is a one-file change:
add it to `shared/schema.js` (**and** add the matching `CREATE TABLE` line in `server/src/db.js`), and the
API, list view, filters, form, detail page, CSV export and search pick it up automatically.

The front end is plain ES5-safe JavaScript in small files loaded by `web/index.html`:

| File | What it does |
| --- | --- |
| `web/js/api.js` | every call to the API, the bearer token, and the plain-language errors |
| `web/js/store.js` | the signed-in user, the schema and the club settings, cached once and shared |
| `web/js/router.js` | hash-free routes (`/`, `/r/:resource`, `/r/:resource/:id`, `/attendance`, `/reports`, `/settings`, `/login`, `/verify`) |
| `web/js/ui.js` | cards, tables, badges, dialogs, toasts, stat tiles |
| `web/js/forms.js` | builds every create/edit form from the schema (including pickers, tag fields and date fields) |
| `web/js/views/*.js` | one file per screen: login, dashboard, resource list, record detail, attendance, reports, settings, verify, certificate |

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
| `GET` | `/api/meta` | The full schema, option lists and settings (used by the web app) |
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
| `POST` | `/api/demo/seed` | Replace everything with the sample school (admin only; **training/demonstrations** — the app never calls it, and it is the same thing `npm run db:demo` does) |

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
npm test              # every suite on an isolated database + its own API server
npm run test:api      # 71 API checks
npm run test:ui       # 39 screens, run three times: admin, executive and member
npm run test:flows    # 17 write flows: every action is saved and read back
npm run test:empty    # 24 screens and 8 checks on a brand-new, empty installation
npm run test:live     # the same checks against the app you are already running (see the warning)
```

**Test runs never touch your school's data.** `npm test` creates two throwaway databases: the main
suites use `server/data/test.db` loaded with the sample school, and the empty-system suite uses
`server/data/empty.db` holding nothing but the administrator account. Each gets its own API
(port **4100** and **4120**) and everything runs against those. The app on port 4000 keeps its own database, records and logins — so running the tests cannot
sign you (or a student) out. Use `npm run test:live` only when you deliberately want to exercise the
running app; that mode runs the sample-data loader, which replaces every record and session.

- **API tests** (`server/test/api-test.mjs`, 71 checks) cover authentication (sign-in by username *and*
  email, wrong passwords, username uniqueness), permissions, validation, filtering, sorting, pagination,
  CRUD, the dues register (generation, repeat generation, part-payments, receipts, summary, role guards),
  attendance bulk-save, analytics, exports, backups, certificate verification, the course/certificate
  automations and the sample-data loader endpoint. Role checks create their own executive and student
  accounts and delete them again, so the database always ends with a single administrator account.
- **Screen test** (`web/test/ui.mjs`, 39 screens × 3 roles) loads **every screen and every view mode**
  (table, cards, board, calendar, class-filtered registers, detail pages) in headless jsdom — the real
  pages, the real scripts, the real DOM. It fails on a JavaScript error, a blank screen, or a value the API
  no longer sends (`undefined`, `NaN`, `[object Object]`, "Invalid Date").
- **Empty-system test** (`web/test/empty.mjs`, 24 screens + 8 checks) opens the screens a school sees on the
  day it installs the club system — nothing but the administrator account — and fails on crashes, blank
  screens, a leftover sample school, or a list that does not explain that there is nothing yet. It then
  adds the first student through the API, checks the list shows them, and removes them again.
- **Write-flow test** (`web/test/flows.mjs`, 17 flows) proves the buttons really save: it fills the real
  forms, clicks the real buttons and re-reads the API to confirm the change — create/edit/delete a student
  (including the chip-style skills field), record a dues payment and check the collection total, save an
  attendance register, enrol a student and issue a certificate, save a generated report, create a note, save
  the club profile, verify a certificate on the public page, sign in with the administrator username and
  email, search the student list (only matching rows may remain) and check that a stale session notice
  clears as soon as typing starts and that a wrong password is reported as a password problem rather than
  an ended session.
- The UI suites are **role aware**: the runner signs in as the administrator, a temporary executive and a
  temporary student (created and removed automatically). Member runs skip the screens only an admin may
  open and *assert that write controls are hidden* from read-only students.
- Credentials for the tests can be overridden with `ADMIN_USERNAME` / `ADMIN_PASSWORD`, and the isolated
  server's port with `TEST_PORT`. `FLOW_ONLY=<word>` runs only the write flows whose name contains that
  word, and `DEBUG=1` prints stack traces.

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
| Club name, school name, patron, academic year, current term, **dues per term**, currency, contacts, meeting day, attendance target | Settings screen (stored in the DB) | Club name, current year and term (the school fills in the rest) |

---

## Deployment

The simplest deployment is a single process serving both the API and the web app — the same files that
are in `web/`, with no build step:

```bash
npm run setup
npm run db:seed               # first time only (administrator account)
npm --prefix server start     # serves the app + API on http://localhost:4000
```

### A permanent web address

To give the club one link that never changes, the repository ships a `Dockerfile` and a Render
blueprint (`render.yaml`). Both start from the branch `main`, so merge this work into `main` first.

**Render (free tier available, no command line):**

1. Push the repository to GitHub (already done) and merge the branch into `main`.
2. On [render.com](https://render.com): **New → Blueprint**, pick the repository, **Apply**.
   Render reads `render.yaml`, builds the `Dockerfile` and gives you a fixed URL such as
   `https://ict-club-management-system.onrender.com`.
3. Sign in with the administrator account and change the password
   (`npm --prefix server run admin -- --password "…"` locally, or *Administration → User Accounts*),
   then set the school name, patron and dues in **Settings → Club profile**.

On the free instance the service sleeps when idle, so the first visit after a quiet spell takes about
thirty seconds to wake. It also has no persistent disk: each deploy rebuilds the container and the
club data returns to the empty system (administrator account only). For real school data, upgrade the instance and enable the `disk:`
block in `render.yaml` (it points `DB_PATH` at the mounted volume) — or simply keep downloading backups
from *Settings → Download backup*.

**Docker anywhere else** (VPS, school server, Fly.io, Railway…):

```bash
docker build -t ict-club .
docker run -d -p 4000:4000 -v ict-club-data:/app/server/data --name ict-club ict-club
```

The image seeds itself on first start and skips seeding afterwards, and reads `PORT`/`HOST` from the
environment, so it also fits hosts that assign their own port.

### Running it in the school

Put the app behind any reverse proxy (nginx, Caddy) or run it on a small VPS/Raspberry Pi in the
computer lab — the school network then reaches it by IP address or an `ictclub.school.ac.ug` entry.
Notes:

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
| Forgot the admin password | `npm --prefix server run admin -- --password "YourNewPassword"` (keeps all club data) |
| `Cannot find module 'node:sqlite'` | Node 22+ is required (the project uses the built-in SQLite driver) |
| Port already in use | Start with `PORT=4100 npm run dev:api` and `API_URL=http://localhost:4100 npm run dev:web` |
| The club wants to start over | `npm run db:reset` erases every club record and leaves the empty system (one administrator account) |
| Screens are needed for a training session | `npm run db:demo` loads the sample school; `npm run db:reset` clears it again |
| Login fails after a database reset | Sign in again. A token the server no longer knows returns you to the sign-in screen; if the whole system was reinstalled (a new database), you get the plain sign-in screen with no notice, because that is not an expired session |
| Dashboard shows an error instead of statistics | The session ended (the data was reloaded, or you signed out elsewhere). Sign in again — the app returns you to the sign-in screen with a short explanation |
| Signed out right after running the tests | Run `npm test` (isolated database). Only `npm run test:live` exercises the running app, and it replaces every record and session |

---

## Project structure

```
.
├── package.json                 root scripts (serve, start, dev, seed, test)
├── shared/
│   └── schema.js                every module, field, option list and permission rule
├── server/
│   ├── src/
│   │   ├── index.js             Express app, static web/ hosting + SPA routes
│   │   ├── db.js                node:sqlite connection, schema, helpers, settings
│   │   ├── auth.js              scrypt hashing, sessions, role guards
│   │   ├── crud.js              generic REST engine (SQL, validation, permissions, CSV)
│   │   ├── routes.js            dashboard, attendance registers, dues register, reports data, exports…
│   │   └── seed.js              administrator + sample school (db:seed / db:reset / db:demo)
│   ├── test/api-test.mjs        71 API regression checks
│   └── data/ictclub.db          SQLite database (created on first run, git-ignored)
└── web/                         the app the browser runs — no build step
    ├── index.html               loads the files below in order
    ├── styles.css               design system (light UI, dark sidebar, print styles)
    ├── js/
    │   ├── icons.js             inline SVG icon set
    │   ├── util.js              DOM helpers, dates, money and number formatting
    │   ├── api.js               fetch wrapper (bearer token, plain-language errors)
    │   ├── ui.js                cards, tables, badges, dialogs, toasts, stat tiles
    │   ├── forms.js             every create/edit form, built from the schema
    │   ├── store.js             signed-in user, schema and settings cache
    │   ├── router.js            routes and screen mounting
    │   ├── app.js               shell: sidebar, search, routes
    │   └── views/               login, dashboard, resource, record, attendance, reports,
    │                            settings, verify, certificate
    └── test/
        ├── harness.mjs          loads real pages in jsdom and drives the real DOM
        ├── ui.mjs               screen test (every route, every role)
        ├── flows.mjs            write-flow test: every action saved and read back
        └── empty.mjs            the day-one screens of a new installation
```

---

*Built for school ICT club patrons and student executives who need to know who attended, who has paid
their dues, what was decided and what was spent — without spreadsheets.*
