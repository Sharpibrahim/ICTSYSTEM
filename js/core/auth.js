/* ==========================================================================
   MRHS ICT CLUB MASTER — js/core/auth.js
   Authentication, sessions and the role/permission matrix.

   The permission matrix is data-driven: `Auth.can(module, action)` is the only
   check any view needs to perform, so swapping authentication for a backend
   provider later does not touch module code.
   ========================================================================== */
(function (global) {
  'use strict';

  var SESSION_KEY = 'mrhs-ict-club-master/session';
  var FAIL_KEY = 'mrhs-ict-club-master/login-attempts';
  var MAX_ATTEMPTS = 5;
  var LOCK_MINUTES = 5;

  /* ── Module catalogue (must match the navigation) ─────────────────────── */
  var MODULES = [
    'dashboard', 'members', 'cabinet', 'meetings', 'attendance', 'courses', 'activities',
    'projects', 'reports', 'certificates', 'resources', 'announcements', 'tasks', 'calendar',
    'equipment', 'finance', 'achievements', 'gallery', 'documents', 'analytics', 'settings', 'manual'
  ];

  var V = 'view', M = 'manage', F = 'full';

  /* Permission levels: view → read only · manage → create/edit · full → all + delete */
  var MATRIX = {
    Administrator: { '*': F },

    Patron: {
      dashboard: V, members: M, cabinet: V, meetings: M, attendance: V, courses: V,
      activities: M, projects: V, reports: M, certificates: V, resources: V,
      announcements: M, tasks: V, calendar: V, equipment: V, finance: V,
      achievements: M, gallery: M, documents: M, analytics: V, settings: V, users: V, manual: 'none'
    },

    President: {
      dashboard: F, members: F, cabinet: F, meetings: F, attendance: F, courses: M,
      activities: F, projects: F, reports: F, certificates: F, resources: M,
      announcements: F, tasks: F, calendar: F, equipment: M, finance: V,
      achievements: F, gallery: F, documents: F, analytics: V, settings: V, manual: 'none'
    },

    Secretary: {
      dashboard: V, members: M, cabinet: V, meetings: F, attendance: F, courses: V,
      activities: M, projects: V, reports: F, certificates: M, resources: M,
      announcements: M, tasks: M, calendar: F, equipment: V, finance: V,
      achievements: M, gallery: M, documents: F, analytics: V, settings: V, manual: 'none'
    },

    Treasurer: {
      dashboard: V, members: V, cabinet: V, meetings: V, attendance: V, courses: V,
      activities: V, projects: V, reports: M, certificates: V, resources: V,
      announcements: V, tasks: M, calendar: V, equipment: M, finance: F,
      achievements: V, gallery: V, documents: M, analytics: V, settings: V, manual: 'none'
    },

    'Training Coordinator': {
      dashboard: V, members: V, cabinet: V, meetings: V, attendance: M, courses: F,
      activities: M, projects: V, reports: M, certificates: M, resources: F,
      announcements: V, tasks: M, calendar: V, equipment: V, finance: 'none',
      achievements: V, gallery: M, documents: M, analytics: V, settings: V, manual: 'none'
    },

    'Project Coordinator': {
      dashboard: V, members: V, cabinet: V, meetings: V, attendance: V, courses: V,
      activities: F, projects: F, reports: M, certificates: V, resources: M,
      announcements: V, tasks: M, calendar: V, equipment: M, finance: 'none',
      achievements: M, gallery: M, documents: M, analytics: V, settings: V, manual: 'none'
    },

    Member: {
      dashboard: V, members: 'own', cabinet: V, meetings: V, attendance: 'own', courses: V,
      activities: V, projects: V, reports: 'none', certificates: 'own', resources: V,
      announcements: V, tasks: 'none', calendar: V, equipment: 'none', finance: 'none',
      achievements: V, gallery: V, documents: V, analytics: 'none', settings: 'own-profile', manual: 'none'
    }
  };

  var state = { user: null };

  /* ── Password hashing (SHA-256) ───────────────────────────────────────── */
  function hash(text) {
    var salted = 'mrhs-ict::' + String(text);
    if (global.crypto && global.crypto.subtle && global.TextEncoder) {
      return global.crypto.subtle.digest('SHA-256', new TextEncoder().encode(salted)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ('0' + b.toString(16)).slice(-2);
        }).join('');
      });
    }
    // Fallback (non-secure environments): simple deterministic digest
    var h = 5381;
    for (var i = 0; i < salted.length; i++) h = ((h << 5) + h + salted.charCodeAt(i)) >>> 0;
    return Promise.resolve('fallback' + h.toString(16));
  }

  /* ── Session helpers ──────────────────────────────────────────────────── */
  function readSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function writeSession(user, remember) {
    var payload = JSON.stringify({ userId: user.id, username: user.username, at: new Date().toISOString() });
    try {
      if (remember) { localStorage.setItem(SESSION_KEY, payload); sessionStorage.removeItem(SESSION_KEY); }
      else { sessionStorage.setItem(SESSION_KEY, payload); localStorage.removeItem(SESSION_KEY); }
    } catch (e) {}
  }
  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  /* ── Login attempt throttling ─────────────────────────────────────────── */
  function attempts() {
    try { return JSON.parse(localStorage.getItem(FAIL_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveAttempts(a) { try { localStorage.setItem(FAIL_KEY, JSON.stringify(a)); } catch (e) {} }
  function lockedOut(username) {
    var a = attempts()[username];
    if (!a || !a.lockedUntil) return 0;
    var left = new Date(a.lockedUntil).getTime() - Date.now();
    return left > 0 ? Math.ceil(left / 60000) : 0;
  }
  function noteFailure(username) {
    var all = attempts();
    var a = all[username] || { count: 0 };
    a.count++;
    if (a.count >= MAX_ATTEMPTS) {
      a.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
      a.count = 0;
    }
    all[username] = a;
    saveAttempts(all);
    return MAX_ATTEMPTS - a.count;
  }
  function clearFailures(username) {
    var all = attempts(); delete all[username]; saveAttempts(all);
  }

  /* ── Bootstrap / migration ────────────────────────────────────────────── */
  /** Convert any plaintext demo passwords into hashes on first run, and mark
   *  every account still using the published demo password so the officer is
   *  made to choose their own before using the club's records. */
  function migrate() {
    var users = Store.all('users');
    var jobs = [];
    var changed = false;
    var demoHash = null;
    var plainDemo = users.some(function (u) { return u.password === 'demo1234'; });

    if (plainDemo || users.some(function (u) { return u.passwordHash && !u.mustChangePassword; })) {
      demoHash = hash('demo1234');
    }

    users.forEach(function (u) {
      if (u.password && !u.passwordHash) {
        jobs.push(hash(u.password).then(function (h) {
          u.passwordHash = h;
          if (u.password === 'demo1234') u.mustChangePassword = true;
          delete u.password;
          changed = true;
          return true;
        }));
      }
    });

    return Promise.all(jobs).then(function () {
      if (!demoHash) return null;
      return demoHash.then(function (h) {
        users.forEach(function (u) {
          if (u.passwordHash === h && !u.mustChangePassword) { u.mustChangePassword = true; changed = true; }
        });
        return true;
      });
    }).then(function () {
      if (changed) Store.save('users', true);
      return changed;
    });
  }

  /** The accounts that still use the shipped demonstration password. As long
   *  as the list is not empty the sign-in shortcut stays on the login screen,
   *  because anyone who reads the project could sign in as those accounts. */
  function pendingAccounts() {
    return Store.all('users').filter(function (u) {
      return u.status !== 'Suspended' && u.mustChangePassword === true;
    });
  }
  function needsSetup() { return pendingAccounts().length > 0; }

  /** The officer chooses their own password at first sign-in. Only permitted
   *  while the account is still flagged, so it can never be used to take over
   *  an account that has a real password. */
  function firstPasswordChange(userId, newPassword) {
    var user = Store.find('users', userId);
    if (!user) return Promise.reject(new Error('Account not found.'));
    if (user.mustChangePassword !== true) return Promise.reject(new Error('This account already has its own password.'));
    var problem = passwordProblem(newPassword, user);
    if (problem) return Promise.reject(new Error(problem));
    return hash(newPassword).then(function (h) {
      user.passwordHash = h;
      delete user.password;
      delete user.mustChangePassword;
      user.passwordChangedAt = new Date().toISOString();
      Store.save('users');
      auditPassword(user, 'first password set');
      return true;
    });
  }

  /** A readable one-time password an administrator can hand over in person. */
  function tempPassword() {
    var letters = 'abcdefghjkmnpqrstuvwxyz', digits = '23456789';
    var out = 'MRHS-';
    for (var i = 0; i < 4; i++) out += letters.charAt(Math.floor(Math.random() * letters.length));
    for (var j = 0; j < 3; j++) out += digits.charAt(Math.floor(Math.random() * digits.length));
    return out;
  }

  /** Shared password rules. */
  function passwordProblem(password, user) {
    if (String(password || '').length < 8) return 'Use at least 8 characters.';
    if (String(password) === 'demo1234') return 'That is the published demonstration password — choose your own.';
    if (String(password).toLowerCase() === String(user && user.username || '').toLowerCase()) return 'Do not use the username as the password.';
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Mix letters and numbers.';
    return '';
  }

  /** How strong the password looks, for the meter on the change-password form. */
  function passwordStrength(password) {
    var p = String(password || '');
    var score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (/^demo1234$/i.test(p)) score = 0;
    var labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
    return { score: score, label: labels[Math.min(score, 5)] };
  }

  function auditPassword(user, what) {
    Store.insert('auditLog', {
      id: Utils.uid('log'), action: 'security', collection: 'users',
      recordId: user.id, label: user.username,
      user: (state.user && state.user.username) || user.username,
      at: new Date().toISOString(), meta: { note: what, demo: false }
    });
  }

  /** Restore a session from storage (called during app boot). */
  function restore() {
    var s = readSession();
    if (!s) return null;
    var user = Store.find('users', s.userId) || Utils.findBy(Store.all('users'), 'username', s.username);
    if (!user || user.status === 'Suspended') { clearSession(); return null; }
    state.user = user;
    return user;
  }

  /* ── Login / logout ───────────────────────────────────────────────────── */
  function login(identifier, password, remember) {
    identifier = String(identifier || '').trim();
    if (!identifier) return Promise.reject(new Error('Enter your username or email address.'));
    if (!password) return Promise.reject(new Error('Enter your password.'));

    var lock = lockedOut(identifier.toLowerCase());
    if (lock) return Promise.reject(new Error('Too many failed attempts. Try again in ' + lock + ' minute(s).'));

    var users = Store.all('users');
    var user = Utils.findBy(users, function (u) {
      return Utils.norm(u.username) === Utils.norm(identifier) || Utils.norm(u.email) === Utils.norm(identifier);
    });

    if (!user) {
      noteFailure(identifier.toLowerCase());
      return Promise.reject(new Error('No account found for that username or email address.'));
    }
    if (user.status === 'Suspended') {
      return Promise.reject(new Error('This account is suspended. Contact the club administrator.'));
    }

    return hash(password).then(function (h) {
      var ok = (user.passwordHash === h) || (user.password && user.password === password);
      if (!ok) {
        var left = noteFailure(identifier.toLowerCase());
        throw new Error('Incorrect password.' + (left > 0 && left <= 3 ? ' ' + left + ' attempt(s) left before a temporary lock.' : ''));
      }
      if (user.password && !user.passwordHash) { user.passwordHash = h; delete user.password; }
      user.lastLogin = new Date().toISOString();
      Store.save('users', true);
      clearFailures(identifier.toLowerCase());
      state.user = user;
      writeSession(user, remember !== false);
      Store.emit({ type: 'login', user: user });
      return user;
    });
  }

  function logout() {
    var u = state.user;
    state.user = null;
    clearSession();
    Store.emit({ type: 'logout', user: u });
  }

  /* ── Password reset (prototype flow) ──────────────────────────────────── */
  function findAccount(identifier) {
    return Utils.findBy(Store.all('users'), function (u) {
      return Utils.norm(u.username) === Utils.norm(identifier) || Utils.norm(u.email) === Utils.norm(identifier);
    });
  }
  function resetPassword(username, newPassword) {
    var user = findAccount(username);
    if (!user) return Promise.reject(new Error('Account not found.'));
    if (String(newPassword).length < 6) return Promise.reject(new Error('Password must be at least 6 characters.'));
    return hash(newPassword).then(function (h) {
      user.passwordHash = h;
      delete user.password;
      user.mustChangePassword = true;      /* the owner sets their own on next sign-in */
      user.passwordChangedAt = new Date().toISOString();
      Store.save('users');
      auditPassword(user, 'password reset by an administrator');
      return true;
    });
  }
  function changePassword(userId, currentPassword, newPassword) {
    var user = Store.find('users', userId);
    if (!user) return Promise.reject(new Error('User not found.'));
    return hash(currentPassword).then(function (h) {
      if (user.passwordHash !== h) throw new Error('Your current password is incorrect.');
      if (String(newPassword).length < 6) throw new Error('The new password must be at least 6 characters.');
      return hash(newPassword);
    }).then(function (nh) {
      user.passwordHash = nh;
      user.passwordChangedAt = new Date().toISOString();
      delete user.mustChangePassword;
      Store.save('users');
      auditPassword(user, 'password changed');
      return true;
    });
  }

  /* ── Users management ─────────────────────────────────────────────────── */
  function createUser(data) {
    var existing = findAccount(data.username) || findAccount(data.email);
    if (existing) return Promise.reject(new Error('A user with that username or email already exists.'));
    var temp = data.password || tempPassword();
    var problem = passwordProblem(temp, { username: data.username });
    if (problem) return Promise.reject(new Error(problem));
    return hash(temp).then(function (h) {
      var rec = {
        id: Utils.uid('usr'), demo: false,
        username: data.username, email: data.email, name: data.name,
        role: data.role || 'Member', memberId: data.memberId || null,
        phone: data.phone || '', status: data.status || 'Active',
        passwordHash: h, createdAt: new Date().toISOString(), lastLogin: null,
        mustChangePassword: true           /* they choose their own at first sign-in */
      };
      Store.insert('users', rec);
      return rec;
    });
  }

  /* ── Permissions ──────────────────────────────────────────────────────── */
  function levelFor(role, moduleKey) {
    var m = MATRIX[role];
    if (!m) return 'none';
    if (m['*']) return m['*'];
    return m[moduleKey] || 'none';
  }

  var RANK = { 'none': 0, 'own': 1, 'own-profile': 1, 'view': 2, 'manage': 3, 'full': 4 };

  /**
   * Auth.can(module, action)
   *   module — module key ('members', 'finance', …) or array of keys
   *   action — 'view' | 'create' | 'edit' | 'manage' | 'delete' | 'export' | 'settings'
   * Administrator always passes. Unknown modules default to view-level for staff.
   */
  function can(moduleKey, action) {
    var user = state.user;
    if (!user) return false;
    if (user.role === 'Administrator' || (user.permissions && user.permissions['*'])) return true;

    var keys = Array.isArray(moduleKey) ? moduleKey : [moduleKey];
    var act = action || 'view';
    var best = 'none';
    keys.forEach(function (k) {
      var lvl = levelFor(user.role, k);
      if (RANK[lvl] > RANK[best]) best = lvl;
      if (user.permissions && user.permissions[k] && RANK[user.permissions[k]] > RANK[lvl]) best = user.permissions[k];
    });

    if (act === 'view') return RANK[best] >= 2;
    if (act === 'own') return RANK[best] >= 1;
    if (act === 'create' || act === 'edit' || act === 'manage') return RANK[best] >= 3;
    if (act === 'delete' || act === 'settings') return RANK[best] >= 4;
    if (act === 'export') return RANK[best] >= 2;
    return false;
  }

  function level(moduleKey) {
    var user = state.user;
    if (!user) return 'none';
    if (user.role === 'Administrator') return 'full';
    return levelFor(user.role, moduleKey);
  }

  /** Human readable explanation used by the "no access" screen. */
  function explain(moduleKey) {
    var user = state.user;
    if (!user) return 'You are not signed in.';
    var role = Data.ROLES[user.role] || { label: user.role, description: '' };
    return 'Your role (' + role.label + ') does not include access to ' + Utils.titleCase(moduleKey) + '. ' + (role.description || '');
  }

  function currentUser() { return state.user; }
  function is(role) { return state.user && state.user.role === role; }
  function modules() { return MODULES.slice(); }
  function roleInfo(role) {
    return (Data.ROLES[role]) || { label: role, tone: 'neutral', description: '' };
  }
  function usersForMember(memberId) {
    return Store.where('users', function (u) { return u.memberId === memberId; });
  }

  global.Auth = {
    MODULES: MODULES,
    MATRIX: MATRIX,
    RANK: RANK,
    hash: hash,
    init: migrate,
    login: login,
    logout: logout,
    restore: restore,
    currentUser: currentUser,
    is: is,
    can: can,
    level: level,
    explain: explain,
    modules: modules,
    roleInfo: roleInfo,
    findAccount: findAccount,
    resetPassword: resetPassword,
    changePassword: changePassword,
    firstPasswordChange: firstPasswordChange,
    passwordProblem: passwordProblem,
    tempPassword: tempPassword,
    passwordStrength: passwordStrength,
    needsSetup: needsSetup,
    pendingAccounts: pendingAccounts,
    createUser: createUser,
    usersForMember: usersForMember,
    lockedOut: lockedOut
  };
})(window);
