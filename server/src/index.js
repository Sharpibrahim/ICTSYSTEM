/**
 * ICT Club Management System — API server
 * Express + Node's built-in SQLite. Also serves the built web client in
 * production so the whole system runs from one process / one port.
 */
import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RESOURCES, resourceByKey } from '../../shared/schema.js'
import { DEFAULT_SETTINGS, DB_PATH, db, getSettings, run } from './db.js'
import { resourceRouter } from './crud.js'
import api from './routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 4000)
const HOST = process.env.HOST || '0.0.0.0'

const app = express()

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '5mb' }))

// Simple request log so the API is easy to follow while developing.
app.use((req, _res, next) => {
  if (req.path !== '/api/health') {
    console.log(`${new Date().toISOString().slice(11, 19)}  ${req.method} ${req.originalUrl}`)
  }
  next()
})

app.use('/api', api)

for (const resource of RESOURCES) {
  app.use(`/api/${resource.key}`, resourceRouter(resource.key))
}

// Serve the built client when it exists (single-port deployment).
const clientDist = path.resolve(__dirname, '../../client/dist')
if (fs.existsSync(clientDist)) {
  app.use(
    express.static(clientDist, {
      /* The bundles are content-hashed, so they can be cached hard, but
         index.html must always be revalidated or a browser can keep running
         an old build after an upgrade. */
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache, must-revalidate')
      }
    })
  )
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate')
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}` }))

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[api error]', err)
  res.status(500).json({ error: err.message || 'Something went wrong' })
})

function ensureDefaults() {
  const existing = getSettings()
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (!(key in existing) || existing[key] === undefined) {
      run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, String(value)])
    }
  }
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get()
  if (!userCount || Number(userCount.c) === 0) {
    console.log('\n  No user accounts found — run `npm run db:seed` to load demo data,')
    console.log('  or create an administrator with:  npm run db:seed\n')
  }
}

ensureDefaults()

app.listen(PORT, HOST, () => {
  const settings = getSettings()
  console.log(`\n  ${settings.club_name} — Club Management System API`)
  console.log(`  running at  http://localhost:${PORT}`)
  console.log(`  database    ${DB_PATH}`)
  console.log(`  resources   ${RESOURCES.map((r) => r.key).join(', ')}\n`)
})

export { app, resourceByKey }
