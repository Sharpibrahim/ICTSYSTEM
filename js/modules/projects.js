/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/projects.js
   Project management: teams, technologies, objectives, task board, progress
   tracking, documentation, links and results.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;
  var detailTab = 'overview';

  function nameOf(id) {
    var m = Store.find('members', id);
    return m ? m.fullName : (id || 'Unassigned');
  }
  function tasksFor(id) { return Store.where('projectTasks', function (t) { return t.projectId === id; }); }
  function tasksOf(id, status) { return tasksFor(id).filter(function (t) { return t.status === status; }); }
  function progressOf(p) {
    if (p.status === 'Completed' || p.status === 'Archived') return 100;
    var tasks = tasksFor(p.id);
    if (!tasks.length) return p.progress || 0;
    var weights = { 'Completed': 1, 'In Progress': 0.5, 'Pending': 0, 'Overdue': 0.15 };
    var total = tasks.reduce(function (a, t) { return a + (weights[t.status] === undefined ? 0 : weights[t.status]); }, 0);
    return Math.round((total / tasks.length) * 100);
  }

  /* ══ Task board ═══════════════════════════════════════════════════════ */
  function boardHTML(project) {
    var cols = ['Pending', 'In Progress', 'Completed', 'Overdue'];
    var colors = { 'Pending': '#5c6a83', 'In Progress': '#2545d6', 'Completed': '#12884f', 'Overdue': '#d64545' };
    return '<div class="kanban">' + cols.map(function (status) {
      var list = tasksOf(project.id, status);
      return '<div class="kanban-col">' +
        '<div class="kanban-col-head"><h3><span class="k-dot" style="background:' + colors[status] + '"></span>' + status + '</h3>' +
        '<span class="count">' + list.length + '</span></div>' +
        (list.length ? list.map(function (t) {
          return '<div class="kanban-card" data-task="' + t.id + '">' +
            '<div class="flex between center gap-1"><h4>' + U.esc(t.title) + '</h4>' + UI.badge(t.priority, U.tone(t.priority)) + '</div>' +
            '<div class="meta-row">' + Icons.svg('user') + '<span>' + U.esc(nameOf(t.assignee)) + '</span>' +
              '<span class="val">' + U.esc(U.fmtDate(t.due, 'day')) + '</span></div>' +
            UI.progressBar(t.progress || (status === 'Completed' ? 100 : 0), { size: 'sm' }) +
            (Auth.can('projects', 'edit') ? '<div class="flex gap-1 wrap">' +
              ['Pending', 'In Progress', 'Completed'].filter(function (s) { return s !== status; }).map(function (s) {
                return '<button type="button" class="btn btn-ghost btn-sm" data-task-move="' + t.id + '" data-to="' + s + '">' + Icons.svg('arrow-right', { class: 'btn-ico' }) + s + '</button>';
              }).join('') + '</div>' : '') +
          '</div>';
        }).join('') : '<p class="muted xs" style="padding:8px 4px">No tasks in this column.</p>') +
      '</div>';
    }).join('') + '</div>';
  }

  /* ══ Forms ════════════════════════════════════════════════════════════ */
  function projectSchema(values) {
    return [
      { name: 'name', label: 'Project name', type: 'text', required: true, colSpan: 2 },
      { name: 'leaderId', label: 'Project leader', type: 'member', required: true, value: values.leaderId },
      { name: 'status', label: 'Status', type: 'select', options: Data.PROJECT_STATUSES, value: values.status || 'Planning', required: true },
      { name: 'team', label: 'Team members', type: 'members', size: 7, value: values.team || [], help: 'The project leader is included automatically.' },
      { name: 'progress', label: 'Progress', type: 'range', min: 0, max: 100, value: values.progress === undefined ? 0 : values.progress },
      { name: 'technologies', label: 'Technologies used', type: 'tags', colSpan: 2, value: values.technologies || [], help: 'Press Enter after each technology.' },
      { name: 'startDate', label: 'Start date', type: 'date', required: true, value: values.startDate || U.todayISO() },
      { name: 'expectedCompletion', label: 'Expected completion', type: 'date', required: true, compareField: 'startDate', compare: 'after', compareLabel: 'the start date', value: values.expectedCompletion },
      { name: 'actualCompletion', label: 'Actual completion', type: 'date', value: values.actualCompletion },
      { name: 'budget', label: 'Budget (' + (Store.settings().currency || 'UGX') + ')', type: 'number', min: 0, step: 1000, value: values.budget || 0 },
      { name: 'description', label: 'Project description', type: 'textarea', colSpan: 2, rows: 3, required: true },
      { name: 'problemStatement', label: 'Problem statement', type: 'textarea', colSpan: 2, rows: 3, help: 'What problem does this project solve?' },
      { name: 'objectivesText', label: 'Objectives', type: 'textarea', colSpan: 2, rows: 3,
        value: (values.objectives || []).join('\n'), help: 'One objective per line.' },
      { name: 'documentation', label: 'Documentation notes', type: 'textarea', colSpan: 2, rows: 3 },
      { name: 'linkUrl', label: 'Repository or demo link', type: 'url', placeholder: 'https://…', value: (values.links && values.links[0] ? values.links[0].url : '') },
      { name: 'results', label: 'Results', type: 'textarea', colSpan: 2, rows: 3, help: 'Record outcomes once the project is delivered.' }
    ];
  }

  function openTaskForm(project, task) {
    var editing = !!task;
    UI.formModal({
      title: editing ? 'Edit task' : 'Add project task',
      subtitle: project.name,
      icon: 'check-square', size: 'sm',
      formHtml: Forms.render([
        { name: 'title', label: 'Task', type: 'text', required: true, colSpan: 2, value: editing ? task.title : '' },
        { name: 'assignee', label: 'Assigned to', type: 'member', required: true, value: editing ? task.assignee : project.leaderId },
        { name: 'status', label: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Completed', 'Overdue'], value: editing ? task.status : 'Pending' },
        { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'], value: editing ? task.priority : 'Medium' },
        { name: 'due', label: 'Due date', type: 'date', required: true, value: editing ? task.due : U.iso(U.addDays(new Date(), 14)) },
        { name: 'progressText', label: 'Progress', type: 'range', min: 0, max: 100, value: editing ? task.progress : 0 },
        { name: 'notes', label: 'Notes', type: 'textarea', rows: 3, colSpan: 2, value: editing ? task.notes : '' }
      ]),
      submitLabel: editing ? 'Save task' : 'Add task',
      onOpen: function (c, form) { Forms.init(form); },
      onSubmit: function (data) {
        var payload = {
          projectId: project.id, title: data.title, assignee: data.assignee, status: data.status,
          priority: data.priority, due: data.due, notes: data.notes,
          progress: Number(data.progressText) || (data.status === 'Completed' ? 100 : 0)
        };
        if (editing) Store.update('projectTasks', task.id, payload);
        else Store.insert('projectTasks', Object.assign({ demo: false }, payload));
        CRUD.refreshDerived();
        Store.update('projects', project.id, { progress: progressOf(project) });
        UI.toast(editing ? 'Task updated' : 'Task added', payload.title + ' was saved to the project board.', 'success');
        Router.refresh();
      }
    });
  }

  /* ══ List ═════════════════════════════════════════════════════════════ */
  var config = {
    key: 'projects',
    title: 'Projects',
    singular: 'project',
    icon: 'kanban',
    module: 'projects',
    collection: 'projects',
    subtitle: 'Student-led ICT projects: teams, technologies, tasks, documentation and results.',
    stats: function () {
      var p = Metrics.projects();
      return [
        { label: 'Total projects', value: U.num(p.total), icon: 'kanban', tone: 'primary', foot: p.active + ' still active' },
        { label: 'In development', value: U.num(p.development + p.testing), icon: 'code', tone: 'accent', foot: p.testing + ' in testing' },
        { label: 'Completed', value: U.num(p.completed), icon: 'check-circle', tone: 'success', foot: p.archived + ' archived' },
        { label: 'Average progress', value: p.avgProgress + '%', icon: 'trending-up', tone: p.avgProgress >= 60 ? 'success' : 'warning', foot: 'Across all projects' }
      ];
    },
    schema: projectSchema,
    transform: function (data, values) {
      var team = (data.team || []).slice();
      if (team.indexOf(data.leaderId) === -1) team.unshift(data.leaderId);
      return {
        name: data.name, description: data.description, problemStatement: data.problemStatement,
        objectives: String(data.objectivesText || '').split('\n').map(function (o) { return o.trim(); }).filter(Boolean),
        leaderId: data.leaderId, team: team, technologies: data.technologies || [],
        startDate: data.startDate, expectedCompletion: data.expectedCompletion,
        actualCompletion: data.actualCompletion, status: data.status,
        progress: Number(data.progress) || 0, documentation: data.documentation, results: data.results,
        budget: Number(data.budget) || 0,
        links: data.linkUrl ? [{ label: 'Project link', url: data.linkUrl }] : (values.links || []),
        screenshots: values.screenshots || [], demo: values.demo === true
      };
    },
    afterSave: function (rec, data) {
      if (!rec.id) return;
      var stored = Store.find('projects', rec.id);
      if (!stored.projectId) Store.update('projects', rec.id, { projectId: CRUD.nextCode('projects', 'projectId', 'MRHS-ICT-P', 3) });
      Store.update('projects', rec.id, { progress: progressOf(rec) });
      if (rec.status === 'Completed' && !rec.actualCompletion) {
        Store.update('projects', rec.id, { actualCompletion: U.todayISO(), progress: 100 });
      }
    },
    columns: [
      {
        key: 'name', label: 'Project',
        render: function (p) {
          return '<a href="#/projects/' + p.id + '" class="td-strong">' + U.esc(p.name) + '</a>' +
            '<br><span class="td-muted">' + U.esc(p.projectId || '') + ' · ' + (p.technologies || []).length + ' technologies</span>';
        }
      },
      { key: 'leaderId', label: 'Leader', render: function (p) { return UI.personCell(nameOf(p.leaderId), Store.find('members', p.leaderId) ? Store.find('members', p.leaderId).klass : '', { size: 'xs', link: '#/members/' + p.leaderId }); } },
      { key: 'team', label: 'Team', sortable: false, render: function (p) { return '<span class="avatar-stack">' + (p.team || []).slice(0, 4).map(function (id) { return UI.avatar(nameOf(id), 'xs'); }).join('') + ((p.team || []).length > 4 ? '<span class="avatar avatar-xs more">+' + ((p.team || []).length - 4) + '</span>' : '') + '</span>'; } },
      { key: 'progress', label: 'Progress', render: function (p) { var v = progressOf(p); return UI.progressBar(v, { size: 'sm' }) + '<span class="xs muted">' + v + '%</span>'; } },
      { key: 'status', label: 'Status', render: function (p) { return UI.statusBadge(p.status); } },
      { key: 'expectedCompletion', label: 'Due', render: function (p) { return U.fmtDate(p.expectedCompletion) + (p.status !== 'Completed' && p.expectedCompletion < U.todayISO() ? '<br><span class="badge badge-danger badge-soft">Overdue</span>' : ''); } },
      { key: 'tasks', label: 'Tasks', sortable: false, render: function (p) { var t = tasksFor(p.id); return '<strong>' + t.filter(function (x) { return x.status === 'Completed'; }).length + '</strong> / ' + t.length; } }
    ],
    filters: [
      { key: 'status', label: 'All statuses', options: Data.PROJECT_STATUSES },
      { key: 'leaderId', label: 'All leaders', options: Data.SKILLS ? Store.all('members').filter(function (m) { return Store.count('projects', function (p) { return p.leaderId === m.id; }) > 0; }).map(function (m) { return { value: m.id, label: m.fullName }; }) : [] }
    ],
    searchKeys: function (p) { return [p.name, p.description, p.problemStatement, (p.technologies || []).join(' '), nameOf(p.leaderId), (p.objectives || []).join(' '), p.results]; },
    exportColumns: [
      { value: function (p) { return p.projectId; }, label: 'Project ID' }, { key: 'name', label: 'Project' },
      { value: function (p) { return nameOf(p.leaderId); }, label: 'Leader' },
      { value: function (p) { return (p.team || []).map(nameOf).join('; '); }, label: 'Team' },
      { value: function (p) { return (p.technologies || []).join('; '); }, label: 'Technologies' },
      { key: 'status', label: 'Status' }, { value: function (p) { return progressOf(p) + '%'; }, label: 'Progress' },
      { key: 'startDate', label: 'Start' }, { key: 'expectedCompletion', label: 'Expected completion' }, { key: 'results', label: 'Results' }
    ],
    rowActions: function (p) {
      var out = CRUD.viewBtn('#/projects/' + p.id, 'project');
      if (Auth.can('projects', 'edit')) out += CRUD.actionBtn('edit', p.id, 'edit', 'Edit project');
      if (Auth.can('projects', 'edit')) out += CRUD.actionBtn('task', p.id, 'plus', 'Add task');
      if (Auth.can('projects', 'delete')) out += CRUD.actionBtn('delete', p.id, 'trash', 'Delete project', 'danger');
      return out;
    },
    onRowAction: function (action, p, table) {
      if (action === 'task') openTaskForm(p);
    },
    empty: { icon: 'kanban', title: 'No projects yet', message: 'Create a project to organise the club’s student-led ICT work.' },
    cascade: function (p) { Store.removeWhere('projectTasks', function (t) { return t.projectId === p.id; }); },
    deleteDetails: 'All tasks belonging to this project will also be deleted. The action can be undone immediately afterwards.',

    detailTitle: function (p) { return p.name; },
    detailSubtitle: function (p) { return (p.projectId || '') + ' · led by ' + nameOf(p.leaderId) + ' · ' + (p.technologies || []).join(', '); },
    detailBadges: function (p) {
      return UI.statusBadge(p.status) + UI.badge(progressOf(p) + '% complete', 'primary', { icon: 'trending-up' }) +
        UI.badge((p.team || []).length + ' team members', 'secondary', { icon: 'users' }) + (p.demo ? UI.demoChip() : '');
    },
    detailActions: function (p) {
      return (Auth.can('projects', 'edit') ? '<button type="button" class="btn btn-primary btn-sm" data-detail-action="task">' + Icons.svg('plus', { class: 'btn-ico' }) + 'Add task</button>' : '') +
        '<button type="button" class="btn btn-outline btn-sm" data-detail-action="print">' + Icons.svg('print', { class: 'btn-ico' }) + 'Project sheet</button>';
    },
    detail: function (p) {
      var tasks = tasksFor(p.id);
      var done = tasks.filter(function (t) { return t.status === 'Completed'; }).length;
      var tabsHtml = UI.tabs([
        { key: 'overview', label: 'Overview', icon: 'info' },
        { key: 'tasks', label: 'Task board', icon: 'check-square', count: tasks.length },
        { key: 'team', label: 'Team', icon: 'users', count: (p.team || []).length },
        { key: 'docs', label: 'Documentation', icon: 'file-text' }
      ], detailTab);

      var body = '';
      if (detailTab === 'tasks') {
        body = UI.card({
          title: 'Task board', icon: 'check-square', sub: done + ' of ' + tasks.length + ' tasks completed',
          head: Auth.can('projects', 'edit') ? '<button type="button" class="link-btn xs" data-detail-action="task">' + Icons.svg('plus') + ' Add task</button>' : '',
          body: '<div class="mb-2">' + UI.progressRow('Project progress', progressOf(p)) + '</div>' + boardHTML(p)
        });
      } else if (detailTab === 'team') {
        body = UI.card({
          title: 'Project team', icon: 'users', sub: (p.team || []).length + ' members',
          head: Auth.can('projects', 'edit') ? '<button type="button" class="link-btn xs" data-detail-action="team">' + Icons.svg('edit') + ' Manage team</button>' : '',
          body: '<div class="record-grid" style="padding:0">' + (p.team || []).map(function (id) {
            var m = Store.find('members', id);
            if (!m) return '';
            var memberTasks = tasks.filter(function (t) { return t.assignee === id; });
            return '<article class="record-card"><div class="record-card-head">' + UI.avatar(m.fullName, 'lg') +
              '<div class="rc-main"><h3><a href="#/members/' + m.id + '">' + U.esc(m.fullName) + '</a></h3>' +
              '<p class="small">' + U.esc(m.klass + ' ' + (m.stream || '')) + '</p>' +
              '<div>' + (p.leaderId === id ? UI.badge('Project leader', 'primary', { icon: 'crown' }) : UI.badge('Team member', 'neutral')) + '</div></div></div>' +
              '<div class="record-card-body">' +
                UI.metaRow('check-square', 'Tasks assigned', memberTasks.length + ' (' + memberTasks.filter(function (t) { return t.status === 'Completed'; }).length + ' done)') +
                UI.metaRow('mail', 'Email', U.esc(m.email || '—')) +
                UI.metaRow('activity', 'Skills', U.esc(U.truncate((m.skills || []).join(', '), 40) || '—')) +
              '</div></article>';
          }).join('') + '</div>'
        });
      } else if (detailTab === 'docs') {
        body = '<div class="grid cols-2">' +
          UI.card({
            title: 'Documentation', icon: 'file-text',
            body: (p.documentation ? '<p class="small" style="white-space:pre-line">' + U.esc(p.documentation) + '</p>' : '<p class="muted small">No documentation recorded yet.</p>') +
              '<div class="divider-text mt-2"><span>Objectives</span></div>' +
              '<ul style="padding-left:18px;list-style:disc;display:grid;gap:5px" class="small">' +
                (p.objectives || []).map(function (o) { return '<li>' + U.esc(o) + '</li>'; }).join('') + '</ul>' +
              '<div class="divider-text mt-2"><span>Technologies</span></div>' +
              UI.chipRow((p.technologies || []).map(function (t) { return { label: t, icon: 'code' }; }))
          }) +
          UI.card({
            title: 'Links and files', icon: 'link',
            body: (p.links || []).length
              ? '<div class="list-rows">' + p.links.map(function (l) {
                  return '<a class="list-row" href="' + U.attr(l.url) + '" target="_blank" rel="noopener">' +
                    '<span class="tl-dot">' + Icons.svg('external-link') + '</span>' +
                    '<span class="list-row-main"><strong>' + U.esc(l.label || 'Link') + '</strong><span>' + U.esc(l.url) + '</span></span></a>';
                }).join('') + '</div>'
              : '<p class="muted small">No repository or demo links recorded.</p>' +
                '<div class="alert alert-info mt-2">' + Icons.svg('info') + '<div>Screenshot and file attachments will be enabled when the platform is connected to file storage.</div></div>'
          }) +
          UI.card({
            title: 'Results', icon: 'trophy',
            body: p.results ? '<p class="small" style="white-space:pre-line">' + U.esc(p.results) + '</p>' : '<p class="muted small">Results are recorded when the project is delivered.</p>' +
              '<div class="stat-strip mt-2">' +
                '<div class="strip-item"><span>Budget</span><strong>' + U.money(p.budget || 0, Store.settings().currency) + '</strong></div>' +
                '<div class="strip-item"><span>Tasks completed</span><strong>' + done + '/' + tasks.length + '</strong></div>' +
              '</div>' +
              (Auth.can('projects', 'edit') ? '<button type="button" class="btn btn-outline btn-sm mt-2" data-detail-action="results">' + Icons.svg('edit', { class: 'btn-ico' }) + 'Record results</button>' : '')
          }) +
        '</div>';
      } else {
        body = '<div class="grid cols-2">' +
          UI.card({
            title: 'Project brief', icon: 'info',
            body: UI.kvGrid([
              { label: 'Project ID', value: p.projectId },
              { label: 'Status', html: UI.statusBadge(p.status) },
              { label: 'Progress', value: progressOf(p) + '%' },
              { label: 'Started', value: U.fmtDate(p.startDate, 'long') },
              { label: 'Expected completion', value: U.fmtDate(p.expectedCompletion, 'long') },
              { label: 'Completed', value: p.actualCompletion ? U.fmtDate(p.actualCompletion, 'long') : 'In progress' },
              { label: 'Duration', value: U.daysBetween(p.startDate, p.actualCompletion || p.expectedCompletion) + ' days' },
              { label: 'Budget', value: U.money(p.budget || 0, Store.settings().currency) },
              { label: 'Leader', html: '<a href="#/members/' + p.leaderId + '">' + U.esc(nameOf(p.leaderId)) + '</a>' },
              { label: 'Team size', value: (p.team || []).length + ' members' }
            ]) +
            '<div class="mt-2"><strong class="small">Description</strong><p class="small">' + U.esc(p.description || '') + '</p></div>' +
            '<div class="note-block warning mt-2"><strong>Problem statement</strong><br>' + U.esc(p.problemStatement || '—') + '</div>' +
            '<div class="mt-2">' + UI.progressRow('Overall progress', progressOf(p)) + '</div>'
          }) +
          UI.card({
            title: 'Task summary', icon: 'check-square',
            body: '<div class="stat-strip mb-2">' +
                ['Pending', 'In Progress', 'Completed', 'Overdue'].map(function (s) {
                  return '<div class="strip-item"><span>' + s + '</span><strong>' + tasksOf(p.id, s).length + '</strong></div>';
                }).join('') +
              '</div>' +
              '<div class="list-rows">' + U.sortBy(tasks, 'due').slice(0, 5).map(function (t) {
                return '<div class="list-row"><span class="tl-dot ' + (t.status === 'Completed' ? 'success' : t.status === 'Overdue' ? 'danger' : t.status === 'In Progress' ? 'warning' : '') + '">' + Icons.svg('check-square') + '</span>' +
                  '<span class="list-row-main"><strong>' + U.esc(t.title) + '</strong><span>' + U.esc(nameOf(t.assignee) + ' · due ' + U.fmtDate(t.due)) + '</span></span>' +
                  '<span class="list-row-side">' + UI.statusBadge(t.status) + '</span></div>';
              }).join('') + '</div>',
            foot: '<button type="button" class="link-btn" data-tab-jump="tasks">Open task board ' + Icons.svg('arrow-right') + '</button>'
          }) +
        '</div>';
      }

      return UI.card({ head: tabsHtml, flush: true, body: '<div class="card-body">' + body + '</div>' });
    },
    onDetailMount: function (ctx, root, p) {
      root.addEventListener('click', function (e) {
        var tab = e.target.closest('[data-tab]');
        if (tab) { detailTab = tab.getAttribute('data-tab'); Router.refresh(); return; }
        var jump = e.target.closest('[data-tab-jump]');
        if (jump) { detailTab = jump.getAttribute('data-tab-jump'); Router.refresh(); return; }
        var move = e.target.closest('[data-task-move]');
        if (move) {
          if (!CRUD.guard('projects', 'edit')) return;
          var to = move.getAttribute('data-to');
          Store.update('projectTasks', move.getAttribute('data-task-move'), { status: to, progress: to === 'Completed' ? 100 : undefined });
          CRUD.refreshDerived();
          Store.update('projects', p.id, { progress: progressOf(p) });
          UI.toast('Task moved', 'The task is now marked as ' + to + '.', 'success', { duration: 2200 });
          Router.refresh();
          return;
        }
        var card = e.target.closest('[data-task]');
        if (card && !e.target.closest('button')) {
          var task = Store.find('projectTasks', card.getAttribute('data-task'));
          if (task) openTaskForm(p, task);
        }
      });
    },
    onDetailAction: function (action, btn, p) {
      if (action === 'task') openTaskForm(p);
      if (action === 'team') {
        UI.formModal({
          title: 'Manage project team', subtitle: p.name, icon: 'users', size: 'sm',
          formHtml: Forms.render([
            { name: 'leaderId', label: 'Project leader', type: 'member', required: true, value: p.leaderId, colSpan: 2 },
            { name: 'team', label: 'Team members', type: 'members', size: 9, value: p.team || [], colSpan: 2 }
          ]),
          submitLabel: 'Save team',
          onOpen: function (c, form) { Forms.init(form); },
          validate: function (data) { return data.leaderId ? {} : { leaderId: 'Choose a project leader.' }; },
          onSubmit: function (data) {
            var team = (data.team || []).slice();
            if (team.indexOf(data.leaderId) === -1) team.unshift(data.leaderId);
            Store.update('projects', p.id, { leaderId: data.leaderId, team: team });
            UI.toast('Team updated', team.length + ' members are now on this project.', 'success');
            Router.refresh();
          }
        });
      }
      if (action === 'results') {
        UI.formModal({
          title: 'Record project results', subtitle: p.name, icon: 'trophy', size: 'sm',
          formHtml: Forms.render([
            { name: 'status', label: 'Status', type: 'select', options: Data.PROJECT_STATUSES, value: p.status, colSpan: 2 },
            { name: 'actualCompletion', label: 'Actual completion date', type: 'date', value: p.actualCompletion, colSpan: 2 },
            { name: 'results', label: 'Results and lessons learned', type: 'textarea', rows: 5, value: p.results, colSpan: 2 }
          ]),
          submitLabel: 'Save results',
          onOpen: function (c, form) { Forms.init(form); },
          onSubmit: function (data) {
            Store.update('projects', p.id, {
              status: data.status, actualCompletion: data.actualCompletion, results: data.results,
              progress: data.status === 'Completed' ? 100 : progressOf(p)
            });
            UI.toast('Results recorded', 'The project record has been updated.', 'success');
            Router.refresh();
          }
        });
      }
      if (action === 'print') {
        Print.preview(Print.page(
          '<div class="print-doc-title"><h1>Project Record</h1><p>' + U.esc(p.name) + '</p></div>' +
          '<table><tbody>' +
            '<tr><th style="width:30%">Project ID</th><td>' + U.esc(p.projectId || '') + '</td></tr>' +
            '<tr><th>Status</th><td>' + U.esc(p.status) + ' · ' + progressOf(p) + '% complete</td></tr>' +
            '<tr><th>Leader</th><td>' + U.esc(nameOf(p.leaderId)) + '</td></tr>' +
            '<tr><th>Team</th><td>' + U.esc((p.team || []).map(nameOf).join(', ')) + '</td></tr>' +
            '<tr><th>Technologies</th><td>' + U.esc((p.technologies || []).join(', ')) + '</td></tr>' +
            '<tr><th>Period</th><td>' + U.fmtDate(p.startDate) + ' — ' + U.fmtDate(p.expectedCompletion) + '</td></tr>' +
            '<tr><th>Budget</th><td>' + U.money(p.budget || 0, Store.settings().currency) + '</td></tr>' +
          '</tbody></table>' +
          '<h3>Problem statement</h3><p>' + U.esc(p.problemStatement || '') + '</p>' +
          '<h3>Objectives</h3><ul>' + (p.objectives || []).map(function (o) { return '<li>' + U.esc(o) + '</li>'; }).join('') + '</ul>' +
          '<h3>Tasks</h3><table><thead><tr><th>Task</th><th>Assigned to</th><th>Status</th><th>Due</th></tr></thead><tbody>' +
            tasksFor(p.id).map(function (t) {
              return '<tr><td>' + U.esc(t.title) + '</td><td>' + U.esc(nameOf(t.assignee)) + '</td><td>' + U.esc(t.status) + '</td><td>' + U.fmtDate(t.due) + '</td></tr>';
            }).join('') + '</tbody></table>' +
          '<h3>Results</h3><p>' + U.esc(p.results || 'Not yet recorded.') + '</p>' +
          '<div class="print-sign"><div><div class="line"></div>Project Leader</div><div><div class="line"></div>Projects Coordinator</div></div>',
          { meta: 'Project record' }
        ), { title: 'Project — ' + p.name, fileName: 'mrhs-ict-project-' + (p.projectId || p.id) });
      }
    }
  };

  ModuleHelper.page(config);

  global.Modules = global.Modules || {};
  global.Modules.Projects = {
    config: config,
    openForm: function (values) {
      if (values && values.id) return ModuleHelper.openEdit(config, Store.find('projects', values.id));
      return ModuleHelper.openCreate(config);
    },
    openTaskForm: openTaskForm,
    progressOf: progressOf,
    tasksFor: tasksFor,
    nameOf: nameOf
  };
})(window);
