import { useEffect, useMemo, useState } from 'react'
import Icon from '../icons'
import { Button, Loading } from './ui'
import { invalidateOptions, useOptions } from '../hooks'
import { writableFields } from '../../../shared/schema'

const DYNAMIC_RESOURCE = { meeting: 'meetings', activity: 'activities', course: 'courses', project: 'projects' }

function optionValue(option) {
  return typeof option === 'object' ? option.value : option
}
function optionLabel(option) {
  return typeof option === 'object' ? option.label : option
}

/** Single reference field backed by /api/options/:resource */
function RefField({ field, value, onChange, id, disabled }) {
  const { options, loading } = useOptions(field.resource)
  return (
    <select
      id={id}
      className="select"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      disabled={loading || disabled}
    >
      <option value="">{loading ? 'Loading…' : `Select ${field.label.toLowerCase()}`}</option>
      {options.map((option) => (
        <option key={optionValue(option)} value={optionValue(option)}>
          {optionLabel(option)}
          {option.sub ? ` — ${option.sub}` : ''}
        </option>
      ))}
    </select>
  )
}

/** Polymorphic reference: e.g. attendance session (meeting / activity / course / project) */
function DynamicRefField({ field, typeValue, value, onChange, extra, id, disabled }) {
  const resource = DYNAMIC_RESOURCE[typeValue]
  const { options, loading } = useOptions(resource)
  const current = options.find((o) => Number(optionValue(o)) === Number(value))
  return (
    <div className="flex gap-1" style={{ flexDirection: 'column' }}>
      <select
        id={id}
        className="select"
        value={value ?? ''}
        disabled={!resource || loading || disabled}
        onChange={(e) => {
          const selected = options.find((o) => String(optionValue(o)) === e.target.value)
          onChange(selected ? Number(optionValue(selected)) : null, selected)
        }}
      >
        <option value="">
          {!typeValue ? 'Pick the session type first' : loading ? 'Loading…' : options.length ? `Select ${DYNAMIC_RESOURCE[typeValue]}` : 'No records yet'}
        </option>
        {options.map((option) => (
          <option key={optionValue(option)} value={optionValue(option)}>
            {optionLabel(option)}
            {option.sub ? ` — ${option.sub}` : ''}
          </option>
        ))}
      </select>
      {current?.sub && (
        <span className="field__help">
          {current.label} • {current.sub}
        </span>
      )}
      {extra}
    </div>
  )
}

function TagsField({ value, onChange, placeholder }) {
  const tags = useMemo(
    () =>
      String(value || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    [value]
  )
  const [draft, setDraft] = useState('')

  const commit = () => {
    const parts = draft
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    if (!parts.length) return
    const next = [...new Set([...tags, ...parts])]
    onChange(next.join(', '))
    setDraft('')
  }

  return (
    <div className="chip-input">
      {tags.map((tag) => (
        <span className="chip" key={tag}>
          {tag}
          <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag).join(', '))} aria-label={`Remove ${tag}`}>
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        placeholder={placeholder || 'Type and press Enter'}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            commit()
          }
          if (e.key === 'Backspace' && !draft && tags.length) {
            onChange(tags.slice(0, -1).join(', '))
          }
        }}
        onBlur={commit}
      />
    </div>
  )
}

