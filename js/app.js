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
    var panel = document.getElementById('login-demo');
    if (!panel) return;
    /* These shortcuts exist only while accounts still use the shipped
       demonstration password. They list exactly those accounts, and the panel
       disappears for good once every officer has a password of their own. */
    var pending = Auth.pendingAccounts();
    if (!pending.length) {
      panel.hidden = true;
      panel.innerHTML = '';
      return;
    }
    panel.hidden = false;
    panel.innerHTML =
      '<div class="login-demo-head"><h3>First-time setup</h3>' +
      '<span class="badge badge-warning badge-soft">Set your own passwords</span></div>' +
      '<p class="muted small">' + U.plural(pending.length, 'account') + ' still use the published demonstration password ' +
      '<code>demo1234</code>. Sign in and you will be asked to choose your own — the shortcut disappears once every officer has done so.</p>' +
      '<div class="demo-chips" id="demo-chips"></div>';
    var host = document.getElementById('demo-chips');
    if (!host) return;
    var accounts = pending;
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
      if (user) UI.toast('Demonstration account', user.name + ' must choose a password of their own.', 'info', { duration: 3000 });
      doLogin(username, 'demo1234', true);
    });
  }

  /** Mandatory first-sign-in password: cannot be dismissed until it is done. */
  function openPasswordSetup(user) {
    UI.formModal({
      title: 'Choose your own password', icon: 'key', size: 'sm', dismissible: false,
      subtitle: user.name + ' · ' + user.role,
      formHtml: Forms.render([
        { name: 'password', label: 'New password', type: 'password', required: true, colSpan: 2,
          help: 'At least 8 characters, mixing letters and numbers. Do not reuse the demonstration password.' },
        { name: 'confirm', label: 'Repeat the new password', type: 'password', required: true, colSpan: 2 }
      ]),
      submitLabel: 'Save my password',
      cancelLabel: 'Sign out',
      onOpen: function (c, form) { Forms.init(form); },
      onSubmit: function (values, c) {
        if (values.password !== values.confirm) {
          UI.toast('The two passwords differ', 'Type the same password in both boxes.', 'warning');
          return true;
        }
        UI.toast('Saving', 'Setting your password…', 'info', { duration: 1500 });
        Auth.firstPasswordChange(user.id, values.password).then(function () {
          c.close();
          UI.toast('Your password is set', 'Only you know it now. Keep it safe — an administrator can reset it if you forget it.', 'success', { duration: 6000 });
          renderDemoAccounts();
        }).catch(function (err) {
          UI.toast('Could not set the password', (err && err.message) || 'Try a longer password.', 'error');
        });
        return true;
      }
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
      if (user.mustChangePassword) openPasswordSetup(user);
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
    /* the mandatory change dialog offers "Sign out" instead of Cancel */
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.modal [data-mact="0"]');
      if (!btn) return;
      if (!btn.textContent || btn.textContent.trim() !== 'Sign out') return;
      setTimeout(function () { Auth.logout(); location.reload(); }, 60);
    });

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
    if (fill) fill.addEventListener('click', function () {
      document.getElementById('login-user').value = 'admin';
      document.getElementById('login-pass').value = 'demo1234';
      showFieldError('login-user', '');
      showFieldError('login-pass', '');
      UI.toast('Credentials filled', 'Press “Sign in” to continue as the administrator.', 'info', { duration: 2600 });
      document.getElementById('login-btn').focus();
    });

    document.getElementById('forgot-link').addEventListener('click', forgotPassword);
  }

  /** Real recovery: no email service is wired up, so an administrator resets
   *  the password and the officer chooses their own at the next sign-in. This
   *  dialog states the actual procedure instead of pretending to reset it. */
  function forgotPassword() {
    var admin = Store.all('users').filter(function (u) {
      return u.role === 'Administrator' && u.status !== 'Suspended';
    })[0] || null;
    var s = Store.settings();
    var steps =
      '<p class="muted">There is no email server in this installation, so a password is restored by an administrator rather than by a link.</p>' +
      '<ol class="help-steps mt-2">' +
        '<li><strong>Tell an administrator</strong> you have forgotten your password' + (admin ? ' — ' + U.esc(admin.name) + (admin.phone ? ' (' + U.esc(admin.phone) + ')' : '') + ', the club administrator' : '') + '.</li>' +
        '<li><strong>They reset it</strong> in <span class="mono">Settings → Users → Reset password</span>. The temporary password lasts for one sign-in only.</li>' +
        '<li><strong>You choose your own</strong> the moment you sign in — at least 8 characters mixing letters and numbers.</li>' +
      '</ol>' +
      '<p class="muted small mt-2"><strong>Lost administrator password?</strong> A JSON backup taken while the password was known restores the officer accounts with it (Settings → Data → Restore). With no usable backup, <strong>Reset everything</strong> in Settings → Data rebuilds this browser with the shipped accounts, so the club can start again and restore its records in merge mode.</p>' +
      '<div class="alert alert-info mt-2">' + Icons.svg('shield') +
      '<div>Nobody, not even an administrator, can see your password — only replace it. Keep yours to yourself; every change is written to the audit trail.</div></div>' +
      (s.schoolEmail || s.schoolPhone
        ? '<p class="muted small mt-2">Club office: ' + U.esc([s.schoolEmail, s.schoolPhone].filter(Boolean).join(' · ')) + '</p>' : '');
    UI.modal({
      title: 'Forgotten your password?',
      subtitle: 'How an account is restored',
      icon: 'key', size: 'sm',
      body: steps,
      actions: [
        { label: 'Close', variant: 'primary' }
      ]
    });
  }

  /* ══ Screen switching ════════════════════════════════════════════════ */
  function showLogin() {
    document.getElementById('boot-screen').hidden = true;
    document.getElementById('app-shell').hidden = true;
    document.getElementById('login-screen').hidden = false;
    renderDemoAccounts();          /* the setup shortcut disappears once it is no longer needed */
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
      /* Returns from a Microsoft sign-in (?code=…) and the last chosen backup
         folder are resolved once the data layer is ready. */
      if (global.Cloud && Cloud.graphHandleRedirect) {
        Cloud.graphHandleRedirect().then(function () { if (global.Router) Router.refresh(); });
      }
      if (global.Cloud && Cloud.folderRestore) Cloud.folderRestore(false);
      /* Shared-database syncing (Firebase) — queued locally, pushed when online. */
      if (global.Sync && Sync.init) {
        Sync.init();
        if (Sync.connected() && Sync.settings().syncEnabled) Sync.maybePull(true);
      }
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
