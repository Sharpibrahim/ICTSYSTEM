/**
 * Generic resource engine.
 * Every resource declared in shared/schema.js automatically gets:
 *   GET    /api/:resource          list + search + filter + sort + pagination
 *   GET    /api/:resource/:id      single record (with joined labels + relations)
 *   POST   /api/:resource          create  (validated, permission checked)
 *   PATCH  /api/:resource/:id      partial update
 *   DELETE /api/:resource/:id      delete
 */
import { Router } from 'express'
import crypto from 'node:crypto'
import { all, count, deleteRow, get, insert, logActivity, run, updateRow } from './db.js'
import { hashPassword, requireAuth } from './auth.js'
import { OPTION_SETS, RESOURCE_MAP, resourceByKey, writableFields } from '../../shared/schema.js'

const POLY_TARGETS = {
  meeting: { table: 'meetings', label: 'title' },
  activity: { table: 'activities', label: 'title' },
  course: { table: 'courses', label: 'title' },
  project: { table: 'projects', label: 'title' }
}

/* Fields used for the "type + id" polymorphic reference, per resource. */
const POLY = {
  attendance: { typeKey: 'ref_type', idKey: 'ref_id', labelKey: 'ref_label' },
  reports: { typeKey: 'related_type', idKey: 'related_id', labelKey: 'related_label' },
  certificates: { typeKey: 'related_type', idKey: 'related_id', labelKey: 'related_label' }
}

/* Derived columns that make list screens much more useful. */
const COMPUTED = {
  members: {
    attendance_rate: `(SELECT ROUND(100.0 * SUM(CASE WHEN a.status IN ('Present','Late') THEN 1 ELSE 0 END) / COUNT(*), 1) FROM attendance a WHERE a.member_id = t.id)`,
    registrations: `(SELECT COUNT(*) FROM enrollments e WHERE e.member_id = t.id)`,
    certificates: `(SELECT COUNT(*) FROM certificates c WHERE c.recipient_id = t.id)`,
    projects_joined: `(SELECT COUNT(*) FROM project_members pm WHERE pm.member_id = t.id)`
  },
  courses: {
    enrolled_count: `(SELECT COUNT(*) FROM enrollments e WHERE e.course_id = t.id)`,
    completed_count: `(SELECT COUNT(*) FROM enrollments e WHERE e.course_id = t.id AND e.status = 'Completed')`
  },
  projects: {
    team_size: `(SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = t.id)`,
    task_count: `(SELECT COUNT(*) FROM project_tasks pt WHERE pt.project_id = t.id)`,
    open_tasks: `(SELECT COUNT(*) FROM project_tasks pt WHERE pt.project_id = t.id AND pt.status <> 'Done')`
  },
  meetings: {
    present_count: `(SELECT COUNT(*) FROM attendance a WHERE a.ref_type = 'meeting' AND a.ref_id = t.id AND a.status IN ('Present','Late'))`,
    absent_count: `(SELECT COUNT(*) FROM attendance a WHERE a.ref_type = 'meeting' AND a.ref_id = t.id AND a.status = 'Absent')`,
    attendance_total: `(SELECT COUNT(*) FROM attendance a WHERE a.ref_type = 'meeting' AND a.ref_id = t.id)`
  },
  activities: {
    attendance_total: `(SELECT COUNT(*) FROM attendance a WHERE a.ref_type = 'activity' AND a.ref_id = t.id)`
  },
  cabinet: {
    attendance_rate: `(SELECT ROUND(100.0 * SUM(CASE WHEN a.status IN ('Present','Late') THEN 1 ELSE 0 END) / COUNT(*), 1) FROM attendance a WHERE a.member_id = t.member_id)`
  }
}

const HIDDEN_COLUMNS = { users: ['password_hash'] }

const quote = (id) => `"${String(id).replace(/"/g, '')}"`

function polyLabelSql(resourceKey, sqlAlias = 't') {
  const spec = POLY[resourceKey]
  if (!spec) return null
  const cases = Object.entries(POLY_TARGETS)
    .map(([type, target]) => `WHEN '${type}' THEN (SELECT ${quote(target.label)} FROM ${quote(target.table)} WHERE id = ${sqlAlias}.${quote(spec.idKey)})`)
    .join(' ')
  return `CASE ${sqlAlias}.${quote(spec.typeKey)} ${cases} END`
}

