/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/certificates.js
   Certificate issuing: participation, completion, excellence, leadership,
   training and appreciation awards with preview, printing and verification.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  function nameOf(id) {
    var m = Store.find('members', id);
    return m ? m.fullName : (id || '—');
  }
  function nextNumber() {
    var prefix = (Store.settings().certificatePrefix || 'MRHSICT') + '-' + new Date().getFullYear() + '-CERT-';
    var nums = Store.all('certificates').map(function (c) { return c.certificateNumber || ''; })
      .filter(function (n) { return n.indexOf(prefix) === 0; })
      .map(function (n) { return parseInt(n.slice(prefix.length), 10) || 0; });
    var next = (nums.length ? Math.max.apply(null, nums) : 0) + 1;
    return prefix + String(next).padStart(4, '0');
  }
  function certOf(rec) {
    return {
      certificateNumber: rec.certificateNumber, recipientName: nameOf(rec.recipientId),
      type: rec.type, achievement: rec.achievement, issueDate: rec.issueDate,
      issuedBy: nameOf(rec.issuedBy), signedByPatron: nameOf(rec.signedByPatron),
      clubName: Store.settings().clubName, schoolName: Store.settings().schoolName
    };
  }
  function findNumber(num) {
    var q = U.norm(String(num || '').replace(/\s+/g, ''));
    return U.findBy(Store.all('certificates'), function (c) {
      return U.norm(String(c.certificateNumber || '').replace(/[\s-]/g, '')) === q.replace(/[-]/g, '');
    });
  }

  /* ══ Verification ═════════════════════════════════════════════════════ */
  function openVerify(prefill) {
    var ctrl = UI.modal({
      title: 'Verify a certificate',
      subtitle: 'Enter the certificate number printed at the bottom of the document.',
      icon: 'shield-check', size: 'md',
      body: '<div class="alert alert-info">' + Icons.svg('info') +
          '<div>Every certificate issued by the club is recorded. Verification confirms the number, recipient, award type and date of issue.</div></div>' +
        '<form id="verify-form" class="mt-1">' +
          '<div class="field"><label for="verify-input">Certificate number</label>' +
          '<input type="text" id="verify-input" name="number" value="' + U.attr(prefill || '') + '" placeholder="MRHSICT-2026-CERT-0001" autocomplete="off" spellcheck="false"></div>' +
        '</form>' +
        '<div id="verify-result" aria-live="polite"></div>',
      actions: [
        { label: 'Close', tone: 'ghost', onClick: function (c) { c.close(); } },
        { label: 'Verify certificate', tone: 'primary', icon: 'shield-check', onClick: function (c) {
            var val = c.modal.querySelector('#verify-input').value;
            var out = c.modal.querySelector('#verify-result');
            var rec = findNumber(val);
            if (!rec) {
              out.innerHTML = '<div class="alert alert-danger mt-2">' + Icons.svg('x-circle') +
                '<div><strong>No certificate found</strong>No certificate with the number <code>' + U.esc(val) + '</code> is recorded in the club register. ' +
                'Check the number and try again, or contact the club secretary.</div></div>';
              return;
            }
            var revoked = rec.status === 'Revoked';
            out.innerHTML = '<div class="alert ' + (revoked ? 'alert-danger' : 'alert-success') + ' mt-2">' +
              Icons.svg(revoked ? 'alert-triangle' : 'badge-check') +
              '<div><strong>' + (revoked ? 'Certificate revoked' : 'Certificate verified') + '</strong>' +
              '<div class="kv-grid mt-1">' +
                '<div class="kv"><span class="kv-label">Certificate number</span><span class="kv-value">' + U.esc(rec.certificateNumber) + '</span></div>' +
                '<div class="kv"><span class="kv-label">Recipient</span><span class="kv-value">' + U.esc(nameOf(rec.recipientId)) + '</span></div>' +
                '<div class="kv"><span class="kv-label">Award</span><span class="kv-value">' + U.esc(rec.type) + '</span></div>' +
                '<div class="kv"><span class="kv-label">Issued on</span><span class="kv-value">' + U.fmtDate(rec.issueDate, 'long') + '</span></div>' +
                '<div class="kv"><span class="kv-label">Signed by</span><span class="kv-value">' + U.esc(nameOf(rec.signedByPatron)) + ', Club Patron</span></div>' +
              '</div>' +
              (rec.revokedReason ? '<p class="small mt-1"><strong>Reason:</strong> ' + U.esc(rec.revokedReason) + '</p>' : '') +
              '</div></div>';
          } }
      ]
    });
    var input = ctrl.modal.querySelector('#verify-input');
    if (prefill) ctrl.modal.querySelector('button.btn-primary').click();
    else setTimeout(function () { input.focus(); }, 120);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); ctrl.modal.querySelector('button.btn-primary').click(); }
    });
    return ctrl;
  }

  /* ══ List ═════════════════════════════════════════════════════════════ */
  var config = {
    key: 'certificates',
    title: 'Certificates',
    singular: 'certificate',
    icon: 'award',
    module: 'certificates',
    collection: 'certificates',
    subtitle: 'Issue, preview, print and verify club certificates with a permanent register of numbers.',
    stats: function () {
      var c = Metrics.certificates();
      return [
        { label: 'Certificates issued', value: U.num(c.total - c.revoked), icon: 'award', tone: 'primary', foot: c.thisYear + ' issued this year' },
        { label: 'Completions', value: U.num(c.byType['Completion'] || 0), icon: 'graduation', tone: 'success', foot: 'Course completion awards' },
        { label: 'Excellence & leadership', value: U.num((c.byType['Excellence'] || 0) + (c.byType['Leadership'] || 0)), icon: 'star', tone: 'warning', foot: 'Recognising top members' },
        { label: 'Revoked', value: U.num(c.revoked), icon: 'x-circle', tone: c.revoked ? 'danger' : 'neutral', foot: 'Removed from circulation' }
      ];
    },
    headActions: function () {
      return '<button type="button" class="btn btn-outline btn-sm" data-mod-action="verify">' + Icons.svg('shield-check', { class: 'btn-ico' }) + 'Verify certificate</button>' +
        (global.CertBG && CertBG.canEdit && CertBG.canEdit()
          ? '<button type="button" class="btn btn-primary btn-sm" data-mod-action="background">' + Icons.svg('image', { class: 'btn-ico' }) + 'Certificate background</button>'
          : '');
    },
    schema: function (values) {
      var recipient = values.recipientId;
      return [
        { name: 'recipientId', label: 'Recipient', type: 'member', required: true, value: recipient, colSpan: 2,
          help: values.courseId ? 'Pre-filled from the course completion list.' : 'The member receiving this certificate.' },
        { name: 'type', label: 'Certificate type', type: 'select', required: true, options: Data.CERTIFICATE_TYPES, value: values.type || 'Certificate of Participation', colSpan: 2 },
        { name: 'certificateNumber', label: 'Certificate number', type: 'text', required: true, value: values.certificateNumber || nextNumber(), pattern: '^MRHSICT-[0-9]{4}-CERT-[0-9]{4}$',
          help: 'Format: MRHSICT-YYYY-CERT-0000. Generated automatically and recorded in the register.' },
        { name: 'issueDate', label: 'Date of issue', type: 'date', required: true, value: values.issueDate || U.todayISO() },
        { name: 'courseId', label: 'Related course', type: 'select', required: false, value: values.courseId,
          options: function () { return [{ value: '', label: '— None —' }].concat(Store.all('courses').map(function (c) { return { value: c.id, label: c.name }; })); } },
        { name: 'relatedEvent', label: 'Related event or competition', type: 'text', value: values.relatedEvent, placeholder: 'e.g. National Schools ICT Expo 2026' },
        { name: 'achievement', label: 'Achievement / citation wording', type: 'textarea', required: true, colSpan: 2, rows: 3,
          value: values.achievement || 'For outstanding participation and contribution to the programmes of the MRHS ICT Club.' },
        { name: 'issuedBy', label: 'Issued by (Club President)', type: 'member', required: true, value: values.issuedBy },
        { name: 'signedByPatron', label: 'Signed by (Club Patron)', type: 'member', required: true, value: values.signedByPatron },
        { name: 'status', label: 'Status', type: 'select', options: ['Issued', 'Pending', 'Revoked'], value: values.status || 'Issued', required: true },
        { name: 'remarks', label: 'Internal remarks', type: 'textarea', rows: 2, colSpan: 2, value: values.remarks, help: 'Not printed on the certificate.' }
      ];
    },
    transform: function (data, values) {
      return {
        recipientId: data.recipientId, recipientName: nameOf(data.recipientId), type: data.type,
        certificateNumber: data.certificateNumber.toUpperCase(),
        issueDate: data.issueDate, achievement: data.achievement, courseId: data.courseId,
        relatedEvent: data.relatedEvent, issuedBy: data.issuedBy, signedByPatron: data.signedByPatron,
        status: data.status, remarks: data.remarks, demo: values.demo === true
      };
    },
    beforeSave: function (data, editingId) {
      var dupe = U.findBy(Store.all('certificates'), function (c) {
        return c.id !== editingId && U.norm(c.certificateNumber) === U.norm(data.certificateNumber);
      });
      if (dupe) return { certificateNumber: 'That certificate number has already been issued. Every number must be unique.' };
      return null;
    },
    afterSave: function (rec) {
      if (!rec.id) return;
      var stored = Store.find('certificates', rec.id);
      if (stored.status === 'Issued') {
        Store.insert('notifications', {
          demo: true, type: 'certificate', title: 'Certificate issued to ' + nameOf(rec.recipientId),
          message: rec.type + ' · ' + rec.certificateNumber, icon: 'award',
          link: '#/certificates/' + rec.id, at: new Date().toISOString(), read: false
        });
      }
    },
    columns: [
      {
        key: 'certificateNumber', label: 'Certificate no.',
        render: function (c) {
          return '<a href="#/certificates/' + c.id + '" class="td-strong mono">' + U.esc(c.certificateNumber) + '</a>' +
            '<br><span class="td-muted">Issued ' + U.fmtDate(c.issueDate) + '</span>';
        }
      },
      { key: 'recipientId', label: 'Recipient', render: function (c) { return UI.personCell(nameOf(c.recipientId), Store.find('members', c.recipientId) ? Store.find('members', c.recipientId).klass : '', { size: 'xs', link: '#/members/' + c.recipientId }); } },
      { key: 'type', label: 'Award', render: function (c) { return UI.badge(c.type.replace('Certificate of ', ''), 'secondary', { icon: 'award' }); } },
      { key: 'achievement', label: 'Citation', render: function (c) { return '<span class="small">' + U.esc(U.truncate(c.achievement, 70)) + '</span>'; } },
      { key: 'status', label: 'Status', render: function (c) { return UI.statusBadge(c.status); } }
    ],
    filters: [
      { key: 'type', label: 'All award types', options: Data.CERTIFICATE_TYPES },
      { key: 'status', label: 'All statuses', options: ['Issued', 'Pending', 'Revoked'] },
      { key: 'year', label: 'All years', value: function (c) { return U.toDate(c.issueDate).getFullYear(); }, options: U.uniq(Store.all('certificates').map(function (c) { return U.toDate(c.issueDate).getFullYear(); })).sort().reverse() }
    ],
    searchKeys: function (c) { return [c.certificateNumber, c.type, c.achievement, c.relatedEvent, nameOf(c.recipientId), nameOf(c.issuedBy), nameOf(c.signedByPatron)]; },
    exportColumns: [
      { key: 'certificateNumber', label: 'Certificate no.' },
      { value: function (c) { return nameOf(c.recipientId); }, label: 'Recipient' },
      { key: 'type', label: 'Award' }, { key: 'achievement', label: 'Citation' },
      { key: 'issueDate', label: 'Issued on' },
      { value: function (c) { return nameOf(c.issuedBy); }, label: 'Issued by' },
      { value: function (c) { return nameOf(c.signedByPatron); }, label: 'Patron' },
      { key: 'status', label: 'Status' }
    ],
    rowActions: function (c) {
      var out = CRUD.viewBtn('#/certificates/' + c.id, 'certificate');
      out += CRUD.actionBtn('preview', c.id, 'eye', 'Preview certificate');
      out += CRUD.actionBtn('print', c.id, 'print', 'Print certificate');
      if (Auth.can('certificates', 'edit')) out += CRUD.actionBtn('edit', c.id, 'edit', 'Edit certificate');
      if (Auth.can('certificates', 'delete')) out += CRUD.actionBtn('delete', c.id, 'trash', 'Delete certificate', 'danger');
      return out;
    },
    onRowAction: function (action, c) {
      if (action === 'preview' || action === 'print') {
        Print.preview(Print.certificate(certOf(c)), {
          title: 'Certificate — ' + nameOf(c.recipientId),
          subtitle: c.certificateNumber + ' · ' + c.type,
          icon: 'award',
          fileName: 'mrhs-ict-certificate-' + c.certificateNumber
        });
      }
    },
    onAction: function (action) {
      if (action === 'verify') openVerify();
      if (action === 'background' && global.CertBG) { CertBG.openDesigner({ onChange: function () { Router.refresh(); } }); }
    },
    empty: { icon: 'award', title: 'No certificates issued yet', message: 'Issue the first certificate to a member who has completed a course or represented the club.' },

    detailTitle: function (c) { return nameOf(c.recipientId); },
    detailSubtitle: function (c) { return c.certificateNumber + ' · ' + c.type; },
    detailBadges: function (c) {
      return UI.statusBadge(c.status) + UI.badge(c.type.replace('Certificate of ', ''), 'secondary', { icon: 'award' }) +
        (c.demo ? UI.demoChip() : '');
    },
    detailActions: function (c) {
      return '<button type="button" class="btn btn-primary btn-sm" data-detail-action="preview">' + Icons.svg('eye', { class: 'btn-ico' }) + 'Preview & print</button>' +
        (Auth.can('certificates', 'edit') ? '<button type="button" class="btn btn-outline btn-sm" data-detail-action="copy">' + Icons.svg('copy', { class: 'btn-ico' }) + 'Copy share link</button>' : '') +
        (Auth.can('certificates', 'edit') && c.status === 'Issued' ? '<button type="button" class="btn btn-danger-outline btn-sm" data-detail-action="revoke">' + Icons.svg('x-circle', { class: 'btn-ico' }) + 'Revoke</button>' : '');
    },
    detail: function (c) {
      var member = Store.find('members', c.recipientId);
      var course = c.courseId ? Store.find('courses', c.courseId) : null;

      var designName = (global.CertBG && CertBG.design) ? (CertBG.designNames[CertBG.design()] || '') : '';
      var preview = UI.card({
        title: 'Certificate preview', icon: 'award', sub: 'Exactly as it will print',
        body: '<div class="cert-frame">' + Print.certificate(certOf(c)) + '</div>' +
          '<div class="flex gap-1 wrap mt-2">' +
            '<button type="button" class="btn btn-primary btn-sm" data-detail-action="preview">' + Icons.svg('print', { class: 'btn-ico' }) + 'Print / save PDF</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-detail-action="download">' + Icons.svg('download', { class: 'btn-ico' }) + 'Download</button>' +
            (global.CertBG && CertBG.canEdit && CertBG.canEdit()
              ? '<button type="button" class="btn btn-outline btn-sm" data-detail-action="background">' + Icons.svg('image', { class: 'btn-ico' }) + 'Change background</button>'
              : '') +
          '</div>' +
          '<p class="help mt-2">' + Icons.svg('award') + ' Background: <strong>' + designName + '</strong> · A4 landscape 297 × 210 mm. ' +
            (CertBG.canEdit && CertBG.canEdit() ? 'Click <em>Change background</em> to switch design, upload your own image, or align the content.' : 'Ask the Administrator to change the design.') + '</p>'
      });

      var side = UI.card({
        title: 'Register entry', icon: 'clipboard-list',
        body: UI.kvGrid([
          { label: 'Certificate number', html: '<span class="mono">' + U.esc(c.certificateNumber) + '</span>' },
          { label: 'Award type', value: c.type.replace('Certificate of ', '') },
          { label: 'Recipient', html: member ? '<a href="#/members/' + member.id + '">' + U.esc(member.fullName) + '</a>' : '—' },
          { label: 'Class', value: member ? member.klass + ' ' + (member.stream || '') : '—' },
          { label: 'Date of issue', value: U.fmtDate(c.issueDate, 'long') },
          { label: 'Issued by', value: nameOf(c.issuedBy) },
          { label: 'Signed by patron', value: nameOf(c.signedByPatron) },
          { label: 'Related course', html: course ? '<a href="#/courses/' + course.id + '">' + U.esc(course.name) + '</a>' : '—' },
          { label: 'Event', value: c.relatedEvent || '—' },
          { label: 'Status', html: UI.statusBadge(c.status) }
        ]) +
        '<div class="divider-text"><span>Citation</span></div>' +
        '<p class="small" style="white-space:pre-line">' + U.esc(c.achievement || '') + '</p>' +
        (c.remarks ? '<div class="note-block mt-2"><strong>Internal remarks</strong><br>' + U.esc(c.remarks) + '</div>' : '') +
        '<div class="alert alert-success mt-2">' + Icons.svg('shield-check') + '<div>Verification: ' +
          '<a href="#/certificates" data-verify="' + U.attr(c.certificateNumber) + '">check this number</a> in the club register at any time.</div></div>'
      });

      return '<div class="grid cols-2" style="grid-template-columns:minmax(0,1.7fr) minmax(0,1fr)">' + preview + side + '</div>';
    },
    onDetailAction: function (action, btn, c) {
      if (action === 'background' && global.CertBG) {
        CertBG.openDesigner({ onChange: function () { Router.refresh(); } });
        return;
      }
      if (action === 'preview') {
        Print.preview(Print.certificate(certOf(c)), {
          title: 'Certificate — ' + nameOf(c.recipientId), icon: 'award',
          subtitle: c.certificateNumber, fileName: 'mrhs-ict-certificate-' + c.certificateNumber,
          extraActions: (global.CertBG && CertBG.canEdit && CertBG.canEdit())
            ? [{ label: 'Certificate background', tone: 'ghost', icon: 'image', onClick: function () { CertBG.openDesigner({ onChange: function () { CertBG.refreshLayers(); } }); } }]
            : []
        });
      }
      if (action === 'download') {
        var doc = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + U.esc(c.certificateNumber) + '</title>' +
          '<style>' + Print.stylesCSS() + '</style></head><body>' + Print.certificate(certOf(c)) + '</body></html>';
        U.download('mrhs-ict-certificate-' + c.certificateNumber + '.html', doc, 'text/html;charset=utf-8');
        UI.toast('Certificate downloaded', 'Open the file and print it, or save it as a PDF.', 'success');
      }
      if (action === 'copy') {
        var text = 'MRHS ICT Club certificate ' + c.certificateNumber + ' issued to ' + nameOf(c.recipientId) + ' on ' + U.fmtDate(c.issueDate, 'long') + '.';
        U.copyToClipboard(text).then(function () {
          UI.toast('Copied to clipboard', text, 'success');
        });
      }
      if (action === 'revoke') {
        UI.formModal({
          title: 'Revoke certificate', subtitle: c.certificateNumber, icon: 'x-circle', size: 'sm',
          formHtml: Forms.render([
            { name: 'reason', label: 'Reason for revocation', type: 'textarea', rows: 3, required: true, colSpan: 2,
              help: 'This is recorded in the register. The certificate will show as revoked when verified.' }
          ]),
          submitLabel: 'Revoke certificate', submitTone: 'danger',
          onOpen: function (c2, form) { Forms.init(form); },
          onSubmit: function (data) {
            Store.update('certificates', c.id, { status: 'Revoked', revokedReason: data.reason, revokedAt: new Date().toISOString(), revokedBy: Auth.currentUser().id });
            UI.toast('Certificate revoked', 'The register now shows this certificate as revoked.', 'warning');
            Router.refresh();
          }
        });
      }
    },
    onDetailMount: function (ctx, root, c) {
      var link = root.querySelector('[data-verify]');
      if (link) link.addEventListener('click', function (e) { e.preventDefault(); openVerify(c.certificateNumber); });
    },
    printDoc: function (c) { return { html: Print.certificate(certOf(c)), title: c.certificateNumber }; }
  };

  ModuleHelper.page(config);

  /* ══ Public verification page ═════════════════════════════════════════ */
  Router.view('/verify', {
    title: 'Verify a certificate', icon: 'shield-check', module: 'certificates',
    render: function () {
      if (!Auth.can('certificates', 'view')) return UI.restricted('certificates');
      var recent = U.sortBy(Store.all('certificates'), 'issueDate', 'desc').slice(0, 8);
      return '<div class="page">' +
        UI.pageHeader({
          title: 'Verify a certificate', icon: 'shield-check',
          subtitle: 'Confirm that a certificate presented to you was genuinely issued by the club.',
          actions: '<button type="button" class="btn btn-outline" data-verify-open>' + Icons.svg('search', { class: 'btn-ico' }) + 'Open verification dialog</button>'
        }) +
        '<div class="grid cols-2" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)">' +
          UI.card({
            title: 'Check a certificate number', icon: 'search',
            body: '<form id="verify-page-form" class="form-grid">' +
                '<div class="field col-2"><label for="verify-page-input">Certificate number</label>' +
                '<input type="text" id="verify-page-input" name="number" placeholder="MRHSICT-2026-CERT-0001" autocomplete="off" spellcheck="false">' +
                '<p class="help">The number is printed at the bottom of the certificate, in the format PREFIX-YEAR-CERT-0000.</p></div>' +
              '</form>' +
              '<div class="flex gap-1 mt-1"><button type="button" class="btn btn-primary" data-verify-check>' + Icons.svg('shield-check', { class: 'btn-ico' }) + 'Verify</button>' +
              '<button type="button" class="btn btn-ghost" data-verify-demo>' + Icons.svg('wand', { class: 'btn-ico' }) + 'Use a sample number</button></div>' +
              '<div id="verify-page-result" class="mt-2" aria-live="polite"></div>' +
              '<div class="alert alert-info mt-2">' + Icons.svg('info') +
                '<div>Verification is available to signed-in club members. Anyone can ask a cabinet member to check a certificate number on their behalf.</div></div>'
          }) +
          UI.card({
            title: 'Recently issued certificates', icon: 'award', sub: recent.length + ' latest entries',
            body: recent.length ? '<div class="list-rows">' + recent.map(function (c) {
              return '<button type="button" class="list-row" data-verify-use="' + U.attr(c.certificateNumber) + '">' +
                '<span class="tl-dot">' + Icons.svg('award') + '</span>' +
                '<span class="list-row-main"><strong>' + U.esc(c.recipientName || nameOf(c.recipientId)) + '</strong>' +
                '<span>' + U.esc(c.certificateNumber) + ' · ' + U.fmtDate(c.issueDate) + '</span></span>' +
                '<span class="list-row-side">' + UI.statusBadge(c.status) + '</span></button>';
            }).join('') + '</div>' : '<p class="muted small">No certificates have been issued yet.</p>',
            foot: '<span class="muted small">' + Icons.svg('lock') + ' Only a cabinet member can change a certificate record.</span>'
          }) +
        '</div></div>';
    },
    mount: function (ctx, root) {
      function check() {
        var val = (U.$('#verify-page-input', root) || {}).value || '';
        var rec = findNumber(val);
        var out = U.$('#verify-page-result', root);
        if (!rec) {
          out.innerHTML = '<div class="alert alert-danger">' + Icons.svg('x-circle') +
            '<div><strong>No certificate found</strong>No certificate with the number <code>' + U.esc(val) + '</code> is recorded in the club register.</div></div>';
          return;
        }
        var revoked = rec.status === 'Revoked';
        out.innerHTML = '<div class="alert ' + (revoked ? 'alert-danger' : 'alert-success') + '">' +
          Icons.svg(revoked ? 'alert-triangle' : 'badge-check') +
          '<div><strong>' + (revoked ? 'Certificate revoked' : 'Certificate verified') + '</strong>' +
          '<div class="kv-grid mt-1">' +
            '<div class="kv"><span class="k">Certificate number</span><span class="v">' + U.esc(rec.certificateNumber) + '</span></div>' +
            '<div class="kv"><span class="k">Recipient</span><span class="v">' + U.esc(rec.recipientName || nameOf(rec.recipientId)) + '</span></div>' +
            '<div class="kv"><span class="k">Award</span><span class="v">' + U.esc(rec.type) + '</span></div>' +
            '<div class="kv"><span class="k">Issued on</span><span class="v">' + U.fmtDate(rec.issueDate, 'long') + '</span></div>' +
            '<div class="kv"><span class="k">Signed by</span><span class="v">' + U.esc(nameOf(rec.signedByPatron)) + ', Club Patron</span></div>' +
          '</div>' +
          '<a class="link-btn mt-1" href="#/certificates/' + rec.id + '">Open the register entry ' + Icons.svg('arrow-right') + '</a>' +
          '</div></div>';
      }
      root.addEventListener('click', function (e) {
        if (e.target.closest('[data-verify-check]')) { check(); return; }
        if (e.target.closest('[data-verify-open]')) { openVerify(); return; }
        if (e.target.closest('[data-verify-demo]')) {
          var list = Store.all('certificates');
          var pick = list.length ? U.sortBy(list, 'issueDate', 'desc')[0] : null;
          U.$('#verify-page-input', root).value = pick ? pick.certificateNumber : 'MRHSICT-2026-CERT-0001';
          check();
          return;
        }
        var use = e.target.closest('[data-verify-use]');
        if (use) { U.$('#verify-page-input', root).value = use.getAttribute('data-verify-use'); check(); }
      });
      var form = U.$('#verify-page-form', root);
      if (form) form.addEventListener('submit', function (e) { e.preventDefault(); check(); });
    }
  });

  global.Modules = global.Modules || {};
  global.Modules.Certificates = {
    config: config,
    openForm: function (values) {
      values = values || {};
      if (values.id) return ModuleHelper.openEdit(config, Store.find('certificates', values.id));
      var preset = {};
      if (values.recipientId) {
        var m = Store.find('members', values.recipientId);
        preset.recipientId = values.recipientId;
        if (values.courseId) {
          var course = Store.find('courses', values.courseId);
          if (course) {
            preset.type = 'Certificate of Completion';
            preset.courseId = course.id;
            preset.achievement = 'For successfully completing the ' + course.name + ' course offered by the MRHS ICT Club.';
          }
        } else if (m) {
          preset.achievement = 'For outstanding participation and contribution to the programmes of the MRHS ICT Club.';
        }
      }
      if (values.type) preset.type = values.type;
      var president = U.findBy(Store.all('members'), function (x) { return /president/i.test(x.clubRole || ''); });
      var patron = U.findBy(Store.all('members'), function (x) { return /patron/i.test(x.clubRole || ''); });
      if (president) preset.issuedBy = president.id;
      if (patron) preset.signedByPatron = patron.id;
      return ModuleHelper.openCreate(config, preset);
    },
    nextNumber: nextNumber,
    certOf: certOf,
    openVerify: openVerify,
    findNumber: findNumber
  };
})(window);
