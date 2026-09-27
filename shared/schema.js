/**
 * ICT CLUB MANAGEMENT SYSTEM — shared schema
 * ------------------------------------------
 * Built for a SECONDARY SCHOOL ICT club: students are grouped by class
 * (S1–S6), stream and house, supervised by a teacher patron, and club dues
 * are tracked per term.
 *
 * This file is the single source of truth for every record type in the system.
 * The API uses it to build SQL, validate payloads and enforce permissions.
 * The web client uses it to render tables, filters, forms and detail views.
 *
 * Field types: text | textarea | number | currency | percentage | date | time |
 *              select | tags | checkbox | email | tel | url | password |
 *              dynamicRef (a reference to a meeting / activity / course / project)
 */

export const OPTION_SETS = {
  /* Secondary school structure (Ugandan system: Senior 1 – Senior 6) */
  classes: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  sections: ['Lower Secondary (O-Level)', 'Upper Secondary (A-Level)', 'Staff', 'Alumni'],
  streams: ['A', 'B', 'C', 'D', 'East', 'West'],
  houses: ['Kilimanjaro', 'Kenya', 'Rwenzori', 'Elgon', 'Moroto', 'Bwindi'],
  terms: ['Term 1', 'Term 2', 'Term 3'],
  subjects: [
    'Computer Studies',
    'ICT',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Geography',
    'History',
    'Literature',
    'Languages',
    'Business Studies',
    'Fine Art',
    'Music',
    'Physical Education'
  ],
  memberRoles: ['Student Member', 'Executive', 'Teacher Patron', 'Alumni', 'Guest'],
  memberStatus: ['Active', 'Inactive', 'Suspended', 'Left School', 'Alumni'],
  meetingTypes: [
    'General Meeting',
    'Executive Meeting',
    'Committee Meeting',
    'Class Representatives Meeting',
    'Training Session',
    'Special Session',
    'Annual General Meeting',
    'Emergency Meeting',
    'Patrons Meeting'
  ],
  meetingStatus: ['Scheduled', 'In Progress', 'Completed', 'Postponed', 'Cancelled'],
  meetingModes: ['Physical', 'Online', 'Hybrid'],
  attendanceStatus: ['Present', 'Absent', 'Late', 'Excused', 'Left Early'],
  activityCategories: [
    'Workshop',
    'Training',
    'Bootcamp',
    'Hackathon',
    'Inter-house Competition',
    'Inter-school Competition',
    'Coding Challenge',
    'Exhibition',
    'ICT Week',
    'Career Day',
    'Science & Innovation Fair',
    'Outreach',
    'Community Service',
    'Assembly Presentation',
    'Study Tour',
    'Fundraiser',
    'Social Event',
    'Club Day',
    'Other'
  ],
  activityStatus: ['Planned', 'Ongoing', 'Completed', 'Postponed', 'Cancelled'],
  courseCategories: [
    'Computer Basics',
    'Typing & MS Office',
    'Programming Fundamentals',
    'Web Design',
    'Graphic Design',
    'Networking',
    'Cybersecurity Awareness',
    'Online Safety',
    'Robotics',
    'Electronics',
    'Digital Literacy',
    'Video & Photo Editing',
    'Artificial Intelligence Basics',
    'Web Development'
  ],
  courseLevels: ['Beginner', 'Intermediate', 'Advanced'],
  courseStatus: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'],
  enrollmentStatus: ['Enrolled', 'Active', 'Completed', 'Dropped', 'Failed'],
  reportTypes: [
    'Term Report',
    'Activity Report',
    'Meeting Report',
    'Project Report',
    'Finance Report',
    'Progress Report',
    'Membership Report',
    'Class Representatives Report',
    'Incident Report',
    'Monthly Report',
    'Annual Report'
  ],
  reportStatus: ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Archived'],
  certificateTypes: [
    'Participation',
    'Completion',
    'Achievement',
    'Appreciation',
    'Leadership',
    'Award',
    'Best Student',
    'Competition Winner',
    'Membership'
  ],
  certificateStatus: ['Draft', 'Pending Approval', 'Issued', 'Revoked'],
  noteCategories: [
    'General',
    'Club Announcement',
    'Meeting Notes',
    'Course Notes',
    'Project Notes',
    'Idea',
    'Resource',
    'To-Do',
    'Examination Tips'
  ],
  noteVisibility: ['Public', 'Executive Only', 'Private'],
  noteColors: ['Amber', 'Blue', 'Green', 'Pink', 'Purple', 'Teal'],
  projectCategories: [
    'Web Application',
    'Mobile Application',
    'School System',
    'AI / Machine Learning',
    'Cybersecurity',
    'IoT / Embedded',
    'Robotics',
    'Networking',
    'Data Analytics',
    'Research',
    'Community Tech',
    'Other'
  ],
  projectStatus: ['Idea', 'Planning', 'In Progress', 'In Review', 'Completed', 'On Hold', 'Cancelled'],
  priorities: ['Low', 'Medium', 'High', 'Critical'],
  taskStatus: ['To Do', 'In Progress', 'Blocked', 'In Review', 'Done'],
  projectRoles: ['Project Lead', 'Developer', 'Designer', 'Tester', 'Researcher', 'Documentation', 'Coordinator'],
  cabinetPositions: [
    'Chairperson',
    'Vice Chairperson',
    'General Secretary',
    'Assistant Secretary',
    'Treasurer',
    'Organizing Secretary',
    'Publicity Secretary',
    'Projects Coordinator',
    'Class Representative',
    'Teacher Patron',
    'Member'
  ],
  cabinetStatus: ['Active', 'Past', 'Suspended'],
  duesStatus: ['Paid', 'Partial', 'Unpaid', 'Exempt'],
  paymentMethods: ['Cash', 'Mobile Money', 'Bank Transfer', 'Cheque', 'Other'],
  userRoles: ['admin', 'cabinet', 'member'],
  userStatus: ['active', 'disabled'],
  genders: ['Male', 'Female', 'Other', 'Prefer not to say'],
  dynamicRefTypes: [
    { value: 'meeting', label: 'Meeting', resource: 'meetings' },
    { value: 'activity', label: 'Activity', resource: 'activities' },
    { value: 'course', label: 'Course', resource: 'courses' },
    { value: 'project', label: 'Project', resource: 'projects' }
  ]
}

