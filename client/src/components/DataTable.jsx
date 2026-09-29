import Icon from '../icons'
import { Avatar, Badge, EmptyState, ProgressBar, StatusBadge } from './ui'
import { displayValue, formatCurrency, initials, percent, truncate } from '../format'

const STATUS_KEYS = new Set([
  'status', 'type', 'category', 'level', 'priority', 'role', 'mode', 'visibility', 'gender',
  'class_level', 'stream', 'house', 'position', 'term', 'color', 'certificate_type', 'ref_type'
])

const PROGRESS_KEYS = new Set(['progress', 'attendance_rate'])
const CURRENCY_KEYS = new Set(['budget', 'spent', 'fee', 'amount'])
const NAME_KEYS = new Set(['full_name', 'member_id', 'recipient_id', 'author_id', 'lead_id', 'assignee_id', 'organizer_id', 'chairperson_id', 'secretary_id', 'reviewed_by_id', 'recorded_by_id'])

function renderCell(row, key, field, currency) {
  const value = row[key]
  const label = row[`${key}_label`]
  const type = field?.type

  if (NAME_KEYS.has(key)) {
    const name = label || value
    if (!name) return <span className="muted">—</span>
    return (
      <div className="person">
        <Avatar name={String(name)} size="sm" />
        <div style={{ minWidth: 0 }}>
          <div className="person__name">{String(name)}</div>
          {row[`${key}_sub`] && <div className="person__meta">{row[`${key}_sub`]}</div>}
        </div>
      </div>
    )
  }

  if (value === null || value === undefined || value === '') {
    if (key === 'pinned') return <span className="muted">—</span>
    return <span className="muted">—</span>
  }

  if (type === 'checkbox' || key === 'pinned' || key === 'certificate_enabled') {
    return Number(value) ? <Badge tone="brand">Yes</Badge> : <span className="muted">No</span>
  }

  if (PROGRESS_KEYS.has(key)) {
    const num = Number(value)
    return (
      <div className="flex items-center gap-1" style={{ minWidth: 110 }}>
        <ProgressBar value={num} />
        <span className="small muted nowrap">{Number.isNaN(num) ? '—' : `${num}%`}</span>
      </div>
    )
  }

  if (CURRENCY_KEYS.has(key) || type === 'currency') {
    return <span className="nowrap">{formatCurrency(value, currency)}</span>
  }

  if (type === 'date' || /_date$|_at$|^date$|^deadline$/.test(key)) {
    return <span className="nowrap">{displayValue(value, 'date')}</span>
  }

  if (type === 'time') return <span className="nowrap">{displayValue(value, 'time')}</span>
  if (type === 'percentage') return <span className="nowrap">{percent(value)}</span>

  if (key === 'status' || STATUS_KEYS.has(key)) {
    const text = String(value)
    if (text.length > 26) return <span>{truncate(text, 26)}</span>
    return <Badge dot={key === 'status'}>{text}</Badge>
  }

  if (key === 'admission_number' || key === 'certificate_no' || key === 'code') {
    return <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{String(value)}</span>
  }

  if (field?.type === 'tags') {
    const tags = String(value).split(',').map((t) => t.trim()).filter(Boolean).slice(0, 3)
    return (
      <div className="flex gap-1 wrap">
        {tags.map((tag) => (
          <span className="chip chip--neutral" key={tag} style={{ fontSize: 11 }}>
            {tag}
          </span>
        ))}
      </div>
    )
  }

  const text = String(value)
  return <span title={text.length > 40 ? text : undefined}>{truncate(text, 46)}</span>
}

export default function DataTable({
  resource,
  rows,
  columns,
  sort,
  onSort,
  onRowClick,
  actions,
  currency = 'USD',
  emptyTitle = 'Nothing here yet',
  emptyMessage = 'Create your first record to get started.',
  emptyIcon,
  compact = false,
  rowKey = 'id'
}) {
  const cols = columns || resource.listColumns || resource.fields.slice(0, 5).map((f) => f.key)
  const fieldMap = Object.fromEntries(resource.fields.map((f) => [f.key, f]))

  if (!rows.length) {
    return <EmptyState icon={emptyIcon || 'grid'} title={emptyTitle} message={emptyMessage} />
  }

  const sortKey = sort?.replace('-', '')
  const sortDesc = sort?.startsWith('-')

  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {cols.map((key) => {
              const field = fieldMap[key]
              const isNumeric = ['number', 'currency', 'percentage'].includes(field?.type) || PROGRESS_KEYS.has(key)
              const active = sortKey === key
              return (
                <th
                  key={key}
                  className={`${onSort ? 'sortable' : ''} ${isNumeric ? 'num' : ''}`}
                  onClick={onSort ? () => onSort(active && !sortDesc ? `-${key}` : key) : undefined}
                  title={onSort ? 'Click to sort' : undefined}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {field?.label || key}
                    {active && <Icon name={sortDesc ? 'chevronDown' : 'chevronDown'} size={12} style={{ transform: sortDesc ? 'none' : 'rotate(180deg)' }} />}
                  </span>
                </th>
              )
            })}
            {actions && <th className="right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row[rowKey] ?? `${resource.key}-${index}`}
              onClick={() => onRowClick?.(row)}
              style={compact ? { fontSize: 12.5 } : undefined}
            >
              {cols.map((key) => {
                const field = fieldMap[key]
                const isNumeric = ['number', 'currency', 'percentage'].includes(field?.type) || PROGRESS_KEYS.has(key)
                return (
                  <td key={key} className={isNumeric ? 'num' : ''}>
                    {renderCell(row, key, field, currency)}
                  </td>
                )
              })}
              {actions && (
                <td className="right" onClick={(e) => e.stopPropagation()}>
                  <div className="row-actions">{actions(row)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { initials, StatusBadge }
