/**
 * Path-based router (no history library): the server already serves index.html
 * for every route, so /r/members/3, /attendance, /settings and the public
 * /verify page all work — and bookmarking any screen works too.
 *
 * Routes are matched by pattern, e.g. '/r/:resource/:id'.
 */
(function () {
  var ICT = (window.ICT = window.ICT || {})
  var routes = []
  var current = null
  var onChange = null

  function add(pattern, handler, options) {
    var names = []
    var regex = new RegExp(
      '^' +
        pattern
          .replace(/\/:([A-Za-z_]+)/g, (_, name) => {
            names.push(name)
            return '/([^/]+)'
          })
          .replace(/\*/g, '.*') +
        '$'
    )
    routes.push({ pattern: pattern, regex: regex, names: names, handler: handler, options: options || {} })
  }

  function match(path) {
    for (var i = 0; i < routes.length; i += 1) {
      var route = routes[i]
      var result = route.regex.exec(path)
      if (result) {
        var params = {}
        route.names.forEach((name, index) => (params[name] = decodeURIComponent(result[index + 1])))
        return { route: route, params: params }
      }
    }
    return null
  }

  function go(path, options) {
    options = options || {}
    if (path === location.pathname + location.search && !options.force) return
    if (options.replace) history.replaceState({}, '', path)
    else history.pushState({}, '', path)
    resolve()
  }

  /** Back/forward and direct links land here. */
  function resolve() {
    var path = location.pathname
    var found = match(path)
    if (!found) {
      if (path !== '/') return go('/', { replace: true })
      found = match('/')
    }
    if (!found) return
    current = { path: path, params: found.params, pattern: found.route.pattern }
    if (onChange) onChange(found.route.handler, found.params, found.route.options)
  }

  function start(handler) {
    onChange = handler
    window.addEventListener('popstate', resolve)
    document.addEventListener('click', (event) => {
      var link = event.target.closest('a[href]')
      if (!link) return
      var href = link.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('#') || link.target === '_blank') return
      if (link.dataset.external) return
      event.preventDefault()
      go(href, { replace: link.dataset.replace === 'true' })
    })
    resolve()
  }

  function query() {
    return new URLSearchParams(location.search)
  }

  ICT.router = { add, go, start, resolve, query, get current() { return current } }
})()
