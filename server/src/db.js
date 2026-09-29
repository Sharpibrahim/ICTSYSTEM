/**
 * Database layer — uses Node's built-in SQLite (node:sqlite), so the project
 * has zero native dependencies. Creates the schema on first run and upgrades
 * older databases automatically (see SCHEMA_VERSION).
 */
import { DatabaseSync } from 'node:sqlite'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const ROOT_DIR = path.resolve(__dirname, '..')
export const DATA_DIR = path.join(ROOT_DIR, 'data')
export const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'ictclub.db')

/** Bump this whenever the table layout changes — old databases are rebuilt. */
export const SCHEMA_VERSION = 2

fs.mkdirSync(DATA_DIR, { recursive: true })

export const db = new DatabaseSync(DB_PATH)
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')
// Wait (instead of failing) when another process — e.g. the seed script — is writing.
db.exec('PRAGMA busy_timeout = 8000')

/* ------------------------------------------------------------------ */
/* SCHEMA                                                              */
/* ------------------------------------------------------------------ */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  admission_number TEXT,
  class_level TEXT,
  stream TEXT,
  house TEXT,
  role TEXT DEFAULT 'Student Member',
  status TEXT DEFAULT 'Active',
  gender TEXT,
  date_of_birth TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_relationship TEXT,
  join_date TEXT,
  skills TEXT,
  interests TEXT,
  photo_url TEXT,
  bio TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS cabinet (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  position TEXT NOT NULL,
  member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'Active',
  contact_email TEXT,
  order_index INTEGER DEFAULT 99,
  responsibilities TEXT,
  achievements TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  venue TEXT,
  mode TEXT DEFAULT 'Physical',
  meeting_link TEXT,
  chairperson_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  secretary_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Scheduled',
  agenda TEXT,
  minutes TEXT,
  decisions TEXT,
  action_items TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  end_date TEXT,
  start_time TEXT,
  end_time TEXT,
  venue TEXT,
  mode TEXT DEFAULT 'Physical',
  organizer_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  partner TEXT,
  budget REAL,
  spent REAL,
  expected_participants INTEGER,
  actual_participants INTEGER,
  status TEXT DEFAULT 'Planned',
  description TEXT,
  outcomes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  code TEXT,
  category TEXT NOT NULL,
  level TEXT DEFAULT 'Beginner',
  instructor TEXT,
  instructor_contact TEXT,
  start_date TEXT,
  end_date TEXT,
  schedule TEXT,
  duration_hours REAL,
  venue TEXT,
  mode TEXT DEFAULT 'Physical',
  capacity INTEGER DEFAULT 30,
  fee REAL,
  certificate_enabled INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Upcoming',
  description TEXT,
  syllabus TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  enrolled_date TEXT,
  status TEXT DEFAULT 'Enrolled',
  progress INTEGER DEFAULT 0,
  score TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  ref_type TEXT NOT NULL,
  ref_id INTEGER,
  session_title TEXT NOT NULL,
  session_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Present',
  check_in_time TEXT,
  remarks TEXT,
  recorded_by_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS dues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  amount_due REAL DEFAULT 0,
  amount_paid REAL DEFAULT 0,
  status TEXT DEFAULT 'Unpaid',
  payment_date TEXT,
  method TEXT,
  receipt_no TEXT,
  remarks TEXT,
  recorded_by_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  period TEXT,
  author_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  related_type TEXT,
  related_id INTEGER,
  summary TEXT,
  content TEXT,
  file_url TEXT,
  status TEXT DEFAULT 'Draft',
  submitted_at TEXT,
  reviewed_by_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  review_comments TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_no TEXT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  recipient_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  related_type TEXT,
  related_id INTEGER,
  issue_date TEXT,
  issued_by TEXT DEFAULT 'ICT Club',
  signed_by TEXT,
  grade TEXT,
  description TEXT,
  status TEXT DEFAULT 'Issued',
  verification_code TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  content TEXT NOT NULL,
  tags TEXT,
  author_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  visibility TEXT DEFAULT 'Public',
  color TEXT DEFAULT 'Amber',
  pinned INTEGER DEFAULT 0,
  link_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Web Application',
  description TEXT,
  objectives TEXT,
  tech_stack TEXT,
  lead_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Planning',
  priority TEXT DEFAULT 'Medium',
  progress INTEGER DEFAULT 0,
  start_date TEXT,
  deadline TEXT,
  completed_date TEXT,
  repo_url TEXT,
  demo_url TEXT,
  budget REAL,
  sponsor TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS project_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'Developer',
  joined_date TEXT,
  contribution TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS project_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'To Do',
  priority TEXT DEFAULT 'Medium',
  due_date TEXT,
  progress INTEGER DEFAULT 0,
  estimated_hours REAL,
  actual_hours REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  last_login TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  user_name TEXT,
  action TEXT NOT NULL,
  resource TEXT,
  record_id INTEGER,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_members_class ON members(class_level);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_ref ON attendance(ref_type, ref_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(session_date);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_member ON enrollments(member_id);
CREATE INDEX IF NOT EXISTS idx_cabinet_member ON cabinet(member_id);
CREATE INDEX IF NOT EXISTS idx_dues_member ON dues(member_id);
CREATE INDEX IF NOT EXISTS idx_dues_term ON dues(term, academic_year);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_team_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_log_created ON activity_log(created_at);
`

const ALL_TABLES = [
  'activity_log', 'sessions', 'project_tasks', 'project_members', 'projects', 'notes', 'certificates',
  'reports', 'dues', 'attendance', 'enrollments', 'courses', 'activities', 'meetings', 'cabinet',
  'members', 'users', 'settings', 'meta'
]

function tableExists(name) {
  try {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name)
    return Boolean(row)
  } catch {
    return false
  }
}

/* Upgrade older layouts: the system ships with demo data, so rebuilding the
   tables (and re-seeding) is safer and simpler than piecemeal migrations. */
const wasExisting = tableExists('members')
let storedVersion = null
if (tableExists('meta')) {
  try {
    storedVersion = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get()?.value ?? null
  } catch {
    storedVersion = null
  }
}
const effectiveVersion = storedVersion === null ? (wasExisting ? 1 : null) : Number(storedVersion)

if (effectiveVersion !== null && effectiveVersion !== SCHEMA_VERSION) {
  for (const table of ALL_TABLES) db.exec(`DROP TABLE IF EXISTS "${table}"`)
  console.log(`\n  Database layout upgraded (v${effectiveVersion} → v${SCHEMA_VERSION}).`)
  console.log('  Run `npm run db:seed` to load the club data.\n')
}

db.exec(SCHEMA)

/* Additive column upgrades: new optional columns are added in place so an
   existing club database (and its logins) survives the upgrade. */
const ADDITIVE_COLUMNS = [['users', 'username', 'TEXT']]
for (const [table, column, type] of ADDITIVE_COLUMNS) {
  try {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name)
    if (columns.length && !columns.includes(column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
      console.log(`  • added ${table}.${column}`)
    }
  } catch (error) {
    console.warn(`  Could not add ${table}.${column} (${error.message}).`)
  }
}

try {
  db.prepare("INSERT INTO meta (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(SCHEMA_VERSION))
} catch (error) {
  // Another process holds the write lock (e.g. `npm run db:seed` running right now).
  console.warn(`  Could not record the schema version yet (${error.message}). The server will continue.`)
}

/**
 * A fresh installation (a brand-new database file) gets its own id.
 *
 * The app stores the id it signed in against. If it later fails to
 * authenticate and the server reports a *different* id, the whole system was
 * reinstalled or its data replaced — that is not an expired session, so the
 * user is returned to the sign-in screen without the "your session ended"
 * notice. Sessions that really did expire (7 days, signed out elsewhere,
 * data reloaded on the same installation) still show it.
 *
 * The id lives in `meta`, so a data reload keeps it (the installation is the
 * same) while a deleted/rebuilt database does not.
 */
let cachedInstallId = null
export function installId() {
  if (cachedInstallId) return cachedInstallId
  try {
    const row = get("SELECT value FROM meta WHERE key = 'install_id'")
    if (row?.value) {
      cachedInstallId = row.value
      return cachedInstallId
    }
    cachedInstallId = crypto.randomBytes(8).toString('hex')
    run(
      "INSERT INTO meta (key, value) VALUES ('install_id', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [cachedInstallId]
    )
    return cachedInstallId
  } catch (error) {
    console.warn(`  Could not record the installation id (${error.message}).`)
    cachedInstallId = cachedInstallId || 'unknown'
    return cachedInstallId
  }
}

/* ------------------------------------------------------------------ */
/* QUERY HELPERS                                                       */
/* ------------------------------------------------------------------ */

/** node:sqlite only accepts null / number / string / bigint / buffer params. */
function norm(value) {
  if (value === undefined) return null
  if (value === null) return null
  if (typeof value === 'boolean') return value ? 1 : 0
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

export function all(sql, params = []) {
  return db.prepare(sql).all(...params.map(norm)).map(plain)
}

export function get(sql, params = []) {
  const row = db.prepare(sql).get(...params.map(norm))
  return row ? plain(row) : null
}

export function run(sql, params = []) {
  return db.prepare(sql).run(...params.map(norm))
}

export function insert(table, data) {
  const keys = Object.keys(data)
  if (!keys.length) throw new Error('Nothing to insert')
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
  const res = run(sql, keys.map((k) => data[k]))
  return Number(res.lastInsertRowid)
}

export function updateRow(table, id, data) {
  const keys = Object.keys(data)
  if (!keys.length) return
  const sql = `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`
  run(sql, [...keys.map((k) => data[k]), id])
}

export function deleteRow(table, id) {
  run(`DELETE FROM ${table} WHERE id = ?`, [id])
}

export function count(sql, params = []) {
  const row = get(sql, params)
  return row ? Number(Object.values(row)[0]) : 0
}

/** Convert null-prototype rows from node:sqlite into normal objects. */
function plain(row) {
  return Object.assign({}, row)
}

/* ------------------------------------------------------------------ */
/* SETTINGS                                                            */
/* ------------------------------------------------------------------ */

export const DEFAULT_SETTINGS = {
  club_name: 'ICT Club',
  club_tagline: 'Learn • Create • Innovate',
  institution: 'Secondary School',
  academic_year: '2026',
  current_term: 'Term 1',
  currency: 'UGX',
  contact_email: 'ictclub@school.ac.ug',
  contact_phone: '+256 700 000 000',
  meeting_frequency: 'Every Wednesday, 4:00 PM',
  attendance_target: '75',
  dues_per_term: '10000',
  patron_name: '',
  logo_url: ''
}

export function getSettings() {
  const rows = all('SELECT key, value FROM settings')
  const map = { ...DEFAULT_SETTINGS }
  for (const r of rows) map[r.key] = r.value
  return map
}

export function saveSettings(values) {
  for (const [key, value] of Object.entries(values)) {
    if (!(key in DEFAULT_SETTINGS)) continue
    run(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value === null || value === undefined ? '' : String(value)]
    )
  }
  return getSettings()
}

export function logActivity({ userId, userName, action, resource, recordId, detail }) {
  try {
    insert('activity_log', {
      user_id: userId ?? null,
      user_name: userName ?? 'system',
      action,
      resource: resource ?? null,
      record_id: recordId ?? null,
      detail: detail ?? null
    })
  } catch {
    /* logging must never break a request */
  }
}
