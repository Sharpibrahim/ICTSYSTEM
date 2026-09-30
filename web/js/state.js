/* ==========================================================================
   state.js — what the app remembers between screens.

   The schema (/api/meta) describes every record type: its fields, filters,
   columns, permissions and icon. Every list screen, form and detail page is
   built from it, so adding a module is a one-file change on the server.
   ========================================================================== */
(function () {
  var ICT = window.ICT = window.ICT || {}

  var state = {
    user: ICT.session.getUser(),
    resources: [],
    optionSets: {},
    settings: {},
    loaded: false
  }

  function canWrite(resource) {
    if (!resource || !resource.write) return false
    var order = { member: 1, cabinet: 2, admin: 3 }
    var role = (state.user && state.user.role) || 'member'
    var needed = 99
    resource.write.forEach(function (level) { needed = Math.min(needed, order[level] || 99) })
    if ((order[role] || 0) < needed) return false
    if (resource.key === 'users' && role !== 'admin') return false
    return true
  }

  function resourceFor(key) {
    for (var i = 0; i < state.resources.length; i += 1) {
      if (state.resources[i].key === key) return state.resources[i]
    }
    return null
  }

  function fieldFor(resource, key) {
    if (!resource) return null
    var fields = resource.fields || []
    for (var i = 0; i < fields.length; i += 1) {
      if (fields[i].key === key) return fields[i]
    }
    return null
  }

  /** The groups the sidebar shows, in the order the schema declares them. */
  function groups() {
    var order = []
    var byName = {}
    state.resources.forEach(function (resource) {
      if (resource.hidden) return
      var name = resource.group || 'Other'
      if (!byName[name]) { byName[name] = []; order.push(name) }
      byName[name].push(resource)
    })
    return order.map(function (name) { return { name: name, resources: byName[name] } })
  }

  /** Loads the schema and the club settings. Safe to call more than once. */
  async function boot() {
    state.user = ICT.session.getUser()
    var meta = await ICT.api.meta()
    state.resources = meta.resources || []
    state.optionSets = meta.optionSets || {}
    state.settings = meta.settings || {}
    state.loaded = true
    return state
  }

  async function refreshSettings() {
    var res = await ICT.api.settings()
    state.settings = (res && res.data) || state.settings
    return state.settings
  }

  function setUser(user) {
    state.user = user || null
    ICT.session.setUser(user)
    return state.user
  }

  function signOut() {
    ICT.session.setToken('')
    ICT.session.setUser(null)
    state.user = null
    state.loaded = false
  }

  var listeners = []
  function onChange(fn) { listeners.push(fn) }
  function announce() { listeners.forEach(function (fn) { fn(state) }) }

  ICT.store = {
    state: state,
    boot: boot,
    refreshSettings: refreshSettings,
    setUser: setUser,
    signOut: signOut,
    canWrite: canWrite,
    resourceFor: resourceFor,
    fieldFor: fieldFor,
    groups: groups,
    onChange: onChange,
    announce: announce,
    get user() { return state.user },
    get settings() { return state.settings },
    get resources() { return state.resources },
    get optionSets() { return state.optionSets }
  }
})()
