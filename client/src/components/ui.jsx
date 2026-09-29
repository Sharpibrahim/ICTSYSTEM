import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import Icon from '../icons'
import { initials, initialsColor, toneFor } from '../format'

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

const ToastContext = createContext({ push: () => {} })

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((list) => [...list, { id, type: 'success', ...toast }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), toast.duration || 4200)
  }, [])

  const value = useMemo(
    () => ({
      push,
      success: (title, body) => push({ title, body, type: 'success' }),
      error: (title, body) => push({ title, body, type: 'error', duration: 6000 }),
      info: (title, body) => push({ title, body, type: 'info' })
    }),
    [push]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} role="status">
            <div className="toast__title">{t.title}</div>
            {t.body && <div className="toast__body">{t.body}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

/* ------------------------------------------------------------------ */
/* Basics                                                              */
/* ------------------------------------------------------------------ */

export function Badge({ children, tone, dot = false, className = '' }) {
  const resolved = tone || toneFor(children)
  return <span className={`badge badge--${resolved} ${dot ? 'badge--dot' : ''} ${className}`}>{children}</span>
}

export function StatusBadge({ value }) {
  if (!value) return <span className="muted">—</span>
  return <Badge dot>{value}</Badge>
}

export function Card({ title, subtitle, actions, children, footer, flush = false, className = '', icon }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card__head">
          <div>
            <h3>
              {icon && <Icon name={icon} size={17} />}
              {title}
            </h3>
            {subtitle && <div className="small muted mt-1">{subtitle}</div>}
          </div>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </header>
      )}
      <div className={`card__body ${flush ? 'card__body--flush' : ''}`}>{children}</div>
      {footer && <footer className="card__foot">{footer}</footer>}
    </section>
  )
}

export function Button({ variant = 'default', size, icon, iconRight, loading = false, children, ...rest }) {
  const classes = ['btn']
  if (variant === 'primary') classes.push('btn--primary')
  if (variant === 'ghost') classes.push('btn--ghost')
  if (variant === 'danger') classes.push('btn--danger')
  if (variant === 'success') classes.push('btn--success')
  if (size === 'sm') classes.push('btn--sm')
  if (!children) classes.push('btn--icon')
  return (
    <button type="button" className={classes.join(' ')} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="spinner spinner--dark" /> : icon ? <Icon name={icon} size={size === 'sm' ? 15 : 16} /> : null}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={size === 'sm' ? 15 : 16} />}
    </button>
  )
}

export function Avatar({ name, src, size = 'md' }) {
  const cls = size === 'sm' ? 'avatar avatar--sm' : size === 'lg' ? 'avatar avatar--lg' : 'avatar'
  return (
    <div className={cls} style={{ background: src ? undefined : `${initialsColor(name)}18`, color: initialsColor(name) }}>
      {src ? <img src={src} alt={name || ''} /> : initials(name)}
    </div>
  )
}

export function Person({ name, meta, src, onClick, size = 'md' }) {
  return (
    <div className="person" style={{ cursor: onClick ? 'pointer' : undefined }} onClick={onClick}>
      <Avatar name={name} src={src} size={size} />
      <div style={{ minWidth: 0 }}>
        <div className="person__name">{name || '—'}</div>
        {meta && <div className="person__meta">{meta}</div>}
      </div>
    </div>
  )
}

export function ProgressBar({ value = 0, tone }) {
  const num = Math.max(0, Math.min(100, Number(value) || 0))
  const auto = num >= 70 ? 'green' : num >= 40 ? 'amber' : 'red'
  const cls = tone || auto
  return (
    <div className={`progress progress--${cls}`} style={{ minWidth: 70 }}>
      <div className="progress__bar" style={{ width: `${num}%` }} />
    </div>
  )
}

export function Stat({ label, value, hint, icon, tone = 'brand', trend }) {
  const tones = {
    brand: { bg: 'var(--brand-soft)', color: 'var(--brand-dark)' },
    green: { bg: 'var(--green-soft)', color: '#067647' },
    blue: { bg: 'var(--blue-soft)', color: '#175cd3' },
    amber: { bg: 'var(--amber-soft)', color: '#b54708' },
    red: { bg: 'var(--red-soft)', color: '#b42318' },
    purple: { bg: 'var(--purple-soft)', color: '#7839ad' },
    teal: { bg: 'var(--accent-soft)', color: '#0e7490' }
  }
  const palette = tones[tone] || tones.brand
  return (
    <div className="stat">
      <div className="stat__top">
        <div className="stat__icon" style={{ background: palette.bg, color: palette.color }}>
          <Icon name={icon || 'grid'} size={19} />
        </div>
        {trend !== undefined && trend !== null && (
          <span className={`stat__trend stat__trend--${trend >= 0 ? 'up' : 'down'}`}>
            <Icon name={trend >= 0 ? 'trendingUp' : 'trendingDown'} size={13} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
      {hint && <div className="stat__hint">{hint}</div>}
    </div>
  )
}

export function EmptyState({ title, message, icon = 'grid', action }) {
  return (
    <div className="empty">
      <div className="empty__icon">
        <Icon name={icon} size={22} />
      </div>
      <h3>{title}</h3>
      {message && <p className="small">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="loading-wrap">
      <span className="spinner spinner--dark" />
      {label}
    </div>
  )
}

export function Modal({ open, title, subtitle, onClose, children, footer, size = '' }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${size === 'lg' ? 'modal--lg' : size === 'sm' ? 'modal--sm' : ''}`} role="dialog" aria-modal="true">
        <header className="modal__head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel, loading }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading} icon="trash">
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="muted">{message}</p>
    </Modal>
  )
}

export function Pagination({ page, pages, total, pageSize, onPage }) {
  if (!total) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <div className="pagination">
      <span className="pagination__info">
        {from}–{to} of {total}
      </span>
      <Button size="sm" variant="ghost" icon="chevronLeft" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page" />
      <span className="pagination__info">
        {page} / {pages}
      </span>
      <Button size="sm" variant="ghost" icon="chevronRight" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page" />
    </div>
  )
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? 'is-active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.icon && <Icon name={option.icon} size={14} />}
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button key={tab.value} type="button" className={value === tab.value ? 'is-active' : ''} onClick={() => onChange(tab.value)}>
          {tab.label}
          {tab.count !== undefined && <span className="muted"> ({tab.count})</span>}
        </button>
      ))}
    </div>
  )
}

export function Skeleton({ height = 16, width = '100%', style }) {
  return <div className="skeleton" style={{ height, width, ...style }} />
}

export function KeyValue({ rows }) {
  return (
    <div className="kv">
      {rows
        .filter((row) => row && row.value !== undefined)
        .map((row, index) => (
          <div key={`${row.label}-${index}`} style={{ display: 'contents' }}>
            <div className="kv__k">{row.label}</div>
            <div className="kv__v">{row.value === null || row.value === '' ? <span className="muted">—</span> : row.value}</div>
          </div>
        ))}
    </div>
  )
}
