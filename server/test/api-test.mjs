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

/* 2. Authentication --------------------------------------------------- */
await check('admin can sign in', async () => {
  const { data, status } = await call('/api/auth/login', { method: 'POST', body: { email: 'admin@ictclub.org', password: 'admin123' } })
  assert(status === 200 && data.token, `login failed (${status})`)
  adminToken = data.token
  return `signed in as ${data.user.name} (${data.user.role})`
})

await check('wrong password is rejected', async () => {
  const { status } = await call('/api/auth/login', { method: 'POST', body: { email: 'admin@ictclub.org', password: 'nope' } })
  assert(status === 401, `expected 401, got ${status}`)
  return '401 returned'
})

await check('cabinet and member accounts sign in', async () => {
  const cabinet = await call('/api/auth/login', { method: 'POST', body: { email: 'cabinet@ictclub.org', password: 'cabinet123' } })
  const member = await call('/api/auth/login', { method: 'POST', body: { email: 'member@ictclub.org', password: 'member123' } })
  assert(cabinet.data?.token && member.data?.token, 'demo accounts unavailable')
  cabinetToken = cabinet.data.token
  memberToken = member.data.token
  memberUserId = member.data.user.id
  return `${cabinet.data.user.role} + ${member.data.user.role}`
})

await check('unauthenticated requests are blocked', async () => {
  const { status } = await call('/api/members')
  assert(status === 401, `expected 401, got ${status}`)
  return '401 returned'
})

await check('current user can be fetched', async () => {
  const { data } = await call('/api/auth/me', { token: adminToken })
  assert(data?.user?.email === 'admin@ictclub.org', 'wrong user returned')
  return data.user.role
})

/* 3. Every resource lists -------------------------------------------- */
const RESOURCES = ['members', 'cabinet', 'meetings', 'activities', 'courses', 'enrollments', 'attendance', 'reports', 'certificates', 'notes', 'projects', 'project_members', 'project_tasks', 'users']
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
await check('create a member', async () => {
  const { data, status } = await call('/api/members', {
    method: 'POST',
    token: adminToken,
    body: { full_name: 'API Test Member', email: 'api-test@example.com', department: 'Computer Science', year_of_study: 'Year 2' }
  })
  assert(status === 201, `status ${status}`)
  scratchMemberId = data.id
  return `#${data.id} created`
})

await check('required field validation works', async () => {
  const { status, data } = await call('/api/members', { method: 'POST', token: adminToken, body: { department: 'Computer Science' } })
  assert(status === 400, `expected 400, got ${status}`)
  assert(/required/i.test(data.error), 'no validation message')
  return data.error
})

await check('invalid email is rejected', async () => {
  const { status } = await call('/api/members', { method: 'POST', token: adminToken, body: { full_name: 'Bad Email', email: 'not-an-email' } })
  assert(status === 400, `expected 400, got ${status}`)
  return '400 returned'
})

await check('update a member', async () => {
  const { data, status } = await call(`/api/members/${scratchMemberId}`, {
    method: 'PATCH',
    token: adminToken,
    body: { skills: 'Python, Node.js', status: 'Active' }
  })
  assert(status === 200 && data.data.skills === 'Python, Node.js', 'update did not persist')
  return 'skills updated'
})

await check('member record detail includes relations', async () => {
  const { data } = await call(`/api/members/${scratchMemberId}`, { token: adminToken })
  assert(Array.isArray(data.relations), 'no relations array')
  return `${data.relations.length} related sections`
})

await check('delete a member', async () => {
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
await check('dashboard returns all widget blocks', async () => {
  const { data, status } = await call('/api/dashboard', { token: adminToken })
  assert(status === 200, `status ${status}`)
  for (const key of ['cards', 'attendance', 'members', 'projects', 'activities', 'courses', 'meetings', 'recent']) {
    assert(data[key], `missing ${key}`)
  }
  return `${data.cards.members} members, attendance ${data.attendance.rate}%`
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

/* Summary ------------------------------------------------------------ */
console.log(`\n  ${passed} passed, ${failed} failed\n`)
if (failed) {
  console.log('  Failures:')
  failures.forEach((failure) => console.log(`   • ${failure}`))
  console.log('')
  process.exit(1)
}
process.exit(0)
