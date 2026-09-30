/**
 * Application shell: sidebar, header, global search, session handling and the
 * route table. This is the only file that knows how the app is assembled.
 */
(function () {
  var ICT = (window.ICT = window.ICT || {})
  var el = ICT.util.el
  var icon = ICT.util.icon
  var ui = ICT.ui

  /* PUBLIC ROUTES (no sign-in needed) */

  ICT.router.add('/verify', () => ICT.views.verify(document.getElementById('app')))
  ICT.router.add('/login', renderLogin)

  /* APP ROUTES */

  ICT.router.add('/', () => shell((host) => ICT.views.dashboard(host)))
  ICT.router.add('/r/:resource', (params) => shell((host) => ICT.views.resource(host, params)))
  ICT.router.add('/r/:resource/:id', (params) => shell((host) => ICT.views.record(host, params)))
  ICT.router.add('/attendance', () => shell((host) => ICT.views.attendance(host)))
  ICT.router.add('/reports', () => shell((host) => ICT.views.reports(host)))
  ICT.router.add('/settings', () => shell((host) => ICT.views.settings(host)))

  var currentCleanup = null

  function renderLogin() {
    if (currentCleanup) currentCleanup()
    if (ICT.store.isSignedIn) {
      ICT.router.go('/', { replace: true })
      return
    }
    ICT.views.login(document.getElementById('app'))
  }

  /** Wraps a screen in the app chrome; sends signed-out visitors to /login. */
  function shell(paint) {
    if (currentCleanup) currentCleanup()
    if (!ICT.store.isSignedIn) {
      ICT.router.go('/login', { replace: true })
      return
    }
    var app = document.getElementById('app')
    var host = el('div')
    var previous = app.firstElementChild && app.firstElementChild.classList.contains('app-shell') ? app.firstElementChild : null
    var mainHost = previous ? previous.querySelector('.main-content') : null

    if (!mainHost) {
      /* Draw the chrome once, then swap only the content area. */
      var built = chrome()
      ICT.util.mount(app, built.shell)
      mainHost = built.mainHost
    }
    ICT.util.mount(mainHost, host)
    document.querySelector('.sidebar') && document.querySelector('.sidebar').classList.remove('is-open')
    markActive()
    paint(host)
  }

  /* ------------------------------------------------------------------ */
  /* Chrome                                                             */
  /* ------------------------------------------------------------------ */

  function chrome() {
    var store = ICT.store
    var user = store.user || {}
    var groups = {}
    ;(store.resources || [])
      .filter((resource) => resource.key !== 'attendance' || true)
      .forEach((resource) => {
        var group = resource.group || 'Records'
        groups[group] = groups[group] || []
        groups[group].push(resource)
      })

    var sidebar = el('aside.sidebar', [
      el('div.sidebar__brand', [
        el('div.sidebar__logo', { text: 'ICT' }),
        el('div', [
          el('div.sidebar__title', { text: store.settings.club_name || 'ICT Club' }),
          el('div.sidebar__subtitle', { text: [store.settings.current_term, store.settings.academic_year].filter(Boolean).join(' • ') || 'Club management' })
        ])
      ]),
      el('nav.sidebar__nav', [
        el('a.nav-item', { href: '/', dataset: { path: '/' } }, [icon('dashboard', 17), el('span', { text: 'Dashboard' })]),
        el('a.nav-item', { href: '/attendance', dataset: { path: '/attendance' } }, [icon('check', 17), el('span', { text: 'Attendance' })]),
        el('a.nav-item', { href: '/reports', dataset: { path: '/reports' } }, [icon('file', 17), el('span', { text: 'Reports Studio' })]),
        ...Object.keys(groups).map((group) =>
          el('div.sidebar__group', [
            el('div.sidebar__group-title', { text: group }),
            ...groups[group].map((resource) =>
              el('a.nav-item', { href: '/r/' + resource.key, dataset: { path: '/r/' + resource.key } }, [
                icon(ICT.RESOURCE_ICONS[resource.key] || resource.icon || 'layers', 17),
                el('span', { text: resource.label })
              ])
            )
          ])
        ),
        el('div.sidebar__group', [
          el('div.sidebar__group-title', { text: 'Administration' }),
          el('a.nav-item', { href: '/settings', dataset: { path: '/settings' } }, [icon('settings', 17), el('span', { text: 'Settings' })])
        ])
      ]),
      el('div.sidebar__foot', [
        el('div.sidebar__user', [
          el('span.avatar.avatar--sm', { text: ICT.util.initials(user.name) }),
          el('div', [
            el('div.sidebar__title', { text: user.name || 'Signed in' }),
            el('div.sidebar__subtitle', { text: user.role === 'admin' ? 'Administrator' : user.role === 'cabinet' ? 'Executive' : 'Member' })
          ])
        ]),
        ui.button('Sign out', { variant: 'ghost', size: 'sm', icon: 'logout', onClick: () => ICT.store.signOut().then(() => ICT.router.go('/login', { replace: true, force: true })) })
      ])
    ])

    var searchInput = el('input.input', { placeholder: 'Search students, meetings, courses, dues…', autocomplete: 'off' })
    var searchResults = el('div.search-results.hidden')

    var search = ICT.util.debounce(async (value) => {
      if (!value || value.trim().length < 2) {
        searchResults.classList.add('hidden')
        return
      }
      try {
        var res = await ICT.api.search(value.trim())
        var groupsFound = (res && res.data) || []
        ICT.util.clear(searchResults)
        if (!groupsFound.length) {
          searchResults.appendChild(el('div.search-results__empty', { text: 'Nothing matched “' + value + '”' }))
        } else {
          groupsFound.forEach((group) => {
            searchResults.appendChild(el('div.search-results__group', { text: group.label || group.resource }))
            ;(group.rows || []).slice(0, 5).forEach((row) =>
              searchResults.appendChild(el('a.search-results__item', {
                href: '/r/' + group.resource + '/' + row.id,
                onclick: () => {
                  searchInput.value = ''
                  searchResults.classList.add('hidden')
                }
              }, [
                el('span', { text: row.title || row.label || row.full_name || ('#' + row.id) }),
                row.subtitle ? el('span.small.muted', { text: row.subtitle }) : null
              ]))
            )
          })
        }
        searchResults.classList.remove('hidden')
      } catch (error) {
        /* a failed search must not disturb the screen */
      }
    }, 250)

    searchInput.addEventListener('input', (event) => search(event.target.value))
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.search-wrap')) searchResults.classList.add('hidden')
    })

    var header = el('header.topbar', [
      ui.button('Menu', { variant: 'ghost', iconOnly: true, icon: 'menu', onClick: () => {
        var sidebarNode = document.querySelector('.sidebar')
        if (sidebarNode) sidebarNode.classList.toggle('is-open')
      } }),
      el('div.search-wrap', [icon('search', 16, 'search-icon'), searchInput, searchResults]),
      el('div.topbar__actions', [
        el('a.nav-item.ghost', { href: '/verify', title: 'Verify a certificate' }, [icon('shield', 16), el('span.only-lg', { text: 'Verify' })]),
        el('span.avatar.avatar--sm', { title: user.name || '', text: ICT.util.initials(user.name) })
      ])
    ])

    var mainHost = el('main.main-content')
    var shellNode = el('div.app-shell', [sidebar, el('div.main', [header, mainHost])])
    return { shell: shellNode, mainHost: mainHost }
  }

  function markActive() {
    var path = location.pathname
    document.querySelectorAll('.sidebar .nav-item').forEach((node) => {
      var target = node.dataset.path
      var active = target === '/' ? path === '/' : path === target || path.startsWith(target + '/')
      node.classList.toggle('is-active', active)
    })
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                               */
  /* ------------------------------------------------------------------ */

  async function boot() {
    try {
      await ICT.store.boot()
    } catch (error) {
      var app = document.getElementById('app')
      ICT.util.mount(app, el('div.boot-error', ui.empty('Cannot reach the club system server',
        error.message,
        ui.button('Try again', { icon: 'refresh', onClick: () => location.reload() }))))
      return
    }

    ICT.store.on('session', () => {
      if (!ICT.store.isSignedIn && !['/login', '/verify'].includes(location.pathname)) {
        ICT.router.go('/login', { replace: true, force: true })
      }
    })

    /* Public pages must stay reached even when signed in. */
    if (['/login', '/verify'].includes(location.pathname) && ICT.store.isSignedIn && location.pathname === '/login') {
      ICT.router.go('/', { replace: true, force: true })
    }

    ICT.router.start((handler, params) => handler(params))
    document.body.classList.add('ready')
  }

  document.addEventListener('DOMContentLoaded', boot)
})()
