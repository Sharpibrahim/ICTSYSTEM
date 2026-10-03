/* ==========================================================================
   MRHS ICT CLUB MASTER — js/core/store.js
   The local data layer.

   Design notes
   ------------
   • Every module talks to the application ONLY through `Store`. No module
     reads or writes localStorage directly. Replacing this file with a
     Firebase / Supabase / REST adapter (same method names, async-friendly)
     is enough to move the whole platform to a real backend.
   • Collections are stored one localStorage key per collection so that a
     single write never rewrites the whole database.
   • Binary payloads (uploaded images, files) go to IndexedDB.
   • A lightweight pub/sub: Store.on('change', fn) lets views refresh.
   ========================================================================== */
(function (global) {
  'use strict';

  var NS = 'mrhs-ict-club-master';
  var SCHEMA_VERSION = 1;
  var KEY = {
    meta: NS + '/meta',
    settings: NS + '/settings',
    col: function (c) { return NS + '/collection/' + c; }
  };

  /* Collections that make up the database. */
  var COLLECTIONS = [
    'members', 'cabinet', 'cabinetHistory', 'meetings', 'attendance', 'courses',
    'enrollments', 'lessons', 'activities', 'projects', 'projectTasks', 'reports',
    'certificates', 'resources', 'announcements', 'tasks', 'equipment', 'transactions',
    'achievements', 'gallery', 'albums', 'documents', 'notifications', 'users',
    'auditLog', 'verifications'
  ];

  var state = {};
  var listeners = [];
  var ready = false;

  /* ── Low level localStorage helpers ───────────────────────────────────── */
  function lsGet(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) {
      console.warn('[Store] write failed for', key, e);
      if (global.UI && UI.toast) {
        UI.toast('Storage limit reached', 'The browser refused to save more data. Export a backup and reset demo data.', 'error');
      }
      return false;
    }
  }
  function lsRemove(key) { try { localStorage.removeItem(key); } catch (e) {} }
  function lsUsedBytes() {
    var total = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(NS) === 0) total += (localStorage.getItem(k) || '').length * 2;
      }
    } catch (e) {}
    return total;
  }

  /* ── IndexedDB (binary/attachment payloads) ───────────────────────────── */
  var idb = {
    db: null,
    open: function () {
      return new Promise(function (resolve) {
        if (!global.indexedDB) return resolve(null);
        try {
          var req = indexedDB.open(NS + '-files', 1);
          req.onupgradeneeded = function (e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
          };
          req.onsuccess = function (e) { idb.db = e.target.result; resolve(idb.db); };
          req.onerror = function () { resolve(null); };
        } catch (e) { resolve(null); }
      });
    },
    tx: function (mode) {
      if (!idb.db) return null;
      try { return idb.db.transaction('files', mode).objectStore('files'); } catch (e) { return null; }
    },
    put: function (rec) {
      return new Promise(function (resolve) {
        var st = idb.tx('readwrite');
        if (!st) return resolve(false);
        var r = st.put(rec);
        r.onsuccess = function () { resolve(true); };
        r.onerror = function () { resolve(false); };
      });
    },
    get: function (id) {
      return new Promise(function (resolve) {
        var st = idb.tx('readonly');
        if (!st) return resolve(null);
        var r = st.get(id);
        r.onsuccess = function () { resolve(r.result || null); };
        r.onerror = function () { resolve(null); };
      });
    },
    all: function () {
      return new Promise(function (resolve) {
        var st = idb.tx('readonly');
        if (!st) return resolve([]);
        var r = st.getAll();
        r.onsuccess = function () { resolve(r.result || []); };
        r.onerror = function () { resolve([]); };
      });
    },
    del: function (id) {
      return new Promise(function (resolve) {
        var st = idb.tx('readwrite');
        if (!st) return resolve(false);
        var r = st.delete(id);
        r.onsuccess = function () { resolve(true); };
        r.onerror = function () { resolve(false); };
      });
    },
    clear: function () {
      return new Promise(function (resolve) {
        var st = idb.tx('readwrite');
        if (!st) return resolve(true);
        var r = st.clear();
        r.onsuccess = function () { resolve(true); };
        r.onerror = function () { resolve(false); };
      });
    }
  };

  /* ── Pub / sub ────────────────────────────────────────────────────────── */
  function emit(event) {
    listeners.slice().forEach(function (l) {
      try { l(event); } catch (e) { console.error('[Store] listener error', e); }
    });
  }
  function on(fn) {
    listeners.push(fn);
    return function () { var i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }

  /* ── Core CRUD ────────────────────────────────────────────────────────── */
  function all(collection) {
    if (!state[collection]) state[collection] = lsGet(KEY.col(collection), []);
    return state[collection];
  }
  function save(collection, silent) {
    lsSet(KEY.col(collection), state[collection]);
    if (!silent) emit({ type: 'change', collection: collection });
  }
  function sortableId(r) { return r.id || r._id || ''; }
  function find(collection, id) {
    var rows = all(collection);
    for (var i = 0; i < rows.length; i++) if (sortableId(rows[i]) === id) return rows[i];
    return null;
  }
  function insert(collection, record) {
    var rows = all(collection);
    if (!record.id) record.id = Utils.uid(collection.slice(0, 3));
    record.createdAt = record.createdAt || new Date().toISOString();
    record.updatedAt = new Date().toISOString();
    if (record.demo === undefined) record.demo = true;
    rows.push(record);
    save(collection);
    audit('create', collection, record);
    return record;
  }
  function insertMany(collection, records) {
    var rows = all(collection);
    (records || []).forEach(function (r) { rows.push(r); });
    save(collection);
    return records;
  }
  function update(collection, id, patch) {
    var rec = find(collection, id);
    if (!rec) return null;
    for (var k in patch) {
      if (!Object.prototype.hasOwnProperty.call(patch, k)) continue;
      rec[k] = patch[k];
    }
    rec.updatedAt = new Date().toISOString();
    save(collection);
    audit('update', collection, rec, patch);
    return rec;
  }
  function replace(collection, records) {
    state[collection] = records || [];
    save(collection);
  }
  function remove(collection, id) {
    var rows = all(collection);
    var idx = -1;
    for (var i = 0; i < rows.length; i++) if (sortableId(rows[i]) === id) { idx = i; break; }
    if (idx < 0) return false;
    var rec = rows[idx];
    rows.splice(idx, 1);
    save(collection);
    audit('delete', collection, rec);
    return true;
  }
  function removeWhere(collection, predicate) {
    var rows = all(collection);
    var removed = [];
    for (var i = rows.length - 1; i >= 0; i--) if (predicate(rows[i])) removed.push(rows.splice(i, 1)[0]);
    save(collection);
    return removed;
  }
  function where(collection, predicate) {
    return all(collection).filter(predicate);
  }
  function count(collection, predicate) {
    var rows = all(collection);
    return predicate ? rows.filter(predicate).length : rows.length;
  }

  /* ── Settings ─────────────────────────────────────────────────────────── */
  function settings() {
    if (!state.__settings) state.__settings = lsGet(KEY.settings, {});
    return state.__settings;
  }
  function saveSettings(patch) {
    var s = settings();
    for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) s[k] = patch[k];
    lsSet(KEY.settings, s);
    emit({ type: 'settings', settings: s });
    return s;
  }

  /* ── Audit log (kept small) ───────────────────────────────────────────── */
  function audit(action, collection, record, patch) {
    var log = all('auditLog');
    log.unshift({
      id: Utils.uid('log'),
      action: action,
      collection: collection,
      recordId: record ? record.id : null,
      label: labelFor(record),
      user: (global.Auth && Auth.currentUser()) ? Auth.currentUser().username : 'system',
      at: new Date().toISOString(),
      meta: patch ? { changed: Object.keys(patch) } : null
    });
    if (log.length > 400) log.length = 400;
    save('auditLog', true);
  }
  function labelFor(rec) {
    if (!rec) return '';
    return rec.name || rec.title || rec.fullName || rec.code || rec.id || '';
  }

  /* ── Bootstrap ────────────────────────────────────────────────────────── */
  function init() {
    return new Promise(function (resolve) {
      var existing = lsGet(KEY.meta, null);
      var needsSeed = !existing || !existing.seeded || existing.schemaVersion !== SCHEMA_VERSION;

      // Load every collection (cheap: one key per collection)
      COLLECTIONS.forEach(function (c) { state[c] = lsGet(KEY.col(c), []); });
      state.__settings = lsGet(KEY.settings, {});

      if (needsSeed) {
        Data.seed(state);
        COLLECTIONS.forEach(function (c) { lsSet(KEY.col(c), state[c] || []); });
        lsSet(KEY.settings, state.__settings);
        lsSet(KEY.meta, {
          schemaVersion: SCHEMA_VERSION, seeded: true,
          seededAt: new Date().toISOString(), demo: true
        });
      }

      // Guard: ensure declared collections exist
      COLLECTIONS.forEach(function (c) { if (!Array.isArray(state[c])) state[c] = []; });

      ready = true;
      idb.open();
      resolve(true);
    });
  }

  /* ── Maintenance ──────────────────────────────────────────────────────── */
  function resetDemoData() {
    COLLECTIONS.forEach(function (c) { lsRemove(KEY.col(c)); });
    lsRemove(KEY.settings); lsRemove(KEY.meta);
    Object.keys(state).forEach(function (k) { delete state[k]; });
    idb.clear();
    return init().then(function () { emit({ type: 'reset' }); });
  }
  function clearAllData() {
    COLLECTIONS.forEach(function (c) { lsRemove(KEY.col(c)); state[c] = []; });
    lsRemove(KEY.settings);
    lsSet(KEY.meta, { schemaVersion: SCHEMA_VERSION, seeded: true, emptiedAt: new Date().toISOString(), demo: false });
    lsSet(KEY.settings, Data.defaultSettings());
    state.__settings = lsGet(KEY.settings, {});
    emit({ type: 'reset' });
  }
  function exportAll() {
    var out = {
      app: 'MRHS ICT CLUB MASTER',
      exportedAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      settings: settings(),
      collections: {}
    };
    COLLECTIONS.forEach(function (c) { out.collections[c] = all(c); });
    out.counts = {};
    COLLECTIONS.forEach(function (c) { out.counts[c] = (out.collections[c] || []).length; });
    return out;
  }
  function importAll(payload, mode) {
    if (!payload || typeof payload !== 'object') throw new Error('Backup file is not valid JSON.');
    if (!payload.collections) throw new Error('Backup file does not contain a "collections" object.');
    if (mode === 'replace') {
      COLLECTIONS.forEach(function (c) {
        if (payload.collections[c]) state[c] = payload.collections[c];
      });
    } else {
      // merge: keep existing records, add new ids only
      COLLECTIONS.forEach(function (c) {
        var incoming = payload.collections[c] || [];
        var existing = all(c);
        var ids = {};
        existing.forEach(function (r) { ids[r.id] = true; });
        incoming.forEach(function (r) { if (!r.id) r.id = Utils.uid(c.slice(0, 3)); if (!ids[r.id]) existing.push(r); });
      });
    }
    if (payload.settings) {
      var s = settings();
      for (var k in payload.settings) s[k] = payload.settings[k];
      lsSet(KEY.settings, s);
    }
    COLLECTIONS.forEach(function (c) { save(c, true); });
    emit({ type: 'import', mode: mode });
    return exportAll().counts;
  }
  function stats() {
    var counts = {}, total = 0;
    COLLECTIONS.forEach(function (c) { counts[c] = all(c).length; total += counts[c]; });
    var bytes = lsUsedBytes();
    return {
      counts: counts, total: total, bytes: bytes,
      readable: Utils.formatBytes(bytes),
      quota: 5 * 1024 * 1024,
      pct: Math.min(100, Math.round((bytes / (5 * 1024 * 1024)) * 100))
    };
  }

  /* ── Demo helpers ─────────────────────────────────────────────────────── */
  function stripDemo(collection) {
    var removed = removeWhere(collection, function (r) { return r.demo === true; });
    return removed.length;
  }

  global.Store = {
    COLLECTIONS: COLLECTIONS,
    init: init,
    isReady: function () { return ready; },
    all: all, find: find, where: where, count: count,
    insert: insert, insertMany: insertMany, update: update, remove: remove,
    removeWhere: removeWhere, replace: replace, save: save,
    settings: settings, saveSettings: saveSettings,
    on: on, emit: emit,
    exportAll: exportAll, importAll: importAll, stats: stats,
    resetDemoData: resetDemoData, clearAllData: clearAllData, stripDemo: stripDemo,
    files: {
      put: function (name, type, dataUrl) {
        var id = Utils.uid('file');
        return idb.put({ id: id, name: name, type: type, dataUrl: dataUrl, size: (dataUrl || '').length, at: new Date().toISOString() })
          .then(function () { return id; });
      },
      get: function (id) { return idb.get(id); },
      all: function () { return idb.all(); },
      remove: function (id) { return idb.del(id); }
    },
    auditLog: function () { return all('auditLog'); }
  };
})(window);
