/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/announcements.js
   Club notice board: announcements with priority levels, expiry dates and
   featured placement on the dashboard.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  function nameOf(id) {
    var m = Store.find('members', id), u = Store.find('users', id);
    return m ? m.fullName : (u ? u.name : (id || 'Club'));
  }
  function isLive(a) {
    if (a.status === 'Archived') return false;
    if (!a.expiryDate) return true;
    return a.expiryDate >= U.todayISO();
  }
  function expiryLabel(a) {
    if (!a.expiryDate) return 'No expiry date';
    if (a.expiryDate < U.todayISO()) return 'Expired ' + U.fmtDate(a.expiryDate);
    var d = U.daysFromNow(a.expiryDate);
    return d === 0 ? 'Expires today' : 'Expires in ' + d + (d === 1 ? ' day' : ' days');
  }

  var config = {
    key: 'announcements',
    title: 'Announcements',
    singular: 'announcement',
    icon: 'megaphone',
    module: 'announcements',
    collection: 'announcements',
    subtitle: 'Official club notices, with urgent items featured on every member’s dashboard.',
    stats: function () {
      var list = Store.all('announcements');
      var live = list.filter(isLive);
      return [
        { label: 'Live announcements', value: U.num(live.length), icon: 'megaphone', tone: 'primary', foot: list.length + ' in total' },
        { label: 'Urgent', value: U.num(live.filter(function (a) { return a.priority === 'Urgent'; }).length), icon: 'alert-triangle', tone: 'danger', foot: 'Requires immediate attention' },
        { label: 'Important', value: U.num(live.filter(function (a) { return a.priority === 'Important'; }).length), icon: 'alert-circle', tone: 'warning', foot: 'Read before the next meeting' },
        { label: 'Expiring soon', value: U.num(live.filter(function (a) { return a.expiryDate && U.daysFromNow(a.expiryDate) <= 7; }).length), icon: 'clock', tone: 'accent', foot: 'Within the next 7 days' }
      ];
    },
    schema: function (values) {
      return [
        { name: 'title', label: 'Announcement title', type: 'text', required: true, colSpan: 2, value: values.title },
        { name: 'priority', label: 'Priority', type: 'select', required: true, options: ['Normal', 'Important', 'Urgent'], value: values.priority || 'Normal' },
        { name: 'status', label: 'Status', type: 'select', required: true, options: ['Published', 'Draft', 'Archived'], value: values.status || 'Published' },
        { name: 'author', label: 'Posted by', type: 'member', required: true, value: values.author },
        { name: 'date', label: 'Date posted', type: 'date', required: true, value: values.date || U.todayISO() },
        { name: 'expiryDate', label: 'Expires on', type: 'date', value: values.expiryDate,
          help: 'Optional. After this date the notice leaves the dashboard but stays in the archive.' },
        { name: 'audience', label: 'Audience', type: 'select', options: ['Everyone', 'Cabinet', 'Members', 'Course participants'], value: values.audience || 'Everyone' },
        { name: 'featured', label: 'Feature on dashboard', type: 'switch', value: values.featured !== undefined ? values.featured : (values.priority === 'Urgent'), switchLabel: 'Pin to the top of the dashboard notice board' },
        { name: 'message', label: 'Message', type: 'textarea', colSpan: 2, rows: 6, required: true, value: values.message }
      ];
    },
    transform: function (data, values) {
      return {
        title: data.title, message: data.message, authorId: data.author, date: data.date,
        priority: data.priority, expiryDate: data.expiryDate, status: data.status,
        audience: data.audience, pinned: !!data.featured, demo: values.demo === true
      };
    },
    afterSave: function (rec) {
      if (!rec.id || rec.status !== 'Published' || rec.demo) return;
      Store.insert('notifications', {
        demo: false, type: 'announcement', title: rec.priority + ': ' + rec.title,
        message: U.truncate(rec.message, 110), icon: rec.priority === 'Urgent' ? 'alert-triangle' : 'megaphone',
        link: '#/announcements/' + rec.id, at: new Date().toISOString(), read: false
      });
    },
    columns: [
      {
        key: 'title', label: 'Announcement',
        render: function (a) {
          return '<a href="#/announcements/' + a.id + '" class="td-strong">' + U.esc(a.title) + '</a>' +
            (a.pinned ? ' ' + Icons.svg('pin', { class: 'pin-ico', title: 'Featured on dashboard' }) : '') +
            '<br><span class="td-muted">' + U.esc(U.truncate(a.message, 82)) + '</span>';
        }
      },
      { key: 'priority', label: 'Priority', render: function (a) { return UI.badge(a.priority, U.tone(a.priority), { icon: a.priority === 'Urgent' ? 'alert-triangle' : a.priority === 'Important' ? 'alert-circle' : 'info' }); } },
      { key: 'author', label: 'Posted by', render: function (a) { return U.esc(nameOf(a.authorId)); } },
      { key: 'date', label: 'Posted', render: function (a) { return U.fmtDate(a.date) + '<br><span class="td-muted">' + U.timeAgo(a.date) + '</span>'; } },
      { key: 'expiryDate', label: 'Validity', render: function (a) { return isLive(a) ? '<span class="badge badge-info badge-soft">Live</span><br><span class="td-muted">' + U.esc(expiryLabel(a)) + '</span>' : UI.badge('Expired', 'neutral'); } },
      { key: 'status', label: 'Status', render: function (a) { return UI.statusBadge(a.status); } }
    ],
    filters: [
      { key: 'priority', label: 'All priorities', options: ['Normal', 'Important', 'Urgent'] },
      { key: 'status', label: 'All statuses', options: ['Published', 'Draft', 'Archived'] },
      { key: 'live', label: 'All announcements', value: function (a) { return isLive(a) ? 'Live' : 'Expired'; }, options: ['Live', 'Expired'] }
    ],
    searchKeys: function (a) { return [a.title, a.message, a.priority, a.audience, nameOf(a.authorId)]; },
    exportColumns: [
      { key: 'title', label: 'Title' }, { key: 'priority', label: 'Priority' }, { key: 'audience', label: 'Audience' },
      { key: 'date', label: 'Posted' }, { key: 'expiryDate', label: 'Expires' }, { key: 'status', label: 'Status' },
      { value: function (a) { return nameOf(a.authorId); }, label: 'Posted by' }, { key: 'message', label: 'Message' }
    ],
    rowActions: function (a) {
      var out = CRUD.viewBtn('#/announcements/' + a.id, 'announcement');
      if (Auth.can('announcements', 'edit')) out += CRUD.actionBtn('feature', a.id, a.pinned ? 'pin-off' : 'pin', a.pinned ? 'Remove from dashboard' : 'Feature on dashboard');
      if (Auth.can('announcements', 'edit')) out += CRUD.actionBtn('edit', a.id, 'edit', 'Edit announcement');
      if (Auth.can('announcements', 'delete')) out += CRUD.actionBtn('delete', a.id, 'trash', 'Delete announcement', 'danger');
      return out;
    },
    onRowAction: function (action, a, table) {
      if (action === 'feature') {
        if (!CRUD.guard('announcements', 'edit')) return;
        Store.update('announcements', a.id, { pinned: !a.pinned });
        UI.toast(a.pinned ? 'Removed from dashboard' : 'Featured on dashboard',
          a.pinned ? 'The notice is still published in the archive.' : 'Members will now see this notice at the top of their dashboard.', 'success');
        if (table) table.refresh();
      }
    },
    empty: { icon: 'megaphone', title: 'No announcements yet', message: 'Post a notice to keep members informed about meetings, deadlines and club news.' },

    detailTitle: function (a) { return a.title; },
    detailSubtitle: function (a) { return a.priority + ' priority · posted by ' + nameOf(a.authorId) + ' on ' + U.fmtDate(a.date, 'long'); },
    detailBadges: function (a) {
      return UI.badge(a.priority, U.tone(a.priority), { icon: a.priority === 'Urgent' ? 'alert-triangle' : 'info' }) +
        UI.statusBadge(a.status) + UI.badge(a.audience, 'neutral', { icon: 'users' }) +
        (a.pinned ? UI.badge('On dashboard', 'primary', { icon: 'pin' }) : '') + (a.demo ? UI.demoChip() : '');
    },
    detailActions: function (a) {
      return (Auth.can('announcements', 'edit') ? '<button type="button" class="btn btn-outline btn-sm" data-detail-action="feature">' + Icons.svg(a.pinned ? 'pin-off' : 'pin', { class: 'btn-ico' }) + (a.pinned ? 'Unpin' : 'Feature') + '</button>' : '') +
        (Auth.can('announcements', 'edit') && a.status !== 'Archived' ? '<button type="button" class="btn btn-outline btn-sm" data-detail-action="archive">' + Icons.svg('archive', { class: 'btn-ico' }) + 'Archive</button>' : '');
    },
    detail: function (a) {
      var main = UI.card({
        body: '<div class="announce-hero ' + (a.priority === 'Urgent' ? 'urgent' : a.priority === 'Important' ? 'important' : '') + '">' +
            '<div class="flex gap-2 center">' + Icons.svg(a.priority === 'Urgent' ? 'alert-triangle' : a.priority === 'Important' ? 'alert-circle' : 'megaphone', { size: 26 }) +
              '<strong>' + U.esc(a.priority) + ' announcement</strong></div>' +
          '</div>' +
          '<div class="minutes-body mt-2"><p style="white-space:pre-line">' + U.esc(a.message) + '</p></div>' +
          '<div class="flex between center wrap mt-2" style="border-top:1px solid var(--border);padding-top:12px">' +
            '<div class="flex gap-1 center">' + UI.avatar(nameOf(a.authorId), 'sm') +
              '<div><strong class="small">' + U.esc(nameOf(a.authorId)) + '</strong><br><span class="muted xs">Posted ' + U.fmtDateTime(a.date) + '</span></div></div>' +
            '<span class="muted small">' + U.esc(expiryLabel(a)) + '</span>' +
          '</div>'
      });

      var meta = UI.card({
        title: 'Notice details', icon: 'info',
        body: UI.kvGrid([
          { label: 'Priority', html: UI.badge(a.priority, U.tone(a.priority)) },
          { label: 'Status', html: UI.statusBadge(a.status) },
          { label: 'Audience', value: a.audience },
          { label: 'Date posted', value: U.fmtDate(a.date, 'long') },
          { label: 'Expiry date', value: a.expiryDate ? U.fmtDate(a.expiryDate, 'long') : 'None' },
          { label: 'Validity', value: isLive(a) ? expiryLabel(a) : 'Expired' },
          { label: 'Featured', value: a.pinned ? 'Shown on dashboard' : 'No' }
        ]) +
        '<div class="alert alert-info mt-2">' + Icons.svg('bell') + '<div>Published announcements appear in every member’s notification centre. Urgent notices are highlighted in red across the app.</div></div>'
      });

      var other = UI.card({
        title: 'Other notices', icon: 'megaphone',
        body: Store.all('announcements').filter(function (x) { return x.id !== a.id && isLive(x); }).slice(0, 5).map(function (x) {
          return '<a class="list-row" href="#/announcements/' + x.id + '">' +
            '<span class="tl-dot">' + Icons.svg('megaphone') + '</span>' +
            '<span class="list-row-main"><strong>' + U.esc(x.title) + '</strong><span>' + U.esc(x.priority) + ' · ' + U.timeAgo(x.date) + '</span></span></a>';
        }).join('') || '<p class="muted small">No other live notices.</p>'
      });

      return '<div class="grid cols-2" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)">' + main +
        '<div style="display:grid;gap:18px">' + meta + other + '</div></div>';
    },
    onDetailAction: function (action, btn, a) {
      if (action === 'feature') {
        if (!CRUD.guard('announcements', 'edit')) return;
        Store.update('announcements', a.id, { pinned: !a.pinned });
        UI.toast(a.pinned ? 'Removed from dashboard' : 'Featured on dashboard', 'The announcement has been updated.', 'success');
        Router.refresh();
      }
      if (action === 'archive') {
        if (!CRUD.guard('announcements', 'edit')) return;
        UI.confirm({
          title: 'Archive announcement',
          message: 'Archive “' + a.title + '”? It will be removed from the dashboard but kept in the record.',
          confirmLabel: 'Archive', tone: 'warning',
          onConfirm: function () {
            Store.update('announcements', a.id, { status: 'Archived', pinned: false });
            UI.toast('Announcement archived', 'The notice is no longer shown to members.', 'success');
            Router.refresh();
          }
        });
      }
    }
  };

  ModuleHelper.page(config);

  global.Modules = global.Modules || {};
  global.Modules.Announcements = {
    config: config,
    openForm: function (values) {
      if (values && values.id) return ModuleHelper.openEdit(config, Store.find('announcements', values.id));
      return ModuleHelper.openCreate(config, values || {});
    },
    isLive: isLive,
    nameOf: nameOf
  };
})(window);
