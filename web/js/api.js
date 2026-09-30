/**
 * API client — the same behaviour the system had, in plain JavaScript:
 *
 *  • bearer token in localStorage, sent with every request
 *  • a request that never reaches the server is explained in plain words
 *    (the server may simply be starting up), and reads/sign-ins are retried once
 *  • a 401 clears the session and fires ict-club:session-expired, so the app
 *    falls back to the sign-in screen instead of showing broken pages
 *  • the installation id tells a reinstalled system apart from a session that
 *    really ended: only the latter shows the "your session ended" notice
 */
(function () {
  var ICT = (window.ICT = window.ICT || {})
  var TOKEN_KEY = 'ict-club-token'
  var USER_KEY = 'ict-club-user'
  var INSTALL_KEY = 'ict-club-install'
  var NOTICE_KEY = 'ict-club-notice'

  var storage = {
    get(key) {
      try {
        return localStorage.getItem(key)
      } catch (e) {
        return null
      }
    },
    set(key, value) {
      try {
        if (value === null || value === undefined) localStorage.removeItem(key)
        else localStorage.setItem(key, value)
      } catch (e) {
        /* private mode — the app still works, the session just will not persist */
      }
    }
  }

  function ApiError(message, status) {
    var error = new Error(message)
    error.name = 'ApiError'
    error.status = status || 0
    return error
  }

  function getToken() {
    return storage.get(TOKEN_KEY) || ''
  }

  function setToken(token) {
    storage.set(TOKEN_KEY, token || null)
  }

  function getStoredUser() {
    try {
      return JSON.parse(storage.get(USER_KEY) || 'null')
    } catch (e) {
      return null
    }
  }

  function setStoredUser(user) {
    storage.set(USER_KEY, user ? JSON.stringify(user) : null)
  }

  function getInstallId() {
    return storage.get(INSTALL_KEY) || ''
  }

  function setInstallId(id) {
    storage.set(INSTALL_KEY, id || null)
  }

  /** One-shot message for the sign-in screen (survives a page reload). */
  function setSessionNotice(message) {
    try {
      if (message) sessionStorage.setItem(NOTICE_KEY, message)
      else sessionStorage.removeItem(NOTICE_KEY)
    } catch (e) {
      /* not critical */
    }
  }

  function takeSessionNotice() {
    try {
      var message = sessionStorage.getItem(NOTICE_KEY)
      if (message) sessionStorage.removeItem(NOTICE_KEY)
      return message
    } catch (e) {
      return null
    }
  }

  function unreachable() {
    var offline = typeof navigator !== 'undefined' && navigator.onLine === false
    return ApiError(
      offline
        ? 'This computer appears to be offline. Reconnect to the internet (or the school network) and try again.'
        : 'Cannot reach the club system server. It may still be starting up — wait a few seconds and try again. If this keeps happening, ask whoever looks after the system to restart it.',
      0
    )
  }

  function buildQuery(params) {
    if (!params) return ''
    var search = new URLSearchParams()
    Object.keys(params).forEach(function (key) {
      var value = params[key]
      if (value === undefined || value === null || value === '' || value === false) return
      search.set(key, String(value))
    })
    var qs = search.toString()
    return qs ? '?' + qs : ''
  }

  async function request(path, options) {
    options = options || {}
    var method = options.method || 'GET'
    var headers = { Accept: 'application/json' }
    var token = getToken()
    if (token) headers.Authorization = 'Bearer ' + token
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'

    var url = path + buildQuery(options.params)
    function send() {
      return fetch(url, {
        method: method,
        headers: headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
      })
    }

    /* A cold start — the server waking up, a laptop just booted — can fail the
       very first request. Reads and sign-ins may safely be tried twice; other
       writes may not, because a retry could save the same change twice. */
    var canRetry = method === 'GET' || /\/auth\/(login|signup)$/.test(path)
    var res
    try {
      res = await send()
    } catch (err) {
      if (!canRetry) throw unreachable()
      await new Promise((resolve) => setTimeout(resolve, 1200))
      try {
        res = await send()
      } catch (err2) {
        throw unreachable()
      }
    }

    if (options.raw) {
      if (!res.ok) throw ApiError('Request failed (' + res.status + ')', res.status)
      return res
    }

    var servedBy = res.headers && res.headers.get ? res.headers.get('X-Install-Id') || '' : ''
    var text = await res.text()
    var data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch (e) {
      data = { error: text }
    }

    if (!res.ok) {
      var isSignInAttempt = /\/auth\/(login|signup)$/.test(path)
      if (res.status === 401 && !isSignInAttempt) {
        var known = getInstallId()
        var reinstalled = Boolean(servedBy && known && servedBy !== known)
        setToken('')
        setStoredUser(null)
        if (servedBy && !reinstalled) setInstallId(servedBy)
        if (!reinstalled) {
          setSessionNotice('Your session ended, so you were signed out. Please sign in again to continue.')
        }
        window.dispatchEvent(new CustomEvent('ict-club:session-expired'))
      }
      throw ApiError((data && data.error) || 'Request failed (' + res.status + ')', res.status)
    }

    if (servedBy && servedBy !== getInstallId()) setInstallId(servedBy)
    return data
  }

  var api = {
    /* auth */
    login: (identifier, password) => request('/api/auth/login', { method: 'POST', body: { email: identifier, password: password } }),
    signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload }),
    logout: () => request('/api/auth/logout', { method: 'POST' }),
    me: () => request('/api/auth/me'),
    changePassword: (payload) => request('/api/auth/password', { method: 'POST', body: payload }),

    meta: () => request('/api/meta'),
    settings: () => request('/api/settings'),
    saveSettings: (body) => request('/api/settings', { method: 'PUT', body: body }),
    activity: (limit) => request('/api/activity', { params: { limit: limit || 100 } }),

    list: (resource, params) => request('/api/' + resource, { params: params }),
    get: (resource, id) => request('/api/' + resource + '/' + id),
    create: (resource, body) => request('/api/' + resource, { method: 'POST', body: body }),
    update: (resource, id, body) => request('/api/' + resource + '/' + id, { method: 'PATCH', body: body }),
    remove: (resource, id) => request('/api/' + resource + '/' + id, { method: 'DELETE' }),
    options: (resource) => request('/api/options/' + resource),

    dashboard: () => request('/api/dashboard'),
    search: (q) => request('/api/search', { params: { q: q } }),
    reportData: (params) => request('/api/reports/data', { params: params }),
    attendanceRegister: (params) => request('/api/attendance/register', { params: params }),
    saveAttendanceRegister: (body) => request('/api/attendance/register', { method: 'POST', body: body }),
    markAllPresent: (body) => request('/api/attendance/mark-all', { method: 'POST', body: body }),
    duesSummary: (params) => request('/api/dues/summary', { params: params }),
    generateDues: (body) => request('/api/dues/generate', { method: 'POST', body: body }),
    recordPayment: (id, body) => request('/api/dues/' + id + '/payment', { method: 'POST', body: body }),
    importMembers: (rows) => request('/api/members/import', { method: 'POST', body: { rows: rows } }),
    enrollCourse: (courseId, memberIds) => request('/api/courses/' + courseId + '/enroll', { method: 'POST', body: { member_ids: memberIds } }),
    issueCertificates: (courseId) => request('/api/courses/' + courseId + '/issue-certificates', { method: 'POST' }),
    printableCertificate: (id) => request('/api/certificates/' + id + '/printable'),
    verify: (code) => request('/api/verify/' + encodeURIComponent(code)),
    backup: () => request('/api/backup'),

    /** CSV download — the browser saves it directly. */
    async exportCsv(resource, params) {
      var token = getToken()
      var res = await fetch('/api/export/' + resource + buildQuery(Object.assign({ all: 1 }, params || {})), {
        headers: token ? { Authorization: 'Bearer ' + token } : {}
      })
      if (!res.ok) throw ApiError('Could not export the list', res.status)
      var blob = await res.blob()
      var url = URL.createObjectURL(blob)
      var link = document.createElement('a')
      link.href = url
      link.download = resource + '-' + new Date().toISOString().slice(0, 10) + '.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      return true
    },

    /** JSON backup — same idea, for the administrator. */
    async downloadBackup() {
      var data = await api.backup()
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      var url = URL.createObjectURL(blob)
      var link = document.createElement('a')
      link.href = url
      link.download = 'ict-club-backup-' + new Date().toISOString().slice(0, 10) + '.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      return true
    }
  }

  ICT.api = api
  ICT.ApiError = ApiError
  ICT.session = {
    getToken: getToken,
    setToken: setToken,
    getStoredUser: getStoredUser,
    setStoredUser: setStoredUser,
    getInstallId: getInstallId,
    setInstallId: setInstallId,
    setSessionNotice: setSessionNotice,
    takeSessionNotice: takeSessionNotice,
    TOKEN_KEY: TOKEN_KEY,
    USER_KEY: USER_KEY,
    INSTALL_KEY: INSTALL_KEY,
    NOTICE_KEY: NOTICE_KEY
  }
})()
