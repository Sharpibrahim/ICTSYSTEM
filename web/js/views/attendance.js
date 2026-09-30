/**
 * Attendance — /attendance
 *
 * Pick what the register is for (a meeting, activity or course) and which class,
 * then mark every student present, late, absent, excused or left-early and save
 * the whole register in one go — the same endpoint the old screen used, so the
 * dues flags and summary come back with it.
 */
(function () {
  var ICT = (window.ICT = window.ICT || {})
  var el = ICT.util.el
  var icon = ICT.util.icon
  var ui = ICT.ui
  var STATUSES = [
    { value: 'Present', icon: 'check', tone: 'green' },
    { value: 'Late', icon: 'clock', tone: 'amber' },
    { value: 'Absent', icon: 'x', tone: 'red' },
    { value: 'Excused', icon: 'file', tone: 'blue' },
    { value: 'Left early', icon: 'logout', tone: 'purple' }
  ]

  function render(root, params, options) {
    options = options || {}
    var query = ICT.router.query()
    var state = {
      refType: query.get('ref_type') || 'meeting',
      refId: query.get('ref_id') || '',
      classLevel: query.get('class_level') || '',
      sessions: [],
      register: null,
      marks: {},
      loading: true,
      saving: false,
      error: null
    }

    var container = el('div')
    ICT.util.mount(root, container)
    load()

    /** The sessions a register can be taken for: meetings, activities, courses. */
    async function loadSessions(refType) {
      var resource = { meeting: 'meetings', activity: 'activities', course: 'courses' }[refType] || 'meetings'
      try {
        var res = await ICT.api.options(resource)
        return (res && res.data) || []
      } catch (error) {
        return []
      }
    }

    async function load(refreshSessions) {
      state.loading = true
      paint()
      try {
        if (refreshSessions || !state.sessions.length) {
          state.sessions = await loadSessions(state.refType)
          if (state.refId && !state.sessions.some((session) => String(session.value) === String(state.refId))) state.refId = ''
          if (!state.refId && state.sessions.length) state.refId = String(state.sessions[0].value)
        }
        if (!state.refId) {
          /* Nothing to take a register for yet — say so instead of erroring. */
          state.register = { roster: [], session: null, classes: [] }
          state.error = null
          state.loading = false
          paint()
          return
        }
        var res = await ICT.api.attendanceRegister({
          ref_type: state.refType,
          ref_id: state.refId,
          class_level: state.classLevel || undefined
        })
        state.register = res.data || res
        state.marks = {}
        ;(state.register.roster || []).forEach((student) => {
          state.marks[student.id] = student.status || 'Present'
        })
        state.error = null
      } catch (error) {
        state.error = error.message
        state.register = null
      } finally {
        state.loading = false
        paint()
      }
    }

    function summary() {
      var counts = {}
      STATUSES.forEach((status) => (counts[status.value] = 0))
      Object.values(state.marks).forEach((status) => {
        counts[status] = (counts[status] || 0) + 1
      })
      return counts
    }

    function paint() {
      var page = el('div.page')
      page.appendChild(ui.pageHead('Attendance', 'Mark a whole register in one pass — every student, saved together.'))

      if (state.loading && !state.register) {
        page.appendChild(el('div.card', el('div.card__body', ui.skeleton(6))))
        ICT.util.mount(container, page)
        return
      }
      if (state.error) {
        page.appendChild(el('div.card', el('div.card__body', ui.empty('Could not load the register', state.error, ui.button('Try again', { icon: 'refresh', onClick: load })))))
        ICT.util.mount(container, page)
        return
      }

      var reg = state.register || {}
      var classes = reg.classes || (ICT.store.optionSets.classes || [])
      var counts = summary()
      var roster = reg.roster || []

      var sessionSelect = el('select.select', { onchange: (event) => {
        state.refId = event.target.value
        load(false)
      } })
      if (state.sessions.length) {
        state.sessions.forEach((session) =>
          sessionSelect.appendChild(el('option', { value: session.value, text: session.label + (session.sub ? ' · ' + session.sub : '') }))
        )
      } else {
        sessionSelect.appendChild(el('option', { value: '', text: 'Nothing to mark yet' }))
      }
      sessionSelect.value = state.refId

      var picker = el('div.filters-bar', [
        selectControl('Register for', [
          { value: 'meeting', label: 'Meetings' },
          { value: 'activity', label: 'Activities' },
          { value: 'course', label: 'Courses' }
        ], state.refType, (value) => {
          state.refType = value
          state.refId = ''
          state.sessions = []
          load(true)
        }),
        el('div.filter-control', [el('span.filters-bar__label', { text: 'Session' }), sessionSelect]),
        selectControl('Class', [{ value: '', label: 'All classes' }, ...classes.map((c) => ({ value: c, label: c }))], state.classLevel, (value) => {
          state.classLevel = value
          load(false)
        })
      ])
      page.appendChild(picker)

      page.appendChild(el('div.grid.grid--stats', [
        statCard('Roster', roster.length, 'users', 'active students'),
        statCard('Present', counts.Present + counts.Late, 'check', roster.length ? Math.round(((counts.Present + counts.Late) / roster.length) * 100) + '% of the roster' : 'no students'),
        statCard('Absent', counts.Absent, 'alert', 'not in the register'),
        statCard('Excused', counts.Excused, 'file', 'with permission')
      ]))

      if (reg.session) {
        page.appendChild(ui.card(reg.session.title || 'Register', {
          subtitle: [ICT.util.formatDate(reg.session.date), reg.session.venue, reg.session.start_time ? ICT.util.formatTime(reg.session.start_time) : ''].filter(Boolean).join(' · ')
        }))
      }

      if (!roster.length) {
        page.appendChild(el('div.card', el('div.card__body', ui.empty(
          reg.session ? 'No students to mark' : 'Nothing to mark yet',
          reg.session
            ? 'No active students match this class. Add students, or choose another class.'
            : 'Create a meeting, activity or course first — then its register can be marked here.'
        ))))
        ICT.util.mount(container, page)
        return
      }

      var markAll = ui.button('Mark all present', { icon: 'checkSquare', onClick: () => {
        roster.forEach((student) => (state.marks[student.id] = 'Present'))
        paint()
      } })

      var rows = roster.map((student) =>
        el('tr', [
          el('td', [
            el('div.person', [
              el('span.avatar.avatar--sm', { text: ICT.util.initials(student.full_name) }),
              el('span', [el('div.person__name', { text: student.full_name || '—' }), el('div.person__meta', { text: [student.class_level, student.admission_number].filter(Boolean).join(' · ') })])
            ])
          ]),
          el('td', [ui.badge(student.house || '—', 'gray')]),
          el('td', [student.balance > 0 ? ui.badge(ICT.util.formatMoney(student.balance, ICT.store.settings.currency), 'red') : ui.badge('Paid', 'green')]),
          el('td', el('div.flex.gap-1.wrap', STATUSES.map((status) =>
            ui.button(status.value, {
              size: 'sm',
              variant: state.marks[student.id] === status.value ? 'primary' : 'ghost',
              onClick: () => {
                state.marks[student.id] = status.value
                paint()
              }
            })
          )))
        ])
      )

      page.appendChild(ui.card(null, {
        flush: true,
        actions: [markAll, ui.button(state.saving ? 'Saving…' : 'Save register', { variant: 'primary', icon: 'check', loading: state.saving, onClick: save })],
        body: el('div.table-wrap', el('table.data.register-table', [
          el('thead', el('tr', ['Student', 'House', 'Dues', 'Attendance'].map((label) => el('th', { text: label })))),
          el('tbody', rows)
        ]))
      }))

      ICT.util.mount(container, page)
    }

    function statCard(label, value, iconName, hint) {
      return el('div.stat', [
        el('div.stat__top', [el('span.stat__label', { text: label }), el('span.stat__icon', [icon(iconName, 17)])]),
        el('div.stat__value', { text: String(value) }),
        el('div.stat__hint', { text: hint })
      ])
    }

    function selectControl(label, options, value, onChange) {
      var select = el('select.select', { onchange: (event) => onChange(event.target.value) })
      options.forEach((option) => select.appendChild(el('option', { value: option.value, text: option.label })))
      select.value = value
      return el('div.filter-control', [el('span.filters-bar__label', { text: label }), select])
    }

    async function save() {
      state.saving = true
      paint()
      try {
        var marks = Object.keys(state.marks).map((id) => ({ member_id: Number(id), status: state.marks[id] }))
        var session = (state.register && state.register.session) || {}
        await ICT.api.saveAttendanceRegister({
          ref_type: state.refType,
          ref_id: session.id || Number(state.refId) || null,
          date: session.date || new Date().toISOString().slice(0, 10),
          class_level: state.classLevel || null,
          marks: marks
        })
        ui.toast.success('Register saved', marks.length + ' student(s) recorded.')
        load()
      } catch (error) {
        ui.toast.error('Could not save the register', error.message)
      } finally {
        state.saving = false
        paint()
      }
    }
  }

  ICT.views = ICT.views || {}
  ICT.views.attendance = render
})()
