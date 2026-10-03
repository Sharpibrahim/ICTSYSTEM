/* ==========================================================================
   MRHS ICT CLUB MASTER — js/core/router.js
   Hash based router with parameterised routes, permission awareness,
   breadcrumbs, document titles and error boundaries.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;
  var routes = [];
  var current = null;
  var listeners = [];

  /* ── Route registration ───────────────────────────────────────────────── */
  /**
   * Router.view('/members/:id', {
   *   title: 'Member profile', icon: 'user', module: 'members',
   *   parent: '/members', parentLabel: 'Members',
   *   render: function (ctx) { return html },
   *   mount: function (ctx, root) {}
   * })
   */
  function view(path, config) {
    var keys = [];
    var rx = new RegExp('^' + path.replace(/\/:([A-Za-z0-9_]+)/g, function (m, k) { keys.push(k); return '/([^/]+)'; })
      .replace(/\/$/, '') + '/?$');
    routes.push({ path: path, rx: rx, keys: keys, config: config || {} });
    return routes[routes.length - 1];
  }

  function match(path) {
    for (var i = 0; i < routes.length; i++) {
      var r = routes[i];
      var m = path.match(r.rx);
      if (!m) continue;
      var params = {};
      r.keys.forEach(function (k, idx) { params[k] = decodeURIComponent(m[idx + 1]); });
      return { route: r, params: params, config: r.config };
    }
    return null;
  }

  /* ── Navigation ───────────────────────────────────────────────────────── */
  function currentPath() {
    var hash = location.hash.replace(/^#/, '');
    if (!hash) return '/dashboard';
    var q = hash.indexOf('?');
    return q === -1 ? hash : hash.slice(0, q);
  }
  function currentQuery() {
    var hash = location.hash.replace(/^#/, '');
    var q = hash.indexOf('?');
    var out = {};
    if (q === -1) return out;
    hash.slice(q + 1).split('&').forEach(function (pair) {
      if (!pair) return;
      var bits = pair.split('=');
      out[decodeURIComponent(bits[0])] = decodeURIComponent(bits[1] || '');
    });
    return out;
  }
  function go(path, opts) {
    opts = opts || {};
    if (opts.replace) location.replace('#' + path);
    else location.hash = path;
    if (opts.state) history.replaceState(opts.state, '', '#' + path);
  }
  function back() { history.length > 1 ? history.back() : go('/dashboard'); }
  function refresh() { render(true); }

  function onChange(fn) { listeners.push(fn); }
  function emitChange(ctx) { listeners.forEach(function (l) { try { l(ctx); } catch (e) {} }); }

  /* ── Rendering ────────────────────────────────────────────────────────── */
  function shellEl(name) { return document.getElementById(name); }

  function setTitle(ctx) {
    var c = ctx.config || {};
    var parts = [];
    if (c.title) parts.push(typeof c.title === 'function' ? c.title(ctx) : c.title);
    else parts.push(U.titleCase(ctx.path.split('/')[1] || 'Dashboard'));
    parts.push('MRHS ICT CLUB MASTER');
    document.title = parts.join(' · ');
  }

  function renderError(err, ctx) {
    console.error('[Router] view failed', err);
    return '<div class="page">' + UI.emptyState({
      icon: 'alert-triangle',
      title: 'This page could not be displayed',
      message: (err && err.message) ? err.message : 'An unexpected error occurred while building the view.',
      actions: '<button type="button" class="btn btn-primary" data-retry>' + Icons.svg('refresh', { class: 'btn-ico' }) + 'Try again</button>' +
        '<a class="btn btn-outline" href="#/dashboard">' + Icons.svg('dashboard', { class: 'btn-ico' }) + 'Go to dashboard</a>'
    }) + '</div>';
  }

  function render(force) {
    var path = currentPath();
    var query = currentQuery();
    var found = match(path);
    var root = shellEl('view-root');
    if (!root) return;

    if (!found) {
      var shell = shellEl('app-shell');
      if (!shell || shell.hidden) return;
      root.innerHTML = '<div class="page">' + UI.emptyState({
        icon: 'compass',
        title: 'Page not found',
        message: 'The address “' + U.esc(path) + '” does not match any module in MRHS ICT Club Master.',
        actions: '<a class="btn btn-primary" href="#/dashboard">' + Icons.svg('dashboard', { class: 'btn-ico' }) + 'Back to dashboard</a>'
      }) + '</div>';
      document.body.setAttribute('data-route', 'not-found');
      if (global.Shell) Shell.setActive(null, null);
      return;
    }

    var ctx = Object.assign({ path: path, query: query, params: found.params, config: found.config, route: found.route }, found);
    current = ctx;
    document.body.setAttribute('data-route', path.split('/')[1] || 'dashboard');
    setTitle(ctx);
    if (global.Shell) Shell.setActive(path, ctx);

    // Permission gate
    var moduleKey = ctx.config.module;
    if (moduleKey && !Auth.can(moduleKey, 'view')) {
      root.innerHTML = UI.restricted(moduleKey);
      emitChange(ctx);
      return;
    }

    // Optional per-route guard (e.g. must be signed in)
    if (ctx.config.guard && ctx.config.guard(ctx) === false) return;

    var html;
    try {
      html = ctx.config.render ? ctx.config.render(ctx) : '';
    } catch (e) {
      root.innerHTML = renderError(e, ctx);
      return;
    }

    if (html instanceof Node) {
      root.innerHTML = '';
      root.appendChild(html);
    } else {
      root.innerHTML = html || '<div class="page">' + UI.emptyState({ title: 'Empty view', message: 'This module has no content to show.' }) + '</div>';
    }

    try {
      if (ctx.config.mount) ctx.config.mount(ctx, root);
    } catch (e) {
      console.error('[Router] mount failed', e);
      UI.toast('Interaction error', 'Part of this page failed to initialise. Reload to try again.', 'error');
    }

    var retry = root.querySelector('[data-retry]');
    if (retry) retry.addEventListener('click', function () { render(true); });

    emitChange(ctx);
  }

  function start() {
    if (!location.hash) location.replace('#/dashboard');
    window.addEventListener('hashchange', function () { render(); });
    render();
  }

  function rel(path) {
    return '#' + path;
  }
  function activeGroup() {
    var path = currentPath();
    var seg = path.split('/')[1] || 'dashboard';
    return seg;
  }

  global.Router = {
    view: view, add: view, go: go, back: back, refresh: refresh, start: start,
    render: render, current: function () { return current; }, currentPath: currentPath,
    currentQuery: currentQuery, onChange: onChange, rel: rel, activeGroup: activeGroup,
    routes: routes
  };
})(window);
