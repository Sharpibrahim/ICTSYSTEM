import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Icon, { RESOURCE_ICONS } from '../icons'
import { api } from '../api'
import { useAuth } from '../auth'
import { invalidateOptions, useAsync, useDebounced, useOptions } from '../hooks'
import { canWrite as schemaCanWrite, fieldMap, resourceByKey } from '../../../shared/schema'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Loading,
  Modal,
  Pagination,
  ProgressBar,
  Segmented,
  StatusBadge,
  useToast
} from '../components/ui'
import DataTable from '../components/DataTable'
import RecordForm from '../components/RecordForm'
import { dueLabel, formatCurrency, formatDate, formatNumber, percent, relativeTime, timeRange, truncate } from '../format'

const VIEWS = {
  meetings: ['table', 'calendar', 'cards'],
  activities: ['table', 'calendar', 'cards'],
  project_tasks: ['board', 'table'],
  projects: ['cards', 'table'],
  notes: ['cards', 'table'],
  members: ['table', 'cards'],
  courses: ['cards', 'table'],
  reports: ['board', 'table'],
  enrollments: ['table', 'board'],
  certificates: ['table', 'cards'],
  cabinet: ['table', 'cards']
}

const DEFAULT_VIEW = { project_tasks: 'board', projects: 'cards', notes: 'cards', meetings: 'table', activities: 'table', members: 'table', courses: 'table', reports: 'board' }

function defaultView(resourceKey, saved) {
  const allowed = VIEWS[resourceKey] || ['table']
  if (saved && allowed.includes(saved)) return saved
  return DEFAULT_VIEW[resourceKey] || 'table'
}

