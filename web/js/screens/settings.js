/* ==========================================================================
   settings.js — /settings

   The club profile (school name, patron, term, dues per term, currency,
   contacts), the signed-in user's own password, the user accounts, the
   activity log and a JSON backup of everything.
   ========================================================================== */
(function () {
  var ICT = window.ICT = window.ICT || {}
  var el = ICT.el
  var ui = ICT.widgets
  var icon = ICT.icon
  var fmt = ICT.fmt

  var PROFILE_FIELDS = [
    ['club_name', 'Club name'],
    ['club_tagline', 'Tagline'],
    ['institution', 'School'],
    ['academic_year', 'Academic year'],
    ['current_term', 'Current term'],
    ['currency', 'Currency'],
    ['dues_per_term', 'Dues per term'],
    ['attendance_target', 'Attendance target (%)'],
    ['patron_name', 'Club patron'],
    ['contact_email', 'Contact email'],
    ['contact_phone', 'Contact phone'],
    ['meeting_frequency', 'Meeting day and time']
  ]

  function render(root) {
    var store = ICT.store
    var user = store.user || {}
    var isAdmin = user.role === 'admin'
    var canEdit = user.role === 'admin' || user.role === 'cabinet'

    /* The profile inputs are kept here so the buttons always reach the ones
       that are on the page right now. */
    var inputs = {}
    var container = el('div')
    ICT.mount(root, container)

    paint()
    store.refreshSettings().then(paint).catch(function () { /* keep what we have */ })

    function paint() {
      var settings = store.settings || {}
      var page = el('div.page', ui.pageHead('Settings', 'The club profile, your password and the system records.'))

      /* ---- Club profile ---- */
      inputs = {}
      var profileFields = PROFILE_FIELDS.map(function (pair) {
        var key = pair[0]
        var input = el('input.input', { value: settings[key] === undefined || settings[key] === null ? '' : settings[key] })
        inputs[key] = input
        if (!canEdit) input.disabled = true
        return ui.field(pair[1], input)
      })

      page.appendChild(ui.card('Club profile', {
        icon: 'school',
        subtitle: 'Shown on the dashboard, reports and certificates',
        actions: canEdit ? [ui.button('Save profile', { variant: 'primary', icon: 'check', onClick: saveProfile })] : [],
        body: el('div.form-grid', [el('div.form-section', [el('h3', { text: 'The club' })])].concat(profileFields))
      }))

      /* ---- Your account + data ---- */
      page.appendChild(el('div.grid.grid--2', [
        ui.card('Your account', {
          icon: 'shield',
          body: el('div', [
            ui.kv([
              ['Name', user.name || '—'],
              ['Username', user.username || '—'],
              ['Email', user.email || '—'],
              ['Access level', ICT.titleCase(user.role || '')]
            ]),
            el('div.form-grid.mt-2', [
              ui.field('Current password', (inputs.current = el('input.input', { id: 'current-password', type: 'password' }))),
              ui.field('New password', (inputs.next = el('input.input', { id: 'new-password', type: 'password' }))),
              el('div.field', [el('label.field__label', [el('span', { text: ' ' })]), ui.button('Change password', { icon: 'shield', onClick: changePassword })])
            ])
          ])
        }),
        ui.card('Data & storage', {
          icon: 'layers',
          body: el('div', [
            el('div.small', { style: { lineHeight: '1.8' } }, [
              el('div', [el('b', { text: 'Database file: ' }), el('code', { text: 'server/data/ictclub.db' })]),
              el('div', [el('b', { text: 'Backup: ' }), el('span', { text: 'keep a JSON copy with the club file every term' })]),
              el('div', [el('b', { text: 'Create the account if the file is empty: ' }), el('code', { text: 'npm run db:seed' })]),
              el('div', [el('b', { text: 'Erase every club record: ' }), el('code', { text: 'npm run db:reset' })])
            ]),
            el('div.flex.gap-1.mt-2', [
              ui.button('Download backup (JSON)', { icon: 'download', onClick: backup, disabled: !isAdmin })
            ])
          ])
        })
      ]))

      /* ---- User accounts (administrators only) ---- */
      if (isAdmin) {
        var usersHost = el('div', { dataset: { users: 'host' } }, ui.loading('Loading accounts…'))
        page.appendChild(ui.card('User accounts', {
          icon: 'users',
          subtitle: 'Executive committee and student logins',
          flush: true,
          actions: [ui.button('New user account', { size: 'sm', variant: 'primary', icon: 'plus', onClick: function () { ICT.nav.go('/r/users?new=1') } })],
          body: usersHost
        }))
        loadUsers(usersHost)
      }

      /* ---- Activity log ---- */
      var activityHost = el('div', { dataset: { activity: 'host' } }, ui.loading('Loading activity…'))
      page.appendChild(ui.card('Activity log', {
        icon: 'clock',
        subtitle: 'Who did what, most recent first',
        flush: true,
        body: activityHost
      }))
      loadActivity(activityHost)

      ICT.mount(container, page)
    }

    /* ------------------------------------------------------------ Writes */

    async function saveProfile() {
      var payload = {}
      PROFILE_FIELDS.forEach(function (pair) {
        var key = pair[0]
        payload[key] = inputs[key] ? inputs[key].value : ''
      })
      try {
        await ICT.api.saveSettings(payload)
        await store.refreshSettings()
        ui.toast.success('Club profile saved', 'The dashboard and certificates now use these details.')
        paint()
      } catch (error) {
        ui.toast.error('Could not save the settings', error.message)
      }
    }

    async function changePassword() {
      var current = inputs.current ? inputs.current.value : ''
      var next = inputs.next ? inputs.next.value : ''
      if (!next || next.length < 6) {
        ui.toast.error('Password too short', 'Use at least 6 characters.')
        return
      }
      try {
        await ICT.api.changePassword({ current_password: current, new_password: next })
        inputs.current.value = ''
        inputs.next.value = ''
        ui.toast.success('Password changed', 'Use the new password next time you sign in.')
      } catch (error) {
        ui.toast.error('Could not change the password', error.message)
      }
    }

    async function backup() {
      try {
        await ICT.api.downloadBackup()
        ui.toast.success('Backup downloaded', 'Keep it with the club file.')
      } catch (error) {
        ui.toast.error('Could not create the backup', error.message)
      }
    }

    async function loadUsers(host) {
      try {
        var res = await ICT.api.list('users', { pageSize: 50 })
        var rows = res.data || []
        ICT.mount(host, rows.length
          ? ui.table([
            { key: 'name', label: 'Name' },
            { key: 'username', label: 'Username' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Access', render: function (row) { return ui.badge(ICT.titleCase(row.role)) } },
            { key: 'status', label: 'Status', render: function (row) { return ui.badge(row.status) } },
            { key: 'last_login', label: 'Last seen', render: function (row) { return row.last_login ? fmt.timeAgo(row.last_login) : 'never' } },
            { key: '__actions', label: '', align: 'right', render: function (row) {
              return ui.button('Open', { size: 'sm', icon: 'eye', onClick: function () { ICT.nav.go('/r/users/' + row.id) } })
            } }
          ], rows, { onRowClick: function (row) { ICT.nav.go('/r/users/' + row.id) } })
          : ui.empty('No accounts yet', 'Create the executive committee logins here.'))
      } catch (error) {
        ICT.mount(host, ui.notice('Could not load the accounts. ' + error.message, 'error'))
      }
    }

    async function loadActivity(host) {
      try {
        var res = await ICT.api.activity(60)
        var rows = (res && res.data) || []
        ICT.mount(host, rows.length
          ? el('div', { style: { display: 'grid' } }, rows.map(function (row) {
            return el('div', { style: { padding: '.6rem 1.1rem', borderBottom: '1px solid var(--line-2)' } }, [
              el('div', [
                el('b', { text: row.user_name || 'Someone' }),
                el('span', { text: ' ' + String(row.action || 'updated') + ' ' + String(row.resource || '') })
              ]),
              el('div.small.muted', { text: (row.detail || '') + ' • ' + fmt.timeAgo(row.created_at) })
            ])
          }))
          : ui.empty('No activity yet', 'Saving a record writes a line here.'))
      } catch (error) {
        ICT.mount(host, ui.notice('Could not load the activity log. ' + error.message, 'error'))
      }
    }

    return null
  }

  ICT.screens = ICT.screens || {}
  ICT.screens.settings = render
})()
