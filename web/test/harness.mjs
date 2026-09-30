/**
 * Test harness for the vanilla app.
 *
 * The suites previously rendered React components in jsdom; now that the app is
 * plain HTML/CSS/JS, these helpers load the REAL pages from the API server in
 * jsdom, run the real scripts, and drive the real DOM — the closest thing to a
 * browser that runs in Node. Fetch inside jsdom is served by Node's fetch, so
 * every request goes to the live API.
 */
import { JSDOM } from 'jsdom'

const API = process.env.API_URL || 'http://127.0.0.1:4100'

/* Silence the noise jsdom prints for CSS parsing and unknown features. */
const realConsoleError = console.error
console.error = (...args) => {
  const text = args.map((a) => (a instanceof Error ? a.message : String(a))).join(' ')
  if (/Could not parse CSS|Not implemented: (window\.scrollTo|navigation)/i.test(text)) return
  realConsoleError(...args)
}

/** Loads a route in jsdom with the app's own scripts, primed with a session. */
export async function open(path, options = {}) {
  const { token, user, install, blockStorage } = options
  const dom = await JSDOM.fromURL(`${API}${path}`, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole: undefined,
    beforeParse(window) {
      /* Everything the page logs or throws is collected, so a suite can fail on
         a real JavaScript error instead of a blank screen. */
      window.__errors = []
      window.addEventListener('error', (event) => window.__errors.push(String(event.message || event.error)))
      window.addEventListener('unhandledrejection', (event) => window.__errors.push('unhandled: ' + String(event.reason && event.reason.message)))
      const originalConsoleError = window.console.error
      window.console.error = (...args) => {
        window.__errors.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '))
        originalConsoleError.apply(window.console, args)
      }
      /* The app talks to the API over fetch; jsdom has none, so point it at
         Node's. Relative URLs become absolute against the API server. */
      window.fetch = (input, init) => {
        const url = typeof input === 'string' && input.startsWith('/') ? `${API}${input}` : input
        return fetch(url, init)
      }
      /* Some browsers refuse storage inside an embedded preview (a sandboxed
         iframe, private mode, cookies blocked). The app must still work, so
         this can be switched on to prove it. */
      if (blockStorage) {
        Object.defineProperty(window, 'localStorage', {
          configurable: true,
          get() { throw new Error('localStorage is blocked in this browser') }
        })
      } else {
        if (token) {
          window.localStorage.setItem('ict-club-token', token)
          window.localStorage.setItem('ict-club-user', JSON.stringify(user || {}))
        }
        /* The installation id a previous installation left in this browser — used
           to check that a replaced system signs out quietly. */
        if (install) window.localStorage.setItem('ict-club-install', install)
      }
      window.scrollTo = () => {}
      window.print = () => {}
      window.open = () => null
    }
  })
  await ready(dom.window)
  return dom.window
}

/** Waits until the app has painted (the boot splash is gone / a screen exists). */
export async function ready(window, timeout = 15000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    const app = window.document.getElementById('app')
    const text = (app && app.textContent) || ''
    if (app && !/Starting ICT Club/.test(text) && text.trim().length > 0) return window
    await sleep(80)
  }
  throw new Error('the app did not finish loading: ' + window.document.body.textContent.slice(0, 200))
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Waits for a condition in the page (predicate gets the window). */
export async function waitFor(window, predicate, options = {}) {
  const { timeout = 10000, label = 'condition' } = options
  const started = Date.now()
  while (Date.now() - started < timeout) {
    /* The predicate may be async (e.g. it re-reads the API), so await it —
       otherwise a promise would count as “found” straight away. */
    const found = await predicate(window)
    if (found) return found
    await sleep(100)
  }
  throw new Error(`timed out waiting for ${label}. Screen said: “${window.document.body.textContent.replace(/\s+/g, ' ').slice(0, 240)}”`)
}

export const text = (window) => window.document.body.textContent || ''

/** Signs in through the API and returns { token, user }. */
export async function login(username = process.env.ADMIN_USERNAME || 'Sharp', password = process.env.ADMIN_PASSWORD || 'SunnyDay@2026') {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: username, password })
  })
  const body = await res.json()
  if (!body.token) throw new Error(`could not sign in for the test: ${JSON.stringify(body)}`)
  return { token: body.token, user: body.user }
}

export const apiUrl = API

export async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, options)
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

/** Types into an input the way a user does (input + change events). */
export function type(window, node, value) {
  node.focus()
  node.value = value
  node.dispatchEvent(new window.Event('input', { bubbles: true }))
  node.dispatchEvent(new window.Event('change', { bubbles: true }))
  return node
}

export function click(window, node) {
  node.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
  return node
}

export function byText(window, selector, pattern) {
  return [...window.document.querySelectorAll(selector)].find((node) => pattern.test(node.textContent || ''))
}

export function close(window) {
  window.close()
}
