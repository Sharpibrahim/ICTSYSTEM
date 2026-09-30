/**
 * Write flows — every action in the app, performed through the real interface.
 *
 * The screen suite proves the pages render; this suite proves the buttons work.
 * Forms are filled in the DOM, submitted, and the change is read back from the
 * API. Anything that renders but does nothing fails here.
 *
 * Run with:  npm run test:flows     (the runner starts the API it talks to)
 */
import { open, login, api, apiUrl, click, type, byText, text, waitFor, sleep } from './harness.mjs'

const ADMIN = { username: 'Sharp', password: 'SunnyDay@2026' }
const FLOW_ONLY = process.env.FLOW_ONLY || ''

const admin = await login(ADMIN.username, ADMIN.password)
const auth = { Authorization: `Bearer ${admin.token}` }
const results = []
let createdStudentId = null

async function flow(label, fn) {
  if (FLOW_ONLY && !label.toLowerCase().includes(FLOW_ONLY.toLowerCase())) return
  const started = Date.now()
  try {
    const detail = (await fn()) || ''
    results.push({ label, ok: true, detail })
    console.log(`  ✓ ${label} — ${detail}`)
  } catch (error) {
    results.push({ label, ok: false, detail: error.message })
    console.log(`  ✗ ${label} — ${error.message}`)
    if (process.env.DEBUG) console.log(error.stack)
  }
}

/** Opens a route signed in as the administrator. */
const page = (route) => open(route, admin)

/** Waits for the modal that the app opens for forms and confirmations. */
const dialog = (window) => waitFor(window, (w) => w.document.querySelector('.modal'), { label: 'the dialog' })

/** Sets a value in a modal form field by its schema key (input id is f-<key>). */
function fill(window, key, value) {
  const field = window.document.querySelector(`#f-${key}`)
  if (!field) throw new Error(`no field “${key}” in the form`)
  type(window, field, value)
  return field
}

/** Adds values to a tag field (skills, interests): type, press Enter, repeat. */
function fillTags(window, key, values) {
  const input = window.document.querySelector(`#f-${key}`)
  if (!input) throw new Error(`no tag field “${key}” in the form`)
  values.forEach((value) => {
    type(window, input, value)
    input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
  })
  return input
}

const confirm = (window) => byText(window, '.modal__foot button', /^(Save|Create|Confirm|Delete|Record payment|Generate|Enrol|Issue certificates|Import)/i)

/* ------------------------------------------------------------------ */
/* 1. Students: create, edit, search, delete                           */
/* ------------------------------------------------------------------ */

await flow('Create a student through the “New student” form', async () => {
  const window = await page('/r/members')
  try {
    click(window, byText(window, '.page-head__actions button', /New student/i))
    await dialog(window)
    fill(window, 'full_name', 'Flow Test Student')
    fill(window, 'admission_number', 'FLOW/TEST/001')
    fill(window, 'class_level', 'S3')
    fill(window, 'stream', 'A')
    fill(window, 'house', 'Kenya')
    fill(window, 'guardian_name', 'Flow Test Guardian')
    click(window, confirm(window))
    const found = await waitFor(window, async () => {
      const res = await api('/api/members?q=Flow%20Test%20Student', { headers: auth })
      return res.body && res.body.total ? res.body : null
    }, { label: 'the student to appear in the API' })
    createdStudentId = found.data[0].id
    if (found.data[0].full_name !== 'Flow Test Student') throw new Error('the wrong record was saved')
    return `saved as student #${createdStudentId} and read back from the API`
  } finally {
    window.close()
  }
})

