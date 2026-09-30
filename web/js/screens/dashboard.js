/* ==========================================================================
   dashboard.js — /
   The club at a glance: who is on the register, what is coming up, how the
   dues are doing, and what needs attention this week.
   ========================================================================== */
(function () {
  var ICT = window.ICT = window.ICT || {}
  var el = ICT.el
  var ui = ICT.widgets
  var icon = ICT.icon
  var fmt = ICT.fmt

  function render(root) {
    var host = el('div')
    ICT.mount(root, host)

    load()

    async function load() {
      ICT.mount(host, el('div.page', ui.loading('Collecting the club’s figures…')))
      try {
        var res = await ICT.api.dashboard()
        paint(res)
      } catch (error) {
        ICT.mount(host, el('div.page', [
          ui.pageHead('Dashboard', 'The club at a glance.'),
          ui.notice('The dashboard could not be loaded just now. ' + error.message, 'error'),
          el('div.mt-2', [ui.button('Try again', { variant: 'primary', icon: 'trendingUp', onClick: load })])
        ]))
      }
    }

    function paint(data) {
      var cards = data.cards || {}
      var settings = ICT.store.settings || {}
      var user = ICT.store.user || {}
      var currency = settings.currency || 'UGX'

      var page = el('div.page', [
        ui.pageHead(
          fmt.greeting() + ', ' + String(user.name || 'there').split(' ')[0],
          [settings.institution, settings.current_term, settings.academic_year].filter(Boolean).join(' • ') + ' — everything below is live from the club’s records.'
        )
      ])

      /* ---- Headline figures ---- */
      page.appendChild(el('div.grid.grid--stats', [
        ui.stat('Students & members', cards.members, 'users', null, fmt.number(cards.active_members) + ' active'),
        ui.stat('Executive committee', cards.cabinet, 'crown', 'amber', 'positions filled'),
        ui.stat('Attendance rate', fmt.percent(data.attendance && data.attendance.rate), 'checkSquare', 'green', fmt.number(cards.attendance_records) + ' marks on record'),
        ui.stat('Dues collected', fmt.money(cards.dues_collected, currency), 'coins', 'blue', fmt.number(cards.dues_defaulters) + ' student(s) still owing'),
        ui.stat('Meetings', cards.meetings, 'calendar', null, fmt.number(cards.upcoming_meetings) + ' coming up'),
        ui.stat('Activities', cards.activities, 'star', 'amber', fmt.number(cards.upcoming_activities) + ' planned'),
        ui.stat('Courses running', cards.running_courses, 'book', 'blue', fmt.number(cards.enrollments) + ' registrations'),
        ui.stat('Certificates issued', cards.certificates, 'award', 'green', 'printable and verifiable')
      ]))

      /* ---- Two columns: money + attendance ---- */
      var money = ui.card('Club dues', {
        icon: 'coins',
        subtitle: 'Collected against expected, this term',
        flush: false,
        body: el('div', [
          ui.bars([
            { label: 'Collected', value: cards.dues_collected, color: 'var(--green)' },
            { label: 'Outstanding', value: Math.max(0, (cards.dues_expected || 0) - (cards.dues_collected || 0)), color: 'var(--red)' }
          ], { money: true, currency: currency }),
          el('div.grid.grid--2.mt-2', [
            el('div', [el('div.small.muted', { text: 'Expected' }), el('b', { text: fmt.money(cards.dues_expected, currency) })]),
            el('div', [el('div.small.muted', { text: 'Records' }), el('b', { text: fmt.number(cards.dues_records) })])
          ]),
          el('div.mt-2', [ui.button('Open the dues register', { size: 'sm', icon: 'coins', onClick: function () { ICT.nav.go('/r/dues') } })])
        ])
      })

      var trend = (data.attendance && data.attendance.trend) || []
      var attendance = ui.card('Attendance trend', {
        icon: 'checkSquare',
        subtitle: 'The last recorded sessions',
        body: trend.length
          ? ui.columns(trend.slice(-8).map(function (row) {
            return { label: fmt.date(row.date), short: row.date, value: row.rate === null || row.rate === undefined ? 0 : Math.round(row.rate) }
          }))
          : ui.empty('No attendance recorded yet', 'Open Attendance and save a register after your next meeting — the trend appears here.')
      })

      page.appendChild(el('div.grid.grid--2', [money, attendance]))

      /* ---- Students owing dues ---- */
      var owing = (data.dues_defaulters || data.defaulters || [])
      page.appendChild(ui.card('Students with outstanding dues', {
        icon: 'alert',
        subtitle: 'Follow up with the class representatives',
        flush: true,
        body: owing.length
          ? ui.table([
            { key: 'full_name', label: 'Student', render: function (row) {
              return el('a.link', { href: '/r/members/' + row.member_id, onclick: function (event) { event.preventDefault(); ICT.nav.go('/r/members/' + row.member_id) }, text: row.full_name || ('#' + row.member_id) })
            } },
            { key: 'class_level', label: 'Class' },
            { key: 'guardian_phone', label: 'Guardian phone', render: function (row) { return row.guardian_phone || row.phone || '—' } },
            { key: 'balance', label: 'Balance', align: 'right', render: function (row) { return fmt.money(row.balance, currency) } }
          ], owing.slice(0, 8))
          : ui.empty('Every student is up to date', 'Dues balances will appear here as soon as the register has records.')
      }))

      /* ---- Coming up + class sizes ---- */
      var upcoming = (data.upcoming || [])
      var upcomingCard = ui.card('Coming up', {
        icon: 'calendar',
        body: upcoming.length
          ? el('div', { style: { display: 'grid', gap: '.6rem' } }, upcoming.slice(0, 6).map(function (item) {
            return el('div.between', [
              el('div', [
                el('div', { text: item.title || item.name || 'Club session' }),
                el('div.small.muted', { text: [fmt.date(item.date), item.venue || item.location].filter(Boolean).join(' • ') })
              ]),
              ui.badge(item.type || item.kind || 'Club')
            ])
          }))
          : ui.empty('Nothing scheduled', 'Create a meeting or an activity and it will show here.')
      })

      var classes = (data.members && data.members.byClass) || []
      var classCard = ui.card('Class sizes', {
        icon: 'users',
        body: classes.length
          ? ui.bars(classes.map(function (row) { return { label: row.name || row.class_level, value: row.value === undefined ? row.total : row.value } }))
          : ui.empty('No students on file yet', 'Add your first students under People → Students.')
      })

      page.appendChild(el('div.grid.grid--2', [upcomingCard, classCard]))

      /* ---- Quick actions ---- */
      var actions = [
        ['/r/members?new=1', 'Add a student', 'userPlus'],
        ['/attendance', 'Take attendance', 'checkSquare'],
        ['/r/dues', 'Record dues', 'coins'],
        ['/reports', 'Write the report', 'file'],
        ['/r/meetings?new=1', 'Schedule a meeting', 'calendar'],
        ['/r/certificates?new=1', 'Issue a certificate', 'award']
      ]
      page.appendChild(ui.card('Quick actions', {
        icon: 'star',
        body: el('div.flex.gap-1.wrap', actions.map(function (item) {
          return ui.button(item[1], { icon: item[2], onClick: function () { ICT.nav.go(item[0]) } })
        }))
      }))

      /* ---- Notes ---- */
      var notes = (data.notes || data.pinned_notes || [])
      if (notes.length) {
        page.appendChild(ui.card('Club notice board', {
          icon: 'note',
          body: el('div.cards-row', notes.slice(0, 3).map(function (note) {
            return el('div.record-card', [
              el('div.record-card__top', [
                el('div.record-card__icon', [icon('note', 18)]),
                el('div', [
                  el('div.record-card__title', { text: note.title }),
                  el('div.record-card__sub', { text: String(note.content || '').slice(0, 120) })
                ])
              ])
            ])
          }))
        }))
      }

      var small = el('div.small.muted.mt-2', { text: 'Figures update every time a record is saved. Nothing on this page is typed in by hand.' })
      page.appendChild(small)

      ICT.mount(host, page)
    }

    return null
  }

  ICT.screens = ICT.screens || {}
  ICT.screens.dashboard = render
})()
