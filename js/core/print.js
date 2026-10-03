/* ==========================================================================
   MRHS ICT CLUB MASTER — js/core/print.js
   Printable documents: certificate previews, member ID cards, meeting minutes,
   reports and member profiles. Everything is rendered in the application's
   own HTML (no print server) and sent to the browser's print dialog.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  function club() { return Store.settings(); }

  /** Wraps content in a print-ready A4 page. */
  function page(inner, opts) {
    opts = opts || {};
    var s = club();
    return '<div class="print-page ' + (opts.orientation === 'landscape' ? 'landscape' : '') + '">' +
      '<header class="print-head">' +
        '<div class="print-brand">' +
          Icons.svg('club-logo', { size: 34 }) +
          '<div><strong>' + U.esc(s.schoolName || 'Mbazzi Riverside High School') + '</strong>' +
          '<span>' + U.esc(s.clubFullName || 'MRHS ICT Club') + ' &middot; ' + U.esc(s.motto || '') + '</span></div>' +
        '</div>' +
        '<div class="print-meta">' + (opts.meta || '') + '</div>' +
      '</header>' +
      '<div class="print-body">' + inner + '</div>' +
      '<footer class="print-foot">' +
        '<span>' + U.esc(s.address || '') + '</span>' +
        '<span>' + U.esc(s.email || '') + ' &middot; ' + U.esc(s.phone || '') + '</span>' +
        '<span>Printed ' + U.fmtDate(new Date(), 'long') + '</span>' +
      '</footer></div>';
  }

  /** Inject styles that only matter for printing/preview. */
  function stylesCSS() {
    return [
      '.print-area{display:none}',
      '.print-preview-frame{background:#eef1f7;padding:16px;border-radius:14px;overflow:auto;max-height:64vh;border:1px solid #dfe5f0}',
      '.print-page{background:#fff;color:#101a2e;width:210mm;min-height:290mm;padding:16mm;margin:0 auto 16px;box-shadow:0 4px 18px rgba(16,31,71,.12);font-size:12.4px;line-height:1.6;font-family:' + "'Segoe UI',Arial,sans-serif" + '}',
      '.print-page.landscape{width:297mm;min-height:200mm}',
      '.print-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:2.5px solid #1b3a8f;padding-bottom:10px;margin-bottom:16px}',
      '.print-brand{display:flex;gap:10px;align-items:center}',
      '.print-brand svg{color:#1b3a8f;stroke:#1b3a8f}',
      '.print-brand strong{display:block;font-size:14px;letter-spacing:.02em}',
      '.print-brand span{font-size:10.6px;color:#5b6b8c}',
      '.print-meta{text-align:right;font-size:10.4px;color:#5b6b8c}',
      '.print-body h2{font-size:15px;margin:16px 0 8px;color:#16295f}',
      '.print-body h3{font-size:12.6px;margin:13px 0 6px;color:#1b3a8f}',
      '.print-body p{margin-bottom:8px}',
      '.print-body ul,.print-body ol{margin:0 0 9px 20px;padding:0}',
      '.print-body ul{list-style:disc}.print-body ol{list-style:decimal}',
      '.print-body table{width:100%;border-collapse:collapse;font-size:11px;margin:9px 0}',
      '.print-body th,.print-body td{border:1px solid #cfd8ea;padding:5px 7px;text-align:left}',
      '.print-body th{background:#f1f4fa;font-weight:700}',
      '.print-doc-title{text-align:center;margin-bottom:14px}',
      '.print-doc-title h1{font-size:17px;letter-spacing:.02em;color:#16295f;margin-bottom:4px}',
      '.print-doc-title p{font-size:11px;color:#5b6b8c}',
      '.print-sign{display:flex;justify-content:space-between;gap:24px;margin-top:34px}',
      '.print-sign div{flex:1;font-size:10.6px}',
      '.print-sign .line{border-top:1px solid #8fa1c0;padding-top:5px;margin-bottom:3px}',
      '.print-foot{display:flex;justify-content:space-between;gap:12px;border-top:1px solid #cfd8ea;margin-top:22px;padding-top:8px;font-size:9.8px;color:#5b6b8c;flex-wrap:wrap}',
      '.print-id-card{width:86mm}',
      /* Certificate — duplicated from components.css so downloaded/printed
         documents are self-contained (no CSS variables, no external assets). */
      '.cert-preview{position:relative;overflow:hidden;color:#10203f;margin:0 auto;width:100%;max-width:1000px;padding:30px 36px 26px;' +
        'background:radial-gradient(120% 90% at 50% -10%,#fffdf7 0,rgba(255,253,247,0) 60%),linear-gradient(135deg,#fdfbf4 0,#f7f2e6 45%,#fbf6ec 100%);' +
        'border:1px solid #ddd5c0;border-radius:4px;font-family:Georgia,"Times New Roman",serif}',
      '.cert-preview::before{content:"";position:absolute;inset:13px;border:2px solid #1b3a8f;border-radius:3px;pointer-events:none}',
      '.cert-preview::after{content:"";position:absolute;inset:18px;border:1px solid rgba(184,147,63,.85);border-radius:2px;pointer-events:none}',
      '.cert-inner{position:relative;z-index:1;text-align:center;padding:4px 6px 0}',
      '.cert-frame-deco{position:absolute;inset:0;pointer-events:none}',
      '.cf-corner{position:absolute;width:40px;height:40px;border:2px solid rgba(27,58,143,.55)}',
      '.cf-corner.tl{top:26px;left:26px;border-right:0;border-bottom:0}.cf-corner.tr{top:26px;right:26px;border-left:0;border-bottom:0}',
      '.cf-corner.bl{bottom:26px;left:26px;border-right:0;border-top:0}.cf-corner.br{bottom:26px;right:26px;border-left:0;border-top:0}',
      '.cf-rule{position:absolute;left:50%;transform:translateX(-50%);bottom:27px;width:34%;height:2px;background:linear-gradient(90deg,transparent,rgba(184,147,63,.9),transparent)}',
      '.cert-head{position:relative;display:flex;align-items:center;gap:12px;text-align:left;padding:0 2px 11px;margin-bottom:14px;border-bottom:1px solid rgba(27,58,143,.22)}',
      '.cert-seal-mark{width:44px;height:44px;flex:none;border-radius:13px;display:grid;place-items:center;background:linear-gradient(140deg,#06b6d4,#3b62ee 48%,#6d28d9)}',
      '.cert-seal-mark svg{stroke:#fff;width:26px;height:26px}',
      '.cert-head-text{flex:1;min-width:0;display:grid;line-height:1.28}',
      '.cert-head-text strong{display:block;font-family:Arial,Helvetica,sans-serif;font-size:.88rem;letter-spacing:.16em;text-transform:uppercase;color:#16295f}',
      '.cert-head-text span{font-family:Arial,Helvetica,sans-serif;font-size:.73rem;color:#5b6b8c}',
      '.cert-serial{font-family:"Courier New",monospace;font-size:.64rem;letter-spacing:.14em;text-transform:uppercase;color:#8a6d2f;border:1px solid rgba(184,147,63,.55);border-radius:999px;padding:3px 10px;white-space:nowrap}',
      '.cert-crest{width:62px;height:62px;margin:2px auto 12px;display:grid;place-items:center;border-radius:50%;background:linear-gradient(140deg,#06b6d4,#3b62ee 48%,#6d28d9);box-shadow:0 0 0 3px #fff,0 0 0 5px rgba(184,147,63,.55)}',
      '.cert-crest svg{stroke:#fff;width:32px;height:32px}',
      '.cert-org{font-size:.7rem;letter-spacing:.3em;text-transform:uppercase;color:#8a6d2f;font-family:Arial,Helvetica,sans-serif}',
      '.cert-title{font-size:26px;font-weight:700;color:#16295f;margin:8px 0 2px;letter-spacing:.06em}',
      '.cert-title::after{content:"";display:block;width:92px;height:2px;margin:10px auto 0;background:linear-gradient(90deg,transparent,#b8933f,transparent)}',
      '.cert-lead{font-family:Arial,Helvetica,sans-serif;font-size:.8rem;color:#5b6b8c;margin-top:12px;font-style:italic}',
      '.cert-name{font-size:26px;font-weight:700;color:#101a2e;margin:6px 0 4px;border-bottom:2px solid rgba(27,58,143,.28);padding:0 22px 9px;display:inline-block;min-width:56%}',
      '.cert-body{font-family:Arial,Helvetica,sans-serif;font-size:.84rem;color:#44536e;max-width:64ch;margin:13px auto 0;line-height:1.72}',
      '.cert-meta{display:flex;justify-content:space-between;gap:22px;margin-top:30px;font-family:Arial,Helvetica,sans-serif}',
      '.cert-sign{flex:1;text-align:center}',
      '.cert-sign .line{border-top:1.5px solid #8fa1c0;margin-bottom:6px;padding-top:6px}',
      '.cert-sign strong{display:block;font-size:.78rem;color:#16295f}.cert-sign span{font-size:.7rem;color:#5b6b8c}',
      '.cert-foot{position:relative;display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-top:22px;padding-top:12px;border-top:1px solid rgba(27,58,143,.18)}',
      '.cert-no{font-family:"Courier New",monospace;font-size:.7rem;color:#5b6b8c;letter-spacing:.06em;text-align:right;line-height:1.5}',
      '.cert-seal{width:84px;height:84px;flex:none;border-radius:50%;display:grid;place-items:center;text-align:center;transform:rotate(-11deg);line-height:1.28;border:3px dashed #6d28d9;color:#6d28d9;font-family:Arial,Helvetica,sans-serif;font-size:.58rem;font-weight:700;letter-spacing:.1em}',
      '.cert-frame{background:#eef1f7;padding:16px;border-radius:14px;border:1px solid #dfe5f0;overflow:auto}',
      '.cert-frame .cert-preview{margin:0 auto}',
      (global.CertBG && CertBG.cssRules ? CertBG.cssRules() : ''),
      (global.Cards && Cards.stylesCSS ? Cards.stylesCSS() : ''),
      '@media print{body{background:#fff}.app-shell,.topbar,.sidebar,.modal-root,.drawer-root,.toast-root,.overlay,.login-screen,.boot-screen{display:none !important}.print-area{display:block !important}.print-page{box-shadow:none;margin:0;padding:12mm;width:auto;min-height:0}.print-page.landscape{width:auto}.cert-preview{box-shadow:none;border:0;max-width:none;width:auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}.cert-preview.has-bg{background:#fff;padding:9% 10.4% 9.6%;aspect-ratio:297/210;display:flex;flex-direction:column;justify-content:center}.cert-bg-layer{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{size:A4;margin:10mm}}'
    ].join('\n');
  }

  /* The certificate background, ID-card sheets and print rules live in this
     stylesheet. It must be present even when nothing has been printed yet,
     because certificates are also drawn inline on detail pages — so it is
     injected once the document is parsed and kept in sync afterwards. */
  var stylesNode = null;
  function injectStyles() {
    var text = stylesCSS();
    if (stylesNode && stylesNode.textContent === text) return;
    if (!stylesNode) stylesNode = document.getElementById('mrhs-print-styles');
    if (!stylesNode) {
      stylesNode = document.createElement('style');
      stylesNode.id = 'mrhs-print-styles';
      document.head.appendChild(stylesNode);
    }
    stylesNode.textContent = text;
  }

  function print(html) {
    injectStyles();
    var area = document.getElementById('print-area');
    area.innerHTML = html;
    area.setAttribute('aria-hidden', 'false');
    var done = function () { area.innerHTML = ''; area.setAttribute('aria-hidden', 'true'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); }, 120);
    setTimeout(done, 1500);
  }

  /** Modal preview with print + download actions. */
  function preview(html, opts) {
    opts = opts || {};
    injectStyles();
    var ctrl = UI.modal({
      title: opts.title || 'Document preview',
      subtitle: opts.subtitle || 'Review the document, then print or save it as a PDF using your browser.',
      icon: opts.icon || 'print',
      size: 'xl',
      body: '<div class="print-preview-frame">' + html + '</div>',
      actions: (opts.extraActions || []).concat([
        { label: 'Close', tone: 'ghost', onClick: function (c) { c.close(); } },
        {
          label: 'Download HTML', tone: 'outline', icon: 'download',
          onClick: function () {
            var doc = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + U.esc(opts.title || 'MRHS ICT Club document') + '</title>' +
              '<style>' + document.getElementById('mrhs-print-styles').textContent + '</style></head><body>' + html + '</body></html>';
            U.download((opts.fileName || 'mrhs-ict-document') + '.html', doc, 'text/html;charset=utf-8');
            UI.toast('Document downloaded', 'The document can be opened in a browser and printed to PDF.', 'success');
          }
        },
        { label: 'Print', tone: 'primary', icon: 'print', onClick: function () { print(html); } }
      ])
    });
    return ctrl;
  }

  /* ══ Document builders ════════════════════════════════════════════════ */

  function certificateHTML(cert, opts) {
    opts = opts || {};
    injectStyles();
    var s = club();
    var type = String(cert.type || 'Certificate of Participation').replace(/^Certificate of /, '');
    var serial = String(cert.certificateNumber || '');
    var short = serial.replace(/^MRHSICT-?/, '').replace(/-/g, ' ');
    var issued = U.fmtDate(cert.issueDate, 'long');
    var bg = global.CertBG ? CertBG.layerHTML() : '';

    return '<div class="cert-preview has-bg">' +
      bg +
      '<div class="cert-inner">' +
        '<div class="cert-crest">' + Icons.svg('club-logo', { size: 34 }) + '</div>' +
        '<p class="cert-org">' + U.esc(s.clubName || 'MRHS ICT Club') + '</p>' +
        '<p class="cert-school">' + U.esc(s.schoolName || 'Mbazzi Riverside High School') + '</p>' +
        '<h1 class="cert-title">Certificate</h1>' +
        '<p class="cert-type">' + U.esc(type) + '</p>' +
        '<p class="cert-lead">This certificate is proudly presented to</p>' +
        '<p class="cert-name">' + U.esc(cert.recipientName || '—') + '</p>' +
        '<p class="cert-body">' + U.esc(cert.achievement || 'For participation in the programmes and activities of the MRHS ICT Club.') + '</p>' +
        '<div class="cert-meta">' +
          '<div class="cert-sign"><div class="line"></div><strong>' + U.esc(cert.issuedBy || 'Club President') + '</strong><span>Club President</span></div>' +
          '<span class="cert-seal">MRHS<br>ICT CLUB<br>VERIFIED</span>' +
          '<div class="cert-sign"><div class="line"></div><strong>' + U.esc(cert.signedByPatron || 'Club Patron') + '</strong><span>Club Patron</span></div>' +
        '</div>' +
        '<p class="cert-no">Certificate No. ' + U.esc(serial || '—') + ' &middot; Issued ' + U.esc(issued) + '</p>' +
      '</div></div>';
  }

  function idCardHTML(member) {
    var s = club();
    if (!member) return '';
    return '<div class="id-card">' +
      '<div class="id-card-top">' +
        '<span class="brand-mark brand-mark-xs">' + Icons.svg('club-logo', { size: 22 }) + '</span>' +
        '<div><strong>MRHS ICT CLUB</strong><span>MEMBERSHIP CARD</span></div>' +
      '</div>' +
      '<div class="id-card-body">' +
        '<div class="id-card-photo">' + avatarOrInitials(member) + '</div>' +
        '<div class="id-card-fields">' +
          '<div><span class="k">Name</span><span class="v">' + U.esc(member.fullName) + '</span></div>' +
          '<div><span class="k">Member ID</span><span class="v">' + U.esc(member.memberId) + '</span></div>' +
          '<div><span class="k">Class</span><span class="v">' + U.esc(member.klass + ' ' + (member.stream || '')) + '</span></div>' +
          '<div><span class="k">Role</span><span class="v">' + U.esc(member.clubRole || 'Member') + '</span></div>' +
          '<div><span class="k">Status</span><span class="v">' + U.esc(member.membershipStatus) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="id-card-foot"><span>' + U.esc(s.academicYear || '2026') + ' Academic Year</span><span>' + U.esc(s.email || '') + '</span></div>' +
    '</div>';
  }
  function avatarOrInitials(member) {
    return '<span class="avatar avatar-square" style="width:100%;height:100%;border:0;border-radius:0;font-size:1.5rem;background:linear-gradient(135deg,' +
      U.colorFor(member.fullName) + ',' + UI.shade(U.colorFor(member.fullName), 26) + ')">' + U.esc(U.initials(member.fullName)) + '</span>';
  }

  function memberProfileHTML(member) {
    if (!member) return '';
    var att = CRUD.memberAttendance(member.id);
    var attended = att.filter(function (a) { return a.status === 'Present' || a.status === 'Late'; }).length;
    var rate = att.length ? U.percent(attended, att.length) : 0;
    var enrollments = Store.where('enrollments', function (e) { return e.memberId === member.id; });
    var projects = Store.where('projects', function (p) { return p.leaderId === member.id || (p.team || []).indexOf(member.id) !== -1; });
    var certs = Store.where('certificates', function (c) { return c.recipientId === member.id; });
    var achievements = Store.where('achievements', function (a) { return (a.memberIds || []).indexOf(member.id) !== -1; });

    function rows(list, fn) {
      if (!list.length) return '<tr><td colspan="3">No records.</td></tr>';
      return list.map(fn).join('');
    }

    return page(
      '<div class="print-doc-title"><h1>Member Profile</h1><p>Generated from the MRHS ICT Club Master records system</p></div>' +
      '<h3>Personal information</h3>' +
      '<table><tbody>' +
        '<tr><th style="width:34%">Full name</th><td>' + U.esc(member.fullName) + '</td></tr>' +
        '<tr><th>Member ID</th><td>' + U.esc(member.memberId) + '</td></tr>' +
        '<tr><th>Class / Stream</th><td>' + U.esc(member.klass + ' ' + (member.stream || '')) + '</td></tr>' +
        '<tr><th>Student number</th><td>' + U.esc(member.studentNumber || '—') + '</td></tr>' +
        '<tr><th>Gender</th><td>' + U.esc(member.gender) + '</td></tr>' +
        '<tr><th>Contact</th><td>' + U.esc(member.contact || '—') + ' &middot; ' + U.esc(member.email || '—') + '</td></tr>' +
        '<tr><th>Date joined</th><td>' + U.fmtDate(member.dateJoined) + '</td></tr>' +
        '<tr><th>Membership status</th><td>' + U.esc(member.membershipStatus) + '</td></tr>' +
        '<tr><th>Club role</th><td>' + U.esc(member.clubRole || 'Member') + '</td></tr>' +
        '<tr><th>Skills</th><td>' + U.esc((member.skills || []).join(', ') || '—') + '</td></tr>' +
        '<tr><th>Interests</th><td>' + U.esc((member.interests || []).join(', ') || '—') + '</td></tr>' +
      '</tbody></table>' +
      '<h3>Attendance summary</h3><p>Total records: ' + att.length + ' &middot; Attended: ' + attended + ' &middot; Attendance rate: ' + rate + '%</p>' +
      '<h3>Course enrolment</h3>' +
      '<table><thead><tr><th>Course</th><th>Progress</th><th>Status</th></tr></thead><tbody>' +
        rows(enrollments, function (e) {
          var c = Store.find('courses', e.courseId);
          return '<tr><td>' + U.esc(c ? c.name : '—') + '</td><td>' + e.progress + '%</td><td>' + U.esc(e.status) + '</td></tr>';
        }) + '</tbody></table>' +
      '<h3>Projects</h3>' +
      '<table><thead><tr><th>Project</th><th>Role</th><th>Progress</th></tr></thead><tbody>' +
        rows(projects, function (p) {
          return '<tr><td>' + U.esc(p.name) + '</td><td>' + (p.leaderId === member.id ? 'Project leader' : 'Team member') + '</td><td>' + p.progress + '%</td></tr>';
        }) + '</tbody></table>' +
      '<h3>Certificates</h3>' +
      '<table><thead><tr><th>Certificate</th><th>Number</th><th>Date</th></tr></thead><tbody>' +
        rows(certs, function (c) {
          return '<tr><td>' + U.esc(c.type) + '</td><td>' + U.esc(c.certificateNumber) + '</td><td>' + U.fmtDate(c.issueDate) + '</td></tr>';
        }) + '</tbody></table>' +
      '<h3>Achievements</h3>' +
      '<table><thead><tr><th>Achievement</th><th>Category</th><th>Date</th></tr></thead><tbody>' +
        rows(achievements, function (a) {
          return '<tr><td>' + U.esc(a.title) + '</td><td>' + U.esc(a.category) + '</td><td>' + U.fmtDate(a.date) + '</td></tr>';
        }) + '</tbody></table>' +
      '<div class="print-sign">' +
        '<div><div class="line"></div>Prepared by (Club Secretary)</div>' +
        '<div><div class="line"></div>Approved by (Club Patron)</div>' +
      '</div>',
      { meta: 'Member profile &middot; ' + U.fmtDate(new Date()) }
    );
  }

  function meetingMinutesHTML(meeting) {
    if (!meeting) return '';
    var members = Store.all('members');
    var nameOf = function (id) { var m = Store.find('members', id); return m ? m.fullName : (id || '—'); };
    var att = Store.where('attendance', function (a) { return a.contextType === 'meeting' && a.contextId === meeting.id; });
    var present = att.filter(function (a) { return a.status === 'Present' || a.status === 'Late'; });
    var absent = att.filter(function (a) { return a.status === 'Absent'; });

    return page(
      '<div class="print-doc-title"><h1>Minutes of Meeting</h1><p>' + U.esc(meeting.type) + ' &middot; ' + U.fmtDate(meeting.date, 'long') + '</p></div>' +
      '<table><tbody>' +
        '<tr><th style="width:28%">Meeting title</th><td>' + U.esc(meeting.title) + '</td></tr>' +
        '<tr><th>Date &amp; time</th><td>' + U.fmtDate(meeting.date, 'long') + ' at ' + U.fmtTime(meeting.time) + '</td></tr>' +
        '<tr><th>Venue</th><td>' + U.esc(meeting.venue) + '</td></tr>' +
        '<tr><th>Chairperson</th><td>' + U.esc(nameOf(meeting.chairperson)) + '</td></tr>' +
        '<tr><th>Secretary</th><td>' + U.esc(nameOf(meeting.secretary)) + '</td></tr>' +
        '<tr><th>Attendance</th><td>' + present.length + ' present &middot; ' + absent.length + ' absent &middot; ' + att.length + ' recorded</td></tr>' +
      '</tbody></table>' +
      '<h3>1. Agenda</h3><ol>' + (meeting.agenda || []).map(function (a) { return '<li>' + U.esc(a.text) + ' — <em>' + U.esc(nameOf(a.presenter)) + '</em></li>'; }).join('') + '</ol>' +
      '<h3>2. Minutes</h3><p>' + U.esc(meeting.minutes || 'Minutes were not recorded for this meeting.') + '</p>' +
      '<h3>3. Decisions</h3>' + ((meeting.decisions || []).length ? '<ol>' + meeting.decisions.map(function (d) { return '<li>' + U.esc(d) + '</li>'; }).join('') + '</ol>' : '<p>No decisions recorded.</p>') +
      '<h3>4. Action items</h3>' +
      ((meeting.actionItems || []).length
        ? '<table><thead><tr><th>#</th><th>Action</th><th>Responsible</th><th>Due date</th><th>Status</th></tr></thead><tbody>' +
          meeting.actionItems.map(function (a, i) {
            return '<tr><td>' + (i + 1) + '</td><td>' + U.esc(a.text) + '</td><td>' + U.esc(nameOf(a.owner)) + '</td><td>' + U.fmtDate(a.due) + '</td><td>' + U.esc(a.status) + '</td></tr>';
          }).join('') + '</tbody></table>'
        : '<p>No action items recorded.</p>') +
      '<h3>5. Attendance register</h3>' +
      '<table><thead><tr><th>#</th><th>Member</th><th>Class</th><th>Status</th><th>Remarks</th></tr></thead><tbody>' +
        att.map(function (a, i) {
          var m = U.findBy(members, 'id', a.memberId);
          return '<tr><td>' + (i + 1) + '</td><td>' + U.esc(m ? m.fullName : a.memberId) + '</td><td>' + U.esc(m ? m.klass : '') + '</td><td>' + U.esc(a.status) + '</td><td>' + U.esc(a.remarks || '') + '</td></tr>';
        }).join('') + '</tbody></table>' +
      '<p style="margin-top:14px"><strong>Follow-up date:</strong> ' + U.fmtDate(meeting.followUpDate) + '</p>' +
      '<div class="print-sign">' +
        '<div><div class="line"></div>' + U.esc(nameOf(meeting.secretary)) + '<br>Secretary</div>' +
        '<div><div class="line"></div>' + U.esc(nameOf(meeting.chairperson)) + '<br>Chairperson</div>' +
      '</div>',
      { meta: 'Meeting minutes &middot; ' + U.esc(meeting.meetingId) }
    );
  }

  function reportHTML(report) {
    if (!report) return '';
    var nameOf = function (id) { var u = Store.find('users', id); return u ? u.name : (Store.find('members', id) ? Store.find('members', id).fullName : (id || '—')); };
    var sections = [
      ['1. Introduction', report.introduction],
      ['2. Activities undertaken', report.activities],
      ['3. Achievements', report.achievements],
      ['4. Challenges', report.challenges],
      ['5. Solutions', report.solutions],
      ['6. Recommendations', report.recommendations],
      ['7. Conclusion', report.conclusion]
    ];
    return page(
      '<div class="print-doc-title"><h1>' + U.esc(report.title) + '</h1>' +
      '<p>' + U.esc(report.type) + ' &middot; Reporting period: ' + U.fmtDate(report.periodFrom) + ' — ' + U.fmtDate(report.periodTo) + '</p></div>' +
      sections.map(function (s) {
        return '<h3>' + U.esc(s[0]) + '</h3><p>' + U.esc(s[1] || '—') + '</p>';
      }).join('') +
      '<h3>Report details</h3>' +
      '<table><tbody>' +
        '<tr><th style="width:30%">Prepared by</th><td>' + U.esc(nameOf(report.preparedBy)) + '</td></tr>' +
        '<tr><th>Reviewed by</th><td>' + U.esc(nameOf(report.reviewedBy)) + '</td></tr>' +
        '<tr><th>Date</th><td>' + U.fmtDate(report.date, 'long') + '</td></tr>' +
        '<tr><th>Status</th><td>' + U.esc(report.status) + '</td></tr>' +
        '<tr><th>Reference</th><td>' + U.esc(report.reportId || report.id) + '</td></tr>' +
      '</tbody></table>' +
      '<div class="print-sign">' +
        '<div><div class="line"></div>Prepared by</div>' +
        '<div><div class="line"></div>Reviewed by (Patron)</div>' +
      '</div>',
      { meta: 'Club report &middot; ' + U.esc(report.reportId || '') }
    );
  }

  function attendanceSheetHTML(context) {
    var rows = Store.where('attendance', function (a) { return a.contextType === context.type && a.contextId === context.id; });
    var title = context.title || 'Attendance sheet';
    return page(
      '<div class="print-doc-title"><h1>Attendance Register</h1><p>' + U.esc(title) + ' &middot; ' + U.fmtDate(context.date, 'long') + '</p></div>' +
      '<table><thead><tr><th>#</th><th>Member</th><th>Member ID</th><th>Class</th><th>Status</th><th>Signature</th></tr></thead><tbody>' +
        rows.map(function (a, i) {
          var m = Store.find('members', a.memberId);
          return '<tr><td>' + (i + 1) + '</td><td>' + U.esc(m ? m.fullName : a.memberId) + '</td><td>' + U.esc(m ? m.memberId : '') + '</td>' +
            '<td>' + U.esc(m ? m.klass : '') + '</td><td>' + U.esc(a.status) + '</td><td style="width:22%"></td></tr>';
        }).join('') + '</tbody></table>' +
      '<div class="print-sign"><div><div class="line"></div>Recorded by</div><div><div class="line"></div>Verified by</div></div>',
      { meta: 'Attendance register' }
    );
  }

  /* All core files are loaded before DOMContentLoaded fires, so this is the
     earliest safe moment to build a stylesheet that also carries the card and
     background rules. */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectStyles);
  else injectStyles();

  global.Print = {
    preview: preview, print: print, page: page, stylesCSS: stylesCSS,
    injectStyles: injectStyles,
    certificate: certificateHTML, idCard: idCardHTML, memberProfile: memberProfileHTML,
    minutes: meetingMinutesHTML, report: reportHTML, attendanceSheet: attendanceSheetHTML,
    certificatePreviewHTML: certificateHTML,
    cards: function (records, opts) { return global.Cards ? Cards.sheetHTML(records, opts) : ''; }
  };
})(window);