function selectClause(resource) {
  const cols = ['t.*']
  for (const field of resource.fields) {
    if (field.type === 'ref') {
      const target = RESOURCE_MAP[field.resource]
      const labelCol = target ? target.titleKey : 'id'
      const alias = `r_${field.key}`
      cols.push(`${quote(alias)}.${quote(labelCol)} AS ${quote(`${field.key}_label`)}`)
      if (target && target.subtitleKey) {
        cols.push(`${quote(alias)}.${quote(target.subtitleKey)} AS ${quote(`${field.key}_sub`)}`)
      }
    }
  }
  for (const [key, expr] of Object.entries(COMPUTED[resource.key] || {})) {
    cols.push(`${expr} AS ${quote(key)}`)
  }
  const poly = polyLabelSql(resource.key)
  if (poly) cols.push(`${poly} AS ${quote(POLY[resource.key].labelKey)}`)
  return cols.join(', ')
}

function joinClause(resource) {
  return resource.fields
    .filter((f) => f.type === 'ref')
    .map((f) => `LEFT JOIN ${quote(RESOURCE_MAP[f.resource].table)} r_${f.key} ON r_${f.key}.id = t.${quote(f.key)}`)
    .join('\n')
}

function visibleRow(resource, row) {
  if (!row) return row
  const out = { ...row }
  for (const col of HIDDEN_COLUMNS[resource.key] || []) delete out[col]
  return out
}

/* ------------------------------------------------------------------ */
/* ROW LEVEL ACCESS                                                    */
/* ------------------------------------------------------------------ */

/** Restricts which rows a user may even see. Returns { sql, params } where
    `sql` is a bare condition fragment (no leading AND), or '' when unrestricted. */
export function rowScope(resource, user) {
  const parts = []
  const params = []
  if (!user) return { sql: '1 = 0', params }
  if (resource.key === 'users' && user.role !== 'admin') {
    return { sql: 't.id = ?', params: [user.id] }
  }
  if (resource.key === 'notes' && user.role === 'member') {
    parts.push("(t.visibility = 'Public' OR t.author_id = ?)")
    params.push(user.member_id ?? -1)
  }
  return { sql: parts.join(' AND '), params }
}

export function canWriteRow(resource, user, row = null) {
  if (!user) return false
  if (user.role === 'admin') return true
  if ((resource.write || []).includes(user.role)) return true
  if (user.role === 'member' && resource.memberWrite) {
    if (!row) return true
    if (!resource.ownerKey) return true
    return Number(row[resource.ownerKey]) === Number(user.member_id)
  }
  return false
}

export function canDeleteRow(resource, user, row) {
  if (!user) return false
  if (user.role === 'admin') return true
  if ((resource.write || []).includes(user.role)) return true
  if (user.role === 'member' && resource.memberWrite && resource.ownerKey) {
    return Number(row?.[resource.ownerKey]) === Number(user.member_id)
  }
  return false
}

/* ------------------------------------------------------------------ */
/* VALIDATION + COERCION                                               */
/* ------------------------------------------------------------------ */

