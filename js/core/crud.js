/* ==========================================================================
   MRHS ICT CLUB MASTER — js/core/crud.js
   Shared create / read / update / delete flows so every module behaves the
   same way: permission guard → validated form → store write → toast →
   optional follow-up work (relations, notifications).
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  /* ── Permission guard ─────────────────────────────────────────────────── */
  /**
   * CRUD.guard('members', 'create') → true when allowed, otherwise toasts the
   * reason and returns false so callers can bail out early.
   */
  function guard(module, action, opts) {
    opts = opts || {};
    if (Auth.can(module, action)) return true;
    if (!opts.silent) {
      var user = Auth.currentUser();
      UI.toast(
        'Action not permitted',
        (user ? 'Your role (' + user.role + ') ' : 'Your account ') + 'cannot ' + action + ' records in this module.',
        'warning'
      );
    }
    return false;
  }

  /* ── Create / edit ────────────────────────────────────────────────────── */
  /**
   * CRUD.openForm({
   *   mode: 'create' | 'edit',
   *   collection: 'members',
   *   module: 'members',                 // for the permission guard
   *   title, subtitle, icon, size,
   *   schema: function(values) → field[],   // built with the current values
   *   values: object,                       // existing record for edit mode
   *   transform: function(data, values) → record patch,
   *   beforeSave: function(data, values) → false | errors,
   *   onSaved: function(record, data),
   *   extraActions: [ ... ],
   *   submitLabel
   * })
   */
  function openForm(opts) {
    var mode = opts.mode || 'create';
    var action = mode === 'create' ? 'create' : 'edit';
    if (!guard(opts.module || opts.collection, action)) return null;

    var values = opts.values || {};
    var schema = typeof opts.schema === 'function' ? opts.schema(values) : (opts.schema || []);

    var ctrl = UI.formModal({
      title: opts.title || (mode === 'create' ? 'New record' : 'Edit record'),
      subtitle: opts.subtitle,
      icon: opts.icon || (mode === 'create' ? 'plus' : 'edit'),
      size: opts.size || (schema.length > 8 ? 'lg' : ''),
      formHtml: Forms.render(schema, values),
      submitLabel: opts.submitLabel || (mode === 'create' ? 'Save record' : 'Save changes'),
      submitIcon: opts.submitIcon || (mode === 'create' ? 'plus' : 'save'),
      cancelLabel: 'Cancel',
      dismissible: opts.dismissible,
      extraActions: opts.extraActions,
      onOpen: function (c, form) {
        Forms.init(form);
        Forms.bindImageUpload(form);
        if (opts.onOpen) opts.onOpen(c, form, values);
      },
      validate: function (data) {
        var errors = Forms.validate(schema, data);
        if (opts.beforeSave) {
          var extra = opts.beforeSave(data, values);
          if (extra === false) errors.__form = 'Please correct the highlighted problems.';
          else if (extra && typeof extra === 'object') {
            Object.keys(extra).forEach(function (k) {
              if (k === '__form') errors.__form = extra[k]; else errors[k] = extra[k];
            });
          }
        }
        return errors;
      },
      onSubmit: function (data, c, form) {
        var record = opts.transform ? opts.transform(data, values) : data;
        if (mode === 'create') {
          Object.keys(values).forEach(function (k) { if (record[k] === undefined) record[k] = values[k]; });
          var created = Store.insert(opts.collection, record);
          // optional parent pointer (e.g. a task belonging to a project)
          if (opts.parentField && opts.parentId && created) created[opts.parentField] = opts.parentId;
          UI.toast(opts.savedTitle || 'Saved successfully',
            opts.savedMessage ? opts.savedMessage(created, data) : (labelOf(created) + ' has been added.'),
            'success');
          if (opts.onSaved) opts.onSaved(created, data, c);
          return true;
        }
        var updated = Store.update(opts.collection, values.id, record);
        UI.toast('Changes saved', opts.updatedMessage || (labelOf(updated) + ' has been updated.'), 'success');
        if (opts.onSaved) opts.onSaved(updated, data, c);
        return true;
      }
    });
    return ctrl;
  }

  function labelOf(rec) {
    if (!rec) return 'The record';
    return '“' + U.truncate(rec.name || rec.fullName || rec.title || rec.certificateNumber || rec.code || rec.id || 'Record', 48) + '”';
  }

  /* ── Delete ───────────────────────────────────────────────────────────── */
  /**
   * CRUD.remove({collection, id, module, title, message, label, after})
   * Confirms first, then deletes and toasts with an Undo action.
   */
  function remove(opts) {
    if (!guard(opts.module || opts.collection, 'delete')) return Promise.resolve(false);
    var rec = Store.find(opts.collection, opts.id);
    if (!rec) {
      UI.toast('Record not found', 'It may already have been deleted.', 'error');
      return Promise.resolve(false);
    }
    var label = opts.label || rec.name || rec.fullName || rec.title || rec.certificateNumber || 'this record';
    return UI.confirm({
      title: opts.title || 'Delete record',
      message: opts.message || 'Are you sure you want to delete “' + label + '”?',
      details: opts.details || 'This action removes the record from the club database. You will be able to undo it immediately afterwards.',
      confirmLabel: opts.confirmLabel || 'Delete record',
      confirmIcon: 'trash',
      tone: 'danger'
    }).then(function (ok) {
      if (!ok) return false;
      var snapshot = U.clone(rec);
      var extraSnapshot = opts.snapshot ? opts.snapshot(rec) : null;
      Store.remove(opts.collection, opts.id);
      if (opts.cascade) opts.cascade(rec);
      UI.toast('Deleted', '“' + U.truncate(label, 46) + '” has been removed.', 'success', {
        actionLabel: 'Undo',
        duration: 9000,
        onAction: function () {
          Store.insert(opts.collection, snapshot);
          if (opts.restore && extraSnapshot) opts.restore(extraSnapshot);
          if (opts.after) opts.after();
          UI.toast('Restored', 'The record has been restored.', 'info');
        }
      });
      if (opts.after) opts.after();
      return true;
    });
  }

  /* ── Duplicate ────────────────────────────────────────────────────────── */
  function duplicate(opts) {
    if (!guard(opts.module || opts.collection, 'create')) return null;
    var rec = Store.find(opts.collection, opts.id);
    if (!rec) return null;
    var copy = U.clone(rec);
    delete copy.id;
    copy.createdAt = null;
    if (opts.rename) opts.rename(copy, rec);
    var created = Store.insert(opts.collection, copy);
    UI.toast('Duplicated', labelOf(created) + ' was copied.', 'success');
    if (opts.after) opts.after(created);
    return created;
  }

  /* ── Business codes ───────────────────────────────────────────────────── */
  function nextCode(collection, field, prefix, pad, start) {
    return U.nextCode(Store.all(collection), field, prefix, pad || 3, start || 0);
  }
  function codePreview(collection, field, prefix, pad) {
    return '<span class="id-pill">' + U.esc(nextCode(collection, field, prefix, pad)) + '</span>';
  }

  /* ── Export ───────────────────────────────────────────────────────────── */
  /**
   * CRUD.exportRows({rows, columns, name, module})
   * columns: [{key, label, value(record)}]
   */
  function exportRows(opts) {
    if (!Auth.can(opts.module || 'dashboard', 'export')) {
      UI.toast('Export not permitted', 'Your role cannot export records from this module.', 'warning');
      return;
    }
    var rows = opts.rows || [];
    if (!rows.length) { UI.toast('Nothing to export', 'There are no records in the current view.', 'warning'); return; }
    var cols = (opts.columns || []).map(function (c) {
      return { label: c.label || U.titleCase(c.key), value: c.value || (function (r) { return r[c.key]; }) };
    });
    var header = cols.map(function (c) { return c.label; }).join(',');
    var lines = rows.map(function (r) {
      return cols.map(function (c) {
        var v = c.value(r);
        if (Array.isArray(v)) v = v.join('; ');
        if (v === null || v === undefined) v = '';
        var s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? '"' + s + '"' : s;
      }).join(',');
    });
    U.download((opts.name || 'mrhs-ict-export') + '-' + U.todayISO() + '.csv', '\uFEFF' + header + '\r\n' + lines.join('\r\n'), 'text/csv;charset=utf-8');
    UI.toast('Export complete', rows.length + ' ' + U.plural(rows.length, 'record') + ' exported as CSV.', 'success');
  }

  /* ── CSV import ───────────────────────────────────────────────────────── */
  /**
   * CRUD.importCSV({file, collection, module, mapping, defaults, onDone})
   * mapping: { csvHeader: recordField }  — unmapped columns are ignored.
   */
  function importCSV(opts) {
    if (!guard(opts.module || opts.collection, 'create')) return Promise.resolve(0);
    return U.readFile(opts.file).then(function (text) {
      var rows = U.parseCSV(text);
      if (!rows.length) throw new Error('The file did not contain any data rows.');
      var created = 0, skipped = 0, errors = [];
      rows.forEach(function (row, idx) {
        var rec = Object.assign({}, opts.defaults || {}, { demo: false, importedAt: new Date().toISOString() });
        Object.keys(opts.mapping || {}).forEach(function (header) {
          var field = opts.mapping[header];
          if (field && row[header] !== undefined) rec[field] = row[header];
        });
        if (opts.transform) rec = opts.transform(rec, row) || rec;
        if (opts.validateRow && !opts.validateRow(rec)) { skipped++; errors.push('Row ' + (idx + 2) + ': missing required values.'); return; }
        Store.insert(opts.collection, rec);
        created++;
      });
      return { created: created, skipped: skipped, errors: errors, total: rows.length };
    });
  }

  /* ── Relation helpers used by several modules ────────────────────────── */
  function attendanceFor(contextType, contextId) {
    return Store.where('attendance', function (a) { return a.contextType === contextType && a.contextId === contextId; });
  }
  function attendanceRate(contextType, contextId, expected) {
    var rows = attendanceFor(contextType, contextId);
    if (!rows.length) return null;
    var attended = rows.filter(function (r) { return r.status === 'Present' || r.status === 'Late'; }).length;
    var base = expected || rows.length;
    return { present: rows.filter(function (r) { return r.status === 'Present'; }).length, late: rows.filter(function (r) { return r.status === 'Late'; }).length,
      absent: rows.filter(function (r) { return r.status === 'Absent'; }).length, excused: rows.filter(function (r) { return r.status === 'Excused'; }).length,
      total: rows.length, rate: U.percent(attended, base) };
  }
  function memberAttendance(memberId) {
    return Store.where('attendance', function (a) { return a.memberId === memberId; });
  }
  function projectProgress(projectId) {
    var tasks = Store.where('projectTasks', function (t) { return t.projectId === projectId; });
    if (!tasks.length) return 0;
    var weights = { 'Completed': 1, 'In Progress': 0.5, 'Pending': 0, 'Overdue': 0.15 };
    var total = tasks.reduce(function (a, t) { return a + (weights[t.status] === undefined ? 0 : weights[t.status]); }, 0);
    return Math.round((total / tasks.length) * 100);
  }
  function courseEnrollments(courseId) {
    return Store.where('enrollments', function (e) { return e.courseId === courseId; });
  }
  function courseCompletion(courseId) {
    var rows = courseEnrollments(courseId);
    if (!rows.length) return 0;
    return Math.round(U.avg(rows.map(function (r) { return r.progress; })) || 0);
  }
  function refreshDerived() {
    // Keep computed columns on projects and courses in sync after edits.
    Store.all('projects').forEach(function (p) {
      var computed = projectProgress(p.id);
      if (p.status === 'Completed' || p.status === 'Archived') computed = 100;
      if (p.progress !== computed) p.progress = computed;
    });
    Store.all('courses').forEach(function (c) {
      c.completionRate = courseCompletion(c.id);
    });
    Store.save('projects', true);
    Store.save('courses', true);
  }

  /* ── Row action button helpers ────────────────────────────────────────── */
  function viewBtn(href, label) {
    return '<a class="mini-btn" href="' + href + '" title="View ' + U.attr(label || 'record') + '" aria-label="View ' + U.attr(label || 'record') + '">' + Icons.svg('eye') + '</a>';
  }
  function actionBtn(action, id, icon, label, tone) {
    return '<button type="button" class="mini-btn' + (tone ? ' ' + tone : '') + '" data-action="' + action + '" data-id="' + U.attr(id) + '" title="' + U.attr(label) + '" aria-label="' + U.attr(label) + '">' + Icons.svg(icon) + '</button>';
  }
  function editDelete(id, label, extra) {
    return (extra || '') +
      actionBtn('edit', id, 'edit', 'Edit ' + (label || 'record')) +
      actionBtn('delete', id, 'trash', 'Delete ' + (label || 'record'), 'danger');
  }

  global.CRUD = {
    guard: guard, openForm: openForm, remove: remove, duplicate: duplicate,
    nextCode: nextCode, codePreview: codePreview, labelOf: labelOf,
    exportRows: exportRows, importCSV: importCSV,
    attendanceFor: attendanceFor, attendanceRate: attendanceRate, memberAttendance: memberAttendance,
    projectProgress: projectProgress, courseEnrollments: courseEnrollments, courseCompletion: courseCompletion,
    refreshDerived: refreshDerived,
    viewBtn: viewBtn, actionBtn: actionBtn, editDelete: editDelete
  };
})(window);
