/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/dashboard.js
   The club dashboard: key figures, trends, upcoming events, live projects,
   recent activity, announcements and quick actions.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  /* State kept locally so range switches re-render just the charts. */
  var state = { attendanceRange: 6, growthRange: 9, chartView: 'rate' };

  function trendFor(current, previous, unit) {
    if (!previous) return { dir: 'flat', text: 'No prior data' };
    var delta = current - previous;
    var dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    var pct = Math.abs(Math.round((delta / previous) * 100));
    return { dir: dir, text: (dir === 'up' ? '+' : dir === 'down' ? '−' : '±') + (unit === '%' ? Math.abs(delta) + ' pts' : pct + '%') + ' vs last month' };
  }

  function statGrid() {
    var m = Metrics.members();
    var a = Metrics.attendance();
    var c = Metrics.courses();
    var p = Metrics.projects();
    var mt = Metrics.meetings();
    var act = Metrics.activities();
    var rp = Metrics.reports();
    var ce = Metrics.certificates();

    var growth = Metrics.membershipGrowth(2);
    var memberTrend = growth.length === 2 ? trendFor(growth[1].total, growth[0].total) : { dir: 'flat', text: '' };
    var attMonths = Metrics.attendanceByMonth(2);
    var attTrend = attMonths.length === 2 ? trendFor(attMonths[1].rate, attMonths[0].rate, '%') : { dir: 'flat', text: '' };

    var stats = [
      { label: 'Total Members', value: U.num(m.total), icon: 'users', tone: 'primary', trend: memberTrend.dir, trendText: memberTrend.text, foot: m.newThisTerm + ' joined recently' },
      { label: 'Active Members', value: U.num(m.active), icon: 'user-check', tone: 'success', foot: m.joinRate + '% of the register' },
      { label: 'Cabinet Members', value: U.num(m.cabinet), icon: 'crown', tone: 'secondary', foot: 'Positions filled this term' },
      { label: 'Active Courses', value: U.num(c.ongoing), icon: 'graduation', tone: 'accent', foot: c.enrollments + ' enrolments' },
      { label: 'Active Projects', value: U.num(p.active), icon: 'kanban', tone: 'info', foot: p.avgProgress + '% average progress' },
      { label: 'Upcoming Meetings', value: U.num(mt.upcoming), icon: 'calendar-check', tone: 'primary', foot: mt.next ? 'Next: ' + U.fmtDate(mt.next.date, 'day') : 'None scheduled' },
      { label: 'Upcoming Activities', value: U.num(act.planned), icon: 'rocket', tone: 'secondary', foot: act.ongoing + ' running now' },
      { label: 'Attendance Rate', value: a.rate + '%', icon: 'activity', tone: a.rate >= 75 ? 'success' : a.rate >= 60 ? 'warning' : 'danger', trend: attTrend.dir, trendText: attTrend.text, foot: a.total + ' records' },
      { label: 'Reports Submitted', value: U.num(rp.total), icon: 'file-text', tone: 'warning', foot: rp.approved + ' approved · ' + rp.submitted + ' awaiting review' },
      { label: 'Certificates Issued', value: U.num(ce.issued), icon: 'award', tone: 'success', foot: ce.draft + ' drafts pending' }
    ];

    return '<div class="stat-grid">' + stats.map(function (s) { return UI.statCard(s); }).join('') + '</div>';
  }

  function hero() {
    var user = Auth.currentUser();
    var s = Store.settings();
    var m = Metrics.members();
    var termDays = s.termEnd ? U.daysFromNow(s.termEnd) : null;
    return '<section class="hero">' +
      '<div class="hero-text">' +
        '<h1>' + U.greeting() + ', ' + U.esc((user.name || '').split(' ')[0]) + '</h1>' +
        '<p>Here’s what’s happening in ' + U.esc(s.clubName || 'MRHS ICT Club') + '. You are signed in as ' +
          '<strong>' + U.esc(user.role) + '</strong>.</p>' +
        '<div class="hero-meta">' +
          '<div><span>Academic year</span><strong>' + U.esc(s.academicYear || '') + '</strong></div>' +
          '<div><span>Current term</span><strong>' + U.esc(s.currentTerm || '') + '</strong></div>' +
          '<div><span>Members</span><strong>' + m.active + ' active</strong></div>' +
          '<div><span>Term ends</span><strong>' + (termDays !== null ? (termDays > 0 ? 'in ' + termDays + ' days' : 'closed') : '—') + '</strong></div>' +
        '</div>' +
      '</div>' +
      '<div class="hero-actions">' +
        '<a class="btn btn-outline btn-sm" href="#/analytics">' + Icons.svg('bar-chart', { class: 'btn-ico' }) + 'View analytics</a>' +
        '<a class="btn btn-outline btn-sm" href="#/calendar">' + Icons.svg('calendar', { class: 'btn-ico' }) + 'Open calendar</a>' +
      '</div>' +
    '</section>';
  }

  function quickActions() {
    var actions = [
      { label: 'Add Member', icon: 'user-plus', module: 'members', run: function () { Modules.Members.openForm(); } },
      { label: 'Create Meeting', icon: 'calendar-plus', module: 'meetings', run: function () { Modules.Meetings.openForm(); } },
      { label: 'Record Attendance', icon: 'user-check', module: 'attendance', run: function () { Modules.Attendance.openRecorder(); } },
      { label: 'Add Project', icon: 'kanban', module: 'projects', run: function () { Modules.Projects.openForm(); } },
      { label: 'Create Activity', icon: 'rocket', module: 'activities', run: function () { Modules.Activities.openForm(); } },
      { label: 'Create Report', icon: 'file-text', module: 'reports', run: function () { Modules.Reports.openForm(); } },
      { label: 'Issue Certificate', icon: 'award', module: 'certificates', run: function () { Modules.Certificates.openForm(); } },
      { label: 'Add Course', icon: 'graduation', module: 'courses', run: function () { Modules.Courses.openForm(); } }
    ].filter(function (a) { return Auth.can(a.module, 'create'); });

    if (!actions.length) return '';
    return UI.card({
      title: 'Quick actions', icon: 'zap', sub: 'Create records without leaving the dashboard',
      body: '<div class="quick-grid">' + actions.map(function (a, i) {
        return '<button type="button" class="quick-action" data-quick="' + i + '">' +
          '<span class="qa-ico">' + Icons.svg(a.icon) + '</span>' + U.esc(a.label) + '</button>';
      }).join('') + '</div>',
      className: 'quick-card'
    }).replace('<section', '<section data-actions="' + encodeURIComponent(JSON.stringify(actions.map(function (a) { return a.label; }))) + '"');
  }

  function attendanceChart() {
    var months = Metrics.attendanceByMonth(state.attendanceRange);
    var labels = months.map(function (m) { return m.label; });
    var chart;
    if (state.chartView === 'volume') {
      chart = Charts.bar({
        labels: labels,
        aria: 'Attendance records recorded per month',
        xLabel: 'Month',
        yFormat: function (v) { return U.num(v); },
        series: [{ name: 'Attendance records', color: '#2545d6', data: months.map(function (m) { return m.count; }) }]
      });
    } else {
      chart = Charts.line({
        labels: labels,
        minZero: false,
        aria: 'Club attendance rate over the last months',
        xLabel: 'Month',
        yFormat: function (v) { return Math.round(v) + '%'; },
        valueFormat: function (v) { return v + '%'; },
        series: [{ name: 'Attendance rate', color: '#2545d6', data: months.map(function (m) { return m.rate; }) }]
      });
    }
    var a = Metrics.attendance();
    return UI.card({
      title: 'Attendance overview', icon: 'activity',
      sub: 'Present and late attendances divided by expected attendance',
      head: UI.segmented([
        { key: 'rate', label: 'Rate' }, { key: 'volume', label: 'Volume' }
      ], state.chartView, { id: 'att-view' }),
      body: '<div id="att-chart">' + chart + '</div>' +
        '<div class="stat-strip mt-2">' +
          '<div class="strip-item"><span>Overall rate</span><strong>' + a.rate + '%</strong></div>' +
          '<div class="strip-item"><span>Present</span><strong>' + U.num(a.present) + '</strong></div>' +
          '<div class="strip-item"><span>Late</span><strong>' + U.num(a.late) + '</strong></div>' +
          '<div class="strip-item"><span>Absent</span><strong>' + U.num(a.absent) + '</strong></div>' +
        '</div>',
      foot: '<div class="card-tools">' + UI.segmented([
        { key: '6', label: '6 months' }, { key: '9', label: '9 months' }, { key: '12', label: '12 months' }
      ], String(state.attendanceRange), { id: 'att-range' }) + '</div>' +
        '<a class="link-btn" href="#/attendance">Open attendance module ' + Icons.svg('arrow-right') + '</a>'
    });
  }

  function membershipChart() {
    var growth = Metrics.membershipGrowth(state.growthRange);
    var m = Metrics.members();
    var chart = Charts.line({
      labels: growth.map(function (g) { return g.label; }),
      aria: 'Cumulative club membership growth',
      xLabel: 'Month',
      yFormat: function (v) { return U.num(v); },
      series: [
        { name: 'Total members', color: '#2545d6', data: growth.map(function (g) { return g.total; }) },
        { name: 'New members', color: '#7f47ef', data: growth.map(function (g) { return g.added; }), dashed: true }
      ]
    });
    return UI.card({
      title: 'Membership overview', icon: 'users', sub: 'Register growth and new joiners',
      body: chart +
        '<div class="stat-strip mt-2">' +
          '<div class="strip-item"><span>Active</span><strong>' + m.active + '</strong></div>' +
          '<div class="strip-item"><span>Inactive</span><strong>' + m.inactive + '</strong></div>' +
          '<div class="strip-item"><span>Alumni</span><strong>' + m.alumni + '</strong></div>' +
          '<div class="strip-item"><span>Suspended</span><strong>' + m.suspended + '</strong></div>' +
        '</div>',
      foot: '<span class="muted small">Joiners are counted from each member’s “date joined”.</span>' +
        '<a class="link-btn" href="#/members">All members ' + Icons.svg('arrow-right') + '</a>'
    });
  }

  function attendanceDonut() {
    var a = Metrics.attendance();
    return UI.card({
      title: 'Attendance breakdown', icon: 'pie-chart', sub: 'All recorded attendance',
      body: Charts.donut({
        data: a.byStatus,
        centerValue: a.rate + '%',
        centerLabel: 'Attendance rate',
        aria: 'Attendance status breakdown',
        size: 190, stroke: 24
      })
    });
  }

  function upcomingCard() {
    var items = Metrics.upcoming(7);
    var body = items.length
      ? '<div class="list-rows">' + items.map(function (e) {
          var soon = U.daysFromNow(e.date);
          return '<a class="list-row clickable" href="' + e.link + '">' +
            '<span class="tl-dot ' + (e.tone === 'secondary' ? 'accent' : e.tone === 'warning' ? 'warning' : '') + '">' + Icons.svg(e.icon) + '</span>' +
            '<span class="list-row-main"><strong>' + U.esc(e.title) + '</strong>' +
            '<span>' + U.esc(e.kind + ' · ' + U.fmtDate(e.date, 'long') + (e.time ? ' at ' + U.fmtTime(e.time) : '') + (e.venue ? ' · ' + e.venue : '')) + '</span></span>' +
            '<span class="list-row-side">' + UI.badge(soon === 0 ? 'Today' : soon === 1 ? 'Tomorrow' : 'in ' + soon + ' days', soon <= 1 ? 'danger' : soon <= 7 ? 'warning' : 'info', { soft: true }) + '</span>' +
          '</a>';
        }).join('') + '</div>'
      : UI.emptyState({ icon: 'calendar', title: 'Nothing scheduled', message: 'Meetings, activities and deadlines will appear here as soon as they are created.' });
    return UI.card({
      title: 'Upcoming events', icon: 'calendar-check', sub: 'Meetings, activities and deadlines',
      flush: true, body: body,
      foot: '<span class="muted small">' + items.length + ' upcoming ' + U.plural(items.length, 'item') + '</span>' +
        '<a class="link-btn" href="#/calendar">Open calendar ' + Icons.svg('arrow-right') + '</a>'
    });
  }

  function projectsCard() {
    var active = U.sortBy(Store.all('projects').filter(function (p) { return p.status !== 'Archived'; }), 'progress', 'desc').slice(0, 5);
    var body = active.length
      ? '<div class="list-rows">' + active.map(function (p) {
          var leader = Store.find('members', p.leaderId);
          return '<div class="list-row">' +
            '<span class="tl-dot ' + (p.status === 'Completed' ? 'success' : p.status === 'Testing' ? 'warning' : '') + '">' + Icons.svg('kanban') + '</span>' +
            '<span class="list-row-main">' +
              '<strong><a href="#/projects/' + p.id + '">' + U.esc(p.name) + '</a></strong>' +
              '<span>' + U.esc(leader ? leader.fullName : 'Unassigned') + ' · ' + U.esc(p.status) + ' · ' + p.team.length + ' team ' + U.plural(p.team.length, 'member') + '</span>' +
              '<div class="mt-1">' + UI.progressBar(p.progress, { size: 'sm' }) + '</div>' +
            '</span>' +
            '<span class="list-row-side"><strong>' + p.progress + '%</strong></span>' +
          '</div>';
        }).join('') + '</div>'
      : UI.emptyState({ icon: 'kanban', title: 'No projects yet', message: 'Start a project to track student-led ICT work.', actions: Auth.can('projects', 'create') ? '<button type="button" class="btn btn-primary btn-sm" data-qa="new-project">' + Icons.svg('plus', { class: 'btn-ico' }) + 'Add project</button>' : '' });
    return UI.card({
      title: 'Active projects', icon: 'kanban', sub: 'Highest progress first',
      flush: true, body: body,
      foot: '<span class="muted small">' + Metrics.projects().active + ' active of ' + Metrics.projects().total + ' recorded</span>' +
        '<a class="link-btn" href="#/projects">All projects ' + Icons.svg('arrow-right') + '</a>'
    });
  }

  function announcementsCard() {
    var today = U.todayISO();
    var list = Store.all('announcements')
      .filter(function (a) { return a.status === 'Published' && (!a.expiryDate || a.expiryDate >= today); })
      .sort(function (a, b) {
        var rank = { 'Urgent': 0, 'Important': 1, 'Normal': 2 };
        var d = rank[a.priority] - rank[b.priority];
        return d !== 0 ? d : String(b.date).localeCompare(String(a.date));
      }).slice(0, 4);
    var body = list.length ? '<div class="list-rows">' + list.map(function (a) {
      return '<div class="list-row">' +
        '<span class="tl-dot ' + (a.priority === 'Urgent' ? 'danger' : a.priority === 'Important' ? 'warning' : '') + '">' + Icons.svg('megaphone') + '</span>' +
        '<span class="list-row-main"><strong>' + U.esc(a.title) + '</strong>' +
        '<span>' + U.esc(U.truncate(a.message, 120)) + '</span>' +
        '<span class="xs muted">' + U.esc(U.fmtDate(a.date)) + ' · ' + U.esc(U.findBy(Store.all('members'), 'id', a.authorId) ? U.findBy(Store.all('members'), 'id', a.authorId).fullName : 'Club') + '</span></span>' +
        '<span class="list-row-side">' + UI.badge(a.priority, U.tone(a.priority), { icon: a.priority === 'Urgent' ? 'alert-triangle' : 'info' }) + '</span>' +
      '</div>';
    }).join('') + '</div>'
      : UI.emptyState({ icon: 'megaphone', title: 'No active announcements', message: 'Notices posted by the cabinet will show up here.' });
    return UI.card({
      title: 'Recent announcements', icon: 'megaphone', sub: 'Priority notices appear first',
      flush: true, body: body,
      foot: '<a class="link-btn" href="#/announcements">All announcements ' + Icons.svg('arrow-right') + '</a>'
    });
  }

  function activityFeed() {
    var items = Metrics.recentActivity(7);
    return UI.card({
      title: 'Recent club activity', icon: 'history', sub: 'Automatic feed from club records',
      body: items.length ? UI.timeline(items.map(function (i) {
        return { icon: i.icon, tone: i.tone, title: i.title, text: i.text, time: U.timeAgo(i.at) };
      })) : UI.emptyState({ icon: 'history', title: 'No activity yet', message: 'Records you create will appear in this feed.' })
    });
  }

  function tasksCard() {
    var t = Metrics.tasks();
    var mine = Store.all('tasks').filter(function (x) {
      var user = Auth.currentUser();
      return user && (x.assigneeId === user.memberId || x.createdById === user.id) && x.status !== 'Completed';
    });
    var list = mine.length ? mine : Store.all('tasks').filter(function (x) { return x.status !== 'Completed'; });
    list = U.sortBy(list, 'deadline').slice(0, 5);
    return UI.card({
      title: 'Task progress', icon: 'check-square', sub: mine.length ? 'Tasks assigned to you' : 'Open club tasks',
      body: '<div class="stat-strip mb-2">' +
          '<div class="strip-item"><span>Pending</span><strong>' + t.pending + '</strong></div>' +
          '<div class="strip-item"><span>In progress</span><strong>' + t.inProgress + '</strong></div>' +
          '<div class="strip-item"><span>Overdue</span><strong>' + t.overdue + '</strong></div>' +
          '<div class="strip-item"><span>Completed</span><strong>' + t.completed + '</strong></div>' +
        '</div>' +
        UI.progressRow('Overall task completion', t.completion) +
        (list.length ? '<div class="list-rows mt-2">' + list.map(function (x) {
          return '<div class="list-row">' +
            '<span class="tl-dot ' + (x.deadline < U.todayISO() ? 'danger' : x.priority === 'Urgent' ? 'warning' : '') + '">' + Icons.svg('check-square') + '</span>' +
            '<span class="list-row-main"><strong>' + U.esc(x.title) + '</strong>' +
            '<span>' + U.esc(x.status + ' · ' + U.dueLabel(x.deadline)) + '</span></span>' +
            '<span class="list-row-side">' + UI.badge(x.priority, U.tone(x.priority)) + '</span>' +
          '</div>';
        }).join('') + '</div>' : ''),
      foot: '<a class="link-btn" href="#/tasks">Open task board ' + Icons.svg('arrow-right') + '</a>'
    });
  }

  function attentionCard() {
    var low = Metrics.lowAttendance(null, 6).slice(0, 4);
    var overdueReports = Store.count('reports', function (r) { return r.status === 'Submitted'; });
    var damaged = Metrics.equipment().damaged;
    var items = [];
    low.forEach(function (l) {
      items.push({ tone: 'warning', icon: 'user-check', text: '<strong>' + U.esc(l.name) + '</strong> has an attendance rate of ' + l.rate + '% (' + l.records + ' records).', link: '#/members/' + l.memberId, label: 'View member' });
    });
    if (overdueReports) items.push({ tone: 'info', icon: 'file-text', text: '<strong>' + overdueReports + '</strong> ' + U.plural(overdueReports, 'report') + ' awaiting approval.', link: '#/reports', label: 'Review reports' });
    if (damaged) items.push({ tone: 'danger', icon: 'alert-triangle', text: '<strong>' + damaged + '</strong> equipment ' + U.plural(damaged, 'item') + ' damaged or under repair.', link: '#/equipment', label: 'View equipment' });

    if (!items.length) return '';
    return UI.card({
      title: 'Needs attention', icon: 'alert-circle', sub: 'Automatic checks across club records',
      body: '<div class="list-rows">' + items.map(function (i) {
        return '<div class="list-row">' +
          '<span class="tl-dot ' + i.tone + '">' + Icons.svg(i.icon) + '</span>' +
          '<span class="list-row-main"><span style="white-space:normal">' + i.text + '</span></span>' +
          '<span class="list-row-side"><a class="link-btn xs" href="' + i.link + '">' + U.esc(i.label) + '</a></span>' +
        '</div>';
      }).join('') + '</div>'
    });
  }

  function demoNotice() {
    var s = Store.settings();
    if (!s.demoData) return '';
    var st = Store.stats();
    var demoCount = 0;
    Store.COLLECTIONS.forEach(function (c) { demoCount += Store.count(c, function (r) { return r.demo === true; }); });
    return '<div class="alert alert-warning">' + Icons.svg('info') +
      '<div><strong>Demonstration dataset</strong>This build is populated with ' + demoCount + ' clearly labelled sample records (' + st.total +
      ' total records stored in this browser). No real member data is included. You can remove or replace the sample data under ' +
      '<a href="#/settings">Settings › Data</a>.</div></div>';
  }

  function render() {
    var html = '<div class="page">' +
      hero() +
      demoNotice() +
      statGrid() +
      '<div class="grid cols-2" style="grid-template-columns:minmax(0,1.55fr) minmax(0,1fr)">' +
        attendanceChart() + attendanceDonut() +
      '</div>' +
      '<div class="grid cols-2" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">' +
        membershipChart() + tasksCard() +
      '</div>' +
      '<div class="grid cols-2">' + upcomingCard() + announcementsCard() + '</div>' +
      '<div class="grid cols-2" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)">' +
        projectsCard() + activityFeed() +
      '</div>' +
      attentionCard() +
      quickActions() +
    '</div>';
    return html;
  }

  function mount(ctx, root) {
    var actions = [
      function () { Modules.Members.openForm(); },
      function () { Modules.Meetings.openForm(); },
      function () { Modules.Attendance.openRecorder(); },
      function () { Modules.Projects.openForm(); },
      function () { Modules.Activities.openForm(); },
      function () { Modules.Reports.openForm(); },
      function () { Modules.Certificates.openForm(); },
      function () { Modules.Courses.openForm(); }
    ].filter(function (_, i) { return true; });

    root.addEventListener('click', function (e) {
      var quick = e.target.closest('[data-quick]');
      if (quick) {
        var i = +quick.getAttribute('data-quick');
        var allowed = [
          { module: 'members', fn: function () { Modules.Members.openForm(); } },
          { module: 'meetings', fn: function () { Modules.Meetings.openForm(); } },
          { module: 'attendance', fn: function () { Modules.Attendance.openRecorder(); } },
          { module: 'projects', fn: function () { Modules.Projects.openForm(); } },
          { module: 'activities', fn: function () { Modules.Activities.openForm(); } },
          { module: 'reports', fn: function () { Modules.Reports.openForm(); } },
          { module: 'certificates', fn: function () { Modules.Certificates.openForm(); } },
          { module: 'courses', fn: function () { Modules.Courses.openForm(); } }
        ].filter(function (a) { return Auth.can(a.module, 'create'); });
        if (allowed[i]) allowed[i].fn();
        return;
      }
      if (e.target.closest('[data-qa="new-project"]')) Modules.Projects.openForm();
    });

    // Segmented controls for the attendance chart
    root.addEventListener('click', function (e) {
      var seg = e.target.closest('#att-view [data-seg]');
      if (seg) {
        state.chartView = seg.getAttribute('data-seg');
        U.$$('#att-view [data-seg]').forEach(function (b) { b.classList.toggle('active', b === seg); });
        document.getElementById('att-chart').innerHTML = attendanceChartCharts();
        return;
      }
      var range = e.target.closest('#att-range [data-seg]');
      if (range) {
        state.attendanceRange = +range.getAttribute('data-seg');
        U.$$('#att-range [data-seg]').forEach(function (b) { b.classList.toggle('active', b === range); });
        document.getElementById('att-chart').innerHTML = attendanceChartCharts();
      }
    });
  }

  function attendanceChartCharts() {
    var months = Metrics.attendanceByMonth(state.attendanceRange);
    var labels = months.map(function (m) { return m.label; });
    if (state.chartView === 'volume') {
      return Charts.bar({
        labels: labels, aria: 'Attendance records per month',
        series: [{ name: 'Attendance records', color: '#2545d6', data: months.map(function (m) { return m.count; }) }]
      });
    }
    return Charts.line({
      labels: labels, minZero: false, aria: 'Attendance rate over time',
      yFormat: function (v) { return Math.round(v) + '%'; },
      valueFormat: function (v) { return v + '%'; },
      series: [{ name: 'Attendance rate', color: '#2545d6', data: months.map(function (m) { return m.rate; }) }]
    });
  }

  Router.view('/dashboard', {
    title: 'Dashboard', icon: 'dashboard', module: 'dashboard',
    render: render, mount: mount
  });

  global.Modules = global.Modules || {};
  global.Modules.Dashboard = { render: render, state: state };
})(window);
