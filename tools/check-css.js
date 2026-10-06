/* Parses each stylesheet the way a browser must, and reports any chunk that
   fails to parse — the earliest warning that a stylesheet is malformed. */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
(async () => {
  let failed = 0;
  for (const f of process.argv.slice(2)) {
    const css = fs.readFileSync(f, 'utf8');
    const chunks = css.split(/\n(?=\S)/).map((c, i) => [i, c]).filter(x => x[1].trim().length > 4 && /[{}]/.test(x[1]));
    const bad = [];
    for (const [i, chunk] of chunks) {
      const vc = new VirtualConsole();
      let errs = 0;
      vc.on('jsdomError', e => { if (/Could not parse CSS/.test(e.message)) errs++; });
      new JSDOM('<!doctype html><html><head><style>' + chunk.replace(/<\/style>/g, '<\\/style>') + '</style></head><body></body></html>', { virtualConsole: vc });
      if (errs) bad.push(i + ': ' + chunk.replace(/\s+/g, ' ').slice(0, 100));
    }
    if (bad.length) failed++;
    console.log(f.padEnd(24) + (bad.length ? bad.length + ' bad chunk(s)' : 'clean (' + chunks.length + ' chunks)'));
    bad.slice(0, 4).forEach(b => console.log('   ' + b));
  }
  process.exit(failed ? 1 : 0);
})();
