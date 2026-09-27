/**
 * Demo data loader for a SECONDARY SCHOOL ICT club.
 *   npm run db:seed      → seed only when the database is empty
 *   npm run db:reset     → wipe everything and seed again
 */
import { all, db, get, insert, run, saveSettings, DEFAULT_SETTINGS, logActivity } from './db.js'
import { hashPassword } from './auth.js'
import { OPTION_SETS } from '../../shared/schema.js'

const RESET = process.argv.includes('--reset')

/* Deterministic pseudo-random generator so demo data is stable. */
let seedState = 20260101
function rand() {
  seedState = (seedState * 1103515245 + 12345) % 2147483648
  return seedState / 2147483648
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min
const chance = (p) => rand() < p

const TODAY = new Date()
const iso = (d) => d.toISOString().slice(0, 10)
const shift = (days) => {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + days)
  return iso(d)
}

const TABLES = [
  'activity_log', 'sessions', 'project_tasks', 'project_members', 'projects', 'notes', 'certificates',
  'reports', 'dues', 'attendance', 'enrollments', 'courses', 'activities', 'meetings', 'cabinet',
  'members', 'users', 'settings'
]

function wipe() {
  for (const table of TABLES) run(`DELETE FROM ${table}`)
  run('DELETE FROM sqlite_sequence')
  console.log('  • database cleared')
}

/* ------------------------------------------------------------------ */
/* School data pools                                                   */
/* ------------------------------------------------------------------ */

const FIRST_NAMES = [
  'Sarah', 'Brian', 'Grace', 'Emmanuel', 'Faith', 'Peter', 'Joan', 'Daniel', 'Aisha', 'Mark',
  'Ivan', 'Mercy', 'Denis', 'Rita', 'Ronald', 'Patience', 'Samuel', 'Esther', 'Collins', 'Doreen',
  'Sharon', 'Timothy', 'Brenda', 'Isaac', 'Prossy', 'Aaron', 'Sandra', 'Elijah', 'Winnie', 'Gerald',
  'Naomi', 'Fredrick', 'Jackline', 'Moses', 'Rebecca', 'Trevor', 'Sylvia', 'Nicholas', 'Betty', 'Edwin'
]
const LAST_NAMES = [
  'Nakato', 'Okello', 'Mugisha', 'Achieng', 'Kato', 'Namusoke', 'Byaruhanga', 'Apio', 'Tumusiime', 'Nsubuga',
  'Nabukenya', 'Wanyama', 'Amanya', 'Kiyingi', 'Nabbosa', 'Ochieng', 'Amongin', 'Ssemakula', 'Nyakato', 'Barasa',
  'Kabuye', 'Atim', 'Musinguzi', 'Adeke', 'Odongo', 'Nakiganda', 'Kaggwa', 'Namuli', 'Rubangakene', 'Zawedde'
]
const SKILLS = [
  'Typing', 'MS Word', 'MS Excel', 'PowerPoint', 'Scratch', 'Python basics', 'HTML', 'CSS', 'Canva',
  'Video editing', 'Public speaking', 'Graphic design', 'Networking basics', 'Computer repair',
  'Spreadsheets', 'Google Docs', 'Robotics', 'Photography', 'Presentations', 'Research'
]
const INTERESTS = [
  'Robotics', 'Coding', 'Web design', 'Gaming', 'Esports', 'Graphic design', 'Music tech', 'Video editing',
  'Photography', 'Cybersecurity', 'Artificial intelligence', 'Animation', 'Digital art', 'Blogging', 'Quiz'
]
const HOUSES = OPTION_SETS.houses
const CLASSES = OPTION_SETS.classes
const STREAMS = ['A', 'B', 'C']
const CLASS_JOIN_YEAR = { S1: 0, S2: 1, S3: 2, S4: 3, S5: 4, S6: 5 }
const CLASS_COUNT = { S1: 16, S2: 15, S3: 14, S4: 12, S5: 10, S6: 8 }

function randomSkills(min = 2, max = 5) {
  const set = new Set()
  const n = int(min, max)
  while (set.size < n) set.add(pick(SKILLS))
  return [...set].join(', ')
}

function randomInterests() {
  const set = new Set()
  const n = int(1, 3)
  while (set.size < n) set.add(pick(INTERESTS))
  return [...set].join(', ')
}

function guardianName(studentSurname) {
  const parentFirst = pick(['Mr.', 'Mrs.', 'Ms.'])
  return `${parentFirst} ${pick(FIRST_NAMES)} ${studentSurname}`
}

/* ------------------------------------------------------------------ */
/* Seed steps                                                          */
/* ------------------------------------------------------------------ */

function seedSettings() {
  saveSettings({
    ...DEFAULT_SETTINGS,
    club_name: 'ICT Club',
    club_tagline: 'Learn • Create • Innovate',
    institution: 'St. Bernard Secondary School',
    academic_year: '2026',
    current_term: 'Term 1',
    currency: 'UGX',
    contact_email: 'ictclub@stbernard.sc.ug',
    contact_phone: '+256 772 123 456',
    meeting_frequency: 'Every Wednesday, 4:00 PM at the ICT Lab',
    attendance_target: '75',
    dues_per_term: '10000',
    patron_name: 'Mr. Ssekandi John'
  })
  console.log('  • club settings (school name, current term, dues per term)')
}

function seedUsers() {
  const accounts = [
    { name: 'Mr. Ssekandi John', email: 'admin@school.ac.ug', password: 'admin123', role: 'admin' },
    { name: 'Sarah Nakato', email: 'executive@school.ac.ug', password: 'executive123', role: 'cabinet' },
    { name: 'Brian Okello', email: 'member@school.ac.ug', password: 'member123', role: 'member' }
  ]
  const ids = {}
  for (const account of accounts) {
    ids[account.role] = insert('users', {
      name: account.name,
      email: account.email,
      password_hash: hashPassword(account.password),
      role: account.role,
      status: 'active'
    })
  }
  console.log('  • 3 user accounts (admin@school.ac.ug / admin123, executive@school.ac.ug / executive123, member@school.ac.ug / member123)')
  return ids
}

