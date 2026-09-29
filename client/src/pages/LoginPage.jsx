import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../icons'
import { useAuth } from '../auth'
import { takeSessionNotice } from '../api'
import { Button } from '../components/ui'

const FEATURES = [
  'Students from S1 to S6, streams and houses',
  'Executive committee and class representatives',
  'Meetings with agendas, minutes and decisions',
  'Attendance registers for every session and class',
  'Course register, certificates and awards',
  'Club dues tracking with receipts and balances',
  'Term reports with live statistics'
]

export default function LoginPage() {
  const { login, signup, user } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  /* Shown when the app bounced the user back here (session expired, data reloaded).
     It is cleared the moment the user touches the form, so it can never be
     mistaken for a response to the sign-in details they just typed. */
  const [notice, setNotice] = useState(() => takeSessionNotice())
  const [reveal, setReveal] = useState(false)
  const [capsOn, setCapsOn] = useState(false)
  const clearNotice = () => setNotice(null)

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const run = async (event) => {
    event.preventDefault()
    clearNotice()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(form.email.trim(), form.password)
      else await signup(form)
      navigate('/', { replace: true })
    } catch (err) {
      const message = err.message || 'Unable to sign in'
      setError(
        /incorrect password/i.test(message)
          ? 'Incorrect password. Passwords are case-sensitive — check the capital letters, or use the ? to see what you typed.'
          : message
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-art">
        <div>
          <div className="login-art__logo">IC</div>
          <h1>Everything your school ICT Club runs on, in one place.</h1>
          <p>
            Track students, the executive committee, meetings, activities, courses, attendance, club dues,
            reports, certificates, notes and projects — with live statistics for every session and class.
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
          Built for secondary school ICT clubs • runs on the school computer or a laptop with no internet
        </p>
      </div>

      <div className="login-form-wrap">
        <div className="login-card">
          <h2>{mode === 'login' ? 'Sign in to your club' : 'Create your account'}</h2>
          <p className="muted">
            {mode === 'login'
              ? 'Use the account the club patron or the executive committee created for you.'
              : 'Student accounts can view club records and manage their own notes.'}
          </p>

          {notice && (
            <div
              className="card mb-2"
              style={{ background: 'var(--amber-soft, #fff7e6)', borderColor: 'var(--amber, #e0a300)' }}
              role="status"
            >
              <div className="card__body flex items-center gap-2" style={{ padding: 12 }}>
                <Icon name="alert" size={16} />
                <div className="small" style={{ flex: 1 }}>{notice}</div>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={clearNotice}
                  aria-label="Dismiss message"
                >
                  ×
                </button>
              </div>
            </div>
          )}

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
              <label className="field__label" htmlFor="email">
                {mode === 'login' ? 'Username or email' : 'Email address'}
              </label>
              <input
                id="email"
                className="input"
                type={mode === 'login' ? 'text' : 'email'}
                value={form.email}
                onChange={(e) => {
                  clearNotice()
                  setForm({ ...form, email: e.target.value })
                }}
                placeholder={mode === 'login' ? 'e.g. Sharp' : 'you@school.ac.ug'}
                autoComplete="username"
                required
              />
              {mode === 'login' && (
                <span className="field__help">
                  Enter the username or email of the account the club patron gave you.
                </span>
              )}
            </div>
            <div className="field">
              <label className="field__label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  className="input"
                  type={reveal ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => {
                    clearNotice()
                    setForm({ ...form, password: e.target.value })
                  }}
                  onKeyUp={(e) => setCapsOn(e.getModifierState ? e.getModifierState('CapsLock') : false)}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  style={{ paddingRight: 46 }}
                  required
                />
                <button
                  type="button"
                  className="btn btn--ghost btn--icon"
                  onClick={() => setReveal((value) => !value)}
                  title={reveal ? 'Hide the password' : 'Show the password'}
                  aria-label={reveal ? 'Hide the password' : 'Show the password'}
                  style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}
                >
                  <Icon name={reveal ? 'eyeOff' : 'eye'} size={16} />
                </button>
              </div>
              {capsOn && <span className="field__help" style={{ color: 'var(--red)' }}>Caps Lock is on</span>}
            </div>

            {error && (
              <div className="field__error mb-2" role="alert" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Icon name="alert" size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" variant="primary" loading={busy} style={{ width: '100%', padding: '11px 14px' }}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="small muted mt-2 center">
            {mode === 'login' ? (
              <>
                No account yet?{' '}
                <a href="#signup" onClick={(e) => { e.preventDefault(); setMode('signup') }} style={{ color: 'var(--brand)', fontWeight: 600 }}>
                  Register as a student
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
