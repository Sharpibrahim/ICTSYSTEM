/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/documents.js
   The club document repository: constitution, policies, minutes, reports,
   project documentation, certificates, training materials, forms and
   competition documents — searchable, versioned and printable.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  function nameOf(id) {
    var m = Store.find('members', id), u = Store.find('users', id);
    return m ? m.fullName : (u ? u.name : (id || '—'));
  }
  function restricted(doc) {
    return doc.confidentiality === 'Cabinet only' && !Auth.can('documents', 'edit');
  }
  function sizeLabel(doc) {
    if (!doc.fileSize) return '—';
    return U.formatBytes(doc.fileSize);
  }
  function typeIcon(doc) {
    if (doc.link) return 'external-link';
    if (/pdf/i.test(doc.fileName || '')) return 'file-text';
    if (/\.(docx?|odt)$/i.test(doc.fileName || '')) return 'file-text';
    if (/\.(xlsx?|csv)$/i.test(doc.fileName || '')) return 'table';
    if (/\.(pptx?|odp)$/i.test(doc.fileName || '')) return 'presentation';
    return 'file';
  }

  var config = {
    key: 'documents',
    title: 'Documents',
    singular: 'document',
    icon: 'folder',
    module: 'documents',
    collection: 'documents',
    subtitle: 'Official club records, policies, minutes, forms and reference material.',
    stats: function () {
      var all = Store.all('documents');
      var byCat = U.groupBy(all, 'category');
      var thisYear = all.filter(function (d) { return U.toDate(d.date).getFullYear() === new Date().getFullYear(); }).length;
      return [
        { label: 'Documents filed', value: U.num(all.length), icon: 'folder', tone: 'primary', foot: thisYear + ' added this year' },
        { label: 'Categories', value: U.num(Object.keys(byCat).length), icon: 'layers', tone: 'secondary', foot: 'Of ' + Data.DOCUMENT_CATEGORIES.length + ' possible' },
        { label: 'Minutes & reports', value: U.num((byCat['Meeting Minutes'] || []).length + (byCat['Reports'] || []).length), icon: 'file-text', tone: 'accent', foot: 'Official club records' },
        { label: 'Cabinet only', value: U.num(all.filter(function (d) { return d.confidentiality === 'Cabinet only'; }).length), icon: 'lock', tone: 'warning', foot: 'Restricted access' }
      ];
    },
    schema: function (values) {
      return [
        { name: 'title', label: 'Document title', type: 'text', required: true, colSpan: 2, value: values.title },
        { name: 'category', label: 'Category', type: 'select', required: true, options: Data.DOCUMENT_CATEGORIES, value: values.category || 'Policies' },
        { name: 'owner', label: 'Owner / author', type: 'member', required: true, value: values.owner },
        { name: 'date', label: 'Date', type: 'date', required: true, value: values.date || U.todayISO() },
        { name: 'version', label: 'Version', type: 'text', value: values.version || 'v1.0', placeholder: 'e.g. v2.0' },
        { name: 'confidentiality', label: 'Access level', type: 'select', options: ['Members', 'Cabinet only', 'Public'], value: values.confidentiality || 'Members', required: true },
        { name: 'file', label: 'Attach file', type: 'file', colSpan: 2, accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg', help: 'Optional. The file is stored in the browser for this prototype.' },
        { name: 'link', label: 'External link', type: 'url', placeholder: 'https://…', value: values.link },
        { name: 'tags', label: 'Tags', type: 'tags', value: values.tags || [] },
        { name: 'summary', label: 'Summary / description', type: 'textarea', colSpan: 2, rows: 4, value: values.summary }
      ];
    },
    transform: function (data, values) {
      return {
        title: data.title, category: data.category, owner: data.owner, date: data.date,
        version: data.version, confidentiality: data.confidentiality, link: data.link,
        tags: data.tags || [], summary: data.summary,
        type: data.link ? 'Link' : 'File',
        fileName: values.fileName || '', fileSize: values.fileSize || 0, fileId: values.fileId || null,
        uploadedBy: Auth.currentUser() ? Auth.currentUser().id : null,
        demo: values.demo === true
      };
    },
    columns: [
      {
        key: 'title', label: 'Document',
        render: function (d) {
          return '<span class="cell-primary">' + Icons.svg(typeIcon(d), { size: 16 }) + ' ' +
            '<a href="#/documents/' + d.id + '" class="td-strong">' + U.esc(d.title) + '</a></span>' +
            (restricted(d) ? ' ' + Icons.svg('lock', { class: 'pin-ico', title: 'Cabinet only' }) : '') +
            '<br><span class="td-muted">' + U.esc(d.fileName || d.category) + (d.version ? ' · ' + U.esc(d.version) : '') + '</span>';
        }
      },
      { key: 'category', label: 'Category', render: function (d) { return UI.badge(d.category, 'secondary', { icon: 'folder' }); } },
      { key: 'owner', label: 'Owner', render: function (d) { return U.esc(nameOf(d.owner)); } },
      { key: 'date', label: 'Date', render: function (d) { return U.fmtDate(d.date) + '<br><span class="td-muted">' + U.timeAgo(d.date) + '</span>'; } },
      { key: 'fileSize', label: 'Size', render: function (d) { return '<span class="td-muted">' + sizeLabel(d) + '</span>'; } },
      { key: 'confidentiality', label: 'Access', render: function (d) { return UI.badge(d.confidentiality, d.confidentiality === 'Cabinet only' ? 'warning' : d.confidentiality === 'Public' ? 'success' : 'info', { icon: d.confidentiality === 'Cabinet only' ? 'lock' : 'users' }); } }
    ],
    filters: [
      { key: 'category', label: 'All categories', options: Data.DOCUMENT_CATEGORIES },
      { key: 'confidentiality', label: 'All access levels', options: ['Members', 'Cabinet only', 'Public'] },
      { key: 'type', label: 'All types', options: ['File', 'Link'] }
    ],
    searchKeys: function (d) { return [d.title, d.category, d.summary, d.fileName, nameOf(d.owner), (d.tags || []).join(' ')]; },
    exportColumns: [
      { key: 'title', label: 'Title' }, { key: 'category', label: 'Category' },
      { value: function (d) { return nameOf(d.owner); }, label: 'Owner' },
      { key: 'date', label: 'Date' }, { key: 'version', label: 'Version' },
      { key: 'confidentiality', label: 'Access' }, { key: 'fileName', label: 'File name' },
      { key: 'summary', label: 'Summary' }
    ],
    rowActions: function (d) {
      var out = CRUD.viewBtn('#/documents/' + d.id, 'document');
      if (d.link) out += CRUD.actionBtn('open', d.id, 'external-link', 'Open link');
      if (Auth.can('documents', 'edit')) out += CRUD.actionBtn('edit', d.id, 'edit', 'Edit document');
      if (Auth.can('documents', 'delete')) out += CRUD.actionBtn('delete', d.id, 'trash', 'Delete document', 'danger');
      return out;
    },
    onRowAction: function (action, d) {
      if (action === 'open') window.open(d.link, '_blank', 'noopener');
    },
    empty: { icon: 'folder', title: 'No documents filed', message: 'Store club policies, minutes, forms and reference material here.' },

    detailTitle: function (d) { return d.title; },
    detailSubtitle: function (d) { return d.category + ' · ' + (d.version || 'v1.0') + ' · filed ' + U.fmtDate(d.date, 'long'); },
    detailBadges: function (d) {
      return UI.badge(d.category, 'secondary', { icon: 'folder' }) + UI.badge(d.confidentiality, d.confidentiality === 'Cabinet only' ? 'warning' : 'info', { icon: 'lock' }) +
        UI.badge(d.version || 'v1.0', 'neutral') + (d.demo ? UI.demoChip() : '');
    },
    detailActions: function (d) {
      return (d.link ? '<a class="btn btn-primary btn-sm" href="' + U.attr(d.link) + '" target="_blank" rel="noopener">' + Icons.svg('external-link', { class: 'btn-ico' }) + 'Open link</a>' : '') +
        '<button type="button" class="btn btn-outline btn-sm" data-detail-action="cover">' + Icons.svg('print', { class: 'btn-ico' }) + 'Print cover sheet</button>';
    },
    detail: function (d) {
      if (restricted(d)) {
        return UI.card({
          body: UI.restricted('documents', 'This document is marked “Cabinet only”. Ask a cabinet member or the patron for access.')
        });
      }
      var related = Store.where('documents', function (x) { return x.id !== d.id && x.category === d.category; }).slice(0, 6);
      var main = UI.card({
        title: 'Document details', icon: 'file-text',
        body: UI.kvGrid([
          { label: 'Document ID', value: d.id },
          { label: 'Category', value: d.category },
          { label: 'Owner / author', html: '<a href="#/members/' + d.owner + '">' + U.esc(nameOf(d.owner)) + '</a>' },
          { label: 'Date filed', value: U.fmtDate(d.date, 'long') },
          { label: 'Version', value: d.version || 'v1.0' },
          { label: 'Access level', value: d.confidentiality },
          { label: 'File name', value: d.fileName || 'Not attached' },
          { label: 'File size', value: sizeLabel(d) },
          { label: 'Uploaded by', value: nameOf(d.uploadedBy) },
          { label: 'Tags', html: (d.tags || []).length ? UI.chipRow((d.tags || []).map(function (t) { return { label: t, icon: 'tag' }; })) : '—' }
        ]) +
        (d.summary ? '<div class="note-block mt-2"><strong>Summary</strong><br>' + U.esc(d.summary) + '</div>' : '') +
        '<div class="alert alert-info mt-2">' + Icons.svg('upload-cloud') +
          '<div>File attachments are kept in the browser for this prototype. Downloadable files and cloud storage will replace this when the platform is connected to a server.</div></div>' +
        (d.fileId ? '<button type="button" class="btn btn-outline btn-sm mt-1" data-detail-action="download">' + Icons.svg('download', { class: 'btn-ico' }) + 'Download attachment</button>' : '')
      });

      var side = UI.card({
        title: 'Related documents', icon: 'layers', sub: related.length + ' in ' + d.category,
        body: related.length ? '<div class="list-rows">' + related.map(function (x) {
          return '<a class="list-row" href="#/documents/' + x.id + '">' +
            '<span class="tl-dot">' + Icons.svg(typeIcon(x)) + '</span>' +
            '<span class="list-row-main"><strong>' + U.esc(x.title) + '</strong><span>' + U.esc(x.version || '') + ' · ' + U.fmtDate(x.date) + '</span></span></a>';
        }).join('') + '</div>' : '<p class="muted small">No other documents in this category.</p>'
      });

      return '<div class="grid cols-2" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">' + main + side + '</div>';
    },
    onDetailAction: function (action, btn, d) {
      if (action === 'cover') {
        Print.preview(Print.page(
          '<div class="print-doc-title"><h1>Document Cover Sheet</h1><p>' + U.esc(d.title) + '</p></div>' +
          '<table><tbody>' +
            '<tr><th style="width:32%">Title</th><td>' + U.esc(d.title) + '</td></tr>' +
            '<tr><th>Category</th><td>' + U.esc(d.category) + '</td></tr>' +
            '<tr><th>Owner / author</th><td>' + U.esc(nameOf(d.owner)) + '</td></tr>' +
            '<tr><th>Date filed</th><td>' + U.fmtDate(d.date, 'long') + '</td></tr>' +
            '<tr><th>Version</th><td>' + U.esc(d.version || 'v1.0') + '</td></tr>' +
            '<tr><th>Access level</th><td>' + U.esc(d.confidentiality) + '</td></tr>' +
            '<tr><th>File</th><td>' + U.esc(d.fileName || '—') + ' (' + sizeLabel(d) + ')</td></tr>' +
          '</tbody></table>' +
          (d.summary ? '<h3>Summary</h3><p>' + U.esc(d.summary) + '</p>' : '') +
          '<div class="print-sign"><div><div class="line"></div>Club Secretary</div><div><div class="line"></div>Received by</div></div>',
          { meta: 'Document cover sheet' }
        ), { title: 'Cover sheet — ' + d.title, icon: 'folder', fileName: 'mrhs-ict-document-cover' });
      }
      if (action === 'download' && d.fileId) {
        Store.files.get(d.fileId).then(function (file) {
          if (!file) { UI.toast('File not available', 'The attachment is no longer stored in this browser.', 'warning'); return; }
          var a = document.createElement('a');
          a.href = file.dataUrl; a.download = file.name || d.fileName || 'mrhs-ict-document';
          document.body.appendChild(a); a.click(); a.remove();
        });
      }
    },
    printDoc: function (d) {
      return {
        title: 'Document — ' + d.title,
        html: Print.page(
          '<div class="print-doc-title"><h1>' + U.esc(d.title) + '</h1><p>' + U.esc(d.category) + ' · ' + U.esc(d.version || 'v1.0') + '</p></div>' +
          '<table><tbody>' +
            '<tr><th style="width:32%">Owner</th><td>' + U.esc(nameOf(d.owner)) + '</td></tr>' +
            '<tr><th>Date</th><td>' + U.fmtDate(d.date, 'long') + '</td></tr>' +
            '<tr><th>Access</th><td>' + U.esc(d.confidentiality) + '</td></tr>' +
          '</tbody></table>' +
          '<p>' + U.esc(d.summary || '') + '</p>',
          { meta: 'Club document' }
        )
      };
    }
  };

  ModuleHelper.page(config);

  global.Modules = global.Modules || {};
  global.Modules.Documents = {
    config: config,
    openForm: function (values) {
      if (values && values.id) return ModuleHelper.openEdit(config, Store.find('documents', values.id));
      return ModuleHelper.openCreate(config, values || {});
    },
    nameOf: nameOf,
    typeIcon: typeIcon
  };
})(window);
