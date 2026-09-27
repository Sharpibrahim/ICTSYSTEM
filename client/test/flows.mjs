/**
 * Write-flow test.
 *
 * Where smoke.mjs proves every screen renders, this suite proves that the
 * actions on those screens really work: it drives the real forms in jsdom,
 * saves through the real API, and then re-reads the API to confirm the data
 * actually changed. Anything that renders but does nothing fails here.
 *
 * Run with:  npm run test:flows      (from the client folder, API must be up)
 */
import { JSDOM } from 'jsdom'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const API = process.env.API_URL || 'http://127.0.0.1:4000'
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

/* React logs act() advice for updates that arrive between our flushes; ignore it. */
const originalConsoleError = console.error
console.error = (...args) => {
  const text = args.map((a) => (a instanceof Error ? a.stack : String(a))).join(' ')
  if (/not wrapped in act|Warning:|React does not recognize|non-boolean attribute/i.test(text)) return
  originalConsoleError(...args)
}

let TOKEN = ''
const nodeFetch = global.fetch
/* The app sends its own Authorization header (from localStorage), so this shim
   only rewrites relative URLs — it must never touch the headers, otherwise it
   would mask exactly the session handling this suite tests. */
global.fetch = (input, init = {}) => {
  const url = typeof input === 'string' && input.startsWith('/') ? `${API}${input}` : input
  return nodeFetch(url, init)
}
window.fetch = global.fetch
window.print = () => {}
window.open = () => {}

/* ------------------------------------------------------------------ */
/* Tiny API helper (direct calls, no React involved)                   */
/* ------------------------------------------------------------------ */

async function api(path, options = {}) {
  const res = await nodeFetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`, ...(options.headers || {}) }
  })
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { status: res.status, body }
}
const number = (v) => Number(v || 0)
const list = async (resource, query = '') => (await api(`/api/${resource}?pageSize=200${query}`)).body

/* ------------------------------------------------------------------ */
/* Sign in + boot React                                                */
/* ------------------------------------------------------------------ */

const loginRes = await nodeFetch(`${API}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: process.env.ADMIN_USERNAME || 'Sharp',
    password: process.env.ADMIN_PASSWORD || 'SunnyDay@2026'
  })
})
const login = await loginRes.json()
if (!login.token) {
  console.error('Could not sign in for the flow test:', login)
  process.exit(1)
}
TOKEN = login.token
window.localStorage.setItem('ict-club-token', login.token)
window.localStorage.setItem('ict-club-user', JSON.stringify(login.user))

const { createRoot } = await import('react-dom/client')
const { renderAt } = await import('./dist/ssr-entry.js')
const { act } = await import('react')

/* ------------------------------------------------------------------ */
/* DOM helpers                                                         */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const flush = async (ms = 80) => {
  await act(async () => {
    await sleep(ms)
  })
}

function setValue(el, value) {
  const proto =
    el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : el.tagName === 'SELECT'
        ? window.HTMLSelectElement.prototype
        : window.HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
  el.dispatchEvent(new window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
}

const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))

async function settle(container, timeout = 8000) {
  const marker = /\bLoading\b|Crunching club statistics|Collecting club statistics|Starting ICT Club/
  const started = Date.now()
  let clear = 0
  while (Date.now() - started < timeout) {
    await flush(120)
    if (!marker.test(container.textContent || '')) {
      clear += 1
      if (clear >= 2) return true
    } else {
      clear = 0
    }
  }
  return false
}

async function waitFor(predicate, { timeout = 10000, label = 'condition' } = {}) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    const value = await predicate()
    if (value) return value
    await flush(150)
  }
  throw new Error(`timed out waiting for ${label}`)
}

async function mount(route) {
  const container = window.document.createElement('div')
  window.document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(renderAt(route))
  })
  await settle(container)
  return {
    container,
    text: () => container.textContent || '',
    async unmount() {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    }
  }
}

