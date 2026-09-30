/* ==========================================================================
   reports.js — /reports

   The reports studio writes the club's official report from its own records:
   membership, attendance, dues, courses, certificates — with the figures
   filled in and the space for the patron's signature at the bottom. The
   draft can be edited, printed, copied or saved as a report record that then
   goes through the approval stages.
   ========================================================================== */
(function () {
  var ICT = window.ICT = window.ICT || {}
  var el = ICT.el
  var ui = ICT.widgets
  var fmt = ICT.fmt

  var TYPES = ['Termly Report', 'Monthly Report', 'Attendance Report', 'Dues Report', 'Activity Report', 'Course Report']

  function render(root) {
    var today = new Date()
    var from = new Date(today.getFullYear(), today.getMonth() - 2, 1)

    var state = {
      type: 'Termly Report',
      from: from.toISOString().slice(0, 10),
      to: today.toISOString().slice(0, 10),
      title: '',
      text: '',
      data: null,
      stats: null,
      generating: false,
      saving: false
    }

    var host = el('div')
    ICT.mount(root, host)
    paint()
    generate()

    function paint() {
      var page = el('div.page')

      page.appendChild(ui.pageHead(
        'Reports Studio',
        'Every figure below comes from the club’s own records — nothing is typed in by hand.',
        [
          ui.button('Generate report', { icon: 'file', onClick: generate, disabled: state.generating }),
          ui.button('Print', { variant: 'primary', icon: 'printer', onClick: printDraft }),
          ui.button('Copy text', { icon: 'note', onClick: copyDraft }),
          ui.button('Save as a report record', { icon: 'check', onClick: save, disabled: state.saving })
        ]
      ))

      /* Period and type */
      var typeSelect = ui.select(TYPES, state.type, function (value) { state.type = value; generate() })
      var fromInput = el('input.input', { type: 'date', value: state.from, onchange: function (event) { state.from = event.target.value; generate() } })
      var toInput = el('input.input', { type: 'date', value: state.to, onchange: function (event) { state.to = event.target.value; generate() } })

      page.appendChild(el('div.filters-bar', [
        el('div.filter-control', [el('span.filters-bar__label', { text: 'Report type' }), typeSelect]),
        el('div.filter-control', [el('span.filters-bar__label', { text: 'From' }), fromInput]),
        el('div.filter-control', [el('span.filters-bar__label', { text: 'To' }), toInput]),
        el('div.filter-control', [el('span.filters-bar__label', { text: 'Title' }), el('input.input', {
          value: state.title,
          placeholder: 'Shown on the saved record',
          oninput: function (event) { state.title = event.target.value }
        })])
      ]))

      if (state.generating && !state.text) {
        page.appendChild(el('div.card', el('div.card__body', ui.loading('Collecting the club’s figures…'))))
        ICT.mount(host, page)
        return
      }

      if (state.stats) {
        page.appendChild(el('div.grid.grid--stats', [
          ui.stat('Members', state.stats.members, 'users', null, fmt.number(state.stats.active) + ' active'),
          ui.stat('Attendance rate', state.stats.attendance_rate + '%', 'checkSquare', 'green', fmt.number(state.stats.attendance_records) + ' marks'),
          ui.stat('Dues collected', fmt.money(state.stats.dues_collected, currency()), 'coins', 'blue', 'of ' + fmt.money(state.stats.dues_expected, currency())),
          ui.stat('Outstanding', fmt.money(state.stats.dues_outstanding, currency()), 'alert', 'red', fmt.number(state.stats.defaulters) + ' student(s)'),
          ui.stat('Meetings & activities', state.stats.meetings + state.stats.activities, 'calendar'),
          ui.stat('Certificates', state.stats.certificates, 'award', 'amber', 'issued to date')
        ]))
      }

      var editor = el('textarea.textarea', { rows: 22 })
      editor.value = state.text
      editor.addEventListener('input', function () { state.text = editor.value })
      editor.id = 'report-draft'

      page.appendChild(ui.card('The report', {
        icon: 'file',
        subtitle: 'Edit anything before you print or save it',
        body: editor
      }))

      ICT.mount(host, page)
    }

    function currency() { return (ICT.store.settings || {}).currency || 'UGX' }

    /* ---------------------------------------------------------- Generating */

    async function generate() {
      state.generating = true
      paint()
      try {
        var res = await ICT.api.reportData({ from: state.from, to: state.to })
        var data = res.data || res
        state.data = data
        state.stats = summarise(data)
        state.text = compose(data)
        if (!state.title) {
          state.title = state.type + ' — ' + fmt.date(state.from) + ' to ' + fmt.date(state.to)
        }
      } catch (error) {
        ui.toast.error('Could not collect the figures', error.message)
      }
      state.generating = false
      paint()
    }

    /** The figures the report quotes, taken straight from /api/reports/data. */
    function summarise(data) {
      var members = data.members || {}
      var dues = (data.dues && data.dues.summary) || {}
      var statuses = (data.attendance && data.attendance.byStatus) || []
      var byStatus = {}
      statuses.forEach(function (row) { byStatus[row.name] = row.value })
      var present = (byStatus.Present || 0) + (byStatus.Late || 0)
      var total = statuses.reduce(function (sum, row) { return sum + (Number(row.value) || 0) }, 0)
      return {
        members: members.total || 0,
        active: members.active || 0,
        female: members.female || 0,
        male: members.male || 0,
        meetings: (data.meetings || []).length,
        activities: (data.activities || []).length,
        courses: (data.courses || []).length,
        projects: (data.projects || []).length,
        certificates: (data.certificates || []).length,
        cabinet: (data.cabinet || []).length,
        attendance_records: total,
        attendance_rate: total ? Math.round((present / total) * 100) : 0,
        dues_collected: dues.collected || 0,
        dues_expected: dues.expected || 0,
        dues_outstanding: dues.outstanding || 0,
        defaulters: (dues.defaulters || []).length
      }
    }

    /** Writes the report itself, in the order a school report reads. */
    function compose(data) {
      var settings = ICT.store.settings || {}
      var s = state.stats
      var dues = data.dues || {}
      var rule = '--------------------------------------------------------------'
      var lines = []
      var signer = (ICT.store.user && ICT.store.user.name) || 'the club executive'

      lines.push(settings.club_name || 'ICT Club')
      lines.push([settings.institution, settings.current_term, settings.academic_year].filter(Boolean).join(' • '))
      lines.push(rule)
      lines.push(state.type.toUpperCase())
      lines.push('Period: ' + fmt.date(state.from) + ' to ' + fmt.date(state.to))
      lines.push('Prepared by: ' + signer + ' on ' + fmt.date(new Date()))
      lines.push(rule)
      lines.push('')
      lines.push('1. MEMBERSHIP')
      lines.push('   • Students and members on record: ' + fmt.number(s.members))
      lines.push('   • Active members: ' + fmt.number(s.active))
      lines.push('   • Girls: ' + fmt.number(s.female) + '    Boys: ' + fmt.number(s.male))
      lines.push('   • Executive committee positions: ' + fmt.number(s.cabinet))
      ;(data.classBreakdown || []).forEach(function (row) {
        lines.push('       - ' + row.name + ': ' + fmt.number(row.total) + ' (' + fmt.number(row.active) + ' active)')
      })
      lines.push('')
      lines.push('2. MEETINGS, ACTIVITIES AND ATTENDANCE')
      lines.push('   • Meetings held: ' + fmt.number(s.meetings))
      lines.push('   • Activities held: ' + fmt.number(s.activities))
      lines.push('   • Attendance marks recorded: ' + fmt.number(s.attendance_records))
      lines.push('   • Overall attendance rate: ' + s.attendance_rate + '%')
      ;((data.attendance && data.attendance.byStatus) || []).forEach(function (row) {
        lines.push('       - ' + row.name + ': ' + fmt.number(row.value))
      })
      lines.push('')
      lines.push('3. CLUB DUES')
      lines.push('   • Expected for the period: ' + fmt.money(s.dues_expected, currency()))
      lines.push('   • Collected: ' + fmt.money(s.dues_collected, currency()))
      lines.push('   • Outstanding: ' + fmt.money(s.dues_outstanding, currency()))
      ;(dues.byTerm || []).forEach(function (row) {
        lines.push('       - ' + row.term + ' ' + (row.academic_year || '') + ': ' + fmt.money(row.collected, currency()) + ' of ' + fmt.money(row.expected, currency()))
      })
      lines.push('')
      lines.push('4. COURSES, CERTIFICATES AND PROJECTS')
      lines.push('   • Courses run: ' + fmt.number(s.courses))
      lines.push('   • Certificates issued: ' + fmt.number(s.certificates))
      lines.push('   • Projects: ' + fmt.number(s.projects))
      ;(data.courses || []).slice(0, 6).forEach(function (course) {
        lines.push('       - ' + (course.code ? course.code + ' — ' : '') + course.title + (course.level ? ' (' + course.level + ')' : ''))
      })
      lines.push('')
      lines.push('5. CONCLUSION AND RECOMMENDATIONS')
      lines.push('   The club programme ran as planned during the period. Learners took part in')
      lines.push('   meetings, activities and course sessions, and attendance is recorded for each.')
      if (s.dues_outstanding > 0) {
        lines.push('   Outstanding club dues of ' + fmt.money(s.dues_outstanding, currency()) + ' should be followed up')
        lines.push('   with the class representatives before the end of the term.')
      } else {
        lines.push('   All club dues for the period have been collected. Keep up the good work.')
      }
      lines.push('')
      lines.push(rule)
      lines.push('Prepared by: ______________________     Patron: ______________________')
      lines.push('Date: ______________________          Stamp:')
      return lines.join('\n')
    }

    /* ---------------------------------------------------------- Actions */

    function printDraft() {
      if (!state.text) {
        ui.toast.error('Nothing to print yet', 'Generate the report first.')
        return
      }
      var win = window.open('', '_blank')
      if (!win) {
        ui.toast.error('The print window was blocked', 'Allow pop-ups for this site, then try again.')
        return
      }
      win.document.write('<pre style="font:13px/1.6 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;padding:28px">' + ICT.escapeHtml(state.text) + '</pre>')
      win.document.close()
      win.focus()
      win.print()
    }

    async function copyDraft() {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(state.text)
          ui.toast.success('Report copied', 'Paste it into a document or an email.')
        } else {
          ui.toast.error('Copying is not available here', 'Select the text and copy it by hand.')
        }
      } catch (error) {
        ui.toast.error('Could not copy', error.message)
      }
    }

    async function save() {
      if (!state.text) {
        ui.toast.error('Nothing to save yet', 'Generate the report first.')
        return
      }
      state.saving = true
      paint()
      try {
        await ICT.api.create('reports', {
          title: state.title || (state.type + ' — ' + fmt.date(state.from) + ' to ' + fmt.date(state.to)),
          type: state.type,
          period: fmt.date(state.from) + ' – ' + fmt.date(state.to),
          summary: summaryLine(),
          content: state.text,
          status: 'Draft',
          author_id: (ICT.store.user && ICT.store.user.id) || null
        })
        ui.toast.success('Report saved', 'Find it under Reports in the menu, ready to submit.')
      } catch (error) {
        ui.toast.error('Could not save the report', error.message)
      }
      state.saving = false
      paint()
    }

    function summaryLine() {
      var s = state.stats || {}
      return fmt.number(s.members) + ' members · ' + s.attendance_rate + '% attendance · ' +
        fmt.money(s.dues_collected, currency()) + ' dues collected'
    }

    return null
  }

  ICT.screens = ICT.screens || {}
  ICT.screens.reports = render
})()
