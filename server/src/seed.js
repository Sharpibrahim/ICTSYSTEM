/**
 * Demo data loader.
 *   npm run db:seed      → seed only when the database is empty
 *   npm run db:reset     → wipe everything and seed again
 */
import { all, db, get, insert, run, saveSettings, DEFAULT_SETTINGS, logActivity } from './db.js'
import { hashPassword } from './auth.js'

const RESET = process.argv.includes('--reset')

/* Deterministic pseudo-random generator so demo data is stable. */
let seedState = 20260927
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
  'reports', 'attendance', 'enrollments', 'courses', 'activities', 'meetings', 'cabinet', 'members', 'users', 'settings'
]

function wipe() {
  for (const table of TABLES) run(`DELETE FROM ${table}`)
  run("DELETE FROM sqlite_sequence")
  console.log('  • database cleared')
}

const FIRST_A = ['Amina', 'Yusuf', 'Ibrahim', 'Fatima', 'Musa', 'Zainab', 'David', 'Grace', 'Emeka', 'Chiamaka', 'Tunde', 'Aisha', 'Samuel', 'Blessing', 'Kelvin', 'Halima', 'Peter', 'Esther', 'Abdul', 'Ngozi', 'Daniel', 'Maryam', 'Joseph', 'Rukayat', 'Segun', 'Ada', 'Bright', 'Hauwa', 'Collins', 'Joy']
const FIRST_B = ['Okonkwo', 'Bello', 'Adeyemi', 'Ibrahim', 'Nwosu', 'Oyelaran', 'Musa', 'Achebe', 'Chukwu', 'Danjuma', 'Salihu', 'Eze', 'Lawal', 'Bakare', 'Umeh', 'Garba', 'Obi', 'Suleiman', 'Ogunleye', 'Iheanacho', 'Aliyu', 'Nnamdi', 'Okafor', 'Adebayo']
const DEPARTMENTS = [
  'Information Technology',
  'Computer Science',
  'Software Engineering',
  'Information Systems',
  'Computer Engineering',
  'Electrical Engineering'
]
const SKILLS = ['Python', 'JavaScript', 'React', 'Node.js', 'Java', 'C++', 'SQL', 'MongoDB', 'Networking', 'Cybersecurity', 'Linux', 'Figma', 'UI/UX Design', 'Data Analysis', 'Machine Learning', 'Flutter', 'PHP', 'Laravel', 'Git', 'Cloud Computing', 'Excel', 'Public Speaking', 'Graphic Design', 'Technical Writing']
const INTERESTS = ['Hackathons', 'Open Source', 'Robotics', 'AI Research', 'Web Development', 'Mobile Apps', 'Cyber Security', 'Data Science', 'Teaching', 'Community Outreach', 'Esports', 'Content Creation']
const YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4']
const STUDENT_ORGS = ['IT', 'CS', 'SE', 'IS', 'CE', 'EE']

function memberName() {
  const initial = pick(FIRST_A)
  return `${initial} ${pick(FIRST_B)}`
}

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

/* ------------------------------------------------------------------ */
/* GENERATE                                                            */
/* ------------------------------------------------------------------ */

