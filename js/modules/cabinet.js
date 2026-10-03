/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/cabinet.js
   Club leadership: position holders, responsibilities, terms, the visual
   organisational hierarchy and the archive of previous cabinets.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;
  var state = { tab: 'directory' };

  function sorted() { return U.sortBy(Store.all('cabinet'), 'order'); }
  function byPosition(pos) { return U.findBy(Store.all('cabinet'), 'position', (pos || '').toLowerCase()); }

  function TIER(rec) {
    if (/patron/i.test(rec.position)) return 1;
    if (/(president|vice|secretary|treasurer)/i.test(rec.position) && !/assistant/i.test(rec.position)) return 2;
    if (/assistant secretary/i.test(rec.position)) return 2;
    return 3;
  }

  /* ══ Directory table ═══════════════════════════════════════════════════ */
  function directoryHTML() {
    var rows = sorted();
    if (!rows.length) {
      return UI.emptyState({
        icon: 'crown', title: 'No cabinet positions yet',
        message: 'Appoint club leaders to build the cabinet and publish the organisational structure.',
        actions: Auth.can('cabinet', 'create') ? '<button type="button" class="btn btn-primary" data-cab="new">' + Icons.svg('plus', { class: 'btn-ico' }) + 'Appoint a leader</button>' : ''
      });
    }
    var grouped = U.groupBy(rows, function (r) { return TIER(r); });
    var labels = { 1: 'Patron', 2: 'Executive committee', 3: 'Officers and representatives' };
    var html = '';
    [1, 2, 3].forEach(function (tier) {
      if (!grouped[tier]) return;
      html += '<div class="mt-2"><p class="nav-section-label" style="color:var(--text-3)">' + U.esc(labels[tier]) + '</p>' +
        '<div class="record-grid" style="padding:0">' + grouped[tier].map(function (c) {
          return '<article class="record-card">' +
            '<div class="record-card-head">' + UI.avatar(c.name, 'lg') +
              '<div class="rc-main"><h3><a href="#/cabinet/' + c.id + '">' + U.esc(c.name) + '</a></h3>' +
              '<p class="small" style="color:var(--primary-600);font-weight:650">' + U.esc(c.position) + '</p>' +
              '<div>' + UI.statusBadge(c.status) + ' ' + UI.badge(c.term, 'neutral') + '</div>' +
            '</div></div>' +
            '<div class="record-card-body">' +
              UI.metaRow('calendar-plus', 'Appointed', U.fmtDate(c.appointmentDate)) +
              UI.metaRow('mail', 'Email', U.esc(c.email || '—')) +
              '<p class="small muted" style="white-space:normal">' + U.esc(U.truncate(c.responsibilities, 132)) + '</p>' +
            '</div>' +
            '<div class="record-card-foot">' +
              '<a class="link-btn xs" href="#/cabinet/' + c.id + '">' + Icons.svg('eye') + ' View details</a>' +
              (Auth.can('cabinet', 'edit') ? '<button type="button" class="mini-btn" data-cab="edit" data-id="' + c.id + '" title="Edit position">' + Icons.svg('edit') + '</button>' : '') +
            '</div></article>';
        }).join('') + '</div></div>';
    });
    return html;
  }

  /* ══ Organisational chart ══════════════════════════════════════════════ */
  function orgChartHTML() {
    var rows = sorted();
    if (!rows.length) return UI.emptyState({ icon: 'crown', title: 'No cabinet to display', message: 'Appoint leaders to see the organisational hierarchy.' });
    var patron = rows.filter(function (r) { return TIER(r) === 1; });
    var exec = rows.filter(function (r) { return TIER(r) === 2; });
    var officers = rows.filter(function (r) { return TIER(r) === 3; });

    function node(r, extra) {
      return '<a class="org-node ' + (extra || '') + '" href="#/cabinet/' + r.id + '">' +
        UI.avatar(r.name, 'sm') +
        '<span class="org-node-text"><strong>' + U.esc(r.name) + '</strong><span>' + U.esc(r.position) + '</span></span></a>';
    }
    return '<div class="org-tree">' +
      '<div class="org-level">' + patron.map(function (r) { return node(r, 'tier-1'); }).join('') + '</div>' +
      '<div class="org-connector" aria-hidden="true"></div>' +
      '<div class="org-level">' + exec.map(function (r) { return node(r, 'tier-2'); }).join('') + '</div>' +
      (officers.length ? '<div class="org-connector" aria-hidden="true"></div>' +
        '<div class="org-level">' + officers.map(function (r) { return node(r); }).join('') + '</div>' : '') +
      '<p class="muted small text-center mt-2">Members of the cabinet are elected each academic year and serve for one term of office. ' +
        'The patron is appointed by the school administration.</p>' +
    '</div>';
  }

  /* ══ History ══════════════════════════════════════════════════════════ */
  function historyTable() {
    var rows = U.sortBy(Store.all('cabinetHistory'), 'fromDate', 'desc');
    if (!rows.length) return UI.emptyState({ icon: 'history', title: 'No cabinet history yet', message: 'When a cabinet is replaced, the outgoing leadership is recorded here.' });
    return '<div class="table-wrap stacked"><table class="data-table"><thead><tr>' +
      '<th>Member</th><th>Position</th><th>Term</th><th>From</th><th>To</th><th>Note</th>' +
      (Auth.can('cabinet', 'delete') ? '<th class="col-actions">Actions</th>' : '') + '</tr></thead><tbody>' +
      rows.map(function (h) {
        return '<tr><td class="cell-primary">' + U.esc(h.name) + '</td>' +
          '<td data-label="Position">' + U.esc(h.position) + '</td>' +
          '<td data-label="Term">' + U.esc(h.term) + '</td>' +
          '<td data-label="From">' + U.fmtDate(h.fromDate) + '</td>' +
          '<td data-label="To">' + (h.toDate ? U.fmtDate(h.toDate) : '<span class="badge badge-success badge-soft">Current</span>') + '</td>' +
          '<td data-label="Note"><span class="td-muted">' + U.esc(h.note || '—') + '</span></td>' +
          (Auth.can('cabinet', 'delete') ? '<td class="col-actions" data-label="Actions"><div class="row-actions">' +
            '<button type="button" class="mini-btn danger" data-history-del="' + h.id + '" title="Delete history entry">' + Icons.svg('trash') + '</button></div></td>' : '') +
        '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ══ Forms ════════════════════════════════════════════════════════════ */
  function schema(values) {
    return [
      { name: 'position', label: 'Position', type: 'select', required: true, options: Data.CABINET_ORDER, value: values.position || 'Class Representative' },
      { name: 'memberId', label: 'Position holder (registered member)', type: 'member', help: 'Leave blank for a patron or an external appointment.' },
      { name: 'name', label: 'Holder name (external appointment)', type: 'text', placeholder: 'e.g. Mr. Julius Kagimu', help: 'Used only when no registered member is selected.' },
      { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
      { name: 'appointmentDate', label: 'Appointment date', type: 'date', required: true, value: values.appointmentDate || U.todayISO(), max: U.todayISO() },
      { name: 'term', label: 'Term of office', type: 'text', value: values.term || ((Store.settings().academicYear || '2026') + ' Academic Year'), required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive', 'Alumni'], value: values.status || 'Active' },
      { name: 'responsibilities', label: 'Responsibilities', type: 'textarea', colSpan: 2, rows: 4, required: true, placeholder: 'Describe what this position is responsible for…' },
      { name: 'contact', label: 'Contact phone', type: 'tel' },
      { name: 'email', label: 'Email address', type: 'email' },
      { name: 'achievements', label: 'Notable contributions this term', type: 'textarea', colSpan: 2, rows: 3 }
    ];
  }

  function openForm(values) {
    var editing = values && values.id;
    return CRUD.openForm({
      mode: editing ? 'edit' : 'create', collection: 'cabinet', module: 'cabinet', values: values || {},
      title: editing ? 'Edit cabinet position' : 'Appoint a cabinet member',
      subtitle: editing ? values.position + ' · ' + values.name : 'Assign a registered member or record an external appointment.',
      icon: 'crown',
      schema: schema,
      beforeSave: function (data) {
        if (!data.memberId && !String(data.name || '').trim()) return { memberId: 'Select a registered member or enter the holder’s name.' };
        var clash = U.findBy(Store.all('cabinet'), function (c) {
          return (!values || c.id !== values.id) && U.norm(c.position) === U.norm(data.position);
        });
        if (clash) return { position: 'The position “' + data.position + '” is already held by ' + clash.name + '. Edit that record instead, or choose a different position.' };
        return null;
      },
      transform: function (data, current) {
        var member = data.memberId ? Store.find('members', data.memberId) : null;
        var order = Data.CABINET_ORDER.indexOf(data.position);
        return {
          position: data.position,
          order: order === -1 ? 99 : order,
          memberId: data.memberId || current.memberId || ('external-' + U.slug(data.name || 'appointee')),
          name: member ? member.fullName : String(data.name || '').trim(),
          gender: data.gender || (member ? member.gender : ''),
          appointmentDate: data.appointmentDate,
          term: data.term,
          status: data.status,
          responsibilities: data.responsibilities,
          contact: data.contact || (member ? member.contact : ''),
          email: data.email || (member ? member.email : ''),
          achievements: data.achievements,
          demo: current.demo === true
        };
      },
      onSaved: function (rec, data, c) {
        // Keep the member profile's club role in step with the cabinet position
        var memberId = data.memberId;
        if (memberId && Store.find('members', memberId)) {
          var roleLabel = /president/i.test(rec.position) && !/vice/i.test(rec.position) ? 'President'
            : /vice president/i.test(rec.position) ? 'Vice President'
              : /assistant secretary/i.test(rec.position) ? 'Assistant Secretary'
                : /general secretary/i.test(rec.position) ? 'General Secretary'
                  : /treasurer/i.test(rec.position) ? 'Treasurer'
                    : /technical|ict/i.test(rec.position) ? 'ICT Director'
                      : /projects/i.test(rec.position) ? 'Projects Coordinator'
                        : /training/i.test(rec.position) ? 'Training Coordinator'
                          : /events/i.test(rec.position) ? 'Events Coordinator'
                            : /publicity|communication/i.test(rec.position) ? 'Publicity Officer'
                              : /welfare/i.test(rec.position) ? 'Welfare Officer'
                                : 'Class Representative';
          Store.update('members', memberId, { clubRole: roleLabel });
        }
        if (editing && (values.name !== rec.name || values.position !== rec.position)) {
          Store.insert('cabinetHistory', {
            demo: rec.demo === true, position: values.position, name: values.name, term: values.term,
            fromDate: values.appointmentDate, toDate: U.todayISO(),
            note: 'Recorded automatically when the position was reassigned.'
          });
        }
        if (!editing) {
          Notification('New cabinet appointment', rec.name + ' has been appointed as ' + rec.position + '.', 'crown');
        }
      },
      onOpen: function (c, form, vals) {
        // Pre-fill the holder's name when a member is chosen
        var sel = form.querySelector('[name="memberId"]');
        var nameField = form.querySelector('[name="name"]');
        if (sel) sel.addEventListener('change', function () {
          var m = Store.find('members', sel.value);
          if (m && nameField) { nameField.value = m.fullName; nameField.focus(); nameField.blur(); }
        });
      }
    });
  }

  function Notification(title, message, icon) {
    Store.insert('notifications', {
      demo: true, type: 'cabinet', title: title, message: message, icon: icon || 'bell',
      link: '#/cabinet', at: new Date().toISOString(), read: false
    });
  }

  /* ══ Page ═════════════════════════════════════════════════════════════ */
  Router.view('/cabinet', {
    title: 'Cabinet', icon: 'crown', module: 'cabinet',
    subtitle: 'Club leadership, responsibilities and the organisational structure.',
    render: function () {
      if (!Auth.can('cabinet', 'view')) return UI.restricted('cabinet');
      var rows = sorted();
      var vacant = Data.CABINET_ORDER.length - rows.length;
      var tabsHtml = UI.tabs([
        { key: 'directory', label: 'Directory', icon: 'list', count: rows.length },
        { key: 'chart', label: 'Organisational chart', icon: 'network' },
        { key: 'history', label: 'Cabinet history', icon: 'history', count: Store.count('cabinetHistory') }
      ], state.tab, { id: 'cab-tabs' });

      var body = state.tab === 'chart' ? orgChartHTML() : state.tab === 'history' ? historyTable() : directoryHTML();

      return '<div class="page">' +
        UI.pageHeader({
          title: 'Cabinet', icon: 'crown',
          subtitle: 'Appoint leaders, publish responsibilities and keep a record of previous cabinets.',
          actions: (Auth.can('cabinet', 'create') ? '<button type="button" class="btn btn-primary" data-cab="new">' + Icons.svg('user-plus', { class: 'btn-ico' }) + 'Appoint a leader</button>' : '') +
            (Auth.can('cabinet', 'export') ? '<button type="button" class="btn btn-outline" data-cab="export">' + Icons.svg('download', { class: 'btn-ico' }) + 'Export</button>' : '')
        }) +
        '<div class="stat-grid">' +
          UI.statCard({ label: 'Cabinet positions', value: rows.length, icon: 'crown', tone: 'primary', foot: 'Of ' + Data.CABINET_ORDER.length + ' defined positions' }) +
          UI.statCard({ label: 'Vacant positions', value: vacant, icon: 'alert-circle', tone: vacant ? 'warning' : 'success', foot: vacant ? 'Consider filling these roles' : 'All positions filled' }) +
          UI.statCard({ label: 'Executive committee', value: rows.filter(function (r) { return TIER(r) === 2; }).length, icon: 'shield', tone: 'secondary', foot: 'President, secretary, treasurer' }) +
          UI.statCard({ label: 'Current term', value: Store.settings().currentTerm || '—', icon: 'calendar', tone: 'accent', foot: Store.settings().academicYear + ' academic year' }) +
        '</div>' +
        UI.card({ head: tabsHtml, flush: true, body: '<div class="card-body">' + body + '</div>' }) +
      '</div>';
    },
    mount: function (ctx, root) {
      root.addEventListener('click', function (e) {
        var tab = e.target.closest('[data-tab]');
        if (tab) { state.tab = tab.getAttribute('data-tab'); Router.refresh(); return; }
        if (e.target.closest('[data-cab="new"]')) { openForm(); return; }
        if (e.target.closest('[data-cab="export"]')) {
          CRUD.exportRows({
            rows: sorted(), module: 'cabinet', name: 'mrhs-ict-cabinet',
            columns: [
              { key: 'position', label: 'Position' }, { key: 'name', label: 'Name' }, { key: 'term', label: 'Term' },
              { key: 'appointmentDate', label: 'Appointed' }, { key: 'status', label: 'Status' },
              { value: function (r) { return r.contact; }, label: 'Contact' }, { value: function (r) { return r.email; }, label: 'Email' },
              { value: function (r) { return r.responsibilities; }, label: 'Responsibilities' }
            ]
          });
          return;
        }
        var edit = e.target.closest('[data-cab="edit"]');
        if (edit) { openForm(Store.find('cabinet', edit.getAttribute('data-id'))); return; }
        var del = e.target.closest('[data-history-del]');
        if (del) {
          CRUD.remove({
            collection: 'cabinetHistory', id: del.getAttribute('data-history-del'), module: 'cabinet',
            label: 'history entry', title: 'Delete history entry',
            message: 'Remove this entry from the cabinet history?',
            details: 'The archive of previous cabinets will no longer show this record.',
            after: function () { Router.refresh(); }
          });
        }
      });
    }
  });

  /* ══ Detail ═══════════════════════════════════════════════════════════ */
  Router.view('/cabinet/:id', {
    title: 'Cabinet position', icon: 'crown', module: 'cabinet',
    render: function (ctx) {
      if (!Auth.can('cabinet', 'view')) return UI.restricted('cabinet');
      var c = Store.find('cabinet', ctx.params.id);
      if (!c) return ModuleHelper.notFound({ key: 'cabinet', title: 'Cabinet' }, 'Position');
      var member = Store.find('members', c.memberId);
      var meetingsLed = Store.where('meetings', function (m) { return m.chairperson === c.memberId || m.secretary === c.memberId; });
      var tasks = Store.where('tasks', function (t) { return t.assigneeId === c.memberId; });

      var responsibilities = UI.card({
        title: 'Role and responsibilities', icon: 'clipboard-list',
        body: '<p style="white-space:pre-line">' + U.esc(c.responsibilities || 'No responsibilities recorded.') + '</p>' +
          (c.achievements ? '<div class="note-block success mt-2"><strong>Contributions this term</strong><br>' + U.esc(c.achievements) + '</div>' : '') +
          UI.kvGrid([
            { label: 'Position', value: c.position },
            { label: 'Term of office', value: c.term },
            { label: 'Appointed', value: U.fmtDate(c.appointmentDate, 'long') },
            { label: 'Time in office', value: U.daysBetween(c.appointmentDate, new Date()) + ' days' },
            { label: 'Status', html: UI.statusBadge(c.status) },
            { label: 'Reports to', value: TIER(c) === 1 ? 'School administration' : 'Club patron and president' }
          ])
      });

      var contact = UI.card({
        title: 'Contact and profile', icon: 'user',
        body: member
          ? '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">' + UI.avatar(member.fullName, 'lg') +
              '<div><strong>' + U.esc(member.fullName) + '</strong><p class="small muted">' + U.esc(member.memberId + ' · ' + member.klass) + '</p>' +
              '<a class="link-btn" href="#/members/' + member.id + '">Open full member profile ' + Icons.svg('arrow-right') + '</a></div></div>' +
            UI.kvGrid([
              { label: 'Contact', value: c.contact },
              { label: 'Email', value: c.email },
              { label: 'Membership status', html: UI.statusBadge(member.membershipStatus) },
              { label: 'Club role', value: member.clubRole }
            ])
          : UI.kvGrid([
              { label: 'Contact', value: c.contact },
              { label: 'Email', value: c.email },
              { label: 'Holder', value: 'External appointment (not a registered member)' }
            ]) +
          '<p class="help mt-2">Tip: link this position to a registered member so attendance, courses and certificates stay connected.</p>'
      });

      var activityCard = UI.card({
        title: 'Related activity', icon: 'activity', sub: meetingsLed.length + ' meetings · ' + tasks.length + ' tasks',
        body: (meetingsLed.length || tasks.length)
          ? UI.timeline(meetingsLed.slice(0, 5).map(function (m) {
              return { icon: 'calendar-check', tone: 'info', title: m.title, text: (m.chairperson === c.memberId ? 'Chaired this meeting' : 'Served as secretary') + ' · ' + U.fmtDate(m.date), time: U.esc(m.status) };
            }).concat(tasks.slice(0, 5).map(function (t) {
              return { icon: 'check-square', tone: t.status === 'Completed' ? 'success' : 'warning', title: t.title, text: t.status + ' · due ' + U.fmtDate(t.deadline), time: t.priority };
            })))
          : UI.emptyState({ icon: 'activity', title: 'No linked activity', message: 'Meetings and tasks linked to this position will appear here.' })
      });

      return '<div class="page">' +
        '<nav class="breadcrumbs">' + UI.crumbs([{ label: 'Dashboard', href: '#/dashboard' }, { label: 'Cabinet', href: '#/cabinet' }, { label: c.position }]) + '</nav>' +
        '<section class="detail-header">' +
          '<div class="detail-header-main">' +
            '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">' + UI.avatar(c.name, 'xl') + '</div>' +
            '<h1>' + U.esc(c.name) + '</h1>' +
            '<p class="muted">' + U.esc(c.position) + ' · ' + U.esc(c.term) + '</p>' +
            '<div class="dh-meta">' + UI.statusBadge(c.status) + UI.badge(c.position, 'secondary', { icon: 'crown' }) +
              (c.demo ? UI.demoChip() : '') + '</div>' +
          '</div>' +
          '<div class="detail-actions no-print">' +
            '<button type="button" class="btn btn-outline btn-sm" data-cab-act="print">' + Icons.svg('print', { class: 'btn-ico' }) + 'Print</button>' +
            (Auth.can('cabinet', 'edit') ? '<button type="button" class="btn btn-outline btn-sm" data-cab-act="edit">' + Icons.svg('edit', { class: 'btn-ico' }) + 'Edit</button>' : '') +
            (Auth.can('cabinet', 'delete') ? '<button type="button" class="btn btn-danger-outline btn-sm" data-cab-act="remove">' + Icons.svg('trash', { class: 'btn-ico' }) + 'Remove from cabinet</button>' : '') +
          '</div>' +
        '</section>' +
        '<div class="grid cols-2">' + responsibilities + contact + '</div>' +
        activityCard +
      '</div>';
    },
    mount: function (ctx, root) {
      var c = Store.find('cabinet', ctx.params.id);
      if (!c) return;
      root.addEventListener('click', function (e) {
        if (e.target.closest('[data-cab-act="edit"]')) openForm(c);
        if (e.target.closest('[data-cab-act="print"]')) {
          Print.preview(Print.page(
            '<div class="print-doc-title"><h1>Cabinet Position Record</h1><p>' + U.esc(c.position) + '</p></div>' +
            '<table><tbody>' +
              '<tr><th style="width:30%">Position</th><td>' + U.esc(c.position) + '</td></tr>' +
              '<tr><th>Holder</th><td>' + U.esc(c.name) + '</td></tr>' +
              '<tr><th>Term of office</th><td>' + U.esc(c.term) + '</td></tr>' +
              '<tr><th>Appointed</th><td>' + U.fmtDate(c.appointmentDate, 'long') + '</td></tr>' +
              '<tr><th>Status</th><td>' + U.esc(c.status) + '</td></tr>' +
              '<tr><th>Contact</th><td>' + U.esc(c.contact || '—') + ' · ' + U.esc(c.email || '—') + '</td></tr>' +
            '</tbody></table>' +
            '<h3>Responsibilities</h3><p>' + U.esc(c.responsibilities || '—') + '</p>' +
            (c.achievements ? '<h3>Contributions this term</h3><p>' + U.esc(c.achievements) + '</p>' : '') +
            '<div class="print-sign"><div><div class="line"></div>Club Secretary</div><div><div class="line"></div>Club Patron</div></div>',
            { meta: 'Cabinet record' }
          ), { title: 'Cabinet position — ' + c.position });
        }
        if (e.target.closest('[data-cab-act="remove"]')) {
          CRUD.remove({
            collection: 'cabinet', id: c.id, module: 'cabinet', label: c.position + ' (' + c.name + ')',
            title: 'Remove from cabinet',
            message: 'Remove ' + c.name + ' as ' + c.position + '?',
            details: 'The position becomes vacant. A history entry will be recorded so the change is traceable.',
            confirmLabel: 'Remove from cabinet',
            after: function () {
              Store.insert('cabinetHistory', {
                demo: c.demo === true, position: c.position, name: c.name, term: c.term,
                fromDate: c.appointmentDate, toDate: U.todayISO(), note: 'Removed from office.'
              });
              Router.go('/cabinet');
            }
          });
        }
      });
    }
  });

  global.Modules = global.Modules || {};
  global.Modules.Cabinet = {
    openForm: openForm, tier: TIER, sorted: sorted, byPosition: byPosition
  };
})(window);
