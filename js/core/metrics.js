/* ==========================================================================
   MRHS ICT CLUB MASTER — js/core/metrics.js
   Computed club statistics shared by the dashboard, analytics, reports and
   any module that needs a trustworthy number. Nothing here is hard-coded.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  var ATTENDED = ['Present', 'Late'];

  function members() {
    var all = Store.all('members');
    var by = U.groupBy(all, 'membershipStatus');
    var active = (by['Active'] || []).length;
    var past = all.filter(function (m) { return m.membershipStatus !== 'Alumni'; }).length;
    return {
      total: all.length,
      active: active,
      inactive: (by['Inactive'] || []).length,
      suspended: (by['Suspended'] || []).length,
      alumni: (by['Alumni'] || []).length,
      cabinet: Store.count('cabinet'),
      newThisTerm: all.filter(function (m) { return U.daysFromNow(m.dateJoined) > -120; }).length,
      joinRate: U.percent(active, past)
    };
  }

  function membershipGrowth(months) {
    var n = months || 9;
    var all = Store.all('members');
    var buckets = U.monthsBack(n).map(function (d) {
      return { key: U.monthKey(d), label: U.monthLabel(U.monthKey(d)), date: d };
    });
    var running = all.filter(function (m) { return U.toDate(m.dateJoined) < buckets[0].date; }).length;
    return buckets.map(function (b) {
      var added = all.filter(function (m) { return U.monthKey(m.dateJoined) === b.key; }).length;
      running += added;
      return { key: b.key, label: b.label, added: added, total: running };
    });
  }

  function attendance() {
    var rows = Store.all('attendance');
    var present = rows.filter(function (r) { return r.status === 'Present'; }).length;
    var late = rows.filter(function (r) { return r.status === 'Late'; }).length;
    var absent = rows.filter(function (r) { return r.status === 'Absent'; }).length;
    var excused = rows.filter(function (r) { return r.status === 'Excused'; }).length;
    var attended = present + late;
    return {
      total: rows.length, present: present, late: late, absent: absent, excused: excused,
      attended: attended,
      rate: rows.length ? U.percent(attended, rows.length) : 0,
      strictRate: rows.length ? U.percent(present, rows.length) : 0,
      byContext: U.groupBy(rows, 'contextType'),
      byStatus: [
        { label: 'Present', value: present, color: '#12884f' },
        { label: 'Late', value: late, color: '#b7791f' },
        { label: 'Excused', value: excused, color: '#1e6fd9' },
        { label: 'Absent', value: absent, color: '#d64545' }
      ]
    };
  }

  function attendanceByMonth(months) {
    var n = months || 6;
    var rows = Store.all('attendance');
    return U.monthsBack(n).map(function (d) {
      var key = U.monthKey(d);
      var inMonth = rows.filter(function (r) { return U.monthKey(r.date) === key; });
      var attended = inMonth.filter(function (r) { return ATTENDED.indexOf(r.status) !== -1; }).length;
      return {
        key: key, label: U.monthLabel(key), count: inMonth.length,
        rate: inMonth.length ? U.percent(attended, inMonth.length) : 0
      };
    });
  }

  /** Attendance rate per member, used for rankings and low-attendance alerts. */
  function memberAttendance() {
    var rows = U.groupBy(Store.all('attendance'), 'memberId');
    return Object.keys(rows).map(function (mid) {
      var list = rows[mid];
      var attended = list.filter(function (r) { return ATTENDED.indexOf(r.status) !== -1; }).length;
      var m = Store.find('members', mid);
      return {
        memberId: mid, name: m ? m.fullName : mid, klass: m ? m.klass : '',
        status: m ? m.membershipStatus : '',
        records: list.length, attended: attended,
        rate: list.length ? U.percent(attended, list.length) : 0
      };
    });
  }

  function lowAttendance(threshold, minRecords) {
    var t = threshold === undefined ? (Store.settings().lowAttendanceThreshold || 60) : threshold;
    return memberAttendance().filter(function (r) {
      return r.records >= (minRecords || 6) && r.rate < t && r.status === 'Active';
    }).sort(function (a, b) { return a.rate - b.rate; });
  }

  function courses() {
    var all = Store.all('courses');
    var by = U.groupBy(all, 'status');
    var enrollments = Store.all('enrollments');
    return {
      total: all.length,
      ongoing: (by['Ongoing'] || []).length,
      completed: (by['Completed'] || []).length,
      planned: (by['Planned'] || []).length,
      enrollments: enrollments.length,
      completedEnrollments: enrollments.filter(function (e) { return e.progress >= 100; }).length,
      avgCompletion: all.length ? Math.round(U.avg(all.map(function (c) { return c.completionRate || 0; }))) : 0,
      avgProgress: enrollments.length ? Math.round(U.avg(enrollments.map(function (e) { return e.progress; }))) : 0,
      byCategory: U.groupBy(all, 'category')
    };
  }

  function enrolmentByCourse() {
    var rows = Store.all('enrollments');
    return U.groupBy(rows, 'courseId');
  }

  function projects() {
    var all = Store.all('projects');
    var by = U.groupBy(all, 'status');
    return {
      total: all.length,
      planning: (by['Planning'] || []).length,
      development: (by['Development'] || []).length,
      testing: (by['Testing'] || []).length,
      completed: (by['Completed'] || []).length,
      archived: (by['Archived'] || []).length,
      active: (by['Development'] || []).length + (by['Testing'] || []).length + (by['Planning'] || []).length,
      avgProgress: all.length ? Math.round(U.avg(all.map(function (p) { return p.progress || 0; }))) : 0,
      byStatus: [
        { label: 'Planning', value: (by['Planning'] || []).length, color: '#3d5a80' },
        { label: 'Development', value: (by['Development'] || []).length, color: '#24518f' },
        { label: 'Testing', value: (by['Testing'] || []).length, color: '#8a6412' },
        { label: 'Completed', value: (by['Completed'] || []).length, color: '#2c6b45' },
        { label: 'Archived', value: (by['Archived'] || []).length, color: '#66748a' }
      ],
      tasks: Store.all('projectTasks')
    };
  }

  function activities() {
    var all = Store.all('activities');
    var by = U.groupBy(all, 'status');
    var participants = 0;
    all.forEach(function (a) { participants += (a.participants || []).length; });
    return {
      total: all.length,
      planned: (by['Planned'] || []).length,
      ongoing: (by['Ongoing'] || []).length,
      completed: (by['Completed'] || []).length,
      cancelled: (by['Cancelled'] || []).length,
      participation: participants,
      avgParticipants: all.length ? Math.round(participants / all.length) : 0,
      byType: U.groupBy(all, 'type')
    };
  }

  function meetings() {
    var all = Store.all('meetings');
    var today = U.todayISO();
    var by = U.groupBy(all, 'type');
    return {
      total: all.length,
      held: all.filter(function (m) { return m.status === 'Completed'; }).length,
      upcoming: all.filter(function (m) { return m.status === 'Scheduled' && m.date >= today; }).length,
      next: U.sortBy(all.filter(function (m) { return m.status === 'Scheduled' && m.date >= today; }), 'date')[0] || null,
      byType: by
    };
  }

  function reports() {
    var all = Store.all('reports');
    var by = U.groupBy(all, 'type');
    return {
      total: all.length,
      approved: Store.count('reports', function (r) { return r.status === 'Approved'; }),
      submitted: Store.count('reports', function (r) { return r.status === 'Submitted'; }),
      types: Object.keys(by).length,
      byType: by,
      latest: U.sortBy(all, 'date', 'desc')[0] || null
    };
  }

  function certificates() {
    var all = Store.all('certificates');
    var thisYear = new Date().getFullYear();
    return {
      total: all.length,
      issued: all.filter(function (c) { return c.status === 'Issued'; }).length,
      draft: all.filter(function (c) { return c.status === 'Draft'; }).length,
      revoked: all.filter(function (c) { return c.status === 'Revoked'; }).length,
      byType: U.groupBy(all, 'type'),
      thisYear: all.filter(function (c) { return U.toDate(c.issueDate).getFullYear() === thisYear; }).length,
      thisTerm: all.filter(function (c) { return U.daysFromNow(c.issueDate) > -120; }).length
    };
  }

  function finance() {
    var rows = Store.all('transactions');
    var income = U.sum(rows.filter(function (r) { return r.type === 'Income'; }), function (r) { return r.amount; });
    var expenses = U.sum(rows.filter(function (r) { return r.type === 'Expense'; }), function (r) { return r.amount; });
    return {
      income: income, expenses: expenses, balance: income - expenses,
      count: rows.length,
      byIncomeCategory: U.groupBy(rows.filter(function (r) { return r.type === 'Income'; }), 'category'),
      byExpenseCategory: U.groupBy(rows.filter(function (r) { return r.type === 'Expense'; }), 'category'),
      incomeByCategory: Object.keys(U.groupBy(rows.filter(function (r) { return r.type === 'Income'; }), 'category')).map(function (k) {
        return { label: k, value: U.sum(U.groupBy(rows.filter(function (r) { return r.type === 'Income'; }), 'category')[k], function (r) { return r.amount; }) };
      }),
      expenseByCategory: Object.keys(U.groupBy(rows.filter(function (r) { return r.type === 'Expense'; }), 'category')).map(function (k) {
        return { label: k, value: U.sum(U.groupBy(rows.filter(function (r) { return r.type === 'Expense'; }), 'category')[k], function (r) { return r.amount; }) };
      })
    };
  }

  function financeByMonth(months) {
    var n = months || 6;
    var rows = Store.all('transactions');
    return U.monthsBack(n).map(function (d) {
      var key = U.monthKey(d);
      var inMonth = rows.filter(function (r) { return U.monthKey(r.date) === key; });
      return {
        label: U.monthLabel(key),
        income: U.sum(inMonth.filter(function (r) { return r.type === 'Income'; }), function (r) { return r.amount; }),
        expenses: U.sum(inMonth.filter(function (r) { return r.type === 'Expense'; }), function (r) { return r.amount; })
      };
    });
  }

  function tasks() {
    var all = Store.all('tasks');
    var by = U.groupBy(all, 'status');
    var today = U.todayISO();
    var open = all.filter(function (t) { return t.status !== 'Completed'; });
    var done = (by['Completed'] || []).length;
    return {
      total: all.length,
      pending: (by['Pending'] || []).length,
      inProgress: (by['In Progress'] || []).length,
      completed: done,
      open: open.length,
      overdue: open.filter(function (t) { return t.status === 'Overdue' || (t.deadline && t.deadline < today); }).length,
      dueThisWeek: open.filter(function (t) { return t.deadline && U.daysFromNow(t.deadline) >= 0 && U.daysFromNow(t.deadline) <= 7; }).length,
      byStatus: by,
      completion: all.length ? U.percent(done, all.length) : 0,
      completionRate: all.length ? U.percent(done, all.length) : 0
    };
  }

  function equipment() {
    var all = Store.all('equipment');
    var by = U.groupBy(all, 'category');
    return {
      total: all.length,
      items: U.sum(all, function (e) { return Number(e.quantity) || 0; }),
      damaged: Store.count('equipment', function (e) { return e.condition === 'Damaged' || e.status === 'Under Repair'; }),
      value: U.sum(all, function (e) { return (Number(e.quantity) || 0) * (Number(e.unitCost) || 0); }),
      byCategory: by,
      byCategorySeries: Object.keys(by).map(function (k) { return { label: k, value: by[k].length }; }),
      byCondition: Object.keys(U.groupBy(all, 'condition')).map(function (k) {
        return { label: k, value: U.groupBy(all, 'condition')[k].length };
      })
    };
  }

  function achievements() {
    var all = Store.all('achievements');
    return {
      total: all.length,
      thisYear: all.filter(function (a) { return U.toDate(a.date).getFullYear() === new Date().getFullYear(); }).length,
      byCategory: U.groupBy(all, 'category'),
      categorySeries: Object.keys(U.groupBy(all, 'category')).map(function (k) {
        return { label: k, value: U.groupBy(all, 'category')[k].length };
      })
    };
  }

  function resources() {
    var all = Store.all('resources');
    var by = U.groupBy(all, 'category');
    return {
      total: all.length,
      byCategory: by,
      categories: Object.keys(by).length,
      recent: all.filter(function (r) { return U.daysFromNow(r.date) > -90; }).length,
      views: U.sum(all, function (r) { return r.views || 0; })
    };
  }

  function gallery() {
    return { albums: Store.count('albums'), photos: Store.count('gallery') };
  }

  /** Everything that is coming up, merged and sorted — used by the dashboard. */
  function upcoming(limit) {
    var today = U.todayISO();
    var out = [];
    Store.all('meetings').filter(function (m) { return m.date >= today; }).forEach(function (m) {
      out.push({ kind: 'Meeting', type: m.type, icon: 'calendar-check', tone: 'info', title: m.title, date: m.date, time: m.time, venue: m.venue, link: '#/meetings/' + m.id, id: m.id });
    });
    Store.all('activities').filter(function (a) { return a.date >= today && a.status !== 'Cancelled'; }).forEach(function (a) {
      out.push({ kind: 'Activity', type: a.type, icon: 'rocket', tone: 'secondary', title: a.title, date: a.date, time: a.time, venue: a.venue, link: '#/activities/' + a.id, id: a.id });
    });
    Store.all('projects').filter(function (p) { return p.status !== 'Completed' && p.status !== 'Archived' && p.expectedCompletion >= today; }).forEach(function (p) {
      out.push({ kind: 'Project deadline', type: p.status, icon: 'kanban', tone: 'warning', title: p.name + ' — expected completion', date: p.expectedCompletion, link: '#/projects/' + p.id, id: p.id });
    });
    Store.all('tasks').filter(function (t) { return t.status !== 'Completed' && t.deadline >= today; }).forEach(function (t) {
      out.push({ kind: 'Task deadline', type: t.priority, icon: 'check-square', tone: 'neutral', title: t.title, date: t.deadline, link: '#/tasks', id: t.id });
    });
    Store.all('courses').filter(function (c) { return c.endDate >= today && c.status !== 'Completed'; }).forEach(function (c) {
      out.push({ kind: 'Course ends', type: c.level, icon: 'graduation', tone: 'accent', title: c.name, date: c.endDate, link: '#/courses/' + c.id, id: c.id });
    });
    return U.sortBy(out, 'date').slice(0, limit || 8);
  }

  /** Merged activity feed used by dashboards and record detail pages. */
  function recentActivity(limit) {
    var out = [];
    Store.all('attendance').slice(-40).forEach(function (a) {
      var ctx = a.contextType === 'meeting' ? Store.find('meetings', a.contextId)
        : a.contextType === 'course' ? Store.find('courses', a.contextId)
          : Store.find('activities', a.contextId);
      out.push({
        icon: 'user-check', tone: 'info',
        title: 'Attendance recorded',
        text: (ctx ? (ctx.title || ctx.name) : 'Club session') + ' · ' + U.esc(Store.find('members', a.memberId) ? Store.find('members', a.memberId).fullName : '') + ' marked ' + a.status,
        at: a.date + 'T12:00:00', link: null
      });
    });
    Store.all('certificates').forEach(function (c) {
      out.push({ icon: 'award', tone: 'success', title: 'Certificate issued', text: c.certificateNumber + ' to ' + c.recipientName, at: c.issueDate + 'T12:00:00', link: '#/certificates/' + c.id });
    });
    Store.all('reports').forEach(function (r) {
      out.push({ icon: 'file-text', tone: 'warning', title: 'Report ' + (r.status || '').toLowerCase(), text: r.title, at: r.date + 'T12:00:00', link: '#/reports/' + r.id });
    });
    Store.all('projects').forEach(function (p) {
      out.push({ icon: 'kanban', tone: 'primary', title: 'Project update', text: p.name + ' is ' + (p.progress || 0) + '% complete (' + p.status + ')', at: (p.updatedAt || p.startDate), link: '#/projects/' + p.id });
    });
    Store.all('achievements').forEach(function (a) {
      out.push({ icon: 'trophy', tone: 'success', title: 'Achievement recorded', text: a.title, at: a.date + 'T12:00:00', link: '#/achievements/' + a.id });
    });
    return U.sortBy(out, function (r) { return r.at || ''; }, 'desc')
      .filter(function (r, i, arr) { return arr.findIndex(function (x) { return x.text === r.text; }) === i; })
      .slice(0, limit || 8);
  }

  function courseLeaderboard(limit) {
    var rows = Store.all('enrollments');
    var byCourse = U.groupBy(rows, 'courseId');
    return Object.keys(byCourse).map(function (cid) {
      var c = Store.find('courses', cid);
      var list = byCourse[cid];
      return {
        label: c ? c.name : cid,
        value: list.length,
        completion: Math.round(U.avg(list.map(function (e) { return e.progress; })) || 0)
      };
    }).sort(function (a, b) { return b.value - a.value; }).slice(0, limit || 8);
  }

  function summary() {
    return {
      members: members(), attendance: attendance(), courses: courses(), projects: projects(),
      activities: activities(), meetings: meetings(), reports: reports(), certificates: certificates(),
      finance: finance(), tasks: tasks(), equipment: equipment(), achievements: achievements(),
      resources: resources(), gallery: gallery()
    };
  }

  global.Metrics = {
    members: members, membershipGrowth: membershipGrowth,
    attendance: attendance, attendanceByMonth: attendanceByMonth, memberAttendance: memberAttendance, lowAttendance: lowAttendance,
    courses: courses, enrolmentByCourse: enrolmentByCourse,
    projects: projects, activities: activities, meetings: meetings, reports: reports,
    certificates: certificates, finance: finance, financeByMonth: financeByMonth,
    tasks: tasks, equipment: equipment, achievements: achievements, resources: resources, gallery: gallery,
    upcoming: upcoming, recentActivity: recentActivity, courseLeaderboard: courseLeaderboard, summary: summary,
    ATTENDED: ATTENDED
  };
})(window);
