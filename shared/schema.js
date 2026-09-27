/**
 * ICT CLUB MANAGEMENT SYSTEM — shared schema
 * ------------------------------------------
 * This file is the single source of truth for every record type in the system.
 * The API uses it to build SQL, validate payloads and enforce permissions.
 * The web client uses it to render tables, filters, forms and detail views.
 *
 * Field types: text | textarea | number | currency | percentage | date | time |
 *              select | tags | checkbox | email | tel | url | password |
 *              dynamicRef (a reference to a meeting / activity / course / project)
 */

export const OPTION_SETS = {
  departments: [
    'Information Technology',
    'Computer Science',
    'Software Engineering',
    'Information Systems',
    'Computer Engineering',
    'Electrical Engineering',
    'Business & Management',
    'Other'
  ],
  memberRoles: ['Member', 'Cabinet Member', 'Patron', 'Alumni', 'Guest'],
  memberStatus: ['Active', 'Inactive', 'Suspended', 'Alumni'],
  meetingTypes: [
    'General Assembly',
    'Cabinet Meeting',
    'Committee Meeting',
    'Annual General Meeting',
    'Emergency Meeting',
    'Training / Workshop',
    'Special Session'
  ],
  meetingStatus: ['Scheduled', 'In Progress', 'Completed', 'Postponed', 'Cancelled'],
  meetingModes: ['Physical', 'Online', 'Hybrid'],
  attendanceStatus: ['Present', 'Absent', 'Late', 'Excused', 'Left Early'],
  activityCategories: [
    'Workshop',
    'Bootcamp',
    'Hackathon',
    'Competition',
    'Outreach',
    'Community Service',
    'Seminar',
    'Webinar',
    'Tech Talk',
    'Exhibition',
    'Sports',
    'Social Event',
    'Fundraiser',
    'Other'
  ],
  activityStatus: ['Planned', 'Ongoing', 'Completed', 'Postponed', 'Cancelled'],
  courseCategories: [
    'Programming Fundamentals',
    'Web Development',
    'Mobile Development',
    'Data Science',
    'Artificial Intelligence / ML',
    'Cybersecurity',
    'Networking',
    'Cloud Computing',
    'Databases',
    'DevOps',
    'Graphic Design',
    'Digital Marketing',
    'Soft Skills'
  ],
  courseLevels: ['Beginner', 'Intermediate', 'Advanced'],
  courseStatus: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'],
  enrollmentStatus: ['Enrolled', 'Active', 'Completed', 'Dropped', 'Failed'],
  reportTypes: [
    'Activity Report',
    'Meeting Report',
    'Project Report',
    'Financial Report',
    'Progress Report',
    'Membership Report',
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
    'Membership'
  ],
  certificateStatus: ['Draft', 'Pending Approval', 'Issued', 'Revoked'],
  noteCategories: [
    'General',
    'Meeting Notes',
    'Course Notes',
    'Project Notes',
    'Idea',
    'Resource',
    'Announcement',
    'To-Do'
  ],
  noteVisibility: ['Public', 'Cabinet Only', 'Private'],
  noteColors: ['Amber', 'Blue', 'Green', 'Pink', 'Purple', 'Teal'],
  projectCategories: [
    'Web Application',
    'Mobile Application',
    'AI / Machine Learning',
    'Cybersecurity',
    'IoT / Embedded',
    'Networking',
    'Data Analytics',
    'Robotics',
    'Research',
    'Community Tech',
    'Other'
  ],
  projectStatus: ['Idea', 'Planning', 'In Progress', 'In Review', 'Completed', 'On Hold', 'Cancelled'],
  priorities: ['Low', 'Medium', 'High', 'Critical'],
  taskStatus: ['To Do', 'In Progress', 'Blocked', 'In Review', 'Done'],
  projectRoles: ['Project Lead', 'Developer', 'Designer', 'Tester', 'Researcher', 'Documentation', 'Coordinator'],
  cabinetPositions: [
    'President',
    'Vice President',
    'General Secretary',
    'Assistant Secretary',
    'Treasurer',
    'Financial Secretary',
    'Organizing Secretary',
    'Publicity / PR Officer',
    'Technical Lead',
    'Projects Coordinator',
    'Events Coordinator',
    'Academic Coordinator',
    'Welfare Officer',
    'Member'
  ],
  cabinetStatus: ['Active', 'Past', 'Suspended'],
  userRoles: ['admin', 'cabinet', 'member'],
  userStatus: ['active', 'disabled'],
  genders: ['Male', 'Female', 'Other', 'Prefer not to say'],
  yearsOfStudy: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Postgraduate', 'Alumni'],
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
    label: 'Members',
    singular: 'Member',
    icon: 'users',
    group: 'People',
    description: 'Every registered member of the club with their academic and contact details.',
    titleKey: 'full_name',
    subtitleKey: 'reg_number',
    defaultSort: 'full_name',
    listColumns: ['full_name', 'reg_number', 'department', 'year_of_study', 'role', 'status'],
    filters: ['status', 'role', 'department', 'year_of_study', 'gender'],
    write: ['admin', 'cabinet'],
    fields: [
      { key: 'full_name', label: 'Full name', type: 'text', required: true, search: true, placeholder: 'e.g. Amina Yusuf' },
      { key: 'reg_number', label: 'Registration number', type: 'text', search: true, placeholder: 'e.g. ICT/2024/041' },
      { key: 'email', label: 'Email', type: 'email', search: true },
      { key: 'phone', label: 'Phone', type: 'tel', search: true },
      { key: 'gender', label: 'Gender', type: 'select', options: OPTION_SETS.genders },
      { key: 'date_of_birth', label: 'Date of birth', type: 'date', formGroup: 'Personal' },
      { key: 'department', label: 'Department', type: 'select', options: OPTION_SETS.departments },
      { key: 'program', label: 'Program / Course of study', type: 'text', placeholder: 'e.g. BSc Information Technology' },
      { key: 'year_of_study', label: 'Year of study', type: 'select', options: OPTION_SETS.yearsOfStudy },
      { key: 'role', label: 'Club role', type: 'select', options: OPTION_SETS.memberRoles, default: 'Member' },
      { key: 'status', label: 'Membership status', type: 'select', options: OPTION_SETS.memberStatus, default: 'Active' },
      { key: 'join_date', label: 'Date joined', type: 'date' },
      { key: 'skills', label: 'Skills', type: 'tags', search: true, help: 'Comma separated, e.g. Python, Networking, Design', formGroup: 'Profile' },
      { key: 'interests', label: 'Interests', type: 'tags', help: 'Comma separated' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'emergency_contact', label: 'Emergency contact', type: 'text' },
      { key: 'photo_url', label: 'Photo URL', type: 'url' },
      { key: 'bio', label: 'Bio / Notes', type: 'textarea' },
      NOW
    ]
  },
  {
    key: 'cabinet',
    table: 'cabinet',
    label: 'Cabinet',
    singular: 'Cabinet Position',
    icon: 'crown',
    group: 'People',
    description: 'Executive committee (cabinet) members and their terms of office.',
    titleKey: 'position',
    subtitleKey: 'term',
    defaultSort: 'order_index',
    listColumns: ['position', 'member_id', 'term', 'start_date', 'end_date', 'status'],
    filters: ['position', 'term', 'status'],
    write: ['admin', 'cabinet'],
    fields: [
      { key: 'position', label: 'Position', type: 'select', options: OPTION_SETS.cabinetPositions, required: true },
      { key: 'member_id', label: 'Member', type: 'ref', resource: 'members', required: true, search: true },
      { key: 'term', label: 'Term / Academic year', type: 'text', required: true, placeholder: 'e.g. 2025/2026', search: true },
      { key: 'start_date', label: 'Start date', type: 'date' },
      { key: 'end_date', label: 'End date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: OPTION_SETS.cabinetStatus, default: 'Active' },
      { key: 'contact_email', label: 'Official email', type: 'email' },
      { key: 'order_index', label: 'Display order', type: 'number', default: 99, help: 'Lower numbers appear first (President = 1)' },
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
    group: 'Operations',
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
      { key: 'venue', label: 'Venue', type: 'text', search: true },
      { key: 'mode', label: 'Mode', type: 'select', options: OPTION_SETS.meetingModes, default: 'Physical' },
      { key: 'meeting_link', label: 'Online link', type: 'url' },
      { key: 'chairperson_id', label: 'Chairperson', type: 'ref', resource: 'members' },
      { key: 'secretary_id', label: 'Minute taker', type: 'ref', resource: 'members' },
      { key: 'status', label: 'Status', type: 'select', options: OPTION_SETS.meetingStatus, default: 'Scheduled' },
      { key: 'agenda', label: 'Agenda', type: 'textarea', formGroup: 'Records', rows: 5 },
      { key: 'minutes', label: 'Minutes', type: 'textarea', formGroup: 'Records', rows: 7 },
      { key: 'decisions', label: 'Resolutions / Decisions', type: 'textarea', formGroup: 'Records', rows: 5 },
      { key: 'action_items', label: 'Action items', type: 'textarea', formGroup: 'Records', rows: 4, help: 'One action per line, e.g. "Amina — design flyer — 30 Sep"' },
      NOW
    ]
  },
  {
    key: 'activities',
    table: 'activities',
    label: 'Activities',
    singular: 'Activity',
    icon: 'sparkles',
    group: 'Operations',
    description: 'Workshops, hackathons, outreach events and everything else the club runs.',
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
    label: 'Courses',
    singular: 'Course',
    icon: 'book',
    group: 'Learning',
    description: 'Training programmes and courses offered by the club.',
    titleKey: 'title',
    subtitleKey: 'code',
    defaultSort: '-start_date',
    listColumns: ['title', 'code', 'category', 'level', 'instructor', 'start_date', 'status'],
    filters: ['category', 'level', 'status', 'mode'],
    write: ['admin', 'cabinet'],
    fields: [
      { key: 'title', label: 'Course title', type: 'text', required: true, search: true },
      { key: 'code', label: 'Course code', type: 'text', search: true, placeholder: 'e.g. WEB-101' },
      { key: 'category', label: 'Category', type: 'select', options: OPTION_SETS.courseCategories, required: true },
      { key: 'level', label: 'Level', type: 'select', options: OPTION_SETS.courseLevels, default: 'Beginner' },
      { key: 'instructor', label: 'Instructor', type: 'text', search: true },
      { key: 'instructor_contact', label: 'Instructor contact', type: 'text' },
      { key: 'start_date', label: 'Start date', type: 'date' },
      { key: 'end_date', label: 'End date', type: 'date' },
      { key: 'schedule', label: 'Schedule', type: 'text', placeholder: 'e.g. Tue & Thu, 4:00 – 6:00 PM' },
      { key: 'duration_hours', label: 'Duration (hours)', type: 'number' },
      { key: 'venue', label: 'Venue', type: 'text' },
      { key: 'mode', label: 'Mode', type: 'select', options: OPTION_SETS.meetingModes, default: 'Physical' },
      { key: 'capacity', label: 'Capacity', type: 'number', default: 30 },
      { key: 'fee', label: 'Fee', type: 'currency' },
      { key: 'certificate_enabled', label: 'Issues certificate', type: 'checkbox', default: 1, help: 'Learners who complete can be issued a certificate' },
      { key: 'status', label: 'Status', type: 'select', options: OPTION_SETS.courseStatus, default: 'Upcoming' },
      { key: 'description', label: 'Description', type: 'textarea', rows: 4 },
      { key: 'syllabus', label: 'Syllabus / Outline', type: 'textarea', rows: 6, help: 'One topic per line' },
      NOW
    ]
  },
  {
    key: 'enrollments',
    table: 'enrollments',
    label: 'Enrollments',
    singular: 'Enrollment',
    icon: 'userPlus',
    group: 'Learning',
    description: 'Which members are taking which course, with their progress and results.',
    titleKey: 'member_id',
    subtitleKey: 'course_id',
    defaultSort: '-created_at',
    listColumns: ['course_id', 'member_id', 'enrolled_date', 'progress', 'score', 'status'],
    filters: ['status', 'course_id', 'member_id'],
    write: ['admin', 'cabinet'],
    fields: [
      { key: 'course_id', label: 'Course', type: 'ref', resource: 'courses', required: true },
      { key: 'member_id', label: 'Member', type: 'ref', resource: 'members', required: true, search: true },
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
    listColumns: ['session_date', 'session_title', 'member_id', 'status', 'check_in_time', 'remarks'],
    filters: ['status', 'ref_type', 'member_id'],
    write: ['admin', 'cabinet'],
    fields: [
      { key: 'member_id', label: 'Member', type: 'ref', resource: 'members', required: true, search: true },
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
    key: 'reports',
    table: 'reports',
    label: 'Reports',
    singular: 'Report',
    icon: 'file',
    group: 'Administration',
    description: 'Official club reports with a review and approval workflow.',
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
      { key: 'period', label: 'Reporting period', type: 'text', placeholder: 'e.g. Sept 2026 or Semester 1 2025/2026', search: true },
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
    description: 'Issued certificates, awards and their verification codes.',
    titleKey: 'title',
    subtitleKey: 'certificate_no',
    defaultSort: '-issue_date',
    listColumns: ['certificate_no', 'title', 'recipient_id', 'type', 'issue_date', 'status'],
    filters: ['type', 'status', 'recipient_id'],
    write: ['admin', 'cabinet'],
    fields: [
      { key: 'certificate_no', label: 'Certificate no.', type: 'text', search: true, help: 'Leave blank to auto-generate', placeholder: 'auto' },
      { key: 'title', label: 'Certificate title', type: 'text', required: true, search: true, placeholder: 'e.g. Certificate of Completion — Web Development' },
      { key: 'type', label: 'Certificate type', type: 'select', options: OPTION_SETS.certificateTypes, required: true },
      { key: 'recipient_id', label: 'Recipient', type: 'ref', resource: 'members', required: true },
      { key: 'related_type', label: 'Related to', type: 'select', options: OPTION_SETS.dynamicRefTypes },
      { key: 'related_id', label: 'Related record', type: 'dynamicRef', dependsOn: 'related_type', labelKey: 'related_label' },
      { key: 'related_label', label: 'Related record name', type: 'text', virtual: true, search: true },
      { key: 'issue_date', label: 'Issue date', type: 'date' },
      { key: 'issued_by', label: 'Issued by', type: 'text', default: 'ICT Club' },
      { key: 'signed_by', label: 'Signed by', type: 'text', placeholder: 'e.g. Club Patron' },
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
    label: 'Notes',
    singular: 'Note',
    icon: 'note',
    group: 'Workspace',
    description: 'Shared knowledge base: meeting notes, ideas, resources and reminders.',
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
      { key: 'category', label: 'Category', type: 'select', options: OPTION_SETS.noteCategories, default: 'General' },
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
      { key: 'tech_stack', label: 'Tech stack', type: 'tags', search: true, help: 'Comma separated, e.g. React, Node.js, MongoDB' },
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
      { key: 'member_id', label: 'Member', type: 'ref', resource: 'members', required: true },
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
      { key: 'member_id', label: 'Linked member', type: 'ref', resource: 'members', help: 'Connect this account to a member profile' },
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
  { label: 'Operations', items: ['meetings', 'activities'] },
  { label: 'Learning', items: ['courses', 'enrollments', 'attendance'] },
  { label: 'Workspace', items: ['projects', 'project_tasks', 'notes'] },
  { label: 'Administration', items: ['reports', 'certificates', 'settings'] }
]
