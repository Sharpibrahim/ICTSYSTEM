/**
 * Specialised endpoints: authentication, dashboard analytics, attendance
 * registers, bulk operations, exports, settings, activity log and certificate
 * verification.
 */
import { Router } from 'express'
import crypto from 'node:crypto'
import { all, count, get, getSettings, insert, installId, logActivity, run, saveSettings, updateRow } from './db.js'
import {
  attachUser,
  cleanupSessions,
  createSession,
  hashPassword,
  login,
  requireAuth,
  requireRole,
  sessionUser,
  bearerToken,
  destroySession
} from './auth.js'
import { canDeleteRow, canWriteRow, getResource, listResource, toCsv } from './crud.js'
import { OPTION_SETS, RESOURCES, resourceByKey } from '../../shared/schema.js'

export const api = Router()

/* Every API response says which installation answered. The web app stores this
   when it signs in, so it can tell a genuinely expired session apart from the
   system having been reinstalled (see installId() in db.js). */
api.use((_req, res, next) => {
  res.setHeader('X-Install-Id', installId())
  next()
})

api.use(attachUser)
cleanupSessions()

/* ------------------------------------------------------------------ */
/* PUBLIC                                                              */
/* ------------------------------------------------------------------ */

api.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ICT Club Management System', install: installId(), time: new Date().toISOString() })
})

/** Public certificate verification — anyone can check a code. */
api.get('/verify/:code', (req, res) => {
  const code = String(req.params.code || '').trim()
  const row = get(
    `SELECT c.certificate_no, c.title, c.type, c.issue_date, c.status, c.grade, c.issued_by, c.signed_by,
            m.full_name AS recipient_name, m.admission_number AS recipient_reg, m.class_level AS recipient_class
       FROM certificates c LEFT JOIN members m ON m.id = c.recipient_id
      WHERE upper(c.verification_code) = upper(?) OR upper(c.certificate_no) = upper(?)`,
    [code, code]
  )
  if (!row) return res.status(404).json({ valid: false, error: 'No certificate matches that code' })
  res.json({ valid: row.status !== 'Revoked', certificate: row })
})

/* ------------------------------------------------------------------ */
/* AUTH                                                                */
/* ------------------------------------------------------------------ */

api.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })
  const result = login(email, password)
  if (result.error) return res.status(401).json({ error: result.error })
  res.json({ ...result, install: installId() })
})

api.post('/auth/signup', (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' })
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  if (get('SELECT id FROM users WHERE lower(email) = lower(?)', [email])) {
    return res.status(400).json({ error: 'An account with that email already exists' })
  }
  const id = insert('users', {
    name,
    email,
    password_hash: hashPassword(password),
    role: 'member',
    status: 'active'
  })
  const { token, expires } = createSession(id)
  logActivity({ userId: id, userName: name, action: 'signup', resource: 'users', recordId: id })
  res.status(201).json({ token, expires, user: { id, name, email, role: 'member', member_id: null } })
})

api.post('/auth/logout', (req, res) => {
  destroySession(bearerToken(req))
  res.json({ ok: true })
})

api.get('/auth/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not signed in' })
  const user = get('SELECT id, name, username, email, role, member_id, status, last_login FROM users WHERE id = ?', [req.user.id])
  res.json({ user })
})

api.post('/auth/password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body || {}
  if (!new_password || String(new_password).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' })
  }
  const row = get('SELECT * FROM users WHERE id = ?', [req.user.id])
  if (current_password && !(row && hashifyCheck(current_password, row.password_hash))) {
    return res.status(400).json({ error: 'Current password is incorrect' })
  }
  updateRow('users', req.user.id, { password_hash: hashPassword(new_password) })
  res.json({ ok: true })
})

function hashifyCheck(password, hash) {
  const [, salt, digest] = String(hash).split('$')
  if (!salt || !digest) return false
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return derived === digest
}

/* ------------------------------------------------------------------ */
/* OPTIONS (for form dropdowns)                                        */
/* ------------------------------------------------------------------ */

api.get('/meta', requireAuth, (_req, res) => {
  res.json({ resources: RESOURCES, optionSets: OPTION_SETS, settings: getSettings() })
})

const OPTION_LABELS = {
  members: (r) => ({ value: r.id, label: r.full_name, sub: [r.class_level, r.admission_number].filter(Boolean).join(' • ') }),
  meetings: (r) => ({ value: r.id, label: r.title, sub: r.date }),
  activities: (r) => ({ value: r.id, label: r.title, sub: r.date }),
  courses: (r) => ({ value: r.id, label: r.code ? `${r.code} — ${r.title}` : r.title, sub: r.instructor }),
  projects: (r) => ({ value: r.id, label: r.title, sub: r.status })
}

api.get('/options/:resource', requireAuth, (req, res) => {
  const resource = resourceByKey(req.params.resource)
  const mapper = OPTION_LABELS[req.params.resource]
  if (!resource || !mapper) return res.status(400).json({ error: 'Unsupported option list' })
  const rows = all(`SELECT * FROM ${resource.table} ORDER BY ${resource.titleKey} COLLATE NOCASE`)
  res.json({ data: rows.map(mapper) })
})

/* ------------------------------------------------------------------ */
/* DASHBOARD                                                           */
/* ------------------------------------------------------------------ */