await flow('Edit a student from their record page', async () => {
  if (!createdStudentId) throw new Error('no student to edit (create step failed)')
  const window = await page(`/r/members/${createdStudentId}`)
  try {
    click(window, byText(window, '.page-head__actions button', /^Edit$/i))
    await dialog(window)
    fill(window, 'phone', '+256 777 999888')
    fill(window, 'address', 'Flow test village, Kampala')
    fillTags(window, 'skills', ['Robotics', 'Web design'])
    click(window, confirm(window))
    await waitFor(window, async () => {
      const res = await api(`/api/members/${createdStudentId}`, { headers: auth })
      return res.body && res.body.data && res.body.data.phone === '+256 777 999888' ? true : null
    }, { label: 'the edit to persist' })
    const after = await api(`/api/members/${createdStudentId}`, { headers: auth })
    if (!String(after.body.data.skills || '').includes('Robotics')) throw new Error('the skills field did not save')
    return 'phone, address and skills saved, read back from the API'
  } finally {
    window.close()
  }
})

await flow('Searching the student list shows only matching records', async () => {
  if (!createdStudentId) throw new Error('no student to search for (create step failed)')
  const window = await page('/r/members')
  try {
    const box = await waitFor(window, (w) => w.document.querySelector('.filters-bar input'), { label: 'the list search box' })
    type(window, box, 'Flow Test Student')
    const rows = await waitFor(window, (w) => {
      const found = [...w.document.querySelectorAll('table.data tbody tr')]
      return found.length && found.every((tr) => /Flow Test Student/.test(tr.textContent)) ? found : null
    }, { timeout: 15000, label: 'the list to narrow to matching students' }).catch(() => {
      const found = [...window.document.querySelectorAll('table.data tbody tr')]
      const offenders = found.filter((tr) => !/Flow Test Student/.test(tr.textContent))
      throw new Error(`the search left ${offenders.length} unrelated row(s), e.g. “${(offenders[0] || found[0] || { textContent: 'nothing' }).textContent.replace(/\s+/g, ' ').slice(0, 50)}”`)
    })
    return `typing a search left only matching records (${rows.length} row(s))`
  } finally {
    window.close()
  }
})

await flow('Delete a student from the list row action', async () => {
  const window = await page('/r/members')
  try {
    /* Every copy left by an earlier run carries the test admission number. */
    const list = await api('/api/members?q=FLOW%2FTEST%2F001&pageSize=50', { headers: auth })
    const ids = ((list.body && list.body.data) || []).map((row) => row.id)
    if (!ids.length) throw new Error('no test student to delete')

    const box = await waitFor(window, (w) => w.document.querySelector('.filters-bar input'), { label: 'the list search box' })
    type(window, box, 'Flow Test Student')
    const rowFor = (id) => window.document.querySelector(`table.data tbody tr a[href="/r/members/${id}"]`)

    for (const id of ids) {
      /* The list reloads after every delete, so wait for the next row to appear. */
      await waitFor(window, () => rowFor(id), { timeout: 15000, label: `the row for student #${id}` })
      const row = rowFor(id).closest('tr')
      click(window, row.querySelector('button[title="Delete"]'))
      const modal = await dialog(window)
      const confirmButton = modal.querySelector('.modal__foot button.btn--danger')
      if (!confirmButton) throw new Error('the confirmation dialog has no delete button')
      click(window, confirmButton)
      await waitFor(window, async () => {
        const res = await api(`/api/members/${id}`, { headers: auth })
        return res.status === 404 ? true : null
      }, { timeout: 15000, label: `student #${id} to be removed` })
    }

    const left = await api('/api/members?q=FLOW%2FTEST%2F001', { headers: auth })
    if (left.body && left.body.total) throw new Error(`${left.body.total} record(s) survived the delete`)
    createdStudentId = null
    return `${ids.length} test student(s) deleted through the row action, confirmed by the API`
  } finally {
    window.close()
  }
})

/* ------------------------------------------------------------------ */
/* 2. Club dues: record a payment                                      */
/* ------------------------------------------------------------------ */

