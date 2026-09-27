import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../icons'
import { api, downloadText } from '../api'
import { useAuth } from '../auth'
import { useAsync, useOptions } from '../hooks'
import { OPTION_SETS } from '../../../shared/schema'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Loading,
  Modal,
  Stat,
  StatusBadge,
  useToast
} from '../components/ui'
import DataTable from '../components/DataTable'
import { BarChart, DonutChart } from '../components/charts'
import { formatCurrency, formatDate, formatNumber } from '../format'

const REPORT_TYPES = OPTION_SETS.reportTypes

function todayIso(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

export default function ReportsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user, settings } = useAuth()
  const [range, setRange] = useState({ from: todayIso(-180), to: todayIso(0) })
  const [builderOpen, setBuilderOpen] = useState(false)

  const { data, loading, error, reload } = useAsync(
    () => api.reportData({ from: range.from || undefined, to: range.to || undefined }),
    [range.from, range.to]
  )

  const currency = settings?.currency || 'USD'

  if (loading && !data) return <Loading label="Collecting club statistics…" />
  if (error) return <EmptyState icon="alert" title="Could not load report data" message={error} action={<Button icon="refresh" onClick={reload}>Retry</Button>} />

  const { members, attendance, meetings, activities, financial, courses, certificates, projects, cabinet, dues, classBreakdown } = data

  const sessionsByType = [
    { name: 'Meetings', value: meetings.length },
    { name: 'Activities', value: activities.length },
    { name: 'Courses', value: courses.length },
    { name: 'Projects', value: projects.reduce((sum, p) => sum + p.value, 0) }
  ].filter((row) => row.value > 0)

  const courseRows = courses.map((course) => ({
    ...course,
    completion: course.enrolled ? Math.round((course.completed / course.enrolled) * 100) : 0
  }))

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <div className="breadcrumb">Administration</div>
          <h1>Reports Studio</h1>
          <p>
            Live statistics for the club, ready to be turned into an official report for {range.from ? formatDate(range.from) : 'the beginning'} –{' '}
            {range.to ? formatDate(range.to) : 'today'}.
          </p>
        </div>
        <div className="page-head__actions">
          <input
            type="date"
            className="input"
            style={{ width: 150 }}
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            title="From date"
          />
          <input
            type="date"
            className="input"
            style={{ width: 150 }}
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            title="To date"
          />
          <Button icon="refresh" onClick={reload} aria-label="Refresh" />
          <Button icon="print" onClick={() => window.print()}>
            <span className="hide-sm">Print</span>
          </Button>
          <Button variant="primary" icon="file" onClick={() => setBuilderOpen(true)}>
            Generate report
          </Button>
        </div>
      </div>

      <div className="grid grid--stats mb-2">
        <Stat icon="users" label="Members" value={members.total} hint={`${members.active} active students`} />
        <Stat icon="check" label="Sessions recorded" value={attendance.bySession.length} hint={`${attendance.byStatus.reduce((s, r) => s + r.value, 0)} attendance entries`} tone="green" />
        <Stat icon="calendar" label="Meetings in range" value={meetings.length} tone="blue" />
        <Stat icon="sparkles" label="Activities in range" value={activities.length} tone="teal" />
        <Stat icon="book" label="Courses" value={courses.length} hint={`${courseRows.reduce((s, c) => s + c.enrolled, 0)} registrations`} tone="purple" />
        <Stat icon="award" label="Certificates" value={certificates.reduce((s, r) => s + r.value, 0)} tone="amber" />
        <Stat
          icon="wallet"
          label="Dues collected"
          value={formatCurrency(dues.summary.collected, currency)}
          hint={`${formatCurrency(dues.summary.outstanding, currency)} outstanding`}
          tone="green"
        />
      </div>

      <div className="grid grid--2 mb-2">
        <Card title="Class breakdown" subtitle="Membership and gender balance per class" icon="layers" flush>
          <DataTable
            resource={{
              key: 'report_classes',
              label: 'Classes',
              titleKey: 'name',
              listColumns: ['name', 'total', 'active', 'female', 'male'],
              fields: [
                { key: 'name', label: 'Class' },
                { key: 'total', label: 'Members', type: 'number' },
                { key: 'active', label: 'Active', type: 'number' },
                { key: 'female', label: 'Female', type: 'number' },
                { key: 'male', label: 'Male', type: 'number' }
              ]
            }}
            rows={classBreakdown}
            emptyTitle="No members recorded"
          />
        </Card>
        <Card title="Dues summary" subtitle="Club dues for the selected period" icon="wallet" flush>
          <div className="card__body">
            <div className="grid grid--3" style={{ gap: 12 }}>
              <div>
                <div className="small muted">Expected</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{formatCurrency(dues.summary.expected, currency)}</div>
              </div>
              <div>
                <div className="small muted">Collected</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>{formatCurrency(dues.summary.collected, currency)}</div>
              </div>
              <div>
                <div className="small muted">Outstanding</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>{formatCurrency(dues.summary.outstanding, currency)}</div>
              </div>
            </div>
            <div className="flex gap-1 wrap mt-2">
              <Badge tone="green">{dues.summary.paid_records} fully paid</Badge>
              <Badge tone="amber">{dues.summary.partial_records} partial</Badge>
              <Badge tone="red">{dues.summary.unpaid_records} unpaid</Badge>
            </div>
          </div>
          <DataTable
            resource={{
              key: 'report_dues_class',
              label: 'Dues',
              titleKey: 'name',
              listColumns: ['name', 'students', 'expected', 'collected', 'outstanding'],
              fields: [
                { key: 'name', label: 'Class' },
                { key: 'students', label: 'Records', type: 'number' },
                { key: 'expected', label: 'Expected', type: 'currency' },
                { key: 'collected', label: 'Collected', type: 'currency' },
                { key: 'outstanding', label: 'Outstanding', type: 'currency' }
              ]
            }}
            rows={dues.byClass}
            currency={currency}
            compact
            emptyTitle="No dues records yet"
          />
        </Card>
      </div>

      <div className="grid grid--2 mb-2">
        <Card title="Financial summary" subtitle="Budgets recorded against activities in range" icon="trendingUp">
          <div className="grid grid--3" style={{ gap: 12 }}>
            <div>
              <div className="small muted">Total budget</div>
              <div style={{ fontSize: 19, fontWeight: 700 }}>{formatCurrency(financial.total_budget, currency)}</div>
            </div>
            <div>
              <div className="small muted">Amount spent</div>
              <div style={{ fontSize: 19, fontWeight: 700 }}>{formatCurrency(financial.total_spent, currency)}</div>
            </div>
            <div>
              <div className="small muted">Balance</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: financial.total_budget - financial.total_spent >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {formatCurrency(financial.total_budget - financial.total_spent, currency)}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <BarChart
              data={activities.slice(0, 8).map((activity) => ({
                name: activity.title.split(' ').slice(0, 2).join(' '),
                value: activity.spent || 0
              }))}
              color="#9b51e0"
              formatValue={(v) => formatNumber(v)}
            />
          </div>
        </Card>

        <Card title="Attendance distribution" subtitle="Across the selected period" icon="target">
          <DonutChart data={attendance.byStatus} centerLabel="Entries" />
          <div className="mt-2 small muted">
            {attendance.byMember.length} members have attendance records in this period.
          </div>
        </Card>
      </div>

      <div className="grid grid--2 mb-2">
        <Card title="Meetings & turnout" icon="calendar" flush>
          <DataTable
            resource={{
              key: 'report_meetings',
              label: 'Meetings',
              titleKey: 'title',
              listColumns: ['title', 'type', 'date', 'present', 'total', 'status'],
              fields: [
                { key: 'title', label: 'Meeting' },
                { key: 'type', label: 'Type' },
                { key: 'date', label: 'Date', type: 'date' },
                { key: 'present', label: 'Present', type: 'number' },
                { key: 'total', label: 'Marked', type: 'number' },
                { key: 'status', label: 'Status' }
              ]
            }}
            rows={meetings}
            onRowClick={(row) => navigate(`/r/meetings/${row.id}`)}
            emptyTitle="No meetings in this period"
          />
        </Card>

        <Card title="Activity performance" icon="sparkles" flush>
          <DataTable
            resource={{
              key: 'report_activities',
              label: 'Activities',
              titleKey: 'title',
              listColumns: ['title', 'category', 'date', 'budget', 'spent', 'actual_participants'],
              fields: [
                { key: 'title', label: 'Activity' },
                { key: 'category', label: 'Category' },
                { key: 'date', label: 'Date', type: 'date' },
                { key: 'budget', label: 'Budget', type: 'currency' },
                { key: 'spent', label: 'Spent', type: 'currency' },
                { key: 'actual_participants', label: 'Participants', type: 'number' }
              ]
            }}
            rows={activities}
            currency={currency}
            onRowClick={(row) => navigate(`/r/activities/${row.id}`)}
            emptyTitle="No activities in this period"
          />
        </Card>
      </div>

      <div className="grid grid--3 mb-2">
        <Card title="Course completion" subtitle="Enrollment and success per course" icon="book" flush className="card">
          <div className="card__body" style={{ paddingBottom: 0 }}>
            <BarChart
              data={courseRows.map((course) => ({ name: (course.code || course.title).split(' ')[0], value: course.enrolled }))}
              color="#12b76a"
              alt
            />
          </div>
          <DataTable
            resource={{
              key: 'report_courses',
              label: 'Courses',
              titleKey: 'title',
              listColumns: ['title', 'enrolled', 'completed', 'completion'],
              fields: [
                { key: 'title', label: 'Course' },
                { key: 'enrolled', label: 'Enrolled', type: 'number' },
                { key: 'completed', label: 'Completed', type: 'number' },
                { key: 'completion', label: 'Completion', type: 'percentage' }
              ]
            }}
            rows={courseRows}
            compact
            onRowClick={(row) => navigate(`/r/courses/${row.id}`)}
          />
        </Card>

        <Card title="Certificates issued" icon="award" flush>
          <div className="card__body">
            <DonutChart data={certificates} centerLabel="Awards" />
          </div>
          <div className="card__body" style={{ paddingTop: 0 }}>
            <Button icon="chevronRight" onClick={() => navigate('/r/certificates')}>
              Open certificate register
            </Button>
          </div>
        </Card>

        <Card title="Projects overview" icon="rocket" flush>
          <div className="card__body">
            <DonutChart data={projects} centerLabel="Projects" />
          </div>
        </Card>
      </div>

      <Card title="Executive committee" subtitle="Cabinet members and their terms" icon="crown" flush>
        <DataTable
          resource={{
            key: 'report_cabinet',
            label: 'Cabinet',
            titleKey: 'full_name',
            listColumns: ['position', 'full_name', 'term', 'status', 'email', 'phone'],
            fields: [
              { key: 'position', label: 'Position' },
              { key: 'full_name', label: 'Member' },
              { key: 'term', label: 'Term' },
              { key: 'status', label: 'Status' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'phone', label: 'Phone', type: 'tel' }
            ]
          }}
          rows={cabinet}
          emptyTitle="No cabinet members recorded"
        />
      </Card>

      <Card title="Session turnout detail" subtitle="Every recorded session in the period" icon="clipboard" flush className="mt-3">
        <DataTable
          resource={{
            key: 'report_sessions',
            label: 'Sessions',
            titleKey: 'session_title',
            listColumns: ['session_date', 'session_title', 'total', 'present', 'rate', 'ref_type'],
            fields: [
              { key: 'session_date', label: 'Date', type: 'date' },
              { key: 'session_title', label: 'Session' },
              { key: 'ref_type', label: 'Type' },
              { key: 'total', label: 'Marked', type: 'number' },
              { key: 'present', label: 'Present', type: 'number' },
              { key: 'rate', label: 'Turnout', type: 'percentage' }
            ]
          }}
          rows={attendance.bySession}
          emptyTitle="No sessions recorded"
        />
      </Card>

      <div className="grid grid--2 mt-3">
        <Card title="Students owing dues" subtitle={`${dues.defaulters.length} records`} icon="alert" flush>
          <DataTable
            resource={{
              key: 'report_dues_owing',
              label: 'Dues',
              titleKey: 'full_name',
              listColumns: ['full_name', 'class_level', 'term', 'amount_due', 'amount_paid', 'balance', 'status'],
              fields: [
                { key: 'full_name', label: 'Student' },
                { key: 'class_level', label: 'Class' },
                { key: 'term', label: 'Term' },
                { key: 'amount_due', label: 'Due', type: 'currency' },
                { key: 'amount_paid', label: 'Paid', type: 'currency' },
                { key: 'balance', label: 'Balance', type: 'currency' },
                { key: 'status', label: 'Status' }
              ]
            }}
            rows={dues.defaulters.slice(0, 25)}
            currency={currency}
            compact
            emptyTitle="No outstanding dues"
            emptyMessage="Every student has cleared their club dues."
          />
        </Card>
        <Card title="Recent dues payments" subtitle="Latest receipts recorded" icon="wallet" flush>
          <DataTable
            resource={{
              key: 'report_dues_payments',
              label: 'Payments',
              titleKey: 'full_name',
              listColumns: ['payment_date', 'full_name', 'class_level', 'amount_paid', 'method', 'receipt_no'],
              fields: [
                { key: 'payment_date', label: 'Date', type: 'date' },
                { key: 'full_name', label: 'Student' },
                { key: 'class_level', label: 'Class' },
                { key: 'amount_paid', label: 'Amount', type: 'currency' },
                { key: 'method', label: 'Method' },
                { key: 'receipt_no', label: 'Receipt' }
              ]
            }}
            rows={dues.payments}
            currency={currency}
            compact
            emptyTitle="No payments recorded yet"
          />
        </Card>
      </div>

      <p className="small muted mt-3">
        Statistics generated {formatDate(data.generated_at)} • period {range.from || 'all time'} → {range.to || 'today'} •{' '}
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => setBuilderOpen(true)}>
          <Icon name="file" size={14} /> Write this up as an official report
        </button>
      </p>

      <ReportBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} stats={data} range={range} currency={currency} user={user} toast={toast} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Report builder — turns the statistics into written sections         */
