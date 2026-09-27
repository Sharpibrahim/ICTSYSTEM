/**
 * Test runner.
 *
 * Runs the API checks and the UI suites against their OWN database and API
 * server, so a test run can never touch the school's live data or sign out
 * anyone using the app. The suites include a demo-data reload, which replaces
 * every record — harmless on a throwaway database, disruptive on a real one.
 *
 *   npm test               # all suites, isolated database + API on port 4100
 *   npm run test:api       # API checks only
 *   npm run test:ui        # UI smoke test only
 *   npm run test:flows     # write-flow test only
 *   npm run test:live      # run against an already running app (API_URL)
 *
 * The isolated server listens on TEST_PORT (default 4100) and uses
 * server/data/test.db, which is git-ignored.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const TEST_PORT = process.env.TEST_PORT || '4100'
const TEST_DB = process.env.TEST_DB_PATH || path.join(ROOT, 'server', 'data', 'test.db')
const LIVE = process.argv.includes('--live') || process.env.TEST_LIVE === '1'
const LIVE_URL = process.env.API_URL || 'http://127.0.0.1:4000'

const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const SUITES = requested.length ? requested : ['api', 'ui', 'flows']

const colours = { reset: '\u001b[0m', dim: '\u001b[2m', cyan: '\u001b[36m', green: '\u001b[32m', red: '\u001b[31m' }
const heading = (text) => console.log(`\n${colours.cyan}${'━'.repeat(84)}${colours.reset}\n${colours.cyan}  ${text}${colours.reset}\n`)

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false, ...options })
    child.on('close', (code) => resolve(code ?? 1))
    child.on('error', () => resolve(1))
  })
}

async function waitForHealth(url, timeoutMs = 60000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`)
      if (res.ok) return true
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  return false
}

/* ------------------------------------------------------------------ */
/* Isolated API server (skipped in live mode)                          */
/* ------------------------------------------------------------------ */

let server = null
let apiUrl = LIVE_URL

async function startIsolatedServer() {
  fs.mkdirSync(path.dirname(TEST_DB), { recursive: true })
  if (fs.existsSync(TEST_DB)) fs.rmSync(TEST_DB)

  console.log(`  Preparing a fresh test database: ${path.relative(ROOT, TEST_DB)}`)
  const seeded = await run(process.execPath, ['--disable-warning=ExperimentalWarning', 'src/seed.js', '--reset'], {
    cwd: path.join(ROOT, 'server'),
    env: { ...process.env, DB_PATH: TEST_DB },
    stdio: 'ignore'
  })
  if (seeded !== 0) throw new Error('could not seed the test database')

  server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'src/index.js'], {
    cwd: path.join(ROOT, 'server'),
    env: { ...process.env, DB_PATH: TEST_DB, PORT: TEST_PORT, HOST: '0.0.0.0' },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let serverLog = ''
  server.stdout.on('data', (chunk) => {
    serverLog += chunk.toString()
  })
  server.stderr.on('data', (chunk) => {
    serverLog += chunk.toString()
  })

  apiUrl = `http://127.0.0.1:${TEST_PORT}`
  const up = await waitForHealth(apiUrl)
  if (!up) {
    console.error(serverLog.slice(-2000))
    throw new Error(`the test API did not start on ${apiUrl}`)
  }
  console.log(`  Test API running on ${apiUrl} (port ${TEST_PORT}) — your app on port 4000 is untouched`)
}

function stopIsolatedServer() {
  if (server && !server.killed) {
    server.kill('SIGTERM')
    setTimeout(() => {
      try {
        server.kill('SIGKILL')
      } catch {
        /* already gone */
      }
    }, 3000)
  }
}

process.on('SIGINT', () => {
  stopIsolatedServer()
  process.exit(130)
})
process.on('exit', stopIsolatedServer)

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const results = []

if (!LIVE) {
  heading('Starting an isolated test environment')
  await startIsolatedServer()
} else {
  heading(`Running against the running app at ${LIVE_URL}`)
  const up = await waitForHealth(LIVE_URL, 5000)
  if (!up) {
    console.error(`  The app at ${LIVE_URL} is not answering. Start it with \`npm run dev\` first.\n`)
    process.exit(1)
  }
}

const env = { ...process.env, API_URL: apiUrl }

if (SUITES.includes('api')) {
  heading('API checks')
  const code = await run(process.execPath, ['--disable-warning=ExperimentalWarning', 'test/api-test.mjs'], {
    cwd: path.join(ROOT, 'server'),
    env
  })
  results.push({ name: 'API checks', ok: code === 0 })
}

if (SUITES.includes('ui') || SUITES.includes('flows')) {
  heading('Building the client test bundle')
  const build = await run('npm', ['run', 'test:build'], { cwd: path.join(ROOT, 'client'), env })
  if (build !== 0) {
    console.error('  The client test bundle could not be built.\n')
    process.exit(1)
  }
}

if (SUITES.includes('ui')) {
  for (const role of ['admin', 'cabinet', 'member']) {
    heading(`UI smoke test — ${role} view`)
    const code = await run(process.execPath, ['test/smoke.mjs'], {
      cwd: path.join(ROOT, 'client'),
      env: { ...env, AS: role }
    })
    results.push({ name: `UI smoke (${role})`, ok: code === 0 })
  }
}

if (SUITES.includes('flows')) {
  heading('Write flows (every action saved and read back)')
  const code = await run(process.execPath, ['test/flows.mjs'], { cwd: path.join(ROOT, 'client'), env })
  results.push({ name: 'Write flows', ok: code === 0 })
}

stopIsolatedServer()

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

heading('Summary')
for (const result of results) {
  const mark = result.ok ? `${colours.green}PASS${colours.reset}` : `${colours.red}FAIL${colours.reset}`
  console.log(`  ${mark}  ${result.name}`)
}
const failed = results.filter((r) => !r.ok).length
console.log(
  `\n  ${results.length - failed}/${results.length} suite(s) passed${LIVE ? ' — against the live app' : ' — on an isolated database'}.\n`
)
if (!LIVE) console.log(`  ${colours.dim}Your school data and logins were not touched by this run.${colours.reset}\n`)
process.exit(failed ? 1 : 0)
