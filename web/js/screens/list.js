/* ==========================================================================
   list.js — /r/<module>

   One screen for every module in the system: students, the executive
   committee, meetings, activities, courses, the course register, club dues,
   attendance records, reports, certificates, notes, projects, project team
   and tasks, and user accounts.

   The schema decides the columns, the filters, the write form and who may
   use it. This file adds search, sorting, paging, four view modes, CSV
   export and the module-specific actions (dues generation and payments,
   course enrolment and certificates, student import).
   ========================================================================== */
(function () {
  var ICT = window.ICT = window.ICT || {}
  var el = ICT.el
  var ui = ICT.widgets
  var icon = ICT.icon
  var fmt = ICT.fmt

  var VIEWS = {
    members: ['table', 'cards'],
    cabinet: ['table', 'cards'],
    meetings: ['table', 'calendar', 'cards'],
    activities: ['table', 'calendar', 'cards'],
    courses: ['table', 'cards'],
    enrollments: ['table', 'board'],
    dues: ['table', 'board'],
    attendance: ['table'],
    reports: ['board', 'table'],
    certificates: ['table', 'cards'],
    notes: ['cards', 'table'],
    projects: ['cards', 'table'],
    project_tasks: ['board', 'table'],
    users: ['table'],
    project_members: ['table']
  }

  var ICON_FOR = {
    members: 'users', cabinet: 'crown', meetings: 'calendar', activities: 'star',
    courses: 'book', enrollments: 'checkSquare', attendance: 'check', dues: 'coins',
    reports: 'file', certificates: 'award', notes: 'note', projects: 'rocket',
    project_tasks: 'list', project_members: 'users', users: 'shield'
  }

  function viewKey(resourceKey) { return 'ict-club-view-' + resourceKey }

  function storedView(resourceKey, requested) {
    var allowed = VIEWS[resourceKey] || ['table']
    if (requested && allowed.indexOf(requested) !== -1) return requested
    var remembered = null
    try { remembered = window.localStorage.getItem(viewKey(resourceKey)) } catch (error) { remembered = null }
    if (remembered && allowed.indexOf(remembered) !== -1) return remembered
    return allowed[0]
  }

  function render(root, route) {
    var store = ICT.store
    var resource = store.resourceFor(route.resource)
    var query = ICT.nav.query()

    var state = {
      q: query.get('q') || '',
      filters: {},
      sort: resource.defaultSort || '',
      page: Number(query.get('page') || 1),
      pageSize: 25,
      view: storedView(resource.key, query.get('view')),
      data: null,
      loading: true,
      error: null
    }
    ;(resource.filters || []).forEach(function (key) {
      if (query.get(key)) state.filters[key] = query.get(key)
    })

    var host = el('div')
    ICT.mount(root, host)
    var searchInput = null

    load()

    /** The query the API is asked for. */
    function params() {
      var request = { page: state.page, pageSize: state.pageSize, sort: state.sort }
      if (state.q) request.q = state.q
      Object.keys(state.filters).forEach(function (key) {
        if (state.filters[key] !== '' && state.filters[key] !== null) request[key + '__eq'] = state.filters[key]
      })
      return request
    }

    async function load() {
      state.loading = true
      paint()
      try {
        var res = await ICT.api.list(resource.key, params())
        state.data = res
        state.error = null
      } catch (error) {
        state.error = error
      }
      state.loading = false
      paint()
    }

    /** Re-reads the current page without flashing the loading state. */
    async function refresh() {
      try {
        state.data = await ICT.api.list(resource.key, params())
        state.error = null
      } catch (error) {
        state.error = error
      }
      paint()
    }

    /* -------------------------------------------------------------- Paint */

    function paint() {
      var page = el('div.page')

      var writeAllowed = store.canWrite(resource)
      var actions = []
      if (resource.key === 'members') {
        actions.push(ui.button('Import students', { icon: 'upload', onClick: importDialog }))
        actions.push(ui.button('Export CSV', { icon: 'download', onClick: function () { ICT.api.exportCsv(resource.key, Object.assign({ q: state.q }, state.filters)) } }))
      } else if (resource.key === 'dues') {
        if (writeAllowed) actions.push(ui.button('Generate term dues', { icon: 'coins', onClick: generateDuesDialog }))
        actions.push(ui.button('Export CSV', { icon: 'download', onClick: function () { ICT.api.exportCsv(resource.key, Object.assign({ q: state.q }, state.filters)) } }))
      } else if (resource.key === 'courses' && writeAllowed) {
        actions.push(ui.button('Enrol students', { icon: 'userPlus', onClick: enrolDialog }))
        actions.push(ui.button('Issue certificates', { icon: 'award', onClick: certificateDialog }))
      } else {
        actions.push(ui.button('Export CSV', { icon: 'download', onClick: function () { ICT.api.exportCsv(resource.key, Object.assign({ q: state.q }, state.filters)) } }))
      }
      if (writeAllowed) {
        actions.unshift(ui.button('New ' + resource.singular.toLowerCase(), { variant: 'primary', icon: 'plus', onClick: function () { createForm() } }))
      }

      page.appendChild(ui.pageHead(resource.label, resource.description || '', actions))

      /* If the address asked for a new record (?new=1), open the form. */
      if (query.get('new') === '1' && writeAllowed && !state.openedNew) {
        state.openedNew = true
        setTimeout(function () { createForm() }, 0)
      }

      page.appendChild(toolbar())

      if (state.loading) {
        page.appendChild(el('div.card', el('div.card__body', ui.loading('Loading ' + resource.label.toLowerCase() + '…'))))
      } else if (state.error) {
        page.appendChild(el('div.card', el('div.card__body', [
          ui.notice('This list could not be loaded. ' + state.error.message, 'error'),
          el('div.mt-2', [ui.button('Try again', { icon: 'trendingUp', onClick: load })])
        ])))
      } else if (!state.data || !state.data.data.length) {
        page.appendChild(el('div.card', el('div.card__body', ui.empty(
          state.q || Object.keys(state.filters).length ? 'Nothing matches that search' : 'No ' + resource.label.toLowerCase() + ' yet',
          state.q || Object.keys(state.filters).length
            ? 'Try fewer words, or clear the filters above.'
            : 'Use the “New ' + resource.singular.toLowerCase() + '” button above to add the first one.',
          !state.q && writeAllowed ? ui.button('New ' + resource.singular.toLowerCase(), { variant: 'primary', icon: 'plus', onClick: function () { createForm() } }) : null
        ))))
      } else {
        page.appendChild(state.view === 'cards' ? cardsView() : state.view === 'board' ? boardView() : state.view === 'calendar' ? calendarView() : tableView())
        page.appendChild(pager())
      }

      ICT.mount(host, page)
      if (searchInput && state.q) searchInput.value = state.q
    }

    /* -------------------------------------------------------------- Toolbar */

    function toolbar() {
      var fields = {}
      ;(resource.fields || []).forEach(function (field) { fields[field.key] = field })

      searchInput = el('input.input', {
        placeholder: 'Search ' + resource.label.toLowerCase() + '…',
        value: state.q,
        oninput: ICT.debounce(function (event) {
          state.q = event.target.value
          state.page = 1
          load()
        }, 280)
      })

      var filterControls = (resource.filters || []).map(function (key) {
        var field = fields[key]
        if (!field) return null
        var options = [{ value: '', label: 'All ' + (field.label || key).toLowerCase() }]
        ;(field.options || []).map(ICT.fields.optionPair).forEach(function (option) { options.push(option) })
        return el('div.filter-control', [
          el('span.filters-bar__label', { text: field.label || ICT.titleCase(key) }),
          ui.select(options, state.filters[key] || '', function (value) {
            if (value) state.filters[key] = value
            else delete state.filters[key]
            state.page = 1
            load()
          })
        ])
      }).filter(Boolean)

      var viewButtons = (VIEWS[resource.key] || ['table']).map(function (view) {
        var names = { table: 'list', cards: 'grid', board: 'board', calendar: 'calendar' }
        return ui.button(names[view], {
          size: 'sm',
          variant: state.view === view ? 'primary' : 'ghost',
          icon: names[view],
          onClick: function () {
            state.view = view
            try { window.localStorage.setItem(viewKey(resource.key), view) } catch (error) { /* fine */ }
            paint()
          }
        })
      })

      return el('div.filters-bar', [
        el('div.search-wrap', [el('span.search-icon', [icon('search', 16)]), searchInput]),
        filterControls,
        el('div.filter-control', [el('span.filters-bar__label', { text: 'View' }), el('div.flex.gap-1', viewButtons)])
      ])
    }

    /* -------------------------------------------------------------- Views */

    function columns() {
      var fields = {}
      ;(resource.fields || []).forEach(function (field) { fields[field.key] = field })
      return (resource.listColumns || []).map(function (key) {
        var field = fields[key] || { key: key, label: ICT.titleCase(key) }
        return {
          key: key,
          label: field.label || ICT.titleCase(key),
          sortable: !field.virtual,
          align: /money|amount|balance|budget|spent|cost|fee/.test(key) ? 'right' : null,
          render: function (row) { return cellValue(field, row) }
        }
      }).concat([{ key: '__actions', label: '', align: 'right', render: rowActions }])
    }

    function cellValue(field, row) {
      var value = row[field.key]
      if (value === null || value === undefined || value === '') return el('span.muted', { text: '—' })

      if (field.type === 'date') return el('span', { text: fmt.date(value) })
      if (field.type === 'datetime') return el('span', { text: fmt.dateTime(value) })
      if (field.type === 'checkbox') return el('span', { text: fmt.yesNo(value) })
      if (field.type === 'select') return ui.badge(value)
      if (/money|amount|balance|budget|spent|cost|fee/.test(field.key)) return el('span', { text: fmt.money(value, (ICT.store.settings || {}).currency) })

      if (field.type === 'ref' && row[field.key + '_label']) return el('span', { text: row[field.key + '_label'] })
      if (field.type === 'dynamicRef' && row[field.key + '_label']) return el('span', { text: row[field.key + '_label'] })

      if (resource.key === 'members' && field.key === 'full_name') {
        return el('a.link', { href: '/r/members/' + row.id, onclick: function (event) { event.preventDefault(); ICT.nav.go('/r/members/' + row.id) }, text: value })
      }
      if (Array.isArray(value)) return el('span', { text: value.join(', ') })
      if (typeof value === 'object') return el('span', { text: value.label || value.title || value.name || '—' })
      return el('span', { text: String(value) })
    }

    function rowActions(row) {
      var actions = []
      var title = row[resource.titleKey] || row.title || row.full_name || row.name || ('#' + row.id)
      actions.push(ui.button('Open', { size: 'sm', variant: 'ghost', iconOnly: true, icon: 'eye', title: 'Open', onClick: function () { ICT.nav.go('/r/' + resource.key + '/' + row.id) } }))

      if (store.canWrite(resource)) {
        actions.push(ui.button('Edit', { size: 'sm', variant: 'ghost', iconOnly: true, icon: 'edit', title: 'Edit', onClick: function () { createForm(row) } }))
        if (resource.key === 'dues') {
          actions.push(ui.button('Record payment', { size: 'sm', variant: 'ghost', iconOnly: true, icon: 'coins', title: 'Record payment', onClick: function () { paymentDialog(row, refresh) } }))
        }
        if (resource.key === 'courses') {
          actions.push(ui.button('Issue certificates', { size: 'sm', variant: 'ghost', iconOnly: true, icon: 'award', title: 'Issue certificates', onClick: function () { issueCertificates(row.id, title) } }))
        }
        actions.push(ui.button('Delete', {
          size: 'sm', variant: 'ghost', iconOnly: true, icon: 'trash', title: 'Delete',
          onClick: function () { removeRow(row, title) }
        }))
      }
      return el('div.flex.gap-1', { style: { justifyContent: 'flex-end' } }, actions)
    }

    function tableView() {
      return ui.card(null, {
        flush: true,
        body: ui.table(columns(), state.data.data, {
          sort: state.sort,
          onSort: function (sort) { state.sort = sort; load() },
          onRowClick: function (row) { ICT.nav.go('/r/' + resource.key + '/' + row.id) }
        })
      })
    }

    function recordCard(row) {
      var fields = {}
      ;(resource.fields || []).forEach(function (field) { fields[field.key] = field })
      var title = row[resource.titleKey] || row.title || row.full_name || row.name || ('#' + row.id)
      var subtitle = row[resource.subtitleKey] || ''
      var badges = (resource.filters || []).map(function (key) {
        return row[key] ? ui.badge(row[key]) : null
      }).filter(Boolean)

      return el('div.record-card', [
        el('div.record-card__top', [
          el('div.record-card__icon', [icon(ICON_FOR[resource.key] || 'file', 18)]),
          el('div', { style: { flex: '1 1 auto', minWidth: '0' } }, [
            el('div.record-card__title', { text: title }),
            subtitle ? el('div.record-card__sub', { text: fieldText(fields[resource.subtitleKey], subtitle) }) : null
          ])
        ]),
        badges.length ? el('div.record-card__meta', badges) : null,
        el('div.flex.gap-1', [
          ui.button('Open', { size: 'sm', icon: 'eye', onClick: function () { ICT.nav.go('/r/' + resource.key + '/' + row.id) } }),
          store.canWrite(resource) ? ui.button('Edit', { size: 'sm', icon: 'edit', onClick: function () { createForm(row) } }) : null
        ])
      ])
    }

    function fieldText(field, value) {
      if (!field) return String(value || '')
      if (field.type === 'date') return fmt.date(value)
      if (/money|amount|balance|budget|cost|fee/.test(field.key)) return fmt.money(value, (ICT.store.settings || {}).currency)
      return String(value)
    }

    function cardsView() {
      return el('div.cards-row', state.data.data.map(recordCard))
    }

    function boardView() {
      var groupField = null
      var candidates = ['status', 'class_level', 'term', 'role', 'category', 'priority', 'type', 'level']
      for (var i = 0; i < candidates.length; i += 1) {
        if (state.data.data.some(function (row) { return row[candidates[i]] })) {
          groupField = ICT.store.fieldFor(resource, candidates[i]) || { key: candidates[i], label: ICT.titleCase(candidates[i]) }
          break
        }
      }
      if (!groupField) return cardsView()

      var declared = groupField.options ? groupField.options.map(ICT.fields.optionPair).map(function (option) { return option.value }) : null
      var values = declared || Array.from(new Set(state.data.data.map(function (row) { return row[groupField.key] }).filter(Boolean)))
      values = values.slice(0, 8)

      return el('div.board', values.map(function (value) {
        var items = state.data.data.filter(function (row) { return String(row[groupField.key]) === String(value) })
        return el('div.board__col', [
          el('h4', [el('span', { text: groupField.options ? (groupField.options.map(ICT.fields.optionPair).filter(function (o) { return o.value === String(value) })[0] || {}).label || value : value }), el('span', { text: String(items.length) })]),
          items.length ? el('div', items.map(function (row) {
            var title = row[resource.titleKey] || row.title || row.full_name || row.name || ('#' + row.id)
            return el('a.board__item', {
              href: '/r/' + resource.key + '/' + row.id,
              onclick: function (event) { event.preventDefault(); ICT.nav.go('/r/' + resource.key + '/' + row.id) }
            }, [
              el('div', { text: String(title).slice(0, 80) }),
              el('div.small.muted', { text: [fmt.date(row[resource.subtitleKey] || row.date || row.created_at)].filter(Boolean).join('') })
            ])
          })) : el('div.small.muted', { text: 'Nothing here' })
        ])
      }))
    }

    function calendarView() {
      var dated = state.data.data.map(function (row) {
        var field = ICT.store.fieldFor(resource, 'date') || ICT.store.fieldFor(resource, 'session_date') || ICT.store.fieldFor(resource, 'due_date') || { key: 'date' }
        return { row: row, date: fmt.asDate(row[field.key] || row.date || row.created_at) }
      }).filter(function (item) { return item.date })

      if (!dated.length) return cardsView()

      var byDay = {}
      dated.forEach(function (item) {
        var key = item.date.toISOString().slice(0, 10)
        byDay[key] = byDay[key] || []
        byDay[key].push(item.row)
      })

      var start = new Date(dated[0].date)
      start.setDate(1)
      var days = []
      var cursor = new Date(start)
      cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7))
      for (var i = 0; i < 42; i += 1) {
        var key = cursor.toISOString().slice(0, 10)
        var title = (byDay[key] || []).map(function (row) {
          return row[resource.titleKey] || row.title || row.full_name || ('#' + row.id)
        })
        days.push(el('div.calendar__day', [
          el('div.calendar__date', { text: cursor.getDate() + ' ' + fmt.months[cursor.getMonth()] }),
          el('div', title.slice(0, 3).map(function (name) { return el('div.calendar__event', { text: String(name).slice(0, 28) }) }))
        ]))
        cursor.setDate(cursor.getDate() + 1)
      }
      return el('div.card', el('div.card__body', el('div.calendar', days)))
    }

    function pager() {
      var total = state.data.total || 0
      var pages = state.data.pages || 1
      return el('div.between.mt-2', [
        el('div.small.muted', { text: fmt.number(total) + ' record' + (total === 1 ? '' : 's') + ' • page ' + state.page + ' of ' + pages }),
        el('div.flex.gap-1', [
          ui.button('Previous', { size: 'sm', icon: 'chevronLeft', disabled: state.page <= 1, onClick: function () { state.page -= 1; load() } }),
          ui.button('Next', { size: 'sm', icon: 'chevronRight', disabled: state.page >= pages, onClick: function () { state.page += 1; load() } })
        ])
      ])
    }

    /* -------------------------------------------------------------- Writes */

    function createForm(record) {
      var form = ICT.fields.formFields(resource, record || null, { showReadOnly: false, showExtra: Boolean(record) })
      var editing = Boolean(record && record.id)

      var dialog = ui.modal({
        title: (editing ? 'Edit ' : 'New ') + resource.singular.toLowerCase(),
        subtitle: resource.description || '',
        size: 'lg',
        body: form.node,
        confirmLabel: editing ? 'Save' : 'Create',
        onConfirm: async function () {
          var missing = form.missing()
          if (missing) {
            ui.toast.error('“' + missing.label + '” is required', 'Fill it in, then save again.')
            return
          }
          var payload = form.values()
          Object.keys(payload).forEach(function (key) {
            if (payload[key] === '' ) payload[key] = null
          })
          dialog.setBusy(true, 'Saving…')
          try {
            if (editing) await ICT.api.update(resource.key, record.id, payload)
            else await ICT.api.create(resource.key, payload)
            ui.toast.success(editing ? 'Changes saved' : resource.singular + ' saved', editing ? (record[resource.titleKey] || '') : 'It is on the list now.')
            dialog.close()
            load()
          } catch (error) {
            dialog.setBusy(false)
            ui.toast.error('Could not save', error.message)
          }
        }
      })
      form.focusFirst()
    }

    async function removeRow(row, title) {
      var confirmed = await ui.confirmDialog({
        title: 'Delete ' + resource.singular.toLowerCase() + '?',
        message: '“' + title + '” will be removed from the club records. This cannot be undone.',
        confirmLabel: 'Delete',
        danger: true
      })
      if (!confirmed) return
      try {
        await ICT.api.remove(resource.key, row.id)
        ui.toast.success(resource.singular + ' deleted', title + ' was removed.')
        load()
      } catch (error) {
        ui.toast.error('Could not delete', error.message)
      }
    }

    /* ------------------------------------------------- Module extras */

    function generateDuesDialog() {
      var settings = ICT.store.settings || {}
      var term = el('input.input', { value: settings.current_term || 'Term 1' })
      var year = el('input.input', { value: settings.academic_year || String(new Date().getFullYear()) })
      var amount = el('input.input', { type: 'number', value: settings.dues_per_term || 10000 })
      var classLevel = ui.select(
        [{ value: '', label: 'The whole school' }].concat(['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map(function (c) { return { value: c, label: c } })),
        '', null
      )

      var dialog = ui.modal({
        title: 'Generate term dues',
        subtitle: 'Every active student gets a dues record for the term.',
        body: el('div.form-grid', [
          ui.field('Term', term),
          ui.field('Academic year', year),
          ui.field('Amount per student', amount),
          ui.field('Class', classLevel, 'Leave as the whole school to charge every active student.')
        ]),
        confirmLabel: 'Generate',
        onConfirm: async function () {
          dialog.setBusy(true, 'Generating…')
          try {
            var res = await ICT.api.generateDues({
              term: term.value,
              academic_year: year.value,
              amount: Number(amount.value),
              class_level: classLevel.value || null
            })
            ui.toast.success('Dues generated', fmt.number(res.created || 0) + ' record(s) created, ' + fmt.number(res.skipped || 0) + ' already existed.')
            dialog.close()
            load()
          } catch (error) {
            dialog.setBusy(false)
            ui.toast.error('Could not generate dues', error.message)
          }
        }
      })
    }

    /* The dues payment dialog is shared — see ICT.paymentDialog below. */
    function paymentDialog(row, onDone) {
      ICT.paymentDialog(row, function () { refresh(); if (onDone) onDone() })
    }


    function enrolDialog() {
      var courses = []
      var courseSelect = el('select.select', { id: 'enrol-course' })
      var list = el('div.selected-list', ui.loading('Loading students…'))
      var search = el('input.input', { placeholder: 'Filter students…' })

      Promise.all([
        ICT.api.options('courses'),
        ICT.api.options('members')
      ]).then(function (results) {
        courses = (results[0].data || [])
        var students = (results[1].data || [])
        ICT.mount(courseSelect, courses.map(function (course) { return el('option', { value: course.value, text: course.label }) }))
        function paintList(filter) {
          var text = String(filter || '').toLowerCase()
          ICT.mount(list, students.filter(function (student) {
            return !text || String(student.label).toLowerCase().indexOf(text) !== -1
          }).slice(0, 300).map(function (student) {
            var box = el('input', { type: 'checkbox', value: student.value })
            return el('label.checkbox', [box, el('span', { text: student.label + (student.sub ? ' · ' + student.sub : '') })])
          }))
        }
        search.addEventListener('input', function () { paintList(search.value) })
        paintList('')
      }).catch(function (error) {
        ICT.mount(list, ui.notice('Could not load the lists. ' + error.message, 'error'))
      })

      var dialog = ui.modal({
        title: 'Enrol students on a course',
        subtitle: 'Pick the course, tick the students, then enrol.',
        body: el('div.form-grid', [
          ui.field('Course', courseSelect),
          el('div.field', { style: { gridColumn: '1 / -1' } }, [
            el('label.field__label', [el('span', { text: 'Students' })]),
            search,
            el('div.mt-1', [list])
          ])
        ]),
        confirmLabel: 'Enrol',
        onConfirm: async function () {
          var picked = Array.prototype.slice.call(list.querySelectorAll('input[type=checkbox]')).filter(function (box) { return box.checked }).map(function (box) { return Number(box.value) })
          if (!picked.length) {
            ui.toast.error('No students ticked', 'Tick at least one student to enrol.')
            return
          }
          dialog.setBusy(true, 'Enrolling…')
          try {
            var res = await ICT.api.enroll(Number(courseSelect.value), picked)
            ui.toast.success('Students enrolled', fmt.number(res.created || 0) + ' added, ' + fmt.number(res.skipped || 0) + ' already on the course.')
            dialog.close()
            load()
          } catch (error) {
            dialog.setBusy(false)
            ui.toast.error('Could not enrol', error.message)
          }
        }
      })
    }

    function certificateDialog() {
      var courseSelect = el('select.select', { id: 'cert-course' })
      ICT.api.options('courses').then(function (res) {
        ICT.mount(courseSelect, (res.data || []).map(function (course) { return el('option', { value: course.value, text: course.label }) }))
      })
      var dialog = ui.modal({
        title: 'Issue course certificates',
        subtitle: 'Every learner marked “Completed” receives a numbered certificate.',
        body: el('div.form-grid', [ui.field('Course', courseSelect)]),
        confirmLabel: 'Issue certificates',
        onConfirm: async function () {
          dialog.setBusy(true, 'Issuing…')
          try {
            var res = await ICT.api.issueCertificates(Number(courseSelect.value))
            ui.toast.success('Certificates issued', fmt.number(res.issued || 0) + ' certificate(s) created.')
            dialog.close()
            load()
          } catch (error) {
            dialog.setBusy(false)
            ui.toast.error('Could not issue certificates', error.message)
          }
        }
      })
    }

    function importDialog() {
      var textarea = el('textarea.textarea', { rows: 8, placeholder: 'full_name,admission_number,class_level,stream,house,guardian_name,guardian_phone\nNabirye Sarah,2026/101,S1,A,Nile,Mr Nabirye,0772000111' })
      var help = el('div.small.muted', { text: 'Paste rows from a spreadsheet. The first line may be the column names — they are matched to the student fields automatically.' })

      var dialog = ui.modal({
        title: 'Import students',
        subtitle: 'One student per line, separated by commas.',
        body: el('div.form-grid', [ui.field('Rows to import', textarea), help]),
        confirmLabel: 'Import',
        onConfirm: async function () {
          var lines = textarea.value.split('\n').map(function (line) { return line.trim() }).filter(Boolean)
          if (lines.length < 2) {
            ui.toast.error('Nothing to import', 'Paste at least one row of student details.')
            return
          }
          var headers = lines[0].split(',').map(function (part) { return part.trim() })
          var rows = lines.slice(1).map(function (line) {
            var cells = line.split(',').map(function (part) { return part.trim() })
            var row = {}
            headers.forEach(function (header, index) { row[header] = cells[index] || null })
            return row
          })
          dialog.setBusy(true, 'Importing…')
          try {
            var res = await ICT.api.importMembers(rows)
            ui.toast.success('Students imported', fmt.number(res.created || 0) + ' added, ' + fmt.number(res.skipped || 0) + ' skipped.')
            dialog.close()
            load()
          } catch (error) {
            dialog.setBusy(false)
            ui.toast.error('Could not import', error.message)
          }
        }
      })
    }

    async function issueCertificates(courseId, title) {
      var confirmed = await ui.confirmDialog({
        title: 'Issue certificates?',
        message: 'Every learner who completed “' + title + '” will receive a numbered certificate.',
        confirmLabel: 'Issue certificates'
      })
      if (!confirmed) return
      try {
        var res = await ICT.api.issueCertificates(courseId)
        ui.toast.success('Certificates issued', fmt.number(res.issued || 0) + ' created.')
        load()
      } catch (error) {
        ui.toast.error('Could not issue certificates', error.message)
      }
    }

    return null
  }

  ICT.screens = ICT.screens || {}
  ICT.screens.list = render

  /**
   * The dues payment dialog is used by the register row action, the dues record
   * page and the toolbar — so it is built once, here, and shared.
   */
  ICT.paymentDialog = makePaymentDialog

  /** Built here so both the list and a single dues record share one dialog. */
  function makePaymentDialog(row, onDone) {
    var amount = el('input.input', { id: 'payment-amount', type: 'number', value: Math.max(0, Number(row.amount_due || row.amount || 0) - Number(row.amount_paid || 0)) })
    var method = el('select.select', { id: 'payment-method' })
    ;['Cash', 'Mobile money', 'Bank transfer', 'Cheque'].forEach(function (option) {
      method.appendChild(el('option', { value: option, text: option }))
    })
    var reference = el('input.input', { id: 'payment-reference', placeholder: 'Receipt book number (optional)' })
    var note = el('input.input', { id: 'payment-note', placeholder: 'Note (optional)' })
    var currency = (ICT.store.settings || {}).currency

    var dialog = ui.modal({
      title: 'Record a dues payment',
      subtitle: row.full_name || row.member_label || ('Record #' + row.id),
      body: el('div', [
        ui.kv([
          ['Student', row.full_name || row.member_label || '—'],
          ['Term', [row.term, row.academic_year].filter(Boolean).join(' ') || '—'],
          ['Amount due', fmt.money(row.amount_due || row.amount, currency)],
          ['Already paid', fmt.money(row.amount_paid, currency)],
          ['Balance', fmt.money(Math.max(0, Number(row.amount_due || row.amount || 0) - Number(row.amount_paid || 0)), currency)]
        ]),
        el('div.form-grid.mt-2', [
          ui.field('Amount paid now', amount),
          ui.field('Method', method),
          ui.field('Reference', reference),
          ui.field('Note', note)
        ])
      ]),
      confirmLabel: 'Record payment',
      onConfirm: async function () {
        var paid = Number(amount.value)
        if (!isFinite(paid) || paid <= 0) {
          ui.toast.error('Enter the amount paid', 'It must be greater than zero.')
          return
        }
        dialog.setBusy(true, 'Saving…')
        try {
          var res = await ICT.api.recordPayment(row.id, {
            amount: paid,
            method: method.value,
            reference: reference.value.trim() || null,
            remarks: note.value.trim() || null
          })
          var receipt = res && res.data ? res.data.receipt_no : null
          ui.toast.success('Payment recorded', receipt ? 'Receipt ' + receipt : 'The dues record has been updated.')
          dialog.close()
          if (onDone) onDone()
        } catch (error) {
          dialog.setBusy(false)
          ui.toast.error('Could not record the payment', error.message)
        }
      }
    })
    return dialog
  }
})()
