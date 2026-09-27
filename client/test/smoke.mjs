/**
 * Headless smoke test.
 * Renders every screen of the club management system inside jsdom against a
 * running API and fails if any screen throws, logs a React error, or renders
 * an empty shell. Run with:  npm run test:smoke   (from the client folder)
 *
 * Requires the API to be running (npm run dev:api).
 */
import { JSDOM } from 'jsdom'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const API = process.env.API_URL || 'http://127.0.0.1:4000'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ACCOUNT = process.env.AS || 'admin'
const CREDENTIALS =
  ACCOUNT === 'cabinet'
    ? { email: 'executive@school.ac.ug', password: 'executive123' }
    : ACCOUNT === 'member'
      ? { email: 'member@school.ac.ug', password: 'member123' }
      : { email: 'admin@school.ac.ug', password: 'admin123' }

/* Screens only an administrator may open. */
const ADMIN_ONLY = ['User accounts']

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
// Node 22 exposes its own read-only `navigator`, so define it on the global object.
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

// Relative /api/* calls should hit the API server directly.
const nodeFetch = global.fetch
global.fetch = (input, init) => {
  const url = typeof input === 'string' && input.startsWith('/') ? `${API}${input}` : input
  if (process.env.DEBUG_FETCH) console.log('  [fetch]', url)
  return nodeFetch(url, init).then(
    (res) => {
      if (process.env.DEBUG_FETCH) console.log('  [fetch done]', res.status, url)
      return res
    },
    (err) => {
      if (process.env.DEBUG_FETCH) console.log('  [fetch failed]', url, err.message)
      throw err
    }
  )
}
window.fetch = global.fetch
window.print = () => {}

const errors = []
const originalError = console.error
console.error = (...args) => {
  const text = args.map((a) => (a instanceof Error ? a.stack : typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
  if (/Warning:|React does not recognize|non-boolean attribute|not configured to support act/i.test(text)) return
  errors.push(text)
  originalError('  [console.error]', text.slice(0, 400))
}

/* ------------------------------------------------------------------ */
/* Login, then render each screen                                      */
/* ------------------------------------------------------------------ */

const loginRes = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(CREDENTIALS)
})
const login = await loginRes.json()
if (!login.token) {
  console.error('Could not sign in for the smoke test:', login)
  process.exit(1)
}
window.localStorage.setItem('ict-club-token', login.token)
window.localStorage.setItem('ict-club-user', JSON.stringify(login.user))

const { createRoot } = await import('react-dom/client')
const { renderAt } = await import('./dist/ssr-entry.js')
const { createElement, act } = await import('react')

const ALL_ROUTES = [
  ['Dashboard', '/'],
  ['Students list', '/r/members'],
  ['Student detail', '/r/members/1'],
  ['Members (cards)', '/r/members?view=cards'],
  ['Executive committee', '/r/cabinet'],
  ['Meetings', '/r/meetings'],
  ['Meeting detail', '/r/meetings/4'],
  ['Activities', '/r/activities'],
  ['Courses', '/r/courses'],
  ['Course detail', '/r/courses/1'],
  ['Course register', '/r/enrollments'],
  ['Club dues', '/r/dues'],
  ['Dues record detail', '/r/dues/1'],
  ['Attendance page', '/attendance'],
  ['Reports studio', '/reports'],
  ['Report records', '/r/reports'],
  ['Certificates', '/r/certificates'],
  ['Certificate detail', '/r/certificates/3'],
  ['Notes', '/r/notes'],
  ['Projects', '/r/projects'],
  ['Project detail', '/r/projects/1'],
  ['Project tasks', '/r/project_tasks'],
  ['User accounts', '/r/users'],
  ['Settings', '/settings'],
  ['Verify page', '/verify'],
  ['Attendance register', '/attendance?ref_type=meeting&ref_id=4'],
  /* Every alternate view of every module (the app can render each one). */
  ['Students (table)', '/r/members?view=table'],
  ['Executive (cards)', '/r/cabinet?view=cards'],
  ['Meetings (calendar)', '/r/meetings?view=calendar'],
  ['Meetings (cards)', '/r/meetings?view=cards'],
  ['Activities (calendar)', '/r/activities?view=calendar'],
  ['Activities (cards)', '/r/activities?view=cards'],
  ['Courses (cards)', '/r/courses?view=cards'],
  ['Course register (board)', '/r/enrollments?view=board'],
  ['Club dues (board)', '/r/dues?view=board'],
  ['Reports (table)', '/r/reports?view=table'],
  ['Certificates (cards)', '/r/certificates?view=cards'],
  ['Notes (table)', '/r/notes?view=table'],
  ['Projects (table)', '/r/projects?view=table'],
  ['Project tasks (table)', '/r/project_tasks?view=table'],
  ['Project team', '/r/project_members'],
  ['Attendance records', '/r/attendance']
]

