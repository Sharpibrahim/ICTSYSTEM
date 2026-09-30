/* ==========================================================================
   net.js — everything that talks to the server.

   • the bearer token and the signed-in user live in localStorage
   • a request that never reaches the server is explained in plain words
   • a 401 signs the user out; a session notice is only shown when the session
     really expired on THIS installation (a reinstalled system signs out
     quietly, because its old token means nothing here)
   ========================================================================== */
(function () {
  var ICT = window.ICT = window.ICT || {}

  var TOKEN_KEY = 'ict-club-token'
  var USER_KEY = 'ict-club-user'
  var INSTALL_KEY = 'ict-club-install'
  var NOTICE_KEY = 'ict-club-notice'

  var SESSION_NOTICE = 'Your session ended, so you were signed out. Please sign in again to continue.'

  function read(key) {
    try { return window.localStorage.getItem(key) } catch (error) { return null }
  }

  function write(key, value) {
    try {
      if (value === null || value === undefined || value === '') window.localStorage.removeItem(key)
      else window.localStorage.setItem(key, value)
    } catch (error) { /* private mode — the app still works, it just forgets */ }
  }

  var getToken = function () { return read(TOKEN_KEY) || '' }
  var setToken = function (value) { write(TOKEN_KEY, value || '') }

  function getStoredUser() {
    try { return JSON.parse(read(USER_KEY) || 'null') } catch (error) { return null }
  }
  function setStoredUser(user) { write(USER_KEY, user ? JSON.stringify(user) : '') }

  var getInstall = function () { return read(INSTALL_KEY) || '' }
  var setInstall = function (value) { write(INSTALL_KEY, value || '') }
  var setNotice = function (value) { write(NOTICE_KEY, value || '') }
  var getNotice = function () { return read(NOTICE_KEY) || '' }
  /* Kept for callers that only want the notice once. */
  var takeNotice = function () {
    var value = getNotice()
    write(NOTICE_KEY, '')
    return value
  }

  function ApiError(message, status) {
    var error = new Error(message)
    error.name = 'ApiError'
    error.status = status || 0
    return error
  }

  function offlineError() {
    return ApiError(
      'Cannot reach the club system server. Check that the server is running, then try again.',
      0
    )
  }

  /** Builds ?a=1&b=2 and drops empty values, so lists stay readable. */
  function query(params) {
    if (!params) return ''
    var search = new URLSearchParams()
    Object.keys(params).forEach(function (key) {
      var value = params[key]
      if (value === null || value === undefined || value === '' || value === false) return
      search.append(key, String(value))
    })
    var text = search.toString()
    return text ? '?' + text : ''
  }

  /**
   * request('/api/members', { params, body, method })
   * Reads and sign-ins may be retried once, because a sleeping server or a
   * just-booted laptop often fails the very first call. Writes are not
   * retried — that could save the same change twice.
   */
  async function request(path, options) {
    options = options || {}
    var method = options.method || 'GET'
    var headers = { Accept: 'application/json' }
    var token = getToken()
    if (token) headers.Authorization = 'Bearer ' + token
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'

    var url = path + query(options.params)

    function send() {
      return fetch(url, {
        method: method,
        headers: headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
      })
    }

    var canRetry = method === 'GET' || /\/auth\/(login|signup)$/.test(path)
    var response
    try {
      response = await send()
    } catch (error) {
      if (!canRetry) throw offlineError()
      await new Promise(function (resolve) { setTimeout(resolve, 1200) })
      try {
        response = await send()
      } catch (retryError) {
        throw offlineError()
      }
    }

    if (options.raw) {
      if (!response.ok) throw ApiError('Request failed (' + response.status + ')', response.status)
      return response
    }

    var servedBy = response.headers && response.headers.get ? (response.headers.get('X-Install-Id') || '') : ''
    var body = await response.text()
    var data = null
    try { data = body ? JSON.parse(body) : null } catch (error) { data = { error: body } }

    if (!response.ok) {
      var isSignIn = /\/auth\/(login|signup)$/.test(path)
      if (response.status === 401 && !isSignIn) {
        /* Was this the same installation we signed in to? If the server answers
           with a different installation id, the system was reinstalled or
           replaced — that is not an expiry, so no notice. */
        var known = getInstall()
        var replaced = Boolean(servedBy && known && servedBy !== known)
        setToken('')
        setStoredUser(null)
        if (servedBy && !replaced) setInstall(servedBy)
        if (!replaced) setNotice(SESSION_NOTICE)
        window.dispatchEvent(new CustomEvent('ict-club:signed-out', { detail: { replaced: replaced } }))
      }
      throw ApiError((data && data.error) || 'Request failed (' + response.status + ')', response.status)
    }

    if (servedBy && servedBy !== getInstall()) setInstall(servedBy)
    return data
  }

  function saveBlob(content, filename, type) {
    var blob = new Blob([content], { type: type })
    var url = URL.createObjectURL(blob)
    var link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(function () { URL.revokeObjectURL(url) }, 2000)
  }

  var api = {
    /* Who am I and how do I get in */
    login: function (identifier, password) { return request('/api/auth/login', { method: 'POST', body: { email: identifier, password: password } }) },
    signup: function (payload) { return request('/api/auth/signup', { method: 'POST', body: payload }) },
    logout: function () { return request('/api/auth/logout', { method: 'POST' }) },
    me: function () { return request('/api/auth/me') },
    changePassword: function (payload) { return request('/api/auth/password', { method: 'POST', body: payload }) },

    /* Setup the app needs once */
    meta: function () { return request('/api/meta') },
    settings: function () { return request('/api/settings') },
    saveSettings: function (body) { return request('/api/settings', { method: 'PUT', body: body }) },
    activity: function (limit) { return request('/api/activity', { params: { limit: limit || 100 } }) },

    /* Any record type, driven by the schema */
    list: function (resource, params) { return request('/api/' + resource, { params: params }) },
    get: function (resource, id) { return request('/api/' + resource + '/' + id) },
    create: function (resource, body) { return request('/api/' + resource, { method: 'POST', body: body }) },
    update: function (resource, id, body) { return request('/api/' + resource + '/' + id, { method: 'PATCH', body: body }) },
    remove: function (resource, id) { return request('/api/' + resource + '/' + id, { method: 'DELETE' }) },
    options: function (resource) { return request('/api/options/' + resource) },

    /* The club's own analytics and registers */
    dashboard: function () { return request('/api/dashboard') },
    search: function (q) { return request('/api/search', { params: { q: q } }) },
    reportData: function (params) { return request('/api/reports/data', { params: params }) },
    attendanceRegister: function (params) { return request('/api/attendance/register', { params: params }) },
    saveAttendance: function (body) { return request('/api/attendance/register', { method: 'POST', body: body }) },
    duesSummary: function (params) { return request('/api/dues/summary', { params: params }) },
    generateDues: function (body) { return request('/api/dues/generate', { method: 'POST', body: body }) },
    recordPayment: function (id, body) { return request('/api/dues/' + id + '/payment', { method: 'POST', body: body }) },
    importMembers: function (rows) { return request('/api/members/import', { method: 'POST', body: { rows: rows } }) },
    enroll: function (courseId, memberIds) { return request('/api/courses/' + courseId + '/enroll', { method: 'POST', body: { member_ids: memberIds } }) },
    issueCertificates: function (courseId) { return request('/api/courses/' + courseId + '/issue-certificates', { method: 'POST' }) },
    certificate: function (id) { return request('/api/certificates/' + id + '/printable') },
    verify: function (code) { return request('/api/verify/' + encodeURIComponent(code)) },

    /** CSV download — the browser saves the file. */
    async exportCsv(resource, params) {
      var token = getToken()
      var response = await fetch('/api/export/' + resource + query(Object.assign({ all: 1 }, params || {})), {
        headers: token ? { Authorization: 'Bearer ' + token } : {}
      })
      if (!response.ok) throw ApiError('Could not export the list', response.status)
      saveBlob(await response.blob(), resource + '-' + new Date().toISOString().slice(0, 10) + '.csv', 'text/csv')
      return true
    },

    /** JSON backup — everything, for the club to keep. */
    async downloadBackup() {
      var data = await request('/api/backup')
      saveBlob(JSON.stringify(data, null, 2), 'ict-club-backup-' + new Date().toISOString().slice(0, 10) + '.json', 'application/json')
      return true
    }
  }

  ICT.api = api
  ICT.ApiError = ApiError
  ICT.session = {
    getToken: getToken,
    setToken: setToken,
    getUser: getStoredUser,
    setUser: setStoredUser,
    getInstall: getInstall,
    setInstall: setInstall,
    setNotice: setNotice,
    getNotice: getNotice,
    takeNotice: takeNotice,
    NOTICE_TEXT: SESSION_NOTICE,
    KEYS: { token: TOKEN_KEY, user: USER_KEY, install: INSTALL_KEY, notice: NOTICE_KEY }
  }
})()
