/**
 * Small helpers shared by every screen: DOM building, formatting, timing.
 * No framework — just the platform.
 */
(function () {
  var ICT = (window.ICT = window.ICT || {})

  /* ---------------------------------------------------------------- */
  /* DOM                                                               */
  /* ---------------------------------------------------------------- */

  /**
   * el('div.card', { onclick }, [children])
   * The tag string may carry classes and an id: 'span.badge.badge--green'.
   */
  function el(spec, attrs, children) {
    if (attrs && (attrs.nodeType || Array.isArray(attrs) || typeof attrs !== 'object')) {
      children = attrs
      attrs = null
    }
    var parts = String(spec || 'div').split(/(?=[.#])/)
    var node = document.createElement(parts.shift() || 'div')
    parts.forEach(function (part) {
      if (part[0] === '#') node.id = part.slice(1)
      else node.classList.add(part.slice(1))
    })
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key]
        if (value === null || value === undefined || value === false) return
        if (key === 'class' || key === 'className') node.className += (node.className ? ' ' : '') + value
        else if (key === 'text') node.textContent = value
        else if (key === 'html') node.innerHTML = value
        else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value)
        else if (key === 'dataset') Object.keys(value).forEach((k) => (node.dataset[k] = value[k]))
        else if (key.slice(0, 2) === 'on' && typeof value === 'function') node.addEventListener(key.slice(2), value)
        else node.setAttribute(key, value === true ? '' : value)
      })
    }
    append(node, children)
    return node
  }

  function append(parent, children) {
    if (children === null || children === undefined || children === false) return parent
    if (Array.isArray(children)) {
      children.forEach((child) => append(parent, child))
      return parent
    }
    parent.appendChild(children.nodeType ? children : document.createTextNode(String(children)))
    return parent
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild)
    return node
  }

  function mount(parent, ...nodes) {
    clear(parent)
    append(parent, nodes)
    return parent
  }

  function frag(children) {
    return append(document.createDocumentFragment(), children instanceof Node || Array.isArray(children) ? children : [children])
  }

  /** Icon element: icon('users', 18). */
  function icon(name, size, extraClass) {
    var paths = (ICT.iconPaths && ICT.iconPaths[name]) || ICT.iconPaths?.grid || ''
    return el('span.ico' + (extraClass ? '.' + extraClass : ''), {
      html:
        '<svg width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" ' +
        'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        paths +
        '</svg>'
    })
  }

  /* ---------------------------------------------------------------- */
  /* Formatting                                                        */
  /* ---------------------------------------------------------------- */

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  function toDate(value) {
    if (!value) return null
    var d = value instanceof Date ? value : new Date(String(value).length === 10 ? value + 'T00:00:00' : value)
    return isNaN(d.getTime()) ? null : d
  }

  /** 12 Mar 2026 — the school writes dates this way. */
  function formatDate(value) {
    var d = toDate(value)
    if (!d) return '—'
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear()
  }

  function formatDateTime(value) {
    var d = toDate(value)
    if (!d) return '—'
    return formatDate(d) + ' · ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
  }

  function formatTime(value) {
    if (!value) return '—'
    var parts = String(value).split(':')
    if (parts.length < 2) return String(value)
    return parts[0].padStart(2, '0') + ':' + parts[1]
  }

  function relativeTime(value) {
    var d = toDate(value)
    if (!d) return '—'
    var seconds = Math.round((Date.now() - d.getTime()) / 1000)
    if (seconds < 60) return 'just now'
    var minutes = Math.round(seconds / 60)
    if (minutes < 60) return minutes + ' min ago'
    var hours = Math.round(minutes / 60)
    if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago')
    var days = Math.round(hours / 24)
    if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago')
    return formatDate(d)
  }

  function formatMoney(value, currency) {
    var number = Number(value || 0)
    if (!isFinite(number)) number = 0
    return (currency || 'UGX') + ' ' + number.toLocaleString('en-GB')
  }

  function formatNumber(value) {
    var number = Number(value || 0)
    return isFinite(number) ? number.toLocaleString('en-GB') : '0'
  }

  function formatPercent(value) {
    var number = Number(value || 0)
    return (isFinite(number) ? Math.round(number) : 0) + '%'
  }

  function initials(name) {
    return String(name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('')
  }

  function titleCase(value) {
    return String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  function normalize(value) {
    return String(value === null || value === undefined ? '' : value)
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .trim()
  }

  /* ---------------------------------------------------------------- */
  /* Timing                                                            */
  /* ---------------------------------------------------------------- */

  function debounce(fn, wait) {
    var timer = null
    return function (...args) {
      clearTimeout(timer)
      timer = setTimeout(() => fn.apply(this, args), wait)
    }
  }

  var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    )
  }

  ICT.util = {
    el,
    append,
    clear,
    mount,
    frag,
    icon,
    toDate,
    formatDate,
    formatDateTime,
    formatTime,
    relativeTime,
    formatMoney,
    formatNumber,
    formatPercent,
    initials,
    titleCase,
    normalize,
    debounce,
    sleep,
    escapeHtml
  }
})()