const NOW = { key: 'created_at', label: 'Created', type: 'date', list: true, readOnly: true, defaultSort: true }

/** Returns the fields a client may submit (everything except computed/read-only ones). */
export function writableFields(resource) {
  return resource.fields.filter((f) => !f.readOnly && !f.virtual)
}

export function fieldMap(resource) {
  return Object.fromEntries(resource.fields.map((f) => [f.key, f]))
}

/* ------------------------------------------------------------------ */
/* RESOURCES                                                           */
/* ------------------------------------------------------------------ */

export const RESOURCES = [
  {
    key: 'members',
    table: 'members',
    label: 'Students',
    singular: 'Student',
    icon: 'users',
    group: 'People',
    description: 'Every registered club member — students, executives, the teacher patron and alumni.',
    titleKey: 'full_name',
    subtitleKey: 'admission_number',
    defaultSort: 'full_name',
    listColumns: ['full_name', 'admission_number', 'class_level', 'stream', 'house', 'role', 'status'],
    filters: ['status', 'role', 'class_level', 'stream', 'house', 'gender'],
    write: ['admin', 'cabinet'],
    fields: [
      { key: 'full_name', label: 'Full name', type: 'text', required: true, search: true, placeholder: 'e.g. Nakato Sarah' },
      { key: 'admission_number', label: 'Admission number', type: 'text', search: true, placeholder: 'e.g. 2026/S1/014' },
      { key: 'class_level', label: 'Class', type: 'select', options: OPTION_SETS.classes, help: 'Required for students — leave blank for staff and alumni' },
      { key: 'stream', label: 'Stream', type: 'select', options: OPTION_SETS.streams },
      { key: 'house', label: 'House', type: 'select', options: OPTION_SETS.houses },
      { key: 'role', label: 'Club role', type: 'select', options: OPTION_SETS.memberRoles, default: 'Student Member' },
      { key: 'status', label: 'Membership status', type: 'select', options: OPTION_SETS.memberStatus, default: 'Active' },
      { key: 'gender', label: 'Gender', type: 'select', options: OPTION_SETS.genders },
      { key: 'date_of_birth', label: 'Date of birth', type: 'date', formGroup: 'Personal' },
      { key: 'email', label: 'Student email', type: 'email', search: true, help: 'Optional — many students use the guardian’s email' },
      { key: 'phone', label: 'Student phone', type: 'tel', search: true, help: 'Optional' },
      { key: 'address', label: 'Home address / village', type: 'text' },
      { key: 'guardian_name', label: 'Parent / Guardian name', type: 'text', search: true, formGroup: 'Parent or guardian' },
      { key: 'guardian_phone', label: 'Parent / Guardian phone', type: 'tel', search: true, formGroup: 'Parent or guardian' },
      { key: 'guardian_relationship', label: 'Relationship', type: 'text', placeholder: 'e.g. Mother, Father, Uncle', formGroup: 'Parent or guardian' },
      { key: 'join_date', label: 'Date joined the club', type: 'date', formGroup: 'Club details' },
      { key: 'skills', label: 'Skills', type: 'tags', search: true, help: 'Comma separated, e.g. Typing, Scratch, Python, Design', formGroup: 'Club details' },
      { key: 'interests', label: 'Interests', type: 'tags', help: 'Comma separated, e.g. Robotics, Web design, Gaming', formGroup: 'Club details' },
      { key: 'photo_url', label: 'Photo URL', type: 'url', formGroup: 'Club details' },
      { key: 'bio', label: 'Bio / Notes', type: 'textarea', formGroup: 'Club details' },
      NOW
    ]
  },
  {
    key: 'cabinet',
    table: 'cabinet',
    label: 'Executive Committee',
    singular: 'Executive Position',
    icon: 'crown',
    group: 'People',
    description: 'The club cabinet (executive committee) — positions, terms of office and responsibilities.',
    titleKey: 'position',
    subtitleKey: 'term',
    defaultSort: 'order_index',
    listColumns: ['position', 'member_id', 'term', 'start_date', 'end_date', 'status'],
    filters: ['position', 'term', 'status'],
    write: ['admin', 'cabinet'],
    fields: [
      { key: 'position', label: 'Position', type: 'select', options: OPTION_SETS.cabinetPositions, required: true },
      { key: 'member_id', label: 'Student / teacher', type: 'ref', resource: 'members', required: true, search: true },
      { key: 'term', label: 'Academic year / term', type: 'text', required: true, placeholder: 'e.g. 2026 Term 1', search: true },
      { key: 'start_date', label: 'Start date', type: 'date' },
      { key: 'end_date', label: 'End date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: OPTION_SETS.cabinetStatus, default: 'Active' },
      { key: 'contact_email', label: 'Official email', type: 'email' },
      { key: 'order_index', label: 'Display order', type: 'number', default: 99, help: 'Lower numbers appear first (Chairperson = 1)' },
      { key: 'responsibilities', label: 'Responsibilities', type: 'textarea' },
      { key: 'achievements', label: 'Key achievements', type: 'textarea' },
      NOW
    ]
  },
  {
    key: 'meetings',
    table: 'meetings',
    label: 'Meetings',
    singular: 'Meeting',
    icon: 'calendar',
    group: 'Club Operations',
    description: 'Agendas, minutes, decisions and attendance for every club meeting.',
    titleKey: 'title',
    subtitleKey: 'date',
    defaultSort: '-date',
    listColumns: ['title', 'type', 'date', 'start_time', 'venue', 'mode', 'status'],
    filters: ['type', 'status', 'mode'],
    write: ['admin', 'cabinet'],
    fields: [
      { key: 'title', label: 'Meeting title', type: 'text', required: true, search: true },
      { key: 'type', label: 'Meeting type', type: 'select', options: OPTION_SETS.meetingTypes, required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'start_time', label: 'Start time', type: 'time' },
      { key: 'end_time', label: 'End time', type: 'time' },
      { key: 'venue', label: 'Venue', type: 'text', search: true, placeholder: 'e.g. ICT Lab, Assembly Hall' },
      { key: 'mode', label: 'Mode', type: 'select', options: OPTION_SETS.meetingModes, default: 'Physical' },
      { key: 'meeting_link', label: 'Online link', type: 'url' },
      { key: 'chairperson_id', label: 'Chairperson', type: 'ref', resource: 'members' },
      { key: 'secretary_id', label: 'Minute taker', type: 'ref', resource: 'members' },
      { key: 'status', label: 'Status', type: 'select', options: OPTION_SETS.meetingStatus, default: 'Scheduled' },
      { key: 'agenda', label: 'Agenda', type: 'textarea', formGroup: 'Records', rows: 5 },
      { key: 'minutes', label: 'Minutes', type: 'textarea', formGroup: 'Records', rows: 7 },
      { key: 'decisions', label: 'Resolutions / Decisions', type: 'textarea', formGroup: 'Records', rows: 5 },
      { key: 'action_items', label: 'Action items', type: 'textarea', formGroup: 'Records', rows: 4, help: 'One action per line, e.g. "Sarah — design poster — 30 Sep"' },
      NOW
    ]
  },
  {
    key: 'activities',
    table: 'activities',
    label: 'Activities',
    singular: 'Activity',
    icon: 'sparkles',
    group: 'Club Operations',
    description: 'Competitions, workshops, ICT week, outreach and every other activity the club runs.',
    titleKey: 'title',
    subtitleKey: 'date',
    defaultSort: '-date',
    listColumns: ['title', 'category', 'date', 'venue', 'budget', 'status'],
    filters: ['category', 'status', 'mode'],
    write: ['admin', 'cabinet'],
    fields: [
      { key: 'title', label: 'Activity title', type: 'text', required: true, search: true },
      { key: 'category', label: 'Category', type: 'select', options: OPTION_SETS.activityCategories, required: true },
      { key: 'date', label: 'Start date', type: 'date', required: true },
      { key: 'end_date', label: 'End date', type: 'date' },
      { key: 'start_time', label: 'Start time', type: 'time' },
      { key: 'end_time', label: 'End time', type: 'time' },
      { key: 'venue', label: 'Venue', type: 'text', search: true },
      { key: 'mode', label: 'Mode', type: 'select', options: OPTION_SETS.meetingModes, default: 'Physical' },
      { key: 'organizer_id', label: 'Lead organizer', type: 'ref', resource: 'members' },
      { key: 'partner', label: 'Partner / Sponsor', type: 'text', search: true },
      { key: 'budget', label: 'Budget', type: 'currency' },
      { key: 'spent', label: 'Amount spent', type: 'currency' },
      { key: 'expected_participants', label: 'Expected participants', type: 'number' },
      { key: 'actual_participants', label: 'Actual participants', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: OPTION_SETS.activityStatus, default: 'Planned' },
      { key: 'description', label: 'Description', type: 'textarea', formGroup: 'Details', rows: 4 },
      { key: 'outcomes', label: 'Outcomes / Highlights', type: 'textarea', formGroup: 'Details', rows: 4 },
      NOW
    ]
  },
  {
    key: 'courses',
    table: 'courses',
    label: 'Courses & Trainings',
    singular: 'Course',
    icon: 'book',
    group: 'Learning',
    description: 'ICT skills courses and training programmes run by the club for students.',
    titleKey: 'title',
    subtitleKey: 'code',
    defaultSort: '-start_date',
    listColumns: ['title', 'code', 'category', 'level', 'instructor', 'start_date', 'status'],
    filters: ['category', 'level', 'status', 'mode'],
    write: ['admin', 'cabinet'],
    fields: [
      { key: 'title', label: 'Course title', type: 'text', required: true, search: true },
      { key: 'code', label: 'Course code', type: 'text', search: true, placeholder: 'e.g. ICT-101' },
      { key: 'category', label: 'Category', type: 'select', options: OPTION_SETS.courseCategories, required: true },
      { key: 'level', label: 'Level', type: 'select', options: OPTION_SETS.courseLevels, default: 'Beginner' },
      { key: 'instructor', label: 'Trainer / Teacher', type: 'text', search: true },
      { key: 'instructor_contact', label: 'Trainer contact', type: 'text' },
      { key: 'start_date', label: 'Start date', type: 'date' },
      { key: 'end_date', label: 'End date', type: 'date' },
      { key: 'schedule', label: 'Schedule', type: 'text', placeholder: 'e.g. Wednesdays, 4:00 – 6:00 PM (after classes)' },
      { key: 'duration_hours', label: 'Duration (hours)', type: 'number' },
      { key: 'venue', label: 'Venue', type: 'text', placeholder: 'e.g. ICT Lab 1' },
      { key: 'mode', label: 'Mode', type: 'select', options: OPTION_SETS.meetingModes, default: 'Physical' },
      { key: 'capacity', label: 'Capacity', type: 'number', default: 30 },
      { key: 'fee', label: 'Fee', type: 'currency' },
      { key: 'certificate_enabled', label: 'Issues certificate', type: 'checkbox', default: 1, help: 'Students who complete the course can be issued a certificate' },
      { key: 'status', label: 'Status', type: 'select', options: OPTION_SETS.courseStatus, default: 'Upcoming' },
      { key: 'description', label: 'Description', type: 'textarea', rows: 4 },
      { key: 'syllabus', label: 'Syllabus / Outline', type: 'textarea', rows: 6, help: 'One topic per line' },
      NOW
    ]
  },
  {
    key: 'enrollments',
    table: 'enrollments',
    label: 'Course Register',
    singular: 'Registration',
    icon: 'userPlus',
    group: 'Learning',
    description: 'Which student is taking which course, with attendance progress, score and remarks.',
    titleKey: 'member_id',
    subtitleKey: 'course_id',
    defaultSort: '-created_at',
    listColumns: ['course_id', 'member_id', 'class_level', 'enrolled_date', 'progress', 'score', 'status'],
    filters: ['status', 'course_id', 'member_id'],
    write: ['admin', 'cabinet'],
    fields: [
      { key: 'course_id', label: 'Course', type: 'ref', resource: 'courses', required: true },
      { key: 'member_id', label: 'Student', type: 'ref', resource: 'members', required: true, search: true },
      { key: 'class_level', label: 'Class', type: 'text', virtual: true },
      { key: 'enrolled_date', label: 'Enrolled on', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: OPTION_SETS.enrollmentStatus, default: 'Enrolled' },
      { key: 'progress', label: 'Progress', type: 'percentage', default: 0 },
      { key: 'score', label: 'Score / Grade', type: 'text', placeholder: 'e.g. 87% or A' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', rows: 3 },
      NOW
    ]
  },
  {
    key: 'attendance',
    table: 'attendance',
    label: 'Attendance',
    singular: 'Attendance Record',
    icon: 'check',
    group: 'Learning',
    description: 'Attendance registers for meetings, activities and course sessions.',
    titleKey: 'session_title',
    subtitleKey: 'session_date',
    defaultSort: '-session_date',
    listColumns: ['session_date', 'session_title', 'member_id', 'class_level', 'status', 'check_in_time'],
    filters: ['status', 'ref_type', 'member_id'],
    write: ['admin', 'cabinet'],
    fields: [
      { key: 'member_id', label: 'Student', type: 'ref', resource: 'members', required: true, search: true },
      { key: 'class_level', label: 'Class', type: 'text', virtual: true },
      { key: 'ref_type', label: 'Session type', type: 'select', options: OPTION_SETS.dynamicRefTypes, required: true, default: 'meeting' },
      { key: 'ref_id', label: 'Session', type: 'dynamicRef', dependsOn: 'ref_type', labelKey: 'ref_label' },
      { key: 'ref_label', label: 'Session name', type: 'text', virtual: true, search: true },
      { key: 'session_title', label: 'Session title', type: 'text', required: true, search: true, help: 'Auto-filled from the session you pick' },
      { key: 'session_date', label: 'Date', type: 'date', required: true },
      { key: 'status', label: 'Status', type: 'select', options: OPTION_SETS.attendanceStatus, required: true, default: 'Present' },
      { key: 'check_in_time', label: 'Check-in time', type: 'time' },
      { key: 'remarks', label: 'Remarks', type: 'textarea', rows: 3 },
      { key: 'recorded_by_id', label: 'Recorded by', type: 'ref', resource: 'members' },
      NOW
    ]
  },
  {
    key: 'dues',
    table: 'dues',
    label: 'Club Dues',
    singular: 'Dues Record',
    icon: 'wallet',
    group: 'Finance',
    description: 'Subscription / dues payments per student, term and academic year.',
    titleKey: 'member_id',
    subtitleKey: 'term',
    defaultSort: '-created_at',
    listColumns: ['member_id', 'class_level', 'term', 'academic_year', 'amount_due', 'amount_paid', 'balance', 'status'],
    filters: ['status', 'term', 'academic_year', 'method'],
    write: ['admin', 'cabinet'],
    fields: [
      { key: 'member_id', label: 'Student', type: 'ref', resource: 'members', required: true, search: true },
      { key: 'class_level', label: 'Class', type: 'text', virtual: true },
      { key: 'term', label: 'Term', type: 'select', options: OPTION_SETS.terms, required: true, default: 'Term 1' },
      { key: 'academic_year', label: 'Academic year', type: 'text', required: true, placeholder: 'e.g. 2026', search: true },
      { key: 'amount_due', label: 'Amount due', type: 'currency', required: true, default: 10000 },
      { key: 'amount_paid', label: 'Amount paid', type: 'currency', default: 0 },
      { key: 'balance', label: 'Balance', type: 'currency', virtual: true },
      { key: 'status', label: 'Status', type: 'select', options: OPTION_SETS.duesStatus, default: 'Unpaid', help: 'Updated automatically from the amount paid' },
      { key: 'payment_date', label: 'Payment date', type: 'date' },
      { key: 'method', label: 'Payment method', type: 'select', options: OPTION_SETS.paymentMethods, default: 'Cash' },
      { key: 'receipt_no', label: 'Receipt number', type: 'text', search: true },
      { key: 'remarks', label: 'Remarks', type: 'textarea', rows: 3 },
      { key: 'recorded_by_id', label: 'Received by', type: 'ref', resource: 'members' },
      NOW
    ]
  },
  {
    key: 'reports',
    table: 'reports',
    label: 'Reports',
    singular: 'Report',
    icon: 'file',
    group: 'Administration',
    description: 'Term reports, activity reports and finance reports with a review and approval workflow.',
    titleKey: 'title',
    subtitleKey: 'period',
    defaultSort: '-created_at',
    listColumns: ['title', 'type', 'author_id', 'period', 'status', 'submitted_at'],
    filters: ['type', 'status', 'author_id'],
    write: ['admin', 'cabinet'],
    memberWrite: true,
    ownerKey: 'author_id',
    fields: [
      { key: 'title', label: 'Report title', type: 'text', required: true, search: true },
      { key: 'type', label: 'Report type', type: 'select', options: OPTION_SETS.reportTypes, required: true },
      { key: 'period', label: 'Reporting period', type: 'text', placeholder: 'e.g. Term 1 2026', search: true },
      { key: 'author_id', label: 'Prepared by', type: 'ref', resource: 'members' },
      { key: 'related_type', label: 'Related to', type: 'select', options: OPTION_SETS.dynamicRefTypes, help: 'Optional — link this report to a session or project' },
      { key: 'related_id', label: 'Related record', type: 'dynamicRef', dependsOn: 'related_type', labelKey: 'related_label' },
      { key: 'related_label', label: 'Related record name', type: 'text', virtual: true, search: true },
      { key: 'summary', label: 'Executive summary', type: 'textarea', rows: 3 },
      { key: 'content', label: 'Full report', type: 'textarea', rows: 12, formGroup: 'Content' },
      { key: 'file_url', label: 'Attachment / file link', type: 'url', formGroup: 'Content' },
      { key: 'status', label: 'Status', type: 'select', options: OPTION_SETS.reportStatus, default: 'Draft' },
      { key: 'submitted_at', label: 'Date submitted', type: 'date' },
      { key: 'reviewed_by_id', label: 'Reviewed by', type: 'ref', resource: 'members' },
      { key: 'review_comments', label: 'Review comments', type: 'textarea', rows: 3 },
      NOW
    ]
  },
  {
    key: 'certificates',
    table: 'certificates',
    label: 'Certificates',
    singular: 'Certificate',
    icon: 'award',
    group: 'Administration',
    description: 'Certificates, awards and prizes issued to students, with verification codes.',
    titleKey: 'title',
    subtitleKey: 'certificate_no',
    defaultSort: '-issue_date',
    listColumns: ['certificate_no', 'title', 'recipient_id', 'type', 'issue_date', 'status'],
    filters: ['type', 'status', 'recipient_id'],
    write: ['admin', 'cabinet'],
    fields: [
      { key: 'certificate_no', label: 'Certificate no.', type: 'text', search: true, help: 'Leave blank to auto-generate', placeholder: 'auto' },
      { key: 'title', label: 'Certificate title', type: 'text', required: true, search: true, placeholder: 'e.g. Certificate of Completion — Computer Basics' },
      { key: 'type', label: 'Certificate type', type: 'select', options: OPTION_SETS.certificateTypes, required: true },
      { key: 'recipient_id', label: 'Recipient (student)', type: 'ref', resource: 'members', required: true },
      { key: 'related_type', label: 'Related to', type: 'select', options: OPTION_SETS.dynamicRefTypes },
      { key: 'related_id', label: 'Related record', type: 'dynamicRef', dependsOn: 'related_type', labelKey: 'related_label' },
      { key: 'related_label', label: 'Related record name', type: 'text', virtual: true, search: true },
      { key: 'issue_date', label: 'Issue date', type: 'date' },
      { key: 'issued_by', label: 'Issued by', type: 'text', default: 'ICT Club' },
      { key: 'signed_by', label: 'Signed by', type: 'text', placeholder: 'e.g. Head Teacher / Club Patron' },
      { key: 'grade', label: 'Grade / Remark', type: 'text', placeholder: 'e.g. Distinction' },
      { key: 'description', label: 'Citation', type: 'textarea', rows: 4, help: 'Text printed on the certificate body' },
      { key: 'status', label: 'Status', type: 'select', options: OPTION_SETS.certificateStatus, default: 'Issued' },
      { key: 'verification_code', label: 'Verification code', type: 'text', readOnly: true },
      NOW
    ]
  },
  {
    key: 'notes',
    table: 'notes',
    label: 'Notes & Announcements',
    singular: 'Note',
    icon: 'note',
    group: 'Workspace',
    description: 'Announcements, meeting notes, revision tips, ideas and resources for the club.',
    titleKey: 'title',
    subtitleKey: 'category',
    defaultSort: '-created_at',
    listColumns: ['title', 'category', 'author_id', 'visibility', 'pinned', 'created_at'],
    filters: ['category', 'visibility', 'pinned', 'author_id'],
    write: ['admin', 'cabinet'],
    memberWrite: true,
    ownerKey: 'author_id',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, search: true },
      { key: 'category', label: 'Category', type: 'select', options: OPTION_SETS.noteCategories, default: 'Club Announcement' },
      { key: 'content', label: 'Note', type: 'textarea', required: true, rows: 10, search: true },
      { key: 'tags', label: 'Tags', type: 'tags', search: true, help: 'Comma separated' },
      { key: 'author_id', label: 'Author', type: 'ref', resource: 'members' },
      { key: 'visibility', label: 'Visibility', type: 'select', options: OPTION_SETS.noteVisibility, default: 'Public' },
      { key: 'color', label: 'Colour', type: 'select', options: OPTION_SETS.noteColors, default: 'Amber' },
      { key: 'pinned', label: 'Pin to top', type: 'checkbox', default: 0 },
      { key: 'link_url', label: 'Reference link', type: 'url' },
      NOW,
      { key: 'updated_at', label: 'Updated', type: 'date', readOnly: true }
    ]
  },
  {
    key: 'projects',
    table: 'projects',
    label: 'Projects',
    singular: 'Project',
    icon: 'rocket',
    group: 'Workspace',
    description: 'Club projects with teams, tasks, milestones and progress tracking.',
    titleKey: 'title',
    subtitleKey: 'category',
    defaultSort: '-created_at',
    listColumns: ['title', 'category', 'lead_id', 'status', 'priority', 'progress', 'deadline'],
    filters: ['status', 'category', 'priority', 'lead_id'],
    write: ['admin', 'cabinet'],
    memberWrite: true,
    fields: [
      { key: 'title', label: 'Project title', type: 'text', required: true, search: true },
      { key: 'category', label: 'Category', type: 'select', options: OPTION_SETS.projectCategories, default: 'Web Application' },
      { key: 'description', label: 'Description', type: 'textarea', rows: 4, search: true },
      { key: 'objectives', label: 'Objectives', type: 'textarea', rows: 4, help: 'One objective per line' },
      { key: 'tech_stack', label: 'Tools / Tech used', type: 'tags', search: true, help: 'Comma separated, e.g. Scratch, Python, HTML, Canva' },
      { key: 'lead_id', label: 'Project lead', type: 'ref', resource: 'members' },
      { key: 'status', label: 'Status', type: 'select', options: OPTION_SETS.projectStatus, default: 'Planning' },
      { key: 'priority', label: 'Priority', type: 'select', options: OPTION_SETS.priorities, default: 'Medium' },
      { key: 'progress', label: 'Progress', type: 'percentage', default: 0 },
      { key: 'start_date', label: 'Start date', type: 'date' },
      { key: 'deadline', label: 'Deadline', type: 'date' },
      { key: 'completed_date', label: 'Completed on', type: 'date' },
      { key: 'repo_url', label: 'Repository URL', type: 'url' },
      { key: 'demo_url', label: 'Demo / live URL', type: 'url' },
      { key: 'budget', label: 'Budget', type: 'currency' },
      { key: 'sponsor', label: 'Sponsor / Partner', type: 'text' },
      NOW
    ]
  },
  {
    key: 'project_members',
    table: 'project_members',
    label: 'Project Team',
    singular: 'Team Member',
    icon: 'users',
    group: 'Workspace',
    description: 'Who works on which project and in what role.',
    titleKey: 'member_id',
    subtitleKey: 'role',
    defaultSort: '-created_at',
    listColumns: ['project_id', 'member_id', 'role', 'joined_date'],
    filters: ['project_id', 'role', 'member_id'],
    write: ['admin', 'cabinet'],
    memberWrite: true,
    ownerKey: 'member_id',
    fields: [
      { key: 'project_id', label: 'Project', type: 'ref', resource: 'projects', required: true },
      { key: 'member_id', label: 'Student', type: 'ref', resource: 'members', required: true },
      { key: 'role', label: 'Role in project', type: 'select', options: OPTION_SETS.projectRoles, default: 'Developer' },
      { key: 'joined_date', label: 'Joined on', type: 'date' },
      { key: 'contribution', label: 'Contribution notes', type: 'textarea', rows: 3 },
      NOW
    ]
  },
  {
    key: 'project_tasks',
    table: 'project_tasks',
    label: 'Project Tasks',
    singular: 'Task',
    icon: 'checkSquare',
    group: 'Workspace',
    description: 'Task board used to deliver projects on time.',
    titleKey: 'title',
    subtitleKey: 'status',
    defaultSort: '-created_at',
    listColumns: ['title', 'project_id', 'assignee_id', 'due_date', 'priority', 'status'],
    filters: ['status', 'priority', 'project_id', 'assignee_id'],
    write: ['admin', 'cabinet'],
    memberWrite: true,
    ownerKey: 'assignee_id',
    fields: [
      { key: 'project_id', label: 'Project', type: 'ref', resource: 'projects', required: true },
      { key: 'title', label: 'Task', type: 'text', required: true, search: true },
      { key: 'description', label: 'Details', type: 'textarea', rows: 3, search: true },
      { key: 'assignee_id', label: 'Assigned to', type: 'ref', resource: 'members' },
      { key: 'status', label: 'Status', type: 'select', options: OPTION_SETS.taskStatus, default: 'To Do' },
      { key: 'priority', label: 'Priority', type: 'select', options: OPTION_SETS.priorities, default: 'Medium' },
      { key: 'due_date', label: 'Due date', type: 'date' },
      { key: 'progress', label: 'Progress', type: 'percentage', default: 0 },
      { key: 'estimated_hours', label: 'Estimated hours', type: 'number' },
      { key: 'actual_hours', label: 'Actual hours', type: 'number' },
      NOW
    ]
  },
  {
    key: 'users',
    table: 'users',
    label: 'User Accounts',
    singular: 'User Account',
    icon: 'shield',
    group: 'Administration',
    description: 'Login accounts and access levels for the system.',
    titleKey: 'name',
    subtitleKey: 'email',
    defaultSort: 'name',
    listColumns: ['name', 'email', 'role', 'member_id', 'status', 'last_login'],
    filters: ['role', 'status'],
    write: ['admin'],
    hidden: true,
    fields: [
      { key: 'name', label: 'Full name', type: 'text', required: true, search: true },
      { key: 'email', label: 'Login email', type: 'email', required: true, search: true },
      { key: 'password', label: 'Password', type: 'password', help: 'Leave blank when editing to keep the current password' },
      { key: 'role', label: 'Access level', type: 'select', options: OPTION_SETS.userRoles, required: true, default: 'member' },
      { key: 'member_id', label: 'Linked student / teacher', type: 'ref', resource: 'members', help: 'Connect this account to a member profile' },
      { key: 'status', label: 'Account status', type: 'select', options: OPTION_SETS.userStatus, default: 'active' },
      NOW,
      { key: 'last_login', label: 'Last login', type: 'date', readOnly: true }
    ]
  }
]

