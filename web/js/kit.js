/* ==========================================================================
   kit.js — the small toolbox every screen uses.
   No dependencies. Everything hangs off window.ICT.
   ========================================================================== */
(function () {
  window.ICT = window.ICT || {}

  /* ---------------------------------------------------------------- DOM */

  /**
   * el('div.card.card--x', { attrs }, [children])
   * The first argument is a CSS selector: tag, .class, #id or any mix.
   */
  function el(selector, props, children) {
    if (props && (Array.isArray(props) || props instanceof Node || typeof props === 'string' || typeof props === 'number')) {
      children = props
      props = null
    }
    var parts = String(selector || 'div').split('.')
    var tag = parts.shift() || 'div'
    var node = document.createElement(tag)
    if (parts.length) node.className = parts.join(' ')
    applyProps(node, props || {})
    append(node, children)
    return node
  }

  function applyProps(node, props) {
    Object.keys(props).forEach(function (key) {
      var value = props[key]
      if (value === null || value === undefined || value === false) return
      if (key === 'class' || key === 'className') { node.className = (node.className ? node.className + ' ' : '') + value; return }
      if (key === 'text') { node.textContent = String(value); return }
      if (key === 'html') { node.innerHTML = value; return }
      if (key === 'style' && typeof value === 'object') { Object.assign(node.style, value); return }
      if (key === 'dataset') { Object.assign(node.dataset, value); return }
      if (key.slice(0, 2) === 'on' && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value)
        return
      }
      if (key === 'value') { node.value = value; return }
      if (key === 'checked' || key === 'disabled' || key === 'selected' || key === 'multiple' || key === 'required') {
        node[key] = Boolean(value)
        return
      }
      node.setAttribute(key, value === true ? '' : String(value))
    })
  }

  function append(node, children) {
    if (children === null || children === undefined || children === false) return node
    if (Array.isArray(children)) { children.forEach(function (child) { append(node, child) }); return node }
    node.appendChild(children instanceof Node ? children : document.createTextNode(String(children)))
    return node
  }

  function mount(host, content) {
    host.textContent = ''
    append(host, content)
    return host
  }

  var SVG_NS = 'http://www.w3.org/2000/svg'

  /**
   * Inline SVG icons — stroke-only, so they inherit the text colour.
   * The path data lives in one table; icon('users', 18) returns the <svg>.
   */
  var ICONS = {
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
    gauge: 'M12 21a9 9 0 1 0-9-9M12 21a9 9 0 0 0 9-9M12 12l5-4',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
    userPlus: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8M20 8v6M23 11h-6',
    crown: 'M3 18h18l-1.5-9-4.5 4L12 6l-3 7-4.5-4L3 18zM3 21h18',
    calendar: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
    star: 'M12 3l1.9 4.6 4.6 1.9-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3zM19 15l.9 2.1 2.1.9-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z',
    book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
    check: 'M20 6L9 17l-5-5',
    checkSquare: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
    file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h4',
    award: 'M12 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12M15.5 13.5L17 22l-5-3-5 3 1.5-8.5',
    note: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 12h8M8 16h5',
    rocket: 'M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1zM12 15l-3-3a22 22 0 0 1 2-4 12.9 12.9 0 0 1 11-6c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2zM9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
    settings: 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.8 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.3 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.4 14H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.4V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.5l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.8H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
    search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14M21 21l-4.3-4.3',
    plus: 'M12 5v14M5 12h14',
    edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
    trash: 'M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    printer: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
    x: 'M18 6L6 18M6 6l12 12',
    chevronLeft: 'M15 18l-6-6 6-6',
    chevronRight: 'M9 18l6-6-6-6',
    chevronDown: 'M6 9l6 6 6-6',
    filter: 'M22 3H2l8 9.5V19l4 2v-8.5L22 3z',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    menu: 'M3 12h18M3 6h18M3 18h18',
    mail: 'M2 4h20v16H2zM22 7l-10 6L2 7',
    phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.7 2z',
    link: 'M10 13a5 5 0 0 0 7.5.6l3-3A5 5 0 0 0 13.4 3.5l-1.7 1.7M14 11a5 5 0 0 0-7.5-.6l-3 3A5 5 0 0 0 10.6 20.5l1.7-1.7',
    clock: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18M12 7v5l3.5 2',
    mapPin: 'M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0zM12 7a3 3 0 1 1 0 6 3 3 0 0 1 0-6',
    alert: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
    trendingUp: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
    trendingDown: 'M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6',
    coins: 'M8 9a6 3 0 1 1 0 6 6 3 0 0 1 0-6M14 6a6 3 0 0 1 0 6M2 9a6 3 0 0 0 6 3M2 12a6 3 0 0 0 6 3M20 12a6 3 0 0 1-6 3M14 15a6 3 0 0 1-6 3M2 15a6 3 0 0 0 6 3M20 9v6M20 15a6 3 0 0 1-6 3',
    layers: 'M12 2l10 6-10 6L2 8l10-6zM2 14l10 6 10-6M2 11l10 6 10-6',
    school: 'M3 21h18M5 21V9l7-5 7 5v12M9 21v-5h6v5M12 4V2',
    tag: 'M20.6 13.4L12 22l-9-9V4h9l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01',
    list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    board: 'M3 3h7v18H3zM14 3h7v10h-7z',
    image: 'M3 3h18v18H3zM8.5 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3M21 15l-5-5L5 21'
  }

  /** Returns an inline SVG for the given icon name. */
  function icon(name, size) {
    var path = ICONS[name] || ICONS.grid
    var svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('width', size || 18)
    svg.setAttribute('height', size || 18)
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '1.8')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
    svg.setAttribute('aria-hidden', 'true')
    var parts = String(path).split('M').filter(Boolean)
    parts.forEach(function (part) {
      var p = document.createElementNS(SVG_NS, 'path')
      p.setAttribute('d', 'M' + part)
      svg.appendChild(p)
    })
    return svg
  }

  function iconBox(name, size) {
    return el('span.ico', [icon(name, size || 18)])
  }

  /* ---------------------------------------------------------------- Text */

  function titleCase(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, function (c) { return c.toUpperCase() })
      .trim()
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }

  function debounce(fn, wait) {
    var timer = null
    return function () {
      var args = arguments
      clearTimeout(timer)
      timer = setTimeout(function () { fn.apply(null, args) }, wait || 250)
    }
  }

  function empty(value) {
    return value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)
  }

  /** 'ICT Club' → 'IC' — for the little round avatars. */
  function initials(name) {
    var parts = String(name || '?').trim().split(/\s+/).slice(0, 2)
    return parts.map(function (part) { return part.charAt(0).toUpperCase() }).join('') || '?'
  }

  /* ---------------------------------------------------------------- Numbers */

  function formatNumber(value) {
    if (value === null || value === undefined || value === '') return '0'
    var n = Number(value)
    if (!isFinite(n)) return '0'
    return n.toLocaleString('en-GB')
  }

  function formatMoney(value, currency) {
    var n = Number(value || 0)
    if (!isFinite(n)) n = 0
    return (currency ? currency + ' ' : '') + n.toLocaleString('en-GB')
  }

  function formatPercent(value) {
    var n = Number(value)
    if (!isFinite(n)) return '0%'
    return (Math.round(n * 10) / 10) + '%'
  }

  /* ---------------------------------------------------------------- Dates */

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  function asDate(value) {
    if (!value) return null
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value
    var text = String(value).trim()
    var date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(text + 'T00:00:00') : new Date(text.replace(' ', 'T'))
    return isNaN(date.getTime()) ? null : date
  }

  function formatDate(value) {
    var date = asDate(value)
    if (!date) return '—'
    return date.getDate() + ' ' + MONTHS[date.getMonth()] + ' ' + date.getFullYear()
  }

  function formatDateTime(value) {
    var date = asDate(value)
    if (!date) return '—'
    var hours = date.getHours()
    var minutes = String(date.getMinutes()).padStart(2, '0')
    var suffix = hours < 12 ? 'am' : 'pm'
    var hour12 = hours % 12 || 12
    return formatDate(date) + ', ' + hour12 + ':' + minutes + suffix
  }

  /** How long ago, in words — for "last seen" style lines. */
  function timeAgo(value) {
    var date = asDate(value)
    if (!date) return '—'
    var seconds = Math.round((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return 'just now'
    var minutes = Math.round(seconds / 60)
    if (minutes < 60) return minutes + ' min ago'
    var hours = Math.round(minutes / 60)
    if (hours < 24) return hours + ' hour' + (hours === 1 ? '' : 's') + ' ago'
    var days = Math.round(hours / 24)
    if (days < 31) return days + ' day' + (days === 1 ? '' : 's') + ' ago'
    return formatDate(date)
  }

  function today() {
    return new Date().toISOString().slice(0, 10)
  }

  function greeting() {
    var hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  /* ---------------------------------------------------------------- Values */

  /** True/false as a person reads it. */
  function yesNo(value) { return value ? 'Yes' : 'No' }

  /** Picks a badge colour from a status word, so lists look consistent. */
  function badgeTone(value) {
    var text = String(value || '').toLowerCase()
    if (/^(active|present|completed|paid|approved|done|published|open)$/.test(text)) return 'green'
    if (/^(late|partial|pending|in progress|submitted|under review|planned|draft)$/.test(text)) return 'amber'
    if (/^(absent|unpaid|rejected|overdue|cancelled|revoked|disabled|blocked|left early)$/.test(text)) return 'red'
    if (/^(excused|enrolled|ongoing|in review)$/.test(text)) return 'blue'
    if (/^(archived|closed|alumni|inactive)$/.test(text)) return 'gray'
    return 'violet'
  }

  ICT.el = el
  ICT.icon = icon
  ICT.iconBox = iconBox
  ICT.mount = mount
  ICT.append = append
  ICT.escapeHtml = escapeHtml
  ICT.titleCase = titleCase
  ICT.debounce = debounce
  ICT.empty = empty
  ICT.initials = initials
  ICT.ICONS = ICONS

  ICT.fmt = {
    number: formatNumber,
    money: formatMoney,
    percent: formatPercent,
    date: formatDate,
    dateTime: formatDateTime,
    timeAgo: timeAgo,
    today: today,
    yesNo: yesNo,
    badgeTone: badgeTone,
    greeting: greeting,
    asDate: asDate,
    months: MONTHS
  }
})()
