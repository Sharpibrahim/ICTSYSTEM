/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/settings.js
   Club configuration: club information, academic period, appearance,
   user accounts and roles, notification preferences and data management.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;
  var tab = 'club';

  function s() { return Store.settings(); }

  function field(name, label, value, opts) {
    opts = opts || {};
    return '<div class="field' + (opts.full ? ' col-2' : '') + '">' +
      '<label for="set-' + name + '">' + U.esc(label) + '</label>' +
      (opts.textarea
        ? '<textarea id="set-' + name + '" name="' + name + '" rows="' + (opts.rows || 3) + '">' + U.esc(value || '') + '</textarea>'
        : '<input id="set-' + name + '" name="' + name + '" type="' + (opts.type || 'text') + '"' +
          (opts.min !== undefined ? ' min="' + opts.min + '"' : '') + (opts.max !== undefined ? ' max="' + opts.max + '"' : '') +
          (opts.step !== undefined ? ' step="' + opts.step + '"' : '') +
          ' value="' + U.attr(value === undefined || value === null ? '' : value) + '"' +
          (opts.placeholder ? ' placeholder="' + U.attr(opts.placeholder) + '"' : '') + '>') +
      (opts.help ? '<p class="help">' + U.esc(opts.help) + '</p>' : '') +
      '</div>';
  }
  function switchField(name, label, checked, help) {
    return '<div class="field col-2"><label class="switch-row"><input type="checkbox" name="' + name + '" id="set-' + name + '"' + (checked ? ' checked' : '') + '>' +
      '<span>' + U.esc(label) + (help ? '<small class="muted">' + U.esc(help) + '</small>' : '') + '</span></label></div>';
  }

  /* ══ Club information ═════════════════════════════════════════════════ */
  function clubTab() {
    var c = s();
    return UI.card({
      title: 'Club information', icon: 'building',
      sub: 'These details appear on printed documents, certificates and ID cards.',
      body: '<form id="settings-form" class="form-grid">' +
          field('clubName', 'Club name', c.clubName, { help: 'Short name used across the app.' }) +
          field('schoolName', 'School name', c.schoolName) +
          field('clubFullName', 'Full club name', c.clubFullName, { full: true }) +
          field('motto', 'Club motto', c.motto) +
          field('email', 'Club email', c.email, { type: 'email' }) +
          field('phone', 'Telephone', c.phone) +
          field('address', 'Postal address', c.address, { full: true }) +
          field('description', 'Club description', c.description, { textarea: true, rows: 4, full: true }) +
          field('academicYear', 'Academic year', c.academicYear) +
          field('currentTerm', 'Current term', c.currentTerm) +
          field('termStart', 'Term starts', c.termStart, { type: 'date' }) +
          field('termEnd', 'Term ends', c.termEnd, { type: 'date' }) +
          field('currency', 'Currency', c.currency, { help: 'Used on all money values, e.g. UGX or USD.' }) +
          field('meetingDefaultVenue', 'Default meeting venue', c.meetingDefaultVenue) +
          field('reportSignatory', 'Reports signed by', c.reportSignatory) +
          field('memberIdPrefix', 'Member ID prefix', c.memberIdPrefix, { help: 'New members are numbered from this prefix, e.g. MRHS-ICT-M001.' }) +
          field('certificatePrefix', 'Certificate prefix', c.certificatePrefix, { help: 'Certificates read PREFIX-YEAR-CERT-0000.' }) +
        '</form>' +
        '<div class="flex gap-1 wrap mt-2">' +
          (Auth.can('settings', 'edit') ? '<button type="button" class="btn btn-primary" data-set="save-club">' + Icons.svg('save', { class: 'btn-ico' }) + 'Save settings</button>' : '') +
          '<button type="button" class="btn btn-ghost" data-set="reset-club">' + Icons.svg('refresh', { class: 'btn-ico' }) + 'Restore defaults</button>' +
        '</div>',
      foot: '<span class="muted small">' + Icons.svg('info') + ' Suggested: keep the club name and school name exactly as they should appear on official documents.</span>'
    }) + certDesignCard();
  }

  /* ══ Certificate design ═══════════════════════════════════════════════ */
  function certDesignCard() {
    var c = s();
    var hasCustom = !!c.certificateBgFileId;
    var builtin = (global.CertBG && CertBG.thumbURI) ? CertBG.thumbURI() : '';
    return UI.card({
      title: 'Certificate background', icon: 'award',
      sub: hasCustom ? 'Using your uploaded background image' : 'Using the built-in ornate design',
      body: '<div class="cert-design">' +
          '<div class="cert-design-pick' + (hasCustom ? '' : ' on') + '" data-cert-design="builtin">' +
            '<img src="' + builtin + '" alt="Built-in certificate background">' +
            '<div class="cd-text"><strong>Built-in design</strong>' +
            '<span class="muted small">Cream paper, gold rule frame, corner scrollwork and centre medallion. No file needed.</span></div>' +
            (hasCustom ? '' : UI.badge('In use', 'success', { icon: 'check' })) +
          '</div>' +
          '<div class="cert-design-pick' + (hasCustom ? ' on' : '') + '" data-cert-design="custom">' +
            (hasCustom && global.CertBG && CertBG.current()
              ? '<img src="' + CertBG.current().dataUrl + '" alt="Uploaded certificate background">'
              : '<div class="cd-empty">' + Icons.svg('image', { size: 22 }) + '<span>No image yet</span></div>') +
            '<div class="cd-text"><strong>Your own background</strong>' +
            '<span class="muted small">Upload any A4 landscape image (PNG or JPEG, up to 4 MB). It is stored in this browser and embedded in every certificate, print-out and downloaded file.</span></div>' +
            (hasCustom ? UI.badge('In use', 'success', { icon: 'check' }) : '') +
          '</div>' +
        '</div>' +
        '<div class="flex gap-1 wrap mt-2 items-center">' +
          (Auth.can('settings', 'edit')
            ? '<label class="btn btn-primary btn-sm" style="cursor:pointer">' + Icons.svg('upload', { class: 'btn-ico' }) +
              'Upload background image<input type="file" id="cert-bg-file" accept="image/png,image/jpeg,image/webp,image/*" hidden></label>'
            : '') +
          (hasCustom && Auth.can('settings', 'edit')
            ? '<button type="button" class="btn btn-outline btn-sm" data-set="cert-bg-clear">' + Icons.svg('x', { class: 'btn-ico' }) + 'Use built-in design</button>'
            : '') +
          '<button type="button" class="btn btn-ghost btn-sm" data-set="cert-bg-preview">' + Icons.svg('eye', { class: 'btn-ico' }) + 'Preview a certificate</button>' +
        '</div>',
      foot: '<span class="muted small">' + Icons.svg('info') + ' Use a design with an empty centre so the recipient name and body text stay readable. Light patterns work best.</span>'
    });
  }

  function previewCertificate() {
    var cert = Store.all('certificates').filter(function (c) { return c.status !== 'Revoked'; })[0] || Store.all('certificates')[0];
    if (!cert) { UI.toast('No certificate to preview', 'Issue a certificate first.', 'warning'); return; }
    CertBG.loadCustom(function () {
      Print.preview(Print.certificate(cert), {
        title: 'Certificate preview', icon: 'award',
        subtitle: 'This is exactly how every certificate will print, including the background.',
        fileName: 'mrhs-ict-certificate-' + (cert.certificateNumber || cert.id)
      });
    });
  }

  /* ══ Appearance ═══════════════════════════════════════════════════════ */
  function appearanceTab() {
    var c = s();
    return '<div class="grid cols-2">' +
      UI.card({
        title: 'Theme', icon: 'palette', sub: 'Choose how the platform looks',
        body: '<div class="theme-picker">' +
            [['light', 'Light', 'Bright backgrounds for daytime work in the laboratory'],
             ['dark', 'Dark', 'Easier on the eyes for evening sessions and the projector'],
             ['auto', 'Match system', 'Follow the device setting automatically']].map(function (t) {
              return '<button type="button" class="theme-option' + ((c.theme || 'light') === t[0] ? ' active' : '') + '" data-theme-choice="' + t[0] + '">' +
                '<span class="to-swatch ' + t[0] + '"></span><strong>' + t[1] + '</strong><span class="muted small">' + t[2] + '</span></button>';
            }).join('') + '</div>' +
          '<p class="help mt-2">The theme applies immediately and is remembered for this browser.</p>'
      }) +
      UI.card({
        title: 'Display preferences', icon: 'sliders',
        body: '<form id="display-form" class="form-grid">' +
            field('pageSize', 'Rows per table page', c.pageSize, { type: 'number', min: 5, max: 50 }) +
            field('lowAttendanceThreshold', 'Low attendance threshold (%)', c.lowAttendanceThreshold, { type: 'number', min: 0, max: 100 }) +
            switchField('showDemoBadges', 'Show “sample data” badges', c.showDemoBadges !== false, 'Marks demonstration records so they are never mistaken for real data.') +
            '</form>' +
          '<button type="button" class="btn btn-primary mt-2" data-set="save-display">' + Icons.svg('save', { class: 'btn-ico' }) + 'Save preferences</button>'
      }) +
    '</div>';
  }

  /* ══ Users and roles ══════════════════════════════════════════════════ */
  function usersTab() {
    var users = Store.all('users');
    var me = Auth.currentUser();
    var role = me ? Auth.roleInfo(me.role) : { label: '', description: '', tone: 'neutral' };

    var roleMatrix = UI.card({
      title: 'Roles and permissions', icon: 'shield', sub: 'What each role can do',
      body: '<div class="scroll-y-sm"><table class="stat-table"><thead><tr><th>Role</th><th>Description</th><th>Modules</th></tr></thead><tbody>' +
        Object.keys(Data.ROLES).map(function (r) {
          var info = Data.ROLES[r];
          var mods = Auth.modules(r);
          return '<tr><td>' + UI.badge(r, info.tone || 'neutral') + '</td>' +
            '<td class="small">' + U.esc(info.description || '') + '</td>' +
            '<td class="small">' + (mods === '*' ? '<strong>All 21 modules</strong>' : mods.map(function (m) { return U.titleCase(m); }).join(', ') || '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>'
    });

    var userList = UI.card({
      title: 'User accounts', icon: 'users', sub: users.length + ' accounts',
      head: Auth.can('settings', 'edit') ? '<button type="button" class="btn btn-primary btn-sm" data-set="new-user">' + Icons.svg('user-plus', { class: 'btn-ico' }) + 'Add user</button>' : '',
      body: '<div class="scroll-y-sm"><table class="stat-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last sign-in</th><th></th></tr></thead><tbody>' +
        users.map(function (u) {
          var uRole = Auth.roleInfo(u.role);
          return '<tr><td>' + UI.personCell(u.name, u.username + (u.email ? ' · ' + u.email : ''), { size: 'xs' }) +
              (u.memberId && Store.find('members', u.memberId) ? ' <a class="link-btn xs" href="#/members/' + u.memberId + '">member record</a>' : '') + '</td>' +
            '<td>' + UI.badge(u.role, uRole.tone || 'neutral') + '</td>' +
            '<td>' + UI.statusBadge(u.status || 'Active') + '</td>' +
            '<td class="small">' + (u.lastLogin ? U.fmtDateTime(u.lastLogin) : 'Never') + '</td>' +
            '<td class="row-actions">' +
              (Auth.can('settings', 'edit') ? '<button type="button" class="mini-btn" data-set="edit-user" data-user="' + u.id + '" title="Edit user">' + Icons.svg('edit') + '</button>' : '') +
              (Auth.can('settings', 'edit') && u.id !== (me ? me.id : '') ? '<button type="button" class="mini-btn" data-set="reset-pass" data-user="' + u.id + '" title="Reset password">' + Icons.svg('key') + '</button>' : '') +
              (Auth.can('settings', 'delete') && u.id !== (me ? me.id : '') ? '<button type="button" class="mini-btn danger" data-set="del-user" data-user="' + u.id + '" title="Delete user">' + Icons.svg('trash') + '</button>' : '') +
            '</td></tr>';
        }).join('') + '</tbody></table></div>'
    });

    return '<div class="grid cols-2" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)">' + userList +
      '<div style="display:grid;gap:18px;align-content:start">' +
        UI.card({
          title: 'Your account', icon: 'user-circle',
          body: UI.kvGrid([
            { label: 'Signed in as', value: me ? me.name : '—' },
            { label: 'Username', value: me ? me.username : '—' },
            { label: 'Role', html: UI.badge(me ? me.role : '', role.tone || 'primary') },
            { label: 'Access', value: me && Auth.modules(me.role) === '*' ? 'All modules' : ((me && Auth.modules(me.role)) || []).length + ' modules' },
            { label: 'Last sign-in', value: me && me.lastLogin ? U.fmtDateTime(me.lastLogin) : 'This session' }
          ]) +
          '<div class="note-block mt-2">' + U.esc(role.description || '') + '</div>' +
          '<button type="button" class="btn btn-outline btn-sm mt-2" data-set="change-pass">' + Icons.svg('key', { class: 'btn-ico' }) + 'Change my password</button>'
        }) +
        roleMatrix +
      '</div></div>';
  }

  /* ══ Notifications ════════════════════════════════════════════════════ */
  function notificationsTab() {
    var c = s();
    return UI.card({
      title: 'Notification preferences', icon: 'bell',
      sub: 'Choose which reminders appear in the notification centre.',
      body: '<form id="notif-form">' +
          switchField('notifyMeetings', 'Upcoming meetings', c.notifyMeetings, 'Reminds you a few days before a scheduled meeting.') +
          switchField('notifyActivities', 'Upcoming activities', c.notifyActivities, 'Competitions, workshops, outreach and exhibitions.') +
          switchField('notifyTasks', 'Task deadlines', c.notifyTasks, 'Overdue and soon-to-be-due cabinet tasks.') +
          switchField('notifyAnnouncements', 'New announcements', c.notifyAnnouncements, 'Important and urgent notices posted by the cabinet.') +
          switchField('notifyLowAttendance', 'Low attendance warnings', c.notifyLowAttendance, 'Members falling below the attendance threshold.') +
        '</form>' +
        '<button type="button" class="btn btn-primary mt-2" data-set="save-notif">' + Icons.svg('save', { class: 'btn-ico' }) + 'Save preferences</button>'
    });
  }

  /* ══ Data management ══════════════════════════════════════════════════ */
  function dataTab() {
    var stats = Store.stats();
    var rows = Store.COLLECTIONS.map(function (c) {
      return { name: c, count: Store.count(c) };
    }).filter(function (r) { return r.count; });

    return '<div class="grid cols-2" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">' +
      UI.card({
        title: 'Backup and restore', icon: 'database',
        sub: 'Everything is stored in this browser — keep a backup.',
        body: '<div class="stat-strip mb-2">' +
            '<div class="strip-item"><span>Records</span><strong>' + stats.total + '</strong></div>' +
            '<div class="strip-item"><span>Local data</span><strong>' + stats.readable + '</strong></div>' +
            '<div class="strip-item"><span>Collections</span><strong>' + rows.length + '</strong></div>' +
          '</div>' +
          '<div class="flex gap-1 wrap">' +
            '<button type="button" class="btn btn-primary" data-set="export">' + Icons.svg('download', { class: 'btn-ico' }) + 'Export backup (JSON)</button>' +
            '<button type="button" class="btn btn-outline" data-set="import">' + Icons.svg('upload', { class: 'btn-ico' }) + 'Import backup</button>' +
          '</div>' +
          '<div class="alert alert-info mt-2">' + Icons.svg('info') +
            '<div>Backups include members, meetings, attendance, finances, certificates and settings. Import can merge with existing data or replace it completely.</div></div>' +
          '<div class="grid cols-2 mt-2">' +
            '<div class="note-block"><strong>Merge import</strong><br><span class="small">Adds records that are not already present. Safest option.</span></div>' +
            '<div class="note-block warning"><strong>Replace import</strong><br><span class="small">Overwrites every collection with the backup contents.</span></div>' +
          '</div>'
      }) +
      UI.card({
        title: 'Demonstration data', icon: 'info',
        sub: 'This installation is preloaded with sample club records',
        body: '<p class="small">The sample data includes members, meetings, attendance, courses, projects, finances and certificates so every screen can be explored. ' +
            'All records are labelled <strong>sample / demo</strong> and contain no real personal information.</p>' +
          '<div class="flex gap-1 wrap mt-2">' +
            '<button type="button" class="btn btn-outline" data-set="strip-demo">' + Icons.svg('eraser', { class: 'btn-ico' }) + 'Remove sample records</button>' +
            '<button type="button" class="btn btn-outline" data-set="reload-demo">' + Icons.svg('refresh', { class: 'btn-ico' }) + 'Reload sample data</button>' +
            '<button type="button" class="btn btn-danger-outline" data-set="factory-reset">' + Icons.svg('alert-triangle', { class: 'btn-ico' }) + 'Reset everything</button>' +
          '</div>' +
          '<div class="note-block mt-2"><strong>Delete everything</strong><br><span class="small">Clears all records, users and settings from this browser. Sign-in accounts return to the six default demonstration roles.</span></div>' +
          '<div class="stat-table-wrap mt-2"><table class="stat-table"><thead><tr><th>Collection</th><th>Records</th></tr></thead><tbody>' +
            rows.map(function (r) { return '<tr><td>' + U.titleCase(r.name) + '</td><td>' + r.count + '</td></tr>'; }).join('') +
          '</tbody></table></div>'
      }) +
    '</div>';
  }

  /* ══ Page ═════════════════════════════════════════════════════════════ */
  var TABS = [
    { key: 'club', label: 'Club information', icon: 'building' },
    { key: 'appearance', label: 'Appearance', icon: 'palette' },
    { key: 'users', label: 'Users & roles', icon: 'shield' },
    { key: 'notifications', label: 'Notifications', icon: 'bell' },
    { key: 'data', label: 'Data', icon: 'database' }
  ];

  Router.view('/settings', {
    title: 'Settings', icon: 'settings', module: 'settings',
    render: function () {
      if (!Auth.can('settings', 'view')) return UI.restricted('settings');
      var body = tab === 'club' ? clubTab() : tab === 'appearance' ? appearanceTab()
        : tab === 'users' ? usersTab() : tab === 'notifications' ? notificationsTab() : dataTab();
      return '<div class="page">' +
        UI.pageHeader({
          title: 'Settings', icon: 'settings',
          subtitle: 'Club configuration, appearance, users, notifications and your data.',
          actions: (Auth.can('settings', 'edit') && tab === 'club'
            ? '<button type="button" class="btn btn-primary" data-set="save-club">' + Icons.svg('save', { class: 'btn-ico' }) + 'Save settings</button>' : '')
        }) +
        '<div class="card"><div class="card-body tight">' + UI.tabs(TABS, tab) + '</div></div>' +
        '<div class="mt-2">' + body + '</div>' +
        '</div>';
    },
    mount: function (ctx, root) {
      var bgInput = root.querySelector('#cert-bg-file');
      if (bgInput) {
        bgInput.addEventListener('change', function () {
          var file = this.files && this.files[0];
          if (!file) return;
          CertBG.setCustomFile(file).then(function (ok) {
            if (!ok) return;
            UI.toast('Certificate background updated', 'Every certificate and print-out now uses “' + file.name + '”.', 'success');
            Router.refresh();
          });
        });
      }
      root.addEventListener('click', function (e) {
        var t = e.target.closest('[data-tab]');
        if (t) { tab = t.getAttribute('data-tab'); Router.refresh(); return; }
        var theme = e.target.closest('[data-theme-choice]');
        if (theme) {
          var choice = theme.getAttribute('data-theme-choice');
          Store.saveSettings({ theme: choice });
          Shell.applyTheme(choice);
          U.$$('.theme-option', root).forEach(function (b) { b.classList.toggle('active', b === theme); });
          UI.toast('Theme updated', 'The appearance has been changed to ' + choice + '.', 'success', { duration: 2200 });
          return;
        }
        var btn = e.target.closest('[data-set]');
        if (!btn) return;
        var what = btn.getAttribute('data-set');
        var form = U.$('#settings-form', root) || U.$('#display-form', root) || U.$('#notif-form', root);
        var data = form ? Forms.collect(form) : {};

        if (what === 'cert-bg-clear') {
          UI.confirm({
            title: 'Use the built-in design',
            message: 'Remove your uploaded certificate background and go back to the built-in ornate design?',
            confirmLabel: 'Use built-in design', icon: 'award', tone: 'warning'
          }).then(function (ok) {
            if (!ok) return;
            CertBG.clearCustom();
            UI.toast('Certificate design updated', 'Certificates now use the built-in design.', 'success');
            Router.refresh();
          });
          return;
        }
        if (what === 'cert-bg-preview') { previewCertificate(); return; }
        if (what === 'save-club') savePartial(data, ['clubName', 'clubFullName', 'schoolName', 'motto', 'description', 'email', 'phone', 'address', 'academicYear', 'currentTerm', 'termStart', 'termEnd', 'currency', 'meetingDefaultVenue', 'reportSignatory', 'memberIdPrefix', 'certificatePrefix']);
        if (what === 'reset-club') {
          UI.confirm({
            title: 'Restore default club information', message: 'Reset the club information to the values shipped with the platform?',
            confirmLabel: 'Restore defaults', tone: 'warning',
            onConfirm: function () {
              var def = Data.defaultSettings();
              savePartial(def, ['clubName', 'clubFullName', 'schoolName', 'motto', 'description', 'email', 'phone', 'address', 'academicYear', 'currentTerm', 'termStart', 'termEnd', 'currency', 'meetingDefaultVenue', 'reportSignatory', 'memberIdPrefix', 'certificatePrefix']);
              UI.toast('Defaults restored', 'Club information has been reset.', 'info');
            }
          });
        }
        if (what === 'save-display') savePartial(data, ['pageSize', 'lowAttendanceThreshold', 'showDemoBadges'], 'Display preferences saved.');
        if (what === 'save-notif') savePartial(data, ['notifyMeetings', 'notifyActivities', 'notifyTasks', 'notifyAnnouncements', 'notifyLowAttendance'], 'Notification preferences saved.');
        if (what === 'new-user') openUserForm();
        if (what === 'edit-user') openUserForm(Store.find('users', btn.getAttribute('data-user')));
        if (what === 'reset-pass') resetPassword(Store.find('users', btn.getAttribute('data-user')));
        if (what === 'del-user') deleteUser(Store.find('users', btn.getAttribute('data-user')));
        if (what === 'change-pass') changeMyPassword();
        if (what === 'export') exportBackup();
        if (what === 'import') importBackup();
        if (what === 'strip-demo') stripDemo();
        if (what === 'reload-demo') reloadDemo();
        if (what === 'factory-reset') factoryReset();
      });
    }
  });

  /* ══ Actions ══════════════════════════════════════════════════════════ */
  function savePartial(data, keys, message) {
    if (!CRUD.guard('settings', 'edit')) return;
    var patch = {};
    keys.forEach(function (k) {
      if (data[k] === undefined) return;
      var v = data[k];
      if (typeof v === 'string' && /^\d+$/.test(v) && ['pageSize', 'lowAttendanceThreshold'].indexOf(k) !== -1) v = Number(v);
      patch[k] = v;
    });
    Store.saveSettings(patch);
    Shell.refresh();
    UI.toast('Settings saved', message || 'Changes saved successfully.', 'success');
    Router.refresh();
  }

  function exportBackup() {
    var payload = Store.exportAll();
    U.download('mrhs-ict-club-backup-' + U.todayISO() + '.json', JSON.stringify(payload, null, 2), 'application/json');
    UI.toast('Backup exported', payload.counts ? Object.keys(payload.counts).length + ' collections written to the backup file.' : 'Backup file created.', 'success');
  }

  function importBackup() {
    if (!CRUD.guard('settings', 'edit')) return;
    UI.formModal({
      title: 'Import club backup', icon: 'upload', size: 'sm',
      subtitle: 'Choose a JSON backup exported from this platform.',
      formHtml: Forms.render([
        { name: 'mode', label: 'Import mode', type: 'select', options: [
            { value: 'merge', label: 'Merge — keep existing records and add new ones' },
            { value: 'replace', label: 'Replace — overwrite everything with the backup' }
          ], value: 'merge', colSpan: 2 },
        { name: 'file', label: 'Backup file', type: 'file', accept: '.json,application/json', colSpan: 2, required: true }
      ]),
      submitLabel: 'Import backup',
      onOpen: function (c, form) { Forms.init(form); },
      onSubmit: function (data, c, formEl) {
        var input = formEl.querySelector('input[type="file"]');
        var file = input && input.files && input.files[0];
        if (!file) { UI.toast('No file selected', 'Choose a backup file to import.', 'error'); return false; }
        U.readFile(file).then(function (text) {
          try {
            var counts = Store.importAll(JSON.parse(text), data.mode);
            UI.toast('Backup imported', 'Records were restored successfully.', 'success');
            Shell.refresh();
            Router.refresh();
          } catch (err) {
            UI.toast('Import failed', err.message || 'The backup file could not be read.', 'error');
          }
        });
        return true;
      }
    });
  }

  function stripDemo() {
    if (!CRUD.guard('settings', 'delete')) return;
    UI.confirm({
      title: 'Remove sample records', tone: 'warning', confirmLabel: 'Remove sample data',
      message: 'Delete every record marked as sample/demo data?',
      details: 'Your own records, the sign-in accounts and your settings are kept. Export a backup first if you are unsure.',
      onConfirm: function () {
        var removed = 0;
        Store.COLLECTIONS.forEach(function (c) { removed += Store.stripDemo(c); });
        UI.toast('Sample data removed', removed + ' demonstration records were deleted.', 'success');
        Shell.refresh();
        Router.refresh();
      }
    });
  }

  function reloadDemo() {
    UI.confirm({
      title: 'Reload sample data', tone: 'danger', confirmLabel: 'Reload and reset',
      message: 'Reload the demonstration dataset?',
      details: 'This erases the current records in this browser and rebuilds the original sample club, including the default sign-in accounts.',
      onConfirm: function () {
        Store.resetDemoData().then(function () {
          UI.toast('Sample data reloaded', 'The demonstration club has been restored.', 'info');
          setTimeout(function () { location.reload(); }, 700);
        });
      }
    });
  }

  function factoryReset() {
    UI.confirm({
      title: 'Reset everything', tone: 'danger', confirmLabel: 'Delete all data',
      message: 'Delete every club record and reset all settings?',
      details: 'This cannot be undone unless you have exported a backup. The app will restart with the demonstration dataset.',
      onConfirm: function () {
        Store.resetDemoData().then(function () {
          UI.toast('Platform reset', 'All data was cleared and demonstration data reloaded.', 'info');
          setTimeout(function () { location.reload(); }, 700);
        });
      }
    });
  }

  function openUserForm(user) {
    if (!CRUD.guard('settings', 'edit')) return;
    var editing = !!user;
    UI.formModal({
      title: editing ? 'Edit user account' : 'Add user account',
      subtitle: editing ? user.username : 'Create a sign-in account and assign a role.',
      icon: 'user-plus', size: 'sm',
      formHtml: Forms.render([
        { name: 'name', label: 'Full name', type: 'text', required: true, colSpan: 2, value: editing ? user.name : '' },
        { name: 'username', label: 'Username', type: 'text', required: true, value: editing ? user.username : '' },
        { name: 'email', label: 'Email', type: 'email', value: editing ? user.email : '' },
        { name: 'role', label: 'Role', type: 'select', required: true, options: Object.keys(Data.ROLES), value: editing ? user.role : 'Member', colSpan: 2 },
        { name: 'memberId', label: 'Linked member record', type: 'member', value: editing ? user.memberId : '', colSpan: 2, help: 'Link the account to a member so they can see their own records.' },
        { name: 'phone', label: 'Telephone', type: 'text', value: editing ? user.phone : '' },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Suspended'], value: editing ? (user.status || 'Active') : 'Active' },
        (!editing ? { name: 'password', label: 'Initial password', type: 'text', required: true, value: 'demo1234', colSpan: 2, help: 'The user can change this after signing in.' } : { name: 'note', type: 'static', label: 'Password', value: 'Use “Reset password” to issue a new password.', colSpan: 2 })
      ]),
      submitLabel: editing ? 'Save account' : 'Create account',
      onOpen: function (c, form) { Forms.init(form); },
      onSubmit: function (data) {
        if (editing) {
          Store.update('users', user.id, {
            name: data.name, username: data.username, email: data.email, role: data.role,
            memberId: data.memberId || null, phone: data.phone, status: data.status
          });
          UI.toast('Account updated', data.name + ' can sign in with their new role.', 'success');
          Router.refresh();
          return true;
        }
        Auth.createUser(data).then(function () {
          UI.toast('User created', data.name + ' can now sign in as ' + data.role + '.', 'success');
          Router.refresh();
        }).catch(function (err) {
          UI.toast('Could not create user', err.message, 'error');
        });
        return true;
      }
    });
  }

  function resetPassword(user) {
    if (!CRUD.guard('settings', 'edit')) return;
    UI.formModal({
      title: 'Reset password', subtitle: user ? user.name : '', icon: 'key', size: 'sm',
      formHtml: Forms.render([
        { name: 'password', label: 'New password', type: 'text', required: true, value: 'demo1234', colSpan: 2, help: 'At least 6 characters. Share it with the user securely.' }
      ]),
      submitLabel: 'Set new password',
      onOpen: function (c, form) { Forms.init(form); },
      onSubmit: function (data) {
        Auth.resetPassword(user.id, data.password).then(function () {
          UI.toast('Password reset', 'A new password has been set for ' + user.name + '.', 'success');
        }).catch(function (err) {
          UI.toast('Reset failed', err.message, 'error');
        });
        return true;
      }
    });
  }

  function deleteUser(user) {
    if (!user) return;
    if (!CRUD.guard('settings', 'delete')) return;
    CRUD.remove({
      module: 'settings', collection: 'users', id: user.id, label: 'the account for ' + user.name,
      title: 'Delete user account', details: 'The person will no longer be able to sign in. Their member record is not affected.',
      after: function () { Router.refresh(); }
    });
  }

  function changeMyPassword() {
    var me = Auth.currentUser();
    if (!me) return;
    UI.formModal({
      title: 'Change my password', subtitle: me.name, icon: 'key', size: 'sm',
      formHtml: Forms.render([
        { name: 'current', label: 'Current password', type: 'password', required: true, colSpan: 2 },
        { name: 'next', label: 'New password', type: 'password', required: true, colSpan: 2, help: 'At least 6 characters.' },
        { name: 'confirm', label: 'Confirm new password', type: 'password', required: true, colSpan: 2 }
      ]),
      submitLabel: 'Change password',
      onOpen: function (c, form) { Forms.init(form); },
      validate: function (data) {
        if (data.next !== data.confirm) return { confirm: 'The two new passwords do not match.' };
        return {};
      },
      onSubmit: function (data) {
        Auth.changePassword(me.id, data.current, data.next).then(function () {
          UI.toast('Password changed', 'Your new password is active immediately.', 'success');
        }).catch(function (err) {
          UI.toast('Could not change password', err.message, 'error');
        });
        return true;
      }
    });
  }

  global.Modules = global.Modules || {};
  global.Modules.Settings = {
    openUserForm: openUserForm,
    exportBackup: exportBackup,
    importBackup: importBackup,
    open: function (which) { tab = which || 'club'; Router.go('/settings'); }
  };
})(window);
