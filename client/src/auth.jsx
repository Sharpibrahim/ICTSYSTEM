import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  api,
  getStoredUser,
  getToken,
  SESSION_EXPIRED_EVENT,
  setSessionNotice,
  setStoredUser,
  setToken
} from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser())
  const [ready, setReady] = useState(!getToken())
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    let alive = true
    async function bootstrap() {
      if (!getToken()) {
        setReady(true)
        return
      }
      try {
        const { user: me } = await api.me()
        if (!alive) return
        setUser(me)
        setStoredUser(me)
      } catch {
        if (!alive) return
        setToken('')
        setStoredUser(null)
        setUser(null)
      } finally {
        if (alive) setReady(true)
      }
    }
    bootstrap()
    return () => {
      alive = false
    }
  }, [])

  /* When any request is rejected with 401 the API client clears the token and
     fires this event, so the whole app drops to the sign-in screen instead of
     showing error cards on every page. */
  useEffect(() => {
    const onExpired = () => {
      setUser(null)
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [])

  const refreshSettings = useCallback(async () => {
    try {
      const { data } = await api.settings()
      setSettings(data)
      return data
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    if (user) refreshSettings()
  }, [user, refreshSettings])

  const login = useCallback(async (email, password) => {
    const result = await api.login(email, password)
    setToken(result.token)
    setStoredUser(result.user)
    setUser(result.user)
    return result.user
  }, [])

  const signup = useCallback(async (payload) => {
    const result = await api.signup(payload)
    setToken(result.token)
    setStoredUser(result.user)
    setUser(result.user)
    return result.user
  }, [])

  const logout = useCallback(async (notice) => {
    try {
      await api.logout()
    } catch {
      /* the session may already be gone */
    }
    setToken('')
    setStoredUser(null)
    if (notice) setSessionNotice(notice)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      settings,
      refreshSettings,
      login,
      signup,
      logout,
      isAdmin: user?.role === 'admin',
      isCabinet: user?.role === 'admin' || user?.role === 'cabinet',
      can: (roles) => (roles || []).includes(user?.role)
    }),
    [user, ready, settings, refreshSettings, login, signup, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
