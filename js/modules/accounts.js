/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/accounts.js
   My Account — the signed-in officer's own page.

   Every role sees it, no matter how little else they may open: their details,
   their password, exactly which modules they may open and what they may do
   there, and the entries they themselves have written to the audit trail.
   Nothing here can change a role or another officer's account — that stays in
   Settings → Users, for administrators only.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils, Store = global.Store, UI = global.UI, Icons = global.Icons;
  var Forms = global.Forms, Auth = global.Auth;

  var ACTION_LABELS = {
    create: 'Added', update: 'Edited', delete: 'Deleted',
    reset: 'Reset', security: 'Security', import: 'Imported'
  };
  var ACTION_TONES = {
    create: 'success', update: 'info', delete: 'danger', reset: 'warning',
    security: 'warning', import: 'neutral'
  };
  var RIGHT_LABELS = {
    none: 'No access', view: 'View only', manage: 'Add & edit',
    full: 'Full control', 'delete+': 'Full control'
  };

  function me() { return Auth.currentUser(); }

  /* ── My details ──────────────────────────────────────────────────────── */
  function detailsCard(user) {
    var role = Auth.roleInfo(user.role);
    var member = user.memberId ? Store.find('members', user.memberId) : null;
    return UI.card({
      title: 'My details', icon: 'user-cog', sub: 'Your name and contact information',
      actions: '<button type="button" class="btn btn-outline btn-sm" data-acc="edit-details">' +
        Icons.svg('edit', { class: 'btn-ico' }) + 'Edit my details</button>',
      body: '<div class="profile-head">' +
          UI.avatar(user.name, 'lg') +
          '<div class="profile-head-info">' +
            '<h3>' + U.esc(user.name) + '</h3>' +
            '<p class="muted small">' + U.esc(role.label || user.role) + ' · @' + U.esc(user.username) + '</p>' +
          '</div>' +
          UI.statusBadge(user.status || 'Active') +
        '</div>' +
        '<div class="kv-grid mt-2">' +
          kv('Username', '<span class="mono">' + U.esc(user.username) + '</span>') +
          kv('Email', user.email ? '<a class="link-btn" href="mailto:' + U.attr(user.email) + '">' + U.esc(user.email) + '</a>' : '<span class="muted">Not given</span>') +
          kv('Telephone', user.phone ? U.esc(user.phone) : '<span class="muted">Not given</span>') +
          kv('Role', UI.badge(user.role, role.tone || 'primary')) +
          kv('Account created', U.fmtDate(user.createdAt, 'long')) +
          kv('Last sign-in', user.lastLogin ? U.fmtDateTime(user.lastLogin) : 'First session') +
          kv('Member record', member
            ? '<a class="link-btn" href="#/members/' + member.id + '">' + Icons.svg('external-link') + ' ' + U.esc(member.fullName) + '</a>'
            : '<span class="muted">Not linked to a member</span>', true) +
        '</div>' +
        (user.mustChangePassword
          ? '<div class="alert alert-warning mt-2">' + Icons.svg('alert-triangle') +
            '<div>You are still using a temporary password. Choose your own in the Password panel.</div></div>'
          : '')
    });
  }
  function kv(label, value, html) {
    return '<div class="kv"><span class="kv-label">' + U.esc(label) + '</span>' +
      '<span class="kv-value">' + (html ? value : U.esc(value)) + '</span></div>';
  }

  /* ── Password ────────────────────────────────────────────────────────── */
  function passwordCard(user) {
    return UI.card({
      title: 'Password', icon: 'key', sub: 'Only you know it',
      body: '<p class="muted small">Change it whenever you wish. You need your current password, and the new one must be at least 8 characters mixing letters and numbers.</p>' +
        '<div class="grid cols-2 mt-2">' +
          '<div class="field"><label for="cp-current">Current password</label><input class="input" id="cp-current" type="password" autocomplete="current-password"></div>' +
          '<div class="field"><label for="cp-new">New password</label><input class="input" id="cp-new" type="password" autocomplete="new-password"></div>' +
        '</div>' +
        '<div class="strength mt-1" id="cp-strength" hidden>' +
          '<div class="strength-bar"><span id="cp-strength-fill"></span></div>' +
          '<span class="small muted" id="cp-strength-label"></span>' +
        '</div>' +
        '<div class="field mt-1"><label for="cp-confirm">Repeat the new password</label><input class="input" id="cp-confirm" type="password" autocomplete="new-password"></div>' +
        '<div class="flex gap-1 mt-2">' +
          '<button type="button" class="btn btn-primary" data-acc="change-pass">' + Icons.svg('save', { class: 'btn-ico' }) + 'Save the new password</button>' +
        '</div>' +
        '<p class="muted xs mt-2">Last changed: ' + (user.passwordChangedAt ? U.fmtDateTime(user.passwordChangedAt) : 'not recorded') +
        '. Forgot it? An administrator can issue a temporary password (Settings → Users).</p>'
    });
  }

  /* ── Permissions ─────────────────────────────────────────────────────── */
  function permissionsCard(user) {
    var mods = Auth.modules(user.role);
    var all = (Auth.MODULES || []).slice();
    var rows = all.map(function (m) {
      var level = mods === '*' ? (m === 'settings' || m === 'users' ? 'full' : 'full') : Auth.level(user.role, m);
      var allowed = mods === '*' || (mods || []).indexOf(m) > -1;
      return '<tr><td>' + U.esc(U.titleCase(String(m).replace(/-/g, ' '))) + '</td>' +
        '<td>' + (allowed ? UI.badge(RIGHT_LABELS[level] || U.titleCase(level || 'view'), level === 'none' ? 'neutral' : (level === 'full' || level === 'manage' ? 'success' : 'info')) : '<span class="muted small">Not included</span>') + '</td></tr>';
    }).join('');
    return UI.card({
      title: 'What I may do', icon: 'shield', sub: 'Access rights for the ' + U.esc(user.role) + ' role',
      body: '<p class="muted small">Set by the club, not by you. To change a role, ask an administrator.</p>' +
        '<div class="scroll-y mt-2"><table class="stat-table"><thead><tr><th>Module</th><th>Rights</th></tr></thead><tbody>' +
        rows + '</tbody></table></div>'
    });
  }

  /* ── My activity ─────────────────────────────────────────────────────── */
  function activityCard(user) {
    var mine = (Store.all('auditLog') || []).filter(function (e) { return String(e.user || '') === String(user.username); });
    var body;
    if (!mine.length) {
      body = UI.emptyState({
        icon: 'history', title: 'Nothing recorded yet',
        message: 'Every record you add, edit or delete is listed here with its date and time.'
      });
    } else {
      body = UI.timeline(mine.slice(0, 18).map(function (e) {
        var changed = e.meta && e.meta.changed && e.meta.changed.length
          ? e.meta.changed.map(function (k) { return U.titleCase(k); }).join(', ') : '';
        return {
          icon: e.action === 'delete' ? 'trash' : (e.action === 'create' ? 'plus' : 'edit'),
          tone: ACTION_TONES[e.action] || 'neutral',
          title: (ACTION_LABELS[e.action] || U.titleCase(e.action || '')) + ' ' + U.titleCase(String(e.collection || '').replace(/-/g, ' ')) +
            (e.label ? ': ' + e.label : ''),
          text: changed ? 'Changed: ' + U.esc(changed) : '',
          time: U.timeAgo(e.at)
        };
      })) + (mine.length > 18 ? '<p class="muted small mt-1">Showing your 18 most recent entries of ' + mine.length + '.</p>' : '');
    }
    return UI.card({
      title: 'My recent activity', icon: 'history', sub: mine.length + ' entr' + (mine.length === 1 ? 'y' : 'ies') + ' written by you',
      body: body
    });
  }

  /* ── Editing ─────────────────────────────────────────────────────────── */
  function editDetails(user) {
    UI.formModal({
      title: 'Edit my details', subtitle: 'Name, email and telephone', icon: 'user-cog', size: 'sm',
      formHtml: Forms.render([
        { name: 'name', label: 'Full name', type: 'text', required: true, value: user.name, colSpan: 2 },
        { name: 'email', label: 'Email', type: 'email', value: user.email, colSpan: 2 },
        { name: 'phone', label: 'Telephone', type: 'text', value: user.phone, colSpan: 2 }
      ]),
      submitLabel: 'Save my details',
      onOpen: function (c, form) { Forms.init(form); },
      onSubmit: function (data) {
        Store.update('users', user.id, { name: data.name, email: data.email, phone: data.phone });
        UI.toast('Details saved', 'Your account information is up to date.', 'success');
        Shell.refresh();
        Router.refresh();
        return true;
      }
    });
  }

  function changePassword(user) {
    var current = document.getElementById('cp-current');
    var next = document.getElementById('cp-new');
    var again = document.getElementById('cp-confirm');
    function fail(field, message) {
      UI.toast('Could not change the password', message, 'warning');
      if (field) field.focus();
    }
    if (!current.value) return fail(current, 'Type your current password.');
    if (!next.value) return fail(next, 'Type the new password you want.');
    if (next.value !== again.value) return fail(again, 'The two new passwords do not match.');
    var problem = Auth.passwordProblem(next.value, user);
    if (problem) return fail(next, problem);
    Auth.changePassword(user.id, current.value, next.value).then(function () {
      current.value = ''; next.value = ''; again.value = '';
      document.getElementById('cp-strength').hidden = true;
      UI.toast('Password changed', 'Use your new password from now on. The change is recorded in the audit trail.', 'success', { duration: 6000 });
      Shell.refresh();
      Router.refresh();
    }).catch(function (err) {
      fail(current, (err && err.message) || 'The current password is not correct.');
    });
  }

  function page() {
    var user = me();
    if (!user) return UI.restricted('dashboard');
    var pending = Auth.pendingAccounts();
    var body = '<div class="page">' +
      UI.pageHeader({
        title: 'My account', icon: 'user-cog',
        subtitle: 'Your details, your password and everything the club records about your use of the system.',
        actions: '<a class="btn btn-outline" href="#/dashboard">' + Icons.svg('dashboard', { class: 'btn-ico' }) + 'Back to the dashboard</a>'
      }) +
      (pending.length
        ? '<div class="alert alert-warning mt-2">' + Icons.svg('shield') +
          '<div><strong>' + U.plural(pending.length, 'account') + ' here still use the shipped demonstration password.</strong> ' +
          'The published password is written in this project\u2019s instructions, so anyone who has read them can sign in as ' +
          'those accounts and change club records. Each officer should set their own password as soon as possible' +
          (Auth.can('settings', 'delete') ? ' — the <a class="link-btn" href="#/audit">audit trail</a> shows who has.' : '.') + '</div></div>'
        : '') +
      '<div class="grid cols-2 mt-2" style="grid-template-columns:minmax(0,1.35fr) minmax(0,1fr)">' +
        '<div style="display:grid;gap:18px;align-content:start">' +
          detailsCard(user) +
          passwordCard(user) +
        '</div>' +
        '<div style="display:grid;gap:18px;align-content:start">' +
          activityCard(user) +
          permissionsCard(user) +
        '</div>' +
      '</div>' +
    '</div>';
    return body;
  }

  Router.view('/account', {
    title: 'My account', icon: 'user-cog',
    render: page,
    mount: function (ctx, root) {
      var user = me();
      if (!user) return;
      root.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-acc]');
        if (!btn) return;
        var what = btn.getAttribute('data-acc');
        if (what === 'edit-details') editDetails(me() || user);
        if (what === 'change-pass') changePassword(me() || user);
      });
      var next = root.querySelector('#cp-new');
      if (next) {
        next.addEventListener('input', function () {
          var meter = root.querySelector('#cp-strength');
          var fill = root.querySelector('#cp-strength-fill');
          var label = root.querySelector('#cp-strength-label');
          if (!meter) return;
          if (!next.value) { meter.hidden = true; return; }
          meter.hidden = false;
          var s = Auth.passwordStrength(next.value);
          fill.style.width = Math.max(6, s.score * 20) + '%';
          fill.className = 's-' + s.score;
          label.textContent = s.label + (s.score < 3 ? ' — mix letters, numbers and a symbol' : '');
        });
      }
    }
  });

  global.Modules = global.Modules || {};
  global.Modules.Accounts = { page: page, editDetails: editDetails };
})(window);
