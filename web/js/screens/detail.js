/* ==========================================================================
   detail.js — /r/<module>/<id>

   One record, with everything the schema knows about it: the key facts in a
   tidy list, the long text fields in full, and — where the module has them —
   the linked records (a student's attendance, a meeting's register, a
   course's learners, a certificate ready to print).
   ========================================================================== */
(function () {
  var ICT = window.ICT = window.ICT || {}
  var el = ICT.el
  var ui = ICT.widgets
  var icon = ICT.icon
  var fmt = ICT.fmt

  var LINE_FIELDS = ['content', 'minutes', 'agenda', 'description', 'notes', 'bio', 'summary', 'objectives', 'requirements', 'syllabus', 'remarks', 'resolutions', 'action_items']
  var HIDDEN_ONLY = /^(id|created_at|updated_at|.*_id)$/

  function render(root, route) {
    var store = ICT.store
    var resource = store.resourceFor(route.resource)
    var host = el('div')
    ICT.mount(root, host)
    var cleanup = null

    load()

    async function load() {
      ICT.mount(host, el('div.page', ui.loading('Opening ' + resource.singular.toLowerCase() + '…')))
      try {
        var res = await ICT.api.get(resource.key, route.id)
        paint(res.data || res, res.relations || [])
      } catch (error) {
        ICT.mount(host, el('div.page', [
          ui.pageHead(resource.singular + ' not found', 'That record is not in the club records any more.'),
          ui.notice(error.message, 'error'),
          el('div.mt-2', [ui.button('Back to ' + resource.label.toLowerCase(), { icon: 'chevronLeft', onClick: function () { ICT.nav.go('/r/' + resource.key) } })])
        ]))
      }
    }

    function paint(record) {
      var relations = arguments.length > 1 ? arguments[1] : []
      var fields = {}
      ;(resource.fields || []).forEach(function (field) { fields[field.key] = field })
      var title = record[resource.titleKey] || record.title || record.full_name || record.name || (resource.singular + ' #' + record.id)

      var actions = []
      if (store.canWrite(resource)) {
        actions.push(ui.button('Edit', { variant: 'primary', icon: 'edit', onClick: function () { editForm(record) } }))
      }
      if (resource.key === 'dues' && store.canWrite(resource)) {
        actions.push(ui.button('Record payment', { icon: 'coins', onClick: function () { paymentForm(record) } }))
      }
      if (resource.key === 'certificates') {
        actions.push(ui.button('Print certificate', { icon: 'printer', onClick: function () { ICT.screens.showCertificate(record.id) } }))
      }
      if (resource.key === 'members') {
        actions.push(ui.button('Attendance history', { icon: 'checkSquare', onClick: function () { ICT.nav.go('/r/attendance?member_id__eq=' + record.id) } }))
        actions.push(ui.button('Dues', { icon: 'coins', onClick: function () { ICT.nav.go('/r/dues?member_id__eq=' + record.id) } }))
      }
      if (resource.key === 'courses') {
        actions.push(ui.button('Enrol students', { icon: 'userPlus', onClick: function () { ICT.nav.go('/r/enrollments?course_id__eq=' + record.id) } }))
      }
      if (resource.key === 'meetings' || resource.key === 'activities') {
        actions.push(ui.button('Attendance register', { icon: 'checkSquare', onClick: function () { ICT.nav.go('/attendance?ref_type=' + (resource.key === 'meetings' ? 'meeting' : 'activity') + '&ref_id=' + record.id) } }))
      }
      if (store.canWrite(resource)) {
        actions.push(ui.button('Delete', { icon: 'trash', onClick: function () { remove(record, title) } }))
      }

      var page = el('div.page', [
        el('div.flex.gap-1.mb-1', [
          ui.button('All ' + resource.label.toLowerCase(), { size: 'sm', variant: 'ghost', icon: 'chevronLeft', onClick: function () { ICT.nav.go('/r/' + resource.key) } })
        ]),
        ui.pageHead(title, resource.singular + ' • last saved ' + fmt.dateTime(record.updated_at || record.created_at), actions)
      ])

      /* Long text first — minutes, notes and reports are what people come for. */
      var longFields = (resource.fields || []).filter(function (field) {
        return LINE_FIELDS.indexOf(field.key) !== -1 && String(record[field.key] || '').trim()
      })
      longFields.forEach(function (field) {
        page.appendChild(ui.card(field.label, {
          icon: 'note',
          body: el('div', { style: { whiteSpace: 'pre-wrap', lineHeight: '1.65' }, text: String(record[field.key]) })
        }))
      })

      /* Key facts: every field that holds something short. */
      var facts = []
      Object.keys(record).forEach(function (key) {
        if (HIDDEN_ONLY.test(key)) return
        if (LINE_FIELDS.indexOf(key) !== -1) return
        if (key === resource.titleKey) return
        var value = record[key]
        if (value === null || value === undefined || value === '' || typeof value === 'object') return
        var field = fields[key] || { key: key, label: ICT.titleCase(key), type: 'text' }
        facts.push([field.label || ICT.titleCase(key), factValue(field, value)])
      })
      page.appendChild(ui.card('Details', { icon: 'file', body: facts.length ? ui.kv(facts) : ui.empty('Nothing else recorded', 'Use Edit to add more detail.') }))

      /* Linked records — attendance, dues, learners, certificates… */
      if (relations && relations.length) {
        page.appendChild(el('div.grid.grid--2', relations.map(function (relation) {
          return ui.card(relation.label, {
            icon: 'layers',
            subtitle: fmt.number(relation.total) + ' record' + (relation.total === 1 ? '' : 's'),
            flush: true,
            body: relation.records && relation.records.length
              ? ui.table(relationColumns(relation), relation.records.slice(0, 10), {
                onRowClick: function (row) { ICT.nav.go('/r/' + relation.resource + '/' + row.id) }
              })
              : ui.empty('None yet', 'Related records will appear here.')
          })
        })))
      }

      ICT.mount(host, page)
    }

    function factValue(field, value) {
      if (field.type === 'date') return fmt.date(value)
      if (field.type === 'datetime') return fmt.dateTime(value)
      if (field.type === 'checkbox') return fmt.yesNo(value)
      if (field.type === 'select') return ui.badge(value)
      if (/money|amount|balance|budget|spent|cost|fee/.test(field.key)) return fmt.money(value, (ICT.store.settings || {}).currency)
      if (field.type === 'ref' || field.type === 'dynamicRef') return String(value)
      return String(value)
    }

    function relationColumns(relation) {
      var target = store.resourceFor(relation.resource)
      var keys = ((target && target.listColumns) || Object.keys(relation.records[0] || {})).slice(0, 4)
      return keys.map(function (key) {
        var field = target ? store.fieldFor(target, key) : null
        return {
          key: key,
          label: field ? field.label : ICT.titleCase(key),
          render: function (row) {
            var value = row[key]
            if (value === null || value === undefined || value === '') return el('span.muted', { text: '—' })
            if (field && field.type === 'date') return el('span', { text: fmt.date(value) })
            if (field && field.type === 'select') return ui.badge(value)
            if (/amount|balance|collected|paid/.test(key) && typeof value === 'number') return el('span', { text: fmt.money(value, (ICT.store.settings || {}).currency) })
            return el('span', { text: String(value) })
          }
        }
      })
    }

    /* -------------------------------------------------------------- Writes */

    function editForm(record) {
      var form = ICT.fields.formFields(resource, record, { showReadOnly: false, showExtra: false })
      var dialog = ui.modal({
        title: 'Edit ' + resource.singular.toLowerCase(),
        size: 'lg',
        body: form.node,
        confirmLabel: 'Save',
        onConfirm: async function () {
          var missing = form.missing()
          if (missing) {
            ui.toast.error('“' + missing.label + '” is required', 'Fill it in, then save again.')
            return
          }
          var payload = form.values()
          Object.keys(payload).forEach(function (key) { if (payload[key] === '') payload[key] = null })
          dialog.setBusy(true, 'Saving…')
          try {
            await ICT.api.update(resource.key, record.id, payload)
            ui.toast.success('Changes saved', 'The record is up to date.')
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

    /** The dues payment dialog is shared with the register (see list.js). */
    function paymentForm(record) {
      ICT.paymentDialog(record, load)
    }

    async function remove(record, title) {
      var confirmed = await ui.confirmDialog({
        title: 'Delete ' + resource.singular.toLowerCase() + '?',
        message: '“' + title + '” will be removed. This cannot be undone.',
        confirmLabel: 'Delete',
        danger: true
      })
      if (!confirmed) return
      try {
        await ICT.api.remove(resource.key, record.id)
        ui.toast.success(resource.singular + ' deleted', title + ' was removed.')
        ICT.nav.go('/r/' + resource.key)
      } catch (error) {
        ui.toast.error('Could not delete', error.message)
      }
    }

    return function () { if (cleanup) cleanup() }
  }

  ICT.screens = ICT.screens || {}
  ICT.screens.detail = render
})()
