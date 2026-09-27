/**
 * Ensures the club administrator account exists with the given credentials and
 * removes the old demo logins if they are still around.
 *
 *   npm --prefix server run admin
 *   npm --prefix server run admin -- --name "Sharp" --password "NewPass@2026" --email sharp@school.ac.ug
 *
 * Handy when the administrator password is lost, or after restoring a backup
 * that still carries the old demo accounts.
 */
import { all, get, insert, run, updateRow } from './db.js'
import { hashPassword } from './auth.js'

/* Legacy demo accounts shipped with early versions of the system. */
const LEGACY_DEMO = ['admin@school.ac.ug', 'executive@school.ac.ug', 'member@school.ac.ug']

function arg(flag, fallback) {
  const index = process.argv.indexOf(flag)
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

const name = arg('--name', 'Sharp')
const username = arg('--username', 'Sharp')
const email = arg('--email', 'sharp@school.ac.ug')
const password = arg('--password', 'SunnyDay@2026')

if (!email.includes('@')) {
  console.error('  The email must be a valid address.')
  process.exit(1)
}
if (password.length < 6) {
  console.error('  Use a password of at least 6 characters.')
  process.exit(1)
}

const existing =
  get('SELECT * FROM users WHERE lower(email) = lower(?) OR lower(username) = lower(?)', [email, username]) || null

if (existing) {
  updateRow('users', existing.id, {
    name,
    username,
    email,
    password_hash: hashPassword(password),
    role: 'admin',
    status: 'active'
  })
  console.log(`  • updated the administrator account (${name} / ${email})`)
} else {
  const id = insert('users', {
    name,
    username,
    email,
    password_hash: hashPassword(password),
    role: 'admin',
    status: 'active'
  })
  console.log(`  • created the administrator account (${name} / ${email}) as user #${id}`)
}

/* Make sure the account is linked to a teacher patron profile when one exists. */
const admin = get('SELECT id, member_id FROM users WHERE lower(email) = lower(?)', [email])
if (admin && !admin.member_id) {
  const patron = get("SELECT id FROM members WHERE role = 'Teacher Patron' ORDER BY id LIMIT 1")
  if (patron) {
    run('UPDATE users SET member_id = ? WHERE id = ?', [patron.id, admin.id])
    console.log('  • linked the account to the teacher patron profile')
  }
}

let removed = 0
for (const legacy of LEGACY_DEMO) {
  if (legacy.toLowerCase() === email.toLowerCase()) continue
  const row = get('SELECT id FROM users WHERE lower(email) = lower(?)', [legacy])
  if (!row) continue
  run('DELETE FROM sessions WHERE user_id = ?', [row.id])
  run('DELETE FROM users WHERE id = ?', [row.id])
  removed += 1
  console.log(`  • removed the old demo account ${legacy}`)
}

const remaining = all('SELECT name, username, email, role FROM users ORDER BY id')
console.log(`\n  ${remaining.length} account(s) can sign in${removed ? `, ${removed} demo account(s) removed` : ''}:`)
for (const user of remaining) {
  console.log(`    ${(user.username || user.email).padEnd(22)} ${user.role.padEnd(8)} ${user.name}`)
}
console.log('')
