/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/reports.js
   Club reports: weekly, monthly, termly, activity, project, training, meeting
   and annual reports with the standard club structure, review workflow and
   professional printable layouts.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  function nameOf(id) {
    var m = Store.find('members', id), u = Store.find('users', id);
    return m ? m.fullName : (u ? u.name : (id || '—'));
  }
  var SECTIONS = [
    ['introduction', 'Introduction', 'Purpose of the report, the period covered and who prepared it.'],
    ['activities', 'Activities undertaken', 'What the club did during the reporting period.'],
    ['achievements', 'Achievements', 'Results, milestones and recognition earned.'],
    ['challenges', 'Challenges', 'Difficulties encountered during the period.'],
    ['solutions', 'Solutions', 'How the challenges were addressed.'],
    ['recommendations', 'Recommendations', 'What should change in the next period.'],
    ['conclusion', 'Conclusion', 'Closing summary and outlook.']
  ];

  var config = {
    key: 'reports',
    title: 'Reports',
    singular: 'report',
    icon: 'file-text',
    module: 'reports',
    collection: 'reports',
    subtitle: 'Structured club reporting with a review workflow and printable documents.',
    stats: function () {
      var r = Metrics.reports();
      return [
        { label: 'Total reports', value: U.num(r.total), icon: 'file-text', tone: 'primary', foot: r.types + ' report types used' },
        { label: 'Approved', value: U.num(r.approved), icon: 'check-circle', tone: 'success', foot: 'Reviewed by the patron' },
        { label: 'Awaiting review', value: U.num(r.submitted), icon: 'clock', tone: 'warning', foot: 'Submitted by the secretary' },
        { label: 'Latest report', value: r.latest ? U.fmtDate(r.latest.date, 'day') : '—', icon: 'calendar', tone: 'accent', foot: r.latest ? U.truncate(r.latest.title, 34) : 'No reports yet' }
      ];
    },
    schema: function (values) {
      return [
        { name: 'title', label: 'Report title', type: 'text', required: true, colSpan: 2, placeholder: 'e.g. Termly Report — Term 3 2026' },
        { name: 'type', label: 'Report type', type: 'select', required: true, options: Data.REPORT_TYPES, value: values.type || 'Monthly Report' },
        { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Submitted', 'Approved'], value: values.status || 'Draft', required: true },
        { name: 'periodFrom', label: 'Reporting period from', type: 'date', required: true, value: values.periodFrom || U.iso(U.addDays(new Date(), -30)) },
        { name: 'periodTo', label: 'Reporting period to', type: 'date', required: true, compareField: 'periodFrom', compare: 'after', compareLabel: 'the start of the period', value: values.periodTo || U.todayISO() },
        { name: 'date', label: 'Date of report', type: 'date', required: true, value: values.date || U.todayISO() },
        { name: 'preparedBy', label: 'Prepared by', type: 'member', required: true, value: values.preparedBy },
        { name: 'reviewedBy', label: 'Reviewed by', type: 'member', required: true, value: values.reviewedBy },
        { name: 'introduction', label: 'Introduction', type: 'textarea', colSpan: 2, rows: 3, required: true, value: values.introduction },
        { name: 'activities', label: 'Activities undertaken', type: 'textarea', colSpan: 2, rows: 4, required: true, value: values.activities },
        { name: 'achievements', label: 'Achievements', type: 'textarea', colSpan: 2, rows: 3, required: true, value: values.achievements },
        { name: 'challenges', label: 'Challenges', type: 'textarea', colSpan: 2, rows: 3, required: true, value: values.challenges },
        { name: 'solutions', label: 'Solutions', type: 'textarea', colSpan: 2, rows: 3, value: values.solutions },
        { name: 'recommendations', label: 'Recommendations', type: 'textarea', colSpan: 2, rows: 3, value: values.recommendations },
        { name: 'conclusion', label: 'Conclusion', type: 'textarea', colSpan: 2, rows: 3, value: values.conclusion }
      ];
    },
    transform: function (data, values) {
      return {
        title: data.title, type: data.type, periodFrom: data.periodFrom, periodTo: data.periodTo,
        introduction: data.introduction, activities: data.activities, achievements: data.achievements,
        challenges: data.challenges, solutions: data.solutions, recommendations: data.recommendations,
        conclusion: data.conclusion, preparedBy: data.preparedBy, reviewedBy: data.reviewedBy,
        date: data.date, status: data.status, demo: values.demo === true
      };
    },
    beforeSave: function (data) {
      if (data.periodTo && data.periodFrom && data.periodTo < data.periodFrom) {
        return { periodTo: 'The end of the period must be after the start.' };
      }
      if (data.status === 'Approved' && !Auth.can('reports', 'delete')) {
        return { status: 'Only a patron, president or administrator can approve a report.' };
      }
      return null;
    },
    afterSave: function (rec) {
      if (!rec.id) return;
      if (!Store.find('reports', rec.id).reportId) {
        Store.update('reports', rec.id, { reportId: CRUD.nextCode('reports', 'reportId', 'MRHS-ICT-R', 3) });
      }
      if (rec.status === 'Submitted') {
        Store.insert('notifications', {
          demo: true, type: 'report', title: 'Report submitted: ' + rec.title,
          message: nameOf(rec.preparedBy) + ' submitted a ' + rec.type.toLowerCase() + ' for review.',
          icon: 'file-text', link: '#/reports/' + rec.id, at: new Date().toISOString(), read: false
        });
      }
    },
    columns: [
      {
        key: 'title', label: 'Report',
        render: function (r) {
          return '<a href="#/reports/' + r.id + '" class="td-strong">' + U.esc(r.title) + '</a>' +
            '<br><span class="td-muted">' + U.esc(r.reportId || '') + ' · ' + U.fmtDate(r.periodFrom) + ' — ' + U.fmtDate(r.periodTo) + '</span>';
        }
      },
      { key: 'type', label: 'Type', render: function (r) { return UI.badge(r.type, 'secondary'); } },
      { key: 'preparedBy', label: 'Prepared by', render: function (r) { return U.esc(nameOf(r.preparedBy)); } },
      { key: 'reviewedBy', label: 'Reviewed by', render: function (r) { return U.esc(nameOf(r.reviewedBy)); } },
      { key: 'date', label: 'Date', render: function (r) { return U.fmtDate(r.date); } },
      { key: 'status', label: 'Status', render: function (r) { return UI.statusBadge(r.status); } }
    ],
    filters: [
      { key: 'type', label: 'All types', options: Data.REPORT_TYPES },
      { key: 'status', label: 'All statuses', options: ['Draft', 'Submitted', 'Approved'] }
    ],
    searchKeys: function (r) { return [r.title, r.type, r.reportId, r.introduction, r.activities, r.achievements, nameOf(r.preparedBy), nameOf(r.reviewedBy)]; },
    exportColumns: [
      { value: function (r) { return r.reportId; }, label: 'Report ID' }, { key: 'title', label: 'Title' },
      { key: 'type', label: 'Type' }, { key: 'periodFrom', label: 'Period from' }, { key: 'periodTo', label: 'Period to' },
      { value: function (r) { return nameOf(r.preparedBy); }, label: 'Prepared by' },
      { value: function (r) { return nameOf(r.reviewedBy); }, label: 'Reviewed by' },
      { key: 'status', label: 'Status' }, { key: 'achievements', label: 'Achievements' }, { key: 'challenges', label: 'Challenges' }
    ],
    rowActions: function (r) {
      var out = CRUD.viewBtn('#/reports/' + r.id, 'report');
      out += CRUD.actionBtn('print', r.id, 'print', 'Print report');
      if (Auth.can('reports', 'edit')) out += CRUD.actionBtn('edit', r.id, 'edit', 'Edit report');
      if (Auth.can('reports', 'delete')) out += CRUD.actionBtn('delete', r.id, 'trash', 'Delete report', 'danger');
      return out;
    },
    onRowAction: function (action, r) {
      if (action === 'print') Print.preview(Print.report(r), { title: r.title, fileName: 'mrhs-ict-report-' + (r.reportId || r.id) });
    },
    empty: { icon: 'file-text', title: 'No reports yet', message: 'Create the first club report to start documenting activities and achievements.' },
    printDoc: function (r) { return { html: Print.report(r), title: r.title }; },

    detailTitle: function (r) { return r.title; },
    detailSubtitle: function (r) { return r.type + ' · ' + U.fmtDate(r.periodFrom) + ' — ' + U.fmtDate(r.periodTo); },
    detailBadges: function (r) {
      return UI.statusBadge(r.status) + UI.badge(r.type, 'secondary', { icon: 'file-text' }) +
        (r.reportId ? UI.badge(r.reportId, 'neutral') : '') + (r.demo ? UI.demoChip() : '');
    },
    detailActions: function (r) {
      var out = '';
      if (Auth.can('reports', 'edit') && r.status === 'Draft') {
        out += '<button type="button" class="btn btn-primary btn-sm" data-detail-action="submit">' + Icons.svg('send', { class: 'btn-ico' }) + 'Submit for review</button>';
      }
      if (r.status === 'Submitted' && Auth.can('reports', 'delete')) {
        out += '<button type="button" class="btn btn-success btn-sm" data-detail-action="approve">' + Icons.svg('check', { class: 'btn-ico' }) + 'Approve report</button>';
      }
      out += '<button type="button" class="btn btn-outline btn-sm" data-detail-action="preview">' + Icons.svg('eye', { class: 'btn-ico' }) + 'Print layout</button>';
      return out;
    },
    detail: function (r) {
      var body = SECTIONS.map(function (s) {
        return '<section class="card"><header class="card-head"><h2>' + Icons.svg('file-text') + U.esc(s[1]) + '</h2></header>' +
          '<div class="card-body"><div class="minutes-body"><p style="white-space:pre-line">' + U.esc(r[s[0]] || '—') + '</p></div></div></section>';
      }).join('');

      var meta = UI.card({
        title: 'Report details', icon: 'info',
        body: UI.kvGrid([
          { label: 'Report ID', value: r.reportId },
          { label: 'Report type', value: r.type },
          { label: 'Reporting period', value: U.fmtDate(r.periodFrom) + ' — ' + U.fmtDate(r.periodTo) },
          { label: 'Days covered', value: U.daysBetween(r.periodFrom, r.periodTo) + ' days' },
          { label: 'Prepared by', html: '<a href="#/members/' + r.preparedBy + '">' + U.esc(nameOf(r.preparedBy)) + '</a>' },
          { label: 'Reviewed by', html: '<a href="#/members/' + r.reviewedBy + '">' + U.esc(nameOf(r.reviewedBy)) + '</a>' },
          { label: 'Date of report', value: U.fmtDate(r.date, 'long') },
          { label: 'Status', html: UI.statusBadge(r.status) },
          { label: 'Created', value: U.fmtDateTime(r.createdAt) },
          { label: 'Last updated', value: U.fmtDateTime(r.updatedAt) }
        ])
      });

      var workflow = UI.card({
        title: 'Review workflow', icon: 'git-branch',
        body: UI.timeline([
          { icon: 'edit', tone: 'info', title: 'Draft prepared', text: 'By ' + nameOf(r.preparedBy), time: r.status !== 'Draft' ? 'Completed' : 'Current stage' },
          { icon: 'send', tone: r.status === 'Draft' ? '' : 'warning', title: 'Submitted for review', text: 'To ' + nameOf(r.reviewedBy), time: r.status === 'Draft' ? 'Pending' : 'Completed' },
          { icon: 'check-circle', tone: r.status === 'Approved' ? 'success' : '', title: 'Approved', text: 'Ready for filing and printing', time: r.status === 'Approved' ? 'Completed ' + U.fmtDate(r.updatedAt) : 'Pending' }
        ]) +
        '<div class="alert alert-info mt-2">' + Icons.svg('info') + '<div>Approved reports are kept in the club document repository for future reference.</div></div>' +
        (r.status === 'Approved' ? '<button type="button" class="btn btn-outline btn-sm mt-1" data-detail-action="archive">' + Icons.svg('folder', { class: 'btn-ico' }) + 'File in documents</button>' : '')
      });

      return '<div class="grid cols-2" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)">' +
          '<div style="display:grid;gap:18px">' + body + '</div>' +
          '<div style="display:grid;gap:18px">' + meta + workflow + '</div>' +
        '</div>';
    },
    onDetailAction: function (action, btn, r) {
      if (action === 'submit') {
        Store.update('reports', r.id, { status: 'Submitted' });
        UI.toast('Report submitted', 'The report is now awaiting review.', 'success');
        Router.refresh();
      }
      if (action === 'approve') {
        Store.update('reports', r.id, { status: 'Approved' });
        UI.toast('Report approved', 'The report has been approved and can be printed.', 'success');
        Router.refresh();
      }
      if (action === 'preview') {
        Print.preview(Print.report(r), { title: r.title, fileName: 'mrhs-ict-report-' + (r.reportId || r.id) });
      }
      if (action === 'archive') {
        var exists = U.findBy(Store.all('documents'), function (d) { return d.reportId === r.id; });
        if (exists) { UI.toast('Already filed', 'This report is already in the document repository.', 'info'); return; }
        Store.insert('documents', {
          demo: r.demo === true, title: r.title, category: 'Reports', owner: r.preparedBy,
          date: r.date, type: 'File', fileName: Utils.slug(r.title) + '.pdf', fileSize: 0, fileId: null, link: '',
          version: 'v1.0', confidentiality: 'Members', tags: ['report', r.type.toLowerCase()], uploadedBy: Auth.currentUser().id,
          reportId: r.id
        });
        UI.toast('Filed in documents', 'The approved report is now in the document repository.', 'success', {
          actionLabel: 'Open documents',
          onAction: function () { Router.go('/documents'); }
        });
      }
    }
  };

  ModuleHelper.page(config);

  global.Modules = global.Modules || {};
  global.Modules.Reports = {
    config: config,
    openForm: function (values) {
      if (values && values.id) return ModuleHelper.openEdit(config, Store.find('reports', values.id));
      return ModuleHelper.openCreate(config);
    },
    nameOf: nameOf,
    SECTIONS: SECTIONS
  };
})(window);
