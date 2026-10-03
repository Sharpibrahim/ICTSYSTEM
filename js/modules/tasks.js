/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/tasks.js
   Task assignment and follow-through for cabinet members, project teams and
   meeting action items.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;
  var view = 'board';

  function nameOf(id) {
    var m = Store.find('members', id);
    return m ? m.fullName : (id || 'Unassigned');
  }
  /** A task counts as overdue when its deadline has passed and it is not done. */
  function isOverdue(t) {
    return t.status !== 'Completed' && t.deadline && t.deadline < U.todayISO();
  }
  function effectiveStatus(t) { return isOverdue(t) ? 'Overdue' : t.status; }
  function dueLabel(t) {
    if (!t.deadline) return '<span class="muted">No deadline</span>';
    var d = U.daysFromNow(t.deadline);
    if (t.status === 'Completed') return '<span class="muted">Completed</span>';
    if (d < 0) return '<span class="badge badge-danger badge-soft">' + Math.abs(d) + ' days overdue</span>';
    if (d === 0) return '<span class="badge badge-warning badge-soft">Due today</span>';
    if (d <= 3) return '<span class="badge badge-warning badge-soft">Due in ' + d + ' days</span>';
    return U.fmtDate(t.deadline) + ' <span class="muted">(' + d + ' days)</span>';
  }
  var COLUMNS = ['Pending', 'In Progress', 'Completed', 'Overdue'];
  var TONES = { 'Pending': 'neutral', 'In Progress': 'primary', 'Completed': 'success', 'Overdue': 'danger' };

  function moveTask(t, to, table) {
    if (!CRUD.guard('tasks', 'edit')) return;
    var patch = { status: to, progress: to === 'Completed' ? 100 : (to === 'Pending' ? 0 : t.progress) };
    if (to === 'Completed') patch.completedAt = new Date().toISOString();
    Store.update('tasks', t.id, patch);
    // keep a linked meeting action item in step
    if (t.sourceMeetingId) {
      var meeting = Store.find('meetings', t.sourceMeetingId);
      if (meeting && Array.isArray(meeting.actionItems)) {
        var items = meeting.actionItems.map(function (ai) {
          return U.norm(ai.text) === U.norm(t.title) ? Object.assign({}, ai, { status: to === 'Completed' ? 'Completed' : to }) : ai;
        });
        Store.update('meetings', meeting.id, { actionItems: items });
      }
    }
    UI.toast('Task updated', '“' + t.title + '” is now ' + to + '.', 'success', { duration: 2200 });
    if (table) table.refresh(); else Router.refresh();
  }

  function boardHTML() {
    var all = Store.all('tasks');
    return '<div class="kanban">' + COLUMNS.map(function (status) {
      var list = all.filter(function (t) { return effectiveStatus(t) === status; });
      var dot = { 'Pending': 'var(--muted)', 'In Progress': 'var(--primary)', 'Completed': 'var(--success)', 'Overdue': 'var(--danger)' }[status];
      return '<div class="kanban-col">' +
        '<div class="kanban-col-head"><h3><span class="k-dot" style="background:' + dot + '"></span>' + status + '</h3><span class="count">' + list.length + '</span></div>' +
        (list.length ? U.sortBy(list, 'deadline').map(function (t) {
          return '<div class="kanban-card">' +
            '<div class="flex between center gap-1"><h4>' + U.esc(t.title) + '</h4>' + UI.badge(t.priority, U.tone(t.priority)) + '</div>' +
            '<p class="small muted">' + U.esc(U.truncate(t.description || '', 90)) + '</p>' +
            '<div class="meta-row">' + Icons.svg('user') + '<span>' + U.esc(nameOf(t.assigneeId)) + '</span>' +
              '<span class="val">' + (t.deadline ? U.fmtDate(t.deadline, 'day') : 'No due date') + '</span></div>' +
            UI.progressBar(t.progress || 0, { size: 'sm' }) +
            (Auth.can('tasks', 'edit') ? '<div class="flex gap-1 wrap">' + COLUMNS.filter(function (s) { return s !== status; }).map(function (s) {
              return '<button type="button" class="mini-btn" data-move="' + t.id + '" data-to="' + s + '" title="Move to ' + s + '">' + Icons.svg(s === 'Completed' ? 'check' : 'arrow-right') + '</button>';
            }).join('') + '<button type="button" class="mini-btn" data-edit-task="' + t.id + '" title="Edit task">' + Icons.svg('edit') + '</button>' +
              (Auth.can('tasks', 'delete') ? '<button type="button" class="mini-btn danger" data-del-task="' + t.id + '" title="Delete task">' + Icons.svg('trash') + '</button>' : '') +
            '</div>' : '') +
          '</div>';
        }).join('') : '<p class="muted xs" style="padding:8px 4px">Nothing here.</p>') +
      '</div>';
    }).join('') + '</div>';
  }

  var config = {
    key: 'tasks',
    title: 'Tasks',
    singular: 'task',
    icon: 'check-square',
    module: 'tasks',
    collection: 'tasks',
    subtitle: 'Assign work to cabinet members and project teams, and follow it through to completion.',
    stats: function () {
      var t = Metrics.tasks();
      return [
        { label: 'Open tasks', value: U.num(t.pending + t.inProgress), icon: 'check-square', tone: 'primary', foot: t.total + ' tasks on record' },
        { label: 'In progress', value: U.num(t.inProgress), icon: 'loader', tone: 'accent', foot: 'Being worked on now' },
        { label: 'Overdue', value: U.num(t.overdue), icon: 'alert-triangle', tone: t.overdue ? 'danger' : 'neutral', foot: t.dueThisWeek + ' due this week' },
        { label: 'Completed', value: U.num(t.completed), icon: 'check-circle', tone: 'success', foot: t.completionRate + '% completion rate' }
      ];
    },
    headActions: function () {
      return (Auth.can('tasks', 'edit') ? '<button type="button" class="btn btn-outline btn-sm" data-mod-action="bulk">' + Icons.svg('check-double', { class: 'btn-ico' }) + 'Mark completed</button>' : '');
    },
    toolbarExtra: function () {
      return '<span data-task-view>' + UI.segmented([
        { key: 'board', label: 'Board', icon: 'kanban' },
        { key: 'list', label: 'List', icon: 'list' }
      ], view) + '</span>';
    },
    schema: function (values) {
      return [
        { name: 'title', label: 'Task', type: 'text', required: true, colSpan: 2, value: values.title },
        { name: 'assignee', label: 'Assigned to', type: 'member', required: true, value: values.assignee },
        { name: 'createdBy', label: 'Created by', type: 'member', required: true, value: values.createdBy },
        { name: 'priority', label: 'Priority', type: 'select', required: true, options: ['High', 'Medium', 'Low'], value: values.priority || 'Medium' },
        { name: 'due', label: 'Deadline', type: 'date', required: true, value: values.due || U.iso(U.addDays(new Date(), 7)) },
        { name: 'status', label: 'Status', type: 'select', required: true, options: ['Pending', 'In Progress', 'Completed'], value: values.status || 'Pending' },
        { name: 'progress', label: 'Progress', type: 'range', min: 0, max: 100, value: values.progress || 0 },
        { name: 'category', label: 'Category', type: 'select', options: ['Club administration', 'Meetings', 'Training', 'Projects', 'Events', 'Reports', 'Equipment', 'Finance', 'Other'], value: values.category || 'Club administration' },
        { name: 'description', label: 'Description', type: 'textarea', colSpan: 2, rows: 4, value: values.description }
      ];
    },
    transform: function (data, values) {
      return {
        title: data.title, assigneeId: data.assignee, createdById: data.createdBy, priority: data.priority,
        deadline: data.due, status: data.status, progress: Number(data.progress) || 0,
        category: data.category, description: data.description,
        completedAt: data.status === 'Completed' ? new Date().toISOString() : '',
        demo: values.demo === true
      };
    },
    columns: [
      {
        key: 'title', label: 'Task',
        render: function (t) {
          return '<span class="td-strong">' + U.esc(t.title) + '</span>' +
            (t.sourceMeetingId ? '<br><span class="td-muted">' + Icons.svg('users') + ' From meeting action item</span>' : '') +
            (t.description ? '<br><span class="td-muted">' + U.esc(U.truncate(t.description, 60)) + '</span>' : '');
        }
      },
      { key: 'assigneeId', label: 'Assigned to', render: function (t) { return UI.personCell(nameOf(t.assigneeId), Store.find('members', t.assigneeId) && Store.find('members', t.assigneeId).klass, { size: 'xs' }); } },
      { key: 'createdById', label: 'Created by', render: function (t) { return U.esc(nameOf(t.createdById)); } },
      { key: 'priority', label: 'Priority', render: function (t) { return UI.badge(t.priority, U.tone(t.priority)); } },
      { key: 'deadline', label: 'Deadline', render: function (t) { return dueLabel(t); } },
      { key: 'progress', label: 'Progress', render: function (t) { return UI.progressBar(t.progress || 0, { size: 'sm' }) + '<span class="xs muted">' + (t.progress || 0) + '%</span>'; } },
      { key: 'status', label: 'Status', render: function (t) { return UI.statusBadge(effectiveStatus(t)); } }
    ],
    beforeTable: function () {
      if (view !== 'board') return '';
      var t = Metrics.tasks();
      return UI.card({
        title: 'Task board', icon: 'kanban', sub: t.pending + t.inProgress + ' open · ' + t.overdue + ' overdue',
        body: boardHTML()
      });
    },
    tableTitle: function () { return view === 'board' ? 'Task list' : 'All tasks'; },
    filters: [
      { key: 'status', label: 'All statuses', value: function (t) { return effectiveStatus(t); }, options: COLUMNS },
      { key: 'priority', label: 'All priorities', options: ['High', 'Medium', 'Low'] },
      { key: 'assigneeId', label: 'All members', options: function () {
          return Store.all('members').filter(function (m) { return Store.count('tasks', function (t) { return t.assigneeId === m.id; }) > 0; })
            .map(function (m) { return { value: m.id, label: m.fullName }; });
        } }
    ],
    searchKeys: function (t) { return [t.title, t.description, t.category, nameOf(t.assigneeId), nameOf(t.createdById)]; },
    exportColumns: [
      { key: 'title', label: 'Task' }, { value: function (t) { return nameOf(t.assigneeId); }, label: 'Assigned to' },
      { value: function (t) { return nameOf(t.createdById); }, label: 'Created by' }, { key: 'priority', label: 'Priority' },
      { key: 'deadline', label: 'Deadline' }, { value: function (t) { return effectiveStatus(t); }, label: 'Status' },
      { key: 'progress', label: 'Progress %' }, { key: 'description', label: 'Description' }
    ],
    rowActions: function (t) {
      var out = '';
      if (Auth.can('tasks', 'edit') && t.status !== 'Completed') out += CRUD.actionBtn('done', t.id, 'check', 'Mark completed');
      if (Auth.can('tasks', 'edit')) out += CRUD.actionBtn('edit', t.id, 'edit', 'Edit task');
      if (Auth.can('tasks', 'delete')) out += CRUD.actionBtn('delete', t.id, 'trash', 'Delete task', 'danger');
      return out;
    },
    onRowAction: function (action, t, table) {
      if (action === 'done') moveTask(t, 'Completed', table);
    },
    onAction: function (action) {
      if (action === 'bulk') openBulkComplete();
    },
    empty: { icon: 'check-square', title: 'No tasks yet', message: 'Create a task to track work that needs to be done by a club member.' },
    onMount: function (ctx, root, table) {
      root.addEventListener('click', function (e) {
        var seg = e.target.closest('[data-task-view] [data-seg]');
        if (seg) { view = seg.getAttribute('data-seg'); Router.refresh(); return; }
        var move = e.target.closest('[data-move]');
        if (move) { moveTask(Store.find('tasks', move.getAttribute('data-move')), move.getAttribute('data-to'), table); return; }
        var edit = e.target.closest('[data-edit-task]');
        if (edit) { var t = Store.find('tasks', edit.getAttribute('data-edit-task')); if (t) ModuleHelper.openEdit(config, t); return; }
        var del = e.target.closest('[data-del-task]');
        if (del) {
          var task = Store.find('tasks', del.getAttribute('data-del-task'));
          CRUD.remove({ module: 'tasks', collection: 'tasks', id: del.getAttribute('data-del-task'), label: 'task', action: 'delete',
            after: function () { Router.refresh(); } });
          return;
        }
        var row = e.target.closest('[data-task-row]');
        if (row) { var rec = Store.find('tasks', row.getAttribute('data-task-row')); if (rec) ModuleHelper.openEdit(config, rec); }
      });
    },
    afterTable: function () {
      if (view !== 'board') return '';
      return '';
    },
    detail: function (t) {
      return '<div class="grid cols-2" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)">' +
        UI.card({
          title: 'Task brief', icon: 'check-square',
          body: '<p class="small" style="white-space:pre-line">' + U.esc(t.description || 'No description recorded.') + '</p>' +
            '<div class="mt-2">' + UI.progressRow('Progress', t.progress || 0) + '</div>' +
            '<div class="stat-strip mt-2">' +
              '<div class="strip-item"><span>Priority</span><strong>' + U.esc(t.priority) + '</strong></div>' +
              '<div class="strip-item"><span>Deadline</span><strong>' + U.fmtDate(t.deadline, 'day') + '</strong></div>' +
              '<div class="strip-item"><span>Status</span><strong>' + U.esc(effectiveStatus(t)) + '</strong></div>' +
            '</div>'
        }) +
        UI.card({
          title: 'Assignment', icon: 'users',
          body: UI.kvGrid([
            { label: 'Assigned to', html: '<a href="#/members/' + t.assigneeId + '">' + U.esc(nameOf(t.assigneeId)) + '</a>' },
            { label: 'Created by', html: '<a href="#/members/' + t.createdById + '">' + U.esc(nameOf(t.createdById)) + '</a>' },
            { label: 'Category', value: t.category || '—' },
            { label: 'Created', value: U.fmtDateTime(t.createdAt) },
            { label: 'Deadline', value: U.fmtDate(t.deadline, 'long') },
            { label: 'Completed', value: t.completedAt ? U.fmtDateTime(t.completedAt) : 'Not yet' },
            { label: 'Linked meeting', value: t.sourceMeetingId ? (Store.find('meetings', t.sourceMeetingId) || {}).title || '—' : '—' }
          ])
        }) + '</div>';
    }
  };

  /* ══ Bulk completion ══════════════════════════════════════════════════ */
  function openBulkComplete() {
    if (!CRUD.guard('tasks', 'edit')) return;
    var open = Store.all('tasks').filter(function (t) { return t.status !== 'Completed'; });
    UI.formModal({
      title: 'Mark tasks completed', icon: 'check-double', size: 'md',
      subtitle: 'Tick the tasks that have been finished.',
      formHtml: open.length
        ? '<div class="check-list" style="max-height:360px">' + open.map(function (t) {
            return '<label class="check"><input type="checkbox" value="' + t.id + '">' +
              '<span>' + U.esc(t.title) + ' <span class="muted">· ' + U.esc(nameOf(t.assigneeId)) + ' · due ' + U.fmtDate(t.deadline) + '</span></span></label>';
          }).join('') + '</div>'
        : UI.emptyState({ icon: 'check-circle', title: 'Everything is done', message: 'There are no open tasks to complete.' }),
      submitLabel: 'Mark completed',
      onSubmit: function (data, c, formEl) {
        var ids = U.$$('input[type="checkbox"]:checked', formEl).map(function (i) { return i.value; });
        ids.forEach(function (id) { Store.update('tasks', id, { status: 'Completed', progress: 100, completedAt: new Date().toISOString() }); });
        UI.toast('Tasks completed', ids.length + ' tasks were marked as completed.', 'success');
        Router.refresh();
      }
    });
  }

  ModuleHelper.page(config);

  global.Modules = global.Modules || {};
  global.Modules.Tasks = {
    config: config,
    openForm: function (values) {
      if (values && values.id) return ModuleHelper.openEdit(config, Store.find('tasks', values.id));
      return ModuleHelper.openCreate(config, values || {});
    },
    isOverdue: isOverdue,
    effectiveStatus: effectiveStatus,
    dueLabel: dueLabel,
    nameOf: nameOf
  };
})(window);
