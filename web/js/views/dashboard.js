/**
 * Dashboard — one payload (/api/dashboard) drives every widget:
 * statistics, dues finance, attendance trend, class mix, upcoming events,
 * the defaulter watchlist and the recent activity feed.
 */
(function () {
  var ICT = (window.ICT = window.ICT || {})
  var el = ICT.util.el
  var icon = ICT.util.icon
  var ui = ICT.ui

  function greeting() {
    var hour = new Date().getHours()
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  }

  function statCard(label, value, options) {
    options = options || {}
    return el('div.stat', { onclick: options.onClick, class: options.onClick ? 'stat--clickable' : '' }, [
      el('div.stat__top', [
        el('span.stat__label', { text: label }),
        el('span.stat__icon' + (options.tone ? '.stat__icon--' + options.tone : ''), [icon(options.icon || 'layers', 17)])
      ]),
      el('div.stat__value', { text: value }),
      options.hint ? el('div.stat__hint', { text: options.hint }) : null
    ])
  }

  function render(root) {
    var store = ICT.store
    var container = el('div')
    ICT.util.mount(root, container)
    ICT.util.mount(container, ui.skeleton(6))

    var unwatch = store.on('settings', () => load())
    load()

    async function load() {
      var data
      try {
        data = await ICT.api.dashboard()
      } catch (error) {
        unwatch && unwatch()
        ICT.util.mount(container, el('div.card', el('div.card__body', ui.empty('Could not load the dashboard', error.message, ui.button('Try again', { icon: 'refresh', onClick: load })))))
        return
      }
      var cards = data.cards || {}
      var finance = data.finance || {}
      var currency = store.settings.currency || 'UGX'

      var page = el('div.page')

      page.appendChild(
        ui.pageHead(
          greeting() + ', ' + String((store.user && store.user.name) || '').split(' ')[0],
          (store.settings.club_name || 'ICT Club') + ' · ' + (store.settings.current_term || '') + ' ' + (store.settings.academic_year || ''),
          [
            ui.button('Attendance register', { icon: 'check', onClick: () => ICT.router.go('/attendance') }),
            ui.button('Reports Studio', { variant: 'primary', icon: 'file', onClick: () => ICT.router.go('/reports') })
          ]
        )
      )

      /* Statistics — each card opens the module it counts. */
      page.appendChild(
        el('div.grid.grid--stats', [
          statCard('Students', ICT.util.formatNumber(cards.members), { icon: 'users', hint: ICT.util.formatNumber(cards.active_members) + ' active', onClick: () => ICT.router.go('/r/members') }),
          statCard('Executive committee', ICT.util.formatNumber(cards.cabinet), { icon: 'crown', hint: 'positions this term', onClick: () => ICT.router.go('/r/cabinet') }),
          statCard('Dues collected', ICT.util.formatMoney(finance.collected, currency), { icon: 'coins', tone: 'green', hint: 'of ' + ICT.util.formatMoney(finance.expected, currency) }),
          statCard('Outstanding', ICT.util.formatMoney(finance.outstanding, currency), { icon: 'alert', tone: (finance.outstanding || 0) > 0 ? 'amber' : 'green', hint: ICT.util.formatNumber(finance.defaulters) + ' student(s) owing', onClick: () => ICT.router.go('/r/dues') }),
          statCard('Meetings', ICT.util.formatNumber(cards.meetings), { icon: 'calendar', hint: ICT.util.formatNumber(cards.upcoming_meetings) + ' upcoming', onClick: () => ICT.router.go('/r/meetings') }),
          statCard('Attendance records', ICT.util.formatNumber(cards.attendance_records), { icon: 'checkSquare', hint: cards.attendance_rate ? cards.attendance_rate + '% present' : 'no registers yet', onClick: () => ICT.router.go('/r/attendance') }),
          statCard('Certificates', ICT.util.formatNumber(cards.certificates), { icon: 'award', hint: 'issued to completers', onClick: () => ICT.router.go('/r/certificates') }),
          statCard('Projects', ICT.util.formatNumber(cards.projects), { icon: 'rocket', hint: ICT.util.formatNumber(cards.project_tasks) + ' tasks', onClick: () => ICT.router.go('/r/projects') })
        ])
      )

      var collectedPercent = finance.expected ? Math.round((finance.collected / finance.expected) * 100) : 0

      page.appendChild(
        el('div.grid.grid--2', [
          ui.card('Club dues this term', {
            subtitle: ICT.util.formatMoney(finance.collected, currency) + ' collected of ' + ICT.util.formatMoney(finance.expected, currency),
            body: finance.expected
              ? el('div', [
                  ui.progress(collectedPercent, { tone: collectedPercent >= 75 ? 'green' : collectedPercent >= 40 ? 'amber' : 'red' }),
                  el('div.small.muted.mt-1', { text: collectedPercent + '% of the term’s dues collected' }),
                  finance.byTerm && finance.byTerm.length
                    ? el('div.mt-3', ui.barChart(finance.byTerm.map((row) => ({ label: row.label || row.term || '', value: row.collected || row.expected || 0 }))))
                    : null
                ])
              : ui.empty('No dues records yet', 'Club dues appear here once a term’s records are generated.', ui.button('Open Club dues', { icon: 'coins', onClick: () => ICT.router.go('/r/dues') }))
          }),
          ui.card('Class mix', {
            subtitle: 'Students per class',
            body: data.byClass && data.byClass.length
              ? ui.barChart(data.byClass.map((row) => ({ label: row.label || row.class_level, value: row.value || row.count || 0 })))
              : ui.empty('No students yet', 'Add students and their classes will be charted here.', ui.button('Add a student', { icon: 'userPlus', onClick: () => ICT.router.go('/r/members?new=1') }))
          })
        ])
      )

      page.appendChild(
        el('div.grid.grid--2', [
          ui.card('Upcoming', {
            subtitle: 'Meetings and activities ahead',
            flush: true,
            body: (data.upcoming && data.upcoming.length)
              ? el('div', data.upcoming.slice(0, 6).map((row) => upcomingRow(row)))
              : ui.empty('Nothing scheduled', 'Meetings and activities you create will show up here.')
          }),
          ui.card('Recent activity', {
            subtitle: 'What the club has been doing',
            flush: true,
            body: (data.activity && data.activity.length)
              ? el('div', data.activity.slice(0, 7).map((row) => activityRow(row)))
              : ui.empty('No activity yet', 'Actions taken in the system are recorded here.')
          })
        ])
      )

      if (finance.watchlist && finance.watchlist.length) {
        page.appendChild(
          ui.card('Dues watchlist', {
            subtitle: 'Students with the largest outstanding balance',
            flush: true,
            actions: [ui.button('Open register', { size: 'sm', icon: 'chevronRight', onClick: () => ICT.router.go('/r/dues') })],
            body: el('div', finance.watchlist.slice(0, 6).map((row) =>
              el('div.list-row', [
                el('div.avatar.avatar--sm', { text: ICT.util.initials(row.full_name || row.name) }),
                el('div.list-row__main', [
                  el('div.list-row__title', { text: row.full_name || row.name || '—' }),
                  el('div.list-row__meta', { text: [row.class_level, row.admission_number].filter(Boolean).join(' · ') || 'Student' })
                ]),
                el('div.list-row__side', [ui.badge(ICT.util.formatMoney(row.balance, currency), 'red')])
              ])
            ))
          })
        )
      }

      ICT.util.mount(container, page)
    }

    function upcomingRow(row) {
      return el('div.list-row', { onclick: row.href ? () => ICT.router.go(row.href) : null }, [
        el('div.row-icon', [icon(row.type === 'activity' ? 'sparkles' : 'calendar', 16)]),
        el('div.list-row__main', [
          el('div.list-row__title', { text: row.title || row.label || '—' }),
          el('div.list-row__meta', { text: [ICT.util.formatDate(row.date), row.venue, row.start_time ? ICT.util.formatTime(row.start_time) : ''].filter(Boolean).join(' · ') })
        ]),
        el('div.list-row__side', [ui.badge(row.type || 'meeting', row.type === 'activity' ? 'purple' : 'blue')])
      ])
    }

    function activityRow(row) {
      return el('div.list-row', [
        el('div.row-icon', [icon('clock', 15)]),
        el('div.list-row__main', [
          el('div.list-row__title', { text: row.detail || (ICT.util.titleCase(row.action) + ' ' + (row.resource || '')) }),
          el('div.list-row__meta', { text: (row.user_name || 'System') + ' · ' + ICT.util.relativeTime(row.created_at) })
        ])
      ])
    }
  }

  ICT.views = ICT.views || {}
  ICT.views.dashboard = render
})()
