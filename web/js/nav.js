/* ==========================================================================
   nav.js — the address bar rules and the app shell.

   Routes:  /login /verify
            /                      dashboard
            /r/<module>            a list of records
            /r/<module>/<id>       one record
            /attendance            the register sheet
            /reports               the reports studio
            /settings              club profile, users, activity, backup

   Screens are functions: screen(root) — they paint themselves and may return
   a cleanup function that runs when the user leaves.
   ========================================================================== */
(function () {
  var ICT = window.ICT = window.ICT || {}
  var el = ICT.el
  var ui = ICT.widgets
  var icon = ICT.icon

  var currentPath = '/'
  var currentCleanup = null

  function query(path) {
    var text = path === undefined ? window.location.search : path.split('?')[1]
    return new URLSearchParams(text || '')
  }

  /** go('/r/members') — pushes a new address and paints the screen. */
  function go(path, options) {
    if (options && options.replace) window.history.replaceState({}, '', path)
    else window.history.pushState({}, '', path)
    render()
  }

  function parts(path) {
    return String(path).split('?')[0].split('/').filter(Boolean)
  }

  function isSignedIn() {
    return Boolean(ICT.session.getToken() && ICT.store.user)
  }

  /** Where to send the user when the app needs a signed-in session. */
  function requireSignIn() {
    go('/login', { replace: true })
  }

  /* ---------------------------------------------------------------- Shell */

  function railLink(resource, activeKey) {
    return el('a.rail__link' + (activeKey === resource.key ? '.is-active' : ''), {
      href: '/r/' + resource.key,
      onclick: function (event) { event.preventDefault(); go('/r/' + resource.key) }
    }, [ICT.iconBox(resource.icon || 'list', 17), el('span', { text: resource.label })])
  }

  function shortLink(href, label, iconName, active) {
    return el('a.rail__link' + (active ? '.is-active' : ''), {
      href: href,
      onclick: function (event) { event.preventDefault(); go(href) }
    }, [ICT.iconBox(iconName, 17), el('span', { text: label })])
  }

  function topbar() {
    var store = ICT.store
    var search = el('input.input', { placeholder: 'Search students, meetings, dues…', autocomplete: 'off' })
    var results = el('div.searchbox__menu', { style: { display: 'none' } })
    var wrap = el('div.searchbox', [el('span.searchbox__icon', [icon('search', 16)]), search, results])

    var run = ICT.debounce(async function () {
      var text = search.value.trim()
      if (text.length < 2) { results.style.display = 'none'; return }
      try {
        var res = await ICT.api.search(text)
        var groups = (res && res.results) || (res && res.data) || []
        ICT.mount(results, [])
        if (!groups.length) {
          results.appendChild(el('div.searchbox__item', [el('span.muted', { text: 'Nothing matched “' + text + '”' })]))
        }
        groups.forEach(function (group) {
          (group.records || group.data || []).slice(0, 4).forEach(function (row) {
            results.appendChild(el('div.searchbox__item', {
              onclick: function () {
                results.style.display = 'none'
                search.value = ''
                go('/r/' + (group.resource || group.key) + '/' + row.id)
              }
            }, [
              el('span', { text: row[group.titleKey] || row.title || row.full_name || row.name || ('#' + row.id) }),
              el('span.searchbox__type', { text: group.label || group.resource || '' })
            ]))
          })
        })
        results.style.display = results.childNodes.length ? 'block' : 'none'
      } catch (error) {
        results.style.display = 'none'
      }
    }, 260)

    search.addEventListener('input', run)
    search.addEventListener('blur', function () { setTimeout(function () { results.style.display = 'none' }, 180) })
    search.addEventListener('focus', function () { if (results.childNodes.length) results.style.display = 'block' })

    var user = store.user || {}
    var who = el('div.topbar__who', [
      el('div.right', [
        el('div.who__name', { text: user.name || 'Signed in' }),
        el('div.who__role', { text: ICT.titleCase(user.role || 'member') })
      ]),
      el('div.who__avatar', { text: ICT.initials(user.name) }),
      ui.button('Sign out', { variant: 'ghost', size: 'sm', icon: 'logout', onClick: async function () {
        try { await ICT.api.logout() } catch (error) { /* the session is going anyway */ }
        store.signOut()
        ICT.session.setNotice('')
        go('/login', { replace: true })
      } })
    ])

    var menu = el('button.btn.btn--ghost.btn--icon.topbar__menu', {
      type: 'button', title: 'Menu',
      onclick: function () { document.body.classList.toggle('rail-open') }
    }, [icon('menu', 18)])

    return el('div.topbar', [menu, wrap, who])
  }

  function rail(activeKey) {
    var store = ICT.store
    var settings = store.settings || {}
    var nav = el('nav.rail__nav')

    nav.appendChild(el('div.rail__group', { text: 'Overview' }))
    nav.appendChild(shortLink('/', 'Dashboard', 'grid', activeKey === 'dashboard'))
    nav.appendChild(shortLink('/attendance', 'Attendance registers', 'checkSquare', activeKey === 'attendance'))
    nav.appendChild(shortLink('/reports', 'Reports studio', 'file', activeKey === 'reports'))

    store.groups().forEach(function (group) {
      nav.appendChild(el('div.rail__group', { text: group.name }))
      group.resources.forEach(function (resource) { nav.appendChild(railLink(resource, activeKey)) })
    })

    return el('aside.rail', [
      el('div.rail__brand', [
        el('div.rail__mark', { text: 'ICT' }),
        el('div', [
          el('div.rail__name', { text: settings.club_name || 'ICT Club' }),
          el('div.rail__term', { text: [settings.current_term, settings.academic_year].filter(Boolean).join(' • ') })
        ])
      ]),
      nav,
      el('div.rail__foot', [
        el('div', { text: 'Secondary school edition' }),
        el('div', { text: 'Need help? Ask the club patron.' })
      ])
    ])
  }

  /** Wraps a signed-in screen in the sidebar + top bar. */
  function shell(activeKey, content) {
    return el('div.shell', [
      rail(activeKey),
      el('div.main', [topbar(), content])
    ])
  }

  /* ---------------------------------------------------------------- Routes */

  function routeFor(path) {
    var bits = parts(path)
    if (bits.length === 0) return { name: 'dashboard', path: path }
    if (bits[0] === 'login') return { name: 'login', path: path }
    if (bits[0] === 'verify') return { name: 'verify', path: path }
    if (bits[0] === 'attendance') return { name: 'attendance', path: path }
    if (bits[0] === 'reports') return { name: 'reports', path: path }
    if (bits[0] === 'settings') return { name: 'settings', path: path }
    if (bits[0] === 'r' && bits.length === 2) return { name: 'list', resource: bits[1], path: path }
    if (bits[0] === 'r' && bits.length >= 3) return { name: 'detail', resource: bits[1], id: bits[2], path: path }
    return { name: 'missing', path: path }
  }

  async function render() {
    var path = window.location.pathname + window.location.search
    currentPath = path
    var root = document.getElementById('app')
    var route = routeFor(path)

    if (currentCleanup) {
      try { currentCleanup() } catch (error) { /* the screen is going anyway */ }
      currentCleanup = null
    }
    document.body.classList.remove('rail-open')

    var publicRoute = route.name === 'login' || route.name === 'verify'

    if (!publicRoute && !isSignedIn()) {
      /* Not signed in: to the sign-in screen, without touching the address bar
         history so the back button still behaves. */
      var current = window.location.pathname + window.location.search
      if (current !== '/login') window.history.replaceState({}, '', '/login')
      route = { name: 'login', path: '/login' }
    }

    try {
      if (route.name === 'login') {
        ICT.mount(root, el('div'))
        currentCleanup = paint(ICT.screens.signin, root)
      } else if (route.name === 'verify') {
        ICT.mount(root, el('div'))
        currentCleanup = paint(ICT.screens.verify, root)
      } else if (route.name === 'dashboard') {
        root = mountShell(root, 'dashboard')
        currentCleanup = paint(ICT.screens.dashboard, root)
      } else if (route.name === 'attendance') {
        root = mountShell(root, 'attendance')
        currentCleanup = paint(ICT.screens.attendance, root)
      } else if (route.name === 'reports') {
        root = mountShell(root, 'reports')
        currentCleanup = paint(ICT.screens.reports, root)
      } else if (route.name === 'settings') {
        root = mountShell(root, 'settings')
        currentCleanup = paint(ICT.screens.settings, root)
      } else if (route.name === 'list' || route.name === 'detail') {
        var resource = ICT.store.resourceFor(route.resource)
        if (!resource) {
          root = mountShell(root, route.resource)
          ICT.mount(root, ui.pageHead('Module not found', 'There is no module called “' + route.resource + '” in this system.'))
        } else {
          root = mountShell(root, resource.key)
          currentCleanup = paint(route.name === 'list' ? ICT.screens.list : ICT.screens.detail, root, route)
        }
      } else {
        root = mountShell(root, null)
        ICT.mount(root, ui.pageHead('Page not found', 'That address does not exist. Use the menu on the left.'))
      }
    } catch (error) {
      ICT.mount(root, [
        ui.pageHead('Something went wrong on this screen', error && error.message),
        ui.card(null, { body: ui.notice('The rest of the system still works — use the menu to continue. If it keeps happening, tell the club patron what you were doing.', 'error') })
      ])
      if (window.console && console.error) console.error(error)
    }
  }

  function mountShell(root, activeKey) {
    var content = el('div')
    ICT.mount(root, shell(activeKey, content))
    return content
  }

  function paint(screen, root, args) {
    try {
      var maybe = screen(root, args || {})
      return typeof maybe === 'function' ? maybe : null
    } catch (error) {
      ICT.mount(root, [
        ui.pageHead('This screen could not start', String(error && error.message)),
        ui.card(null, { body: ui.notice('Use the menu on the left to open another screen.', 'error') })
      ])
      if (window.console && console.error) console.error(error)
      return null
    }
  }

  window.addEventListener('popstate', render)
  window.addEventListener('ict-club:signed-out', function () {
    if (routeFor(currentPath).name !== 'login') render()
  })

  ICT.nav = {
    go: go,
    render: render,
    query: query,
    parts: parts,
    currentPath: function () { return currentPath },
    requireSignIn: requireSignIn
  }
})()
