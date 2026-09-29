import { Link, useNavigate } from 'react-router-dom'
import Icon from '../icons'
import { Avatar, Badge, Button, Card, KeyValue, ProgressBar, StatusBadge } from './ui'
import DataTable from './DataTable'
import { displayValue, formatCurrency, formatDate, relativeTime, timeRange } from '../format'
import { resourceByKey } from '../../../shared/schema'

const HIDDEN_IN_DETAIL = new Set(['created_at', 'updated_at', 'verification_code'])

function isLongText(field) {
  return field.type === 'textarea'
}

export default function RecordDetail({ resource, record, relations = [], onEdit, onDelete, extraActions, extraSections, currency = 'USD' }) {
  const navigate = useNavigate()
  const fields = resource.fields.filter((f) => f.type !== 'password' && !f.virtual && !HIDDEN_IN_DETAIL.has(f.key))

  const shortFields = fields.filter((f) => !isLongText(f))
  const longFields = fields.filter((f) => isLongText(f) && record[f.key])

  const renderValue = (field) => {
    const value = record[field.key]
    if (value === null || value === undefined || value === '') return null
    switch (field.type) {
      case 'ref': {
        const label = record[`${field.key}_label`] || value
        const target = resourceByKey(field.resource)
        return (
          <Link to={`/r/${field.resource}/${value}`} className="person" style={{ gap: 8 }}>
            <Avatar name={String(label)} size="sm" />
            <span>
              {label}
              <span className="small muted"> — {target?.label}</span>
            </span>
          </Link>
        )
      }
      case 'select':
        return <Badge>{value}</Badge>
      case 'date':
        return <>{formatDate(value)} <span className="small muted">{relativeTime(value)}</span></>
      case 'time':
        return timeRange(record.start_time, record.end_time) || displayValue(value, 'time')
      case 'currency':
        return formatCurrency(value, currency)
      case 'percentage':
        return (
          <div className="flex items-center gap-2" style={{ maxWidth: 240 }}>
            <ProgressBar value={value} />
            <span className="small muted">{value}%</span>
          </div>
        )
      case 'checkbox':
        return Number(value) ? <Badge tone="brand">Yes</Badge> : <span className="muted">No</span>
      case 'email':
        return <a href={`mailto:${value}`}>{value}</a>
      case 'tel':
        return <a href={`tel:${value}`}>{value}</a>
      case 'url':
        return (
          <a href={value} target="_blank" rel="noreferrer">
            {String(value).replace(/^https?:\/\//, '').slice(0, 60)} <Icon name="external" size={12} />
          </a>
        )
      case 'tags':
        return (
          <div className="flex gap-1 wrap">
            {String(value).split(',').map((tag) => (
              <span className="chip chip--neutral" key={tag.trim()}>
                {tag.trim()}
              </span>
            ))}
          </div>
        )
      default:
        return String(value)
    }
  }

  const title = record[resource.titleKey] || record[`${resource.titleKey}_label`] || `#${record.id}`
  const subtitleParts = []
  if (resource.subtitleKey && record[resource.subtitleKey]) subtitleParts.push(record[resource.subtitleKey])
  if (record.status) subtitleParts.push(record.status)

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <div className="card__body flex items-start justify-between gap-3 wrap">
          <div className="flex items-start gap-3" style={{ minWidth: 0 }}>
            {record.photo_url ? (
              <Avatar name={String(title)} src={record.photo_url} size="lg" />
            ) : (
              <div className="stat__icon" style={{ width: 52, height: 52, background: 'var(--brand-soft)', color: 'var(--brand-dark)' }}>
                <Icon name={resource.icon || 'grid'} size={24} />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 24 }}>{String(title)}</h1>
              <div className="flex items-center gap-2 wrap mt-1">
                {record.status && <StatusBadge value={record.status} />}
                {record.type && <Badge tone="brand">{record.type}</Badge>}
                {record.category && <Badge>{record.category}</Badge>}
                {record.priority && <Badge>{record.priority}</Badge>}
                {record.level && <Badge>{record.level}</Badge>}
                {record.term && <Badge>Term {record.term}</Badge>}
                <span className="small muted">Record #{record.id}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1 wrap">
            {extraActions}
            {onEdit && (
              <Button icon="edit" onClick={onEdit}>
                Edit
              </Button>
            )}
            {onDelete && (
              <Button variant="danger" icon="trash" onClick={onDelete}>
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {extraSections}

      <Card title="Record details" icon="clipboard">
        <KeyValue
          rows={shortFields.map((field) => ({
            label: field.label,
            value: renderValue(field)
          }))}
        />
      </Card>

      {longFields.length > 0 && (
        <div className="grid grid--2">
          {longFields.map((field) => (
            <Card key={field.key} title={field.label} icon="note">
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-2)' }}>{record[field.key]}</div>
            </Card>
          ))}
        </div>
      )}

      {relations.map((relation) => {
        const target = resourceByKey(relation.resource)
        if (!target) return null
        return (
          <Card
            key={relation.key}
            title={relation.label}
            subtitle={`${relation.total} record${relation.total === 1 ? '' : 's'}`}
            icon={target.icon}
            flush
            actions={
              <Button
                size="sm"
                variant="ghost"
                iconRight="chevronRight"
                onClick={() => navigate(`/r/${relation.resource}?${new URLSearchParams(relation.query || {}).toString()}`)}
              >
                Open list
              </Button>
            }
          >
            <DataTable
              resource={target}
              rows={relation.records}
              currency={currency}
              compact
              onRowClick={(row) => navigate(`/r/${relation.resource}/${row.id}`)}
              emptyTitle={`No ${relation.label.toLowerCase()} yet`}
              emptyMessage="Records linked to this item will show up here."
            />
          </Card>
        )
      })}
    </div>
  )
}


