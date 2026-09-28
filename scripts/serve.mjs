/**
 * One command to get the app running end to end:
 *
 *   npm run serve
 *
 * It checks what is missing and fixes it, then starts the server:
 *   1. installs the root, server and client dependencies if node_modules is absent
 *   2. builds the client into client/dist if it is absent
 *   3. seeds the school data if the database file is absent
 *   4. starts the API, which also serves the built client on http://localhost:4000
 *
 * `npm run serve -- --check` only performs steps 1-3 and reports what it found,
 * which is handy after a fresh clone or a machine restart.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CHECK_ONLY = process.argv.includes('--check')

const exists = (...parts) => fs.existsSync(path.join(ROOT, ...parts))

function run(label, command, args) {
  console.log(`\n▸ ${label}`)
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', shell: false })
  if (result.status !== 0) {
    console.error(`\n  ✗ ${label} failed (exit ${result.status}). Fix the error above and run this command again.\n`)
    process.exit(result.status || 1)
  }
}

function report(label, done) {
  console.log(`${done ? '  ✓' : '  ·'} ${label}`)
}

console.log('\n  ICT Club Management System — starting up\n  ' + '─'.repeat(60))

/* 1. dependencies ---------------------------------------------------- */
const depsMissing =
  !exists('node_modules') || !exists('server', 'node_modules') || !exists('client', 'node_modules')
if (depsMissing) {
  run('Installing dependencies (first run only)', 'npm', ['run', 'setup'])
} else {
  report('Dependencies installed', true)
}

/* 2. client build ---------------------------------------------------- */
if (!exists('client', 'dist', 'index.html')) {
  run('Building the web app', 'npm', ['run', 'build'])
} else {
  report('Web app built', true)
}

/* 3. database -------------------------------------------------------- */
if (!exists('server', 'data', 'ictclub.db')) {
  run('Loading the sample school data', 'npm', ['run', 'db:seed'])
} else {
  report('Database present', true)
}

if (CHECK_ONLY) {
  console.log('\n  Everything is ready. Start it with: npm run serve\n')
  process.exit(0)
}

/* 4. start the server ------------------------------------------------ */
console.log('\n  Sign in with   Sharp  /  SunnyDay@2026')
console.log('  App and API    http://localhost:4000\n')
run('Starting the app', 'npm', ['--prefix', 'server', 'start'])
