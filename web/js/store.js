/**
 * Session + schema state, and the small pub/sub the app uses to react to
 * changes (sign in, sign out, settings saved, resources loaded).
 */
(function () {
  var ICT = (window.ICT = window.ICT || {})
  var listeners = {}

  var store = {
    user: null,
    settings: {},
    resources: [],
    resourceMap: {},
    optionSets: {},
    ready: false,

    on(event, handler) {
      ;(listeners[event] = listeners[event] || []).push(handler)
      return () => {
        listeners[event] = listeners[event].filter((h) => h !== handler)
      }
    },

    emit(event, payload) {
      ;(listeners[event] || []).forEach((handler) => {
        try {
          handler(payload)
        } catch (error) {
          console.error('[' + event + ']', error)
        }
      })
    },

    resource(key) {
      return store.resourceMap[key]
    },

    get isSignedIn() {
      return Boolean(store.user && ICT.session.getToken())
    },

    can(role, levels) {
      var order = { member: 1, cabinet: 2, admin: 3 }
      return (order[role] || 0) >= (order[levels] || 99)
    },

    /** Signs in and remembers the session. */
    async signIn(identifier, password) {
      var result = await ICT.api.login(identifier, password)
      ICT.session.setToken(result.token)
      ICT.session.setStoredUser(result.user)
      store.user = result.user
      store.emit('session')
      return result.user
    },

    async register(payload) {
      var result = await ICT.api.signup(payload)
      ICT.session.setToken(result.token)
      ICT.session.setStoredUser(result.user)
      store.user = result.user
      store.emit('session')
      return result.user
    },

    async signOut() {
      try {
        await ICT.api.logout()
      } catch (error) {
        /* the session is being dropped anyway */
      }
      ICT.session.setToken('')
      ICT.session.setStoredUser(null)
      store.user = null
      store.emit('session')
    },

    /** Loads the schema, settings and the signed-in user (once). */
    async boot() {
      var stored = ICT.session.getStoredUser()
      if (stored && ICT.session.getToken()) store.user = stored

      if (ICT.session.getToken()) {
        try {
          var me = await ICT.api.me()
          store.user = me.user
          ICT.session.setStoredUser(me.user)
        } catch (error) {
          if (error.status === 401) {
            store.user = null
          } else {
            throw error
          }
        }
      }

      if (store.user) {
        var meta = await ICT.api.meta()
        store.resources = meta.resources || []
        store.resourceMap = {}
        store.resources.forEach((resource) => (store.resourceMap[resource.key] = resource))
        store.optionSets = meta.optionSets || {}
        store.settings = meta.settings || {}
        store.emit('meta')
      }
      store.ready = true
      return store.user
    },

    async refreshSettings() {
      var res = await ICT.api.settings()
      store.settings = res.data || store.settings
      store.emit('settings')
      return store.settings
    },

    /** Writes a value into the schema so screens re-render with fresh data. */
    patchResource(key, patch) {
      var resource = store.resourceMap[key]
      if (!resource) return
      Object.assign(resource, patch)
      store.emit('meta')
    }
  }

  window.addEventListener('ict-club:session-expired', () => {
    store.user = null
    store.emit('session')
  })

  ICT.store = store
})()
