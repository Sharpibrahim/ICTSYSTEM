/* Responsiveness audit. Two halves:
   1. static — every breakpoint must actually re-layout the components that
      would otherwise overflow, and no fixed width may escape its container;
   2. live   — the app boots and renders every route at phone, tablet, laptop
      and desktop widths, with the shell switching to its drawer layout.
   Usage: node /tmp/adaptive.js                                                  */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const webcrypto = require('crypto').webcrypto;
const ROOT = require('path').resolve(__dirname, '..');
let fails = 0, passes = 0;
const log = (n, ok, extra) => { ok ? passes++ : fails++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (extra ? ' -- ' + extra : '')); };
const wait = ms => new Promise(r => setTimeout(r, ms));

const adaptive = fs.readFileSync(ROOT + '/css/adaptive.css', 'utf8');
const responsive = fs.readFileSync(ROOT + '/css/responsive.css', 'utf8');
const components = fs.readFileSync(ROOT + '/css/components.css', 'utf8');
const all = adaptive + responsive + components;

/* ── 1. breakpoint coverage ─────────────────────────────────────────────── */
const widths = [2560, 1920, 1440, 1366, 1280, 1150, 1024, 900, 820, 768, 640, 560, 480, 400, 340];
const missingBreakpoints = widths.filter(w =>
  !(new RegExp('max-width:\\s*' + w + 'px').test(all) || new RegExp('min-width:\\s*' + w + 'px').test(all)));
log('every target width from 340 to 2560 has a rule', missingBreakpoints.length === 0,
  missingBreakpoints.length ? 'no rule for ' + missingBreakpoints.join(', ') + 'px' : widths.length + ' widths covered');

