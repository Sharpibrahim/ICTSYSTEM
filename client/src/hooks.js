import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api'

/* Simple module-level cache so the same dropdown list is fetched once. */
const optionCache = new Map()

export function useOptions(resourceKey, { force = false } = {}) {
  const [options, setOptions] = useState(optionCache.get(resourceKey) || [])
  const [loading, setLoading] = useState(!optionCache.has(resourceKey))

  const load = useCallback(async () => {
    if (!resourceKey) return
    if (optionCache.has(resourceKey) && !force) {
      setOptions(optionCache.get(resourceKey))
      return
    }
    setLoading(true)
    try {
      const { data } = await api.options(resourceKey)
      optionCache.set(resourceKey, data)
      setOptions(data)
    } catch {
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [resourceKey, force])

  useEffect(() => {
    load()
  }, [load])

  return { options, loading, reload: load }
}

export function invalidateOptions(resourceKey) {
  if (resourceKey) optionCache.delete(resourceKey)
  else optionCache.clear()
}

/** Debounced value — used by the global search box. */
export function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** Data loading helper with manual refresh + loading/error state. */
export function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [state, setState] = useState({ data: null, loading: immediate, error: null })
  const fnRef = useRef(fn)
  fnRef.current = fn
  /* Requests can overlap: a screen that opens while it is still settling fires
     an unfiltered fetch and a filtered one, and typing in a search box fires
     one per keystroke. Only the newest request may write state — otherwise a
     slower earlier reply lands last and the list shows results for the query
     the user has already replaced. */
  const runIdRef = useRef(0)

  const run = useCallback(async (...args) => {
    const runId = runIdRef.current + 1
    runIdRef.current = runId
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await fnRef.current(...args)
      if (runId === runIdRef.current) setState({ data, loading: false, error: null })
      return data
    } catch (error) {
      if (runId === runIdRef.current) {
        setState({ data: null, loading: false, error: error.message || 'Something went wrong' })
      }
      return null
    }
  }, [])

  useEffect(() => {
    if (immediate) run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) }
}

export function useLocalState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* ignore quota errors */
    }
  }, [key, value])
  return [value, setValue]
}

/** Groups options into a Map for fast label lookups. */
export function useOptionMap(options) {
  return useMemo(() => new Map(options.map((o) => [Number(o.value), o])), [options])
}
