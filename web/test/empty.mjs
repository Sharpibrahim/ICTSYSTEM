/**
 * Empty system — the screens a brand-new installation shows.
 *
 * A real school installs this system with nothing in it: one administrator
 * account and neutral club settings. Every screen must still open, explain
 * itself and offer the right next step — never an error page, never a blank
 * panel, never a fake student.
 *
 * Run with:  npm run test:empty     (the runner starts an empty database)
 */
import { open, login, api, waitFor, text } from './harness.mjs'

const ADMIN = { username: 'Sharp', password: 'SunnyDay@2026' }

const admin = await login(ADMIN.username, ADMIN.password)
const auth = { Authorization: `Bearer ${admin.token}` }
const results = []

/* Every screen the sidebar and the plans promise, on a database with no data. */
const SCREENS = [
  ['Dashboard', '/'],
  ['Students', '/r/members'],
  ['Executive committee', '/r/cabinet'],
  ['Meetings', '/r/meetings'],
  ['Activities', '/r/activities'],
  ['Courses & trainings', '/r/courses'],
  ['Course register', '/r/enrollments'],
  ['Attendance', '/attendance'],
  ['Attendance records', '/r/attendance'],
  ['Club dues', '/r/dues'],
  ['Reports studio', '/reports'],
  ['Reports', '/r/reports'],
  ['Certificates', '/r/certificates'],
  ['User accounts', '/r/users'],
  ['Club notes', '/r/notes'],
  ['Projects', '/r/projects'],
  ['Project tasks', '/r/project_tasks'],
  ['Settings', '/settings'],
  ['Sign in', '/login'],
  ['Certificate verification', '/verify'],
  ['Students — card view', '/r/members?view=cards'],
  ['Meetings — calendar view', '/r/meetings?view=calendar'],
  ['Project tasks — board view', '/r/project_tasks?view=board'],
  ['Reports — board view', '/r/reports?view=board']
]

/* The words a screen may not contain: a broken panel, or data that is not there. */
const STALE = [
  [/\bundefined\b/, 'the word “undefined”'],
  [/\bNaN\b/, '“NaN”'],
  [/Invalid Date/, '“Invalid Date”'],
  [/\[object Object\]/, '“[object Object]”'],
  [/Could not load/i, 'a failure message'],
  [/Failed to fetch/i, 'a browser network error'],
  [/Something went wrong/i, 'a generic error panel']
]

/* What an empty screen should say instead — it should point at the next step. */
const HELPFUL = /no |nothing|none yet|not yet|add |create |start|first|record|empty|waiting|0\b/i

async function screen(label, route) {
  let window
  try {
    window = await open(route, admin)
    await waitFor(window, (w) => w.document.querySelector('.page, .card, .auth, form'), { timeout: 15000, label: `${label} to paint` })
    const body = text(window).replace(/\s+/g, ' ')
    for (const [pattern, what] of STALE) {
      if (pattern.test(body)) throw new Error(`shows ${what}`)
    }
    const errors = (window.__errors || []).filter((message) => !/Not implemented/i.test(message))
    if (errors.length) throw new Error('JavaScript error: ' + errors[0].slice(0, 120))
    return body
  } finally {
    if (window) window.close()
  }
}

console.log('\n  A brand-new installation — no students, no meetings, no money:\n')

for (const [label, route] of SCREENS) {
  try {
    const body = await screen(label, route)
    const hasContent = body.trim().length > 60
    if (!hasContent) throw new Error('the screen is blank')
    const pointsForward = HELPFUL.test(body)
    results.push({ label, ok: true, detail: pointsForward ? 'opens with a next step' : 'opens' })
    console.log(`  ✓ ${label.padEnd(26)} ${pointsForward ? 'explains what to do first' : 'opens cleanly'}`)
  } catch (error) {
    results.push({ label, ok: false, detail: error.message })
    console.log(`  ✗ ${label.padEnd(26)} ${error.message}`)
  }
}

/* ------------------------------------------------------------------ */
/* The facts behind the screens                                        */
/* ------------------------------------------------------------------ */

async function check(label, fn) {
  try {
    const detail = (await fn()) || ''
    results.push({ label, ok: true, detail })
    console.log(`  ✓ ${label.padEnd(26)} ${detail}`)
  } catch (error) {
    results.push({ label, ok: false, detail: error.message })
    console.log(`  ✗ ${label.padEnd(26)} ${error.message}`)
  }
}