export const RESOURCE_MAP = Object.fromEntries(RESOURCES.map((r) => [r.key, r]))

export function resourceByKey(key) {
  return RESOURCE_MAP[key] || null
}

/** Fields used for full-text style searching on a resource. */
export function searchFields(resource) {
  const keys = resource.fields.filter((f) => f.search && !f.virtual).map((f) => f.key)
  return keys.length ? keys : [resource.titleKey]
}

/** Ref fields that need a LEFT JOIN (key -> target resource). */
export function refFields(resource) {
  return resource.fields.filter((f) => f.type === 'ref')
}

export const ROLE_LEVEL = { member: 1, cabinet: 2, admin: 3 }

export function canWrite(resource, role, isOwner = true) {
  if (!resource) return false
  if (role === 'admin') return true
  const allowed = resource.write || ['admin', 'cabinet']
  if (allowed.includes(role)) return true
  if (role === 'member' && resource.memberWrite && isOwner) return true
  return false
}

/* ------------------------------------------------------------------ */
/* DASHBOARD / UI GROUPS                                               */
/* ------------------------------------------------------------------ */

export const NAV_GROUPS = [
  { label: 'Overview', items: ['dashboard'] },
  { label: 'People', items: ['members', 'cabinet'] },
  { label: 'Club Operations', items: ['meetings', 'activities'] },
  { label: 'Learning', items: ['courses', 'enrollments', 'attendance'] },
  { label: 'Finance', items: ['dues'] },
  { label: 'Workspace', items: ['projects', 'project_tasks', 'notes'] },
  { label: 'Administration', items: ['reports', 'certificates', 'settings'] }
]
