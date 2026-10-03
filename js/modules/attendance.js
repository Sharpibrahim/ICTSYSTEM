/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/attendance.js
   Attendance for meetings, courses, activities, training and events, with a
   keypad recorder, automatic rates, member histories, monthly and term
   reports and a QR check-in placeholder for a future release.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  /* ── Context resolution ───────────────────────────────────────────────── */
  var CONTEXTS = [
    { key: 'meeting', label: 'Meetings', icon: 'calendar-check', collection: 'meetings', title: function (r) { return r.title; }, date: function (r) { return r.date; } },
    { key: 'course', label: 'Courses', icon: 'graduation', collection: 'courses', title: function (r) { return r.name; }, date: function (r) { return r.startDate; } },
    { key: 'activity', label: 'Activities', icon: 'rocket', collection: 'activities', title: function (r) { return r.title; }, date: function (r) { return r.date; } },
    { key: 'training', label: 'Training sessions', icon: 'book-open', collection: 'courses', title: function (r) { return r.name; }, date: function (r) { return r.startDate; } },
    { key: 'event', label: 'Events', icon: 'ticket', collection: 'activities', title: function (r) { return r.title; }, date: function (r) { return r.date; } }
  ];
  function contextDef(type) { return U.findBy(CONTEXTS, 'key', type) || CONTEXTS[0]; }
  function contextRecord(type, id) { return Store.find(contextDef(type).collection, id); }
  function contextTitle(type, id) {
    var rec = contextRecord(type, id);
    if (rec) return contextDef(type).title(rec);
    if (type === 'training') return 'Training session';
    return 'Club session';
  }
  function contextLink(row) {
    var rec = contextRecord(row.contextType, row.contextId);
    var map = { meeting: 'meetings', course: 'courses', activity: 'activities', training: 'courses', event: 'activities' };
    return rec ? '#/' + map[row.contextType] + '/' + rec.id : null;
  }

  /* ── Statistics ───────────────────────────────────────────────────────── */
  function stats() {
    var a = Metrics.attendance();
    return {
      overall: a,
      byContext: CONTEXTS.map(function (c) {
        var rows = Store.where('attendance', function (r) { return r.contextType === c.key; });
        var attended = rows.filter(function (r) { return r.status === 'Present' || r.status === 'Late'; }).length;
        return { def: c, total: rows.length, rate: rows.length ? U.percent(attended, rows.length) : 0 };
      }).filter(function (x) { return x.total > 0; }),
      low: Metrics.lowAttendance(null, 6),
      top: U.sortBy(Metrics.memberAttendance().filter(function (m) { return m.records >= 6; }), 'rate', 'desc').slice(0, 6),
      monthly: Metrics.attendanceByMonth(6),
      term: termStats()
    };
  }
  function termStats() {
    var s = Store.settings();
    var rows = Store.where('attendance', function (r) {
      return (!s.termStart || r.date >= s.termStart) && (!s.termEnd || r.date <= s.termEnd);
    });
    var attended = rows.filter(function (r) { return r.status === 'Present' || r.status === 'Late'; }).length;
    return { total: rows.length, rate: rows.length ? U.percent(attended, rows.length) : 0, start: s.termStart, end: s.termEnd };
  }

  /* ══ Recorder ═════════════════════════════════════════════════════════ */
  /**
   * Modules.Attendance.openRecorder({contextType, contextId, memberId, date})
   */
  function openRecorder(opts) {
    opts = opts || {};
    if (!CRUD.guard('attendance', 'create')) return null;

    var draft = {
      contextType: opts.contextType || 'meeting',
      contextId: opts.contextId || '',
      date: opts.date || U.todayISO(),
      memberId: opts.memberId || ''
    };

    var ctrl = UI.modal({
      title: 'Record attendance',
      subtitle: 'Choose the session, mark each member and save.',
      icon: 'user-check', size: 'xl',
      body: '<div id="att-recorder"></div>',
      actions: [
        { label: 'Cancel', tone: 'ghost', onClick: function (c) { c.close(); } },
        { label: 'Print sheet', tone: 'outline', icon: 'print', onClick: function (c) {
            if (!draft.contextId) { UI.toast('Select a session first', 'Choose the session you want to print the attendance sheet for.', 'warning'); return; }
            Print.preview(Print.attendanceSheet({
              type: draft.contextType, id: draft.contextId,
              title: contextTitle(draft.contextType, draft.contextId), date: draft.date
            }), { title: 'Attendance sheet' });
          } },
        { label: 'Save attendance', tone: 'primary', icon: 'save', onClick: function (c) { save(c); } }
      ]
    });

    function renderRecorder() {
      var host = ctrl.modal.querySelector('#att-recorder');
      var def = contextDef(draft.contextType);
      var options = U.sortBy(Store.all(def.collection), function (r) { return def.date(r); }, 'desc');
      var members = Store.all('members').filter(function (m) {
        return m.membershipStatus === 'Active' || m.membershipStatus === 'Inactive';
      });
      if (draft.memberId) members = members.filter(function (m) { return m.id === draft.memberId; });

      var existing = draft.contextId ? CRUD.attendanceFor(draft.contextType, draft.contextId) : [];
      var already = existing.length;

      host.innerHTML =
        '<div class="form-grid mb-2">' +
          '<div class="field"><label for="att-type">Session type</label>' +
            '<select id="att-type">' + CONTEXTS.map(function (c) {
              return '<option value="' + c.key + '"' + (c.key === draft.contextType ? ' selected' : '') + '>' + U.esc(c.label) + '</option>';
            }).join('') + '</select></div>' +
          '<div class="field"><label for="att-session">Session</label>' +
            '<select id="att-session"><option value="">Select a session…</option>' + options.map(function (r) {
              return '<option value="' + r.id + '"' + (r.id === draft.contextId ? ' selected' : '') + '>' + U.esc(def.title(r)) + ' — ' + U.fmtDate(def.date(r)) + '</option>';
            }).join('') + '</select></div>' +
          '<div class="field"><label for="att-date">Session date</label>' +
            '<input id="att-date" type="date" value="' + U.attr(draft.date) + '" max="' + U.todayISO() + '"></div>' +
          '<div class="field"><label>Quick actions</label>' +
            '<div class="flex gap-1 wrap">' +
              '<button type="button" class="btn btn-outline btn-sm" data-att-mark="Present">' + Icons.svg('check', { class: 'btn-ico' }) + 'All present</button>' +
              '<button type="button" class="btn btn-outline btn-sm" data-att-mark="Absent">' + Icons.svg('x', { class: 'btn-ico' }) + 'All absent</button>' +
              '<a class="btn btn-ghost btn-sm" href="#/members" target="_blank" rel="noopener">' + Icons.svg('plus', { class: 'btn-ico' }) + 'Add member</a>' +
            '</div></div>' +
        '</div>' +
        (draft.memberId ? '<div class="alert alert-info mb-2">' + Icons.svg('info') + '<div>Recording attendance for a single member. Clear the member filter from the member profile to record the whole club.</div></div>' : '') +
        (draft.contextId && already
          ? '<div class="alert alert-warning mb-2">' + Icons.svg('alert-triangle') + '<div><strong>Attendance already recorded</strong>' + already +
            ' records exist for this session. Saving will update them.</div></div>'
          : '') +
        (draft.contextId
          ? Forms.attendanceGrid(members, existing) + '<p class="help mt-1">Members are listed with their current status. “Late” counts towards the attendance rate; “Excused” and “Absent” do not.</p>'
          : '<div>' + UI.emptyState({ icon: 'calendar-check', title: 'Select a session', message: 'Pick the session type and the specific session to record attendance for.' }) + '</div>');

      Forms.initAttendanceGrid(host);

      host.querySelector('#att-type').addEventListener('change', function () {
        draft.contextType = this.value; draft.contextId = ''; renderRecorder();
      });
      host.querySelector('#att-session').addEventListener('change', function () {
        draft.contextId = this.value;
        var rec = contextRecord(draft.contextType, draft.contextId);
        if (rec) draft.date = U.iso(contextDef(draft.contextType).date(rec)) || draft.date;
        renderRecorder();
      });
      host.querySelector('#att-date').addEventListener('change', function () { draft.date = this.value; });
    }

    function save(c) {
      if (!draft.contextId) {
        UI.toast('No session selected', 'Choose the session you are recording attendance for.', 'warning');
        return;
      }
      var host = ctrl.modal.querySelector('#att-recorder');
      var rows = Forms.readAttendanceGrid(host);
      if (!rows.length) { UI.toast('Nothing to save', 'There are no members listed for this session.', 'warning'); return; }
      var user = Auth.currentUser();
      var inserted = 0, updated = 0;
      rows.forEach(function (r) {
        var existing = U.findBy(Store.all('attendance'), function (a) {
          return a.contextType === draft.contextType && a.contextId === draft.contextId && a.memberId === r.memberId;
        });
        if (existing) {
          Store.update('attendance', existing.id, { status: r.status, remarks: r.remarks, date: draft.date, recordedBy: user ? user.id : null });
          updated++;
        } else {
          Store.insert('attendance', {
            demo: false, contextType: draft.contextType, contextId: draft.contextId, memberId: r.memberId,
            date: draft.date, status: r.status, remarks: r.remarks,
            recordedBy: user ? user.id : null, recordedAt: new Date().toISOString()
          });
          inserted++;
        }
      });
      var summary = rows.reduce(function (a, r) { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
      UI.toast('Attendance saved',
        contextTitle(draft.contextType, draft.contextId) + ': ' + (summary.Present || 0) + ' present, ' + (summary.Late || 0) + ' late, ' +
        (summary.Excused || 0) + ' excused, ' + (summary.Absent || 0) + ' absent.', 'success');
      c.close();
      Store.emit({ type: 'change', collection: 'attendance' });
      Router.refresh();
    }

    renderRecorder();
    return ctrl;
  }

  /* ══ QR placeholder ═══════════════════════════════════════════════════ */
  function qrPanel() {
    return UI.card({
      title: 'QR check-in', icon: 'qr-code', sub: 'Future-ready interface',
      body: '<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">' +
          '<div style="width:132px;height:132px;border-radius:14px;border:2px dashed var(--border-2);display:grid;place-items:center;background:var(--surface-2)">' +
            Icons.svg('qr-code', { size: 56 }) + '</div>' +
          '<div style="flex:1;min-width:220px">' +
            '<p class="small">Members will scan a session QR code to mark themselves present instead of queuing at the register. ' +
            'The data layer, attendance records and reporting are already in place — this interface is a placeholder for that release.</p>' +
            '<div class="flex gap-1 wrap mt-1">' +
              '<button type="button" class="btn btn-outline btn-sm" data-qr-action="generate">' + Icons.svg('qr-code', { class: 'btn-ico' }) + 'Generate session code</button>' +
              '<button type="button" class="btn btn-ghost btn-sm" data-qr-action="info">' + Icons.svg('info', { class: 'btn-ico' }) + 'How it will work</button>' +
            '</div>' +
          '</div>' +
        '</div>',
      foot: UI.badge('Not yet active in this build', 'warning', { icon: 'info' })
    });
  }

  /* ══ Records list ═════════════════════════════════════════════════════ */
  var config = {
    key: 'attendance',
    title: 'Attendance',
    singular: 'attendance record',
    icon: 'user-check',
    module: 'attendance',
    collection: 'attendance',
    subtitle: 'Record and analyse attendance for meetings, courses, activities, training and events.',
    stats: function () {
      var s = stats();
      var t = s.term;
      return [
        { label: 'Overall attendance rate', value: s.overall.rate + '%', icon: 'activity', tone: s.overall.rate >= 75 ? 'success' : 'warning', foot: s.overall.total + ' records' },
        { label: 'Present', value: U.num(s.overall.present), icon: 'check-circle', tone: 'success', foot: s.overall.late + ' arrived late' },
        { label: 'Absent', value: U.num(s.overall.absent), icon: 'x-circle', tone: 'danger', foot: s.overall.excused + ' excused' },
        { label: 'Members below ' + (Store.settings().lowAttendanceThreshold || 60) + '%', value: U.num(s.low.length), icon: 'alert-triangle', tone: s.low.length ? 'warning' : 'success', foot: 'Based on 6 or more sessions' }
      ];
    },
    columns: [
      { key: 'date', label: 'Date', render: function (r) { return U.esc(U.fmtDate(r.date)); } },
      {
        key: 'member', label: 'Member',
        render: function (r) {
          var m = Store.find('members', r.memberId);
          return m ? UI.personCell(m.fullName, m.klass + ' ' + (m.stream || ''), { link: '#/members/' + m.id }) : '<span class="td-muted">Unknown member</span>';
        }
      },
      {
        key: 'context', label: 'Session',
        render: function (r) {
          var link = contextLink(r);
          var label = contextTitle(r.contextType, r.contextId);
          return (link ? '<a href="' + link + '">' + U.esc(label) + '</a>' : U.esc(label)) +
            '<br><span class="td-muted">' + U.esc(U.titleCase(r.contextType)) + '</span>';
        }
      },
      { key: 'status', label: 'Status', render: function (r) { return UI.statusBadge(r.status); } },
      { key: 'remarks', label: 'Remarks', render: function (r) { return '<span class="td-muted">' + U.esc(r.remarks || '—') + '</span>'; } },
      {
        key: 'recordedBy', label: 'Recorded by',
        render: function (r) {
          var u = Store.find('users', r.recordedBy);
          return '<span class="td-muted">' + U.esc(u ? u.name : 'System') + '</span>';
        }
      }
    ],
    filters: [
      { key: 'status', label: 'All statuses', options: Data.ATTENDANCE_STATUSES },
      { key: 'contextType', label: 'All session types', options: CONTEXTS.map(function (c) { return { value: c.key, label: c.label }; }) },
      {
        key: 'contextId', label: 'All sessions', value: function (r) { return r.contextId; },
        options: (function () {
          var ids = U.uniq(Store.all('attendance').map(function (r) { return r.contextId; }));
          return ids.map(function (id) {
            var row = U.findBy(Store.all('attendance'), 'contextId', id);
            return { value: id, label: U.truncate(contextTitle(row.contextType, id), 48) };
          });
        })()
      }
    ],
    searchKeys: function (r) {
      var m = Store.find('members', r.memberId);
      return [m ? m.fullName : '', m ? m.memberId : '', contextTitle(r.contextType, r.contextId), r.status, r.date, r.remarks];
    },
    exportColumns: [
      { key: 'date', label: 'Date' },
      { value: function (r) { var m = Store.find('members', r.memberId); return m ? m.fullName : ''; }, label: 'Member' },
      { value: function (r) { var m = Store.find('members', r.memberId); return m ? m.memberId : ''; }, label: 'Member ID' },
      { key: 'contextType', label: 'Session type' },
      { value: function (r) { return contextTitle(r.contextType, r.contextId); }, label: 'Session' },
      { key: 'status', label: 'Status' }, { key: 'remarks', label: 'Remarks' }
    ],
    headActions: function (moduleKey) {
      return Auth.can('attendance', 'create')
        ? '<button type="button" class="btn btn-primary" data-att-open>' + Icons.svg('user-check', { class: 'btn-ico' }) + 'Record attendance</button>'
        : '';
    },
    toolbarExtra: function () {
      return '<button type="button" class="btn btn-outline btn-sm" data-att-report>' + Icons.svg('file-text', { class: 'btn-ico' }) + 'Attendance report</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-att-sheet>' + Icons.svg('print', { class: 'btn-ico' }) + 'Print sheet</button>';
    },
    rowActions: function (r) {
      var out = '';
      var m = Store.find('members', r.memberId);
      if (m) out += CRUD.viewBtn('#/members/' + m.id, 'member');
      if (Auth.can('attendance', 'edit')) out += CRUD.actionBtn('edit', r.id, 'edit', 'Change status');
      if (Auth.can('attendance', 'delete')) out += CRUD.actionBtn('delete', r.id, 'trash', 'Delete record', 'danger');
      return out;
    },
    onRowAction: function (action, r, table) {
      if (action === 'edit') {
        UI.formModal({
          title: 'Update attendance record', icon: 'edit', size: 'sm',
          subtitle: (Store.find('members', r.memberId) ? Store.find('members', r.memberId).fullName : 'Member') + ' · ' + U.fmtDate(r.date),
          formHtml: Forms.render([
            { name: 'status', label: 'Status', type: 'select', options: Data.ATTENDANCE_STATUSES, value: r.status, required: true, colSpan: 2 },
            { name: 'remarks', label: 'Remarks', type: 'text', value: r.remarks, colSpan: 2 }
          ]),
          submitLabel: 'Save status',
          onOpen: function (c, form) { Forms.init(form); },
          onSubmit: function (data) {
            Store.update('attendance', r.id, { status: data.status, remarks: data.remarks });
            UI.toast('Attendance updated', 'The record now shows ' + data.status + '.', 'success');
            if (table) table.refresh();
            Router.refresh();
          }
        });
      }
    },
    empty: { icon: 'user-check', title: 'No attendance recorded', message: 'Use the record attendance button to mark members present for a meeting, course or activity.' },
    notice: function () {
      var t = termStats();
      if (!t.total) return '';
      return UI.note('<strong>Current term attendance:</strong> ' + t.rate + '% across ' + t.total + ' records since ' + U.fmtDate(t.start) + '.', '');
    },

    beforeTable: function () {
      var s = stats();
      var monthly = s.monthly;
      var chart = Charts.bar({
        labels: monthly.map(function (m) { return m.label; }),
        aria: 'Attendance records and rate per month',
        series: [
          { name: 'Records', color: '#2545d6', data: monthly.map(function (m) { return m.count; }) }
        ],
        height: 220
      });
      var rate = Charts.line({
        labels: monthly.map(function (m) { return m.label; }),
        minZero: false, height: 220,
        yFormat: function (v) { return Math.round(v) + '%'; },
        valueFormat: function (v) { return v + '%'; },
        series: [{ name: 'Attendance rate', color: '#7f47ef', data: monthly.map(function (m) { return m.rate; }) }]
      });
      return '<div class="grid cols-2">' +
          UI.card({ title: 'Attendance over time', icon: 'bar-chart', sub: 'Last 6 months', body: chart }) +
          UI.card({ title: 'Attendance rate trend', icon: 'trending-up', sub: 'Present and late ÷ expected', body: rate }) +
        '</div>' +
        '<div class="grid cols-2" style="grid-template-columns:minmax(0,1.35fr) minmax(0,1fr)">' +
          UI.card({
            title: 'Attendance by session type', icon: 'layers',
            body: s.byContext.length ? Charts.hbar({
              data: s.byContext.map(function (c) { return { label: c.def.label + ' (' + c.total + ')', value: c.rate, color: c.rate >= 75 ? '#12884f' : c.rate >= 60 ? '#b7791f' : '#d64545' }; }),
              max: 100, valueFormat: function (v) { return Math.round(v) + '%'; }
            }) : UI.emptyState({ icon: 'layers', title: 'No attendance yet', message: 'Attendance recorded for meetings, courses and activities will be summarised here.' })
          }) +
          UI.card({
            title: 'Members needing support', icon: 'alert-triangle', sub: 'Below ' + (Store.settings().lowAttendanceThreshold || 60) + '% attendance',
            flush: true,
            body: s.low.length ? '<div class="list-rows scroll-y-sm">' + s.low.slice(0, 6).map(function (l) {
              return '<a class="list-row clickable" href="#/members/' + l.memberId + '">' +
                '<span class="tl-dot warning">' + Icons.svg('user-check') + '</span>' +
                '<span class="list-row-main"><strong>' + U.esc(l.name) + '</strong><span>' + U.esc(l.klass) + ' · ' + l.attended + '/' + l.records + ' sessions</span></span>' +
                '<span class="list-row-side"><span class="badge badge-danger badge-soft">' + l.rate + '%</span></span></a>';
            }).join('') + '</div>' : UI.emptyState({ icon: 'check-circle', title: 'No concerns', message: 'Every active member with enough records is attending above the threshold.' }),
            foot: s.low.length ? '<a class="link-btn" href="#/attendance" data-low-all>View all ' + s.low.length + '</a>' : ''
          }) +
        '</div>' +
        '<div class="grid cols-2">' +
          UI.card({
            title: 'Best attendance', icon: 'star', sub: 'Members with 6 or more sessions',
            body: s.top.length ? Charts.hbar({
              data: s.top.map(function (m) { return { label: m.name, value: m.rate, color: '#12884f' }; }),
              max: 100, valueFormat: function (v) { return Math.round(v) + '%'; }
            }) : UI.emptyState({ icon: 'star', title: 'Not enough data', message: 'Attendance leaders appear once members have at least six recorded sessions.' })
          }) +
          qrPanel() +
        '</div>' +
        UI.card({
          title: 'Term report', icon: 'calendar-days',
          sub: U.fmtDate(Store.settings().termStart) + ' — ' + U.fmtDate(Store.settings().termEnd),
          body: '<div class="stat-strip">' +
              '<div class="strip-item"><span>Term attendance rate</span><strong>' + s.term.rate + '%</strong></div>' +
              '<div class="strip-item"><span>Records this term</span><strong>' + U.num(s.term.total) + '</strong></div>' +
              '<div class="strip-item"><span>Sessions recorded</span><strong>' + U.num(U.uniq(Store.all('attendance').filter(function (r) {
                return (!Store.settings().termStart || r.date >= Store.settings().termStart);
              }).map(function (r) { return r.contextId; })).length) + '</strong></div>' +
              '<div class="strip-item"><span>Members tracked</span><strong>' + U.num(U.uniq(Store.all('attendance').map(function (r) { return r.memberId; })).length) + '</strong></div>' +
            '</div>' +
            '<div class="mt-2">' + UI.progressRow('Term attendance rate', s.term.rate) + '</div>'
        }) +
        '<div class="divider-text"><span>Attendance records</span></div>';
    },
    onMount: function (ctx, root, table) {
      root.addEventListener('click', function (e) {
        if (e.target.closest('[data-att-open]')) { openRecorder(); return; }
        if (e.target.closest('[data-att-report]')) { openReport(); return; }
        if (e.target.closest('[data-att-sheet]')) { openSheetPicker(); return; }
        var qr = e.target.closest('[data-qr-action]');
        if (qr) {
          if (qr.getAttribute('data-qr-action') === 'generate') {
            UI.modal({
              title: 'Session check-in code', subtitle: 'Placeholder QR interface', icon: 'qr-code', size: 'sm',
              body: '<div style="display:grid;place-items:center;gap:14px;padding:10px 0">' +
                '<div style="width:190px;height:190px;border-radius:16px;border:2px dashed var(--border-2);display:grid;place-items:center;background:var(--surface-2)">' +
                  Icons.svg('qr-code', { size: 74 }) + '</div>' +
                '<p class="small text-center muted">QR check-in becomes active once the platform is connected to a backend service. ' +
                'The attendance records, verification numbers and reporting shown in this build are already production-shaped.</p>' +
                '</div>',
              actions: [{ label: 'Close', tone: 'ghost', onClick: function (c) { c.close(); } }]
            });
          } else {
            UI.modal({
              title: 'How QR check-in will work', icon: 'info', size: 'sm',
              body: '<ol style="padding-left:20px;list-style:decimal;display:grid;gap:8px" class="small">' +
                '<li>The secretary opens a session and generates a check-in code.</li>' +
                '<li>Members scan the code with a phone and confirm their name.</li>' +
                '<li><code>attendance</code> records are written with the same schema used today.</li>' +
                '<li>Late arrivals are flagged automatically after the grace period.</li>' +
                '<li>The attendance dashboard needs no changes — it reads the same records.</li>' +
                '</ol>',
              actions: [{ label: 'Close', tone: 'ghost', onClick: function (c) { c.close(); } }]
            });
          }
        }
      });
    }
  };

  function openSheetPicker() {
    UI.formModal({
      title: 'Print an attendance sheet', subtitle: 'Choose the session to print a blank register.', icon: 'print', size: 'sm',
      formHtml: Forms.render([
        { name: 'contextType', label: 'Session type', type: 'select', options: CONTEXTS.map(function (c) { return { value: c.key, label: c.label }; }), required: true, colSpan: 2 },
        { name: 'contextId', label: 'Session', type: 'select', options: [], required: true, colSpan: 2 }
      ]),
      submitLabel: 'Open sheet', submitIcon: 'print',
      onOpen: function (c, form) {
        var typeSel = form.querySelector('[name="contextType"]');
        var sessionSel = form.querySelector('[name="contextId"]');
        function refresh() {
          var def = contextDef(typeSel.value);
          sessionSel.innerHTML = '<option value="">Select a session…</option>' + U.sortBy(Store.all(def.collection), function (r) { return def.date(r); }, 'desc')
            .map(function (r) { return '<option value="' + r.id + '">' + U.esc(def.title(r)) + ' — ' + U.fmtDate(def.date(r)) + '</option>'; }).join('');
        }
        typeSel.addEventListener('change', refresh);
        refresh();
      },
      validate: function (data) { return data.contextId ? {} : { contextId: 'Choose a session.' }; },
      onSubmit: function (data) {
        var rec = contextRecord(data.contextType, data.contextId);
        Print.preview(Print.attendanceSheet({
          type: data.contextType, id: data.contextId,
          title: contextDef(data.contextType).title(rec), date: contextDef(data.contextType).date(rec)
        }), { title: 'Attendance sheet — ' + contextDef(data.contextType).title(rec) });
      }
    });
  }

  function openReport() {
    var s = stats();
    var byMember = U.sortBy(Metrics.memberAttendance(), 'rate', 'desc');
    var html = Print.page(
      '<div class="print-doc-title"><h1>Attendance Report</h1><p>' + U.fmtDate(new Date(), 'long') + ' &middot; MRHS ICT Club</p></div>' +
      '<table><tbody>' +
        '<tr><th style="width:34%">Overall attendance rate</th><td>' + s.overall.rate + '%</td></tr>' +
        '<tr><th>Total records</th><td>' + s.overall.total + '</td></tr>' +
        '<tr><th>Present / Late</th><td>' + s.overall.present + ' present, ' + s.overall.late + ' late</td></tr>' +
        '<tr><th>Absent / Excused</th><td>' + s.overall.absent + ' absent, ' + s.overall.excused + ' excused</td></tr>' +
        '<tr><th>Current term rate</th><td>' + s.term.rate + '% (' + s.term.total + ' records)</td></tr>' +
      '</tbody></table>' +
      '<h3>Attendance by session type</h3>' +
      '<table><thead><tr><th>Session type</th><th>Records</th><th>Attendance rate</th></tr></thead><tbody>' +
        s.byContext.map(function (c) {
          return '<tr><td>' + U.esc(c.def.label) + '</td><td>' + c.total + '</td><td>' + c.rate + '%</td></tr>';
        }).join('') + '</tbody></table>' +
      '<h3>Individual attendance</h3>' +
      '<table><thead><tr><th>#</th><th>Member</th><th>Class</th><th>Sessions</th><th>Attended</th><th>Rate</th></tr></thead><tbody>' +
        byMember.map(function (m, i) {
          return '<tr><td>' + (i + 1) + '</td><td>' + U.esc(m.name) + '</td><td>' + U.esc(m.klass) + '</td><td>' + m.records + '</td><td>' + m.attended + '</td><td>' + m.rate + '%</td></tr>';
        }).join('') + '</tbody></table>' +
      '<div class="print-sign"><div><div class="line"></div>Prepared by (Secretary)</div><div><div class="line"></div>Approved by (Patron)</div></div>',
      { meta: 'Attendance report' }
    );
    Print.preview(html, { title: 'Attendance report', fileName: 'mrhs-ict-attendance-report' });
  }

  ModuleHelper.page(config);

  global.Modules = global.Modules || {};
  global.Modules.Attendance = {
    config: config,
    openRecorder: openRecorder,
    openReport: openReport,
    stats: stats,
    contextTitle: contextTitle,
    contextDef: contextDef,
    CONTEXTS: CONTEXTS
  };
})(window);
