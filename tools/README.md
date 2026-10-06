# Checks

Small harnesses used while building the platform. They are **not** part of the
published site — `tools/` is listed in `.vercelignore`, so Vercel never uploads
it.

```
cd tools
npm install                 # jsdom + css-tree, one time
node ../… nothing else needed
```

The app must be running for the live checks:

```
cd ..                       # the repository root
python3 -m http.server 8080 --bind 0.0.0.0
```

Then, in another terminal:

| Command | What it proves |
|---|---|
| `node tools/check.js` | Stylesheets parse, all eleven colour schemes carry every token, one cache token, deployment files present, every script parses, a rule exists for every target width; then the app boots, all 25 routes render, every scheme applies, the first-run password gate holds, the audit trail is administrator-only and the cloud role claim is published. |
| `node tools/check-responsive.js` | Breakpoint coverage (340 → 2560 px), no fixed width escapes its container, no bare `100vw`, and the app renders all routes at phone, tablet, laptop and desktop sizes with the navigation reachable at each. |
| `node tools/check-css.js ../css/*.css` | Chunk-by-chunk stylesheet parsing, so a malformed block is reported with its line. |