export default function RecordForm({ resource, initial = {}, onSubmit, onCancel, submitting = false, readOnly = false }) {
  const fields = useMemo(() => writableFields(resource).filter((f) => f.type !== 'password' || resource.key === 'users'), [resource])
  const [values, setValues] = useState({})
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const base = {}
    for (const field of fields) {
      const existing = initial?.[field.key]
      base[field.key] = existing === undefined || existing === null ? (field.default !== undefined ? field.default : '') : existing
    }
    base.password = ''
    setValues(base)
    setErrors({})
  }, [resource.key, initial, fields])

  const set = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  const groups = useMemo(() => {
    const map = new Map()
    for (const field of fields) {
      const group = field.formGroup || 'Details'
      if (!map.has(group)) map.set(group, [])
      map.get(group).push(field)
    }
    // "Details" should always render first
    const entries = [...map.entries()]
    entries.sort((a, b) => (a[0] === 'Details' ? -1 : b[0] === 'Details' ? 1 : 0))
    return entries
  }, [fields])

  const validate = () => {
    const next = {}
    for (const field of fields) {
      if (field.type === 'dynamicRef') continue
      const value = values[field.key]
      if (field.required && (value === '' || value === null || value === undefined)) {
        next[field.key] = `${field.label} is required`
      }
      if (field.type === 'email' && value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value))) {
        next[field.key] = 'Enter a valid email address'
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (readOnly) return onCancel?.()
    if (!validate()) {
      const first = document.querySelector('.field__error')
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const payload = {}
    for (const field of fields) {
      const value = values[field.key]
      if (field.type === 'checkbox') payload[field.key] = Number(value) ? 1 : 0
      else if (field.type === 'number' || field.type === 'currency' || field.type === 'percentage' || field.type === 'ref') {
        payload[field.key] = value === '' || value === null || value === undefined ? null : Number(value)
      } else if (field.type === 'dynamicRef') {
        payload[field.key] = value === '' || value === null || value === undefined ? null : Number(value)
      } else if (value === '') {
        payload[field.key] = null
      } else {
        payload[field.key] = value
      }
    }
    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit}>
      {groups.map(([group, groupFields]) => (
        <div key={group}>
          {groups.length > 1 && <div className="form-section">{group}</div>}
          <div className="form-grid">
            {groupFields.map((field) => {
              const value = values[field.key] ?? ''
              const error = errors[field.key]
              const common = { id: `f-${field.key}`, disabled: readOnly }
              const label = (
                <label className="field__label" htmlFor={`f-${field.key}`}>
                  {field.label}
                  {field.required && <span className="req">*</span>}
                </label>
              )
              const help = field.help && !error ? <span className="field__help">{field.help}</span> : null

              let control = null
              switch (field.type) {
                case 'textarea':
                  control = (
                    <textarea
                      {...common}
                      className="textarea"
                      rows={field.rows || 4}
                      value={value}
                      placeholder={field.placeholder}
                      onChange={(e) => set(field.key, e.target.value)}
                    />
                  )
                  break
                case 'select':
                  control = (
                    <select {...common} className="select" value={value} onChange={(e) => set(field.key, e.target.value)}>
                      <option value="">Select {field.label.toLowerCase()}</option>
                      {(field.options || []).map((option) => (
                        <option key={optionValue(option)} value={optionValue(option)}>
                          {optionLabel(option)}
                        </option>
                      ))}
                    </select>
                  )
                  break
                case 'ref':
                  control = <RefField field={field} value={value} onChange={(v) => set(field.key, v)} id={common.id} disabled={readOnly} />
                  break
                case 'dynamicRef':
                  control = (
                    <DynamicRefField
                      field={field}
                      id={common.id}
                      disabled={readOnly}
                      typeValue={values[field.dependsOn]}
                      value={value}
                      onChange={(v, selected) => {
                        set(field.key, v)
                        if (selected && field.dependsOn) {
                          if (values.session_title !== undefined) set('session_title', selected.label)
                          if (values.session_date !== undefined && selected.sub) {
                            const datePart = String(selected.sub).match(/\d{4}-\d{2}-\d{2}/)
                            if (datePart) set('session_date', datePart[0])
                          }
                        }
                      }}
                    />
                  )
                  break
                case 'tags':
                  control = <TagsField value={value} onChange={(v) => set(field.key, v)} placeholder={field.placeholder} />
                  break
                case 'checkbox':
                  return (
                    <div className="field field--checkbox" key={field.key}>
                      <input
                        id={`f-${field.key}`}
                        type="checkbox"
                        className="checkbox"
                        checked={Boolean(Number(value))}
                        disabled={readOnly}
                        onChange={(e) => set(field.key, e.target.checked ? 1 : 0)}
                      />
                      <label className="field__label" htmlFor={`f-${field.key}`} style={{ marginBottom: 0 }}>
                        {field.label}
                      </label>
                      {help}
                    </div>
                  )
                default:
                  control = (
                    <input
                      {...common}
                      className="input"
                      type={
                        field.type === 'number' || field.type === 'currency' || field.type === 'percentage'
                          ? 'number'
                          : field.type === 'date' || field.type === 'time'
                            ? field.type
                            : field.type
                      }
                      step={field.type === 'percentage' ? 1 : field.type === 'currency' ? 0.01 : undefined}
                      min={field.type === 'percentage' ? 0 : undefined}
                      max={field.type === 'percentage' ? 100 : undefined}
                      value={value}
                      placeholder={field.placeholder}
                      onChange={(e) => set(field.key, e.target.value)}
                    />
                  )
              }

              const isWide = field.type === 'textarea'
              return (
                <div className="field" key={field.key} style={isWide ? { gridColumn: '1 / -1' } : undefined}>
                  {label}
                  {control}
                  {error ? <span className="field__error">{error}</span> : help}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {resource.key === 'users' && initial?.id && (
        <p className="field__help">
          <Icon name="alert" size={13} /> Leave the password blank to keep the current password.
        </p>
      )}

      <div className="flex justify-between items-center gap-2 mt-2">
        <span className="small muted">{readOnly ? 'Read-only view' : 'Fields marked * are required'}</span>
        <div className="flex gap-1">
          <Button onClick={onCancel}>{readOnly ? 'Close' : 'Cancel'}</Button>
          {!readOnly && (
            <Button type="submit" variant="primary" icon="check" loading={submitting}>
              Save
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}

export { Loading, invalidateOptions }
