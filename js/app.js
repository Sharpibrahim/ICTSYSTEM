/* ==========================================================================
   MRHS ICT CLUB MASTER — js/app.js
   Application bootstrap: icon sprite, data layer, session restore, login
   screen wiring and the hand-off to the shell + router.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;
  var booted = false;

  function bootStatus(text) {
    var el = document.getElementById('boot-status');
    if (el) el.textContent = text;
  }

  /* ══ Login screen ════════════════════════════════════════════════════ */
  function renderDemoAccounts() {
    var host = document.getElementById('demo-chips');
    if (!host) return;
    var accounts = Store.all('users');
    host.innerHTML = accounts.map(function (u) {
      var info = Auth.roleInfo(u.role);
      return '<button type="button" class="demo-chip" data-demo="' + U.attr(u.username) + '">' +
        UI.avatar(u.name, 'sm') +
        '<span><strong>' + U.esc(u.name) + '</strong><small>' + U.esc(info.label) + ' · ' + U.esc(u.username) + '</small></span>' +
        Icons.svg('log-in', { class: 'chev' }) + '</button>';
    }).join('');
    host.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-demo]');
      if (!chip) return;
      var username = chip.getAttribute('data-demo');
      var user = U.findBy(accounts, 'username', username);
      document.getElementById('login-user').value = username;
      document.getElementById('login-pass').value = 'demo1234';
      if (user) UI.toast('Demo account selected', 'Signing in as ' + user.name + ' (' + user.role + ').', 'info', { duration: 2600 });
      doLogin(username, 'demo1234', true);
    });
  }

  function showFieldError(id, message) {
    var input = document.getElementById(id);
    var box = document.getElementById(id + '-err');
    if (input) input.classList.toggle('invalid', !!message);
    if (box) {
      box.hidden = !message;
      box.innerHTML = message ? Icons.svg('alert-circle') + ' ' + U.esc(message) : '';
      box.className = 'field-error';
    }
  }

  function doLogin(identifier, password, remember) {
    var btn = document.getElementById('login-btn');
    var alertBox = document.getElementById('login-alert');
    alertBox.hidden = true;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span><span>Signing in…</span>'; }
    Auth.login(identifier, password, remember).then(function () {
      if (btn) { btn.disabled = false; btn.innerHTML = Icons.svg('log-in', { class: 'btn-ico' }) + '<span>Sign in</span>'; }
      var user = Auth.currentUser();
      UI.toast('Welcome, ' + user.name.split(' ')[0], 'You are signed in as ' + user.role + '.', 'success');
      showApp();
    }).catch(function (err) {
      if (btn) { btn.disabled = false; btn.innerHTML = Icons.svg('log-in', { class: 'btn-ico' }) + '<span>Sign in</span>'; }
      alertBox.hidden = false;
      alertBox.innerHTML = Icons.svg('alert-circle') + '<div><strong>Sign-in failed</strong>' + U.esc(err.message || 'Please check your credentials and try again.') + '</div>';
      showFieldError('login-pass', '');
      document.getElementById('login-pass').focus();
    });
  }

  function initLogin() {
    renderDemoAccounts();

    var form = document.getElementById('login-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var identifier = document.getElementById('login-user').value.trim();
      var password = document.getElementById('login-pass').value;
      var remember = document.getElementById('remember-me').checked;
      showFieldError('login-user', '');
      showFieldError('login-pass', '');
      if (!identifier) { showFieldError('login-user', 'Enter your username or email address.'); return; }
      if (!password) { showFieldError('login-pass', 'Enter your password.'); return; }
      doLogin(identifier, password, remember);
    });

    var toggle = document.getElementById('toggle-pass');
    toggle.addEventListener('click', function () {
      var input = document.getElementById('login-pass');
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggle.setAttribute('aria-pressed', String(show));
      toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      toggle.innerHTML = Icons.svg(show ? 'eye-off' : 'eye');
    });

    var fill = document.getElementById('fill-credentials');
    fill.addEventListener('click', function () {
      document.getElementById('login-user').value = 'admin';
      document.getElementById('login-pass').value = 'demo1234';
      showFieldError('login-user', '');
      showFieldError('login-pass', '');
      UI.toast('Credentials filled', 'Press “Sign in” to continue as the administrator.', 'info', { duration: 2600 });
      document.getElementById('login-btn').focus();
    });

    document.getElementById('forgot-link').addEventListener('click', forgotPassword);
  }

  function forgotPassword() {
    UI.formModal({
      title: 'Reset your password',
      subtitle: 'Prototype password recovery — no email is sent from this build.',
      icon: 'key',
      size: 'sm',
      formHtml: Forms.render([
        { name: 'identifier', label: 'Username or email address', type: 'text', required: true, placeholder: 'e.g. secretary or secretary@mrhsict.ac.ug', colSpan: 2 },
        { name: 'password', label: 'New password', type: 'password', required: true, minLength: 6, help: 'At least 6 characters.', colSpan: 2 },
        { name: 'confirm', label: 'Confirm new password', type: 'password', required: true, colSpan: 2 }
      ]),
      submitLabel: 'Reset password',
      submitIcon: 'key',
      onOpen: function (c, form) { Forms.init(form); },
      validate: function (data) {
        var errors = {};
        if (data.password !== data.confirm) errors.confirm = 'The two passwords do not match.';
        if (data.password && data.password.length < 6) errors.password = 'Use at least 6 characters.';
        if (!Auth.findAccount(data.identifier)) errors.identifier = 'No account was found with that username or email.';
        return errors;
      },
      onSubmit: function (data) {
        return Auth.resetPassword(data.identifier, data.password).then(function () {
          UI.toast('Password updated', 'You can now sign in with your new password.', 'success');
          document.getElementById('login-user').value = data.identifier;
          document.getElementById('login-pass').value = '';
          document.getElementById('login-pass').focus();
          return true;
        });
      }
    });
  }

  /* ══ Screen switching ════════════════════════════════════════════════ */
  function showLogin() {
    document.getElementById('boot-screen').hidden = true;
    document.getElementById('app-shell').hidden = true;
    document.getElementById('login-screen').hidden = false;
    document.body.setAttribute('data-route', 'login');
    document.title = 'Sign in · MRHS ICT CLUB MASTER';
    var userField = document.getElementById('login-user');
    if (userField && !userField.value) userField.focus();
    if (global.UI) { UI.closeDropdowns(); }
  }

  function showApp() {
    document.getElementById('boot-screen').hidden = true;
    document.getElementById('login-screen').hidden = true;
    document.getElementById('app-shell').hidden = false;
    document.body.setAttribute('data-route', 'dashboard');
    Shell.init();
    if (!booted) {
      Router.start();
      booted = true;
    } else {
      Shell.refresh();
      Router.refresh();
    }
  }

  /* ══ Boot ════════════════════════════════════════════════════════════ */
  function boot() {
    Icons.inject();
    UI.initGlobals();
    Charts.bind();
    bootStatus('Loading club records…');

    Store.init().then(function () {
      bootStatus('Preparing accounts and permissions…');
      return Auth.init();
    }).then(function () {
      bootStatus('Applying club settings…');
      if (global.CertBG && CertBG.migrateDefault) CertBG.migrateDefault();
      var user = Auth.restore();
      initLogin();
      if (user) {
        showApp();
      } else {
        showLogin();
      }
      // React to session changes (login / logout from anywhere in the app)
      Store.on(function (evt) {
        if (!evt) return;
        if (evt.type === 'logout') showLogin();
        if (evt.type === 'login') showApp();
      });
      window.addEventListener('beforeunload', function () {});
    }).catch(function (err) {
      console.error('[App] boot failed', err);
      bootStatus('The application could not start: ' + (err && err.message ? err.message : 'unknown error'));
      var boot = document.getElementById('boot-screen');
      if (boot) {
        boot.innerHTML = '<div class="boot-inner">' +
          '<div class="boot-logo" style="animation:none">' + Icons.svg('alert-triangle', { size: 44 }) + '</div>' +
          '<h1 class="boot-title">START-UP PROBLEM</h1>' +
          '<p class="boot-sub">' + U.esc(err && err.message ? err.message : 'The local data layer could not be initialised.') + '</p>' +
          '<div style="display:flex;gap:10px;margin-top:18px">' +
          '<button class="btn btn-primary" onclick="location.reload()">Reload the application</button>' +
          '<button class="btn btn-outline" id="boot-reset">Reset local data</button>' +
          '</div></div>';
        var reset = document.getElementById('boot-reset');
        if (reset) reset.addEventListener('click', function () {
          try {
            Object.keys(localStorage).forEach(function (k) {
              if (k.indexOf('mrhs-ict-club-master') === 0) localStorage.removeItem(k);
            });
          } catch (e) {}
          location.reload();
        });
      }
    });
  }

  /* Global error safety net */
  window.addEventListener('error', function (e) {
    if (e && e.message && /ResizeObserver/.test(e.message)) return;
    console.error('[App] uncaught error', e.error || e.message);
  });
  window.addEventListener('unhandledrejection', function (e) {
    console.error('[App] unhandled promise rejection', e.reason);
  });

  global.App = {
    boot: boot, showLogin: showLogin, showApp: showApp, forgotPassword: forgotPassword
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