function seedMembers() {
  const members = []
  const thisYear = TODAY.getFullYear()

  /* Teacher patrons first (staff) */
  const teachers = [
    { full_name: 'Mr. Ssekandi John', gender: 'Male', role: 'Teacher Patron', skills: 'Networking, Computer repair, Teaching' },
    { full_name: 'Ms. Auma Betty', gender: 'Female', role: 'Teacher Patron', skills: 'Programming, Databases, Teaching' },
    { full_name: 'Mr. Kizito Andrew', gender: 'Male', role: 'Teacher Patron', skills: 'Electronics, Robotics, Teaching' }
  ]
  for (const [index, teacher] of teachers.entries()) {
    const id = insert('members', {
      full_name: teacher.full_name,
      admission_number: `STAFF/${String(index + 1).padStart(3, '0')}`,
      class_level: null,
      stream: null,
      house: null,
      role: teacher.role,
      status: 'Active',
      gender: teacher.gender,
      email: `${teacher.full_name.replace(/^(Mr\.|Ms\.|Mrs\.)\s*/, '').toLowerCase().replace(/\s+/g, '.')}@stbernard.sc.ug`,
      phone: `+256 77${int(1, 9)} ${int(100, 999)} ${int(100, 999)}`,
      address: 'Staff quarters',
      join_date: shift(-int(400, 1200)),
      skills: teacher.skills,
      interests: 'Mentoring, ICT education',
      bio: 'Teacher patron of the ICT Club.'
    })
    members.push({ id, full_name: teacher.full_name, role: teacher.role, class_level: null, status: 'Active', staff: true })
  }

  /* Students, class by class */
  let counter = 0
  for (const classLevel of CLASSES) {
    const count = CLASS_COUNT[classLevel]
    for (let i = 0; i < count; i += 1) {
      counter += 1
      const surname = pick(LAST_NAMES)
      const name = `${pick(FIRST_NAMES)} ${surname}`
      const stream = classLevel === 'S5' || classLevel === 'S6' ? pick(['East', 'West']) : pick(STREAMS)
      const joinYear = thisYear - CLASS_JOIN_YEAR[classLevel]
      const status = chance(0.94) ? 'Active' : pick(['Inactive', 'Left School'])
      const id = insert('members', {
        full_name: name,
        admission_number: `${joinYear}/${classLevel}/${String(counter).padStart(3, '0')}`,
        class_level: classLevel,
        stream,
        house: HOUSES[(i + CLASSES.indexOf(classLevel)) % HOUSES.length],
        role: 'Student Member',
        status,
        gender: chance(0.52) ? 'Female' : 'Male',
        date_of_birth: `${thisYear - 13 - CLASS_JOIN_YEAR[classLevel]}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
        email: chance(0.25) ? `${name.toLowerCase().replace(/\s+/g, '.')}@student.stbernard.sc.ug` : null,
        phone: chance(0.3) ? `+256 7${int(0, 8)} ${int(100, 999)} ${int(100, 999)}` : null,
        address: pick(['Kampala', 'Nansana', 'Kira', 'Wakiso', 'Entebbe', 'Mukono', 'Seeta', 'Gayaza']),
        guardian_name: guardianName(surname),
        guardian_phone: `+256 7${int(0, 8)} ${int(100, 999)} ${int(100, 999)}`,
        guardian_relationship: pick(['Mother', 'Father', 'Guardian', 'Aunt', 'Uncle']),
        join_date: shift(-int(20, 300)),
        skills: randomSkills(1, 4),
        interests: randomInterests(),
        bio: `${classLevel}${stream ? ` ${stream}` : ''} student and ICT Club member.`
      })
      members.push({ id, full_name: name, class_level: classLevel, stream, status, role: 'Student Member' })
    }
  }

  /* A few alumni who still help out */
  for (let i = 0; i < 4; i += 1) {
    const surname = pick(LAST_NAMES)
    const name = `${pick(FIRST_NAMES)} ${surname}`
    const id = insert('members', {
      full_name: name,
      admission_number: `${thisYear - 7}/S6/${String(900 + i).padStart(3, '0')}`,
      class_level: null,
      stream: null,
      house: pick(HOUSES),
      role: 'Alumni',
      status: 'Alumni',
      gender: chance(0.5) ? 'Female' : 'Male',
      guardian_name: guardianName(surname),
      guardian_phone: `+256 7${int(0, 8)} ${int(100, 999)} ${int(100, 999)}`,
      join_date: shift(-int(700, 1400)),
      skills: randomSkills(3, 6),
      interests: randomInterests(),
      bio: 'Old student who mentors current club members.'
    })
    members.push({ id, full_name: name, class_level: null, status: 'Alumni', role: 'Alumni' })
  }

  const students = members.filter((m) => m.role === 'Student Member')
  console.log(`  • ${members.length} members (${students.length} students, ${teachers.length} teacher patrons, 4 alumni)`)
  return members
}

function seedCabinet(members, userIds) {
  const students = members.filter((m) => m.role === 'Student Member' && m.status === 'Active')
  const patron = members.find((m) => m.role === 'Teacher Patron')

  // Put the demo logins on known people.
  const sarah = students[0]
  const brian = students[1]
  run('UPDATE users SET member_id = ? WHERE id = ?', [patron.id, userIds.admin])
  run('UPDATE users SET member_id = ? WHERE id = ?', [sarah.id, userIds.cabinet])
  run('UPDATE users SET member_id = ? WHERE id = ?', [brian.id, userIds.member])

  const leadership = [
    ['Chairperson', sarah, 1, 'Chairs all club meetings, represents the club to the school administration and leads the executive committee.'],
    ['Vice Chairperson', students[2], 2, 'Deputises the chairperson and coordinates the class representatives.'],
    ['General Secretary', students[3], 3, 'Keeps minutes, maintains the club register and handles correspondence.'],
    ['Assistant Secretary', students[4], 4, 'Supports minute taking and keeps the attendance records.'],
    ['Treasurer', students[5], 5, 'Collects club dues, keeps financial records and prepares the finance report.'],
    ['Organizing Secretary', students[6], 6, 'Plans meetings, competitions and ICT Week logistics.'],
    ['Publicity Secretary', students[7], 7, 'Designs posters and announcements and manages the club notice board.'],
    ['Projects Coordinator', students[8], 8, 'Oversees club projects and the project teams.'],
    ['Teacher Patron', patron, 9, 'Guides the club, approves activities and supervises the ICT lab sessions.']
  ]

  let count = 0
  for (const [position, member, order, responsibilities] of leadership) {
    if (!member) continue
    insert('cabinet', {
      position,
      member_id: member.id,
      term: '2026',
      start_date: shift(-60),
      end_date: shift(300),
      status: 'Active',
      contact_email: `${position.split(' ')[0].toLowerCase()}@ictclub.stbernard.sc.ug`,
      order_index: order,
      responsibilities,
      achievements: chance(0.5) ? pick([
        'Organised the inter-house coding challenge.',
        'Restarted the weekly computer lab sessions.',
        'Raised club dues collection to over 70%.',
        'Led the club to the regional ICT competition.'
      ]) : null
    })
    count += 1
  }

  // Class representatives — one per class.
  for (const [index, classLevel] of CLASSES.entries()) {
    const rep = students.find((s) => s.class_level === classLevel)
    if (!rep) continue
    insert('cabinet', {
      position: 'Class Representative',
      member_id: rep.id,
      term: '2026',
      start_date: shift(-60),
      end_date: shift(300),
      status: 'Active',
      order_index: 20 + index,
      responsibilities: `Represents ${classLevel} students at club meetings and shares information with the class.`
    })
    count += 1
  }

  // Previous executive committee (kept for history).
  const past = students.slice(10, 14)
  ;[['Chairperson', 1], ['General Secretary', 3], ['Treasurer', 5]].forEach(([position, order], index) => {
    const member = past[index]
    if (!member) return
    insert('cabinet', {
      position,
      member_id: member.id,
      term: '2025',
      start_date: shift(-420),
      end_date: shift(-60),
      status: 'Past',
      order_index: order,
      responsibilities: 'Served on the 2025 executive committee.'
    })
    count += 1
  })

  console.log(`  • ${count} executive committee records (including class representatives and the 2025 committee)`)
}

function seedMeetings(members) {
  const exec = members.filter((m) => m.role === 'Student Member' && m.status === 'Active')
  const patron = members.find((m) => m.role === 'Teacher Patron')
  const data = [
    ['Term 1 Opening General Meeting', 'General Meeting', -70, 'Completed', '1. Opening prayer and welcome\n2. Report of last term\n3. Term 1 plan and calendar\n4. Registration of new members\n5. A.O.B'],
    ['Executive Committee Meeting — Term 1 Plan', 'Executive Meeting', -62, 'Completed', '1. Roles and responsibilities\n2. Term 1 activities calendar\n3. Dues collection plan\n4. Course registration'],
    ['Class Representatives Briefing', 'Class Representatives Meeting', -55, 'Completed', '1. Sharing information with classes\n2. Class attendance lists\n3. Sourcing new members'],
    ['Hands-on Session: Introduction to Scratch', 'Training Session', -48, 'Completed', '1. What is programming?\n2. Scratch interface\n3. Making a sprite move\n4. Practice exercise'],
    ['Executive Committee Meeting — ICT Week', 'Executive Meeting', -35, 'Completed', '1. ICT Week programme\n2. Budget and requirements\n3. Inter-house competition rules\n4. Publicity'],
    ['General Meeting — ICT Week Briefing', 'General Meeting', -28, 'Completed', '1. ICT Week programme\n2. Competition categories\n3. Lab rules during the week\n4. A.O.B'],
    ['Patrons Meeting — Term 1 Review', 'Patrons Meeting', -18, 'Completed', '1. Review of club activities\n2. Discipline and lab usage\n3. Support needed from the school\n4. Term 2 outlook'],
    ['Hands-on Session: Typing Speed Test', 'Training Session', -10, 'Completed', '1. Correct typing posture\n2. Speed test\n3. Setting personal targets'],
    ['Executive Committee Meeting — Term 1 Closing', 'Executive Meeting', 3, 'Scheduled', '1. Term 1 report\n2. Finance report and dues status\n3. Certificate list\n4. Term 2 planning'],
    ['End of Term General Meeting', 'General Meeting', 8, 'Scheduled', '1. Term 1 report presentation\n2. Awarding of certificates\n3. Announcements for the holiday\n4. A.O.B'],
    ['Annual General Meeting — Election of Executives', 'Annual General Meeting', 95, 'Scheduled', '1. Annual report\n2. Finance report\n3. Election of the new executive committee\n4. Handover'],
    ['Emergency Meeting — Computer Lab Repair', 'Emergency Meeting', -20, 'Cancelled', '1. Report on damaged computers\n2. Immediate measures']
  ]

  const created = []
  for (const [title, type, offset, status, agenda] of data) {
    const date = shift(offset)
    const isPast = offset < 0 && status === 'Completed'
    const id = insert('meetings', {
      title,
      type,
      date,
      start_time: pick(['14:00', '15:30', '16:00']),
      end_time: pick(['16:00', '17:00', '17:30']),
      venue: pick(['ICT Lab 1', 'ICT Lab 2', 'Assembly Hall', 'Library', 'Classroom S3A']),
      mode: chance(0.08) ? 'Hybrid' : 'Physical',
      meeting_link: chance(0.08) ? 'https://meet.google.com/school-ict-club' : null,
      chairperson_id: exec[0]?.id ?? null,
      secretary_id: exec[3]?.id ?? null,
      status,
      agenda,
      minutes: isPast
        ? `The meeting was called to order at ${pick(['2:05', '3:35', '4:02'])} PM by the chairperson. Present: ${int(20, 60)} members and ${chance(0.5) ? 'the teacher patron' : '2 teacher patrons'}.\n\nThe agenda was read and adopted. Each item was discussed as recorded below.\n\nThe meeting was closed at ${pick(['4:55', '5:30', '5:05'])} PM with a prayer.`
        : null,
      decisions: isPast
        ? pick([
            '1. Approved the Term 1 activities calendar.\n2. Club dues set at UGX 10,000 per term.\n3. Weekly meetings every Wednesday at 4:00 PM.',
            '1. Inter-house coding challenge confirmed for ICT Week.\n2. Two computers to be repaired.\n3. Class representatives to submit attendance lists weekly.',
            '1. Course registration open to all classes.\n2. Certificate list to be ready before end of term.\n3. Publicity secretary to design posters.'
          ])
        : null,
      action_items: isPast
        ? pick([
            'Sarah — share the term calendar — 2 days\nBrian — collect dues from S1 and S2 — 1 week\nMercy — design ICT Week poster — 5 days',
            'Denis — confirm computer repairs with the technician — 3 days\nGrace — update the club register — 2 days\nPeter — prepare Scratch training materials — 4 days'
          ])
        : null
    })
    created.push({ id, title, date, status, type })
  }
  console.log(`  • ${created.length} meetings`)
  return created
}

function seedActivities(members) {
  const students = members.filter((m) => m.role === 'Student Member' && m.status === 'Active')
  const data = [
    ['Inter-house Coding Challenge', 'Inter-house Competition', -42, 'Completed', 250000, 218000],
    ['ICT Week 2026', 'ICT Week', -38, 'Completed', 700000, 665000],
    ['Regional Inter-school ICT Competition', 'Inter-school Competition', -30, 'Completed', 300000, 292000],
    ['Digital Safety Assembly Talk', 'Assembly Presentation', -25, 'Completed', 40000, 35000],
    ['Career Day — Careers in ICT', 'Career Day', -22, 'Completed', 120000, 110000],
    ['Science & Innovation Fair Project Display', 'Science & Innovation Fair', -15, 'Completed', 180000, 172000],
    ['Basic Computer Skills Outreach — Community', 'Community Service', -12, 'Completed', 90000, 82000],
    ['Robotics Demonstration for Parents', 'Exhibition', -8, 'Completed', 60000, 55000],
    ['Typing Championship — Inter-class', 'Coding Challenge', -5, 'Completed', 70000, 61000],
    ['ICT Quiz — General Knowledge', 'Inter-house Competition', -3, 'Completed', 45000, 38000],
    ['Term 2 Coding Bootcamp (Scratch & Python)', 'Bootcamp', 12, 'Planned', 320000, 0],
    ['Inter-house Website Design Challenge', 'Coding Challenge', 21, 'Planned', 150000, 0],
    ['ICT Week 2026 — Term 2 Edition', 'ICT Week', 40, 'Planned', 750000, 0],
    ['Inter-school Competition — National Level', 'Inter-school Competition', 58, 'Planned', 450000, 0],
    ['Study Tour to a Software Company', 'Study Tour', 66, 'Planned', 600000, 0],
    ['Fundraising Drive — New Lab Computers', 'Fundraiser', 30, 'Planned', 0, 0]
  ]
  const created = []
  for (const [title, category, offset, status, budget, spent] of data) {
    const date = shift(offset)
    const expected = int(30, 120)
    const id = insert('activities', {
      title,
      category,
      date,
      end_date: chance(0.4) ? shift(offset + int(1, 2)) : date,
      start_time: pick(['08:00', '10:00', '11:00', '14:00']),
      end_time: pick(['12:00', '13:00', '16:00', '17:00']),
      venue: pick(['ICT Lab 1', 'ICT Lab 2', 'Assembly Hall', 'School Playground', 'Main Hall', 'Library']),
      mode: chance(0.1) ? 'Hybrid' : 'Physical',
      organizer_id: pick(students).id,
      partner: chance(0.45) ? pick(['School Administration', 'PTA', 'Old Students Association', 'A local ICT company', 'Parents']) : null,
      budget,
      spent: status === 'Completed' ? spent : 0,
      expected_participants: expected,
      actual_participants: status === 'Completed' ? Math.max(15, expected - int(0, 25)) : null,
      status,
      description: `${title} organised by the ICT Club${category.includes('Competition') ? ' to develop competitive coding and ICT skills among students' : ' as part of the club programme for the term'}.`,
      outcomes: status === 'Completed' ? pick([
        'Students competed in four houses; Kilimanjaro house won the overall trophy.',
        'Over 80 students took part and the event was appreciated by the school administration.',
        'Parents who attended praised the robotics demonstration.',
        'Three new project ideas came out of the event and are being developed by members.',
        'Participants received certificates during the assembly.'
      ]) : null
    })
    created.push({ id, title, category, date, status, house: null })
  }
  console.log(`  • ${created.length} activities`)
  return created
}

function seedCourses(members) {
  const data = [
    ['Computer Basics', 'ICT-101', 'Computer Basics', 'Beginner', 'Ms. Auma Betty', 'Completed', 30, 40],
    ['Typing & MS Office (Word, Excel, PowerPoint)', 'ICT-102', 'Typing & MS Office', 'Beginner', 'Mr. Ssekandi John', 'Ongoing', 34, 40],
    ['Scratch Programming for Beginners', 'ICT-201', 'Programming Fundamentals', 'Beginner', 'Mr. Kizito Andrew', 'Ongoing', 26, 30],
    ['Web Design with HTML & CSS', 'ICT-202', 'Web Design', 'Intermediate', 'Ms. Auma Betty', 'Ongoing', 18, 25],
    ['Graphic Design with Canva', 'ICT-203', 'Graphic Design', 'Beginner', 'Sarah Nakato', 'Completed', 22, 30],
    ['Online Safety & Cybersecurity Awareness', 'ICT-204', 'Online Safety', 'Beginner', 'Mr. Ssekandi John', 'Completed', 40, 60],
    ['Python Programming Basics', 'ICT-205', 'Programming Fundamentals', 'Intermediate', 'Ms. Auma Betty', 'Upcoming', 14, 20],
    ['Robotics & Electronics Club', 'ICT-206', 'Robotics', 'Intermediate', 'Mr. Kizito Andrew', 'Ongoing', 12, 15],
    ['Video & Photo Editing', 'ICT-207', 'Video & Photo Editing', 'Beginner', 'Peter Mugisha', 'Upcoming', 10, 20],
    ['Computer Networking Basics', 'ICT-208', 'Networking', 'Intermediate', 'Mr. Ssekandi John', 'Upcoming', 8, 20],
    ['Digital Literacy for Class Representatives', 'ICT-103', 'Digital Literacy', 'Beginner', 'Sarah Nakato', 'Completed', 24, 40]
  ]
  const created = []
  for (const [title, code, category, level, instructor, status, enrolledTarget, capacity] of data) {
    const start = shift(status === 'Completed' ? -int(70, 110) : status === 'Ongoing' ? -int(14, 45) : int(7, 30))
    const weeks = int(6, 10)
    const id = insert('courses', {
      title,
      code,
      category,
      level,
      instructor,
      instructor_contact: chance(0.6) ? `${instructor.toLowerCase().split(' ').pop()}@stbernard.sc.ug` : null,
      start_date: start,
      end_date: shift(status === 'Completed' ? -int(3, 25) : status === 'Ongoing' ? int(7, 25) : 30 + weeks * 7),
      schedule: pick(['Wednesdays, 4:00 – 6:00 PM', 'Tuesdays & Thursdays, 4:00 – 5:30 PM', 'Saturdays, 9:00 – 11:00 AM', 'Fridays, 3:30 – 5:00 PM']),
      duration_hours: weeks * 3,
      venue: pick(['ICT Lab 1', 'ICT Lab 2', 'Classroom S2A', 'Library']),
      mode: chance(0.1) ? 'Online' : 'Physical',
      capacity,
      fee: pick([0, 0, 2000, 5000]),
      certificate_enabled: 1,
      status,
      description: `${title} — a ${level.toLowerCase()} level course for club members, taught after classes in the ICT lab.`,
      syllabus: ['Introduction and expectations', 'Core skills practice', 'Guided exercises', 'Project work', 'Assessment', 'Certificate presentation'].join('\n')
    })
    created.push({ id, title, code, status, instructor, enrolledTarget })
  }
  console.log(`  • ${created.length} courses`)
  return created
}

function seedEnrollments(courses, members) {
  const students = members.filter((m) => m.role === 'Student Member' && m.status === 'Active')
  let count = 0
  for (const course of courses) {
    const learners = []
    while (learners.length < Math.min(course.enrolledTarget, students.length)) {
      const student = pick(students)
      if (!learners.includes(student)) learners.push(student)
    }
    for (const student of learners) {
      let status = 'Enrolled'
      let progress = int(0, 10)
      let score = null
      if (course.status === 'Completed') {
        const roll = rand()
        if (roll < 0.75) {
          status = 'Completed'
          progress = 100
          score = `${int(60, 98)}%`
        } else if (roll < 0.9) {
          status = 'Active'
          progress = int(40, 90)
        } else {
          status = 'Dropped'
          progress = int(5, 35)
        }
      } else if (course.status === 'Ongoing') {
        status = chance(0.85) ? 'Active' : 'Enrolled'
        progress = int(15, 85)
        score = chance(0.25) ? `${int(55, 95)}%` : null
      }
      insert('enrollments', {
        course_id: course.id,
        member_id: student.id,
        enrolled_date: shift(-int(10, 100)),
        status,
        progress,
        score,
        remarks: status === 'Dropped'
          ? pick(['Stopped attending due to prep classes.', 'Transferred to another course.'])
          : chance(0.15) ? pick(['Very active in class.', 'Needs more practice on the exercises.', 'Top of the class.']) : null
      })
      count += 1
    }
  }
  console.log(`  • ${count} course registrations`)
}

function seedAttendance(meetings, activities, courses, members) {
  const students = members.filter((m) => m.role === 'Student Member' && m.status === 'Active')
  let count = 0

  const addSession = (refType, refId, title, date, group) => {
    for (const student of group) {
      const roll = rand()
      let status = 'Present'
      if (roll > 0.86) status = 'Absent'
      else if (roll > 0.78) status = 'Late'
      else if (roll > 0.73) status = 'Excused'
      else if (roll > 0.715) status = 'Left Early'
      insert('attendance', {
        member_id: student.id,
        ref_type: refType,
        ref_id: refId,
        session_title: title,
        session_date: date,
        status,
        check_in_time: status === 'Present' ? pick(['16:02', '16:05', '14:03', '14:01']) : status === 'Late' ? pick(['16:22', '14:31', '16:18']) : null,
        remarks: status === 'Excused' ? pick(['Sick — reported to the school nurse', 'Had remedial classes', 'Travelled for a family matter']) : status === 'Absent' ? chance(0.3) ? 'Did not report' : null : null
      })
      count += 1
    }
  }

  for (const meeting of meetings) {
    if (meeting.status !== 'Completed') continue
    const isExec = meeting.type === 'Executive Meeting' || meeting.type === 'Patrons Meeting' || meeting.type === 'Class Representatives Meeting'
    const group = isExec ? students.slice(0, 12) : students.slice(0, int(28, Math.min(56, students.length)))
    addSession('meeting', meeting.id, meeting.title, meeting.date, group)
  }

  for (const activity of activities) {
    if (activity.status !== 'Completed') continue
    const group = students.slice(0, int(25, Math.min(50, students.length)))
    addSession('activity', activity.id, activity.title, activity.date, group)
  }

  for (const course of courses) {
    if (course.status === 'Upcoming') continue
    const learners = all('SELECT member_id FROM enrollments WHERE course_id = ?', [course.id]).map((r) => ({ id: r.member_id }))
    if (!learners.length) continue
    for (const week of [2, 4, 6]) {
      addSession('course', course.id, `${course.title} — Week ${week}`, shift(-int(25, 95) + week * 7), learners)
    }
  }
  console.log(`  • ${count} attendance records`)
}

function seedDues(members) {
  const students = members.filter((m) => m.role === 'Student Member' && m.status === 'Active')
  const patron = members.find((m) => m.role === 'Teacher Patron')
  const treasurer = members.find((m) => m.role === 'Student Member')
  const terms = [
    { term: 'Term 3', year: '2025', due: 10000, factor: 0.92 },
    { term: 'Term 1', year: '2026', due: 10000, factor: 0.78 },
    { term: 'Term 2', year: '2026', due: 10000, factor: 0.35 }
  ]
  let count = 0
  for (const { term, year, due, factor } of terms) {
    for (const student of students) {
      const roll = rand()
      let paid = 0
      let status = 'Unpaid'
      if (roll < factor) {
        paid = due
        status = 'Paid'
      } else if (roll < factor + 0.15) {
        paid = Math.round((due * pick([0.4, 0.5, 0.6])) / 500) * 500
        status = 'Partial'
      } else if (chance(0.03)) {
        status = 'Exempt'
      }
      const paidAnything = paid > 0
      insert('dues', {
        member_id: student.id,
        term,
        academic_year: year,
        amount_due: status === 'Exempt' ? 0 : due,
        amount_paid: paid,
        status,
        payment_date: paidAnything ? shift(-int(10, 150)) : null,
        method: paidAnything ? pick(['Cash', 'Mobile Money', 'Bank Transfer']) : null,
        receipt_no: paidAnything ? `RCT/${year}/${String(count + 1).padStart(4, '0')}` : null,
        remarks: status === 'Partial' ? 'Balance promised by the end of term.' : status === 'Exempt' ? pick(['Granted exemption — family hardship', 'Exempted: supports the club as a lab assistant']) : null,
        recorded_by_id: chance(0.5) ? patron.id : treasurer?.id ?? null
      })
      count += 1
    }
  }
  console.log(`  • ${count} dues records across 3 terms`)
}

function seedReports(members) {
  const data = [
    ['Term 1 2026 Club Report', 'Term Report', 'Term 1 2026', 'Approved', 0],
    ['Inter-house Coding Challenge Report', 'Activity Report', 'Term 1 2026', 'Approved', 6],
    ['Finance Report — Term 1 2026', 'Finance Report', 'Term 1 2026', 'Under Review', 5],
    ['ICT Week 2026 Report', 'Activity Report', 'ICT Week', 'Approved', 3],
    ['Membership Report — Term 1', 'Membership Report', 'Term 1 2026', 'Submitted', 3],
    ['Class Representatives Report — S1', 'Class Representatives Report', 'Term 1 2026', 'Submitted', 10],
    ['Course Completion Report — Computer Basics', 'Progress Report', 'Term 1 2026', 'Draft', 1],
    ['Incident Report — Damaged Computer in Lab 2', 'Incident Report', 'Term 1 2026', 'Rejected', 5],
    ['Annual Report 2025', 'Annual Report', '2025', 'Approved', 0],
    ['Term 2 2026 Plan and Budget', 'Progress Report', 'Term 2 2026', 'Draft', 2],
    ['Regional Competition Participation Report', 'Activity Report', 'Term 1 2026', 'Approved', 6],
    ['Digital Safety Campaign Report', 'Activity Report', 'Term 1 2026', 'Submitted', 7]
  ]
  let count = 0
  for (const [title, type, period, status, memberIndex] of data) {
    const author = members[memberIndex] || members[0]
    insert('reports', {
      title,
      type,
      period,
      author_id: author.id,
      summary: `Summary of ${title.toLowerCase()} — activities held, attendance recorded, money spent and recommendations for the club.`,
      content: `1. INTRODUCTION\nThis report covers ${period} for the ICT Club and summarises what was done, who took part and what it cost.\n\n2. ACTIVITIES CARRIED OUT\nA full list of the meetings, trainings and competitions held during the period is attached as an appendix.\n\n3. ATTENDANCE\nThe club attendance register was marked at every session and the averages are shown in the statistics section.\n\n4. FINANCE\nClub dues collected and money spent on activities are shown below, with receipts attached.\n\n5. ACHIEVEMENTS\n- Inter-house coding challenge held successfully\n- New members registered from all classes\n- Certificates issued to course completers\n\n6. CHALLENGES\n- Some computers in Lab 2 need repair\n- Club meetings clash with prep time\n- Some students have not cleared their club dues\n\n7. RECOMMENDATIONS\n- Repair the computers before the next term\n- Timetable the club meetings on Wednesday afternoons\n- Class representatives to follow up on outstanding dues`,
      file_url: chance(0.3) ? `https://drive.google.com/school-ict-club/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : null,
      status,
      submitted_at: status === 'Draft' ? null : shift(-int(3, 60)),
      reviewed_by_id: ['Approved', 'Rejected', 'Under Review'].includes(status) ? members.find((m) => m.role === 'Teacher Patron')?.id ?? null : null,
      review_comments: status === 'Approved'
        ? 'Good report. Approved for the club file.'
        : status === 'Rejected'
          ? 'Please attach the repair quotation and photographs of the damaged computer.'
          : null
    })
    count += 1
  }
  console.log(`  • ${count} reports`)
}

function seedCertificates(members, courses, activities) {
  let count = 0
  const year = TODAY.getFullYear()
  const candidates = []

  for (const course of courses.filter((c) => c.status === 'Completed')) {
    const completed = all(
      "SELECT e.member_id, e.score FROM enrollments e WHERE e.course_id = ? AND e.status = 'Completed' LIMIT 14",
      [course.id]
    )
    for (const row of completed) {
      candidates.push({
        member_id: row.member_id,
        title: `Certificate of Completion — ${course.title}`,
        type: 'Completion',
        related_type: 'course',
        related_id: course.id,
        grade: row.score,
        issued_by: course.instructor,
        description: `For successfully completing the ${course.title} course and passing the final assessment at the ICT Club.`
      })
    }
  }

  const competition = activities.find((a) => a.category === 'Inter-house Competition')
  if (competition) {
    for (const student of members.filter((m) => m.role === 'Student Member').slice(4, 12)) {
      candidates.push({
        member_id: student.id,
        title: 'Certificate of Achievement — Inter-house Coding Challenge',
        type: 'Competition Winner',
        related_type: 'activity',
        related_id: competition.id,
        grade: pick(['1st Place', '2nd Place', '3rd Place', 'Finalist']),
        description: 'For outstanding performance in the inter-house coding challenge.'
      })
    }
  }

  const quiz = activities.find((a) => a.title.includes('Quiz'))
  if (quiz) {
    for (const student of members.filter((m) => m.role === 'Student Member').slice(20, 25)) {
      candidates.push({
        member_id: student.id,
        title: 'Certificate of Achievement — ICT General Knowledge Quiz',
        type: 'Achievement',
        related_type: 'activity',
        related_id: quiz.id,
        grade: pick(['Winner', 'Runner-up', 'Top scorer']),
        description: 'For excellent performance in the ICT general knowledge quiz.'
      })
    }
  }

  for (const classLevel of CLASSES) {
    const best = members.find((m) => m.role === 'Student Member' && m.class_level === classLevel && m.status === 'Active')
    if (!best) continue
    candidates.push({
      member_id: best.id,
      title: `Certificate of Recognition — Best ICT Student, ${classLevel}`,
      type: 'Best Student',
      related_type: null,
      related_id: null,
      grade: null,
      issued_by: 'ICT Club',
      description: `Awarded to the best performing ICT student in ${classLevel} for the term.`
    })
  }

  for (const student of members.filter((m) => m.role === 'Student Member').slice(0, 9)) {
    candidates.push({
      member_id: student.id,
      title: 'Certificate of Leadership — 2026 Executive Committee',
      type: 'Leadership',
      related_type: null,
      related_id: null,
      grade: null,
      issued_by: 'ICT Club',
      description: 'In recognition of dedicated service on the executive committee of the ICT Club.'
    })
  }

  for (const candidate of candidates.slice(0, 48)) {
    count += 1
    insert('certificates', {
      certificate_no: `ICTC/${year}/${String(count).padStart(4, '0')}`,
      title: candidate.title,
      type: candidate.type,
      recipient_id: candidate.member_id,
      related_type: candidate.related_type,
      related_id: candidate.related_id,
      issue_date: shift(-int(3, 90)),
      issued_by: candidate.issued_by || 'ICT Club',
      signed_by: chance(0.5) ? 'Head Teacher' : 'Club Patron',
      grade: candidate.grade,
      description: candidate.description,
      status: chance(0.08) ? 'Pending Approval' : 'Issued',
      verification_code: `ICT-${Math.random().toString(16).slice(2, 8).toUpperCase()}`
    })
  }
  console.log(`  • ${count} certificates`)
}

function seedNotes(members) {
  const data = [
    ['Club code of conduct', 'Club Announcement', 'Public', 'Amber', 1, '1. Members must attend club meetings every Wednesday at 4:00 PM.\n2. Handle the computers carefully — no eating or drinking in the lab.\n3. Log off and arrange the chairs before leaving.\n4. Club dues of UGX 10,000 must be paid each term.\n5. Members who miss three meetings without excuse may lose their place on the competition team.'],
    ['Term 1 meeting calendar', 'Club Announcement', 'Public', 'Blue', 1, 'All meetings start at 4:00 PM in ICT Lab 1 unless announced otherwise.\n\n• Executive committee: every Tuesday\n• General meeting: every second Wednesday\n• Training sessions: Thursdays\n• Class representatives briefing: last Friday of the month'],
    ['How to log in to the lab computers', 'Resource', 'Public', 'Green', 0, '1. Press Enter at the welcome screen.\n2. Username: your admission number (e.g. 2025/S2/031)\n3. Password: given by the teacher patron — change it the first time you log in.\n4. Save your work in your class folder (D:\\Students\\S2).\n5. Never share your password.'],
    ['Free typing practice websites', 'Resource', 'Public', 'Blue', 0, '• typingclub.com — structured lessons\n• 10fastfingers.com — speed tests\n• keybr.com — practice weak keys\n\nAim for 30 words per minute with no mistakes before the typing championship.'],
    ['Competition team selection criteria', 'Meeting Notes', 'Executive Only', 'Purple', 1, 'The competition team is selected on:\n1. Attendance at training sessions (must be above 75%)\n2. Course progress and completed exercises\n3. Performance in the inter-house challenge\n4. Discipline in the ICT lab\n\nThe teacher patron has the final say on the team.'],
    ['Scratch programming course outline', 'Course Notes', 'Public', 'Green', 0, 'Week 1: Getting to know Scratch\nWeek 2: Sprites, motion and events\nWeek 3: Loops and conditionals\nWeek 4: Variables and score keeping\nWeek 5: Building a simple game\nWeek 6: Presentation of projects'],
    ['Revision tips for Computer Studies', 'Examination Tips', 'Public', 'Pink', 0, '• Learn the definitions of hardware and software and give examples.\n• Practise drawing and labelling the computer system block diagram.\n• Remember the differences between RAM and ROM, input and output devices.\n• Practise spreadsheets and word processing questions on the computer, not just on paper.\n• Attempt at least one past paper per week.'],
    ['Executive committee to-do list', 'To-Do', 'Executive Only', 'Purple', 1, '☐ Collect outstanding club dues\n☐ Repair the two computers in Lab 2\n☐ Prepare the certificate list for end of term\n☐ Design posters for the Term 2 bootcamp\n☐ Submit the term report to the patron'],
    ['Robotics safety rules', 'Resource', 'Public', 'Amber', 1, '1. Always switch off the power before changing connections.\n2. Never connect a motor directly to the battery.\n3. Keep the workbench dry and free of metal objects.\n4. Report any burnt smell immediately to the teacher patron.\n5. Pack the kits back into the boxes after every session.'],
    ['Digital safety tips for students', 'Club Announcement', 'Public', 'Blue', 0, '• Never share your password or personal details online.\n• Report any suspicious message to a teacher.\n• Think before you post — the internet never forgets.\n• Be polite online. Cyberbullying is a school offence.\n• Keep your phone and laptop locked.'],
    ['Inter-house competition rules', 'Meeting Notes', 'Public', 'Blue', 0, '1. Each house presents a maximum of three teams.\n2. Teams of three students from the same house.\n3. Two hours per challenge, no internet access.\n4. Marks: functionality 40%, creativity 30%, presentation 20%, teamwork 10%.\n5. The judges\' decision is final.'],
    ['Parents open day display plan', 'To-Do', 'Public', 'Teal', 0, '• Set up six computers showing club projects\n• Display certificates and trophies\n• Robotics demonstration at 11:00 AM\n• Two students per station to explain the projects\n• Print the club brochure for parents']
  ]
  let count = 0
  for (const [title, category, visibility, color, pinned, content] of data) {
    insert('notes', {
      title,
      category,
      content,
      tags: pick(['rules, club', 'calendar, term 1', 'lab, login', 'typing, practice', 'competition, team', 'course, scratch', 'revision, exam', 'to-do, executive', 'robotics, safety', 'online safety', 'competition, rules', 'parents, display']),
      author_id: pick(members.slice(0, 10)).id,
      visibility,
      color,
      pinned,
      link_url: chance(0.25) ? 'https://drive.google.com/school-ict-club/note' : null
    })
    count += 1
  }
  console.log(`  • ${count} notes and announcements`)
}

function seedProjects(members) {
  const students = members.filter((m) => m.role === 'Student Member' && m.status === 'Active')
  const data = [
    ['School Library Management System', 'School System', 'In Progress', 'High', 55, -50, 40, 'Python, SQLite, Tkinter', 'Records books, borrowers and returns for the school library instead of the paper register.'],
    ['Student Result Slip Generator', 'School System', 'In Progress', 'High', 70, -60, 25, 'Excel, VBA', 'Generates report cards for a class from a marks spreadsheet.'],
    ['School Website', 'Web Application', 'In Progress', 'Medium', 45, -35, 45, 'HTML, CSS, JavaScript', 'A simple website with school news, the club page and a photo gallery.'],
    ['Class Attendance Tracker', 'Web Application', 'In Review', 'Medium', 85, -70, 10, 'HTML, JavaScript, Google Sheets', 'Helps class teachers record attendance during morning roll call.'],
    ['Automatic Bell Timer', 'IoT / Embedded', 'Planning', 'Medium', 25, -12, 80, 'Arduino, C++', 'Rings the school bell automatically at the correct times.'],
    ['ICT Revision Quiz App', 'Mobile Application', 'In Progress', 'High', 60, -40, 35, 'MIT App Inventor', 'A quiz app with Computer Studies questions for revision anywhere.'],
    ['Digital Notice Board', 'Web Application', 'Completed', 'Low', 100, -120, -30, 'HTML, CSS, JavaScript', 'Displays announcements and the timetable on a screen at the administration block.'],
    ['School Bus Route Finder', 'Web Application', 'On Hold', 'Low', 30, -90, 60, 'HTML, Leaflet maps', 'Shows the school bus routes and pick-up points for parents.'],
    ['Smart Water Tank Monitor', 'IoT / Embedded', 'Planning', 'Medium', 15, -8, 100, 'Arduino, sensors', 'Warns the bursar when the school water tank is almost empty.'],
    ['Library Book Catalogue Barcode System', 'Data Analytics', 'Idea', 'Low', 5, -4, 120, 'Python, barcode reader', 'Attaches barcodes to library books for faster borrowing.']
  ]
  const created = []
  for (const [title, category, status, priority, progress, start, deadline, tech, description] of data) {
    const id = insert('projects', {
      title,
      category,
      description,
      objectives: '• Build a working system for the school\n• Document how it works\n• Train at least 3 club members on the tools used',
      tech_stack: tech,
      lead_id: pick(students.slice(0, 10)).id,
      status,
      priority,
      progress,
      start_date: shift(start),
      deadline: shift(deadline),
      completed_date: status === 'Completed' ? shift(deadline) : null,
      repo_url: chance(0.6) ? `https://github.com/school-ict-club/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : null,
      demo_url: status === 'Completed' ? `https://demo.${
        'school-ict-club.local'
      }/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : null,
      budget: pick([0, 50000, 120000, 250000]),
      sponsor: chance(0.3) ? pick(['PTA', 'Old Students Association', 'School Administration']) : null
    })
    created.push({ id, title, status })

    const team = []
    while (team.length < int(2, 5)) {
      const student = pick(students)
      if (!team.includes(student)) team.push(student)
    }
    const roles = ['Project Lead', 'Developer', 'Developer', 'Designer', 'Tester', 'Documentation']
    team.forEach((student, index) => {
      insert('project_members', {
        project_id: id,
        member_id: student.id,
        role: index === 0 ? 'Project Lead' : pick(roles.slice(1)),
        joined_date: shift(start + int(0, 8)),
        contribution: pick(['Wrote the code', 'Designed the screens', 'Tested the system', 'Wrote the documentation', 'Collected requirements'])
      })
    })

    const tasks = [
      ['Discuss the idea with the patron', 'Done', 100],
      ['Draw the plan on paper', status === 'Idea' ? 'To Do' : 'Done', status === 'Idea' ? 0 : 100],
      ['Design the database / data file', status === 'Idea' || status === 'Planning' ? 'To Do' : 'Done', status === 'Idea' || status === 'Planning' ? 0 : 100],
      ['Write the main program', status === 'Completed' ? 'Done' : status === 'Idea' || status === 'Planning' ? 'To Do' : 'In Progress', status === 'Completed' ? 100 : status === 'Idea' || status === 'Planning' ? 0 : int(30, 80)],
      ['Design the screens / interface', status === 'Completed' ? 'Done' : pick(['In Progress', 'To Do']), status === 'Completed' ? 100 : int(10, 70)],
      ['Test and fix errors', status === 'Completed' ? 'Done' : 'To Do', status === 'Completed' ? 100 : 0],
      ['Prepare a demonstration for the club', status === 'Completed' ? 'Done' : 'To Do', status === 'Completed' ? 100 : 0]
    ]
    for (const [taskTitle, taskStatus, taskProgress] of tasks) {
      insert('project_tasks', {
        project_id: id,
        title: `${taskTitle} — ${title}`,
        description: `${taskTitle} for the ${title} project.`,
        assignee_id: pick(team).id,
        status: taskStatus,
        priority: pick(['Low', 'Medium', 'High', 'Critical']),
        due_date: shift(deadline - int(0, 45)),
        progress: taskProgress,
        estimated_hours: int(2, 24),
        actual_hours: taskStatus === 'Done' ? int(2, 24) : null
      })
    }
  }
  console.log(`  • ${created.length} projects, ${all('SELECT COUNT(*) AS c FROM project_members')[0].c} team members, ${all('SELECT COUNT(*) AS c FROM project_tasks')[0].c} tasks`)
}