api.get('/dashboard', requireAuth, (_req, res) => {
  const one = (sql, params = []) => Number(Object.values(get(sql, params) || { v: 0 })[0] || 0)
  const today = new Date().toISOString().slice(0, 10)

  const cards = {
    members: one('SELECT COUNT(*) AS v FROM members'),
    active_members: one("SELECT COUNT(*) AS v FROM members WHERE status = 'Active'"),
    cabinet: one("SELECT COUNT(*) AS v FROM cabinet WHERE status = 'Active'"),
    meetings: one('SELECT COUNT(*) AS v FROM meetings'),
    upcoming_meetings: one("SELECT COUNT(*) AS v FROM meetings WHERE date >= ? AND status IN ('Scheduled','In Progress')", [today]),
    activities: one('SELECT COUNT(*) AS v FROM activities'),
    upcoming_activities: one("SELECT COUNT(*) AS v FROM activities WHERE date >= ? AND status IN ('Planned','Ongoing')", [today]),
    courses: one('SELECT COUNT(*) AS v FROM courses'),
    running_courses: one("SELECT COUNT(*) AS v FROM courses WHERE status = 'Ongoing'"),
    enrollments: one('SELECT COUNT(*) AS v FROM enrollments'),
    attendance_records: one('SELECT COUNT(*) AS v FROM attendance'),
    reports: one('SELECT COUNT(*) AS v FROM reports'),
    pending_reports: one("SELECT COUNT(*) AS v FROM reports WHERE status IN ('Submitted','Under Review')", []),
    certificates: one('SELECT COUNT(*) AS v FROM certificates'),
    notes: one('SELECT COUNT(*) AS v FROM notes'),
    dues_records: one('SELECT COUNT(*) AS v FROM dues'),
    dues_collected: one('SELECT COALESCE(SUM(amount_paid),0) AS v FROM dues'),
    dues_expected: one("SELECT COALESCE(SUM(amount_due),0) AS v FROM dues WHERE status <> 'Exempt'"),
    dues_defaulters: one("SELECT COUNT(*) AS v FROM dues WHERE status IN ('Unpaid','Partial')"),
    projects: one('SELECT COUNT(*) AS v FROM projects'),
    active_projects: one("SELECT COUNT(*) AS v FROM projects WHERE status IN ('Planning','In Progress','In Review')"),
    open_tasks: one("SELECT COUNT(*) AS v FROM project_tasks WHERE status <> 'Done'"),
    overdue_tasks: one("SELECT COUNT(*) AS v FROM project_tasks WHERE status <> 'Done' AND due_date IS NOT NULL AND due_date < ?", [today])
  }

  const attendanceRate = get(
    `SELECT ROUND(100.0 * SUM(CASE WHEN status IN ('Present','Late') THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1) AS rate
       FROM attendance`
  )

  const attendanceTrend = all(
    `SELECT strftime('%Y-%m', session_date) AS month,
            SUM(CASE WHEN status IN ('Present','Late') THEN 1 ELSE 0 END) AS present,
            SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent,
            SUM(CASE WHEN status = 'Excused' THEN 1 ELSE 0 END) AS excused,
            COUNT(*) AS total
       FROM attendance WHERE session_date IS NOT NULL
      GROUP BY month ORDER BY month DESC LIMIT 8`
  ).reverse()

  const attendanceByStatus = all('SELECT status, COUNT(*) AS value FROM attendance GROUP BY status ORDER BY value DESC')
  const attendanceByRefType = all('SELECT ref_type, COUNT(*) AS value FROM attendance GROUP BY ref_type ORDER BY value DESC')

  const memberGrowth = all(
    `SELECT strftime('%Y-%m', join_date) AS month, COUNT(*) AS value FROM members
      WHERE join_date IS NOT NULL GROUP BY month ORDER BY month DESC LIMIT 8`
  ).reverse()

  /* Charts about the school structure only count students (staff and alumni
     have no class, stream or house). */
  const membersByClass = all(
    `SELECT class_level AS name, COUNT(*) AS value FROM members
      WHERE class_level IS NOT NULL AND class_level <> ''
      GROUP BY name ORDER BY name`
  )
  const membersByHouse = all(
    `SELECT house AS name, COUNT(*) AS value FROM members
      WHERE house IS NOT NULL AND house <> ''
      GROUP BY name ORDER BY value DESC LIMIT 8`
  )
  const membersByStream = all(
    `SELECT stream AS name, COUNT(*) AS value FROM members
      WHERE stream IS NOT NULL AND stream <> ''
      GROUP BY name ORDER BY value DESC`
  )
  const membersByStatus = all('SELECT status AS name, COUNT(*) AS value FROM members GROUP BY status ORDER BY value DESC')
  const membersByGender = all(
    "SELECT COALESCE(NULLIF(gender,''),'Unspecified') AS name, COUNT(*) AS value FROM members GROUP BY name ORDER BY value DESC"
  )

  const feesByTerm = all(
    `SELECT term, academic_year,
            COUNT(*) AS records,
            COALESCE(SUM(amount_due),0) AS expected,
            COALESCE(SUM(amount_paid),0) AS collected
       FROM dues GROUP BY term, academic_year ORDER BY academic_year DESC, term DESC LIMIT 6`
  )
  const duesByClass = all(
    `SELECT COALESCE(NULLIF(m.class_level,''),'Unspecified') AS name,
            COUNT(*) AS students,
            COALESCE(SUM(d.amount_due),0) AS expected,
            COALESCE(SUM(d.amount_paid),0) AS collected,
            COALESCE(SUM(CASE WHEN d.status IN ('Unpaid','Partial') THEN d.amount_due - d.amount_paid ELSE 0 END),0) AS outstanding
       FROM dues d JOIN members m ON m.id = d.member_id
      WHERE m.class_level IS NOT NULL AND m.class_level <> ''
      GROUP BY name ORDER BY name`
  )
  const duesDefaulters = all(
    `SELECT d.id, m.id AS member_id, m.full_name, m.class_level, m.guardian_phone,
            d.term, d.academic_year, d.amount_due, d.amount_paid,
            (d.amount_due - d.amount_paid) AS balance, d.status
       FROM dues d JOIN members m ON m.id = d.member_id
      WHERE d.status IN ('Unpaid','Partial')
      ORDER BY balance DESC LIMIT 8`
  )

  const projectStatus = all('SELECT status AS name, COUNT(*) AS value FROM projects GROUP BY status ORDER BY value DESC')
  const taskStatus = all('SELECT status AS name, COUNT(*) AS value FROM project_tasks GROUP BY status ORDER BY value DESC')

  const activityByCategory = all(
    'SELECT category AS name, COUNT(*) AS value FROM activities GROUP BY name ORDER BY value DESC LIMIT 8'
  )

  const courseEnrollment = all(
    `SELECT c.id, c.title, c.status,
            (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrolled,
            (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'Completed') AS completed
       FROM courses c ORDER BY enrolled DESC LIMIT 6`
  )

  const topMembers = all(
    `SELECT m.id, m.full_name, m.class_level,
            COUNT(a.id) AS total,
            SUM(CASE WHEN a.status IN ('Present','Late') THEN 1 ELSE 0 END) AS attended,
            ROUND(100.0 * SUM(CASE WHEN a.status IN ('Present','Late') THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id),0), 1) AS rate
       FROM members m JOIN attendance a ON a.member_id = m.id
      GROUP BY m.id HAVING COUNT(a.id) >= 1
      ORDER BY rate DESC, attended DESC LIMIT 6`
  )

  const lowAttendance = all(
    `SELECT m.id, m.full_name, m.class_level,
            COUNT(a.id) AS total,
            SUM(CASE WHEN a.status IN ('Present','Late') THEN 1 ELSE 0 END) AS attended,
            ROUND(100.0 * SUM(CASE WHEN a.status IN ('Present','Late') THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id),0), 1) AS rate
       FROM members m JOIN attendance a ON a.member_id = m.id
      GROUP BY m.id HAVING COUNT(a.id) >= 3
      ORDER BY rate ASC LIMIT 6`
  )

  const upcomingMeetings = all(
    `SELECT id, title, type, date, start_time, venue, mode, status FROM meetings
      WHERE date >= ? ORDER BY date ASC LIMIT 5`,
    [today]
  )
  const upcomingActivities = all(
    `SELECT id, title, category, date, venue, status FROM activities WHERE date >= ? ORDER BY date ASC LIMIT 5`,
    [today]
  )
  const upcomingDeadlines = all(
    `SELECT t.id, t.title, t.due_date, t.priority, t.status, p.title AS project FROM project_tasks t
       LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.status <> 'Done' AND t.due_date IS NOT NULL AND t.due_date >= ?
      ORDER BY t.due_date ASC LIMIT 6`,
    [today]
  )
  const expiringProjects = all(
    `SELECT id, title, deadline, status, progress, priority FROM projects
      WHERE status NOT IN ('Completed','Cancelled') AND deadline IS NOT NULL
      ORDER BY deadline ASC LIMIT 6`
  )
  const recentCertificates = all(
    `SELECT c.id, c.title, c.certificate_no, c.type, c.issue_date, c.status, m.full_name AS recipient
       FROM certificates c LEFT JOIN members m ON m.id = c.recipient_id
      ORDER BY c.issue_date DESC, c.id DESC LIMIT 5`
  )
  const recentNotes = all(
    `SELECT n.id, n.title, n.category, n.color, n.created_at, m.full_name AS author
       FROM notes n LEFT JOIN members m ON m.id = n.author_id
      WHERE n.visibility = 'Public' OR n.visibility IS NULL ORDER BY n.created_at DESC LIMIT 5`
  )
  const pinnedNotes = all(
    `SELECT n.id, n.title, n.category, n.color, n.created_at, m.full_name AS author
       FROM notes n LEFT JOIN members m ON m.id = n.author_id
      WHERE n.pinned = 1 ORDER BY n.created_at DESC LIMIT 4`
  )
  const recentActivityLog = all(
    'SELECT id, user_name, action, resource, record_id, detail, created_at FROM activity_log ORDER BY id DESC LIMIT 10'
  )

  // Skills cloud built from comma separated text columns.
  const skillCounts = new Map()
  for (const row of all("SELECT skills FROM members WHERE skills IS NOT NULL AND skills <> ''")) {
    for (const skill of String(row.skills).split(',')) {
      const clean = skill.trim()
      if (!clean) continue
      skillCounts.set(clean, (skillCounts.get(clean) || 0) + 1)
    }
  }
  const topSkills = [...skillCounts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 14)

  res.json({
    cards,
    attendance: {
      rate: attendanceRate?.rate ?? null,
      trend: attendanceTrend,
      byStatus: attendanceByStatus,
      byRefType: attendanceByRefType
    },
    members: {
      growth: memberGrowth,
      byClass: membersByClass,
      byHouse: membersByHouse,
      byStream: membersByStream,
      byStatus: membersByStatus,
      byGender: membersByGender,
      top: topMembers,
      low: lowAttendance,
      topSkills
    },
    finance: {
      expected: cards.dues_expected,
      collected: cards.dues_collected,
      outstanding: Math.max(0, cards.dues_expected - cards.dues_collected),
      defaulters: cards.dues_defaulters,
      byTerm: feesByTerm,
      byClass: duesByClass,
      watchlist: duesDefaulters
    },
    projects: { byStatus: projectStatus, byTaskStatus: taskStatus, deadlines: upcomingDeadlines, timeline: expiringProjects },
    activities: { byCategory: activityByCategory, upcoming: upcomingActivities },
    courses: { enrollment: courseEnrollment },
    meetings: { upcoming: upcomingMeetings },
    recent: { certificates: recentCertificates, notes: recentNotes, pinned: pinnedNotes, log: recentActivityLog },
    settings: getSettings()
  })
})

