/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/audit.js
   The club's own record of what was changed, by whom and when.

   The data layer writes an entry for every create, update, delete, backup
   import, reset and password change (see Store.audit). This screen turns that
   list into something the patron or ICT teacher can read: filters, search, a
   printout and a CSV copy for the file. Administrators only — the entries name
   the officers and describe the records.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils, Store = global.Store, UI = global.UI, Icons = global.Icons;
  var filters = { action: '', collection: '', user: '', from: '', to: '', text: '' };

  var ACTION_LABELS = {
    create: 'Added', update: 'Edited', delete: 'Deleted',
    reset: 'Reset', security: 'Security', import: 'Imported'
  };
  var ACTION_TONES = {
    create: 'success', update: 'info', delete: 'danger', reset: 'warning',
    security: 'warning', import: 'neutral'
  };

  function entries() {
    var rows = (Store.all('auditLog') || []).slice();
    return rows.filter(function (e) {
      if (filters.action && e.action !== filters.action) return false;
      if (filters.collection && e.collection !== filters.collection) return false;
      if (filters.user && String(e.user || '') !== filters.user) return false;
      if (filters.from && String(e.at || '').slice(0, 10) < filters.from) return false;
      if (filters.to && String(e.at || '').slice(0, 10) > filters.to) return false;
      if (filters.text) {
        var hay = [e.label, e.recordId, e.collection, e.user, e.meta && (e.meta.note || (e.meta.changed || []).join(' '))]
          .join(' ').toLowerCase();
        if (hay.indexOf(filters.text.toLowerCase()) === -1) return false;
      }
      return true;
    });
  }

  function officers() {
    var seen = {};
    (Store.all('auditLog') || []).forEach(function (e) { if (e.user) seen[e.user] = true; });
    (Store.all('users') || []).forEach(function (u) { if (u.username) seen[u.username] = true; });
    return Object.keys(seen).sort();
  }

  function collectionsInLog() {
    var seen = {};
    (Store.all('auditLog') || []).forEach(function (e) { if (e.collection) seen[e.collection] = true; });
    return Object.keys(seen).sort();
  }

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  function summary() {
    var all = Store.all('auditLog') || [];
    var today = new Date().toISOString().slice(0, 10);
    var week = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
    return {
      total: all.length,
      today: all.filter(function (e) { return String(e.at || '').slice(0, 10) === today; }).length,
      week: all.filter(function (e) { return String(e.at || '').slice(0, 10) >= week; }).length,
      officers: officers().length,
      deletes: all.filter(function (e) { return e.action === 'delete'; }).length,
      oldest: all.length ? String(all[all.length - 1].at || '').slice(0, 10) : ''
    };
  }

  function table() {
    var rows = entries();
    if (!rows.length) {
      return UI.emptyState({
        icon: 'history', title: 'Nothing recorded yet',
        message: 'Entries appear here as soon as records are added, edited or deleted.',
        action: '<button type="button" class="btn btn-outline btn-sm" data-audit="clear-filters">' + Icons.svg('refresh', { class: 'btn-ico' }) + 'Clear the filters</button>'
      });
    }
    var body = rows.slice(0, 400).map(function (e) {
      var changed = e.meta && e.meta.changed && e.meta.changed.length
        ? e.meta.changed.map(function (k) { return U.titleCase(k); }).join(', ') : '';
      var note = e.meta && e.meta.note ? e.meta.note : '';
      return '<tr>' +
        '<td class="nowrap">' + U.esc(U.fmtDate(e.at, 'long')) + ' <span class="muted small">' + U.esc(String(e.at || '').slice(11, 16)) + '</span></td>' +
        '<td>' + U.esc(e.user || 'system') + '</td>' +
        '<td>' + UI.badge(ACTION_LABELS[e.action] || U.titleCase(e.action || ''), ACTION_TONES[e.action] || 'neutral') + '</td>' +
        '<td>' + U.esc(U.titleCase(e.collection || '')) + '</td>' +
        '<td>' + '<span class="td-strong">' + U.esc(e.label || e.recordId || '—') + '</span>' +
          (e.recordId && e.label && e.label !== e.recordId ? '<br><span class="muted xs mono">' + U.esc(e.recordId) + '</span>' : '') + '</td>' +
        '<td class="small muted">' + U.esc(note || changed || '—') + '</td>' +
      '</tr>';
    }).join('');

    return '<div class="table-wrap"><table class="data-table" id="audit-table">' +
      '<thead><tr>' +
        '<th>When</th><th>Officer</th><th>What</th><th>Module</th><th>Record</th><th>Details</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      (rows.length > 400 ? '<p class="muted small mt-1">Showing the newest 400 of ' + rows.length + ' entries — narrow the filters or export the CSV for the rest.</p>' : '');
  }

  function page() {
    if (!Auth.can('settings', 'delete')) return UI.restricted('settings');
    var s = summary();
    var rows = entries();

    var body = '<div class="page">' +
      UI.pageHeader({
        title: 'Audit trail', icon: 'history',
        subtitle: 'Every record added, edited or deleted in this installation — and which officer did it.',
        actions: '<button type="button" class="btn btn-outline" data-audit="export">' + Icons.svg('download', { class: 'btn-ico' }) + 'Export CSV</button>' +
                 '<button type="button" class="btn btn-outline" data-audit="print">' + Icons.svg('print', { class: 'btn-ico' }) + 'Print</button>'
      }) +
      '<div class="stat-strip mt-2">' +
        '<div class="strip-item"><span>Entries</span><strong>' + s.total + '</strong></div>' +
        '<div class="strip-item"><span>Today</span><strong>' + s.today + '</strong></div>' +
        '<div class="strip-item"><span>Last 7 days</span><strong>' + s.week + '</strong></div>' +
        '<div class="strip-item"><span>Officers seen</span><strong>' + s.officers + '</strong></div>' +
        '<div class="strip-item"><span>Deletions</span><strong>' + s.deletes + '</strong></div>' +
      '</div>' +
      UI.card({
        title: 'Entries', icon: 'filter', sub: plural(rows.length, 'entry') + ' match the filters',
        actions: (Auth.can('settings', 'delete')
          ? '<button type="button" class="btn btn-ghost btn-sm" data-audit="trim">' + Icons.svg('eraser', { class: 'btn-ico' }) + 'Remove old entries</button>' : ''),
        body: '<div class="grid cols-4">' +
            field('action', 'What happened', select(ACTION_LABELS, filters.action, 'Any action')) +
            field('collection', 'Module', select(mapLabels(collectionsInLog()), filters.collection, 'Any module')) +
            field('user', 'Officer', select(mapLabels(officers()), filters.user, 'Any officer')) +
            field('from', 'From date', '<input class="input" type="date" id="af-from" value="' + U.attr(filters.from) + '">') +
            field('to', 'To date', '<input class="input" type="date" id="af-to" value="' + U.attr(filters.to) + '">') +
            field('text', 'Search', '<input class="input" type="search" id="af-text" placeholder="name, ID, field…" value="' + U.attr(filters.text) + '">') +
          '</div>' +
          '<div class="flex gap-1 mt-2">' +
            '<button type="button" class="btn btn-primary btn-sm" data-audit="apply">' + Icons.svg('check', { class: 'btn-ico' }) + 'Apply filters</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-audit="clear-filters">Clear</button>' +
          '</div>' +
          '<div class="mt-2">' + table() + '</div>'
      }) +
      '<div class="alert alert-info mt-2">' + Icons.svg('info') +
        '<div>The trail holds the newest 400 entries (the data layer trims older ones automatically) and lives only in this browser — it is deliberately <strong>not</strong> shared through Firebase, so it never leaves the club\u2019s own device. Sign-ins, password changes and backup imports are recorded here too.</div></div>' +
    '</div>';
    return body;
  }

  function mapLabels(list) {
    var out = {};
    list.forEach(function (k) { out[k] = U.titleCase(k); });
    return out;
  }
  function select(options, value, placeholder) {
    var html = '<select class="select" id="af-' + 'x' + '">';
    html += '<option value="">' + U.esc(placeholder) + '</option>';
    Object.keys(options).forEach(function (k) {
      html += '<option value="' + U.attr(k) + '"' + (String(value) === String(k) ? ' selected' : '') + '>' + U.esc(options[k]) + '</option>';
    });
    return html + '</select>';
  }
  function field(name, label, control) {
    return '<div class="field"><label for="af-' + name + '">' + U.esc(label) + '</label>' + control.replace('id="af-x"', 'id="af-' + name + '"') + '</div>';
  }

  function applyFromDom(root) {
    ['action', 'collection', 'user', 'from', 'to', 'text'].forEach(function (k) {
      var el = root.querySelector('#af-' + k);
      if (el) filters[k] = el.value;
    });
  }

  function exportCSV() {
    var rows = entries();
    var data = rows.map(function (e) {
      return {
        when: e.at || '',
        officer: e.user || 'system',
        action: ACTION_LABELS[e.action] || e.action || '',
        module: e.collection || '',
        record: e.label || '',
        recordId: e.recordId || '',
        details: (e.meta && (e.meta.note || (e.meta.changed || []).join(' '))) || ''
      };
    });
    if (!data.length) { UI.toast('Nothing to export', 'No entries match the filters.', 'warning'); return; }
    CRUD.exportRows({
      rows: data,
      columns: [
        ['when', 'When'], ['officer', 'Officer'], ['action', 'Action'], ['module', 'Module'],
        ['record', 'Record'], ['recordId', 'Record ID'], ['details', 'Details']
      ],
      name: 'mrhs-ict-audit-trail',
      module: 'settings'
    });
  }

  function printOut() {
    var rows = entries().slice(0, 300);
    var html = '<h1>Audit trail</h1>' +
      '<p class="meta">' + U.esc(Store.settings().schoolName || '') + ' · ' + U.esc(Store.settings().clubName || '') +
      ' · printed ' + U.esc(new Date().toLocaleString()) + ' · ' + plural(rows.length, 'entry') + '</p>' +
      '<table><thead><tr><th>When</th><th>Officer</th><th>Action</th><th>Module</th><th>Record</th><th>Details</th></tr></thead><tbody>' +
      rows.map(function (e) {
        var details = (e.meta && (e.meta.note || (e.meta.changed || []).join(', '))) || '';
        return '<tr><td>' + U.esc(U.fmtDate(e.at, 'long')) + '</td><td>' + U.esc(e.user || 'system') + '</td>' +
          '<td>' + U.esc(ACTION_LABELS[e.action] || e.action || '') + '</td><td>' + U.esc(U.titleCase(e.collection || '')) + '</td>' +
          '<td>' + U.esc(e.label || e.recordId || '') + '</td><td>' + U.esc(details) + '</td></tr>';
      }).join('') + '</tbody></table>';
    Print.preview(html, { title: 'Audit trail', orientation: 'landscape' });
  }

  function trim() {
    var all = Store.all('auditLog') || [];
    if (all.length < 60) { UI.toast('Nothing to trim', 'The trail is already short.', 'info'); return; }
    UI.confirm({
      title: 'Remove old audit entries', tone: 'warning', confirmLabel: 'Keep the newest 100',
      message: 'Keep only the 100 most recent entries?',
      details: 'Older entries are deleted permanently. Export the CSV first if the club needs them for its file.',
      onConfirm: function () {
        var removed = all.length - 100;
        Store.replace('auditLog', all.slice(0, 100));
        UI.toast('Audit trail trimmed', plural(removed, 'older entry') + ' removed.', 'success');
        Router.refresh();
      }
    });
  }

  Router.view('/audit', {
    title: 'Audit trail', icon: 'history', module: 'settings',
    render: page,
    mount: function (ctx, root) {
      root.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-audit]');
        if (!btn) return;
        var what = btn.getAttribute('data-audit');
        if (what === 'apply') { applyFromDom(root); Router.refresh(); }
        if (what === 'clear-filters') { filters = { action: '', collection: '', user: '', from: '', to: '', text: '' }; Router.refresh(); }
        if (what === 'export') { applyFromDom(root); exportCSV(); }
        if (what === 'print') { applyFromDom(root); printOut(); }
        if (what === 'trim') trim();
      });
      root.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && e.target.closest('#af-text')) { applyFromDom(root); Router.refresh(); }
      });
    }
  });

  global.Modules = global.Modules || {};
  global.Modules.Audit = { entries: entries, summary: summary, filters: function () { return filters; } };
})(window);
