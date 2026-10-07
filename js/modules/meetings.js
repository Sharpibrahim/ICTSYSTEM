/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/meetings.js
   Meeting management: scheduling, agenda, attendance, minutes, decisions,
   action items, follow-up dates and printable minutes.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  function nameOf(id) {
    var m = Store.find('members', id);
    return m ? m.fullName : (id || '—');
  }
  function attendanceFor(id) { return CRUD.attendanceFor('meeting', id); }
  function attendanceSummary(id, expected) {
    var rows = attendanceFor(id);
    var present = rows.filter(function (r) { return r.status === 'Present'; }).length;
    var late = rows.filter(function (r) { return r.status === 'Late'; }).length;
    var excused = rows.filter(function (r) { return r.status === 'Excused'; }).length;
    var absent = rows.filter(function (r) { return r.status === 'Absent'; }).length;
    return {
      rows: rows, present: present, late: late, excused: excused, absent: absent,
      total: rows.length,
      rate: rows.length ? U.percent(present + late, rows.length) : 0,
      expected: expected || rows.length
    };
  }
  function openActionItems(m) {
    return (m.actionItems || []).filter(function (a) { return a.status !== 'Completed'; }).length;
  }

  /* ══ List ═════════════════════════════════════════════════════════════ */
  var config = {
    key: 'meetings',
    title: 'Meetings',
    singular: 'meeting',
    icon: 'calendar-check',
    module: 'meetings',
    collection: 'meetings',
    subtitle: 'Schedule meetings, keep the minutes, track decisions and follow up on action items.',
    stats: function () {
      var m = Metrics.meetings();
      var attendance = Metrics.attendance();
      var byType = m.byType;
      return [
        { label: 'Total meetings', value: U.num(m.total), icon: 'calendar-check', tone: 'primary', foot: m.held + ' already held' },
        { label: 'Upcoming', value: U.num(m.upcoming), icon: 'calendar-plus', tone: 'accent', foot: m.next ? 'Next: ' + U.fmtDate(m.next.date) : 'Nothing scheduled' },
        { label: 'Meeting types', value: U.num(Object.keys(byType).length), icon: 'layers', tone: 'secondary', foot: 'General, cabinet, training, project…' },
        { label: 'Meeting attendance', value: attendance.rate + '%', icon: 'user-check', tone: attendance.rate >= 75 ? 'success' : 'warning', foot: 'Across all recorded meetings' }
      ];
    },
    schema: function (values) {
      return [
        { name: 'title', label: 'Meeting title', type: 'text', required: true, colSpan: 2, placeholder: 'e.g. Term 3 General Meeting' },
        { name: 'type', label: 'Meeting type', type: 'select', required: true, options: Data.MEETING_TYPES, value: 'General Meeting' },
        { name: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'Completed', 'Cancelled'], value: values.status || 'Scheduled' },
        { name: 'date', label: 'Date', type: 'date', required: true, value: values.date || U.todayISO() },
        { name: 'time', label: 'Start time', type: 'time', required: true, value: values.time || '16:00' },
        { name: 'venue', label: 'Venue', type: 'text', required: true, value: values.venue || Store.settings().meetingDefaultVenue || 'ICT Laboratory 1' },
        { name: 'chairperson', label: 'Chairperson', type: 'member', required: true, value: values.chairperson },
        { name: 'secretary', label: 'Secretary / minute taker', type: 'member', required: true, value: values.secretary },
        { name: 'followUpDate', label: 'Follow-up date', type: 'date', value: values.followUpDate || U.iso(U.addDays(values.date || new Date(), 30)) },
        { name: 'expected', label: 'Expected attendees', type: 'select', options: [{ value: 'active', label: 'All active members' }, { value: 'cabinet', label: 'Cabinet members only' }], value: 'active' },
        { name: 'agendaText', label: 'Agenda', type: 'textarea', colSpan: 2, rows: 6, required: true,
          value: (values.agenda || []).map(function (a) { return a.text; }).join('\n'),
          help: 'One agenda item per line. The secretary and chairperson are added automatically as presenters.' },
        { name: 'decisionsText', label: 'Decisions taken', type: 'textarea', colSpan: 2, rows: 4,
          value: (values.decisions || []).join('\n'), help: 'One decision per line. Leave blank for meetings that have not taken place yet.' },
        { name: 'minutes', label: 'Minutes summary', type: 'textarea', colSpan: 2, rows: 5, placeholder: 'Key discussion points and resolutions…' },
        { name: 'actionText', label: 'Action items', type: 'textarea', colSpan: 2, rows: 4,
          value: (values.actionItems || []).map(function (a) { return a.text + ' | ' + nameOf(a.owner) + ' | ' + a.due; }).join('\n'),
          help: 'One per line using the format: Action description | responsible person | due date (YYYY-MM-DD). Tasks are created automatically from these items.' }
      ];
    },
    beforeSave: function (data) {
      if (data.date && data.followUpDate && data.followUpDate < data.date) {
        return { followUpDate: 'The follow-up date must be on or after the meeting date.' };
      }
      if (data.status === 'Completed' && !String(data.minutes || '').trim()) {
        return { minutes: 'Record a short summary of the minutes before marking the meeting as completed.' };
      }
      return null;
    },
    transform: function (data, values) {
      var active = Store.all('members').filter(function (m) { return m.membershipStatus === 'Active'; });
      var cabinetIds = Store.all('cabinet').map(function (c) { return c.memberId; });
      var expected = data.expected === 'cabinet' ? active.filter(function (m) { return cabinetIds.indexOf(m.id) !== -1; }) : active;
      var agenda = String(data.agendaText || '').split('\n').map(function (t) { return t.trim(); }).filter(Boolean)
        .map(function (t, i) { return { id: 'ag-' + i, text: t, presenter: i % 2 ? data.secretary : data.chairperson }; });
      var decisions = String(data.decisionsText || '').split('\n').map(function (t) { return t.trim(); }).filter(Boolean);
      var actionItems = String(data.actionText || '').split('\n').map(function (line) {
        var bits = line.split('|').map(function (b) { return b.trim(); });
        if (!bits[0]) return null;
        var ownerName = bits[1] || '';
        var owner = U.findBy(Store.all('members'), function (m) { return U.norm(m.fullName) === U.norm(ownerName); });
        return {
          id: U.uid('ai'), text: bits[0], owner: owner ? owner.id : (bits[1] || data.secretary),
          due: /^\d{4}-\d{2}-\d{2}$/.test(bits[2] || '') ? bits[2] : U.iso(U.addDays(data.date, 14)),
          status: values.id ? (findActionStatus(values, bits[0])) : 'Pending'
        };
      }).filter(Boolean);

      return {
        title: data.title, type: data.type, date: data.date, time: data.time, venue: data.venue,
        chairperson: data.chairperson, secretary: data.secretary, status: data.status,
        agenda: agenda, decisions: decisions, minutes: data.minutes, actionItems: actionItems,
        expectedAttendees: expected.map(function (m) { return m.id; }),
        followUpDate: data.followUpDate, demo: values.demo === true
      };
    },
    afterSave: function (rec, data) {
      // Create cabinet tasks from action items so nothing is lost
      // (existing items are matched by title, so this stays idempotent)
      (rec.actionItems || []).forEach(function (ai) {
        if (ai.status === 'Completed') return;
        var exists = U.findBy(Store.all('tasks'), function (t) {
          return t.sourceMeetingId === rec.id && U.norm(t.title) === U.norm(ai.text);
        });
        if (exists) return;
        Store.insert('tasks', {
          demo: rec.demo === true, title: ai.text, assigneeId: ai.owner, createdById: Auth.currentUser() ? Auth.currentUser().id : null,
          priority: 'Medium', deadline: ai.due, status: 'Pending',
          description: 'Action item from the meeting “' + rec.title + '” held on ' + U.fmtDate(rec.date) + '.',
          progress: 0, comments: [], sourceMeetingId: rec.id, createdAt: new Date().toISOString()
        });
      });
    },
    columns: [
      {
        key: 'title', label: 'Meeting',
        render: function (m) {
          return '<a href="#/meetings/' + m.id + '" class="td-strong">' + U.esc(m.title) + '</a>' +
            '<br><span class="td-muted">' + U.esc(m.meetingId) + ' · ' + U.esc(m.venue) + '</span>';
        }
      },
      { key: 'type', label: 'Type', render: function (m) { return UI.badge(m.type, 'secondary', { soft: true }); } },
      { key: 'date', label: 'Date & time', render: function (m) { return U.fmtDate(m.date) + '<br><span class="td-muted">' + U.fmtTime(m.time) + '</span>'; } },
      { key: 'chairperson', label: 'Chairperson', render: function (m) { return U.esc(nameOf(m.chairperson)); } },
      { key: 'secretary', label: 'Secretary', render: function (m) { return U.esc(nameOf(m.secretary)); } },
      {
        key: 'attendance', label: 'Attendance', sortable: false,
        render: function (m) {
          var s = attendanceSummary(m.id, (m.expectedAttendees || []).length);
          if (!s.total) return '<span class="td-muted">Not recorded</span>';
          return '<span class="badge badge-' + (s.rate >= 75 ? 'success' : s.rate >= 60 ? 'warning' : 'danger') + ' badge-soft">' + s.rate + '%</span>' +
            '<br><span class="td-muted">' + (s.present + s.late) + '/' + s.total + ' attended</span>';
        }
      },
      {
        key: 'status', label: 'Status', render: function (m) {
          return UI.statusBadge(m.status) +
            (openActionItems(m) ? '<br><span class="badge badge-warning badge-soft" style="margin-top:4px">' + Icons.svg('check-square') + openActionItems(m) + ' open items</span>' : '');
        }
      }
    ],
    filters: [
      { key: 'type', label: 'All types', options: Data.MEETING_TYPES },
      { key: 'status', label: 'All statuses', options: ['Scheduled', 'Completed', 'Cancelled'] },
      {
        key: 'year', label: 'All years',
        options: U.uniq(Store.all('meetings').map(function (m) { return U.toDate(m.date).getFullYear(); })).sort().reverse(),
        value: function (m) { return U.toDate(m.date).getFullYear(); }
      }
    ],
    searchKeys: function (m) { return [m.title, m.type, m.venue, m.meetingId, nameOf(m.chairperson), nameOf(m.secretary), (m.decisions || []).join(' '), m.minutes]; },
    exportColumns: [
      { value: function (m) { return m.meetingId; }, label: 'Meeting ID' }, { key: 'title', label: 'Title' },
      { key: 'type', label: 'Type' }, { key: 'date', label: 'Date' }, { key: 'time', label: 'Time' },
      { key: 'venue', label: 'Venue' }, { value: function (m) { return nameOf(m.chairperson); }, label: 'Chairperson' },
      { value: function (m) { return nameOf(m.secretary); }, label: 'Secretary' },
      { key: 'status', label: 'Status' }, { value: function (m) { return (m.decisions || []).join(' | '); }, label: 'Decisions' },
      { value: function (m) { return (m.actionItems || []).map(function (a) { return a.text; }).join(' | '); }, label: 'Action items' }
    ],
    rowActions: function (m) {
      var out = CRUD.viewBtn('#/meetings/' + m.id, 'meeting');
      if (Auth.can('meetings', 'edit')) out += CRUD.actionBtn('edit', m.id, 'edit', 'Edit meeting');
      if (Auth.can('attendance', 'create')) out += CRUD.actionBtn('attend', m.id, 'user-check', 'Record attendance');
      out += CRUD.actionBtn('print', m.id, 'print', 'Print minutes');
      if (Auth.can('meetings', 'delete')) out += CRUD.actionBtn('delete', m.id, 'trash', 'Delete meeting', 'danger');
      return out;
    },
    onRowAction: function (action, m, table) {
      if (action === 'print') Print.preview(Print.minutes(m), { title: 'Minutes — ' + m.title, fileName: 'mrhs-ict-minutes-' + m.meetingId });
      if (action === 'attend') Modules.Attendance.openRecorder({ contextType: 'meeting', contextId: m.id });
    },
    empty: { icon: 'calendar-check', title: 'No meetings recorded', message: 'Schedule the first club meeting to start keeping minutes and tracking attendance.' },
    cascade: function (m) {
      Store.removeWhere('attendance', function (a) { return a.contextType === 'meeting' && a.contextId === m.id; });
      Store.removeWhere('tasks', function (t) { return t.sourceMeetingId === m.id; });
    },
    deleteDetails: 'Attendance records and tasks created from this meeting’s action items will also be removed. The action can be undone immediately afterwards.',
    printDoc: function (m) { return { html: Print.minutes(m), title: 'Minutes — ' + m.title }; },

    detailTitle: function (m) { return m.title; },
    detailSubtitle: function (m) { return m.type + ' · ' + U.fmtDate(m.date, 'long') + ' at ' + U.fmtTime(m.time) + ' · ' + m.venue; },
    detailBadges: function (m) {
      return UI.statusBadge(m.status) + UI.badge(m.type, 'secondary', { icon: 'layers' }) +
        UI.badge(m.meetingId, 'neutral', { soft: false }) + (m.demo ? UI.demoChip() : '');
    },
    detailActions: function (m) {
      return (Auth.can('attendance', 'create') ? '<button type="button" class="btn btn-primary btn-sm" data-detail-action="attendance">' + Icons.svg('user-check', { class: 'btn-ico' }) + 'Record attendance</button>' : '') +
        (Auth.can('meetings', 'edit') ? '<button type="button" class="btn btn-outline btn-sm" data-detail-action="minutes">' + Icons.svg('edit', { class: 'btn-ico' }) + 'Record minutes</button>' : '');
    },
    detail: function (m) {
      var s = attendanceSummary(m.id, (m.expectedAttendees || []).length);
      var tasks = Store.where('tasks', function (t) { return t.sourceMeetingId === m.id; });

      var overview = UI.card({
        title: 'Meeting information', icon: 'info',
        body: UI.kvGrid([
          { label: 'Meeting ID', value: m.meetingId },
          { label: 'Type', value: m.type },
          { label: 'Date', value: U.fmtDate(m.date, 'long') },
          { label: 'Time', value: U.fmtTime(m.time) },
          { label: 'Venue', value: m.venue },
          { label: 'Chairperson', html: '<a href="#/members/' + m.chairperson + '">' + U.esc(nameOf(m.chairperson)) + '</a>' },
          { label: 'Secretary', html: '<a href="#/members/' + m.secretary + '">' + U.esc(nameOf(m.secretary)) + '</a>' },
          { label: 'Expected attendees', value: (m.expectedAttendees || []).length + ' members' },
          { label: 'Follow-up date', value: U.fmtDate(m.followUpDate) },
          { label: 'Status', html: UI.statusBadge(m.status) }
        ])
      });

      var agenda = UI.card({
        title: 'Agenda', icon: 'clipboard-list', sub: (m.agenda || []).length + ' items',
        body: (m.agenda || []).length
          ? '<ol style="display:grid;gap:8px;padding-left:20px;list-style:decimal">' + m.agenda.map(function (a, i) {
              return '<li>' + U.esc(a.text) + '<br><span class="xs muted">Presenter: ' + U.esc(nameOf(a.presenter)) + '</span></li>';
            }).join('') + '</ol>'
          : '<p class="muted small">No agenda has been set for this meeting.</p>'
      });

      var minutes = UI.card({
        title: 'Minutes', icon: 'file-text',
        head: Auth.can('meetings', 'edit') ? '<button type="button" class="link-btn xs" data-detail-action="minutes">' + (m.minutes ? 'Edit minutes' : 'Record minutes') + '</button>' : '',
        body: m.minutes
          ? '<div class="minutes-body"><p>' + U.esc(m.minutes) + '</p></div>'
          : '<p class="muted small">Minutes have not been recorded yet.</p>',
        foot: '<button type="button" class="link-btn" data-detail-action="print">' + Icons.svg('print') + ' Print minutes</button>'
      });

      var decisions = UI.card({
        title: 'Decisions', icon: 'check-circle', sub: (m.decisions || []).length + ' recorded',
        body: (m.decisions || []).length
          ? '<div class="timeline">' + m.decisions.map(function (d, i) {
              return '<div class="timeline-item"><span class="tl-dot success">' + Icons.svg('check') + '</span>' +
                '<div class="tl-body"><p style="white-space:pre-line">' + U.esc(d) + '</p></div></div>';
            }).join('') + '</div>'
          : '<p class="muted small">No decisions have been recorded for this meeting.</p>'
      });

      var actionItems = UI.card({
        title: 'Action items', icon: 'check-square', sub: (m.actionItems || []).length + ' items',
        body: (m.actionItems || []).length
          ? '<div class="list-rows">' + m.actionItems.map(function (a) {
              return '<div class="list-row">' +
                '<span class="tl-dot ' + (a.status === 'Completed' ? 'success' : a.status === 'In Progress' ? 'warning' : '') + '">' + Icons.svg('check-square') + '</span>' +
                '<span class="list-row-main"><strong>' + U.esc(a.text) + '</strong>' +
                '<span>' + U.esc(nameOf(a.owner)) + ' · due ' + U.fmtDate(a.due) + '</span></span>' +
                '<span class="list-row-side">' +
                  (Auth.can('meetings', 'edit')
                    ? '<select data-action-item="' + U.attr(a.id) + '" aria-label="Action item status">' +
                      ['Pending', 'In Progress', 'Completed'].map(function (st) {
                        return '<option value="' + st + '"' + (a.status === st ? ' selected' : '') + '>' + st + '</option>';
                      }).join('') + '</select>'
                    : UI.statusBadge(a.status)) +
                '</span></div>';
            }).join('') + '</div>'
          : '<p class="muted small">No action items were recorded.</p>',
        foot: tasks.length ? '<span class="muted small">' + tasks.length + ' linked ' + U.plural(tasks.length, 'task') + ' in the task board</span><a class="link-btn" href="#/tasks">Open tasks</a>' : ''
      });

      var attendance = UI.card({
        title: 'Attendance', icon: 'user-check', sub: s.total + ' records · ' + s.rate + '% attendance rate',
        head: Auth.can('attendance', 'create') ? '<button type="button" class="btn btn-outline btn-sm" data-detail-action="attendance">' + Icons.svg('edit', { class: 'btn-ico' }) + 'Update</button>' : '',
        body: s.total
          ? '<div class="stat-strip mb-2">' +
              '<div class="strip-item"><span>Present</span><strong>' + s.present + '</strong></div>' +
              '<div class="strip-item"><span>Late</span><strong>' + s.late + '</strong></div>' +
              '<div class="strip-item"><span>Excused</span><strong>' + s.excused + '</strong></div>' +
              '<div class="strip-item"><span>Absent</span><strong>' + s.absent + '</strong></div>' +
            '</div>' +
            UI.progressRow('Attendance rate', s.rate) +
            '<div class="scroll-y-sm mt-2"><table class="stat-table"><thead><tr><th>Member</th><th>Status</th><th>Remarks</th></tr></thead><tbody>' +
              s.rows.map(function (r) {
                var mem = Store.find('members', r.memberId);
                return '<tr><td>' + (mem ? '<a href="#/members/' + mem.id + '">' + U.esc(mem.fullName) + '</a>' : U.esc(r.memberId)) + '</td>' +
                  '<td>' + UI.statusBadge(r.status) + '</td><td class="td-muted">' + U.esc(r.remarks || '—') + '</td></tr>';
              }).join('') + '</tbody></table></div>'
          : UI.emptyState({
              icon: 'user-check', title: 'Attendance not recorded',
              message: 'Record who attended this meeting to update the club attendance statistics.',
              actions: Auth.can('attendance', 'create') ? '<button type="button" class="btn btn-primary btn-sm" data-detail-action="attendance">' + Icons.svg('user-check', { class: 'btn-ico' }) + 'Record attendance</button>' : ''
            })
      });

      return '<div class="grid cols-2">' + overview + agenda + '</div>' +
        '<div class="grid cols-2">' + minutes + decisions + '</div>' +
        '<div class="grid cols-2">' + attendance + actionItems + '</div>';
    },
    onDetailAction: function (action, btn, m) {
      if (action === 'attendance') Modules.Attendance.openRecorder({ contextType: 'meeting', contextId: m.id });
      if (action === 'minutes') openMinutes(m);
      if (action === 'print') Print.preview(Print.minutes(m), { title: 'Minutes — ' + m.title, fileName: 'mrhs-ict-minutes-' + m.meetingId });
    },
    onDetailMount: function (ctx, root, m) {
      root.addEventListener('change', function (e) {
        var sel = e.target.closest('[data-action-item]');
        if (!sel) return;
        if (!CRUD.guard('meetings', 'edit')) { Router.refresh(); return; }
        var items = (m.actionItems || []).map(function (a) {
          return a.id === sel.getAttribute('data-action-item') ? Object.assign({}, a, { status: sel.value }) : a;
        });
        Store.update('meetings', m.id, { actionItems: items });
        // Keep the generated task in step
        var item = U.findBy(items, 'id', sel.getAttribute('data-action-item'));
        var task = U.findBy(Store.all('tasks'), function (t) {
          return t.sourceMeetingId === m.id && U.norm(t.title) === U.norm(item.text);
        });
        if (task) Store.update('tasks', task.id, { status: sel.value === 'Completed' ? 'Completed' : sel.value, progress: sel.value === 'Completed' ? 100 : task.progress });
        UI.toast('Action item updated', 'Status set to ' + sel.value + '.', 'success', { duration: 2200 });
      });
    }
  };

  function findActionStatus(meeting, text) {
    var existing = U.findBy(meeting.actionItems || [], function (a) { return U.norm(a.text) === U.norm(text); });
    return existing ? existing.status : 'Pending';
  }

  function openMinutes(m) {
    if (!CRUD.guard('meetings', 'edit')) return;
    var ctrl = UI.modal({
      title: 'Record minutes',
      subtitle: m.title + ' · ' + U.fmtDate(m.date, 'long'),
      icon: 'file-text', size: 'lg',
      body: '<div class="form-grid">' +
          '<div class="field col-2"><label for="min-text">Minutes summary</label>' +
            '<textarea id="min-text" rows="8" placeholder="Discussion points, resolutions and any other business…">' + U.esc(m.minutes || '') + '</textarea>' +
            '<p class="help">A concise record of what was discussed and agreed. These minutes can be printed from the meeting page.</p></div>' +
          '<div class="field col-2"><label for="min-decisions">Decisions (one per line)</label>' +
            '<textarea id="min-decisions" rows="4">' + U.esc((m.decisions || []).join('\n')) + '</textarea></div>' +
          '<div class="field col-2"><label for="min-status">Meeting status</label>' +
            '<select id="min-status">' + ['Scheduled', 'Completed', 'Cancelled'].map(function (s) {
              return '<option value="' + s + '"' + (m.status === s ? ' selected' : '') + '>' + s + '</option>';
            }).join('') + '</select></div>' +
        '</div>',
      actions: [
        { label: 'Cancel', tone: 'ghost', onClick: function (c) { c.close(); } },
        {
          label: 'Save minutes', tone: 'primary', icon: 'save',
          onClick: function (c) {
            var text = c.modal.querySelector('#min-text').value.trim();
            var decisions = c.modal.querySelector('#min-decisions').value.split('\n').map(function (d) { return d.trim(); }).filter(Boolean);
            var status = c.modal.querySelector('#min-status').value;
            if (status === 'Completed' && !text) {
              UI.toast('Minutes required', 'Enter a minutes summary before completing the meeting.', 'warning');
              return;
            }
            Store.update('meetings', m.id, { minutes: text, decisions: decisions, status: status });
            UI.toast('Minutes saved', 'The meeting record has been updated.', 'success');
            c.close();
            Router.refresh();
          }
        }
      ]
    });
    return ctrl;
  }

  ModuleHelper.page(config);

  global.Modules = global.Modules || {};
  global.Modules.Meetings = {
    config: config,
    openForm: function (values) {
      if (values && values.id) {
        var rec = Store.find('meetings', values.id);
        return ModuleHelper.openEdit(config, rec);
      }
      return ModuleHelper.openCreate(config);
    },
    openMinutes: openMinutes,
    attendanceSummary: attendanceSummary,
    nameOf: nameOf
  };
})(window);
