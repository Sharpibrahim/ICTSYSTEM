/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/achievements.js
   The club's trophy cabinet: competition wins, innovation awards, member
   recognition and training successes with the members who earned them.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;
  var CATEGORIES = ['Competition Awards', 'Innovation Awards', 'Member Awards', 'Training Achievements', 'Project Awards', 'Community Recognition'];

  function nameOf(id) {
    var m = Store.find('members', id), u = Store.find('users', id);
    return m ? m.fullName : (u ? u.name : (id || '—'));
  }
  function toneFor(cat) {
    return /Competition/.test(cat) ? 'warning' : /Innovation/.test(cat) ? 'secondary' : /Member/.test(cat) ? 'primary'
      : /Training/.test(cat) ? 'accent' : /Community/.test(cat) ? 'success' : 'info';
  }
  var PALETTE = ['#2545d6', '#6d28d9', '#06b6d4', '#12884f', '#b7791f', '#d64545', '#0e9488'];

  var config = {
    key: 'achievements',
    title: 'Achievements',
    singular: 'achievement',
    icon: 'trophy',
    module: 'achievements',
    collection: 'achievements',
    subtitle: 'Every award, competition result and recognition earned by the club and its members.',
    stats: function () {
      var a = Metrics.achievements();
      var topCategory = U.sortBy(a.categorySeries, 'value', 'desc')[0];
      return [
        { label: 'Achievements recorded', value: U.num(a.total), icon: 'trophy', tone: 'primary', foot: a.thisYear + ' in ' + new Date().getFullYear() },
        { label: 'Competition awards', value: U.num((a.byCategory['Competition Awards'] || []).length), icon: 'medal', tone: 'warning', foot: 'From quizzes and challenges' },
        { label: 'Members recognised', value: U.num(U.uniq(Store.all('achievements').reduce(function (acc, x) { return acc.concat(x.memberIds || []); }, [])).length), icon: 'user-check', tone: 'success', foot: 'Named on award records' },
        { label: 'Leading category', value: topCategory ? U.truncate(topCategory.label, 18) : '—', icon: 'layer-group', tone: 'accent', foot: topCategory ? topCategory.value + ' records' : 'No records yet' }
      ];
    },
    schema: function (values) {
      return [
        { name: 'title', label: 'Achievement title', type: 'text', required: true, colSpan: 2, value: values.title, placeholder: 'e.g. Winner — Inter-House ICT Quiz' },
        { name: 'category', label: 'Category', type: 'select', required: true, options: CATEGORIES, value: values.category || 'Competition Awards' },
        { name: 'date', label: 'Date achieved', type: 'date', required: true, value: values.date || U.todayISO() },
        { name: 'event', label: 'Event or venue', type: 'text', required: true, value: values.event, placeholder: 'e.g. Regional ICT Exhibition' },
        { name: 'awardedBy', label: 'Awarded by', type: 'text', value: values.awardedBy, placeholder: 'School, organisation or competition organiser' },
        { name: 'position', label: 'Position / level', type: 'select', options: ['Winner', 'First place', 'Second place', 'Third place', 'Participant', 'Recognition', 'Certificate'], value: values.position || 'Recognition' },
        { name: 'memberIds', label: 'Members involved', type: 'members', size: 9, value: values.memberIds || [], help: 'Everyone who contributed to this achievement.' },
        { name: 'description', label: 'Description', type: 'textarea', required: true, colSpan: 2, rows: 4, value: values.description },
        { name: 'impact', label: 'Impact on the club', type: 'textarea', colSpan: 2, rows: 3, value: values.impact }
      ];
    },
    transform: function (data, values) {
      return {
        title: data.title, category: data.category, date: data.date, description: data.description,
        memberIds: data.memberIds || [], event: data.event, awardedBy: data.awardedBy,
        position: data.position, impact: data.impact,
        photos: values.photos || [], documents: values.documents || [], demo: values.demo === true
      };
    },
    columns: [
      {
        key: 'title', label: 'Achievement',
        render: function (a) {
          return '<span class="cell-primary">' + Icons.svg('trophy', { size: 16 }) + ' <a href="#/achievements/' + a.id + '" class="td-strong">' + U.esc(a.title) + '</a></span>' +
            '<br><span class="td-muted">' + U.esc(a.event || '') + ' · ' + U.fmtDate(a.date) + '</span>';
        }
      },
      { key: 'category', label: 'Category', render: function (a) { return UI.badge(a.category, toneFor(a.category)); } },
      { key: 'position', label: 'Result', render: function (a) { return UI.badge(a.position || 'Recognition', U.tone(a.position)); } },
      {
        key: 'memberIds', label: 'Members', sortable: false,
        render: function (a) {
          var ids = a.memberIds || [];
          if (!ids.length) return '<span class="td-muted">Club-wide</span>';
          return '<span class="avatar-stack">' + ids.slice(0, 3).map(function (id) { return UI.avatar(nameOf(id), 'xs'); }).join('') +
            (ids.length > 3 ? '<span class="avatar avatar-xs more">+' + (ids.length - 3) + '</span>' : '') + '</span>';
        }
      },
      { key: 'awardedBy', label: 'Awarded by', render: function (a) { return U.esc(U.truncate(a.awardedBy || '—', 34)); } }
    ],
    filters: [
      { key: 'category', label: 'All categories', options: CATEGORIES },
      { key: 'position', label: 'All results', options: ['Winner', 'First place', 'Second place', 'Third place', 'Participant', 'Recognition', 'Certificate'] },
      { key: 'year', label: 'All years', value: function (a) { return U.toDate(a.date).getFullYear(); }, options: function () {
          return U.uniq(Store.all('achievements').map(function (a) { return U.toDate(a.date).getFullYear(); })).sort().reverse();
        } }
    ],
    searchKeys: function (a) { return [a.title, a.description, a.category, a.event, a.awardedBy, a.impact, (a.memberIds || []).map(nameOf).join(' ')]; },
    exportColumns: [
      { key: 'title', label: 'Achievement' }, { key: 'category', label: 'Category' }, { key: 'position', label: 'Result' },
      { key: 'date', label: 'Date' }, { key: 'event', label: 'Event' }, { key: 'awardedBy', label: 'Awarded by' },
      { value: function (a) { return (a.memberIds || []).map(nameOf).join('; '); }, label: 'Members' },
      { key: 'description', label: 'Description' }
    ],
    rowActions: function (a) {
      var out = CRUD.viewBtn('#/achievements/' + a.id, 'achievement');
      out += CRUD.actionBtn('print', a.id, 'print', 'Print citation');
      if (Auth.can('achievements', 'edit')) out += CRUD.actionBtn('edit', a.id, 'edit', 'Edit achievement');
      if (Auth.can('achievements', 'delete')) out += CRUD.actionBtn('delete', a.id, 'trash', 'Delete achievement', 'danger');
      return out;
    },
    onRowAction: function (action, a) {
      if (action === 'print') Print.preview(citationPrint(a), { title: 'Citation — ' + a.title, icon: 'trophy', fileName: 'mrhs-ict-achievement' });
    },
    empty: { icon: 'trophy', title: 'No achievements recorded', message: 'Record competition results and awards to build the club’s trophy cabinet.' },

    detailTitle: function (a) { return a.title; },
    detailSubtitle: function (a) { return a.category + ' · ' + U.fmtDate(a.date, 'long') + ' · ' + (a.event || ''); },
    detailBadges: function (a) {
      return UI.badge(a.category, toneFor(a.category), { icon: 'trophy' }) + UI.badge(a.position || 'Recognition', U.tone(a.position), { icon: 'medal' }) +
        (a.awardedBy ? UI.badge(a.awardedBy, 'neutral', { icon: 'building' }) : '') + (a.demo ? UI.demoChip() : '');
    },
    detailActions: function (a) {
      return '<button type="button" class="btn btn-primary btn-sm" data-detail-action="citation">' + Icons.svg('print', { class: 'btn-ico' }) + 'Print citation</button>' +
        (Auth.can('certificates', 'create') ? '<button type="button" class="btn btn-outline btn-sm" data-detail-action="certificate">' + Icons.svg('award', { class: 'btn-ico' }) + 'Issue certificates</button>' : '');
    },
    detail: function (a) {
      var members = (a.memberIds || []).map(function (id) { return Store.find('members', id); }).filter(Boolean);
      var related = Store.all('achievements').filter(function (x) {
        return x.id !== a.id && (x.category === a.category || x.event === a.event);
      }).slice(0, 5);

      var main = UI.card({
        title: 'What was achieved', icon: 'trophy',
        body: '<div class="minutes-body"><p style="white-space:pre-line">' + U.esc(a.description) + '</p></div>' +
          (a.impact ? '<div class="note-block success mt-2"><strong>Impact on the club</strong><br>' + U.esc(a.impact) + '</div>' : '') +
          '<div class="divider-text"><span>Recognition</span></div>' +
          UI.kvGrid([
            { label: 'Category', html: UI.badge(a.category, toneFor(a.category)) },
            { label: 'Result', html: UI.badge(a.position || 'Recognition', U.tone(a.position)) },
            { label: 'Event', value: a.event || '—' },
            { label: 'Awarded by', value: a.awardedBy || '—' },
            { label: 'Date', value: U.fmtDate(a.date, 'long') },
            { label: 'Time since', value: U.timeAgo(a.date) },
            { label: 'Members credited', value: members.length ? members.length + ' member' + (members.length === 1 ? '' : 's') : 'Club-wide' },
            { label: 'Recorded by', value: nameOf(a.createdBy) }
          ])
      });

      var people = UI.card({
        title: 'Members behind this achievement', icon: 'users', sub: members.length ? members.length + ' credited' : 'Club-wide recognition',
        body: members.length
          ? '<div class="record-grid" style="padding:0">' + members.map(function (m) {
              return '<article class="record-card"><div class="record-card-head">' + UI.avatar(m.fullName, 'md') +
                '<div class="rc-main"><h3><a href="#/members/' + m.id + '">' + U.esc(m.fullName) + '</a></h3>' +
                '<p class="small">' + U.esc(m.klass + ' ' + (m.stream || '')) + ' · ' + U.esc(m.clubRole || 'Member') + '</p>' +
                '<div>' + UI.badge(m.memberId, 'neutral') + '</div></div></div>' +
                '<div class="record-card-body">' +
                  UI.metaRow('award', 'Certificates', Store.count('certificates', function (c) { return c.recipientId === m.id; }) + ' issued') +
                  UI.metaRow('trophy', 'Achievements', Store.count('achievements', function (x) { return (x.memberIds || []).indexOf(m.id) !== -1; }) + ' records') +
                '</div></article>';
            }).join('') + '</div>'
          : '<p class="muted small">This was a club-wide achievement. No individual members were credited.</p>'
      });

      var galleryCard = UI.card({
        title: 'Photos and documents', icon: 'image',
        body: '<div class="alert alert-info">' + Icons.svg('camera') +
          '<div><strong>Attachments are placeholders</strong>Photos and scanned certificates will be attached to achievement records once media storage is connected. ' +
          (related.length ? 'In the meantime, related records are listed below.' : '') + '</div></div>' +
          (related.length ? '<div class="list-rows mt-2">' + related.map(function (x) {
            return '<a class="list-row" href="#/achievements/' + x.id + '">' +
              '<span class="tl-dot">' + Icons.svg('trophy') + '</span>' +
              '<span class="list-row-main"><strong>' + U.esc(x.title) + '</strong><span>' + U.esc(x.category) + ' · ' + U.fmtDate(x.date) + '</span></span></a>';
          }).join('') + '</div>' : '')
      });

      return '<div class="grid cols-2" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">' + main +
        '<div style="display:grid;gap:18px">' + people + galleryCard + '</div></div>';
    },
    onDetailAction: function (action, btn, a) {
      if (action === 'citation') Print.preview(citationPrint(a), { title: 'Citation — ' + a.title, icon: 'trophy', fileName: 'mrhs-ict-achievement' });
      if (action === 'certificate') {
        var ids = a.memberIds || [];
        if (!ids.length) { UI.toast('No members credited', 'Add the members involved before issuing certificates.', 'warning'); return; }
        ids.forEach(function (id, i) {
          setTimeout(function () {
            Modules.Certificates.openForm({
              recipientId: id,
              type: /Leadership/.test(a.category) ? 'Certificate of Leadership' : 'Certificate of Excellence',
              achievement: 'For ' + (a.position || 'recognition').toLowerCase() + ' — ' + a.title + ' (' + (a.event || '') + ').'
            });
          }, i * 250);
        });
        UI.toast('Certificate forms opened', ids.length + ' certificate form' + (ids.length === 1 ? '' : 's') + ' opened in sequence.', 'info');
      }
    },
    printDoc: function (a) { return { html: citationPrint(a), title: 'Citation — ' + a.title }; }
  };

  function citationPrint(a) {
    var members = (a.memberIds || []).map(function (id) { return Store.find('members', id); }).filter(Boolean);
    return Print.page(
      '<div class="print-doc-title"><h1>Certificate of Achievement</h1><p>' + U.esc(a.category) + '</p></div>' +
      '<h3>' + U.esc(a.title) + '</h3>' +
      '<p>' + U.esc(a.description) + '</p>' +
      '<table><tbody>' +
        '<tr><th style="width:32%">Date</th><td>' + U.fmtDate(a.date, 'long') + '</td></tr>' +
        '<tr><th>Event</th><td>' + U.esc(a.event || '') + '</td></tr>' +
        '<tr><th>Result</th><td>' + U.esc(a.position || 'Recognition') + '</td></tr>' +
        '<tr><th>Awarded by</th><td>' + U.esc(a.awardedBy || '') + '</td></tr>' +
      '</tbody></table>' +
      (members.length ? '<h3>Members credited</h3><table><thead><tr><th>#</th><th>Name</th><th>Class</th><th>Role</th></tr></thead><tbody>' +
        members.map(function (m, i) {
          return '<tr><td>' + (i + 1) + '</td><td>' + U.esc(m.fullName) + '</td><td>' + U.esc(m.klass) + '</td><td>' + U.esc(m.clubRole || 'Member') + '</td></tr>';
        }).join('') + '</tbody></table>' : '') +
      (a.impact ? '<h3>Impact</h3><p>' + U.esc(a.impact) + '</p>' : '') +
      '<div class="print-sign"><div><div class="line"></div>Club President</div><div><div class="line"></div>Club Patron</div></div>',
      { meta: 'Achievement record' }
    );
  }

  ModuleHelper.page(config);

  global.Modules = global.Modules || {};
  global.Modules.Achievements = {
    config: config,
    openForm: function (values) {
      if (values && values.id) return ModuleHelper.openEdit(config, Store.find('achievements', values.id));
      return ModuleHelper.openCreate(config, values || {});
    },
    nameOf: nameOf,
    CATEGORIES: CATEGORIES
  };
})(window);