const modal = () => window.document.querySelector('.modal')
const modalText = () => modal()?.textContent || ''
const btnIn = (scope, pattern) => [...scope.querySelectorAll('button')].find((b) => pattern.test(b.textContent.trim()))

/** Fills a form field by its schema key (RecordForm renders id="f-<key>"). */
async function fill(scope, key, value) {
  const el = scope.querySelector(`#f-${key}`)
  if (!el) throw new Error(`form field #f-${key} not found`)
  await act(async () => {
    setValue(el, value)
  })
  return el
}

/** Submits the dialog's form (Save button lives inside the form). */
async function saveDialog(pattern = /^(Save|Record payment)$/i) {
  const scope = modal()
  if (!scope) throw new Error('no dialog open')
  const button = [...scope.querySelectorAll('button')].find((b) => pattern.test(b.textContent.trim()))
  if (!button) throw new Error(`no ${pattern} button in dialog`)
  await act(async () => {
    const form = button.closest('form')
    if (form?.requestSubmit) form.requestSubmit()
    else click(button)
  })
  await flush(400)
}

/** Types into a chip/tags field (RecordForm renders one for `tags` fields). */
async function fillTags(scope, labelText, value) {
  const label = [...scope.querySelectorAll('.field__label')].find((l) => l.textContent.trim().startsWith(labelText))
  const input = label?.closest('.field')?.querySelector('.chip-input input')
  if (!input) throw new Error(`tags field “${labelText}” not found`)
  await act(async () => {
    setValue(input, value)
    input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
  })
  return input
}

/** Clicks a button by its visible label, waiting for it to exist first. */
async function clickButton(pattern, scope = window.document, { timeout = 10000 } = {}) {
  const button = await waitFor(() => [...scope.querySelectorAll('button')].find((b) => pattern.test(b.textContent.trim())), {
    timeout,
    label: `button ${pattern}`
  })
  await act(async () => {
    click(button)
  })
  await flush(250)
  return button
}

/* ------------------------------------------------------------------ */
/* Reporting                                                           */
/* ------------------------------------------------------------------ */

const results = []
async function flow(label, fn) {
  const started = Date.now()
  try {
    const detail = (await fn()) || ''
    results.push({ label, ok: true, detail, ms: Date.now() - started })
    console.log(`  ✓ ${label} — ${detail}`)
  } catch (error) {
    results.push({ label, ok: false, detail: error.message, ms: Date.now() - started })
    console.log(`  ✗ ${label} — ${error.message}`)
    if (process.env.DEBUG) console.log(error.stack)
  }
}

console.log(`\n  Write-flow test against ${API}\n  ${'-'.repeat(80)}`)

/* ------------------------------------------------------------------ */
/* 1. Students: create → edit → delete                                 */
/* ------------------------------------------------------------------ */

let createdStudentId = null

await flow('Create a student through the “New student” form', async () => {
  const page = await mount('/r/members')
  try {
    await clickButton(/New student/i, page.container)
    const dialog = await waitFor(() => modal(), { label: 'create dialog' })
    await fill(dialog, 'full_name', 'Flow Test Student')
    await fill(dialog, 'admission_number', 'FLOW/TEST/001')
    await fill(dialog, 'class_level', 'S3')
    await fill(dialog, 'stream', 'A')
    await fill(dialog, 'house', 'Kenya')
    await fill(dialog, 'role', 'Student Member')
    await fill(dialog, 'status', 'Active')
    await fill(dialog, 'guardian_name', 'Flow Test Guardian')
    await fill(dialog, 'guardian_phone', '+256 700 123456')
    await saveDialog()

    const found = await waitFor(
      async () => {
        const rows = await list('members', '&q=Flow Test Student')
        return rows.total ? rows : null
      },
      { label: 'student to appear in the API' }
    )
    createdStudentId = found.data[0].id
    if (found.data[0].full_name !== 'Flow Test Student') throw new Error('wrong record found')
    return `saved as student #${createdStudentId} and read back from the API`
  } finally {
    await page.unmount()
  }
})