/* ------------------------------------------------------------------ */
/* ATTENDANCE REGISTERS + BULK SAVE                                    */
/* ------------------------------------------------------------------ */

const REF_TABLES = {
  meeting: { table: 'meetings', dateColumn: 'date' },
  activity: { table: 'activities', dateColumn: 'date' },
  course: { table: 'courses', dateColumn: 'start_date' },
  project: { table: 'projects', dateColumn: 'start_date' }
}

/** Sessions store their date in different columns depending on the type. */
function sessionDate(session) {
  return session?.date ?? session?.start_date ?? null
}

/** The register sheet: every active member with their status for one session. */
api.get('/attendance/register', requireAuth, (req, res) => {
  const { ref_type, ref_id } = req.query
  if (!ref_type || !ref_id) return res.status(400).json({ error: 'ref_type and ref_id are required' })
  const table = REF_TABLES[ref_type]?.table
  if (!table) return res.status(400).json({ error: 'Unknown session type' })
  const session = get(`SELECT * FROM ${table} WHERE id = ?`, [Number(ref_id)])
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const existing = all(
    'SELECT * FROM attendance WHERE ref_type = ? AND ref_id = ? ORDER BY id',
    [ref_type, Number(ref_id)]
  )
  const byMember = new Map(existing.map((row) => [row.member_id, row]))
  // Class list can be narrowed (e.g. only S2 students for a class meeting).
  const classFilter = req.query.class_level
  const members = all(
    `SELECT id, full_name, admission_number, class_level, stream, house, status, photo_url
       FROM members
      WHERE status IN ('Active','Alumni')${classFilter ? ' AND class_level = ?' : ''}
      ORDER BY class_level, full_name COLLATE NOCASE`,
    classFilter ? [classFilter] : []
  )

  const roster = members.map((m) => {
    const record = byMember.get(m.id)
    return {
      member_id: m.id,
      full_name: m.full_name,
      admission_number: m.admission_number,
      class_level: m.class_level,
      stream: m.stream,
      house: m.house,
      member_status: m.status,
      photo_url: m.photo_url,
      attendance_id: record?.id ?? null,
      status: record?.status ?? '',
      check_in_time: record?.check_in_time ?? '',
      remarks: record?.remarks ?? ''
    }
  })

  res.json({
    session: {
      id: session.id,
      ref_type,
      title: session.title,
      date: sessionDate(session),
      venue: session.venue ?? '',
      start_time: session.start_time ?? '',
      end_time: session.end_time ?? session.end_time
    },
    dues: all(
      `SELECT d.member_id, d.term, d.academic_year, d.amount_due, d.amount_paid,
              (d.amount_due - d.amount_paid) AS balance, d.status
         FROM dues d WHERE d.status IN ('Unpaid','Partial')`
    ),
    classes: all("SELECT DISTINCT class_level FROM members WHERE class_level IS NOT NULL ORDER BY class_level").map((r) => r.class_level),
    roster,
    summary: {
      marked: existing.length,
      present: existing.filter((r) => r.status === 'Present').length,
      absent: existing.filter((r) => r.status === 'Absent').length,
      late: existing.filter((r) => r.status === 'Late').length,
      excused: existing.filter((r) => r.status === 'Excused').length,
      unmarked: roster.length - existing.length
    }
  })
})