/* ------------------------------------------------------------------ */

function buildReportText(stats, range, currency) {
  if (!stats) return ''
  const { members, attendance, meetings, activities, courses, certificates, projects, cabinet, dues, classBreakdown, settings } = stats
  const totalAttendance = attendance.byStatus.reduce((sum, row) => sum + row.value, 0)
  const present = attendance.byStatus.find((r) => r.name === 'Present')?.value || 0
  const late = attendance.byStatus.find((r) => r.name === 'Late')?.value || 0
  const absent = attendance.byStatus.find((r) => r.name === 'Absent')?.value || 0
  const rate = totalAttendance ? Math.round(((present + late) / totalAttendance) * 1000) / 10 : 0
  const topSessions = [...attendance.bySession].sort((a, b) => (b.rate || 0) - (a.rate || 0)).slice(0, 3)
  const weakSessions = [...attendance.bySession].sort((a, b) => (a.rate || 0) - (b.rate || 0)).slice(0, 3)
  const topMembers = attendance.byMember.slice(0, 5)
  const weakMembers = [...attendance.byMember].reverse().slice(0, 6)
  const completedCourses = courses.filter((c) => c.completed > 0)
  const owing = dues?.defaulters || []
  const period = `${range.from || 'the beginning of records'} to ${range.to || 'today'}`
  const school = settings?.institution || 'the school'
  const money = (value) => `${currency} ${Number(value || 0).toLocaleString('en-GB')}`

  return `${(settings?.club_name || 'ICT CLUB').toUpperCase()} — OFFICIAL REPORT
${school}${settings?.patron_name ? `        Club Patron: ${settings.patron_name}` : ''}
Reporting period: ${period}
Academic year: ${settings?.academic_year || ''}    Current term: ${settings?.current_term || ''}
Prepared by: ______________________     Date: ${new Date().toLocaleDateString('en-GB')}

1. INTRODUCTION
This report summarises the activities, membership, attendance, training and finances of the ${settings?.club_name || 'ICT Club'} at ${school} for the period ${period}. All figures are taken directly from the club records.

2. MEMBERSHIP
Total members: ${members.total}
Active members: ${members.active}
Gender — Boys: ${members.male || 0}, Girls: ${members.female || 0}

Membership by class:
${(classBreakdown || []).map((row) => `  • ${row.name}: ${row.total} members (${row.active} active, ${row.female} girls, ${row.male} boys)`).join('\n') || '  No class data'}

3. ATTENDANCE
Total attendance entries: ${totalAttendance}
Present: ${present} • Late: ${late} • Absent: ${absent}
Overall attendance rate: ${rate}% (club target: ${settings?.attendance_target || 75}%)
Sessions recorded: ${attendance.bySession.length}

Sessions with the best turnout:
${topSessions.map((s) => `  • ${s.session_title} (${formatDate(s.session_date)}) — ${s.rate}%`).join('\n') || '  No sessions recorded'}

Sessions with the lowest turnout:
${weakSessions.map((s) => `  • ${s.session_title} (${formatDate(s.session_date)}) — ${s.rate}%`).join('\n') || '  No sessions recorded'}

Students with the best attendance:
${topMembers.map((m, i) => `  ${i + 1}. ${m.full_name} (${m.class_level || '—'}) — ${m.rate}% (${m.attended}/${m.sessions} sessions)`).join('\n') || '  No student attendance data'}

Students requiring follow-up (low attendance):
${weakMembers.map((m) => `  • ${m.full_name} (${m.class_level || '—'}) — ${m.rate}%`).join('\n') || '  No student attendance data'}

4. MEETINGS HELD
Meetings completed: ${meetings.filter((m) => m.status === 'Completed').length} of ${meetings.length} scheduled
${meetings.slice(0, 8).map((m) => `  • ${formatDate(m.date)} — ${m.title} (${m.type})${m.total ? `, present ${m.present}/${m.total}` : ''}`).join('\n') || '  No meetings recorded'}

5. ACTIVITIES AND FINANCE
Activities held: ${activities.length}
Budget committed: ${money(activities.reduce((sum, a) => sum + Number(a.budget || 0), 0))}
Amount spent: ${money(activities.reduce((sum, a) => sum + Number(a.spent || 0), 0))}
${activities.slice(0, 10).map((a) => `  • ${formatDate(a.date)} — ${a.title} (${a.category}) — budget ${money(a.budget)}, spent ${money(a.spent)}`).join('\n') || '  No activities recorded'}

6. CLUB DUES
Expected from students: ${money(dues?.summary?.expected)}
Collected: ${money(dues?.summary?.collected)}
Outstanding: ${money(dues?.summary?.outstanding)}
Records — fully paid: ${dues?.summary?.paid_records || 0}, partial: ${dues?.summary?.partial_records || 0}, unpaid: ${dues?.summary?.unpaid_records || 0}

Collection by class:
${(dues?.byClass || []).map((row) => `  • ${row.name}: ${money(row.collected)} of ${money(row.expected)} (${row.outstanding ? `${money(row.outstanding)} outstanding` : 'fully cleared'})`).join('\n') || '  No dues records'}

Students still owing (${owing.length} records):
${owing.slice(0, 15).map((row) => `  • ${row.full_name} (${row.class_level || '—'}) — ${money(row.balance)} owing for ${row.term} ${row.academic_year}${row.guardian_phone ? ` — guardian ${row.guardian_phone}` : ''}`).join('\n') || '  All dues cleared'}

7. COURSES AND TRAINING
Courses offered: ${courses.length}
Total course registrations: ${courses.reduce((sum, c) => sum + c.enrolled, 0)}
Courses completed by at least one student: ${completedCourses.length}
${completedCourses.map((c) => `  • ${c.title} (${c.level}) — ${c.completed} of ${c.enrolled} students completed`).join('\n') || '  No courses completed in this period'}

8. CERTIFICATES AND AWARDS
Certificates issued: ${certificates.reduce((sum, r) => sum + r.value, 0)}
${certificates.map((c) => `  • ${c.name}: ${c.value}`).join('\n') || '  No certificates issued'}

9. PROJECTS
${projects.map((p) => `  • ${p.name}: ${p.value}`).join('\n') || '  No projects recorded'}

10. EXECUTIVE COMMITTEE
${cabinet.filter((c) => c.status === 'Active').map((c) => `  • ${c.position} — ${c.full_name || 'Vacant'} (${c.term})`).join('\n') || '  Executive committee not yet constituted'}

11. CHALLENGES
  • Some students have not cleared their club dues for the term.
  • Attendance at a few sessions fell below the club target of ${settings?.attendance_target || 75}%.
  • Some computers in the ICT lab require repair.
  • Club meetings sometimes clash with evening prep time.

12. RECOMMENDATIONS
  • Class representatives to follow up outstanding dues through the guardians.
  • Publish the club calendar at the start of every term.
  • Report the computers that need repair to the administration.
  • Timetable club meetings on Wednesday afternoons.
  • Complete attendance registers and minutes within 48 hours of every session.

13. CONCLUSION
The club recorded ${totalAttendance} attendance entries, ${activities.length} activities and ${meetings.length} meetings, trained ${courses.reduce((sum, c) => sum + c.enrolled, 0)} students and issued ${certificates.reduce((sum, r) => sum + r.value, 0)} certificates during the period. The executive committee remains committed to improving participation, skills and record keeping.

Prepared by: ______________________        Signature: ______________________
Approved by (Patron): ______________________        Head Teacher: ______________________
`
}