function seedUsersAndSettings() {
  saveSettings({
    ...DEFAULT_SETTINGS,
    club_name: 'ICT Club',
    club_tagline: 'Innovate • Build • Share',
    institution: 'Faculty of Computing & Informatics',
    academic_year: '2025/2026',
    contact_email: 'info@ictclub.org',
    contact_phone: '+234 800 000 0000',
    meeting_frequency: 'Every second Friday, 4:00 PM'
  })

  const accounts = [
    { name: 'Amina Yusuf', email: 'admin@ictclub.org', password: 'admin123', role: 'admin' },
    { name: 'Ibrahim Bello', email: 'cabinet@ictclub.org', password: 'cabinet123', role: 'cabinet' },
    { name: 'Grace Okonkwo', email: 'member@ictclub.org', password: 'member123', role: 'member' }
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
  console.log(`  • 3 user accounts (admin@ictclub.org / admin123, cabinet@ictclub.org / cabinet123, member@ictclub.org / member123)`)
  return ids
}

function seedMembers() {
  const members = []
  const total = 42

  const named = [
    { full_name: 'Amina Yusuf', gender: 'Female', department: 'Information Technology', year_of_study: 'Year 3', role: 'Cabinet Member' },
    { full_name: 'Ibrahim Bello', gender: 'Male', department: 'Computer Science', year_of_study: 'Year 4', role: 'Cabinet Member' },
    { full_name: 'Grace Okonkwo', gender: 'Female', department: 'Software Engineering', year_of_study: 'Year 2', role: 'Member' },
    { full_name: 'Musa Danjuma', gender: 'Male', department: 'Computer Engineering', year_of_study: 'Year 3', role: 'Cabinet Member' },
    { full_name: 'Fatima Salihu', gender: 'Female', department: 'Information Systems', year_of_study: 'Year 4', role: 'Cabinet Member' },
    { full_name: 'Emeka Nwosu', gender: 'Male', department: 'Information Technology', year_of_study: 'Year 2', role: 'Cabinet Member' },
    { full_name: 'Zainab Aliyu', gender: 'Female', department: 'Computer Science', year_of_study: 'Year 3', role: 'Cabinet Member' },
    { full_name: 'David Achebe', gender: 'Male', department: 'Software Engineering', year_of_study: 'Year 4', role: 'Cabinet Member' },
    { full_name: 'Dr. Samuel Ogunleye', gender: 'Male', department: 'Computer Science', year_of_study: 'Postgraduate', role: 'Patron' },
    { full_name: 'Aisha Bakare', gender: 'Female', department: 'Information Technology', year_of_study: 'Year 2', role: 'Member' },
    { full_name: 'Tunde Adebayo', gender: 'Male', department: 'Computer Engineering', year_of_study: 'Year 3', role: 'Member' },
    { full_name: 'Ngozi Eze', gender: 'Female', department: 'Information Systems', year_of_study: 'Year 1', role: 'Member' }
  ]

  for (const [index, person] of named.entries()) {
    const dept = person.department
    const code = STUDENT_ORGS[DEPARTMENTS.indexOf(dept)] || 'IT'
    const id = insert('members', {
      full_name: person.full_name,
      reg_number: `${code}/${2022 + (YEARS.indexOf(person.year_of_study) % 4)}/${String(index + 1).padStart(3, '0')}`,
      email: `${person.full_name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@student.ictclub.org`,
      phone: `+234 80${int(10, 99)} ${int(100, 999)} ${int(1000, 9999)}`,
      gender: person.gender,
      date_of_birth: `${2000 + int(0, 5)}-0${int(1, 9)}-1${int(0, 9)}`,
      department: dept,
      program: `BSc ${dept}`,
      year_of_study: person.year_of_study,
      role: person.role,
      status: person.role === 'Patron' ? 'Active' : 'Active',
      join_date: shift(-int(30, 900)),
      skills: randomSkills(3, 7),
      interests: randomInterests(),
      address: `Block ${pick(['A', 'B', 'C', 'D'])}${int(1, 9)}, Student Village`,
      emergency_contact: `+234 70${int(10, 99)} ${int(100, 999)} ${int(1000, 9999)}`,
      bio: `${person.role === 'Patron' ? 'Faculty patron' : 'Active member'} of the ICT Club, passionate about ${pick(INTERESTS).toLowerCase()}.`
    })
    members.push({ id, ...person })
  }

  for (let i = named.length; i < total; i += 1) {
    const name = memberName() + (chance(0.06) ? ` ${pick(['Jr.', 'II'])}` : '')
    const dept = pick(DEPARTMENTS)
    const code = STUDENT_ORGS[DEPARTMENTS.indexOf(dept)] || 'IT'
    const year = pick(YEARS)
    const status = i > total - 5 ? pick(['Inactive', 'Suspended']) : chance(0.08) ? 'Alumni' : 'Active'
    const role = status === 'Alumni' ? 'Alumni' : 'Member'
    const id = insert('members', {
      full_name: name,
      reg_number: `${code}/${2022 + (YEARS.indexOf(year) % 4)}/${String(i + 1).padStart(3, '0')}`,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}${i}@student.ictclub.org`,
      phone: `+234 8${int(0, 1)}${int(10, 99)} ${int(100, 999)} ${int(1000, 9999)}`,
      gender: pick(['Male', 'Female', 'Female', 'Male', 'Other']),
      date_of_birth: `${2000 + int(0, 6)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
      department: dept,
      program: `BSc ${dept}`,
      year_of_study: year,
      role,
      status,
      join_date: shift(-int(20, 1000)),
      skills: randomSkills(1, 5),
      interests: randomInterests(),
      address: `Hostel ${pick(['A', 'B', 'C', 'D'])}-${int(100, 320)}`,
      bio: 'Member of the ICT Club.'
    })
    members.push({ id, full_name: name, department: dept, year_of_study: year, role, status })
  }
  console.log(`  • ${members.length} members`)
  return members
}

function seedCabinet(members, userIds) {
  const positions = [
    ['President', 'Amina Yusuf', 1, 'Leads the club, chairs general and cabinet meetings, represents the club to faculty.'],
    ['Vice President', 'Ibrahim Bello', 2, 'Deputises the president, coordinates committees and member welfare.'],
    ['General Secretary', 'Grace Okonkwo', 3, 'Keeps minutes, manages records and official correspondence.'],
    ['Assistant Secretary', 'Ngozi Eze', 4, 'Supports minutes taking and maintains the attendance register.'],
    ['Treasurer', 'Fatima Salihu', 5, 'Manages club finances, budgets and financial reporting.'],
    ['Financial Secretary', 'Musa Danjuma', 6, 'Records dues, receipts and reconciles the accounts.'],
    ['Organizing Secretary', 'Emeka Nwosu', 7, 'Plans events, logistics and venue arrangements.'],
    ['Publicity / PR Officer', 'Zainab Aliyu', 8, 'Runs social media, flyers and club publicity.'],
    ['Technical Lead', 'David Achebe', 9, 'Leads technical training, projects and the dev team.'],
    ['Projects Coordinator', 'Tunde Adebayo', 10, 'Tracks project delivery, timelines and deliverables.'],
    ['Academic Coordinator', 'Aisha Bakare', 11, 'Coordinates courses, tutors and learning materials.'],
    ['Welfare Officer', 'Aisha Bakare', 12, 'Handles member welfare and conflict resolution.']
  ]
  let count = 0
  for (const [position, name, order, responsibilities] of positions) {
    const member = members.find((m) => m.full_name === name)
    if (!member) continue
    insert('cabinet', {
      position,
      member_id: member.id,
      term: '2025/2026',
      start_date: shift(-180),
      end_date: shift(185),
      status: 'Active',
      contact_email: `${position.split(' ')[0].toLowerCase()}@ictclub.org`,
      order_index: order,
      responsibilities,
      achievements: chance(0.6) ? pick(['Launched monthly tech talks.', 'Grew membership by 25%.', 'Organised a successful hackathon.', 'Set up the club mentorship scheme.']) : null
    })
    count++
  }
  // A previous administration, kept for history.
  const past = [
    ['President', 'Musa Danjuma', 1],
    ['General Secretary', 'Fatima Salihu', 3],
    ['Technical Lead', 'Emeka Nwosu', 9]
  ]
  for (const [position, name, order] of past) {
    const member = members.find((m) => m.full_name === name)
    if (!member) continue
    insert('cabinet', {
      position,
      member_id: member.id,
      term: '2024/2025',
      start_date: shift(-560),
      end_date: shift(-180),
      status: 'Past',
      order_index: order,
      responsibilities: 'Served in the previous administration.'
    })
    count++
  }
  if (userIds?.admin) {
    run('UPDATE users SET member_id = ? WHERE id = ?', [members[0].id, userIds.admin])
    run('UPDATE users SET member_id = ? WHERE id = ?', [members[1].id, userIds.cabinet])
    run('UPDATE users SET member_id = ? WHERE id = ?', [members[2].id, userIds.member])
  }
  console.log(`  • ${count} cabinet positions`)
}

function seedMeetings(members) {
  const meetings = [
    { title: 'General Assembly — Semester Opening', type: 'General Assembly', offset: -150, agenda: '1. Welcome address\n2. Review of last semester\n3. Plans for the new semester\n4. AOB', status: 'Completed' },
    { title: 'Cabinet Meeting — Budget Review', type: 'Cabinet Meeting', offset: -120, agenda: '1. Financial report\n2. Budget allocation\n3. Fundraising strategy', status: 'Completed' },
    { title: 'Technical Training — Version Control with Git', type: 'Training / Workshop', offset: -95, agenda: '1. Git basics\n2. Branching & merging\n3. Hands-on lab', status: 'Completed' },
    { title: 'General Assembly — October', type: 'General Assembly', offset: -70, agenda: '1. Attendance review\n2. Project updates\n3. Course registration\n4. AOB', status: 'Completed' },
    { title: 'Committee Meeting — Hackathon Planning', type: 'Committee Meeting', offset: -55, agenda: '1. Theme selection\n2. Judging criteria\n3. Sponsorship\n4. Logistics', status: 'Completed' },
    { title: 'Cabinet Meeting — November', type: 'Cabinet Meeting', offset: -40, agenda: '1. Progress reports from each officer\n2. Upcoming events\n3. Member welfare', status: 'Completed' },
    { title: 'Special Session — Cybersecurity Awareness', type: 'Special Session', offset: -25, agenda: '1. Threat landscape\n2. Password hygiene\n3. Demo: phishing simulation', status: 'Completed' },
    { title: 'General Assembly — November', type: 'General Assembly', offset: -12, agenda: '1. Hackathon debrief\n2. Financial update\n3. Certificate distribution\n4. AOB', status: 'Completed' },
    { title: 'Cabinet Meeting — December', type: 'Cabinet Meeting', offset: 3, agenda: '1. End of semester review\n2. Handover planning\n3. Next semester calendar', status: 'Scheduled' },
    { title: 'Annual General Meeting', type: 'Annual General Meeting', offset: 10, agenda: '1. Annual report presentation\n2. Financial statements\n3. Election of new executives\n4. AOB', status: 'Scheduled' },
    { title: 'Training / Workshop — Intro to Cloud Services', type: 'Training / Workshop', offset: 18, agenda: '1. Cloud concepts\n2. Hands-on: deploying to the cloud\n3. Cost management', status: 'Scheduled' },
    { title: 'Emergency Meeting — Venue Change', type: 'Emergency Meeting', offset: -33, agenda: '1. Venue conflict\n2. Contingency plan', status: 'Cancelled' }
  ]

  const cabinetMembers = members.slice(0, 10)
  const created = []
  for (const meeting of meetings) {
    const date = shift(meeting.offset)
    const isPast = meeting.offset < 0
    const id = insert('meetings', {
      title: meeting.title,
      type: meeting.type,
      date,
      start_time: pick(['09:00', '10:00', '14:00', '16:00']),
      end_time: pick(['11:30', '12:00', '16:00', '18:00']),
      venue: pick(['Main Auditorium', 'Lecture Hall B', 'ICT Lab 1', 'Board Room', 'Online — Google Meet']),
      mode: chance(0.2) ? 'Hybrid' : 'Physical',
      meeting_link: chance(0.2) ? 'https://meet.google.com/ict-club-session' : null,
      chairperson_id: cabinetMembers[0].id,
      secretary_id: cabinetMembers[2].id,
      status: meeting.status,
      agenda: meeting.agenda,
      minutes: isPast && meeting.status === 'Completed'
        ? `The meeting was called to order at ${pick(['9:05', '14:10', '16:05'])} with ${int(18, 40)} members present.\n\n${meeting.agenda}\n\nEach item was discussed and resolutions reached as recorded below. The meeting was adjourned at ${pick(['11:20', '12:45', '17:30'])}.`
        : null,
      decisions: isPast && meeting.status === 'Completed'
        ? pick([
            '1. Approved the proposed budget.\n2. Course registration extended by one week.\n3. Hackathon date confirmed.',
            '1. Adopted the new attendance policy.\n2. Approved purchasing of two lab routers.\n3. Committee to report progress at the next meeting.',
            '1. Endorsed the outreach plan.\n2. Approved certificate design.\n3. Publicity officer to publish the calendar.'
          ])
        : null,
      action_items: isPast
        ? pick([
            'Amina — circulate minutes — 3 days\nIbrahim — follow up with sponsor — 1 week\nZainab — publish event poster — 5 days',
            'Grace — update member register — 2 days\nMusa — reconcile dues — 1 week\nDavid — prepare training materials — 4 days'
          ])
        : null
    })
    created.push({ id, ...meeting, date })
  }
  console.log(`  • ${created.length} meetings`)
  return created
}

function seedActivities(members) {
  const data = [
    ['Tech Talk Series: Careers in Tech', 'Tech Talk', -140, 'Completed', 120000, 108000],
    ['Hands-on Workshop: Building your first website', 'Workshop', -118, 'Completed', 80000, 76500],
    ['ICT Club Hackathon 2026', 'Hackathon', -88, 'Completed', 450000, 425300],
    ['Cyber Safety Outreach — Local Secondary School', 'Outreach', -74, 'Completed', 60000, 58400],
    ['Inter-Faculty Coding Competition', 'Competition', -60, 'Completed', 150000, 142000],
    ['Community Digital Literacy Drive', 'Community Service', -48, 'Completed', 95000, 90250],
    ['Web Development Bootcamp (Cohort 3)', 'Bootcamp', -35, 'Completed', 200000, 191400],
    ['AI & Machine Learning Seminar', 'Seminar', -20, 'Completed', 110000, 104000],
    ['Club Exhibition — Innovation Week', 'Exhibition', -8, 'Completed', 175000, 168000],
    ['Git & GitHub Clinic', 'Workshop', 4, 'Planned', 30000, 0],
    ['Tech Career Fair 2026', 'Exhibition', 21, 'Planned', 320000, 0],
    ['Robotics Summer Camp', 'Bootcamp', 45, 'Planned', 260000, 0],
    ['Club Anniversary & Awards Night', 'Social Event', 62, 'Planned', 400000, 0],
    ['Fundraising Drive — Lab Equipment', 'Fundraiser', 30, 'Planned', 0, 0]
  ]
  const created = []
  for (const [title, category, offset, status, budget, spent] of data) {
    const date = shift(offset)
    const expected = int(40, 180)
    const id = insert('activities', {
      title,
      category,
      date,
      end_date: chance(0.5) ? shift(offset + int(1, 3)) : date,
      start_time: pick(['09:00', '10:00', '11:00', '14:00']),
      end_time: pick(['13:00', '15:00', '17:00', '18:30']),
      venue: pick(['Main Auditorium', 'ICT Lab 1', 'ICT Lab 2', 'Faculty Lawn', 'Online — Zoom', 'Multipurpose Hall']),
      mode: chance(0.25) ? 'Hybrid' : 'Physical',
      organizer_id: pick(members.slice(0, 10)).id,
      partner: chance(0.5) ? pick(['TechHub Nigeria', 'Campus ICT Directorate', 'GDG Campus', 'Alumni Association', 'Digital Bridge Initiative']) : null,
      budget,
      spent: status === 'Completed' ? spent : 0,
      expected_participants: expected,
      actual_participants: status === 'Completed' ? Math.max(20, expected - int(0, 40)) : null,
      status,
      description: `${title} organised by the ICT Club to ${category === 'Outreach' || category === 'Community Service' ? 'give back to the community and' : ''} build practical skills among members.`,
      outcomes: status === 'Completed' ? pick([
        'Participants built and deployed functional projects; feedback rated 4.6/5.',
        'Strong turnout with new members joining the club afterwards.',
        'Three teams produced prototypes that will continue as club projects.',
        'Participants received certificates and learning resources.'
      ]) : null
    })
    created.push({ id, title, category, date, status })
  }
  console.log(`  • ${created.length} activities`)
  return created
}

function seedCourses(members) {
  const data = [
    ['Web Development with HTML, CSS & JavaScript', 'WEB-101', 'Web Development', 'Beginner', 'David Achebe', 'Completed', 24, 40],
    ['Modern Frontend Development with React', 'WEB-201', 'Web Development', 'Intermediate', 'David Achebe', 'Ongoing', 30, 32],
    ['Backend APIs with Node.js & Express', 'WEB-301', 'Web Development', 'Intermediate', 'Emeka Nwosu', 'Ongoing', 28, 30],
    ['Python Programming Fundamentals', 'PRG-100', 'Programming Fundamentals', 'Beginner', 'Amina Yusuf', 'Completed', 36, 45],
    ['Data Analysis with Python & Pandas', 'DAT-201', 'Data Science', 'Intermediate', 'Fatima Salihu', 'Upcoming', 20, 30],
    ['Introduction to Cybersecurity', 'SEC-100', 'Cybersecurity', 'Beginner', 'Ibrahim Bello', 'Ongoing', 42, 50],
    ['Computer Networking Essentials', 'NET-110', 'Networking', 'Beginner', 'Musa Danjuma', 'Upcoming', 18, 35],
    ['Mobile App Development with Flutter', 'MOB-201', 'Mobile Development', 'Intermediate', 'Grace Okonkwo', 'Upcoming', 15, 25],
    ['UI/UX Design Foundations', 'DSN-100', 'Graphic Design', 'Beginner', 'Zainab Aliyu', 'Completed', 22, 30],
    ['Cloud Computing & DevOps Basics', 'CLD-100', 'Cloud Computing', 'Beginner', 'David Achebe', 'Upcoming', 12, 30]
  ]
  const created = []
  for (const [title, code, category, level, instructor, status, enrolledTarget, capacity] of data) {
    const start = shift(status === 'Completed' ? -int(120, 200) : status === 'Ongoing' ? -int(20, 60) : int(7, 45))
    const weeks = int(6, 12)
    const id = insert('courses', {
      title,
      code,
      category,
      level,
      instructor,
      instructor_contact: `${instructor.split(' ')[0].toLowerCase()}@ictclub.org`,
      start_date: start,
      end_date: shift(status === 'Completed' ? -int(5, 40) : status === 'Ongoing' ? int(10, 35) : 30 + weeks * 7),
      schedule: pick(['Tue & Thu, 4:00 – 6:00 PM', 'Mon & Wed, 5:00 – 7:00 PM', 'Saturdays, 10:00 AM – 1:00 PM', 'Wed & Fri, 3:00 – 5:00 PM']),
      duration_hours: weeks * 4,
      venue: pick(['ICT Lab 1', 'ICT Lab 2', 'Lecture Hall B', 'Online — Zoom']),
      mode: chance(0.25) ? 'Online' : 'Physical',
      capacity,
      fee: pick([0, 0, 2000, 3500, 5000]),
      certificate_enabled: 1,
      status,
      description: `${title} — a ${level.toLowerCase()} level course designed to give members hands-on, job-ready skills.`,
      syllabus: ['Introduction & setup', 'Core concepts', 'Practical exercises', 'Intermediate topics', 'Real-world project', 'Assessment & certification'].join('\n')
    })
    created.push({ id, title, code, category, status, instructor, enrolledTarget })
  }
  console.log(`  • ${created.length} courses`)
  return created
}

function seedEnrollments(courses, members) {
  const activeMembers = members.filter((m) => m.status === 'Active' || m.status === 'Alumni')
  let count = 0
  for (const course of courses) {
    const learners = []
    while (learners.length < Math.min(course.enrolledTarget, activeMembers.length)) {
      const member = pick(activeMembers)
      if (!learners.includes(member)) learners.push(member)
    }
    for (const member of learners) {
      let status = 'Enrolled'
      let progress = int(0, 15)
      let score = null
      if (course.status === 'Completed') {
        const roll = rand()
        if (roll < 0.72) {
          status = 'Completed'
          progress = 100
          score = `${int(62, 98)}%`
        } else if (roll < 0.86) {
          status = 'Active'
          progress = int(45, 90)
        } else {
          status = 'Dropped'
          progress = int(5, 40)
        }
      } else if (course.status === 'Ongoing') {
        status = chance(0.85) ? 'Active' : 'Enrolled'
        progress = int(10, 85)
        score = chance(0.3) ? `${int(55, 95)}%` : null
      }
      insert('enrollments', {
        course_id: course.id,
        member_id: member.id,
        enrolled_date: shift(-int(10, 150)),
        status,
        progress,
        score,
        remarks: status === 'Dropped' ? pick(['Withdrew due to timetable clash.', 'Stopped attending.']) : chance(0.2) ? pick(['Very active in class.', 'Needs help with assignments.', 'Top performer.']) : null
      })
      count++
    }
  }
  console.log(`  • ${count} enrollments`)
}

function seedAttendance(meetings, activities, courses, members) {
  const activeMembers = members.filter((m) => m.status === 'Active')
  let count = 0

  const addSession = (refType, refId, title, date, group) => {
    for (const member of group) {
      const roll = rand()
      let status = 'Present'
      if (roll > 0.88) status = 'Absent'
      else if (roll > 0.8) status = 'Late'
      else if (roll > 0.76) status = 'Excused'
      else if (roll > 0.745) status = 'Left Early'
      insert('attendance', {
        member_id: member.id,
        ref_type: refType,
        ref_id: refId,
        session_title: title,
        session_date: date,
        status,
        check_in_time: status === 'Present' ? pick(['09:02', '09:05', '14:03', '16:01']) : status === 'Late' ? pick(['09:22', '14:31', '16:18']) : null,
        remarks: status === 'Excused' ? pick(['Medical appointment', 'Official assignment', 'Family emergency']) : null
      })
      count++
    }
  }

  for (const meeting of meetings) {
    if (meeting.status !== 'Completed') continue
    const group = meeting.type === 'Cabinet Meeting' || meeting.type === 'Committee Meeting'
      ? activeMembers.slice(0, 12)
      : activeMembers.slice(0, meeting.type === 'Annual General Meeting' ? activeMembers.length : int(24, activeMembers.length))
    addSession('meeting', meeting.id, meeting.title, meeting.date, group)
  }

  for (const activity of activities) {
    if (activity.status !== 'Completed') continue
    const group = activeMembers.slice(0, int(18, Math.min(38, activeMembers.length)))
    addSession('activity', activity.id, activity.title, activity.date, group)
  }

  for (const course of courses) {
    if (course.status === 'Upcoming') continue
    const learners = all('SELECT member_id FROM enrollments WHERE course_id = ?', [course.id]).map((r) => ({ id: r.member_id }))
    if (!learners.length) continue
    for (const week of [1, 3, 5]) {
      addSession('course', course.id, `${course.title} — Week ${week}`, shift(-int(30, 120) + week * 7), learners)
    }
  }
  console.log(`  • ${count} attendance records`)
}

function seedReports(members) {
  const data = [
    ['Monthly Report — September', 'Monthly Report', 'September', 'Approved', 'Amina Yusuf'],
    ['Hackathon 2026 Activity Report', 'Activity Report', 'Hackathon week', 'Approved', 'Emeka Nwosu'],
    ['Financial Report — Q3', 'Financial Report', 'July – September', 'Approved', 'Fatima Salihu'],
    ['Web Development Bootcamp Report', 'Activity Report', 'Cohort 3', 'Approved', 'David Achebe'],
    ['Membership Report — Semester 1', 'Membership Report', 'Sept – Dec', 'Submitted', 'Grace Okonkwo'],
    ['Cybersecurity Awareness Session Report', 'Meeting Report', 'Special session', 'Under Review', 'Ibrahim Bello'],
    ['Project Progress Report — November', 'Progress Report', 'November', 'Submitted', 'Tunde Adebayo'],
    ['Annual Report 2025/2026 Draft', 'Annual Report', '2025/2026', 'Draft', 'Amina Yusuf'],
    ['Outreach Report — Digital Literacy Drive', 'Activity Report', 'Outreach week', 'Approved', 'Zainab Aliyu'],
    ['Incident Report — Lab Equipment Damage', 'Incident Report', 'November', 'Rejected', 'Musa Danjuma'],
    ['Semester 2 Plan & Budget', 'Progress Report', 'Semester 2', 'Draft', 'Ibrahim Bello'],
    ['Certificate Distribution Report', 'Activity Report', 'November', 'Approved', 'Ngozi Eze']
  ]
  let count = 0
  for (const [title, type, period, status, author] of data) {
    const member = members.find((m) => m.full_name === author) || members[0]
    insert('reports', {
      title,
      type,
      period,
      author_id: member.id,
      summary: `A concise summary of ${title.toLowerCase()} covering key activities, figures and recommendations.`,
      content: `1. INTRODUCTION\nThis report covers ${period} and summarises the activities, attendance and outcomes recorded by the ICT Club.\n\n2. ACTIVITIES AND ACHIEVEMENTS\nDetails of every session held during the period are attached as an appendix.\n\n3. ATTENDANCE\nAttendance was tracked for all sessions and averages are presented in the statistics sheet.\n\n4. FINANCIAL SUMMARY\nIncome and expenditure for the period are reconciled and receipts attached.\n\n5. CHALLENGES\n- Limited lab equipment\n- Timetable clashes with lectures\n\n6. RECOMMENDATIONS\n- Purchase additional lab equipment\n- Publish the club calendar at the start of the semester`,
      file_url: chance(0.4) ? `https://drive.example.com/ict-club/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : null,
      status,
      submitted_at: status === 'Draft' ? null : shift(-int(5, 90)),
      reviewed_by_id: ['Approved', 'Rejected', 'Under Review'].includes(status) ? members[0].id : null,
      review_comments: status === 'Approved' ? 'Well documented. Approved for the club archive.' : status === 'Rejected' ? 'Please attach the equipment inventory and photos.' : null
    })
    count++
  }
  console.log(`  • ${count} reports`)
}

function seedCertificates(members, courses, activities) {
  let count = 0
  const year = TODAY.getFullYear()
  const candidates = []

  for (const course of courses.filter((c) => c.status === 'Completed')) {
    const completed = all(
      "SELECT e.member_id, e.score, m.full_name FROM enrollments e JOIN members m ON m.id = e.member_id WHERE e.course_id = ? AND e.status = 'Completed' LIMIT 12",
      [course.id]
    )
    for (const row of completed) candidates.push({ member_id: row.member_id, title: `Certificate of Completion — ${course.title}`, type: 'Completion', related_type: 'course', related_id: course.id, grade: row.score, issued_by: course.instructor, description: `For successfully completing the ${course.title} course and passing the final assessment.` })
  }

  const hackathon = activities.find((a) => a.category === 'Hackathon')
  if (hackathon) {
    for (const member of members.slice(3, 9)) {
      candidates.push({ member_id: member.id, title: 'Certificate of Achievement — ICT Club Hackathon', type: 'Achievement', related_type: 'activity', related_id: hackathon.id, grade: pick(['1st Place', '2nd Place', '3rd Place', 'Finalist']), description: 'For outstanding performance and teamwork during the ICT Club Hackathon.' })
    }
  }

  for (const member of members.slice(0, 8)) {
    candidates.push({ member_id: member.id, title: 'Certificate of Leadership — 2025/2026 Executive Committee', type: 'Leadership', related_type: null, related_id: null, grade: null, issued_by: 'ICT Club', description: 'In recognition of dedicated service on the executive committee of the ICT Club.' })
  }

  for (const candidate of candidates.slice(0, 34)) {
    count++
    insert('certificates', {
      certificate_no: `ICTC/${year}/${String(count).padStart(4, '0')}`,
      title: candidate.title,
      type: candidate.type,
      recipient_id: candidate.member_id,
      related_type: candidate.related_type,
      related_id: candidate.related_id,
      issue_date: shift(-int(3, 150)),
      issued_by: candidate.issued_by || 'ICT Club',
      signed_by: chance(0.5) ? 'Club Patron' : 'Club President',
      grade: candidate.grade,
      description: candidate.description,
      status: chance(0.1) ? 'Pending Approval' : 'Issued',
      verification_code: `ICT-${Math.random().toString(16).slice(2, 8).toUpperCase()}`
    })
  }
  console.log(`  • ${count} certificates`)
}

function seedNotes(members) {
  const data = [
    ['Attendance policy reminder', 'Announcement', 'Public', 'Amber', 1, 'A member must attend at least 75% of sessions in a semester to qualify for a certificate and to be eligible for cabinet positions.\n\nExcused absences must be reported to the welfare officer before the session.'],
    ['Hackathon judging criteria', 'Meeting Notes', 'Cabinet Only', 'Blue', 1, '1. Innovation & originality — 30%\n2. Technical execution — 30%\n3. Impact & relevance — 20%\n4. Presentation & documentation — 20%'],
    ['Web development course outline', 'Course Notes', 'Public', 'Green', 0, 'Week 1: HTML structure\nWeek 2: CSS layout & Flexbox\nWeek 3: Responsive design\nWeek 4: JavaScript basics\nWeek 5: DOM & events\nWeek 6: Project work'],
    ['Ideas for next hackathon theme', 'Idea', 'Public', 'Pink', 0, '• Campus navigation app\n• Digital records for the clinic\n• Smart timetable assistant\n• AI tutor for first-year students'],
    ['Free learning resources', 'Resource', 'Public', 'Blue', 0, 'MDN Web Docs — developer.mozilla.org\nfreeCodeCamp — freecodecamp.org\nThe Odin Project — theodinproject.com\nCisco Networking Academy — netacad.com'],
    ['Cabinet to-do before AGM', 'To-Do', 'Cabinet Only', 'Purple', 1, '☐ Prepare annual report\n☐ Reconcile accounts\n☐ Print certificates\n☐ Book the auditorium\n☐ Announce election guidelines'],
    ['Project standup notes', 'Project Notes', 'Public', 'Teal', 0, 'Attendance system: CSV export working, PDF pending.\nClub website: waiting on logo from publicity officer.\nNetwork monitor: hardware ordered.'],
    ['How to write a good club report', 'Resource', 'Public', 'Amber', 0, 'A good report is: (1) brief, (2) factual, (3) evidence backed, (4) actionable. Always state what happened, what it cost, what was achieved and what should change next time.'],
    ['Member welfare guidelines', 'General', 'Cabinet Only', 'Green', 0, 'Welfare officer handles all welfare matters confidentially. Report any case of harassment directly to the patron.'],
    ['Meeting procedure (standing orders)', 'Meeting Notes', 'Public', 'Blue', 0, '1. Opening prayer & welcome\n2. Reading of previous minutes\n3. Matters arising\n4. Reports\n5. New business\n6. AOB\n7. Closing'],
    ['Tooling the club uses', 'Resource', 'Public', 'Pink', 0, 'GitHub for version control, Discord for day-to-day chat, Google Workspace for documents, and this club management system for records.'],
    ['Post-event debrief template', 'General', 'Public', 'Amber', 0, 'What went well? What went wrong? What will we do differently? Who should be recognised? What did it cost and what did we get for it?']
  ]
  let count = 0
  for (const [title, category, visibility, color, pinned, content] of data) {
    insert('notes', {
      title,
      category,
      content,
      tags: pick(['policy, attendance', 'hackathon, planning', 'course, syllabus', 'ideas', 'resources', 'procedure', 'welfare']),
      author_id: pick(members.slice(0, 10)).id,
      visibility,
      color,
      pinned,
      link_url: chance(0.3) ? 'https://docs.example.com/ict-club/note' : null
    })
    count++
  }
  console.log(`  • ${count} notes`)
}

function seedProjects(members) {
  const data = [
    ['ICT Club Management System', 'Web Application', 'In Progress', 'High', 65, -70, 30, 'React, Node.js, SQLite', 'A complete system for managing members, meetings, attendance, courses and reports.'],
    ['Attendance QR Check-in', 'Mobile Application', 'In Progress', 'High', 45, -45, 55, 'Flutter, Firebase', 'Members scan a QR code to mark attendance at meetings and events.'],
    ['Campus Network Monitor', 'IoT / Embedded', 'Planning', 'Medium', 20, -14, 90, 'Python, Raspberry Pi, MQTT', 'Monitor campus network uptime and alert the ICT directorate on outages.'],
    ['AI Study Assistant', 'AI / Machine Learning', 'In Progress', 'High', 55, -60, 40, 'Python, FastAPI, OpenAI API, React', 'Chatbot that answers questions from course materials.'],
    ['Club Website & Blog', 'Web Application', 'In Review', 'Medium', 85, -100, 12, 'Next.js, Tailwind CSS', 'Public face of the club with news, events and a member gallery.'],
    ['Student Timetable WhatsApp Bot', 'Mobile Application', 'Completed', 'Medium', 100, -180, -25, 'Node.js, WhatsApp Cloud API', 'Sends each student their daily timetable and reminders.'],
    ['Cybersecurity Awareness Toolkit', 'Cybersecurity', 'Completed', 'High', 100, -150, -40, 'Python, Bash', 'Scripts and slides used for the campus awareness campaign.'],
    ['Library Book Tracker', 'Web Application', 'On Hold', 'Low', 30, -120, 70, 'PHP, MySQL', 'Tracks books borrowed by club members from the department library.'],
    ['Robotics Line-Follower Kit', 'Robotics', 'Planning', 'Low', 10, -7, 120, 'Arduino, C++', 'Starter robotics kit for training new members.'],
    ['Data Dashboard for Club Statistics', 'Data Analytics', 'In Progress', 'Medium', 40, -30, 50, 'Python, Streamlit', 'Visual dashboard of attendance, membership and project statistics.']
  ]
  const created = []
  for (const [title, category, status, priority, progress, start, deadline, tech, description] of data) {
    const lead = members.find((m) => m.role === 'Cabinet Member') || members[0]
    const id = insert('projects', {
      title,
      category,
      description,
      objectives: '• Deliver a working solution\n• Document the work\n• Train at least 3 members on the tools used',
      tech_stack: tech,
      lead_id: pick(members.slice(0, 8)).id,
      status,
      priority,
      progress,
      start_date: shift(start),
      deadline: shift(deadline),
      completed_date: status === 'Completed' ? shift(deadline) : null,
      repo_url: `https://github.com/ictclub/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      demo_url: status === 'Completed' ? `https://demo.ictclub.org/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : null,
      budget: pick([0, 25000, 50000, 120000]),
      sponsor: chance(0.35) ? pick(['TechHub Nigeria', 'Alumni Association', 'Campus ICT Directorate']) : null
    })
    created.push({ id, title, status, lead: lead.id })

    // Team
    const team = []
    while (team.length < int(2, 6)) {
      const member = pick(members.filter((m) => m.status === 'Active'))
      if (!team.includes(member)) team.push(member)
    }
    const roles = ['Project Lead', 'Developer', 'Developer', 'Designer', 'Tester', 'Documentation', 'Researcher']
    team.forEach((member, index) => {
      insert('project_members', {
        project_id: id,
        member_id: member.id,
        role: index === 0 ? 'Project Lead' : pick(roles.slice(1)),
        joined_date: shift(start + int(0, 10)),
        contribution: pick(['Frontend implementation', 'API development', 'UI design', 'Testing & QA', 'Documentation', 'Research'])
      })
    })

    // Tasks
    const taskTitles = [
      ['Requirement gathering', 'Done', 100],
      ['System design', 'Done', 100],
      ['Database schema', status === 'Planning' ? 'To Do' : 'Done', status === 'Planning' ? 0 : 100],
      ['Backend endpoints', status === 'Completed' ? 'Done' : 'In Progress', status === 'Completed' ? 100 : int(30, 80)],
      ['Frontend screens', status === 'Completed' ? 'Done' : pick(['In Progress', 'To Do']), status === 'Completed' ? 100 : int(10, 70)],
      ['Testing & bug fixing', status === 'Completed' ? 'Done' : 'To Do', status === 'Completed' ? 100 : 0],
      ['Documentation & handover', status === 'Completed' ? 'Done' : 'To Do', status === 'Completed' ? 100 : 0]
    ]
    for (const [taskTitle, taskStatus, taskProgress] of taskTitles) {
      insert('project_tasks', {
        project_id: id,
        title: `${taskTitle} — ${title}`,
        description: `${taskTitle} for the ${title} project.`,
        assignee_id: pick(team).id,
        status: taskStatus,
        priority: pick(['Low', 'Medium', 'High', 'Critical']),
        due_date: shift(deadline - int(0, 60)),
        progress: taskProgress,
        estimated_hours: int(4, 40),
        actual_hours: taskStatus === 'Done' ? int(4, 40) : null
      })
    }
  }
  const taskCount = all('SELECT COUNT(*) AS c FROM project_tasks')[0].c
  console.log(`  • ${created.length} projects, ${all('SELECT COUNT(*) AS c FROM project_members')[0].c} team members, ${taskCount} tasks`)
}

function seedActivityLog(users) {
  const rows = [
    [1, 'create', 'members', 'Added new member profiles'],
    [1, 'create', 'meetings', 'Created General Assembly — November'],
    [2, 'attendance', 'attendance', 'General Assembly — November: 32 records'],
    [1, 'update', 'courses', 'Updated React course schedule'],
    [2, 'create', 'notes', 'Published attendance policy reminder'],
    [1, 'certificates', 'certificates', 'Issued course completion certificates'],
    [1, 'settings', 'settings', 'Updated club profile']
  ]
  rows.forEach(([, action, resource, detail], index) => {
    logActivity({
      userId: users.admin,
      userName: index % 3 === 0 ? 'Amina Yusuf' : 'Ibrahim Bello',
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
    console.log('  Run `npm run db:reset` to wipe and reload the demo data.\n')
    process.exit(0)
  }

  console.log('\n  Seeding ICT Club demo data…')
  if (RESET) wipe()

  const userIds = seedUsersAndSettings()
  const members = seedMembers()
  seedCabinet(members, userIds)
  const meetings = seedMeetings(members)
  const activities = seedActivities(members)
  const courses = seedCourses(members)
  seedEnrollments(courses, members)
  seedAttendance(meetings, activities, courses, members)
  seedReports(members)
  seedCertificates(members, courses, activities)
  seedNotes(members)
  seedProjects(members)
  seedActivityLog(userIds)

  const settings = all('SELECT COUNT(*) AS c FROM settings')[0]
  console.log(`  • ${settings.c} settings`)
  console.log('\n  Done. Sign in with:')
  console.log('    admin@ictclub.org   / admin123    (full access)')
  console.log('    cabinet@ictclub.org / cabinet123  (cabinet access)')
  console.log('    member@ictclub.org  / member123   (member access)\n')
}

main()
