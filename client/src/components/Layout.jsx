import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Icon, { RESOURCE_ICONS } from '../icons'
import { useAuth } from '../auth'
import { api } from '../api'
import { useDebounced } from '../hooks'
import { initials } from '../format'
import { Badge } from './ui'

const NAV = [
  { group: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: 'dashboard', end: true }] },
  {
    group: 'People',
    items: [
      { to: '/r/members', label: 'Members', icon: 'users' },
      { to: '/r/cabinet', label: 'Cabinet', icon: 'crown' }
    ]
  },
  {
    group: 'Operations',
    items: [
      { to: '/r/meetings', label: 'Meetings', icon: 'calendar' },
      { to: '/r/activities', label: 'Activities', icon: 'sparkles' },
      { to: '/attendance', label: 'Attendance', icon: 'check' }
    ]
  },
  {
    group: 'Learning',
    items: [
      { to: '/r/courses', label: 'Courses', icon: 'book' },
      { to: '/r/enrollments', label: 'Enrollments', icon: 'userPlus' }
    ]
  },
  {
    group: 'Workspace',
    items: [
      { to: '/r/projects', label: 'Projects', icon: 'rocket' },
      { to: '/r/project_tasks', label: 'Project Tasks', icon: 'checkSquare' },
      { to: '/r/notes', label: 'Notes', icon: 'note' }
    ]
  },
  {
    group: 'Administration',
    items: [
      { to: '/reports', label: 'Reports Studio', icon: 'file' },
      { to: '/r/reports', label: 'Report Records', icon: 'clipboard' },
      { to: '/r/certificates', label: 'Certificates', icon: 'award' },
      { to: '/settings', label: 'Settings', icon: 'settings' },
      { to: '/r/users', label: 'User Accounts', icon: 'shield', adminOnly: true }
    ]
  }
]

export default function Layout() {
  const { user, logout, settings } = useAuth()
  const [navOpen, setNavOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const debounced = useDebounced(query, 220)
  const location = useLocation()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    setNavOpen(false)
    setUserMenuOpen(false)
    setSearchOpen(false)
  }, [location.pathname])

  useEffect(() => {
    let alive = true
    if (debounced.trim().length < 2) {
      setResults([])
      return () => {}
    }
    api
      .search(debounced.trim())
      .then((res) => alive && setResults(res.results || []))
      .catch(() => alive && setResults([]))
    return () => {
      alive = false
    }
  }, [debounced])

  const groups = useMemo(
    () => NAV.map((group) => ({ ...group, items: group.items.filter((item) => !item.adminOnly || isAdmin) })).filter((g) => g.items.length),
    [isAdmin]
  )

  const clubName = settings?.club_name || 'ICT Club'
  const academicYear = settings?.academic_year || ''

  return (
    <div className="app-shell">
      <aside className={`sidebar ${navOpen ? 'is-open' : ''}`}>
        <div className="sidebar__brand">
          <div className="sidebar__logo">IC</div>
          <div style={{ minWidth: 0 }}>
            <div className="sidebar__title">{clubName}</div>
            <div className="sidebar__subtitle">Management System</div>
          </div>
        </div>
        <nav className="sidebar__nav">
          {groups.map((group) => (
            <div className="sidebar__group" key={group.group}>
              <div className="sidebar__group-label">{group.group}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
                >
                  <Icon name={item.icon} size={17} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar__footer">
          <div style={{ color: '#cbd5e1', fontWeight: 600, fontSize: 12 }}>{clubName}</div>
          {academicYear && <div>Academic year {academicYear}</div>}
          <div className="mt-1">
            <Link to="/verify" style={{ color: '#8ba3cc' }}>
              Verify a certificate →
            </Link>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button type="button" className="btn btn--ghost btn--icon mobile-only" onClick={() => setNavOpen((v) => !v)} aria-label="Toggle navigation">
            <Icon name={navOpen ? 'x' : 'menu'} size={19} />
          </button>

          <div className="topbar__search">
            <Icon name="search" size={16} />
            <input
              className="input"
              placeholder="Search members, meetings, courses, projects…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
            />
            {searchOpen && results.length > 0 && (
              <div className="search-results">
                {results.map((group) => (
                  <div className="search-results__group" key={group.resource}>
                    <div className="search-results__label">{group.label}</div>
                    {group.items.map((item) => (
                      <div
                        className="search-results__item"
                        key={`${group.resource}-${item.id}`}
                        onClick={() => {
                          setQuery('')
                          setResults([])
                          navigate(`/r/${group.resource}/${item.id}`)
                        }}
                      >
                        <span>{item.title}</span>
                        {item.subtitle && <span>{item.subtitle}</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grow" />

          <Link to="/r/meetings" className="btn btn--ghost hide-sm" title="Meetings">
            <Icon name="calendar" size={17} />
          </Link>
          <Link to="/r/notes" className="btn btn--ghost hide-sm" title="Notes">
            <Icon name="note" size={17} />
          </Link>

          <div style={{ position: 'relative' }}>
            <button type="button" className="btn btn--ghost" onClick={() => setUserMenuOpen((v) => !v)} style={{ gap: 9, paddingLeft: 6 }}>
              <span className="avatar avatar--sm" style={{ background: 'var(--brand-soft)', color: 'var(--brand-dark)' }}>
                {initials(user?.name)}
              </span>
              <span className="hide-sm" style={{ fontWeight: 570 }}>{user?.name?.split(' ')[0]}</span>
              <Icon name="chevronDown" size={14} />
            </button>
            {userMenuOpen && (
              <div className="search-results" style={{ left: 'auto', right: 0, width: 250 }} onMouseDown={(e) => e.stopPropagation()}>
                <div style={{ padding: '8px 10px 10px' }}>
                  <div style={{ fontWeight: 620 }}>{user?.name}</div>
                  <div className="small muted">{user?.email}</div>
                  <div className="mt-1">
                    <Badge tone={isAdmin ? 'purple' : user?.role === 'cabinet' ? 'brand' : 'gray'}>
                      {isAdmin ? 'Administrator' : user?.role === 'cabinet' ? 'Cabinet access' : 'Member access'}
                    </Badge>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 6 }}>
                  <div
                    className="search-results__item"
                    onClick={() => {
                      setUserMenuOpen(false)
                      navigate('/settings')
                    }}
                  >
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Icon name="settings" size={15} /> Settings &amp; profile
                    </span>
                  </div>
                  <div
                    className="search-results__item"
                    onClick={() => logout()}
                  >
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--red)' }}>
                      <Icon name="logout" size={15} /> Sign out
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="page" onClick={() => { setUserMenuOpen(false); setSearchOpen(false) }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export { NAV, RESOURCE_ICONS }
