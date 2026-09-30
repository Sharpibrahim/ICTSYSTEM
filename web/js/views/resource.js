/**
 * One screen per module: students, executive committee, meetings, activities,
 * courses, registrations, club dues, reports, certificates, notes, projects,
 * tasks and user accounts.
 *
 * The schema decides everything — columns, filters, form fields, permissions —
 * so this file is the only list screen in the system. It provides:
 *   • search, filters, sorting and pagination (all server-side)
 *   • four view modes: table, cards, board and calendar
 *   • create / edit / delete through modal forms
 *   • CSV export, plus the module-specific actions (dues generation and
 *     payments, course enrolment and certificates, student import)
 */
(function () {
  var ICT = (window.ICT = window.ICT || {})
  var el = ICT.util.el
  var icon = ICT.util.icon
  var ui = ICT.ui

  var VIEWS = {
    meetings: ['table', 'calendar', 'cards'],
    activities: ['table', 'calendar', 'cards'],
    project_tasks: ['board', 'table'],
    projects: ['cards', 'table'],
    notes: ['cards', 'table'],
    members: ['table', 'cards'],
    courses: ['cards', 'table'],
    reports: ['board', 'table'],
    dues: ['table', 'board'],
    enrollments: ['table', 'board'],
    certificates: ['table', 'cards'],
    cabinet: ['table', 'cards']
  }
  var DEFAULT_VIEW = {
    project_tasks: 'board', projects: 'cards', notes: 'cards', reports: 'board', dues: 'table',
    meetings: 'table', activities: 'table', members: 'table', courses: 'table', enrollments: 'table',
    certificates: 'table', cabinet: 'table'
  }

  function storedView(key, requested) {
    var allowed = VIEWS[key] || ['table']
    if (requested && allowed.includes(requested)) return requested
    var saved = null
    try {
      saved = localStorage.getItem('view:' + key)
    } catch (e) {
      saved = null
    }
    if (saved && allowed.includes(saved)) return saved
    return DEFAULT_VIEW[key] || 'table'
  }

  /* Opened from the dues register row action and from a dues record page. */
  function paymentDialog(row, onDone) {
    var amount = el('input.input', { id: 'payment-amount', type: 'number', value: Math.max(0, (row.amount || 0) - (row.amount_paid || 0)), placeholder: 'Amount paid' })
    var method = el('select.select', { id: 'payment-method' })
    ;['Cash', 'Mobile money', 'Bank transfer', 'Cheque'].forEach((option) => method.appendChild(el('option', { value: option, text: option })))
    var reference = el('input.input', { id: 'payment-reference', placeholder: 'Receipt number or reference (optional)' })
    var note = el('input.input', { id: 'payment-note', placeholder: 'Note (optional)' })

    var dialog = ui.modal({
      title: 'Record a dues payment',
      subtitle: row.full_name || row.label || 'Student',
      body: el('div.form-grid', [
        ui.kv([
          ['Student', row.full_name || row.label || '—'],
          ['Term', [row.term, row.academic_year].filter(Boolean).join(' ') || '—'],
          ['Amount due', ICT.util.formatMoney(row.amount, (ICT.store.settings || {}).currency)],
          ['Already paid', ICT.util.formatMoney(row.amount_paid, (ICT.store.settings || {}).currency)],
          ['Balance', ICT.util.formatMoney(Math.max(0, (row.amount || 0) - (row.amount_paid || 0)), (ICT.store.settings || {}).currency)]
        ]),
        el('div.field', [el('label.field__label', [el('span', { text: 'Amount paid now' })]), amount]),
        el('div.field', [el('label.field__label', [el('span', { text: 'Method' })]), method]),
        el('div.field', [el('label.field__label', [el('span', { text: 'Reference' })]), reference]),
        el('div.field', [el('label.field__label', [el('span', { text: 'Note' })]), note])
      ]),
      confirmLabel: 'Record payment',
      onConfirm: async () => {
        var paid = Number(amount.value)
        if (!isFinite(paid) || paid <= 0) {
          ui.toast.error('Enter the amount paid', 'It must be greater than zero.')
          return
        }
        dialog.setBusy(true, 'Saving…')
        try {
          var result = await ICT.api.recordPayment(row.id, { amount: paid, method: method.value, reference: reference.value.trim() || null, note: note.value.trim() || null })
          dialog.close()
          var receipt = (result && result.data && result.data.receipt_number) || result.receipt_number
          ui.toast.success('Payment recorded', receipt ? 'Receipt ' + receipt : 'The dues record has been updated.')
          if (onDone) onDone()
        } catch (error) {
          dialog.setBusy(false)
          ui.toast.error('Could not record the payment', error.message)
        }
      }
    })
  }

  function render(root, params, options) {
    options = options || {}
    var key = params.resource
    var store = ICT.store
    var resource = store.resource(key)
    var container = el('div')
    ICT.util.mount(root, container)

    if (!resource) {
      ICT.util.mount(container, el('div.page', el('div.card', el('div.card__body', ui.empty('Unknown section', 'There is no module called “' + key + '”.', ui.button('Back to the dashboard', { onClick: () => ICT.router.go('/') }))))))
      return
    }

    var query = ICT.router.query()
    var state = {
      view: storedView(key, query.get('view')),
      q: '',
      filters: {},
      sort: resource.defaultSort || '',
      page: Number(query.get('page') || 1),
      pageSize: 25,
      data: null,
      loading: true,
      error: null,
      selection: new Set()
    }
    /* Filters can be pre-set from the URL (?class_level=S1 etc.). */
    ;(resource.filters || []).forEach((field) => {
      if (query.get(field)) state.filters[field] = query.get(field)
    })

    var canWrite = canWriteResource(resource, store.user && store.user.role)
    var fields = fieldMap(resource)

    function refresh(keepPage) {
      if (!keepPage) state.page = 1
      return load()
    }

    async function load() {
      state.loading = true
      paint()
      var queryParams = { page: state.page, pageSize: state.pageSize, sort: state.sort || undefined }
      if (state.q) queryParams.q = state.q
      Object.keys(state.filters).forEach((field) => {
        var value = state.filters[field]
        if (value !== '' && value !== undefined && value !== null) queryParams[field] = value
      })
      try {
        var result = await ICT.api.list(key, queryParams)
        state.data = result
        state.error = null
      } catch (error) {
        state.error = error.message
        state.data = null
      } finally {
        state.loading = false
        paint()
      }
    }

    /* ---------------------------------------------------------------- */
    /* Paint                                                             */
    /* ---------------------------------------------------------------- */

    function paint() {
      var page = el('div.page')
      page.appendChild(
        ui.pageHead(resource.label, resource.description, headerActions())
      )
      page.appendChild(toolbar())

      if (state.loading && !state.data) page.appendChild(el('div.card', el('div.card__body', ui.skeleton(6))))
      else if (state.error) page.appendChild(el('div.card', el('div.card__body', ui.empty('Could not load ' + resource.label.toLowerCase(), state.error, ui.button('Try again', { icon: 'refresh', onClick: load })))))
      else if (!state.data.data.length) page.appendChild(emptyState())
      else {
        if (state.view === 'table') page.appendChild(tableCard())
        if (state.view === 'cards') page.appendChild(el('div.grid.grid--cards', state.data.data.map(cardView)))
        if (state.view === 'board') page.appendChild(boardView())
        if (state.view === 'calendar') page.appendChild(calendarView())
        if (state.view === 'table' || state.view === 'table-only') page.appendChild(ui.pagination(state.data.total, state.data.page, state.data.pageSize, (next) => {
          state.page = next
          load()
        }))
      }
      ICT.util.mount(container, page)
    }

    function headerActions() {
      var actions = []
      if (key === 'members') actions.push(ui.button('Import', { icon: 'upload', onClick: importDialog }))
      if (key === 'dues' && canWrite) actions.push(ui.button('Generate dues', { icon: 'sparkles', onClick: generateDuesDialog }))
      if (key === 'courses') actions.push(ui.button('Enrol students', { icon: 'userPlus', onClick: () => pickCourse('enroll') }))
      if (key === 'certificates') actions.push(ui.button('Issue for a course', { icon: 'award', onClick: () => pickCourse('issue') }))
      actions.push(ui.button('Export CSV', { icon: 'download', onClick: () => ICT.api.exportCsv(key, Object.assign({ q: state.q }, state.filters)) }))
      if (canWrite) actions.push(ui.button('New ' + resource.singular.toLowerCase(), { variant: 'primary', icon: 'plus', onClick: () => openForm(null) }))
      return actions
    }

    function toolbar() {
      var search = el('input.input', {
        placeholder: 'Search ' + resource.label.toLowerCase() + '…',
        value: state.q,
        oninput: ICT.util.debounce((event) => {
          state.q = event.target.value
          refresh()
        }, 260)
      })

      var filterControls = (resource.filters || [])
        .map((fieldKey) => {
          var field = fields[fieldKey]
          if (!field) return null
          var select = el('select.select', {
            onchange: (event) => {
              if (event.target.value) state.filters[fieldKey] = event.target.value
              else delete state.filters[fieldKey]
              refresh()
            }
          })
          select.appendChild(el('option', { value: '', text: 'All ' + field.label.toLowerCase() }))
          ;(field.options || []).map(ICT.forms.optionPair).forEach((option) => select.appendChild(el('option', { value: option.value, text: option.label })))
          select.value = state.filters[fieldKey] || ''
          return select
        })
        .filter(Boolean)

      var views = VIEWS[key] || ['table']
      var viewPicker = views.length > 1
        ? ui.segmented(
            views.map((value) => ({
              value: value,
              label: value === 'table' ? 'Table' : value === 'cards' ? 'Cards' : value === 'board' ? 'Board' : 'Calendar',
              icon: { table: 'list', cards: 'grid', board: 'layers', calendar: 'calendar' }[value]
            })),
            state.view,
            (value) => {
              state.view = value
              try {
                localStorage.setItem('view:' + key, value)
              } catch (e) {
                /* ignore */
              }
              paint()
            }
          )
        : null

      return el('div.filters-bar', [
        el('div.search-wrap', [icon('search', 16, 'search-icon'), search]),
        ...filterControls,
        el('div.grow'),
        viewPicker
      ])
    }

    function emptyState() {
      return el('div.card', el('div.card__body', ui.empty(
        'No ' + resource.label.toLowerCase() + ' yet',
        'Records will appear here as soon as they are added — on this screen or in the app.',
        canWrite ? ui.button('New ' + resource.singular.toLowerCase(), { variant: 'primary', icon: 'plus', onClick: () => openForm(null) }) : null
      )))
    }

    function columns() {
      var columns = (resource.listColumns || []).map((fieldKey) => {
        var field = fields[fieldKey] || { key: fieldKey, label: ICT.util.titleCase(fieldKey) }
        return {
          key: fieldKey,
          label: field.label,
          field: field,
          currency: store.settings.currency,
          render: (row) => cell(row, field)
        }
      })
      return columns
    }

    function cell(row, field) {
      var value = row[field.key]
      if (field.type === 'ref' || field.key.endsWith('_id')) {
        var label = row[field.key + '_label'] || row[field.key.replace(/_id$/, '_name')] || row.label || null
        return label ? el('span', { text: label }) : el('span.muted', { text: value ? '#' + value : '—' })
      }
      if (field.type === 'currency') return el('span', { text: ICT.util.formatMoney(value, store.settings.currency) })
      if (field.type === 'date') return el('span', { text: ICT.util.formatDate(value) })
      if (field.type === 'time') return el('span', { text: ICT.util.formatTime(value) })
      if (field.type === 'percentage') return el('span', { text: ICT.util.formatPercent(value) })
      if (['status', 'type', 'mode', 'role', 'grade', 'award', 'priority', 'category', 'term'].includes(field.key)) return ui.badgeFor(value)
      if (field.key === 'title' || field.key === 'full_name' || field.key === 'position' || field.key === 'code') {
        return el('a.link', { href: '/r/' + key + '/' + row.id, text: value || '—' })
      }
      if (value === null || value === undefined || value === '') return el('span.muted', { text: '—' })
      return el('span', { text: String(value) })
    }

    function rowActions(row) {
      var actions = [ui.button('Open', { size: 'sm', variant: 'ghost', iconOnly: true, icon: 'chevronRight', title: 'Open', onClick: () => ICT.router.go('/r/' + key + '/' + row.id) })]
      if (key === 'dues' && canWrite && row.status !== 'Paid') {
        actions.push(ui.button('Record payment', { size: 'sm', variant: 'ghost', iconOnly: true, icon: 'coins', title: 'Record payment', onClick: () => paymentDialog(row, load) }))
      }
      if (key === 'certificates' && row.id) {
        actions.push(ui.button('Print', { size: 'sm', variant: 'ghost', iconOnly: true, icon: 'print', title: 'Printable certificate', onClick: () => ICT.router.go('/r/certificates/' + row.id + '?print=1') }))
      }
      if (canWrite) {
        actions.push(ui.button('Edit', { size: 'sm', variant: 'ghost', iconOnly: true, icon: 'edit', title: 'Edit', onClick: () => openForm(row) }))
        actions.push(ui.button('Delete', { size: 'sm', variant: 'ghost', iconOnly: true, icon: 'trash', title: 'Delete', onClick: () => removeRow(row) }))
      }
      return actions
    }

    function tableCard() {
      return ui.card(null, {
        flush: true,
        body: ui.table(columns(), state.data.data, {
          sort: state.sort,
          onSort: (sort) => {
            state.sort = sort
            load()
          },
          onRowClick: (row) => ICT.router.go('/r/' + key + '/' + row.id),
          rowActions: rowActions
        })
      })
    }

    function cardView(row) {
      var title = row[resource.titleKey] || row.title || row.full_name || row.code || ('#' + row.id)
      var subtitle = resource.subtitleKey ? row[resource.subtitleKey] : null
      return el('div.record-card', { onclick: (event) => {
        if (event.target.closest('button, a')) return
        ICT.router.go('/r/' + key + '/' + row.id)
      } }, [
        el('div.record-card__head', [
          el('div.record-card__title', { text: title }),
          subtitle ? el('div.record-card__subtitle', { text: String(subtitle) }) : null
        ]),
        el('div.record-card__body', (resource.listColumns || []).slice(1, 5).map((fieldKey) => {
          var field = fields[fieldKey] || { key: fieldKey, label: ICT.util.titleCase(fieldKey) }
          return el('div.record-card__row', [el('span.muted', { text: field.label }), cell(row, field)])
        })),
        el('div.record-card__foot', rowActions(row))
      ])
    }

    function boardView() {
      var groupField = fields.status || fields.stage || fields.term || { key: 'status', label: 'Status' }
      var rawOptions = (groupField.options || [...new Set(state.data.data.map((row) => row[groupField.key]).filter(Boolean))]).slice(0, 6)
      var options = rawOptions.map((option) => (typeof option === 'object' ? ICT.forms.optionPair(option) : { value: option, label: option }))
      var values = options.map((option) => option.value)
      var groups = options.map((option) => ({
        label: option.label,
        items: state.data.data.filter((row) => String(row[groupField.key]) === option.value)
      }))
      var ungrouped = state.data.data.filter((row) => !values.includes(String(row[groupField.key])))
      if (ungrouped.length) groups.push({ label: 'Other', items: ungrouped })
      if (!groups.length) groups.push({ label: resource.singular, items: state.data.data })

      return el('div.kanban', groups.map((group) =>
        el('div.kanban__col', [
          el('div.kanban__col-head', [el('span', { text: group.label || '—' }), ui.badge(String(group.items.length), 'gray')]),
          ...group.items.map((row) =>
            el('div.kanban__card', { onclick: () => ICT.router.go('/r/' + key + '/' + row.id) }, [
              el('h4', { text: row[resource.titleKey] || row.title || row.full_name || ('#' + row.id) }),
              el('div.small.muted', { text: [row.class_level, row.admission_number, row.date ? ICT.util.formatDate(row.date) : '', row.balance !== undefined ? ICT.util.formatMoney(row.balance, store.settings.currency) : ''].filter(Boolean).join(' · ') || '—' }),
              el('div.kanban__card-foot', [
                row.due_date ? ui.badge('Due ' + ICT.util.formatDate(row.due_date), 'amber') : null,
                row.amount !== undefined ? ui.badge(ICT.util.formatMoney(row.amount, store.settings.currency), 'blue') : null
              ])
            ])
          ),
          group.items.length ? null : el('p.small.muted.center', { text: 'Nothing here' })
        ])
      ))
    }

    function calendarView() {
      var dateKey = fields.date ? 'date' : 'start_date'
      var withDates = state.data.data.filter((row) => row[dateKey])
      var base = withDates.length ? new Date(withDates[0][dateKey] + 'T00:00:00') : new Date()
      var year = base.getFullYear()
      var month = base.getMonth()
      var first = new Date(year, month, 1)
      var startDay = (first.getDay() + 6) % 7 /* Monday first */
      var days = new Date(year, month + 1, 0).getDate()
      var today = new Date()
      var cells = []

      for (var i = 0; i < startDay; i += 1) cells.push(el('div.calendar__cell.calendar__cell--muted'))
      for (var day = 1; day <= days; day += 1) {
        var iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        var events = withDates.filter((row) => String(row[dateKey]).slice(0, 10) === iso)
        var isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
        cells.push(el('div.calendar__cell' + (isToday ? '.calendar__cell--today' : ''), [
          el('div.calendar__date', { text: String(day) }),
          ...events.slice(0, 3).map((row) =>
            el('div.calendar__event' + (key === 'activities' ? '.calendar__event--activity' : '.calendar__event--meeting'), {
              title: row[resource.titleKey] || row.title,
              onclick: () => ICT.router.go('/r/' + key + '/' + row.id)
            }, [document.createTextNode(row[resource.titleKey] || row.title || '')])
          ),
          events.length > 3 ? el('div.small.muted', { text: '+' + (events.length - 3) + ' more' }) : null
        ]))
      }

      var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      return ui.card(monthNames[month] + ' ' + year, {
        subtitle: withDates.length ? withDates.length + ' record(s) with dates this term' : 'No dated records on this page',
        flush: true,
        body: el('div', [
          el('div.calendar__dow', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dow) => el('div', { text: dow }))),
          el('div.calendar', cells)
        ])
      })
    }

    /* ---------------------------------------------------------------- */
    /* Create / edit / delete                                            */
    /* ---------------------------------------------------------------- */

    function openForm(record) {
      var built = ICT.forms.buildForm(resource, record)
      var dialog = ui.modal({
        title: (record ? 'Edit ' : 'New ') + resource.singular.toLowerCase(),
        subtitle: record ? 'Update the details and save.' : resource.description,
        size: 'lg',
        body: built.form,
        confirmLabel: record ? 'Save changes' : 'Create ' + resource.singular.toLowerCase(),
        onConfirm: async () => {
          var result = built.collect()
          if (Object.keys(result.errors).length) {
            built.setErrors(result.errors)
            return
          }
          dialog.setBusy(true, 'Saving…')
          try {
            if (record) await ICT.api.update(key, record.id, result.values)
            else await ICT.api.create(key, result.values)
            dialog.close()
            ui.toast.success(record ? resource.singular + ' updated' : resource.singular + ' saved', 'The change is stored in the club records.')
            ICT.forms.invalidateOptions(key)
            load()
          } catch (error) {
            dialog.setBusy(false)
            ui.toast.error('Could not save', error.message)
          }
        }
      })
      var first = built.form.querySelector('input, select, textarea')
      if (first) first.focus()
    }

    async function removeRow(row) {
      var name = row[resource.titleKey] || row.title || row.full_name || ('#' + row.id)
      var confirmed = await ui.confirmDialog({
        title: 'Delete ' + resource.singular.toLowerCase() + '?',
        message: '“' + name + '” will be removed from the club records. This cannot be undone.',
        confirmLabel: 'Delete',
        danger: true
      })
      if (!confirmed) return
      try {
        await ICT.api.remove(key, row.id)
        ui.toast.success(resource.singular + ' deleted', name + ' was removed.')
        load()
      } catch (error) {
        ui.toast.error('Could not delete', error.message)
      }
    }

    /* ---------------------------------------------------------------- */
    /* Module-specific actions                                           */
    /* ---------------------------------------------------------------- */

    function generateDuesDialog() {
      var term = el('input.input', { value: store.settings.current_term || 'Term 1' })
      var year = el('input.input', { value: store.settings.academic_year || String(new Date().getFullYear()) })
      var amount = el('input.input', { type: 'number', value: store.settings.dues_per_term || 10000 })
      var classSelect = el('select.select')
      classSelect.appendChild(el('option', { value: '', text: 'The whole school' }))
      ;(store.optionSets.classes || []).forEach((option) => classSelect.appendChild(el('option', { value: option, text: option })))
      var dueDate = el('input.input', { type: 'date' })

      var dialog = ui.modal({
        title: 'Generate club dues',
        subtitle: 'Creates one dues record per active student for the term. Records that already exist are left alone.',
        body: el('div.form-grid', [
          el('div.field', [el('label.field__label', [el('span', { text: 'Term' })]), term]),
          el('div.field', [el('label.field__label', [el('span', { text: 'Academic year' })]), year]),
          el('div.field', [el('label.field__label', [el('span', { text: 'Amount per student' })]), amount]),
          el('div.field', [el('label.field__label', [el('span', { text: 'Class (optional)' })]), classSelect]),
          el('div.field', [el('label.field__label', [el('span', { text: 'Payment due date' })]), dueDate])
        ]),
        confirmLabel: 'Generate',
        onConfirm: async () => {
          dialog.setBusy(true, 'Generating…')
          try {
            var result = await ICT.api.generateDues({
              term: term.value.trim(),
              academic_year: year.value.trim(),
              amount: Number(amount.value) || 0,
              class_level: classSelect.value || null,
              due_date: dueDate.value || null
            })
            dialog.close()
            ui.toast.success('Dues generated', (result.created || 0) + ' record(s) created, ' + (result.skipped || 0) + ' already existed.')
            load()
          } catch (error) {
            dialog.setBusy(false)
            ui.toast.error('Could not generate dues', error.message)
          }
        }
      })
    }


    function pickCourse(action) {
      ICT.api.options('courses').then((result) => {
        var courses = (result && result.data) || []
        if (!courses.length) {
          ui.toast.info('No courses yet', 'Create a course first, then enrol students or issue certificates.')
          return
        }
        var select = el('select.select')
        courses.forEach((course) => select.appendChild(el('option', { value: course.value, text: course.label + (course.sub ? ' · ' + course.sub : '') })))

        var studentsBox = el('div.chip-list')
        var chosen = new Set()
        if (action === 'enroll') {
          ICT.api.options('members').then((res) => {
            ;(res.data || []).forEach((student) => {
              var box = el('input', { type: 'checkbox', value: student.value })
              box.addEventListener('change', () => {
                if (box.checked) chosen.add(Number(student.value))
                else chosen.delete(Number(student.value))
              })
              studentsBox.appendChild(el('label.checkbox', [box, el('span', { text: student.label + (student.sub ? ' · ' + student.sub : '') })]))
            })
          })
        }

        var dialog = ui.modal({
          title: action === 'enroll' ? 'Enrol students in a course' : 'Issue certificates for a course',
          subtitle: action === 'enroll'
            ? 'Registered students appear on the course register.'
            : 'Every student marked “Completed” on the course receives a certificate.',
          size: 'lg',
          body: el('div.form-grid', [
            el('div.field', [el('label.field__label', [el('span', { text: 'Course' })]), select]),
            action === 'enroll' ? el('div.field', [el('label.field__label', [el('span', { text: 'Students' })]), el('div.checkbox-scroll', studentsBox)]) : null
          ]),
          confirmLabel: action === 'enroll' ? 'Enrol' : 'Issue certificates',
          onConfirm: async () => {
            dialog.setBusy(true, 'Working…')
            try {
              if (action === 'enroll') {
                if (!chosen.size) {
                  dialog.setBusy(false)
                  ui.toast.error('Choose at least one student', 'Tick the students to enrol.')
                  return
                }
                var enrolled = await ICT.api.enrollCourse(Number(select.value), [...chosen])
                dialog.close()
                ui.toast.success('Students enrolled', (enrolled.created || 0) + ' registration(s) added.')
              } else {
                var issued = await ICT.api.issueCertificates(Number(select.value))
                dialog.close()
                ui.toast.success('Certificates issued', (issued.created || 0) + ' certificate(s) created.')
              }
              load()
            } catch (error) {
              dialog.setBusy(false)
              ui.toast.error('Action failed', error.message)
            }
          }
        })
      })
    }

    function importDialog() {
      var textarea = el('textarea.textarea', {
        rows: 10,
        placeholder: 'full_name,admission_number,class_level,stream,house,guardian_name,guardian_phone\nNakato Sarah,2026/S1/014,S1,A,Kenya,Nakato Peter,+256 700 111222'
      })
      var dialog = ui.modal({
        title: 'Import students',
        subtitle: 'Paste rows from a spreadsheet. The first line may be the column headings.',
        size: 'lg',
        body: el('div.form-grid', [
          el('p.small.muted', { text: 'Recognised columns: ' + (resource.fields || []).map((f) => f.key).join(', ') }),
          el('div.field', [el('label.field__label', [el('span', { text: 'Rows' })]), textarea])
        ]),
        confirmLabel: 'Import',
        onConfirm: async () => {
          var lines = textarea.value.split(/\r?\n/).filter((line) => line.trim())
          if (!lines.length) {
            ui.toast.error('Nothing to import', 'Paste at least one row.')
            return
          }
          var headers = lines[0].split(',').map((h) => h.trim())
          var hasHeader = headers.some((h) => /name|admission|class/i.test(h))
          var keys = hasHeader ? headers : ['full_name', 'admission_number', 'class_level', 'stream', 'house', 'guardian_name', 'guardian_phone']
          var rows = (hasHeader ? lines.slice(1) : lines).map((line) => {
            var cells = line.split(',').map((c) => c.trim())
            var row = {}
            keys.forEach((key, index) => (row[key] = cells[index] || null))
            return row
          })
          dialog.setBusy(true, 'Importing…')
          try {
            var result = await ICT.api.importMembers(rows)
            dialog.close()
            ui.toast.success('Import finished', (result.created || 0) + ' student(s) added' + (result.skipped ? ', ' + result.skipped + ' skipped' : '') + '.')
            load()
          } catch (error) {
            dialog.setBusy(false)
            ui.toast.error('Import failed', error.message)
          }
        }
      })
    }

    load()
    return { reload: load }
  }

  function canWriteResource(resource, role) {
    if (!role) return false
    var order = { member: 1, cabinet: 2, admin: 3 }
    var required = (resource.write || []).reduce((min, level) => Math.min(min, order[level] || 99), 99)
    if ((order[role] || 0) < required) return false
    if (resource.key === 'users' && role !== 'admin') return false
    return true
  }

  function fieldMap(resource) {
    var map = {}
    ;(resource.fields || []).forEach((field) => (map[field.key] = field))
    return map
  }

  ICT.views = ICT.views || {}
  /* A dues record page reuses the register's payment dialog. */
  ICT.views.resourcePayment = function (record, reload) {
    paymentDialog(record, reload)
  }
  ICT.views.resource = render
  ICT.views.canWriteResource = canWriteResource
})()