function seedActivityLog() {
  const rows = [
    ['create', 'members', 'Registered 12 new S1 members'],
    ['attendance', 'attendance', 'Inter-house Coding Challenge: 48 students marked'],
    ['dues', 'dues', 'Recorded Term 1 dues payments for S2'],
    ['create', 'meetings', 'Created End of Term General Meeting'],
    ['update', 'courses', 'Updated Scratch course schedule'],
    ['certificates', 'certificates', 'Issued course completion certificates'],
    ['settings', 'settings', 'Updated the club profile for 2026 Term 1']
  ]
  rows.forEach(([action, resource, detail], index) => {
    logActivity({
      userId: null,
      userName: index % 3 === 0 ? 'Mr. Ssekandi John' : 'Sarah Nakato',
      action,
      resource,
      detail,
      recordId: index + 1
    })
  })
}

/* ------------------------------------------------------------------ */

function main() {
  const existing = all('SELECT id FROM users LIMIT 1')
  if (existing.length && !RESET) {
    console.log('\n  Database already contains data.')
    console.log('  Run `npm run db:reset` to wipe and reload the demo club.\n')
    process.exit(0)
  }

  console.log('\n  Seeding the secondary school ICT club…')
  if (RESET) wipe()

  seedSettings()
  const userIds = seedUsers()
  const members = seedMembers()
  seedCabinet(members, userIds)
  const meetings = seedMeetings(members)
  const activities = seedActivities(members)
  const courses = seedCourses(members)
  seedEnrollments(courses, members)
  seedAttendance(meetings, activities, courses, members)
  seedDues(members)
  seedReports(members)
  seedCertificates(members, courses, activities)
  seedNotes(members)
  seedProjects(members)
  seedActivityLog()

  const dues = all('SELECT COUNT(*) AS c FROM dues')[0]
  console.log(`  • ${dues.c} dues records in the finance register`)

  console.log('\n  Done. Sign in with:')
  console.log('    admin@school.ac.ug      / admin123      (teacher patron / administrator)')
  console.log('    executive@school.ac.ug  / executive123  (student executive)')
  console.log('    member@school.ac.ug     / member123     (ordinary student member)\n')
}

main()
