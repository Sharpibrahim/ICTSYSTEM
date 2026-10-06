/* ==========================================================================
   MRHS ICT CLUB MASTER — tools/check.js
   One command that checks the platform before it is handed over.

     node tools/check.js                (serves nothing itself: start the app
                                         first — see the note at the bottom)

   What it does
     A. static   — stylesheet health, colour schemes, cache tokens, deployment files
     B. live     — the app boots, all routes render, every scheme applies
     C. accounts — first-run password gate, roles, audit trail, cloud role claim

   It needs jsdom and css-tree:
     cd tools && npm install jsdom css-tree
   ========================================================================== */
'use strict';
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.BASE || 'http://127.0.0.1:8080';

let jsdom, cssTree;
try {
  jsdom = require('jsdom');
  cssTree = require('css-tree');
} catch (e) {
  console.error('Missing test libraries. Run:  cd tools && npm install jsdom css-tree');
  process.exit(2);
}
const { JSDOM, VirtualConsole } = jsdom;
const webcrypto = require('crypto').webcrypto;

let fails = 0, passes = 0;
const log = (name, ok, extra) => {
  ok ? passes++ : fails++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (extra ? '  -- ' + extra : ''));
};
const wait = ms => new Promise(r => setTimeout(r, ms));
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* ── A. static checks ───────────────────────────────────────────────────── */
function staticChecks() {
  const sheets = ['css/style.css', 'css/components.css', 'css/palette.css', 'css/responsive.css', 'css/adaptive.css'];
  let parseFailures = [];
  sheets.forEach(f => {
    try { cssTree.parse(read(f)); } catch (e) { parseFailures.push(f + ': ' + e.message); }
  });
  log('all five stylesheets parse', parseFailures.length === 0, parseFailures.join(' | '));

  const palette = read('css/palette.css');
  const schemes = [...palette.matchAll(/\[data-accent="([\w-]+)"\] \{/g)].map(m => m[1]);
  log('colour schemes present', schemes.length === 11, schemes.join(', '));

  /* each scheme must carry every token the interface reads */
  const blocks = [...palette.matchAll(/\[data-accent="[\w-]+"\] \{([\s\S]*?)\n\}/g)].map(m => m[1]);
  const required = ['--primary-rgb', '--secondary-rgb', '--accent-rgb', '--primary-600', '--secondary-600',
    '--accent-500', '--grad-brand', '--grad-deep', '--sidebar-bg', '--deep-900'];
  const incomplete = blocks.filter(b => required.some(t => b.indexOf(t + ':') === -1)).length;
  log('every scheme defines the full token set', incomplete === 0, incomplete + ' incomplete');

  const index = read('index.html');
  const tokens = [...new Set([...index.matchAll(/\?v=([0-9A-Za-z]+)/g)].map(m => m[1]))];
  log('one cache token across every asset', tokens.length === 1, tokens.join(', '));
  log('the colour layer loads after the components', index.indexOf('css/palette.css') > index.indexOf('css/components.css'));
  log('the adaptive layer loads last',
    index.indexOf('css/adaptive.css') > index.indexOf('css/responsive.css') &&
    index.indexOf('css/adaptive.css') > index.indexOf('css/palette.css'));

  ['vercel.json', '.vercelignore', 'docs/DEPLOY-VERCEL.md', 'assets/social-card.png'].forEach(f =>
    log('deployment file present: ' + f, fs.existsSync(path.join(ROOT, f))));
  try {
    JSON.parse(read('vercel.json'));
    log('vercel.json is valid JSON', true);
  } catch (e) { log('vercel.json is valid JSON', false, e.message); }

  /* runtime JS must parse */
  const walk = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(dir + '/' + e.name) : [dir + '/' + e.name]);
  const jsFiles = ['js/core', 'js/modules'].flatMap(walk).filter(f => f.endsWith('.js')).concat(['js/app.js']);
  const broken = jsFiles.filter(f => { try { new vm.Script(read(f), { filename: f }); return false; } catch (e) { return true; } });
  log('all ' + jsFiles.length + ' scripts parse', broken.length === 0, broken.join(' '));

  /* a selector that matches nothing is a silent typo */
  const glob = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? glob(dir + '/' + e.name) : [dir + '/' + e.name]);
  const appSource = ['js/core', 'js/modules', 'css'].flatMap(glob)
    .filter(f => !/adaptive\.css$/.test(f)).map(read).join('\n') + read('index.html');
  const adaptiveClasses = [...new Set([...read('css/adaptive.css').matchAll(/\.([a-zA-Z][\w-]+)/g)].map(m => m[1]))];
  const orphanClasses = adaptiveClasses.filter(c => appSource.indexOf(c) === -1);
  log('every adaptive.css selector matches markup', orphanClasses.length === 0, orphanClasses.join(', '));

  /* responsive coverage */
  const adaptive = read('css/adaptive.css') + read('css/responsive.css');
  const widths = [340, 400, 480, 640, 768, 820, 900, 1024, 1150, 1366, 1440, 1700, 1920, 2400, 2560];
  const uncovered = widths.filter(w => !new RegExp('(max|min)-width:\\s*' + w + 'px').test(adaptive));
  log('a rule exists for every target width', uncovered.length === 0, uncovered.join(', ') || widths.length + ' widths');
  log('touch, notch and print variations handled',
    /hover:\s*none/.test(adaptive) && /env\(safe-area-inset/.test(adaptive) && /display:\s*table-row\s*!important/.test(adaptive));
}

