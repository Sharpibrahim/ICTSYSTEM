/* ==========================================================================
   MRHS ICT CLUB MASTER — js/core/utils.js
   Pure helper functions shared by every module: formatting, DOM helpers,
   collection utilities, file export/import and small maths helpers.
   ========================================================================== */
(function (global) {
  'use strict';

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
  var MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /* ── Text ─────────────────────────────────────────────────────────────── */
  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function attr(v) { return esc(v); }
  function titleCase(s) {
    return String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  function slug(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function truncate(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1).trim() + '…' : s;
  }
  function plural(n, one, many) { return n === 1 ? one : (many || one + 's'); }

  /* ── Numbers & money ──────────────────────────────────────────────────── */
  function num(n, dp) {
    var v = Number(n);
    if (!isFinite(v)) return '0';
    var fixed = (dp === undefined ? 0 : dp);
    return v.toFixed(fixed).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function money(n, currency) {
    var v = Number(n) || 0;
    var sign = v < 0 ? '-' : '';
    return sign + (currency || 'UGX') + ' ' + num(Math.abs(v));
  }
  function shortMoney(n) {
    var v = Number(n) || 0, a = Math.abs(v), sign = v < 0 ? '-' : '';
    if (a >= 1e9) return sign + 'UGX ' + num(a / 1e9, 1) + 'B';
    if (a >= 1e6) return sign + 'UGX ' + num(a / 1e6, 1) + 'M';
    if (a >= 1e3) return sign + 'UGX ' + num(a / 1e3, 0) + 'K';
    return sign + 'UGX ' + num(a);
  }
  function percent(part, total, dp) {
    part = Number(part) || 0; total = Number(total) || 0;
    if (!total) return 0;
    var r = (part / total) * 100;
    return Number(r.toFixed(dp === undefined ? 1 : dp));
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function avg(list) {
    var nums = (list || []).map(Number).filter(isFinite);
    if (!nums.length) return 0;
    return nums.reduce(function (a, b) { return a + b; }, 0) / nums.length;
  }
  function sum(list, pick) {
    return (list || []).reduce(function (a, b) { return a + (Number(pick ? pick(b) : b) || 0); }, 0);
  }

  /* ── Dates ────────────────────────────────────────────────────────────── */
  function toDate(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    var s = String(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) { var d = new Date(s); return isNaN(d.getTime()) ? null : d; }
    var d2 = new Date(s);
    return isNaN(d2.getTime()) ? null : d2;
  }
  function iso(d) {
    var x = toDate(d) || new Date();
    return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
  }
  function isoDateTime(d) {
    var x = toDate(d) || new Date();
    return iso(x) + 'T' + pad(x.getHours()) + ':' + pad(x.getMinutes());
  }
  /** Zero-pads a number. Default width 2 (dates); pass a width for record codes. */
  function pad(n, len) {
    var s = String(n === null || n === undefined ? '' : n);
    var w = len || 2;
    while (s.length < w) s = '0' + s;
    return s;
  }
  function todayISO() { return iso(new Date()); }
  function fmtDate(v, style) {
    var d = toDate(v);
    if (!d) return '—';
    if (style === 'short') return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
    if (style === 'long') return DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    if (style === 'month') return MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    if (style === 'day') return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()];
    return pad(d.getDate()) + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
  }
  function fmtTime(t) {
    if (!t) return '—';
    var m = String(t).match(/^(\d{1,2}):(\d{2})/);
    if (!m) return String(t);
    var h = +m[1], mm = m[2];
    var ap = h >= 12 ? 'PM' : 'AM';
    var hh = h % 12; if (hh === 0) hh = 12;
    return hh + ':' + mm + ' ' + ap;
  }
  function fmtDateTime(v) {
    var d = toDate(v);
    if (!d) return '—';
    return fmtDate(d) + ' · ' + fmtTime(pad(d.getHours()) + ':' + pad(d.getMinutes()));
  }
  function addDays(v, n) {
    var d = toDate(v) || new Date();
    var x = new Date(d.getTime()); x.setDate(x.getDate() + (n || 0)); return x;
  }
  function addMonths(v, n) {
    var d = toDate(v) || new Date();
    var x = new Date(d.getTime()); x.setMonth(x.getMonth() + (n || 0)); return x;
  }
  function daysBetween(a, b) {
    var d1 = toDate(a), d2 = toDate(b);
    if (!d1 || !d2) return 0;
    return Math.round((d2 - d1) / 86400000);
  }
  function daysFromNow(v) { return daysBetween(new Date(), toDate(v)); }
  function monthKey(v) { var d = toDate(v); return d ? d.getFullYear() + '-' + pad(d.getMonth() + 1) : ''; }
  function monthLabel(key) {
    var m = String(key).match(/^(\d{4})-(\d{2})$/);
    if (!m) return key;
    return MONTHS_SHORT[+m[2] - 1] + ' ' + m[1].slice(2);
  }
  function startOfMonth(v) { var d = toDate(v) || new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); }
  function endOfMonth(v) { var d = toDate(v) || new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
  function startOfWeek(v) {
    var d = toDate(v) || new Date();
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - x.getDay());
    return x;
  }
  function timeAgo(v) {
    var d = toDate(v);
    if (!d) return '—';
    var secs = Math.round((Date.now() - d.getTime()) / 1000);
    var future = secs < 0; secs = Math.abs(secs);
    var out;
    if (secs < 60) out = 'just now';
    else if (secs < 3600) out = Math.floor(secs / 60) + ' min';
    else if (secs < 86400) out = Math.floor(secs / 3600) + ' ' + plural(Math.floor(secs / 3600), 'hour');
    else if (secs < 2592000) out = Math.floor(secs / 86400) + ' ' + plural(Math.floor(secs / 86400), 'day');
    else if (secs < 31536000) out = Math.floor(secs / 2592000) + ' ' + plural(Math.floor(secs / 2592000), 'month');
    else out = Math.floor(secs / 31536000) + ' ' + plural(Math.floor(secs / 31536000), 'year');
    if (out === 'just now') return out;
    return future ? 'in ' + out : out + ' ago';
  }
  function dueLabel(v) {
    if (!v) return '';
    var d = daysFromNow(v);
    if (d === 0) return 'Due today';
    if (d === 1) return 'Due tomorrow';
    if (d === -1) return 'Due yesterday';
    if (d < 0) return Math.abs(d) + ' days overdue';
    return 'Due in ' + d + ' days';
  }
  function greeting(d) {
    var h = (d || new Date()).getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }
  function monthsBack(n, from) {
    var out = [], base = startOfMonth(from || new Date());
    for (var i = n - 1; i >= 0; i--) out.push(addMonths(base, -i));
    return out;
  }

  /* ── DOM ──────────────────────────────────────────────────────────────── */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = String(html).trim();
    return t.content.firstElementChild;
  }
  function frag(html) {
    var t = document.createElement('template');
    t.innerHTML = String(html);
    return t.content;
  }
  function on(target, evt, sel, fn) {
    if (typeof sel === 'function') { target.addEventListener(evt, sel); return; }
    target.addEventListener(evt, function (e) {
      var m = e.target.closest(sel);
      if (m && target.contains(m)) fn.call(m, e, m);
    });
  }
  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait || 200);
    };
  }
  function throttle(fn, wait) {
    var last = 0, timer;
    return function () {
      var args = arguments, ctx = this, now = Date.now();
      if (now - last >= (wait || 150)) { last = now; fn.apply(ctx, args); }
      else { clearTimeout(timer); timer = setTimeout(function () { last = Date.now(); fn.apply(ctx, args); }, (wait || 150) - (now - last)); }
    };
  }
  function delegate(root, evt, sel, fn) { return on(root, evt, sel, fn); }

  /* ── Collections ──────────────────────────────────────────────────────── */
  function clone(o) { return o === undefined ? o : JSON.parse(JSON.stringify(o)); }
  function groupBy(list, key) {
    var out = {};
    (list || []).forEach(function (item) {
      var k = typeof key === 'function' ? key(item) : item[key];
      (out[k] = out[k] || []).push(item);
    });
    return out;
  }
  function uniq(list) {
    return (list || []).filter(function (v, i, a) { return a.indexOf(v) === i; });
  }
  function sortBy(list, key, dir) {
    var d = dir === 'desc' ? -1 : 1;
    return (list || []).slice().sort(function (a, b) {
      var av = typeof key === 'function' ? key(a) : a[key];
      var bv = typeof key === 'function' ? key(b) : b[key];
      if (av === undefined || av === null) av = '';
      if (bv === undefined || bv === null) bv = '';
      var an = typeof av === 'number', bn = typeof bv === 'number';
      if (typeof av === 'boolean') av = av ? 1 : 0; if (typeof bv === 'boolean') bv = bv ? 1 : 0;
      if (an && bn) return (av - bv) * d;
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * d;
    });
  }
  function pick(list, fn) { var out = []; (list || []).forEach(function (i, idx) { if (fn(i, idx)) out.push(i); }); return out; }
  function findBy(list, key, value) {
    for (var i = 0; i < (list || []).length; i++) {
      if (typeof key === 'function') { if (key(list[i])) return list[i]; }
      else if (list[i][key] === value) return list[i];
    }
    return null;
  }
  function range(n, start) {
    var out = []; for (var i = 0; i < n; i++) out.push((start || 1) + i); return out;
  }

  /* ── Search & highlight ───────────────────────────────────────────────── */
  function norm(s) {
    return String(s === null || s === undefined ? '' : s).toLowerCase()
      .normalize ? String(s === null || s === undefined ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : String(s).toLowerCase();
  }
  function matches(haystack, needle) {
    if (!needle) return true;
    var terms = norm(needle).split(/\s+/).filter(Boolean);
    var hay = norm(haystack);
    return terms.every(function (t) { return hay.indexOf(t) !== -1; });
  }
  function matchesAny(values, needle) {
    if (!needle) return true;
    var terms = norm(needle).split(/\s+/).filter(Boolean);
    var hay = (values || []).map(norm).join(' ');
    return terms.every(function (t) { return hay.indexOf(t) !== -1; });
  }
  function highlight(text, query) {
    var raw = String(text === null || text === undefined ? '' : text);
    var q = String(query || '').trim();
    if (!q) return esc(raw);
    var terms = q.split(/\s+/).filter(Boolean).map(function (t) {
      return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    if (!terms.length) return esc(raw);
    var re = new RegExp('(' + terms.join('|') + ')', 'gi');
    var safe = esc(raw);
    return safe.replace(re, function (m) { return '<mark>' + m + '</mark>'; });
  }

  /* ── Colour & badges ──────────────────────────────────────────────────── */
  var PALETTE = ['#2545d6', '#6d28d9', '#0891b2', '#12884f', '#b7791f', '#c2410c', '#be185d', '#0f766e', '#4338ca', '#7c2d12'];
  function colorFor(seed) {
    var s = String(seed || ''), hash = 0;
    for (var i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) % 99991;
    return PALETTE[hash % PALETTE.length];
  }
  var TONES = {
    success: ['active', 'completed', 'complete', 'present', 'approved', 'paid', 'new', 'good', 'issued', 'verified', 'excellent', 'resolved', 'done', 'passed', 'enrolled', 'qualified', 'alumni', 'available'],
    warning: ['pending', 'planned', 'ongoing', 'late', 'fair', 'under repair', 'scheduled', 'in progress', 'expiring', 'due', 'moderate', 'review', 'draft'],
    danger: ['inactive', 'absent', 'rejected', 'cancelled', 'canceled', 'overdue', 'damaged', 'suspended', 'failed', 'urgent', 'expired', 'lost', 'critical'],
    info: ['excused', 'training', 'development', 'testing', 'planning', 'new request', 'info', 'normal'],
    neutral: ['archived', 'closed', 'not started', 'unknown', 'n/a', 'draft']
  };
  function tone(value) {
    var v = norm(value).trim();
    for (var t in TONES) {
      if (TONES[t].indexOf(v) !== -1) return t;
    }
    return 'neutral';
  }
  var TONE_ICON = {
    success: 'check-circle', warning: 'clock', danger: 'alert-circle', info: 'info', neutral: 'minus',
    'Active': 'check-circle'
  };
  function statusIcon(value) { return TONE_ICON[tone(value)] || 'minus'; }

  /* ── Files ────────────────────────────────────────────────────────────── */
  function download(filename, content, mime) {
    try {
      var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1200);
      return true;
    } catch (e) { return false; }
  }
  function toCSV(rows, columns) {
    columns = columns || (rows[0] ? Object.keys(rows[0]) : []);
    function cell(v) {
      if (v === null || v === undefined) return '';
      if (Array.isArray(v)) v = v.join('; ');
      if (typeof v === 'object') v = JSON.stringify(v);
      var s = String(v).replace(/"/g, '""');
      return /[",\n;]/.test(s) ? '"' + s + '"' : s;
    }
    var out = [columns.map(cell).join(',')];
    (rows || []).forEach(function (r) {
      out.push(columns.map(function (c) { return cell(typeof c === 'string' ? r[c] : (c.value ? c.value(r) : '')); }).join(','));
    });
    return out.join('\r\n');
  }
  function parseCSV(text) {
    var rows = [], row = [], cur = '', q = false, i = 0;
    text = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    while (i < text.length) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i += 2; continue; } q = false; i++; continue; }
        cur += c; i++; continue;
      }
      if (c === '"') { q = true; i++; continue; }
      if (c === ',') { row.push(cur); cur = ''; i++; continue; }
      if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; i++; continue; }
      cur += c; i++;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    var header = rows.shift() || [];
    return rows.filter(function (r) { return r.some(function (v) { return String(v).trim() !== ''; }); })
      .map(function (r) {
        var o = {};
        header.forEach(function (h, idx) { o[String(h).trim()] = r[idx] === undefined ? '' : r[idx].trim(); });
        return o;
      });
  }
  function formatBytes(bytes) {
    var b = Number(bytes) || 0;
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    if (b < 1073741824) return (b / 1048576).toFixed(2) + ' MB';
    return (b / 1073741824).toFixed(2) + ' GB';
  }
  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = reject;
      fr.readAsText(file);
    });
  }
  function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  /* ── IDs ──────────────────────────────────────────────────────────────── */
  var uidCounter = 0;
  function uid(prefix) {
    uidCounter++;
    return (prefix || 'id') + '-' + Date.now().toString(36) + uidCounter.toString(36) + Math.random().toString(36).slice(2, 6);
  }
  /** Sequential business id, e.g. nextCode('MRHS-', 'MEM', existing, 2026) */
  function nextCode(rows, field, prefix, pad, start) {
    var max = (start || 0);
    (rows || []).forEach(function (r) {
      var m = String(r[field] || '').match(/(\d+)\s*$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    var n = max + 1;
    var s = String(n);
    while (s.length < (pad || 4)) s = '0' + s;
    return prefix + s;
  }

  /* ── Misc ─────────────────────────────────────────────────────────────── */
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); resolve();
      } catch (e) { reject(e); }
    });
  }
  function randomOf(list) { return list[Math.floor(Math.random() * list.length)]; }
  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffled(list) {
    var a = (list || []).slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function healthyParse(v, fallback) { try { return JSON.parse(v); } catch (e) { return fallback; } }

  global.Utils = {
    MONTHS: MONTHS, MONTHS_SHORT: MONTHS_SHORT, DAYS: DAYS,
    esc: esc, attr: attr, titleCase: titleCase, initials: initials, slug: slug, truncate: truncate, plural: plural,
    num: num, money: money, shortMoney: shortMoney, percent: percent, clamp: clamp, avg: avg, sum: sum,
    toDate: toDate, iso: iso, isoDateTime: isoDateTime, pad: pad, todayISO: todayISO,
    fmtDate: fmtDate, fmtTime: fmtTime, fmtDateTime: fmtDateTime,
    addDays: addDays, addMonths: addMonths, daysBetween: daysBetween, daysFromNow: daysFromNow,
    monthKey: monthKey, monthLabel: monthLabel, startOfMonth: startOfMonth, endOfMonth: endOfMonth,
    startOfWeek: startOfWeek, timeAgo: timeAgo, dueLabel: dueLabel, greeting: greeting, monthsBack: monthsBack,
    $: $, $$: $$, el: el, frag: frag, on: on, delegate: delegate, debounce: debounce, throttle: throttle,
    clone: clone, groupBy: groupBy, uniq: uniq, sortBy: sortBy, pick: pick, findBy: findBy, range: range,
    norm: norm, matches: matches, matchesAny: matchesAny, highlight: highlight,
    colorFor: colorFor, tone: tone, statusIcon: statusIcon, TONES: TONES, PALETTE: PALETTE,
    download: download, toCSV: toCSV, parseCSV: parseCSV, formatBytes: formatBytes,
    readFile: readFile, readFileAsDataURL: readFileAsDataURL,
    uid: uid, nextCode: nextCode,
    copyToClipboard: copyToClipboard, randomOf: randomOf, randomInt: randomInt, shuffled: shuffled
  };
})(window);