await flow('Edit a student from the record page', async () => {
  if (!createdStudentId) throw new Error('no student to edit (create step failed)')
  const page = await mount(`/r/members/${createdStudentId}`)
  try {
    await clickButton(/^Edit$/i, page.container)
    const dialog = await waitFor(() => modal(), { label: 'edit dialog' })
    await fill(dialog, 'phone', '+256 777 999888')
    await fill(dialog, 'address', 'Flow test village, Kampala')
    await fillTags(dialog, 'Interests', 'Robotics, Web design')
    await saveDialog()
    const after = await waitFor(
      async () => {
        const res = await api(`/api/members/${createdStudentId}`)
        return res.body?.data?.phone === '+256 777 999888' ? res.body.data : null
      },
      { label: 'the edit to persist' }
    )
    if (!String(after.interests || '').includes('Robotics')) throw new Error('chip field did not save')
    return `phone, address and chip tags saved (${after.interests})`
  } finally {
    await page.unmount()
  }
})

await flow('Delete a student from the list row action', async () => {
  if (!createdStudentId) throw new Error('no student to delete (create step failed)')
  const page = await mount(`/r/members?q=Flow+Test+Student`)
  try {
    /* Wait for the row that actually belongs to the student this flow created —
       never the first row on screen, which may predate the filtered fetch. */
    const row = await waitFor(
      () =>
        [...page.container.querySelectorAll('table.data tbody tr')].find((tr) =>
          tr.textContent.includes('Flow Test Student')
        ),
      { label: 'the row for the student created above' }
    )
    const del = row.querySelector('button[title="Delete"]')
    if (!del) throw new Error('delete action missing on the row')
    await act(async () => {
      click(del)
    })
    const confirm = await waitFor(
      () => {
        const dialog = window.document.querySelector('.modal')
        if (!dialog || !/Flow Test Student/.test(dialog.textContent || '')) return null
        return [...dialog.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Delete')
      },
      { label: 'the delete confirmation naming the student' }
    )
    await act(async () => {
      click(confirm)
    })
    await flush(500)
    const gone = await waitFor(
      async () => {
        const res = await api(`/api/members/${createdStudentId}`)
        return res.status === 404 ? true : null
      },
      { label: 'the student to be removed' }
    )
    if (!gone) throw new Error('student still exists')
    createdStudentId = null
    return 'row action deleted the record and the API confirmed it'
  } finally {
    await page.unmount()
  }
})

/* ------------------------------------------------------------------ */
/* 2. Club dues: record a real payment                                 */
/* ------------------------------------------------------------------ */

await flow('Record a dues payment from the dues register', async () => {
  const summaryBefore = (await api('/api/dues/summary')).body.totals
  const page = await mount('/r/dues?status=Unpaid')
  try {
    const row = await waitFor(() => page.container.querySelector('table.data tbody tr'), { label: 'an unpaid row' })
    // Identify the exact record this row stands for (the table may be sorted differently).
    const admission = (row.textContent.match(/\d{4}\/[A-Za-z0-9]+\/\d{3}/) || [])[0]
    if (!admission) throw new Error('could not read the admission number from the row')
    const member = (await list('members', `&q=${admission}`)).data[0]
    const record = (await list('dues', `&member_id=${member.id}&status=Unpaid`)).data[0]
    if (!record) throw new Error(`no unpaid dues record for ${admission}`)

    const pay = row.querySelector('button[title="Record a payment"]')
    if (!pay) throw new Error('payment action missing on unpaid rows')
    await act(async () => {
      click(pay)
    })
    const dialog = await waitFor(() => modal(), { label: 'payment dialog' })
    const amount = dialog.querySelector('input[type="number"]')
    if (!amount) throw new Error('no amount field in the payment dialog')
    const balance = Number(record.amount_due) - Number(record.amount_paid)
    if (Number(amount.value) !== balance) {
      throw new Error(`dialog pre-filled ${amount.value} but the balance is ${balance}`)
    }
    await saveDialog(/^Record payment$/i)

    const updated = await waitFor(
      async () => {
        const res = await api(`/api/dues/${record.id}`)
        const rowData = res.body?.data
        return rowData && rowData.status === 'Paid' ? rowData : null
      },
      { label: 'the payment to be recorded' }
    )
    if (Number(updated.amount_paid) < Number(updated.amount_due)) throw new Error('amount_paid did not reach the amount due')
    if (!updated.receipt_no) throw new Error('no receipt number issued')
    const summaryAfter = (await api('/api/dues/summary')).body.totals
    if (number(summaryAfter.collected) !== number(summaryBefore.collected) + balance) {
      throw new Error(`collection total did not rise by ${balance}`)
    }
    return `${updated.member_id_label} (${admission}) cleared ${balance} → ${updated.status}, receipt ${updated.receipt_no}`
  } finally {
    await page.unmount()
  }
})

/* ------------------------------------------------------------------ */
/* 3. Attendance: mark and save a register                             */
/* ------------------------------------------------------------------ */

await flow('Save an attendance register', async () => {
  const before = await list('attendance', '&ref_type=meeting&ref_id=4')
  const page = await mount('/attendance?ref_type=meeting&ref_id=4')
  try {
    await clickButton(/Mark all present/i, page.container)
    await clickButton(/Save register/i, page.container)
    const after = await waitFor(
      async () => {
        const rows = await list('attendance', '&ref_type=meeting&ref_id=4')
        return rows.total >= before.total ? rows : null
      },
      { label: 'the register to save' }
    )
    const present = after.data.filter((r) => r.status === 'Present').length
    if (!present) throw new Error('no students were marked present')
    return `${present} present mark(s) saved for meeting #4 (${after.total} rows)`
  } finally {
    await page.unmount()
  }
})

/* ------------------------------------------------------------------ */
/* 4. Courses: enrol a completer, then issue their certificate         */
/* ------------------------------------------------------------------ */

await flow('Register a student for a course and issue the certificate', async () => {
  const courses = await list('courses')
  const course = courses.data.find((c) => c.certificate_enabled)
  if (!course) throw new Error('no certificate-bearing course in the demo data')

  const existing = await api(`/api/certificates?related_type=course&related_id=${course.id}&pageSize=200`)
  const issuedBefore = existing.body.total
  const students = await list('members', '&role=Student Member&status=Active')
  const student = students.data[0]
  if (!student) throw new Error('no active students in the demo data')

  let enrollmentId = null
  const enrolPage = await mount('/r/enrollments')
  try {
    await clickButton(/New registration|New enrollment/i, enrolPage.container)
    const dialog = await waitFor(() => modal(), { label: 'the registration dialog' })
    await fill(dialog, 'course_id', String(course.id))
    await fill(dialog, 'member_id', String(student.id))
    await fill(dialog, 'status', 'Completed')
    await fill(dialog, 'progress', '100')
    await saveDialog()
    enrollmentId = await waitFor(
      async () => {
        const rows = await api(`/api/enrollments?course_id=${course.id}&member_id=${student.id}&pageSize=5`)
        const row = rows.body?.data?.find((r) => r.status === 'Completed')
        return row ? row.id : null
      },
      { label: 'the registration to be saved' }
    )
  } finally {
    await enrolPage.unmount()
  }

  const coursePage = await mount('/r/courses')
  let issued = 0
  try {
    const row = await waitFor(
      () =>
        [...coursePage.container.querySelectorAll('table.data tbody tr')].find((tr) =>
          tr.textContent.includes(course.title.slice(0, 18))
        ),
      { label: 'the course row' }
    )
    const award = row.querySelector('button[title="Issue certificates to completers"]')
    if (!award) throw new Error('certificate action missing on the course row')
    await act(async () => {
      click(award)
    })
    await waitFor(() => window.document.querySelector('.toasts .toast'), { label: 'a result toast' })
    const after = await api(`/api/certificates?related_type=course&related_id=${course.id}&pageSize=200`)
    issued = after.body.total - issuedBefore
    if (issued < 1) throw new Error(`the button reported a result but no certificate was created (${after.body.total} before ${issuedBefore})`)
    const fresh = after.body.data.find((c) => Number(c.recipient_id) === Number(student.id))
    if (!fresh) throw new Error('the issued certificate is not linked to the student who completed the course')
    // Clean up so the flow can run again on the same database.
    await api(`/api/certificates/${fresh.id}`, { method: 'DELETE' })
  } finally {
    await coursePage.unmount()
  }
  if (enrollmentId) await api(`/api/enrollments/${enrollmentId}`, { method: 'DELETE' })
  return `${student.full_name} registered as Completed → ${issued} certificate issued and cleaned up`
})

/* ------------------------------------------------------------------ */
/* 5. Reports Studio: save the generated draft as a record             */
/* ------------------------------------------------------------------ */

await flow('Save a generated report as a record', async () => {
  const before = await api('/api/reports?pageSize=1')
  const page = await mount('/reports')
  try {
    await clickButton(/Generate report/i, page.container)
    await waitFor(() => modal(), { label: 'the report dialog' })
    const save = await waitFor(
      () => [...window.document.querySelectorAll('.modal button')].find((b) => /Save as report record/i.test(b.textContent)),
      { label: 'the save button' }
    )
    await act(async () => {
      click(save)
    })
    const after = await waitFor(
      async () => {
        const res = await api('/api/reports?pageSize=1')
        return res.body.total > before.body.total ? res.body : null
      },
      { timeout: 15000, label: 'the report record to be created' }
    )
    const newest = (await api('/api/reports?sort=-id&pageSize=1')).body.data[0]
    if (!newest.content || newest.content.length < 500) throw new Error('saved report has no body text')
    const kind = (await api('/api/reports?sort=-id&pageSize=1')).body.data[0].type
    return `report #${newest.id} (${kind}) saved with ${newest.content.length} characters`
  } finally {
    await page.unmount()
  }
})

/* ------------------------------------------------------------------ */
/* 6. Notes: create and pin                                            */
/* ------------------------------------------------------------------ */

let createdNoteId = null

await flow('Create and pin a club note', async () => {
  const page = await mount('/r/notes')
  try {
    await clickButton(/New note/i, page.container)
    const dialog = await waitFor(() => modal(), { label: 'note dialog' })
    await fill(dialog, 'title', 'Flow test announcement')
    await fill(dialog, 'content', 'Robotics club meets on Friday at 4 PM in the ICT lab.')
    await fill(dialog, 'category', 'Club Announcement')
    await fill(dialog, 'visibility', 'Public')
    await saveDialog()
    const note = await waitFor(
      async () => {
        const rows = await list('notes', '&q=Flow test announcement')
        return rows.total ? rows.data[0] : null
      },
      { label: 'the note to appear' }
    )
    createdNoteId = note.id
    return `note #${note.id} created by ${note.author_id_label || 'the signed-in user'}`
  } finally {
    await page.unmount()
  }
})

/* ------------------------------------------------------------------ */
/* 7. Settings: save the club profile and read it back                 */
/* ------------------------------------------------------------------ */

await flow('Save the club profile in Settings', async () => {
  const page = await mount('/settings')
  try {
    const target = page.container.querySelector('#s-attendance_target')
    if (!target) throw new Error('attendance target field missing on Settings')
    const original = target.value
    await act(async () => {
      setValue(target, String(Number(original || 75) + 1))
    })
    await clickButton(/Save club profile/i, page.container)
    const saved = await waitFor(
      async () => {
        const res = await api('/api/settings')
        return String(res.body.data.attendance_target) === String(Number(original || 75) + 1) ? res.body.data : null
      },
      { label: 'the setting to persist' }
    )
    // Put it back exactly as it was.
    await act(async () => {
      setValue(target, original)
    })
    await clickButton(/Save club profile/i, page.container)
    await waitFor(
      async () => {
        const res = await api('/api/settings')
        return String(res.body.data.attendance_target) === String(original) ? true : null
      },
      { label: 'the setting to be restored' }
    )
    return `attendance target saved as ${saved.attendance_target}% and restored to ${original}%`
  } finally {
    await page.unmount()
  }
})

/* ------------------------------------------------------------------ */
/* 8. Public verification page with a real certificate                 */
/* ------------------------------------------------------------------ */

await flow('Verify a real certificate on the public page', async () => {
  const certs = await list('certificates')
  const cert = certs.data.find((c) => c.verification_code && c.status === 'Issued') || certs.data[0]
  if (!cert) throw new Error('no certificates in the demo data')
  const page = await mount('/verify')
  try {
    const input = await waitFor(() => page.container.querySelector('#code'), { label: 'the verification input' })
    await act(async () => {
      setValue(input, cert.verification_code)
    })
    await clickButton(/^Verify$/i, page.container)
    const text = await waitFor(
      () => (/authentic/i.test(page.text()) ? page.text() : null),
      { timeout: 10000, label: 'a verification result' }
    )
    const recipient = cert.recipient_id_label || ''
    if (recipient && !text.includes(recipient.split(' ')[0])) {
      throw new Error(`result does not name the recipient (${recipient})`)
    }
    return `${cert.verification_code} verified for ${recipient}`
  } finally {
    await page.unmount()
  }
})

/* ------------------------------------------------------------------ */
/* Clean up the records created by this run                            */
/* ------------------------------------------------------------------ */



if (createdNoteId) await api(`/api/notes/${createdNoteId}`, { method: 'DELETE' })

/* ------------------------------------------------------------------ */
/* 14. Settings: reload the demo school data (wipes and re-seeds)      */
/* ------------------------------------------------------------------ */

await flow('Reload the demo school data from Settings', async () => {
  const page = await mount('/settings')
  try {
    const demoButton = await waitFor(
      () => [...page.container.querySelectorAll('button')].find((b) => /Load demo school data/i.test(b.textContent)),
      { label: 'the demo-data button' }
    )
    await act(async () => {
      click(demoButton)
    })
    await flush(300)
    const confirm = await waitFor(
      () => [...window.document.querySelectorAll('.modal button')].find((b) => /Load demo data/i.test(b.textContent)),
      { label: 'the confirmation dialog' }
    )
    await act(async () => {
      click(confirm)
    })
    // The user must stay signed in: the API hands back a fresh session and the
    // app lands on the dashboard with the reloaded school.
    const landed = await waitFor(
      () => (/Good (morning|afternoon|evening)/i.test(window.document.body.textContent || '') ? true : null),
      { timeout: 25000, label: 'the dashboard after the reload' }
    ).catch(() => null)
    if (!landed) {
      throw new Error(
        `the app did not return to the dashboard. token=${Boolean(window.localStorage.getItem('ict-club-token'))} text=${(window.document.body.textContent || '').replace(/\s+/g, ' ').slice(0, 200)}`
      )
    }
    if (/Sign in to your club/i.test(window.document.body.textContent || '')) {
      throw new Error('the user was signed out by the reload')
    }
    // …and the new token must be live against the reloaded data.
    const token = window.localStorage.getItem('ict-club-token')
    if (!token) throw new Error('no session token was stored after the reload')
    const dashboard = await nodeFetch(`${API}/api/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((r) => r.json())
    if (!dashboard.cards?.members) throw new Error('the dashboard has no data after the reload')
    const visible = /Members/i.test(window.document.body.textContent || '')
    if (!visible) throw new Error('the dashboard widgets did not render')
    TOKEN = token
    return `${dashboard.cards.members} members, ${dashboard.cards.dues_records} dues records reloaded; stayed signed in`
  } finally {
    await page.unmount()
  }
})

/* ------------------------------------------------------------------ */
/* 15. An expired session must fall back to the sign-in screen         */
/* ------------------------------------------------------------------ */

await flow('An expired session returns to the sign-in screen', async () => {
  /* Exactly the situation after a database reset: the browser still holds a
     token that the API no longer accepts. The dashboard must not sit on an
     error card — the app has to sign the user out and explain why. */
  const liveToken = TOKEN
  TOKEN = '' // otherwise the fetch shim would paper over the rejected token
  window.localStorage.setItem('ict-club-token', 'token-from-before-the-reset')
  window.localStorage.setItem('ict-club-user', JSON.stringify({ id: 1, name: 'Mr. Ssekandi John', role: 'admin' }))
  const page = await mount('/')
  try {
    const text = await waitFor(
      () => (/Sign in to your club/i.test(page.text()) ? page.text() : null),
      { timeout: 12000, label: 'the sign-in screen' }
    ).catch(() => page.text())
    if (!/Sign in to your club/i.test(text)) {
      throw new Error(`expected the sign-in screen, saw: ${text.replace(/\s+/g, ' ').slice(0, 120)}`)
    }
    if (!/session has ended/i.test(text)) throw new Error('no explanation was shown')
    if (window.localStorage.getItem('ict-club-token')) throw new Error('the dead token was kept in storage')
    return 'stale token cleared, sign-in screen shown with an explanation'
  } finally {
    await page.unmount()
    window.localStorage.removeItem('ict-club-token')
    window.localStorage.removeItem('ict-club-user')
    TOKEN = liveToken
  }
})

/* ------------------------------------------------------------------ */
/* 16. A wrong password is reported as a password problem              */
/* ------------------------------------------------------------------ */

await flow('A wrong password is not reported as an ended session', async () => {
  window.localStorage.removeItem('ict-club-token')
  window.localStorage.removeItem('ict-club-user')
  window.sessionStorage.removeItem('ict-club-notice')
  const page = await mount('/')
  try {
    await waitFor(() => (page.container.querySelector('#email') ? true : null), { label: 'the sign-in form' })
    const email = page.container.querySelector('#email')
    const password = page.container.querySelector('#password')
    await act(async () => {
      setValue(email, process.env.ADMIN_USERNAME || 'Sharp')
      setValue(password, 'definitely-the-wrong-password')
      const button = [...page.container.querySelectorAll('button')].find((b) => /^Sign in$/i.test(b.textContent.trim()))
      const form = button?.closest('form')
      if (form?.requestSubmit) form.requestSubmit()
      else if (button) click(button)
    })
    const text = await waitFor(
      () => (/Incorrect password|Invalid email or password/i.test(page.text()) ? page.text() : null),
      { timeout: 12000, label: 'the password error' }
    ).catch(() => page.text())
    if (!/Incorrect password|Invalid email or password/i.test(text)) {
      throw new Error(`expected a password error, saw: ${text.replace(/\s+/g, ' ').slice(0, 140)}`)
    }
    if (/session has ended/i.test(text)) throw new Error('the wrong password was blamed on an ended session')
    if (window.localStorage.getItem('ict-club-token')) throw new Error('a token was stored after a failed sign-in')
    return 'showed “Incorrect password” and no session notice'
  } finally {
    await page.unmount()
  }
})

const failed = results.filter((r) => !r.ok)
console.log(`\n  ${results.length - failed.length}/${results.length} write flows worked.`)
if (failed.length) {
  console.log(`  ${failed.length} flow(s) failed:\n${failed.map((f) => `    • ${f.label}: ${f.detail}`).join('\n')}\n`)
  process.exit(1)
}
console.log('  All flows OK — every action persisted to the API.\n')
process.exit(0)
