/* ==========================================================================
   MRHS ICT CLUB MASTER — js/core/shell.js
   The application frame: sidebar navigation, top bar, theme switching,
   notification centre, global search and the footer status line.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;

  /* ── Navigation model ─────────────────────────────────────────────────── */
  var NAV = [
    {
      group: 'Overview', items: [
        { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'dashboard', module: 'dashboard' },
        { key: 'analytics', label: 'Analytics', path: '/analytics', icon: 'bar-chart', module: 'analytics' }
      ]
    },
    {
      group: 'Membership', items: [
        { key: 'members', label: 'Members', path: '/members', icon: 'users', module: 'members', count: function () { return Store.count('members', function (m) { return m.membershipStatus === 'Active'; }); }, countTitle: 'Active members' },
        { key: 'cabinet', label: 'Cabinet', path: '/cabinet', icon: 'crown', module: 'cabinet', count: function () { return Store.count('cabinet'); }, countTitle: 'Cabinet positions' },
        { key: 'attendance', label: 'Attendance', path: '/attendance', icon: 'user-check', module: 'attendance' }
      ]
    },
    {
      group: 'Programmes', items: [
        { key: 'meetings', label: 'Meetings', path: '/meetings', icon: 'calendar-check', module: 'meetings', count: function () { return Store.count('meetings', function (m) { return m.status === 'Scheduled'; }); }, countTitle: 'Scheduled meetings' },
        { key: 'courses', label: 'Courses', path: '/courses', icon: 'graduation', module: 'courses', count: function () { return Store.count('courses', function (c) { return c.status === 'Ongoing'; }); }, countTitle: 'Courses running' },
        { key: 'activities', label: 'Activities', path: '/activities', icon: 'rocket', module: 'activities' },
        { key: 'projects', label: 'Projects', path: '/projects', icon: 'kanban', module: 'projects', count: function () { return Store.count('projects', function (p) { return p.status === 'Development' || p.status === 'Testing'; }); }, countTitle: 'Projects in progress' }
      ]
    },
    {
      group: 'Documentation', items: [
        { key: 'reports', label: 'Reports', path: '/reports', icon: 'file-text', module: 'reports' },
        { key: 'certificates', label: 'Certificates', path: '/certificates', icon: 'award', module: 'certificates', count: function () { return Store.count('certificates', function (c) { return c.status === 'Issued'; }); }, countTitle: 'Certificates issued' },
        { key: 'resources', label: 'Notes & Resources', path: '/resources', icon: 'book-open', module: 'resources' },
        { key: 'documents', label: 'Documents', path: '/documents', icon: 'folder', module: 'documents' }
      ]
    },
    {
      group: 'Communication', items: [
        { key: 'announcements', label: 'Announcements', path: '/announcements', icon: 'megaphone', module: 'announcements' },
        { key: 'tasks', label: 'Tasks', path: '/tasks', icon: 'check-square', module: 'tasks', count: function () { return Store.count('tasks', function (t) { return t.status !== 'Completed'; }); }, countTitle: 'Open tasks' },
        { key: 'calendar', label: 'Calendar', path: '/calendar', icon: 'calendar', module: 'calendar' }
      ]
    },
    {
      group: 'Operations', items: [
        { key: 'equipment', label: 'Equipment', path: '/equipment', icon: 'cpu', module: 'equipment' },
        { key: 'finance', label: 'Finance', path: '/finance', icon: 'wallet', module: 'finance' },
        { key: 'achievements', label: 'Achievements', path: '/achievements', icon: 'trophy', module: 'achievements' },
        { key: 'gallery', label: 'Gallery', path: '/gallery', icon: 'image', module: 'gallery' }
      ]
    },
    {
      group: 'System', items: [
        { key: 'account', label: 'My Account', path: '/account', icon: 'user-cog', module: 'dashboard' },
        { key: 'settings', label: 'Settings', path: '/settings', icon: 'sliders', module: 'settings' },
        { key: 'manual', label: 'User Manual', path: '/manual', icon: 'book', module: 'manual' },
        { key: 'verify', label: 'Verify Certificate', path: '/verify', icon: 'verified', module: 'certificates' }
      ]
    }
  ];

  function items() {
    var out = [];
    NAV.forEach(function (g) { out = out.concat(g.items); });
    return out;
  }
  function configFor(key) {
    return U.findBy(items(), 'key', key);
  }

  /* ── Sidebar ──────────────────────────────────────────────────────────── */
  function renderNav() {
    var nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    var html = '';
    NAV.forEach(function (g) {
      var visible = g.items.filter(function (i) { return Auth.can(i.module, 'view'); });
      if (!visible.length) return;
      html += '<div class="nav-section">' +
        '<p class="nav-section-label">' + U.esc(g.group) + '</p>' +
        visible.map(function (i) {
          var count = null;
          try { count = i.count ? i.count() : null; } catch (e) { count = null; }
          return '<a class="nav-item" href="#' + i.path + '" data-nav="' + i.key + '"' +
            (count ? ' title="' + U.attr(i.label + ' · ' + count + ' ' + (i.countTitle || '')) + '"' : '') + '>' +
            Icons.svg(i.icon, { class: 'nav-ico' }) +
            '<span class="nav-text">' + U.esc(i.label) + '</span>' +
            (count ? '<span class="nav-count">' + count + '</span>' : '') +
          '</a>';
        }).join('') + '</div>';
    });
    nav.innerHTML = html;
    nav.addEventListener('click', function (e) {
      if (e.target.closest('.nav-item') && window.innerWidth <= 900) closeSidebar();
    });
  }

  function setActive(path) {
    var key = (path || '').split('/')[1] || 'dashboard';
    if (key === 'verify') key = 'verify';
    U.$$('[data-nav]').forEach(function (el) {
      var on = el.getAttribute('data-nav') === key;
      el.classList.toggle('active', on);
      if (on) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    });
    renderCrumb(key);
  }

  function renderCrumb(key) {
    var host = document.getElementById('page-crumb');
    if (!host) return;
    var cfg = configFor(key);
    var label = cfg ? cfg.label : U.titleCase(key);
    var icon = cfg ? cfg.icon : 'compass';
    var sub = '';
    var ctx = Router.current();
    if (ctx && ctx.config && ctx.config.subtitle) sub = typeof ctx.config.subtitle === 'function' ? ctx.config.subtitle(ctx) : ctx.config.subtitle;
    else if (cfg) sub = '';
    host.innerHTML = '<span class="pc-ico">' + Icons.svg(icon) + '</span>' +
      '<span class="page-crumb-text"><strong>' + U.esc(label) + '</strong><small>' + U.esc(sub || (ctx && ctx.params && ctx.params.id ? 'Record detail view' : 'Module')) + '</small></span>';
  }

  /* ── Sidebar drawer (mobile) ──────────────────────────────────────────── */
  function openSidebar() {
    var sb = document.getElementById('sidebar'), scrim = document.getElementById('scrim');
    if (!sb) return;
    sb.classList.add('open');
    scrim.hidden = false;
    document.getElementById('sidebar-open').setAttribute('aria-expanded', 'true');
    var first = sb.querySelector('.nav-item');
    if (first) setTimeout(function () { first.focus(); }, 180);
  }
  function closeSidebar() {
    var sb = document.getElementById('sidebar'), scrim = document.getElementById('scrim');
    if (!sb) return;
    sb.classList.remove('open');
    scrim.hidden = true;
    var btn = document.getElementById('sidebar-open');
    if (btn) { btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
  }

  /* ── Theme ────────────────────────────────────────────────────────────── */
  function preferredTheme() {
    var saved = Store.settings().theme || 'light';
    if (saved === 'system') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return saved;
  }
  var SCHEMES = [
    ['azure',    'Azure & Cyan',    'The club\u2019s own deep blue with cyan light — the default'],
    ['indigo',   'Indigo & Violet', 'Rich purple-blue, suits presentations and badges'],
    ['royal',    'Royal & Gold',    'Club navy with gold — dignified on certificates and print'],
    ['emerald',  'Emerald & Teal',  'Green and teal, fresh for training and the laboratory'],
    ['midnight', 'Midnight & Cyan', 'Near-black navy with bright cyan accents for evening work'],
    ['plum',     'Plum & Rose',     'Deep berry tones, warm and distinctive'],
    ['slate',    'Slate & Steel',   'Quiet formal grey-blue for printed cabinets'],
    ['sunset',   'Sunset & Coral',  'Orange and coral, energetic on the notice board'],
    ['lagoon',   'Teal & Sand',     'Calm coastal teal with sand-gold highlights'],
    ['sky',      'Sky & Ash',       'Bright sky blue and neutral grey for projectors'],
    ['teams',    'System Blue',     'The familiar Windows blue for school computers']
  ];
  function schemeKey(key) {
    var k = String(key || 'azure');
    if (k === 'primary') k = 'azure';            /* the old single-theme value */
    return SCHEMES.some(function (s) { return s[0] === k; }) ? k : 'azure';
  }
  /** Applies the club's colour scheme to the whole interface. */
  function applyScheme(key, opts) {
    opts = opts || {};
    var k = schemeKey(key || Store.settings().accent);
    if (opts.save !== false && Store.settings().accent !== k) Store.saveSettings({ accent: k });
    document.documentElement.setAttribute('data-accent', k);
    var info = SCHEMES.filter(function (s) { return s[0] === k; })[0] || SCHEMES[0];
    var meta = document.getElementById('theme-color-meta');
    if (meta) {
      var probe = document.createElement('span');
      probe.style.color = 'var(--primary)';
      document.body.appendChild(probe);
      var rgb = getComputedStyle(probe).color;
      probe.remove();
      if (rgb && rgb !== 'rgba(0, 0, 0, 0)') meta.setAttribute('content', rgb);
    }
    U.$$('[data-accent-choice]').forEach(function (b) {
      var on = b.getAttribute('data-accent-choice') === k;
      b.setAttribute('aria-checked', String(on));
      b.classList.toggle('active', on);
    });
    return info;
  }

  function applyTheme(mode, opts) {
    opts = opts || {};
    if (mode) Store.saveSettings({ theme: mode });
    var resolved = preferredTheme();
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-mode', mode || Store.settings().theme || 'light');
    var icon = document.getElementById('theme-icon');
    if (icon) icon.innerHTML = Icons.ref('sun');
    var meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? 'dark' : 'light');
    applyScheme(Store.settings().accent || 'azure', { save: false });   /* keep the club colour */
    U.$$('[data-theme-choice]').forEach(function (b) {
      var on = b.getAttribute('data-theme-choice') === (mode || Store.settings().theme || 'light');
      b.setAttribute('aria-checked', String(on));
      b.classList.toggle('active', on);
    });
    if (!opts.silent) {
      UI.toast('Appearance updated', U.titleCase(mode || Store.settings().theme) + ' theme applied.', 'info', { duration: 2200 });
    }
  }
  function initTheme() {
    applyTheme(Store.settings().theme || 'light', { silent: true });
    applyScheme(Store.settings().accent || 'azure', { save: false });
    U.$$('[data-theme-choice]').forEach(function (b) {
      b.addEventListener('click', function () {
        applyTheme(b.getAttribute('data-theme-choice'));
        UI.closeDropdowns();
      });
    });
    U.$$('[data-accent-choice]').forEach(function (b) {
      b.addEventListener('click', function () {
        applyScheme(b.getAttribute('data-accent-choice'));
        UI.closeDropdowns();
      });
    });
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        if ((Store.settings().theme || 'light') === 'system') applyTheme('system', { silent: true });
      });
    }
  }

  /* ── Notifications ────────────────────────────────────────────────────── */
  function readIds() {
    var s = Store.settings();
    return Array.isArray(s.notifReadIds) ? s.notifReadIds : [];
  }
  function markRead(ids) {
    var list = U.uniq(readIds().concat(ids || []));
    if (list.length > 300) list = list.slice(-300);
    Store.saveSettings({ notifReadIds: list });
  }

  /**
   * Builds the live notification feed from club records plus stored notices.
   * This is intentionally computed so the centre always reflects real data.
   */
  function notifications() {
    var s = Store.settings();
    var out = [];
    var today = U.todayISO();
    var read = readIds();

    if (s.notifyMeetings !== false) {
      Store.all('meetings').filter(function (m) { return m.status === 'Scheduled' && m.date >= today; })
        .slice(0, 4).forEach(function (m) {
          var d = U.daysFromNow(m.date);
          out.push({
            id: 'n-meeting-' + m.id, type: 'Meeting', tone: 'info', icon: 'calendar-check',
            title: (d <= 1 ? 'Meeting ' + (d === 0 ? 'today' : 'tomorrow') + ': ' : 'Upcoming meeting: ') + m.title,
            message: U.fmtDate(m.date, 'long') + ' at ' + U.fmtTime(m.time) + ' · ' + m.venue,
            link: '#/meetings/' + m.id, at: m.date, sortAt: m.date
          });
        });
    }
    if (s.notifyActivities !== false) {
      Store.all('activities').filter(function (a) { return a.status === 'Planned' && a.date >= today; })
        .slice(0, 3).forEach(function (a) {
          out.push({
            id: 'n-activity-' + a.id, type: 'Activity', tone: 'secondary', icon: 'rocket',
            title: 'Upcoming activity: ' + a.title,
            message: U.fmtDate(a.date, 'long') + ' · ' + a.venue,
            link: '#/activities/' + a.id, at: a.date, sortAt: a.date
          });
        });
    }
    if (s.notifyTasks !== false) {
      Store.all('tasks').filter(function (t) { return t.status !== 'Completed' && t.deadline <= today; })
        .forEach(function (t) {
          out.push({
            id: 'n-task-' + t.id, type: 'Task', tone: 'danger', icon: 'check-square',
            title: 'Overdue task: ' + t.title,
            message: 'Deadline was ' + U.fmtDate(t.deadline) + ' · ' + U.dueLabel(t.deadline),
            link: '#/tasks', at: t.deadline, sortAt: t.deadline
          });
        });
      Store.all('tasks').filter(function (t) { return t.status !== 'Completed' && t.deadline > today && U.daysFromNow(t.deadline) <= 3; })
        .forEach(function (t) {
          out.push({
            id: 'n-task-soon-' + t.id, type: 'Task', tone: 'warning', icon: 'clock',
            title: 'Task due soon: ' + t.title,
            message: U.dueLabel(t.deadline) + ' · ' + U.fmtDate(t.deadline),
            link: '#/tasks', at: t.deadline, sortAt: t.deadline
          });
        });
    }
    if (s.notifyAnnouncements !== false) {
      Store.all('announcements').filter(function (a) {
        return a.status === 'Published' && (!a.expiryDate || a.expiryDate >= today) && U.daysBetween(a.date, today) <= 21;
      }).slice(0, 3).forEach(function (a) {
        out.push({
          id: 'n-ann-' + a.id, type: 'Announcement', tone: a.priority === 'Urgent' ? 'danger' : (a.priority === 'Important' ? 'warning' : 'info'), icon: 'megaphone',
          title: a.title, message: U.truncate(a.message, 120),
          link: '#/announcements', at: a.date, sortAt: a.date
        });
      });
    }
    if (s.notifyLowAttendance !== false) {
      var threshold = s.lowAttendanceThreshold || 60;
      var byMember = U.groupBy(Store.all('attendance'), 'memberId');
      Object.keys(byMember).forEach(function (mid) {
        var rows = byMember[mid];
        if (rows.length < 6) return;
        var attended = rows.filter(function (r) { return r.status === 'Present' || r.status === 'Late'; }).length;
        var rate = U.percent(attended, rows.length);
        if (rate >= threshold) return;
        var m = Store.find('members', mid);
        if (!m || m.membershipStatus !== 'Active') return;
        out.push({
          id: 'n-att-' + mid, type: 'Attendance', tone: 'warning', icon: 'user-check',
          title: 'Low attendance: ' + m.fullName,
          message: 'Attendance rate is ' + rate + '% (below the ' + threshold + '% threshold).',
          link: '#/members/' + mid, at: today, sortAt: today
        });
      });
    }
    // Report deadlines
    Store.all('reports').filter(function (r) { return r.status === 'Submitted'; }).slice(0, 2).forEach(function (r) {
      out.push({
        id: 'n-report-' + r.id, type: 'Report', tone: 'info', icon: 'file-text',
        title: 'Report awaiting approval: ' + r.title,
        message: 'Submitted by ' + nameOf(r.preparedBy) + ' · awaiting review.',
        link: '#/reports/' + r.id, at: r.date, sortAt: r.date
      });
    });
    // Project deadlines
    Store.all('projects').filter(function (p) {
      return p.status !== 'Completed' && p.status !== 'Archived' && p.expectedCompletion && U.daysFromNow(p.expectedCompletion) <= 14;
    }).slice(0, 3).forEach(function (p) {
      out.push({
        id: 'n-project-' + p.id, type: 'Project', tone: 'warning', icon: 'kanban',
        title: 'Project deadline: ' + p.name,
        message: U.dueLabel(p.expectedCompletion) + ' · ' + p.progress + '% complete.',
        link: '#/projects/' + p.id, at: p.expectedCompletion, sortAt: p.expectedCompletion
      });
    });

    // Stored (seeded and system) notifications
    Store.all('notifications').forEach(function (n) {
      out.push({
        id: n.id, type: n.type ? U.titleCase(n.type) : 'Notice', tone: n.tone || 'info', icon: n.icon || 'bell',
        title: n.title, message: n.message, link: n.link, at: n.at, sortAt: n.at, stored: true, read: n.read
      });
    });

    out = out.filter(function (n) { return !U.findBy(out, function (x) { return x !== n && x.title === n.title && x.id !== n.id; }); });
    out.forEach(function (n) { n.read = !!n.read || read.indexOf(n.id) !== -1; });
    out = U.sortBy(out, 'sortAt', 'desc');
    return out;
  }
  function nameOf(id) {
    var m = Store.find('members', id), u = Store.find('users', id);
    return m ? m.fullName : (u ? u.name : (id || '—'));
  }

  function renderNotifications() {
    var list = document.getElementById('notif-list');
    var badge = document.getElementById('notif-count');
    if (!list) return;
    var all = notifications();
    var unread = all.filter(function (n) { return !n.read; });
    if (badge) {
      badge.hidden = unread.length === 0;
      badge.textContent = unread.length > 9 ? '9+' : String(unread.length);
      badge.setAttribute('title', unread.length + ' unread notifications');
    }
    if (!all.length) {
      list.innerHTML = '<p class="notif-empty">' + Icons.svg('bell') + '<br>You are all caught up. Notifications about meetings, tasks, deadlines and announcements will appear here.</p>';
      return;
    }
    var icons = { Meeting: 'calendar-check', Activity: 'rocket', Task: 'check-square', Announcement: 'megaphone', Attendance: 'user-check', Report: 'file-text', Project: 'kanban', Notice: 'bell' };
    list.innerHTML = all.slice(0, 14).map(function (n) {
      return '<a class="notif-item' + (n.read ? '' : ' unread') + '" href="' + U.attr(n.link || '#/dashboard') + '" data-close-dropdown data-notif="' + U.attr(n.id) + '">' +
        '<span class="n-ico badge-' + n.tone + ' badge-soft">' + Icons.svg(icons[n.type] || n.icon) + '</span>' +
        '<span class="notif-body"><strong>' + U.esc(n.title) + '</strong>' +
        '<p>' + U.esc(U.truncate(n.message || '', 110)) + '</p>' +
        '<time>' + U.esc(U.timeAgo(n.at)) + '</time></span></a>';
    }).join('');
    list.addEventListener('click', function (e) {
      var a = e.target.closest('[data-notif]');
      if (a) markRead([a.getAttribute('data-notif')]);
    });
  }

  /* ── Global search ────────────────────────────────────────────────────── */
  var searchCache = null;
  function invalidateSearch() { searchCache = null; }

  function memberName(id) {
    var m = Store.find('members', id);
    return m ? m.fullName : '—';
  }

  function searchIndex() {
    if (searchCache) return searchCache;
    var rows = [];
    function add(category, icon, id, title, subtitle, link, keywords) {
      rows.push({ category: category, icon: icon, id: id, title: title, subtitle: subtitle, link: link, keywords: (keywords || '').toString().toLowerCase() });
    }
    Store.all('members').forEach(function (m) {
      add('Members', 'user', m.id, m.fullName, m.memberId + ' · ' + m.klass + ' ' + (m.stream || '') + ' · ' + m.membershipStatus, '#/members/' + m.id,
        [m.clubRole, m.email, m.contact, (m.skills || []).join(' '), (m.interests || []).join(' ')]);
    });
    Store.all('cabinet').forEach(function (c) {
      add('Cabinet', 'crown', c.id, c.name, c.position + ' · ' + c.term, '#/cabinet/' + c.id, c.responsibilities);
    });
    Store.all('meetings').forEach(function (m) {
      add('Meetings', 'calendar-check', m.id, m.title, m.type + ' · ' + U.fmtDate(m.date) + ' · ' + m.venue, '#/meetings/' + m.id, m.venue + ' ' + (m.decisions || []).join(' '));
    });
    Store.all('courses').forEach(function (c) {
      add('Courses', 'graduation', c.id, c.name, c.level + ' · ' + c.instructor + ' · ' + c.status, '#/courses/' + c.id, c.description);
    });
    Store.all('activities').forEach(function (a) {
      add('Activities', 'rocket', a.id, a.title, a.type + ' · ' + U.fmtDate(a.date) + ' · ' + a.status, '#/activities/' + a.id, a.venue + ' ' + a.description);
    });
    Store.all('projects').forEach(function (p) {
      add('Projects', 'kanban', p.id, p.name, p.status + ' · ' + p.progress + '% · ' + (p.technologies || []).join(', '), '#/projects/' + p.id, p.problemStatement + ' ' + memberName(p.leaderId));
    });
    Store.all('reports').forEach(function (r) {
      add('Reports', 'file-text', r.id, r.title, r.type + ' · ' + U.fmtDate(r.date) + ' · ' + r.status, '#/reports/' + r.id, r.introduction);
    });
    Store.all('certificates').forEach(function (c) {
      add('Certificates', 'award', c.id, c.recipientName + ' — ' + c.type, c.certificateNumber + ' · ' + U.fmtDate(c.issueDate), '#/certificates/' + c.id, c.achievement);
    });
    Store.all('resources').forEach(function (r) {
      add('Notes & Resources', 'book-open', r.id, r.title, r.category + ' · ' + r.author, '#/resources/' + r.id, (r.tags || []).join(' ') + ' ' + r.description);
    });
    Store.all('documents').forEach(function (d) {
      add('Documents', 'folder', d.id, d.title, d.category + ' · ' + U.fmtDate(d.date), '#/documents/' + d.id, (d.tags || []).join(' '));
    });
    Store.all('announcements').forEach(function (a) {
      add('Announcements', 'megaphone', a.id, a.title, a.priority + ' · ' + U.fmtDate(a.date), '#/announcements', a.message);
    });
    Store.all('tasks').forEach(function (t) {
      add('Tasks', 'check-square', t.id, t.title, t.status + ' · due ' + U.fmtDate(t.deadline), '#/tasks', memberName(t.assigneeId) + ' ' + t.description);
    });
    Store.all('equipment').forEach(function (e) {
      add('Equipment', 'cpu', e.id, e.name, e.assetId + ' · ' + e.category + ' · ' + e.location, '#/equipment/' + e.id, e.assignedTo);
    });
    Store.all('transactions').forEach(function (t) {
      add('Finance', 'wallet', t.id, t.reference + ' — ' + t.category, t.type + ' · ' + U.money(t.amount) + ' · ' + U.fmtDate(t.date), '#/finance', t.description);
    });
    Store.all('achievements').forEach(function (a) {
      add('Achievements', 'trophy', a.id, a.title, a.category + ' · ' + U.fmtDate(a.date), '#/achievements/' + a.id, a.description);
    });
    searchCache = rows;
    return rows;
  }

  var cpState = { results: [], activeIndex: 0, category: '' };

  function openSearch() {
    var overlay = document.getElementById('search-overlay');
    if (!overlay) return;
    if (!Auth.currentUser()) return;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    renderSearchFilters();
    var input = document.getElementById('cp-input');
    input.value = '';
    cpState.category = '';
    runSearch('');
    setTimeout(function () { input.focus(); }, 40);
  }
  function closeSearch() {
    var overlay = document.getElementById('search-overlay');
    if (!overlay) return;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  }
  function renderSearchFilters() {
    var host = document.getElementById('cp-filters');
    if (!host) return;
    var cats = U.uniq(searchIndex().map(function (r) { return r.category; }));
    host.innerHTML = UI.chipRow([{ key: '', label: 'All', icon: 'grid' }].concat(cats.map(function (c) {
      return { key: c, label: c };
    })), {});
    host.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-chip]');
      if (!chip) return;
      cpState.category = chip.getAttribute('data-chip');
      U.$$('[data-chip]', host).forEach(function (c) { c.classList.toggle('active', c === chip); });
      runSearch(document.getElementById('cp-input').value);
      document.getElementById('cp-input').focus();
    });
  }
  function runSearch(q) {
    var host = document.getElementById('cp-results');
    var countEl = document.getElementById('cp-count');
    q = String(q || '').trim();
    var rows = searchIndex();
    if (cpState.category) rows = rows.filter(function (r) { return r.category === cpState.category; });
    if (q) {
      rows = rows.filter(function (r) {
        return U.matches(r.title + ' ' + r.subtitle + ' ' + r.keywords, q);
      });
      rows = U.sortBy(rows, function (r) {
        var t = U.norm(r.title), nq = U.norm(q);
        var score = t.indexOf(nq) === 0 ? 0 : t.indexOf(nq) > -1 ? 1 : 2;
        return score + '|' + t;
      });
    } else {
      rows = rows.slice(0, 12);
    }
    cpState.results = rows.slice(0, 40);
    cpState.activeIndex = 0;

    if (!cpState.results.length) {
      host.innerHTML = UI.emptyState({
        icon: 'search',
        title: 'No matches found',
        message: 'Nothing in the club records matches “' + q + '”. Try a member name, a course, a project or a certificate number.'
      });
      if (countEl) countEl.textContent = 'No results';
      return;
    }
    var groups = U.groupBy(cpState.results, 'category');
    var html = '';
    var idx = 0;
    Object.keys(groups).forEach(function (cat) {
      html += '<p class="cp-group-label">' + Icons.svg(groups[cat][0].icon) + U.esc(cat) + '</p>';
      groups[cat].forEach(function (r) {
        html += '<a class="cp-result" href="' + U.attr(r.link) + '" data-cp-index="' + idx + '" role="option">' +
          '<span class="cr-ico">' + Icons.svg(r.icon) + '</span>' +
          '<span class="cr-text"><strong>' + (q ? U.highlight(r.title, q) : U.esc(r.title)) + '</strong>' +
          '<span>' + U.esc(r.subtitle) + '</span></span>' +
          Icons.svg('arrow-right') + '</a>';
        idx++;
      });
    });
    host.innerHTML = html;
    if (countEl) countEl.textContent = cpState.results.length + ' result' + (cpState.results.length === 1 ? '' : 's');
    highlightResult();

    host.addEventListener('click', function () { closeSearch(); });
  }
  function highlightResult() {
    U.$$('.cp-result').forEach(function (el, i) { el.classList.toggle('active', i === cpState.activeIndex); });
    var active = U.$('.cp-result.active');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
  }

  /* ── Footer status ────────────────────────────────────────────────────── */
  function renderFooter() {
    var st = Store.stats();
    var el = document.getElementById('data-count');
    if (el) el.textContent = st.total + ' records stored locally';
    var pct = document.getElementById('storage-pct');
    var bar = document.getElementById('storage-bar');
    if (pct) pct.textContent = st.pct + '%';
    if (bar) bar.style.width = Math.max(2, st.pct) + '%';
    var year = document.getElementById('footer-year');
    if (year) year.textContent = new Date().getFullYear();
  }
  function renderClubContext() {
    var s = Store.settings();
    var a = document.getElementById('sc-club-name');
    var b = document.getElementById('sc-term');
    if (a) a.textContent = s.clubName || 'MRHS ICT Club';
    if (b) b.textContent = (s.currentTerm || 'Term 1') + ' · ' + (s.academicYear || new Date().getFullYear()) + ' Academic Year';
  }

  function renderUser() {
    var user = Auth.currentUser();
    if (!user) return;
    var info = Auth.roleInfo(user.role);
    U.$$('#user-avatar, #menu-avatar').forEach(function (n) {
      n.textContent = U.initials(user.name);
      n.style.background = 'linear-gradient(135deg,' + U.colorFor(user.name) + ',' + UI.shade(U.colorFor(user.name), 26) + ')';
    });
    var set = function (id, v) { var n = document.getElementById(id); if (n) n.textContent = v; };
    set('user-name', user.name);
    set('user-role', user.role);
    set('menu-name', user.name);
    set('menu-email', user.email);
    var roleBadge = document.getElementById('menu-role');
    if (roleBadge) roleBadge.textContent = info.label;
    var man = document.getElementById('menu-manual');
    if (man) man.hidden = !Auth.can('manual', 'view');
    var prof = document.getElementById('menu-profile');
    if (prof) {
      prof.onclick = function () { Router.go('/account'); };
    }
  }

  /* ── Rebuild everything ───────────────────────────────────────────────── */
  function refresh() {
    renderNav();
    renderNotifications();
    renderFooter();
    renderClubContext();
    renderUser();
    if (Router.current && Router.current()) setActive(Router.current().path);
    invalidateSearch();
  }

  function init() {
    renderNav();
    renderClubContext();
    renderUser();
    renderNotifications();
    renderFooter();
    initTheme();

    var open = document.getElementById('sidebar-open');
    if (open) open.addEventListener('click', openSidebar);
    var close = document.getElementById('sidebar-close');
    if (close) close.addEventListener('click', closeSidebar);
    var scrim = document.getElementById('scrim');
    if (scrim) scrim.addEventListener('click', closeSidebar);

    var searchTrigger = document.getElementById('global-search-trigger');
    if (searchTrigger) searchTrigger.addEventListener('click', openSearch);
    var overlay = document.getElementById('search-overlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target.closest('[data-overlay-close]')) closeSearch();
      });
      var input = document.getElementById('cp-input');
      input.addEventListener('input', U.debounce(function () { runSearch(input.value); }, 140));
      input.addEventListener('keydown', function (e) {
        var max = cpState.results.length;
        if (e.key === 'ArrowDown') { e.preventDefault(); cpState.activeIndex = Math.min(max - 1, cpState.activeIndex + 1); highlightResult(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); cpState.activeIndex = Math.max(0, cpState.activeIndex - 1); highlightResult(); }
        else if (e.key === 'Enter') {
          e.preventDefault();
          var r = cpState.results[cpState.activeIndex];
          if (r) { closeSearch(); Router.go(r.link.replace(/^#/, '')); }
        } else if (e.key === 'Escape') { closeSearch(); }
      });
    }

    var markReadBtn = document.getElementById('notif-mark-read');
    if (markReadBtn) markReadBtn.addEventListener('click', function () {
      markRead(notifications().map(function (n) { return n.id; }));
      renderNotifications();
      UI.toast('Notifications cleared', 'All notifications have been marked as read.', 'success', { duration: 2200 });
    });

    var themeBtn = document.getElementById('theme-btn');
    if (themeBtn) themeBtn.addEventListener('click', function () {
      var modes = ['light', 'dark', 'system'];
      var next = modes[(modes.indexOf(Store.settings().theme || 'light') + 1) % modes.length];
      applyTheme(next);
    });

    var logout = document.getElementById('logout-btn');
    if (logout) logout.addEventListener('click', function () {
      UI.confirm({
        title: 'Sign out',
        message: 'Are you sure you want to sign out of MRHS ICT Club Master?',
        confirmLabel: 'Sign out', confirmIcon: 'log-out', tone: 'warning', icon: 'log-out'
      }).then(function (ok) {
        if (!ok) return;
        Auth.logout();
        UI.toast('Signed out', 'You have been signed out safely.', 'info');
      });
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', function (e) {
      var meta = e.ctrlKey || e.metaKey;
      if (meta && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openSearch(); return; }
      if (e.key === 'Escape') {
        var ov = document.getElementById('search-overlay');
        if (ov && !ov.hidden) closeSearch();
      }
      if (e.key === '/' && !meta && !/input|textarea|select/i.test((e.target.tagName || ''))) {
        e.preventDefault(); openSearch();
      }
    });

    Store.on(function (evt) {
      if (evt && evt.type === 'change') {
        var c = evt.collection;
        if (['notifications', 'meetings', 'activities', 'tasks', 'announcements', 'members', 'attendance', 'reports', 'projects'].indexOf(c) !== -1) {
          renderNotifications();
        }
        if (['members', 'cabinet', 'meetings', 'courses', 'projects', 'activities'].indexOf(c) !== -1) renderNav();
        invalidateSearch();
        renderFooter();
      }
      if (evt && (evt.type === 'import' || evt.type === 'reset')) { refresh(); }
    });

    window.addEventListener('resize', U.debounce(function () {
      if (window.innerWidth > 900) closeSidebar();
    }, 200));
  }

  global.Shell = {
    NAV: NAV, items: items, configFor: configFor,
    SCHEMES: SCHEMES, applyScheme: applyScheme, schemeKey: schemeKey,
    init: init, refresh: refresh, setActive: setActive, renderNav: renderNav,
    openSearch: openSearch, closeSearch: closeSearch, searchIndex: searchIndex,
    notifications: notifications, markRead: markRead,
    openSidebar: openSidebar, closeSidebar: closeSidebar,
    applyTheme: applyTheme, invalidateSearch: invalidateSearch
  };
})(window);
