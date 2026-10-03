/* ==========================================================================
   MRHS ICT CLUB MASTER — js/core/ui.js
   The component library: toasts, modals, confirmation dialogs, drawers,
   dropdown menus, tooltips, empty/loading states, badges, avatars, pagination
   and the reusable DataTable used by every management module.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  /* ══════════════════════════════════════════════════════════════════════
     1. TOASTS
     ══════════════════════════════════════════════════════════════════════ */
  var TOAST_ICON = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' };
  function toast(title, message, type, opts) {
    opts = opts || {};
    type = type || 'success';
    var root = document.getElementById('toast-root');
    if (!root) return null;
    var node = U.el(
      '<div class="toast ' + type + '" role="' + (type === 'error' ? 'alert' : 'status') + '">' +
        '<span class="t-ico">' + Icons.svg(TOAST_ICON[type] || 'info') + '</span>' +
        '<div class="toast-text">' +
          '<strong>' + U.esc(title) + '</strong>' +
          (message ? '<p>' + U.esc(message) + '</p>' : '') +
          (opts.actionLabel ? '<button type="button" class="t-action" data-toast-action>' + U.esc(opts.actionLabel) + '</button>' : '') +
        '</div>' +
        '<button type="button" class="toast-close" aria-label="Dismiss notification">' + Icons.svg('x') + '</button>' +
      '</div>'
    );
    if (opts.actionLabel && typeof opts.onAction === 'function') {
      node.querySelector('[data-toast-action]').addEventListener('click', function () {
        opts.onAction(); dismiss();
      });
    }
    function dismiss() {
      node.classList.add('out');
      setTimeout(function () { node.remove(); }, 200);
    }
    node.querySelector('.toast-close').addEventListener('click', dismiss);
    root.appendChild(node);
    if (opts.sticky !== true) setTimeout(dismiss, opts.duration || (type === 'error' ? 7000 : 4200));
    return { node: node, dismiss: dismiss };
  }

  /* ══════════════════════════════════════════════════════════════════════
     2. MODALS & DRAWERS
     ══════════════════════════════════════════════════════════════════════ */
  var openModals = [];

  function focusables(root) {
    return U.$$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', root)
      .filter(function (n) { return n.offsetParent !== null; });
  }

  /**
   * UI.modal(options) → controller
   * options: { title, subtitle, icon, tone, size ('sm'|''|'lg'|'xl'), body, footer,
   *            actions: [{label, tone, icon, onClick, close}], onSubmit, submitLabel,
   *            closeLabel, dismissible (default true), onOpen(root), className }
   */
  function modal(options) {
    options = options || {};
    var root = document.getElementById('modal-root');
    var prevFocus = document.activeElement;
    var wrap = U.el('<div></div>');
    var footer = '';

    if (options.actions && options.actions.length) {
      footer = '<div class="modal-foot">' +
        (options.footNote ? '<span class="muted small">' + options.footNote + '</span>' : '<span></span>') +
        '<div class="mf-right">' + options.actions.map(function (a, i) {
          return '<button type="button" class="btn ' + (a.tone ? 'btn-' + a.tone : 'btn-outline') + '" data-mact="' + i + '"' +
            (a.disabled ? ' disabled' : '') + '>' + (a.icon ? Icons.svg(a.icon, { class: 'btn-ico' }) : '') + U.esc(a.label) + '</button>';
        }).join('') + '</div></div>';
    }

    var modalEl = U.el(
      '<div class="modal ' + (options.size ? 'modal-' + options.size : '') + (options.className ? ' ' + options.className : '') + '" role="dialog" aria-modal="true">' +
        (options.title ? (
          '<div class="modal-head">' +
            (options.icon ? '<span class="mh-ico ' + (options.tone || '') + '">' + Icons.svg(options.icon) + '</span>' : '') +
            '<div class="modal-head-text">' +
              '<h2 id="modal-title">' + U.esc(options.title) + '</h2>' +
              (options.subtitle ? '<p>' + U.esc(options.subtitle) + '</p>' : '') +
            '</div>' +
            (options.dismissible === false ? '' : '<button type="button" class="modal-close" aria-label="Close dialog">' + Icons.svg('x') + '</button>') +
          '</div>') : '') +
        '<div class="modal-body"></div>' + footer +
      '</div>');

    var bodyEl = modalEl.querySelector('.modal-body');
    if (typeof options.body === 'string') bodyEl.innerHTML = options.body;
    else if (options.body instanceof Node) bodyEl.appendChild(options.body);

    var backdrop = U.el('<div class="modal-backdrop"></div>');
    wrap.appendChild(backdrop); wrap.appendChild(modalEl);
    root.appendChild(wrap);
    document.body.classList.add('no-scroll');

    var controller = {
      root: wrap, modal: modalEl, body: bodyEl,
      close: function () {
        wrap.remove();
        var i = openModals.indexOf(controller); if (i > -1) openModals.splice(i, 1);
        if (!openModals.length) document.body.classList.remove('no-scroll');
        if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) {}
        if (options.onClose) options.onClose();
      },
      setBody: function (html) { bodyEl.innerHTML = html; },
      setLoading: function (label) {
        bodyEl.innerHTML = '<div class="loading-block"><span class="spinner"></span><span>' + U.esc(label || 'Working…') + '</span></div>';
      },
      setError: function (msg) {
        var box = modalEl.querySelector('.modal-error');
        if (!box) {
          box = U.el('<div class="alert alert-error modal-error mb-2">' + Icons.svg('alert-circle') + '<div></div></div>');
          bodyEl.insertBefore(box, bodyEl.firstChild);
        }
        box.querySelector('div').textContent = msg;
      }
    };
    openModals.push(controller);

    if (options.dismissible !== false) {
      var closeBtn = modalEl.querySelector('.modal-close');
      if (closeBtn) closeBtn.addEventListener('click', controller.close);
      backdrop.addEventListener('click', controller.close);
    }

    if (options.actions) {
      U.$$('[data-mact]', modalEl).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var a = options.actions[+btn.getAttribute('data-mact')];
          if (a && a.onClick) a.onClick(controller, btn);
          else if (!a.onClick && a.close !== false) controller.close();
        });
      });
    }

    // Keyboard: ESC closes, TAB is trapped
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && options.dismissible !== false) { e.stopPropagation(); controller.close(); return; }
      if (e.key !== 'Tab') return;
      var list = focusables(modalEl);
      if (!list.length) return;
      var first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    setTimeout(function () {
      var auto = modalEl.querySelector('[autofocus]') || focusables(modalEl)[0];
      if (auto) try { auto.focus(); } catch (e) {}
      if (options.onOpen) options.onOpen(controller);
    }, 30);

    return controller;
  }

  /**
   * UI.formModal — a modal wrapping a form. `fields` is raw HTML; `onSubmit(data, controller)`
   * receives a plain object of the form values. Returning a promise keeps the modal in a
   * loading state until it resolves.
   */
  function formModal(options) {
    var formEl = U.el('<form novalidate class="modal-form"></form>');
    formEl.innerHTML = '<div role="alert" class="modal-form-alert" hidden></div>' + (options.formHtml || '');
    var submitLabel = options.submitLabel || 'Save';
    var ctrl = modal({
      title: options.title, subtitle: options.subtitle, icon: options.icon, tone: options.tone,
      size: options.size, dismissible: options.dismissible,
      body: formEl,
      actions: [
        { label: options.cancelLabel || 'Cancel', tone: 'ghost', onClick: function (c) { c.close(); } },
        {
          label: submitLabel, tone: options.submitTone || 'primary', icon: options.submitIcon || 'save',
          onClick: function (c, btn) { submit(c, btn); }
        }
      ].concat(options.extraActions || [])
    });
    ctrl.form = formEl;
    formEl.addEventListener('submit', function (e) { e.preventDefault(); submit(ctrl, ctrl.modal.querySelector('[data-mact="1"]')); });
    if (options.onOpen) { var orig = options.onOpen; options.onOpen = function (c) { orig(c, formEl); }; }
    setTimeout(function () { var m = ctrl.modal.querySelector('input,select,textarea'); }, 0);

    function collect() {
      var data = {};
      U.$$('[name]', formEl).forEach(function (field) {
        var name = field.getAttribute('name');
        if (field.type === 'checkbox') {
          if (field.__multi) {
            data[name] = data[name] || [];
            if (field.checked) data[name].push(field.value);
          } else data[name] = field.checked;
        } else if (field.type === 'radio') {
          if (field.checked) data[name] = field.value;
        } else if (field.multiple) {
          data[name] = Array.prototype.slice.call(field.selectedOptions).map(function (o) { return o.value; });
        } else if (field.__tags) {
          data[name] = field.__tagsValue();
        } else {
          data[name] = field.value;
        }
      });
      return data;
    }
    ctrl.collect = collect;

    function submit(c, btn) {
      var data = collect();
      if (options.validate) {
        var errs = options.validate(data);
        if (errs && Object.keys(errs).length) {
          showErrors(errs);
          return;
        }
      }
      clearErrors();
      var result = options.onSubmit ? options.onSubmit(data, c, formEl) : true;
      if (result && typeof result.then === 'function') {
        if (btn) { btn.disabled = true; btn.dataset.label = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span> ' + U.esc(options.savingLabel || 'Saving…'); }
        result.then(function (close) {
          if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.label; }
          if (close !== false) c.close();
        }).catch(function (err) {
          if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.label; }
          showErrors({ __form: err && err.message ? err.message : 'Something went wrong. Please try again.' });
        });
      } else if (result !== false) {
        c.close();
      }
    }

    function showErrors(errs) {
      clearErrors();
      var alertBox = formEl.querySelector('.modal-form-alert');
      var general = errs.__form;
      if (general) { alertBox.hidden = false; alertBox.className = 'alert alert-error mb-2'; alertBox.innerHTML = Icons.svg('alert-circle') + '<div>' + U.esc(general) + '</div>'; }
      Object.keys(errs).forEach(function (key) {
        if (key === '__form') return;
        var field = formEl.querySelector('[name="' + key + '"]');
        if (!field) return;
        field.classList.add('invalid');
        var host = field.closest('.field') || field.parentNode;
        if (host) {
          var msg = U.el('<p class="field-error">' + Icons.svg('alert-circle') + U.esc(errs[key]) + '</p>');
          host.appendChild(msg);
        }
      });
      var firstInvalid = formEl.querySelector('.invalid');
      if (firstInvalid && firstInvalid.focus) firstInvalid.focus();
    }
    function clearErrors() {
      U.$$('.invalid', formEl).forEach(function (n) { n.classList.remove('invalid'); });
      U.$$('.field-error', formEl).forEach(function (n) { n.remove(); });
      var a = formEl.querySelector('.modal-form-alert'); if (a) { a.hidden = true; a.innerHTML = ''; }
    }
    ctrl.showErrors = showErrors;
    ctrl.clearErrors = clearErrors;
    return ctrl;
  }

  /** UI.confirm → Promise<boolean> */
  function confirmDialog(options) {
    if (typeof options === 'string') options = { message: options };
    options = options || {};
    return new Promise(function (resolve) {
      var decided = false;
      var tone = options.tone || 'danger';
      var ctrl = modal({
        title: options.title || 'Please confirm',
        subtitle: options.subtitle || '',
        icon: options.icon || (tone === 'danger' ? 'alert-triangle' : 'help-circle'),
        tone: tone === 'danger' ? 'danger' : (tone === 'warning' ? 'warning' : ''),
        size: 'sm',
        body: '<div class="confirm-body">' +
          '<p class="confirm-message">' + U.esc(options.message || 'Are you sure?') + '</p>' +
          (options.details ? '<div class="note-block ' + (tone === 'danger' ? 'danger' : '') + ' mt-2">' + options.details + '</div>' : '') +
          (options.confirmWord ? '<p class="small muted mt-2">Type <strong>' + U.esc(options.confirmWord) + '</strong> to continue.</p>' +
            '<input type="text" class="mt-1" data-confirm-word autofocus placeholder="' + U.esc(options.confirmWord) + '">' : '') +
          '</div>',
        actions: [
          { label: options.cancelLabel || 'Cancel', tone: 'outline', onClick: function (c) { decided = true; resolve(false); c.close(); } },
          {
            label: options.confirmLabel || 'Confirm', tone: tone === 'danger' ? 'danger' : 'primary',
            icon: options.confirmIcon || (tone === 'danger' ? 'trash' : 'check'),
            onClick: function (c, btn) {
              var wordInput = c.modal.querySelector('[data-confirm-word]');
              if (options.confirmWord && wordInput && wordInput.value.trim() !== options.confirmWord) {
                wordInput.classList.add('invalid');
                wordInput.focus();
                return;
              }
              decided = true; resolve(true); c.close();
            }
          }
        ],
        onClose: function () { if (!decided) resolve(false); }
      });
      if (options.confirmWord) {
        var input = ctrl.modal.querySelector('[data-confirm-word]');
        var okBtn = ctrl.modal.querySelector('[data-mact="1"]');
        if (input && okBtn) input.addEventListener('input', function () {
          var ok = input.value.trim() === options.confirmWord;
          okBtn.disabled = !ok;
          input.classList.toggle('invalid', !ok && input.value.length > 0);
        });
        if (okBtn) okBtn.disabled = true;
      }
    });
  }

  /** Small input dialog → Promise<string|null> */
  function prompt(options) {
    options = options || {};
    return new Promise(function (resolve) {
      var done = false;
      var ctrl = modal({
        title: options.title || 'Enter a value',
        icon: options.icon || 'edit',
        size: 'sm',
        body: '<div class="field"><label for="prompt-input">' + U.esc(options.label || 'Value') + '</label>' +
          '<input id="prompt-input" type="' + (options.type || 'text') + '" value="' + U.attr(options.value || '') + '" placeholder="' + U.attr(options.placeholder || '') + '" autofocus>' +
          (options.help ? '<p class="help">' + U.esc(options.help) + '</p>' : '') + '</div>',
        actions: [
          { label: 'Cancel', tone: 'ghost', onClick: function (c) { done = true; resolve(null); c.close(); } },
          {
            label: options.confirmLabel || 'OK', tone: 'primary', icon: 'check',
            onClick: function (c) {
              var v = c.modal.querySelector('#prompt-input').value.trim();
              if (options.required && !v) { c.modal.querySelector('#prompt-input').classList.add('invalid'); return; }
              done = true; resolve(v); c.close();
            }
          }
        ],
        onClose: function () { if (!done) resolve(null); }
      });
      var input = ctrl.modal.querySelector('#prompt-input');
      if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ctrl.modal.querySelector('[data-mact="1"]').click(); } });
    });
  }

  /** Side drawer, used for quick record previews */
  function drawer(options) {
    options = options || {};
    var root = document.getElementById('drawer-root');
    var wrap = U.el('<div></div>');
    var el = U.el('<aside class="drawer" role="dialog" aria-modal="true">' +
      '<div class="modal-head">' +
        (options.icon ? '<span class="mh-ico">' + Icons.svg(options.icon) + '</span>' : '') +
        '<div class="modal-head-text"><h2>' + U.esc(options.title || '') + '</h2>' +
        (options.subtitle ? '<p>' + U.esc(options.subtitle) + '</p>' : '') + '</div>' +
        '<button type="button" class="modal-close" aria-label="Close panel">' + Icons.svg('x') + '</button>' +
      '</div><div class="modal-body"></div></aside>');
    var body = el.querySelector('.modal-body');
    if (typeof options.body === 'string') body.innerHTML = options.body;
    else if (options.body) body.appendChild(options.body);
    wrap.appendChild(U.el('<div class="drawer-backdrop"></div>'));
    wrap.appendChild(el);
    root.appendChild(wrap);
    document.body.classList.add('no-scroll');
    function close() {
      wrap.remove();
      document.body.classList.remove('no-scroll');
      if (options.onClose) options.onClose();
    }
    U.$$('.modal-close, .drawer-backdrop', wrap).forEach(function (n) { n.addEventListener('click', close); });
    wrap.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    return { close: close, root: wrap, body: body };
  }

  /* ══════════════════════════════════════════════════════════════════════
     3. SMALL BUILDING BLOCKS
     ══════════════════════════════════════════════════════════════════════ */
  function badge(text, tone, opts) {
    opts = opts || {};
    var t = tone || U.tone(text);
    return '<span class="badge badge-' + t + (opts.soft !== false ? ' badge-soft' : '') + (opts.className ? ' ' + opts.className : '') + '"' +
      (opts.title ? ' title="' + U.attr(opts.title) + '"' : '') + '>' +
      (opts.icon ? Icons.svg(opts.icon) : (opts.autoIcon ? Icons.svg(U.statusIcon(text)) : '')) +
      U.esc(text) + '</span>';
  }
  var STATUS_ICONS = {
    'Active': 'check-circle', 'Inactive': 'ban', 'Suspended': 'ban', 'Alumni': 'graduation',
    'Completed': 'check-circle', 'Ongoing': 'play', 'Planned': 'calendar', 'Cancelled': 'x-circle',
    'Pending': 'clock', 'In Progress': 'refresh', 'Overdue': 'alert-circle',
    'Present': 'check-circle', 'Absent': 'x-circle', 'Late': 'clock', 'Excused': 'info',
    'Planning': 'lightbulb', 'Development': 'code', 'Testing': 'clipboard-check', 'Archived': 'folder',
    'New': 'sparkles', 'Good': 'check-circle', 'Fair': 'clock', 'Damaged': 'alert-triangle', 'Under Repair': 'refresh',
    'Issued': 'badge-check', 'Draft': 'edit', 'Approved': 'check-circle', 'Submitted': 'send',
    'Normal': 'info', 'Important': 'alert-circle', 'Urgent': 'alert-triangle',
    'High': 'trending-up', 'Medium': 'minus', 'Low': 'trending-down',
    'Income': 'trending-up', 'Expense': 'trending-down'
  };
  function statusBadge(text, opts) {
    opts = opts || {};
    return badge(text, U.tone(text), { icon: STATUS_ICONS[text] || U.statusIcon(text), title: opts.title, className: opts.className });
  }
  function avatar(name, size, opts) {
    opts = opts || {};
    var cls = 'avatar' + (size ? ' avatar-' + size : '') + (opts.square ? ' avatar-square' : '') + (opts.className ? ' ' + opts.className : '');
    var color = opts.color || U.colorFor(name || '?');
    var style = 'background:linear-gradient(135deg,' + color + ',' + shade(color, 26) + ')';
    if (opts.src) return '<span class="' + cls + '" style="' + style + '"><img src="' + U.attr(opts.src) + '" alt="' + U.attr(name) + '"></span>';
    return '<span class="' + cls + '" style="' + style + '" title="' + U.attr(name) + '" aria-hidden="true">' + U.esc(U.initials(name)) + '</span>';
  }
  function shade(hex, amt) {
    var c = String(hex).replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var r = Math.min(255, Math.max(0, parseInt(c.slice(0, 2), 16) + amt));
    var g = Math.min(255, Math.max(0, parseInt(c.slice(2, 4), 16) + amt));
    var b = Math.min(255, Math.max(0, parseInt(c.slice(4, 6), 16) + amt));
    return '#' + [r, g, b].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }
  function progressBar(pct, opts) {
    opts = opts || {};
    var v = U.clamp(Math.round(Number(pct) || 0), 0, 100);
    var tone = opts.tone || (v >= 80 ? 'success' : v >= 50 ? '' : v >= 25 ? 'warning' : 'danger');
    if (opts.tone !== undefined) tone = opts.tone;
    return '<div class="progress' + (opts.size ? ' ' + opts.size : '') + '"' +
      (opts.aria !== false ? ' role="progressbar" aria-valuenow="' + v + '" aria-valuemin="0" aria-valuemax="100"' : '') +
      (opts.title ? ' title="' + U.attr(opts.title) + '"' : '') + '>' +
      '<i class="' + (tone ? 'tone-' + tone : '') + '" style="width:' + v + '%"></i></div>';
  }
  function progressRow(label, pct, opts) {
    opts = opts || {};
    return '<div class="progress-row">' +
      '<div class="pr-head"><strong>' + U.esc(label) + '</strong><span>' + (opts.valueText || (Math.round(pct) + '%')) + '</span></div>' +
      progressBar(pct, opts) + '</div>';
  }
  function progressRing(pct, opts) {
    opts = opts || {};
    var size = opts.size || 96, stroke = opts.stroke || 9;
    var v = U.clamp(Number(pct) || 0, 0, 100);
    var r = (size - stroke) / 2, c = 2 * Math.PI * r;
    var color = opts.color || (v >= 80 ? '#12884f' : v >= 50 ? '#2545d6' : v >= 25 ? '#b7791f' : '#d64545');
    return '<div class="progress-ring" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--surface-3)" stroke-width="' + stroke + '"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke + '" ' +
      'stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + (c * (1 - v / 100)) + '"/>' +
      '</svg><span class="pr-value" style="color:' + color + '">' + Math.round(v) + '%</span></div>';
  }
  function statCard(o) {
    return '<article class="stat-card tone-' + (o.tone || 'primary') + '">' +
      '<div class="stat-card-top">' +
        '<div><p class="stat-label">' + U.esc(o.label) + '</p>' +
          '<p class="stat-value">' + (o.valueHtml || U.esc(o.value === undefined ? '0' : String(o.value))) + '</p></div>' +
        '<span class="stat-ico">' + Icons.svg(o.icon || 'dashboard') + '</span>' +
      '</div>' +
      '<div class="stat-foot">' +
        (o.trend ? trendChip(o.trend, o.trendText) : '') +
        (o.foot ? '<span>' + o.foot + '</span>' : '') +
      '</div>' +
    '</article>';
  }
  function trendChip(dir, text) {
    var icon = dir === 'up' ? 'trending-up' : dir === 'down' ? 'trending-down' : 'minus';
    return '<span class="trend ' + dir + '">' + Icons.svg(icon) + U.esc(text || '') + '</span>';
  }
  function card(o) {
    o = o || {};
    return '<section class="card' + (o.className ? ' ' + o.className : '') + '"' + (o.id ? ' id="' + U.attr(o.id) + '"' : '') + '>' +
      (o.title || o.head ? '<header class="card-head">' +
        (o.title ? '<h2>' + (o.icon ? Icons.svg(o.icon) : '') + U.esc(o.title) + (o.sub ? ' <span class="card-sub">' + U.esc(o.sub) + '</span>' : '') + '</h2>' : '<span></span>') +
        (o.head || (o.actions ? '<div class="card-tools">' + o.actions + '</div>' : '')) +
      '</header>' : '') +
      '<div class="card-body' + (o.flush ? ' flush' : '') + (o.tight ? ' tight' : '') + '">' + (o.body || '') + '</div>' +
      (o.foot ? '<footer class="card-foot">' + o.foot + '</footer>' : '') +
    '</section>';
  }
  function emptyState(o) {
    o = o || {};
    return '<div class="empty-state">' +
      '<span class="es-ico">' + Icons.svg(o.icon || 'folder-open') + '</span>' +
      '<h3>' + U.esc(o.title || 'Nothing here yet') + '</h3>' +
      '<p>' + U.esc(o.message || 'Records will appear here once they are created.') + '</p>' +
      (o.actions ? '<div class="es-actions">' + o.actions + '</div>' : '') +
    '</div>';
  }
  function loadingBlock(text) {
    return '<div class="loading-block"><span class="spinner"></span><span>' + U.esc(text || 'Loading…') + '</span></div>';
  }
  function skeletonRows(n) {
    var out = '';
    for (var i = 0; i < (n || 6); i++) out += '<div class="skeleton skeleton-row"></div>';
    return '<div class="card-body">' + out + '</div>';
  }
  function personCell(name, sub, opts) {
    opts = opts || {};
    return '<div class="person">' + avatar(name, opts.size || 'sm', { src: opts.src }) +
      '<span class="person-text"><strong>' + (opts.link ? '<a href="' + opts.link + '">' + U.esc(name) + '</a>' : U.esc(name)) + '</strong>' +
      (sub ? '<small>' + U.esc(sub) + '</small>' : '') + '</span></div>';
  }
  function kvGrid(items) {
    return '<div class="kv-grid">' + items.map(function (i) {
      return '<div class="kv"><span class="k">' + U.esc(i.label) + '</span><span class="v' + (i.muted ? ' muted' : '') + '">' + (i.html || U.esc(i.value === undefined || i.value === '' ? '—' : i.value)) + '</span></div>';
    }).join('') + '</div>';
  }
  function metaRow(icon, label, value) {
    return '<div class="meta-row">' + Icons.svg(icon) + '<span>' + U.esc(label) + '</span><span class="val">' + (value || '—') + '</span></div>';
  }
  function timeline(items) {
    return '<div class="timeline">' + items.map(function (i) {
      return '<div class="timeline-item">' +
        '<span class="tl-dot ' + (i.tone || '') + '">' + Icons.svg(i.icon || 'activity') + '</span>' +
        '<div class="tl-body"><strong>' + U.esc(i.title) + '</strong>' +
        (i.text ? '<p>' + i.text + '</p>' : '') +
        (i.time ? '<time>' + U.esc(i.time) + '</time>' : '') + '</div></div>';
    }).join('') + '</div>';
  }
  function pageHeader(o) {
    return '<header class="page-head">' +
      '<div class="page-head-text">' +
        (o.crumbs ? '<nav class="breadcrumbs" aria-label="Breadcrumb">' + o.crumbs + '</nav>' : '') +
        '<h1>' + (o.icon ? Icons.svg(o.icon) : '') + U.esc(o.title) + '</h1>' +
        (o.subtitle ? '<p>' + U.esc(o.subtitle) + '</p>' : '') +
      '</div>' +
      (o.actions ? '<div class="page-actions">' + o.actions + '</div>' : '') +
    '</header>';
  }
  function crumbs(items) {
    return items.map(function (i, idx) {
      var sep = idx ? Icons.svg('chevron-right') : '';
      return sep + (i.href ? '<a href="' + i.href + '">' + U.esc(i.label) + '</a>' : '<span>' + U.esc(i.label) + '</span>');
    }).join('');
  }
  function tabs(items, activeKey, opts) {
    opts = opts || {};
    return '<div class="tabs" role="tablist"' + (opts.id ? ' id="' + opts.id + '"' : '') + '>' + items.map(function (t) {
      return '<button type="button" role="tab" class="tab' + (t.key === activeKey ? ' active' : '') + '" data-tab="' + U.attr(t.key) + '"' +
        ' aria-selected="' + (t.key === activeKey) + '">' + (t.icon ? Icons.svg(t.icon) : '') + U.esc(t.label) +
        (t.count !== undefined ? '<span class="tab-count">' + t.count + '</span>' : '') + '</button>';
    }).join('') + '</div>';
  }
  function segmented(items, activeKey, opts) {
    opts = opts || {};
    return '<div class="segmented' + (opts.className ? ' ' + opts.className : '') + '" role="group"' + (opts.id ? ' id="' + opts.id + '"' : '') + '>' +
      items.map(function (t) {
        return '<button type="button" class="' + (t.key === activeKey ? 'active' : '') + '" data-seg="' + U.attr(t.key) + '"' +
          (t.title ? ' title="' + U.attr(t.title) + '"' : '') + '>' + (t.icon ? Icons.svg(t.icon) : '') + U.esc(t.label) + '</button>';
      }).join('') + '</div>';
  }
  function chipRow(items, opts) {
    opts = opts || {};
    return '<div class="chip-row' + (opts.className ? ' ' + opts.className : '') + '">' + items.map(function (c) {
      if (typeof c === 'string') return '<span class="chip">' + U.esc(c) + '</span>';
      return '<span class="chip' + (c.active ? ' active' : '') + (c.onClick ? ' clickable' : '') + '"' +
        (c.key ? ' data-chip="' + U.attr(c.key) + '"' : '') + (c.title ? ' title="' + U.attr(c.title) + '"' : '') + '>' +
        (c.icon ? Icons.svg(c.icon) : '') + U.esc(c.label || c) + '</span>';
    }).join('') + '</div>';
  }
  function field(o) {
    var id = o.id || ('f-' + Math.random().toString(36).slice(2, 8));
    return '<div class="field' + (o.className ? ' ' + o.className : '') + '">' +
      '<label for="' + id + '">' + U.esc(o.label) + (o.required ? ' <span class="req" title="Required">*</span>' : '') + '</label>' +
      (o.control || '') +
      (o.help ? '<p class="help">' + U.esc(o.help) + '</p>' : '') +
    '</div>';
  }
  function note(text, tone) {
    return '<div class="note-block' + (tone ? ' ' + tone : '') + '">' + text + '</div>';
  }
  function alertBox(title, message, tone, icon) {
    return '<div class="alert alert-' + (tone || 'info') + '">' + Icons.svg(icon || (tone === 'error' ? 'alert-circle' : tone === 'success' ? 'check-circle' : tone === 'warning' ? 'alert-triangle' : 'info')) +
      '<div>' + (title ? '<strong>' + U.esc(title) + '</strong>' : '') + U.esc(message || '') + '</div></div>';
  }
  function demoChip(text) {
    return '<span class="badge badge-warning badge-soft" title="' + U.esc(text || 'This record is part of the demonstration dataset and can be removed in Settings › Data') + '">' +
      Icons.svg('info') + 'Demo</span>';
  }
  function restricted(moduleKey) {
    return '<div class="page">' + emptyState({
      icon: 'lock',
      title: 'Access restricted',
      message: Auth.explain(moduleKey),
      actions: '<a class="btn btn-primary" href="#/dashboard">' + Icons.svg('dashboard', { class: 'btn-ico' }) + 'Back to dashboard</a>'
    }) + '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════════
     4. DATATABLE
     ══════════════════════════════════════════════════════════════════════ */
  function DataTable(container, config) {
    this.container = typeof container === 'string' ? U.$(container) : container;
    this.cfg = Object.assign({
      columns: [],
      rows: [],
      pageSize: (Store.settings().pageSize || 10),
      search: true,
      searchPlaceholder: 'Search…',
      searchKeys: null,
      filters: [],
      toolbarExtra: '',
      exportName: '',
      exportColumns: null,
      rowKey: function (r) { return r.id; },
      onRowClick: null,
      rowActions: null,
      empty: {},
      title: '',
      icon: 'list',
      sub: '',
      stackOnMobile: true,
      filterBarHtml: '',
      showCount: true
    }, config || {});
    this.state = { q: '', filters: {}, sortKey: null, sortDir: 'asc', page: 1 };
    this.built = false;
  }

  DataTable.prototype.rows = function () {
    var self = this, cfg = this.cfg;
    var rows = typeof cfg.rows === 'function' ? cfg.rows() : (cfg.rows || []);
    var keys = cfg.searchKeys;
    if (self.state.q) {
      rows = rows.filter(function (r) {
        if (typeof keys === 'function') return U.matches(keys(r), self.state.q);
        if (Array.isArray(keys)) return U.matchesAny(keys.map(function (k) { return typeof k === 'function' ? k(r) : r[k]; }), self.state.q);
        return U.matchesAny(Object.keys(r).map(function (k) { return r[k]; }), self.state.q);
      });
    }
    (cfg.filters || []).forEach(function (f) {
      var val = self.state.filters[f.key];
      if (!val) return;
      rows = rows.filter(function (r) {
        var v = f.value ? f.value(r) : r[f.key];
        if (Array.isArray(v)) return v.indexOf(val) !== -1;
        if (typeof v === 'boolean') return String(v) === val;
        return U.norm(v) === U.norm(val);
      });
    });
    if (cfg.filterBarHtml) { /* handled by caller */ }
    if (self.state.sortKey) {
      var col = cfg.columns.filter(function (c) { return c.key === self.state.sortKey; })[0];
      var keyFn = (col && col.sortValue) || self.state.sortKey;
      rows = U.sortBy(rows, keyFn, self.state.sortDir);
    }
    return rows;
  };

  DataTable.prototype.render = function () {
    var self = this, cfg = this.cfg;
    if (!self.container) return self;
    var all = typeof cfg.rows === 'function' ? cfg.rows() : (cfg.rows || []);
    var filtered = self.rows();
    var total = filtered.length;
    var perPage = cfg.pageSize;
    var pages = Math.max(1, Math.ceil(total / perPage));
    if (self.state.page > pages) self.state.page = pages;
    var slice = total > perPage ? filtered.slice((self.state.page - 1) * perPage, self.state.page * perPage) : filtered;

    var html = '';
    if (!self.built) {
      var toolbar = '';
      if (cfg.search || (cfg.filters && cfg.filters.length) || cfg.toolbarExtra || cfg.filterBarHtml) {
        toolbar = '<div class="toolbar">' +
          (cfg.search ? '<div class="search-field">' + Icons.svg('search') +
            '<input type="search" data-dt-search placeholder="' + U.attr(cfg.searchPlaceholder) + '" aria-label="Search records" value="' + U.attr(self.state.q) + '"></div>' : '') +
          (cfg.filters || []).map(function (f) {
            var fOpts = typeof f.options === 'function' ? f.options() : (f.options || []);
            return '<select data-dt-filter="' + U.attr(f.key) + '" aria-label="Filter by ' + U.attr(f.label || f.key) + '">' +
              '<option value="">' + U.esc(f.label || ('All ' + f.key)) + '</option>' +
              (fOpts || []).map(function (o) {
                var val = typeof o === 'string' ? o : o.value;
                var lab = typeof o === 'string' ? o : (o.label || o.value);
                return '<option value="' + U.attr(val) + '">' + U.esc(lab) + '</option>';
              }).join('') + '</select>';
          }).join('') +
          '<span class="spacer"></span>' + (cfg.toolbarExtra || '') +
        '</div>';
      }
      html += card({
        title: cfg.title, sub: cfg.sub, icon: cfg.title ? cfg.icon : null,
        flush: true,
        head: (cfg.title ? null : undefined),
        body: (cfg.title ? '' : '') +
          toolbar +
          (cfg.filterBarHtml ? '<div class="toolbar" style="border-top:0">' + cfg.filterBarHtml + '</div>' : '') +
          '<div class="result-meta" data-dt-meta></div>' +
          '<div class="table-wrap' + (cfg.stackOnMobile ? ' stacked' : '') + '" data-dt-table></div>' +
          '<div class="card-foot" data-dt-foot></div>'
      });
      self.container.innerHTML = html;
      self.built = true;
      self.bind();
    }

    var tableEl = self.container.querySelector('[data-dt-table]');
    var metaEl = self.container.querySelector('[data-dt-meta]');
    var footEl = self.container.querySelector('[data-dt-foot]');

    if (!total) {
      tableEl.innerHTML = emptyState({
        icon: cfg.empty.icon || (all.length ? 'search' : 'folder-open'),
        title: cfg.empty.title || (all.length ? 'No matching records' : 'No records yet'),
        message: cfg.empty.message || (all.length
          ? 'Try a different search term or clear the filters.'
          : 'Records you create will be listed here.'),
        actions: (all.length ? '<button type="button" class="btn btn-outline btn-sm" data-dt-clear>' + Icons.svg('refresh', { class: 'btn-ico' }) + 'Clear filters</button>' : '') +
          (cfg.empty.actions || '')
      });
      metaEl.innerHTML = '<span>' + (all.length ? 'No results out of ' + all.length + ' records' : '0 records') + '</span>';
      footEl.hidden = true;
      return self;
    }

    var head = '<thead><tr>' + cfg.columns.map(function (c) {
      var isSorted = self.state.sortKey === c.key;
      return '<th scope="col" class="' + (c.sortable !== false ? 'sortable' : '') + (isSorted ? ' sorted' : '') + (c.className ? ' ' + c.className : '') + '"' +
        (c.sortable !== false ? ' data-dt-sort="' + U.attr(c.key) + '" role="button" tabindex="0" aria-label="Sort by ' + U.attr(c.label) + '"' : '') +
        '>' + U.esc(c.label) + (c.sortable !== false ? '<span class="sort-ind">' + Icons.svg(isSorted ? (self.state.sortDir === 'asc' ? 'chevron-up' : 'chevron-down') : 'sort') + '</span>' : '') + '</th>';
    }).join('') + (cfg.rowActions ? '<th class="col-actions">Actions</th>' : '') + '</tr></thead>';

    var body = '<tbody>' + slice.map(function (r) {
      return '<tr' + (cfg.onRowClick ? ' class="clickable" tabindex="0"' : '') + ' data-dt-row="' + U.attr(cfg.rowKey(r)) + '">' +
        cfg.columns.map(function (c, ci) {
          var val = c.render ? c.render(r, self) : U.esc(r[c.key]);
          return '<td' + (ci === 0 ? ' class="cell-primary"' : (c.className ? ' class="' + c.className + '"' : '')) +
            ' data-label="' + U.attr(c.label) + '">' + val + '</td>';
        }).join('') +
        (cfg.rowActions ? '<td class="col-actions" data-label="Actions"><div class="row-actions">' + cfg.rowActions(r, self) + '</div></td>' : '') +
      '</tr>';
    }).join('') + '</tbody>';

    tableEl.innerHTML = '<table class="data-table">' + head + body + '</table>';
    if (cfg.showCount !== false) {
      metaEl.innerHTML = '<span>Showing <strong>' + ((self.state.page - 1) * perPage + 1) + '–' + Math.min(total, self.state.page * perPage) + '</strong> of <strong>' + total + '</strong> ' + U.esc(U.plural(total, 'record')) +
        (all.length !== total ? ' (filtered from ' + all.length + ')' : '') + '</span>' +
        (self.state.q || Object.keys(self.state.filters).length ? '<button type="button" class="link-btn xs" data-dt-clear>Clear filters</button>' : '');
    } else metaEl.innerHTML = '';

    if (total > perPage) {
      footEl.hidden = false;
      footEl.innerHTML = pagination(total, self.state.page, perPage);
    } else footEl.hidden = true;

    self.slice = slice;
    return self;
  };

  DataTable.prototype.bind = function () {
    var self = this, cfg = this.cfg;
    var root = self.container;

    var searchInput = root.querySelector('[data-dt-search]');
    if (searchInput) {
      searchInput.addEventListener('input', U.debounce(function () {
        self.state.q = searchInput.value.trim();
        self.state.page = 1;
        self.render();
        var again = root.querySelector('[data-dt-search]');
        if (again) { again.focus(); }
      }, 220));
    }
    U.$$('[data-dt-filter]', root).forEach(function (sel) {
      sel.addEventListener('change', function () {
        self.state.filters[sel.getAttribute('data-dt-filter')] = sel.value;
        self.state.page = 1;
        self.render();
      });
    });
    root.addEventListener('click', function (e) {
      var sortEl = e.target.closest('[data-dt-sort]');
      if (sortEl) {
        var key = sortEl.getAttribute('data-dt-sort');
        if (self.state.sortKey === key) self.state.sortDir = self.state.sortDir === 'asc' ? 'desc' : 'asc';
        else { self.state.sortKey = key; self.state.sortDir = 'asc'; }
        self.render();
        return;
      }
      if (e.target.closest('[data-dt-clear]')) {
        self.state.q = ''; self.state.filters = {}; self.state.page = 1;
        var si = root.querySelector('[data-dt-search]'); if (si) si.value = '';
        U.$$('[data-dt-filter]', root).forEach(function (s) { s.value = ''; });
        self.render();
        return;
      }
      var pageBtn = e.target.closest('[data-dt-page]');
      if (pageBtn) {
        self.state.page = +pageBtn.getAttribute('data-dt-page');
        self.render();
        var wrap = root.closest('.view-root') || root;
        return;
      }
      var row = e.target.closest('[data-dt-row]');
      if (row && !e.target.closest('button, a, input, select')) {
        var rec = self.slice && U.findBy(self.slice, function (r) { return String(cfg.rowKey(r)) === row.getAttribute('data-dt-row'); });
        if (rec && cfg.onRowClick) cfg.onRowClick(rec, self);
      }
    });
    root.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.hasAttribute && e.target.hasAttribute('data-dt-row')) {
        e.preventDefault();
        var row = e.target;
        var rec = self.slice && U.findBy(self.slice, function (r) { return String(cfg.rowKey(r)) === row.getAttribute('data-dt-row'); });
        if (rec && cfg.onRowClick) cfg.onRowClick(rec, self);
      }
      if (e.key === 'Enter' && e.target.hasAttribute && e.target.hasAttribute('data-dt-sort')) {
        e.preventDefault(); e.target.click();
      }
    });
  };

  DataTable.prototype.refresh = function (rows) {
    if (rows) this.cfg.rows = rows;
    this.built = false;
    return this.render();
  };
  DataTable.prototype.getFiltered = function () { return this.rows(); };

  function pagination(total, page, perPage) {
    var pages = Math.max(1, Math.ceil(total / perPage));
    var out = '<div class="pagination"><span class="pg-info">Page ' + page + ' of ' + pages + '</span>';
    out += '<button type="button" data-dt-page="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + ' aria-label="Previous page">' + Icons.svg('chevron-left') + '</button>';
    var list = [];
    for (var i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 1) list.push(i);
      else if (list[list.length - 1] !== '…') list.push('…');
    }
    list.forEach(function (p) {
      if (p === '…') out += '<span class="ellipsis">…</span>';
      else out += '<button type="button" data-dt-page="' + p + '" class="' + (p === page ? 'active' : '') + '"' + (p === page ? ' aria-current="page"' : '') + '>' + p + '</button>';
    });
    out += '<button type="button" data-dt-page="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + ' aria-label="Next page">' + Icons.svg('chevron-right') + '</button>';
    out += '</div>';
    return out;
  }

  /* ══════════════════════════════════════════════════════════════════════
     5. GLOBAL BEHAVIOURS — dropdowns, tooltips, copy buttons
     ══════════════════════════════════════════════════════════════════════ */
  function closeDropdowns(except) {
    U.$$('[data-dropdown]').forEach(function (d) {
      if (d === except) return;
      var menu = d.querySelector('.dropdown-menu');
      var toggle = d.querySelector('[data-dropdown-toggle]');
      if (menu) menu.hidden = true;
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  }
  function initGlobals() {
    document.addEventListener('click', function (e) {
      var toggle = e.target.closest('[data-dropdown-toggle]');
      if (toggle) {
        var wrap = toggle.closest('[data-dropdown]');
        var menu = wrap.querySelector('.dropdown-menu');
        var willOpen = menu.hidden;
        closeDropdowns(wrap);
        menu.hidden = !willOpen;
        toggle.setAttribute('aria-expanded', String(willOpen));
        if (willOpen) {
          var first = menu.querySelector('a, button');
          if (first) setTimeout(function () { first.focus(); }, 20);
        }
        e.preventDefault();
        return;
      }
      if (e.target.closest('[data-close-dropdown]')) { closeDropdowns(); return; }
      if (!e.target.closest('.dropdown-menu')) closeDropdowns();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDropdowns();
    });

    // Tooltips via data-tip
    var tipEl = null;
    function hideTip() { if (tipEl) { tipEl.remove(); tipEl = null; } }
    document.addEventListener('mouseover', function (e) {
      var host = e.target.closest('[data-tip]');
      if (!host) { hideTip(); return; }
      if (tipEl && tipEl.__host === host) return;
      hideTip();
      tipEl = U.el('<div class="tooltip" role="tooltip">' + U.esc(host.getAttribute('data-tip')) + '</div>');
      tipEl.__host = host;
      document.body.appendChild(tipEl);
      var r = host.getBoundingClientRect();
      var tr = tipEl.getBoundingClientRect();
      var top = r.top - tr.height - 8;
      if (top < 6) top = r.bottom + 8;
      var left = Math.min(Math.max(8, r.left + r.width / 2 - tr.width / 2), window.innerWidth - tr.width - 8);
      tipEl.style.top = top + 'px';
      tipEl.style.left = left + 'px';
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest('[data-tip]')) hideTip();
    });
    document.addEventListener('scroll', hideTip, true);

    // Copy buttons: <button data-copy="text">
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-copy]');
      if (!btn) return;
      U.copyToClipboard(btn.getAttribute('data-copy')).then(function () {
        toast('Copied', 'Copied to the clipboard.', 'success');
      }).catch(function () { toast('Copy failed', 'Your browser blocked clipboard access.', 'error'); });
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     6. EXPORT HELPERS
     ══════════════════════════════════════════════════════════════════════ */
  function exportCSV(rows, columns, filename) {
    if (!rows || !rows.length) { toast('Nothing to export', 'There are no records matching the current view.', 'warning'); return; }
    var csv = U.toCSV(rows, columns);
    U.download((filename || 'mrhs-ict-export') + '-' + U.todayISO() + '.csv', '\uFEFF' + csv, 'text/csv;charset=utf-8');
    toast('Export ready', rows.length + ' ' + U.plural(rows.length, 'record') + ' exported to CSV.', 'success');
  }
  function exportJSON(data, filename) {
    U.download((filename || 'mrhs-ict-data') + '-' + U.todayISO() + '.json', JSON.stringify(data, null, 2), 'application/json');
  }

  global.UI = {
    toast: toast, modal: modal, formModal: formModal, confirm: confirmDialog, prompt: prompt, drawer: drawer,
    badge: badge, statusBadge: statusBadge, avatar: avatar, progressBar: progressBar, progressRow: progressRow,
    progressRing: progressRing, statCard: statCard, trendChip: trendChip, card: card, emptyState: emptyState,
    loadingBlock: loadingBlock, skeletonRows: skeletonRows, personCell: personCell, kvGrid: kvGrid,
    metaRow: metaRow, timeline: timeline, pageHeader: pageHeader, crumbs: crumbs, tabs: tabs,
    segmented: segmented, chipRow: chipRow, field: field, note: note, alertBox: alertBox, demoChip: demoChip,
    restricted: restricted, DataTable: DataTable, pagination: pagination,
    closeDropdowns: closeDropdowns, initGlobals: initGlobals, shade: shade,
    exportCSV: exportCSV, exportJSON: exportJSON, STATUS_ICONS: STATUS_ICONS
  };
})(window);