export function sanitizePayload(resource, body, { partial = false, user = null, existing = null } = {}) {
  const fields = writableFields(resource)
  const data = {}
  const errors = []

  for (const field of fields) {
    const provided = Object.prototype.hasOwnProperty.call(body, field.key)
    if (!provided) {
      if (!partial) {
        if (field.required && !field.virtual && field.type !== 'dynamicRef') {
          errors.push(`${field.label} is required`)
        } else if (field.default !== undefined) {
          data[field.key] = field.default
        }
      }
      continue
    }
    let value = body[field.key]
    switch (field.type) {
      case 'number':
      case 'currency':
      case 'percentage': {
        if (value === '' || value === null || value === undefined) value = null
        else {
          const num = Number(value)
          if (Number.isNaN(num)) {
            errors.push(`${field.label} must be a number`)
            continue
          }
          value = field.type === 'percentage' ? Math.max(0, Math.min(100, Math.round(num))) : num
        }
        break
      }
      case 'checkbox':
        value = value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0
        break
      case 'tags':
        value = Array.isArray(value) ? value.join(', ') : value === null ? null : String(value).trim()
        break
      case 'email':
        if (value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value))) {
          errors.push(`${field.label} must be a valid email address`)
          continue
        }
        break
      default:
        if (value === undefined) value = null
        if (typeof value === 'string') value = value.trim() || null
    }
    data[field.key] = value
  }

  if (errors.length) return { errors }

  // Members may only create content they own, and cannot approve their own work.
  if (user && user.role === 'member') {
    if (resource.ownerKey && !data[resource.ownerKey]) data[resource.ownerKey] = user.member_id
    if (resource.ownerKey && Number(data[resource.ownerKey]) !== Number(user.member_id)) {
      return { errors: [`You can only manage your own ${resource.singular.toLowerCase()} records`] }
    }
    if (resource.key === 'reports') {
      const allowed = ['Draft', 'Submitted']
      const desired = data.status ?? existing?.status ?? 'Draft'
      if (!allowed.includes(desired)) data.status = 'Draft'
    }
  }

  // Required check for partial updates on already-existing records is skipped.
  return { data }
}

