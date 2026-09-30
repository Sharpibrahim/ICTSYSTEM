/**
 * Screen suite — every screen the club uses, rendered in a real DOM.
 *
 * Each route is loaded from the running API (which serves the app) in jsdom,
 * the app's own scripts run, and the rendered page is inspected. A screen fails
 * if it throws, stays on the boot splash, renders nothing, shows a value that
 * means the API no longer sends what the screen expects ("undefined", "NaN",
 * "Invalid Date", "[object Object]"), or fails to say there is nothing yet.
 *
 * Run with:  npm run test:ui      (the runner starts the API it talks to)
 */
import { open, login, text, waitFor, apiUrl } from './harness.mjs'

const ROLES = { admin: null, cabinet: null, member: null }
const runRole = process.env.AS || 'admin'

/** Accounts for the executive and member views are created and removed here. */
async function accountFor(role, token) {
  if (role === 'admin') return login()
  const stamp = Date.now()
  const spec = {
    cabinet: { name: 'Smoke Executive', username: `smokeexec`, email: `smoke-exec-${stamp}@school.ac.ug`, password: 'executive123', role: 'cabinet' },
    member: { name: 'Smoke Student', username: `smokestudent`, email: `smoke-member-${stamp}@school.ac.ug`, password: 'member123', role: 'member' }
  }[role]
  const created = await fetch(`${apiUrl}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: spec.name, username: spec.username, email: spec.email, password: spec.password, role: spec.role, status: 'active' })
  }).then((r) => r.json())
  if (!created?.data?.id) throw new Error(`could not create a ${role} account: ${JSON.stringify(created).slice(0, 200)}`)
  const session = await login(spec.username, spec.password)
  return { ...session, cleanup: async () => {
    await fetch(`${apiUrl}/api/users/${created.data.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  } }
}

const adminSession = await login()
const session = await accountFor(runRole, adminSession.token)

const ROUTES = [
  ['Dashboard', '/'],
  ['Students', '/r/members'],
  ['Students (cards)', '/r/members?view=cards'],
  ['Student detail', '/r/members/1'],
  ['Executive committee', '/r/cabinet'],
  ['Executive (cards)', '/r/cabinet?view=cards'],
  ['Meetings', '/r/meetings'],
  ['Meetings (calendar)', '/r/meetings?view=calendar'],
  ['Meetings (cards)', '/r/meetings?view=cards'],
  ['Meeting detail', '/r/meetings/1'],
  ['Activities', '/r/activities'],
  ['Activities (calendar)', '/r/activities?view=calendar'],
  ['Courses', '/r/courses'],
  ['Course detail', '/r/courses/1'],
  ['Course register', '/r/enrollments'],
  ['Course register (board)', '/r/enrollments?view=board'],
  ['Club dues', '/r/dues'],
  ['Club dues (board)', '/r/dues?view=board'],
  ['Dues detail', '/r/dues/1'],
  ['Students with a class filter', '/r/members?class_level=S1'],
  ['Attendance page', '/attendance'],
  ['Attendance register', '/attendance?ref_type=meeting&ref_id=1'],
  ['Attendance records', '/r/attendance'],
  ['Reports studio', '/reports'],
  ['Report records', '/r/reports'],
  ['Report records (board)', '/r/reports?view=board'],
  ['Certificates', '/r/certificates'],
  ['Certificates (cards)', '/r/certificates?view=cards'],
  ['Certificate detail', '/r/certificates/1'],
  ['Notes', '/r/notes'],
  ['Notes (table)', '/r/notes?view=table'],
  ['Projects', '/r/projects'],
  ['Project detail', '/r/projects/1'],
  ['Project team', '/r/project_members'],
  ['Project tasks', '/r/project_tasks'],
  ['Project tasks (table)', '/r/project_tasks?view=table'],
  ['User accounts', '/r/users'],
  ['Settings', '/settings'],
  ['Verify page (public)', '/verify']
]

const ADMIN_ONLY = ['User accounts']
const routes = runRole === 'member' ? ROUTES.filter(([label]) => !ADMIN_ONLY.includes(label)) : ROUTES

const STAINS = [/\bundefined\b/, /\bNaN\b/, /Invalid Date/, /\[object Object\]/]
const FAILURES = []
let checked = 0

for (const [label, route] of routes) {
  checked += 1
  let window
  try {
    window = await open(route, session)
    if (runRole === 'member' && /\/r\/users/.test(route)) {
      /* A student must not be able to open the user accounts screen. */
      const body = text(window)
      if (/New user account/i.test(body)) throw new Error('a student can reach the user accounts screen')
      window.close()
      continue
    }
    await waitFor(window, (w) => {
      const app = w.document.getElementById('app')
      return app && app.textContent.trim().length > 0 && !/Starting ICT Club/.test(app.textContent)
    }, { label: `${label} to paint` })

    const body = text(window)
    const html = window.document.getElementById('app').innerHTML
    const problems = []

    if (html.length < 200) problems.push(`rendered almost nothing (${html.length} chars)`)
    if (/Something went wrong|Unexpected error|Cannot read propert|is not a function|undefined is not an object/i.test(body)) {
      problems.push('error text in the page')
    }
    STAINS.forEach((re) => {
      if (re.test(body)) problems.push(`shows a stale value (${re.source})`)
    })
    if (window.__errors.length) problems.push('page error: ' + window.__errors[0].slice(0, 160))
    if (/Could not load|Cannot reach the club system server/.test(body)) problems.push('the screen could not load its data')

    if (problems.length) FAILURES.push([label, route, problems.join(' | ')])
    if (process.env.VERBOSE) console.log(`  ${problems.length ? '✗' : '✓'} ${label}`)
  } catch (error) {
    FAILURES.push([label, route, error.message])
  } finally {
    if (window) window.close()
  }
}

if (session.cleanup) await session.cleanup()
await fetch(`${apiUrl}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${session.token}` } }).catch(() => {})

console.log(`\n  ${checked - FAILURES.length}/${checked} screens rendered successfully (${runRole} view).`)
if (FAILURES.length) {
  FAILURES.forEach(([label, route, detail]) => console.log(`    • ${label} (${route}): ${detail}`))
  console.log('')
  process.exit(1)
}
console.log('  All screens OK.\n')
process.exit(0)
