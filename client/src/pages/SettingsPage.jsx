import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../icons'
import { api, downloadAuthed, setSessionNotice, triggerDownload } from '../api'
import { useAuth } from '../auth'
import { useAsync } from '../hooks'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Loading, useToast } from '../components/ui'
import { relativeTime } from '../format'

const PROFILE_FIELDS = [
  { key: 'club_name', label: 'Club name', type: 'text' },
  { key: 'club_tagline', label: 'Tagline / motto', type: 'text' },
  { key: 'institution', label: 'School name', type: 'text' },
  { key: 'patron_name', label: 'Club patron (teacher)', type: 'text', placeholder: 'e.g. Mr. Ssekandi John' },
  { key: 'academic_year', label: 'Academic year', type: 'text', placeholder: 'e.g. 2026' },
  { key: 'current_term', label: 'Current term', type: 'select', options: ['Term 1', 'Term 2', 'Term 3'] },
  { key: 'dues_per_term', label: 'Club dues per term', type: 'number', help: 'Amount used when generating term dues records' },
  { key: 'currency', label: 'Currency code', type: 'text', placeholder: 'e.g. UGX, KES, NGN' },
  { key: 'contact_email', label: 'Contact email', type: 'email' },
  { key: 'contact_phone', label: 'Contact phone', type: 'tel' },
  { key: 'meeting_frequency', label: 'Meeting day and time', type: 'text', placeholder: 'e.g. Every Wednesday, 4:00 PM' },
  { key: 'attendance_target', label: 'Attendance target (%)', type: 'number' },
  { key: 'logo_url', label: 'Logo URL', type: 'url' }
]

