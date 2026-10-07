/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/courses.js
   The club learning section: course catalogue, lesson plans, enrolment,
   progress tracking, session attendance and certificate eligibility.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  function lessonsFor(courseId) {
    return U.sortBy(Store.where('lessons', function (l) { return l.courseId === courseId; }), 'order');
  }
  function enrolled(courseId) {
    return Store.where('enrollments', function (e) { return e.courseId === courseId; })
      .map(function (e) {
        var m = Store.find('members', e.memberId);
        return { enrollment: e, member: m };
      }).filter(function (x) { return x.member; });
  }
  function completion(courseId) {
    var rows = Store.where('enrollments', function (e) { return e.courseId === courseId; });
    if (!rows.length) return 0;
    return Math.round(U.avg(rows.map(function (r) { return r.progress; })) || 0);
  }
  function eligible(courseId) {
    return Store.where('enrollments', function (e) { return e.courseId === courseId && e.progress >= 80; });
  }

  /* ══ List ═════════════════════════════════════════════════════════════ */
  var config = {
    key: 'courses',
    title: 'Courses',
    singular: 'course',
    icon: 'graduation',
    module: 'courses',
    collection: 'courses',
    subtitle: 'ICT Club training programmes, lesson plans, enrolments and completion tracking.',
    stats: function () {
      var c = Metrics.courses();
      return [
        { label: 'Courses offered', value: U.num(c.total), icon: 'graduation', tone: 'primary', foot: c.ongoing + ' running now' },
        { label: 'Enrolments', value: U.num(c.enrollments), icon: 'users', tone: 'secondary', foot: c.completedEnrollments + ' completed' },
        { label: 'Average completion', value: c.avgCompletion + '%', icon: 'trending-up', tone: c.avgCompletion >= 60 ? 'success' : 'warning', foot: 'Across all courses' },
        { label: 'Lessons planned', value: U.num(Store.count('lessons')), icon: 'book-open', tone: 'accent', foot: 'Delivered and scheduled' }
      ];
    },
    schema: function (values) {
      return [
        { name: 'name', label: 'Course name', type: 'text', required: true, colSpan: 2, placeholder: 'e.g. HTML & CSS' },
        { name: 'category', label: 'Category', type: 'select', options: Data.COURSE_CATEGORIES, value: 'Programming', required: true },
        { name: 'level', label: 'Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'], value: 'Beginner', required: true },
        { name: 'instructor', label: 'Instructor', type: 'text', required: true, placeholder: 'Who will deliver the training?' },
        { name: 'duration', label: 'Duration', type: 'text', value: '8 weeks', required: true, placeholder: 'e.g. 8 weeks' },
        { name: 'sessions', label: 'Number of sessions', type: 'number', min: 1, max: 60, value: 8 },
        { name: 'capacity', label: 'Maximum enrolment', type: 'number', min: 1, max: 200, value: 30 },
        { name: 'startDate', label: 'Start date', type: 'date', required: true, value: U.todayISO() },
        { name: 'endDate', label: 'End date', type: 'date', required: true, compareField: 'startDate', compare: 'after', compareLabel: 'the start date' },
        { name: 'status', label: 'Status', type: 'select', options: ['Planned', 'Ongoing', 'Completed', 'Cancelled'], value: 'Planned', required: true },
        { name: 'certificateEligible', label: 'Certificate eligibility at 80% completion', type: 'switch', switchLabel: 'Award certificates to members who reach 80%', value: true, colSpan: 2 },
        { name: 'description', label: 'Course description', type: 'textarea', colSpan: 2, rows: 4, required: true },
        { name: 'outcomes', label: 'Learning outcomes', type: 'textarea', colSpan: 2, rows: 3, help: 'What will members be able to do at the end of the course?' }
      ];
    },
    transform: function (data, values) {
      return {
        name: data.name, description: data.description, instructor: data.instructor,
        level: data.level, duration: data.duration, category: data.category,
        startDate: data.startDate, endDate: data.endDate, status: data.status,
        sessions: Number(data.sessions) || 8, capacity: Number(data.capacity) || 30,
        certificateEligible: !!data.certificateEligible, outcomes: data.outcomes,
        demo: values.demo === true
      };
    },
    beforeSave: function (data) {
      if (data.endDate && data.startDate && data.endDate < data.startDate) {
        return { endDate: 'The end date must be after the start date.' };
      }
      return null;
    },
    afterSave: function (rec) {
      rec.completionRate = completion(rec.id);
      Store.save('courses', true);
    },
    columns: [
      {
        key: 'name', label: 'Course',
        render: function (c) {
          return '<a href="#/courses/' + c.id + '" class="td-strong">' + U.esc(c.name) + '</a>' +
            '<br><span class="td-muted">' + U.esc(c.courseId) + ' · ' + U.esc(c.category) + '</span>';
        }
      },
      { key: 'level', label: 'Level', render: function (c) { return UI.badge(c.level, c.level === 'Advanced' ? 'danger' : c.level === 'Intermediate' ? 'warning' : 'info'); } },
      { key: 'instructor', label: 'Instructor', render: function (c) { return U.esc(c.instructor); } },
      { key: 'duration', label: 'Duration', render: function (c) { return U.esc(c.duration) + '<br><span class="td-muted">' + c.sessions + ' sessions</span>'; } },
      {
        key: 'period', label: 'Dates', sortable: true, sortValue: 'startDate',
        render: function (c) { return U.fmtDate(c.startDate) + '<br><span class="td-muted">to ' + U.fmtDate(c.endDate) + '</span>'; }
      },
      {
        key: 'enrolment', label: 'Enrolled', sortable: false,
        render: function (c) {
          var n = Store.count('enrollments', function (e) { return e.courseId === c.id; });
          return '<strong>' + n + '</strong> / ' + c.capacity + '<br><span class="td-muted">' + Math.round((n / (c.capacity || 1)) * 100) + '% full</span>';
        }
      },
      {
        key: 'completionRate', label: 'Completion', sortable: true,
        render: function (c) {
          var pct = completion(c.id);
          return UI.progressBar(pct, { size: 'sm' }) + '<span class="xs muted">' + pct + '%</span>';
        }
      },
      { key: 'status', label: 'Status', render: function (c) { return UI.statusBadge(c.status); } }
    ],
    filters: [
      { key: 'status', label: 'All statuses', options: ['Planned', 'Ongoing', 'Completed', 'Cancelled'] },
      { key: 'level', label: 'All levels', options: ['Beginner', 'Intermediate', 'Advanced'] },
      { key: 'category', label: 'All categories', options: Data.COURSE_CATEGORIES }
    ],
    searchKeys: function (c) { return [c.name, c.courseId, c.instructor, c.level, c.category, c.description, c.outcomes]; },
    exportColumns: [
      { value: function (c) { return c.courseId; }, label: 'Course ID' }, { key: 'name', label: 'Course' },
      { key: 'category', label: 'Category' }, { key: 'level', label: 'Level' }, { key: 'instructor', label: 'Instructor' },
      { key: 'duration', label: 'Duration' }, { key: 'sessions', label: 'Sessions' }, { key: 'startDate', label: 'Start' },
      { key: 'endDate', label: 'End' }, { key: 'status', label: 'Status' },
      { value: function (c) { return Store.count('enrollments', function (e) { return e.courseId === c.id; }); }, label: 'Enrolled' },
      { value: function (c) { return completion(c.id) + '%'; }, label: 'Completion' }
    ],
    rowActions: function (c) {
      var out = CRUD.viewBtn('#/courses/' + c.id, 'course');
      if (Auth.can('courses', 'edit')) out += CRUD.actionBtn('edit', c.id, 'edit', 'Edit course');
      if (Auth.can('courses', 'edit')) out += CRUD.actionBtn('enrol', c.id, 'user-plus', 'Manage enrolment');
      if (Auth.can('courses', 'delete')) out += CRUD.actionBtn('delete', c.id, 'trash', 'Delete course', 'danger');
      return out;
    },
    onRowAction: function (action, c, table) {
      if (action === 'enrol') openEnrolment(c, function () { if (table) table.refresh(); });
    },
    empty: { icon: 'graduation', title: 'No courses yet', message: 'Create the first training course to start enrolling members and tracking progress.' },
    cascade: function (c) {
      Store.removeWhere('enrollments', function (e) { return e.courseId === c.id; });
      Store.removeWhere('lessons', function (l) { return l.courseId === c.id; });
      Store.removeWhere('attendance', function (a) { return a.contextType === 'course' && a.contextId === c.id; });
    },
    deleteDetails: 'Lessons, enrolments and course attendance records for this course will also be deleted.',

    detailTitle: function (c) { return c.name; },
    detailSubtitle: function (c) { return c.courseId + ' · ' + c.level + ' · ' + c.duration + ' · ' + c.instructor; },
    detailBadges: function (c) {
      return UI.statusBadge(c.status) + UI.badge(c.category, 'secondary', { icon: 'layers' }) +
        UI.badge(c.levels || c.level, 'neutral') + (c.demo ? UI.demoChip() : '');
    },
    detailActions: function (c) {
      return (Auth.can('courses', 'edit') ? '<button type="button" class="btn btn-primary btn-sm" data-detail-action="enrol">' + Icons.svg('user-plus', { class: 'btn-ico' }) + 'Manage enrolment</button>' : '') +
        (Auth.can('courses', 'edit') ? '<button type="button" class="btn btn-outline btn-sm" data-detail-action="lesson">' + Icons.svg('plus', { class: 'btn-ico' }) + 'Add lesson</button>' : '') +
        (Auth.can('attendance', 'create') ? '<button type="button" class="btn btn-outline btn-sm" data-detail-action="attendance">' + Icons.svg('user-check', { class: 'btn-ico' }) + 'Attendance</button>' : '');
    },
    detail: function (c) {
      var rows = enrolled(c.id);
      var lessons = lessonsFor(c.id);
      var pct = completion(c.id);
      var att = CRUD.attendanceRate('course', c.id);
      var readyForCert = eligible(c.id);

      var overview = UI.card({
        title: 'Course information', icon: 'info',
        body: UI.kvGrid([
          { label: 'Course ID', value: c.courseId },
          { label: 'Category', value: c.category },
          { label: 'Level', value: c.level },
          { label: 'Instructor', value: c.instructor },
          { label: 'Duration', value: c.duration },
          { label: 'Sessions', value: c.sessions },
          { label: 'Starts', value: U.fmtDate(c.startDate, 'long') },
          { label: 'Ends', value: U.fmtDate(c.endDate, 'long') },
          { label: 'Capacity', value: c.capacity + ' members' },
          { label: 'Status', html: UI.statusBadge(c.status) },
          { label: 'Certificate eligibility', html: c.certificateEligible ? UI.badge('At 80% completion', 'success', { icon: 'award' }) : UI.badge('Not applicable', 'neutral') }
        ]) +
        '<div class="mt-2"><strong class="small">Description</strong><p class="small" style="white-space:pre-line">' + U.esc(c.description || '—') + '</p></div>' +
        (c.outcomes ? '<div class="note-block mt-2"><strong>Learning outcomes</strong><br>' + U.esc(c.outcomes) + '</div>' : '') +
        '<div class="mt-2">' + UI.progressRow('Average completion', pct) + '</div>' +
        (att ? '<div class="mt-1">' + UI.progressRow('Session attendance', att.rate, { valueText: att.present + att.late + '/' + att.total }) + '</div>' : '')
      });

      var lessonsCard = UI.card({
        title: 'Lessons', icon: 'book-open', sub: lessons.length + ' lessons',
        head: Auth.can('courses', 'edit') ? '<button type="button" class="link-btn xs" data-detail-action="lesson">' + Icons.svg('plus') + ' Add lesson</button>' : '',
        flush: true,
        body: lessons.length ? '<div class="list-rows">' + lessons.map(function (l) {
          var delivered = l.date <= U.todayISO();
          return '<div class="list-row">' +
            '<span class="tl-dot ' + (delivered ? 'success' : '') + '">' + Icons.svg(delivered ? 'check' : 'clock') + '</span>' +
            '<span class="list-row-main"><strong>' + l.order + '. ' + U.esc(l.title) + '</strong>' +
            '<span>' + U.esc(l.duration) + ' · ' + U.fmtDate(l.date) + (l.objectives ? ' · ' + U.esc(U.truncate(l.objectives, 70)) : '') + '</span></span>' +
            '<span class="list-row-side">' + UI.statusBadge(delivered ? 'Delivered' : 'Scheduled') +
              (Auth.can('courses', 'edit') ? ' <button type="button" class="mini-btn" data-lesson-edit="' + l.id + '" title="Edit lesson">' + Icons.svg('edit') + '</button>' : '') +
              (Auth.can('courses', 'delete') ? ' <button type="button" class="mini-btn danger" data-lesson-del="' + l.id + '" title="Delete lesson">' + Icons.svg('trash') + '</button>' : '') +
            '</span></div>';
        }).join('') + '</div>' : UI.emptyState({ icon: 'book-open', title: 'No lessons yet', message: 'Add lesson topics so members can follow the course structure.' })
      });

      var rosterCard = UI.card({
        title: 'Enrolled members', icon: 'users', sub: rows.length + ' / ' + c.capacity + ' places used',
        head: Auth.can('courses', 'edit') ? '<button type="button" class="link-btn xs" data-detail-action="enrol">' + Icons.svg('user-plus') + ' Manage</button>' : '',
        body: rows.length
          ? UI.progressRow('Places filled', U.percent(rows.length, c.capacity)) +
            '<div class="scroll-y-sm mt-2"><table class="stat-table"><thead><tr><th>Member</th><th>Progress</th><th>Grade</th><th>Status</th></tr></thead><tbody>' +
            U.sortBy(rows, function (x) { return x.member.fullName; }).map(function (x) {
              return '<tr><td><a href="#/members/' + x.member.id + '">' + U.esc(x.member.fullName) + '</a>' +
                '<br><span class="td-muted">' + U.esc(x.member.klass) + '</span></td>' +
                '<td style="min-width:110px">' + UI.progressBar(x.enrollment.progress, { size: 'sm' }) + '<span class="xs muted">' + x.enrollment.progress + '%</span></td>' +
                '<td>' + U.esc(x.enrollment.grade || '—') + '</td>' +
                '<td>' + UI.statusBadge(x.enrollment.status) + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : UI.emptyState({
              icon: 'users', title: 'No members enrolled',
              message: 'Enrol members to begin tracking their progress through this course.',
              actions: Auth.can('courses', 'edit') ? '<button type="button" class="btn btn-primary btn-sm" data-detail-action="enrol">' + Icons.svg('user-plus', { class: 'btn-ico' }) + 'Manage enrolment</button>' : ''
            })
      });

      var certCard = UI.card({
        title: 'Certificate eligibility', icon: 'award',
        sub: readyForCert.length + ' members at 80% or above',
        body: readyForCert.length
          ? '<div class="list-rows">' + readyForCert.map(function (e) {
              var m = Store.find('members', e.memberId);
              return '<div class="list-row"><span class="tl-dot success">' + Icons.svg('award') + '</span>' +
                '<span class="list-row-main"><strong>' + U.esc(m ? m.fullName : 'Member') + '</strong>' +
                '<span>' + e.progress + '% complete · grade ' + U.esc(e.grade || '—') + '</span></span>' +
                '<span class="list-row-side">' +
                (Auth.can('certificates', 'create')
                  ? '<button type="button" class="btn btn-outline btn-sm" data-issue-cert="' + e.memberId + '">' + Icons.svg('award', { class: 'btn-ico' }) + 'Issue</button>'
                  : UI.badge('Eligible', 'success')) +
                '</span></div>';
            }).join('') + '</div>'
          : '<p class="muted small">' + (c.certificateEligible
              ? 'No member has reached the 80% completion mark yet.'
              : 'This course is not configured to award certificates.') + '</p>'
      });

      return '<div class="grid cols-2">' + overview + rosterCard + '</div>' +
        '<div class="grid cols-2">' + lessonsCard + certCard + '</div>';
    },
    onDetailAction: function (action, btn, c) {
      if (action === 'enrol') openEnrolment(c, function () { Router.refresh(); });
      if (action === 'lesson') openLesson(c);
      if (action === 'attendance') Modules.Attendance.openRecorder({ contextType: 'course', contextId: c.id });
    },
    onDetailMount: function (ctx, root, c) {
      root.addEventListener('click', function (e) {
        var edit = e.target.closest('[data-lesson-edit]');
        if (edit) { openLesson(c, Store.find('lessons', edit.getAttribute('data-lesson-edit'))); return; }
        var del = e.target.closest('[data-lesson-del]');
        if (del) {
          CRUD.remove({
            collection: 'lessons', id: del.getAttribute('data-lesson-del'), module: 'courses',
            label: 'lesson', title: 'Delete lesson', message: 'Remove this lesson from the course plan?',
            done: true, after: function () { Router.refresh(); }
          });
          return;
        }
        var cert = e.target.closest('[data-issue-cert]');
        if (cert) Modules.Certificates.openForm({ recipientId: cert.getAttribute('data-issue-cert'), courseId: c.id });
      });
    },
    printDoc: null
  };

  /* ══ Lesson form ══════════════════════════════════════════════════════ */
  function openLesson(course, lesson) {
    var editing = !!lesson;
    var nextOrder = lessonsFor(course.id).length + 1;
    UI.formModal({
      title: editing ? 'Edit lesson' : 'Add a lesson',
      subtitle: course.name,
      icon: 'book-open', size: 'sm',
      formHtml: Forms.render([
        { name: 'title', label: 'Lesson topic', type: 'text', required: true, colSpan: 2, value: editing ? lesson.title : '' },
        { name: 'order', label: 'Lesson number', type: 'number', min: 1, max: 60, value: editing ? lesson.order : nextOrder },
        { name: 'duration', label: 'Duration', type: 'text', value: editing ? lesson.duration : '60 min' },
        { name: 'date', label: 'Scheduled date', type: 'date', value: editing ? lesson.date : U.todayISO() },
        { name: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'Delivered'], value: editing ? lesson.status : 'Scheduled' },
        { name: 'objectives', label: 'Learning objectives', type: 'textarea', rows: 3, colSpan: 2, value: editing ? lesson.objectives : '' },
        { name: 'notes', label: 'Lesson notes / materials', type: 'textarea', rows: 3, colSpan: 2, value: editing ? lesson.notes : '' }
      ]),
      submitLabel: editing ? 'Save lesson' : 'Add lesson',
      onOpen: function (c, form) { Forms.init(form); },
      onSubmit: function (data) {
        var payload = {
          courseId: course.id, title: data.title, order: Number(data.order) || nextOrder,
          duration: data.duration, date: data.date, status: data.status,
          objectives: data.objectives, notes: data.notes, demo: editing ? lesson.demo : false
        };
        if (editing) Store.update('lessons', lesson.id, payload);
        else Store.insert('lessons', payload);
        UI.toast(editing ? 'Lesson updated' : 'Lesson added', payload.title + ' has been saved to the course plan.', 'success');
        Router.refresh();
      }
    });
  }

  /* ══ Enrolment manager ════════════════════════════════════════════════ */
  function openEnrolment(course, after) {
    if (!CRUD.guard('courses', 'edit')) return;
    var members = U.sortBy(Store.all('members').filter(function (m) { return m.membershipStatus !== 'Alumni'; }), 'fullName');
    var current = Store.where('enrollments', function (e) { return e.courseId === course.id; });
    var map = {};
    current.forEach(function (e) { map[e.memberId] = e; });

    var ctrl = UI.modal({
      title: 'Manage enrolment',
      subtitle: course.name + ' · ' + current.length + ' of ' + course.capacity + ' places used',
      icon: 'user-plus', size: 'lg',
      body: '<div class="search-field mb-2" style="max-width:none">' + Icons.svg('search') +
          '<input type="search" id="enrol-search" placeholder="Search members by name or class…" aria-label="Search members"></div>' +
        '<div class="check-list" id="enrol-list" style="max-height:340px">' + members.map(function (m) {
          var e = map[m.id];
          return '<label class="check" data-enrol-row data-name="' + U.attr(U.norm(m.fullName + ' ' + m.klass + ' ' + m.memberId)) + '">' +
            '<input type="checkbox" value="' + m.id + '"' + (e ? ' checked' : '') + '>' +
            '<span>' + U.esc(m.fullName) + ' <span class="muted">· ' + U.esc(m.klass + ' ' + (m.stream || '')) + '</span>' +
            (e ? ' <span class="badge badge-success badge-soft">' + e.progress + '%</span>' : '') + '</span></label>';
        }).join('') + '</div>' +
        '<p class="help mt-1">Progress for newly enrolled members starts at 0% and can be updated from the member row in the roster.</p>',
      actions: [
        { label: 'Cancel', tone: 'ghost', onClick: function (c) { c.close(); } },
        { label: 'Save enrolment', tone: 'primary', icon: 'save', onClick: function (c) {
            var boxes = U.$$('#enrol-list input[type="checkbox"]', c.modal);
            var keep = boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
            var added = 0, removed = 0;
            boxes.forEach(function (b) {
              var existing = map[b.value];
              if (b.checked && !existing) {
                Store.insert('enrollments', {
                  demo: false, courseId: course.id, memberId: b.value, enrolledOn: U.todayISO(),
                  progress: 0, sessionsAttended: 0, totalSessions: course.sessions || 8,
                  status: 'Enrolled', grade: '—', completedOn: ''
                });
                added++;
              } else if (!b.checked && existing) {
                Store.remove('enrollments', existing.id);
                removed++;
              }
            });
            UI.toast('Enrolment updated', added + ' added, ' + removed + ' removed. ' + keep.length + ' members enrolled in total.', 'success');
            c.close();
            if (after) after();
          } }
      ]
    });
    var search = ctrl.modal.querySelector('#enrol-search');
    search.addEventListener('input', U.debounce(function () {
      var q = U.norm(search.value);
      U.$$('[data-enrol-row]', ctrl.modal).forEach(function (row) {
        row.hidden = q && row.getAttribute('data-name').indexOf(q) === -1;
      });
    }, 160));
    return ctrl;
  }

  ModuleHelper.page(config);

  global.Modules = global.Modules || {};
  global.Modules.Courses = {
    config: config,
    openForm: function (values) {
      if (values && values.id) return ModuleHelper.openEdit(config, Store.find('courses', values.id));
      return ModuleHelper.openCreate(config);
    },
    openLesson: openLesson,
    openEnrolment: openEnrolment,
    completion: completion,
    lessonsFor: lessonsFor,
    enrolled: enrolled
  };
})(window);