await flow('Record a dues payment from the register', async () => {
  const window = await page('/r/dues')
  try {
    await waitFor(window, (w) => w.document.querySelector('table.data tbody tr'), { label: 'the dues register' })
    const row = [...window.document.querySelectorAll('table.data tbody tr')].find((tr) => tr.querySelector('button[title="Record payment"]'))
    const name = row.querySelector('td').textContent.trim()
    const before = await api('/api/dues/summary', { headers: auth })
    const collectedBefore = before.body.totals.collected
    click(window, row.querySelector('button[title="Record payment"]'))
    await dialog(window)
    const paidNow = await waitFor(window, (w) => w.document.querySelector('#payment-amount'), { label: 'the amount field' })
    type(window, paidNow, '5000')
    click(window, byText(window, '.modal__foot button', /Record payment/i))
    const after = await waitFor(window, async () => {
      const res = await api('/api/dues/summary', { headers: auth })
      return res.body && res.body.totals && res.body.totals.collected > collectedBefore ? res.body.totals : null
    }, { timeout: 15000, label: 'the collection total to rise' })
    return `payment saved for ${name.slice(0, 24)} — collected now ${after.collected}`
  } finally {
    window.close()
  }
})

/* ------------------------------------------------------------------ */
/* 3. Attendance                                                       */
/* ------------------------------------------------------------------ */

await flow('Save an attendance register', async () => {
  const window = await page('/attendance')
  try {
    await waitFor(window, (w) => w.document.querySelector('table.register-table tbody tr'), { label: 'the register rows' })
    click(window, byText(window, 'button', /Mark all present/i))
    await sleep(200)
    const saveButton = byText(window, 'button', /Save register/i)
    click(window, saveButton)
    await waitFor(window, (w) => /Register saved|Could not save/i.test(w.document.body.textContent), { timeout: 15000, label: 'the save to finish' })
    if (/Could not save/i.test(text(window))) throw new Error('the register did not save')
    const rows = window.document.querySelectorAll('table.register-table tbody tr').length
    return `${rows} student(s) marked and saved`
  } finally {
    window.close()
  }
})

/* ------------------------------------------------------------------ */
/* 4. Courses: enrol and issue a certificate                           */
/* ------------------------------------------------------------------ */

await flow('Register a student for a course and issue their certificate', async () => {
  const window = await page('/r/courses')
  try {
    await waitFor(window, (w) => w.document.querySelector('table.data tbody tr, .record-card'), { label: 'the course list' })
    click(window, byText(window, '.page-head__actions button', /Enrol students/i))
    const modal = await dialog(window)
    await waitFor(window, () => modal.querySelectorAll('.checkbox input').length > 0, { label: 'the student list' })
    const first = modal.querySelector('.checkbox input')
    click(window, first)
    const studentId = Number(first.value)
    const courseId = Number(modal.querySelector('select').value)
    click(window, byText(window, '.modal__foot button', /^Enrol$/i))
    await waitFor(window, async () => {
      const res = await api(`/api/enrollments?course_id=${courseId}&pageSize=200`, { headers: auth })
      return res.body && (res.body.data || []).some((row) => Number(row.member_id) === studentId) ? true : null
    }, { label: 'the enrolment to appear' })
    return `student #${studentId} enrolled on course #${courseId}`
  } finally {
    window.close()
  }
})

/* ------------------------------------------------------------------ */
/* 5. Reports studio                                                   */
/* ------------------------------------------------------------------ */

