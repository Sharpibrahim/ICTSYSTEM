/* Dumps the user manual (js/modules/manual.js) to tools/manual.json, which
   tools/make-manual-pdf.py turns into docs/MRHS-ICT-Club-Master-User-Manual.pdf.
   The app must be running:  python3 -m http.server 8080 --bind 0.0.0.0        */
const { JSDOM, VirtualConsole } = require('jsdom');
const path = require('path');
const fs = require('fs');
const webcrypto = require('crypto').webcrypto;
const BASE = process.env.BASE || 'http://127.0.0.1:8080';
const vc = new VirtualConsole();
vc.on('jsdomError', () => {});
JSDOM.fromURL(BASE + '/index.html', {
  runScripts: 'dangerously', resources: 'usable', virtualConsole: vc,
  beforeParse(w) { try { Object.defineProperty(w, 'crypto', { value: webcrypto, configurable: true }); } catch (e) {} }
}).then(async dom => {
  await new Promise(r => setTimeout(r, 4300));
  const sections = dom.window.Modules.Manual.sections;
  const out = path.join(__dirname, 'manual.json');
  fs.writeFileSync(out, JSON.stringify(sections, null, 1));
  console.log('wrote ' + out + ' — ' + sections.length + ' sections');
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
