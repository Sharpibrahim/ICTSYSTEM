# Firebase shared database — setup and behaviour

This is the route to use when several officers must work on the **same records**
(attendance taken on one phone, finance entered on the desktop, reports prepared
on the club laptop). It is built into **Settings → Data → Cloud backup and shared
database → Firebase shared database**.

The app still stores everything on the device first. Firebase is the shared copy:
edits are queued locally and uploaded when there is internet, so the club keeps
working when the network drops.

---

## 1. Why Firebase and not something else

| | Firebase (Firestore) | Supabase | PocketBase on the school PC |
|---|---|---|---|
| Offline editing | **Built in** — writes queue on the device and sync | Not by default; needs custom code | LAN only |
| Free tier | 50 000 document reads, 20 000 writes and 20 000 deletes **per day**, 1 GiB stored, 10 GiB/month transfer | 500 MB database, 1 GB files, 5 GB/month; project pauses after 7 days idle | Unlimited, but you supply the machine |
| Accounts | Firebase Authentication (free to 50 000 users) | Supabase Auth | Users inside PocketBase |
| Best when | Internet is patchy, several phones | Steady internet and you want SQL reports | No internet, data must stay on campus |

A club of a few hundred members producing a few hundred edits a day uses well
under 1 % of the free daily quota. The full comparison is in
`DATABASE-OPTIONS.md`.

---

## 2. Setup (about twenty minutes, once)

1. **Create the project** at <https://console.firebase.google.com> using a school
   Google account → *Add project* → name it e.g. `MRHS ICT Club`. Analytics is not
   needed.
2. **Create the database**: *Build → Firestore Database → Create database*.
   Pick the closest location (`europe-west1` is reasonable from Uganda) and start
   in **Production mode**.
3. **Turn on accounts**: *Build → Authentication → Get started →
   Email/Password → Enable*.
   Then *Users → Add user* for each officer who will enter data, for example
   `ict@mrhs.ac.ug`, `patron@mrhs.ac.ug`, `president@mrhs.ac.ug`. (Use real
   school addresses — these are the accounts that protect the club's data.)
4. **Copy the connection details**: *Project settings → General → Your apps → Web
   app* (create a web app if there is none). Copy the **Project ID** and the
   **Web API key**.
5. **Paste the security rules**: *Firestore Database → Rules*, replace with the
   block in section 3 below, then **Publish**.
6. **In the app**: *Settings → Data → Cloud backup and shared database →
   Firebase shared database* → paste the two values → **Save connection details**
   → **Connect Firebase** → sign in with one of the accounts created in step 3 →
   **Sync now**.

Every other device the officers use repeats only step 6 (with its own account).
Use **How to set it up** in the app for the same instructions with the values at
hand.

---

## 3. Security rules

Start with this (any signed-in club account may read and write, nothing else):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Stricter version — the same signed-in accounts, but records may only be changed
by officers. Add a `roles/{uid}` document per officer with a `role` field and use:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function officer() {
      return request.auth != null &&
        get(/databases/$(database)/documents/roles/$(request.auth.uid)).data.role in
          ['admin', 'patron', 'president', 'secretary', 'treasurer'];
    }
    match /{document=**} {
      allow read: if request.auth != null;
      allow write: if officer();
    }
  }
}
```

Notes

- The **Web API key** in the app is not a secret; the rules above are what protect
  the data. Never publish rules that allow `if true`.
- Firestore is a document database: it stores what the app sends (the same JSON
  the backups contain), so no schema or SQL is needed.

---

## 4. What is shared, and what never leaves the device

| Shared (22 collections) | Stays on the device only |
|---|---|
| members, cabinet, cabinetHistory, meetings, attendance, courses, enrollments, lessons, activities, projects, projectTasks, reports, certificates, resources, announcements, tasks, equipment, transactions, achievements, gallery, albums, documents | **users** (officer accounts and password hashes), **auditLog**, **verifications**, **notifications** |

Everything else — the certificate designs, club settings, theme — stays local;
settings are shared only through a JSON backup.

---

## 5. How the syncing behaves

- **Local first.** Every edit is written to the browser immediately and marked as
  pending. The card shows how many changes are waiting.
- **Automatic mode** (the switch in the card): after any edit the app waits about
  five seconds, then uploads in batches of up to 400 records; every ten minutes it
  also downloads what other officers changed. Turning it off means records are
  exchanged only when someone presses **Sync now**.
- **Conflict rule — last write wins**, compared on each record's `updatedAt`
  timestamp. A record edited here later than the cloud copy wins; otherwise the
  cloud copy is applied. Local edits are never thrown away silently: if a local
  record is newer it is kept *and* uploaded on the next push. The download message
  reports how many local edits were kept.
- **Offline behaviour.** With no internet the app keeps working; the queue waits,
  and the top of the card says how many records are pending. The moment the
  connection returns (or the app is reopened), they upload.
- **Deletes** are uploaded as deletes; a push never deletes anything locally.
  "Load from Firebase" only removes local records in the *replace* mode, which the
  app does not use by default — it merges.
- **“Upload everything”** ignores the queue and sends all 22 collections; use it
  after importing a backup.
- **No SDK, no CDN.** The connector talks to the Firebase REST APIs directly, so
  the app still has no build step and no third-party scripts.

---

## 6. Housekeeping

- **A database is not a backup.** Keep the weekly JSON backup to OneDrive/Drive as
  well; Firestore has no easy "restore to yesterday" on the free plan.
- **Deleting a record twice.** If two officers delete the same member, one delete
  arrives and the other is ignored — the final state is the same.
- **Rotating officers.** Remove a leaving officer's account in *Authentication →
  Users*; the records stay. Create a new account for the replacement.
- **Costs.** The Spark (free) plan needs no card. If the club ever exceeds the
  daily quota the writes stop for the rest of the day (the app shows the error and
  keeps the queue), and nothing is charged. Upgrade to Blaze only if that
  genuinely happens, and pay it from the club account with the receipt filed under
  *Finance → Expenses → Internet*.

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| “That email address and password were not accepted.” | Create the account in *Authentication → Users*, or reset its password there. |
| “Email/password sign-in is not enabled for this project yet.” | *Authentication → Sign-in method → Email/Password → Enable*. |
| “That Firebase project or database was not found.” | Check the Project ID, and that Firestore has been created in that project. |
| “Firebase refused the request (403).” | Publish the security rules in section 3, and confirm you are signed in. |
| “The API key does not match that Firebase project.” | Copy the Web API key again from *Project settings → General*. |
| Records do not appear on the other device | Press **Sync now** there; check the pending count and that both devices use the same project ID. |
| The app says “Offline” | The preview sandbox and airplane mode cannot reach Google; open the app from its real address. |
| A local edit disappeared after a download | It should not: the newer copy wins. Check the record's `updatedAt` — if the cloud copy really is newer, the other officer's edit overwrote it (by design). |
