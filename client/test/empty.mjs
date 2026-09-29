/**
 * Empty-system test — the screens a school sees on the day it installs the
 * club system, before any student, meeting or payment has been entered.
 *
 * A brand-new installation holds nothing but the administrator account, so
 * every screen has to cope with empty lists: no crashes, no "NaN", no
 * "Invalid Date", no "[object Object]", and a helpful message where records
 * would be. The suite runs against its own database (server/data/empty.db)
 * with its own API, started by scripts/run-tests.mjs.
 *
 * Run with:  npm run test:empty      (or `npm test`, which includes it)
 */
import { JSDOM } from 'jsdom'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const API = process.env.API_URL || 'http://127.0.0.1:4120'
const ADMIN = {
  username: process.env.ADMIN_USERNAME || 'Sharp',
  password: process.env.ADMIN_PASSWORD || 'SunnyDay@2026'
}
const __dirname = path.dirname(fileURLToPath(import.meta.url))

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: API,
  pretendToBeVisual: true
})
const { window } = dom
global.window = window
global.document = window.document
Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true })
global.HTMLElement = window.HTMLElement
global.Element = window.Element
global.Node = window.Node
global.Event = window.Event
global.MouseEvent = window.MouseEvent
global.KeyboardEvent = window.KeyboardEvent
global.localStorage = window.localStorage
global.sessionStorage = window.sessionStorage
global.getComputedStyle = window.getComputedStyle
global.requestAnimationFrame = window.requestAnimationFrame.bind(window)
global.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
global.IS_REACT_ACT_ENVIRONMENT = true

const nodeFetch = global.fetch
global.fetch = (input, init = {}) => {
  const url = typeof input === 'string' && input.startsWith('/') ? `${API}${input}` : input
  if (process.env.DEBUG_FETCH) console.log('  [fetch]', url)
  return nodeFetch(url, init).then(
    (res) => {
      if (process.env.DEBUG_FETCH && !res.ok) console.log('  [fetch]', res.status, url)
      return res
    },
    (err) => {
      console.log('  [fetch failed]', url, err?.message)
      throw err
    }
  )
}
window.fetch = global.fetch

const consoleErrors = []
const originalConsoleError = console.error
console.error = (...args) => {
  const text = args.map((a) => (a instanceof Error ? a.stack : String(a))).join(' ')
  if (/not wrapped in act|Warning:|React does not recognize|non-boolean attribute/i.test(text)) return
  consoleErrors.push(text)
  originalConsoleError('  [console.error]', text.slice(0, 300))
}

/* ------------------------------------------------------------------ */
/* The database really is empty                                        */
/* ------------------------------------------------------------------ */

const health = await fetch('/api/health').then((r) => r.json())
if (!health.ok) {
  console.error(`\n  The empty-system API is not answering at ${API}.\n`)
  process.exit(1)
}

const loginRes = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: ADMIN.username, password: ADMIN.password })
})
const login = await loginRes.json()
if (!login.token) {
  console.error('  Could not sign in on the empty system:', login)
  process.exit(1)
}
window.localStorage.setItem('ict-club-token', login.token)
window.localStorage.setItem('ict-club-user', JSON.stringify(login.user))

const counts = {}
for (const [label, path] of [
  ['students', '/api/members'],
  ['executive', '/api/cabinet'],
  ['meetings', '/api/meetings'],
  ['activities', '/api/activities'],
  ['courses', '/api/courses'],
  ['dues', '/api/dues'],
  ['certificates', '/api/certificates'],
  ['notes', '/api/notes'],
  ['projects', '/api/projects'],
  ['attendance', '/api/attendance']
]) {
  const res = await fetch(path, { headers: { Authorization: `Bearer ${login.token}` } })
  const body = await res.json()
  counts[label] = body.total
}

/* ------------------------------------------------------------------ */
/* Render the screens                                                  */
/* ------------------------------------------------------------------ */

const { createRoot } = await import('react-dom/client')
const { renderAt } = await import('./dist/ssr-entry.js')
const { act } = await import('react')