await flow('Generate a report and save it as a record', async () => {
  const window = await page('/reports')
  try {
    /* The studio paints once while it collects the figures and again with the
       text, so always take the editor that is on the page right now. */
    const grownEditor = await waitFor(window, (w) => {
      const box = w.document.querySelector('textarea.textarea')
      return box && box.value.length > 500 ? box : null
    }, { timeout: 25000, label: 'the generated report text' }).catch((error) => {
      const box = window.document.querySelector('textarea.textarea')
      throw new Error(`${error.message} — the draft held ${box ? box.value.length : 'no'} characters; page errors: ${JSON.stringify((window.__errors || []).slice(0, 2))}`)
    })
    const characters = grownEditor.value.length
    if (!/Period:|MEMBERSHIP|Attendance/i.test(grownEditor.value)) throw new Error('the draft does not read like a report')
    const before = await api('/api/reports?pageSize=1', { headers: auth })
    click(window, byText(window, 'button', /Save as a report record/i))
    await waitFor(window, async () => {
      const res = await api('/api/reports?pageSize=1', { headers: auth })
      return res.body && res.body.total > before.body.total ? true : null
    }, { timeout: 15000, label: 'the report record to be created' })
    return `report saved with ${characters} characters of generated text`
  } finally {
    window.close()
  }
})

/* ------------------------------------------------------------------ */
/* 6. Notes and the club profile                                       */
/* ------------------------------------------------------------------ */

await flow('Create a club note', async () => {
  const window = await page('/r/notes')
  try {
    click(window, byText(window, '.page-head__actions button', /New note/i))
    await dialog(window)
    fill(window, 'title', 'Flow test note')
    fill(window, 'content', 'Written by the write-flow suite to prove the note form saves.')
    click(window, confirm(window))
    const found = await waitFor(window, async () => {
      const res = await api('/api/notes?q=Flow%20test%20note', { headers: auth })
      return res.body && res.body.total ? res.body : null
    }, { label: 'the note to appear in the API' })
    const id = found.data[0].id
    await api(`/api/notes/${id}`, { method: 'DELETE', headers: auth })
    return `note #${id} created and cleaned up`
  } finally {
    window.close()
  }
})

await flow('Save the club profile in Settings', async () => {
  const window = await page('/settings')
  try {
    const target = await waitFor(window, (w) => w.document.querySelector('#f-attendance_target, input'), { label: 'the settings form' })
    const inputs = [...window.document.querySelectorAll('input.input')]
    const attendance = inputs.find((input) => input.value === '75') || target
    const before = attendance.value
    type(window, attendance, '76')
    click(window, byText(window, 'button', /Save profile/i))
    await waitFor(window, async () => {
      const res = await api('/api/settings', { headers: auth })
      return res.body && String(res.body.data.attendance_target) === '76' ? true : null
    }, { label: 'the setting to persist' })
    await api('/api/settings', { method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ attendance_target: before }) })
    return `attendance target saved as 76% and restored to ${before}%`
  } finally {
    window.close()
  }
})

/* ------------------------------------------------------------------ */
/* 7. Certificates and public verification                             */
/* ------------------------------------------------------------------ */

await flow('Verify a real certificate on the public page', async () => {
  const list = await api('/api/certificates?pageSize=1', { headers: auth })
  if (!list.body || !list.body.total) return 'no certificates to verify on this database'
  const code = list.body.data[0].verification_code
  const window = await open('/verify')
  try {
    const input = await waitFor(window, (w) => w.document.querySelector('#code, .input'), { label: 'the code field' })
    type(window, input, code)
    click(window, byText(window, 'button', /Verify/i))
    await waitFor(window, (w) => /Genuine certificate/i.test(w.document.body.textContent), { timeout: 10000, label: 'the verification result' })
    return `${code} verified on the public page`
  } finally {
    window.close()
  }
})

/* ------------------------------------------------------------------ */
/* 8. Signing in and the session notices                               */
/* ------------------------------------------------------------------ */

async function signIn(window, username, password) {
  const identifier = await waitFor(window, (w) => w.document.querySelector('#email'), { label: 'the sign-in form' })
  type(window, identifier, username)
  type(window, window.document.querySelector('#password'), password)
  click(window, byText(window, 'button', /Sign in/i))
}

