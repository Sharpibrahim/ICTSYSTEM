/* ==========================================================================
   MRHS ICT CLUB MASTER — js/core/data.js
   Demonstration dataset + default settings.

   Every generated record carries `demo: true` so the whole sample dataset can
   be identified, exported or removed later (Settings › Data).
   Names, contacts and figures are fictional and do not represent real people.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ── Deterministic pseudo-random so the demo set is stable ────────────── */
  function rng(seed) {
    var a = seed || 20260101;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function int(rnd, lo, hi) { return Math.floor(rnd() * (hi - lo + 1)) + lo; }
  function chance(rnd, p) { return rnd() < p; }

  var TODAY = new Date();
  function day(offset) {
    var d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
    d.setDate(d.getDate() + offset);
    return Utils.iso(d);
  }

  /* ── Placeholder artwork (inline SVG, works offline) ──────────────────── */
  var ART = [
    ['#2450d8', '#3f68ec'], ['#4f46e5', '#6366f1'], ['#06b6d4', '#22d3ee'],
    ['#0f9d58', '#34d399'], ['#0891b2', '#38bdf8'], ['#1b3788', '#3f68ec'],
    ['#7c3aed', '#a78bfa'], ['#c07a09', '#f59e0b'], ['#0b7a44', '#22c55e'],
    ['#3f68ec', '#22d3ee']
  ];
  function placeholder(label, idx, icon) {
    var pair = ART[(idx || 0) % ART.length];
    var text = String(label || 'MRHS ICT Club').slice(0, 26);
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">' +
      '<defs><linearGradient id="g' + idx + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="' + pair[0] + '"/><stop offset="100%" stop-color="' + pair[1] + '"/></linearGradient></defs>' +
      '<rect width="400" height="300" fill="url(#g' + idx + ')"/>' +
      '<g opacity="0.20" stroke="#fff" stroke-width="1.4" fill="none">' +
      '<path d="M0 60h400M0 120h400M0 180h400M0 240h400M60 0v300M120 0v300M180 0v300M240 0v300M300 0v300M360 0v300"/></g>' +
      '<circle cx="330" cy="60" r="52" fill="#fff" opacity="0.14"/>' +
      '<circle cx="60" cy="250" r="38" fill="#fff" opacity="0.12"/>' +
      '<rect x="26" y="196" width="348" height="72" rx="14" fill="#000" opacity="0.24"/>' +
      '<text x="46" y="228" font-family="Segoe UI,Arial,sans-serif" font-size="19" font-weight="700" fill="#fff">MRHS ICT CLUB</text>' +
      '<text x="46" y="252" font-family="Segoe UI,Arial,sans-serif" font-size="14" fill="#e6efff">' + text.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text>' +
      '<text x="200" y="120" font-family="Segoe UI,Arial,sans-serif" font-size="44" font-weight="700" fill="#fff" opacity="0.85" text-anchor="middle">' + (icon || 'ICT') + '</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ── Names & reference lists ──────────────────────────────────────────── */
  var MALE = ['Ibrahim', 'Musa', 'Joseph', 'Denis', 'Emmanuel', 'Brian', 'Ronald', 'Simon', 'Patrick', 'Joshua',
    'Timothy', 'Samuel', 'Daniel', 'Isaac', 'Moses', 'Andrew', 'Peter', 'Robert', 'Arthur', 'Hakim',
    'Trevor', 'Elijah', 'Joel', 'Frank', 'Vincent', 'Gerald', 'Edgar', 'Shafik', 'Julius', 'Colline'];
  var FEMALE = ['Sarah', 'Aisha', 'Grace', 'Esther', 'Martha', 'Prossy', 'Naome', 'Rebecca', 'Diana', 'Faith',
    'Brenda', 'Sharon', 'Winnie', 'Priscilla', 'Joan', 'Mercy', 'Ritah', 'Sylvia', 'Christine', 'Lillian',
    'Immaculate', 'Gloria', 'Tracy', 'Agnes', 'Betty', 'Peace', 'Daphine', 'Zeridah', 'Sandra', 'Kevina'];
  var SURNAMES = ['Ssemakula', 'Mugisha', 'Nakato', 'Kirabo', 'Ochieng', 'Nabirye', 'Tumusiime', 'Wanyama',
    'Byaruhanga', 'Nsubuga', 'Kaggwa', 'Ssentongo', 'Namuli', 'Kigongo', 'Odongo', 'Achieng', 'Kirunda',
    'Muwanga', 'Bukenya', 'Lukwago', 'Kalema', 'Nabukenya', 'Nanteza', 'Musoke', 'Kagimu', 'Bwire',
    'Emojong', 'Ayikoru', 'Apio', 'Atim', 'Bahati', 'Nabwire', 'Ssebunya', 'Nalubega', 'Mugerwa', 'Kaddu'];
  var CLASSES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
  var STREAMS = ['A', 'B', 'C', 'Blue', 'Green'];
  var SKILLS = ['HTML & CSS', 'JavaScript', 'Python', 'Graphic Design', 'Networking', 'Hardware Repair',
    'Public Speaking', 'Data Entry', 'Video Editing', 'Robotics', 'Photography', 'Spreadsheets',
    'Database Design', 'Cyber Security', 'Technical Writing', 'Event Planning'];
  var INTERESTS = ['Web Development', 'Artificial Intelligence', 'Cyber Security', 'Robotics', 'Graphic Design',
    'Networking', 'Mobile Apps', 'Data Science', 'Animation', 'Digital Marketing', 'Game Development', 'IoT'];

  /* ── Members ──────────────────────────────────────────────────────────── */
  function buildMembers() {
    var rows = [];
    var used = {};
    var dominantSkills = ['HTML & CSS', 'JavaScript', 'Python', 'Graphic Design', 'Networking', 'Cyber Security'];
    var memberRoles = ['Member', 'Member', 'Member', 'Member', 'Member', 'Member', 'Course Assistant', 'Team Lead'];
    var statuses = ['Active', 'Active', 'Active', 'Active', 'Active', 'Active', 'Active', 'Active',
      'Inactive', 'Suspended', 'Active', 'Alumni'];

    for (var i = 1; i <= 32; i++) {
      var gender = (i % 2 === 0) ? 'Female' : 'Male';
      var first, last, full;
      var guard = 0;
      do {
        first = gender === 'Female' ? FEMALE[(i * 7 + guard) % FEMALE.length] : MALE[(i * 5 + guard) % MALE.length];
        last = SURNAMES[(i * 11 + guard * 3) % SURNAMES.length];
        full = first + ' ' + last;
        guard++;
      } while (used[full] && guard < 40);
      used[full] = true;

      var cls = CLASSES[Math.min(5, Math.floor((i - 1) / 6) + (i > 26 ? 1 : 0))];
      var joined = day(-int(rng(i * 13), 30, 720));
      var status = statuses[(i - 1) % statuses.length];
      if (cls === 'S6' && i % 3 === 0) status = 'Alumni';

      rows.push({
        id: 'mem-' + Utils.pad(i, 3) + String.fromCharCode(64 + Math.ceil(i / 26)),
        demo: true,
        memberId: 'MRHS-ICT-M' + Utils.pad(i, 3),
        fullName: full,
        gender: gender,
        klass: cls,
        stream: STREAMS[(i + 1) % STREAMS.length],
        studentNumber: 'MRHS/' + (2026 - Math.floor(int(rng(i * 3), 0, 3))) + '/' + Utils.pad(100 + i * 3, 4),
        contact: '+256 7' + int(rng(i * 17 + 1), 0, 7) + ' ' + Utils.pad(int(rng(i * 19 + 2), 0, 999), 3) + ' ' + Utils.pad(int(rng(i * 23 + 3), 0, 999), 3),
        email: Utils.slug(full).replace('-', '.') + '@student.mrhs.ac.ug',
        dateJoined: joined,
        membershipStatus: status,
        clubRole: memberRoles[(i - 1) % memberRoles.length],
        skills: [pick(rng(i * 29), SKILLS), pick(rng(i * 31), SKILLS), pick(rng(i * 37), SKILLS)].filter(function (v, ix, a) { return a.indexOf(v) === ix; }),
        interests: [pick(rng(i * 41), INTERESTS), pick(rng(i * 43), INTERESTS)].filter(function (v, ix, a) { return a.indexOf(v) === ix; }),
        bio: 'Demo profile — ' + cls + ' student of Mbazzi Riverside High School and member of the ICT Club.',
        notes: (i % 4 === 0) ? 'Sample note: volunteered to help during the ICT exhibition.' : '',
        photoFileId: null,
        reliability: 0.62 + ((i * 7) % 30) / 100
      });
    }

    // Explicit club leadership members (kept in sync with cabinet)
    function setLeader(id, role) { var m = rows.find(function (r) { return r.id === id; }); if (m) m.clubRole = role; }
    setLeader('mem-001A', 'President');
    setLeader('mem-002A', 'Vice President');
    setLeader('mem-003A', 'General Secretary');
    setLeader('mem-004A', 'Treasurer');
    setLeader('mem-005A', 'ICT Director');
    setLeader('mem-006A', 'Projects Coordinator');
    setLeader('mem-007A', 'Training Coordinator');
    setLeader('mem-008A', 'Events Coordinator');
    return rows;
  }

  /* ── Cabinet ──────────────────────────────────────────────────────────── */
  var CABINET_ORDER = [
    'Patron', 'President', 'Vice President', 'General Secretary', 'Assistant Secretary',
    'Treasurer', 'ICT/Technical Director', 'Projects Coordinator', 'Training Coordinator',
    'Events Coordinator', 'Publicity/Communications Officer', 'Welfare Officer', 'Class Representative'
  ];
  function buildCabinet(members) {
    var byId = {};
    members.forEach(function (m) { byId[m.id] = m; });
    function name(id) { return byId[id] ? byId[id].fullName : 'Vacant'; }
    var rolePeople = {
      'Patron': { id: 'staff-01', name: 'Mr. Julius Kagimu', gender: 'Male' },
      'President': { id: 'mem-001A' },
      'Vice President': { id: 'mem-002A' },
      'General Secretary': { id: 'mem-003A' },
      'Assistant Secretary': { id: 'mem-009A' },
      'Treasurer': { id: 'mem-004A' },
      'ICT/Technical Director': { id: 'mem-005A' },
      'Projects Coordinator': { id: 'mem-006A' },
      'Training Coordinator': { id: 'mem-007A' },
      'Events Coordinator': { id: 'mem-008A' },
      'Publicity/Communications Officer': { id: 'mem-010A' },
      'Welfare Officer': { id: 'mem-011A' },
      'Class Representative': { id: 'mem-012A' }
    };
    var responsibilities = {
      'Patron': 'Oversees the club, links the club to school administration, approves programmes and supervises finances.',
      'President': 'Chairs club meetings, leads cabinet, represents the club at school and external functions.',
      'Vice President': 'Deputises the President, coordinates committees and supervises sub-committee reporting.',
      'General Secretary': 'Keeps records and minutes, maintains the register of members and handles club correspondence.',
      'Assistant Secretary': 'Assists the General Secretary, takes attendance and manages meeting logistics.',
      'Treasurer': 'Maintains club financial records, collects membership fees, prepares the termly financial report.',
      'ICT/Technical Director': 'Maintains the ICT laboratory equipment, supervises technical projects and lab security.',
      'Projects Coordinator': 'Coordinates project teams, monitors project progress and reports to cabinet.',
      'Training Coordinator': 'Organises training sessions and courses, prepares course outlines and evaluates trainers.',
      'Events Coordinator': 'Plans and runs club events, competitions, exhibitions and outreach activities.',
      'Publicity/Communications Officer': 'Manages announcements, the club notice board and social media updates.',
      'Welfare Officer': 'Handles member welfare, conflict resolution and encouragement of new members.',
      'Class Representative': 'Links class members to the cabinet and mobilises participation at class level.'
    };
    var cabinet = CABINET_ORDER.map(function (pos, i) {
      var p = rolePeople[pos];
      var m = byId[p.id];
      return {
        id: 'cab-' + Utils.pad(i + 1, 2),
        demo: true,
        position: pos,
        order: i,
        memberId: m ? m.id : p.id,
        name: m ? m.fullName : p.name,
        gender: m ? m.gender : p.gender,
        appointmentDate: day(-int(rng(i * 53 + 5), 120, 400)),
        term: '2026 Academic Year',
        status: i < 12 ? 'Active' : 'Active',
        responsibilities: responsibilities[pos],
        photoFileId: null,
        contact: m ? m.contact : '+256 700 000 001',
        email: m ? m.email : 'patron@mrhsict.ac.ug',
        achievements: i < 4 ? 'Led club to regional ICT exhibition participation (demo).' : ''
      };
    });
    return cabinet;
  }
  function buildCabinetHistory() {
    return [
      { id: 'cabh-01', demo: true, position: 'President', name: 'Nabirye Sandra (demo)', term: '2025 Academic Year', fromDate: day(-560), toDate: day(-200), note: 'Completed term; handed over during club handover ceremony.' },
      { id: 'cabh-02', demo: true, position: 'General Secretary', name: 'Ochieng Brian (demo)', term: '2025 Academic Year', fromDate: day(-560), toDate: day(-200), note: 'Maintained the 2025 minute book.' },
      { id: 'cabh-03', demo: true, position: 'Treasurer', name: 'Namuli Faith (demo)', term: '2025 Academic Year', fromDate: day(-560), toDate: day(-200), note: 'Produced the 2025 annual financial statement.' },
      { id: 'cabh-04', demo: true, position: 'Patron', name: 'Mr. Julius Kagimu', term: '2025 Academic Year', fromDate: day(-620), toDate: '', note: 'Continuing as club patron.' }
    ];
  }

  /* ── Users (demo accounts) ────────────────────────────────────────────── */
  function buildUsers() {
    return [
      { id: 'usr-01', demo: true, username: 'admin', email: 'admin@mrhsict.ac.ug', name: 'System Administrator', role: 'Administrator', password: 'demo1234', mustChangePassword: true, memberId: null, status: 'Active', phone: '+256 700 100 001', lastLogin: day(-1) },
      { id: 'usr-02', demo: true, username: 'patron', email: 'patron@mrhsict.ac.ug', name: 'Mr. Julius Kagimu', role: 'Patron', password: 'demo1234', mustChangePassword: true, memberId: 'staff-01', status: 'Active', phone: '+256 700 100 002', lastLogin: day(-2) },
      { id: 'usr-03', demo: true, username: 'president', email: 'president@mrhsict.ac.ug', name: 'Ibrahim Ssemakula', role: 'President', password: 'demo1234', mustChangePassword: true, memberId: 'mem-001A', status: 'Active', lastLogin: day(0) },
      { id: 'usr-04', demo: true, username: 'secretary', email: 'secretary@mrhsict.ac.ug', name: 'Grace Nakato', role: 'Secretary', password: 'demo1234', mustChangePassword: true, memberId: 'mem-003A', status: 'Active', lastLogin: day(-1) },
      { id: 'usr-05', demo: true, username: 'treasurer', email: 'treasurer@mrhsict.ac.ug', name: 'Denis Ochieng', role: 'Treasurer', password: 'demo1234', mustChangePassword: true, memberId: 'mem-004A', status: 'Active', lastLogin: day(-3) },
      { id: 'usr-06', demo: true, username: 'training', email: 'training@mrhsict.ac.ug', name: 'Martha Nabirye', role: 'Training Coordinator', password: 'demo1234', mustChangePassword: true, memberId: 'mem-007A', status: 'Active', lastLogin: day(-1) },
      { id: 'usr-07', demo: true, username: 'projects', email: 'projects@mrhsict.ac.ug', name: 'Emmanuel Mugisha', role: 'Project Coordinator', password: 'demo1234', mustChangePassword: true, memberId: 'mem-006A', status: 'Active', lastLogin: day(-2) },
      { id: 'usr-08', demo: true, username: 'member', email: 'member@mrhsict.ac.ug', name: 'Rebecca Kirabo', role: 'Member', password: 'demo1234', mustChangePassword: true, memberId: 'mem-014A', status: 'Active', lastLogin: day(-4) }
    ];
  }

  /* ── Courses, lessons, enrolments ─────────────────────────────────────── */
  var COURSE_DEFS = [
    ['Computer Fundamentals', 'Beginner', '6 weeks', 'Mr. Julius Kagimu', 'Parts of a computer, operating systems, file management, typing skills and safe computer use in the school ICT laboratory.'],
    ['HTML & CSS', 'Beginner', '8 weeks', 'Ibrahim Ssemakula', 'Building web pages from scratch: structure with HTML5, styling with CSS3, responsive layouts and a personal portfolio project.'],
    ['JavaScript', 'Intermediate', '10 weeks', 'Emmanuel Mugisha', 'Programming logic in the browser: variables, functions, DOM manipulation, events, arrays and a small web application.'],
    ['Python', 'Intermediate', '10 weeks', 'Mr. Julius Kagimu', 'Python syntax, data types, loops, functions, files and an introduction to automation scripts and simple data analysis.'],
    ['Web Development', 'Advanced', '12 weeks', 'Ms. Sarah Nabirye', 'Full workflow of a school web project: planning, UI design, front-end and back-end basics, hosting and maintenance.'],
    ['Graphic Design', 'Beginner', '6 weeks', 'Sharon Nanteza', 'Design principles, colour theory, typography and poster design using free design tools for club and school events.'],
    ['Networking', 'Intermediate', '8 weeks', 'Ronald Kaggwa', 'Network types, IP addressing, cabling, routers and switches, plus practical set-up of the school computer laboratory network.'],
    ['Cybersecurity Awareness', 'Beginner', '5 weeks', 'Ritah Namuli', 'Passwords, phishing, safe browsing, data protection, cyber laws in Uganda and reporting of cyber incidents.'],
    ['Artificial Intelligence', 'Advanced', '8 weeks', 'Ms. Sarah Nabirye', 'What AI is, machine learning basics, responsible use of AI tools and building a simple image or text classifier.'],
    ['Microsoft Office', 'Beginner', '6 weeks', 'Betty Nalubega', 'Practical Word, Excel and PowerPoint skills for coursework, school projects and club documentation.'],
    ['Digital Marketing', 'Intermediate', '6 weeks', 'Tracy Achieng', 'Promoting clubs and small businesses online: content planning, social media, basic analytics and ethical advertising.'],
    ['Entrepreneurship', 'Intermediate', '7 weeks', 'Mr. Julius Kagimu', 'Turning ICT skills into income: idea generation, costing, simple business plans and pitching to a panel.']
  ];
  function buildCourses() {
    return COURSE_DEFS.map(function (d, i) {
      var start = day(-int(rng(i * 71 + 11), 20, 120));
      var weeks = parseInt(d[2], 10);
      var end = day(-int(rng(i * 71 + 11), 20, 120) + weeks * 7);
      var status = end < Utils.todayISO() ? 'Completed' : (start <= Utils.todayISO() ? 'Ongoing' : 'Planned');
      if (i > 8 && i % 2 === 0) status = 'Planned';
      return {
        id: 'crs-' + Utils.pad(i + 1, 2),
        demo: true,
        courseId: 'MRHS-ICT-C' + Utils.pad(i + 1, 3),
        name: d[0],
        description: d[4],
        instructor: d[3],
        level: d[1],
        duration: d[2],
        category: ['Foundation', 'Programming', 'Programming', 'Programming', 'Programming', 'Creative',
          'Networking', 'Security', 'Emerging Tech', 'Office Skills', 'Business', 'Business'][i],
        startDate: start,
        endDate: end,
        sessions: int(rng(i * 91 + 3), 6, 16),
        capacity: int(rng(i * 93 + 4), 20, 45),
        status: status,
        completionRate: 0,
        outcomes: 'Members demonstrate practical skills through a graded final assignment.',
        certificateEligible: true,
        demoNote: 'Sample course record.'
      };
    });
  }
  var LESSON_TOPICS = {
    'Computer Fundamentals': ['Introduction to computers', 'Hardware components', 'Operating systems', 'File management', 'Typing and shortcuts', 'Computer care and safety'],
    'HTML & CSS': ['How the web works', 'HTML document structure', 'Text, lists and links', 'Images and tables', 'CSS selectors and colours', 'Box model and layout', 'Responsive design', 'Portfolio project'],
    'JavaScript': ['Variables and data types', 'Operators and conditions', 'Loops', 'Functions', 'Arrays and objects', 'DOM manipulation', 'Events', 'Mini project'],
    'Python': ['Installing Python and editors', 'Variables and input', 'Control flow', 'Functions and modules', 'Lists and dictionaries', 'Files and errors', 'Automation script', 'Data analysis basics'],
    'Web Development': ['Project planning', 'Wireframes and UI', 'Front-end build', 'Forms and validation', 'Back-end basics', 'Databases', 'Hosting and domains', 'Maintenance and handover'],
    'Graphic Design': ['Design principles', 'Colour theory', 'Typography', 'Poster layout', 'Export formats', 'Club branding exercise'],
    'Networking': ['What is a network', 'Network devices', 'IP addressing', 'Cabling practice', 'Router and switch setup', 'Sharing resources', 'Network troubleshooting', 'Lab network project'],
    'Cybersecurity Awareness': ['Why cyber security matters', 'Passwords and authentication', 'Phishing and scams', 'Safe browsing', 'Data protection and cyber law', 'Incident reporting'],
    'Artificial Intelligence': ['Introduction to AI', 'Data and patterns', 'Machine learning basics', 'Training a simple model', 'AI ethics and responsible use', 'Project showcase'],
    'Microsoft Office': ['Word essentials', 'Professional documents', 'Excel basics', 'Formulas and charts', 'PowerPoint design', 'Club documentation task'],
    'Digital Marketing': ['Digital audiences', 'Content planning', 'Social media pages', 'Basic analytics', 'Ethics and safety online', 'Campaign project'],
    'Entrepreneurship': ['Spotting opportunities', 'Costing and pricing', 'Business plan basics', 'Marketing on a budget', 'Customer care', 'Pitching practice', 'Business pitch day']
  };
  function buildLessons(courses) {
    var rows = [];
    courses.forEach(function (c, ci) {
      var topics = LESSON_TOPICS[c.name] || ['Lesson 1', 'Lesson 2', 'Lesson 3'];
      topics.forEach(function (t, li) {
        var order = li + 1;
        var past = c.startDate <= Utils.todayISO();
        rows.push({
          id: 'lsn-' + c.id + '-' + order,
          demo: true,
          courseId: c.id,
          order: order,
          title: t,
          duration: int(rng(ci * 13 + li * 7 + 5), 40, 120) + ' min',
          objectives: 'By the end of this lesson members should explain and practically apply: ' + t.toLowerCase() + '.',
          notes: 'Sample lesson note for ' + c.name + '. Downloadable materials are attached in Notes & Resources.',
          date: Utils.iso(Utils.addDays(c.startDate, (order - 1) * 7)),
          status: past ? 'Delivered' : 'Scheduled'
        });
      });
    });
    return rows;
  }
  function buildEnrollments(members, courses) {
    var rows = [];
    courses.forEach(function (c, ci) {
      var active = members.filter(function (m) { return m.membershipStatus === 'Active'; });
      var count = Math.min(active.length, c.capacity, 12 + ((ci * 5) % 22));
      var chosen = active.slice(0, count);
      chosen.forEach(function (m, mi) {
        var prog = c.status === 'Completed' ? int(rng(ci * 31 + mi * 7 + 3), 70, 100)
          : c.status === 'Ongoing' ? int(rng(ci * 31 + mi * 7 + 3), 20, 92)
            : 0;
        rows.push({
          id: 'enr-' + c.id + '-' + m.id,
          demo: true,
          courseId: c.id,
          memberId: m.id,
          enrolledOn: Utils.iso(Utils.addDays(c.startDate, -int(rng(ci + mi + 7), 1, 10))),
          progress: prog,
          sessionsAttended: Math.round((prog / 100) * (c.sessions || 8)),
          totalSessions: c.sessions || 8,
          status: prog >= 100 ? 'Completed' : (prog === 0 ? 'Enrolled' : 'In Progress'),
          grade: prog >= 85 ? 'A' : prog >= 70 ? 'B' : prog >= 50 ? 'C' : (prog > 0 ? 'D' : '—'),
          completedOn: prog >= 100 ? Utils.iso(Utils.addDays(c.endDate, 2)) : ''
        });
      });
    });
    return rows;
  }

  /* ── Meetings ─────────────────────────────────────────────────────────── */
  function buildMeetings(members) {
    var defs = [
      { t: 'Term 3 General Meeting — Club Programmes Review', ty: 'General Meeting', off: -96, chair: 'mem-001A', sec: 'mem-003A', venue: 'ICT Laboratory 1' },
      { t: 'Cabinet Planning Meeting — Term 3 Roadmap', ty: 'Cabinet Meeting', off: -82, chair: 'mem-001A', sec: 'mem-003A', venue: 'Staff Room Annex' },
      { t: 'Training Committee Meeting — Course Timetables', ty: 'Training Meeting', off: -68, chair: 'mem-007A', sec: 'mem-009A', venue: 'ICT Laboratory 2' },
      { t: 'Project Review — Smart Attendance System', ty: 'Project Meeting', off: -54, chair: 'mem-006A', sec: 'mem-003A', venue: 'ICT Laboratory 1' },
      { t: 'Emergency Meeting — Laboratory Equipment Fault', ty: 'Emergency Meeting', off: -41, chair: 'mem-001A', sec: 'mem-009A', venue: 'ICT Laboratory 1' },
      { t: 'Term 3 Mid-Term General Meeting', ty: 'General Meeting', off: -27, chair: 'mem-001A', sec: 'mem-003A', venue: 'Main Hall' },
      { t: 'Planning Meeting — Annual ICT Exhibition', ty: 'Planning Meeting', off: -13, chair: 'mem-008A', sec: 'mem-003A', venue: 'Library Conference Room' },
      { t: 'Cabinet Meeting — Budget and Finance Review', ty: 'Cabinet Meeting', off: -5, chair: 'mem-001A', sec: 'mem-003A', venue: 'Staff Room Annex' },
      { t: 'Training Meeting — New Trainers Orientation', ty: 'Training Meeting', off: 4, chair: 'mem-007A', sec: 'mem-009A', venue: 'ICT Laboratory 2' },
      { t: 'Planning Meeting — Inter-House Coding Challenge', ty: 'Planning Meeting', off: 9, chair: 'mem-008A', sec: 'mem-003A', venue: 'Library Conference Room' },
      { t: 'End of Term General Meeting', ty: 'General Meeting', off: 17, chair: 'mem-001A', sec: 'mem-003A', venue: 'Main Hall' },
      { t: 'Project Meeting — Community ICT Outreach', ty: 'Project Meeting', off: 24, chair: 'mem-006A', sec: 'mem-009A', venue: 'ICT Laboratory 1' }
    ];
    var agendas = [
      ['Opening prayer and welcome', 'Reading and confirmation of previous minutes', 'Review of the term programme', 'Departmental reports', 'Any other business', 'Closing remarks'],
      ['Confirmation of previous minutes', 'Term work plan and calendar', 'Budget review', 'Committee assignments', 'AOB'],
      ['Course enrolment status', 'Trainer allocation and timetables', 'Lesson material preparation', 'Attendance of training sessions', 'AOB'],
      ['Progress update from the project leader', 'Sprint task review', 'Testing and documentation plan', 'Challenges and support needed', 'Next steps'],
      ['Report on the faulty laboratory computers', 'Repair options and cost implications', 'Temporary arrangements for training', 'Duty allocation', 'Resolution']
    ];
    return defs.map(function (d, i) {
      var date = day(d.off);
      var past = d.off < 0;
      var expected = members.filter(function (m) { return m.membershipStatus === 'Active'; }).map(function (m) { return m.id; });
      return {
        id: 'mtg-' + Utils.pad(i + 1, 2),
        demo: true,
        meetingId: 'MRHS-ICT-MTG-' + Utils.pad(i + 1, 3),
        title: d.t,
        type: d.ty,
        date: date,
        time: pick(rng(i * 17 + 9), ['09:00', '10:00', '11:00', '14:00', '15:30', '16:00']),
        venue: d.venue,
        chairperson: d.chair,
        secretary: d.sec,
        agenda: agendas[i % agendas.length].map(function (a, ai) { return { id: 'ag-' + i + '-' + ai, text: a, presenter: ai % 2 ? d.sec : d.chair }; }),
        expectedAttendees: expected,
        status: past ? 'Completed' : 'Scheduled',
        minutes: past ? 'Minutes recorded — see the minutes section of this meeting record.' : '',
        decisions: past ? [
          'The cabinet approved the term work plan as presented (demo decision).',
          'Training sessions will run every Wednesday and Friday from 4:00 pm (demo decision).',
          'All project teams must submit a progress note before the next meeting (demo decision).'
        ] : [],
        actionItems: past ? [
          { id: 'ai-' + i + '-1', text: 'Prepare the updated member register', owner: d.sec, due: day(d.off + 10), status: i % 3 === 0 ? 'Completed' : 'In Progress' },
          { id: 'ai-' + i + '-2', text: 'Submit equipment repair request to the school bursar', owner: 'mem-005A', due: day(d.off + 14), status: 'Pending' }
        ] : [],
        followUpDate: day(d.off + 30),
        createdBy: 'usr-04'
      };
    });
  }

  /* ── Activities ───────────────────────────────────────────────────────── */
  function buildActivities(members) {
    var defs = [
      ['ICT Training — Basic Computer Skills for New Members', 'ICT Training', -88, 'Completed', 'ICT Laboratory 1'],
      ['Coding Session — Building a School Timetable Page', 'Coding Sessions', -74, 'Completed', 'ICT Laboratory 2'],
      ['Inter-House ICT Quiz Competition', 'Competitions', -61, 'Completed', 'Main Hall'],
      ['School ICT Awareness Day', 'School ICT Awareness', -47, 'Completed', 'School Assembly Ground'],
      ['Workshop — Smartphone Photography and Editing', 'Workshops', -35, 'Completed', 'Library Conference Room'],
      ['Community Outreach — Computer Lessons at Mbazzi Community Centre', 'Community Outreach', -24, 'Completed', 'Mbazzi Community Centre'],
      ['Seminar — Careers in Information Technology', 'Seminars', -18, 'Completed', 'Main Hall'],
      ['Exhibition Preparation — Annual ICT Exhibition', 'Exhibitions', -8, 'Ongoing', 'ICT Laboratory 1'],
      ['Innovation Challenge — Solve a School Problem with ICT', 'Innovation Challenges', -3, 'Ongoing', 'ICT Laboratory 2'],
      ['Workshop — Introduction to Networking Cabling', 'Workshops', 6, 'Planned', 'ICT Laboratory 1'],
      ['Annual ICT Exhibition and Open Day', 'Exhibitions', 13, 'Planned', 'School Main Hall'],
      ['Community Outreach — Teaching Basic Digital Skills to Parents', 'Community Outreach', 21, 'Planned', 'Mbazzi Community Centre'],
      ['Seminar — Cyber Security and Safe Internet Use', 'Seminars', 30, 'Planned', 'Main Hall'],
      ['Inter-School Coding Challenge (Regional)', 'Competitions', 42, 'Planned', 'Kampala Regional ICT Centre']
    ];
    return defs.map(function (d, i) {
      var active = members.filter(function (m) { return m.membershipStatus === 'Active'; });
      var participants = active.filter(function (m, mi) { return (mi + i) % 3 !== 0; }).map(function (m) { return m.id; });
      return {
        id: 'act-' + Utils.pad(i + 1, 2),
        demo: true,
        activityId: 'MRHS-ICT-A' + Utils.pad(i + 1, 3),
        title: d[0],
        type: d[1],
        date: day(d[2]),
        time: pick(rng(i * 23 + 7), ['08:30', '09:00', '10:00', '14:00', '15:00']),
        venue: d[4],
        organizer: pick(rng(i * 29 + 11), ['mem-008A', 'mem-007A', 'mem-006A']),
        description: 'Demo activity record: ' + d[0] + '. Organised for MRHS ICT Club members with the support of the school administration.',
        objectives: [
          'Equip members with practical ICT skills',
          'Strengthen teamwork and club spirit',
          'Demonstrate the club\'s value to the school community'
        ],
        outcomes: d[3] === 'Completed'
          ? 'Over 40 members participated and gave positive feedback. Two follow-up sessions were requested by participants (demo).'
          : '',
        participants: participants,
        photos: [],
        report: d[3] === 'Completed' ? 'A short activity report was filed with the club secretary (demo).' : '',
        status: d[3],
        createdBy: 'usr-03'
      };
    });
  }

  /* ── Projects & project tasks ─────────────────────────────────────────── */
  function buildProjects(members) {
    var defs = [
      ['Smart Attendance System', 'Development', 62, 'mem-006A', ['Python', 'SQLite', 'QR Codes', 'Tkinter'],
        'Manual attendance registers are slow and easy to lose.', 'Reduce time spent recording meeting attendance by at least 70%.', -78, 26],
      ['MRHS ICT Club Website', 'Development', 74, 'mem-005A', ['HTML', 'CSS', 'JavaScript'],
        'The club has no public online presence for announcements and projects.', 'Publish a responsive club website with news, projects and member showcase.', -66, 18],
      ['School Library Book Tracker', 'Testing', 88, 'mem-007A', ['JavaScript', 'LocalStorage', 'Chart.js'],
        'The library struggles to track borrowed books accurately.', 'Build a simple tracker that records borrowing and returns with overdue alerts.', -120, 9],
      ['Automatic Bell Timer for Laboratories', 'Planning', 24, 'mem-010A', ['Arduino', 'C++', 'Electronics'],
        'Laboratory sessions often run beyond the allocated time.', 'Prototype a programmable bell timer for the ICT laboratory.', -30, 40],
      ['Digital Notice Board', 'Development', 45, 'mem-002A', ['HTML', 'CSS', 'JavaScript', 'Raspberry Pi'],
        'Paper notices get lost and are slow to update.', 'Display club and school notices on a screen in the corridor.', -45, 32],
      ['Membership Records Dashboard', 'Completed', 100, 'mem-003A', ['JavaScript', 'HTML', 'CSS', 'Charts'],
        'Club records were kept in scattered exercise books.', 'Create a single dashboard for member records and statistics.', -210, -12],
      ['ICT Club Quiz Practice App', 'Testing', 79, 'mem-008A', ['JavaScript', 'JSON'],
        'Members had no way to practise ICT quiz questions away from school.', 'Deliver a question bank app with scoring and timed rounds.', -95, 12],
      ['Water Tank Level Monitor (Community Project)', 'Development', 38, 'mem-005A', ['Arduino', 'Sensors', 'C++'],
        'The community water point overflows because levels are not monitored.', 'Prototype a low-cost level monitor with an alert indicator.', -52, 46],
      ['Graphic Identity Pack for the Club', 'Archived', 100, 'mem-012A', ['Inkscape', 'GIMP'],
        'The club lacked consistent branding on its documents.', 'Produce a logo set, letterhead and certificate template.', -320, -140]
    ];
    return defs.map(function (d, i) {
      var teamSize = int(rng(i * 37 + 13), 2, 5);
      var team = [d[3]];
      members.forEach(function (m) {
        if (team.length >= teamSize) return;
        if (m.membershipStatus !== 'Active') return;
        if ((m.id.charCodeAt(m.id.length - 1) + i) % 5 === 0) team.push(m.id);
      });
      return {
        id: 'prj-' + Utils.pad(i + 1, 2),
        demo: true,
        projectId: 'MRHS-ICT-P' + Utils.pad(i + 1, 3),
        name: d[0],
        description: 'Demo project record: ' + d[0] + ' — a student-led ICT Club project developed during club sessions.',
        problemStatement: d[5],
        objectives: [d[6], 'Document the solution so future club members can maintain it', 'Present the outcome to the school community'],
        leaderId: d[3],
        team: team.filter(function (v, ix, a) { return a.indexOf(v) === ix; }),
        technologies: d[4],
        startDate: day(d[7]),
        expectedCompletion: day(d[8]),
        actualCompletion: d[1] === 'Completed' || d[1] === 'Archived' ? day(d[8] - 3) : '',
        status: d[1],
        progress: d[2],
        links: [{ label: 'Project repository (demo)', url: 'https://example.org/mrhs-ict/' + Utils.slug(d[0]) }],
        screenshots: [],
        documentation: 'Demo documentation: requirements, design notes and a short user guide are stored with the club documents.',
        results: d[1] === 'Completed' || d[1] === 'Archived'
          ? 'Delivered and demonstrated to the club. Used as a reference example for new project teams (demo).'
          : '',
        budget: int(rng(i * 41 + 17), 50, 400) * 1000,
        createdBy: 'usr-07'
      };
    });
  }
  function buildProjectTasks(projects, members) {
    var templates = {
      'Planning': [
        ['Write project proposal', 'Completed'], ['Collect user requirements', 'Completed'],
        ['Prepare work plan and budget', 'In Progress'], ['Assign team roles', 'In Progress']
      ],
      'Development': [
        ['Design the user interface', 'Completed'], ['Build the main modules', 'In Progress'],
        ['Connect the database', 'In Progress'], ['Write user documentation', 'Pending'],
        ['Prepare demo presentation', 'Pending']
      ],
      'Testing': [
        ['Build test cases', 'Completed'], ['Fix reported defects', 'In Progress'],
        ['Run user acceptance test', 'In Progress'], ['Update the user guide', 'Completed']
      ],
      'Completed': [
        ['Hand over source code to cabinet', 'Completed'], ['Write the final project report', 'Completed'],
        ['Present to the school community', 'Completed']
      ],
      'Archived': [
        ['Archive project files', 'Completed'], ['Record lessons learned', 'Completed']
      ]
    };
    var rows = [];
    projects.forEach(function (p, pi) {
      var list = templates[p.status] || templates.Planning;
      list.forEach(function (t, ti) {
        rows.push({
          id: 'ptsk-' + p.id + '-' + (ti + 1),
          demo: true,
          projectId: p.id,
          title: t[0],
          assignee: p.team[(ti + pi) % p.team.length] || p.leaderId,
          status: t[1],
          priority: ['High', 'Medium', 'Low'][(ti + pi) % 3],
          due: Utils.iso(Utils.addDays(p.startDate, 10 + ti * 9)),
          notes: 'Demo project task.',
          progress: t[1] === 'Completed' ? 100 : (t[1] === 'In Progress' ? int(rng(ti * 11 + pi + 5), 25, 85) : 0)
        });
      });
    });
    return rows;
  }

  /* ── Attendance ───────────────────────────────────────────────────────── */
  function buildAttendance(members, meetings, courses, enrollments, activities) {
    var rows = [];
    var activeMembers = members.slice();
    function record(contextType, contextId, date, memberId, idx) {
      var member = members.find(function (m) { return m.id === memberId; }) || { reliability: 0.8 };
      var p = member.reliability + ((idx % 7) - 3) * 0.03;
      var roll = rng(idx * 131 + memberId.length * 17 + date.charCodeAt(9) * 7)();
      var status;
      if (roll < p) status = 'Present';
      else if (roll < p + 0.07) status = 'Late';
      else if (roll < p + 0.14) status = 'Excused';
      else status = 'Absent';
      rows.push({
        id: 'att-' + contextType + '-' + contextId + '-' + memberId,
        demo: true,
        contextType: contextType,
        contextId: contextId,
        memberId: memberId,
        date: date,
        status: status,
        remarks: status === 'Excused' ? 'Permission granted (demo).' : (status === 'Late' ? 'Arrived 15 minutes late (demo).' : ''),
        recordedBy: 'usr-04',
        recordedAt: new Date().toISOString()
      });
    }

    // Meeting attendance (past meetings only)
    meetings.filter(function (m) { return m.status === 'Completed'; }).forEach(function (m, mi) {
      activeMembers.forEach(function (mem, xi) { record('meeting', m.id, m.date, mem.id, mi * 37 + xi); });
    });

    // Course session attendance (3 sessions per course)
    courses.filter(function (c) { return c.status !== 'Planned'; }).forEach(function (c, ci) {
      var enrolled = enrollments.filter(function (e) { return e.courseId === c.id; });
      for (var s = 0; s < 3; s++) {
        var sDate = Utils.iso(Utils.addDays(c.startDate, s * 7 + 3));
        if (sDate > Utils.todayISO()) continue;
        enrolled.forEach(function (e, ei) { record('course', c.id, sDate, e.memberId, ci * 53 + s * 19 + ei); });
      }
    });

    // Activity attendance (completed / ongoing activities)
    activities.filter(function (a) { return a.status === 'Completed' || a.status === 'Ongoing'; }).forEach(function (a, ai) {
      a.participants.forEach(function (mid, pi) { record('activity', a.id, a.date, mid, ai * 67 + pi * 3); });
    });

    return rows;
  }

  /* ── Reports ──────────────────────────────────────────────────────────── */
  function buildReports() {
    var defs = [
      ['Weekly Report — Club Activities Week 4', 'Weekly Report', -25, -19, 'mem-003A', 'Mr. Julius Kagimu'],
      ['Monthly Report — August 2026', 'Monthly Report', -63, -33, 'mem-003A', 'Mr. Julius Kagimu'],
      ['Termly Report — Term 2 2026', 'Termly Report', -122, -92, 'mem-001A', 'Mr. Julius Kagimu'],
      ['Activity Report — School ICT Awareness Day', 'Activity Report', -50, -46, 'mem-008A', 'mem-001A'],
      ['Project Report — Membership Records Dashboard', 'Project Report', -20, -12, 'mem-003A', 'mem-006A'],
      ['Training Report — HTML & CSS Course', 'Training Report', -35, -28, 'mem-007A', 'Mr. Julius Kagimu'],
      ['Meeting Report — Term 3 Mid-Term General Meeting', 'Meeting Report', -30, -26, 'mem-003A', 'mem-001A'],
      ['Annual Report — 2025 Academic Year', 'Annual Report', -300, -270, 'usr-01', 'Mr. Julius Kagimu']
    ];
    return defs.map(function (d, i) {
      var from = day(d[2]), to = day(d[3]);
      return {
        id: 'rpt-' + Utils.pad(i + 1, 2),
        demo: true,
        reportId: 'MRHS-ICT-R' + Utils.pad(i + 1, 3),
        title: d[0],
        type: d[1],
        periodFrom: from,
        periodTo: to,
        introduction: 'This sample report covers MRHS ICT Club activities between ' + Utils.fmtDate(from) + ' and ' + Utils.fmtDate(to) + '. It is demonstration content prepared for the prototype.',
        activities: 'Club meetings were held as scheduled, training sessions ran on Wednesdays and Fridays, and project teams continued development work in the ICT laboratory.',
        achievements: 'Members completed practical assignments, two projects reached testing stage, and the club participated in an inter-house ICT quiz.',
        challenges: 'Limited laboratory time, intermittent internet access and competing academic commitments during examination weeks.',
        solutions: 'Sessions were rescheduled to afternoons, offline learning materials were prepared, and project work was broken into smaller tasks.',
        recommendations: 'Increase laboratory access hours, procure two additional routers, and formalise a peer-training programme for new members.',
        conclusion: 'The club remained productive and the planned programmes were largely achieved (demo conclusion).',
        preparedBy: d[4],
        reviewedBy: d[5],
        date: day(d[3] + 3),
        status: i < 6 ? 'Approved' : 'Submitted',
        attachments: [],
        createdBy: 'usr-04'
      };
    });
  }

  /* ── Certificates ─────────────────────────────────────────────────────── */
  function buildCertificates(members, courses) {
    var types = ['Certificate of Participation', 'Certificate of Completion', 'Certificate of Excellence',
      'Certificate of Leadership', 'Certificate of Training', 'Certificate of Appreciation'];
    var rows = [];
    var recipients = members.filter(function (m) { return m.membershipStatus === 'Active' || m.membershipStatus === 'Alumni'; }).slice(0, 22);
    recipients.forEach(function (m, i) {
      var type = types[i % types.length];
      var course = courses[i % courses.length];
      var achievement = type === 'Certificate of Leadership'
        ? 'Outstanding service as ' + (m.clubRole || 'club leader') + ' during the 2026 academic year (demo).'
        : type === 'Certificate of Training'
          ? 'Successfully completed the ' + course.name + ' training course.'
          : type === 'Certificate of Appreciation'
            ? 'Recognised for dedicated support to MRHS ICT Club programmes (demo).'
            : 'Successfully participated in ' + course.name + ' and club activities.';
      var n = i + 1;
      rows.push({
        id: 'cert-' + Utils.pad(n, 3),
        demo: true,
        certificateNumber: 'MRHSICT-2026-CERT-' + Utils.pad(n, 4),
        type: type,
        recipientId: m.id,
        recipientName: m.fullName,
        achievement: achievement,
        courseId: type === 'Certificate of Training' || type === 'Certificate of Completion' ? course.id : null,
        issueDate: day(-int(rng(n * 17), 10, 220)),
        issuedBy: 'Ibrahim Ssemakula (President)',
        signedByPatron: 'Mr. Julius Kagimu (Patron)',
        status: i % 7 === 5 ? 'Draft' : 'Issued',
        club: 'MRHS ICT Club',
        school: 'Mbazzi Riverside High School',
        verified: i % 7 !== 5,
        remarks: 'Demo certificate — verification number pattern MRHSICT-2026-CERT-0001.',
        createdBy: 'usr-03'
      });
    });
    return rows;
  }

  /* ── Notes & Resources ────────────────────────────────────────────────── */
  function buildResources() {
    var defs = [
      ['Introduction to Computers — Full Notes', 'ICT Notes', 'Mr. Julius Kagimu', ['hardware', 'basics', 'S1']],
      ['Operating Systems Explained Simply', 'ICT Notes', 'Mr. Julius Kagimu', ['software', 'windows', 'linux']],
      ['HTML5 Cheat Sheet', 'Web Development', 'Ibrahim Ssemakula', ['html', 'tags', 'reference']],
      ['CSS Flexbox and Grid Guide', 'Web Development', 'Ibrahim Ssemakula', ['css', 'layout', 'responsive']],
      ['JavaScript Basics Workbook', 'Programming', 'Emmanuel Mugisha', ['javascript', 'practice', 'beginner']],
      ['Python for Beginners — Practical Exercises', 'Programming', 'Mr. Julius Kagimu', ['python', 'exercises']],
      ['Common JavaScript Errors and Fixes', 'Programming', 'Emmanuel Mugisha', ['debugging', 'javascript']],
      ['Networking Cabling Practical Guide', 'Networking', 'Ronald Kaggwa', ['cabling', 'rj45', 'practice']],
      ['IP Addressing and Subnetting Notes', 'Networking', 'Ronald Kaggwa', ['ip', 'subnetting', 'advanced']],
      ['Cyber Security Awareness Handbook', 'Cybersecurity', 'Ritah Namuli', ['security', 'passwords', 'phishing']],
      ['Staying Safe on Social Media', 'Cybersecurity', 'Ritah Namuli', ['social', 'safety']],
      ['Artificial Intelligence — Introduction Slides', 'Artificial Intelligence', 'Ms. Sarah Nabirye', ['ai', 'ml', 'slides']],
      ['Responsible Use of AI Tools in School Work', 'Artificial Intelligence', 'Ms. Sarah Nabirye', ['ai', 'ethics', 'policy']],
      ['Graphic Design Principles Poster Set', 'Graphic Design', 'Sharon Nanteza', ['design', 'colour', 'poster']],
      ['Poster Design Tutorial with Free Tools', 'Graphic Design', 'Sharon Nanteza', ['inkscape', 'gimp', 'tutorial']],
      ['Tutorial — Publish a Page with GitHub Pages', 'Tutorials', 'Emmanuel Mugisha', ['hosting', 'git', 'tutorial']],
      ['Tutorial — Building a Simple Calculator App', 'Tutorials', 'Ibrahim Ssemakula', ['javascript', 'project']],
      ['Training Material — Microsoft Excel Formulas', 'Training Materials', 'Betty Nalubega', ['excel', 'formulas', 'office']],
      ['Training Material — Presentation Skills', 'Training Materials', 'Tracy Achieng', ['public speaking', 'slides']],
      ['Digital Marketing Starter Notes', 'Entrepreneurship', 'Tracy Achieng', ['marketing', 'social media']],
      ['Turning ICT Skills into Income', 'Entrepreneurship', 'Mr. Julius Kagimu', ['business', 'freelance']],
      ['ICT Club Constitution (Club Copy)', 'Training Materials', 'MRHS ICT Club Cabinet', ['constitution', 'governance']]
    ];
    return defs.map(function (d, i) {
      return {
        id: 'res-' + Utils.pad(i + 1, 2),
        demo: true,
        title: d[0],
        category: d[1],
        description: 'Demo resource — ' + d[0] + '. Prepared by the MRHS ICT Club for members.',
        author: d[2],
        date: day(-int(rng(i * 19 + 3), 5, 300)),
        type: i % 4 === 0 ? 'File' : (i % 4 === 1 ? 'Link' : (i % 4 === 2 ? 'Note' : 'File')),
        link: i % 4 === 1 ? 'https://example.org/mrhs-ict/resources/' + Utils.slug(d[0]) : '',
        fileName: i % 4 === 0 ? Utils.slug(d[0]) + '.pdf' : '',
        fileSize: i % 4 === 0 ? int(rng(i * 23), 120, 1800) * 1024 : 0,
        fileId: null,
        tags: d[3],
        uploadedBy: 'usr-06',
        views: int(rng(i * 29 + 5), 12, 260)
      };
    });
  }

  /* ── Announcements ────────────────────────────────────────────────────── */
  function buildAnnouncements() {
    var defs = [
      ['Term 3 training timetable released', 'Urgent', 'The Term 3 training timetable is now available. All members should check the Courses module and confirm their attendance for the first session this Wednesday at 4:00 pm in ICT Laboratory 1.', 'mem-007A', -3, 14],
      ['Annual ICT Exhibition — participation list', 'Important', 'Members wishing to exhibit a project must submit their project title and a short description to the Projects Coordinator before Friday. Limited display space is available.', 'mem-006A', -6, 20],
      ['Laboratory equipment repair update', 'Normal', 'The faulty desktop computers in Laboratory 2 have been collected for repair. Training sessions will use Laboratory 1 until they are returned.', 'mem-005A', -9, 30],
      ['Membership fees for Term 3', 'Important', 'Term 3 membership fees are payable to the Treasurer by the end of the month. Receipts are issued for every payment and recorded in the Finance module.', 'mem-004A', -12, 25],
      ['Inter-School Coding Challenge — registration open', 'Urgent', 'Registration for the regional inter-school coding challenge is open. Teams of three members should register with the Projects Coordinator. Practice sessions start next week.', 'mem-001A', -15, 35],
      ['New resources added to the resource centre', 'Normal', 'New notes on networking cabling, cyber security and Python exercises have been added. Members can access them under Notes & Resources.', 'mem-007A', -20, 60],
      ['Cabinet meeting minutes published', 'Normal', 'Minutes of the last cabinet meeting are available in the Meetings module for all members to read.', 'mem-003A', -24, 45],
      ['Call for project ideas', 'Normal', 'The club invites members to submit ICT project ideas that solve a real problem at school or in the community. Submit ideas to any cabinet member.', 'mem-006A', -30, 50],
      ['Notice: quiz practice sessions resume', 'Important', 'Quiz practice sessions resume this Friday. The members who participated in the inter-house competition are especially encouraged to attend.', 'mem-008A', -34, 40]
    ];
    return defs.map(function (d, i) {
      return {
        id: 'ann-' + Utils.pad(i + 1, 2),
        demo: true,
        title: d[0],
        message: d[1] ? d[2] : d[2],
        priority: d[1],
        authorId: d[3],
        date: day(d[4]),
        expiryDate: day(d[5]),
        status: 'Published',
        audience: i % 3 === 0 ? 'All members' : (i % 3 === 1 ? 'Cabinet' : 'All members'),
        pinned: i < 2,
        createdBy: 'usr-03'
      };
    });
  }

  /* ── Tasks (cabinet work) ─────────────────────────────────────────────── */
  function buildTasks() {
    var defs = [
      ['Prepare Term 3 training timetable', 'mem-007A', 'High', -6, 'In Progress'],
      ['Collect outstanding membership fees', 'mem-004A', 'High', -2, 'In Progress'],
      ['Update the member register', 'mem-003A', 'Medium', 4, 'Pending'],
      ['Submit exhibition participation list', 'mem-006A', 'Urgent', -1, 'Pending'],
      ['Repair request for Laboratory 2 computers', 'mem-005A', 'High', 2, 'In Progress'],
      ['Draft the Term 3 budget', 'mem-004A', 'High', 6, 'Pending'],
      ['Prepare the ICT quiz question bank', 'mem-008A', 'Medium', 8, 'Pending'],
      ['Publish cabinet meeting minutes', 'mem-003A', 'Low', -4, 'Completed'],
      ['Design the exhibition banner', 'mem-012A', 'Medium', 9, 'Pending'],
      ['Organise the new members orientation', 'mem-011A', 'Medium', 12, 'Pending'],
      ['Update the club notice board', 'mem-010A', 'Low', -8, 'Overdue'],
      ['Prepare monthly financial report', 'mem-004A', 'High', -3, 'Completed'],
      ['Set up the exhibition stand', 'mem-008A', 'High', 11, 'Pending'],
      ['Backup project source code to the cabinet drive', 'mem-005A', 'Medium', 5, 'In Progress'],
      ['Confirm venue booking for the general meeting', 'mem-009A', 'Low', 3, 'Pending'],
      ['Compile the termly activity report', 'mem-003A', 'High', 15, 'Pending']
    ];
    return defs.map(function (d, i) {
      return {
        id: 'tsk-' + Utils.pad(i + 1, 2),
        demo: true,
        title: d[0],
        assigneeId: d[1],
        createdById: 'usr-03',
        priority: d[2],
        deadline: day(d[3]),
        status: d[4],
        description: 'Demo task assigned to a cabinet member. Status should be updated during cabinet meetings.',
        progress: d[4] === 'Completed' ? 100 : d[4] === 'In Progress' ? int(rng(i * 13 + 7), 20, 85) : 0,
        comments: [],
        createdAt: Utils.iso(Utils.addDays(new Date(), d[3] - 20))
      };
    });
  }

  /* ── Equipment ────────────────────────────────────────────────────────── */
  function buildEquipment() {
    var defs = [
      ['Dell OptiPlex Desktop Computer', 'Computers', 12, 'Good', 'ICT Laboratory 1', 'ICT/Technical Director', 'New'],
      ['HP ProDesk Desktop Computer', 'Computers', 8, 'Fair', 'ICT Laboratory 2', 'ICT/Technical Director', 'Good'],
      ['Lenovo ThinkPad Laptop', 'Laptops', 3, 'Good', 'ICT Office', 'Training Coordinator', 'Good'],
      ['HP EliteBook Laptop', 'Laptops', 2, 'New', 'ICT Office', 'Patron', 'New'],
      ['Epson Projector', 'Projectors', 2, 'Good', 'Store Room', 'Events Coordinator', 'Good'],
      ['TP-Link Wireless Router', 'Routers', 3, 'Good', 'ICT Laboratory 1', 'ICT/Technical Director', 'Good'],
      ['8-Port Network Switch', 'Routers', 2, 'Fair', 'ICT Laboratory 1', 'ICT/Technical Director', 'Fair'],
      ['Canon Digital Camera', 'Cameras', 1, 'Good', 'ICT Office', 'Publicity Officer', 'Good'],
      ['UTP Network Cable (305 m roll)', 'Cables', 2, 'New', 'Store Room', 'Networking Trainer', 'New'],
      ['HDMI Cable', 'Cables', 6, 'Good', 'Store Room', 'Events Coordinator', 'Good'],
      ['USB Flash Drive 32GB', 'Flash Drives', 14, 'Good', 'ICT Office', 'Secretary', 'Good'],
      ['External Hard Drive 1TB', 'Flash Drives', 2, 'Good', 'ICT Office', 'ICT/Technical Director', 'Good'],
      ['Arduino Uno Starter Kit', 'Electronics', 5, 'Good', 'ICT Laboratory 2', 'Projects Coordinator', 'Good'],
      ['Raspberry Pi 4 Model B', 'Electronics', 3, 'New', 'ICT Laboratory 2', 'Projects Coordinator', 'New'],
      ['Soldering Iron Kit', 'Electronics', 2, 'Fair', 'Store Room', 'ICT/Technical Director', 'Under Repair'],
      ['Digital Multimeter', 'Electronics', 3, 'Good', 'Store Room', 'ICT/Technical Director', 'Good'],
      ['Computer Keyboard', 'Other Equipment', 18, 'Fair', 'ICT Laboratory 1', 'ICT/Technical Director', 'Fair'],
      ['Optical Mouse', 'Other Equipment', 22, 'Good', 'ICT Laboratory 1', 'ICT/Technical Director', 'Good'],
      ['A4 Laminating Machine', 'Other Equipment', 1, 'Good', 'ICT Office', 'Secretary', 'Good'],
      ['HP LaserJet Printer', 'Other Equipment', 1, 'Fair', 'ICT Office', 'Secretary', 'Under Repair'],
      ['Extension Cable (10 sockets)', 'Cables', 4, 'Good', 'ICT Laboratory 1', 'ICT/Technical Director', 'Good'],
      ['Webcam for Online Sessions', 'Other Equipment', 2, 'New', 'ICT Laboratory 2', 'Training Coordinator', 'New']
    ];
    return defs.map(function (d, i) {
      return {
        id: 'eqp-' + Utils.pad(i + 1, 2),
        demo: true,
        assetId: 'MRHS-ICT-EQ-' + Utils.pad(i + 1, 4),
        name: d[0],
        category: d[1],
        quantity: d[2],
        condition: d[3],
        location: d[4],
        assignedTo: d[5],
        purchaseDate: day(-int(rng(i * 31 + 9), 60, 1400)),
        unitCost: int(rng(i * 37 + 11), 15, 900) * 1000,
        status: d[6],
        supplier: 'Sample supplier (demo)',
        warranty: i % 3 === 0 ? '12 months (expired demo)' : '24 months (demo)',
        notes: 'Demo inventory record.'
      };
    });
  }

  /* ── Finance ──────────────────────────────────────────────────────────── */
  function buildTransactions() {
    var rows = [];
    var incomeCats = ['Membership Fees', 'Donations', 'Sponsorship', 'Fundraising', 'School Support'];
    var expenseCats = ['Equipment', 'Printing', 'Events', 'Training', 'Internet', 'Transport', 'Materials'];
    var descriptions = {
      'Membership Fees': 'Term membership fee collection (demo)',
      'Donations': 'Donation from a parent (demo)',
      'Sponsorship': 'Sponsorship for the ICT exhibition (demo)',
      'Fundraising': 'Fundraising sale of club merchandise (demo)',
      'School Support': 'Support from the school administration (demo)',
      'Equipment': 'Purchase of laboratory equipment (demo)',
      'Printing': 'Printing of certificates and posters (demo)',
      'Events': 'Event logistics for the ICT exhibition (demo)',
      'Training': 'Training materials for members (demo)',
      'Internet': 'Data subscription for club activities (demo)',
      'Transport': 'Transport for the regional competition (demo)',
      'Materials': 'Stationery and consumables (demo)'
    };
    var r = rng(777001);
    for (var i = 0; i < 38; i++) {
      var isIncome = i % 3 !== 0;
      var cat = isIncome ? pick(r, incomeCats) : pick(r, expenseCats);
      rows.push({
        id: 'txn-' + Utils.pad(i + 1, 3),
        demo: true,
        reference: (isIncome ? 'INC-' : 'EXP-') + Utils.pad(i + 1, 4),
        type: isIncome ? 'Income' : 'Expense',
        category: cat,
        amount: isIncome ? int(r, 20, 260) * 1000 : int(r, 15, 320) * 1000,
        date: day(-int(r, 1, 340)),
        description: descriptions[cat],
        method: pick(r, ['Cash', 'Mobile Money', 'Bank Transfer', 'Cheque']),
        recordedBy: 'usr-05',
        receiptNo: 'RCT-' + Utils.pad(1000 + i, 5),
        approvedBy: 'mem-001A'
      });
    }
    return Utils.sortBy(rows, 'date', 'desc');
  }

  /* ── Achievements ─────────────────────────────────────────────────────── */
  function buildAchievements() {
    var defs = [
      ['Best ICT Project — Regional Schools Exhibition', 'Competition Awards', -70, 'Awarded for the Smart Attendance System project at the regional schools ICT exhibition.', ['mem-006A', 'mem-005A', 'mem-003A']],
      ['Winner — Inter-House ICT Quiz', 'Competition Awards', -60, 'The club team won the inter-house ICT quiz held in the school main hall.', ['mem-008A', 'mem-010A', 'mem-011A']],
      ['Innovation Award — Community Water Monitor', 'Innovation Awards', -40, 'Recognised for designing a low-cost water tank level monitor for the community.', ['mem-005A', 'mem-002A']],
      ['Certificate of Excellence — Club Leadership', 'Member Awards', -30, 'Awarded to the club president for outstanding leadership during the year.', ['mem-001A']],
      ['Best Training Programme of the Year', 'Training Achievements', -25, 'The club training programme was recognised by the school administration.', ['mem-007A', 'staff-01']],
      ['Second Place — Inter-School Coding Challenge', 'Competition Awards', -150, 'The club team took second place in the regional coding challenge.', ['mem-006A', 'mem-005A']],
      ['Community Service Recognition', 'Project Awards', -95, 'Recognised by the community centre for ICT outreach lessons.', ['mem-008A', 'mem-011A']],
      ['Most Improved Member Award', 'Member Awards', -55, 'Awarded to a member who showed the greatest improvement in ICT skills.', ['mem-014A']],
      ['Outstanding Peer Trainer Award', 'Training Achievements', -20, 'Recognised for voluntarily training new members in HTML and CSS.', ['mem-002A']]
    ];
    return defs.map(function (d, i) {
      return {
        id: 'ach-' + Utils.pad(i + 1, 2),
        demo: true,
        title: d[0],
        category: d[1],
        date: day(d[2]),
        description: d[3] + ' (Demo achievement record.)',
        memberIds: d[4],
        event: pick(rng(i * 41 + 13), ['Regional ICT Exhibition', 'Inter-House Quiz', 'School Prize Giving Day', 'Community ICT Outreach', 'Inter-School Coding Challenge']),
        awardedBy: 'Mbazzi Riverside High School',
        documents: [],
        photos: []
      };
    });
  }

  /* ── Gallery ──────────────────────────────────────────────────────────── */
  function buildAlbums() {
    var defs = [
      ['Term 3 General Meeting', 'Meetings', -27],
      ['HTML & CSS Training Sessions', 'Training', -35],
      ['Inter-House ICT Quiz', 'Competitions', -61],
      ['Project Work in the Laboratory', 'Projects', -20],
      ['School ICT Awareness Day', 'Events', -47],
      ['Prize Giving and Awards', 'Awards', -30],
      ['Cabinet and Team Photos', 'Team Photos', -14]
    ];
    return defs.map(function (d, i) {
      return {
        id: 'alb-' + Utils.pad(i + 1, 2),
        demo: true,
        name: d[0],
        category: d[1],
        date: day(d[2]),
        description: 'Demo album — photographs from ' + d[0] + '.',
        coverFileId: null,
        createdBy: 'usr-03'
      };
    });
  }
  function buildGallery() {
    var albums = buildAlbums();
    var rows = [];
    var n = 0;
    albums.forEach(function (a, ai) {
      var count = ai === 6 ? 5 : 4;
      for (var i = 0; i < count; i++) {
        n++;
        rows.push({
          id: 'img-' + Utils.pad(n, 3),
          demo: true,
          albumId: a.id,
          title: a.name + ' — photo ' + (i + 1),
          category: a.category,
          date: a.date,
          caption: 'Demo image placeholder for "' + a.name + '".',
          fileId: null,
          placeholder: placeholder(a.name + ' ' + (i + 1), n, 'IMG'),
          uploadedBy: ai % 2 ? 'usr-03' : 'usr-02'
        });
      }
    });
    return rows;
  }

  /* ── Documents ────────────────────────────────────────────────────────── */
  function buildDocuments() {
    var defs = [
      ['MRHS ICT Club Constitution', 'Constitution', 'mem-001A', -400],
      ['Club Membership Policy', 'Policies', 'staff-01', -320],
      ['Laboratory Use and Safety Policy', 'Policies', 'mem-005A', -300],
      ['Minutes — Term 3 General Meeting', 'Meeting Minutes', 'mem-003A', -27],
      ['Minutes — Term 3 Cabinet Meeting', 'Meeting Minutes', 'mem-003A', -5],
      ['Termly Report — Term 2 2026', 'Reports', 'mem-001A', -92],
      ['Annual Report — 2025', 'Reports', 'usr-01', -270],
      ['Smart Attendance System — Project Documentation', 'Project Documentation', 'mem-006A', -30],
      ['Club Website — Technical Documentation', 'Project Documentation', 'mem-005A', -22],
      ['Certificate Template (2026)', 'Certificates', 'mem-003A', -60],
      ['Training Materials — Python Exercises', 'Training Materials', 'mem-007A', -40],
      ['Training Materials — Networking Cabling', 'Training Materials', 'mem-007A', -15],
      ['Member Registration Form', 'Forms', 'mem-003A', -200],
      ['Equipment Requisition Form', 'Forms', 'mem-005A', -190],
      ['Project Proposal Template', 'Forms', 'mem-006A', -175],
      ['Inter-School Coding Challenge Rules', 'Competition Documents', 'mem-008A', -45]
    ];
    return defs.map(function (d, i) {
      return {
        id: 'doc-' + Utils.pad(i + 1, 2),
        demo: true,
        title: d[0],
        category: d[1],
        owner: d[2],
        date: day(d[3]),
        type: i % 3 === 0 ? 'Link' : 'File',
        fileName: i % 3 === 0 ? '' : Utils.slug(d[0]) + '.pdf',
        fileSize: i % 3 === 0 ? 0 : int(rng(i * 17 + 3), 90, 2400) * 1024,
        fileId: null,
        link: i % 3 === 0 ? 'https://example.org/mrhs-ict/documents/' + Utils.slug(d[0]) : '',
        version: 'v' + (1 + (i % 3)) + '.0',
        confidentiality: i % 5 === 0 ? 'Cabinet only' : 'Members',
        tags: [d[1].toLowerCase(), 'demo'],
        uploadedBy: 'usr-04'
      };
    });
  }

  /* ── Notifications (seeded) ───────────────────────────────────────────── */
  function buildNotifications(meetings, activities, tasks, announcements) {
    var rows = [];
    function add(type, title, message, icon, to, read) {
      rows.push({
        id: Utils.uid('ntf'), demo: true, type: type, title: title, message: message,
        icon: icon || 'bell', link: to || '#/dashboard',
        at: new Date(Date.now() - Math.floor(Math.random() * 3600000 * 30)).toISOString(),
        read: !!read
      });
    }
    meetings.filter(function (m) { return m.status === 'Scheduled'; }).slice(0, 2).forEach(function (m) {
      add('meeting', 'Upcoming meeting: ' + m.title, Utils.fmtDate(m.date) + ' at ' + Utils.fmtTime(m.time) + ' · ' + m.venue, 'calendar-check', '#/meetings/' + m.id);
    });
    activities.filter(function (a) { return a.status === 'Planned'; }).slice(0, 2).forEach(function (a) {
      add('activity', 'Upcoming activity: ' + a.title, Utils.fmtDate(a.date) + ' · ' + a.venue, 'rocket', '#/activities/' + a.id);
    });
    tasks.filter(function (t) { return t.status === 'Overdue' || (t.status !== 'Completed' && t.deadline < Utils.todayISO()); }).slice(0, 2).forEach(function (t) {
      add('task', 'Overdue task: ' + t.title, 'Deadline was ' + Utils.fmtDate(t.deadline), 'check-square', '#/tasks', false);
    });
    announcements.slice(0, 2).forEach(function (a) {
      add('announcement', a.title, Utils.truncate(a.message, 110), 'megaphone', '#/announcements', false);
    });
    add('report', 'Report deadline approaching', 'The termly report is due in 5 days.', 'file-text', '#/reports', false);
    add('course', 'Course completion certificates ready', '12 members qualify for certificates in HTML & CSS.', 'award', '#/certificates', true);
    return rows;
  }

  /* ── Default settings ─────────────────────────────────────────────────── */
  function defaultSettings() {
    return {
      clubName: 'MRHS ICT Club',
      clubFullName: 'Mbazzi Riverside High School ICT Club',
      schoolName: 'Mbazzi Riverside High School',
      motto: 'Innovate · Learn · Serve',
      description: 'The MRHS ICT Club is the official information and communication technology club of Mbazzi Riverside High School. It trains members in computing skills, runs ICT projects for the school and community, and represents the school in ICT competitions.',
      logoFileId: null,
      email: 'mrhsictclub@mrhs.ac.ug',
      phone: '+256 700 000 100',
      address: 'P.O. Box 120, Mbazzi, Wakiso District, Uganda',
      academicYear: '2026',
      currentTerm: 'Term 3',
      termStart: day(-38),
      termEnd: day(48),
      currency: 'UGX',
      theme: 'light',
      accent: 'primary',
      demoData: true,
      showDemoBadges: true,
      memberIdPrefix: 'MRHS-ICT-M',
      certificatePrefix: 'MRHSICT',
    certificateBgFileId: null,
    certificateBgMode: 'classic',
      notifyMeetings: true,
      notifyActivities: true,
      notifyTasks: true,
      notifyAnnouncements: true,
      notifyLowAttendance: true,
      lowAttendanceThreshold: 60,
      attendanceWeightLate: true,
      pageSize: 10,
      meetingDefaultVenue: 'ICT Laboratory 1',
      reportSignatory: 'Mr. Julius Kagimu (Patron)'
    };
  }

  /* ── Role definitions ─────────────────────────────────────────────────── */
  var ROLES = {
    'Administrator': { label: 'Administrator', tone: 'danger', description: 'Full system access including settings, users and data tools.' },
    'Patron': { label: 'Patron', tone: 'primary', description: 'Monitors club operations and accesses reports, activities, members and meetings.' },
    'President': { label: 'President', tone: 'secondary', description: 'Manages club operations, cabinet, meetings, activities, projects and members.' },
    'Secretary': { label: 'Secretary', tone: 'info', description: 'Manages meetings, minutes, attendance and reports.' },
    'Treasurer': { label: 'Treasurer', tone: 'success', description: 'Manages club finances and financial reporting.' },
    'Training Coordinator': { label: 'Training Coordinator', tone: 'accent', description: 'Manages courses, training and learning resources.' },
    'Project Coordinator': { label: 'Project Coordinator', tone: 'warning', description: 'Manages projects and project teams.' },
    'Member': { label: 'Member', tone: 'neutral', description: 'Views permitted club information, courses, projects, activities, certificates and personal records.' }
  };

  /* ── Seed entry point ─────────────────────────────────────────────────── */
  function seed(state) {
    var members = buildMembers();
    var courses = buildCourses();
    var lessons = buildLessons(courses);
    var enrollments = buildEnrollments(members, courses);
    var meetings = buildMeetings(members);
    var activities = buildActivities(members);
    var projects = buildProjects(members);
    var projectTasks = buildProjectTasks(projects, members);
    var attendance = buildAttendance(members, meetings, courses, enrollments, activities);
    var announcements = buildAnnouncements();
    var tasks = buildTasks();

    state.members = members;
    state.cabinet = buildCabinet(members);
    state.cabinetHistory = buildCabinetHistory();
    state.users = buildUsers();
    state.courses = courses;
    state.lessons = lessons;
    state.enrollments = enrollments;
    state.meetings = meetings;
    state.activities = activities;
    state.projects = projects;
    state.projectTasks = projectTasks;
    state.attendance = attendance;
    state.reports = buildReports();
    state.certificates = buildCertificates(members, courses);
    state.resources = buildResources();
    state.announcements = announcements;
    state.tasks = tasks;
    state.equipment = buildEquipment();
    state.transactions = buildTransactions();
    state.achievements = buildAchievements();
    state.albums = buildAlbums();
    state.gallery = buildGallery();
    state.documents = buildDocuments();
    state.notifications = buildNotifications(meetings, activities, tasks, announcements);
    state.auditLog = [];
    state.verifications = [];
    state.__settings = defaultSettings();
    return state;
  }

  global.Data = {
    seed: seed,
    defaultSettings: defaultSettings,
    ROLES: ROLES,
    CABINET_ORDER: CABINET_ORDER,
    placeholder: placeholder,
    rng: rng,
    MALE: MALE, FEMALE: FEMALE, SURNAMES: SURNAMES,
    CLASSES: CLASSES, STREAMS: STREAMS, SKILLS: SKILLS, INTERESTS: INTERESTS,
    COURSE_CATEGORIES: ['Foundation', 'Programming', 'Creative', 'Networking', 'Security', 'Emerging Tech', 'Office Skills', 'Business'],
    RESOURCE_CATEGORIES: ['ICT Notes', 'Programming', 'Web Development', 'Networking', 'Cybersecurity', 'Artificial Intelligence', 'Graphic Design', 'Entrepreneurship', 'Tutorials', 'Training Materials'],
    DOCUMENT_CATEGORIES: ['Constitution', 'Policies', 'Meeting Minutes', 'Reports', 'Project Documentation', 'Certificates', 'Training Materials', 'Forms', 'Competition Documents'],
    GALLERY_CATEGORIES: ['Meetings', 'Training', 'Competitions', 'Projects', 'Events', 'Awards', 'Team Photos'],
    CERTIFICATE_TYPES: ['Certificate of Participation', 'Certificate of Completion', 'Certificate of Excellence', 'Certificate of Leadership', 'Certificate of Training', 'Certificate of Appreciation'],
    MEETING_TYPES: ['General Meeting', 'Cabinet Meeting', 'Training Meeting', 'Project Meeting', 'Emergency Meeting', 'Planning Meeting'],
    ACTIVITY_TYPES: ['ICT Training', 'Coding Sessions', 'Competitions', 'Exhibitions', 'Seminars', 'Workshops', 'School ICT Awareness', 'Community Outreach', 'Innovation Challenges'],
    REPORT_TYPES: ['Weekly Report', 'Monthly Report', 'Termly Report', 'Activity Report', 'Project Report', 'Training Report', 'Meeting Report', 'Annual Report'],
    PROJECT_STATUSES: ['Planning', 'Development', 'Testing', 'Completed', 'Archived'],
    MEMBER_STATUSES: ['Active', 'Inactive', 'Suspended', 'Alumni'],
    ATTENDANCE_STATUSES: ['Present', 'Absent', 'Late', 'Excused'],
    ATTENDANCE_CONTEXTS: ['meeting', 'course', 'activity', 'training', 'event'],
    EQUIPMENT_CATEGORIES: ['Computers', 'Laptops', 'Projectors', 'Routers', 'Cameras', 'Cables', 'Flash Drives', 'Electronics', 'Other Equipment'],
    EQUIPMENT_CONDITIONS: ['New', 'Good', 'Fair', 'Damaged', 'Under Repair'],
    INCOME_CATEGORIES: ['Membership Fees', 'Donations', 'Sponsorship', 'Fundraising', 'School Support'],
    EXPENSE_CATEGORIES: ['Equipment', 'Printing', 'Events', 'Training', 'Internet', 'Transport', 'Materials'],
    TASK_STATUSES: ['Pending', 'In Progress', 'Completed', 'Overdue'],
    PRIORITIES: ['Low', 'Normal', 'Medium', 'High', 'Urgent'],
    ANNOUNCEMENT_PRIORITIES: ['Normal', 'Important', 'Urgent']
  };
})(window);