const ROUTES = [
  ['Dashboard', '/'],
  ['Students', '/r/members'],
  ['Students (cards)', '/r/members?view=cards'],
  ['Executive committee', '/r/cabinet'],
  ['Meetings', '/r/meetings'],
  ['Meetings (calendar)', '/r/meetings?view=calendar'],
  ['Activities', '/r/activities'],
  ['Courses', '/r/courses'],
  ['Course registrations', '/r/enrollments'],
  ['Club dues', '/r/dues'],
  ['Club dues (board)', '/r/dues?view=board'],
  ['Attendance page', '/attendance'],
  ['Reports studio', '/reports'],
  ['Saved reports', '/r/reports'],
  ['Certificates', '/r/certificates'],
  ['Notes', '/r/notes'],
  ['Projects', '/r/projects'],
  ['Projects (table)', '/r/projects?view=table'],
  ['Project team', '/r/project_members'],
  ['Project tasks', '/r/project_tasks'],
  ['Attendance records', '/r/attendance'],
  ['User accounts', '/r/users'],
  ['Settings', '/settings'],
  ['Verify a certificate', '/verify']
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function settle(container, timeout = 8000) {
  const marker = /\bLoading\b|Crunching club statistics|Collecting club statistics|Starting ICT Club/
  const started = Date.now()
  let clear = 0
  while (Date.now() - started < timeout) {
    await act(async () => {
      await sleep(120)
    })
    if (!marker.test(container.textContent || '')) {
      clear += 1
      if (clear >= 2) return true
    } else {
      clear = 0
    }
  }
  return false
}

let failures = 0
const results = []

/* Screens that must tell the user, in words, that there is nothing yet. */
const EXPLAINS_EMPTY = [
  'Students',
  'Executive committee',
  'Meetings',
  'Activities',
  'Courses',
  'Club dues',
  'Certificates',
  'Notes',
  'Projects'
]

for (const [label, route] of ROUTES) {
  const container = window.document.createElement('div')
  window.document.body.appendChild(container)
  const root = createRoot(container)
  const before = consoleErrors.length
  const problems = []

  try {
    await act(async () => {
      root.render(renderAt(route))
    })
    if (!(await settle(container))) problems.push('stuck in a loading state')
  } catch (error) {
    problems.push(`render threw — ${error.message}`)
  }

  const text = container.textContent || ''
  if (consoleErrors.length > before) problems.push(consoleErrors.slice(before).join(' | ').slice(0, 240))
  if (container.innerHTML.length < 200) problems.push(`rendered almost nothing (${container.innerHTML.length} chars)`)
  const errorText = text.match(/Something went wrong|Unexpected Application Error|Could not load|Cannot read propert|is not a function|undefined is not an object/i)
  if (errorText) {
    const at = text.indexOf(errorText[0])
    problems.push(`error text in DOM: “…${text.slice(Math.max(0, at - 80), at + 120).replace(/\s+/g, ' ')}…”`)
  }
  /* The empty database is where divide-by-zero and missing-value bugs surface. */
  const stale = [/\bNaN\b/, /Invalid Date/, /\[object Object\]/, /\bundefined\b/].filter((re) => re.test(text))
  if (stale.length) problems.push(`stale value in UI: ${stale.map((r) => r.source).join(', ')}`)
  if (EXPLAINS_EMPTY.includes(label)) {
    const explains = /nothing|no .*(yet|records|found)|will appear here|empty/i.test(text)
    if (!explains) problems.push('did not explain that there is nothing yet')
  }

  results.push({ label, problems })
  if (problems.length) {
    failures += 1
    console.log(`  ✗ ${label.padEnd(24)} ${problems.join(' | ').slice(0, 200)}`)
    console.log(`      shown: ${text.replace(/\s+/g, ' ').slice(0, 300)}`)
  } else if (process.env.VERBOSE) {
    console.log(`  ✓ ${label}`)
  }

  await act(async () => {
    root.unmount()
  })
  container.remove()
}

/* ------------------------------------------------------------------ */

const total = results.length
const passed = total - failures
console.log(`\n  ${passed}/${total} screens handled the empty system correctly.`)

const nonEmpty = Object.entries(counts).filter(([, value]) => value !== 0)
if (nonEmpty.length) {
  console.log(`  ✗ the database was not empty: ${nonEmpty.map(([k, v]) => `${k}=${v}`).join(', ')}`)
  process.exit(1)
}
console.log(`  The system holds ${counts.students} students, ${counts.meetings} meetings and ${counts.dues} dues records — as installed.`)

if (failures) {
  console.log(`  ${failures} screen(s) misbehaved on an empty system.\n`)
  process.exit(1)
}
console.log('  Every screen is ready for the school to start entering real records.\n')
process.exit(0)