/* ── B + C. the app, live ───────────────────────────────────────────────── */
function boot(width, height, collector) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Not implemented/.test(e.message)) collector.push(e.message); });
  vc.on('error', (...a) => collector.push(a.map(String).join(' ')));
  return JSDOM.fromURL(BASE + '/index.html', {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      try { Object.defineProperty(w, 'crypto', { value: webcrypto, configurable: true }); } catch (e) {}
      w.print = function () {};
      Object.defineProperty(w, 'innerWidth', { value: width || 1440, configurable: true });
      Object.defineProperty(w, 'innerHeight', { value: height || 900, configurable: true });
    }
  });
}

async function liveChecks() {
  const errors = [];
  let dom;
  try {
    dom = await boot(1440, 900, errors);
  } catch (e) {
    log('the application is reachable at ' + BASE, false, e.message);
    console.log('\nStart the app first:  python3 -m http.server 8080 --bind 0.0.0.0');
    return;
  }
  const w = dom.window, d = w.document;
  await wait(4300);
  log('the application boots', !!d.getElementById('view-root'), (errors[0] || '').slice(0, 90));
  log('the default colour scheme is applied', d.documentElement.getAttribute('data-accent') === 'azure');

  /* accounts: first-run gate */
  const pending = w.Auth.pendingAccounts();
  log('a fresh install asks each officer to set a password', pending.length > 0, pending.length + ' pending');
  await w.Auth.login('admin', 'demo1234', false);
  await wait(150);
  const admin = w.Store.all('users').filter(u => u.username === 'admin')[0];
  log('the shipped password cannot be kept', await w.Auth.firstPasswordChange(admin.id, 'demo1234').then(() => false, () => true));
  log('a proper password is accepted', await w.Auth.firstPasswordChange(admin.id, 'Check2026x') === true);
  await w.Auth.login('admin', 'Check2026x', false);
  w.App.showApp();
  await wait(300);

  /* every route */
  const routes = ['/dashboard', '/analytics', '/members', '/cabinet', '/attendance', '/meetings', '/courses',
    '/activities', '/projects', '/reports', '/certificates', '/resources', '/documents', '/announcements',
    '/tasks', '/calendar', '/equipment', '/finance', '/achievements', '/gallery', '/settings', '/manual',
    '/account', '/audit', '/verify'];
  let rendered = 0; const broken = [];
  for (const r of routes) {
    errors.length = 0;
    w.location.hash = '#' + r;
    await wait(340);
    const html = d.getElementById('view-root').innerHTML;
    if (html.length > 400 && !errors.length) rendered++; else broken.push(r);
  }
  log('all ' + routes.length + ' routes render without errors', rendered === routes.length, broken.join(' '));

  /* every colour scheme applies and sticks */
  const schemes = (w.Shell && w.Shell.SCHEMES || []).map(s => s[0]);
  let applied = 0;
  for (const key of schemes) {
    w.Shell.applyScheme(key);
    await wait(40);
    if (d.documentElement.getAttribute('data-accent') === key && w.Store.settings().accent === key) applied++;
  }
  log('all ' + schemes.length + ' colour schemes apply and save', applied === schemes.length);
  w.Shell.applyScheme('primary');
  log('the old "primary" setting falls back to the default', d.documentElement.getAttribute('data-accent') === 'azure');

  /* administrator-only screens */
  w.location.hash = '#/audit'; await wait(500);
  log('an administrator can open the audit trail', /Audit trail/.test(d.getElementById('view-root').innerHTML));
  const member = w.Store.all('users').filter(u => u.username === 'member')[0];
  await w.Auth.firstPasswordChange(member.id, 'Member2026x');
  await w.Auth.login('member', 'Member2026x', false);
  w.App.showApp(); await wait(250);
  w.location.hash = '#/dashboard'; await wait(250);
  w.location.hash = '#/audit'; await wait(450);
  log('a member is refused the audit trail', /restricted|do not have/i.test(d.getElementById('view-root').innerHTML));

  /* the cloud role claim */
  await w.Auth.login('admin', 'Check2026x', false);
  w.App.showApp(); await wait(200);
  const writes = [];
  w.fetch = (url, opts) => {
    const raw = opts && opts.body ? String(opts.body) : '';
    const body = raw.charAt(0) === '{' ? JSON.parse(raw) : null;
    const out = (s, j) => Promise.resolve({ ok: s < 300, status: s, json: () => Promise.resolve(j) });
    if (String(url).indexOf('identitytoolkit') > -1) return out(200, { idToken: 'T', refreshToken: 'R', localId: 'uid-check', email: 'a@b.c', expiresIn: '3600' });
    if (String(url).indexOf('firestore') > -1) {
      if (/commit/.test(String(url))) { (body.writes || []).forEach(x => writes.push(x)); return out(200, { writeResults: [] }); }
      return out(200, {});
    }
    return out(404, {});
  };
  w.Sync.saveConfig({ projectId: 'mrhs-ict', apiKey: 'check' });
  await w.Sync.signIn('a@b.c', 'p');
  await wait(300);
  log('connecting publishes the officer role claim',
    writes.some(x => x.update && /\/roles\//.test(x.update.name || '')));
  log('no console errors during the whole run', errors.length === 0, (errors[0] || '').slice(0, 110));

  console.log('\n' + passes + ' checks passed' + (fails ? ', ' + fails + ' FAILED' : ' — all good.'));
  process.exit(fails ? 1 : 0);
}

staticChecks();
liveChecks();
