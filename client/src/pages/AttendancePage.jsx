import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../icons'
import { api } from '../api'
import { useAuth } from '../auth'
import { useAsync } from '../hooks'
import { OPTION_SETS } from '../../../shared/schema'
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Loading,
  ProgressBar,
  Segmented,
  Stat,
  useToast
} from '../components/ui'
import DataTable from '../components/DataTable'
import { DonutChart } from '../components/charts'
import { formatCurrency, formatDate, formatTime, percent } from '../format'

const SESSION_TYPES = [
  { value: 'meeting', label: 'Meeting', icon: 'calendar', resource: 'meetings' },
  { value: 'activity', label: 'Activity', icon: 'sparkles', resource: 'activities' },
  { value: 'course', label: 'Course', icon: 'book', resource: 'courses' },
  { value: 'project', label: 'Project', icon: 'rocket', resource: 'projects' }
]

const STATUSES = OPTION_SETS.attendanceStatus
const STATUS_CLASS = {
  Present: 'is-active',
  Absent: 'is-active is-active--absent',
  Late: 'is-active is-active--late',
  Excused: 'is-active is-active--excused',
  'Left Early': 'is-active is-active--left'
}

export default function AttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user, settings } = useAuth()

  const [tab, setTab] = useState('register')
  const [refType, setRefType] = useState(searchParams.get('ref_type') || 'meeting')
  const [refId, setRefId] = useState(searchParams.get('ref_id') || '')
  const [sessions, setSessions] = useState([])
  const [register, setRegister] = useState(null)
  const [marks, setMarks] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')

  const sessionMeta = SESSION_TYPES.find((s) => s.value === refType) || SESSION_TYPES[0]
  const canWrite = user?.role === 'admin' || user?.role === 'cabinet'

  /* Load the session list for the chosen type */
  useEffect(() => {
    let alive = true
    api
      .list(sessionMeta.resource, { all: 1, sort: refType === 'course' ? '-start_date' : '-date', pageSize: 300 })
      .then((res) => {
        if (!alive) return
        setSessions(res.data || [])
      })
      .catch(() => alive && setSessions([]))
    return () => {
      alive = false
    }
  }, [sessionMeta.resource, refType])

  const loadRegister = useCallback(
    async (type, id) => {
      if (!id) {
        setRegister(null)
        return
      }
      setLoading(true)
      try {
        const data = await api.attendanceRegister(type, id, classFilter ? { class_level: classFilter } : undefined)
        setRegister(data)
        const next = {}
        for (const row of data.roster) next[row.member_id] = { status: row.status || '', check_in_time: row.check_in_time || '', remarks: row.remarks || '' }
        setMarks(next)
      } catch (err) {
        toast.error('Could not load the register', err.message)
        setRegister(null)
      } finally {
        setLoading(false)
      }
    },
    [toast, classFilter]
  )

  useEffect(() => {
    if (refId) loadRegister(refType, refId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refType, refId, classFilter])

  const setStatus = (memberId, status) => {
    setMarks((prev) => ({
      ...prev,
      [memberId]: { ...prev[memberId], status: prev[memberId]?.status === status ? '' : status }
    }))
  }

  const bulkSet = (status, scope = 'all') => {
    setMarks((prev) => {
      const next = { ...prev }
      for (const row of register?.roster || []) {
        if (scope === 'unmarked' && next[row.member_id]?.status) continue
        next[row.member_id] = { ...next[row.member_id], status }
      }
      return next
    })
  }

  const summary = useMemo(() => {
    const values = Object.values(marks)
    const counted = { Present: 0, Absent: 0, Late: 0, Excused: 0, 'Left Early': 0, Unmarked: 0 }
    for (const row of register?.roster || []) {
      const status = marks[row.member_id]?.status
      if (!status) counted.Unmarked += 1
      else counted[status] = (counted[status] || 0) + 1
    }
    return { ...counted, total: values.length }
  }, [marks, register])

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        ref_type: refType,
        ref_id: Number(refId),
        session_title: register?.session?.title,
        session_date: register?.session?.date,
        records: Object.entries(marks).map(([memberId, value]) => ({
          member_id: Number(memberId),
          status: value.status,
          check_in_time: value.check_in_time,
          remarks: value.remarks
        }))
      }
      const result = await api.saveAttendanceRegister(payload)
      toast.success('Attendance saved', `${result.created} new • ${result.updated} updated${result.cleared ? ` • ${result.cleared} cleared` : ''}`)
      loadRegister(refType, refId)
    } catch (err) {
      toast.error('Could not save attendance', err.message)
    } finally {
      setSaving(false)
    }
  }

  const markAll = async () => {
    try {
      const result = await api.markAllPresent({ ref_type: refType, ref_id: Number(refId) })
      toast.success(`${result.created} members marked present`)
      loadRegister(refType, refId)
    } catch (err) {
      toast.error('Could not mark members', err.message)
    }
  }

  const duesOwing = Object.fromEntries((register?.dues || []).map((row) => [row.member_id, row]))

  const roster = (register?.roster || []).filter((row) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      row.full_name?.toLowerCase().includes(term) ||
      row.admission_number?.toLowerCase().includes(term) ||
      row.class_level?.toLowerCase().includes(term)
    )
  })

  const onPickSession = (value) => {
    setRefId(value)
    setSearchParams({ ref_type: refType, ref_id: value })
  }

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <div className="breadcrumb">Learning &amp; Operations</div>
          <h1>Attendance</h1>
          <p>Mark the register for any meeting, activity, course session or project session — then review the statistics.</p>
        </div>
        <div className="page-head__actions">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'register', label: 'Register', icon: 'check' },
              { value: 'insights', label: 'Insights', icon: 'trendingUp' },
              { value: 'records', label: 'All records', icon: 'list' }
            ]}
          />
          <Button icon="download" onClick={() => api.download('attendance', {}, 'ict-club-attendance.csv')}>
            <span className="hide-sm">Export</span>
          </Button>
        </div>
      </div>

      {tab === 'register' && (
        <>
          <Card className="mb-2">
            <div className="flex gap-2 wrap items-center">
              <div className="flex gap-1 wrap">
                {SESSION_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    className={`btn ${refType === type.value ? 'btn--primary' : ''}`}
                    onClick={() => {
                      setRefType(type.value)
                      setRefId('')
                      setRegister(null)
                      setSearchParams({ ref_type: type.value })
                    }}
                  >
                    <Icon name={type.icon} size={15} /> {type.label}s
                  </button>
                ))}
              </div>
              <div className="grow" style={{ minWidth: 240 }}>
                <select className="select" value={refId} onChange={(e) => onPickSession(e.target.value)}>
                  <option value="">Select a {sessionMeta.label.toLowerCase()}…</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.title}
                      {session.date ? ` — ${formatDate(session.date)}` : ''}
                      {session.start_date ? ` — ${formatDate(session.start_date)}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {!refId && <EmptyState icon="check" title="Pick a session to open its register" message={`Choose a ${sessionMeta.label.toLowerCase()} above, then mark members present, late or absent.`} />}
          {refId && loading && <Loading label="Loading the register…" />}

          {refId && !loading && register && (
            <>
              <div className="grid grid--stats mb-2">
                <Stat icon="users" label="Roster" value={register.roster.length} hint="Active members" />
                <Stat icon="check" label="Present" value={summary.Present + summary.Late} hint={`${summary.Late} arrived late`} tone="green" />
                <Stat icon="x" label="Absent" value={summary.Absent} tone="red" />
                <Stat icon="clock" label="Excused" value={summary.Excused} tone="blue" />
                <Stat
                  icon="target"
                  label="Turnout"
                  value={`${register.roster.length ? Math.round(((summary.Present + summary.Late) / register.roster.length) * 100) : 0}%`}
                  hint={`${summary.Unmarked} still unmarked`}
                  tone="purple"
                />
              </div>

              <Card
                title={register.session.title}
                subtitle={`${formatDate(register.session.date)}${register.session.venue ? ` • ${register.session.venue}` : ''}${register.session.start_time ? ` • ${formatTime(register.session.start_time)}` : ''}`}
                icon="clipboard"
                actions={
                  canWrite && (
                    <>
                      <Button size="sm" icon="check" onClick={markAll}>
                        Mark all present
                      </Button>
                      <Button size="sm" onClick={() => bulkSet('Absent')}>
                        Clear all
                      </Button>
                      <Button size="sm" variant="primary" icon="check" loading={saving} onClick={save}>
                        Save register
                      </Button>
                    </>
                  )
                }
                flush
              >
                <div className="filters-bar" style={{ margin: 12, boxShadow: 'none' }}>
                  <div style={{ position: 'relative', flex: '1 1 200px' }}>
                    <Icon name="search" size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                    <input className="input" style={{ paddingLeft: 36, width: '100%' }} placeholder="Find a student…" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <select className="select" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} title="Only show one class">
                    <option value="">All classes</option>
                    {(register.classes || OPTION_SETS.classes).map((option) => (
                      <option key={option} value={option}>
                        {option} only
                      </option>
                    ))}
                  </select>
                  <span className="filters-bar__label">Quick set:</span>
                  {STATUSES.map((status) => (
                    <button key={status} type="button" className="reg-btn" onClick={() => bulkSet(status, 'unmarked')}>
                      {status}
                    </button>
                  ))}
                </div>

                <div className="table-wrap">
                  <table className="data register-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th className="hide-sm">Admission no.</th>
                        <th className="hide-sm">Class</th>
                        <th style={{ minWidth: 330 }}>Status</th>
                        <th>Check-in</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((row) => {
                        const mark = marks[row.member_id] || {}
                        return (
                          <tr key={row.member_id} style={{ cursor: 'default', background: mark.status ? undefined : 'var(--surface-2)' }}>
                            <td>
                              <div className="person">
                                <Avatar name={row.full_name} src={row.photo_url} size="sm" />
                                <div style={{ minWidth: 0 }}>
                                  <div className="person__name">{row.full_name}</div>
                                  {mark.remarks && <div className="person__meta">{mark.remarks}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="hide-sm">
                              <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{row.admission_number || '—'}</span>
                            </td>
                            <td className="hide-sm">
                              {row.class_level || '—'}
                              {row.stream ? ` ${row.stream}` : ''}
                              {duesOwing[row.member_id] && (
                                <Badge tone="red" className="mt-1">
                                  owes {duesOwing[row.member_id].balance.toLocaleString()}
                                </Badge>
                              )}
                            </td>
                            <td>
                              <div className="flex gap-1 wrap">
                                {STATUSES.map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    className={`reg-btn ${mark.status === status ? STATUS_CLASS[status] : ''}`}
                                    disabled={!canWrite}
                                    onClick={() => setStatus(row.member_id, status)}
                                  >
                                    {status}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td style={{ width: 120 }}>
                              <input
                                type="time"
                                className="input"
                                style={{ padding: '4px 7px', fontSize: 12.5 }}
                                value={mark.check_in_time || ''}
                                disabled={!canWrite}
                                onChange={(e) => setMarks((prev) => ({ ...prev, [row.member_id]: { ...prev[row.member_id], check_in_time: e.target.value } }))}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {!roster.length && <p className="small muted center" style={{ padding: 24 }}>No members match your search.</p>}
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {tab === 'insights' && <AttendanceInsights />}

      {tab === 'records' && <AttendanceRecords />}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Insights                                                            */
/* ------------------------------------------------------------------ */

function AttendanceInsights() {
  const navigate = useNavigate()
  const { data, loading } = useAsync(() => api.dashboard(), [])
  const { data: report, loading: reportLoading } = useAsync(() => api.reportData({}), [])

  if (loading || reportLoading) return <Loading label="Building attendance statistics…" />
  if (!data || !report) return <EmptyState icon="alert" title="No statistics available" />

  const byMember = report.attendance.byMember || []
  const bySession = report.attendance.bySession || []

  return (
    <>
      <div className="grid grid--3 mb-2">
        <Card title="Attendance by status" icon="target">
          <DonutChart data={report.attendance.byStatus} centerLabel="Records" />
        </Card>
        <Card title="Where attendance is recorded" icon="layers">
          <DonutChart
            data={(report.attendance.bySession || []).reduce((acc, row) => {
              const key = row.ref_type === 'meeting' ? 'Meetings' : row.ref_type === 'activity' ? 'Activities' : row.ref_type === 'course' ? 'Course sessions' : 'Projects'
              const existing = acc.find((a) => a.name === key)
              if (existing) existing.value += row.total
              else acc.push({ name: key, value: row.total })
              return acc
            }, [])}
            centerLabel="Sessions"
          />
        </Card>
        <Card title="Overall turnout" icon="check">
          <div className="center" style={{ padding: '10px 0' }}>
            <div style={{ fontSize: 44, fontWeight: 750, letterSpacing: '-0.02em' }}>{data.attendance.rate ?? 0}%</div>
            <p className="muted small">Weighted average across all {data.cards.attendance_records} records</p>
            <div className="mt-2">
              <Badge tone={data.attendance.rate >= 75 ? 'green' : data.attendance.rate >= 50 ? 'amber' : 'red'}>
                Target: {data.settings?.attendance_target || 75}%
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid--2 mb-2">
        <Card title="Member attendance leaderboard" subtitle="Best and worst turnout by member" icon="users" flush>
          <DataTable
            resource={{
              key: 'attendance_report',
              label: 'Members',
              titleKey: 'full_name',
              listColumns: ['full_name', 'class_level', 'sessions', 'attended', 'rate'],
              fields: [
                { key: 'full_name', label: 'Student' },
                { key: 'class_level', label: 'Class' },
                { key: 'sessions', label: 'Sessions', type: 'number' },
                { key: 'attended', label: 'Attended', type: 'number' },
                { key: 'rate', label: 'Rate', type: 'percentage' }
              ]
            }}
            rows={byMember.slice(0, 15)}
            onRowClick={(row) => navigate(`/r/members/${row.id}`)}
            emptyTitle="No attendance recorded yet"
          />
        </Card>

        <Card title="Session turnout" subtitle="Most recent sessions" icon="calendar" flush>
          <DataTable
            resource={{
              key: 'attendance_sessions',
              label: 'Sessions',
              titleKey: 'session_title',
              listColumns: ['session_title', 'session_date', 'total', 'present', 'rate'],
              fields: [
                { key: 'session_title', label: 'Session' },
                { key: 'session_date', label: 'Date', type: 'date' },
                { key: 'total', label: 'Marked', type: 'number' },
                { key: 'present', label: 'Present', type: 'number' },
                { key: 'rate', label: 'Turnout', type: 'percentage' }
              ]
            }}
            rows={bySession.slice(0, 15)}
            emptyTitle="No sessions marked yet"
            emptyMessage="Open a register and save it to see turnout here."
          />
        </Card>
      </div>

      <Card title="Members needing follow-up" subtitle="Below the club attendance target" icon="alert" flush>
        <DataTable
          resource={{
            key: 'attendance_followup',
            label: 'Members',
            titleKey: 'full_name',
            listColumns: ['full_name', 'admission_number', 'class_level', 'sessions', 'attended', 'rate'],
            fields: [
              { key: 'full_name', label: 'Student' },
              { key: 'admission_number', label: 'Admission no.' },
              { key: 'class_level', label: 'Class' },
              { key: 'sessions', label: 'Sessions', type: 'number' },
              { key: 'attended', label: 'Attended', type: 'number' },
              { key: 'rate', label: 'Rate', type: 'percentage' }
            ]
          }}
          rows={[...byMember].reverse().slice(0, 12)}
          onRowClick={(row) => navigate(`/r/members/${row.id}`)}
        />
      </Card>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* All records with quick filters                                      */
/* ------------------------------------------------------------------ */

function AttendanceRecords() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [refType, setRefType] = useState('')
  const [page, setPage] = useState(1)

  const { data, loading, reload } = useAsync(
    () => api.list('attendance', { page, pageSize: 25, status: status || undefined, ref_type: refType || undefined, sort: '-session_date' }),
    [status, refType, page]
  )

  const resource = {
    key: 'attendance',
    label: 'Attendance',
    titleKey: 'session_title',
    listColumns: ['session_date', 'session_title', 'member_id', 'class_level', 'status', 'check_in_time'],
    fields: [
      { key: 'session_date', label: 'Date', type: 'date' },
      { key: 'session_title', label: 'Session' },
      { key: 'member_id', label: 'Student' },
      { key: 'class_level', label: 'Class' },
      { key: 'status', label: 'Status' },
      { key: 'check_in_time', label: 'Check-in', type: 'time' },
      { key: 'remarks', label: 'Remarks' }
    ]
  }

  return (
    <Card
      title="Attendance records"
      subtitle={data ? `${data.total} records` : ''}
      icon="list"
      actions={
        <>
          <Button size="sm" icon="refresh" onClick={reload} />
          <Button size="sm" variant="primary" icon="plus" onClick={() => navigate('/attendance')}>
            New register
          </Button>
        </>
      }
      flush
    >
      <div className="filters-bar" style={{ margin: 12, boxShadow: 'none' }}>
        <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="select" value={refType} onChange={(e) => { setRefType(e.target.value); setPage(1) }}>
          <option value="">All session types</option>
          {SESSION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}s
            </option>
          ))}
        </select>
        <div className="grow" />
        <button type="button" className="btn btn--sm" onClick={reload}>
          <Icon name="refresh" size={14} /> Refresh
        </button>
      </div>

      {loading && !data ? (
        <Loading />
      ) : (
        <DataTable
          resource={resource}
          rows={data?.data || []}
          onRowClick={(row) => navigate(`/r/attendance/${row.id}`)}
          emptyTitle="No attendance records yet"
          emptyMessage="Open a register to start recording attendance."
        />
      )}

      {data && data.total > 0 && (
        <div className="card__foot">
          <span className="muted small">
            Page {data.page} of {data.pages}
          </span>
          <div className="flex gap-1">
            <Button size="sm" icon="chevronLeft" disabled={page <= 1} onClick={() => setPage(page - 1)} />
            <Button size="sm" icon="chevronRight" disabled={page >= data.pages} onClick={() => setPage(page + 1)} />
          </div>
        </div>
      )}
    </Card>
  )
}
