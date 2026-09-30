/**
 * Test runner.
 *
 * Runs the API checks and the UI suites against their OWN database and API
 * server, so a test run can never touch the school's live data or sign out
 * anyone using the app.
 *
 *   npm test               # all suites, isolated databases + API on port 4100
 *   npm run test:api       # API checks only
 *   npm run test:ui        # UI smoke test only
 *   npm run test:flows     # write-flow test only
 *   npm run test:empty     # the screens a brand-new installation shows
 *   npm run test:live      # run against an already running app (API_URL)
 *
 * The UI, flow and empty suites load the real pages of the vanilla app in
 * jsdom — no build step, because the app has none.
 *
 * The main suites run against the sample school (server/data/test.db), loaded
 * with `seed.js --demo --reset`; the empty suite uses server/data/empty.db,
 * which holds nothing but the administrator account. Both files are
 * git-ignored. The isolated API listens on TEST_PORT (default 4100); the empty
 * suite moves it to TEST_EMPTY_PORT (4120) for its own run.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const TEST_PORT = process.env.TEST_PORT || '4100'
const TEST_EMPTY_PORT = process.env.TEST_EMPTY_PORT || '4120'
const TEST_DB = process.env.TEST_DB_PATH || path.join(ROOT, 'server', 'data', 'test.db')
const EMPTY_DB = process.env.EMPTY_DB_PATH || path.join(ROOT, 'server', 'data', 'empty.db')
const LIVE = process.argv.includes('--live') || process.env.TEST_LIVE === '1'
const LIVE_URL = process.env.API_URL || 'http://127.0.0.1:4000'

const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const SUITES = requested.length ? requested : ['api', 'ui', 'flows', 'empty']

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

/**
 * Starts an isolated API against its own database.
 * @param {{ db: string, port: string, sample: boolean, label: string }} target
 */
async function startIsolatedServer({ db = TEST_DB, port = TEST_PORT, sample = true, label = 'test' } = {}) {
  fs.mkdirSync(path.dirname(db), { recursive: true })
  if (fs.existsSync(db)) fs.rmSync(db)

  const seedArgs = sample ? ['--demo', '--reset'] : ['--reset']
  console.log(
    `  Preparing a fresh ${label} database: ${path.relative(ROOT, db)} ` +
      `(${sample ? 'with the sample school' : 'administrator account only'})`
  )
  const seeded = await run(
    process.execPath,
    ['--disable-warning=ExperimentalWarning', 'src/seed.js', ...seedArgs],
    { cwd: path.join(ROOT, 'server'), env: { ...process.env, DB_PATH: db }, stdio: 'ignore' }
  )
  if (seeded !== 0) throw new Error(`could not prepare the ${label} database`)

  server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'src/index.js'], {
    cwd: path.join(ROOT, 'server'),
    env: { ...process.env, DB_PATH: db, PORT: port, HOST: '0.0.0.0' },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  let serverLog = ''
  server.stdout.on('data', (chunk) => {
    serverLog += chunk.toString()
  })
  server.stderr.on('data', (chunk) => {
    serverLog += chunk.toString()
  })

  apiUrl = `http://127.0.0.1:${port}`
  const up = await waitForHealth(apiUrl)
  if (!up) {
    console.error(serverLog.slice(-2000))
    throw new Error(`the ${label} API did not start on ${apiUrl}`)
  }
  console.log(`  ${label} API running on ${apiUrl} (port ${port}) — your app on port 4000 is untouched`)
}

function stopIsolatedServer() {
  /* Capture the child first: the delayed SIGKILL must target the server that
     was just asked to stop, never a replacement started a moment later. */
  const child = server
  server = null
  if (child && !child.killed) {
    child.kill('SIGTERM')
    setTimeout(() => {
      try {
        child.kill('SIGKILL')
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

/* The app is plain HTML/CSS/JS, so the suites load the real pages — there is
   nothing to build between the code and the test. */
if (SUITES.includes('ui')) {
  for (const role of ['admin', 'cabinet', 'member']) {
    heading(`Screens — ${role} view`)
    const code = await run(process.execPath, ['web/test/ui.mjs'], {
      cwd: ROOT,
      env: { ...env, AS: role }
    })
    results.push({ name: `Screens (${role})`, ok: code === 0 })
  }
}

if (SUITES.includes('flows')) {
  heading('Write flows (every action saved and read back)')
  const code = await run(process.execPath, ['web/test/flows.mjs'], { cwd: ROOT, env })
  results.push({ name: 'Write flows', ok: code === 0 })
}

if (SUITES.includes('empty')) {
  heading('Empty system (what the school sees on day one)')
  stopIsolatedServer()
  await startIsolatedServer({ db: EMPTY_DB, port: TEST_EMPTY_PORT, sample: false, label: 'empty-system' })
  const code = await run(process.execPath, ['web/test/empty.mjs'], {
    cwd: ROOT,
    env: { ...process.env, API_URL: `http://127.0.0.1:${TEST_EMPTY_PORT}` }
  })
  results.push({ name: 'Empty system', ok: code === 0 })
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