let ROUTES = process.env.ONLY ? ALL_ROUTES.filter(([label]) => label === process.env.ONLY) : ALL_ROUTES
if (ACCOUNT === 'member') ROUTES = ROUTES.filter(([label]) => !ADMIN_ONLY.includes(label))

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Repeated short act flushes until the screen stops showing a loading state.
 * Two consecutive clear polls are required because screens re-fetch (for
 * example when URL filters change) and briefly render without a spinner.
 */
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

/**
 * Waits for a condition that only becomes true once data has arrived, e.g. a
 * row action button on a filtered list. Used instead of guessing at timings.
 */
async function waitFor(container, predicate, timeout = 8000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    const found = predicate(container)
    if (found) return found
    await act(async () => {
      await sleep(120)
    })
  }
  return null
}

let screenFailures = 0
const results = []

for (const [label, route] of ROUTES) {
  const container = window.document.createElement('div')
  window.document.body.appendChild(container)
  const root = createRoot(container)
  const before = errors.length
  const problems = []
  let settled = false

  try {
    await act(async () => {
      root.render(renderAt(route))
    })
    settled = await settle(container)
    if (!settled) problems.push('stuck in a loading state')
  } catch (error) {
    errors.push(`${label}: render threw — ${error.message}`)
  }

  const html = container.innerHTML
  const text = container.textContent || ''
  if (errors.length > before) problems.push(errors.slice(before).join(' | ').slice(0, 300))
  if (html.length < 200) problems.push(`rendered almost nothing (${html.length} chars)`)
  if (/Something went wrong|Unexpected Application Error|Could not load|Cannot read propert|is not a function|undefined is not an object/i.test(text)) {
    problems.push('error text in DOM')
  }
  // Catches fields the UI reads but the API no longer sends (renamed or removed columns).
  const stale = [/\bundefined\b/, /\bNaN\b/, /Invalid Date/, /\[object Object\]/].filter((re) => re.test(text))
  if (stale.length) {
    const sample = text.replace(/\s+/g, ' ')
    problems.push(`stale value in UI: ${stale.map((r) => r.source).join(', ')} — …${sample.slice(Math.max(0, sample.search(stale[0]) - 60), sample.search(stale[0]) + 60)}…`)
  }

  results.push({ label, route, ok: problems.length === 0, size: html.length, problems })
  if (process.env.SNIPPET) {
    console.log(`\n=== ${label} (${route}) ===\n` + text.replace(/\s+/g, ' ').slice(0, 700))
  }
  if (problems.length) screenFailures += 1

  await act(async () => {
    root.unmount()
  })
  container.remove()
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Interaction checks                                                  */
/* ------------------------------------------------------------------ */

const click = (element) => element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))

async function mountRoute(route) {
  const container = window.document.createElement('div')
  window.document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(renderAt(route))
  })
  await settle(container)
  return { container, root }
}

/** Mounts a route and then waits for a specific piece of content to appear. */
async function mountRouteFor(route, selector, timeout = 8000) {
  const mounted = await mountRoute(route)
  const found = await waitFor(mounted.container, (c) => c.querySelector(selector), timeout)
  if (!found) {
    await unmount(mounted)
    throw new Error(`timed out waiting for ${selector} on ${route}`)
  }
  return mounted
}

async function unmount({ container, root }) {
  await act(async () => {
    root.unmount()
  })
  container.remove()
}

const READ_ONLY = ACCOUNT === 'member'
const interactions = []
async function checkInteraction(label, fn) {
  const before = errors.length
  let detail = ''
  try {
    detail = (await fn()) || ''
    interactions.push({ label, ok: errors.length === before, detail })
  } catch (error) {
    interactions.push({ label, ok: false, detail: error.message })
  }
}

if (ACCOUNT === 'member') {
  console.log('  (member access: write interactions are skipped by design)\n')
}

