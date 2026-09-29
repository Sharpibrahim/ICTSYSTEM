/**
 * Authentication: scrypt password hashing (node:crypto) + opaque session
 * tokens stored in the database. No external auth dependencies.
 */
import crypto from 'node:crypto'
import { all, get, insert, run, logActivity } from './db.js'

const SESSION_DAYS = 7

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return `scrypt$${salt}$${derived}`
}

export function verifyPassword(password, stored) {
  if (!stored) return false
  const [scheme, salt, digest] = String(stored).split('$')
  if (scheme !== 'scrypt' || !salt || !digest) return false
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex')
  const a = Buffer.from(derived, 'hex')
  const b = Buffer.from(digest, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString()
  insert('sessions', { token, user_id: userId, expires_at: expires })
  run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [userId])
  return { token, expires }
}

export function destroySession(token) {
  if (token) run('DELETE FROM sessions WHERE token = ?', [token])
}

export function sessionUser(token) {
  if (!token) return null
  const row = get(
    `SELECT s.token, s.expires_at, u.id, u.name, u.username, u.email, u.role, u.member_id, u.status
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ?`,
    [token]
  )
  if (!row) return null
  if (new Date(row.expires_at).getTime() < Date.now()) {
    destroySession(token)
    return null
  }
  if (row.status !== 'active') return null
  return {
    id: row.id,
    name: row.name,
    username: row.username || null,
    email: row.email,
    role: row.role,
    member_id: row.member_id,
    token: row.token
  }
}

export function bearerToken(req) {
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) return header.slice(7).trim()
  return null
}

/** Attaches req.user when a valid token is present (never blocks). */
export function attachUser(req, _res, next) {
  req.user = sessionUser(bearerToken(req))
  next()
}

/** Blocks the request unless a valid session is present. */
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in required' })
  next()
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Sign in required' })
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to do that' })
    next()
  }
}

export function login(identifier, password) {
  const value = (identifier || '').trim()
  const user = get(
    `SELECT * FROM users
      WHERE lower(email) = lower(?)
         OR (username IS NOT NULL AND username <> '' AND lower(username) = lower(?))
      LIMIT 1`,
    [value, value]
  )
  if (!user) return { error: 'No account found with that username or email' }
  if (user.status !== 'active') return { error: 'This account has been disabled' }
  if (!verifyPassword(password, user.password_hash)) return { error: 'Incorrect password' }
  const { token, expires } = createSession(user.id)
  logActivity({ userId: user.id, userName: user.name, action: 'login', resource: 'users', recordId: user.id })
  return {
    token,
    expires,
    user: {
      id: user.id,
      name: user.name,
      username: user.username || null,
      email: user.email,
      role: user.role,
      member_id: user.member_id
    }
  }
}

export function cleanupSessions() {
  try {
    run("DELETE FROM sessions WHERE expires_at < datetime('now')")
  } catch {
    /* ignore */
  }
}

export function activeSessionCount() {
  return all('SELECT COUNT(*) AS c FROM sessions')[0]?.c ?? 0
}