/** Bulk save a whole register in one request. */
api.post('/attendance/register', requireAuth, (req, res) => {
  const resource = resourceByKey('attendance')
  if (!canWriteRow(resource, req.user)) return res.status(403).json({ error: 'You do not have permission to record attendance' })
  const { ref_type, ref_id, session_title, session_date, records = [] } = req.body || {}
  if (!ref_type || !ref_id) return res.status(400).json({ error: 'ref_type and ref_id are required' })
  const table = REF_TABLES[ref_type]?.table
  if (!table) return res.status(400).json({ error: 'Unknown session type' })
  const session = get(`SELECT * FROM ${table} WHERE id = ?`, [Number(ref_id)])
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const title = session_title || session.title
  const date = session_date || sessionDate(session)
  let created = 0
  let updated = 0
  let cleared = 0

  for (const record of records) {
    const memberId = Number(record.member_id)
    if (!memberId) continue
    const existing = get('SELECT * FROM attendance WHERE member_id = ? AND ref_type = ? AND ref_id = ?', [memberId, ref_type, Number(ref_id)])
    const status = record.status || null

    if (!status) {
      if (existing) {
        run('DELETE FROM attendance WHERE id = ?', [existing.id])
        cleared++
      }
      continue
    }

    if (existing) {
      updateRow('attendance', existing.id, {
        status,
        check_in_time: record.check_in_time || null,
        remarks: record.remarks ?? existing.remarks ?? null,
        session_title: title,
        session_date: date,
        recorded_by_id: req.user.member_id ?? existing.recorded_by_id ?? null,
        updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      })
      updated++
    } else {
      insert('attendance', {
        member_id: memberId,
        ref_type,
        ref_id: Number(ref_id),
        session_title: title,
        session_date: date,
        status,
        check_in_time: record.check_in_time || null,
        remarks: record.remarks || null,
        recorded_by_id: req.user.member_id ?? null
      })
      created++
    }
  }

  logActivity({
    userId: req.user.id,
    userName: req.user.name,
    action: 'attendance',
    resource: 'attendance',
    recordId: Number(ref_id),
    detail: `${title}: ${created} new, ${updated} updated`
  })
  res.json({ ok: true, created, updated, cleared, session_title: title, session_date: date })
})

/** Mark everyone present with one click, then adjust exceptions. */
api.post('/attendance/mark-all', requireAuth, (req, res) => {
  const resource = resourceByKey('attendance')
  if (!canWriteRow(resource, req.user)) return res.status(403).json({ error: 'Not permitted' })
  const { ref_type, ref_id, status = 'Present' } = req.body || {}
  if (!ref_type || !ref_id) return res.status(400).json({ error: 'ref_type and ref_id are required' })
  const table = REF_TABLES[ref_type]?.table
  const session = table ? get(`SELECT * FROM ${table} WHERE id = ?`, [Number(ref_id)]) : null
  if (!session) return res.status(404).json({ error: 'Session not found' })
  const members = all("SELECT id FROM members WHERE status = 'Active'")
  let created = 0
  for (const m of members) {
    const existing = get('SELECT id FROM attendance WHERE member_id = ? AND ref_type = ? AND ref_id = ?', [m.id, ref_type, Number(ref_id)])
    if (existing) continue
    insert('attendance', {
      member_id: m.id,
      ref_type,
      ref_id: Number(ref_id),
      session_title: session.title,
      session_date: sessionDate(session),
      status,
      recorded_by_id: req.user.member_id ?? null
    })
    created++
  }
  res.json({ ok: true, created })
})

/* ------------------------------------------------------------------ */
/* CLUB DUES                                                           */
/* ------------------------------------------------------------------ */

const STUDENT_FILTER = "status = 'Active' AND role IN ('Student Member','Executive')"

function duesStatusFor(due, paid) {
  if (due === 0) return 'Exempt'
  if (paid <= 0) return 'Unpaid'
  return paid >= due ? 'Paid' : 'Partial'
}

/** Create this term's dues records for every active student. */
api.post('/dues/generate', requireRole('admin', 'cabinet'), (req, res) => {
  const settings = getSettings()
  const term = req.body?.term || settings.current_term || 'Term 1'
  const academicYear = String(req.body?.academic_year || settings.academic_year || new Date().getFullYear())
  const amountDue = Number(req.body?.amount_due ?? settings.dues_per_term ?? 0)
  const classLevel = req.body?.class_level || null

  const students = all(
    `SELECT id, full_name, class_level FROM members WHERE ${STUDENT_FILTER}${classLevel ? ' AND class_level = ?' : ''} ORDER BY class_level, full_name`,
    classLevel ? [classLevel] : []
  )
  if (!students.length) return res.status(400).json({ error: 'No active students found for that selection' })

  let created = 0
  let skipped = 0
  for (const student of students) {
    const existing = get('SELECT id FROM dues WHERE member_id = ? AND term = ? AND academic_year = ?', [student.id, term, academicYear])
    if (existing) {
      skipped += 1
      continue
    }
    insert('dues', {
      member_id: student.id,
      term,
      academic_year: academicYear,
      amount_due: amountDue,
      amount_paid: 0,
      status: amountDue > 0 ? 'Unpaid' : 'Exempt',
      recorded_by_id: req.user.member_id ?? null
    })
    created += 1
  }

  logActivity({
    userId: req.user.id,
    userName: req.user.name,
    action: 'dues',
    resource: 'dues',
    detail: `${term} ${academicYear}: ${created} dues records created`
  })
  res.json({ ok: true, created, skipped, term, academic_year: academicYear, amount_due: amountDue })
})

