/* ==========================================================================
   MRHS ICT CLUB MASTER — js/core/sync.js
   Shared database sync with Firebase (Cloud Firestore), for clubs that want
   several officers working on the same records.

   Design notes
   ------------
   * No SDK and no CDN: the module speaks the Firebase Authentication and
     Cloud Firestore REST APIs with plain fetch(), so it keeps the project's
     "everything local, no build step" rule and adds nothing to the bundle.
   * Local-first: the browser stays the source of truth while the club is
     offline. Records are diffed against the last known cloud state, queued
     implicitly, and pushed when a connection is available.
   * Conflict rule: last write wins, compared on each record's updatedAt
     timestamp. A record edited here later than the cloud copy wins; otherwise
     the cloud copy is applied. Nothing is ever deleted locally by a push.
   * Officer accounts (users), the audit log, verification codes and the
     notification cache are deliberately NOT synced: they are device-local, and
     the users collection must never leave a school device. Sign-in for the
     shared database is handled by Firebase Authentication instead.

   Configuration lives in club settings (firebaseProjectId / firebaseApiKey /
   syncEnabled). The signed-in tokens live in their own localStorage key and are
   never written into a backup file.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;
  var TOKEN_KEY = 'mrhs-ict-club-master/cloud-firebase';
  var STATE_KEY = 'mrhs-ict-club-master/sync-state';
  var AUTH = 'https://identitytoolkit.googleapis.com/v1';
  var TOKEN_URL = 'https://securetoken.googleapis.com/v1/token';
  var FS = 'https://firestore.googleapis.com/v1';
  var DOC_BASE = 'projects/{p}/databases/(default)/documents';
  var BATCH = 400;            /* Firestore allows 500 writes per commit */
  var PAGE = 300;             /* documents per list request */
  var AUTO_DELAY = 5000;      /* debounce after a local edit */
  var PULL_EVERY = 10 * 60 * 1000;

  /* Local-only collections: never uploaded. */
  var LOCAL_ONLY = ['users', 'auditLog', 'verifications', 'notifications'];

  function syncedCollections() {
    return Store.COLLECTIONS.filter(function (c) { return LOCAL_ONLY.indexOf(c) === -1; });
  }

  /* ══ Storage helpers ════════════════════════════════════════════════════ */
  function settings() { return (Store.settings && Store.settings()) || {}; }
  function readLocal(key) { try { return JSON.parse(global.localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
  function writeLocal(key, value) {
    try {
      if (value === null) global.localStorage.removeItem(key);
      else global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) { return false; }
  }
  function readState() { return readLocal(STATE_KEY) || { collections: {}, lastPull: null, lastPush: null }; }
  function writeState(state) { return writeLocal(STATE_KEY, state); }
  function online() { return global.navigator ? global.navigator.onLine !== false : true; }
  function toast(title, message, tone) { UI.toast(title, message, tone || 'info'); }

  /* ══ Configuration ══════════════════════════════════════════════════════ */
  function projectId() { return String(settings().firebaseProjectId || '').trim(); }
  function apiKey() { return String(settings().firebaseApiKey || '').trim(); }
  function configured() { return !!projectId() && !!apiKey(); }
  function autoEnabled() { return settings().syncEnabled === true; }

  function saveConfig(patch) {
    Store.saveSettings({
      firebaseProjectId: String((patch && patch.projectId) || '').trim(),
      firebaseApiKey: String((patch && patch.apiKey) || '').trim()
    });
  }

  /* ══ Tokens ═════════════════════════════════════════════════════════════ */
  function tokens() { return readLocal(TOKEN_KEY); }
  function storeTokens(t) {
    if (!t) return writeLocal(TOKEN_KEY, null);
    t.expiresAt = Date.now() + ((Number(t.expiresIn) || 3600) - 120) * 1000;
    return writeLocal(TOKEN_KEY, t);
  }
  function connected() { var t = tokens(); return !!(t && t.refreshToken); }
  function account() { var t = tokens(); return (t && (t.email || t.localId)) || ''; }

  /** Signs an officer in with a Firebase Authentication account. */
  function signIn(email, password) {
    if (!configured()) {
      toast('Firebase is not set up yet', 'Save the project ID and API key first — see docs/FIREBASE.md.', 'warning');
      return Promise.resolve(false);
    }
    if (!online()) {
      toast('No internet', 'Connecting to Firebase needs a network connection.', 'warning');
      return Promise.resolve(false);
    }
    return fetch(AUTH + '/accounts:signInWithPassword?key=' + encodeURIComponent(apiKey()), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: String(email || '').trim(), password: password, returnSecureToken: true })
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!res.ok || !json.idToken) throw new Error(authMessage(json));
        storeTokens({
          idToken: json.idToken, refreshToken: json.refreshToken, localId: json.localId,
          email: json.email || email, expiresIn: json.expiresIn
        });
        toast('Firebase connected', 'Signed in as ' + (json.email || email) + '. Records can now be shared with the other officers.', 'success');
        return true;
      });
    })['catch'](function (err) {
      toast('Could not sign in to Firebase', (err && err.message) || 'Check the school account and try again.', 'error');
      return false;
    });
  }

  function authMessage(json) {
    var code = (json && json.error && json.error.message) || '';
    if (/EMAIL_NOT_FOUND|INVALID_PASSWORD|INVALID_LOGIN_CREDENTIALS/.test(code)) return 'That email address and password were not accepted.';
    if (/USER_DISABLED/.test(code)) return 'That Firebase account has been disabled.';
    if (/API key not valid|API_KEY_INVALID/.test(code)) return 'The API key does not match that Firebase project.';
    if (/CONFIGURATION_NOT_FOUND/.test(code)) return 'Email/password sign-in is not enabled for this project yet.';
    return code || 'Firebase refused the sign-in.';
  }

  function signOut() {
    writeLocal(TOKEN_KEY, null);
    toast('Firebase disconnected', 'The stored sign-in was removed from this browser. Records already in Firebase are untouched.', 'info');
    return Promise.resolve(true);
  }

  /** Current id token, refreshed silently when it has expired. */
  function idToken() {
    var t = tokens();
    if (!t) return Promise.resolve(null);
    if (t.idToken && t.expiresAt && Date.now() < t.expiresAt) return Promise.resolve(t.idToken);
    if (!t.refreshToken || !online()) return Promise.resolve(null);
    return fetch(TOKEN_URL + '?key=' + encodeURIComponent(apiKey()), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(t.refreshToken)
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!res.ok || !json.id_token) {
          writeLocal(TOKEN_KEY, null);
          throw new Error('Your Firebase sign-in has expired. Connect again.');
        }
        storeTokens({
          idToken: json.id_token, refreshToken: json.refresh_token || t.refreshToken,
          localId: json.user_id || t.localId, email: t.email, expiresIn: json.expires_in
        });
        return json.id_token;
      });
    });
  }

  /* ══ Firestore value encoding ═══════════════════════════════════════════ */
  function toValue(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'string') return { stringValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
    if (typeof v === 'object') return { mapValue: { fields: toFields(v) } };
    return { stringValue: String(v) };
  }
  function toFields(obj) {
    var out = {};
    Object.keys(obj || {}).forEach(function (k) {
      if (k.charAt(0) === '_') return;                 /* private keys stay local */
      if (obj[k] === undefined || typeof obj[k] === 'function') return;
      out[k] = toValue(obj[k]);
    });
    return out;
  }
  function fromValue(v) {
    if (!v) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('booleanValue' in v) return !!v.booleanValue;
    if ('nullValue' in v) return null;
    if ('timestampValue' in v) return v.timestampValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
    if ('mapValue' in v) return fromFields(v.mapValue.fields);
    return null;
  }
  function fromFields(fields) {
    var out = {};
    Object.keys(fields || {}).forEach(function (k) { out[k] = fromValue(fields[k]); });
    return out;
  }
  function docName(collection, id) {
    return DOC_BASE.replace('{p}', projectId()) + '/' + collection + '/' + encodeURIComponent(id);
  }

  /* ══ Low level Firestore REST ═══════════════════════════════════════════ */
  function call(path, opts) {
    opts = opts || {};
    return idToken().then(function (token) {
      if (!token) throw new Error(configured() ? 'Not signed in to Firebase on this device.' : 'Firebase is not set up yet.');
      var url = FS + '/projects/' + encodeURIComponent(projectId()) + '/databases/(default)/' + path;
      url += (url.indexOf('?') > -1 ? '&' : '?') + 'key=' + encodeURIComponent(apiKey());
      return fetch(url, {
        method: opts.method || 'GET',
        headers: (function () {
          var h = { Authorization: 'Bearer ' + token };
          if (opts.body) h['Content-Type'] = 'application/json';
          return h;
        })(),
        body: opts.body ? JSON.stringify(opts.body) : undefined
      }).then(function (res) {
        if (res.status === 404 && opts.allowMissing) return { missing: true };
        return res.json().then(function (json) {
          if (!res.ok) throw new Error(firestoreMessage(res.status, json));
          return json;
        });
      });
    });
  }

  function firestoreMessage(status, json) {
    var msg = (json && json.error && json.error.message) || '';
    if (status === 401 || status === 403) return 'Firebase refused the request (' + status + '). Check the sign-in and the Firestore security rules.';
    if (status === 404) return 'That Firebase project or database was not found — check the project ID, and that Firestore has been created.';
    if (status === 400) return 'Firebase rejected the data: ' + (msg || 'check the field values.');
    return msg || ('Firebase returned ' + status + '.');
  }

  /* ══ Diffing: what changed since the last sync ══════════════════════════ */
  /** Pending operations, derived from local records vs the last cloud state. */
  function diff() {
    var snap = readState().collections || {};
    var ops = [];
    syncedCollections().forEach(function (col) {
      var rows = Store.all(col) || [];
      var seen = {};
      rows.forEach(function (rec) {
        if (!rec || !rec.id) return;
        var stamp = rec.updatedAt || rec.createdAt || '';
        seen[rec.id] = stamp;
        var known = snap[col] ? snap[col][rec.id] : undefined;
        var changed = known === undefined || known !== stamp;
        if (changed) ops.push({ col: col, id: rec.id, op: 'set', rec: rec, stamp: stamp });
      });
      Object.keys(snap[col] || {}).forEach(function (id) {
        /* hasOwnProperty, not truthiness: records without a timestamp are '' */
        if (!Object.prototype.hasOwnProperty.call(seen, id)) ops.push({ col: col, id: id, op: 'delete', stamp: null });
      });
    });
    return ops;
  }

  function pending() { return diff().length; }

  function applySnapshot(ops) {
    var state = readState();
    state.collections = state.collections || {};
    ops.forEach(function (op) {
      state.collections[op.col] = state.collections[op.col] || {};
      if (op.op === 'delete') delete state.collections[op.col][op.id];
      else state.collections[op.col][op.id] = op.stamp || '';
    });
    writeState(state);
  }

  /* ══ Push ═══════════════════════════════════════════════════════════════ */
  function writesFor(ops) {
    return ops.map(function (op) {
      if (op.op === 'delete') return { delete: docName(op.col, op.id) };
      return { update: { name: docName(op.col, op.id), fields: toFields(op.rec) } };
    });
  }

  function chunk(list, size) {
    var out = [];
    for (var i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
  }

  /** Uploads everything that has changed locally; small and safe when called often. */
  function push(opts) {
    opts = opts || {};
    var ops = opts.ops || (opts.full ? fullOps() : diff());
    if (!ops.length) return Promise.resolve({ pushed: 0, pending: 0 });
    if (!connected()) {
      if (opts.quiet !== true) toast('Firebase is not connected', 'Sign in once in Settings → Data → Cloud backup, then the app syncs by itself.', 'warning');
      return Promise.resolve({ pushed: 0, pending: ops.length, offline: !online() });
    }
    if (!online()) {
      if (opts.quiet !== true) toast('Offline', 'Changes are saved on this device and will upload when the internet is back.', 'info');
      return Promise.resolve({ pushed: 0, pending: ops.length, offline: true });
    }
    var batches = chunk(ops, BATCH);
    var pushed = 0;
    var chain = Promise.resolve();
    batches.forEach(function (batch) {
      chain = chain.then(function () {
        return call('documents:commit', { method: 'POST', body: { writes: writesFor(batch) } })
          .then(function () {
            applySnapshot(batch);
            pushed += batch.length;
          });
      });
    });
    return chain.then(function () {
      var state = readState();
      state.lastPush = new Date().toISOString();
      writeState(state);
      Store.saveSettings({ syncLastAt: state.lastPush });
      if (opts.quiet !== true) {
        toast('Shared database updated', pushed + ' record' + (pushed === 1 ? '' : 's') + ' uploaded to Firebase.', 'success');
      }
      return { pushed: pushed, pending: pending() };
    })['catch'](function (err) {
      if (opts.quiet !== true) toast('Firebase upload failed', (err && err.message) || 'The records could not be uploaded.', 'error');
      return { pushed: pushed, pending: ops.length - pushed, error: true, message: err && err.message };
    });
  }

  /** Every record, ignoring the diff — used by “Back up now”. */
  function fullOps() {
    var ops = [];
    syncedCollections().forEach(function (col) {
      (Store.all(col) || []).forEach(function (rec) {
        if (rec && rec.id) ops.push({ col: col, id: rec.id, op: 'set', rec: rec, stamp: rec.updatedAt || rec.createdAt || '' });
      });
    });
    return ops;
  }

  /* ══ Pull ═══════════════════════════════════════════════════════════════ */
  function listCollection(col, pageToken) {
    var path = 'documents/' + col + '?pageSize=' + PAGE + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    return call(path, { allowMissing: true }).then(function (json) {
      if (json.missing) return { docs: [], next: null };
      var docs = (json.documents || []).map(function (d) {
        var id = String(d.name || '').split('/').pop();
        return { id: decodeURIComponent(id), fields: fromFields(d.fields), updateTime: d.updateTime || null };
      });
      return { docs: docs, next: json.nextPageToken || null };
    });
  }

  function listAll(col) {
    var out = [];
    function step(token) {
      return listCollection(col, token).then(function (r) {
        out = out.concat(r.docs);
        return r.next ? step(r.next) : out;
      });
    }
    return step(null)['catch'](function (err) {
      if (/not found|404/i.test((err && err.message) || '')) return [];
      throw err;
    });
  }

  /** True when the cloud copy is newer than the one held here. */
  function remoteWins(local, remote) {
    if (!local) return true;
    var l = String(local.updatedAt || local.createdAt || '');
    var r = String(remote.updatedAt || remote.createdAt || '');
    if (!r) return false;
    if (!l) return true;
    return r > l;
  }

  var applying = false;

  /**
   * Downloads the shared records.
   *   mode 'merge'   — add and update only where the cloud copy is newer
   *   mode 'replace' — make the cloud copy authoritative (local extras removed)
   */
  function pull(opts) {
    opts = opts || {};
    if (!connected()) {
      toast('Firebase is not connected', 'Connect in Settings → Data → Cloud backup first.', 'warning');
      return Promise.resolve({ pulled: 0, error: true });
    }
    if (!online()) {
      toast('Offline', 'Reading the shared database needs a connection. Try again when the network is back.', 'info');
      return Promise.resolve({ pulled: 0, offline: true });
    }
    var mode = opts.mode === 'replace' ? 'replace' : 'merge';
    var applied = 0, removed = 0, conflicts = 0;
    var chain = Promise.resolve();
    var state = readState();
    state.collections = state.collections || {};
    applying = true;

    syncedCollections().forEach(function (col) {
      chain = chain.then(function () {
        return listAll(col).then(function (docs) {
          var local = Store.all(col) || [];
          var byId = {};
          local.forEach(function (r) { byId[r.id] = r; });
          var incoming = {};
          docs.forEach(function (doc) {
            incoming[doc.id] = true;
            var here = byId[doc.id];
            var took = false;
            if (!here) {
              local.push(doc.fields);
              applied++;
              took = true;
            } else if (remoteWins(here, doc.fields)) {
              Object.keys(doc.fields).forEach(function (k) { here[k] = doc.fields[k]; });
              applied++;
              took = true;
            } else if (String(here.updatedAt || '') > String(doc.fields.updatedAt || '')) {
              conflicts++;   /* kept the local edit; it will be pushed next */
            }
            state.collections[col] = state.collections[col] || {};
            /* Only remember the local stamp when the cloud copy was actually
               taken. A kept local edit keeps the cloud stamp, so it stays in the
               queue and is uploaded on the next push. Never use Firestore's
               server updateTime: records with no timestamp of their own would
               then look changed on every single sync. */
            state.collections[col][doc.id] = took
              ? String((byId[doc.id] || doc.fields).updatedAt || (byId[doc.id] || doc.fields).createdAt || '')
              : String(doc.fields.updatedAt || doc.fields.createdAt || '');
          });
          if (mode === 'replace') {
            for (var i = local.length - 1; i >= 0; i--) {
              if (!incoming[local[i].id]) { local.splice(i, 1); removed++; }
            }
          }
          Store.replace(col, local);      /* store save() is silent per collection here */
        });
      });
    });

    return chain.then(function () {
      applying = false;
      state.lastPull = new Date().toISOString();
      writeState(state);
      Store.saveSettings({ syncLastAt: state.lastPull });
      Store.emit({ type: 'sync', action: 'pull' });
      if (opts.quiet !== true) {
        toast('Shared database read', applied + ' record' + (applied === 1 ? '' : 's') + ' applied' +
          (removed ? ', ' + removed + ' removed' : '') +
          (conflicts ? '. ' + conflicts + ' local edit' + (conflicts === 1 ? '' : 's') + ' kept and will be uploaded.' : '.'), 'success');
      }
      return { pulled: applied, removed: removed, conflicts: conflicts };
    })['catch'](function (err) {
      applying = false;
      if (opts.quiet !== true) toast('Firebase download failed', (err && err.message) || 'The shared records could not be read.', 'error');
      return { pulled: applied, error: true, message: err && err.message };
    });
  }

  /** Upload local edits, then bring back anything the other officers changed. */
  function sync(opts) {
    opts = opts || {};
    return push(opts).then(function (up) {
      if (up.error || up.offline) return up;
      return pull(opts).then(function (down) {
        return { pushed: up.pushed, pulled: down.pulled, conflicts: down.conflicts, removed: down.removed };
      });
    });
  }

  /* ══ Automatic syncing ══════════════════════════════════════════════════ */
  var timer = null;
  var bound = false;
  var lastPullAt = 0;

  function schedule(delay) {
    if (!autoEnabled() || !connected() || applying) return;
    if (timer) global.clearTimeout(timer);
    timer = global.setTimeout(function () {
      timer = null;
      if (!online()) return;
      push({ quiet: true }).then(function (r) {
        if (r && r.pushed) Store.emit({ type: 'sync', action: 'auto-push', pushed: r.pushed });
      });
    }, delay === undefined ? AUTO_DELAY : delay);
  }

  /** Wires the store, the network state and a slow background refresh. */
  function init() {
    if (bound) return;
    bound = true;
    Store.on(function (evt) {
      if (!evt) return;
      if (evt.type === 'change' && !applying) schedule();
      if (evt.type === 'import' || evt.type === 'reset') schedule(1500);
    });
    if (global.addEventListener) {
      global.addEventListener('online', function () {
        if (!autoEnabled()) return;
        schedule(800);
        maybePull(true);
      });
      global.addEventListener('offline', function () {
        if (autoEnabled()) toast('Working offline', 'Records are saved on this device and will sync when the internet returns.', 'info', { duration: 2600 });
      });
      global.setInterval(function () { maybePull(false); }, PULL_EVERY);
    }
  }

  function maybePull(force) {
    if (!autoEnabled() || !connected() || !online() || applying) return Promise.resolve(null);
    var now = Date.now();
    if (!force && now - lastPullAt < PULL_EVERY - 5000) return Promise.resolve(null);
    lastPullAt = now;
    return pull({ quiet: true }).then(function (r) {
      if (r && r.pulled) Store.emit({ type: 'sync', action: 'auto-pull', pulled: r.pulled });
      return r;
    });
  }

  function setAuto(on) {
    Store.saveSettings({ syncEnabled: !!on });
    if (on) { schedule(500); toast('Automatic sync on', 'Changes on this device upload by themselves, and other officers’ edits arrive within a few minutes.', 'success'); }
    else toast('Automatic sync off', 'Use “Sync now” when you want to exchange records with Firebase.', 'info');
    return !!on;
  }

  /* ══ Status for the settings card ═══════════════════════════════════════ */
  function status() {
    var s = settings();
    return {
      configured: configured(),
      connected: connected(),
      account: account(),
      projectId: projectId(),
      apiKey: apiKey(),
      auto: autoEnabled(),
      pending: connected() ? pending() : 0,
      lastAt: s.syncLastAt || null,
      collections: syncedCollections().length,
      localOnly: LOCAL_ONLY.slice()
    };
  }

  global.Sync = {
    init: init, status: status, settings: settings,
    configured: configured, saveConfig: saveConfig,
    connected: connected, account: account, signIn: signIn, signOut: signOut,
    push: push, pull: pull, sync: sync, pending: pending, diff: diff,
    setAuto: setAuto, schedule: schedule, maybePull: maybePull,
    /* constants + helpers used by the settings screen and the tests */
    localOnly: LOCAL_ONLY, batchSize: BATCH, pageSize: PAGE, autoDelay: AUTO_DELAY,
    toFields: toFields, fromFields: fromFields, remoteWins: remoteWins,
    _keys: { tokens: TOKEN_KEY, state: STATE_KEY }
  };
})(window);
