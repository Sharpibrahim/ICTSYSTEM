/* ==========================================================================
   attendance.js — /attendance

   The register sheet: pick a session (a meeting, an activity or a course),
   optionally narrow it to one class, mark every student Present, Absent,
   Late, Excused or Left Early, then save the whole register in one go.
   A student still owing dues is flagged on the sheet so the patron can ask.
   ========================================================================== */
(function () {
  var ICT = window.ICT = window.ICT || {}
  var el = ICT.el
  var ui = ICT.widgets
  var icon = ICT.icon
  var fmt = ICT.fmt

  var STATUSES = [
    { value: 'Present', tone: 'green' },
    { value: 'Absent', tone: 'red' },
    { value: 'Late', tone: 'amber' },
    { value: 'Excused', tone: 'blue' },
    { value: 'Left Early', tone: 'gray' }
  ]

  var RESOURCE_FOR = { meeting: 'meetings', activity: 'activities', course: 'courses' }

  function render(root, route) {
    var query = ICT.nav.query()
    var state = {
      refType: route && route.ref_type ? route.ref_type : (query.get('ref_type') || 'meeting'),
      refId: (route && route.ref_id) || query.get('ref_id') || '',
      classLevel: query.get('class_level') || '',
      classes: [],
      sessions: [],
      register: null,
      marks: {},
      loading: true,
      saving: false,
      error: null
    }

    var host = el('div')
    ICT.mount(root, host)

    load(true)

    async function load(sessionsToo) {
      state.loading = true
      paint()
      try {
        if (sessionsToo || !state.sessions.length) {
          var listed = await ICT.api.list(RESOURCE_FOR[state.refType] || 'meetings', { pageSize: 200, sort: state.refType === 'meeting' ? '-date' : '-date' })
          state.sessions = (listed.data || []).map(function (row) {
            return { value: row.id, label: row.title || ('#' + row.id), sub: fmt.date(row.date || row.start_date) }
          })
          if (state.refId && !state.sessions.some(function (s) { return String(s.value) === String(state.refId) })) state.refId = ''
          if (!state.refId && state.sessions.length) state.refId = String(state.sessions[0].value)
        }

        if (!state.refId) {
          state.register = { roster: [], session: null, classes: [], summary: {} }
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
        state.register = res
        state.classes = res.classes || []
        state.marks = {}
        ;(res.roster || []).forEach(function (student) {
          state.marks[student.member_id] = {
            status: student.status || '',
            check_in_time: student.check_in_time || '',
            remarks: student.remarks || '',
            attendance_id: student.attendance_id
          }
        })
        state.error = null
      } catch (error) {
        state.error = error
      }
      state.loading = false
      paint()
    }

    function counts() {
      var tally = { Present: 0, Absent: 0, Late: 0, Excused: 0, 'Left Early': 0, unmarked: 0, total: 0 }
      ;(state.register ? state.register.roster || [] : []).forEach(function (student) {
        tally.total += 1
        var status = (state.marks[student.member_id] || {}).status
        if (!status) tally.unmarked += 1
        else if (tally[status] === undefined) tally[status] = 1
        else tally[status] += 1
      })
      return tally
    }

    function paint() {
      if (state.loading) {
        ICT.mount(host, el('div.page', [ui.pageHead('Attendance', 'Mark the register for a club session.'), ui.loading('Opening the register…')]))
        return
      }

      var page = el('div.page')
      var session = state.register && state.register.session

      page.appendChild(ui.pageHead(
        'Attendance',
        session ? session.title + ' • ' + fmt.date(session.date) + (session.venue ? ' • ' + session.venue : '') : 'Mark the register for a club session.',
        [
          ui.button('Save register', { variant: 'primary', icon: 'check', disabled: state.saving || !state.refId, onClick: save }),
          ui.button('Export CSV', { icon: 'download', onClick: function () { ICT.api.exportCsv('attendance', { ref_type: state.refType, ref_id: state.refId }) } })
        ]
      ))

      /* ---- Which session ---- */
      var sessionSelect = ui.select(state.sessions.map(function (s) { return { value: s.value, label: s.label + (s.sub ? ' · ' + s.sub : '') } }), state.refId, function (value) {
        state.refId = value
        load(false)
      })
      sessionSelect.id = 'register-session'
      if (!state.sessions.length) sessionSelect.appendChild(el('option', { value: '', text: 'Nothing to mark yet' }))

      var typeSelect = ui.select(
        [{ value: 'meeting', label: 'Meetings' }, { value: 'activity', label: 'Activities' }, { value: 'course', label: 'Courses' }],
        state.refType,
        function (value) {
          state.refType = value
          state.refId = ''
          state.sessions = []
          load(true)
        }
      )

      var classSelect = ui.select(
        [{ value: '', label: 'All classes' }].concat(state.classes.map(function (c) { return { value: c, label: c } })),
        state.classLevel,
        function (value) { state.classLevel = value; load(false) }
      )

      page.appendChild(el('div.filters-bar', [
        el('div.filter-control', [el('span.filters-bar__label', { text: 'Register for' }), typeSelect]),
        el('div.filter-control', { style: { flex: '1 1 260px' } }, [el('span.filters-bar__label', { text: 'Session' }), sessionSelect]),
        el('div.filter-control', [el('span.filters-bar__label', { text: 'Class' }), classSelect]),
        ui.button('Mark all present', { icon: 'checkSquare', onClick: markAllPresent }),
        ui.button('Clear marks', { variant: 'ghost', icon: 'x', onClick: clearMarks })
      ]))

      if (state.error) {
        page.appendChild(ui.card(null, { body: ui.notice(state.error.message, 'error') }))
      }

      var tally = counts()
      page.appendChild(el('div.grid.grid--stats', [
        ui.stat('On the register', tally.total, 'users'),
        ui.stat('Present', tally.Present, 'check', 'green'),
        ui.stat('Absent', tally.Absent, 'x', 'red'),
        ui.stat('Late', tally.Late, 'clock', 'amber'),
        ui.stat('Not marked yet', tally.unmarked, 'alert', 'blue')
      ]))

      var roster = (state.register && state.register.roster) || []
      if (!roster.length) {
        page.appendChild(ui.card(null, { body: ui.empty(
          session ? 'No students on this register' : 'Nothing to mark yet',
          session
            ? 'No active students match the class you picked. Add students, or choose another class.'
            : 'Create a meeting, an activity or a course first — then its register can be marked here.',
          session ? null : ui.button('New meeting', { variant: 'primary', icon: 'plus', onClick: function () { ICT.nav.go('/r/meetings?new=1') } })
        ) }))
      } else {
        page.appendChild(registerCard(roster))
      }

      ICT.mount(host, page)
    }

    function registerCard(roster) {
      var body = el('div.table-wrap', el('table.register-table.data', [
        el('thead', el('tr', [
          el('th', { text: 'Student' }),
          el('th', { text: 'Class' }),
          el('th', { text: 'House' }),
          el('th', { text: 'Status' }),
          el('th', { text: 'Time in' }),
          el('th', { text: 'Remarks' })
        ])),
        el('tbody', roster.map(function (student) {
          var mark = state.marks[student.member_id] || {}
          var owing = duesFor(student.member_id)

          var statusCell = el('div.flex.gap-1.wrap', STATUSES.map(function (status) {
            var active = mark.status === status.value
            var node = el('button.btn.btn--sm' + (active ? '.btn--primary' : ''), {
              type: 'button',
              title: 'Mark ' + status.value,
              onclick: function () {
                mark.status = active ? '' : status.value
                state.marks[student.member_id] = mark
                paint()
              }
            }, [el('span', { text: status.value })])
            return node
          }))

          var timeCell = el('input.input', {
            type: 'time',
            value: mark.check_in_time || '',
            oninput: function (event) { mark.check_in_time = event.target.value; state.marks[student.member_id] = mark }
          })
          timeCell.style.maxWidth = '120px'

          var remarksCell = el('input.input', {
            value: mark.remarks || '',
            placeholder: 'Note',
            oninput: function (event) { mark.remarks = event.target.value; state.marks[student.member_id] = mark }
          })

          return el('tr', [
            el('td', [
              el('div', { text: student.full_name }),
              owing ? el('div.small', [el('span.badge.badge--red', { text: 'Owes ' + fmt.money(owing.balance, (ICT.store.settings || {}).currency) })]) : null
            ]),
            el('td', { text: [student.class_level, student.stream].filter(Boolean).join(' ') || '—' }),
            el('td', { text: student.house || '—' }),
            el('td', statusCell),
            el('td', timeCell),
            el('td', remarksCell)
          ])
        }))
      ]))
      return ui.card('Register', { icon: 'checkSquare', subtitle: 'Mark each student, then save the register', flush: true, body: body })
    }

    function duesFor(memberId) {
      var dues = (state.register && state.register.dues) || []
      return dues.filter(function (row) { return Number(row.member_id) === Number(memberId) })[0] || null
    }

    function markAllPresent() {
      Object.keys(state.marks).forEach(function (key) {
        state.marks[key].status = 'Present'
        if (!state.marks[key].check_in_time) state.marks[key].check_in_time = new Date().toTimeString().slice(0, 5)
      })
      paint()
      ui.toast.success('All marked present', 'Change anyone who is absent, late or excused, then save.')
    }

    function clearMarks() {
      Object.keys(state.marks).forEach(function (key) { state.marks[key].status = '' })
      paint()
    }

    async function save() {
      var session = state.register && state.register.session
      if (!session) {
        ui.toast.error('Pick a session first', 'Choose which meeting, activity or course you are marking.')
        return
      }
      state.saving = true
      paint()
      try {
        var records = Object.keys(state.marks).map(function (memberId) {
          var mark = state.marks[memberId]
          return {
            member_id: Number(memberId),
            status: mark.status || null,
            check_in_time: mark.check_in_time || null,
            remarks: mark.remarks || null
          }
        })
        var res = await ICT.api.saveAttendance({
          ref_type: state.refType,
          ref_id: Number(state.refId),
          session_title: session.title,
          session_date: session.date,
          records: records
        })
        ui.toast.success('Register saved', fmt.number(res.created || 0) + ' new, ' + fmt.number(res.updated || 0) + ' updated, ' + fmt.number(res.cleared || 0) + ' cleared.')
        state.saving = false
        load(false)
      } catch (error) {
        state.saving = false
        paint()
        ui.toast.error('Could not save the register', error.message)
      }
    }

    return null
  }

  ICT.screens = ICT.screens || {}
  ICT.screens.attendance = render
})()
