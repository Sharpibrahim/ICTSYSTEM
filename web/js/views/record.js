/**
 * Record page — /r/:resource/:id
 *
 * Shows every field of one record (formatted by its type), the linked records
 * the API returns with it (a student's dues, a meeting's attendance, a course's
 * register…), and the actions that belong to that module: edit, delete, record
 * a payment, issue a certificate, print a certificate.
 */
(function () {
  var ICT = (window.ICT = window.ICT || {})
  var el = ICT.util.el
  var icon = ICT.util.icon
  var ui = ICT.ui
  var HIDDEN = ['created_at', 'updated_at', 'verification_code', 'password_hash', 'password']

  function render(root, params) {
    var key = params.resource
    var id = params.id
    var store = ICT.store
    var resource = store.resource(key)
    var container = el('div')
    ICT.util.mount(root, container)
    ICT.util.mount(container, el('div.page', el('div.card', el('div.card__body', ui.skeleton(5)))))

    if (!resource) {
      ICT.util.mount(container, el('div.page', ui.empty('Unknown section', 'There is no module called “' + key + '”.')))
      return
    }
    var fields = {}
    ;(resource.fields || []).forEach((field) => (fields[field.key] = field))

    load()

    async function load() {
      var data
      try {
        data = await ICT.api.get(key, id)
      } catch (error) {
        ICT.util.mount(container, el('div.page', el('div.card', el('div.card__body', ui.empty('Could not load this record', error.message, ui.button('Back to ' + resource.label.toLowerCase(), { icon: 'chevronLeft', onClick: () => ICT.router.go('/r/' + key) }))))))
        return
      }
      var record = data.data || data
      var relations = data.relations || []
      paint(record, relations)
    }

    function cellValue(record, field) {
      var value = record[field.key]
      if (value === null || value === undefined || value === '') return el('span.muted', { text: '—' })
      switch (field.type) {
        case 'ref': {
          var label = record[field.key + '_label'] || value
          return el('a.link.person', { href: '/r/' + field.resource + '/' + value }, [
            el('span.avatar.avatar--sm', { text: ICT.util.initials(label) }),
            el('span', { text: String(label) })
          ])
        }
        case 'select':
          return ui.badgeFor(value)
        case 'date':
          return el('span', [el('span', { text: ICT.util.formatDate(value) }), el('span.small.muted', { text: ' · ' + ICT.util.relativeTime(value) })])
        case 'time':
          return el('span', { text: record.start_time && record.end_time ? ICT.util.formatTime(record.start_time) + '–' + ICT.util.formatTime(record.end_time) : ICT.util.formatTime(value) })
        case 'currency':
          return el('b', { text: ICT.util.formatMoney(value, store.settings.currency) })
        case 'percentage':
          return el('div.flex.items-center.gap-1', { style: { maxWidth: '240px' } }, [ui.progress(value), el('span.small.muted', { text: ICT.util.formatPercent(value) })])
        case 'checkbox':
          return value ? ui.badge('Yes', 'brand') : el('span.muted', { text: 'No' })
        case 'email':
          return el('a.link', { href: 'mailto:' + value, text: String(value) })
        case 'tel':
          return el('a.link', { href: 'tel:' + value, text: String(value) })
        case 'url':
          return el('a.link', { href: value, target: '_blank', rel: 'noreferrer' }, [el('span', { text: String(value).replace(/^https?:\/\//, '').slice(0, 60) }), icon('external', 12)])
        case 'tags':
          return el('div.flex.gap-1.wrap', String(value).split(',').map((tag) => el('span.chip.chip--neutral', { text: tag.trim() })))
        case 'textarea':
          return el('div.prewrap', { text: String(value) })
        default:
          return el('span', { text: String(value) })
      }
    }

    function paint(record, relations) {
      var title = record[resource.titleKey] || record[resource.titleKey + '_label'] || '#' + record.id
      var subtitle = resource.subtitleKey ? record[resource.subtitleKey] : null
      var canWrite = ICT.views.canWriteResource(resource, store.user && store.user.role)

      var page = el('div.page')
      page.appendChild(el('nav.breadcrumb', [
        el('a', { href: '/r/' + key, text: resource.label }),
        el('span', { text: '/' }),
        el('span', { text: String(title) })
      ]))

      var actions = [ui.button('Back', { variant: 'ghost', icon: 'chevronLeft', onClick: () => ICT.router.go('/r/' + key) })]
      if (key === 'certificates' && record.id) {
        actions.push(ui.button('Print certificate', { icon: 'print', onClick: () => printCertificate(record) }))
      }
      if (key === 'dues' && canWrite && record.status !== 'Paid') {
        actions.push(ui.button('Record payment', { variant: 'primary', icon: 'coins', onClick: () => ICT.views.resourcePayment(record, load) }))
      }
      if (canWrite) {
        actions.push(ui.button('Edit', { icon: 'edit', onClick: () => editRecord(record) }))
        actions.push(ui.button('Delete', { variant: 'danger', icon: 'trash', onClick: () => deleteRecord(record, title) }))
      }
      page.appendChild(ui.pageHead(title, subtitle, actions))

      /* Main details, grouped the way the form groups them. */
      var groups = {}
      ;(resource.fields || []).forEach((field) => {
        if (HIDDEN.includes(field.key) || field.type === 'password') return
        if (record[field.key] === null || record[field.key] === undefined || record[field.key] === '') return
        var group = field.formGroup || 'Details'
        groups[group] = groups[group] || []
        groups[group].push(field)
      })

      page.appendChild(el('div.grid.grid--2', Object.keys(groups).map((group) =>
        ui.card(group, { body: ui.kv(groups[group].map((field) => [field.label, cellValue(record, field)])) })
      )))

      /* Relations the API sent with the record. */
      relations.forEach((relation) => {
        var related = relation.resource ? store.resource(relation.resource) : null
        var rows = relation.rows || relation.data || []
        page.appendChild(ui.card(relation.label || (related ? related.label : 'Related records'), {
          subtitle: rows.length ? rows.length + ' record(s)' : 'Nothing linked yet',
          flush: rows.length > 0,
          body: rows.length
            ? ui.table(
                (relation.columns || []).map((column) => ({
                  key: column.key,
                  label: column.label,
                  render: (row) => {
                    var value = row[column.key]
                    if (value === null || value === undefined || value === '') return el('span.muted', { text: '—' })
                    return el('span', { text: String(value) })
                  }
                })),
                rows,
                {
                  rowActions: related ? (row) => [ui.button('Open', { size: 'sm', variant: 'ghost', iconOnly: true, icon: 'chevronRight', onClick: () => ICT.router.go('/r/' + related.key + '/' + row.id) })] : null
                }
              )
            : ui.empty('Nothing linked yet', 'Linked records appear here as they are added.')
        }))
      })

      ICT.util.mount(container, page)
      if (ICT.router.query().get('print') === '1' && key === 'certificates') setTimeout(() => printCertificate(record), 300)
    }

    function editRecord(record) {
      var built = ICT.forms.buildForm(resource, record)
      var dialog = ui.modal({
        title: 'Edit ' + resource.singular.toLowerCase(),
        size: 'lg',
        body: built.form,
        confirmLabel: 'Save changes',
        onConfirm: async () => {
          var result = built.collect()
          if (Object.keys(result.errors).length) {
            built.setErrors(result.errors)
            return
          }
          dialog.setBusy(true, 'Saving…')
          try {
            await ICT.api.update(key, record.id, result.values)
            dialog.close()
            ui.toast.success(resource.singular + ' updated')
            ICT.forms.invalidateOptions(key)
            load()
          } catch (error) {
            dialog.setBusy(false)
            ui.toast.error('Could not save', error.message)
          }
        }
      })
    }

    async function deleteRecord(record, title) {
      var confirmed = await ui.confirmDialog({
        title: 'Delete ' + resource.singular.toLowerCase() + '?',
        message: '“' + title + '” will be removed from the club records. This cannot be undone.',
        confirmLabel: 'Delete',
        danger: true
      })
      if (!confirmed) return
      try {
        await ICT.api.remove(key, record.id)
        ui.toast.success(resource.singular + ' deleted')
        ICT.router.go('/r/' + key)
      } catch (error) {
        ui.toast.error('Could not delete', error.message)
      }
    }

    async function printCertificate(record) {
      try {
        var data = await ICT.api.printableCertificate(record.id)
        ICT.views.showCertificate(data.data || data)
      } catch (error) {
        ui.toast.error('Could not prepare the certificate', error.message)
      }
    }
  }

  ICT.views = ICT.views || {}
  ICT.views.record = render
})()
