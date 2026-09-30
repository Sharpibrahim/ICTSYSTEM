/* ==========================================================================
   widgets.js — the pieces every screen is built from.
   Cards, tables, badges, stat tiles, dialogs, toasts, empty states.
   ========================================================================== */
(function () {
  var ICT = window.ICT = window.ICT || {}
  var el = ICT.el
  var icon = ICT.icon
  var iconBox = ICT.iconBox
  var fmt = ICT.fmt

  /* ---------------------------------------------------------------- Toasts */

  function toastHost() {
    var host = document.getElementById('toasts')
    if (!host) {
      host = el('div.toasts', { id: 'toasts' })
      document.body.appendChild(host)
    }
    return host
  }

  function toast(title, message, tone) {
    var node = el('div.toast' + (tone ? '.toast--' + tone : ''), [
      el('b', { text: title }),
      message ? el('span', { text: message }) : null
    ])
    toastHost().appendChild(node)
    setTimeout(function () {
      node.style.transition = 'opacity .3s'
      node.style.opacity = '0'
      setTimeout(function () { node.remove() }, 320)
    }, tone === 'error' ? 6500 : 4200)
    return node
  }

  var toastApi = {
    show: function (title, message) { return toast(title, message) },
    success: function (title, message) { return toast(title, message, 'success') },
    error: function (title, message) { return toast(title, message, 'error') }
  }

  /* ---------------------------------------------------------------- Bits */

  function pageHead(title, subtitle, actions) {
    return el('div.page-head', [
      el('div.page-head__text', [
        el('h1', { text: title }),
        subtitle ? el('p', { text: subtitle }) : null
      ]),
      actions && actions.length ? el('div.page-head__actions', actions.filter(Boolean)) : null
    ])
  }

  function card(title, options) {
    options = options || {}
    var head = (title || options.icon || options.actions)
      ? el('div.card__head', [
        options.icon ? el('span.stat__icon', [icon(options.icon, 18)]) : null,
        el('div', { style: { flex: '1 1 auto' } }, [
          title ? el('h3', { text: title }) : null,
          options.subtitle ? el('p', { text: options.subtitle }) : null
        ]),
        options.actions ? el('div.flex.gap-1', options.actions.filter(Boolean)) : null
      ])
      : null
    return el('div.card' + (options.flush ? '.card--flush' : ''), [head, el('div.card__body', options.body || null), options.foot ? el('div.card__foot', options.foot) : null])
  }

  function stat(label, value, iconName, tone, sub) {
    return el('div.stat', [
      el('div.stat__icon' + (tone ? '.stat__icon--' + tone : ''), [icon(iconName || 'grid', 20)]),
      el('div', { style: { minWidth: '0' } }, [
        el('div.stat__label', { text: label }),
        el('div.stat__value', { text: typeof value === 'number' ? fmt.number(value) : String(value) }),
        sub ? el('div.stat__sub', { text: sub }) : null
      ])
    ])
  }

  function badge(text, tone) {
    if (text === null || text === undefined || text === '') return el('span.muted', { text: '—' })
    return el('span.badge.badge--dot' + (tone ? '.badge--' + tone : '.badge--' + fmt.badgeTone(text)), { text: String(text) })
  }

  function button(label, options) {
    options = options || {}
    var classes = '.btn'
    if (options.variant) classes += '.btn--' + options.variant
    if (options.size) classes += '.btn--' + options.size
    if (options.iconOnly) classes += '.btn--icon'
    if (options.block) classes += '.btn--block'
    var node = el('button' + classes, {
      type: 'button',
      title: options.title || label || '',
      disabled: options.disabled,
      onclick: options.onClick || null
    })
    if (options.icon) node.appendChild(icon(options.icon, options.size === 'sm' ? 15 : 17))
    if (label && !options.iconOnly) node.appendChild(el('span', { text: label }))
    return node
  }

  function kv(pairs) {
    var list = el('dl.kv')
    pairs.filter(Boolean).forEach(function (pair) {
      list.appendChild(el('dt', { text: pair[0] }))
      var value = pair[1]
      list.appendChild(el('dd', Array.isArray(value) ? value : [value instanceof Node ? value : String(value === null || value === undefined || value === '' ? '—' : value)]))
    })
    return list
  }

  function loading(message) {
    return el('div.loading', { text: message || 'Loading…' })
  }

  function emptyState(title, message, action) {
    return el('div.empty', [
      el('div.empty__icon', [icon('list', 22)]),
      el('h3', { text: title }),
      message ? el('p', { text: message }) : null,
      action || null
    ])
  }

  function notice(message, tone) {
    return el('div.notice.notice--' + (tone || 'info'), [
      icon(tone === 'error' ? 'alert' : tone === 'warn' ? 'alert' : tone === 'success' ? 'check' : 'shield', 17),
      el('div', [message instanceof Node ? message : el('span', { text: message })])
    ])
  }

  function select(options, value, onChange, options2) {
    options2 = options2 || {}
    var node = el('select.select', { onchange: function (event) { onChange(event.target.value, event) } })
    if (options2.placeholder) node.appendChild(el('option', { value: '', text: options2.placeholder }))
    options.forEach(function (option) {
      var pair = Array.isArray(option) ? { value: option[0], label: option[1] } : (typeof option === 'object' ? option : { value: option, label: String(option) })
      node.appendChild(el('option', { value: pair.value, text: pair.label }))
    })
    node.value = value === null || value === undefined ? '' : String(value)
    return node
  }

  function field(label, control, help) {
    return el('div.field', [
      el('label.field__label', [el('span', { text: label })]),
      control,
      help ? el('span.field__help', { text: help }) : null
    ])
  }

  function searchBox(placeholder, value, onInput) {
    var input = el('input.input', { placeholder: placeholder, value: value || '', oninput: onInput })
    return el('div.search-wrap', [el('span.search-icon', [icon('search', 16)]), input])
  }

  /* ---------------------------------------------------------------- Table */

  /**
   * table(columns, rows, options)
   * columns: [{ key, label, render(row), sortable, align, width, className }]
   * options: { sort, onSort(rowKey), onRowClick(row), empty }
   */
  function table(columns, rows, options) {
    options = options || {}
    var head = el('tr', columns.map(function (column) {
      var sorted = options.sort === column.key || options.sort === '-' + column.key
      var label = el('span', { text: column.label })
      var cell = el('th', { class: column.align === 'right' ? 'right' : '' }, [
        column.sortable
          ? el('button', { type: 'button', onclick: function () { if (options.onSort) options.onSort(sorted && options.sort === column.key ? '-' + column.key : column.key) } }, [label, sorted ? el('span', { text: options.sort.charAt(0) === '-' ? '↓' : '↑' }) : null])
          : label
      ])
      if (column.width) cell.style.width = column.width
      return cell
    }))

    var body = el('tbody')
    if (!rows.length) {
      body.appendChild(el('tr', [el('td', { colspan: columns.length }, options.empty || emptyState('Nothing here yet', 'Records will appear as they are added.'))]))
    }
    rows.forEach(function (row) {
      var tr = el('tr' + (options.onRowClick ? '.row--clickable' : ''), {
        onclick: options.onRowClick ? function (event) {
          if (event.target.closest('button') || event.target.closest('a')) return
          options.onRowClick(row)
        } : null
      })
      columns.forEach(function (column) {
        var value = column.render ? column.render(row) : row[column.key]
        tr.appendChild(el('td', { class: (column.align === 'right' ? 'right ' : '') + (column.className || '') }, [
          value instanceof Node ? value : String(value === null || value === undefined || value === '' ? '—' : value)
        ]))
      })
      body.appendChild(tr)
    })

    return el('div.table-wrap', [el('table.data', [el('thead', [head]), body])])
  }

  /* ---------------------------------------------------------------- Dialogs */

  /**
   * modal({ title, subtitle, body, confirmLabel, danger, onConfirm, onClose, size })
   * Returns { close, setBusy }.
   */
  function modal(options) {
    var body = el('div.modal__body', options.body || null)
    var confirmButton = button(options.confirmLabel || 'Save', {
      variant: options.danger ? 'danger' : 'primary',
      onClick: async function () {
        if (!options.onConfirm) return close()
        try {
          await options.onConfirm()
        } catch (error) {
          toast.error('Could not save', error.message)
          dialog.setBusy(false)
        }
      }
    })
    var foot = options.foot || el('div.modal__foot', [
      button('Cancel', { variant: 'ghost', onClick: function () { close() } }),
      confirmButton
    ])

    var dialog = el('div.modal' + (options.size === 'lg' ? '.modal--lg' : options.size === 'sm' ? '.modal--sm' : ''), [
      el('div.modal__head', [
        el('div', { style: { flex: '1 1 auto' } }, [
          el('h2', { text: options.title || '' }),
          options.subtitle ? el('p.small.muted', { text: options.subtitle }) : null
        ]),
        button('Close', { variant: 'ghost', iconOnly: true, icon: 'x', onClick: function () { close() } })
      ]),
      body,
      foot
    ])

    var backdrop = el('div.modal-backdrop', {
      onclick: function (event) { if (event.target === backdrop) close() }
    }, [dialog])
    document.body.appendChild(backdrop)

    function onKey(event) { if (event.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)

    function close() {
      document.removeEventListener('keydown', onKey)
      backdrop.remove()
      if (options.onClose) options.onClose()
    }

    return {
      close: close,
      body: body,
      dialog: dialog,
      /** Turns the buttons off while a save is in flight. */
      setBusy: function (busy, label) {
        dialog.querySelectorAll('.modal__foot button').forEach(function (node) { node.disabled = Boolean(busy) })
        if (busy && label && confirmButton) confirmButton.textContent = ''
        if (busy && label && confirmButton) confirmButton.appendChild(el('span', { text: label }))
        else if (!busy && confirmButton) {
          confirmButton.textContent = ''
          confirmButton.appendChild(el('span', { text: options.confirmLabel || 'Save' }))
        }
      }
    }
  }

  /** Ask a yes/no question. Resolves true only when the confirm button is used. */
  function confirmDialog(options) {
    return new Promise(function (resolve) {
      var settled = false
      var dialog = modal({
        title: options.title,
        size: 'sm',
        body: el('p', { text: options.message }),
        confirmLabel: options.confirmLabel || 'Confirm',
        danger: options.danger,
        foot: el('div.modal__foot', [
          button('Cancel', { variant: 'ghost', onClick: function () { dialog.close() } }),
          button(options.confirmLabel || 'Confirm', {
            variant: options.danger ? 'danger' : 'primary',
            onClick: function () {
              settled = true
              resolve(true)
              dialog.close()
            }
          })
        ]),
        onClose: function () { if (!settled) resolve(false) }
      })
    })
  }

  /* ---------------------------------------------------------------- Charts (plain CSS) */

  /** A small horizontal bar list — used instead of a chart library. */
  function bars(items, options) {
    options = options || {}
    var max = items.reduce(function (top, item) { return Math.max(top, Number(item.value) || 0) }, 0) || 1
    return el('div', { style: { display: 'grid', gap: '.5rem' } }, items.map(function (item) {
      var width = Math.round(((Number(item.value) || 0) / max) * 100)
      return el('div', [
        el('div.between.small', [
          el('span', { text: item.label }),
          el('b', { text: options.money ? fmt.money(item.value, options.currency) : fmt.number(item.value) })
        ]),
        el('div', { style: { height: '8px', background: 'var(--line-2)', borderRadius: '999px', overflow: 'hidden', marginTop: '4px' } }, [
          el('div', { style: { width: width + '%', height: '100%', background: item.color || 'var(--brand)' } })
        ])
      ])
    }))
  }

  /** A simple column chart for a time series (attendance trend, member growth). */
  function columns(items, options) {
    options = options || {}
    var max = items.reduce(function (top, item) { return Math.max(top, Number(item.value) || 0) }, 0) || 1
    return el('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '6px', height: '150px' } }, items.map(function (item) {
      var height = Math.max(4, Math.round(((Number(item.value) || 0) / max) * 130))
      return el('div', { style: { flex: '1 1 0', textAlign: 'center' }, title: item.label + ': ' + item.value }, [
        el('div', { style: { height: height + 'px', background: 'var(--brand)', borderRadius: '5px 5px 0 0' } }),
        el('div.small.faint', { style: { marginTop: '4px' }, text: options.short ? String(item.short || item.label).slice(0, 4) : item.label })
      ])
    }))
  }

  ICT.widgets = {
    pageHead: pageHead,
    card: card,
    stat: stat,
    badge: badge,
    button: button,
    kv: kv,
    loading: loading,
    empty: emptyState,
    notice: notice,
    select: select,
    field: field,
    searchBox: searchBox,
    table: table,
    modal: modal,
    confirmDialog: confirmDialog,
    bars: bars,
    columns: columns,
    toast: toastApi
  }
})()
