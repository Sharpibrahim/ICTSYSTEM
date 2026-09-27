import { Link, useNavigate } from 'react-router-dom'
import Icon from '../icons'
import { useAuth } from '../auth'
import { api } from '../api'
import { useAsync } from '../hooks'
import { Avatar, Badge, Button, Card, EmptyState, Loading, ProgressBar, Stat, StatusBadge } from '../components/ui'
import { BarChart, DonutChart, LineChart, Ring } from '../components/charts'
import { dueLabel, formatCurrency, formatDate, formatNumber, relativeTime } from '../format'

function monthLabel(value) {
  if (!value) return ''
  const [year, month] = String(value).split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('en-GB', { month: 'short' })
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const QUICK_ACTIONS = [
  { label: 'Register student', to: '/r/members?new=1', icon: 'userPlus' },
  { label: 'New meeting', to: '/r/meetings?new=1', icon: 'calendar' },
  { label: 'Record attendance', to: '/attendance', icon: 'check' },
  { label: 'Record dues', to: '/r/dues?new=1', icon: 'wallet' },
  { label: 'Create report', to: '/r/reports?new=1', icon: 'file' }
]

const REF_LABELS = { meeting: 'Meetings', activity: 'Activities', course: 'Course sessions', project: 'Projects' }

export default function Dashboard() {
  const { user, settings } = useAuth()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsync(() => api.dashboard(), [])

  if (loading) return <Loading label="Crunching club statistics…" />
  if (error) {
    return (
      <EmptyState
        icon="alert"
        title="Could not load the dashboard"
        message={error}
        action={<Button variant="primary" icon="refresh" onClick={reload}>Try again</Button>}
      />
    )
  }

  const { cards, attendance, members, projects, activities, courses, meetings, recent, finance } = data
  const currency = settings?.currency || data.settings?.currency || 'USD'

  const attendanceTrend = attendance.trend.map((row) => ({
    label: monthLabel(row.month),
    values: { present: row.present || 0, absent: row.absent || 0, excused: row.excused || 0 }
  }))

  const memberGrowth = members.growth.map((row) => ({ label: monthLabel(row.month), values: { value: row.value } }))

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <div className="breadcrumb">Overview</div>
          <h1>
            {greeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p>
            {data.settings?.institution ? `${data.settings.institution} • ` : ''}
            {data.settings?.club_name || 'ICT Club'} • {data.settings?.current_term || ''} {data.settings?.academic_year || ''}
            {' — '}here is what is happening across your students, sessions and projects.
          </p>
        </div>
        <div className="page-head__actions">
          {QUICK_ACTIONS.map((action) => (
            <Button key={action.to} icon={action.icon} onClick={() => navigate(action.to)}>
              <span className="hide-sm">{action.label}</span>
            </Button>
          ))}
          <Button variant="primary" icon="refresh" onClick={reload} aria-label="Refresh" />
        </div>
      </div>

      <div className="grid grid--stats mb-2">
        <Stat icon="users" label="Members" value={cards.members} hint={`${cards.active_members} active students`} tone="brand" />
        <Stat icon="crown" label="Executive committee" value={cards.cabinet} hint="Positions filled" tone="purple" />
        <Stat
          icon="wallet"
          label="Dues collected"
          value={formatCurrency(cards.dues_collected, currency)}
          hint={`${formatCurrency(cards.dues_expected - cards.dues_collected, currency)} outstanding`}
          tone={cards.dues_collected / Math.max(1, cards.dues_expected) > 0.8 ? 'green' : 'amber'}
        />
        <Stat
          icon="check"
          label="Attendance rate"
          value={attendance.rate === null ? '—' : `${attendance.rate}%`}
          hint={`${cards.attendance_records} records tracked`}
          tone={attendance.rate >= 75 ? 'green' : attendance.rate >= 50 ? 'amber' : 'red'}
        />
        <Stat icon="calendar" label="Meetings" value={cards.meetings} hint={`${cards.upcoming_meetings} upcoming`} tone="blue" />
        <Stat icon="sparkles" label="Activities" value={cards.activities} hint={`${cards.upcoming_activities} planned`} tone="teal" />
        <Stat icon="book" label="Courses" value={cards.courses} hint={`${cards.enrollments} enrollments`} tone="green" />
        <Stat icon="rocket" label="Projects" value={cards.projects} hint={`${cards.open_tasks} open tasks`} tone="purple" />
        <Stat icon="award" label="Certificates issued" value={cards.certificates} hint={`${cards.dues_defaulters} students with dues owing`} tone="amber" />
      </div>

      <div className="grid grid--2 mb-2" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)' }}>
        <Card title="Attendance trend" subtitle="Present, absent and excused over recent months" icon="trendingUp">
          <LineChart
            data={attendanceTrend}
            series={[
              { key: 'present', label: 'Present', color: '#12b76a' },
              { key: 'absent', label: 'Absent', color: '#f04438' },
              { key: 'excused', label: 'Excused', color: '#2e90fa' }
            ]}
          />
        </Card>
        <Card title="Club attendance" subtitle="Across every recorded session" icon="target">
          <div className="grid" style={{ gap: 16 }}>
            <Ring value={attendance.rate || 0} caption={`${cards.attendance_records} records`} />
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              {attendance.byRefType.map((row) => (
                <div className="flex items-center justify-between small" key={row.ref_type} style={{ padding: '4px 0' }}>
                  <span className="muted">{REF_LABELS[row.ref_type] || row.ref_type}</span>
                  <b>{row.value}</b>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid--3 mb-2">
        <Card
          title="Upcoming meetings"
          icon="calendar"
          flush
          actions={<Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => navigate('/r/meetings')}>All</Button>}
        >
          {meetings.upcoming.length === 0 && <EmptyState icon="calendar" title="No upcoming meetings" message="Schedule one from the meetings page." />}
          {meetings.upcoming.map((meeting) => (
            <div className="list-row" key={meeting.id} onClick={() => navigate(`/r/meetings/${meeting.id}`)} style={{ cursor: 'pointer' }}>
              <div className="list-row__main">
                <div className="list-row__title">{meeting.title}</div>
                <div className="list-row__meta">
                  <span>{formatDate(meeting.date)}</span>
                  {meeting.venue && <span>• {meeting.venue}</span>}
                </div>
              </div>
              <div className="list-row__side">
                <Badge>{relativeTime(meeting.date) || 'Soon'}</Badge>
              </div>
            </div>
          ))}
        </Card>

        <Card
          title="Upcoming activities"
          icon="sparkles"
          flush
          actions={<Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => navigate('/r/activities')}>All</Button>}
        >
          {activities.upcoming.length === 0 && <EmptyState icon="sparkles" title="No planned activities" message="Plan a workshop, hackathon or outreach." />}
          {activities.upcoming.map((activity) => (
            <div className="list-row" key={activity.id} onClick={() => navigate(`/r/activities/${activity.id}`)} style={{ cursor: 'pointer' }}>
              <div className="list-row__main">
                <div className="list-row__title">{activity.title}</div>
                <div className="list-row__meta">
                  <span>{formatDate(activity.date)}</span>
                  <span>• {activity.category}</span>
                </div>
              </div>
              <div className="list-row__side">
                <StatusBadge value={activity.status} />
              </div>
            </div>
          ))}
        </Card>

        <Card title="Task deadlines" subtitle={`${cards.overdue_tasks} overdue`} icon="checkSquare" flush>
          {projects.deadlines.length === 0 && <EmptyState icon="checkSquare" title="No open deadlines" message="All project tasks are up to date." />}
          {projects.deadlines.map((task) => {
            const overdue = new Date(task.due_date) < new Date()
            return (
              <div className="list-row" key={task.id} onClick={() => navigate(`/r/project_tasks/${task.id}`)} style={{ cursor: 'pointer' }}>
                <div className="list-row__main">
                  <div className="list-row__title">{task.title}</div>
                  <div className="list-row__meta">
                    <span>{task.project}</span>
                  </div>
                </div>
                <div className="list-row__side">
                  <Badge tone={overdue ? 'red' : 'amber'}>{dueLabel(task.due_date)}</Badge>
                </div>
              </div>
            )
          })}
        </Card>
      </div>

      <div className="grid grid--2 mb-2">
        <Card title="Members per class" subtitle="S1 – S6" icon="users">
          <BarChart data={members.byClass} formatValue={(v) => v} />
        </Card>
        <Card title="Membership growth" subtitle="New members per month" icon="trendingUp">
          <LineChart data={memberGrowth} series={[{ key: 'value', label: 'New members', color: '#4f46e5' }]} />
        </Card>
      </div>

      <div className="grid grid--3 mb-2">
        <Card title="Best attendance" subtitle="Members with the strongest turnout" icon="star" flush>
          {members.top.length === 0 && <EmptyState icon="star" title="No attendance data yet" />}
          {members.top.map((member, index) => (
            <div className="list-row" key={member.id} onClick={() => navigate(`/r/members/${member.id}`)} style={{ cursor: 'pointer' }}>
              <Badge tone={index === 0 ? 'green' : 'gray'}>{index + 1}</Badge>
              <div className="list-row__main">
                <div className="list-row__title">{member.full_name}</div>
                <div className="list-row__meta">
                  <span>{member.class_level || '—'}</span>
                  <span>• {member.attended}/{member.total} sessions</span>
                </div>
              </div>
              <div className="list-row__side" style={{ minWidth: 110 }}>
                <ProgressBar value={member.rate} />
                <span className="small muted">{member.rate}%</span>
              </div>
            </div>
          ))}
        </Card>

        <Card title="Needs attention" subtitle="Lowest attendance (3+ sessions)" icon="alert" flush>
          {members.low.length === 0 && <EmptyState icon="alert" title="Everyone is attending well" />}
          {members.low.map((member) => (
            <div className="list-row" key={member.id} onClick={() => navigate(`/r/members/${member.id}`)} style={{ cursor: 'pointer' }}>
              <div className="list-row__main">
                <div className="list-row__title">{member.full_name}</div>
                <div className="list-row__meta">
                  <span>{member.class_level || '—'}</span>
                </div>
              </div>
              <div className="list-row__side" style={{ minWidth: 110 }}>
                <ProgressBar value={member.rate} />
                <span className="small muted">{member.rate}%</span>
              </div>
            </div>
          ))}
        </Card>

        <Card title="Skills in the club" subtitle="Built from member profiles" icon="layers">
          {members.topSkills.length ? (
            <div className="skill-cloud">
              {members.topSkills.map((skill) => (
                <span key={skill.name}>
                  {skill.name} <b>{skill.value}</b>
                </span>
              ))}
            </div>
          ) : (
            <EmptyState icon="layers" title="No skills recorded" message="Add skills to member profiles to build this cloud." />
          )}
        </Card>
      </div>

      <div className="grid grid--3 mb-2">
        <Card title="Projects by status" icon="rocket">
          <DonutChart data={projects.byStatus} centerLabel="Projects" />
        </Card>
        <Card title="Course enrollment" subtitle="Learners per course" icon="book">
          <BarChart
            data={courses.enrollment.map((c) => ({ name: c.title.split(' ').slice(0, 2).join(' '), value: c.enrolled }))}
            formatValue={(v) => v}
            color="#12b76a"
          />
        </Card>
        <Card title="Members by house" icon="users">
          <DonutChart data={members.byHouse} centerLabel="Members" />
        </Card>
      </div>

      <div className="grid grid--2 mb-2">
        <Card title="Project timeline" subtitle="Deadlines for active projects" icon="clock" flush>
          {projects.timeline.length === 0 && <EmptyState icon="rocket" title="No active projects" />}
          {projects.timeline.map((project) => (
            <div className="list-row" key={project.id} onClick={() => navigate(`/r/projects/${project.id}`)} style={{ cursor: 'pointer' }}>
              <div className="list-row__main">
                <div className="list-row__title">{project.title}</div>
                <div className="list-row__meta">
                  <span>Deadline {formatDate(project.deadline)}</span>
                  <span>• {dueLabel(project.deadline)}</span>
                </div>
              </div>
              <div className="list-row__side">
                <StatusBadge value={project.status} />
                <div style={{ width: 90 }}>
                  <ProgressBar value={project.progress} />
                </div>
              </div>
            </div>
          ))}
        </Card>

        <Card title="Activity mix" subtitle="What the club runs most" icon="sparkles">
          <BarChart data={activities.byCategory} alt />
        </Card>
      </div>

      <div className="grid grid--3">
        <Card title="Recent club activity" subtitle="Latest changes in the system" icon="clock" flush className="card">
          {recent.log.length === 0 && <EmptyState icon="clock" title="No activity recorded yet" />}
          <div className="card__body">
            <div className="timeline">
              {recent.log.slice(0, 8).map((entry) => (
                <div className="timeline__item" key={entry.id}>
                  <div className="timeline__title">
                    {entry.user_name} <span className="muted">{entry.action}d</span> {entry.resource}
                  </div>
                  <div className="timeline__meta">
                    {entry.detail ? `${String(entry.detail).slice(0, 60)} • ` : ''}
                    {relativeTime(entry.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card
          title="Latest certificates"
          icon="award"
          flush
          actions={<Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => navigate('/r/certificates')}>All</Button>}
        >
          {recent.certificates.length === 0 && <EmptyState icon="award" title="No certificates issued yet" />}
          {recent.certificates.map((certificate) => (
            <div className="list-row" key={certificate.id} onClick={() => navigate(`/r/certificates/${certificate.id}`)} style={{ cursor: 'pointer' }}>
              <Avatar name={certificate.recipient || 'Certificate'} size="sm" />
              <div className="list-row__main">
                <div className="list-row__title">{certificate.title}</div>
                <div className="list-row__meta">
                  <span>{certificate.recipient}</span>
                  <span>• {formatDate(certificate.issue_date)}</span>
                </div>
              </div>
              <div className="list-row__side">
                <StatusBadge value={certificate.status} />
              </div>
            </div>
          ))}
        </Card>

        <Card
          title="Pinned & recent notes"
          icon="note"
          flush
          actions={<Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => navigate('/r/notes')}>All</Button>}
        >
          {recent.notes.length === 0 && <EmptyState icon="note" title="No notes yet" message="Share announcements and ideas with the club." />}
          {recent.notes.map((note) => (
            <div className="list-row" key={note.id} onClick={() => navigate(`/r/notes/${note.id}`)} style={{ cursor: 'pointer' }}>
              <div className="list-row__main">
                <div className="list-row__title">{note.title}</div>
                <div className="list-row__meta">
                  <span>{note.category}</span>
                  {note.author && <span>• {note.author}</span>}
                  <span>• {relativeTime(note.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div className="grid grid--2 mb-2">
        <Card
          title="Club dues collection"
          subtitle={`${finance.defaulters} students still owing`}
          icon="wallet"
          flush
          actions={<Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => navigate('/r/dues')}>Open register</Button>}
        >
          <div className="card__body">
            <div className="grid grid--3" style={{ gap: 12 }}>
              <div>
                <div className="small muted">Expected</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{formatCurrency(finance.expected, currency)}</div>
              </div>
              <div>
                <div className="small muted">Collected</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>{formatCurrency(finance.collected, currency)}</div>
              </div>
              <div>
                <div className="small muted">Outstanding</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>{formatCurrency(finance.outstanding, currency)}</div>
              </div>
            </div>
            <div className="mt-2">
              <ProgressBar
                value={finance.expected ? Math.round((finance.collected / finance.expected) * 100) : 0}
              />
              <div className="small muted mt-1">
                {finance.expected ? Math.round((finance.collected / finance.expected) * 100) : 0}% of expected dues collected
              </div>
            </div>
          </div>
          {finance.byTerm.slice(0, 3).map((row) => (
            <div className="list-row" key={`${row.academic_year}-${row.term}`}>
              <div className="list-row__main">
                <div className="list-row__title">
                  {row.term} {row.academic_year}
                </div>
                <div className="list-row__meta">
                  <span>{row.records} students</span>
                  <span>• {formatCurrency(row.collected, currency)} of {formatCurrency(row.expected, currency)}</span>
                </div>
              </div>
              <div className="list-row__side" style={{ minWidth: 120 }}>
                <ProgressBar value={row.expected ? Math.round((row.collected / row.expected) * 100) : 0} />
              </div>
            </div>
          ))}
        </Card>

        <Card
          title="Students with outstanding dues"
          subtitle="Follow up with the class representative or guardian"
          icon="alert"
          flush
          actions={<Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => navigate('/r/dues?status=Unpaid')}>View all</Button>}
        >
          {finance.watchlist.length === 0 && (
            <EmptyState icon="check" title="All dues cleared" message="Every student has paid their club dues." />
          )}
          {finance.watchlist.map((row) => (
            <div
              className="list-row"
              key={row.id}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/r/dues/${row.id}`)}
            >
              <Avatar name={row.full_name} size="sm" />
              <div className="list-row__main">
                <div className="list-row__title">{row.full_name}</div>
                <div className="list-row__meta">
                  <span>{row.class_level || '—'}</span>
                  <span>• {row.term} {row.academic_year}</span>
                  {row.guardian_phone && <span>• {row.guardian_phone}</span>}
                </div>
              </div>
              <div className="list-row__side">
                <Badge tone={row.status === 'Unpaid' ? 'red' : 'amber'}>
                  {formatCurrency(row.balance, currency)} owing
                </Badge>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div className="grid grid--2 mb-2">
        <Card title="Dues by class" subtitle="Collection rate per class" icon="layers" flush>
          <DataMiniTable
            columns={['Class', 'Students', 'Expected', 'Collected', 'Outstanding']}
            rows={finance.byClass.map((row) => [
              row.name,
              row.students,
              formatCurrency(row.expected, currency),
              formatCurrency(row.collected, currency),
              formatCurrency(row.outstanding, currency)
            ])}
            onRow={(index) => navigate(`/r/dues?class_level=${encodeURIComponent(finance.byClass[index].name)}`)}
          />
        </Card>
        <Card title="Members by stream" subtitle="A / B / C / East / West" icon="grid">
          <DonutChart data={members.byStream} centerLabel="Students" />
        </Card>
      </div>

      <div className="card mt-3">
        <div className="card__body flex items-center justify-between gap-3 wrap">
          <div>
            <h3>Turn this data into an official school report</h3>
            <p className="small muted mt-1">
              The Reports Studio writes membership, attendance, dues, activity and course statistics into a ready-to-file
              report for the patron, the head teacher or the PTA.
            </p>
          </div>
          <div className="flex gap-1 wrap">
            <Button icon="file" onClick={() => navigate('/reports')}>
              Open Reports Studio
            </Button>
            <Button variant="primary" icon="check" onClick={() => navigate('/attendance')}>
              Record attendance
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

/** Compact read-only table used by the dues-by-class card. */
function DataMiniTable({ columns, rows, onRow }) {
  if (!rows.length) return <EmptyState icon="wallet" title="No dues records yet" />
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} className={column === columns[0] ? '' : 'num'}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row[0]} onClick={() => onRow?.(index)} style={onRow ? { cursor: 'pointer' } : undefined}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={cellIndex === 0 ? '' : 'num'}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
