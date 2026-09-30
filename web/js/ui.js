/**
 * UI building blocks: buttons, cards, tables, forms, modals, toasts, charts.
 * Everything returns DOM nodes, so screens just assemble them.
 */
(function () {
  var ICT = (window.ICT = window.ICT || {})
  var el = ICT.util.el
  var icon = ICT.util.icon

  /* ---------------------------------------------------------------- */
  /* Basics                                                            */
  /* ---------------------------------------------------------------- */

  function button(label, options) {
    options = options || {}
    var node = el('button.btn', {
      type: options.type || 'button',
      class: [
        options.variant ? 'btn--' + options.variant : '',
        options.size === 'sm' ? 'btn--sm' : '',
        options.iconOnly ? 'btn--icon' : ''
      ].join(' '),
      title: options.title || (options.iconOnly ? label : ''),
      onclick: options.onClick
    })
    if (options.loading) node.appendChild(el('span.spinner.spinner--dark'))
    else if (options.icon) node.appendChild(icon(options.icon, options.size === 'sm' ? 15 : 16))
    if (!options.iconOnly && label) node.appendChild(el('span', { text: label }))
    if (options.iconRight) node.appendChild(icon(options.iconRight, 15))
    if (options.disabled) node.disabled = true
    return node
  }

  function card(title, options) {
    options = options || {}
    var head = null
    if (title || options.subtitle || options.actions) {
      head = el('div.card__head', [
        el('div', [
          el('h3', { text: title || '' }),
          options.subtitle && el('p.small.muted', { text: options.subtitle })
        ]),
        options.actions && el('div.flex.gap-1', options.actions)
      ])
    }
    var body = el('div.card__body' + (options.flush ? '.card__body--flush' : ''), options.body || options.children)
    var node = el('section.card', [options.icon ? el('div.card__icon', [icon(options.icon, 18)]) : null, head, body, options.foot && el('div.card__foot', options.foot)])
    if (options.className) node.className += ' ' + options.className
    return node
  }

  function pageHead(title, subtitle, actions) {
    return el('header.page-head', [
      el('div.page-head__text', [el('h1', { text: title }), subtitle ? el('p.muted.small', { text: subtitle }) : null]),
      actions ? el('div.page-head__actions', actions) : null
    ])
  }

  function badge(label, tone, options) {
    options = options || {}
    var node = el('span.badge' + (tone ? '.badge--' + tone : '') + (options.dot ? '.badge--dot' : ''), { text: label })
    return node
  }

  /** Colours for status words, used across every module. */
  function statusTone(value) {
    var v = ICT.util.normalize(value)
    if (/^(active|paid|present|completed|approved|issued|done|verified|published|open)$/.test(v)) return 'green'
    if (/^(inactive|unpaid|overdue|absent|failed|rejected|cancelled|dropped)$/.test(v)) return 'red'
    if (/^(pending|partial|excused|late|scheduled|on hold|in progress|draft|planned|left early)$/.test(v)) return 'amber'
    if (/^(draft|upcoming|new)$/.test(v)) return 'blue'
    return 'gray'
  }

  function badgeFor(value) {
    return value ? badge(value, statusTone(value), { dot: true }) : el('span.muted', { text: '—' })
  }

  function empty(title, message, action) {
    return el('div.empty', [
      el('div.empty__icon', [icon('layers', 22)]),
      el('h3', { text: title }),
      message && el('p.small', { text: message }),
      action && el('div.mt-3', [action])
    ])
  }

  function loading(text) {
    return el('div.loading-wrap', [el('span.spinner'), el('span', { text: text || 'Loading' })])
  }

  function skeleton(rows) {
    return el('div', Array.from({ length: rows || 4 }, () => el('div.skeleton', { style: { marginBottom: '10px' } })))
  }

  function kv(rows) {
    return el(
      'div',
      rows.filter(Boolean).map(([key, value]) =>
        el('div.kv', [el('div.kv__k', { text: key }), el('div.kv__v', value && value.nodeType ? value : { text: value === null || value === undefined || value === '' ? '—' : String(value) })])
      )
    )
  }

  /* ---------------------------------------------------------------- */
  /* Toast + modal                                                     */
  /* ---------------------------------------------------------------- */

  function toastHost() {
    var host = document.querySelector('.toasts')
    if (!host) {
      host = el('div.toasts')
      document.body.appendChild(host)
    }
    return host
  }

  function toast(title, message, tone) {
    var node = el('div.toast' + (tone ? '.toast--' + tone : ''), [
      icon(tone === 'error' ? 'alert' : tone === 'success' ? 'check' : 'message', 17),
      el('div.toast__body', [el('div.toast__title', { text: title }), message ? el('div.small', { text: message }) : null])
    ])
    toastHost().appendChild(node)
    setTimeout(() => node.classList.add('toast--out'), 3800)
    setTimeout(() => node.remove(), 4400)
    return node
  }

  toast.success = (title, message) => toast(title, message, 'success')
  toast.error = (title, message) => toast(title, message, 'error')
  toast.info = (title, message) => toast(title, message)

  /** General-purpose modal. Returns { close, setBusy, body }. */
  function modal(options) {
    var body = el('div.modal__body', options.body)
    var foot = el('div.modal__foot', options.foot || [
      button('Cancel', { variant: 'ghost', onClick: () => close(), disabled: options.dismissible === false }),
      button(options.confirmLabel || 'Save', {
        variant: options.danger ? 'danger' : 'primary',
        onClick: async () => {
          if (options.onConfirm) await options.onConfirm()
        }
      })
    ])
    var dialog = el('div.modal' + (options.size === 'lg' ? '.modal--lg' : options.size === 'sm' ? '.modal--sm' : ''), [
      el('div.modal__head', [
        el('div', [el('h2', { text: options.title || '' }), options.subtitle && el('p.small.muted', { text: options.subtitle })]),
        button('Close', { variant: 'ghost', iconOnly: true, icon: 'x', onClick: () => close() })
      ]),
      body,
      foot
    ])
    var backdrop = el('div.modal-backdrop', {
      onclick: (event) => {
        if (event.target === backdrop && options.dismissible !== false) close()
      }
    })
    backdrop.appendChild(dialog)
    document.body.appendChild(backdrop)

    function onKey(event) {
      if (event.key === 'Escape' && options.dismissible !== false) close()
    }
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
      setBusy(busy, label) {
        foot.querySelectorAll('button').forEach((b) => (b.disabled = busy))
        var confirm = foot.querySelector('.btn--primary, .btn--danger')
        if (confirm) {
          confirm.disabled = busy
          if (busy && label) confirm.textContent = label
        }
      }
    }
  }

  function confirmDialog(options) {
    return new Promise((resolve) => {
      /* Closing the dialog fires onClose, so mark the answer as settled first —
         otherwise a confirmed action would report “cancelled” and never run. */
      var settled = false
      var dialog = modal({
        title: options.title,
        size: 'sm',
        body: el('p', { text: options.message }),
        confirmLabel: options.confirmLabel || 'Confirm',
        danger: options.danger,
        onConfirm: () => {
          settled = true
          resolve(true)
          dialog.close()
        },
        onClose: () => {
          if (!settled) resolve(false)
        }
      })
    })
  }

  /* ---------------------------------------------------------------- */
  /* Data table — column definitions come from the schema              */
  /* ---------------------------------------------------------------- */

  /**
   * columns: [{ key, label, render(row), sortable, width, align }]
   * Returns a <table>; the caller supplies rows and row actions.
   */
  function table(columns, rows, options) {
    options = options || {}
    var head = el('tr', columns.map((column) => {
      var isSorted = options.sort === column.key || options.sort === '-' + column.key
      var th = el('th', {
        class: (column.align ? 'right ' : '') + (column.sortable === false ? '' : 'th--sortable'),
        title: column.sortable === false ? '' : 'Sort by ' + column.label,
        onclick: column.sortable === false || !options.onSort
          ? null
          : () => options.onSort(isSorted && options.sort === column.key ? '-' + column.key : column.key)
      }, [
        el('span', { text: column.label }),
        column.sortable === false ? null : icon(isSorted && options.sort === '-' + column.key ? 'trendingDown' : 'sortDesc', 13)
      ])
      return th
    }))
    if (options.rowActions) head.appendChild(el('th.right', { text: options.actionsLabel || '' }))

    var body = el('tbody', rows.map((row, index) => {
      var tr = el('tr', { class: options.onRowClick ? 'row--clickable' : '' }, columns.map((column) => {
        var cell = column.render ? column.render(row) : ICT.format.cell(row, column)
        var td = el('td', { class: column.align === 'right' ? 'right' : '' })
        if (cell && cell.nodeType) td.appendChild(cell)
        else td.textContent = cell === null || cell === undefined ? '—' : String(cell)
        return td
      }))
      if (options.onRowClick) tr.addEventListener('click', (event) => {
        if (event.target.closest('button, a, input, select')) return
        options.onRowClick(row)
      })
      if (options.rowActions) tr.appendChild(el('td.right', el('div.flex.gap-1', { style: { justifyContent: 'flex-end' } }, options.rowActions(row, index))))
      return tr
    }))

    return el('div.table-wrap', el('table.data', [el('thead', head), body]))
  }

  function pagination(total, page, pageSize, onPage) {
    var pages = Math.max(1, Math.ceil(total / pageSize))
    var info = total === 0 ? 'No records' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${ICT.util.formatNumber(total)}`
    return el('div.pagination', [
      el('div.pagination__info', { text: info }),
      el('div.flex.gap-1', [
        button('Previous', { size: 'sm', icon: 'chevronLeft', disabled: page <= 1, onClick: () => onPage(page - 1) }),
        el('span.small.muted', { text: `Page ${page} of ${pages}`, style: { padding: '6px 8px' } }),
        button('Next', { size: 'sm', iconRight: 'chevronRight', disabled: page >= pages, onClick: () => onPage(page + 1) })
      ])
    ])
  }

  function segmented(options, active, onPick) {
    return el(
      'div.segmented',
      options.map((option) =>
        el('button.segmented__item' + (option.value === active ? '.is-active' : ''), {
          type: 'button',
          title: option.title || option.label,
          onclick: () => onPick(option.value)
        }, [option.icon ? icon(option.icon, 15) : null, option.label ? el('span', { text: option.label }) : null])
      )
    )
  }

  /** Simple bar chart (values in a plain array of {label,value}). */
  function barChart(items, options) {
    options = options || {}
    var max = Math.max(1, ...items.map((i) => Number(i.value) || 0))
    return el('div.chart__bars', items.map((item) => {
      var height = Math.round(((Number(item.value) || 0) / max) * 100)
      return el('div.chart__bar-col', { title: `${item.label}: ${ICT.util.formatNumber(item.value)}` }, [
        el('span.chart__value', { text: ICT.util.formatNumber(item.value) }),
        el('div.chart__bar' + (item.tone ? '.chart__bar--' + item.tone : ''), { style: { height: Math.max(3, height) + '%' } }),
        el('div.chart__label', { text: item.label })
      ])
    }))
  }

  /** Donut chart drawn as a single SVG ring. */
  function donut(items, options) {
    options = options || {}
    var total = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0)
    var radius = 54
    var circumference = 2 * Math.PI * radius
    var offset = 0
    var colours = options.colours || ['#4f46e5', '#06b6d4', '#12b76a', '#f79009', '#f04438', '#9b51e0']
    var rings = items.map((item, index) => {
      var fraction = total ? (Number(item.value) || 0) / total : 0
      var ring = el('circle', {
        cx: '70', cy: '70', r: String(radius), fill: 'none',
        stroke: item.colour || colours[index % colours.length],
        'stroke-width': '18',
        'stroke-dasharray': `${fraction * circumference} ${circumference}`,
        'stroke-dashoffset': String(-offset),
        transform: 'rotate(-90 70 70)'
      })
      offset += fraction * circumference
      return ring
    })
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 140 140')
    svg.setAttribute('class', 'donut')
    rings.forEach((ring) => svg.appendChild(ring))
    return el('div', [
      el('div.donut-wrap', [
        svg,
        el('div.donut__center', [
          el('div.donut__center-value', { text: options.centerValue || ICT.util.formatNumber(total) }),
          el('div.donut__center-label', { text: options.centerLabel || 'total' })
        ])
      ]),
      el('div.donut__legend', items.map((item, index) =>
        el('div.donut__legend-row', [
          el('span.chart__swatch', { style: { background: item.colour || colours[index % colours.length] } }),
          el('span.grow', { text: item.label }),
          el('b', { text: ICT.util.formatNumber(item.value) })
        ])
      ))
    ])
  }

  function progress(value, options) {
    options = options || {}
    var percent = Math.max(0, Math.min(100, Number(value) || 0))
    var tone = options.tone || (percent >= 75 ? 'green' : percent >= 40 ? 'amber' : 'red')
    return el('div.progress' + (options.plain ? '' : '.progress--' + tone), [
      el('div.progress__bar', { style: { width: percent + '%' } })
    ])
  }

  function tabs(items, active, onPick) {
    return el('div.tabs', items.map((item) =>
      el('button.tab' + (item.value === active ? '.is-active' : ''), { type: 'button', onclick: () => onPick(item.value) },
        [item.label, item.count !== undefined ? el('span.nav-item__count', { text: String(item.count) }) : null])
    ))
  }

  ICT.ui = {
    el, icon, button, card, pageHead, badge, badgeFor, statusTone, empty, loading, skeleton, kv,
    toast, modal, confirmDialog, table, pagination, segmented, barChart, donut, progress, tabs
  }
  /* Table cells format themselves from the schema field types. */
  ICT.format = {
    cell(row, column) {
      var value = row[column.key]
      var field = column.field || {}
      if (value === null || value === undefined || value === '') return '—'
      switch (field.type) {
        case 'currency':
          return ICT.util.formatMoney(value, column.currency)
        case 'percentage':
          return ICT.util.formatPercent(value)
        case 'number':
          return ICT.util.formatNumber(value)
        case 'date':
          return ICT.util.formatDate(value)
        case 'time':
          return ICT.util.formatTime(value)
        default:
          break
      }
      if (column.chip) return String(value)
      return String(value)
    }
  }
})()
