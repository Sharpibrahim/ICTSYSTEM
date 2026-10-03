/* ==========================================================================
   MRHS ICT CLUB MASTER — js/core/module.js
   The module scaffold. Every management module (members, meetings, courses…)
   is described declaratively: columns, form schema, detail sections and row
   actions. This file renders the list page, the record page and wires the
   create / edit / delete flows so behaviour is identical everywhere.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  /**
   * ModuleHelper.page(config)
   * Registers `/key` and (when config.detail is given) `/key/:id`.
   */
  function page(config) {
    var key = config.key;
    var moduleKey = config.module || key;
    var singular = config.singular || U.titleCase(key);
    var plural = config.plural || (singular + 's');

    /* ── List view ──────────────────────────────────────────────────────── */
    Router.view('/' + key, {
      title: config.title, icon: config.icon, module: moduleKey, subtitle: config.subtitle,
      render: function (ctx) {
        if (!Auth.can(moduleKey, 'view')) return UI.restricted(moduleKey);
        var stats = config.stats ? config.stats() : [];
        var html = '<div class="page">' +
          UI.pageHeader({
            title: config.title,
            icon: config.icon,
            subtitle: config.subtitle,
            crumbs: config.crumbs ? UI.crumbs(config.crumbs) : null,
            actions: actionsHtml(config, moduleKey, ctx)
          }) +
          (config.notice ? config.notice() : '') +
          (stats.length ? '<div class="stat-grid">' + stats.map(function (s) { return UI.statCard(s); }).join('') + '</div>' : '') +
          (config.beforeTable ? config.beforeTable(ctx) : '') +
          '<div id="module-table"></div>' +
          (config.afterTable ? config.afterTable(ctx) : '') +
        '</div>';
        return html;
      },
      mount: function (ctx, root) {
        var host = U.$('#module-table', root);
        if (!host) return;
        var table = new UI.DataTable(host, {
          title: config.tableTitle || ('All ' + plural.toLowerCase()),
          icon: config.icon,
          columns: columnsFor(config),
          rows: function () { return config.rows ? config.rows() : Store.all(config.collection); },
          searchKeys: config.searchKeys || function (r) { return defaultKeys(r); },
          filters: config.filters || [],
          toolbarExtra: toolbarExtra(config, moduleKey, table),
          rowActions: function (r) { return rowActions(config, r, moduleKey); },
          onRowClick: config.detail ? function (r) { Router.go('/' + key + '/' + r.id); } : null,
          exportName: 'mrhs-ict-' + key,
          empty: config.empty || {}
        });
        table.render();
        root.__table = table;

        bindListEvents(root, config, moduleKey, table, key);
        if (config.onMount) config.onMount(ctx, root, table);
      }
    });

    /* ── Detail view ────────────────────────────────────────────────────── */
    if (config.detail) {
      Router.view('/' + key + '/:id', {
        title: function (ctx) {
          var rec = Store.find(config.collection, ctx.params.id);
          return rec ? (config.detailTitle ? config.detailTitle(rec) : (rec.name || rec.title || rec.fullName || singular)) : singular;
        },
        icon: config.icon, module: moduleKey,
        render: function (ctx) {
          if (!Auth.can(moduleKey, 'view')) return UI.restricted(moduleKey);
          var rec = Store.find(config.collection, ctx.params.id);
          if (!rec) return notFound(config, singular);
          var title = config.detailTitle ? config.detailTitle(rec) : (rec.name || rec.title || rec.fullName || rec.certificateNumber || rec.id);
          var subtitle = config.detailSubtitle ? config.detailSubtitle(rec) : '';
          var badges = config.detailBadges ? config.detailBadges(rec) : '';
          var actions = detailActions(config, moduleKey, rec);
          return '<div class="page">' +
            '<nav class="breadcrumbs" aria-label="Breadcrumb">' + UI.crumbs([
              { label: 'Dashboard', href: '#/dashboard' },
              { label: config.title, href: '#/' + key },
              { label: U.truncate(String(title), 42) }
            ]) + '</nav>' +
            '<section class="detail-header">' +
              '<div class="detail-header-main">' +
                (config.detailAvatar ? config.detailAvatar(rec) : '') +
                '<h1>' + U.esc(title) + '</h1>' +
                (subtitle ? '<p class="muted">' + U.esc(subtitle) + '</p>' : '') +
                (badges ? '<div class="dh-meta">' + badges + '</div>' : '') +
              '</div>' +
              (actions ? '<div class="detail-actions no-print">' + actions + '</div>' : '') +
            '</section>' +
            '<div class="detail-body">' + config.detail(rec, ctx) + '</div>' +
          '</div>';
        },
        mount: function (ctx, root) {
          var rec = Store.find(config.collection, ctx.params.id);
          if (!rec) return;
          bindDetailEvents(root, config, moduleKey, rec, key);
          if (config.onDetailMount) config.onDetailMount(ctx, root, rec);
        }
      });
    }

    return { key: key, config: config };
  }

  /* ── Shared pieces ──────────────────────────────────────────────────────── */
  function defaultKeys(r) {
    return Object.keys(r).map(function (k) {
      var v = r[k];
      if (Array.isArray(v)) return v.join(' ');
      if (v && typeof v === 'object') return '';
      return v;
    });
  }

  function actionsHtml(config, moduleKey, ctx) {
    var out = [];
    if (config.headActions) out.push(config.headActions(moduleKey, ctx));
    if (Auth.can(moduleKey, 'create') && config.schema) {
      out.push('<button type="button" class="btn btn-primary" data-mod="new">' +
        Icons.svg('plus', { class: 'btn-ico' }) + 'Add ' + U.esc((config.singular || 'record').toLowerCase()) + '</button>');
    }
    if (Auth.can(moduleKey, 'export') && config.exportColumns) {
      out.push('<button type="button" class="btn btn-outline" data-mod="export">' +
        Icons.svg('download', { class: 'btn-ico' }) + 'Export CSV</button>');
    }
    if (config.extraHeadActions) out.push(config.extraHeadActions(moduleKey, ctx));
    return out.filter(Boolean).join('');
  }

  function toolbarExtra(config, moduleKey, table) {
    var out = [];
    if (config.toolbarExtra) out.push(config.toolbarExtra(moduleKey, table));
    return out.filter(Boolean).join('');
  }

  function columnsFor(config) {
    return (config.columns || []).map(function (c) {
      return {
        key: c.key, label: c.label, sortable: c.sortable !== false,
        sortValue: c.sortValue, className: c.className,
        render: c.render ? function (r, t) { return c.render(r, t); } : undefined
      };
    });
  }

  function rowActions(config, r, moduleKey) {
    if (config.rowActions) return config.rowActions(r, moduleKey);
    var out = '';
    if (config.detail) out += CRUD.viewBtn('#' + config.key + '/' + r.id, config.singular);
    if (Auth.can(moduleKey, 'edit')) out += CRUD.actionBtn('edit', r.id, 'edit', 'Edit ' + (config.singular || 'record').toLowerCase());
    if (Auth.can(moduleKey, 'delete')) out += CRUD.actionBtn('delete', r.id, 'trash', 'Delete ' + (config.singular || 'record').toLowerCase(), 'danger');
    return out;
  }

  function detailActions(config, moduleKey, rec) {
    var out = [];
    if (config.detailActions) out.push(config.detailActions(rec, moduleKey));
    if (config.printDoc) out.push('<button type="button" class="btn btn-outline btn-sm" data-doc="print">' + Icons.svg('print', { class: 'btn-ico' }) + 'Print</button>');
    if (Auth.can(moduleKey, 'edit')) out.push('<button type="button" class="btn btn-outline btn-sm" data-doc="edit">' + Icons.svg('edit', { class: 'btn-ico' }) + 'Edit</button>');
    if (Auth.can(moduleKey, 'delete')) out.push('<button type="button" class="btn btn-danger-outline btn-sm" data-doc="delete">' + Icons.svg('trash', { class: 'btn-ico' }) + 'Delete</button>');
    return out.filter(Boolean).join('');
  }

  /* ── CRUD plumbing ──────────────────────────────────────────────────────── */
  /**
   * openCreate(config, after, preset)
   * The second argument may also be a preset object of field values, so modules
   * can be opened pre-filled (e.g. a certificate for a course completer).
   */
  function openCreate(config, after, preset) {
    if (after && typeof after !== 'function') { preset = after; after = null; }
    return CRUD.openForm({
      mode: 'create', collection: config.collection, module: config.module || config.key,
      title: config.formTitle || ('Add ' + (config.singular || 'record').toLowerCase()),
      subtitle: config.formSubtitle, icon: config.icon || 'plus', size: config.formSize,
      values: preset || null,
      schema: config.schema,
      transform: config.transform,
      beforeSave: config.beforeSave,
      onOpen: config.onFormOpen,
      submitLabel: config.submitLabel,
      onSaved: function (rec, data, c) { if (config.afterSave) config.afterSave(rec, data); if (after) after(rec); if (config.detail && config.goToDetailAfterCreate !== false) Router.go('/' + config.key + '/' + rec.id); }
    });
  }

  function openEdit(config, rec, after) {
    return CRUD.openForm({
      mode: 'edit', collection: config.collection, module: config.module || config.key,
      values: rec,
      title: config.editTitle || ('Edit ' + (config.singular || 'record').toLowerCase()),
      subtitle: config.formSubtitle, icon: 'edit', size: config.formSize,
      schema: config.schema,
      transform: config.transform,
      beforeSave: config.beforeSave,
      onOpen: config.onFormOpen,
      submitLabel: 'Save changes',
      onSaved: function (r, data, c) { if (config.afterSave) config.afterSave(r, data); if (after) after(r); }
    });
  }

  function deleteRecord(config, id, after) {
    CRUD.remove({
      collection: config.collection, id: id, module: config.module || config.key,
      label: config.labelFor ? config.labelFor(Store.find(config.collection, id)) : undefined,
      snapshot: config.snapshot, restore: config.restore, cascade: config.cascade,
      details: config.deleteDetails,
      after: after
    });
  }

  function printRec(config, rec) {
    if (config.printDoc) {
      var out = config.printDoc(rec);
      Print.preview(out.html, { title: out.title, icon: config.icon });
    }
  }

  function bindListEvents(root, config, moduleKey, table, key) {
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-mod="new"]')) { openCreate(config, function () { if (table) table.refresh(); }); return; }
      if (e.target.closest('[data-mod="export"]')) {
        var rows = table ? table.getFiltered() : Store.all(config.collection);
        CRUD.exportRows({ rows: rows, columns: config.exportColumns, name: 'mrhs-ict-' + key, module: moduleKey });
        return;
      }
      var extra = e.target.closest('[data-mod-action]');
      if (extra && config.onAction) { config.onAction(extra.getAttribute('data-mod-action'), extra, table); return; }
      var act = e.target.closest('[data-action]');
      if (!act) return;
      var id = act.getAttribute('data-id');
      var rec = Store.find(config.collection, id);
      if (!rec) return;
      if (act.getAttribute('data-action') === 'edit') openEdit(config, rec, function () { if (table) table.refresh(); });
      else if (act.getAttribute('data-action') === 'delete') deleteRecord(config, id, function () { if (table) table.refresh(); });
      else if (act.getAttribute('data-action') === 'duplicate') CRUD.duplicate({ collection: config.collection, id: id, module: moduleKey, after: function () { if (table) table.refresh(); } });
      else if (config.onRowAction) config.onRowAction(act.getAttribute('data-action'), rec, table);
    });
  }

  function bindDetailEvents(root, config, moduleKey, rec, key) {
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-doc="edit"]')) { openEdit(config, rec, function () { Router.refresh(); }); return; }
      if (e.target.closest('[data-doc="delete"]')) {
        deleteRecord(config, rec.id, function () { Router.go('/' + key); });
        return;
      }
      if (e.target.closest('[data-doc="print"]')) { printRec(config, rec); return; }
      var extra = e.target.closest('[data-detail-action]');
      if (extra && config.onDetailAction) config.onDetailAction(extra.getAttribute('data-detail-action'), extra, rec);
      var rowAct = e.target.closest('[data-action]');
      if (rowAct && config.onDetailRowAction) config.onDetailRowAction(rowAct.getAttribute('data-action'), rowAct.getAttribute('data-id'), rec);
    });
  }

  function notFound(config, singular) {
    return '<div class="page">' + UI.emptyState({
      icon: 'search', title: singular + ' not found',
      message: 'This record may have been deleted, or the address is incorrect.',
      actions: '<a class="btn btn-primary" href="#/' + config.key + '">' + Icons.svg('arrow-left', { class: 'btn-ico' }) + 'Back to ' + U.esc(config.title) + '</a>'
    }) + '</div>';
  }

  /* ── Reusable detail section helpers ───────────────────────────────────── */
  function detailCard(title, body, opts) {
    opts = opts || {};
    return UI.card({
      title: title, icon: opts.icon, sub: opts.sub, body: body,
      head: opts.head, foot: opts.foot, flush: opts.flush, className: opts.className
    });
  }
  function relationList(items, opts) {
    opts = opts || {};
    if (!items.length) return UI.emptyState({
      icon: opts.icon || 'folder-open',
      title: opts.emptyTitle || 'No related records',
      message: opts.emptyMessage || 'Related records will be listed here once they exist.'
    });
    return '<div class="list-rows">' + items.map(function (i) { return i; }).join('') + '</div>';
  }

  global.ModuleHelper = {
    page: page, openCreate: openCreate, openEdit: openEdit, delete: deleteRecord,
    detailCard: detailCard, relationList: relationList, notFound: notFound,
    defaultKeys: defaultKeys
  };
})(window);
