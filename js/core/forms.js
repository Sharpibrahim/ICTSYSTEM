/* ==========================================================================
   MRHS ICT CLUB MASTER — js/core/forms.js
   Declarative forms: modules describe a schema, this file renders the HTML,
   wires the rich inputs (tags, member pickers, file pickers, ranges) and
   validates the submitted values.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  /* ── Option helpers ───────────────────────────────────────────────────── */
  function optionsFrom(list) {
    var arr = typeof list === 'function' ? list() : list;
    return (arr || []).map(function (v) {
      return typeof v === 'string' ? { value: v, label: v } : v;
    });
  }
  function membersOptions(filter) {
    return U.sortBy(Store.all('members').filter(filter || function () { return true; }), 'fullName')
      .map(function (m) { return { value: m.id, label: m.fullName + ' · ' + m.klass + (m.clubRole && m.clubRole !== 'Member' ? ' · ' + m.clubRole : '') }; });
  }
  function usersOptions(filter) {
    return Store.all('users').filter(filter || function () { return true; })
      .map(function (u) { return { value: u.id, label: u.name + ' (' + u.role + ')' }; });
  }
  function cabinetOptions() {
    return U.sortBy(Store.all('cabinet'), 'order').map(function (c) { return { value: c.memberId, label: c.name + ' · ' + c.position }; });
  }
  function coursesOptions(filter) {
    return Store.all('courses').filter(filter || function () { return true; })
      .map(function (c) { return { value: c.id, label: c.name + ' (' + c.status + ')' }; });
  }
  function projectsOptions() {
    return Store.all('projects').map(function (p) { return { value: p.id, label: p.name + ' (' + p.status + ')' }; });
  }
  function meetingsOptions() {
    return U.sortBy(Store.all('meetings'), 'date', 'desc').map(function (m) { return { value: m.id, label: U.fmtDate(m.date) + ' · ' + m.title }; });
  }
  function activitiesOptions() {
    return U.sortBy(Store.all('activities'), 'date', 'desc').map(function (a) { return { value: a.id, label: U.fmtDate(a.date) + ' · ' + a.title }; });
  }
  function albumsOptions() {
    return Store.all('albums').map(function (a) { return { value: a.id, label: a.name }; });
  }

  /* ── Individual controls ──────────────────────────────────────────────── */
  function control(f) {
    var name = U.attr(f.name);
    var id = f.id || ('fld-' + f.name + '-' + Math.random().toString(36).slice(2, 6));
    var req = f.required ? ' required' : '';
    var dis = f.disabled ? ' disabled' : '';
    var ph = f.placeholder ? ' placeholder="' + U.attr(f.placeholder) + '"' : '';
    var help = f.help ? ' aria-describedby="' + id + '-help"' : '';
    var cls = ' class="' + (f.className || '') + '"';
    var value = f.value === undefined || f.value === null ? '' : f.value;

    switch (f.type) {
      case 'textarea':
        return '<textarea id="' + id + '" name="' + name + '" rows="' + (f.rows || 4) + '"' + req + dis + ph + help + cls +
          (f.maxlength ? ' maxlength="' + f.maxlength + '"' : '') + '>' + U.esc(value) + '</textarea>';

      case 'select': {
        var opts = optionsFrom(f.options);
        return '<select id="' + id + '" name="' + name + '"' + req + dis + help + cls + (f.multiple ? ' multiple size="' + (f.size || 6) + '"' : '') + '>' +
          (f.multiple ? '' : (f.emptyLabel !== undefined ? '<option value="">' + U.esc(f.emptyLabel) + '</option>' : '')) +
          opts.map(function (o) {
            var sel = f.multiple
              ? (Array.isArray(value) && value.indexOf(o.value) !== -1)
              : String(value) === String(o.value);
            return '<option value="' + U.attr(o.value) + '"' + (sel ? ' selected' : '') + '>' + U.esc(o.label) + '</option>';
          }).join('') + '</select>';
      }

      case 'checkbox':
        return '<label class="check"><input id="' + id + '" type="checkbox" name="' + name + '"' + (value ? ' checked' : '') + dis + '><span>' + U.esc(f.checkLabel || 'Yes') + '</span></label>';

      case 'switch':
        return '<label class="switch"><input id="' + id + '" type="checkbox" name="' + name + '"' + (value ? ' checked' : '') + dis + '><span class="track"></span>' +
          '<span class="switch-label">' + U.esc(f.switchLabel || f.label || 'Enabled') + '</span></label>';

      case 'checkboxes': {
        var list = optionsFrom(f.options);
        return '<div class="check-list" role="group" aria-label="' + U.attr(f.label) + '">' + list.map(function (o) {
          var checked = Array.isArray(value) && value.indexOf(o.value) !== -1;
          return '<label class="check"><input type="checkbox" name="' + name + '" value="' + U.attr(o.value) + '" data-multi="1"' +
            (checked ? ' checked' : '') + '><span>' + U.esc(o.label) + '</span></label>';
        }).join('') + '</div>';
      }

      case 'radio': {
        var ropts = optionsFrom(f.options);
        return '<div class="check-list" role="radiogroup" aria-label="' + U.attr(f.label) + '">' + ropts.map(function (o) {
          return '<label class="check"><input type="radio" name="' + name + '" value="' + U.attr(o.value) + '"' +
            (String(value) === String(o.value) ? ' checked' : '') + '><span>' + U.esc(o.label) + '</span></label>';
        }).join('') + '</div>';
      }

      case 'tags':
        return '<div class="tags-input" data-tags="' + name + '" tabindex="-1">' +
          (Array.isArray(value) ? value.map(function (t) { return tagChip(t); }).join('') : '') +
          '<input type="text" placeholder="' + U.attr(f.placeholder || 'Type and press Enter') + '" aria-label="Add tag" data-tags-field>' +
          '</div><input type="hidden" name="' + name + '" value="' + U.attr(Array.isArray(value) ? value.join(', ') : '') + '" data-tags-store>';

      case 'range':
        return '<div class="range-row"><input id="' + id + '" type="range" name="' + name + '" min="' + (f.min || 0) + '" max="' + (f.max || 100) +
          '" step="' + (f.step || 1) + '" value="' + U.attr(value === '' ? 0 : value) + '" data-range>' +
          '<span class="range-value" data-range-out>' + U.esc(value === '' ? 0 : value) + (f.suffix || '%') + '</span></div>';

      case 'member':
        return '<select id="' + id + '" name="' + name + '"' + req + dis + '>' + '<option value="">Select a member…</option>' +
          membersOptions(f.filter).map(function (o) {
            return '<option value="' + U.attr(o.value) + '"' + (String(value) === String(o.value) ? ' selected' : '') + '>' + U.esc(o.label) + '</option>';
          }).join('') + '</select>';

      case 'members':
        return '<select id="' + id + '" name="' + name + '" multiple size="' + (f.size || 8) + '"' + req + dis + '>' +
          membersOptions(f.filter).map(function (o) {
            return '<option value="' + U.attr(o.value) + '"' + (Array.isArray(value) && value.indexOf(o.value) !== -1 ? ' selected' : '') + '>' + U.esc(o.label) + '</option>';
          }).join('') + '</select><p class="help">Hold Ctrl (or ⌘) to select several members.</p>';

      case 'user':
        return '<select id="' + id + '" name="' + name + '"' + req + dis + '><option value="">Select a user…</option>' +
          usersOptions(f.filter).map(function (o) {
            return '<option value="' + U.attr(o.value) + '"' + (String(value) === String(o.value) ? ' selected' : '') + '>' + U.esc(o.label) + '</option>';
          }).join('') + '</select>';

      case 'cabinet':
        return '<select id="' + id + '" name="' + name + '"' + req + dis + '><option value="">Select position holder…</option>' +
          cabinetOptions().map(function (o) {
            return '<option value="' + U.attr(o.value) + '"' + (String(value) === String(o.value) ? ' selected' : '') + '>' + U.esc(o.label) + '</option>';
          }).join('') + '</select>';

      case 'course':
        return '<select id="' + id + '" name="' + name + '"' + req + dis + '><option value="">Select a course…</option>' +
          coursesOptions().map(function (o) {
            return '<option value="' + U.attr(o.value) + '"' + (String(value) === String(o.value) ? ' selected' : '') + '>' + U.esc(o.label) + '</option>';
          }).join('') + '</select>';

      case 'project':
        return '<select id="' + id + '" name="' + name + '"' + req + dis + '><option value="">Select a project…</option>' +
          projectsOptions().map(function (o) {
            return '<option value="' + U.attr(o.value) + '"' + (String(value) === String(o.value) ? ' selected' : '') + '>' + U.esc(o.label) + '</option>';
          }).join('') + '</select>';

      case 'meeting':
        return '<select id="' + id + '" name="' + name + '"' + req + dis + '><option value="">Select a meeting…</option>' +
          meetingsOptions().map(function (o) {
            return '<option value="' + U.attr(o.value) + '"' + (String(value) === String(o.value) ? ' selected' : '') + '>' + U.esc(o.label) + '</option>';
          }).join('') + '</select>';

      case 'activity':
        return '<select id="' + id + '" name="' + name + '"' + req + dis + '><option value="">Select an activity…</option>' +
          activitiesOptions().map(function (o) {
            return '<option value="' + U.attr(o.value) + '"' + (String(value) === String(o.value) ? ' selected' : '') + '>' + U.esc(o.label) + '</option>';
          }).join('') + '</select>';

      case 'album':
        return '<select id="' + id + '" name="' + name + '"' + req + dis + '><option value="">Select an album…</option>' +
          albumsOptions().map(function (o) {
            return '<option value="' + U.attr(o.value) + '"' + (String(value) === String(o.value) ? ' selected' : '') + '>' + U.esc(o.label) + '</option>';
          }).join('') + '</select>';

      case 'file':
        return '<input id="' + id + '" type="file" name="' + name + '"' + (f.accept ? ' accept="' + U.attr(f.accept) + '"' : '') + dis + help + '>' +
          (f.image ? '<p class="help">Images are stored in the browser database (IndexedDB) for this prototype.</p>' : '');

      case 'color':
        return '<input id="' + id + '" type="color" name="' + name + '" value="' + U.attr(value || '#235236') + '"' + dis + '>';

      case 'hidden':
        return '<input type="hidden" name="' + name + '" value="' + U.attr(value) + '">';

      case 'static':
        return '<div class="kv"><span class="v">' + (f.html || U.esc(value)) + '</span></div>';

      case 'html':
        return f.html || '';

      case 'divider':
        return '<div class="divider-text col-2"><span>' + U.esc(f.label || '') + '</span></div>';

      default:
        return '<input id="' + id + '" type="' + (f.type || 'text') + '" name="' + name + '" value="' + U.attr(value) + '"' + req + dis + ph + help + cls +
          (f.min !== undefined ? ' min="' + f.min + '"' : '') + (f.max !== undefined ? ' max="' + f.max + '"' : '') +
          (f.step !== undefined ? ' step="' + f.step + '"' : '') + (f.maxlength ? ' maxlength="' + f.maxlength + '"' : '') +
          (f.inputmode ? ' inputmode="' + f.inputmode + '"' : '') + '>';
    }
  }
  function tagChip(t) {
    return '<span class="chip" data-tag="' + U.attr(t) + '">' + U.esc(t) +
      '<button type="button" aria-label="Remove ' + U.attr(t) + '" data-tag-remove>' + Icons.svg('x') + '</button></span>';
  }

  /* ── Schema rendering ─────────────────────────────────────────────────── */
  function render(schema, values, opts) {
    opts = opts || {};
    values = values || {};
    var out = '<div class="form-grid' + (opts.className ? ' ' + opts.className : '') + '">';
    (schema || []).forEach(function (f) {
      if (f.type === 'html' || f.type === 'divider') {
        out += '<div class="col-2">' + control(f) + '</div>';
        return;
      }
      var value = values[f.name] !== undefined ? values[f.name] : f.value;
      var spec = Object.assign({}, f, { value: value });
      var span = f.colSpan === 2 || f.full ? ' col-2' : '';
      if (f.type === 'static' || f.type === 'fieldset') span = f.colSpan === 2 || f.full !== false ? ' col-2' : '';
      if (f.twoCol === false) span = '';
      var body = f.type === 'fieldset'
        ? '<fieldset class="fieldset col-2"><legend>' + U.esc(f.label) + '</legend><div class="form-grid">' +
            (f.fields || []).map(function (sf) {
              var sv = values[sf.name] !== undefined ? values[sf.name] : sf.value;
              return '<div class="field' + (sf.colSpan === 2 ? ' col-2' : '') + '">' + labelFor(sf) + control(Object.assign({}, sf, { value: sv })) +
                (sf.help ? '<p class="help">' + U.esc(sf.help) + '</p>' : '') + '</div>';
            }).join('') + '</div></fieldset>'
        : '<div class="field' + span + '">' + labelFor(spec) + control(spec) +
          (f.help && ['checkbox', 'switch', 'tags', 'checkboxes', 'radio', 'members'].indexOf(f.type) === -1 ? '<p class="help" id="fld-' + U.attr(f.name) + '-help">' + U.esc(f.help) + '</p>' : '') +
          '</div>';
      out += body;
    });
    return out + '</div>';
  }
  function labelFor(f) {
    if (f.type === 'checkbox' || f.type === 'switch' || f.type === 'hidden' || !f.label) return '';
    return '<label for="fld-' + U.attr(f.name) + '">' + U.esc(f.label) + (f.required ? ' <span class="req" title="Required field">*</span>' : '') + '</label>';
  }

  /* ── Collecting values ────────────────────────────────────────────────── */
  function collect(root) {
    var data = {};
    U.$$('[name]', root).forEach(function (field) {
      var name = field.getAttribute('name');
      if (field.type === 'checkbox') {
        if (field.hasAttribute('data-multi')) {
          data[name] = data[name] || [];
          if (field.checked) data[name].push(field.value);
        } else data[name] = field.checked;
      } else if (field.type === 'radio') {
        if (field.checked) data[name] = field.value;
      } else if (field.multiple) {
        data[name] = Array.prototype.slice.call(field.selectedOptions).map(function (o) { return o.value; });
      } else {
        data[name] = field.value;
      }
    });
    return data;
  }

  /* ── Validation ───────────────────────────────────────────────────────── */
  function flatten(schema) {
    var out = [];
    (schema || []).forEach(function (f) {
      if (f.type === 'fieldset' && f.fields) out = out.concat(f.fields);
      else out.push(f);
    });
    return out;
  }
  function validate(schema, values) {
    var errors = {};
    flatten(schema).forEach(function (f) {
      if (!f.name || f.type === 'html' || f.type === 'divider' || f.disabled) return;
      var v = values[f.name];
      var empty = v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length) || (f.type === 'checkbox' && v === false);
      if (f.required && empty) {
        errors[f.name] = (f.label || U.titleCase(f.name)) + ' is required.';
        return;
      }
      if (empty) {
        if (f.type === 'email' && value_present(v)) errors[f.name] = 'Enter a valid email address.';
        return;
      }
      if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v))) errors[f.name] = 'Enter a valid email address (for example name@school.ac.ug).';
      if (f.type === 'tel' && String(v).replace(/\D/g, '').length < 7) errors[f.name] = 'Enter a valid phone number.';
      if (f.type === 'number' || f.type === 'range') {
        var n = Number(v);
        if (isNaN(n)) errors[f.name] = 'Enter a number.';
        else if (f.min !== undefined && n < f.min) errors[f.name] = 'Value must be at least ' + f.min + '.';
        else if (f.max !== undefined && n > f.max) errors[f.name] = 'Value must not exceed ' + f.max + '.';
      }
      if (f.minLength && String(v).length < f.minLength) errors[f.name] = 'Use at least ' + f.minLength + ' characters.';
      if (f.pattern && !new RegExp(f.pattern).test(String(v))) errors[f.name] = f.patternMessage || 'The value entered is not in the expected format.';
      if (f.validate && typeof f.validate === 'function') {
        var msg = f.validate(v, values);
        if (msg) errors[f.name] = msg;
      }
      if (f.compareField && values[f.compareField]) {
        var a = U.toDate(v), b = U.toDate(values[f.compareField]);
        if (a && b && f.compare === 'after' && a < b) errors[f.name] = (f.label || 'This date') + ' must be after ' + (f.compareLabel || 'the start date') + '.';
      }
      if (f.uniqueKey) {
        var clash = U.findBy(Store.all(f.uniqueKey.collection), function (r) {
          return r.id !== f.uniqueKey.exceptId && U.norm(r[f.uniqueKey.field]) === U.norm(v);
        });
        if (clash) errors[f.name] = 'That ' + (f.uniqueKey.label || f.name) + ' is already used by another record.';
      }
    });
    return errors;
  }
  function value_present(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }

  /* ── Rich input wiring ────────────────────────────────────────────────── */
  function init(root) {
    // Tags inputs
    U.$$('[data-tags]', root).forEach(function (wrap) {
      var store = wrap.parentNode.querySelector('[data-tags-store]');
      var field = wrap.querySelector('[data-tags-field]');
      function sync() {
        var tags = U.$$('[data-tag]', wrap).map(function (c) { return c.getAttribute('data-tag'); });
        store.value = tags.join(', ');
      }
      function add(val) {
        val = String(val).trim().replace(/,$/, '');
        if (!val) return;
        var exists = U.$$('[data-tag]', wrap).some(function (c) { return U.norm(c.getAttribute('data-tag')) === U.norm(val); });
        if (!exists) wrap.insertBefore(U.el(tagChip(val)), field);
        field.value = '';
        sync();
      }
      wrap.addEventListener('click', function (e) {
        if (e.target.closest('[data-tag-remove]')) {
          e.target.closest('[data-tag]').remove();
          sync();
          return;
        }
        field.focus();
      });
      field.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(field.value); }
        if (e.key === 'Backspace' && !field.value) {
          var last = U.$$('[data-tag]', wrap).pop();
          if (last) { last.remove(); sync(); }
        }
      });
      field.addEventListener('blur', function () { if (field.value.trim()) add(field.value); });
      sync();
    });

    // Range outputs
    U.$$('[data-range]', root).forEach(function (r) {
      var out = r.parentNode.querySelector('[data-range-out]');
      var suffix = out ? (out.textContent.match(/[^\d]+$/) || ['%'])[0] : '%';
      function upd() { if (out) out.textContent = r.value + suffix; }
      r.addEventListener('input', upd); upd();
    });

    // Automatic "unique" helpers and live previews
    U.$$('[data-preview]', root).forEach(function (input) {
      var target = root.querySelector(input.getAttribute('data-preview'));
      if (!target) return;
      function upd() { target.textContent = input.value || '—'; }
      input.addEventListener('input', upd); upd();
    });

    // Character counter
    U.$$('[data-counter]', root).forEach(function (input) {
      var target = root.querySelector(input.getAttribute('data-counter'));
      if (!target) return;
      function upd() { target.textContent = input.value.length + ' characters'; }
      input.addEventListener('input', upd); upd();
    });
  }

  /* ── File helpers ─────────────────────────────────────────────────────── */
  function imageUpload(name, currentFileId, opts) {
    opts = opts || {};
    return '<div class="input-group">' +
      '<input type="file" name="' + U.attr(name) + '" accept="image/*" data-img-input>' +
      '<input type="hidden" name="' + U.attr(name) + 'FileId" value="' + U.attr(currentFileId || '') + '" data-img-store>' +
      '</div>' +
      '<div class="mt-1" data-img-preview>' + (currentFileId ? '<span class="loading-inline"><span class="spinner"></span>Loading image…</span>' : '') + '</div>';
  }
  function bindImageUpload(root) {
    U.$$('[data-img-input]', root).forEach(function (input) {
      var store = root.querySelector('[data-img-store]');
      var preview = root.querySelector('[data-img-preview]');
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        if (file.size > 2.5 * 1024 * 1024) {
          UI.toast('Image too large', 'Please choose an image smaller than 2.5 MB.', 'warning');
          input.value = '';
          return;
        }
        if (preview) preview.innerHTML = '<span class="loading-inline"><span class="spinner"></span>Processing image…</span>';
        U.readFileAsDataURL(file).then(function (dataUrl) {
          return Store.files.put(file.name, file.type, dataUrl);
        }).then(function (id) {
          if (store) store.value = id;
          if (preview) preview.innerHTML = '<img src="' + dataUrlSafe(preview, id) + '" alt="Selected image preview" style="width:96px;height:96px;object-fit:cover;border-radius:12px;border:1px solid var(--border)">';
          input.dataset.previewSrc = '';
        }).catch(function () {
          if (preview) preview.innerHTML = '<p class="field-error">The image could not be processed.</p>';
        });
        function dataUrlSafe(host, fileId) { return host.__lastPreview || ''; }
      });
      // simpler reliable preview path
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        var fr = new FileReader();
        fr.onload = function () {
          if (preview) preview.innerHTML = '<img src="' + fr.result + '" alt="Selected image preview" style="width:96px;height:96px;object-fit:cover;border-radius:12px;border:1px solid var(--border)">';
        };
        fr.readAsDataURL(file);
      });
    });
  }
  function loadImagePreview(host, fileId) {
    if (!fileId || !host) return;
    Store.files.get(fileId).then(function (rec) {
      if (rec && rec.dataUrl) host.innerHTML = '<img src="' + rec.dataUrl + '" alt="Stored image" style="width:96px;height:96px;object-fit:cover;border-radius:12px;border:1px solid var(--border)">';
    });
  }

  /* ── Attendance grid builder ──────────────────────────────────────────── */
  /**
   * Renders a keypad-style attendance recorder.
   * members: [{id, fullName, klass, clubRole, membershipStatus}]
   */
  function attendanceGrid(members, existing) {
    var map = {};
    (existing || []).forEach(function (r) { map[r.memberId] = r; });
    var rows = members.map(function (m) {
      var current = map[m.id] ? map[m.id].status : 'Present';
      return '<tr data-att-row="' + U.attr(m.id) + '">' +
        '<td class="cell-primary">' + UI.personCell(m.fullName, m.klass + ' · ' + m.clubRole, { size: 'sm', link: '#/members/' + m.id }) + '</td>' +
        '<td data-label="Status" class="att-status-cell">' +
          '<div class="segmented att-seg" role="group" aria-label="Attendance status for ' + U.attr(m.fullName) + '">' +
            ['Present', 'Late', 'Excused', 'Absent'].map(function (s) {
              return '<button type="button" data-att="' + s + '" class="' + (current === s ? 'active' : '') + '" title="' + s + '">' + U.esc(s) + '</button>';
            }).join('') +
          '</div>' +
        '</td>' +
        '<td data-label="Remarks"><input type="text" data-att-remark value="' + U.attr(map[m.id] ? (map[m.id].remarks || '') : '') + '" placeholder="Optional remark" aria-label="Remark for ' + U.attr(m.fullName) + '"></td>' +
      '</tr>';
    }).join('');
    return '<div class="table-wrap stacked"><table class="data-table att-table"><thead><tr>' +
      '<th>Member</th><th>Status</th><th>Remark</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function readAttendanceGrid(root) {
    return U.$$('[data-att-row]', root).map(function (tr) {
      var active = tr.querySelector('[data-att] .active') || tr.querySelector('[data-att].active');
      var seg = tr.querySelector('.att-seg');
      var status = 'Present';
      if (seg) {
        var btn = U.$$('[data-att]', seg).filter(function (b) { return b.classList.contains('active'); })[0];
        if (btn) status = btn.getAttribute('data-att');
      }
      var remark = tr.querySelector('[data-att-remark]');
      return { memberId: tr.getAttribute('data-att-row'), status: status, remarks: remark ? remark.value.trim() : '' };
    });
  }
  function initAttendanceGrid(root) {
    U.$$('.att-seg', root).forEach(function (seg) {
      seg.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-att]');
        if (!btn) return;
        U.$$('[data-att]', seg).forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
    });
    var allBtns = U.$$('[data-att-mark]', root);
    allBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var status = b.getAttribute('data-att-mark');
        U.$$('.att-seg', root).forEach(function (seg) {
          U.$$('[data-att]', seg).forEach(function (x) { x.classList.toggle('active', x.getAttribute('data-att') === status); });
        });
        UI.toast('Marked all ' + status.toLowerCase(), 'You can still adjust individual members before saving.', 'info', { duration: 2500 });
      });
    });
  }

  global.Forms = {
    render: render, collect: collect, validate: validate, init: init, control: control,
    bindImageUpload: bindImageUpload, loadImagePreview: loadImagePreview, imageUpload: imageUpload,
    membersOptions: membersOptions, usersOptions: usersOptions, cabinetOptions: cabinetOptions,
    coursesOptions: coursesOptions, projectsOptions: projectsOptions, meetingsOptions: meetingsOptions,
    activitiesOptions: activitiesOptions, albumsOptions: albumsOptions, optionsFrom: optionsFrom,
    attendanceGrid: attendanceGrid, readAttendanceGrid: readAttendanceGrid, initAttendanceGrid: initAttendanceGrid,
    flatten: flatten
  };
})(window);