function applyHooks(resource, data, { id = null, existing = null } = {}) {
  const today = new Date().toISOString().slice(0, 10)

  if (resource.key === 'attendance') {
    const type = data.ref_type ?? existing?.ref_type
    const refId = data.ref_id ?? existing?.ref_id
    if (type && refId && POLY_TARGETS[type]) {
      const target = POLY_TARGETS[type]
      const row = get(`SELECT ${quote(target.label)} AS label FROM ${quote(target.table)} WHERE id = ?`, [refId])
      if (row?.label) data.session_title = row.label
    }
    if (!data.session_title && !existing) data.session_title = 'Session'
    if (!data.session_date && !existing) data.session_date = today
  }

  if (resource.key === 'certificates') {
    if (!data.certificate_no && !existing?.certificate_no) {
      const year = new Date().getFullYear()
      const seq = count('SELECT COUNT(*) FROM certificates') + 1
      data.certificate_no = `ICTC/${year}/${String(seq).padStart(4, '0')}`
    }
    if (!data.verification_code && !existing?.verification_code) {
      data.verification_code = `ICT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
    }
    if (!data.issue_date && !existing?.issue_date) data.issue_date = today
  }

  if (resource.key === 'enrollments') {
    if (!data.enrolled_date && !existing?.enrolled_date) data.enrolled_date = today
  }

  if (resource.key === 'reports') {
    const status = data.status ?? existing?.status
    if (status && ['Submitted', 'Under Review', 'Approved'].includes(status) && !(data.submitted_at ?? existing?.submitted_at)) {
      data.submitted_at = today
    }
  }

  if (resource.key === 'projects') {
    const status = data.status ?? existing?.status
    if (status === 'Completed' && !(data.completed_date ?? existing?.completed_date)) data.completed_date = today
    if (status === 'Completed' && !data.progress && !existing?.progress) data.progress = 100
  }

  if (resource.key === 'project_tasks') {
    if ((data.status ?? existing?.status) === 'Done' && !data.progress && !existing?.progress) data.progress = 100
  }

  if (resource.key === 'cabinet' && !data.order_index && !existing?.order_index) {
    const position = data.position ?? existing?.position
    const idx = OPTION_SETS.cabinetPositions.indexOf(position)
    if (idx >= 0) data.order_index = idx + 1
  }

  return data
}

/* ------------------------------------------------------------------ */
/* READ HELPERS                                                        */
/* ------------------------------------------------------------------ */

const OPERATORS = { eq: '=', ne: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'LIKE' }

export function buildWhere(resource, query, user) {
  const where = []
  const params = []
  const scope = rowScope(resource, user)
  where.push('1 = 1')
  if (scope.sql) where.push(scope.sql)

  const fieldByKey = Object.fromEntries(resource.fields.map((f) => [f.key, f]))
  const sortableExtra = new Set([...Object.keys(COMPUTED[resource.key] || {}), 'id'])

  for (const [rawKey, rawValue] of Object.entries(query)) {
    if (['q', 'page', 'pageSize', 'sort', 'limit', 'offset', 'ids', 'format', 'all'].includes(rawKey)) continue
    if (rawValue === '' || rawValue === null || rawValue === undefined) continue
    const [key, op = 'eq'] = rawKey.split('__')
    const field = fieldByKey[key]
    if (!field && key !== 'id' && !sortableExtra.has(key)) continue
    const column = quote(key)

    if (op === 'in') {
      const values = String(rawValue).split(',').filter(Boolean)
      if (!values.length) continue
      where.push(`t.${column} IN (${values.map(() => '?').join(', ')})`)
      params.push(...coerceList(field, values))
      continue
    }
    if (op === 'null') {
      where.push(rawValue === 'true' || rawValue === '1' ? `t.${column} IS NULL` : `t.${column} IS NOT NULL`)
      continue
    }
    if (op === 'like') {
      where.push(`t.${column} LIKE ?`)
      params.push(`%${rawValue}%`)
      continue
    }
    const sqlOp = OPERATORS[op] || '='
    where.push(`t.${column} ${sqlOp} ?`)
    params.push(coerceValue(field, rawValue))
  }

  if (query.ids) {
    const ids = String(query.ids).split(',').map((v) => Number(v)).filter((v) => Number.isFinite(v))
    if (ids.length) {
      where.push(`t.id IN (${ids.map(() => '?').join(', ')})`)
      params.push(...ids)
    }
  }

  if (query.q) {
    const term = `%${String(query.q).trim()}%`
    const searchCols = resource.fields.filter((f) => f.search && !f.virtual && !POLY[resource.key]).map((f) => `t.${quote(f.key)}`)
    const poly = polyLabelSql(resource.key)
    if (poly) searchCols.push(poly)
    for (const field of resource.fields.filter((f) => f.type === 'ref')) {
      const target = RESOURCE_MAP[field.resource]
      if (target) searchCols.push(`r_${field.key}.${quote(target.titleKey)}`)
    }
    if (searchCols.length) {
      where.push(`(${searchCols.map((c) => `${c} LIKE ?`).join(' OR ')})`)
      searchCols.forEach(() => params.push(term))
    }
  }

  return { sql: where.join(' AND '), params: [...scope.params, ...params] }
}

function coerceValue(field, value) {
  if (!field) return value
  if (['number', 'currency', 'percentage', 'checkbox'].includes(field.type)) return Number(value)
  return value
}

function coerceList(field, values) {
  if (!field) return values
  if (['number', 'currency', 'percentage', 'checkbox'].includes(field.type)) return values.map(Number)
  return values
}

function buildOrder(resource, sortParam) {
  const fieldByKey = Object.fromEntries(resource.fields.map((f) => [f.key, f]))
  const allowedExtra = new Set([...Object.keys(COMPUTED[resource.key] || {}), 'id'])
  const requested = sortParam || resource.defaultSort || 'id'
  const parts = String(requested)
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const desc = token.startsWith('-')
      const key = desc ? token.slice(1) : token
      if (!fieldByKey[key] && !allowedExtra.has(key)) return null
      return `t.${quote(key)} ${desc ? 'DESC' : 'ASC'}`
    })
    .filter(Boolean)
  if (!parts.length) parts.push('t.id DESC')
  parts.push('t.id DESC')
  return parts.join(', ')
}

export function listResource(resource, query, user) {
  const { sql: whereSql, params } = buildWhere(resource, query, user)
  const page = Math.max(1, Number(query.page) || 1)
  const rawPageSize = Number(query.pageSize) || 50
  const pageSize = query.all ? 100000 : Math.min(500, Math.max(1, rawPageSize))
  const offset = (page - 1) * pageSize
  const order = buildOrder(resource, query.sort)
  const joins = joinClause(resource)

  const total = count(`SELECT COUNT(*) AS c FROM ${quote(resource.table)} t ${joins} WHERE ${whereSql}`, params)
  const rows = all(
    `SELECT ${selectClause(resource)} FROM ${quote(resource.table)} t ${joins} WHERE ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  return {
    data: rows.map((r) => visibleRow(resource, r)),
    total,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(total / pageSize))
  }
}

export function getResource(resource, id, user) {
  const joins = joinClause(resource)
  const { sql: scopeSql, params: scopeParams } = rowScope(resource, user)
  const row = get(
    `SELECT ${selectClause(resource)} FROM ${quote(resource.table)} t ${joins} WHERE t.id = ?${scopeSql ? ` AND ${scopeSql}` : ''}`,
    [id, ...scopeParams]
  )
  return row ? visibleRow(resource, row) : null
}

/** Related records shown on a detail page (e.g. a meeting's attendance register). */
const RELATIONS = {
  meetings: [{ resource: 'attendance', foreignKey: 'ref_id', label: 'Attendance register', matchOn: { ref_type: 'meeting' }, limit: 200 }],
  activities: [{ resource: 'attendance', foreignKey: 'ref_id', label: 'Attendance register', matchOn: { ref_type: 'activity' }, limit: 200 }],
  courses: [
    { resource: 'enrollments', foreignKey: 'course_id', label: 'Enrolled learners', limit: 200 },
    { resource: 'attendance', foreignKey: 'ref_id', label: 'Session attendance', matchOn: { ref_type: 'course' }, limit: 200 }
  ],
  projects: [
    { resource: 'project_members', foreignKey: 'project_id', label: 'Project team', limit: 100 },
    { resource: 'project_tasks', foreignKey: 'project_id', label: 'Tasks', limit: 200 },
    { resource: 'project_tasks', foreignKey: 'project_id', label: 'Open tasks', matchOn: { status__ne: 'Done' }, limit: 200 }
  ],
  members: [
    { resource: 'cabinet', foreignKey: 'member_id', label: 'Cabinet positions', limit: 20 },
    { resource: 'enrollments', foreignKey: 'member_id', label: 'Course registrations', limit: 50 },
    { resource: 'certificates', foreignKey: 'recipient_id', label: 'Certificates', limit: 50 },
    { resource: 'project_members', foreignKey: 'member_id', label: 'Project teams', limit: 50 },
    { resource: 'attendance', foreignKey: 'member_id', label: 'Attendance history', limit: 50 }
  ],
  users: [{ resource: 'cabinet', foreignKey: 'member_id', label: 'Cabinet positions', limit: 20 }]
}

export function relationsFor(resource, id, user) {
  const specs = RELATIONS[resource.key]
  if (!specs) return []
  const seen = new Set()
  return specs
    .filter((spec) => {
      const key = `${spec.resource}:${spec.label}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((spec) => {
      const target = resourceByKey(spec.resource)
      if (!target) return null
      const query = {
        [`${spec.foreignKey}__eq`]: String(id),
        pageSize: String(spec.limit || 100),
        sort: spec.sort || undefined,
        ...(spec.matchOn || {})
      }
      const result = listResource(target, query, user)
      const filterQuery = {}
      for (const [k, v] of Object.entries(query)) {
        if (['pageSize', 'sort', 'page'].includes(k)) continue
        filterQuery[k] = v
      }
      return {
        key: `${spec.resource}-${spec.label}`,
        label: spec.label,
        resource: spec.resource,
        records: result.data,
        total: result.total,
        query: filterQuery
      }
    })
    .filter(Boolean)
}

/* ------------------------------------------------------------------ */
/* ROUTER                                                              */
/* ------------------------------------------------------------------ */

export function resourceRouter(key) {
  const resource = resourceByKey(key)
  if (!resource) throw new Error(`Unknown resource: ${key}`)
  const router = Router()

  router.use(requireAuth)

  router.get('/', (req, res) => {
    res.json(listResource(resource, req.query, req.user))
  })

  router.get('/:id', (req, res) => {
    const row = getResource(resource, Number(req.params.id), req.user)
    if (!row) return res.status(404).json({ error: `${resource.singular} not found` })
    res.json({ data: row, relations: relationsFor(resource, Number(req.params.id), req.user) })
  })

  router.post('/', (req, res) => {
    if (!canWriteRow(resource, req.user)) {
      return res.status(403).json({ error: `You do not have permission to create ${resource.label.toLowerCase()}` })
    }
    if (resource.key === 'users' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can manage user accounts' })
    }
    const { data, errors } = sanitizePayload(resource, req.body || {}, { user: req.user })
    if (errors) return res.status(400).json({ error: errors.join('. '), errors })

    const payload = applyHooks(resource, { ...data })
    if (resource.key === 'users') {
      if (!payload.password) return res.status(400).json({ error: 'Password is required for a new account' })
      if (String(payload.password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
      payload.password_hash = hashPassword(payload.password)
      delete payload.password
      const dupe = get('SELECT id FROM users WHERE lower(email) = lower(?)', [payload.email])
      if (dupe) return res.status(400).json({ error: 'An account with that email already exists' })
    }
    const id = insert(resource.table, payload)
    logActivity({ userId: req.user.id, userName: req.user.name, action: 'create', resource: resource.key, recordId: id, detail: payload.title || payload.full_name || payload.name || payload.position || '' })
    res.status(201).json({ data: getResource(resource, id, req.user), id })
  })

  const patch = (req, res) => {
    const id = Number(req.params.id)
    const existing = getResource(resource, id, req.user)
    if (!existing) return res.status(404).json({ error: `${resource.singular} not found` })
    if (!canWriteRow(resource, req.user, existing)) {
      return res.status(403).json({ error: `You do not have permission to edit this ${resource.singular.toLowerCase()}` })
    }
    const { data, errors } = sanitizePayload(resource, req.body || {}, { partial: true, user: req.user, existing })
    if (errors) return res.status(400).json({ error: errors.join('. '), errors })

    const payload = applyHooks(resource, { ...data }, { id, existing })
    if (resource.key === 'users') {
      if (payload.password) {
        if (String(payload.password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
        payload.password_hash = hashPassword(payload.password)
      }
      delete payload.password
      if (payload.email) {
        const dupe = get('SELECT id FROM users WHERE lower(email) = lower(?) AND id <> ?', [payload.email, id])
        if (dupe) return res.status(400).json({ error: 'Another account already uses that email' })
      }
    }
    payload.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19)
    updateRow(resource.table, id, payload)
    logActivity({ userId: req.user.id, userName: req.user.name, action: 'update', resource: resource.key, recordId: id, detail: Object.keys(payload).filter((k) => k !== 'updated_at').join(', ') })
    res.json({ data: getResource(resource, id, req.user) })
  }

  router.patch('/:id', patch)
  router.put('/:id', patch)

  router.delete('/:id', (req, res) => {
    const id = Number(req.params.id)
    const existing = getResource(resource, id, req.user)
    if (!existing) return res.status(404).json({ error: `${resource.singular} not found` })
    if (!canDeleteRow(resource, req.user, existing)) {
      return res.status(403).json({ error: `You do not have permission to delete this ${resource.singular.toLowerCase()}` })
    }
    if (resource.key === 'users' && Number(id) === Number(req.user.id)) {
      return res.status(400).json({ error: 'You cannot delete the account you are signed in with' })
    }
    deleteRow(resource.table, id)
    logActivity({ userId: req.user.id, userName: req.user.name, action: 'delete', resource: resource.key, recordId: id })
    res.json({ ok: true, id })
  })

  return router
}

/* ------------------------------------------------------------------ */
/* CSV EXPORT                                                          */
/* ------------------------------------------------------------------ */

export function resourceLabelMap(resource) {
  return Object.fromEntries(resource.fields.map((f) => [f.key, f.label]))
}

export function toCsv(resource, rows) {
  const fields = resource.fields.filter((f) => f.type !== 'password')
  const keys = ['id', ...fields.map((f) => f.key)]
  const labels = ['ID', ...fields.map((f) => f.label)]
  const esc = (v) => {
    if (v === null || v === undefined) return ''
    const s = String(v).replace(/\r?\n/g, ' ')
    return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = labels.map(esc).join(',')
  const body = rows.map((row) =>
    keys
      .map((k) => {
        if (row[k] !== undefined) return esc(row[k])
        const labelKey = `${k}_label`
        return esc(row[labelKey])
      })
      .join(',')
  )
  return [head, ...body].join('\n')
}

export { run, insert, updateRow, get, all, count }
