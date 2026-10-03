/* ==========================================================================
   MRHS ICT CLUB MASTER — js/core/cloud.js
   Cloud backup connectors. The platform has no server of its own, so backups
   reach the cloud in one of two ways:

     1. FOLDER  — the browser writes the backup file straight into a folder you
        pick once (the OneDrive / Google Drive / Dropbox desktop sync folder, a
        network share or a USB stick). No account setup, works offline, and the
        sync client does the uploading. Uses the File System Access API.

     2. ONEDRIVE — Microsoft Graph with OAuth 2.0 + PKCE and no client secret,
        straight from the browser. Uploads and lists backups in the app's own
        OneDrive folder. Needs a one-time app registration in the school's
        Microsoft 365 tenant (see docs/ONEDRIVE.md); the club pastes the
        application (client) ID here.

   Access tokens are kept in localStorage under their own key and are
   deliberately NEVER included in a backup file.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;
  var TOKEN_KEY = 'mrhs-ict-club-master/cloud-onedrive';
  var VERIFIER_KEY = 'mrhs-ict-club-master/cloud-verifier';
  var HANDLE_DB = 'mrhs-ict-club-master-cloud';
  var GRAPH = 'https://graph.microsoft.com/v1.0';
  var goTo = function (url) { global.location.assign(url); };
  var LOGIN = 'https://login.microsoftonline.com';
  var SCOPES = 'offline_access openid profile User.Read Files.ReadWrite.AppFolder';
  var BACKUP_PREFIX = 'mrhs-ict-club-backup-';

  /* ══ Small helpers ══════════════════════════════════════════════════════ */
  function settings() { return (Store.settings && Store.settings()) || {}; }
  function nowISO() { return U.todayISO ? U.todayISO() : new Date().toISOString().slice(0, 10); }
  function backupName() { return BACKUP_PREFIX + nowISO() + '.json'; }
  function online() { return global.navigator ? global.navigator.onLine !== false : true; }

  function readJSON(key) {
    try { return JSON.parse(global.localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }
  function writeJSON(key, value) {
    try {
      if (value === null) global.localStorage.removeItem(key);
      else global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) { return false; }
  }

  function toast(title, message, tone) { UI.toast(title, message, tone || 'info'); }

  /* Message used whenever the browser/embedding blocks a network call. */
  function offlineMessage() {
    return 'The app could not reach Microsoft. Open the platform on its real address (the sandbox preview has no internet) and try again.';
  }

  /* ══ IndexedDB: remembers the chosen folder between visits ═════════════ */
  var handles = {
    db: null,
    open: function () {
      return new Promise(function (resolve) {
        if (!global.indexedDB) return resolve(null);
        try {
          var req = indexedDB.open(HANDLE_DB, 1);
          req.onupgradeneeded = function (e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles');
            if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
          };
          req.onsuccess = function (e) { handles.db = e.target.result; resolve(handles.db); };
          req.onerror = function () { resolve(null); };
        } catch (e) { resolve(null); }
      });
    },
    tx: function (store, mode) {
      if (!handles.db) return null;
      try { return handles.db.transaction(store, mode).objectStore(store); } catch (e) { return null; }
    },
    put: function (store, key, value) {
      return handles.open().then(function () {
        return new Promise(function (resolve) {
          var st = handles.tx(store, 'readwrite');
          if (!st) return resolve(false);
          var r = st.put(value, key);
          r.onsuccess = function () { resolve(true); };
          r.onerror = function () { resolve(false); };
        });
      });
    },
    get: function (store, key) {
      return handles.open().then(function () {
        return new Promise(function (resolve) {
          var st = handles.tx(store, 'readonly');
          if (!st) return resolve(null);
          var r = st.get(key);
          r.onsuccess = function () { resolve(r.result || null); };
          r.onerror = function () { resolve(null); };
        });
      });
    }
  };

  /* ══ 1. Folder connector ════════════════════════════════════════════════ */
  var folder = { handle: null, name: '' };

  function folderSupported() {
    return typeof global.showDirectoryPicker === 'function' && !!global.indexedDB;
  }

  /** Asks the user for a folder and remembers it (OneDrive sync lives here). */
  function folderConnect() {
    if (!folderSupported()) {
      toast('Folder access unavailable', 'This browser cannot write to a folder directly. Use “Export backup (JSON)” and save it into your OneDrive folder, or connect OneDrive below.', 'warning');
      return Promise.resolve(false);
    }
    return global.showDirectoryPicker({ id: 'mrhs-backups', mode: 'readwrite', startIn: 'documents' })
      .then(function (handle) {
        folder.handle = handle;
        folder.name = handle.name;
        return handles.put('meta', 'folderName', handle.name)
          .then(function () { return handles.put('handles', 'backupFolder', handle); })
          .then(function () {
            toast('Backup folder connected', 'Backups will be written into “' + handle.name + '”. If that folder is inside OneDrive, it syncs to the cloud automatically.', 'success');
            return true;
          });
      })
      ['catch'](function (err) {
        if (err && err.name === 'AbortError') return false;
        toast('Could not use that folder', (err && err.message) || 'The browser refused access to the folder.', 'error');
        return false;
      });
  }

  /** Restores the remembered folder and, if needed, re-asks for permission. */
  function folderRestore(interactive) {
    return handles.get('meta', 'folderName').then(function (name) {
      folder.name = name || '';
      if (folder.handle) return folderReady(interactive);
      return handles.get('handles', 'backupFolder').then(function (handle) {
        folder.handle = handle || null;
        if (!handle) return false;
        return folderReady(interactive);
      });
    });
  }

  function folderReady(interactive) {
    var handle = folder.handle;
    if (!handle) return Promise.resolve(false);
    if (!handle.queryPermission) return Promise.resolve(true);
    return handle.queryPermission({ mode: 'readwrite' }).then(function (state) {
      if (state === 'granted') return true;
      if (!interactive) return false;
      return handle.requestPermission({ mode: 'readwrite' }).then(function (next) { return next === 'granted'; });
    })['catch'](function () { return false; });
  }

  function folderConnected() { return !!folder.handle; }
  function folderName() { return folder.name || (folder.handle && folder.handle.name) || ''; }

  function folderDisconnect() {
    folder.handle = null;
    folder.name = '';
    return handles.put('handles', 'backupFolder', null).then(function () {
      return handles.put('meta', 'folderName', null);
    }).then(function () {
      toast('Backup folder forgotten', 'Nothing was deleted — the app simply stopped writing to that folder.', 'info');
      return true;
    });
  }

  /** Writes the current club data into the connected folder. */
  function folderBackup() {
    return folderRestore(true).then(function (ok) {
      if (!ok || !folder.handle) {
        toast('No backup folder', 'Connect a folder first (Settings → Data → Cloud backup).', 'warning');
        return null;
      }
      var name = backupName();
      var payload = JSON.stringify(Store.exportAll(), null, 2);
      return folder.handle.getFileHandle(name, { create: true }).then(function (file) {
        return file.createWritable();
      }).then(function (writable) {
        return writable.write(payload).then(function () { return writable.close(); });
      }).then(function () {
        Store.saveSettings({ cloudLastBackup: new Date().toISOString() });
        toast('Backed up to ' + folderName(), name + ' written. Your sync client (OneDrive, Drive, Dropbox) uploads it automatically.', 'success');
        return name;
      })['catch'](function (err) {
        toast('Backup failed', (err && err.message) || 'The folder could not be written to.', 'error');
        return null;
      });
    });
  }

  /** Lists the backups already in the connected folder, newest first. */
  function folderList() {
    return folderRestore(true).then(function (ok) {
      if (!ok || !folder.handle || !folder.handle.values) return [];
      var out = [];
      var iterator = folder.handle.values();
      function step() {
        return iterator.next().then(function (r) {
          if (r.done) return out;
          var h = r.value;
          if (h.kind === 'file' && h.name.indexOf(BACKUP_PREFIX) === 0 && /\.json$/.test(h.name)) out.push(h.name);
          return step();
        });
      }
      return step().then(function (names) {
        return names.sort().reverse();
      })['catch'](function () { return []; });
    });
  }

  function folderRead(name) {
    return folderRestore(true).then(function (ok) {
      if (!ok || !folder.handle) return null;
      return folder.handle.getFileHandle(name).then(function (file) {
        return file.getFile();
      }).then(function (f) {
        return U.readFile(f);
      })['catch'](function () { return null; });
    });
  }

  /* ══ 2. OneDrive connector (Microsoft Graph, PKCE) ══════════════════════ */
  var graph = { tokens: null };

  function clientId() { return String(settings().cloudOnedriveClientId || '').trim(); }
  function tenant() { return String(settings().cloudOnedriveTenant || 'common').trim() || 'common'; }
  function redirectURI() {
    var loc = global.location;
    return loc.origin + loc.pathname.replace(/index\.html$/, '');
  }
  function graphConfigured() { return !!clientId(); }

  function loadTokens() {
    graph.tokens = readJSON(TOKEN_KEY);
    return graph.tokens;
  }
  function saveTokens(t) { graph.tokens = t; writeJSON(TOKEN_KEY, t); }
  function graphConnected() { return !!(graph.tokens && graph.tokens.refresh_token); }
  function graphAccount() { return (graph.tokens && (graph.tokens.name || graph.tokens.username || graph.tokens.account)) || ''; }

  function randomVerifier() {
    var bytes = new Uint8Array(32);
    if (global.crypto && global.crypto.getRandomValues) global.crypto.getRandomValues(bytes);
    else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    var s = '';
    for (var j = 0; j < bytes.length; j++) s += String.fromCharCode(bytes[j]);
    return base64url(s);
  }

  function base64url(str) {
    var b64 = global.btoa ? global.btoa(str) : '';
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function sha256(text) {
    if (!global.crypto || !global.crypto.subtle || !global.TextEncoder) return Promise.resolve('');
    var data = new global.TextEncoder().encode(text);
    return global.crypto.subtle.digest('SHA-256', data).then(function (buf) {
      var bytes = new Uint8Array(buf), s = '';
      for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
      return base64url(s);
    })['catch'](function () { return ''; });
  }

  /** Starts the sign-in: stores the PKCE verifier and leaves for Microsoft. */
  function graphConnect() {
    if (!graphConfigured()) {
      toast('OneDrive is not set up yet', 'Paste the application (client) ID from your Microsoft 365 app registration first — see docs/ONEDRIVE.md.', 'warning');
      return Promise.resolve(false);
    }
    if (!online()) { toast('No internet', offlineMessage(), 'warning'); return Promise.resolve(false); }
    var verifier = randomVerifier();
    var state = randomVerifier().slice(0, 16);
    try {
      sessionStorage.setItem(VERIFIER_KEY, JSON.stringify({ verifier: verifier, state: state, at: Date.now() }));
    } catch (e) {}
    return sha256(verifier).then(function (challenge) {
      var params = [
        'client_id=' + encodeURIComponent(clientId()),
        'response_type=code',
        'redirect_uri=' + encodeURIComponent(redirectURI()),
        'response_mode=query',
        'scope=' + encodeURIComponent(SCOPES),
        'state=' + encodeURIComponent(state),
        'prompt=select_account'
      ];
      if (challenge) params.push('code_challenge=' + encodeURIComponent(challenge), 'code_challenge_method=S256');
      goTo(LOGIN + '/' + encodeURIComponent(tenant()) + '/oauth2/v2.0/authorize?' + params.join('&'));
      return true;
    });
  }

  /** Completes the sign-in when Microsoft sends the browser back (?code=…). */
  function graphHandleRedirect() {
    var loc = global.location;
    if (!loc.search || loc.search.indexOf('code=') === -1) return Promise.resolve(false);
    var query = {};
    loc.search.replace(/^\?/, '').split('&').forEach(function (pair) {
      var bits = pair.split('=');
      if (bits[0]) query[decodeURIComponent(bits[0])] = decodeURIComponent((bits[1] || '').replace(/\+/g, ' '));
    });
    if (query.error) {
      toast('OneDrive sign-in cancelled', query.error_description || query.error, 'warning');
      cleanURL();
      return Promise.resolve(false);
    }
    var saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(VERIFIER_KEY) || 'null'); } catch (e) {}
    if (!saved || (query.state && saved.state && query.state !== saved.state)) {
      toast('OneDrive sign-in could not be completed', 'The saved sign-in attempt was missing or did not match. Please connect again.', 'warning');
      cleanURL();
      return Promise.resolve(false);
    }
    var body = [
      'client_id=' + encodeURIComponent(clientId()),
      'grant_type=authorization_code',
      'code=' + encodeURIComponent(query.code),
      'redirect_uri=' + encodeURIComponent(redirectURI()),
      'scope=' + encodeURIComponent(SCOPES)
    ];
    if (saved.verifier) body.push('code_verifier=' + encodeURIComponent(saved.verifier));
    return fetch(LOGIN + '/' + encodeURIComponent(tenant()) + '/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.join('&')
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!res.ok || !json.access_token) throw new Error(json.error_description || json.error || 'Microsoft refused the sign-in.');
        json.expires_at = Date.now() + ((json.expires_in || 3600) - 60) * 1000;
        saveTokens(json);
        try { sessionStorage.removeItem(VERIFIER_KEY); } catch (e) {}
        cleanURL();
        return graphWhoami().then(function (who) {
          if (who) { graph.tokens.name = who.displayName; graph.tokens.username = who.userPrincipalName; saveTokens(graph.tokens); }
          toast('OneDrive connected', 'Signed in as ' + (graphAccount() || 'your Microsoft account') + '. Backups now go into the app folder in OneDrive.', 'success');
          return true;
        });
      });
    })['catch'](function (err) {
      cleanURL();
      toast('OneDrive sign-in failed', (err && err.message) || offlineMessage(), 'error');
      return false;
    });
  }

  /** Removes the code/state parameters Microsoft added to the address bar. */
  function cleanURL() {
    try {
      var url = global.location.pathname + global.location.hash;
      global.history.replaceState({}, '', url);
    } catch (e) {}
  }

  function graphDisconnect() {
    var t = graph.tokens;
    writeJSON(TOKEN_KEY, null);
    graph.tokens = null;
    /* Ask Microsoft to forget the session too (best effort). */
    if (t && t.refresh_token) {
      try {
        fetch(LOGIN + '/' + encodeURIComponent(tenant()) + '/oauth2/v2.0/logout', { method: 'POST' })['catch'](function () {});
      } catch (e) {}
    }
    toast('OneDrive disconnected', 'The stored sign-in was removed from this browser. Backups already in OneDrive are untouched.', 'info');
    return Promise.resolve(true);
  }

  /** Returns a usable access token, refreshing it when it has expired. */
  function graphToken() {
    var t = graph.tokens || loadTokens();
    if (!t) return Promise.resolve(null);
    if (t.access_token && t.expires_at && Date.now() < t.expires_at) return Promise.resolve(t.access_token);
    if (!t.refresh_token) return Promise.resolve(null);
    if (!online()) return Promise.resolve(null);
    var body = [
      'client_id=' + encodeURIComponent(clientId()),
      'grant_type=refresh_token',
      'refresh_token=' + encodeURIComponent(t.refresh_token),
      'scope=' + encodeURIComponent(SCOPES)
    ];
    return fetch(LOGIN + '/' + encodeURIComponent(tenant()) + '/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.join('&')
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!res.ok || !json.access_token) {
          writeJSON(TOKEN_KEY, null);
          graph.tokens = null;
          throw new Error(json.error_description || 'Your OneDrive sign-in has expired. Connect again.');
        }
        json.refresh_token = json.refresh_token || t.refresh_token;
        json.expires_at = Date.now() + ((json.expires_in || 3600) - 60) * 1000;
        json.name = t.name; json.username = t.username;
        saveTokens(json);
        return json.access_token;
      });
    });
  }

  function graphFetch(path, opts) {
    opts = opts || {};
    return graphToken().then(function (token) {
      if (!token) throw new Error(graphConfigured() ? offlineMessage() : 'OneDrive is not connected.');
      var headers = opts.headers || {};
      headers.Authorization = 'Bearer ' + token;
      return fetch(GRAPH + path, { method: opts.method || 'GET', headers: headers, body: opts.body });
    });
  }

  function graphWhoami() {
    return graphFetch('/me').then(function (res) {
      if (!res.ok) return null;
      return res.json();
    })['catch'](function () { return null; });
  }

  function graphUpload(name, text) {
    if (!online()) { toast('No internet', offlineMessage(), 'warning'); return Promise.resolve(false); }
    return graphFetch('/me/drive/special/approot:/' + encodeURIComponent(name) + ':/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: text
    }).then(function (res) {
      if (!res.ok) throw new Error('Microsoft returned ' + res.status + '. ' + (res.status === 403 ? 'Check that the app registration has the Files.ReadWrite.AppFolder permission and that consent was granted.' : ''));
      return res.json();
    }).then(function () {
      toast('Backed up to OneDrive', name + ' is now in the app folder “MRHS ICT Club Master” in OneDrive.', 'success');
      return true;
    })['catch'](function (err) {
      toast('OneDrive backup failed', (err && err.message) || offlineMessage(), 'error');
      return false;
    });
  }

  function graphBackup() {
    var name = backupName();
    return graphUpload(name, JSON.stringify(Store.exportAll(), null, 2)).then(function (ok) {
      if (ok) {
        var conf = settings();
        var list = (conf.cloudBackups || []).filter(function (b) { return b.name !== name; });
        list.unshift({ name: name, at: new Date().toISOString() });
        Store.saveSettings({ cloudBackups: list.slice(0, 12), cloudLastBackup: new Date().toISOString() });
      }
      return ok ? name : null;
    });
  }

  /** Lists the backups in the OneDrive app folder, newest first. */
  function graphList() {
    return graphFetch('/me/drive/special/approot/children?$select=id,name,size,lastModifiedDateTime&$top=50')
      .then(function (res) {
        if (!res.ok) throw new Error('Microsoft returned ' + res.status + '.');
        return res.json();
      })
      .then(function (json) {
        return (json.value || [])
          .filter(function (it) { return it.name && it.name.indexOf(BACKUP_PREFIX) === 0 && /\.json$/.test(it.name); })
          .map(function (it) { return { id: it.id, name: it.name, size: it.size, modified: it.lastModifiedDateTime }; })
          .sort(function (a, b) { return String(b.name).localeCompare(String(a.name)); });
      })['catch'](function (err) {
        toast('Could not list OneDrive backups', (err && err.message) || offlineMessage(), 'error');
        return [];
      });
  }

  function graphRead(id) {
    return graphFetch('/me/drive/items/' + encodeURIComponent(id) + '/content')
      .then(function (res) {
        if (!res.ok) throw new Error('Microsoft returned ' + res.status + '.');
        return res.text();
      })['catch'](function (err) {
        toast('Could not read that backup', (err && err.message) || offlineMessage(), 'error');
        return null;
      });
  }

  /* ══ Restoring from any source ══════════════════════════════════════════ */
  /** Merges or replaces the club data from a backup file's text. */
  function restore(text, mode) {
    var payload;
    try { payload = JSON.parse(text); }
    catch (e) { toast('That file is not a backup', 'Choose a JSON backup created by this platform.', 'error'); return false; }
    try {
      Store.importAll(payload, mode === 'replace' ? 'replace' : 'merge');
      toast('Backup restored', mode === 'replace' ? 'All records were replaced with the backup.' : 'Backup records were merged into this device.', 'success');
      if (global.Shell && Shell.refresh) Shell.refresh();
      if (global.Router && Router.refresh) Router.refresh();
      return true;
    } catch (err) {
      toast('Restore failed', (err && err.message) || 'The backup could not be applied.', 'error');
      return false;
    }
  }

  /** Status used by the settings card. */
  function status() {
    return {
      folderSupported: folderSupported(),
      folderConnected: folderConnected(),
      folderName: folderName(),
      onedriveConfigured: graphConfigured(),
      onedriveConnected: graphConnected(),
      onedriveAccount: graphAccount(),
      clientId: clientId(),
      tenant: tenant(),
      lastBackup: settings().cloudLastBackup || null
    };
  }

  loadTokens();

  global.Cloud = {
    /* shared */
    status: status, restore: restore, backupName: backupName,
    /* folder connector */
    folderSupported: folderSupported, folderConnect: folderConnect, folderRestore: folderRestore,
    folderConnected: folderConnected, folderName: folderName, folderDisconnect: folderDisconnect,
    folderBackup: folderBackup, folderList: folderList, folderRead: folderRead,
    /* OneDrive connector */
    graphConfigured: graphConfigured, graphConnected: graphConnected, graphAccount: graphAccount,
    graphConnect: graphConnect, graphDisconnect: graphDisconnect, graphHandleRedirect: graphHandleRedirect,
    graphBackup: graphBackup, graphList: graphList, graphRead: graphRead,
    /* exposed for tests */
    _redirectURI: redirectURI, _scopes: SCOPES, _tokenKey: TOKEN_KEY,
    _setNavigator: function (fn) { if (typeof fn === 'function') goTo = fn; },
    _reloadTokens: function () { return loadTokens(); }
  };
})(window);
