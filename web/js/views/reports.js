/**
 * Reports Studio — /reports
 *
 * Choose a period and a report type, and the studio writes the report from the
 * club's own records (members, attendance, dues, meetings, activities,
 * certificates). The draft can be edited, printed and saved as a report record.
 */
(function () {
  var ICT = (window.ICT = window.ICT || {})
  var el = ICT.util.el
  var icon = ICT.util.icon
  var ui = ICT.ui
  var TYPES = ['Termly Report', 'Monthly Report', 'Attendance Report', 'Dues Report', 'Activity Report', 'Course Report']

  function render(root) {
    var today = new Date()
    var termStart = new Date(today.getFullYear(), today.getMonth() - 2, 1)
    var state = {
      type: 'Termly Report',
      from: termStart.toISOString().slice(0, 10),
      to: today.toISOString().slice(0, 10),
      title: '',
      text: '',
      stats: null,
      loading: false,
      saving: false
    }

    var container = el('div')
    ICT.util.mount(root, container)
    paint()
    generate()

    function paint() {
      var page = el('div.page')
      page.appendChild(ui.pageHead('Reports Studio', 'Every figure below comes from the club’s own records — nothing is typed in by hand.'))

      var typeSelect = el('select.select', { onchange: (event) => {
        state.type = event.target.value
        generate()
      } })
      TYPES.forEach((type) => typeSelect.appendChild(el('option', { value: type, text: type })))
      typeSelect.value = state.type

      var from = el('input.input', { type: 'date', value: state.from, onchange: (event) => { state.from = event.target.value; generate() } })
      var to = el('input.input', { type: 'date', value: state.to, onchange: (event) => { state.to = event.target.value; generate() } })

      page.appendChild(el('div.filters-bar', [
        el('div.filter-control', [el('span.filters-bar__label', { text: 'Report' }), typeSelect]),
        el('div.filter-control', [el('span.filters-bar__label', { text: 'From' }), from]),
        el('div.filter-control', [el('span.filters-bar__label', { text: 'To' }), to]),
        el('div.grow'),
        ui.button('Regenerate', { icon: 'refresh', onClick: generate }),
        ui.button('Save as a report record', { variant: 'primary', icon: 'check', loading: state.saving, onClick: save })
      ]))

      if (state.stats) {
        page.appendChild(el('div.grid.grid--stats', [
          stat('Students', state.stats.members, 'users'),
          stat('Meetings held', state.stats.meetings, 'calendar'),
          stat('Attendance rate', state.stats.attendance_rate + '%', 'checkSquare'),
          stat('Dues collected', ICT.util.formatMoney(state.stats.dues_collected, ICT.store.settings.currency), 'coins'),
          stat('Outstanding', ICT.util.formatMoney(state.stats.dues_outstanding, ICT.store.settings.currency), 'alert'),
          stat('Certificates', state.stats.certificates, 'award')
        ]))
      }

      var titleInput = el('input.input', { value: state.title, placeholder: 'Report title', oninput: (event) => (state.title = event.target.value) })
      var editor = el('textarea.textarea', { rows: 18 })
      editor.value = state.text
      editor.addEventListener('input', () => (state.text = editor.value))

      page.appendChild(ui.card('Draft', {
        subtitle: 'Edit before saving or printing',
        actions: [ui.button('Print', { size: 'sm', icon: 'print', onClick: () => printDraft() })],
        body: el('div.form-grid', [
          el('div.field', [el('label.field__label', [el('span', { text: 'Title' })]), titleInput]),
          el('div.field', [el('label.field__label', [el('span', { text: 'Report' })]), editor])
        ])
      }))

      ICT.util.mount(container, page)
    }

    function stat(label, value, iconName) {
      return el('div.stat', [
        el('div.stat__top', [el('span.stat__label', { text: label }), el('span.stat__icon', [icon(iconName, 17)])]),
        el('div.stat__value', { text: typeof value === 'number' ? ICT.util.formatNumber(value) : String(value) })
      ])
    }

    async function generate() {
      state.loading = true
      try {
        var res = await ICT.api.reportData({ from: state.from, to: state.to })
        var data = res.data || res
        state.stats = normaliseStats(data)
        state.text = compose(data)
        state.title = state.title || state.type + ' — ' + ICT.util.formatDate(state.from) + ' to ' + ICT.util.formatDate(state.to)
        paint()
      } catch (error) {
        ui.toast.error('Could not collect the figures', error.message)
      } finally {
        state.loading = false
      }
    }

    /**
     * /api/reports/data returns the club's own figures:
     *   { members:{total,active,female,male}, classBreakdown:[…],
     *     dues:{summary,byTerm,byClass,defaulters}, attendance:{byStatus,…},
     *     meetings:[…], activities:[…], courses:[…], certificates:[…],
     *     projects:[…], cabinet:[…], settings, generated_at }
     */
    function normaliseStats(data) {
      var members = data.members || {}
      var dues = (data.dues && data.dues.summary) || {}
      var statuses = (data.attendance && data.attendance.byStatus) || []
      var byStatus = {}
      statuses.forEach((row) => (byStatus[row.name] = row.value))
      var present = (byStatus.Present || 0) + (byStatus.Late || 0)
      var total = statuses.reduce((sum, row) => sum + (Number(row.value) || 0), 0)
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
        defaulters: (data.dues && data.dues.defaulters ? data.dues.defaulters.length : 0) || dues.defaulters_count || 0,
        raw: data
      }
    }

    function compose(data) {
      var s = state.stats
      var settings = ICT.store.settings || {}
      var dues = data.dues || {}
      var lines = []
      var rule = '--------------------------------------------------------------'
      lines.push(settings.club_name || 'ICT Club')
      lines.push((settings.institution ? settings.institution + ' · ' : '') + (settings.current_term || '') + ' ' + (settings.academic_year || ''))
      lines.push(rule)
      lines.push(state.type.toUpperCase())
      lines.push('Period: ' + ICT.util.formatDate(state.from) + ' to ' + ICT.util.formatDate(state.to))
      lines.push('Prepared by: ' + ((ICT.store.user && ICT.store.user.name) || 'the club executive') + ' on ' + ICT.util.formatDate(new Date()))
      lines.push(rule)
      lines.push('')
      lines.push('1. MEMBERSHIP')
      lines.push('   • Students and members on record: ' + ICT.util.formatNumber(s.members))
      lines.push('   • Active members: ' + ICT.util.formatNumber(s.active))
      lines.push('   • Girls: ' + ICT.util.formatNumber(s.female) + '   Boys: ' + ICT.util.formatNumber(s.male))
      lines.push('   • Executive committee positions: ' + ICT.util.formatNumber(s.cabinet))
      ;(data.classBreakdown || []).forEach((row) => {
        lines.push('       - ' + row.name + ': ' + ICT.util.formatNumber(row.total) + ' (' + ICT.util.formatNumber(row.active) + ' active)')
      })
      lines.push('')
      lines.push('2. MEETINGS, ACTIVITIES AND ATTENDANCE')
      lines.push('   • Meetings held: ' + ICT.util.formatNumber(s.meetings))
      lines.push('   • Activities held: ' + ICT.util.formatNumber(s.activities))
      lines.push('   • Attendance marks recorded: ' + ICT.util.formatNumber(s.attendance_records))
      lines.push('   • Overall attendance rate: ' + s.attendance_rate + '%')
      ;((data.attendance && data.attendance.byStatus) || []).forEach((row) => {
        lines.push('       - ' + row.name + ': ' + ICT.util.formatNumber(row.value))
      })
      lines.push('')
      lines.push('3. CLUB DUES')
      lines.push('   • Expected for the period: ' + ICT.util.formatMoney(s.dues_expected, settings.currency))
      lines.push('   • Collected: ' + ICT.util.formatMoney(s.dues_collected, settings.currency))
      lines.push('   • Outstanding: ' + ICT.util.formatMoney(s.dues_outstanding, settings.currency))
      lines.push('   • Students with a balance: ' + ICT.util.formatNumber((dues.defaulters || []).length))
      ;(dues.byTerm || []).forEach((row) => {
        lines.push('       - ' + row.term + ' ' + (row.academic_year || '') + ': ' + ICT.util.formatMoney(row.collected, settings.currency) + ' of ' + ICT.util.formatMoney(row.expected, settings.currency))
      })
      lines.push('')
      lines.push('4. COURSES, CERTIFICATES AND PROJECTS')
      lines.push('   • Courses run: ' + ICT.util.formatNumber(s.courses))
      lines.push('   • Certificates issued: ' + ICT.util.formatNumber(s.certificates))
      lines.push('   • Projects: ' + ICT.util.formatNumber(s.projects))
      lines.push('')
      lines.push('5. CONCLUSION AND RECOMMENDATIONS')
      lines.push('   The club programme ran as planned during the period. Learners took part in')
      lines.push('   meetings, activities and course sessions, and attendance is recorded for each.')
      if (s.dues_outstanding > 0) {
        lines.push('   Outstanding club dues of ' + ICT.util.formatMoney(s.dues_outstanding, settings.currency) + ' should be followed up')
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

    function printDraft() {
      var win = window.open('', '_blank')
      if (!win) {
        ui.toast.error('The print window was blocked', 'Allow pop-ups for this site, then try again.')
        return
      }
      win.document.write('<pre style="font:14px/1.6 Georgia,serif;white-space:pre-wrap;padding:32px">' + ICT.util.escapeHtml(state.text) + '</pre>')
      win.document.title = state.title
      win.document.close()
      win.focus()
      win.print()
    }

    /** One-line summary shown in the report list. */
    function summaryLine() {
      var s = state.stats || {}
      return (
        ICT.util.formatNumber(s.members) + ' members · ' +
        s.attendance_rate + '% attendance · ' +
        ICT.util.formatMoney(s.dues_collected, (ICT.store.settings || {}).currency) + ' dues collected'
      )
    }

    async function save() {
      state.saving = true
      paint()
      try {
        /* The reports schema stores a period label, a short summary and the
           full text — a second draft with the same title becomes a new version. */
        await ICT.api.create('reports', {
          title: state.title,
          type: state.type,
          period: ICT.util.formatDate(state.from) + ' – ' + ICT.util.formatDate(state.to),
          summary: summaryLine(),
          content: state.text,
          status: 'Draft',
          author_id: (ICT.store.user && ICT.store.user.id) || null
        })
        ui.toast.success('Report saved', 'Find it under Reports Studio → Report records.')
      } catch (error) {
        ui.toast.error('Could not save the report', error.message)
      } finally {
        state.saving = false
        paint()
      }
    }
  }

  ICT.views = ICT.views || {}
  ICT.views.reports = render
})()
