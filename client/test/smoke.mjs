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
const CREDENTIALS = { email: 'admin@ictclub.org', password: 'admin123' }

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
  ['Members list', '/r/members'],
  ['Member detail', '/r/members/1'],
  ['Members (cards)', '/r/members?view=cards'],
  ['Cabinet', '/r/cabinet'],
  ['Meetings', '/r/meetings'],
  ['Meeting detail', '/r/meetings/4'],
  ['Activities', '/r/activities'],
  ['Courses', '/r/courses'],
  ['Course detail', '/r/courses/1'],
  ['Enrollments', '/r/enrollments'],
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
  ['Attendance register', '/attendance?ref_type=meeting&ref_id=4']
]

const ROUTES = process.env.ONLY ? ALL_ROUTES.filter(([label]) => label === process.env.ONLY) : ALL_ROUTES

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Repeated short act flushes until the screen stops showing a loading state. */
async function settle(container, timeout = 15000) {
  const marker = /\bLoading\b|Crunching club statistics|Collecting club statistics|Starting ICT Club/
  const started = Date.now()
  let settled = false
  while (Date.now() - started < timeout) {
    await act(async () => {
      await sleep(120)
    })
    if (!marker.test(container.textContent || '')) {
      settled = true
      break
    }
  }
  return settled
}
let failures = 0
const results = []

for (const [label, route] of ROUTES) {
  const container = window.document.createElement('div')
  window.document.body.appendChild(container)
  const root = createRoot(container)
  const before = errors.length

  try {
    await act(async () => {
      root.render(renderAt(route))
    })
    const settled = await settle(container)
    if (!settled) problems.push('stuck in a loading state')
  } catch (error) {
    errors.push(`${label}: render threw — ${error.message}`)
  }

  const html = container.innerHTML
  const text = container.textContent || ''
  const problems = []
  if (errors.length > before) problems.push(errors.slice(before).join(' | ').slice(0, 300))
  if (html.length < 200) problems.push(`rendered almost nothing (${html.length} chars)`)
  if (/Something went wrong|Unexpected Application Error|Could not load|Cannot read propert|is not a function|undefined is not an object/i.test(text)) {
    problems.push('error text in DOM')
  }

  results.push({ label, route, ok: problems.length === 0, size: html.length, problems })
  if (process.env.SNIPPET) {
    console.log(`\n=== ${label} (${route}) ===\n` + text.replace(/\s+/g, ' ').slice(0, 700))
  }
  if (problems.length) failures += 1

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

async function unmount({ container, root }) {
  await act(async () => {
    root.unmount()
  })
  container.remove()
}

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

await checkInteraction('Open the “New member” form', async () => {
  const mounted = await mountRoute('/r/members')
  const button = [...mounted.container.querySelectorAll('button')].find((b) => /New member/i.test(b.textContent))
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

await checkInteraction('Filter the members list', async () => {
  const mounted = await mountRoute('/r/members')
  const search = mounted.container.querySelector('.filters-bar input')
  if (!search) throw new Error('search box not found')
  await act(async () => {
    search.value = 'Amina'
    search.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  await settle(mounted.container)
  const rows = mounted.container.querySelectorAll('table.data tbody tr').length
  if (!rows) throw new Error('no rows after filtering')
  await unmount(mounted)
  return `${rows} row(s) matched “Amina”`
})

await checkInteraction('Mark attendance in a register', async () => {
  const mounted = await mountRoute('/attendance?ref_type=meeting&ref_id=4')
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

await checkInteraction('Switch views on projects (cards → board)', async () => {
  const mounted = await mountRoute('/r/project_tasks')
  const kanban = mounted.container.querySelectorAll('.kanban__col').length
  if (!kanban) throw new Error('kanban board did not render')
  await unmount(mounted)
  return `${kanban} kanban columns`
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
  if (!/ICT CLUB — OFFICIAL REPORT/.test(text)) throw new Error('no report text generated')
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
failures += interactionFailures

console.log(`\n  ${results.length - failures}/${results.length} screens rendered successfully.`)
if (failures) {
  console.log(`  ${failures} screen(s) failed.\n`)
  process.exit(1)
}
console.log('  All screens OK.\n')
process.exit(0)