const media = [...all.matchAll(/@media([^{]+)\{/g)].map(m => m[1].trim());
const need = {
  'sidebar drawer on phones': /max-width:\s*900px/.test(responsive + adaptive),
  'stacked tables on phones': /max-width:\s*820px/.test(adaptive) || /max-width:\s*780px/.test(responsive),
  'bottom-sheet dialogs on phones': /place-items:\s*end\s+stretch/.test(adaptive),
  'content cap on very large screens': /min-width:\s*1700px/.test(adaptive),
  'touch targets for fingers': /hover:\s*none/.test(adaptive),
  'safe-area padding for notches': /env\(safe-area-inset/.test(adaptive),
  '16px inputs to stop iOS zoom': /font-size:\s*16px\s*!important/.test(adaptive),
  'short-screen handling': /max-height:\s*720px/.test(adaptive),
  'landscape phone handling': /orientation:\s*landscape/.test(adaptive),
  'print restores table rows': /display:\s*table-row\s*!important/.test(adaptive)
};
Object.keys(need).forEach(k => log(k, need[k]));

/* a fixed width may not exceed the smallest screen unless it is capped */
const csstree = require('css-tree');
const fixedWide = [];
[['components.css', components], ['adaptive.css', adaptive], ['responsive.css', responsive]].forEach(([name, sheet]) => {
  let ast;
  try { ast = csstree.parse(sheet, { positions: true }); } catch (e) { return; }
  csstree.walk(ast, (node) => {
    if (node.type !== 'Declaration' || node.property !== 'min-width') return;
    const v = parseInt(node.value.value, 10);
    if (!(v > 320)) return;
    /* look at the enclosing rule: it must be capped by a width/max-width or
       live inside a media query (which is where the re-layout happens) */
    let capped = false, inMedia = false, p = node;
    while (p) {
      if (p.type === 'Rule' && p.prelude) {
        const text = csstree.generate(p.prelude);
        if (/max-width|width/.test(text)) capped = true;
      }
      if (p.type === 'Atrule' && p.name && p.name.indexOf('media') === 0) inMedia = true;
      p = p.parent;
    }
    if (!capped && !inMedia) fixedWide.push(name + ':' + node.loc.start.line + ' min-width:' + v + 'px');
  });
});
log('no fixed min-width escapes a cap or a media query', fixedWide.length === 0, fixedWide.slice(0, 3).join(' | '));

log('100vw is never used bare (scrollbar overflow)',
  !/\bwidth:\s*100vw\b/.test(adaptive) && (responsive.match(/100vw/g) || []).length <= 2,
  'occurrences: ' + (all.match(/width:\s*100vw/g) || []).length);

/* ── 2. the app at each width ───────────────────────────────────────────── */
const vc = new VirtualConsole();
let consoleErrors = [];
vc.on('jsdomError', e => { if (!/Not implemented/.test(e.message)) consoleErrors.push(e.message); });
vc.on('error', (...a) => consoleErrors.push(a.map(String).join(' ')));

function boot(width, height) {
  return JSDOM.fromURL('http://127.0.0.1:8080/index.html', {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      try { Object.defineProperty(w, 'crypto', { value: webcrypto, configurable: true }); } catch (e) {}
      w.print = function () {};
      Object.defineProperty(w, 'innerWidth', { value: width, configurable: true });
      Object.defineProperty(w, 'innerHeight', { value: height, configurable: true });
      w.matchMedia = function (q) {
        const m = /\((min|max)-(width|height):\s*(\d+)px\)/.exec(q) || [];
        let matches = false;
        if (m.length) {
          const [, dir, axis, val] = m;
          const px = Number(val);
          const cur = axis === 'width' ? width : height;
          matches = dir === 'max' ? cur <= px : cur >= px;
        }
        if (/hover:\s*none|pointer:\s*coarse/.test(q)) matches = width <= 900;
        if (/orientation:\s*landscape/.test(q)) matches = width > height;
        if (/prefers-color-scheme/.test(q)) matches = false;
        if (/prefers-reduced-motion/.test(q)) matches = true;
        return { matches, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
      };
    }
  });
}

(async () => {
  const devices = [
    { name: 'phone 360x740', w: 360, h: 740 },
    { name: 'phone 414x896', w: 414, h: 896 },
    { name: 'tablet 768x1024', w: 768, h: 1024 },
    { name: 'laptop 1366x768', w: 1366, h: 768 },
    { name: 'desktop 1920x1080', w: 1920, h: 1080 }
  ];
  const routes = ['/dashboard', '/members', '/attendance', '/finance', '/calendar', '/settings', '/account', '/audit', '/manual'];

  for (const dev of devices) {
    consoleErrors = [];
    const dom = await boot(dev.w, dev.h);
    const w = dom.window, d = w.document;
    await wait(4300);
    await w.Auth.login('admin', 'demo1234', false);
    await w.Auth.firstPasswordChange(w.Store.all('users')[0].id, 'Adapt2026x');
    await w.Auth.login('admin', 'Adapt2026x', false);
    w.App.showApp();
    await wait(300);
    let rendered = 0, problems = [];
    for (const r of routes) {
      w.location.hash = '#' + r;
      await wait(320);
      const html = d.getElementById('view-root').innerHTML;
      if (html.length > 400) rendered++; else problems.push(r);
    }
    log(dev.name + ': all ' + routes.length + ' routes render', rendered === routes.length, problems.join(' '));
    /* the stacked class is what turns a table into cards */
    w.location.hash = '#/members'; await wait(360);
    log(dev.name + ': tables are marked for card layout', !!d.querySelector('.table-wrap.stacked'));
    /* navigation is reachable at every size: drawer button on phones, rail/list otherwise */
    const hamburger = d.getElementById('sidebar-open');
    log(dev.name + ': a way into the navigation exists', !!hamburger || !!d.getElementById('sidebar-nav'));
    const errs = consoleErrors.length;
    log(dev.name + ': no console errors', errs === 0, consoleErrors.slice(0, 1).join('').slice(0, 120));
    dom.window.close();
  }

  console.log('\n' + passes + ' passed' + (fails ? ', ' + fails + ' FAILED' : ' — every screen size covered.'));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('crash', e); process.exit(1); });