/** Record a payment against one dues record and recompute its status. */
api.post('/dues/:id/payment', requireRole('admin', 'cabinet'), (req, res) => {
  const record = get('SELECT * FROM dues WHERE id = ?', [Number(req.params.id)])
  if (!record) return res.status(404).json({ error: 'Dues record not found' })

  const amount = Number(req.body?.amount ?? 0)
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Enter an amount greater than zero' })

  const paid = Number(record.amount_paid || 0) + amount
  const due = Number(record.amount_due || 0)
  const year = new Date().getFullYear()

  updateRow('dues', record.id, {
    amount_paid: paid,
    status: duesStatusFor(due, paid),
    payment_date: req.body?.payment_date || new Date().toISOString().slice(0, 10),
    method: req.body?.method || record.method || 'Cash',
    receipt_no: record.receipt_no || `RCT/${year}/${String(count('SELECT COUNT(*) FROM dues') + 1).padStart(4, '0')}`,
    remarks: req.body?.remarks || record.remarks,
    recorded_by_id: req.user.member_id ?? record.recorded_by_id ?? null,
    updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
  })

  logActivity({
    userId: req.user.id,
    userName: req.user.name,
    action: 'payment',
    resource: 'dues',
    recordId: record.id,
    detail: `${amount} received (${paid}/${due})`
  })
  res.json({ ok: true, data: get('SELECT * FROM dues WHERE id = ?', [record.id]), received: amount })
})

/** Totals by term / class plus the list of students still owing. */
api.get('/dues/summary', requireAuth, (req, res) => {
  const term = req.query.term
  const academicYear = req.query.academic_year
  const filters = []
  const params = []
  if (term) {
    filters.push('d.term = ?')
    params.push(term)
  }
  if (academicYear) {
    filters.push('d.academic_year = ?')
    params.push(String(academicYear))
  }
  const where = filters.length ? ` AND ${filters.join(' AND ')}` : ''

  const totals = get(
    `SELECT COUNT(*) AS records,
            COALESCE(SUM(d.amount_due),0) AS expected,
            COALESCE(SUM(d.amount_paid),0) AS collected,
            COALESCE(SUM(CASE WHEN d.status IN ('Unpaid','Partial') THEN d.amount_due - d.amount_paid ELSE 0 END),0) AS outstanding,
            SUM(CASE WHEN d.status='Paid' THEN 1 ELSE 0 END) AS fully_paid,
            SUM(CASE WHEN d.status='Partial' THEN 1 ELSE 0 END) AS partial,
            SUM(CASE WHEN d.status='Unpaid' THEN 1 ELSE 0 END) AS unpaid,
            SUM(CASE WHEN d.status='Exempt' THEN 1 ELSE 0 END) AS exempt
       FROM dues d WHERE 1=1${where}`,
    params
  )
  const byClass = all(
    `SELECT COALESCE(NULLIF(m.class_level,''),'Unspecified') AS name,
            COUNT(*) AS students,
            COALESCE(SUM(d.amount_due),0) AS expected,
            COALESCE(SUM(d.amount_paid),0) AS collected,
            COALESCE(SUM(CASE WHEN d.status IN ('Unpaid','Partial') THEN d.amount_due - d.amount_paid ELSE 0 END),0) AS outstanding
       FROM dues d JOIN members m ON m.id = d.member_id
      WHERE 1=1${where} GROUP BY name ORDER BY name`,
    params
  )
  const byTerm = all(
    `SELECT d.term, d.academic_year, COUNT(*) AS students,
            COALESCE(SUM(d.amount_due),0) AS expected,
            COALESCE(SUM(d.amount_paid),0) AS collected
       FROM dues d WHERE 1=1${where} GROUP BY d.term, d.academic_year ORDER BY d.academic_year, d.term`,
    params
  )
  const owing = all(
    `SELECT d.id, m.full_name, m.class_level, m.guardian_name, m.guardian_phone,
            d.term, d.academic_year, d.amount_due, d.amount_paid,
            (d.amount_due - d.amount_paid) AS balance, d.status
       FROM dues d JOIN members m ON m.id = d.member_id
      WHERE d.status IN ('Unpaid','Partial')${where}
      ORDER BY balance DESC`,
    params
  )
  const payments = all(
    `SELECT d.id, d.payment_date, d.amount_paid, d.method, d.receipt_no, d.term, d.academic_year,
            m.full_name, m.class_level
       FROM dues d JOIN members m ON m.id = d.member_id
      WHERE d.amount_paid > 0${where} ORDER BY d.payment_date DESC LIMIT 60`,
    params
  )

  res.json({ totals, byClass, byTerm, owing, payments, settings: getSettings() })
})

/* ------------------------------------------------------------------ */
/* REPORT DATA + SUMMARY GENERATOR                                     */
/* ------------------------------------------------------------------ */

const RANGE_CLAUSE = (column, from, to, prefix = '') => {
  const parts = []
  const params = []
  if (from) {
    parts.push(`${prefix}${column} >= ?`)
    params.push(from)
  }
  if (to) {
    parts.push(`${prefix}${column} <= ?`)
    params.push(to)
  }
  return { sql: parts.length ? ` AND ${parts.join(' AND ')}` : '', params }
}

