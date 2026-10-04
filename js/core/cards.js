/* ==========================================================================
   MRHS ICT CLUB MASTER — js/core/cards.js
   Club card studio: printable CR80 membership cards for members and cabinet
   position cards for club leaders, single or in A4 sheets of ten.

   Everything renders from the club settings, so changing the club name, logo
   or signatories in Settings updates every card immediately. Images are inline
   SVG or data URIs — nothing is fetched from the network.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;
  var PER_SHEET = 8;      /* CR80 cards per A4 sheet: 2 columns x 4 rows */
  var photos = {};        /* memberId -> data URL (session cache) */
  var photoPromise = {};

  /* ══ Card stylesheet (screen + print + self-contained document copy) ════ */
  var CSS = [
    /* stage / sheet */
    '.card-stage{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;justify-items:center}',
    '.card-sheet-page{background:#fff;color:#101a2e;width:210mm;min-height:290mm;padding:10mm;margin:0 auto;box-shadow:0 4px 18px rgba(16,31,71,.16)}',
    '.card-sheet{display:grid;grid-template-columns:repeat(2,85.6mm);grid-auto-rows:54mm;gap:6mm 6mm;justify-content:center;align-content:start}',
    '.card-sheet-title{text-align:center;font-size:9pt;color:#5b6b8c;margin-bottom:6mm;font-family:Arial,Helvetica,sans-serif;letter-spacing:.06em}',

    /* the card itself: CR80 = 85.6mm x 54mm */
    '.club-card{position:relative;width:85.6mm;height:54mm;border-radius:2.6mm;overflow:hidden;background:#fff;color:#101a2e;' +
      'font-family:Arial,Helvetica,sans-serif;box-shadow:0 2px 10px rgba(16,31,71,.18);flex:none}',
    '.club-card *{box-sizing:border-box}',
    '.club-card .cc-bg{position:absolute;inset:0;pointer-events:none}',
    '.club-card .cc-inner{position:relative;z-index:1;height:100%;display:flex;flex-direction:column}',
    '.club-card.is-cut{outline:.3mm dashed #c8d2e4;outline-offset:1.4mm}',

    /* header band */
    '.cc-head{display:flex;align-items:center;gap:2mm;padding:2.2mm 3mm;color:#fff;background:linear-gradient(115deg,#0f1c3f,#1c3d8f 55%,#4f46e5)}',
    '.cc-head .cc-mark{width:8.4mm;height:8.4mm;border-radius:2.4mm;display:grid;place-items:center;flex:none;background:rgba(255,255,255,.18);border:.2mm solid rgba(255,255,255,.35)}',
    '.cc-head .cc-mark svg{width:5.2mm;height:5.2mm;stroke:#fff}',
    '.cc-head-text{flex:1;min-width:0;line-height:1.12}',
    '.cc-head-text strong{display:block;font-size:6.9pt;letter-spacing:.11em;text-transform:uppercase}',
    '.cc-head-text span{display:block;font-size:5.3pt;letter-spacing:.18em;color:#c3d3f2;text-transform:uppercase}',
    '.cc-year{font-size:5.2pt;letter-spacing:.1em;padding:.5mm 1.6mm;border-radius:9mm;border:.2mm solid rgba(255,255,255,.5);white-space:nowrap}',
    '.cc-head.tier-patron{background:linear-gradient(115deg,#7a5a13,#b8933f 55%,#e0c477);color:#241a02}',
    '.cc-head.tier-patron .cc-head-text span{color:#4a3a10}',
    '.cc-head.tier-exec{background:linear-gradient(115deg,#101a2e,#1d40ad 55%,#2450d8)}',
    '.cc-head.tier-officer{background:linear-gradient(115deg,#0891b2,#22d3ee 55%,#67e8f9)}',

    /* body */
    '.cc-body{flex:1;display:flex;gap:2.6mm;padding:2.6mm 3mm 1.6mm;align-items:flex-start}',
    '.cc-photo{width:20mm;height:24mm;border-radius:1.6mm;overflow:hidden;flex:none;background:#eef1f7;border:.25mm solid #cfd8ea;display:grid;place-items:center}',
    '.cc-photo img{width:100%;height:100%;object-fit:cover;display:block}',
    '.cc-photo .cc-init{width:100%;height:100%;display:grid;place-items:center;font-size:12pt;font-weight:700;color:#fff}',
    '.cc-fields{flex:1;min-width:0;display:grid;gap:1.1mm;align-content:start}',
    '.cc-name{font-size:11pt;font-weight:700;line-height:1.1;color:#101a2e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.cc-pos{display:inline-block;font-size:5.8pt;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#4f46e5;' +
      'background:rgba(109,40,217,.1);border-radius:9mm;padding:.4mm 1.6mm;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.cc-row{display:flex;gap:1.4mm;font-size:6.2pt;line-height:1.25}',
    '.cc-row .k{color:#6b7a99;letter-spacing:.06em;text-transform:uppercase;min-width:13mm;font-size:5.4pt;padding-top:.25mm}',
    '.cc-row .v{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.cc-row .v.mono{font-family:"Courier New",monospace;letter-spacing:.04em}',
    '.cc-status{display:inline-block;font-size:5.4pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase;' +
      'border-radius:9mm;padding:.4mm 1.8mm;border:.2mm solid currentColor}',
    '.cc-status.ok{color:#0f7a4d;background:#e7f7ef}',
    '.cc-status.warn{color:#9a6400;background:#fdf3e0}',
    '.cc-status.off{color:#8a94a8;background:#f1f3f8}',

    /* footer */
    '.cc-foot{display:flex;align-items:flex-end;justify-content:space-between;gap:2mm;padding:0 3mm 2.4mm}',
    '.cc-sign{flex:1;min-width:0}',
    '.cc-sign .line{border-top:.25mm solid #8fa1c0;margin-bottom:.8mm}',
    '.cc-sign strong{display:block;font-size:5.6pt;color:#16295f}',
    '.cc-sign span{font-size:5pt;color:#6b7a99;letter-spacing:.04em}',
    '.cc-barcode{display:grid;place-items:end;gap:.6mm;text-align:right}',
    '.cc-barcode svg{height:6.4mm;width:auto;display:block}',
    '.cc-barcode span{font-family:"Courier New",monospace;font-size:4.6pt;letter-spacing:.1em;color:#6b7a99}',

    /* back face */
    '.club-card.back .cc-inner{padding:3mm}',
    '.cc-back-head{display:flex;align-items:center;gap:2mm;padding-bottom:1.6mm;border-bottom:.25mm solid #cfd8ea;margin-bottom:1.8mm}',
    '.cc-back-head strong{font-size:7pt;letter-spacing:.1em;text-transform:uppercase;color:#16295f}',
    '.cc-back-head span{font-size:5.2pt;color:#6b7a99;margin-left:auto;letter-spacing:.06em}',
    '.cc-back-cols{display:flex;gap:3mm;flex:1}',
    '.cc-terms{flex:1;min-width:0}',
    '.cc-terms h4{font-size:5.6pt;letter-spacing:.1em;text-transform:uppercase;color:#1d40ad;margin-bottom:.8mm}',
    '.cc-terms ul{margin:0;padding-left:2.6mm;display:grid;gap:.5mm}',
    '.cc-terms li{font-size:5.3pt;line-height:1.3;color:#44536e}',
    '.cc-contact{margin-top:1.4mm;font-size:5.3pt;color:#44536e;line-height:1.35}',
    '.cc-contact strong{color:#16295f}',
    '.cc-qr{width:19mm;flex:none;display:grid;gap:.8mm;justify-items:center}',
    '.cc-qr svg{width:19mm;height:19mm;display:block}',
    '.cc-qr span{font-family:"Courier New",monospace;font-size:4.4pt;color:#6b7a99;text-align:center;line-height:1.2}',
    '.cc-back-foot{margin-top:1.6mm;padding-top:1.2mm;border-top:.25mm dashed #cfd8ea;display:flex;justify-content:space-between;font-size:4.8pt;color:#6b7a99}',

    /* studio */
    '.card-studio{display:grid;grid-template-columns:minmax(230px,300px) minmax(0,1fr);gap:16px}',
    '.card-pick{display:grid;gap:6px;max-height:46vh;overflow:auto;padding-right:2px}',
    '.card-pick-item{display:flex;align-items:center;gap:10px;padding:7px 9px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--surface-2);cursor:pointer}',
    '.card-pick-item:hover{border-color:var(--primary-300);background:var(--surface-3)}',
    '.card-pick-item.on{border-color:var(--primary);background:var(--primary-50)}',
    '[data-theme="dark"] .card-pick-item.on{background:rgba(59,98,238,.16)}',
    '.card-pick-item .avatar{width:30px;height:30px;font-size:.72rem}',
    '.card-pick-item .cp-text{flex:1;min-width:0}',
    '.card-pick-item .cp-text strong{display:block;font-size:.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.card-pick-item .cp-text span{font-size:.72rem;color:var(--text-3);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.card-stage-preview{display:grid;place-items:center;gap:14px;padding:16px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);overflow:auto}',
    '@media (max-width:760px){.club-card{transform:scale(.92);transform-origin:top center}}',
    '@media print{.card-sheet-page{box-shadow:none;margin:0;padding:6mm;width:auto;min-height:0}' +
      '.club-card{box-shadow:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      '.card-sheet{gap:2mm 3mm}}'
  ].join('\n');

  var injected = false;
  function injectStyles() {
    if (injected || !document.head) return;
    injected = true;
    var el = document.createElement('style');
    el.id = 'mrhs-card-styles';
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  /* ══ Small helpers ═════════════════════════════════════════════════════ */
  function club() { return Store.settings() || {}; }

  function qrSVG(text, size) {
    /* Deterministic scan-ready placeholder: finder patterns + a stable module
       pattern derived from the text. Not a real QR encoding. */
    var n = 21, seed = 0, i;
    for (i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
    function rnd() { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 16) / 65536; }
    var cells = [];
    function finder(x, y) {
      cells.push('<rect x="' + x + '" y="' + y + '" width="7" height="7" fill="#101a2e"/>');
      cells.push('<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="5" height="5" fill="#fff"/>');
      cells.push('<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3" fill="#101a2e"/>');
    }
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        var inFinder = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
        if (inFinder) continue;
        if (rnd() > 0.52) cells.push('<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="#101a2e"/>');
      }
    }
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '" width="' + (size || 72) + '" height="' + (size || 72) + '" role="img" ' +
      'aria-label="Membership verification code">' + '<rect width="' + n + '" height="' + n + '" fill="#fff"/>' + cells.join('') + '</svg>';
  }

  function barcodeSVG(text, height) {
    var bars = [], x = 0, seed = 7;
    for (var i = 0; i < text.length; i++) seed = (seed * 17 + text.charCodeAt(i)) % 977;
    for (var b = 0; b < 48; b++) {
      seed = (seed * 7 + b * 31) % 613;
      var w = (seed % 3) + 1;
      if (b % 2 === 0) bars.push('<rect x="' + x + '" y="0" width="' + w + '" height="20" fill="#101a2e"/>');
      x += w + 1 + (seed % 2);
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + x + ' 20" height="' + (height || 22) + '" role="img" aria-label="Member barcode">' +
      bars.join('') + '</svg>';
  }

  function initialsAvatar(name) {
    var c1 = U.colorFor(name), c2 = UI.shade(c1, 26);
    return '<span class="cc-init" style="background:linear-gradient(135deg,' + c1 + ',' + c2 + ')">' + U.esc(U.initials(name)) + '</span>';
  }

  function photoBlock(rec, name) {
    var id = rec.photoFileId;
    if (id && photos[id]) return '<div class="cc-photo"><img src="' + photos[id] + '" alt=""></div>';
    if (id && !photoPromise[id]) {
      photoPromise[id] = true;
      try {
        Store.files.get(id).then(function (f) {
          if (f && f.dataUrl) {
            photos[id] = f.dataUrl;
            var imgs = document.querySelectorAll('[data-photo-for="' + id + '"]');
            Array.prototype.forEach.call(imgs, function (wrap) { wrap.innerHTML = '<img src="' + f.dataUrl + '" alt="">'; });
          }
        })['catch'](function () {});
      } catch (e) {}
    }
    return '<div class="cc-photo"' + (id ? ' data-photo-for="' + U.attr(id) + '"' : '') + '>' + initialsAvatar(name) + '</div>';
  }

  function statusChip(status) {
    var cls = /active/i.test(status || '') ? 'ok' : /suspend|inactive|alumni/i.test(status || '') ? /alumni/i.test(status) ? 'off' : 'warn' : 'off';
    return '<span class="cc-status ' + cls + '">' + U.esc(status || 'Active') + '</span>';
  }

  function tierOf(position) {
    if (/patron/i.test(position)) return 'tier-patron';
    if (/(president|vice|secretary|treasurer)/i.test(position) && !/assistant/i.test(position)) return 'tier-exec';
    return 'tier-officer';
  }

  /* ══ Card faces ════════════════════════════════════════════════════════ */
  function memberFront(m) {
    var s = club();
    var role = m.clubRole || 'Member';
    return '<div class="club-card is-cut member-card" data-card="member" data-id="' + U.attr(m.id) + '">' +
      '<div class="cc-inner">' +
        '<div class="cc-head">' +
          '<span class="cc-mark">' + Icons.svg('club-logo', { size: 20 }) + '</span>' +
          '<span class="cc-head-text"><strong>' + U.esc(s.clubName || 'MRHS ICT Club') + '</strong>' +
          '<span>' + U.esc(s.schoolName || 'Mbazzi Riverside High School') + '</span></span>' +
          '<span class="cc-year">' + U.esc(s.academicYear || '2026') + '</span>' +
        '</div>' +
        '<div class="cc-body">' + photoBlock(m, m.fullName) +
          '<div class="cc-fields">' +
            '<div class="cc-name">' + U.esc(m.fullName) + '</div>' +
            '<span class="cc-pos">' + U.esc(role) + '</span>' +
            '<div class="cc-row"><span class="k">Member ID</span><span class="v mono">' + U.esc(m.memberId || '—') + '</span></div>' +
            '<div class="cc-row"><span class="k">Class</span><span class="v">' + U.esc((m.klass || '') + ' ' + (m.stream || '')) + '</span></div>' +
            '<div class="cc-row"><span class="k">Status</span><span class="v">' + statusChip(m.membershipStatus) + '</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="cc-foot">' +
          '<div class="cc-sign"><div class="line"></div><strong>' + U.esc(s.reportSignatory || 'Club Patron') + '</strong><span>Club Patron</span></div>' +
          '<div class="cc-barcode">' + barcodeSVG(m.memberId || m.id, 22) + '<span>' + U.esc(m.memberId || '') + '</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function memberBack(m) {
    var s = club();
    return '<div class="club-card back is-cut member-card" data-card="member" data-face="back" data-id="' + U.attr(m.id) + '">' +
      '<div class="cc-inner">' +
        '<div class="cc-back-head"><strong>Terms of use</strong><span>' + U.esc((s.currentTerm || 'Term 1') + ' · ' + (s.academicYear || '')) + '</span></div>' +
        '<div class="cc-back-cols">' +
          '<div class="cc-terms">' +
            '<ul>' +
              '<li>This card is the property of ' + U.esc(s.schoolName || 'Mbazzi Riverside High School') + ' and must be returned on request.</li>' +
              '<li>Carry it to all club meetings, trainings and competitions.</li>' +
              '<li>It is not transferable. Report loss or damage to the club office.</li>' +
            '</ul>' +
            '<div class="cc-contact"><strong>Club office</strong><br>' +
              U.esc(s.email || '') + (s.phone ? ' &middot; ' + U.esc(s.phone) : '') + '<br>' + U.esc(s.address || '') + '</div>' +
          '</div>' +
          '<div class="cc-qr">' + qrSVG('MRHSICT|MEMBER|' + (m.memberId || m.id), 72) + '<span>Membership code<br>' + U.esc(m.memberId || '') + '</span></div>' +
        '</div>' +
        '<div class="cc-back-foot"><span>Issued ' + U.fmtDate(m.dateJoined || new Date(), 'long') + '</span>' +
          '<span>' + U.esc(s.email || '') + '</span></div>' +
      '</div>' +
    '</div>';
  }

  function cabinetFront(c) {
    var s = club();
    var member = c.memberId ? Store.find('members', c.memberId) : null;
    var rec = member || c;
    return '<div class="club-card is-cut cabinet-card" data-card="cabinet" data-id="' + U.attr(c.id) + '">' +
      '<div class="cc-inner">' +
        '<div class="cc-head ' + tierOf(c.position) + '">' +
          '<span class="cc-mark">' + Icons.svg('club-logo', { size: 20 }) + '</span>' +
          '<span class="cc-head-text"><strong>' + U.esc(s.clubName || 'MRHS ICT Club') + '</strong>' +
          '<span>Cabinet position card</span></span>' +
          '<span class="cc-year">' + U.esc((s.currentTerm || 'Term 1') + ' ' + (s.academicYear || '')) + '</span>' +
        '</div>' +
        '<div class="cc-body">' + photoBlock(rec, c.name) +
          '<div class="cc-fields">' +
            '<div class="cc-name">' + U.esc(c.name || (member ? member.fullName : '—')) + '</div>' +
            '<span class="cc-pos">' + U.esc(c.position) + '</span>' +
            '<div class="cc-row"><span class="k">Term</span><span class="v">' + U.esc(c.term || '—') + '</span></div>' +
            '<div class="cc-row"><span class="k">Appointed</span><span class="v">' + U.fmtDate(c.appointmentDate, 'long') + '</span></div>' +
            '<div class="cc-row"><span class="k">Status</span><span class="v">' + statusChip(c.status) + '</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="cc-foot">' +
          '<div class="cc-sign"><div class="line"></div><strong>' + U.esc(/patron/i.test(c.position) ? (s.reportSignatory || 'Head Teacher') : (c.issuedBy || 'Club Patron')) + '</strong>' +
            '<span>' + U.esc(/patron/i.test(c.position) ? 'School administration' : 'Club Patron') + '</span></div>' +
          '<div class="cc-barcode">' + barcodeSVG('MRHSICT|CABINET|' + c.id, 22) + '<span>' + U.esc(c.id.toUpperCase()) + '</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function cabinetBack(c) {
    var s = club();
    var member = c.memberId ? Store.find('members', c.memberId) : null;
    return '<div class="club-card back is-cut cabinet-card" data-card="cabinet" data-face="back" data-id="' + U.attr(c.id) + '">' +
      '<div class="cc-inner">' +
        '<div class="cc-back-head"><strong>Duties and mandate</strong><span>' + U.esc(c.position) + '</span></div>' +
        '<div class="cc-back-cols">' +
          '<div class="cc-terms">' +
            '<h4>Responsibilities</h4>' +
            '<ul><li>' + U.esc(U.truncate(c.responsibilities || 'As defined by the club constitution.', 150)) + '</li></ul>' +
            '<div class="cc-contact"><strong>Reports to:</strong> ' + U.esc(/patron/i.test(c.position) ? 'School administration' : 'Club patron and president') + '<br>' +
              '<strong>Contact:</strong> ' + U.esc(c.contact || (member ? member.contact : '') || '—') + '<br>' +
              U.esc(c.email || (member ? member.email : '') || '') + '</div>' +
          '</div>' +
          '<div class="cc-qr">' + qrSVG('MRHSICT|CABINET|' + c.id + '|' + c.position, 72) + '<span>Position code<br>' + U.esc(c.id.toUpperCase()) + '</span></div>' +
        '</div>' +
        '<div class="cc-back-foot"><span>' + U.esc(s.clubName || 'MRHS ICT Club') + ' · ' + U.esc(s.motto || '') + '</span><span>' + U.esc(s.email || '') + '</span></div>' +
      '</div>' +
    '</div>';
  }

  /* ══ Sheets and documents ══════════════════════════════════════════════ */
  /** records: member or cabinet records · type: 'member' | 'cabinet' */
  function faces(rec, type) {
    return type === 'cabinet'
      ? { front: cabinetFront(rec), back: cabinetBack(rec) }
      : { front: memberFront(rec), back: memberBack(rec) };
  }

  /**
   * sheetHTML([records], { type, face:'front'|'back'|'both', title })
   * Lays cards out eight to an A4 page (2 columns x 4 rows) with cut guides —
     five rows do not fit inside standard 10 mm print margins.
   */
  function sheetHTML(records, opts) {
    opts = opts || {};
    var type = opts.type || 'member';
    var face = opts.face || 'front';
    var list = records || [];
    if (!list.length) return '';
    injectStyles();

    function block(which, subset) {
      var cards = subset.map(function (r) { return faces(r, type)[which]; }).join('');
      return '<div class="card-sheet">' + cards + '</div>';
    }
    var pages = [];
    var title = opts.title || (type === 'cabinet' ? 'Cabinet position cards' : 'Club membership cards');
    var faces_ = face === 'both' ? ['front', 'back'] : [face];
    faces_.forEach(function (which, idx) {
      for (var i = 0; i < list.length; i += PER_SHEET) {
        var chunk = list.slice(i, i + PER_SHEET);
        pages.push('<div class="card-sheet-page">' +
          '<p class="card-sheet-title">' + U.esc(title) + ' &middot; ' + (which === 'back' ? 'reverse side' : 'front side') +
            (list.length > PER_SHEET ? ' &middot; sheet ' + (Math.floor(i / PER_SHEET) + 1) : '') +
            ' &middot; ' + U.esc(club().schoolName || '') + '</p>' +
          block(which, chunk) + '</div>');
      }
      void idx;
    });
    return pages.join('');
  }

  function printSheet(records, opts) {
    if (!records || !records.length) {
      UI.toast('Nothing to print', 'Select at least one record to create cards.', 'warning');
      return;
    }
    Print.print(sheetHTML(records, opts));
  }

  function downloadHTML(records, opts) {
    opts = opts || {};
    var name = opts.type === 'cabinet' ? 'mrhs-ict-cabinet-cards' : 'mrhs-ict-member-cards';
    var doc = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + U.esc(opts.title || 'MRHS ICT Club cards') + '</title>' +
      '<style>' + Print.stylesCSS() + '</style></head><body>' + sheetHTML(records, opts) + '</body></html>';
    U.download(name + '-' + U.todayISO() + '.html', doc, 'text/html;charset=utf-8');
  }

  /* ══ Studio ════════════════════════════════════════════════════════════ */
  var state = { ids: [], face: 'front', query: '', type: 'member' };

  function pool(type) {
    if (type === 'cabinet') return U.sortBy(Store.all('cabinet'), 'order');
    return U.sortBy(Store.all('members'), 'fullName');
  }

  function labelOf(rec, type) {
    return type === 'cabinet' ? rec.name + ' · ' + rec.position : rec.fullName;
  }
  function subOf(rec, type) {
    return type === 'cabinet'
      ? (rec.term || '') + (rec.status ? ' · ' + rec.status : '')
      : (rec.memberId || '') + ' · ' + (rec.klass || '') + ' ' + (rec.stream || '') + ' · ' + (rec.membershipStatus || '');
  }

  function pickListHTML(type) {
    var q = state.query.toLowerCase();
    var rows = pool(type).filter(function (r) {
      if (!q) return true;
      return (labelOf(r, type) + ' ' + subOf(r, type)).toLowerCase().indexOf(q) !== -1;
    });
    if (!rows.length) return '<p class="muted small">No records match “' + U.esc(state.query) + '”.</p>';
    return rows.map(function (r) {
      var on = state.ids.indexOf(r.id) !== -1;
      var member = type === 'cabinet' && r.memberId ? Store.find('members', r.memberId) : null;
      return '<label class="card-pick-item' + (on ? ' on' : '') + '">' +
        '<input type="checkbox" data-card-pick="' + U.attr(r.id) + '"' + (on ? ' checked' : '') + '>' +
        UI.avatar(r.name || r.fullName, 'sm') +
        '<span class="cp-text"><strong>' + U.esc(labelOf(r, type)) + '</strong><span>' + U.esc(subOf(r, type)) + (member ? '' : '') + '</span></span>' +
      '</label>';
    }).join('');
  }

  function previewHTML(type) {
    var recs = state.ids.map(function (id) { return Store.find(type === 'cabinet' ? 'cabinet' : 'members', id); }).filter(Boolean);
    if (!recs.length) {
      return UI.emptyState({
        icon: 'id-card', title: 'Choose who needs a card',
        message: 'Tick members or cabinet positions on the left to preview their cards here.'
      });
    }
    var which = state.face === 'both' ? ['front', 'back'] : [state.face];
    return '<div class="card-stage">' + recs.slice(0, 4).map(function (r) {
      return which.map(function (w) { return faces(r, type)[w]; }).join('');
    }).join('') + '</div>' +
      (recs.length > 4 ? '<p class="help text-center mt-2">Previewing the first 4 of ' + recs.length + ' cards. All of them print.</p>' : '');
  }

  function openStudio(opts) {
    opts = opts || {};
    state.type = opts.type === 'cabinet' ? 'cabinet' : 'member';
    state.face = opts.face || 'front';
    state.query = '';
    state.ids = (opts.ids || []).slice();
    injectStyles();

    if (!Auth.can(state.type, 'view') && !Auth.can(state.type, 'own')) {
      UI.toast('Not allowed', 'You do not have permission to create club cards.', 'error');
      return null;
    }

    var isCabinet = state.type === 'cabinet';
    var ctrl = UI.modal({
      title: isCabinet ? 'Cabinet position cards' : 'Club membership cards',
      subtitle: isCabinet
        ? 'Create CR80 cards for the club leadership — front, reverse or both, printed eight to an A4 sheet.'
        : 'Create CR80 membership cards for club members — front, reverse or both, printed eight to an A4 sheet.',
      icon: 'id-card', size: 'xl',
      body: '<div class="card-studio">' +
          '<div class="grid gap-2">' +
            '<div class="flex gap-1 items-center">' +
              '<div class="search-field" style="flex:1">' + Icons.svg('search') +
                '<input type="search" class="input" id="card-q" placeholder="Search…" aria-label="Search records"></div>' +
            '</div>' +
            '<div class="flex gap-1 wrap">' +
              '<button type="button" class="btn btn-ghost btn-sm" data-card-all>Select all</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" data-card-none>Clear</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" data-card-active>Active only</button>' +
            '</div>' +
            '<div class="card-pick" id="card-pick">' + pickListHTML(state.type) + '</div>' +
            '<p class="help" id="card-count"></p>' +
          '</div>' +
          '<div class="grid gap-2">' +
            '<div class="segmented" role="group" aria-label="Card face">' +
              ['front', 'back', 'both'].map(function (f) {
                return '<button type="button" data-card-face="' + f + '" class="' + (state.face === f ? 'active' : '') + '">' +
                  U.titleCase(f === 'both' ? 'Front + reverse' : f + ' only') + '</button>';
              }).join('') +
            '</div>' +
            '<div class="card-stage-preview" id="card-preview">' + previewHTML(state.type) + '</div>' +
            '<p class="help">Cards are CR80 (85.6 × 54 mm) portrait — the same size as a bank card. ' +
              'Print on A4 card stock (200 gsm or heavier), then cut along the guides and laminate. ' +
              'Set your printer to 100% scale — do not use “fit to page”.</p>' +
          '</div>' +
        '</div>',
      actions: [
        { label: 'Close', tone: 'ghost', onClick: function (c) { c.close(); } },
        { label: 'Download HTML', tone: 'outline', icon: 'download', onClick: function (c) {
            var recs = selected();
            if (!recs.length) { UI.toast('Nothing selected', 'Choose at least one record first.', 'warning'); return; }
            downloadHTML(recs, { type: state.type, face: state.face });
            c.close();
          } },
        { label: 'Print cards', tone: 'primary', icon: 'print', onClick: function (c) {
            var recs = selected();
            if (!recs.length) { UI.toast('Nothing selected', 'Choose at least one record to print cards for.', 'warning'); return; }
            printSheet(recs, { type: state.type, face: state.face });
            UI.toast('Card sheet ready', recs.length + ' card' + (recs.length === 1 ? '' : 's') + ' sent to the printer' +
              (state.face === 'both' ? ' (front and reverse sides).' : '.'), 'success');
            c.close();
          } }
      ]
    });

    var modal = ctrl.modal;

    function selected() {
      return state.ids.map(function (id) { return Store.find(state.type === 'cabinet' ? 'cabinet' : 'members', id); }).filter(Boolean);
    }
    function refreshCount() {
      var n = state.ids.length;
      var host = modal.querySelector('#card-count');
      if (host) host.textContent = n ? n + ' selected · ' + (state.face === 'both' ? 2 : 1) + ' side' + (state.face === 'both' ? 's' : '') +
        ' per card · ' + Math.ceil(n / PER_SHEET) + ' A4 sheet' + (Math.ceil(n / PER_SHEET) > 1 ? 's' : '') + (state.face === 'both' ? ' per side' : '') : 'Nothing selected yet.';
    }
    function refreshPreview() {
      var host = modal.querySelector('#card-preview');
      if (host) host.innerHTML = previewHTML(state.type);
      refreshCount();
    }

    modal.querySelector('#card-q').addEventListener('input', U.debounce(function () {
      state.query = this.value.trim();
      modal.querySelector('#card-pick').innerHTML = pickListHTML(state.type);
    }, 140));

    modal.addEventListener('click', function (e) {
      if (e.target.closest('[data-card-all]')) {
        state.ids = pool(state.type).map(function (r) { return r.id; });
        modal.querySelector('#card-pick').innerHTML = pickListHTML(state.type);
        refreshPreview();
        return;
      }
      if (e.target.closest('[data-card-none]')) {
        state.ids = [];
        modal.querySelector('#card-pick').innerHTML = pickListHTML(state.type);
        refreshPreview();
        return;
      }
      if (e.target.closest('[data-card-active]')) {
        state.ids = pool(state.type).filter(function (r) {
          return state.type === 'cabinet' ? /active/i.test(r.status || '') : /active/i.test(r.membershipStatus || '');
        }).map(function (r) { return r.id; });
        modal.querySelector('#card-pick').innerHTML = pickListHTML(state.type);
        refreshPreview();
        return;
      }
      var faceBtn = e.target.closest('[data-card-face]');
      if (faceBtn) {
        state.face = faceBtn.getAttribute('data-card-face');
        modal.querySelectorAll('[data-card-face]').forEach(function (b) {
          b.classList.toggle('active', b === faceBtn);
        });
        refreshPreview();
        return;
      }
      var item = e.target.closest('.card-pick-item');
      if (item && !e.target.closest('input')) {
        var box = item.querySelector('input');
        box.checked = !box.checked;
        apply(box);
      }
    });

    modal.addEventListener('change', function (e) {
      var box = e.target.closest('input[data-card-pick]');
      if (box) apply(box);
    });

    function apply(box) {
      var id = box.getAttribute('data-card-pick');
      if (box.checked) { if (state.ids.indexOf(id) === -1) state.ids.push(id); }
      else state.ids = state.ids.filter(function (x) { return x !== id; });
      var item = box.closest('.card-pick-item');
      if (item) item.classList.toggle('on', box.checked);
      refreshPreview();
    }

    refreshCount();
    return ctrl;
  }

  /* ══ Convenience openers ═══════════════════════════════════════════════ */
  function members(ids) { return openStudio({ type: 'member', ids: ids || [] }); }
  function cabinet(ids) { return openStudio({ type: 'cabinet', ids: ids || [] }); }

  /** Single-record card preview modal (used from detail pages). */
  function openOne(rec, type) {
    type = type === 'cabinet' ? 'cabinet' : 'member';
    injectStyles();
    var both = faces(rec, type);
    var modal = UI.modal({
      title: type === 'cabinet' ? 'Cabinet position card' : 'Membership card',
      subtitle: (rec.fullName || rec.name) + ' · ' + (rec.memberId || rec.position),
      icon: 'id-card', size: 'sm',
      body: '<div class="card-stage-preview">' + both.front + both.back + '</div>' +
        '<p class="help text-center mt-2">Card size 85.6 × 54 mm (CR80). Print at 100% scale on card stock, then cut and laminate. ' +
        'Use “Open card studio” to build a sheet of cards for several records at once.</p>',
      actions: [
        { label: 'Close', tone: 'ghost', onClick: function (c) { c.close(); } },
        { label: 'Open card studio', tone: 'outline', icon: 'grid', onClick: function (c) { c.close(); openStudio({ type: type, ids: [rec.id] }); } },
        { label: 'Print card', tone: 'primary', icon: 'print', onClick: function () {
            Print.print(sheetHTML([rec], { type: type, face: 'both' }));
          } }
      ]
    });
    return modal;
  }

  /* ══ Exports ═══════════════════════════════════════════════════════════ */
  global.Cards = {
    stylesCSS: function () { return CSS; },
    memberFront: memberFront, memberBack: memberBack,
    cabinetFront: cabinetFront, cabinetBack: cabinetBack,
    sheetHTML: sheetHTML, printSheet: printSheet, downloadHTML: downloadHTML,
    openStudio: openStudio, members: members, cabinet: cabinet, openOne: openOne,
    sizes: { width: '85.6mm', height: '54mm', perSheet: PER_SHEET }
  };
})(window);