console.log('')

await check('Only one account exists', async () => {
  const res = await api('/api/users', { headers: auth })
  const users = (res.body && res.body.data) || []
  if (users.length !== 1) throw new Error(`${users.length} accounts found — a real installation starts with the administrator only`)
  if (users[0].username !== ADMIN.username) throw new Error(`the account is “${users[0].username}”, not ${ADMIN.username}`)
  return 'the administrator account, and nobody else'
})

await check('No sample students', async () => {
  const res = await api('/api/members?pageSize=1', { headers: auth })
  if (res.body.total !== 0) throw new Error(`${res.body.total} students are already on file`)
  return '0 students, ready for the real class lists'
})

await check('No meetings, activities or courses', async () => {
  const counts = {}
  for (const resource of ['meetings', 'activities', 'courses']) {
    const res = await api(`/api/${resource}?pageSize=1`, { headers: auth })
    counts[resource] = res.body.total
  }
  const wrong = Object.entries(counts).filter(([, total]) => total !== 0)
  if (wrong.length) throw new Error(`not empty: ${wrong.map(([k, v]) => `${k}=${v}`).join(', ')}`)
  return 'nothing scheduled yet'
})

await check('No dues records', async () => {
  const res = await api('/api/dues/summary', { headers: auth })
  if (res.body.totals.records !== 0) throw new Error(`${res.body.totals.records} dues records exist`)
  if (res.body.totals.collected !== 0) throw new Error(`${res.body.totals.collected} was collected from nobody`)
  return 'no money recorded, totals at zero'
})

await check('Settings are neutral, not another school’s', async () => {
  const res = await api('/api/settings', { headers: auth })
  const settings = res.body.data || {}
  if (/st\.?\s*bernard/i.test(settings.institution || '')) throw new Error('the sample school is still named in the settings')
  if (/demo|sample|example/i.test(settings.club_name || '')) throw new Error('the club is still named after the demo')
  return `club “${settings.club_name}” at “${settings.institution || 'no school set yet'}”`
})

await check('The dashboard works out of the box', async () => {
  const res = await api('/api/dashboard', { headers: auth })
  const cards = res.body && res.body.cards
  if (!cards) throw new Error(`the dashboard returned ${JSON.stringify(res.body).slice(0, 120)}`)
  const nonZero = Object.entries(cards).filter(([, value]) => Number(value) > 0)
  if (nonZero.length) throw new Error(`the dashboard already counts ${nonZero.map(([k, v]) => `${k}=${v}`).join(', ')}`)
  return 'every figure is zero, and the screen still renders'
})

await check('The sign-in screen does not advertise demo logins', async () => {
  const window = await open('/login')
  try {
    const body = text(window).replace(/\s+/g, ' ')
    if (/demo|sample account|try .*\/.*2026/i.test(body)) throw new Error('the sign-in screen still mentions demo logins')
    if (!/username|password/i.test(body)) throw new Error('the sign-in form is missing')
    return 'a plain sign-in form with no demo hints'
  } finally {
    window.close()
  }
})

await check('Adding the first student works straight away', async () => {
  const created = await api('/api/members', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name: 'First Student', admission_number: 'S001', class_level: 'S1', status: 'Active' })
  })
  if (created.status !== 201) throw new Error(`the API answered ${created.status}: ${JSON.stringify(created.body).slice(0, 120)}`)
  const id = created.body.data.id
  const window = await open('/r/members', admin)
  try {
    await waitFor(window, (w) => /First Student/.test(w.document.body.textContent), { timeout: 15000, label: 'the new student to appear in the list' })
  } finally {
    window.close()
  }
  await api(`/api/members/${id}`, { method: 'DELETE', headers: auth })
  return 'saved, shown in the list, then cleaned up'
})

/* ------------------------------------------------------------------ */

const failed = results.filter((r) => !r.ok)
console.log(`\n  ${results.length - failed.length}/${results.length} checks passed on an empty system.`)
if (failed.length) {
  failed.forEach((f) => console.log(`    • ${f.label}: ${f.detail}`))
  console.log('')
  process.exit(1)
}
console.log('  A new school can start working immediately — nothing to delete first.\n')
process.exit(0)
