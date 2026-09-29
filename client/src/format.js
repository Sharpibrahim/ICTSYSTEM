/** Formatting + display helpers shared across the app. */

export function formatDate(value, { short = false } = {}) {
  if (!value) return '—'
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return String(value)
  const opts = short
    ? { day: '2-digit', month: 'short' }
    : { day: '2-digit', month: 'short', year: 'numeric' }
  return date.toLocaleDateString('en-GB', opts)
}

export function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return num.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function formatCurrency(value, currency = 'USD') {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  if (num === 0) return 'Free'
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(num)
  } catch {
    return `${currency} ${formatNumber(num)}`
  }
}

export function formatTime(value) {
  if (!value) return '—'
  const [h, m] = String(value).split(':')
  if (h === undefined) return String(value)
  const hour = Number(h)
  if (Number.isNaN(hour)) return String(value)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 === 0 ? 12 : hour % 12
  return `${display}:${m || '00'} ${suffix}`
}

export function timeRange(start, end) {
  if (!start && !end) return ''
  if (start && !end) return formatTime(start)
  if (!start) return `until ${formatTime(end)}`
  return `${formatTime(start)} – ${formatTime(end)}`
}

export function relativeTime(value) {
  if (!value) return ''
  const then = new Date(String(value).replace(' ', 'T')).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (Math.abs(mins) < 60) return mins <= 0 ? 'just now' : `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (Math.abs(hours) < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (Math.abs(days) < 31) return days >= 0 ? `${days}d ago` : `in ${Math.abs(days)}d`
  const months = Math.round(days / 30)
  if (Math.abs(months) < 12) return months >= 0 ? `${months}mo ago` : `in ${Math.abs(months)}mo`
  return formatDate(value)
}

export function daysUntil(dateString) {
  if (!dateString) return null
  const target = new Date(`${String(dateString).slice(0, 10)}T00:00:00`).getTime()
  if (Number.isNaN(target)) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target - today.getTime()) / 864e5)
}

export function dueLabel(dateString) {
  const days = daysUntil(dateString)
  if (days === null) return 'No due date'
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days === -1) return '1 day overdue'
  if (days < 0) return `${Math.abs(days)} days overdue`
  if (days < 30) return `Due in ${days} days`
  return `Due ${formatDate(dateString)}`
}

export function initials(name) {
  if (!name) return '?'
  const parts = String(name).replace(/[^\p{L}\s.]/gu, ' ').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

const TONE_MAP = {
  /* greens = good / finished / approved */
  active: 'green', completed: 'green', present: 'green', issued: 'green', approved: 'green', done: 'green', good: 'green', '1st place': 'green',
  /* blues = informational / in flight */
  ongoing: 'blue', 'in progress': 'blue', enrolled: 'blue', 'in review': 'blue', hybrid: 'blue', online: 'blue', submitted: 'blue', verified: 'blue', published: 'blue',
  /* ambers = waiting / attention */
  planned: 'amber', scheduled: 'amber', upcoming: 'amber', late: 'amber', 'under review': 'amber', 'pending approval': 'amber', draft: 'amber', medium: 'amber', 'on hold': 'amber', excused: 'amber', idea: 'amber', alumni: 'amber', past: 'amber',
  /* reds = problems */
  absent: 'red', cancelled: 'red', rejected: 'red', suspended: 'red', overdue: 'red', blocked: 'red', revoked: 'red', failed: 'red', critical: 'red', high: 'red', dropped: 'red',
  /* purples */
  postponed: 'purple', 'left early': 'purple', 'cabinet member': 'purple', patron: 'purple', guest: 'purple', 'annual general meeting': 'purple',
  /* greys = inactive */
  inactive: 'gray', 'to do': 'gray', low: 'gray', disabled: 'gray', archived: 'gray', member: 'gray', none: 'gray', private: 'gray', 'cabinet only': 'purple'
}

export function toneFor(value) {
  if (value === null || value === undefined || value === '') return 'gray'
  const key = String(value).toLowerCase()
  if (TONE_MAP[key]) return TONE_MAP[key]
  return 'gray'
}

export function titleCase(value) {
  if (!value && value !== 0) return ''
  return String(value).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function truncate(text, length = 120) {
  if (!text) return ''
  const clean = String(text).trim()
  return clean.length > length ? `${clean.slice(0, length).trimEnd()}…` : clean
}

export function percent(value) {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  return Number.isNaN(num) ? String(value) : `${num}%`
}

/** Best-effort human display for an arbitrary field value. */
export function displayValue(value, type) {
  if (value === null || value === undefined || value === '') return '—'
  switch (type) {
    case 'date':
      return formatDate(value)
    case 'time':
      return formatTime(value)
    case 'checkbox':
      return Number(value) ? 'Yes' : 'No'
    case 'percentage':
      return percent(value)
    case 'number':
      return formatNumber(value)
    default:
      return String(value)
  }
}

export function initialsColor(seed) {
  const palette = ['#4f46e5', '#0891b2', '#7c3aed', '#0d9488', '#c2410c', '#be185d', '#1d4ed8', '#15803d']
  let hash = 0
  const str = String(seed || '')
  for (let i = 0; i < str.length; i += 1) hash = (hash * 31 + str.charCodeAt(i)) % 9973
  return palette[hash % palette.length]
}

export function csvEscape(value) {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
