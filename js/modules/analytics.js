/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/analytics.js
   Club intelligence: membership growth, attendance trends, course enrolment
   and completion, project progress, activity participation, certificates and
   the financial position — all computed from live records.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;
  var range = 12; // months shown on the growth charts

  function currency() { return Store.settings().currency || 'UGX'; }

  function insights() {
    var out = [];
    var m = Metrics.members();
    var a = Metrics.attendance();
    var c = Metrics.courses();
    var p = Metrics.projects();
    var t = Metrics.tasks();
    var f = Metrics.finance();

    if (m.joinRate >= 70) {
      out.push({ icon: 'trending-up', tone: 'success', title: 'Membership is healthy',
        text: m.joinRate + '% of registered members are active. ' + m.newThisTerm + ' joined in the last four months.' });
    } else {
      out.push({ icon: 'alert-triangle', tone: 'warning', title: 'Membership needs attention',
        text: 'Only ' + m.joinRate + '% of members are currently active. Follow up with inactive members through their class representatives.' });
    }
    out.push({ icon: 'user-check', tone: a.rate >= 75 ? 'success' : a.rate >= 60 ? 'warning' : 'danger',
      title: 'Attendance stands at ' + a.rate + '%',
      text: a.present + ' present and ' + a.late + ' late out of ' + a.total + ' recorded attendances' + (a.absent ? ', with ' + a.absent + ' absences to follow up.' : '.') });
    var low = Metrics.lowAttendance();
    if (low.length) {
      out.push({ icon: 'flag', tone: 'warning', title: low.length + ' member' + (low.length === 1 ? '' : 's') + ' below the attendance threshold',
        text: 'Their rate is under ' + (Store.settings().lowAttendanceThreshold || 60) + '%. Review their reasons and offer support before the end of term.' });
    }
    if (c.avgCompletion < 50) {
      out.push({ icon: 'graduation', tone: 'warning', title: 'Course completion is low',
        text: 'Average course completion is ' + c.avgCompletion + '%. Consider extra practical sessions for courses that have stalled.' });
    } else {
      out.push({ icon: 'graduation', tone: 'success', title: 'Training is progressing well',
        text: 'Average completion across ' + c.total + ' courses is ' + c.avgCompletion + '% with ' + c.enrollments + ' enrolments.' });
    }
    out.push({ icon: 'kanban', tone: p.avgProgress >= 60 ? 'primary' : 'warning', title: 'Projects are ' + p.avgProgress + '% complete on average',
      text: p.active + ' projects are still active, ' + p.completed + ' completed and ' + p.archived + ' archived.' });
    if (t.overdue) {
      out.push({ icon: 'clock', tone: 'danger', title: t.overdue + ' overdue task' + (t.overdue === 1 ? '' : 's'),
        text: t.dueThisWeek + ' more tasks are due within a week. Review assignments at the next cabinet meeting.' });
    }
    out.push({ icon: f.balance >= 0 ? 'wallet' : 'alert-circle', tone: f.balance >= 0 ? 'success' : 'danger',
      title: 'Club balance is ' + U.money(f.balance, currency()),
      text: U.money(f.income, currency()) + ' raised against ' + U.money(f.expenses, currency()) + ' spent across ' + f.count + ' transactions.' });
    return out;
  }

  function chartSection(title, icon, sub, body, foot) {
    return UI.card({ title: title, icon: icon, sub: sub, body: body, foot: foot });
  }

  Router.view('/analytics', {
    title: 'Analytics', icon: 'bar-chart', module: 'analytics',
    render: function () {
      if (!Auth.can('analytics', 'view')) return UI.restricted('analytics');

      var growth = Metrics.membershipGrowth(range);
      var att = Metrics.attendanceByMonth(range);
      var c = Metrics.courses();
      var enrolments = Metrics.enrolmentByCourse();
      var projects = Metrics.projects();
      var acts = Metrics.activities();
      var certs = Metrics.certificates();
      var fin = Metrics.financeByMonth(range);
      var m = Metrics.members();

      /* Membership growth ------------------------------------------------- */
      var growthCard = chartSection('Membership growth', 'users', 'Cumulative membership and new joins over the last ' + range + ' months',
        Charts.line({
          labels: growth.map(function (g) { return g.label; }),
          series: [
            { name: 'Total members', data: growth.map(function (g) { return g.total; }), color: '#2545d6' },
            { name: 'New members', data: growth.map(function (g) { return g.added; }), color: '#06b6d4' }
          ],
          height: 250
        }) +
        '<div class="stat-strip mt-2">' +
          '<div class="strip-item"><span>Registered</span><strong>' + m.total + '</strong></div>' +
          '<div class="strip-item"><span>Active</span><strong>' + m.active + '</strong></div>' +
          '<div class="strip-item"><span>Alumni</span><strong>' + m.alumni + '</strong></div>' +
          '<div class="strip-item"><span>Cabinet</span><strong>' + m.cabinet + '</strong></div>' +
        '</div>');

      /* Attendance -------------------------------------------------------- */
      var attendanceCard = chartSection('Attendance trend', 'user-check', 'Attendance rate per month across every club session',
        Charts.line({
          labels: att.map(function (x) { return x.label; }),
          series: [{ name: 'Attendance %', data: att.map(function (x) { return x.rate; }), color: '#12884f' }],
          height: 250, yFormat: function (v) { return Math.round(v) + '%'; }
        }) +
        Charts.donut({
          data: Metrics.attendance().byStatus, size: 190, centerLabel: 'Records',
          aria: 'Attendance by status'
        }));

      /* Course enrolment and completion ----------------------------------- */
      var courseSeries = U.sortBy(Object.keys(enrolments).map(function (cid) {
        var course = Store.find('courses', cid) || {};
        return { label: U.truncate(course.name || cid, 22), enrolled: (enrolments[cid] || []).length, completion: course.completionRate || 0 };
      }), 'enrolled', 'desc').slice(0, 8);

      var coursesCard = chartSection('Course enrolment and completion', 'graduation',
        c.total + ' courses · ' + c.enrollments + ' enrolments · ' + c.avgCompletion + '% average completion',
        Charts.bar({
          categories: courseSeries.map(function (x) { return x.label; }),
          series: [
            { name: 'Enrolled', data: courseSeries.map(function (x) { return x.enrolled; }), color: '#6d28d9' },
            { name: 'Completion %', data: courseSeries.map(function (x) { return x.completion; }), color: '#06b6d4' }
          ],
          height: 260
        }) +
        '<p class="help">Enrolment counts are shown alongside the average completion percentage for each course.</p>');

      /* Project progress -------------------------------------------------- */
      var projectCard = chartSection('Project progress', 'kanban',
        projects.total + ' projects · ' + projects.avgProgress + '% average progress',
        '<div class="scroll-y-sm"><table class="stat-table"><thead><tr><th>Project</th><th>Status</th><th style="min-width:150px">Progress</th></tr></thead><tbody>' +
          U.sortBy(projects.tasks ? Store.all('projects') : [], 'progress', 'desc').map(function (p) {
            return '<tr><td><a href="#/projects/' + p.id + '">' + U.esc(U.truncate(p.name, 40)) + '</a></td>' +
              '<td>' + UI.statusBadge(p.status) + '</td>' +
              '<td>' + UI.progressBar(p.progress || 0, { size: 'sm' }) + '<span class="xs muted">' + (p.progress || 0) + '%</span></td></tr>';
          }).join('') + '</tbody></table></div>' +
        Charts.donut({ data: projects.byStatus.filter(function (s) { return s.value; }), size: 190, centerLabel: 'Projects', aria: 'Projects by status' }));

      /* Activity participation -------------------------------------------- */
      var actSeries = U.sortBy(Object.keys(acts.byType).map(function (k) {
        var list = acts.byType[k];
        return { label: k, value: U.sum(list, function (x) { return (x.participants || []).length; }) };
      }), 'value', 'desc');

      var activityCard = chartSection('Activity participation', 'rocket',
        acts.total + ' activities · ' + acts.participation + ' participant bookings',
        Charts.hbar({ data: actSeries, valueFormat: function (v) { return U.num(v) + ' participants'; } }) +
        '<div class="stat-strip mt-2">' +
          '<div class="strip-item"><span>Completed</span><strong>' + acts.completed + '</strong></div>' +
          '<div class="strip-item"><span>Ongoing</span><strong>' + acts.ongoing + '</strong></div>' +
          '<div class="strip-item"><span>Planned</span><strong>' + acts.planned + '</strong></div>' +
          '<div class="strip-item"><span>Average per activity</span><strong>' + acts.avgParticipants + '</strong></div>' +
        '</div>');

      /* Certificates ------------------------------------------------------ */
      var certSeries = Object.keys(certs.byType).map(function (k) { return { label: k.replace('Certificate of ', ''), value: certs.byType[k].length }; });
      var certCard = chartSection('Certificates issued', 'award',
        certs.total + ' certificates · ' + certs.thisYear + ' this year',
        certSeries.length
          ? Charts.donut({ data: certSeries, size: 200, centerLabel: 'Awards', aria: 'Certificates by type' })
          : UI.emptyState({ icon: 'award', title: 'No certificates issued yet', message: 'Issue certificates from the Certificates module to build this chart.' }));

      /* Finance ----------------------------------------------------------- */
      var financeCard = chartSection('Income against expenses', 'wallet',
        'Club balance ' + U.money(Metrics.finance().balance, currency()),
        Charts.bar({
          categories: fin.map(function (x) { return x.label; }),
          series: [
            { name: 'Income', data: fin.map(function (x) { return x.income; }), color: '#12884f' },
            { name: 'Expenses', data: fin.map(function (x) { return x.expenses; }), color: '#d64545' }
          ],
          height: 250, yFormat: function (v) { return U.shortMoney(v); }
        }));

      /* Engagement -------------------------------------------------------- */
      var engagement = UI.card({
        title: 'Member engagement', icon: 'activity', sub: 'The most active members this term',
        body: (function () {
          var rows = MetricRows();
          return rows.length ? Charts.hbar({ data: rows, valueFormat: function (v) { return U.num(v) + ' sessions'; } })
            : UI.emptyState({ icon: 'user-check', title: 'No attendance data', message: 'Record attendance to rank member engagement.' });
        })(),
        foot: '<a class="link-btn" href="#/attendance">Open the attendance module ' + Icons.svg('arrow-right') + '</a>'
      });

      var summaryCards = [
        { label: 'Attendance rate', value: Metrics.attendance().rate + '%', icon: 'user-check', tone: Metrics.attendance().rate >= 75 ? 'success' : 'warning', foot: Metrics.attendance().total + ' records analysed' },
        { label: 'Course completion', value: c.avgCompletion + '%', icon: 'graduation', tone: c.avgCompletion >= 60 ? 'success' : 'warning', foot: c.completed + ' courses finished' },
        { label: 'Project progress', value: projects.avgProgress + '%', icon: 'kanban', tone: 'primary', foot: projects.active + ' active projects' },
        { label: 'Task completion', value: Metrics.tasks().completionRate + '%', icon: 'check-square', tone: 'accent', foot: Metrics.tasks().overdue + ' overdue' },
        { label: 'Certificates', value: U.num(certs.total), icon: 'award', tone: 'secondary', foot: certs.thisYear + ' issued this year' },
        { label: 'Club balance', value: U.shortMoney(Metrics.finance().balance), icon: 'wallet', tone: Metrics.finance().balance >= 0 ? 'success' : 'danger', foot: 'From ' + Metrics.finance().count + ' transactions' }
      ];

      return '<div class="page">' +
        UI.pageHeader({
          title: 'Analytics', icon: 'bar-chart',
          subtitle: 'Evidence for cabinet decisions: growth, participation, delivery and finances.',
          actions: (Auth.can('analytics', 'export') ? '<button type="button" class="btn btn-outline" data-an="print">' + Icons.svg('print', { class: 'btn-ico' }) + 'Print report</button>' +
            '<button type="button" class="btn btn-primary" data-an="export">' + Icons.svg('download', { class: 'btn-ico' }) + 'Export summary</button>' : '')
        }) +
        '<div class="stat-grid">' + summaryCards.map(function (s) { return UI.statCard(s); }).join('') + '</div>' +
        UI.card({
          title: 'What the numbers say', icon: 'lightbulb', sub: 'Automatic observations from current club data',
          body: '<div class="insight-list">' + insights().map(function (i) {
            return '<div class="insight insight-' + i.tone + '">' + Icons.svg(i.icon) +
              '<div><strong>' + U.esc(i.title) + '</strong><p>' + U.esc(i.text) + '</p></div></div>';
          }).join('') + '</div>'
        }) +
        chartSection('Range of analysis', 'calendar', 'Charts currently cover the last ' + range + ' months',
          UI.segmented([
            { key: '6', label: '6 months', icon: 'calendar' },
            { key: '12', label: '12 months', icon: 'calendar' },
            { key: '24', label: '24 months', icon: 'calendar' }
          ], String(range), { id: 'an-range' })) +
        '<div class="grid cols-2">' + growthCard + attendanceCard + '</div>' +
        '<div class="grid cols-2">' + coursesCard + projectCard + '</div>' +
        '<div class="grid cols-2">' + activityCard + certCard + '</div>' +
        '<div class="grid cols-2">' + financeCard + engagement + '</div>' +
        '</div>';
    },
    mount: function (ctx, root) {
      root.addEventListener('click', function (e) {
        var seg = e.target.closest('#an-range [data-seg]');
        if (seg) { range = Number(seg.getAttribute('data-seg')); Router.refresh(); return; }
        var btn = e.target.closest('[data-an]');
        if (btn) {
          if (btn.getAttribute('data-an') === 'export') exportSummary();
          if (btn.getAttribute('data-an') === 'print') printSummary();
        }
      });
    }
  });

  function MetricRows() {
    return Metrics.memberAttendance()
      .filter(function (r) { return r.records >= 3; })
      .sort(function (a, b) { return b.rate - a.rate || b.attended - a.attended; })
      .slice(0, 8)
      .map(function (r) { return { label: r.name + ' (' + r.klass + ')', value: r.attended }; });
  }

  function summaryRows() {
    var m = Metrics.members(), a = Metrics.attendance(), c = Metrics.courses(), p = Metrics.projects();
    var t = Metrics.tasks(), f = Metrics.finance(), certs = Metrics.certificates();
    return [
      ['Members', 'Total registered', m.total], ['Members', 'Active members', m.active], ['Members', 'Cabinet members', m.cabinet],
      ['Membership growth', 'New members this term', m.newThisTerm], ['Membership growth', 'Active rate %', m.joinRate],
      ['Attendance', 'Records analysed', a.total], ['Attendance', 'Attendance rate %', a.rate], ['Attendance', 'Present', a.present],
      ['Attendance', 'Late', a.late], ['Attendance', 'Absent', a.absent], ['Attendance', 'Excused', a.excused],
      ['Courses', 'Courses offered', c.total], ['Courses', 'Enrolments', c.enrollments], ['Courses', 'Average completion %', c.avgCompletion],
      ['Projects', 'Projects on record', p.total], ['Projects', 'Active projects', p.active], ['Projects', 'Average progress %', p.avgProgress],
      ['Tasks', 'Tasks on record', t.total], ['Tasks', 'Overdue tasks', t.overdue], ['Tasks', 'Completion rate %', t.completionRate],
      ['Certificates', 'Certificates issued', certs.total], ['Certificates', 'Revoked', certs.revoked],
      ['Finance', 'Total income', f.income], ['Finance', 'Total expenses', f.expenses], ['Finance', 'Balance', f.balance]
    ];
  }

  function exportSummary() {
    CRUD.exportRows({
      rows: summaryRows(), module: 'analytics', name: 'mrhs-ict-analytics-summary',
      columns: [
        { label: 'Area', value: function (r) { return r[0]; } },
        { label: 'Measure', value: function (r) { return r[1]; } },
        { label: 'Value', value: function (r) { return r[2]; } }
      ]
    });
  }

  function printSummary() {
    var insightsHtml = insights().map(function (i) { return '<li><strong>' + U.esc(i.title) + '</strong> — ' + U.esc(i.text) + '</li>'; }).join('');
    Print.preview(Print.page(
      '<div class="print-doc-title"><h1>Club Analytics Summary</h1><p>' + U.esc(Store.settings().clubName || '') + ' · ' + U.fmtDate(new Date(), 'long') + '</p></div>' +
      '<h3>Key figures</h3><table><thead><tr><th>Area</th><th>Measure</th><th style="text-align:right">Value</th></tr></thead><tbody>' +
        summaryRows().map(function (r) {
          return '<tr><td>' + U.esc(r[0]) + '</td><td>' + U.esc(r[1]) + '</td><td style="text-align:right">' + (typeof r[2] === 'number' ? U.num(r[2]) : U.esc(r[2])) + '</td></tr>';
        }).join('') + '</tbody></table>' +
      '<h3>Observations</h3><ul>' + insightsHtml + '</ul>' +
      '<div class="print-sign"><div><div class="line"></div>Club Secretary</div><div><div class="line"></div>Club Patron</div></div>',
      { meta: 'Analytics summary' }
    ), { title: 'Analytics summary', icon: 'bar-chart', fileName: 'mrhs-ict-analytics-summary' });
  }

  global.Modules = global.Modules || {};
  global.Modules.Analytics = {
    insights: insights,
    summaryRows: summaryRows,
    printSummary: printSummary,
    exportSummary: exportSummary
  };
})(window);