if (ACCOUNT !== 'member') {
await checkInteraction('Open the “New student” form', async () => {
  const mounted = await mountRoute('/r/members?view=table')
  const button = [...mounted.container.querySelectorAll('button')].find((b) => /New student/i.test(b.textContent))
  if (!button) throw new Error('create button not found')
  await act(async () => {
    click(button)
  })
  const fields = window.document.querySelectorAll('.modal .field').length
  if (fields < 8) throw new Error(`only ${fields} form fields rendered`)
  await act(async () => {
    click([...window.document.querySelectorAll('.modal button')].find((b) => /Cancel/i.test(b.textContent)))
  })
  await unmount(mounted)
  return `${fields} fields in the create form`
})

}

await checkInteraction('Filter the student list', async () => {
  const mounted = await mountRoute('/r/members?view=table')
  const search = mounted.container.querySelector('.filters-bar input')
  if (!search) throw new Error('search box not found')
  await act(async () => {
    search.value = 'Amina'
    search.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  await waitFor(mounted.container, (c) => c.querySelector('table.data tbody tr'))
  const rows = mounted.container.querySelectorAll('table.data tbody tr').length
  if (!rows) throw new Error('no rows after filtering')
  await unmount(mounted)
  return `${rows} row(s) matched “Amina”`
})

if (ACCOUNT !== 'member') {
await checkInteraction('Mark attendance in a register', async () => {
  const mounted = await mountRouteFor('/attendance?ref_type=meeting&ref_id=4', '.reg-btn')
  const buttons = [...mounted.container.querySelectorAll('.reg-btn')]
  if (buttons.length < 5) throw new Error('register did not render')
  const firstRow = mounted.container.querySelector('table.data tbody tr')
  const lateButton = [...firstRow.querySelectorAll('.reg-btn')].find((b) => b.textContent.trim() === 'Late')
  const before = lateButton.className
  await act(async () => {
    click(lateButton)
  })
  const after = [...firstRow.querySelectorAll('.reg-btn')].find((b) => b.textContent.trim() === 'Late').className
  if (before === after) throw new Error('clicking a status button did not change the register')
  const marked = mounted.container.querySelectorAll('table.data tbody tr').length
  await unmount(mounted)
  return `${buttons.length} status buttons across ${marked} members, first row toggled`
})

}

await checkInteraction('Switch views on projects (cards → board)', async () => {
  const mounted = await mountRouteFor('/r/project_tasks?view=board', '.kanban__col')
  const kanban = mounted.container.querySelectorAll('.kanban__col').length
  if (!kanban) throw new Error('kanban board did not render')
  await unmount(mounted)
  return `${kanban} kanban columns`
})

await checkInteraction('Toggle a list between table and card views', async () => {
  const mounted = await mountRouteFor('/r/members?view=table', 'table.data tbody tr')
  const tableRows = mounted.container.querySelectorAll('table.data tbody tr').length
  const cardsButton = [...mounted.container.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cards')
  if (!cardsButton) throw new Error('view switcher not found')
  await act(async () => {
    click(cardsButton)
  })
  const cards = await waitFor(mounted.container, (c) => (c.querySelector('table.data') ? null : c.querySelectorAll('.card').length > 3))
  const cardCount = mounted.container.querySelectorAll('.card').length
  if (!cards) throw new Error('cards view did not replace the table')
  if (!tableRows) throw new Error('table view rendered no rows')
  await unmount(mounted)
  return `${tableRows} table rows → ${cardCount} cards`
})

await checkInteraction(READ_ONLY ? 'Dues actions are hidden for a read-only member' : 'Record a dues payment', async () => {
  const mounted = await mountRoute('/r/dues?status=Unpaid&view=table')
  if (READ_ONLY) {
    await waitFor(mounted.container, (c) => c.querySelector('table.data tbody tr'))
    const rows = mounted.container.querySelectorAll('table.data tbody tr').length
    const leaks = [...mounted.container.querySelectorAll('button')].filter((b) =>
      /Record a payment|Generate term dues|New dues|Edit|Delete/i.test(`${b.title} ${b.textContent}`)
    )
    if (leaks.length) throw new Error(`${leaks.length} write control(s) leaked to a read-only member`)
    await unmount(mounted)
    return `${rows} unpaid row(s) visible, no payment controls`
  }
  const button = await waitFor(mounted.container, (c) => c.querySelector('button[title="Record a payment"]'))
  if (!button) {
    const titles = [...mounted.container.querySelectorAll('table.data tbody button')].map((b) => b.title || b.textContent).slice(0, 12)
    const statuses = [...mounted.container.querySelectorAll('table.data tbody tr')].map((tr) => tr.textContent.slice(0, 80))
    throw new Error(`payment action not found. titles=${JSON.stringify(titles)} rows=${JSON.stringify(statuses.slice(0, 2))}`)
  }
  await act(async () => {
    click(button)
  })
  const modal = window.document.querySelector('.modal')
  const text = modal?.textContent || ''
  if (!/Balance/.test(text)) throw new Error('payment dialog did not open')
  const amountInput = modal.querySelector('input[type="number"]')
  if (!amountInput || !Number(amountInput.value)) throw new Error('balance was not pre-filled')
  const closer = modal.querySelector('.modal__head button')
  await act(async () => {
    click(closer)
  })
  await unmount(mounted)
  return `dialog opened with ${amountInput.value} pre-filled`
})

await checkInteraction(READ_ONLY ? 'Dues generation stays closed to a read-only member' : 'Open the “Generate term dues” dialog', async () => {
  const mounted = await mountRoute('/r/dues?view=table')
  const button = [...mounted.container.querySelectorAll('button')].find((b) => /Generate term dues/i.test(b.textContent))
  if (READ_ONLY) {
    if (button) throw new Error('generate control leaked to a read-only member')
    await unmount(mounted)
    return 'generator unavailable, as intended'
  }
  if (!button) throw new Error('generate button not found')
  await act(async () => {
    click(button)
  })
  const modal = window.document.querySelector('.modal')
  if (!modal) throw new Error('dialog did not open')
  const fields = modal.querySelectorAll('.field').length
  const closer = modal.querySelector('.modal__head button')
  await act(async () => {
    click(closer)
  })
  await unmount(mounted)
  return `${fields} options in the dues generator`
})

await checkInteraction('Generate a report draft (Reports Studio)', async () => {
  const mounted = await mountRoute('/reports')
  const button = [...mounted.container.querySelectorAll('button')].find((b) => /Generate report/i.test(b.textContent))
  if (!button) throw new Error(`generate button not found — page text: ${(mounted.container.textContent || '').replace(/\s+/g, ' ').slice(-300)}`)
  await act(async () => {
    click(button)
  })
  const pre = window.document.querySelector('.modal pre')
  const text = pre?.textContent || ''
  if (!/OFFICIAL REPORT/.test(text)) throw new Error('no report text generated')
  if (!/CLUB DUES/.test(text)) throw new Error('report is missing the dues section')
  const closer = [...window.document.querySelectorAll('.modal button')].find((b) => /Cancel|Close/i.test(b.textContent)) ||
    window.document.querySelector('.modal__head button')
  if (closer) {
    await act(async () => {
      click(closer)
    })
  }
  await unmount(mounted)
  return `${text.length} characters of report text generated`
})

console.log('\n  Screen                              Route                          Result')
console.log('  ' + '-'.repeat(96))
for (const result of results) {
  const status = result.ok ? `PASS  (${result.size} chars)` : `FAIL  ${result.problems.join(' ; ')}`
  console.log(`  ${result.label.padEnd(34)}${result.route.padEnd(30)}${status}`)
}

console.log('\n  Interaction                                                    Result')
console.log('  ' + '-'.repeat(96))
for (const item of interactions) {
  const status = item.ok ? `PASS  ${item.detail}` : `FAIL  ${item.detail}`
  console.log(`  ${item.label.padEnd(60)}${status}`)
}
const interactionFailures = interactions.filter((i) => !i.ok).length
const failed = screenFailures + interactionFailures

console.log(`\n  ${results.length - screenFailures}/${results.length} screens rendered successfully.`)
console.log(`  ${interactions.length - interactionFailures}/${interactions.length} interactions worked.`)
if (failed) {
  if (screenFailures) console.log(`  ${screenFailures} screen(s) failed.`)
  if (interactionFailures) console.log(`  ${interactionFailures} interaction(s) failed.`)
  console.log('')
  process.exit(1)
}
console.log('  All screens and interactions OK.\n')
process.exit(0)
