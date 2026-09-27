import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../icons'
import { useAuth } from '../auth'
import { Button } from '../components/ui'

const FEATURES = [
  'Members, cabinet positions and terms',
  'Meetings with agendas, minutes and action items',
  'Attendance registers for every session',
  'Courses, enrollments and certificates',
  'Reports studio with live statistics',
  'Projects, tasks and shared notes'
]

const DEMO = [
  { label: 'Administrator', email: 'admin@ictclub.org', password: 'admin123', hint: 'Full access — manage everything' },
  { label: 'Cabinet member', email: 'cabinet@ictclub.org', password: 'cabinet123', hint: 'Records, attendance, reports' },
  { label: 'Member', email: 'member@ictclub.org', password: 'member123', hint: 'Read-only plus own notes' }
]

export default function LoginPage() {
  const { login, signup, user } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) navigate('/', { replace: true })

  const run = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(form.email, form.password)
      else await signup(form)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-art">
        <div>
          <div className="login-art__logo">IC</div>
          <h1>Everything your ICT Club runs on, in one place.</h1>
          <p>
            Track members, cabinet positions, meetings, activities, courses, attendance, reports,
            certificates, notes and projects — with live statistics for every session.
          </p>
          <div className="login-art__features">
            {FEATURES.map((feature) => (
              <div className="login-art__feature" key={feature}>
                <Icon name="check" size={16} />
                {feature}
              </div>
            ))}
          </div>
        </div>
        <p className="small" style={{ color: '#8ba3cc' }}>
          Built for student clubs • works offline on your own machine
        </p>
      </div>

      <div className="login-form-wrap">
        <div className="login-card">
          <h2>{mode === 'login' ? 'Sign in to your club' : 'Create your account'}</h2>
          <p className="muted">
            {mode === 'login'
              ? 'Use the account your club administrator created for you.'
              : 'Member accounts can view records and manage their own notes.'}
          </p>

          <form onSubmit={run}>
            {mode === 'signup' && (
              <div className="field">
                <label className="field__label" htmlFor="name">Full name</label>
                <input
                  id="name"
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Amina Yusuf"
                  required
                />
              </div>
            )}
            <div className="field">
              <label className="field__label" htmlFor="email">Email address</label>
              <input
                id="email"
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@ictclub.org"
                autoComplete="username"
                required
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>

            {error && <div className="field__error mb-2">{error}</div>}

            <Button type="submit" variant="primary" loading={busy} style={{ width: '100%', padding: '11px 14px' }}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="small muted mt-2 center">
            {mode === 'login' ? (
              <>
                No account yet?{' '}
                <a href="#signup" onClick={(e) => { e.preventDefault(); setMode('signup') }} style={{ color: 'var(--brand)', fontWeight: 600 }}>
                  Register as a member
                </a>
              </>
            ) : (
              <>
                Already registered?{' '}
                <a href="#login" onClick={(e) => { e.preventDefault(); setMode('login') }} style={{ color: 'var(--brand)', fontWeight: 600 }}>
                  Sign in
                </a>
              </>
            )}
          </p>

          {mode === 'login' && (
            <div className="demo-accounts">
              <div className="small muted mb-2" style={{ fontWeight: 620 }}>Demo accounts (click to fill)</div>
              {DEMO.map((account) => (
                <div
                  className="demo-account"
                  key={account.email}
                  onClick={() => setForm({ name: '', email: account.email, password: account.password })}
                >
                  <div>
                    <b>{account.label}</b>
                    <div className="muted">{account.hint}</div>
                  </div>
                  <Icon name="chevronRight" size={15} />
                </div>
              ))}
            </div>
          )}

          <p className="small muted mt-3 center">
            <Link to="/verify" style={{ color: 'var(--brand)' }}>
              Verify a certificate →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
