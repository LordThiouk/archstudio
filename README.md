# Architecture Studio

**A self-hosted studio for architecture documentation. Organise many architectures in folders,
build each one by dragging components onto layers, and export a self-contained HTML file anyone
can open.**

```bash
npm install
npm run dev          # http://localhost:3000
```

That is the whole setup. No database server, no accounts, no cloud. A SQLite file appears at
`data/studio.db` on first run, seeded with two example architectures so the editor has something
to open.

---

## What it does

**Workspace** — every architecture is a project. Projects live in nested folders you create;
drag a project card onto a folder in the sidebar to move it. Search across all of them.

**Editor** — the canvas is your architecture. Layers are rows; drag components between them, drag
a component onto another to reorder, drag the dot under a card onto another card to create a
dependency. The inspector on the right edits whatever is selected — name, scope, layer, icon,
technologies, role, responsibilities, dependencies. Nothing has a Save button: edits persist
700 ms after you stop typing.

**Preview** — the preview tab is not a re-implementation. It renders, in an iframe, byte-for-byte
the file you get when you click Export. One renderer, no drift between what you see and what you
ship.

**Export** — a single self-contained HTML file (~65 KB, no external requests) you can email,
attach to a ticket, commit, or host anywhere. Also exports raw JSON, and an `architecture.js`
data file for the standalone viewer.

**Import** — accepts JSON or a `window.ARCHITECTURE = {…}` data file. Paste it or pick the file.

---

## The document format

Each project stores one JSON document — the same shape the viewer consumes. Its core is:

- **groups** — scopes of responsibility, one colour each. Three to five works; six is the ceiling
  before colours stop being distinguishable.
- **layers** — horizontal bands, top to bottom. From four layers up, the last one is treated as
  *support* and drawn without edges, so the infrastructure row does not turn into spaghetti.
- **components** — anything nameable: an app, an API, a database, a bucket, a vendor.
- **deps** — who calls whom. Direction matters: caller → callee.

Beyond that the format carries `flows`, `technologies` and editorial `sections`
(`compare`, `cards`, `timeline`, `table`, `text`). Those render in the preview and the export,
and survive a round-trip through import/export — but they are **not editable in the UI yet**.
Today you author them in JSON and import. See `src/lib/types.ts` for the full contract.

---

## Architecture of the app itself

```
src/app/                  Next.js 15 App Router
  page.tsx                workspace (server) → components/Workspace
  projects/[id]/page.tsx  editor (server)    → components/Editor
  api/                    folders, projects, export, import, revisions
src/components/           Workspace, Editor, Inspector, Icon
src/lib/
  db.ts                   node:sqlite connection + schema
  store.ts                every query in the app lives here
  types.ts                the document contract
  defaults.ts             blank document, palette, normalisation
  exportHtml.ts           document → self-contained HTML
viewer/                   the standalone renderer, verbatim
data/studio.db            your data
```

**Why the document is a JSON blob instead of normalised tables.** The editor holds the whole
document in memory and writes it atomically. Splitting components, dependencies, flows and
sections across six tables would buy joins we never make, and would make import/export a
migration problem. Folders, ordering and revision history *are* relational, because those are
the things we query and reorder.

**Why `node:sqlite` and not Prisma.** Prisma downloads a ~20 MB query engine at install time and
needs a `generate` step — real friction for a tool whose pitch is "clone and run". `node:sqlite`
ships inside Node 22.5+, so `npm install` pulls six packages and nothing native. The cost is
hand-written SQL and an API Node still marks experimental. Every query is in `src/lib/store.ts`;
if you outgrow it, that one file is what you rewrite. **Requires Node ≥ 22.5.**

**Revisions.** Every save older than five minutes since the last snapshot writes one, capped at
30 per project. The API is live at `GET/POST /api/projects/:id/revisions`; there is no UI for it
yet.

---

## Deploying it

It is a normal Next.js app with one caveat: it writes to the filesystem, so it does **not** run
on serverless platforms with a read-only disk (Vercel, Netlify functions). Run it where it can
keep a file:

```bash
npm run build && npm start          # a VPS, a Raspberry Pi, a container with a volume
```

There is no authentication. Put it behind your VPN, a reverse-proxy basic-auth, or a Tailscale
network — do not expose it to the open internet as is. Adding auth means one middleware and a
session check in the API routes; the data model does not need to change.

---

## Roadmap

- Visual editors for flows, the technology table and editorial sections (JSON-only today)
- Revision history UI — the data is already there
- Keyboard navigation on the canvas, and undo/redo
- Optional auth for shared installs
- Multi-select and bulk move on the canvas

## License

MIT.
