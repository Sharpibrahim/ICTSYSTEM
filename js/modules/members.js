/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/members.js
   Membership management: register, search, filter, import, export, promote to
   cabinet, print profiles, generate ID cards and view each member's connected
   attendance, courses, projects, certificates and achievements.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;
  var M = Data.MEMBER_STATUSES;

  var state = { view: 'table' };

  /* ── Helpers ──────────────────────────────────────────────────────────── */
  function fullLabel(m) { return m.fullName + ' · ' + m.klass + (m.stream ? ' ' + m.stream : ''); }
  function cabinetPosition(memberId) {
    var row = U.findBy(Store.all('cabinet'), 'memberId', memberId);
    return row ? row.position : null;
  }
  function attendanceStats(memberId) {
    var rows = CRUD.memberAttendance(memberId);
    var present = rows.filter(function (r) { return r.status === 'Present'; }).length;
    var late = rows.filter(function (r) { return r.status === 'Late'; }).length;
    var excused = rows.filter(function (r) { return r.status === 'Excused'; }).length;
    var absent = rows.filter(function (r) { return r.status === 'Absent'; }).length;
    return {
      rows: rows, present: present, late: late, excused: excused, absent: absent,
      total: rows.length,
      rate: rows.length ? U.percent(present + late, rows.length) : 0
    };
  }

  /* ── Form schema ──────────────────────────────────────────────────────── */
  function schema(values) {
    return [
      { name: 'fullName', label: 'Full name', type: 'text', required: true, colSpan: 2, placeholder: 'e.g. Ibrahim Ssemakula' },
      { name: 'gender', label: 'Gender', type: 'select', required: true, options: ['Male', 'Female'] },
      { name: 'klass', label: 'Class', type: 'select', required: true, options: Data.CLASSES },
      { name: 'stream', label: 'Stream', type: 'select', options: Data.STREAMS },
      { name: 'studentNumber', label: 'Student number', type: 'text', placeholder: 'e.g. MRHS/2026/0145' },
      { name: 'contact', label: 'Contact phone', type: 'tel', placeholder: '+256 7xx xxx xxx' },
      { name: 'email', label: 'Email address', type: 'email', placeholder: 'name@student.mrhs.ac.ug' },
      { name: 'dateJoined', label: 'Date joined', type: 'date', required: true, value: U.todayISO(), max: U.todayISO() },
      { name: 'membershipStatus', label: 'Membership status', type: 'select', required: true, options: M, value: 'Active' },
      { name: 'clubRole', label: 'Club role', type: 'select', options: ['Member', 'Team Lead', 'Course Assistant', 'Class Representative', 'President', 'Vice President', 'General Secretary', 'Assistant Secretary', 'Treasurer', 'ICT Director', 'Projects Coordinator', 'Training Coordinator', 'Events Coordinator', 'Publicity Officer', 'Welfare Officer'], value: 'Member' },
      { name: 'photograph', label: 'Profile photo', type: 'html', html: Forms.imageUpload('photoFileId', values.photoFileId), colSpan: 2, help: 'Optional. Stored locally in this browser for the prototype.' },
      { name: 'skills', label: 'Skills', type: 'tags', colSpan: 2, value: values.skills || [], help: 'Type a skill and press Enter. Example: JavaScript, Networking.' },
      { name: 'interests', label: 'Interests', type: 'tags', colSpan: 2, value: values.interests || [], help: 'Areas of ICT the member is interested in.' },
      { name: 'bio', label: 'Short biography', type: 'textarea', colSpan: 2, rows: 3 },
      { name: 'notes', label: 'Internal notes', type: 'textarea', colSpan: 2, rows: 3, help: 'Visible to cabinet members only.' }
    ];
  }

  /* ── List ─────────────────────────────────────────────────────────────── */
  var config = {
    key: 'members',
    title: 'Members',
    singular: 'member',
    plural: 'members',
    icon: 'users',
    module: 'members',
    collection: 'members',
    subtitle: 'The club register: profiles, status, skills, classes and everything each member is connected to.',
    stats: function () {
      var m = Metrics.members();
      return [
        { label: 'Total members', value: U.num(m.total), icon: 'users', tone: 'primary', foot: m.newThisTerm + ' joined in the last term' },
        { label: 'Active members', value: U.num(m.active), icon: 'user-check', tone: 'success', foot: m.joinRate + '% of the register' },
        { label: 'Cabinet positions', value: U.num(m.cabinet), icon: 'crown', tone: 'secondary', foot: 'Leadership team' },
        { label: 'Alumni & inactive', value: U.num(m.alumni + m.inactive), icon: 'graduation', tone: 'neutral', foot: m.suspended + ' suspended' }
      ];
    },
    schema: schema,
    beforeSave: function (data, values) {
      if (values.id) {
        var clash = U.findBy(Store.all('members'), function (m) {
          return m.id !== values.id && U.norm(m.fullName) === U.norm(data.fullName);
        });
        if (clash) return { fullName: 'Another member already uses this name. Add a distinguishing detail if these are different people.' };
      }
      return null;
    },
    transform: function (data, values) {
      var rec = {
        fullName: String(data.fullName || '').trim(),
        gender: data.gender,
        klass: data.klass,
        stream: data.stream,
        studentNumber: data.studentNumber,
        contact: data.contact,
        email: data.email,
        dateJoined: data.dateJoined,
        membershipStatus: data.membershipStatus,
        clubRole: data.clubRole,
        skills: data.skills || [],
        interests: data.interests || [],
        bio: data.bio,
        notes: data.notes,
        photoFileId: data.photoFileId || values.photoFileId || null,
        demo: values.demo === true
      };
      if (!values.id) {
        rec.memberId = CRUD.nextCode('members', 'memberId', (Store.settings().memberIdPrefix || 'MRHS-ICT-M'), 3);
        rec.reliability = values.reliability || 0.82;
      }
      return rec;
    },
    afterSave: function (rec, data) {
      // Keep the cabinet record in step when a club role changes.
      var position = cabinetPosition(rec.id);
      if (position && rec.membershipStatus === 'Suspended') {
        UI.toast('Cabinet member suspended', rec.fullName + ' holds the position of ' + position + '. Consider appointing a replacement.', 'warning', { duration: 8000 });
      }
    },

    columns: [
      {
        key: 'fullName', label: 'Member',
        render: function (m) {
          return UI.personCell(m.fullName, m.klass + ' ' + (m.stream || '') + ' · ' + m.gender, { link: '#/members/' + m.id, src: null });
        }
      },
      { key: 'memberId', label: 'Member ID', render: function (m) { return '<span class="id-pill">' + U.esc(m.memberId) + '</span>'; } },
      { key: 'membershipStatus', label: 'Status', render: function (m) { return UI.statusBadge(m.membershipStatus); } },
      {
        key: 'clubRole', label: 'Club role',
        render: function (m) {
          var pos = cabinetPosition(m.id);
          return U.esc(m.clubRole || 'Member') + (pos ? '<br><span class="badge badge-secondary badge-soft" style="margin-top:4px">' + Icons.svg('crown') + U.esc(pos) + '</span>' : '');
        }
      },
      { key: 'contact', label: 'Contact', render: function (m) { return U.esc(m.contact || '—') + '<br><span class="td-muted">' + U.esc(m.email || '') + '</span>'; } },
      { key: 'skills', label: 'Skills', sortable: false, render: function (m) { return '<span class="td-muted">' + U.esc(U.truncate((m.skills || []).join(', '), 42) || '—') + '</span>'; } },
      {
        key: 'attendance', label: 'Attendance', sortable: false,
        render: function (m) {
          var s = attendanceStats(m.id);
          if (!s.total) return '<span class="td-muted">No records</span>';
          var tone = s.rate >= 75 ? 'success' : s.rate >= 60 ? 'warning' : 'danger';
          return '<span class="badge badge-' + tone + ' badge-soft">' + s.rate + '%</span>';
        }
      },
      { key: 'dateJoined', label: 'Joined', render: function (m) { return U.esc(U.fmtDate(m.dateJoined)); } }
    ],

    filters: [
      { key: 'membershipStatus', label: 'All statuses', options: M },
      { key: 'klass', label: 'All classes', options: Data.CLASSES },
      { key: 'gender', label: 'All genders', options: ['Male', 'Female'] },
      { key: 'clubRole', label: 'All club roles', options: ['Member', 'Team Lead', 'Course Assistant', 'President', 'Vice President', 'General Secretary', 'Treasurer', 'ICT Director'] }
    ],
    searchKeys: function (m) { return [m.fullName, m.memberId, m.klass, m.stream, m.clubRole, m.email, m.contact, m.studentNumber, (m.skills || []).join(' '), (m.interests || []).join(' '), m.notes]; },
    exportColumns: [
      { key: 'memberId', label: 'Member ID' }, { key: 'fullName', label: 'Full name' },
      { key: 'gender', label: 'Gender' }, { key: 'klass', label: 'Class' }, { key: 'stream', label: 'Stream' },
      { key: 'studentNumber', label: 'Student number' }, { key: 'contact', label: 'Contact' }, { key: 'email', label: 'Email' },
      { key: 'dateJoined', label: 'Date joined' }, { key: 'membershipStatus', label: 'Status' }, { key: 'clubRole', label: 'Club role' },
      { key: 'skills', label: 'Skills' }, { key: 'interests', label: 'Interests' }
    ],
    toolbarExtra: function () {
      return '<span data-member-view>' + UI.segmented([
        { key: 'table', label: 'Table', icon: 'list' },
        { key: 'cards', label: 'Cards', icon: 'grid' }
      ], state.view) + '</span>' +
        '<button type="button" class="btn btn-outline btn-sm" data-member-print>' + Icons.svg('print', { class: 'btn-ico' }) + 'Print register</button>' +
        (Auth.can('members', 'export') ? '<button type="button" class="btn btn-primary btn-sm" data-member-cards-btn>' + Icons.svg('id-card', { class: 'btn-ico' }) + 'Create member cards</button>' : '') +
        (Auth.can('members', 'create') ? '<button type="button" class="btn btn-outline btn-sm" data-member-import>' + Icons.svg('upload', { class: 'btn-ico' }) + 'Import CSV</button>' : '');
    },
    afterTable: function () { return '<div data-member-cards hidden></div>'; },
    empty: {
      icon: 'users', title: 'No members yet',
      message: 'Register the first club member to start tracking attendance, courses, projects and certificates.'
    },
    cascade: function (m) {
      // Remove the member's dependent records with a snapshot for undo.
      Store.removeWhere('attendance', function (a) { return a.memberId === m.id; });
      Store.removeWhere('enrollments', function (e) { return e.memberId === m.id; });
      Store.removeWhere('certificates', function (c) { return c.recipientId === m.id; });
      Store.removeWhere('cabinet', function (c) { return c.memberId === m.id; });
      Store.all('projects').forEach(function (p) {
        p.team = (p.team || []).filter(function (id) { return id !== m.id; });
        if (p.leaderId === m.id) p.leaderId = '';
      });
      Store.all('activities').forEach(function (a) {
        a.participants = (a.participants || []).filter(function (id) { return id !== m.id; });
      });
      Store.save('projects', true); Store.save('activities', true);
    },
    deleteDetails: 'Deleting a member also removes their attendance records, course enrolments, certificates and project memberships. The action can be undone immediately afterwards.',

    detailActions: function (m, moduleKey) {
      return '<button type="button" class="btn btn-outline btn-sm" data-detail-action="idcard">' + Icons.svg('id-card', { class: 'btn-ico' }) + 'Membership card</button>' +
        (Auth.can('members', 'export') ? '<button type="button" class="btn btn-outline btn-sm" data-detail-action="cardstudio">' + Icons.svg('grid', { class: 'btn-ico' }) + 'Card studio</button>' : '') +
        (Auth.can('certificates', 'create') ? '<button type="button" class="btn btn-outline btn-sm" data-detail-action="certificate">' + Icons.svg('award', { class: 'btn-ico' }) + 'Issue certificate</button>' : '') +
        (Auth.can('attendance', 'create') ? '<button type="button" class="btn btn-outline btn-sm" data-detail-action="attendance">' + Icons.svg('user-check', { class: 'btn-ico' }) + 'Attendance</button>' : '');
    },

    detailAvatar: function (m) {
      return '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">' + UI.avatar(m.fullName, 'xl') +
        '<div><p class="muted small">' + U.esc(m.memberId) + '</p></div></div>';
    },
    detailTitle: function (m) { return m.fullName; },
    detailSubtitle: function (m) { return m.klass + ' ' + (m.stream || '') + ' · ' + m.gender + ' · joined ' + U.fmtDate(m.dateJoined, 'long'); },
    detailBadges: function (m) {
      var pos = cabinetPosition(m.id);
      return UI.statusBadge(m.membershipStatus) +
        UI.badge(m.clubRole || 'Member', 'primary', { icon: 'user' }) +
        (pos ? UI.badge(pos, 'secondary', { icon: 'crown' }) : '') +
        (m.demo ? UI.demoChip() : '');
    },
    printDoc: function (m) { return { html: Print.memberProfile(m), title: 'Member profile — ' + m.fullName }; },

    detail: function (m) {
      var att = attendanceStats(m.id);
      var enrollments = Store.where('enrollments', function (e) { return e.memberId === m.id; })
        .sort(function (a, b) { return b.progress - a.progress; });
      var projects = Store.where('projects', function (p) { return p.leaderId === m.id || (p.team || []).indexOf(m.id) !== -1; });
      var activities = Store.where('activities', function (a) { return (a.participants || []).indexOf(m.id) !== -1; })
        .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
      var certs = Store.where('certificates', function (c) { return c.recipientId === m.id; });
      var achievements = Store.where('achievements', function (a) { return (a.memberIds || []).indexOf(m.id) !== -1; });
      var tasks = Store.where('tasks', function (t) { return t.assigneeId === m.id; });

      /* Personal information */
      var personal = UI.card({
        title: 'Personal information', icon: 'user',
        body: UI.kvGrid([
          { label: 'Member ID', value: m.memberId },
          { label: 'Student number', value: m.studentNumber },
          { label: 'Class & stream', value: m.klass + ' ' + (m.stream || '') },
          { label: 'Gender', value: m.gender },
          { label: 'Contact', html: m.contact ? '<a href="tel:' + U.attr(m.contact) + '">' + U.esc(m.contact) + '</a>' : '—' },
          { label: 'Email', html: m.email ? '<a href="mailto:' + U.attr(m.email) + '">' + U.esc(m.email) + '</a>' : '—' },
          { label: 'Date joined', value: U.fmtDate(m.dateJoined, 'long') },
          { label: 'Membership status', html: UI.statusBadge(m.membershipStatus) },
          { label: 'Length of membership', value: U.daysBetween(m.dateJoined, new Date()) + ' days' },
          { label: 'Record created', value: U.fmtDate(m.createdAt) }
        ]) +
        '<div class="divider-text mt-2"><span>Skills</span></div>' +
        (m.skills && m.skills.length ? UI.chipRow(m.skills) : '<p class="muted small">No skills recorded yet.</p>') +
        '<div class="divider-text mt-2"><span>Interests</span></div>' +
        (m.interests && m.interests.length ? UI.chipRow(m.interests) : '<p class="muted small">No interests recorded yet.</p>') +
        (m.bio ? '<div class="note-block mt-2">' + U.esc(m.bio) + '</div>' : '') +
        '<div class="divider-text mt-2"><span>Internal notes</span></div>' +
        '<p class="small">' + (m.notes ? U.esc(m.notes) : '<span class="muted">No notes recorded.</span>') + '</p>' +
        (Auth.can('members', 'edit') ? '<button type="button" class="btn btn-ghost btn-sm mt-1" data-detail-action="note">' + Icons.svg('edit', { class: 'btn-ico' }) + (m.notes ? 'Edit note' : 'Add note') + '</button>' : '')
      });

      /* Attendance */
      var attTone = att.rate >= 75 ? 'success' : att.rate >= 60 ? 'warning' : 'danger';
      var attendanceCard = UI.card({
        title: 'Attendance', icon: 'user-check', sub: att.total + ' recorded sessions',
        body: '<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">' +
            UI.progressRing(att.rate, { size: 108, color: attTone === 'success' ? '#12884f' : attTone === 'warning' ? '#b7791f' : '#d64545' }) +
            '<div style="flex:1;min-width:200px">' +
              UI.progressRow('Present', U.percent(att.present, att.total || 1), { valueText: att.present + ' sessions', tone: 'success' }) +
              UI.progressRow('Late', U.percent(att.late, att.total || 1), { valueText: att.late + ' sessions', tone: 'warning' }) +
              UI.progressRow('Excused', U.percent(att.excused, att.total || 1), { valueText: att.excused + ' sessions', tone: 'accent' }) +
              UI.progressRow('Absent', U.percent(att.absent, att.total || 1), { valueText: att.absent + ' sessions', tone: 'danger' }) +
            '</div>' +
          '</div>' +
          (att.rows.length
            ? '<div class="scroll-y-sm mt-2"><table class="stat-table"><thead><tr><th>Date</th><th>Session</th><th>Status</th></tr></thead><tbody>' +
              U.sortBy(att.rows, 'date', 'desc').slice(0, 10).map(function (r) {
                var ctx = r.contextType === 'meeting' ? Store.find('meetings', r.contextId)
                  : r.contextType === 'course' ? Store.find('courses', r.contextId)
                    : Store.find('activities', r.contextId);
                return '<tr><td>' + U.fmtDate(r.date) + '</td><td>' + U.esc(ctx ? (ctx.title || ctx.name) : 'Club session') +
                  ' <span class="td-muted">(' + U.esc(r.contextType) + ')</span></td><td>' + UI.statusBadge(r.status) + '</td></tr>';
              }).join('') + '</tbody></table></div>'
            : '<p class="muted small mt-2">No attendance has been recorded for this member yet.</p>'),
        foot: Auth.can('attendance', 'create') ? '<button type="button" class="link-btn" data-detail-action="attendance">Record attendance</button>' : ''
      });

      /* Courses */
      var coursesCard = UI.card({
        title: 'Courses', icon: 'graduation', sub: enrollments.length + ' enrolments',
        body: enrollments.length ? enrollments.map(function (e) {
          var c = Store.find('courses', e.courseId);
          if (!c) return '';
          return '<div class="progress-row mb-2">' +
            '<div class="pr-head"><strong><a href="#/courses/' + c.id + '">' + U.esc(c.name) + '</a></strong>' +
            '<span>' + e.progress + '% · ' + U.esc(e.grade || '—') + '</span></div>' +
            UI.progressBar(e.progress) +
            '<p class="xs muted mt-1">' + U.esc(c.level) + ' · ' + e.sessionsAttended + '/' + e.totalSessions + ' sessions · ' + U.esc(e.status) + '</p>' +
          '</div>';
        }).join('') : UI.emptyState({ icon: 'graduation', title: 'Not enrolled in any course', message: 'Course enrolments appear here once the training coordinator adds the member.' })
      });

      /* Projects */
      var projectsCard = UI.card({
        title: 'Projects', icon: 'kanban', sub: projects.length + ' projects',
        body: projects.length ? '<div class="list-rows">' + projects.map(function (p) {
          return '<a class="list-row clickable" href="#/projects/' + p.id + '">' +
            '<span class="tl-dot">' + Icons.svg('kanban') + '</span>' +
            '<span class="list-row-main"><strong>' + U.esc(p.name) + '</strong>' +
            '<span>' + (p.leaderId === m.id ? '<span class="badge badge-primary badge-soft">Project leader</span> ' : '') + U.esc(p.status) + ' · ' + p.progress + '% complete</span></span>' +
            '<span class="list-row-side">' + UI.progressBar(p.progress, { size: 'sm' }) + '</span></a>';
        }).join('') + '</div>' : UI.emptyState({ icon: 'kanban', title: 'No project involvement yet', message: 'Members who join project teams are listed here.' })
      });

      /* Activities */
      var activitiesCard = UI.card({
        title: 'Activities', icon: 'rocket', sub: activities.length + ' activities attended',
        body: activities.length ? '<div class="list-rows scroll-y-sm">' + activities.slice(0, 8).map(function (a) {
          return '<a class="list-row clickable" href="#/activities/' + a.id + '">' +
            '<span class="tl-dot accent">' + Icons.svg('rocket') + '</span>' +
            '<span class="list-row-main"><strong>' + U.esc(a.title) + '</strong><span>' + U.esc(a.type + ' · ' + U.fmtDate(a.date)) + '</span></span>' +
            '<span class="list-row-side">' + UI.statusBadge(a.status) + '</span></a>';
        }).join('') + '</div>' : UI.emptyState({ icon: 'rocket', title: 'No activities yet', message: 'Activities the member participates in will be listed here.' })
      });

      /* Certificates */
      var certsCard = UI.card({
        title: 'Certificates', icon: 'award', sub: certs.length + ' issued',
        body: certs.length ? '<div class="list-rows">' + certs.map(function (c) {
          return '<a class="list-row clickable" href="#/certificates/' + c.id + '">' +
            '<span class="tl-dot success">' + Icons.svg('award') + '</span>' +
            '<span class="list-row-main"><strong>' + U.esc(c.type) + '</strong><span class="mono">' + U.esc(c.certificateNumber) + '</span></span>' +
            '<span class="list-row-side">' + UI.statusBadge(c.status) + '</span></a>';
        }).join('') + '</div>' : UI.emptyState({ icon: 'award', title: 'No certificates yet', message: 'Issue a certificate from the record actions above.' })
      });

      /* Achievements + tasks */
      var achievementsCard = UI.card({
        title: 'Achievements', icon: 'trophy', sub: achievements.length + ' recorded',
        body: achievements.length ? '<div class="list-rows">' + achievements.map(function (a) {
          return '<a class="list-row clickable" href="#/achievements/' + a.id + '">' +
            '<span class="tl-dot warning">' + Icons.svg('trophy') + '</span>' +
            '<span class="list-row-main"><strong>' + U.esc(a.title) + '</strong><span>' + U.esc(a.category + ' · ' + U.fmtDate(a.date)) + '</span></span></a>';
        }).join('') + '</div>' : UI.emptyState({ icon: 'trophy', title: 'No achievements yet', message: 'Awards linked to this member will appear here.' })
      });

      var tasksCard = tasks.length ? UI.card({
        title: 'Assigned tasks', icon: 'check-square', sub: tasks.length + ' tasks',
        body: '<div class="list-rows">' + tasks.slice(0, 6).map(function (t) {
          return '<div class="list-row"><span class="tl-dot ' + (t.deadline < U.todayISO() && t.status !== 'Completed' ? 'danger' : '') + '">' + Icons.svg('check-square') + '</span>' +
            '<span class="list-row-main"><strong>' + U.esc(t.title) + '</strong><span>' + U.esc(t.status + ' · ' + U.dueLabel(t.deadline)) + '</span></span>' +
            '<span class="list-row-side">' + UI.badge(t.priority, U.tone(t.priority)) + '</span></div>';
        }).join('') + '</div>'
      }) : '';

      return '<div class="grid cols-2">' +
          personal + attendanceCard +
        '</div>' +
        '<div class="grid cols-2">' + coursesCard + projectsCard + '</div>' +
        '<div class="grid cols-2">' + activitiesCard + certsCard + '</div>' +
        '<div class="grid cols-2">' + achievementsCard + (tasksCard || '') + '</div>';
    },

    onDetailAction: function (action, btn, member) {
      if (action === 'idcard') {
        Cards.openOne(member, 'member');
      }
      if (action === 'cardstudio') {
        Cards.openStudio({ type: 'member', ids: [member.id] });
      }
      if (action === 'attendance') {
        Modules.Attendance.openRecorder({ memberId: member.id });
      }
      if (action === 'certificate') {
        Modules.Certificates.openForm({ recipientId: member.id });
      }
      if (action === 'note') {
        UI.modal({
          title: 'Internal note', subtitle: 'Notes are visible to cabinet members only.', icon: 'edit', size: 'sm',
          body: '<div class="field"><label for="member-note">Note for ' + U.esc(member.fullName) + '</label>' +
            '<textarea id="member-note" rows="5" placeholder="Add an observation about this member…">' + U.esc(member.notes || '') + '</textarea></div>',
          actions: [
            { label: 'Cancel', tone: 'ghost', onClick: function (c) { c.close(); } },
            {
              label: 'Save note', tone: 'primary', icon: 'save',
              onClick: function (c) {
                var val = c.modal.querySelector('#member-note').value.trim();
                Store.update('members', member.id, { notes: val });
                UI.toast('Note saved', 'The internal note has been updated.', 'success');
                c.close();
                Router.refresh();
              }
            }
          ]
        });
      }
    },

    onMount: function (ctx, root, table) {
      // View switcher (table / cards) plus CSV import
      var switcher = root.querySelector('[data-member-view]');
      if (switcher) {
        switcher.addEventListener('click', function (e) {
          var b = e.target.closest('[data-seg]');
          if (!b) return;
          state.view = b.getAttribute('data-seg');
          U.$$('[data-seg]', switcher).forEach(function (x) { x.classList.toggle('active', x === b); });
          renderCards(root, table);
        });
      }
      var importBtn = root.querySelector('[data-member-import]');
      if (importBtn) importBtn.addEventListener('click', function () { openImport(table); });
      var cardsBtn = root.querySelector('[data-member-cards-btn]');
      if (cardsBtn) cardsBtn.addEventListener('click', function () {
        var rows = table ? table.getFiltered() : Store.all('members');
        Cards.openStudio({ type: 'member', ids: rows.map(function (m) { return m.id; }) });
      });
      var printList = root.querySelector('[data-member-print]');
      if (printList) printList.addEventListener('click', function () {
        var rows = table ? table.getFiltered() : Store.all('members');
        Print.preview(Print.page(
          '<div class="print-doc-title"><h1>Club Member Register</h1><p>' + rows.length + ' members &middot; ' + U.fmtDate(new Date(), 'long') + '</p></div>' +
          '<table><thead><tr><th>#</th><th>Member ID</th><th>Name</th><th>Class</th><th>Status</th><th>Club role</th><th>Contact</th></tr></thead><tbody>' +
          rows.map(function (m, i) {
            return '<tr><td>' + (i + 1) + '</td><td>' + U.esc(m.memberId) + '</td><td>' + U.esc(m.fullName) + '</td><td>' + U.esc(m.klass + ' ' + (m.stream || '')) +
              '</td><td>' + U.esc(m.membershipStatus) + '</td><td>' + U.esc(m.clubRole) + '</td><td>' + U.esc(m.contact || '') + '</td></tr>';
          }).join('') + '</tbody></table>',
          { meta: 'Member register' }
        ), { title: 'Member register', fileName: 'mrhs-ict-member-register' });
      });
      renderCards(root, table);
    }
  };

  function renderCards(root, table) {
    var host = root.querySelector('[data-member-cards]');
    if (!host) return;
    if (state.view !== 'cards') { host.innerHTML = ''; host.hidden = true; return; }
    var rows = table ? table.getFiltered() : Store.all('members');
    host.hidden = false;
    state.rows = rows;
    host.innerHTML = rows.length ? '<div class="record-grid">' + rows.map(function (m) {
      var att = attendanceStats(m.id);
      var pos = cabinetPosition(m.id);
      return '<article class="record-card">' +
        '<div class="record-card-head">' + UI.avatar(m.fullName, 'lg') +
          '<div class="rc-main"><h3><a href="#/members/' + m.id + '">' + U.esc(m.fullName) + '</a></h3>' +
          '<p class="small muted">' + U.esc(m.memberId) + ' · ' + U.esc(m.klass + ' ' + (m.stream || '')) + '</p>' +
          '<div>' + UI.statusBadge(m.membershipStatus) + (pos ? ' ' + UI.badge(pos, 'secondary', { icon: 'crown' }) : '') + '</div>' +
          '</div></div>' +
        '<div class="record-card-body">' +
          UI.metaRow('mail', 'Email', U.esc(m.email || '—')) +
          UI.metaRow('phone', 'Contact', U.esc(m.contact || '—')) +
          UI.metaRow('calendar', 'Joined', U.fmtDate(m.dateJoined)) +
          '<div class="progress-row"><div class="pr-head"><strong>Attendance</strong><span>' + att.rate + '%</span></div>' + UI.progressBar(att.rate, { size: 'sm' }) + '</div>' +
        '</div>' +
        '<div class="record-card-foot">' +
          '<a class="btn btn-ghost btn-sm" href="#/members/' + m.id + '">' + Icons.svg('eye', { class: 'btn-ico' }) + 'View profile</a>' +
          (Auth.can('members', 'edit') ? '<button type="button" class="mini-btn" data-action="edit" data-id="' + m.id + '" title="Edit member">' + Icons.svg('edit') + '</button>' : '') +
        '</div></article>';
    }).join('') + '</div>' : UI.emptyState({ icon: 'users', title: 'No members match the current filters', message: 'Adjust the search or filters above.' });
  }

  function openImport(table) {
    UI.formModal({
      title: 'Import members from CSV', subtitle: 'Upload a CSV file exported from a spreadsheet.', icon: 'upload', size: 'sm',
      formHtml: Forms.render([
        { name: 'file', label: 'CSV file', type: 'file', accept: '.csv,text/csv', required: true, colSpan: 2 },
        { name: 'defaults', label: 'Default membership status', type: 'select', options: Data.MEMBER_STATUSES, value: 'Active', colSpan: 2 },
        { name: 'note', type: 'html', html: '<div class="alert alert-info">' + Icons.svg('info') + '<div><strong>Expected columns</strong>' +
          'Full name, Gender, Class, Stream, Contact, Email, Date joined (YYYY-MM-DD), Status. Unrecognised columns are ignored; missing values are left blank.</div></div>', colSpan: 2 }
      ]),
      submitLabel: 'Import members', submitIcon: 'upload',
      onOpen: function (c, form) { Forms.init(form); },
      onSubmit: function (data, c, formEl) {
        var input = formEl.querySelector('input[name="file"]');
        var f = input && input.files ? input.files[0] : null;
        if (!f) throw new Error('Choose a CSV file to import.');
        return CRUD.importCSV({
          file: f, collection: 'members', module: 'members',
          defaults: { membershipStatus: data.defaults || 'Active', clubRole: 'Member', skills: [], interests: [], demo: false },
          mapping: {
            'Full name': 'fullName', 'fullName': 'fullName', 'Name': 'fullName',
            'Gender': 'gender', 'Class': 'klass', 'Stream': 'stream',
            'Contact': 'contact', 'Phone': 'contact', 'Email': 'email',
            'Date joined': 'dateJoined', 'dateJoined': 'dateJoined',
            'Status': 'membershipStatus', 'Student number': 'studentNumber'
          },
          transform: function (rec) {
            var n = Store.all('members').length + 1;
            rec.memberId = rec.memberId || U.nextCode(Store.all('members'), 'memberId', Store.settings().memberIdPrefix || 'MRHS-ICT-M', 3);
            rec.dateJoined = rec.dateJoined || U.todayISO();
            rec.reliability = 0.82;
            return rec;
          },
          validateRow: function (rec) { return !!rec.fullName; }
        }).then(function (result) {
          UI.toast('Import finished', result.created + ' members imported' + (result.skipped ? ', ' + result.skipped + ' rows skipped.' : '.'), result.created ? 'success' : 'warning');
          if (table) table.refresh();
          if (result.errors.length) console.info('[Members] import issues', result.errors);
          return true;
        });
      }
    });
  }

  ModuleHelper.page(config);

  global.Modules = global.Modules || {};
  global.Modules.Members = {
    config: config,
    openForm: function (values) {
      if (values && values.id) return ModuleHelper.openEdit(config, Store.find('members', values.id));
      return ModuleHelper.openCreate(config);
    },
    attendanceStats: attendanceStats,
    cabinetPosition: cabinetPosition,
    fullLabel: fullLabel,
    refresh: function () { var t = document.querySelector('#module-table'); Router.refresh(); }
  };
})(window);