/** Aggregated statistics used on the Reports screen (optionally date-ranged). */
api.get('/reports/data', requireAuth, (req, res) => {
  const { from, to } = req.query
  const attendance = RANGE_CLAUSE('session_date', from, to)
  const attendanceOnA = RANGE_CLAUSE('session_date', from, to, 'a.')
  const meetings = RANGE_CLAUSE('date', from, to)
  const activitiesRange = RANGE_CLAUSE('date', from, to)
  const certificatesRange = RANGE_CLAUSE('issue_date', from, to)

  const attendanceByStatus = all(
    `SELECT status AS name, COUNT(*) AS value FROM attendance WHERE 1=1${attendance.sql} GROUP BY status ORDER BY value DESC`,
    attendance.params
  )
  const attendanceByMember = all(
    `SELECT m.id, m.full_name, m.class_level, m.admission_number,
            COUNT(a.id) AS sessions,
            SUM(CASE WHEN a.status IN ('Present','Late') THEN 1 ELSE 0 END) AS attended,
            ROUND(100.0 * SUM(CASE WHEN a.status IN ('Present','Late') THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id),0),1) AS rate
       FROM members m LEFT JOIN attendance a ON a.member_id = m.id${attendanceOnA.sql}
      GROUP BY m.id HAVING COUNT(a.id) > 0 ORDER BY rate DESC, attended DESC`,
    attendanceOnA.params
  )
  const attendanceBySession = all(
    `SELECT MIN(id) AS id, ref_type, ref_id, session_title, session_date,
            COUNT(*) AS total,
            SUM(CASE WHEN status IN ('Present','Late') THEN 1 ELSE 0 END) AS present,
            ROUND(100.0 * SUM(CASE WHEN status IN ('Present','Late') THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),1) AS rate
       FROM attendance WHERE 1=1${attendance.sql} GROUP BY session_title, session_date, ref_type, ref_id
      ORDER BY session_date DESC LIMIT 40`,
    attendance.params
  )
  const meetingStats = all(
    `SELECT id, title, type, date, status, venue,
            (SELECT COUNT(*) FROM attendance a WHERE a.ref_type='meeting' AND a.ref_id = meetings.id AND a.status IN ('Present','Late')) AS present,
            (SELECT COUNT(*) FROM attendance a WHERE a.ref_type='meeting' AND a.ref_id = meetings.id) AS total
       FROM meetings WHERE 1=1${meetings.sql} ORDER BY date DESC LIMIT 40`,
    meetings.params
  )
  const activityStats = all(
    `SELECT id, title, category, date, status, venue, budget, spent, expected_participants, actual_participants
       FROM activities WHERE 1=1${activitiesRange.sql} ORDER BY date DESC LIMIT 40`,
    activitiesRange.params
  )
  const financial = get(
    `SELECT COALESCE(SUM(budget),0) AS total_budget, COALESCE(SUM(spent),0) AS total_spent,
            COUNT(*) AS activity_count
       FROM activities WHERE 1=1${activitiesRange.sql}`,
    activitiesRange.params
  )
  const courseStats = all(
    `SELECT c.id, c.title, c.code, c.category, c.level, c.status, c.instructor,
            (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrolled,
            (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status='Completed') AS completed,
            (SELECT ROUND(AVG(e.progress),1) FROM enrollments e WHERE e.course_id = c.id) AS avg_progress
       FROM courses c ORDER BY enrolled DESC`
  )
  const certificateStats = all(
    `SELECT type AS name, COUNT(*) AS value FROM certificates WHERE 1=1${certificatesRange.sql} GROUP BY type ORDER BY value DESC`,
    certificatesRange.params
  )
  const projectStats = all(
    `SELECT status AS name, COUNT(*) AS value FROM projects GROUP BY status ORDER BY value DESC`
  )
  const memberStats = get(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status='Active' THEN 1 ELSE 0 END) AS active,
            SUM(CASE WHEN gender='Female' THEN 1 ELSE 0 END) AS female,
            SUM(CASE WHEN gender='Male' THEN 1 ELSE 0 END) AS male
       FROM members`
  )
  const classBreakdown = all(
    `SELECT COALESCE(NULLIF(class_level,''),'Unspecified') AS name,
            COUNT(*) AS total,
            SUM(CASE WHEN status='Active' THEN 1 ELSE 0 END) AS active,
            SUM(CASE WHEN gender='Female' THEN 1 ELSE 0 END) AS female,
            SUM(CASE WHEN gender='Male' THEN 1 ELSE 0 END) AS male
       FROM members GROUP BY name ORDER BY name`
  )
  const duesRange = RANGE_CLAUSE('payment_date', from, to)
  const duesSummary = get(
    `SELECT COUNT(*) AS records,
            COALESCE(SUM(amount_due),0) AS expected,
            COALESCE(SUM(amount_paid),0) AS collected,
            COALESCE(SUM(CASE WHEN status IN ('Unpaid','Partial') THEN amount_due - amount_paid ELSE 0 END),0) AS outstanding,
            SUM(CASE WHEN status='Paid' THEN 1 ELSE 0 END) AS paid_records,
            SUM(CASE WHEN status='Partial' THEN 1 ELSE 0 END) AS partial_records,
            SUM(CASE WHEN status='Unpaid' THEN 1 ELSE 0 END) AS unpaid_records
       FROM dues WHERE 1=1`,
    []
  )
  const duesByClass = all(
    `SELECT COALESCE(NULLIF(m.class_level,''),'Unspecified') AS name,
            COUNT(*) AS students,
            COALESCE(SUM(d.amount_due),0) AS expected,
            COALESCE(SUM(d.amount_paid),0) AS collected,
            COALESCE(SUM(CASE WHEN d.status IN ('Unpaid','Partial') THEN d.amount_due - d.amount_paid ELSE 0 END),0) AS outstanding
       FROM dues d JOIN members m ON m.id = d.member_id
      WHERE m.class_level IS NOT NULL AND m.class_level <> ''
      GROUP BY name ORDER BY name`
  )
  const duesByTerm = all(
    `SELECT term, academic_year, COUNT(*) AS students,
            COALESCE(SUM(amount_due),0) AS expected,
            COALESCE(SUM(amount_paid),0) AS collected
       FROM dues GROUP BY term, academic_year ORDER BY academic_year, term`
  )
  const duesDefaulters = all(
    `SELECT d.id, m.full_name, m.class_level, m.guardian_name, m.guardian_phone,
            d.term, d.academic_year, d.amount_due, d.amount_paid,
            (d.amount_due - d.amount_paid) AS balance, d.status
       FROM dues d JOIN members m ON m.id = d.member_id
      WHERE d.status IN ('Unpaid','Partial')
      ORDER BY balance DESC`
  )
  const duesPayments = all(
    `SELECT d.id, d.payment_date, d.amount_paid, d.method, d.receipt_no, d.term, d.academic_year,
            m.full_name, m.class_level
       FROM dues d JOIN members m ON m.id = d.member_id
      WHERE d.amount_paid > 0${duesRange.sql}
      ORDER BY d.payment_date DESC LIMIT 40`,
    duesRange.params
  )
  const cabinetList = all(
    `SELECT c.id, c.position, c.term, c.status, m.full_name, m.email, m.phone, m.class_level
       FROM cabinet c LEFT JOIN members m ON m.id = c.member_id ORDER BY c.order_index, c.position`
  )

  res.json({
    range: { from: from || null, to: to || null },
    members: memberStats,
    classBreakdown,
    dues: {
      summary: duesSummary,
      byClass: duesByClass,
      byTerm: duesByTerm,
      defaulters: duesDefaulters,
      payments: duesPayments
    },
    attendance: { byStatus: attendanceByStatus, byMember: attendanceByMember, bySession: attendanceBySession },
    meetings: meetingStats,
    activities: activityStats,
    financial,
    courses: courseStats,
    certificates: certificateStats,
    projects: projectStats,
    cabinet: cabinetList,
    settings: getSettings(),
    generated_at: new Date().toISOString()
  })
})

/* ------------------------------------------------------------------ */
/* CERTIFICATE PRINTABLE DATA                                          */
/* ------------------------------------------------------------------ */

api.get('/certificates/:id/printable', requireAuth, (req, res) => {
  const row = get(
    `SELECT c.*, m.full_name AS recipient_name, m.admission_number AS recipient_reg,
            m.class_level AS recipient_class, m.email AS recipient_email
       FROM certificates c LEFT JOIN members m ON m.id = c.recipient_id WHERE c.id = ?`,
    [Number(req.params.id)]
  )
  if (!row) return res.status(404).json({ error: 'Certificate not found' })
  const refMeta = row.related_type ? REF_TABLES[row.related_type] : null
  const related = refMeta && row.related_id
    ? get(`SELECT title, ${refMeta.dateColumn} AS date FROM ${refMeta.table} WHERE id = ?`, [row.related_id])
    : null
  res.json({ certificate: row, related, settings: getSettings() })
})

/* ------------------------------------------------------------------ */
/* GLOBAL SEARCH                                                       */
/* ------------------------------------------------------------------ */

api.get('/search', requireAuth, (req, res) => {
  const term = String(req.query.q || '').trim()
  if (term.length < 2) return res.json({ query: term, results: [] })
  const like = `%${term}%`
  const groups = []

  const memberRows = all(
    `SELECT id, full_name, admission_number, class_level, stream FROM members
      WHERE full_name LIKE ? OR admission_number LIKE ? OR email LIKE ? OR skills LIKE ?
         OR guardian_name LIKE ? OR guardian_phone LIKE ?
      ORDER BY full_name LIMIT 8`,
    [like, like, like, like, like, like]
  ).map((r) => ({
    id: r.id,
    title: r.full_name,
    subtitle: [r.class_level, r.stream && `Stream ${r.stream}`, r.admission_number].filter(Boolean).join(' • ')
  }))
  if (memberRows.length) groups.push({ resource: 'members', label: 'Members', items: memberRows })

  const simpleSearch = (resource, extra = '') => {
    const meta = resourceByKey(resource)
    const columns = meta.fields.filter((f) => f.search && !f.virtual)
    const where = columns.map((c) => `${c.key} LIKE ?`).join(' OR ')
    return all(`SELECT id, ${meta.titleKey} AS title, ${meta.subtitleKey ? meta.subtitleKey : 'id'} AS subtitle FROM ${meta.table} WHERE ${where} ${extra} LIMIT 6`,
      columns.map(() => like)
    ).map((r) => ({ id: r.id, title: r.title, subtitle: r.subtitle ? String(r.subtitle) : '' }))
  }

  for (const key of ['meetings', 'activities', 'courses', 'projects', 'reports', 'certificates', 'notes', 'dues']) {
    const meta = resourceByKey(key)
    const items = simpleSearch(key)
    if (items.length) groups.push({ resource: key, label: meta.label, items })
  }

  res.json({ query: term, results: groups })
})

/* ------------------------------------------------------------------ */
/* ACTIVITY LOG                                                        */
/* ------------------------------------------------------------------ */

api.get('/activity', requireAuth, (req, res) => {
  const limit = Math.min(500, Number(req.query.limit) || 100)
  const rows = req.user.role === 'member'
    ? all('SELECT * FROM activity_log WHERE user_id = ? ORDER BY id DESC LIMIT ?', [req.user.id, limit])
    : all('SELECT * FROM activity_log ORDER BY id DESC LIMIT ?', [limit])
  res.json({ data: rows })
})

/* ------------------------------------------------------------------ */
/* EXPORT + BACKUP                                                     */
/* ------------------------------------------------------------------ */

api.get('/export/:resource', requireAuth, (req, res) => {
  const resource = resourceByKey(req.params.resource)
  if (!resource) return res.status(404).json({ error: 'Unknown resource' })
  if (resource.key === 'users' && req.user.role !== 'admin') return res.status(403).json({ error: 'Not permitted' })
  const result = listResource(resource, { ...req.query, all: '1' }, req.user)
  const csv = toCsv(resource, result.data)
  const stamp = new Date().toISOString().slice(0, 10)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="ict-club-${resource.key}-${stamp}.csv"`)
  res.send('\uFEFF' + csv)
})