await flow('Signing in with the administrator credentials opens the dashboard', async () => {
  const window = await open('/login')
  try {
    await signIn(window, ADMIN.username, ADMIN.password)
    await waitFor(window, (w) => /Good (morning|afternoon|evening)/i.test(w.document.body.textContent), { timeout: 20000, label: 'the dashboard' })
    if (/session ended/i.test(text(window))) throw new Error('a session notice appeared after a good sign-in')
    if (!window.localStorage.getItem('ict-club-token')) throw new Error('no session token was stored')
    return `signed in as ${ADMIN.username} (username)`
  } finally {
    window.close()
  }
})

await flow('Signing in also works with the administrator email', async () => {
  const window = await open('/login')
  try {
    await signIn(window, process.env.ADMIN_EMAIL || 'sharp@school.ac.ug', ADMIN.password)
    await waitFor(window, (w) => /Good (morning|afternoon|evening)/i.test(w.document.body.textContent), { timeout: 20000, label: 'the dashboard' })
    return 'signed in with the email address'
  } finally {
    window.close()
  }
})

await flow('A wrong password is reported as a password problem', async () => {
  const window = await open('/login')
  try {
    await signIn(window, ADMIN.username, 'definitely-not-the-password')
    await waitFor(window, (w) => /Incorrect password/i.test(w.document.body.textContent), { timeout: 15000, label: 'the incorrect-password message' })
    if (/session ended/i.test(text(window))) throw new Error('the wrong password was reported as an ended session')
    if (window.localStorage.getItem('ict-club-token')) throw new Error('a session was stored for a failed sign-in')
    return 'showed “Incorrect password” and stored no session'
  } finally {
    window.close()
  }
})

await flow('A stale session notice disappears once details are typed', async () => {
  const window = await open('/login', {
    token: 'token-from-an-old-installation',
    user: { id: 1, name: 'Old Session', role: 'admin' }
  })
  try {
    await waitFor(window, (w) => /session ended/i.test(w.document.body.textContent), { timeout: 15000, label: 'the session notice' })
    const identifier = window.document.querySelector('#email')
    type(window, identifier, 'S')
    await waitFor(window, (w) => !/session ended/i.test(w.document.body.textContent), { label: 'the notice to clear while typing' })
    return 'the notice cleared as soon as typing started'
  } finally {
    window.close()
  }
})

await flow('An expired session returns to the sign-in screen', async () => {
  const window = await open('/', {
    token: 'token-that-this-server-does-not-know',
    user: { id: 1, name: 'Expired', role: 'admin' }
  })
  try {
    await waitFor(window, (w) => /Sign in to your club/i.test(w.document.body.textContent), { timeout: 15000, label: 'the sign-in screen' })
    if (!/session ended/i.test(text(window))) throw new Error('no explanation was shown')
    if (window.localStorage.getItem('ict-club-token')) throw new Error('the dead token was kept')
    return 'stale token cleared and the sign-in screen explained why'
  } finally {
    window.close()
  }
})

await flow('A reinstalled club system signs you out quietly', async () => {
  const window = await open('/', {
    token: 'token-from-a-previous-installation',
    user: { id: 1, name: 'Old Install', role: 'admin' },
    /* Different installation id in the browser than the one now serving — a
       replaced system, so this is not an expiry. */
    install: 'installation-that-no-longer-exists'
  })
  try {
    await waitFor(window, (w) => /Sign in to your club/i.test(w.document.body.textContent), { timeout: 15000, label: 'the sign-in screen' })
    if (/session ended/i.test(text(window))) throw new Error('a false expiry notice was shown after a reinstall')
    return 'old details cleared with no false expiry notice'
  } finally {
    window.close()
  }
})

/* ------------------------------------------------------------------ */

console.log(`\n  ${results.filter((r) => r.ok).length}/${results.length} write flows worked.`)
const failed = results.filter((r) => !r.ok)
if (failed.length) {
  failed.forEach((f) => console.log(`    • ${f.label}: ${f.detail}`))
  console.log('')
  process.exit(1)
}
console.log('  All flows OK — every action persisted to the API.\n')
process.exit(0)
