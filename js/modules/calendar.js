/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/calendar.js
   One calendar for the whole club: meetings, activities, training sessions,
   project and report deadlines, and certificate events — built from live data.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  /* Calendar categories mapped to the event kinds produced below. */
  var KINDS = {
    'Meeting': { cls: 'c-meeting', icon: 'calendar-check', label: 'Meetings' },
    'Activity': { cls: 'c-activity', icon: 'rocket', label: 'Activities' },
    'Training': { cls: 'c-training', icon: 'graduation', label: 'Training & courses' },
    'Deadline': { cls: 'c-deadline', icon: 'clock', label: 'Project / task deadlines' },
    'Report': { cls: 'c-report', icon: 'file-text', label: 'Report deadlines' },
    'Certificate': { cls: 'c-certificate', icon: 'award', label: 'Certificates & awards' }
  };
  var FILTERS = ['Meeting', 'Activity', 'Training', 'Deadline', 'Report', 'Certificate'];

  function nameOf(id) {
    var m = Store.find('members', id);
    return m ? m.fullName : (id || '—');
  }
  function push(out, kind, date, time, title, sub, link, meta) {
    if (!date) return;
    out.push({ kind: kind, date: date, time: time || '', title: title, sub: sub || '', link: link, meta: meta || [] });
  }

  /** Every dated event in the database, normalised for the calendar. */
  function events() {
    var out = [];
    Store.all('meetings').forEach(function (m) {
      push(out, 'Meeting', m.date, m.time, m.title, m.type + ' · ' + (m.venue || ''),
        '#/meetings/' + m.id, [m.type, m.venue, m.chair ? 'Chaired by ' + nameOf(m.chair) : '', (m.expectedAttendees || []).length + ' invited']);
    });
    Store.all('activities').forEach(function (a) {
      if (a.status === 'Cancelled') return;
      push(out, 'Activity', a.date, a.time, a.title, a.type + ' · ' + (a.venue || ''),
        '#/activities/' + a.id, [a.type, a.venue, (a.participants || []).length + ' participants']);
    });
    Store.all('courses').forEach(function (c) {
      push(out, 'Training', c.startDate, '16:00', 'Starts: ' + c.name, c.level + ' · ' + c.instructor,
        '#/courses/' + c.id, [c.level, c.instructor, 'Duration: ' + c.duration]);
      push(out, 'Training', c.endDate, '16:00', 'Ends: ' + c.name, c.status + ' · ' + c.instructor,
        '#/courses/' + c.id, [c.status, 'Course completion and certificate eligibility']);
    });
    Store.all('lessons').forEach(function (l) {
      var course = Store.find('courses', l.courseId);
      if (!course) return;
      push(out, 'Training', l.date, '16:00', l.title + ' (' + course.name + ')',
        'Lesson ' + l.order + ' · ' + l.duration + ' · ' + l.status, '#/courses/' + course.id,
        [course.name, 'Lesson ' + l.order + ' of ' + (course.sessions || '—'), l.status]);
    });
    Store.all('projects').forEach(function (p) {
      push(out, 'Deadline', p.expectedCompletion, '', 'Project due: ' + p.name,
        (p.progress || 0) + '% complete · ' + p.status, '#/projects/' + p.id,
        ['Expected completion', 'Leader: ' + nameOf(p.leaderId), p.status]);
      if (p.actualCompletion) {
        push(out, 'Deadline', p.actualCompletion, '', 'Project completed: ' + p.name, p.status,
          '#/projects/' + p.id, ['Delivered', 'Leader: ' + nameOf(p.leaderId)]);
      }
    });
    Store.all('projectTasks').forEach(function (t) {
      if (!t.due || t.status === 'Completed') return;
      var p = Store.find('projects', t.projectId);
      push(out, 'Deadline', t.due, '', 'Task due: ' + t.title,
        (p ? p.name + ' · ' : '') + nameOf(t.assignee), '#/projects/' + t.projectId,
        ['Project task', t.status, 'Assigned to ' + nameOf(t.assignee)]);
    });
    Store.all('tasks').forEach(function (t) {
      if (!t.deadline || t.status === 'Completed') return;
      push(out, 'Deadline', t.deadline, '', 'Task due: ' + t.title, nameOf(t.assigneeId),
        '#/tasks', ['Cabinet task', t.status, 'Assigned to ' + nameOf(t.assigneeId)]);
    });
    Store.all('reports').forEach(function (r) {
      push(out, 'Report', r.periodTo, '', 'Report period ends: ' + r.title,
        r.type + ' · ' + r.status, '#/reports/' + r.id,
        [r.type, r.status, 'Prepared by ' + nameOf(r.preparedBy)]);
    });
    Store.all('certificates').forEach(function (c) {
      push(out, 'Certificate', c.issueDate, '', 'Certificate: ' + (c.recipientName || nameOf(c.recipientId)),
        c.type + ' · ' + c.certificateNumber, '#/certificates/' + c.id,
        [c.type, c.certificateNumber, c.status]);
    });
    Store.all('achievements').forEach(function (a) {
      push(out, 'Certificate', a.date, '', 'Achievement: ' + a.title, a.category,
        '#/achievements/' + a.id, [a.category, a.event || '', a.awardedBy || '']);
    });
    return U.sortBy(out, 'date');
  }

  function visibleEvents() {
    return events().filter(function (e) { return state.keys.indexOf(e.kind) !== -1; });
  }

  /* ── Month grid ───────────────────────────────────────────────────────── */
  function monthGrid(date, list) {
    var first = new Date(date.getFullYear(), date.getMonth(), 1);
    var start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // weeks start on Monday
    var cells = [];
    var todayKey = U.todayISO();
    for (var i = 0; i < 42; i++) {
      var d = U.addDays(start, i);
      cells.push({ iso: U.iso(d), day: d.getDate(), out: d.getMonth() !== date.getMonth(), events: [] });
    }
    list.forEach(function (e) {
      var cell = U.findBy(cells, function (c) { return c.iso === e.date; });
      if (cell) cell.events.push(e);
    });
    var html = '<div class="cal-dow">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>';
    html += '<div class="cal-grid">' + cells.map(function (c) {
      var shown = c.events.slice(0, 3);
      return '<button type="button" class="cal-cell' + (c.out ? ' out' : '') + (c.iso === todayKey ? ' today' : '') +
        (c.iso === state.selected ? ' selected' : '') + '" data-day="' + c.iso + '" aria-label="' + U.attr(U.fmtDate(c.iso, 'long')) + '">' +
        '<span class="cal-day">' + c.day + '</span>' +
        '<span class="cal-events">' + shown.map(function (e) {
          return '<span class="cal-event ' + KINDS[e.kind].cls + '">' + U.esc(U.truncate(e.title, 26)) + '</span>';
        }).join('') +
        (c.events.length > 3 ? '<span class="cal-more">+' + (c.events.length - 3) + ' more</span>' : '') +
        '</span></button>';
    }).join('') + '</div>';
    return html;
  }

  function dayPanel(iso, list) {
    var dayEvents = list.filter(function (e) { return e.date === iso; });
    return UI.card({
      title: U.fmtDate(iso, 'long'), icon: 'calendar',
      sub: U.timeAgo(iso) + ' · ' + dayEvents.length + ' scheduled item' + (dayEvents.length === 1 ? '' : 's'),
      body: dayEvents.length ? '<div class="list-rows">' + dayEvents.map(function (e) {
        return '<a class="list-row" href="' + U.attr(e.link) + '">' +
          '<span class="tl-dot">' + Icons.svg(KINDS[e.kind].icon) + '</span>' +
          '<span class="list-row-main"><strong>' + U.esc(e.title) + '</strong><span>' + U.esc(e.sub) + (e.time ? ' · ' + U.fmtTime(e.time) : '') + '</span></span>' +
          '<span class="list-row-side">' + UI.badge(e.kind, 'neutral') + '</span></a>';
      }).join('') + '</div>' : UI.emptyState({ icon: 'calendar', title: 'Nothing scheduled', message: 'There are no club events recorded for this day.' })
    });
  }

  function monthSummary(date, list) {
    var key = U.monthKey(date);
    var inMonth = list.filter(function (e) { return U.monthKey(e.date) === key; });
    var byKind = U.groupBy(inMonth, 'kind');
    return '<div class="stat-strip mt-2">' +
      '<div class="strip-item"><span>Events this month</span><strong>' + inMonth.length + '</strong></div>' +
      FILTERS.filter(function (k) { return state.keys.indexOf(k) !== -1; }).map(function (k) {
        return '<div class="strip-item"><span>' + KINDS[k].label + '</span><strong>' + (byKind[k] || []).length + '</strong></div>';
      }).join('') +
    '</div>';
  }

  function agendaHTML(list) {
    var from = U.todayISO();
    var upcoming = list.filter(function (e) { return e.date >= from; });
    var groups = U.groupBy(upcoming, function (e) { return U.monthKey(e.date); });
    var keys = Object.keys(groups).sort();
    if (!keys.length) {
      return UI.emptyState({
        icon: 'calendar', title: 'No upcoming events',
        message: 'Meetings, activities, training and deadlines will appear here as soon as they are added.'
      });
    }
    return keys.map(function (k) {
      return UI.card({
        title: U.monthLabel(k), icon: 'calendar', sub: groups[k].length + ' item' + (groups[k].length === 1 ? '' : 's'),
        body: '<div class="list-rows">' + groups[k].map(function (e) {
          return '<a class="list-row" href="' + U.attr(e.link) + '">' +
            '<span class="tl-dot">' + Icons.svg(KINDS[e.kind].icon) + '</span>' +
            '<span class="list-row-main"><strong>' + U.esc(e.title) + '</strong><span>' + U.esc(e.sub) + (e.time ? ' · ' + U.fmtTime(e.time) : '') + '</span></span>' +
            '<span class="list-row-side"><strong>' + U.fmtDate(e.date, 'day') + '</strong>' +
              (U.daysFromNow(e.date) <= 7 ? '<br><span class="badge badge-warning badge-soft">' + U.dueLabel(e.date) + '</span>' : '') +
            '</span></a>';
        }).join('') + '</div>'
      });
    }).join('');
  }

  /* ── Page state ───────────────────────────────────────────────────────── */
  var state = { month: new Date(), selected: U.todayISO(), mode: 'month', keys: FILTERS.slice(), day: '' };

  Router.view('/calendar', {
    title: 'Calendar', icon: 'calendar', module: 'calendar',
    subtitle: 'Everything the club has planned, in one place.',
    render: function () {
      if (!Auth.can('calendar', 'view')) return UI.restricted('calendar');
      var list = visibleEvents();

      var legend = '<div class="cal-legend">' + FILTERS.map(function (k) {
        var on = state.keys.indexOf(k) !== -1;
        return '<label class="check chip-check"><input type="checkbox" data-cal-filter="' + k + '"' + (on ? ' checked' : '') + '>' +
          '<span>' + Icons.svg(KINDS[k].icon) + U.esc(KINDS[k].label) + '</span></label>';
      }).join('') + '</div>';

      var toolbar = '<div class="flex between center wrap gap-2">' +
          '<div class="flex center gap-1">' +
            '<button type="button" class="btn btn-outline btn-sm btn-icon-only" data-cal-nav="-1" title="Previous month" aria-label="Previous month">' + Icons.svg('chevron-left') + '</button>' +
            '<strong style="min-width:172px;text-align:center">' + U.monthLabel(U.monthKey(state.month)) + '</strong>' +
            '<button type="button" class="btn btn-outline btn-sm btn-icon-only" data-cal-nav="1" title="Next month" aria-label="Next month">' + Icons.svg('chevron-right') + '</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-cal-today>Today</button>' +
          '</div>' +
          '<div class="flex center gap-1">' +
            UI.segmented([
              { key: 'month', label: 'Month', icon: 'calendar' },
              { key: 'agenda', label: 'Agenda', icon: 'list' }
            ], state.mode) +
            (Auth.can('meetings', 'create') ? '<button type="button" class="btn btn-primary btn-sm" data-cal-add="meeting">' + Icons.svg('plus', { class: 'btn-ico' }) + 'New meeting</button>' : '') +
            (Auth.can('activities', 'create') ? '<button type="button" class="btn btn-outline btn-sm" data-cal-add="activity">' + Icons.svg('plus', { class: 'btn-ico' }) + 'New activity</button>' : '') +
          '</div>' +
        '</div>';

      var body;
      if (state.mode === 'agenda') {
        body = UI.card({ title: 'Club agenda', icon: 'list', sub: 'From today onwards', body: agendaHTML(list) });
      } else {
        body = '<div class="grid cols-2" style="grid-template-columns:minmax(0,2.1fr) minmax(0,1fr)">' +
          UI.card({
            head: toolbar,
            body: '<div class="mb-2">' + legend + '</div>' +
              '<div class="calendar">' + monthGrid(state.month, list) + '</div>' +
              monthSummary(state.month, list),
            foot: '<span class="muted small">' + Icons.svg('info') + ' Click any day to see everything scheduled. Use the filters to narrow the view.</span>'
          }) +
          '<div style="display:grid;gap:18px;align-content:start">' + dayPanel(state.selected, list) +
            UI.card({
              title: 'Up next', icon: 'clock',
              body: (function () {
                var next = list.filter(function (e) { return e.date >= U.todayISO(); }).slice(0, 6);
                if (!next.length) return '<p class="muted small">Nothing scheduled ahead.</p>';
                return '<div class="list-rows">' + next.map(function (e) {
                  return '<a class="list-row" href="' + U.attr(e.link) + '">' +
                    '<span class="tl-dot">' + Icons.svg(KINDS[e.kind].icon) + '</span>' +
                    '<span class="list-row-main"><strong>' + U.esc(U.truncate(e.title, 42)) + '</strong><span>' + U.esc(U.dueLabel(e.date)) + '</span></span></a>';
                }).join('') + '</div>';
              })()
            }) +
          '</div>' +
        '</div>';
      }

      return '<div class="page">' + UI.pageHeader({
        title: 'Calendar', icon: 'calendar',
        subtitle: 'Meetings, activities, training sessions, deadlines and awards in one view.',
        crumbs: null,
        actions: Auth.can('meetings', 'create') ? '<button type="button" class="btn btn-primary" data-cal-add="meeting">' + Icons.svg('calendar-plus', { class: 'btn-ico' }) + 'Schedule meeting</button>' : ''
      }) + body + '</div>';
    },
    mount: function (ctx, root) {
      root.addEventListener('click', function (e) {
        var nav = e.target.closest('[data-cal-nav]');
        if (nav) {
          state.month = new Date(state.month.getFullYear(), state.month.getMonth() + Number(nav.getAttribute('data-cal-nav')), 1);
          Router.refresh();
          return;
        }
        if (e.target.closest('[data-cal-today]')) { state.month = new Date(); state.selected = U.todayISO(); Router.refresh(); return; }
        var seg = e.target.closest('[data-seg]');
        if (seg) { state.mode = seg.getAttribute('data-seg'); Router.refresh(); return; }
        var add = e.target.closest('[data-cal-add]');
        if (add) {
          if (add.getAttribute('data-cal-add') === 'meeting' && global.Modules.Meetings) Modules.Meetings.openForm({ date: state.selected });
          if (add.getAttribute('data-cal-add') === 'activity' && global.Modules.Activities) Modules.Activities.openForm({ date: state.selected });
          return;
        }
        var day = e.target.closest('[data-day]');
        if (day) {
          state.selected = day.getAttribute('data-day');
          var sel = U.toDate(state.selected);
          if (sel.getMonth() !== state.month.getMonth() || sel.getFullYear() !== state.month.getFullYear()) state.month = sel;
          Router.refresh();
        }
      });
      root.addEventListener('change', function (e) {
        var filter = e.target.closest('[data-cal-filter]');
        if (!filter) return;
        var k = filter.getAttribute('data-cal-filter');
        if (filter.checked) { if (state.keys.indexOf(k) === -1) state.keys.push(k); }
        else state.keys = state.keys.filter(function (x) { return x !== k; });
        if (!state.keys.length) state.keys = FILTERS.slice();
        Router.refresh();
      });
    }
  });

  global.Modules = global.Modules || {};
  global.Modules.Calendar = {
    events: events,
    KINDS: KINDS
  };
})(window);