export default function ResourcePage() {
  const { resource: resourceKey } = useParams()
  const resource = resourceByKey(resourceKey)
  const navigate = useNavigate()
  const toast = useToast()
  const { user, settings } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [view, setView] = useState(() => defaultView(resourceKey, localStorage.getItem(`view:${resourceKey}`)))
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({})
  const [sort, setSort] = useState(resource?.defaultSort || '')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const debouncedQuery = useDebounced(query, 260)

  useEffect(() => {
    setView(defaultView(resourceKey, localStorage.getItem(`view:${resourceKey}`)))
    setQuery('')
    setPage(1)
    setSort(resourceByKey(resourceKey)?.defaultSort || '')
    const initial = {}
    for (const [key, value] of searchParams.entries()) {
      if (['new', 'page'].includes(key)) continue
      initial[key] = value
    }
    setFilters(initial)
    if (searchParams.get('new') === '1') setCreating(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceKey])

  useEffect(() => {
    if (resourceKey) localStorage.setItem(`view:${resourceKey}`, view)
  }, [resourceKey, view])

  const params = useMemo(() => {
    const out = { page, pageSize, sort: sort || undefined }
    if (debouncedQuery) out.q = debouncedQuery
    for (const [key, value] of Object.entries(filters)) {
      if (value !== '' && value !== undefined && value !== null) out[key] = value
    }
    return out
  }, [page, pageSize, sort, debouncedQuery, filters])

  const { data, loading, error, reload } = useAsync(() => api.list(resourceKey, params), [resourceKey, JSON.stringify(params), refreshKey])

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
    invalidateOptions(resourceKey)
  }, [resourceKey])

  if (!resource) {
    return <EmptyState icon="alert" title="Unknown section" message={`There is no module called “${resourceKey}”.`} />
  }

  const canWrite = schemaCanWrite(resource, user?.role) && !(resource.key === 'users' && user?.role !== 'admin')
  const rows = data?.data || []
  const currency = settings?.currency || 'USD'
  const fields = fieldMap(resource)

  const filterFields = (resource.filters || [])
    .map((key) => fields[key])
    .filter(Boolean)
    .slice(0, 5)

  const handleSave = async (payload) => {
    setSaving(true)
    try {
      if (editing?.id) {
        await api.update(resourceKey, editing.id, payload)
        toast.success(`${resource.singular} updated`)
      } else {
        await api.create(resourceKey, payload)
        toast.success(`${resource.singular} created`)
      }
      setEditing(null)
      setCreating(false)
      refresh()
      if (searchParams.get('new')) setSearchParams({}, { replace: true })
    } catch (err) {
      toast.error('Could not save', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await api.remove(resourceKey, deleting.id)
      toast.success(`${resource.singular} deleted`)
      setDeleting(null)
      refresh()
    } catch (err) {
      toast.error('Could not delete', err.message)
    } finally {
      setDeletingBusy(false)
    }
  }

  const openDetail = (row) => navigate(`/r/${resourceKey}/${row.id}`)

  const rowActions = (row) => (
    <>
      {(resource.key === 'meetings' || resource.key === 'activities' || resource.key === 'courses') && (
        <Button
          size="sm"
          variant="ghost"
          icon="check"
          title="Attendance register"
          onClick={() => navigate(`/attendance?ref_type=${resource.key === 'courses' ? 'course' : resource.key === 'meetings' ? 'meeting' : 'activity'}&ref_id=${row.id}`)}
        />
      )}
      {resource.key === 'projects' && (
        <Button size="sm" variant="ghost" icon="checkSquare" title="Project tasks" onClick={() => navigate(`/r/project_tasks?project_id=${row.id}`)} />
      )}
      {resource.key === 'courses' && (
        <Button size="sm" variant="ghost" icon="award" title="Issue certificates to completers" onClick={() => issueCertificates(row)} />
      )}
      {canWrite && <Button size="sm" variant="ghost" icon="edit" title="Edit" onClick={() => setEditing(row)} />}
      {canWrite && <Button size="sm" variant="ghost" icon="trash" title="Delete" onClick={() => setDeleting(row)} />}
    </>
  )

  const issueCertificates = async (course) => {
    try {
      const result = await api.issueCertificates(course.id)
      if (result.issued) toast.success(`${result.issued} certificate(s) issued`, result.skipped ? `${result.skipped} learners already had one.` : '')
      else toast.info('Nothing to issue', 'No learners have completed this course yet.')
      refresh()
    } catch (err) {
      toast.error('Could not issue certificates', err.message)
    }
  }

  const viewsForResource = VIEWS[resourceKey] || ['table']
  const activeView = viewsForResource.includes(view) ? view : 'table'

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <div className="breadcrumb">
            <span>{resource.group}</span>
            <Icon name="chevronRight" size={12} />
            <span>{resource.label}</span>
          </div>
          <h1>{resource.label}</h1>
          <p>{resource.description}</p>
        </div>
        <div className="page-head__actions">
          {viewsForResource.length > 1 && (
            <Segmented
              value={activeView}
              onChange={setView}
              options={viewsForResource.map((v) => ({
                value: v,
                label: v === 'table' ? 'Table' : v === 'cards' ? 'Cards' : v === 'board' ? 'Board' : 'Calendar',
                icon: v === 'table' ? 'list' : v === 'cards' ? 'grid' : v === 'board' ? 'layers' : 'calendar'
              }))}
            />
          )}
          <Button icon="download" onClick={() => api.download(resourceKey, { ...params, page: undefined, pageSize: undefined }, `ict-club-${resourceKey}.csv`)}>
            <span className="hide-sm">Export CSV</span>
          </Button>
          {resource.key === 'members' && canWrite && (
            <Button icon="upload" onClick={() => setImportOpen(true)}>
              <span className="hide-sm">Import</span>
            </Button>
          )}
          {canWrite && (
            <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
              New {resource.singular.toLowerCase()}
            </Button>
          )}
        </div>
      </div>

      <div className="filters-bar">
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
          <Icon name="search" size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 36, width: '100%' }}
            placeholder={`Search ${resource.label.toLowerCase()}…`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
        </div>

        {filterFields.map((field) => (
          <FilterControl
            key={field.key}
            field={field}
            value={filters[field.key] ?? ''}
            onChange={(value) => {
              setFilters((prev) => ({ ...prev, [field.key]: value }))
              setPage(1)
            }}
          />
        ))}

        <select
          className="select"
          value={`${sort}`}
          onChange={(e) => setSort(e.target.value)}
          title="Sort by"
        >
          <option value="">Sort: default</option>
          {[...new Set(resource.listColumns || [])].map((key) => (
            fields[key] && (
              <optgroup key={key} label={fields[key].label}>
                <option value={key}>{fields[key].label} ↑</option>
                <option value={`-${key}`}>{fields[key].label} ↓</option>
              </optgroup>
            )
          ))}
        </select>

        {Object.values(filters).some((v) => v) && (
          <Button size="sm" variant="ghost" icon="x" onClick={() => setFilters({})}>
            Clear
          </Button>
        )}
        <div className="grow" />
        <span className="filters-bar__label">{data ? `${data.total} record${data.total === 1 ? '' : 's'}` : ''}</span>
        <Button size="sm" variant="ghost" icon="refresh" onClick={refresh} aria-label="Refresh" />
      </div>

      <Card flush>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <EmptyState icon="alert" title="Could not load records" message={error} action={<Button icon="refresh" onClick={refresh}>Retry</Button>} />
        ) : activeView === 'table' ? (
          <DataTable
            resource={resource}
            rows={rows}
            sort={sort}
            onSort={(next) => {
              setSort(next)
              setPage(1)
            }}
            onRowClick={openDetail}
            actions={rowActions}
            currency={currency}
            emptyTitle={`No ${resource.label.toLowerCase()} yet`}
            emptyMessage={canWrite ? `Click “New ${resource.singular.toLowerCase()}” to add the first record.` : 'Records will appear here once they are created.'}
            emptyIcon={RESOURCE_ICONS[resourceKey]}
          />
        ) : activeView === 'cards' ? (
          <div className="card__body">
            <CardGrid resource={resource} rows={rows} currency={currency} onOpen={openDetail} onEdit={canWrite ? setEditing : null} />
          </div>
        ) : activeView === 'board' ? (
          <BoardView resource={resource} rows={rows} onOpen={openDetail} onMove={canWrite ? async (row, status) => {
            try {
              await api.update(resourceKey, row.id, { status })
              toast.success(`Moved to ${status}`)
              refresh()
            } catch (err) {
              toast.error('Could not update', err.message)
            }
          } : null} />
        ) : (
          <CalendarView resource={resource} currency={currency} onOpen={openDetail} />
        )}

        {activeView === 'table' && data && data.total > 0 && (
          <div className="card__foot">
            <div className="flex items-center gap-2">
              <span className="muted small">Rows per page</span>
              <select
                className="select"
                style={{ width: 84, padding: '5px 8px' }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
              >
                {[25, 50, 100, 250].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <Pagination page={data.page} pages={data.pages} total={data.total} pageSize={data.pageSize} onPage={setPage} />
          </div>
        )}
      </Card>

      <Modal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false)
          setEditing(null)
          if (searchParams.get('new')) setSearchParams({}, { replace: true })
        }}
        title={editing ? `Edit ${resource.singular.toLowerCase()}` : `New ${resource.singular.toLowerCase()}`}
        subtitle={editing ? `Record #${editing.id}` : resource.description}
        size="lg"
      >
        <RecordForm
          resource={resource}
          initial={editing || {}}
          submitting={saving}
          onSubmit={handleSave}
          onCancel={() => {
            setCreating(false)
            setEditing(null)
            if (searchParams.get('new')) setSearchParams({}, { replace: true })
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${resource.singular.toLowerCase()}?`}
        message={`“${deleting?.[resource.titleKey] || `#${deleting?.id}`}” will be permanently removed, along with any linked records.`}
        loading={deletingBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />

      {resource.key === 'members' && (
        <MemberImport
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onDone={() => {
            setImportOpen(false)
            refresh()
          }}
        />
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

function FilterControl({ field, value, onChange }) {
  const isRef = field.type === 'ref'
  const { options } = useOptions(isRef ? field.resource : null)

  if (field.type === 'select') {
    return (
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)} title={field.label}>
        <option value="">All {field.label.toLowerCase()}</option>
        {(field.options || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  }

  if (isRef) {
    return (
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)} title={field.label}>
        <option value="">All {field.label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }

  if (field.type === 'checkbox') {
    return (
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)} title={field.label}>
        <option value="">{field.label}: any</option>
        <option value="1">Yes</option>
        <option value="0">No</option>
      </select>
    )
  }

  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)} title={field.label}>
      <option value="">All {field.label.toLowerCase()}</option>
      <option value="Active">Active</option>
      <option value="Inactive">Inactive</option>
    </select>
  )
}

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

function CardGrid({ resource, rows, currency, onOpen, onEdit }) {
  if (!rows.length) return <EmptyState icon={RESOURCE_ICONS[resource.key]} title="Nothing to show" message="Records will appear here." />

  if (resource.key === 'notes') {
    return (
      <div className="grid grid--cards">
        {rows.map((note) => (
          <article className={`note-card note-card--${note.color || 'Amber'}`} key={note.id} onClick={() => onOpen(note)}>
            <div className="note-card__title">
              {Number(note.pinned) ? <Icon name="pin" size={14} /> : null}
              {note.title}
            </div>
            <div className="note-card__body">{note.content}</div>
            <div className="note-card__foot">
              <Badge>{note.category}</Badge>
              <Badge tone={note.visibility === 'Public' ? 'green' : note.visibility === 'Cabinet Only' ? 'purple' : 'gray'}>{note.visibility}</Badge>
              <span className="grow" />
              <span>{note.author_id_label || 'Club'}</span>
              <span>• {relativeTime(note.created_at)}</span>
            </div>
          </article>
        ))}
      </div>
    )
  }

  if (resource.key === 'members') {
    return (
      <div className="grid grid--cards">
        {rows.map((member) => (
          <article className="card" key={member.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(member)}>
            <div className="card__body">
              <div className="flex items-center gap-2">
                <Avatar name={member.full_name} src={member.photo_url} size="lg" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 620, fontSize: 15 }}>{member.full_name}</div>
                  <div className="small muted">{member.reg_number || 'No reg. number'}</div>
                  <div className="flex gap-1 wrap mt-1">
                    <StatusBadge value={member.status} />
                    <Badge>{member.role}</Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid--2 mt-2" style={{ gap: 8, fontSize: 12.5 }}>
                <div>
                  <div className="muted small">Department</div>
                  <div>{member.department || '—'}</div>
                </div>
                <div>
                  <div className="muted small">Year</div>
                  <div>{member.year_of_study || '—'}</div>
                </div>
                <div>
                  <div className="muted small">Attendance</div>
                  <div className="flex items-center gap-1">
                    <ProgressBar value={member.attendance_rate || 0} />
                    <span>{percent(member.attendance_rate)}</span>
                  </div>
                </div>
                <div>
                  <div className="muted small">Certificates</div>
                  <div>{member.certificates ?? 0}</div>
                </div>
              </div>
              {member.skills && (
                <div className="flex gap-1 wrap mt-2">
                  {String(member.skills).split(',').slice(0, 4).map((skill) => (
                    <span className="chip chip--neutral" key={skill} style={{ fontSize: 11 }}>
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    )
  }

  if (resource.key === 'projects') {
    return (
      <div className="grid grid--cards">
        {rows.map((project) => (
          <article className="card" key={project.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(project)}>
            <div className="card__body">
              <div className="flex items-start justify-between gap-2">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 620, fontSize: 15 }}>{project.title}</div>
                  <div className="small muted">{project.category}</div>
                </div>
                <StatusBadge value={project.status} />
              </div>
              <p className="small muted mt-1" style={{ minHeight: 34 }}>{truncate(project.description, 110)}</p>
              <div className="mt-2">
                <div className="flex justify-between small muted mb-2">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <ProgressBar value={project.progress} />
              </div>
              <div className="flex items-center justify-between mt-3 small">
                <span className="muted">{project.lead_id_label || 'No lead'}</span>
                <div className="flex gap-1">
                  <Badge tone="gray">{project.team_size ?? 0} team</Badge>
                  <Badge tone="amber">{project.open_tasks ?? 0} open</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 small muted">
                <span>{dueLabel(project.deadline)}</span>
                <span>{project.budget ? formatCurrency(project.budget, currency) : 'No budget'}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    )
  }

  if (resource.key === 'courses') {
    return (
      <div className="grid grid--cards">
        {rows.map((course) => (
          <article className="card" key={course.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(course)}>
            <div className="card__body">
              <div className="flex items-start justify-between gap-2">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 620, fontSize: 15 }}>{course.title}</div>
                  <div className="small muted">
                    {course.code ? `${course.code} • ` : ''}
                    {course.instructor || 'No instructor'}
                  </div>
                </div>
                <StatusBadge value={course.status} />
              </div>
              <div className="flex gap-1 wrap mt-2">
                <Badge tone="brand">{course.category}</Badge>
                <Badge>{course.level}</Badge>
                <Badge>{course.mode}</Badge>
              </div>
              <div className="mt-2 small muted">{course.schedule || 'Schedule not set'}</div>
              <div className="flex items-center justify-between mt-3 small">
                <span>
                  <b>{course.enrolled_count ?? 0}</b> enrolled
                  {course.capacity ? ` / ${course.capacity} places` : ''}
                </span>
                <span>{course.completed_count ?? 0} completed</span>
              </div>
              <div className="mt-2">
                <ProgressBar
                  value={course.capacity ? Math.min(100, Math.round(((course.enrolled_count || 0) / course.capacity) * 100)) : 0}
                  tone="blue"
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    )
  }

  if (resource.key === 'certificates') {
    return (
      <div className="grid grid--cards">
        {rows.map((certificate) => (
          <article className="card" key={certificate.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(certificate)}>
            <div className="card__body">
              <div className="flex items-start justify-between gap-2">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 620, fontSize: 14.5 }}>{certificate.title}</div>
                  <div className="small muted">{certificate.certificate_no}</div>
                </div>
                <StatusBadge value={certificate.status} />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Avatar name={certificate.recipient_id_label || 'Recipient'} size="sm" />
                <div>
                  <div style={{ fontWeight: 570 }}>{certificate.recipient_id_label}</div>
                  <div className="small muted">{certificate.type}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 small muted">
                <span>Issued {formatDate(certificate.issue_date)}</span>
                {certificate.grade && <Badge tone="green">{certificate.grade}</Badge>}
              </div>
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid--cards">
      {rows.map((row) => (
        <article className="card" key={row.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(row)}>
          <div className="card__body">
            <div className="flex items-start justify-between gap-2">
              <div style={{ fontWeight: 620 }}>{row[resource.titleKey] || `#${row.id}`}</div>
              {row.status && <StatusBadge value={row.status} />}
            </div>
            {resource.subtitleKey && <div className="small muted">{row[resource.subtitleKey]}</div>}
            {onEdit && (
              <div className="mt-2">
                <Button size="sm" variant="ghost" icon="edit" onClick={(e) => { e.stopPropagation(); onEdit(row) }}>
                  Edit
                </Button>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Kanban board                                                        */
/* ------------------------------------------------------------------ */

function BoardView({ resource, rows, onOpen, onMove }) {
  const statusField = resource.fields.find((f) => f.key === 'status')
  const statuses = statusField?.options || []
  const [dragId, setDragId] = useState(null)

  if (!statuses.length) return <CardGrid resource={resource} rows={rows} onOpen={onOpen} />

  const groups = statuses.map((status) => ({ status, items: rows.filter((row) => row.status === status) }))
  const extra = rows.filter((row) => !statuses.includes(row.status))
  if (extra.length) groups[0].items.push(...extra)

  return (
    <div className="card__body">
      <div className="kanban">
        {groups.map((group) => (
          <div
            className="kanban__col"
            key={group.status}
            onDragOver={(e) => onMove && e.preventDefault()}
            onDrop={() => {
              if (!onMove || dragId === null) return
              const row = rows.find((r) => r.id === dragId)
              setDragId(null)
              if (row && row.status !== group.status) onMove(row, group.status)
            }}
          >
            <div className="kanban__col-head">
              <span className="flex items-center gap-1">
                <StatusBadge value={group.status} />
              </span>
              <span className="muted">{group.items.length}</span>
            </div>
            {group.items.map((row) => (
              <div
                className="kanban__card"
                key={row.id}
                draggable={Boolean(onMove)}
                onDragStart={() => setDragId(row.id)}
                onClick={() => onOpen(row)}
              >
                <h4>{row[resource.titleKey] || row[`${resource.titleKey}_label`] || `#${row.id}`}</h4>
                <div className="flex gap-1 wrap">
                  {row.priority && <Badge tone={row.priority}>{row.priority}</Badge>}
                  {row.project_id_label && <Badge tone="brand">{truncate(row.project_id_label, 22)}</Badge>}
                  {row.category && <Badge>{row.category}</Badge>}
                </div>
                <div className="kanban__card-foot">
                  <span>{row.assignee_id_label || row.author_id_label || row.member_id_label || row.created_at?.slice(0, 10) || ''}</span>
                  {row.due_date ? <span>{dueLabel(row.due_date)}</span> : row.progress !== undefined ? <span>{row.progress}%</span> : null}
                </div>
                {row.progress !== undefined && row.progress !== null && (
                  <div className="mt-2">
                    <ProgressBar value={row.progress} />
                  </div>
                )}
              </div>
            ))}
            {!group.items.length && <p className="small muted center" style={{ padding: '12px 0' }}>Nothing here</p>}
          </div>
        ))}
      </div>
      {onMove && <p className="small muted mt-2">Tip: drag a card into another column to change its status.</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */

function CalendarView({ resource, onOpen, currency }) {
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const monthStart = new Date(cursor.year, cursor.month, 1)
  const monthEnd = new Date(cursor.year, cursor.month + 1, 0)

  const { data, loading } = useAsync(
    () =>
      api.list(resource.key, {
        date__gte: monthStart.toISOString().slice(0, 10),
        date__lte: monthEnd.toISOString().slice(0, 10),
        all: 1,
        sort: 'date',
        pageSize: 500
      }),
    [resource.key, cursor.year, cursor.month]
  )

  const events = data?.data || []
  const byDay = useMemo(() => {
    const map = new Map()
    for (const event of events) {
      const key = String(event.date).slice(0, 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(event)
    }
    return map
  }, [events])

  const firstDow = monthStart.getDay()
  const daysInMonth = monthEnd.getDate()
  const cells = []
  for (let i = 0; i < firstDow; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day)

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="card__body">
      <div className="flex items-center justify-between mb-2">
        <h3>{monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h3>
        <div className="flex gap-1">
          <Button
            size="sm"
            icon="chevronLeft"
            onClick={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))}
          />
          <Button size="sm" onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}>
            Today
          </Button>
          <Button
            size="sm"
            icon="chevronRight"
            onClick={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))}
          />
        </div>
      </div>

      <div className="calendar">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dow) => (
          <div className="calendar__dow" key={dow}>
            {dow}
          </div>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <div className="calendar__cell calendar__cell--muted" key={`empty-${index}`} />
          const dateKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayEvents = byDay.get(dateKey) || []
          return (
            <div className={`calendar__cell ${dateKey === today ? 'calendar__cell--today' : ''}`} key={dateKey}>
              <div className="calendar__date">{day}</div>
              {dayEvents.slice(0, 3).map((event) => (
                <div
                  className={`calendar__event ${resource.key === 'activities' ? 'calendar__event--activity' : 'calendar__event--meeting'}`}
                  key={event.id}
                  title={`${event.title}${event.venue ? ` • ${event.venue}` : ''}`}
                  onClick={() => onOpen(event)}
                >
                  {event.title}
                </div>
              ))}
              {dayEvents.length > 3 && <div className="calendar__event">+{dayEvents.length - 3} more</div>}
            </div>
          )
        })}
      </div>

      {loading && <p className="small muted mt-2">Loading events…</p>}
      {!loading && events.length === 0 && <p className="small muted mt-2">No {resource.label.toLowerCase()} scheduled this month.</p>}

      {events.length > 0 && (
        <div className="mt-3">
          <h3 className="mb-2">This month’s schedule</h3>
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Time</th>
                <th>Venue</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} onClick={() => onOpen(event)}>
                  <td className="nowrap">{formatDate(event.date)}</td>
                  <td style={{ fontWeight: 550 }}>{event.title}</td>
                  <td className="nowrap">{timeRange(event.start_time, event.end_time) || '—'}</td>
                  <td>{event.venue || '—'}</td>
                  <td>
                    <StatusBadge value={event.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Member import                                                       */
/* ------------------------------------------------------------------ */

const SAMPLE = `full_name,reg_number,email,phone,department,year_of_study,status
Amina Yusuf,IT/2024/001,amina@example.com,+2348012345678,Information Technology,Year 3,Active
Ibrahim Bello,CS/2023/045,ibrahim@example.com,+2348098765432,Computer Science,Year 4,Active`

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
  return lines.slice(1).map((line) => {
    const values = line.match(/(".*?"|[^,]+)(?=,|$)/g) || []
    const row = {}
    headers.forEach((header, index) => {
      let value = (values[index] || '').trim()
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
      row[header] = value
    })
    return row
  })
}

function MemberImport({ open, onClose, onDone }) {
  const [text, setText] = useState(SAMPLE)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const preview = parseCsv(text)

  const run = async () => {
    setBusy(true)
    try {
      const result = await api.importMembers(preview)
      toast.success(`${result.created} member(s) imported`, result.errors?.length ? result.errors.slice(0, 3).join('; ') : undefined)
      onDone()
    } catch (err) {
      toast.error('Import failed', err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import members"
      subtitle="Paste CSV data — the first row must contain column headers."
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon="upload" loading={busy} onClick={run} disabled={!preview.length}>
            Import {preview.length} member{preview.length === 1 ? '' : 's'}
          </Button>
        </>
      }
    >
      <div className="field">
        <label className="field__label">CSV data</label>
        <textarea className="textarea" rows={10} value={text} onChange={(e) => setText(e.target.value)} style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }} />
        <span className="field__help">
          Recognised columns: full_name, reg_number, email, phone, gender, department, program, year_of_study, role, status, join_date, skills.
        </span>
      </div>
      {preview.length > 0 && (
        <div>
          <h3 className="mb-2">Preview ({preview.length} rows)</h3>
          <div className="table-wrap" style={{ maxHeight: 240, overflowY: 'auto' }}>
            <table className="data">
              <thead>
                <tr>
                  {Object.keys(preview[0]).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 8).map((row, index) => (
                  <tr key={index} style={{ cursor: 'default' }}>
                    {Object.keys(preview[0]).map((key) => (
                      <td key={key}>{row[key] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  )
}
