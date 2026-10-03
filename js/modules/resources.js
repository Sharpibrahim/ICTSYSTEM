/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/notes.js
   Notes & Resources: lecture notes, tutorials, past papers, code samples,
   videos, books, templates and club documents collected in one library.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  function nameOf(id) {
    var m = Store.find('members', id);
    return m ? m.fullName : (id || '—');
  }
  function fileLabel(res) {
    if (res.link) return '<a href="' + U.attr(res.link) + '" target="_blank" rel="noopener">' + Icons.svg('external-link', { class: 'btn-ico' }) + U.esc(res.link.replace(/^https?:\/\//, '')) + '</a>';
    if (res.fileName) return '<span class="file-chip">' + Icons.svg('paperclip') + U.esc(res.fileName) + (res.fileSize ? ' <span class="muted">(' + U.formatBytes(res.fileSize) + ')</span>' : '') + '</span>';
    return '<span class="muted">No attachment</span>';
  }

  var config = {
    key: 'resources',
    title: 'Notes & Resources',
    singular: 'resource',
    icon: 'book-open',
    module: 'resources',
    collection: 'resources',
    subtitle: 'The club library: lesson notes, tutorials, past papers, code samples, videos and templates.',
    stats: function () {
      var r = Metrics.resources();
      return [
        { label: 'Resources', value: U.num(r.total), icon: 'book-open', tone: 'primary', foot: r.categories + ' categories in use' },
        { label: 'Notes & tutorials', value: U.num((r.byCategory['Lesson Notes'] || 0) + (r.byCategory['Tutorials'] || 0)), icon: 'edit', tone: 'secondary', foot: 'Core learning material' },
        { label: 'Past papers & samples', value: U.num((r.byCategory['Past Papers'] || 0) + (r.byCategory['Code Samples'] || 0)), icon: 'code', tone: 'accent', foot: 'Practice material' },
        { label: 'Added this term', value: U.num(r.recent), icon: 'clock', tone: 'success', foot: 'In the last 90 days' }
      ];
    },
    schema: function (values) {
      return [
        { name: 'title', label: 'Title', type: 'text', required: true, colSpan: 2, value: values.title },
        { name: 'category', label: 'Category', type: 'select', required: true, options: Data.RESOURCE_CATEGORIES, value: values.category || 'Lesson Notes' },
        { name: 'author', label: 'Author / source', type: 'member', required: true, value: values.author },
        { name: 'date', label: 'Date added', type: 'date', required: true, value: values.date || U.todayISO() },
        { name: 'courseId', label: 'Related course', type: 'select', value: values.courseId,
          options: function () { return [{ value: '', label: '— None —' }].concat(Store.all('courses').map(function (c) { return { value: c.id, label: c.name }; })); } },
        { name: 'link', label: 'External link', type: 'url', placeholder: 'https://…', value: values.link, help: 'Leave blank if you are describing a printed or classroom resource.' },
        { name: 'tags', label: 'Tags', type: 'tags', colSpan: 2, value: values.tags || [], help: 'Press Enter after each tag, e.g. HTML, forms, revision.' },
        { name: 'description', label: 'Description', type: 'textarea', colSpan: 2, rows: 4, required: true, value: values.description },
        { name: 'content', label: 'Notes / summary', type: 'textarea', colSpan: 2, rows: 6, value: values.content, help: 'Optional summary the club can read directly in the app.' }
      ];
    },
    transform: function (data, values) {
      return {
        title: data.title, description: data.description, category: data.category, author: data.author,
        date: data.date, link: data.link, tags: data.tags || [], content: data.content,
        courseId: data.courseId, fileName: values.fileName || '', fileSize: values.fileSize || 0,
        fileId: values.fileId || null, demo: values.demo === true
      };
    },
    columns: [
      {
        key: 'title', label: 'Resource',
        render: function (r) {
          return '<a href="#/resources/' + r.id + '" class="td-strong">' + U.esc(r.title) + '</a>' +
            '<br><span class="td-muted">' + U.esc(U.truncate(r.description, 78)) + '</span>';
        }
      },
      { key: 'category', label: 'Category', render: function (r) { return UI.badge(r.category, 'secondary', { icon: 'book-open' }); } },
      { key: 'author', label: 'Author', render: function (r) { return U.esc(nameOf(r.author)); } },
      { key: 'tags', label: 'Tags', sortable: false, render: function (r) { return (r.tags || []).length ? UI.chipRow((r.tags || []).slice(0, 3).map(function (t) { return { label: t }; })) : '<span class="td-muted">—</span>'; } },
      { key: 'date', label: 'Added', render: function (r) { return U.fmtDate(r.date) + '<br><span class="td-muted">' + U.timeAgo(r.date) + '</span>'; } }
    ],
    filters: [
      { key: 'category', label: 'All categories', options: Data.RESOURCE_CATEGORIES },
      { key: 'courseId', label: 'All courses', value: function (r) { return r.courseId || ''; }, options: function () {
          return [{ value: '', label: 'Not linked to a course' }].concat(Store.all('courses').map(function (c) { return { value: c.id, label: c.name }; }));
        } }
    ],
    searchKeys: function (r) { return [r.title, r.description, r.category, r.content, nameOf(r.author), (r.tags || []).join(' ')]; },
    exportColumns: [
      { key: 'title', label: 'Title' }, { key: 'category', label: 'Category' },
      { value: function (r) { return nameOf(r.author); }, label: 'Author' },
      { key: 'date', label: 'Date added' }, { key: 'description', label: 'Description' },
      { value: function (r) { return (r.tags || []).join('; '); }, label: 'Tags' }, { key: 'link', label: 'Link' }
    ],
    rowActions: function (r) {
      var out = CRUD.viewBtn('#/resources/' + r.id, 'resource');
      if (r.link) out += CRUD.actionBtn('open', r.id, 'external-link', 'Open link');
      if (Auth.can('resources', 'edit')) out += CRUD.actionBtn('edit', r.id, 'edit', 'Edit resource');
      if (Auth.can('resources', 'delete')) out += CRUD.actionBtn('delete', r.id, 'trash', 'Delete resource', 'danger');
      return out;
    },
    onRowAction: function (action, r) {
      if (action === 'open') window.open(r.link, '_blank', 'noopener');
    },
    empty: { icon: 'book-open', title: 'The library is empty', message: 'Add lesson notes, tutorials or past papers so members can revise between sessions.' },

    detailTitle: function (r) { return r.title; },
    detailSubtitle: function (r) { return r.category + ' · added by ' + nameOf(r.author) + ' on ' + U.fmtDate(r.date, 'long'); },
    detailBadges: function (r) {
      return UI.badge(r.category, 'secondary', { icon: 'book-open' }) +
        (r.courseId && Store.find('courses', r.courseId) ? UI.badge(Store.find('courses', r.courseId).name, 'primary', { icon: 'graduation' }) : '') +
        (r.demo ? UI.demoChip() : '');
    },
    detail: function (r) {
      var related = Store.where('resources', function (x) {
        return x.id !== r.id && (x.category === r.category || (r.courseId && x.courseId === r.courseId));
      }).slice(0, 5);

      var main = UI.card({
        title: 'About this resource', icon: 'info',
        body: '<p class="small">' + U.esc(r.description) + '</p>' +
          (r.content ? '<div class="divider-text"><span>Notes</span></div><div class="minutes-body"><p style="white-space:pre-line">' + U.esc(r.content) + '</p></div>' : '') +
          (r.link ? '<div class="mt-2"><a class="btn btn-outline btn-sm" href="' + U.attr(r.link) + '" target="_blank" rel="noopener">' + Icons.svg('external-link', { class: 'btn-ico' }) + 'Open external resource</a></div>' : '')
      });

      var meta = UI.card({
        title: 'Resource details', icon: 'paperclip',
        body: UI.kvGrid([
          { label: 'Category', value: r.category },
          { label: 'Author', html: '<a href="#/members/' + r.author + '">' + U.esc(nameOf(r.author)) + '</a>' },
          { label: 'Date added', value: U.fmtDate(r.date, 'long') },
          { label: 'Age', value: U.timeAgo(r.date) },
          { label: 'Related course', value: r.courseId && Store.find('courses', r.courseId) ? Store.find('courses', r.courseId).name : '—' },
          { label: 'Attachment', html: fileLabel(r) },
          { label: 'Tags', html: (r.tags || []).length ? UI.chipRow((r.tags || []).map(function (t) { return { label: t, icon: 'tag' }; })) : '—' }
        ]) +
        '<div class="alert alert-info mt-2">' + Icons.svg('upload-cloud') + '<div>File attachments are prototyped. When the platform is connected to storage, PDFs and slideshows can be uploaded directly and downloaded by members.</div></div>'
      });

      var more = UI.card({
        title: 'Related resources', icon: 'layers',
        body: related.length ? '<div class="list-rows">' + related.map(function (x) {
          return '<a class="list-row" href="#/resources/' + x.id + '">' +
            '<span class="tl-dot">' + Icons.svg('book-open') + '</span>' +
            '<span class="list-row-main"><strong>' + U.esc(x.title) + '</strong><span>' + U.esc(x.category) + ' · ' + U.fmtDate(x.date) + '</span></span></a>';
        }).join('') + '</div>' : '<p class="muted small">No related resources yet.</p>'
      });

      return '<div class="grid cols-2" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)">' + main +
        '<div style="display:grid;gap:18px">' + meta + more + '</div></div>';
    }
  };

  ModuleHelper.page(config);

  global.Modules = global.Modules || {};
  global.Modules.Resources = {
    config: config,
    openForm: function (values) {
      if (values && values.id) return ModuleHelper.openEdit(config, Store.find('resources', values.id));
      return ModuleHelper.openCreate(config, values || {});
    }
  };
})(window);
