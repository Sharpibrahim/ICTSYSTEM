/**
 * Tiny API client. Talks to the Express API using a bearer token stored in
 * localStorage. In development Vite proxies /api to the API server.
 */
const TOKEN_KEY = 'ict-club-token'
const USER_KEY = 'ict-club-user'
const NOTICE_KEY = 'ict-club-notice'

/** A one-shot message shown on the sign-in screen (e.g. "your session ended"). */
export function setSessionNotice(message) {
  try {
    if (message) sessionStorage.setItem(NOTICE_KEY, message)
    else sessionStorage.removeItem(NOTICE_KEY)
  } catch {
    /* storage can be unavailable in private mode — the notice is not critical */
  }
}

export function takeSessionNotice() {
  try {
    const message = sessionStorage.getItem(NOTICE_KEY)
    if (message) sessionStorage.removeItem(NOTICE_KEY)
    return message
  } catch {
    return null
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(USER_KEY)
}

export const SESSION_EXPIRED_EVENT = 'ict-club:session-expired'

function notifySessionExpired() {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

function buildQuery(params) {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export async function request(path, { method = 'GET', body, params, raw = false } = {}) {
  const headers = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${path}${buildQuery(params)}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  })

  if (raw) {
    if (!res.ok) throw new ApiError(`Request failed (${res.status})`, res.status)
    return res
  }

  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { error: text }
  }

  if (!res.ok) {
    if (res.status === 401) {
      /* The stored token is no longer valid (signed out elsewhere, or the
         demo data was reloaded). Drop it and let the app fall back to the
         sign-in screen instead of leaving the user on a broken page. */
      setToken('')
      setStoredUser(null)
      setSessionNotice('Your session has ended — please sign in again.')
      notifySessionExpired()
    }
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status)
  }
  return data
}

export const api = {
  /* auth */
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  changePassword: (payload) => request('/api/auth/password', { method: 'POST', body: payload }),

  /* meta + lists */
  meta: () => request('/api/meta'),
  list: (resource, params) => request(`/api/${resource}`, { params }),
  get: (resource, id) => request(`/api/${resource}/${id}`),
  create: (resource, body) => request(`/api/${resource}`, { method: 'POST', body }),
  update: (resource, id, body) => request(`/api/${resource}/${id}`, { method: 'PATCH', body }),
  remove: (resource, id) => request(`/api/${resource}/${id}`, { method: 'DELETE' }),
  options: (resource) => request(`/api/options/${resource}`),

  /* analytics + specials */
  dashboard: () => request('/api/dashboard'),
  reportData: (params) => request('/api/reports/data', { params }),
  search: (q) => request('/api/search', { params: { q } }),
  activity: (limit = 100) => request('/api/activity', { params: { limit } }),
  settings: () => request('/api/settings'),
  saveSettings: (body) => request('/api/settings', { method: 'PUT', body }),
  attendanceRegister: (refType, refId, extra) =>
    request('/api/attendance/register', { params: { ref_type: refType, ref_id: refId, ...(extra || {}) } }),
  saveAttendanceRegister: (body) => request('/api/attendance/register', { method: 'POST', body }),
  markAllPresent: (body) => request('/api/attendance/mark-all', { method: 'POST', body }),
  importMembers: (rows) => request('/api/members/import', { method: 'POST', body: { rows } }),
  enrollCourse: (courseId, memberIds) => request(`/api/courses/${courseId}/enroll`, { method: 'POST', body: { member_ids: memberIds } }),
  /* demo data */
  loadDemoData: () => request('/api/demo/seed', { method: 'POST' }),

  /* Dues helpers */
  createDuesForTerm: (payload) => request('/api/dues/generate', { method: 'POST', body: payload }),
  recordPayment: (id, payload) => request(`/api/dues/${id}/payment`, { method: 'POST', body: payload }),
  duesSummary: (params) => request('/api/dues/summary', { params }),
  issueCertificates: (courseId, status) => request(`/api/courses/${courseId}/issue-certificates`, { method: 'POST', body: { status } }),
  printable: (id) => request(`/api/certificates/${id}/printable`),
  verify: (code) => request(`/api/verify/${encodeURIComponent(code)}`),

  /* downloads */
  exportUrl: (resource, params) => `/api/export/${resource}${buildQuery(params)}`,
  download: async (resource, params, filename) => {
    const res = await request(`/api/export/${resource}`, { params, raw: true })
    const blob = await res.blob()
    triggerDownload(blob, filename || `ict-club-${resource}.csv`)
  }
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function downloadText(text, filename, type = 'text/plain') {
  triggerDownload(new Blob([text], { type }), filename)
}

/** Downloads a file that needs the auth header (e.g. backups). */
export async function downloadAuthed(path, filename) {
  const res = await request(path, { raw: true })
  const blob = await res.blob()
  triggerDownload(blob, filename)
}