export default function SettingsPage() {
  const { user, settings, refreshSettings, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState(settings || {})
  const [saving, setSaving] = useState(false)
  const [password, setPassword] = useState({ current_password: '', new_password: '' })
  const [changing, setChanging] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)
  const [demoBusy, setDemoBusy] = useState(false)

  const isAdmin = user?.role === 'admin'
  const canEdit = user?.role === 'admin' || user?.role === 'cabinet'

  const { data: log, loading: logLoading, reload: reloadLog } = useAsync(() => api.activity(60), [])
  const { data: users } = useAsync(() => (isAdmin ? api.list('users', { pageSize: 100, all: 1 }) : Promise.resolve({ data: [] })), [isAdmin])

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  const saveProfile = async () => {
    setSaving(true)
    try {
      await api.saveSettings(form)
      await refreshSettings()
      toast.success('Club profile saved')
    } catch (err) {
      toast.error('Could not save settings', err.message)
    } finally {
      setSaving(false)
    }
  }

  /**
   * Reloads the demo school (administrators only). This replaces every record
   * in the database, so the old session is discarded and the user is returned
   * to the sign-in screen with an explanation.
   */
  const loadDemoData = async () => {
    setDemoBusy(true)
    try {
      const result = await api.loadDemoData()
      const counts = result?.data?.counts || {}
      const summary = counts.members
        ? `${counts.members} students and teachers, ${counts.courses} courses, ${counts.dues} dues records`
        : 'a fresh set of school records'
      setDemoOpen(false)
      await logout(`The demo school data was reloaded with ${summary}. Sign in again to explore it.`)
      setSessionNotice(`The demo school data was reloaded with ${summary}. Sign in again to explore it.`)
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error('Could not load the demo data', err.message)
      setDemoBusy(false)
    }
  }

  const changePassword = async () => {
    if (!password.new_password || password.new_password.length < 6) {
      toast.error('Password too short', 'Use at least 6 characters')
      return
    }
    setChanging(true)
    try {
      await api.changePassword(password)
      setPassword({ current_password: '', new_password: '' })
      toast.success('Password updated')
    } catch (err) {
      toast.error('Could not change password', err.message)
    } finally {
      setChanging(false)
    }
  }

  const backup = async () => {
    try {
      await downloadAuthed('/api/backup', `ict-club-backup-${new Date().toISOString().slice(0, 10)}.json`)
      toast.success('Backup downloaded', 'Keep the JSON file in a safe place.')
    } catch (err) {
      toast.error('Backup failed', err.message)
    }
  }

  const exportEverything = async () => {
    const resources = ['members', 'cabinet', 'meetings', 'activities', 'courses', 'enrollments', 'attendance', 'reports', 'certificates', 'notes', 'projects', 'project_tasks']
    const rows = [['resource', 'id', 'summary']]
    toast.info('Preparing export…', 'Collecting all club records')
    try {
      for (const resource of resources) {
        const { data } = await api.list(resource, { all: 1, pageSize: 500 })
        for (const row of data) {
          rows.push([resource, row.id, Object.values(row).slice(1, 4).join(' | ')])
        }
      }
      const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
      triggerDownload(new Blob([csv], { type: 'text/csv' }), 'ict-club-full-export.csv')
      toast.success('Export complete')
    } catch (err) {
      toast.error('Export failed', err.message)
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <div className="breadcrumb">Administration</div>
          <h1>Settings</h1>
          <p>Club profile, your account, data tools and a full audit trail of what has changed.</p>
        </div>
        <div className="page-head__actions">
          <Button icon="download" onClick={exportEverything}>
            Export everything
          </Button>
          {isAdmin && (
            <Button variant="primary" icon="shield" onClick={backup}>
              Download backup
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid--2 mb-2">
        <Card title="Club profile" subtitle="Shown across the system and on certificates and reports" icon="star">
          <div className="form-grid">
            {PROFILE_FIELDS.map((field) => (
              <div className="field" key={field.key}>
                <label className="field__label" htmlFor={`s-${field.key}`}>
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <select
                    id={`s-${field.key}`}
                    className="select"
                    value={form[field.key] ?? ''}
                    disabled={!canEdit}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  >
                    {(field.options || []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`s-${field.key}`}
                    className="input"
                    type={field.type}
                    placeholder={field.placeholder}
                    value={form[field.key] ?? ''}
                    disabled={!canEdit}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                )}
                {field.help && <span className="field__help">{field.help}</span>}
              </div>
            ))}
          </div>
          {canEdit ? (
            <Button variant="primary" icon="check" loading={saving} onClick={saveProfile}>
              Save club profile
            </Button>
          ) : (
            <p className="small muted">Only administrators and cabinet members can change these settings.</p>
          )}
        </Card>

        <div className="grid" style={{ gap: 16, alignContent: 'start' }}>
          <Card title="My account" subtitle="Signed in as" icon="shield">
            <div className="flex items-center gap-2 mb-2">
              <div>
                <div style={{ fontWeight: 620 }}>{user?.name}</div>
                <div className="small muted">{user?.email}</div>
              </div>
              <div className="grow" />
              <Badge tone={isAdmin ? 'purple' : user?.role === 'cabinet' ? 'brand' : 'gray'}>
                {isAdmin ? 'Administrator' : user?.role === 'cabinet' ? 'Cabinet' : 'Member'}
              </Badge>
            </div>
            {user?.member_id ? (
              <Button size="sm" icon="users" onClick={() => navigate(`/r/members/${user.member_id}`)}>
                View my member profile
              </Button>
            ) : (
              <p className="small muted">This account is not linked to a member profile. An administrator can link it under User Accounts.</p>
            )}

            <div className="form-section">Change password</div>
            <div className="form-grid">
              <div className="field">
                <label className="field__label">Current password</label>
                <input
                  className="input"
                  type="password"
                  value={password.current_password}
                  onChange={(e) => setPassword((p) => ({ ...p, current_password: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field__label">New password</label>
                <input
                  className="input"
                  type="password"
                  value={password.new_password}
                  onChange={(e) => setPassword((p) => ({ ...p, new_password: e.target.value }))}
                />
              </div>
            </div>
            <Button icon="check" loading={changing} onClick={changePassword}>
              Update password
            </Button>
          </Card>

          {isAdmin && (
            <Card title="Demo school data" subtitle="Load a complete set of sample records" icon="sparkles">
              <p className="small muted" style={{ marginTop: 0 }}>
                Fills the system with a realistic secondary school: students in S1–S6 with guardians, teacher patrons,
                the executive committee, class representatives, termly dues with payments and receipts, courses,
                attendance registers, certificates, reports, notes and club projects.
              </p>
              <p className="small" style={{ color: 'var(--red)' }}>
                This replaces <b>every record</b> currently in the database, including user accounts created since —
                the three demo accounts are recreated and you will be signed out.
              </p>
              <Button variant="primary" icon="sparkles" onClick={() => setDemoOpen(true)}>
                Load demo school data
              </Button>
            </Card>
          )}

          <Card title="Data & storage" subtitle="Everything is stored locally in an SQLite database" icon="layers">
            <div className="small" style={{ lineHeight: 1.7 }}>
              <div>
                <b>Database file:</b> <code>server/data/ictclub.db</code>
              </div>
              <div>
                <b>Backups:</b> keep the JSON backup with the club file every term
              </div>
              <div>
                <b>Reload demo data:</b> the button above, or <code>npm run db:reset</code>
              </div>
              <div>
                <b>Seed if empty:</b> <code>npm run db:seed</code>
              </div>
            </div>
            <div className="flex gap-1 wrap mt-2">
              <Button size="sm" icon="refresh" onClick={() => window.location.reload()}>
                Reload app
              </Button>
              {isAdmin && (
                <Button size="sm" icon="shield" onClick={backup}>
                  Download JSON backup
                </Button>
              )}
            </div>
            <p className="small muted mt-2">
              The backup file contains members, cabinet, meetings, activities, courses, enrollments, attendance, reports, certificates, notes,
              projects and settings — everything you need to restore the club.
            </p>
          </Card>
        </div>
      </div>

      {isAdmin && (
        <Card
          title="User accounts"
          subtitle={`${users?.total || 0} accounts`}
          icon="shield"
          flush
          className="mb-2"
          actions={
            <Button size="sm" variant="primary" icon="plus" onClick={() => navigate('/r/users?new=1')}>
              New account
            </Button>
          }
        >
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Access level</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th className="right">Manage</th>
                </tr>
              </thead>
              <tbody>
                {(users?.data || []).map((account) => (
                  <tr key={account.id}>
                    <td style={{ fontWeight: 550 }}>{account.name}</td>
                    <td>{account.email}</td>
                    <td>
                      <Badge tone={account.role === 'admin' ? 'purple' : account.role === 'cabinet' ? 'brand' : 'gray'}>{account.role}</Badge>
                    </td>
                    <td>
                      <Badge tone={account.status === 'active' ? 'green' : 'red'}>{account.status}</Badge>
                    </td>
                    <td>{account.last_login ? relativeTime(account.last_login) : 'Never'}</td>
                    <td className="right">
                      <Button size="sm" variant="ghost" icon="edit" onClick={() => navigate(`/r/users/${account.id}`)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card
        title="Activity log"
        subtitle="Who changed what and when"
        icon="clock"
        flush
        actions={<Button size="sm" icon="refresh" onClick={reloadLog} />}
      >
        {logLoading && !log ? (
          <Loading />
        ) : !log?.data?.length ? (
          <EmptyState icon="clock" title="No activity yet" message="Actions performed in the system are recorded here." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {log.data.map((entry) => (
                  <tr key={entry.id} style={{ cursor: 'default' }}>
                    <td className="nowrap">{relativeTime(entry.created_at)}</td>
                    <td>{entry.user_name}</td>
                    <td>
                      <Badge tone={entry.action === 'delete' ? 'red' : entry.action === 'create' ? 'green' : 'blue'}>{entry.action}</Badge>
                    </td>
                    <td>{entry.resource}</td>
                    <td className="muted">{entry.detail || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="small muted mt-3 center">
        <Icon name="check" size={12} /> ICT Club Management System — students, executive committee, club dues, meetings,
        activities, courses, attendance, reports, certificates, notes and projects.
      </p>

      <ConfirmDialog
        open={demoOpen}
        title="Load the demo school data?"
        message="Every record currently in the database will be replaced with the sample secondary school data, and you will be signed out. Continue?"
        confirmLabel="Load demo data"
        loading={demoBusy}
        onCancel={() => setDemoOpen(false)}
        onConfirm={loadDemoData}
      />
    </>
  )
}
