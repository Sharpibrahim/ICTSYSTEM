# MRHS ICT CLUB MASTER — hosting on Vercel

The platform is plain HTML, CSS and JavaScript: there is **no build step**, no
package manager and no server-side code. Vercel simply serves the folder as a
static site, so the whole deployment is "import the repository and press
Deploy".

---

## 1. Deploy (about three minutes)

1. Make sure the branch you want to publish is pushed to GitHub.
2. Go to **https://vercel.com** and sign in (GitHub sign-in is easiest — it
   means Vercel can already see this repository).
3. On the dashboard press **Add New…** → **Project**.
4. Find **ICTSYSTEM** in the list of repositories and press **Import**.
5. On the configuration screen:
   - **Framework Preset**: leave it on **Other**.
   - **Root Directory**: leave it as the repository root (`.`) — `index.html`
     sits there.
   - **Build Command**: leave **empty** (press *Override* and clear it if Vercel
     suggests one).
   - **Output Directory**: leave **empty** as well; Vercel then serves the
     repository root.
   - **Environment Variables**: none.
6. Press **Deploy**. The first build takes a few seconds because there is
   nothing to compile.
7. You get a link such as `https://ictsystem.vercel.app` (and a personal one
   like `https://ictsystem-yourname.vercel.app`). That link is the app: open it
   on the office computer, on phones, and share it with the patron.

If Vercel ever asks about a "Production Branch", pick the branch you pushed —
this project is published from one branch only.

### If the first deploy shows "404 NOT_FOUND"

Vercel deploys one branch as the **production** site, and a fresh import picks
the repository's default branch — `main`. On this repository `main` is still the
original placeholder, so a deployment built from it has nothing to serve and
Vercel answers **404 NOT_FOUND**. The application lives on the working branch
`arena/01a10127-ictsystem`, together with this guide, `vercel.json` and the
whole platform.

The build itself was fine — it was told to publish an empty branch. Two ways
out, and either one is permanent:

**Fix it on GitHub (recommended, the default import then works forever).**
Merge the open pull request **#2** on GitHub (green **Merge pull request**, then
**Confirm merge**). That brings `index.html`, `css/`, `js/`, `assets/` and
`vercel.json` into `main`, and Vercel rebuilds automatically the moment the
merge lands. Every later merge to `main` redeploys the site.

**Or fix it in Vercel (no merge).** In the project, open
**Settings → Git → Production Branch**, type `arena/01a10127-ictsystem`, press
**Save**, and then publish a deployment from that branch: open **Deployments**,
and on the newest deployment press **⋯ → Promote to Production**. If the list
still only contains builds of `main`, push any new commit to
`arena/01a10127-ictsystem` — Vercel will build it as production under the new
setting.

Whichever you choose, open the project's **Deployments** tab afterwards: the
newest entry should say **Ready** and name `arena/01a10127-ictsystem` (or `main`
after the merge). Press **Visit** on it, or just refresh the public link.

### What the folder contains for Vercel

| File | Why |
|---|---|
| `index.html` | the app itself; served at `/` |
| `vercel.json` | cache rules and security headers (no build, no functions) |
| `assets/`, `css/`, `js/`, `docs/` | logo and link-preview card, styles, modules, guides |
| `.vercelignore` | keeps the local screenshot folder and git files out of the upload |

There is nothing to configure, and no `package.json` is needed.

---

## 2. Before you hand the link around

- **Set your own passwords.** The eight accounts still carry the shipped
  demonstration password the first time anyone signs in; the app forces each
  officer to choose their own. Do that once on the deployed site (see the
  README, *Signing in*).
- **Connect Firebase** if more than one device must share the same live records
  (`Settings → Data → Firebase shared database`), then sign in and press
  **Sync now**. Without it, each browser keeps its own copy of the records and
  you move data with JSON backups.
- **Publish the security rules** described in `docs/FIREBASE.md` — including
  the per-role version — so that only officers can change shared records.
- **Keep taking backups.** Vercel serves the app; it does not store your data.
  Records live in the browser (and in Firebase if you connected it). A signed-in
  administrator should download a JSON backup every term: `Settings → Data →
  Download backup`, and keep it in the school's shared Drive folder.

---

## 3. Updating the published app

1. Push your changes to the branch Vercel is building.
2. Vercel deploys the new version automatically within a minute and keeps the
   old one as a rollback point (**Deployments** tab → **⋯** → **Promote to
   Production**).
3. On the office computer press **Ctrl + Shift + R** once. Every asset carries a
   `?v=` token, so a hard refresh is all that is needed — the browser cannot
   serve a stale stylesheet or module.

---

## 4. Custom domain (optional)

1. Project → **Settings** → **Domains** → add e.g. `ictclub.mbazziriverside.ac.ug`.
2. Vercel shows the DNS records to create at the school's domain registrar.
   A `CNAME` to `cname.vercel-dns.com` is the usual answer for a sub-domain.
3. Wait for the certificate; Vercel issues HTTPS automatically and free.

A `.vercel.app` address is perfectly usable in the meantime.

Vercel issues the HTTPS certificate for the new name automatically. Add that
domain to Firebase → Authentication → Settings → **Authorized domains** if the
club uses Microsoft/Firebase sign-in on it.

---

## 5. Is anything about the app Vercel-hostile?

- **No build, no functions, no environment variables** — so nothing to break.
- **No CDN references** — every icon, font and image is local or an inline SVG,
  which is exactly what a static host likes.
- **Hash routing** (`#/members`, `#/audit`, …) means every module is reachable
  and a refresh never produces a 404; you do not need rewrite rules for it.
- **Firebase calls** go from the browser straight to Google, which is allowed
  from any origin. Add the Vercel domain to Firebase → Authentication →
  Settings → **Authorized domains** if you switch to the stricter per-role
  rules and see an `auth/unauthorized-domain` message.
- **Data** is in the browser and (optionally) Firebase — never on Vercel, so a
  redeploy can never touch club records.

---

## 6. Sharing the repository instead

If you would rather let Vercel build from a fresh copy, everything needed is
committed: clone the repository, and deploy with the CLI if you prefer typing:

```
npm i -g vercel
vercel          # preview deployment, answers a few questions
vercel --prod   # publish
```

Both routes produce the same static site.
