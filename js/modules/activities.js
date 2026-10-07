/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/activities.js
   Club activities: training sessions, coding sessions, competitions,
   exhibitions, seminars, workshops, outreach and innovation challenges.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  function nameOf(id) {
    var m = Store.find('members', id);
    return m ? m.fullName : (id || '—');
  }
  function participants(id) { var a = Store.find('activities', id); return a ? (a.participants || []) : []; }

  var config = {
    key: 'activities',
    title: 'Activities',
    singular: 'activity',
    icon: 'rocket',
    module: 'activities',
    collection: 'activities',
    subtitle: 'Plan, run and report on club activities, from training sessions to competitions and outreach.',
    stats: function () {
      var a = Metrics.activities();
      return [
        { label: 'Total activities', value: U.num(a.total), icon: 'rocket', tone: 'primary', foot: a.completed + ' completed' },
        { label: 'Planned', value: U.num(a.planned), icon: 'calendar-plus', tone: 'accent', foot: a.ongoing + ' running now' },
        { label: 'Participation', value: U.num(a.participation), icon: 'users', tone: 'secondary', foot: a.avgParticipants + ' members on average' },
        { label: 'Activity types', value: U.num(Object.keys(a.byType).length), icon: 'layers', tone: 'info', foot: 'Across the club programme' }
      ];
    },
    schema: function (values) {
      return [
        { name: 'title', label: 'Activity title', type: 'text', required: true, colSpan: 2, placeholder: 'e.g. Inter-House ICT Quiz Competition' },
        { name: 'type', label: 'Activity type', type: 'select', required: true, options: Data.ACTIVITY_TYPES, value: values.type || 'ICT Training' },
        { name: 'status', label: 'Status', type: 'select', options: ['Planned', 'Ongoing', 'Completed', 'Cancelled'], value: values.status || 'Planned', required: true },
        { name: 'date', label: 'Date', type: 'date', required: true, value: values.date || U.todayISO() },
        { name: 'time', label: 'Start time', type: 'time', required: true, value: values.time || '14:00' },
        { name: 'venue', label: 'Venue', type: 'text', required: true, value: values.venue || 'ICT Laboratory 1' },
        { name: 'organizer', label: 'Organiser', type: 'member', required: true, value: values.organizer },
        { name: 'participants', label: 'Participants', type: 'members', size: 9, value: values.participants || [], help: 'Select all members expected to take part.' },
        { name: 'description', label: 'Description', type: 'textarea', colSpan: 2, rows: 3, required: true },
        { name: 'objectivesText', label: 'Objectives', type: 'textarea', colSpan: 2, rows: 3,
          value: (values.objectives || []).join('\n'), help: 'One objective per line.' },
        { name: 'outcomes', label: 'Outcomes / results', type: 'textarea', colSpan: 2, rows: 3, help: 'Complete this after the activity has taken place.' },
        { name: 'report', label: 'Activity report note', type: 'textarea', colSpan: 2, rows: 3 }
      ];
    },
    transform: function (data, values) {
      return {
        title: data.title, type: data.type, date: data.date, time: data.time, venue: data.venue,
        organizer: data.organizer, description: data.description, status: data.status,
        participants: data.participants || [], outcomes: data.outcomes, report: data.report,
        objectives: String(data.objectivesText || '').split('\n').map(function (o) { return o.trim(); }).filter(Boolean),
        photos: values.photos || [], demo: values.demo === true
      };
    },
    afterSave: function (rec, data) {
      if (!rec.id) return;
      if (!Store.find('activities', rec.id).activityId) {
        Store.update('activities', rec.id, { activityId: CRUD.nextCode('activities', 'activityId', 'MRHS-ICT-A', 3) });
      }
    },
    columns: [
      {
        key: 'title', label: 'Activity',
        render: function (a) {
          return '<a href="#/activities/' + a.id + '" class="td-strong">' + U.esc(a.title) + '</a>' +
            '<br><span class="td-muted">' + U.esc(a.activityId) + ' · ' + U.esc(a.venue) + '</span>';
        }
      },
      { key: 'type', label: 'Type', render: function (a) { return UI.badge(a.type, 'secondary'); } },
      { key: 'date', label: 'Date & time', render: function (a) { return U.fmtDate(a.date) + '<br><span class="td-muted">' + U.fmtTime(a.time) + '</span>'; } },
      { key: 'organizer', label: 'Organiser', render: function (a) { return U.esc(nameOf(a.organizer)); } },
      {
        key: 'participants', label: 'Participants', sortable: false,
        render: function (a) { return '<strong>' + (a.participants || []).length + '</strong> <span class="td-muted">members</span>'; }
      },
      { key: 'status', label: 'Status', render: function (a) { return UI.statusBadge(a.status); } }
    ],
    filters: [
      { key: 'type', label: 'All types', options: Data.ACTIVITY_TYPES },
      { key: 'status', label: 'All statuses', options: ['Planned', 'Ongoing', 'Completed', 'Cancelled'] },
      { key: 'category', label: 'All years', value: function (a) { return U.toDate(a.date).getFullYear(); }, options: U.uniq(Store.all('activities').map(function (a) { return U.toDate(a.date).getFullYear(); })).sort().reverse() }
    ],
    searchKeys: function (a) { return [a.title, a.type, a.venue, a.activityId, nameOf(a.organizer), a.description, a.outcomes, (a.objectives || []).join(' ')]; },
    exportColumns: [
      { value: function (a) { return a.activityId; }, label: 'Activity ID' }, { key: 'title', label: 'Title' },
      { key: 'type', label: 'Type' }, { key: 'date', label: 'Date' }, { key: 'time', label: 'Time' },
      { key: 'venue', label: 'Venue' }, { value: function (a) { return nameOf(a.organizer); }, label: 'Organiser' },
      { value: function (a) { return (a.participants || []).length; }, label: 'Participants' },
      { key: 'status', label: 'Status' }, { key: 'outcomes', label: 'Outcomes' }
    ],
    rowActions: function (a) {
      var out = CRUD.viewBtn('#/activities/' + a.id, 'activity');
      if (Auth.can('activities', 'edit')) out += CRUD.actionBtn('edit', a.id, 'edit', 'Edit activity');
      if (Auth.can('attendance', 'create') && a.status !== 'Planned') out += CRUD.actionBtn('attend', a.id, 'user-check', 'Record attendance');
      if (Auth.can('activities', 'delete')) out += CRUD.actionBtn('delete', a.id, 'trash', 'Delete activity', 'danger');
      return out;
    },
    onRowAction: function (action, a) {
      if (action === 'attend') Modules.Attendance.openRecorder({ contextType: a.type === 'ICT Training' ? 'training' : 'activity', contextId: a.id });
    },
    empty: { icon: 'rocket', title: 'No activities yet', message: 'Plan the first club activity to start tracking participation and outcomes.' },
    cascade: function (a) {
      Store.removeWhere('attendance', function (r) { return (r.contextType === 'activity' || r.contextType === 'event' || r.contextType === 'training') && r.contextId === a.id; });
    },
    deleteDetails: 'Attendance and participation records linked to this activity will also be deleted.',

    detailTitle: function (a) { return a.title; },
    detailSubtitle: function (a) { return a.type + ' · ' + U.fmtDate(a.date, 'long') + ' at ' + U.fmtTime(a.time) + ' · ' + a.venue; },
    detailBadges: function (a) {
      return UI.statusBadge(a.status) + UI.badge(a.type, 'secondary', { icon: 'rocket' }) +
        (a.activityId ? UI.badge(a.activityId, 'neutral') : '') + (a.demo ? UI.demoChip() : '');
    },
    detailActions: function (a) {
      return (Auth.can('attendance', 'create') ? '<button type="button" class="btn btn-primary btn-sm" data-detail-action="attendance">' + Icons.svg('user-check', { class: 'btn-ico' }) + 'Record attendance</button>' : '') +
        (Auth.can('activities', 'edit') ? '<button type="button" class="btn btn-outline btn-sm" data-detail-action="report">' + Icons.svg('file-text', { class: 'btn-ico' }) + 'Activity report' : '');
    },
    detail: function (a) {
      var att = CRUD.attendanceRate('activity', a.id, (a.participants || []).length) ||
        CRUD.attendanceRate('training', a.id, (a.participants || []).length) ||
        CRUD.attendanceRate('event', a.id, (a.participants || []).length);
      var roster = (a.participants || []);

      var overview = UI.card({
        title: 'Activity information', icon: 'info',
        body: UI.kvGrid([
          { label: 'Activity ID', value: a.activityId },
          { label: 'Type', value: a.type },
          { label: 'Date', value: U.fmtDate(a.date, 'long') },
          { label: 'Time', value: U.fmtTime(a.time) },
          { label: 'Venue', value: a.venue },
          { label: 'Organiser', html: '<a href="#/members/' + a.organizer + '">' + U.esc(nameOf(a.organizer)) + '</a>' },
          { label: 'Participants', value: roster.length + ' members' },
          { label: 'Status', html: UI.statusBadge(a.status) },
          { label: 'Days ' + (U.daysFromNow(a.date) >= 0 ? 'until' : 'since'), value: Math.abs(U.daysFromNow(a.date)) + ' days' }
        ]) +
        '<div class="mt-2"><strong class="small">Description</strong><p class="small">' + U.esc(a.description || '—') + '</p></div>' +
        ((a.objectives || []).length ? '<div class="note-block mt-2"><strong>Objectives</strong><ul style="margin-top:6px;padding-left:18px;list-style:disc">' +
          a.objectives.map(function (o) { return '<li>' + U.esc(o) + '</li>'; }).join('') + '</ul></div>' : '')
      });

      var outcomesCard = UI.card({
        title: 'Outcomes and reporting', icon: 'clipboard-check',
        body: (a.outcomes
          ? '<p class="small" style="white-space:pre-line">' + U.esc(a.outcomes) + '</p>'
          : '<p class="muted small">Outcomes have not been recorded yet. Update the activity after it takes place to capture results for the termly report.</p>') +
          (a.report ? '<div class="note-block success mt-2">' + U.esc(a.report) + '</div>' : '') +
          (att ? '<div class="mt-2">' + UI.progressRow('Participation rate', att.rate, { valueText: (att.present + att.late) + '/' + att.total + ' members' }) + '</div>' : '') +
          (Auth.can('activities', 'edit') ? '<button type="button" class="btn btn-outline btn-sm mt-2" data-detail-action="outcome">' + Icons.svg('edit', { class: 'btn-ico' }) + 'Update outcomes</button>' : '')
      });

      var participantsCard = UI.card({
        title: 'Participants', icon: 'users', sub: roster.length + ' members',
        head: Auth.can('activities', 'edit') ? '<button type="button" class="link-btn xs" data-detail-action="participants">' + Icons.svg('edit') + ' Manage</button>' : '',
        body: roster.length ? '<div class="scroll-y-sm"><table class="stat-table"><thead><tr><th>Member</th><th>Class</th><th>Attendance</th></tr></thead><tbody>' +
            U.sortBy(roster, function (id) { return nameOf(id); }).map(function (id) {
              var m = Store.find('members', id);
              if (!m) return '';
              var rec = U.findBy(Store.all('attendance'), function (r) {
                return r.contextId === a.id && r.memberId === id;
              });
              return '<tr><td><a href="#/members/' + m.id + '">' + U.esc(m.fullName) + '</a></td><td>' + U.esc(m.klass) + '</td>' +
                '<td>' + (rec ? UI.statusBadge(rec.status) : '<span class="td-muted">Not recorded</span>') + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<p class="muted small">No participants recorded for this activity.</p>',
        foot: '<span class="muted small">' + roster.filter(function (id) {
          return !U.findBy(Store.all('attendance'), function (r) { return r.contextId === a.id && r.memberId === id; });
        }).length + ' members have no attendance record yet</span>'
      });

      var photosCard = UI.card({
        title: 'Photos', icon: 'image', sub: (a.photos || []).length + ' images',
        body: '<div class="alert alert-info">' + Icons.svg('camera') + '<div><strong>Photo uploads are prototyped, not yet connected</strong>' +
          'Activity photographs will be stored in the media gallery when the platform is connected to file storage. ' +
          '<a href="#/gallery">Open the gallery</a> to see placeholder albums from past activities.</div></div>'
      });

      return '<div class="grid cols-2">' + overview + outcomesCard + '</div>' +
        '<div class="grid cols-2">' + participantsCard + photosCard + '</div>';
    },
    onDetailAction: function (action, btn, a) {
      if (action === 'attendance') Modules.Attendance.openRecorder({ contextType: 'activity', contextId: a.id });
      if (action === 'report') Print.preview(Print.page(
        '<div class="print-doc-title"><h1>Activity Report</h1><p>' + U.esc(a.title) + '</p></div>' +
        '<table><tbody>' +
          '<tr><th style="width:28%">Activity ID</th><td>' + U.esc(a.activityId || '') + '</td></tr>' +
          '<tr><th>Type</th><td>' + U.esc(a.type) + '</td></tr>' +
          '<tr><th>Date &amp; venue</th><td>' + U.fmtDate(a.date, 'long') + ' at ' + U.fmtTime(a.time) + ' · ' + U.esc(a.venue) + '</td></tr>' +
          '<tr><th>Organiser</th><td>' + U.esc(nameOf(a.organizer)) + '</td></tr>' +
          '<tr><th>Participants</th><td>' + (a.participants || []).length + ' members</td></tr>' +
          '<tr><th>Status</th><td>' + U.esc(a.status) + '</td></tr>' +
        '</tbody></table>' +
        '<h3>Description</h3><p>' + U.esc(a.description || '') + '</p>' +
        '<h3>Objectives</h3><ul>' + (a.objectives || []).map(function (o) { return '<li>' + U.esc(o) + '</li>'; }).join('') + '</ul>' +
        '<h3>Outcomes</h3><p>' + U.esc(a.outcomes || 'Not recorded.') + '</p>' +
        '<h3>Participants list</h3><table><thead><tr><th>#</th><th>Name</th><th>Class</th></tr></thead><tbody>' +
          (a.participants || []).map(function (id, i) {
            var m = Store.find('members', id);
            return '<tr><td>' + (i + 1) + '</td><td>' + U.esc(m ? m.fullName : id) + '</td><td>' + U.esc(m ? m.klass : '') + '</td></tr>';
          }).join('') + '</tbody></table>' +
        '<div class="print-sign"><div><div class="line"></div>Organiser</div><div><div class="line"></div>Club Patron</div></div>',
        { meta: 'Activity report' }
      ), { title: 'Activity report — ' + a.title, fileName: 'mrhs-ict-activity-report' });
      if (action === 'outcome') {
        UI.formModal({
          title: 'Update outcomes', subtitle: a.title, icon: 'clipboard-check', size: 'sm',
          formHtml: Forms.render([
            { name: 'status', label: 'Status', type: 'select', options: ['Planned', 'Ongoing', 'Completed', 'Cancelled'], value: a.status, colSpan: 2 },
            { name: 'outcomes', label: 'Outcomes and results', type: 'textarea', rows: 4, value: a.outcomes, colSpan: 2 },
            { name: 'report', label: 'Report note', type: 'textarea', rows: 3, value: a.report, colSpan: 2 }
          ]),
          submitLabel: 'Save outcomes',
          onOpen: function (c, form) { Forms.init(form); },
          onSubmit: function (data) {
            Store.update('activities', a.id, { status: data.status, outcomes: data.outcomes, report: data.report });
            UI.toast('Activity updated', 'Outcomes have been recorded for this activity.', 'success');
            Router.refresh();
          }
        });
      }
      if (action === 'participants') {
        UI.formModal({
          title: 'Manage participants', subtitle: a.title, icon: 'users', size: 'sm',
          formHtml: Forms.render([
            { name: 'participants', label: 'Participants', type: 'members', size: 10, value: a.participants || [], colSpan: 2 }
          ]),
          submitLabel: 'Save participants',
          onOpen: function (c, form) { Forms.init(form); },
          onSubmit: function (data) {
            Store.update('activities', a.id, { participants: data.participants || [] });
            UI.toast('Participants updated', (data.participants || []).length + ' members are listed for this activity.', 'success');
            Router.refresh();
          }
        });
      }
    }
  };

  ModuleHelper.page(config);

  global.Modules = global.Modules || {};
  global.Modules.Activities = {
    config: config,
    openForm: function (values) {
      if (values && values.id) return ModuleHelper.openEdit(config, Store.find('activities', values.id));
      return ModuleHelper.openCreate(config);
    },
    nameOf: nameOf
  };
})(window);