function ReportBuilder({ open, onClose, stats, range, currency, user, toast }) {
  const navigate = useNavigate()
  const [type, setType] = useState('Monthly Report')
  const [title, setTitle] = useState('')
  const [period, setPeriod] = useState('')
  const [authorId, setAuthorId] = useState('')
  const [saving, setSaving] = useState(false)
  const { options } = useOptions('members')

  const text = useMemo(() => buildReportText(stats, range, currency), [stats, range, currency])

  const suggestedTitle = useMemo(() => {
    if (type === 'Annual Report') return `Annual Report — ${stats?.settings?.academic_year || new Date().getFullYear()}`
    if (type === 'Term Report') return `Term Report — ${stats?.settings?.current_term || ''} ${stats?.settings?.academic_year || ''}`.trim()
    if (type === 'Monthly Report') return `Monthly Report — ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`
    return `${type} — ${range.from ? formatDate(range.from) : 'All time' } to ${range.to ? formatDate(range.to) : 'today'}`
  }, [type, stats, range])

  const save = async () => {
    setSaving(true)
    try {
      const { data } = await api.create('reports', {
        title: title || suggestedTitle,
        type,
        period: period || `${range.from || 'All time'} — ${range.to || 'today'}`,
        author_id: authorId ? Number(authorId) : user?.member_id || null,
        summary: `Auto-generated ${type.toLowerCase()} covering ${stats?.attendance?.bySession?.length || 0} sessions, ${stats?.activities?.length || 0} activities, ${stats?.courses?.length || 0} courses and club dues of ${stats?.dues?.summary?.collected || 0} collected.`,
        content: text,
        status: 'Draft'
      })
      toast.success('Report created', 'Saved as a draft in Report Records.')
      onClose()
      navigate(`/r/reports/${data.id}`)
    } catch (err) {
      toast.error('Could not create the report', err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate an official report"
      subtitle="The statistics above are written up into a complete draft you can edit."
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button icon="copy" onClick={() => navigator.clipboard?.writeText(text).then(() => toast.success('Report text copied'))}>
            Copy text
          </Button>
          <Button icon="download" onClick={() => downloadText(text, `${(title || suggestedTitle).replace(/[^\w]+/g, '-').toLowerCase()}.txt`)}>
            Download .txt
          </Button>
          <Button variant="primary" icon="check" loading={saving} onClick={save}>
            Save as report record
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field">
          <label className="field__label">Report type</label>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
            {REPORT_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label">Reporting period</label>
          <input className="input" value={period} placeholder={`${range.from || 'All time'} — ${range.to || 'today'}`} onChange={(e) => setPeriod(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label">Title</label>
          <input className="input" value={title} placeholder={suggestedTitle} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label">Prepared by</label>
          <select className="select" value={authorId} onChange={(e) => setAuthorId(e.target.value)}>
            <option value="">Use my linked member profile</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label className="field__label">Generated content</label>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--mono)',
            fontSize: 12,
            lineHeight: 1.6,
            maxHeight: 320,
            overflow: 'auto',
            background: 'var(--surface-2)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: 14
          }}
        >
          {text}
        </pre>
        <span className="field__help">Tip: copy the text into Word or Google Docs if you need richer formatting.</span>
      </div>
    </Modal>
  )
}

export { buildReportText }