api.get('/backup', requireRole('admin'), (_req, res) => {
  const tables = [
    'members', 'cabinet', 'meetings', 'activities', 'courses', 'enrollments', 'attendance', 'dues',
    'reports', 'certificates', 'notes', 'projects', 'project_members', 'project_tasks', 'users', 'settings'
  ]
  const dump = { generated_at: new Date().toISOString(), version: 1, tables: {} }
  for (const table of tables) {
    dump.tables[table] = table === 'users'
      ? all('SELECT id, name, email, role, member_id, status, created_at, last_login FROM users')
      : all(`SELECT * FROM ${table}`)
  }
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="ict-club-backup-${stamp}.json"`)
  res.send(JSON.stringify(dump, null, 2))
})

/* ------------------------------------------------------------------ */
/* SETTINGS                                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Demo school data                                                    */
/* ------------------------------------------------------------------ */

/**
 * Reloads the demo school (administrator only). This wipes the database,
 * so the settings screen warns the user first and signs them out afterwards.
 */
api.post('/demo/seed', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only an administrator can reload the demo school data' })
  }
  const { seedDemo } = await import('./seed.js')
  const result = seedDemo({ reset: true, quiet: true })

  /* The reload recreates every row, including users, so the caller's session is
     gone. Issue a fresh one for the matching demo account to keep them signed
     in instead of dumping them on the sign-in screen. */
  const target =
    get('SELECT id, name, username, email, role, member_id FROM users WHERE email = ?', [req.user.email]) ||
    get('SELECT id, name, username, email, role, member_id FROM users WHERE role = ? ORDER BY id LIMIT 1', ['admin'])
  let session = null
  if (target) {
    session = createSession(target.id)
    logActivity({
      userId: target.id,
      userName: target.name,
      action: 'settings',
      resource: 'demo',
      detail: 'Reloaded the demo school data'
    })
  }

  res.json({
    data: {
      skipped: Boolean(result.skipped),
      counts: result.counts || null,
      token: session?.token || null,
      user: target
        ? {
            id: target.id,
            name: target.name,
            username: target.username || null,
            email: target.email,
            role: target.role,
            member_id: target.member_id
          }
        : null,
      accounts: [{ username: 'Sharp', email: 'sharp@school.ac.ug', role: 'Teacher patron / administrator' }]
    }
  })
})

api.get('/settings', requireAuth, (_req, res) => res.json({ data: getSettings() }))

api.put('/settings', requireRole('admin', 'cabinet'), (req, res) => {
  const saved = saveSettings(req.body || {})
  logActivity({ userId: req.user.id, userName: req.user.name, action: 'settings', resource: 'settings', detail: Object.keys(req.body || {}).join(', ') })
  res.json({ data: saved })
})

/* ------------------------------------------------------------------ */
/* MEMBER IMPORT + QUICK GENERATORS                                    */
/* ------------------------------------------------------------------ */

api.post('/members/import', requireRole('admin', 'cabinet'), (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : []
  if (!rows.length) return res.status(400).json({ error: 'No rows supplied' })
  let created = 0
  const errors = []
  for (const [index, raw] of rows.entries()) {
    const name = raw.full_name || raw.name
    if (!name) {
      errors.push(`Row ${index + 1}: full name is required`)
      continue
    }
    insert('members', {
      full_name: name,
      admission_number: raw.admission_number || raw.reg_number || null,
      class_level: raw.class_level || raw.class || null,
      stream: raw.stream || null,
      house: raw.house || null,
      email: raw.email || null,
      phone: raw.phone || null,
      gender: raw.gender || null,
      guardian_name: raw.guardian_name || null,
      guardian_phone: raw.guardian_phone || null,
      guardian_relationship: raw.guardian_relationship || null,
      address: raw.address || null,
      role: raw.role || 'Student Member',
      status: raw.status || 'Active',
      join_date: raw.join_date || new Date().toISOString().slice(0, 10),
      skills: raw.skills || null
    })
    created++
  }
  logActivity({ userId: req.user.id, userName: req.user.name, action: 'import', resource: 'members', detail: `${created} members imported` })
  res.json({ ok: true, created, errors })
})

/** Quickly enrol a whole course (or selected members) into a course. */
api.post('/courses/:id/enroll', requireRole('admin', 'cabinet'), (req, res) => {
  const course = get('SELECT * FROM courses WHERE id = ?', [Number(req.params.id)])
  if (!course) return res.status(404).json({ error: 'Course not found' })
  const memberIds = Array.isArray(req.body?.member_ids) && req.body.member_ids.length
    ? req.body.member_ids.map(Number)
    : all("SELECT id FROM members WHERE status = 'Active'").map((r) => r.id)
  let created = 0
  let skipped = 0
  for (const memberId of memberIds) {
    if (get('SELECT id FROM enrollments WHERE course_id = ? AND member_id = ?', [course.id, memberId])) {
      skipped++
      continue
    }
    insert('enrollments', {
      course_id: course.id,
      member_id: memberId,
      enrolled_date: new Date().toISOString().slice(0, 10),
      status: 'Enrolled',
      progress: 0
    })
    created++
  }
  res.json({ ok: true, created, skipped })
})

/** Issue certificates to every learner who completed a course. */
api.post('/courses/:id/issue-certificates', requireRole('admin', 'cabinet'), (req, res) => {
  const course = get('SELECT * FROM courses WHERE id = ?', [Number(req.params.id)])
  if (!course) return res.status(404).json({ error: 'Course not found' })
  const completed = req.body?.status
    ? all('SELECT * FROM enrollments WHERE course_id = ? AND status = ?', [course.id, req.body.status])
    : all("SELECT * FROM enrollments WHERE course_id = ? AND status = 'Completed'", [course.id])
  if (!completed.length) return res.status(400).json({ error: 'No completed learners found for this course' })

  const year = new Date().getFullYear()
  let issued = 0
  const skipped = []
  for (const enrollment of completed) {
    const dupe = get(
      "SELECT id FROM certificates WHERE recipient_id = ? AND related_type = 'course' AND related_id = ?",
      [enrollment.member_id, course.id]
    )
    if (dupe) {
      skipped.push(enrollment.member_id)
      continue
    }
    const seq = count('SELECT COUNT(*) FROM certificates') + 1
    insert('certificates', {
      certificate_no: `ICTC/${year}/${String(seq).padStart(4, '0')}`,
      title: `Certificate of Completion — ${course.title}`,
      type: 'Completion',
      recipient_id: enrollment.member_id,
      related_type: 'course',
      related_id: course.id,
      issue_date: new Date().toISOString().slice(0, 10),
      issued_by: course.instructor || 'ICT Club',
      signed_by: 'Club Patron',
      grade: enrollment.score || null,
      description: `For successfully completing the ${course.title} course (${course.level || 'Beginner'} level).`,
      status: 'Issued',
      verification_code: `ICT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
    })
    issued++
  }
  logActivity({ userId: req.user.id, userName: req.user.name, action: 'certificates', resource: 'courses', recordId: course.id, detail: `${issued} certificates issued` })
  res.json({ ok: true, issued, skipped: skipped.length })
})

/** Create the attendance register rows for a session summary snapshot. */
api.get('/dashboard/export', requireAuth, (_req, res) => {
  res.status(400).json({ error: 'Use /api/export/:resource' })
})

export default api
