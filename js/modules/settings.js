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
    var picker = (global.CertBG && CertBG.designerHTML)
      ? CertBG.designerHTML() + CertBG.alignHTML()
      : '<p class="muted">Certificate backgrounds are unavailable in this browser.</p>';
    return UI.card({
      title: 'Certificate background', icon: 'award',
      sub: 'Certificates print in A4 landscape (297 × 210 mm). Pick a design or upload your own image.',
      body: picker,
      foot: '<span class="muted small">' + Icons.svg('info') + ' The two built-in designs are vector graphics — they stay sharp at any print size. Uploaded images are stored in this browser and embedded in every certificate, print-out and download.</span>'
    });
  }

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
            '<div class="strip-item"><span>Audit entries</span><strong>' + Store.count('auditLog') + '</strong></div>' +
          '</div>' +
          '<div class="flex gap-1 wrap">' +
            '<button type="button" class="btn btn-primary" data-set="export">' + Icons.svg('download', { class: 'btn-ico' }) + 'Export backup (JSON)</button>' +
            '<button type="button" class="btn btn-outline" data-set="import">' + Icons.svg('upload', { class: 'btn-ico' }) + 'Import backup</button>' +
            (Auth.can('settings', 'delete')
              ? '<a class="btn btn-outline" href="#/audit">' + Icons.svg('history', { class: 'btn-ico' }) + 'Audit trail</a>' : '') +
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
            '<button type="button" class="btn btn-outline" data-set="empty-club">' + Icons.svg('package', { class: 'btn-ico' }) + 'Empty every module</button>' +
            '<button type="button" class="btn btn-outline" data-set="reload-demo">' + Icons.svg('refresh', { class: 'btn-ico' }) + 'Reload sample data</button>' +
            '<button type="button" class="btn btn-danger-outline" data-set="factory-reset">' + Icons.svg('alert-triangle', { class: 'btn-ico' }) + 'Reset everything</button>' +
          '</div>' +
          '<div class="note-block mt-2"><strong>Delete everything</strong><br><span class="small">Clears all records, users and settings from this browser. Sign-in accounts return to the six default demonstration roles.</span></div>' +
          '<div class="stat-table-wrap mt-2"><table class="stat-table"><thead><tr><th>Collection</th><th>Records</th></tr></thead><tbody>' +
            rows.map(function (r) { return '<tr><td>' + U.titleCase(r.name) + '</td><td>' + r.count + '</td></tr>'; }).join('') +
          '</tbody></table></div>'
      }) +
      cloudCard() +
    '</div>';
  }

  /* ══ Cloud backup ═════════════════════════════════════════════════════ */
  function cloudCard() {
    var st = Cloud.status();
    var last = st.lastBackup ? U.fmtDate(st.lastBackup, 'long') + ' at ' + String(st.lastBackup).slice(11, 16) : '';
    var folderBody = st.folderSupported
      ? '<div class="cloud-option' + (st.folderConnected ? ' on' : '') + '">' +
          '<div class="co-head">' + Icons.svg('folder-open') +
            '<div><strong>Save into a folder you already sync</strong>' +
            '<span class="muted small">Pick the OneDrive (or Google Drive / Dropbox) folder once. The app writes each backup straight into it and your sync client uploads it — no Microsoft account setup, and it still works with no internet.</span></div>' +
            (st.folderConnected ? UI.badge('Connected', 'success', { icon: 'check' }) : '') +
          '</div>' +
          (st.folderConnected
            ? '<p class="small mt-1">Backing up into <strong>' + U.esc(st.folderName || 'your folder') + '</strong>' + (last ? ' · last cloud backup ' + U.esc(last) : '') + '</p>'
            : '') +
          '<div class="flex gap-1 wrap mt-2">' +
            '<button type="button" class="btn ' + (st.folderConnected ? 'btn-outline' : 'btn-primary') + ' btn-sm" data-set="cloud-folder-connect">' +
              Icons.svg('folder', { class: 'btn-ico' }) + (st.folderConnected ? 'Change folder' : 'Choose backup folder') + '</button>' +
            (st.folderConnected
              ? '<button type="button" class="btn btn-primary btn-sm" data-set="cloud-folder-backup">' + Icons.svg('save', { class: 'btn-ico' }) + 'Back up now</button>' +
                '<button type="button" class="btn btn-outline btn-sm" data-set="cloud-folder-list">' + Icons.svg('refresh', { class: 'btn-ico' }) + 'Restore from folder</button>' +
                '<button type="button" class="btn btn-ghost btn-sm" data-set="cloud-folder-forget">' + Icons.svg('x', { class: 'btn-ico' }) + 'Forget folder</button>'
              : '') +
          '</div>' +
        '</div>'
      : '<div class="cloud-option">' +
          '<div class="co-head">' + Icons.svg('folder-open') +
            '<div><strong>Save into a synced folder</strong>' +
            '<span class="muted small">This browser cannot write to a folder directly, so download the backup and drop it into your OneDrive folder instead.</span></div>' +
          '</div>' +
          '<div class="flex gap-1 wrap mt-2">' +
            '<button type="button" class="btn btn-outline btn-sm" data-set="export">' + Icons.svg('download', { class: 'btn-ico' }) + 'Download backup file</button>' +
          '</div>' +
        '</div>';

    var graphBody = '<div class="cloud-option' + (st.onedriveConnected ? ' on' : '') + '">' +
        '<div class="co-head">' + Icons.svg('cloud') +
          '<div><strong>Microsoft OneDrive (Microsoft 365)</strong>' +
          '<span class="muted small">Sign in with the school Microsoft account and the app uploads backups itself into its own folder in OneDrive (<span class="mono">/Apps/MRHS ICT Club Master</span>). It only ever sees that folder.</span></div>' +
          (st.onedriveConnected ? UI.badge('Connected', 'success', { icon: 'check' }) : st.onedriveConfigured ? UI.badge('Ready to connect', 'info') : UI.badge('Not set up', 'neutral')) +
        '</div>' +
        '<form id="cloud-form" class="form-grid mt-2">' +
          field('cloudOnedriveClientId', 'Application (client) ID', st.clientId, { help: 'From the school’s app registration in Microsoft Entra ID — see docs/ONEDRIVE.md for the five-minute setup.' }) +
          field('cloudOnedriveTenant', 'Tenant', st.tenant, { help: 'Use “common” for any school account, or paste the school’s tenant ID / domain.' }) +
        '</form>' +
        (st.onedriveConnected
          ? '<p class="small mt-1">Signed in as <strong>' + U.esc(st.onedriveAccount || 'your Microsoft account') + '</strong>' + (last ? ' · last cloud backup ' + U.esc(last) : '') + '</p>'
          : '') +
        '<p class="help mt-1">' + Icons.svg('info') + ' Redirect address to register: <span class="mono">' + U.esc(Cloud._redirectURI()) + '</span></p>' +
        '<div class="flex gap-1 wrap mt-2">' +
          (Auth.can('settings', 'edit') ? '<button type="button" class="btn btn-outline btn-sm" data-set="cloud-graph-save">' + Icons.svg('save', { class: 'btn-ico' }) + 'Save connection details</button>' : '') +
          (st.onedriveConnected
            ? (Auth.can('settings', 'edit')
                ? '<button type="button" class="btn btn-primary btn-sm" data-set="cloud-graph-backup">' + Icons.svg('upload-cloud', { class: 'btn-ico' }) + 'Back up to OneDrive</button>'
                : '') +
              '<button type="button" class="btn btn-outline btn-sm" data-set="cloud-graph-list">' + Icons.svg('refresh', { class: 'btn-ico' }) + 'Restore from OneDrive</button>' +
              (Auth.can('settings', 'edit')
                ? '<button type="button" class="btn btn-ghost btn-sm" data-set="cloud-graph-disconnect">' + Icons.svg('log-out', { class: 'btn-ico' }) + 'Disconnect</button>'
                : '')
            : (st.onedriveConfigured
                ? '<button type="button" class="btn btn-primary btn-sm" data-set="cloud-graph-connect">' + Icons.svg('log-in', { class: 'btn-ico' }) + 'Connect OneDrive</button>'
                : '')) +
          '<button type="button" class="btn btn-ghost btn-sm" data-set="cloud-help">' + Icons.svg('book-open', { class: 'btn-ico' }) + 'How to set it up</button>' +
        '</div>' +
      '</div>';

    var fb = Sync.status();
    var fbBody = '<div class="cloud-option' + (fb.connected ? ' on' : '') + '">' +
        '<div class="co-head">' + Icons.svg('database') +
          '<div><strong>Firebase shared database</strong>' +
          '<span class="muted small">Give several officers the same live records. Edits are saved on this device first and uploaded whenever there is internet, so the club keeps working offline. Only the club’s own records are shared — officer accounts, the audit log and verification codes stay on the device.</span></div>' +
          (fb.connected ? UI.badge('Connected', 'success', { icon: 'check' }) : fb.configured ? UI.badge('Ready to connect', 'info') : UI.badge('Not set up', 'neutral')) +
        '</div>' +
        '<form id="sync-form" class="form-grid mt-2">' +
          field('firebaseProjectId', 'Firebase project ID', fb.projectId, { placeholder: 'mrhs-ict-club', help: 'Firebase console → Project settings → General → Project ID.' }) +
          field('firebaseApiKey', 'Web API key', fb.apiKey, { help: 'Firebase console → Project settings → General → Web API key. This key is not a secret; the security rules protect the data.' }) +
        '</form>' +
        '<p class="help">' + Icons.svg('info') + ' The club\u2019s Firebase project is filled in already \u2014 on other devices just press <strong>Save connection details</strong>, then <strong>Connect Firebase</strong>. Overwrite these two boxes only if the club moves to a different project.</p>' +
        (fb.connected
          ? '<p class="small mt-1">Signed in as <strong>' + U.esc(fb.account) + '</strong>' +
              (fb.lastAt ? ' · last sync ' + U.esc(U.fmtDate(fb.lastAt, 'long')) + ' at ' + U.esc(String(fb.lastAt).slice(11, 16)) : '') +
              (fb.pending ? ' · <strong>' + fb.pending + '</strong> change' + (fb.pending === 1 ? '' : 's') + ' waiting to upload' : ' · everything uploaded') +
            '</p>'
          : '') +
        '<p class="help mt-1">' + Icons.svg('info') + ' ' + fb.collections + ' collections are shared; ' +
          U.esc(fb.localOnly.join(', ')) + ' never leave this device.</p>' +
        '<div class="flex gap-1 wrap mt-2 items-center">' +
          (Auth.can('settings', 'edit') ? '<button type="button" class="btn btn-outline btn-sm" data-set="cloud-fb-save">' + Icons.svg('save', { class: 'btn-ico' }) + 'Save connection details</button>' : '') +
          (fb.connected
            ? (Auth.can('settings', 'edit')
                ? '<button type="button" class="btn btn-primary btn-sm" data-set="cloud-fb-sync">' + Icons.svg('refresh', { class: 'btn-ico' }) + 'Sync now</button>' +
                  '<button type="button" class="btn btn-outline btn-sm" data-set="cloud-fb-push">' + Icons.svg('upload-cloud', { class: 'btn-ico' }) + 'Upload everything</button>'
                : '') +
              '<button type="button" class="btn btn-outline btn-sm" data-set="cloud-fb-pull">' + Icons.svg('download', { class: 'btn-ico' }) + 'Load from Firebase</button>' +
              (Auth.can('settings', 'edit')
                ? '<button type="button" class="btn btn-ghost btn-sm" data-set="cloud-fb-disconnect">' + Icons.svg('log-out', { class: 'btn-ico' }) + 'Disconnect</button>'
                : '')
            : (fb.configured && Auth.can('settings', 'edit')
                ? '<button type="button" class="btn btn-primary btn-sm" data-set="cloud-fb-connect">' + Icons.svg('log-in', { class: 'btn-ico' }) + 'Connect Firebase</button>'
                : '')) +
          '<button type="button" class="btn btn-ghost btn-sm" data-set="cloud-fb-help">' + Icons.svg('book-open', { class: 'btn-ico' }) + 'How to set it up</button>' +
        '</div>' +
        (Auth.can('settings', 'edit')
          ? '<div class="mt-2">' + switchField('syncEnabled', 'Keep this device in sync automatically', fb.auto,
              'Uploads changes by itself and picks up other officers’ edits within a few minutes. Leave it off to exchange records only when you press “Sync now”.') + '</div>'
          : '') +
      '</div>';

    return UI.card({
      title: 'Cloud backup and shared database', icon: 'upload-cloud',
      sub: 'Get the club’s records off this one browser',
      body: folderBody + graphBody + fbBody +
        '<div class="alert alert-info mt-2">' + Icons.svg('shield-check') +
          '<div><strong>Keep one backup a week.</strong> Records live in this browser only; a dated backup in OneDrive plus a USB copy is a complete archive. Sign-in tokens are never included in a backup file.</div></div>',
      foot: '<span class="muted small">' + Icons.svg('book-open') + ' Guides: <span class="mono">docs/ONEDRIVE.md</span> (Microsoft 365) and <span class="mono">docs/CLOUD-STORAGE.md</span> (which service to choose).</span>'
    });
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
      if (global.CertBG && CertBG.bindDesigner) {
        CertBG.bindDesigner(root, { onChange: function () { Router.refresh(); } });
      }
      var autoBox = root.querySelector('#set-syncEnabled');
      if (autoBox) {
        autoBox.addEventListener('change', function () {
          if (!CRUD.guard('settings', 'edit')) { this.checked = !this.checked; return; }
          Sync.setAuto(this.checked);
          Router.refresh();
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
        var syncForm = U.$('#sync-form', root);
        var syncData = syncForm ? Forms.collect(syncForm) : {};

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
        if (what === 'cloud-fb-save' || what === 'cloud-fb-connect' || what === 'cloud-fb-disconnect' ||
            what === 'cloud-fb-push' || what === 'cloud-fb-pull' || what === 'cloud-fb-sync' ||
            what === 'cloud-fb-help') { cloudFirebase(what, syncData); return; }
        if (what === 'export') exportBackup();
        if (what === 'import') importBackup();
        if (what === 'strip-demo') stripDemo();
        if (what === 'empty-club') emptyClub();
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

  /* ══ Firebase shared database ═════════════════════════════════════════ */
  function cloudFirebase(what, data) {
    if (what === 'cloud-fb-help') { openFirebaseHelp(); return; }
    if (what === 'cloud-fb-save') {
      if (!CRUD.guard('settings', 'edit')) return;
      if (!String(data.firebaseProjectId || '').trim() || !String(data.firebaseApiKey || '').trim()) {
        UI.toast('Both values are needed', 'Paste the project ID and the web API key from the Firebase console.', 'warning');
        return;
      }
      Sync.saveConfig({ projectId: data.firebaseProjectId, apiKey: data.firebaseApiKey });
      UI.toast('Connection details saved', 'Now choose “Connect Firebase” and sign in with the club’s Firebase account.', 'success');
      Router.refresh();
      return;
    }
    if (what === 'cloud-fb-connect') {
      if (!CRUD.guard('settings', 'edit')) return;
      UI.formModal({
        title: 'Sign in to Firebase', icon: 'database', size: 'sm',
        subtitle: 'Use the account created for the club in Firebase Authentication (Email/Password).',
        formHtml: Forms.render([
          { name: 'email', label: 'Email address', type: 'email', required: true, colSpan: 2, placeholder: 'ict@mrhs.ac.ug' },
          { name: 'password', label: 'Password', type: 'password', required: true, colSpan: 2, help: 'Kept only as a sign-in token in this browser; never written into a backup file.' }
        ]),
        submitLabel: 'Connect Firebase',
        onOpen: function (c, form) { Forms.init(form); },
        onSubmit: function (values, c) {
          Sync.signIn(values.email, values.password).then(function (ok) {
            if (!ok) return;
            c.close();
            Router.refresh();
            if (Sync.settings().syncEnabled) Sync.sync({ quiet: false });
          });
          return true;
        }
      });
      return;
    }
    if (what === 'cloud-fb-disconnect') {
      if (!CRUD.guard('settings', 'edit')) return;
      UI.confirm({
        title: 'Disconnect Firebase', message: 'Remove the stored Firebase sign-in from this browser? Records already in the shared database are untouched, and automatic syncing stops.',
        confirmLabel: 'Disconnect', icon: 'database', tone: 'warning'
      }).then(function (ok) {
        if (!ok) return;
        Sync.signOut().then(function () { Router.refresh(); });
      });
      return;
    }
    if (what === 'cloud-fb-push') {
      if (!CRUD.guard('settings', 'edit')) return;
      UI.toast('Uploading', 'Sending every record to the shared database…', 'info', { duration: 2000 });
      Sync.push({ full: true }).then(function () { Router.refresh(); });
      return;
    }
    if (what === 'cloud-fb-sync') {
      if (!CRUD.guard('settings', 'edit')) return;
      UI.toast('Syncing', 'Exchanging records with Firebase…', 'info', { duration: 2000 });
      Sync.sync().then(function () { Router.refresh(); });
      return;
    }
    if (what === 'cloud-fb-pull') {
      var pending = Sync.pending();
      UI.confirm({
        title: 'Load from Firebase',
        message: (pending ? pending + ' local change' + (pending === 1 ? '' : 's') + ' will be kept and uploaded afterwards. ' : '') +
          'Records in the shared database are applied to this device. Newer local edits are never overwritten.',
        confirmLabel: 'Load records', icon: 'download', tone: 'primary'
      }).then(function (ok) {
        if (!ok) return;
        Sync.pull().then(function () { Router.refresh(); });
      });
    }
  }

  /** In-app setup guide for Firebase. */
  function openFirebaseHelp() {
    UI.modal({
      title: 'Setting up the Firebase shared database', subtitle: 'About twenty minutes, once, by the ICT teacher or club patron.',
      icon: 'database', size: 'lg',
      body: '<ol class="help-steps">' +
          '<li><strong>Create the project.</strong> Sign in at <span class="mono">console.firebase.google.com</span> with a school Google account → <em>Add project</em> → name it e.g. “MRHS ICT Club”. Google Analytics is not needed.</li>' +
          '<li><strong>Create the database.</strong> <em>Build → Firestore Database → Create database</em>. Choose the location closest to Uganda (e.g. <span class="mono">europe-west1</span>), and start in <em>Production mode</em>.</li>' +
          '<li><strong>Turn on accounts.</strong> <em>Build → Authentication → Get started → Email/Password → Enable</em>. Then <em>Users → Add user</em> and create one account per officer who will enter data (for example <span class="mono">ict@mrhs.ac.ug</span>), plus a shared club account if the club prefers.</li>' +
          '<li><strong>Copy the connection details.</strong> <em>Project settings → General → Your apps → Web app</em> (add a web app if there is none). Copy the <em>Project ID</em> and the <em>Web API key</em> into the fields above and press <em>Save connection details</em>.</li>' +
          '<li><strong>Paste the security rules.</strong> <em>Firestore Database → Rules</em> → replace with the rules from <span class="mono">docs/FIREBASE.md</span> (they allow any signed-in club account to read and write, and nothing else) → <em>Publish</em>.</li>' +
          '<li><strong>Connect</strong>, sign in with one of those accounts, then press <em>Sync now</em>. Every device the officers use repeats only the Connect step with its own account.</li>' +
        '</ol>' +
        '<div class="alert alert-info mt-2">' + Icons.svg('shield-check') +
          '<div>Records are shared, but they are still yours: <span class="mono">users</span> (officer accounts and password hashes), <span class="mono">auditLog</span>, <span class="mono">verifications</span> and <span class="mono">notifications</span> never leave the device. Keep the OneDrive/Drive JSON backup running as well — a database is not a backup.</div></div>',
      actions: [{ label: 'Close', tone: 'primary', close: true }]
    });
  }

  /* ══ Cloud backup actions ═════════════════════════════════════════════ */
  function cloudAction(what, data) {
    if (what === 'cloud-help') { openCloudHelp(); return; }
    if (what === 'cloud-graph-save') {
      if (!CRUD.guard('settings', 'edit')) return;
      Store.saveSettings({
        cloudOnedriveClientId: String(data.cloudOnedriveClientId || '').trim(),
        cloudOnedriveTenant: String(data.cloudOnedriveTenant || 'common').trim() || 'common'
      });
      UI.toast('Connection details saved', 'Choose “Connect OneDrive” to sign in with the school Microsoft account.', 'success');
      Router.refresh();
      return;
    }
    if (what === 'cloud-graph-connect') {
      if (!CRUD.guard('settings', 'edit')) return;
      Cloud.graphConnect();
      return;
    }
    if (what === 'cloud-graph-disconnect') {
      if (!CRUD.guard('settings', 'edit')) return;
      UI.confirm({
        title: 'Disconnect OneDrive', message: 'Remove the stored Microsoft sign-in from this browser? Backups already in OneDrive are not touched.',
        confirmLabel: 'Disconnect', icon: 'cloud', tone: 'warning'
      }).then(function (ok) {
        if (!ok) return;
        Cloud.graphDisconnect().then(function () { Router.refresh(); });
      });
      return;
    }
    if (what === 'cloud-graph-backup') {
      if (!CRUD.guard('settings', 'edit')) return;
      UI.toast('Uploading backup', 'Sending the club records to OneDrive…', 'info', { duration: 2000 });
      Cloud.graphBackup().then(function (name) { if (name) Router.refresh(); });
      return;
    }
    if (what === 'cloud-graph-list') { listCloudBackups('onedrive'); return; }
    if (what === 'cloud-folder-connect') {
      if (!CRUD.guard('settings', 'edit')) return;
      Cloud.folderConnect().then(function (ok) { if (ok) Router.refresh(); });
      return;
    }
    if (what === 'cloud-folder-backup') {
      if (!CRUD.guard('settings', 'edit')) return;
      Cloud.folderBackup().then(function (name) { if (name) Router.refresh(); });
      return;
    }
    if (what === 'cloud-folder-list') { listCloudBackups('folder'); return; }
    if (what === 'cloud-folder-forget') {
      if (!CRUD.guard('settings', 'edit')) return;
      UI.confirm({
        title: 'Forget this folder', message: 'Stop writing backups into this folder? Nothing inside the folder is deleted.',
        confirmLabel: 'Forget folder', icon: 'folder', tone: 'warning'
      }).then(function (ok) {
        if (!ok) return;
        Cloud.folderDisconnect().then(function () { Router.refresh(); });
      });
    }
  }

  /** Lists the backups found in OneDrive or in the chosen folder and restores one. */
  function listCloudBackups(source) {
    var loading = UI.modal({
      title: source === 'onedrive' ? 'Backups in OneDrive' : 'Backups in your folder', icon: 'upload-cloud', size: 'md',
      body: '<div class="loading-block"><span class="spinner"></span><span>Looking for backups…</span></div>',
      actions: [{ label: 'Close', tone: 'ghost', close: true }]
    });
    var find = source === 'onedrive' ? Cloud.graphList() : Cloud.folderList().then(function (names) {
      return names.map(function (n) { return { name: n }; });
    });
    find.then(function (items) {
      if (!items.length) {
        loading.setBody('<div class="empty-state"><div class="empty-icon">' + Icons.svg('upload-cloud') + '</div>' +
          '<h3>No backups found</h3><p>' + (source === 'onedrive'
            ? 'Nothing has been uploaded from this app yet. Use “Back up to OneDrive” first.'
            : 'No backup files are in that folder yet. Use “Back up now” first.') + '</p></div>');
        return;
      }
      loading.setBody('<p class="small">' + items.length + ' backup' + (items.length === 1 ? '' : 's') + ' found, newest first. Restoring is recorded in the audit log.</p>' +
        '<div class="cloud-list">' + items.map(function (it, i) {
          var when = it.modified ? U.fmtDate(it.modified, 'long') : '';
          var size = it.size ? (it.size / 1024).toFixed(0) + ' KB' : '';
          return '<div class="cloud-item">' +
            '<span class="ci-ico">' + Icons.svg('database') + '</span>' +
            '<span class="ci-text"><strong class="mono">' + U.esc(it.name) + '</strong>' +
              '<span class="muted small">' + [when, size].filter(Boolean).join(' · ') + '</span></span>' +
            '<button type="button" class="btn btn-primary btn-sm" data-cloud-restore="' + i + '" data-cloud-mode="merge">Merge</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-cloud-restore="' + i + '" data-cloud-mode="replace">Replace</button>' +
          '</div>';
        }).join('') + '</div>');
      loading.body.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-cloud-restore]');
        if (!btn) return;
        var item = items[+btn.getAttribute('data-cloud-restore')];
        var mode = btn.getAttribute('data-cloud-mode');
        var read = source === 'onedrive' ? Cloud.graphRead(item.id) : Cloud.folderRead(item.name);
        btn.disabled = true;
        read.then(function (text) {
          btn.disabled = false;
          if (!text) return;
          UI.confirm({
            title: mode === 'replace' ? 'Replace everything' : 'Merge this backup',
            message: mode === 'replace'
              ? 'Every record on this device will be replaced with the contents of ' + item.name + '. This cannot be undone.'
              : 'Records from ' + item.name + ' will be added to this device. Existing records are kept.',
            confirmLabel: mode === 'replace' ? 'Replace records' : 'Merge records',
            icon: 'database', tone: mode === 'replace' ? 'danger' : 'primary'
          }).then(function (yes) {
            if (!yes) return;
            if (Cloud.restore(text, mode)) { loading.close(); UI.toast('Restore complete', 'Records were loaded from ' + item.name + '.', 'success'); }
          });
        });
      });
    });
  }

  /** Short in-app instructions so nobody has to leave the app to set this up. */
  function openCloudHelp() {
    var redirect = Cloud._redirectURI();
    UI.modal({
      title: 'Connecting OneDrive (Microsoft 365)', subtitle: 'One-time setup by the ICT teacher or the school’s Microsoft administrator.',
      icon: 'cloud', size: 'lg',
      body: '<ol class="help-steps">' +
          '<li><strong>Register the app.</strong> Sign in at <span class="mono">portal.azure.com</span> → <em>Microsoft Entra ID</em> → <em>App registrations</em> → <em>New registration</em>. Name it “MRHS ICT Club Master”, choose <em>Accounts in this organizational directory only</em>, and set the redirect URI type to <em>Single-page application (SPA)</em> with the address below.</li>' +
          '<li><strong>Redirect address</strong><div class="code-line">' + U.esc(redirect) + '</div>' +
            '<button type="button" class="btn btn-outline btn-sm" data-cloud-copy="' + U.attr(redirect) + '">' + Icons.svg('copy', { class: 'btn-ico' }) + 'Copy address</button></li>' +
          '<li><strong>Add the permission.</strong> <em>API permissions</em> → <em>Add a permission</em> → <em>Microsoft Graph</em> → <em>Delegated permissions</em> → <span class="mono">Files.ReadWrite.AppFolder</span> (add <span class="mono">User.Read</span> and <span class="mono">offline_access</span> too). Then press <em>Grant admin consent</em> — the school administrator may need to do this.</li>' +
          '<li><strong>Copy the Application (client) ID</strong> from the app’s <em>Overview</em> page into the field above and press <em>Save connection details</em>.</li>' +
          '<li><strong>Connect OneDrive</strong>, sign in with the school account, and approve the request. The app can then only see its own folder, <span class="mono">Apps/MRHS ICT Club Master</span>.</li>' +
          '<li><strong>Back up</strong> with the “Back up to OneDrive” button, and restore any time with “Restore from OneDrive”.</li>' +
        '</ol>' +
        '<div class="alert alert-info mt-2">' + Icons.svg('info') +
          '<div>No client secret is needed — this uses the browser sign-in flow (OAuth 2.0 with PKCE) — and the club’s data goes straight from this browser to the school’s OneDrive. The full written guide, including the folder alternative, is in <span class="mono">docs/ONEDRIVE.md</span>.</div></div>',
      actions: [{ label: 'Close', tone: 'primary', close: true }],
      onOpen: function (ctrl) {
        ctrl.body.addEventListener('click', function (e) {
          var copy = e.target.closest('[data-cloud-copy]');
          if (!copy) return;
          U.copyToClipboard(copy.getAttribute('data-cloud-copy')).then(function () {
            UI.toast('Address copied', 'Paste it into the redirect URI box in Microsoft Entra ID.', 'success');
          });
        });
      }
    });
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
      details: 'Deletes the demonstration records only. Your own records, the sign-in accounts and your settings are kept. Export a backup first if you are unsure.',
      onConfirm: function () {
        var removed = 0, kept = 0;
        Store.COLLECTIONS.forEach(function (c) {
          if (c === 'users') return;              /* never delete sign-in accounts */
          var r = Store.stripDemo(c);
          removed += r.removed; kept += r.kept;
        });
        UI.toast('Sample data removed',
          removed + ' demonstration records were deleted. ' +
          (kept ? kept + ' record' + (kept === 1 ? '' : 's') + ' you had entered were kept. ' : '') +
          'Your sign-in accounts and settings are untouched.', 'success');
        Shell.refresh();
        Router.refresh();
      }
    });
  }

  /** Start on real data: everything empty, accounts and settings kept. */
  function emptyClub() {
    if (!CRUD.guard('settings', 'delete')) return;
    UI.confirm({
      title: 'Empty every module', tone: 'danger', confirmLabel: 'Empty the system',
      confirmWord: 'EMPTY', icon: 'package',
      message: 'Delete every record in every module, keeping your sign-in accounts and settings?',
      details: 'Members, meetings, attendance, courses, projects, reports, certificates, finance, equipment, gallery and documents are all emptied so the club can enter its own data. <strong>Accounts, club information, appearance, the certificate design and the Firebase connection are kept.</strong> Export a backup first — this cannot be undone. Type EMPTY to confirm.',
      onConfirm: function () {
        var removed = Store.clearRecords({ clearFiles: true });
        UI.toast('Everything cleared', removed + ' record' + (removed === 1 ? '' : 's') + ' deleted. Your accounts and settings were kept.',
          'success', { duration: 6000 });
        if (typeof Shell !== 'undefined' && Shell.refresh) Shell.refresh();
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
        (!editing ? { name: 'password', label: 'Temporary password', type: 'text', required: true, value: Auth.tempPassword(), colSpan: 2, help: 'Hand this over in person. The officer must choose a password of their own the first time they sign in.' } : { name: 'note', label: 'Password', value: 'Use the key button to issue a fresh temporary password.', colSpan: 2 })
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
          Router.refresh();
          handOverPassword(data, data.password);
        }).catch(function (err) {
          UI.toast('Could not create user', err.message, 'error');
        });
        return true;
      }
    });
  }

  /** Shows the one-time password once, with a copy button, because there is no
   *  email service: the administrator hands it over in person. */
  function handOverPassword(person, password) {
    UI.modal({
      title: 'Temporary password', subtitle: (person.name || person.username) + ' — ' + (person.role || ''),
      icon: 'key', size: 'sm',
      body: '<p class="muted">Give this password to ' + U.esc(person.name || person.username) +
        ' in person or by telephone. It works for one sign-in only: the app then asks them to choose a password of their own.</p>' +
        '<div class="code-block mono" id="temp-pass">' + U.esc(password) + '</div>' +
        '<div class="alert alert-warning mt-2">' + Icons.svg('alert-triangle') +
        '<div>Do not send it in a public group chat, and never write it on the notice board. If it is lost, reset it again.</div></div>',
      actions: [
        { label: 'Copy the password', variant: 'outline', onClick: function () {
            Utils.copyToClipboard(password).then(function () { UI.toast('Copied', 'The temporary password is on your clipboard.', 'success'); });
          } },
        { label: 'Done', variant: 'primary' }
      ]
    });
  }

  function resetPassword(user) {
    if (!CRUD.guard('settings', 'edit')) return;
    var suggested = Auth.tempPassword();
    UI.formModal({
      title: 'New password for ' + (user ? user.name : ''), subtitle: 'Issues a one-time password', icon: 'key', size: 'sm',
      formHtml: Forms.render([
        { name: 'password', label: 'Temporary password', type: 'text', required: true, value: suggested, colSpan: 2,
          help: 'At least 8 characters, mixing letters and numbers. ' + (user ? user.name.split(' ')[0] : 'The officer') + ' must choose their own the moment they sign in.' }
      ]),
      submitLabel: 'Issue the temporary password',
      onOpen: function (c, form) { Forms.init(form); },
      onSubmit: function (data) {
        Auth.resetPassword(user.id, data.password).then(function () {
          Router.refresh();
          handOverPassword(user, data.password);
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
