/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/manual.js
   Administrator user manual: a searchable, printable handbook covering every
   module, role, routine and data tool in the system.

   The content is data (see MANUAL below) so it renders once in the app, once
   for print, and can be extended without touching the layout code.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;
  var state = { query: '', open: {} };

  /* ══ Manual content ════════════════════════════════════════════════════ */
  var MANUAL = [
    {
      id: 'getting-started',
      title: 'Getting started',
      icon: 'rocket',
      tagline: 'Sign in, find your way around and understand how the club data is organised.',
      intro: 'MRHS ICT CLUB MASTER is a single-page application. Everything you see — members, ' +
        'attendance, courses, money — is stored in this browser on this device. There is no server to ' +
        'log into, so the app works offline and loads instantly once it has opened once.',
      steps: [
        'Open the app. The boot screen loads the club data (a first run seeds the full demo dataset and takes a few seconds).',
        'On the login screen enter your username or email and password, then click <strong>Sign in</strong>. Tick <em>Remember me</em> on a private device so you stay signed in.',
        'Forgot a password? Click <strong>Forgot password?</strong> to see who to contact (the club administrator) — passwords are stored as hashes and cannot be read back.',
        'The first demo sign-in button below the form fills the credentials for you; every demo account uses the password <strong>demo1234</strong>.',
        'After signing in you land on the <strong>Dashboard</strong>. The left sidebar lists every module you are allowed to open; the top bar holds global search, the theme switch, notifications and your account menu.',
        'Press <kbd>Ctrl</kbd>+<kbd>K</kbd> (or <kbd>⌘</kbd>+<kbd>K</kbd> on a Mac) at any time to search the whole database.'
      ],
      notes: [
        'The sidebar collapses into a drawer on phones and tablets — tap the menu icon in the top bar.',
        'Every module page starts with headline numbers, then filters, then the record table. Detail pages open when you click a record name.',
        'Dark mode, light mode or follow the operating system: top-bar moon icon, or <strong>Settings → Appearance</strong>.',
        'The footer shows the club name, the academic year and how many records are stored in total.'
      ]
    },
    {
      id: 'roles',
      title: 'Roles and permissions',
      icon: 'shield',
      tagline: 'Who can see and change what.',
      intro: 'Permissions are attached to roles, not to people. When you change somebody’s role in ' +
        '<strong>Settings → Users &amp; roles</strong>, their menu, pages and buttons change immediately. ' +
        'If a page is off-limits the app shows an “Access restricted” message instead of the data.',
      table: {
        head: ['Role', 'Typical holder', 'Can do'],
        rows: [
          ['Administrator', 'ICT teacher / system owner', 'Everything: all modules, user management, settings, backup, import and reset.'],
          ['Patron', 'Teacher in charge of the club', 'Monitors the club; manages members, meetings, activities, reports, announcements, achievements, gallery, documents.'],
          ['President', 'Club president', 'Full club operations: members, cabinet, meetings, attendance, activities, projects, reports, certificates, tasks, calendar.'],
          ['Secretary', 'General secretary', 'Meetings and minutes, attendance, reports, documents, tasks; edits members and certificates.'],
          ['Treasurer', 'Club treasurer', 'Full finance module: income, expenses, statements, receipts; edits reports, documents and equipment.'],
          ['Training Coordinator', 'Training lead', 'Full courses module, resources, attendance, certificates, enrolment and lessons.'],
          ['Project Coordinator', 'Projects lead', 'Full projects module, project tasks and activities.'],
          ['Member', 'Ordinary club member', 'Read-only club information plus own profile, own attendance and own certificates.']
        ]
      },
      notes: [
        'Permission levels are <em>view</em> (read only), <em>manage</em> (create and edit) and <em>full</em> (manage + delete).',
        'Buttons you cannot use are hidden rather than disabled, so the interface stays clean. Restricted pages show a clear explanation instead of an error.',
        'Only Administrators can open this manual and the <strong>Settings</strong> module.'
      ]
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: 'dashboard',
      tagline: 'The morning briefing: what is happening in the club right now.',
      steps: [
        'Read the greeting and date at the top: “Good morning, [your name] — here’s what’s happening in MRHS ICT Club.”',
        'Scan the ten KPI cards: total members, active members, cabinet members, active courses, active projects, upcoming meetings, upcoming activities, attendance rate, reports submitted and certificates issued. Each card links to its module.',
        'Use the charts to follow attendance and membership over the last months; hover a bar or point for exact figures.',
        'Check <strong>Upcoming events</strong> for the next meetings, activities and deadlines, and <strong>Active projects</strong> for progress bars.',
        'Catch up with <strong>Recent activity</strong> and the announcements panel (urgent and pinned notices are featured first).',
        'Jump straight into work with the quick actions: Add member, Create meeting, Record attendance, Add project, Create activity, Create report, Issue certificate, Add course.'
      ],
      notes: [
        'The dashboard is personalised: a signed-in member sees their own attendance, courses and certificates instead of club-wide totals.',
        'Anything you change elsewhere in the app updates these numbers the moment you save.'
      ]
    },
    {
      id: 'members',
      title: 'Members',
      icon: 'users',
      tagline: 'The register of every club member, with linked courses, projects and certificates.',
      steps: [
        'Open <strong>Members</strong> to see the full register. Use the search box for a name, member ID, class or skill.',
        'Filter by membership status, class or club role, and sort any column by clicking its header.',
        'Click <strong>Add member</strong> to register somebody: name, gender, class, stream, student number, contact, email, join date, status, club role, skills, interests and notes. Required fields are marked and validated.',
        'Open a member to see the profile page: attendance rate, courses with progress, projects, certificates, achievements and discipline notes, all pulled from the other modules.',
        'From the profile use <strong>Print profile</strong> for the full A4 record or <strong>ID card</strong> for the credit-card sized membership card.',
        'Use the row menu to edit, duplicate or delete a record, and <strong>Export</strong> to download the register as CSV for Excel.',
        'Click <strong>Create member cards</strong> to print club ID cards for the members currently listed — see the card section of this manual for sizes and printing tips.'
      ],
      notes: [
        'Member IDs are generated automatically in the form <em>MRHS-ICT-M001</em> and stay unique.',
        'Deleting a member asks for confirmation and can be undone from the toast; linked records stay behind for auditing.',
        'Add photos by selecting a file — images are stored in the browser’s IndexedDB, not in LocalStorage, so the register stays fast.'
      ],
      faq: [
        { q: 'A member left school. Should I delete them?', a: 'No — set their status to <em>Alumni</em> (or <em>Inactive</em>). Historical attendance, certificates and reports stay accurate and the member disappears from active lists.' }
      ]
    },
    {
      id: 'cabinet',
      title: 'Cabinet and leadership',
      icon: 'crown',
      tagline: 'The thirteen club positions, their holders, terms of office and history.',
      steps: [
        'Open <strong>Cabinet</strong> for the leadership directory, grouped into patron, executive committee and officers.',
        'Switch to the <strong>Organisational chart</strong> tab for the hierarchy view, or <strong>Cabinet history</strong> for previous holders.',
        'Click <strong>Appoint a leader</strong>, choose the position, then pick a registered member (their name, contact and email fill in automatically) or type an external appointment such as the patron.',
        'Record the responsibilities and the term of office — these appear on the printed cabinet list.',
        'Editing a position that changes holder automatically writes an entry to the history archive so the club keeps a clean record of past cabinets.',
        'Use <strong>Create cabinet cards</strong> to print a position card for each leader, or the card button on a record for a single card.'
      ],
      notes: [
        'The app blocks two holders for the same position: it will offer to edit the existing record instead.',
        'Appointing a member also updates that member’s <em>club role</em> on their profile.'
      ]
    },
    {
      id: 'meetings',
      title: 'Meetings and minutes',
      icon: 'calendar-check',
      tagline: 'Schedule meetings, take minutes, record decisions and turn them into tasks.',
      steps: [
        'Click <strong>Schedule meeting</strong>: title, type (General, Cabinet, Training, Project, Emergency, Planning), date, time, venue, chairperson, secretary and status.',
        'Open the meeting to build the <strong>agenda</strong> as a numbered list, then invite attendees — members are selected from the register.',
        'During or after the meeting open <strong>Minutes</strong> and type the discussion points, decisions and action items. Save as you go; the minutes can be printed on club letterhead.',
        'Action items become real club tasks: each one gets an owner and a deadline, and appears in the <strong>Tasks</strong> module and on the owner’s dashboard.',
        'Use <strong>Record attendance</strong> on the meeting page to mark present, absent, late or excused for every invited member — the same recorder as the Attendance module.',
        'Print the agenda, the minutes or the attendance sheet from the meeting page, or export the whole meetings register.'
      ],
      notes: [
        'Meeting types drive the colour badges you see in lists and on the calendar.',
        'Minutes, decisions and action items are stored on the meeting record, so a search for a decision finds the meeting too.'
      ]
    },
    {
      id: 'attendance',
      title: 'Attendance',
      icon: 'user-check',
      tagline: 'One recorder for meetings, courses, activities, training and events.',
      steps: [
        'Open <strong>Attendance</strong> and click <strong>Record attendance</strong>.',
        'Choose the session type (meeting, course, activity, training or event), then the specific session and the date.',
        'Mark each member Present, Absent, Late or Excused — or use <strong>All present</strong> / <strong>All absent</strong> and adjust the exceptions. Remarks can be added per member.',
        'Click <strong>Save attendance</strong>. If the session was already recorded the app updates those records instead of duplicating them, and tells you so before saving.',
        'Read the dashboards: attendance rate, best and weakest sessions, monthly trend and members below the low-attendance threshold.',
        'Open a member’s history from the member profile, or run a <strong>monthly, termly or individual report</strong> and print the sheet.'
      ],
      notes: [
        'Attendance rate = <strong>Present ÷ Expected × 100</strong>. “Late” counts as attended; “Excused” and “Absent” do not.',
        'The low-attendance threshold (default 60%) is set in <strong>Settings → Notifications</strong> and drives the alerts.',
        'QR check-in is a designed placeholder for a later release — the recording and reporting behind it already work.',
        'Print an attendance sheet before a session so the secretary can take a paper register, then key it in afterwards.'
      ]
    },
    {
      id: 'courses',
      title: 'Courses and training',
      icon: 'graduation',
      tagline: 'Club courses, enrolment, lessons, progress and completion.',
      steps: [
        'Open <strong>Courses</strong> for the course catalogue (Computer Basics, Microsoft Office, Programming, Web Development, Graphic Design, Networking, Cyber Security, Robotics, Data Entry, Video Editing, Digital Literacy).',
        'Click <strong>Add course</strong> for course ID, name, description, instructor, level, duration, number of lessons, start and end dates and status.',
        'Use <strong>Enrol members</strong> on a course to add learners; progress is tracked per enrolment with a percentage and a status.',
        'Maintain the lesson list on the course page so the syllabus is visible to members.',
        'When a learner reaches 100% with attendance above the threshold the course becomes <strong>certificate eligible</strong> — issue the certificate straight from the course page.',
        'Print or export the course register, the enrolment list or the completion summary.'
      ],
      notes: [
        'Completion rate on the dashboard counts enrolments marked completed against total enrolments.',
        'Instructors can be club members or external trainers; member instructors are linked to their profile.'
      ]
    },
    {
      id: 'activities',
      title: 'Activities',
      icon: 'rocket',
      tagline: 'Exhibitions, competitions, workshops, outreach and every club event.',
      steps: [
        'Open <strong>Activities</strong> and click <strong>Add activity</strong>.',
        'Choose the type (competition, exhibition, workshop, training, outreach, ceremony, fundraising, meeting, social) and enter title, date, time, venue and organiser.',
        'Write the objectives and expected outcomes, then select the participating members.',
        'Move the activity through <em>Planned → Ongoing → Completed</em> (or Cancelled) as it happens.',
        'After the event record the outcomes, attach photos and write the activity report — it can be printed and filed as an official club document.',
        'Record attendance for the activity from the Attendance module using the same session.'
      ],
      notes: [
        'Completed activities feed the participation charts in Analytics and the achievements you record afterwards.'
      ]
    },
    {
      id: 'projects',
      title: 'Projects',
      icon: 'kanban',
      tagline: 'Member projects from problem statement to results, with teams and tasks.',
      steps: [
        'Open <strong>Projects</strong> and click <strong>Add project</strong>: name, description, the problem it solves, objectives, leader, team, technologies, start and target dates.',
        'Set the status — Planning, Development, Testing, Completed or Archived — and the progress percentage.',
        'Break the work into <strong>project tasks</strong> with owners, deadlines, priority and progress; the project progress can then be reported per task.',
        'Keep documents, reference links and screenshots on the project record so everything lives in one place.',
        'Record results on completion: what was built, who benefited, and the evidence. The project then appears in reports and analytics.',
        'Print the project brief or the final project report.'
      ],
      notes: [
        'The leader and team are chosen from the member register, so a member’s profile shows every project they worked on.',
        'Projects with deadlines feed the notification centre and the calendar.'
      ]
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: 'file-text',
      tagline: 'Weekly, monthly, termly, activity, project, training, meeting and annual reports.',
      steps: [
        'Open <strong>Reports</strong> and click <strong>Create report</strong>.',
        'Pick the report type and the period it covers, then give it a clear title.',
        'Fill the standard structure: introduction, activities, achievements, challenges, solutions, recommendations and conclusion.',
        'Record who prepared and who reviewed the report, add the date, and save.',
        'Use <strong>Preview &amp; print</strong> to see the report on club letterhead, then print it or save it as a PDF for the school administration.',
        'Export the whole reports register to CSV when the term ends.'
      ],
      notes: [
        'Figures such as membership, attendance and income can be copied from Analytics — keep the analytics page open in another tab while writing.',
        'Submitted reports are counted on the dashboard’s “Reports submitted” card.'
      ]
    },
    {
      id: 'certificates',
      title: 'Certificates',
      icon: 'award',
      tagline: 'Issue, print and publicly verify club certificates.',
      steps: [
        'Open <strong>Certificates</strong> and click <strong>Issue certificate</strong>.',
        'Choose the type — Participation, Completion, Excellence, Leadership, Training or Appreciation — then pick the recipient (member) and, for course certificates, the course.',
        'Describe the achievement, set the issue date and signatories (club president and patron), then save.',
        'The certificate number is generated automatically in the form <strong>MRHSICT-2026-CERT-0001</strong> and never repeats.',
        'Click <strong>Print</strong> to preview the certificate: cream background, double navy border, crest, decorative seal and two signature lines. Print it on A4 landscape paper or download it as HTML for PDF conversion.',
        'Use <strong>Verify</strong> to check any certificate number, or give people the public page — open <strong>Verify Certificate</strong> in the sidebar (no sign-in needed) and type the number.',
        'If a certificate was issued in error open the record, mark it <strong>Revoked</strong> and add the reason; verification then reports it as revoked.'
      ],
      notes: [
        'The certificate design is print-first: colours, borders and the background are tuned for paper, not for the screen, and they are identical in the preview.',
        'Certificates print on a <strong>landscape A4 sheet</strong> (297 × 210 mm). The app sets the page sideways for the print job automatically, so use the <strong>Print</strong> button in the preview rather than the browser menu; the certificate then fills the sheet edge to edge without clipping.',
        'Certificates are landscape and print at true A4 size (297 × 210 mm). Two built-in designs ship with the platform — the default <strong>Cream &amp; ornate</strong> (cream paper, double gold rule frame, corner scrollwork and a faint centre medallion) and <strong>Navy &amp; gold</strong> (navy corner blocks, diagonal pinstripes, gold rule frame and gold corner hooks). Pick either one, or set your own image, from <strong>Certificates → Certificate background</strong> or <strong>Settings → Club information → Certificate background</strong>: the club crest, the recipient name, the two signature lines and the certificate number always stay on top of the background.',
        'When using your own background, choose a light, low-contrast design with an empty middle so the name and the achievement text stay easy to read — the app adds a soft white scrim over uploaded images to help.',
        'Changing the club name, school name or logo in Settings automatically updates every certificate and ID card.'
      ]
    },
    {
      id: 'resources',
      title: 'Notes & Resources',
      icon: 'book-open',
      tagline: 'The club library: lesson notes, tutorials, past papers, templates and useful links.',
      steps: [
        'Open <strong>Notes &amp; Resources</strong> and click <strong>Add resource</strong>.',
        'Choose the category (Lesson Notes, Tutorials, Past Papers, Code Samples, Templates, Guidelines, Syllabi, Software, Links, Other), give it a title and description.',
        'Attach a file, paste a link, or simply write a note in the rich description.',
        'Add tags so related material groups together, and set the author and date.',
        'Use search and the category filter to find material quickly; open a resource from the member view too — courses and resources are visible to ordinary members.'
      ],
      notes: [
        'Uploaded files live in IndexedDB and can be opened or saved straight from the resource page.',
        'View counts show which material members actually use.'
      ]
    },
    {
      id: 'cards',
      title: 'Membership and cabinet cards',
      icon: 'id-card',
      tagline: 'Print CR80 cards for members and club leaders, one at a time or ten to a sheet.',
      intro: 'The card studio turns your records into physical cards the size of a bank card ' +
        '(CR80 — 85.6 × 54 mm). Member cards carry the member ID, class, role and status; cabinet cards ' +
        'carry the position, term of office and mandate. Both have a reverse side with the club terms, ' +
        'contact details and a scannable membership code.',
      steps: [
        'Open <strong>Members</strong> and click <strong>Create member cards</strong>. The studio opens with the members currently shown in the table already ticked — filter or search the register first to choose a group such as one class or the active members.',
        'Or open <strong>Cabinet</strong> and click <strong>Create cabinet cards</strong> to card the whole leadership team.',
        'In the studio, tick or untick records on the left, or use <strong>Select all</strong>, <strong>Clear</strong> and <strong>Active only</strong>. Use the search box to find one person quickly.',
        'Choose the faces: <strong>Front only</strong>, <strong>Reverse only</strong> or <strong>Front + reverse</strong> (which prints one page of fronts followed by one page of reverses).',
        'Check the live preview on the right, then click <strong>Print cards</strong>. Eight cards are laid out on each A4 page (two columns of four) with cutting guides.',
        'To print a single card, open the member or cabinet record and use <strong>Membership card</strong> / <strong>Create position card</strong>.',
        'Use <strong>Download HTML</strong> if you want to take the sheet to another computer or a print shop — the file contains the whole design and needs no internet.'
      ],
      notes: [
        'Print on A4 card stock of 200 gsm or heavier and set the printer scale to <strong>100%</strong> — “fit to page” shrinks the cards below CR80 and they will not fit the laminating pouches.',
        'For double-sided cards, print the front sheet first, then flip the paper and print the reverse sheet. Test the orientation with one sheet before printing the whole batch.',
        'Cut on the dashed guides, then laminate. Circular corners (3 mm radius) make the cards last longer.',
        'Photos are used automatically when a member has one; otherwise the card shows the member’s initials on a colour block.',
        'Cards always follow the club name, school name, logo, term and signatory set in <strong>Settings → Club information</strong>, so reprint after any change there.',
        'The membership code on the reverse is a scan-ready placeholder: the design and data are in place, and camera check-in will be enabled in a later release.'
      ]
    },
    {
      id: 'announcements',
      title: 'Announcements',
      icon: 'megaphone',
      tagline: 'Noticeboard messages for the whole club.',
      steps: [
        'Open <strong>Announcements</strong> and click <strong>New announcement</strong>.',
        'Write the title and message, set the priority — Normal, Important or Urgent — and the expiry date if the notice is temporary.',
        'Pin important notices so they stay at the top; they are also featured on the dashboard.',
        'Publish or unpublish with the status field rather than deleting, so the history of what the club announced is preserved.'
      ],
      notes: [
        'Urgent and pinned announcements appear first on every member’s dashboard.',
        'The notification centre picks up new announcements for members who are signed in.'
      ]
    },
    {
      id: 'tasks',
      title: 'Tasks',
      icon: 'check-square',
      tagline: 'Who is doing what, by when.',
      steps: [
        'Open <strong>Tasks</strong> and click <strong>Add task</strong>: what needs doing, who it is assigned to, who created it, priority, deadline and a description.',
        'Switch between the board view (columns by status) and the list view to suit the way you work.',
        'Move a task to <em>In Progress</em> or <em>Completed</em> as it advances; overdue tasks are highlighted automatically.',
        'Meeting action items arrive here automatically with the owner and deadline already set.',
        'Filter by assignee, priority or status to prepare for a cabinet meeting.'
      ],
      notes: [
        'Overdue tasks appear in the notification centre for their owner and in the Analytics task summary.',
        'The dashboard shows each member their own open tasks.'
      ]
    },
    {
      id: 'calendar',
      title: 'Calendar',
      icon: 'calendar',
      tagline: 'One month view of everything dated in the club.',
      steps: [
        'Open <strong>Calendar</strong> to see meetings, activities, training, events, project and report deadlines and certificate events side by side.',
        'Use the arrows to move between months and click any entry to jump to its record.',
        'Colours and icons tell the kinds apart; the legend sits under the grid.',
        'Record deadlines in the modules themselves (project dates, meeting dates, report periods) — the calendar reads from them automatically, so there is only one place to keep dates accurate.'
      ]
    },
    {
      id: 'equipment',
      title: 'Equipment',
      icon: 'cpu',
      tagline: 'The club asset register.',
      steps: [
        'Open <strong>Equipment</strong> and click <strong>Add equipment</strong>: asset ID, item, category, quantity, condition, location, who it is assigned to, purchase date and cost.',
        'Categories cover computers, laptops, projectors, routers, cameras, cables, flash drives, electronics and other — add your own items freely.',
        'Update the condition as equipment ages: New, Good, Fair, Damaged or Under Repair.',
        'Log repairs and servicing in the maintenance record so the club can prove how assets were looked after.',
        'Check the total asset value card when preparing the club budget, and print the asset list for stock-taking.'
      ]
    },
    {
      id: 'finance',
      title: 'Finance',
      icon: 'wallet',
      tagline: 'Income, expenses and the club balance.',
      steps: [
        'Open <strong>Finance</strong> and click <strong>Record income</strong> or <strong>Record expense</strong>.',
        'Income categories: membership fees, donations, sponsorship, fundraising and school support. Expense categories: equipment, printing, events, training, internet, transport and materials.',
        'Enter the amount, date, method and receipt number; the reference is generated for you.',
        'Watch the three headline cards — total income, total expenses and the balance — and the income vs expenses chart.',
        'Print a period statement for the treasurer’s report, or print a receipt for a single payment.',
        'Export the transaction history to CSV for the school bursar or for the annual report.'
      ],
      notes: [
        'Amounts are kept in Ugandan Shillings (UGX) with separators; the currency label is set in Settings.',
        'Every transaction records who approved it and who entered it.',
        'The finance module is hidden entirely from roles that may not see club money.'
      ]
    },
    {
      id: 'achievements',
      title: 'Achievements',
      icon: 'trophy',
      tagline: 'Trophies, awards and competition results, with the members involved.',
      steps: [
        'Open <strong>Achievements</strong> and click <strong>Record achievement</strong>.',
        'Enter the title, the event, the date and what was achieved, then select the members who took part.',
        'Attach photos or the certificate document as evidence.',
        'Achievements appear on the dashboard of the members involved and in the annual report and analytics.'
      ]
    },
    {
      id: 'gallery',
      title: 'Gallery',
      icon: 'image',
      tagline: 'Albums of club photographs.',
      steps: [
        'Open <strong>Gallery</strong> and click <strong>New album</strong> to create a collection (for example “ICT Exhibition 2026”).',
        'Open an album and click <strong>Add photo</strong>: upload an image or keep the placeholder, then write a caption and pick the date.',
        'Click any photo to open the lightbox, then use the arrows or keyboard to move through the album.',
        'Use albums to illustrate activity reports and the club’s public displays.'
      ],
      notes: [
        'Photographs are compressed and stored in IndexedDB; the placeholder tiles are used where no photo has been uploaded yet.'
      ]
    },
    {
      id: 'documents',
      title: 'Documents',
      icon: 'folder',
      tagline: 'The club filing cabinet.',
      steps: [
        'Open <strong>Documents</strong> and click <strong>Add document</strong>.',
        'Categories include constitutions, policies, letters, minutes, budgets, plans, forms, reports and other.',
        'Record the title, owner, date, version and confidentiality, then attach the file or a link.',
        'Search by title, tag or category; confidential documents are marked clearly so they are not shown on screen during meetings.'
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: 'bar-chart',
      tagline: 'Patterns and plain-language insights drawn from your own records.',
      steps: [
        'Open <strong>Analytics</strong> and read the insight cards first — they explain what the numbers mean and what to do next.',
        'Charts cover membership growth, attendance trends, course enrolment and completion, project progress, activity participation, certificates and income vs expenses.',
        'Hover any chart element for exact figures; print or export the summary for the termly report.',
        'Use the comparison tables to see which courses or activities attract the most members and which members need support.'
      ],
      notes: [
        'Analytics is read-only by design — always change the underlying records in their own module so the history stays honest.'
      ]
    },
    {
      id: 'settings',
      title: 'Settings, users and data',
      icon: 'sliders',
      tagline: 'Club identity, appearance, accounts, notifications and backup.',
      intro: 'The platform is styled like the school’s own stationery: club blue on cool paper: navy ink for actions, azure for emphasis, a book serif for headings and hairline rules on the tables. Choose light, dark or the system setting in <strong>Appearance</strong>; both themes follow the same palette.',
      steps: [
        'Open <strong>Settings → Club information</strong> to set the club name, school name, motto, description, contact details, academic year, current term, term dates, currency and document signatories. These values appear on certificates, ID cards, letters and printed reports.',
        'Use <strong>Appearance</strong> to pick light, dark or system theme and the accent colour.',
        'In <strong>Users &amp; roles</strong> create accounts for cabinet members: name, username, email, role, linked member profile and password. Reset a password, change a role or deactivate an account at any time.',
        'The quickest way to change the background: open <strong>Certificates</strong> and click the <strong>Certificate background</strong> button at the top of the page (there is a second one on every certificate page and inside every certificate preview). The dialog shows the two built-in designs — <strong>Cream &amp; ornate</strong> is the club default, <strong>Navy &amp; gold</strong> is the alternative — plus an <strong>Upload my image</strong> button for your own PNG or JPEG up to 4 MB.',
        'The same window is available in <strong>Settings → Club information → Certificate background</strong>, where you can click either tile to switch designs, remove your image, or preview a real certificate at any time. The design you pick applies to every certificate, every print-out and every download.',
        'If your background leaves its clear space somewhere else, use <strong>Align the content</strong> in the same window: choose Top / Middle / Bottom and Left / Center / Right, nudge the block sideways or up and down, and change the text size. A live sample certificate below the controls updates as you drag, so you can see exactly where the name and signatures will land. <strong>Reset alignment</strong> puts everything back in the centre.',
        'In <strong>Notifications</strong> choose which alerts the app raises (meetings, activities, tasks, announcements, low attendance) and set the low-attendance threshold.',
        'In <strong>Data</strong> download a full JSON backup, restore from a backup (merge or replace), import records from CSV, and reset or re-seed the demo data.'
      ],
      notes: [
        '<strong>Back up before every term.</strong> The app stores data in this browser only: clearing browsing data deletes it unless you have a backup file.',
        '<strong>Empty every module</strong> is the switch-over button: it deletes every record in every module so the club starts on its own data. The sign-in accounts, club information, appearance, the certificate design and the Firebase connection are kept, and the confirmation asks you to type EMPTY so it cannot be pressed by accident. Press <strong>Sync now</strong> afterwards and the shared database is emptied too.',
        '<strong>Remove sample records</strong> deletes exactly the demonstration dataset the platform ships with, so the club can start on its own records. The sign-in accounts are never touched, and anything the club entered itself — including records an earlier version labelled as sample data — is kept. <strong>Reload sample data</strong> puts the demonstration club back, and <strong>Reset everything</strong> wipes this browser and rebuilds it.',
        'Where to keep those backups (and which cloud service to choose) is set out in <strong>docs/CLOUD-STORAGE.md</strong> in the project folder: the short answer is a shared school Google Drive folder with dated JSON backups every week, plus a USB copy and a printed termly report.',
        'The platform can also put the backup into Microsoft OneDrive for you: <strong>Settings → Data → Cloud backup</strong>. Route one writes each backup into a folder you pick once — the OneDrive (or Drive) folder on the PC — and the sync client uploads it. Route two signs in to the school’s Microsoft 365 account and uploads straight into the app’s own OneDrive folder; it needs a one-time app registration (choose <strong>How to set it up</strong> in the same card, or read <strong>docs/ONEDRIVE.md</strong>). Whichever route you use, <strong>Restore from OneDrive / folder</strong> lists the backups and loads one back, in merge or replace mode.',
        'Backups never contain sign-in tokens, and the OneDrive connection only ever sees the app folder <span class="mono">Apps/MRHS ICT Club Master</span> — never the rest of the school’s drive.',
        '<strong>Firebase shared database.</strong> When several officers must work on the <em>same live records</em> — attendance on one phone, finance on the desktop — connect the club’s own Firebase project in the same card: the club’s <strong>Project ID</strong> and <strong>Web API key</strong> are already filled in (overwrite them only if the club moves to a different Firebase project), so press <strong>Save connection details</strong>, then <strong>Connect Firebase</strong> and sign in with the club’s Firebase account. <strong>Sync now</strong> exchanges records; the switch <strong>Keep this device in sync automatically</strong> uploads every change by itself and collects what the other officers changed within a few minutes; <strong>Upload everything</strong> is for after a restore. Twenty-two collections are shared, while <span class="mono">users</span> (officer accounts), <span class="mono">auditLog</span>, <span class="mono">verifications</span> and <span class="mono">notifications</span> never leave the device.',
        '<strong>Deletions are final.</strong> A record deleted here is marked as deleted immediately, so loading from the shared database never brings it back; the deletion uploads on the next sync. A record deleted by another officer is removed on this device too, unless it was edited here after that — in which case the edit is kept and uploaded.',
        'The app keeps working with no internet: edits are saved here first and uploaded when the connection returns. Where two officers changed the same record, the later edit (compared by its <span class="mono">updatedAt</span> time) wins, and a local edit newer than the shared copy is never thrown away — it is uploaded on the next sync. Setup takes about twenty minutes once (create the project, create the Firestore database, enable Email/Password, paste the security rules); the step-by-step guide is in <strong>docs/FIREBASE.md</strong> and behind <strong>How to set it up</strong> in the app. Other options — Supabase, PocketBase, Turso, a Sheets mirror — are compared in <strong>docs/DATABASE-OPTIONS.md</strong>.',
        'Restore in <em>merge</em> mode to add a backup’s records to what is already there; <em>replace</em> mode wipes first — the app asks for confirmation and shows how many records each option will affect.',
        'A user who forgets their password cannot recover it; an administrator resets it here and tells them the new one.',
        'Deactivating a user immediately ends their access without deleting the audit trail of what they did.'
      ]
    },
    {
      id: 'search-notifications',
      title: 'Search, notifications and shortcuts',
      icon: 'search',
      tagline: 'Getting to a record in two seconds.',
      steps: [
        'Press <kbd>Ctrl</kbd>+<kbd>K</kbd>, press <kbd>/</kbd>, or click the search box in the top bar to open global search.',
        'Type any name, ID, title or keyword. Results are grouped by type — members, cabinet, meetings, courses, projects, activities, certificates, resources, documents — and open the record when you click or press <kbd>Enter</kbd>.',
        'Use the category chips inside the search overlay to narrow the results.',
        'Open the bell icon for the notification centre: upcoming meetings and activities, overdue tasks, course and project deadlines, new announcements, low attendance and report deadlines.',
        'Mark notifications as read individually or all at once; the badge clears when the list is empty.',
        'Click your avatar in the top bar for your profile, settings, certificate verification and sign-out.'
      ],
      table: {
        head: ['Shortcut', 'What it does'],
        rows: [
          ['Ctrl + K / ⌘ + K', 'Open global search'],
          ['/', 'Open global search (when not typing in a field)'],
          ['↑ / ↓', 'Move through search results'],
          ['Enter', 'Open the highlighted result, or submit the open form'],
          ['Esc', 'Close the search overlay, modal or drawer'],
          ['Tab / Shift + Tab', 'Move between controls on the page']
        ]
      }
    },
    {
      id: 'routines',
      title: 'Term routines and best practice',
      icon: 'refresh',
      tagline: 'A simple calendar of club administration.',
      table: {
        head: ['When', 'What to do'],
        rows: [
          ['Start of term', 'Update Settings → academic year and term dates. Register new members and update leavers to Alumni. Confirm the cabinet and appoint vacant positions.'],
          ['Every week', 'Schedule meetings, key in attendance minutes after each session, review open tasks and chase overdue ones.'],
          ['Every month', 'Record income and expenses, print a statement, check attendance against the threshold and follow up members who are falling behind.'],
          ['Before exams', 'Update course progress, mark courses complete and issue completion certificates.'],
          ['End of term', 'Write the termly report, print certificates and ID cards, export CSV copies of the main registers, download a JSON backup and file it with the patron.'],
          ['Once a year', 'Write the annual report, archive completed projects and activities, and record achievements with photographs.']
        ]
      },
      notes: [
        'Keep one person responsible for entering data each week — records are only as good as the routine behind them.',
        'Never delete a record to correct a mistake; edit it, or mark it inactive and add the reason.'
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting and FAQ',
      icon: 'help-circle',
      tagline: 'Answers to the things that come up most often.',
      faq: [
        { q: 'My data disappeared after clearing the browser.', a: 'The app stores everything in this browser. Clearing browsing data removes it. Restore from your JSON backup in Settings → Data; if you have none, the app can re-seed the demo data so you can start again.' },
        { q: 'It says “Storage limit reached”.', a: 'The browser storage quota is full. Export a backup, then delete large attachments (photos, documents, gallery images) you no longer need. Old backups are the usual culprit.' },
        { q: 'A page says “Access restricted”.', a: 'Your role does not include that module. Ask an administrator to review your role in Settings → Users & roles.' },
        { q: 'I cannot print a certificate properly.', a: 'Choose A4 landscape, disable headers and footers in the print dialog, and turn off “Fit to page” so the border is not clipped. The preview shows exactly what will print.' },
        { q: 'Two members have the same name.', a: 'That is fine — records are identified by member ID, not by name. Use the ID or class when searching.' },
        { q: 'Can two people use the app on different computers?', a: 'Yes — connect the Firebase shared database in Settings → Data and every connected device exchanges records automatically, even if the internet keeps dropping. Without it each browser keeps its own copy, moved with Settings → Data → Backup and Restore.' },
        { q: 'Can I use it offline?', a: 'Yes. Once the page has loaded once, no internet connection is needed; all data and code are local.' },
        { q: 'Attendance counts look wrong.', a: 'Check whether the session was recorded twice, and remember the rule: Present ÷ Expected × 100, with Late counting as present and Excused excluded from expected.' }
      ]
    },
    {
      id: 'glossary',
      title: 'Glossary',
      icon: 'info',
      tagline: 'Terms used in the club and in this system.',
      table: {
        head: ['Term', 'Meaning'],
        rows: [
          ['Term', 'One of the three school terms in the Ugandan academic year (Term 1, Term 2, Term 3).'],
          ['Stream', 'A class group, for example S3 Blue — students in the same class can be split into streams.'],
          ['Cabinet', 'The elected club leadership: president, secretary, treasurer, coordinators and representatives, overseen by the patron.'],
          ['Patron', 'The teacher appointed by the school administration to oversee the club.'],
          ['Attendance rate', 'Present ÷ Expected × 100, where late arrivals count as present.'],
          ['Enrolment', 'A member’s registration on a course, with their own progress and status.'],
          ['Certificate number', 'The unique public reference of a certificate, e.g. MRHSICT-2026-CERT-0001, used for verification.'],
          ['Asset ID', 'The unique tag of a piece of club equipment, e.g. MRHS-ICT-EQ-0001.'],
          ['Merge / Replace', 'How a backup is restored: add to existing records, or wipe and restore only the backup.'],
          ['Firebase / Firestore', 'Google’s free hosted database. The club uses it so several officers work on the same live records; the device keeps working offline and uploads when there is internet.'],
          ['Sync now', 'Exchanges records with the shared database: local changes go up, the other officers’ changes come down.'],
          ['Pending changes', 'Records edited here that have not been uploaded yet — usually because the device was offline.'],
          ['Audit log', 'The internal record of changes made in the system, kept for accountability.']
        ]
      }
    }
  ];

  /* ══ Rendering ═════════════════════════════════════════════════════════ */
  function slugOf(s) { return s.id; }

  function matches(section, q) {
    if (!q) return true;
    var hay = [section.title, section.tagline, section.intro].concat(section.steps || []).concat(section.notes || [])
      .concat((section.table ? section.table.rows.map(function (r) { return r.join(' '); }) : []))
      .concat((section.faq ? section.faq.map(function (f) { return f.q + ' ' + f.a; }) : []))
      .join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function sectionHTML(s, index) {
    var num = U.pad(index + 1, 2);
    return '<article class="manual-section" id="manual-' + slugOf(s) + '">' +
      '<header class="manual-section-head">' +
        '<span class="ms-num">' + num + '</span>' +
        '<div><h2>' + Icons.svg(s.icon) + U.esc(s.title) + '</h2>' +
        '<p class="muted">' + U.esc(s.tagline) + '</p></div>' +
      '</header>' +
      '<p class="manual-intro">' + U.esc(s.intro) + '</p>' +
      (s.steps && s.steps.length
        ? '<h3 class="manual-h3">' + Icons.svg('list') + 'Step by step</h3><ol class="manual-steps">' +
          s.steps.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol>'
        : '') +
      (s.table
        ? '<div class="table-wrap stacked mt-2"><table class="data-table manual-table"><thead><tr>' +
          s.table.head.map(function (h) { return '<th>' + U.esc(h) + '</th>'; }).join('') +
          '</tr></thead><tbody>' + s.table.rows.map(function (r) {
            return '<tr>' + r.map(function (c, i) { return '<td data-label="' + U.attr(s.table.head[i]) + '"' + (i === 0 ? ' class="cell-primary"' : '') + '>' + U.esc(c) + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>'
        : '') +
      (s.notes && s.notes.length
        ? '<div class="manual-notes"><h3 class="manual-h3">' + Icons.svg('info') + 'Good to know</h3><ul>' +
          s.notes.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div>'
        : '') +
      (s.faq
        ? '<h3 class="manual-h3">' + Icons.svg('help-circle') + 'Questions and answers</h3><div class="manual-faq">' +
          s.faq.map(function (f) {
            return '<details><summary>' + U.esc(f.q) + '</summary><p>' + U.esc(f.a) + '</p></details>';
          }).join('') + '</div>'
        : '') +
    '</article>';
  }

  function tocHTML(visible) {
    return '<nav class="manual-toc" aria-label="Manual contents">' +
      '<div class="search-field">' + Icons.svg('search') +
        '<input type="search" id="manual-q" class="input" placeholder="Search the manual…" aria-label="Search the manual" value="' + U.attr(state.query) + '">' +
      '</div>' +
      '<p class="manual-toc-label">' + visible + ' of ' + MANUAL.length + ' sections</p>' +
      '<ol class="manual-toc-list">' + MANUAL.map(function (s, i) {
        return '<li class="' + (matches(s, state.query) ? '' : 'is-hidden') + '">' +
          '<a href="#manual-' + slugOf(s) + '" data-manual-jump="' + slugOf(s) + '">' +
          '<span class="toc-num">' + U.pad(i + 1, 2) + '</span>' + U.esc(s.title) + '</a></li>';
      }).join('') + '</ol>' +
      '<div class="manual-toc-foot">' +
        '<button type="button" class="btn btn-outline btn-sm w-full" data-manual-action="print">' + Icons.svg('print', { class: 'btn-ico' }) + 'Print / save as PDF</button>' +
      '</div>' +
    '</nav>';
  }

  function bodyHTML() {
    var list = MANUAL.filter(function (s) { return matches(s, state.query); });
    if (!list.length) {
      return UI.emptyState({
        icon: 'search', title: 'No matching sections',
        message: 'Nothing in the manual matches “' + state.query + '”. Try a module name such as “attendance”, “finance” or “certificates”.',
        actions: '<button type="button" class="btn btn-outline" data-manual-action="clear">' + Icons.svg('x', { class: 'btn-ico' }) + 'Clear search</button>'
      });
    }
    return list.map(function (s) { return sectionHTML(s, MANUAL.indexOf(s)); }).join('');
  }

  /* ══ Print version ═════════════════════════════════════════════════════ */
  function printHTML() {
    var s = Store.settings();
    function strip(html) { return String(html).replace(/<[^>]+>/g, ''); }
    var body = '<div class="print-doc-title"><h1>MRHS ICT Club Master — User Manual</h1>' +
      '<p>' + U.esc(s.clubName || 'MRHS ICT Club') + ' · ' + U.esc(s.schoolName || 'Mbazzi Riverside High School') + '</p>' +
      '<p>Administrator handbook · ' + U.fmtDate(new Date(), 'long') + '</p></div>' +
      '<p>This handbook explains every module in the club management system, who may use it and how the ' +
      'club’s termly routines are handled. All figures and names used in the demonstration data are samples.</p>';

    MANUAL.forEach(function (sec, i) {
      body += '<h2>' + (i + 1) + '. ' + strip(U.esc(sec.title)) + '</h2>' +
        '<p><em>' + strip(U.esc(sec.tagline)) + '</em></p>' +
        '<p>' + strip(U.esc(sec.intro)) + '</p>';
      if (sec.steps && sec.steps.length) {
        body += '<h3>Step by step</h3><ol>' + sec.steps.map(function (t) { return '<li>' + strip(t) + '</li>'; }).join('') + '</ol>';
      }
      if (sec.table) {
        body += '<table><thead><tr>' + sec.table.head.map(function (h) { return '<th>' + strip(U.esc(h)) + '</th>'; }).join('') +
          '</tr></thead><tbody>' + sec.table.rows.map(function (r) {
            return '<tr>' + r.map(function (c) { return '<td>' + strip(U.esc(c)) + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table>';
      }
      if (sec.notes && sec.notes.length) {
        body += '<h3>Good to know</h3><ul>' + sec.notes.map(function (t) { return '<li>' + strip(t) + '</li>'; }).join('') + '</ul>';
      }
      if (sec.faq) {
        body += '<h3>Questions and answers</h3><ul>' + sec.faq.map(function (f) {
          return '<li><strong>' + strip(U.esc(f.q)) + '</strong> — ' + strip(U.esc(f.a)) + '</li>';
        }).join('') + '</ul>';
      }
    });

    body += '<div class="print-sign"><div><div class="line"></div><strong>Prepared by</strong><span>Club Administrator</span></div>' +
      '<div><div class="line"></div><strong>' + U.esc((StoredSignatory() || 'Club Patron')) + '</strong><span>Club Patron</span></div></div>';

    return Print.page(body);
  }
  function StoredSignatory() {
    var s = Store.settings();
    return s.reportSignatory || '';
  }

  /* ══ Route ═════════════════════════════════════════════════════════════ */
  Router.view('/manual', {
    title: 'User Manual', icon: 'book', module: 'manual',
    subtitle: 'The administrator handbook for MRHS ICT CLUB MASTER.',
    render: function (ctx) {
      if (!Auth.can('manual', 'view')) return UI.restricted('manual');
      var visible = MANUAL.filter(function (s) { return matches(s, state.query); }).length;
      var s = Store.settings();

      return '<div class="page">' +
        UI.pageHeader({
          title: 'User Manual', icon: 'book',
          subtitle: 'Everything an administrator needs: every module, every role and the termly routines of the club.',
          actions:
            '<button type="button" class="btn btn-outline" data-manual-action="expand">' + Icons.svg('list', { class: 'btn-ico' }) + 'Show all questions</button>' +
            '<button type="button" class="btn btn-primary" data-manual-action="print">' + Icons.svg('print', { class: 'btn-ico' }) + 'Print manual</button>'
        }) +
        '<div class="manual-hero">' +
          '<span class="manual-hero-ico">' + Icons.svg('book-open', { size: 26 }) + '</span>' +
          '<div><h2>MRHS ICT CLUB MASTER</h2>' +
          '<p>Administrator handbook &middot; ' + U.esc(s.clubName || 'MRHS ICT Club') + ' &middot; ' +
          U.esc((s.currentTerm || 'Term 1') + ' ' + (s.academicYear || '')) + '</p>' +
          '<p class="small muted">' + MANUAL.length + ' sections covering all 21 modules, the eight roles, ' +
          'data backup and the term routine. Visible only to administrators.</p></div>' +
        '</div>' +
        '<div class="manual-layout">' + tocHTML(visible) +
          '<div class="manual-body" id="manual-body">' + bodyHTML() + '</div>' +
        '</div>' +
      '</div>';
    },
    mount: function (ctx, root) {
      var input = root.querySelector('#manual-q');
      if (input) {
        input.addEventListener('input', U.debounce(function () {
          state.query = input.value.trim().toLowerCase();
          var visible = MANUAL.filter(function (s) { return matches(s, state.query); }).length;
          var toc = root.querySelector('.manual-toc');
          var body = root.querySelector('#manual-body');
          var label = root.querySelector('.manual-toc-label');
          if (label) label.textContent = visible + ' of ' + MANUAL.length + ' sections';
          if (toc) toc.querySelectorAll('.manual-toc-list li').forEach(function (li, i) {
            li.classList.toggle('is-hidden', !matches(MANUAL[i], state.query));
          });
          if (body) body.innerHTML = bodyHTML();
          var focused = input.value.length;
          input.focus();
          input.setSelectionRange(focused, focused);
        }, 160));
      }

      root.addEventListener('click', function (e) {
        var jump = e.target.closest('[data-manual-jump]');
        if (jump) {
          e.preventDefault();
          var target = root.querySelector('#manual-' + jump.getAttribute('data-manual-jump'));
          if (target) {
            if (target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            target.classList.add('is-flash');
            setTimeout(function () { target.classList.remove('is-flash'); }, 1400);
          }
          return;
        }
        var action = e.target.closest('[data-manual-action]');
        if (!action) return;
        var kind = action.getAttribute('data-manual-action');
        if (kind === 'print') {
          Print.preview(printHTML(), {
            title: 'User Manual', icon: 'book', subtitle: 'Print or save the administrator handbook as a PDF.',
            fileName: 'mrhs-ict-club-user-manual'
          });
          return;
        }
        if (kind === 'clear') {
          state.query = '';
          Router.refresh();
          return;
        }
        if (kind === 'expand') {
          var any = root.querySelector('details[open]');
          root.querySelectorAll('.manual-faq details').forEach(function (d) { d.open = !any; });
        }
      });
    }
  });

  global.Modules = global.Modules || {};
  global.Modules.Manual = { sections: MANUAL, printHTML: printHTML };
})(window);
