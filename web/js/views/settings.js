/**
 * Settings — /settings
 *
 * Club profile (school name, patron, term, dues per term, currency, contacts),
 * password change, user accounts, the activity log and a JSON backup.
 * Administrators see everything; executives and students see what applies
 * to them.
 */
(function () {
  var ICT = (window.ICT = window.ICT || {})
  var el = ICT.util.el
  var icon = ICT.util.icon
  var ui = ICT.ui

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
    var container = el('div')
    /* The profile fields built by paint(), kept here so the save, password and
       backup buttons can always reach the current inputs. */
    var inputs = {}
    ICT.util.mount(root, container)

    store.refreshSettings().catch(() => {})
    paint()

    function paint() {
      var settings = store.settings || {}
      var page = el('div.page')
      page.appendChild(ui.pageHead('Settings', 'The club profile, your password and the system records.'))

      /* Club profile ------------------------------------------------- */
      inputs = {}
      var profileForm = el('div.form-grid', [
        el('div.form-section', [el('h3', { text: 'Club profile' })]),
        ...PROFILE_FIELDS.map(([key, label]) => {
          var input = el('input.input', { value: settings[key] === undefined || settings[key] === null ? '' : settings[key] })
          inputs[key] = input
          if (!canEdit) input.disabled = true
          return el('div.field', [el('label.field__label', [el('span', { text: label })]), input])
        })
      ])

      page.appendChild(ui.card(null, {
        icon: 'school',
        actions: canEdit ? [ui.button('Save profile', { variant: 'primary', icon: 'check', onClick: saveProfile })] : [],
        body: profileForm
      }))

      /* Password ---------------------------------------------------- */
      page.appendChild(el('div.grid.grid--2', [
        ui.card('Your account', {
          icon: 'shield',
          body: el('div', [
            ui.kv([
              ['Name', user.name || '—'],
              ['Username', user.username || '—'],
              ['Email', user.email || '—'],
              ['Access level', user.role || '—']
            ]),
            el('div.form-grid.mt-2', [
              el('div.field', [el('label.field__label', [el('span', { text: 'Current password' })]), (inputs.current = el('input.input', { type: 'password' }))]),
              el('div.field', [el('label.field__label', [el('span', { text: 'New password' })]), (inputs.next = el('input.input', { type: 'password' }))]),
              el('div.field', [ui.button('Change password', { icon: 'shield', onClick: changePassword })])
            ])
          ])
        }),
        ui.card('Data & storage', {
          icon: 'layers',
          body: el('div', [
            el('div.small', { style: { lineHeight: '1.7' } }, [
              el('div', [el('b', { text: 'Database file: ' }), el('code', { text: 'server/data/ictclub.db' })]),
              el('div', [el('b', { text: 'Backups: ' }), el('span', { text: 'keep a JSON backup with the club file every term' })]),
              el('div', [el('b', { text: 'Create the account if the file is empty: ' }), el('code', { text: 'npm run db:seed' })]),
              el('div', [el('b', { text: 'Erase every club record: ' }), el('code', { text: 'npm run db:reset' })])
            ]),
            el('div.flex.gap-1.wrap.mt-2', [
              ui.button('Reload app', { size: 'sm', icon: 'refresh', onClick: () => location.reload() }),
              isAdmin ? ui.button('Download JSON backup', { size: 'sm', icon: 'shield', onClick: backup }) : null
            ])
          ])
        })
      ]))

      /* User accounts ------------------------------------------------ */
      if (isAdmin) {
        var usersCard = ui.card('User accounts', {
          icon: 'users',
          subtitle: 'Executive committee and student logins',
          flush: true,
          actions: [ui.button('New user account', { size: 'sm', variant: 'primary', icon: 'plus', onClick: () => ICT.router.go('/r/users?new=1') })],
          body: el('div', { dataset: { users: 'host' } }, ui.loading('Loading accounts…'))
        })
        page.appendChild(usersCard)
        loadUsers(usersCard.querySelector('[data-users]'))
      }

      /* Activity log ------------------------------------------------- */
      var activityCard = ui.card('Activity log', {
        icon: 'clock',
        subtitle: 'Who did what, most recent first',
        flush: true,
        body: el('div', { dataset: { activity: 'host' } }, ui.loading('Loading activity…'))
      })
      page.appendChild(activityCard)
      loadActivity(activityCard.querySelector('[data-activity]'))

      ICT.util.mount(container, page)
    }

    async function saveProfile() {
      var payload = {}
      PROFILE_FIELDS.forEach(([key]) => (payload[key] = (inputs[key] ? inputs[key].value : '')))
      try {
        await ICT.api.saveSettings(payload)
        await store.refreshSettings()
        ui.toast.success('Club profile saved')
        paint()
      } catch (error) {
        ui.toast.error('Could not save settings', error.message)
      }
    }

    async function changePassword() {
      var current = inputs.current.value
      var next = inputs.next.value
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
        var res = await ICT.api.list('users', { pageSize: 100 })
        var rows = res.data || []
        if (!rows.length) {
          ICT.util.mount(host, ui.empty('No accounts yet', 'Create accounts for the executive committee here; students can also register from the sign-in screen.'))
          return
        }
        ICT.util.mount(host, ui.table(
          [
            { key: 'name', label: 'Name' },
            { key: 'username', label: 'Username' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Access level', render: (row) => ui.badge(row.role === 'admin' ? 'Administrator' : row.role === 'cabinet' ? 'Student executive' : 'Student member', row.role === 'admin' ? 'brand' : row.role === 'cabinet' ? 'blue' : 'gray') },
            { key: 'status', label: 'Status', render: (row) => ui.badgeFor(row.status) }
          ],
          rows,
          {
            rowActions: (row) => [ui.button('Open', { size: 'sm', variant: 'ghost', iconOnly: true, icon: 'chevronRight', onClick: () => ICT.router.go('/r/users/' + row.id) })]
          }
        ))
      } catch (error) {
        ICT.util.mount(host, ui.empty('Could not load the accounts', error.message))
      }
    }

    async function loadActivity(host) {
      try {
        var res = await ICT.api.activity(60)
        var rows = (res && res.data) || []
        if (!rows.length) {
          ICT.util.mount(host, ui.empty('No activity yet', 'Actions taken in the system are recorded here.'))
          return
        }
        ICT.util.mount(host, el('div', rows.map((row) =>
          el('div.list-row', [
            el('div.row-icon', [icon('clock', 15)]),
            el('div.list-row__main', [
              el('div.list-row__title', { text: row.detail || (ICT.util.titleCase(row.action) + ' ' + (row.resource || '')) }),
              el('div.list-row__meta', { text: (row.user_name || 'System') + ' · ' + ICT.util.relativeTime(row.created_at) })
            ])
          ])
        )))
      } catch (error) {
        ICT.util.mount(host, ui.empty('Could not load the activity log', error.message))
      }
    }
  }

  ICT.views = ICT.views || {}
  ICT.views.settings = render
})()
