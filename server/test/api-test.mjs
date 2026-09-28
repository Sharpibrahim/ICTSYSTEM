/**
 * API regression test.
 * Runs against a live server:  npm run dev:api   (in another terminal)
 *                               npm test
 *
 * Each check exercises a real endpoint end-to-end, including permission rules,
 * and cleans up the records it creates.
 */
const BASE = process.env.API_URL || 'http://localhost:4000'

let passed = 0
let failed = 0
const failures = []

async function call(path, { method = 'GET', body, token, raw = false } = {}) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  if (raw) return res
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }
  return { status: res.status, data, headers: res.headers }
}

async function check(label, fn) {
  try {
    const detail = await fn()
    passed += 1
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`)
  } catch (error) {
    failed += 1
    failures.push(`${label}: ${error.message}`)
    console.log(`  ✗ ${label} — ${error.message}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

console.log(`\n  ICT Club Management System — API test\n  target: ${BASE}\n`)

/* 1. Public endpoints ------------------------------------------------- */
let adminToken = ''
let cabinetToken = ''
let memberToken = ''
let memberUserId = null

await check('health endpoint responds', async () => {
  const { data } = await call('/api/health')
  assert(data?.ok, 'health did not report ok')
  return data.service
})

/* The web app uses the installation id to tell a reinstalled system apart from
   a session that really expired, so it must be reported consistently. */
let installId = ''
await check('health reports which installation is answering', async () => {
  const { data, headers } = await call('/api/health')
  installId = data?.install
  assert(typeof installId === 'string' && installId.length >= 8, `unexpected install id: ${installId}`)
  assert(headers.get('x-install-id') === installId, 'the X-Install-Id header and the payload disagree')
  return `installation ${installId}`
})

/* 2. Authentication --------------------------------------------------- */
const ADMIN = { email: process.env.ADMIN_EMAIL || 'sharp@school.ac.ug', password: process.env.ADMIN_PASSWORD || 'SunnyDay@2026' }
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Sharp'
const emailFor = (role) => `test-${role}-${Date.now()}@school.ac.ug`

await check('admin can sign in with the username', async () => {
  const { data, status } = await call('/api/auth/login', { method: 'POST', body: { email: ADMIN_USERNAME, password: ADMIN.password } })
  assert(status === 200 && data.token, `login with the username failed (${status})`)
  assert(data.install === installId, 'the sign-in response named a different installation')
  adminToken = data.token
  return `signed in as ${data.user.name} (${data.user.role})`
})

await check('a rejected token reports the installation too', async () => {
  const { status, headers } = await call('/api/dashboard', { token: 'token-from-an-old-installation' })
  assert(status === 401, `expected 401, got ${status}`)
  assert(headers.get('x-install-id') === installId, 'the 401 did not say which installation rejected the token')
  return 'the app can tell a reinstall apart from an expiry'
})

await check('admin can also sign in with the email', async () => {
  const { data, status } = await call('/api/auth/login', { method: 'POST', body: { email: ADMIN.email, password: ADMIN.password } })
  assert(status === 200 && data.token, `login with the email failed (${status})`)
  adminToken = data.token
  return ADMIN.email
})

await check('wrong password is rejected', async () => {
  const { status } = await call('/api/auth/login', { method: 'POST', body: { email: ADMIN.email, password: 'nope' } })
  assert(status === 401, `expected 401, got ${status}`)
  return '401 returned'
})

/* The club ships with a single administrator account; the role checks below
   create their own executive and student logins and remove them afterwards. */
let cabinetUserId = null
await check('executive and student accounts can be created and sign in', async () => {
  const cabinet = await call('/api/users', {
    method: 'POST',
    token: adminToken,
    body: { name: 'Test Executive', username: 'testexec', email: emailFor('cabinet'), password: 'executive123', role: 'cabinet', status: 'active' }
  })
  const member = await call('/api/users', {
    method: 'POST',
    token: adminToken,
    body: { name: 'Test Student', username: 'teststudent', email: emailFor('member'), password: 'member123', role: 'member', status: 'active' }
  })
  assert(cabinet.status === 201 && member.status === 201, `could not create accounts (${cabinet.status}/${member.status})`)

  const cabinetLogin = await call('/api/auth/login', { method: 'POST', body: { email: 'testexec', password: 'executive123' } })
  const memberLogin = await call('/api/auth/login', { method: 'POST', body: { email: 'teststudent', password: 'member123' } })
  assert(cabinetLogin.data?.token && memberLogin.data?.token, 'created accounts cannot sign in')
  cabinetToken = cabinetLogin.data.token
  memberToken = memberLogin.data.token
  memberUserId = memberLogin.data.user.id
  cabinetUserId = cabinetLogin.data.user.id
  return `${cabinetLogin.data.user.role} + ${memberLogin.data.user.role} created, signed in`
})

await check('username uniqueness is enforced', async () => {
  const { status, data } = await call('/api/users', {
    method: 'POST',
    token: adminToken,
    body: { name: 'Duplicate Sharp', username: 'sharp', email: emailFor('dupe'), password: 'whatever123', role: 'member' }
  })
  assert(status === 400, `expected 400, got ${status}`)
  assert(/username/i.test(data.error || ''), `unexpected message: ${data.error}`)
  return data.error
})

await check('unauthenticated requests are blocked', async () => {
  const { status } = await call('/api/members')
  assert(status === 401, `expected 401, got ${status}`)
  return '401 returned'
})

await check('current user can be fetched', async () => {
  const { data } = await call('/api/auth/me', { token: adminToken })
  assert(data?.user?.email === ADMIN.email, `wrong user returned (${data?.user?.email})`)
  assert(data.user.username === ADMIN_USERNAME, 'username missing from the session')
  return `${data.user.name} (${data.user.role})`
})

/* 3. Every resource lists -------------------------------------------- */
const RESOURCES = ['members', 'cabinet', 'meetings', 'activities', 'courses', 'enrollments', 'attendance', 'dues', 'reports', 'certificates', 'notes', 'projects', 'project_members', 'project_tasks', 'users']
for (const resource of RESOURCES) {
  await check(`GET /api/${resource} returns records`, async () => {
    const { data, status } = await call(`/api/${resource}?pageSize=3`, { token: adminToken })
    assert(status === 200, `status ${status}`)
    assert(Array.isArray(data.data), 'no data array')
    return `${data.total} records`
  })
}

/* 4. Search, filter, sort, paginate ---------------------------------- */
await check('search filter works', async () => {
  const { data } = await call('/api/members?q=a&pageSize=5', { token: adminToken })
  assert(data.data.length > 0, 'no search results')
  return `${data.total} matches`
})

await check('equality filter works', async () => {
  const { data } = await call("/api/members?status=Active&pageSize=5", { token: adminToken })
  assert(data.data.every((row) => row.status === 'Active'), 'filter leaked other statuses')
  return `${data.total} active members`
})

await check('sorting works', async () => {
  const { data } = await call('/api/members?sort=-full_name&pageSize=5', { token: adminToken })
  const names = data.data.map((r) => r.full_name)
  const sorted = [...names].sort((a, b) => b.localeCompare(a))
  assert(JSON.stringify(names) === JSON.stringify(sorted), 'rows not sorted descending')
  return `${names[0]} first`
})

await check('pagination works', async () => {
  const first = await call('/api/members?pageSize=5&page=1', { token: adminToken })
  const second = await call('/api/members?pageSize=5&page=2', { token: adminToken })
  assert(first.data.data[0].id !== second.data.data[0].id, 'page 2 returned page 1')
  return `pages: ${first.data.pages}`
})

/* 5. CRUD + validation ---------------------------------------------- */
let scratchMemberId = null
await check('register a student', async () => {
  const { data, status } = await call('/api/members', {
    method: 'POST',
    token: adminToken,
    body: {
      full_name: 'API Test Student',
      class_level: 'S2',
      stream: 'A',
      house: 'Kenya',
      guardian_name: 'Mrs. Test Guardian',
      guardian_phone: '+256700000000'
    }
  })
  assert(status === 201, `status ${status}`)
  scratchMemberId = data.id
  return `#${data.id} created`
})

await check('required field validation works', async () => {
  const { status, data } = await call('/api/members', { method: 'POST', token: adminToken, body: { class_level: 'S2' } })
  assert(status === 400, `expected 400, got ${status}`)
  assert(/required/i.test(data.error), 'no validation message')
  return data.error
})

await check('invalid email is rejected', async () => {
  const { status } = await call('/api/members', { method: 'POST', token: adminToken, body: { full_name: 'Bad Email', email: 'not-an-email', class_level: 'S1' } })
  assert(status === 400, `expected 400, got ${status}`)
  return '400 returned'
})

await check('update a student', async () => {
  const { data, status } = await call(`/api/members/${scratchMemberId}`, {
    method: 'PATCH',
    token: adminToken,
    body: { skills: 'Python, Node.js', status: 'Active' }
  })
  assert(status === 200 && data.data.skills === 'Python, Node.js', 'update did not persist')
  return 'skills updated'
})

await check('student record detail includes relations', async () => {
  const { data } = await call(`/api/members/${scratchMemberId}`, { token: adminToken })
  assert(Array.isArray(data.relations), 'no relations array')
  return `${data.relations.length} related sections`
})

await check('delete a student', async () => {
  const { status } = await call(`/api/members/${scratchMemberId}`, { method: 'DELETE', token: adminToken })
  assert(status === 200, `status ${status}`)
  const after = await call(`/api/members/${scratchMemberId}`, { token: adminToken })
  assert(after.status === 404, 'record still exists')
  return 'deleted and confirmed gone'
})

/* 6. Permission rules ------------------------------------------------ */
await check('members cannot create club records', async () => {
  const { status } = await call('/api/meetings', { method: 'POST', token: memberToken, body: { title: 'Should fail', type: 'General Assembly', date: '2026-01-01' } })
  assert(status === 403, `expected 403, got ${status}`)
  return '403 returned'
})

await check('members cannot list user accounts', async () => {
  const { data } = await call('/api/users', { token: memberToken })
  assert(data.total <= 1, 'member could see other accounts')
  return 'only their own account is visible'
})

await check('members can read club records', async () => {
  const { status } = await call('/api/meetings?pageSize=2', { token: memberToken })
  assert(status === 200, `status ${status}`)
  return 'read access granted'
})

await check('cabinet members can write records', async () => {
  const created = await call('/api/notes', {
    method: 'POST',
    token: cabinetToken,
    body: { title: 'API test note', content: 'Created by the API test.', category: 'General', visibility: 'Public' }
  })
  assert(created.status === 201, `status ${created.status}`)
  const removed = await call(`/api/notes/${created.data.id}`, { method: 'DELETE', token: cabinetToken })
  assert(removed.status === 200, 'cabinet could not delete its note')
  return 'create + delete succeeded'
})

await check('members cannot approve their own report', async () => {
  const created = await call('/api/reports', {
    method: 'POST',
    token: memberToken,
    body: { title: 'Member submitted report', type: 'Progress Report', content: 'Draft content', status: 'Approved' }
  })
  assert(created.status === 201, `status ${created.status}`)
  assert(created.data.data.status === 'Draft', `status was forced to ${created.data.data.status}`)
  await call(`/api/reports/${created.data.id}`, { method: 'DELETE', token: cabinetToken })
  return 'status forced back to Draft'
})

/* 7. Attendance workflow --------------------------------------------- */
await check('attendance register loads a roster', async () => {
  const { data, status } = await call('/api/attendance/register?ref_type=meeting&ref_id=1', { token: adminToken })
  assert(status === 200, `status ${status}`)
  assert(data.roster.length > 10, 'roster looks empty')
  return `${data.roster.length} members on the roster`
})

await check('bulk attendance save creates and updates records', async () => {
  const roster = await call('/api/attendance/register?ref_type=meeting&ref_id=1', { token: adminToken })
  const members = roster.data.roster.slice(0, 3)
  const saved = await call('/api/attendance/register', {
    method: 'POST',
    token: adminToken,
    body: {
      ref_type: 'meeting',
      ref_id: 1,
      records: members.map((m, i) => ({ member_id: m.member_id, status: i === 0 ? 'Present' : i === 1 ? 'Late' : 'Absent', check_in_time: '09:05' }))
    }
  })
  assert(saved.status === 200, `status ${saved.status}`)
  const reloaded = await call('/api/attendance/register?ref_type=meeting&ref_id=1', { token: adminToken })
  const changed = reloaded.data.roster.filter((r) => members.some((m) => m.member_id === r.member_id))
  assert(changed.some((r) => r.status), 'attendance was not stored')
  return `${saved.data.created} created, ${saved.data.updated} updated`
})

await check('attendance summary maths is consistent', async () => {
  const { data } = await call('/api/attendance/register?ref_type=meeting&ref_id=1', { token: adminToken })
  const { summary, roster } = data
  const counted = ['Present', 'Absent', 'Late', 'Excused'].reduce((sum, key) => sum + (summary[key] || 0), 0)
  assert(counted <= roster.length, 'summary counts exceed the roster')
  return `${summary.present} present, ${summary.absent} absent`
})

await check('unknown session type is rejected', async () => {
  const { status } = await call('/api/attendance/register?ref_type=banana&ref_id=1', { token: adminToken })
  assert(status === 400, `expected 400, got ${status}`)
  return '400 returned'
})

/* 8. Analytics -------------------------------------------------------- */
await check('dues register can be generated per term', async () => {
  /* Clear the batch this check owns so the suite can be run repeatedly. */
  const stale = await call('/api/dues?term=Term%203&academic_year=2027&pageSize=200', { token: adminToken })
  for (const row of stale.data.data) {
    await call(`/api/dues/${row.id}`, { method: 'DELETE', token: adminToken })
  }
  const { data, status } = await call('/api/dues/generate', {
    method: 'POST',
    token: adminToken,
    body: { term: 'Term 3', academic_year: '2027', amount_due: 12000 }
  })
  assert(status === 200, `status ${status}`)
  assert(data.created > 0, 'no dues records created')
  return `${data.created} records created for ${data.term} ${data.academic_year}`
})

await check('generating the same term twice does not duplicate records', async () => {
  const { data } = await call('/api/dues/generate', {
    method: 'POST',
    token: adminToken,
    body: { term: 'Term 3', academic_year: '2027', amount_due: 12000 }
  })
  assert(data.created === 0 && data.skipped > 0, `created ${data.created}, skipped ${data.skipped}`)
  return `skipped ${data.skipped} existing records`
})

await check('a payment updates the balance and status', async () => {
  const list = await call('/api/dues?status=Unpaid&pageSize=1', { token: adminToken })
  const record = list.data.data[0]
  const half = Math.round(Number(record.amount_due) / 2)
  const partial = await call(`/api/dues/${record.id}/payment`, { method: 'POST', token: adminToken, body: { amount: half, method: 'Mobile Money' } })
  assert(partial.status === 200, `status ${partial.status}`)
  assert(partial.data.data.status === 'Partial', `status became ${partial.data.data.status}`)
  assert(partial.data.data.receipt_no, 'no receipt number issued')
  const rest = await call(`/api/dues/${record.id}/payment`, { method: 'POST', token: adminToken, body: { amount: half } })
  assert(rest.data.data.status === 'Paid', `final status ${rest.data.data.status}`)
  return `partial → paid, receipt ${partial.data.data.receipt_no}`
})

await check('payments must be greater than zero', async () => {
  const list = await call('/api/dues?pageSize=1', { token: adminToken })
  const { status } = await call(`/api/dues/${list.data.data[0].id}/payment`, { method: 'POST', token: adminToken, body: { amount: 0 } })
  assert(status === 400, `expected 400, got ${status}`)
  return '400 returned'
})

await check('dues summary reports collection totals', async () => {
  const { data, status } = await call('/api/dues/summary', { token: adminToken })
  assert(status === 200, `status ${status}`)
  assert(data.totals.expected > 0, 'no expected amount')
  assert(data.totals.collected <= data.totals.expected, 'collected more than expected')
  return `${data.totals.collected} of ${data.totals.expected} collected, ${data.owing.length} owing`
})

await check('students cannot generate dues records', async () => {
  const { status } = await call('/api/dues/generate', { method: 'POST', token: memberToken, body: { term: 'Term 1', academic_year: '2030', amount_due: 1000 } })
  assert(status === 403, `expected 403, got ${status}`)
  return '403 returned'
})

await check('attendance register can be limited to one class', async () => {
  const all = await call('/api/attendance/register?ref_type=meeting&ref_id=1', { token: adminToken })
  const oneClass = await call('/api/attendance/register?ref_type=meeting&ref_id=1&class_level=S2', { token: adminToken })
  assert(oneClass.data.roster.length > 0, 'no students returned for S2')
  assert(oneClass.data.roster.every((r) => r.class_level === 'S2'), 'roster contains other classes')
  assert(oneClass.data.roster.length <= all.data.roster.length, 'class filter returned more rows')
  return `${oneClass.data.roster.length} S2 students of ${all.data.roster.length}`
})

await check('attendance register flags students who owe dues', async () => {
  const { data } = await call('/api/attendance/register?ref_type=meeting&ref_id=1', { token: adminToken })
  assert(Array.isArray(data.dues), 'no dues list on the register')
  return `${data.dues.length} students with outstanding dues`
})

await check('dashboard returns all widget blocks', async () => {
  const { data, status } = await call('/api/dashboard', { token: adminToken })
  assert(status === 200, `status ${status}`)
  for (const key of ['cards', 'attendance', 'members', 'finance', 'projects', 'activities', 'courses', 'meetings', 'recent']) {
    assert(data[key], `missing ${key}`)
  }
  assert(data.members.byClass.length >= 5, 'no class breakdown')
  return `${data.cards.members} members, attendance ${data.attendance.rate}%, dues ${data.finance.collected}`
})
await check('reports data includes dues and class breakdown', async () => {
  const { data } = await call('/api/reports/data', { token: adminToken })
  assert(data.dues?.summary, 'no dues summary in reports data')
  assert(Array.isArray(data.classBreakdown) && data.classBreakdown.length > 0, 'no class breakdown')
  return `${data.classBreakdown.length} classes, expected ${data.dues.summary.expected}`
})

await check('reports data respects a date range', async () => {
  const all = await call('/api/reports/data', { token: adminToken })
  const ranged = await call('/api/reports/data?from=2026-09-01&to=2026-09-30', { token: adminToken })
  assert(all.status === 200 && ranged.status === 200, 'endpoint failed')
  assert(ranged.data.meetings.length <= all.data.meetings.length, 'range filter did not narrow results')
  return `${ranged.data.meetings.length} meetings in range`
})

await check('global search returns grouped results', async () => {
  const { data } = await call('/api/search?q=club', { token: adminToken })
  assert(Array.isArray(data.results), 'no results array')
  return `${data.results.length} groups`
})

/* 9. Exports, backup, verification ----------------------------------- */
await check('CSV export returns a file', async () => {
  const res = await call('/api/export/members', { token: adminToken, raw: true })
  assert(res.status === 200, `status ${res.status}`)
  assert(/attachment/.test(res.headers.get('content-disposition') || ''), 'no attachment header')
  const csv = await res.text()
  assert(csv.split('\n').length > 10, 'csv looks empty')
  return `${csv.split('\n').length - 1} rows`
})

await check('admin can download a backup', async () => {
  const res = await call('/api/backup', { token: adminToken, raw: true })
  assert(res.status === 200, `status ${res.status}`)
  const dump = await res.json()
  assert(dump.tables?.members?.length > 0, 'backup contains no members')
  return `${Object.keys(dump.tables).length} tables`
})

await check('cabinet cannot download a backup', async () => {
  const { status } = await call('/api/backup', { token: cabinetToken })
  assert(status === 403, `expected 403, got ${status}`)
  return '403 returned'
})

await check('certificate verification works', async () => {
  const list = await call('/api/certificates?pageSize=1', { token: adminToken })
  const code = list.data.data[0].verification_code
  const { data, status } = await call(`/api/verify/${encodeURIComponent(code)}`)
  assert(status === 200 && data.valid, 'verification failed')
  return `${data.certificate.certificate_no} → ${data.certificate.recipient_name}`
})

await check('unknown verification code is rejected', async () => {
  const { status } = await call('/api/verify/NOPE-1234')
  assert(status === 404, `expected 404, got ${status}`)
  return '404 returned'
})

/* 10. Settings + course automation ----------------------------------- */
await check('settings can be read and updated', async () => {
  const before = await call('/api/settings', { token: adminToken })
  const updated = await call('/api/settings', { method: 'PUT', token: adminToken, body: { club_tagline: 'Innovate • Build • Share' } })
  assert(updated.status === 200, `status ${updated.status}`)
  assert(updated.data.data.club_name === before.data.data.club_name, 'settings mangled')
  return `${Object.keys(updated.data.data).length} settings`
})

await check('course enrollment automation works', async () => {
  const { data } = await call('/api/courses/1/enroll', { method: 'POST', token: adminToken, body: {} })
  assert(typeof data.created === 'number', 'no created count')
  return `${data.created} new enrollments (${data.skipped} already enrolled)`
})

await check('certificate issuing to course completers works', async () => {
  const { data, status } = await call('/api/courses/1/issue-certificates', { method: 'POST', token: adminToken, body: {} })
  assert(status === 200 || status === 400, `unexpected status ${status}`)
  return `issued ${data.issued ?? 0}, skipped ${data.skipped ?? 0}`
})

await check('user accounts can be created and removed', async () => {
  const created = await call('/api/users', {
    method: 'POST',
    token: adminToken,
    body: { name: 'Temp Account', email: 'temp-account@example.com', password: 'secret123', role: 'member' }
  })
  assert(created.status === 201, `status ${created.status}`)
  const loginAsTemp = await call('/api/auth/login', { method: 'POST', body: { email: 'temp-account@example.com', password: 'secret123' } })
  assert(loginAsTemp.data?.token, 'new account cannot sign in')
  const removed = await call(`/api/users/${created.data.id}`, { method: 'DELETE', token: adminToken })
  assert(removed.status === 200, 'could not delete the temp account')
  return 'created, signed in, deleted'
})

await check('account deletion of your own account is blocked', async () => {
  const me = await call('/api/auth/me', { token: memberToken })
  const { status } = await call(`/api/users/${me.data.user.id}`, { method: 'DELETE', token: memberToken })
  assert(status === 403 || status === 400, `expected 400/403, got ${status}`)
  return `${status} returned`
})

await check('signup flow works', async () => {
  const email = `signup-${Date.now()}@example.com`
  const { data, status } = await call('/api/auth/signup', { method: 'POST', body: { name: 'Signup Test', email, password: 'secret123' } })
  assert(status === 201 && data.token, `status ${status}`)
  await fetch(`${BASE}/api/users/${data.user.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } })
  return 'account created and cleaned up'
})

await check('activity log records actions', async () => {
  const { data } = await call('/api/activity?limit=5', { token: adminToken })
  assert(Array.isArray(data.data), 'no log array')
  return `${data.data.length} recent entries`
})

/* Remove the accounts this run created --------------------------------- */
await check('test accounts are cleaned up', async () => {
  for (const id of [memberUserId, cabinetUserId]) {
    if (!id) continue
    const { status } = await call(`/api/users/${id}`, { method: 'DELETE', token: adminToken })
    assert(status === 200, `could not delete user ${id} (${status})`)
  }
  const remaining = await call('/api/users?pageSize=50', { token: adminToken })
  const strays = remaining.data.data.filter((u) => /^test-|^testexec|^teststudent/.test(`${u.email} ${u.username}`))
  assert(strays.length === 0, `test accounts left behind: ${strays.map((u) => u.email).join(', ')}`)
  return `left ${remaining.data.total} account(s): ${remaining.data.data.map((u) => u.username || u.email).join(', ')}`
})

/* Demo data reload (runs last: it replaces every record) --------------- */

await check('only an administrator can reload the demo school data', async () => {
  const { status } = await call('/api/demo/seed', { method: 'POST', token: memberToken })
  assert(status === 403, `expected 403 for a student, got ${status}`)
  const cabinet = await call('/api/demo/seed', { method: 'POST', token: cabinetToken })
  assert(cabinet.status === 403, `expected 403 for an executive, got ${cabinet.status}`)
  return '403 for students and executives'
})

await check('an administrator can reload the demo school data', async () => {
  const { data, status } = await call('/api/demo/seed', { method: 'POST', token: adminToken })
  assert(status === 200, `status ${status}`)
  assert(data.data.counts?.members > 50, `only ${data.data.counts?.members} members seeded`)
  assert(data.data.counts?.dues > 100, `only ${data.data.counts?.dues} dues records seeded`)
  assert(Array.isArray(data.data.accounts) && data.data.accounts.length === 1, 'the administrator account was not reported')
  assert(data.data.accounts[0].username === ADMIN_USERNAME, `wrong account reported: ${JSON.stringify(data.data.accounts[0])}`)

  /* The caller keeps a working session: the reload issues a fresh token. */
  assert(data.data.token, 'no replacement session token was returned')
  assert(data.data.user?.email === ADMIN.email, `unexpected user ${data.data.user?.email}`)
  assert(data.data.user?.username === ADMIN_USERNAME, 'the administrator username was not preserved')
  adminToken = data.data.token
  const { data: dashboard, status: dashStatus } = await call('/api/dashboard', { token: adminToken })
  assert(dashStatus === 200, `the replacement token does not work (${dashStatus})`)
  assert(dashboard.cards.members === data.data.counts.members, 'dashboard does not match the reloaded data')
  return `${data.data.counts.members} members, ${data.data.counts.dues} dues records, ${dashboard.cards.certificates} certificates, session kept`
})

/* Summary ------------------------------------------------------------ */
console.log(`\n  ${passed} passed, ${failed} failed\n`)
if (failed) {
  console.log('  Failures:')
  failures.forEach((failure) => console.log(`   • ${failure}`))
  console.log('')
  process.exit(1)
}
process.exit(0)
