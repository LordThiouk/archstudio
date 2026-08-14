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

**Document** — the same architecture as a numbered, printable design document. Print it from the
browser to get a PDF.

**Import** — accepts JSON or a `window.ARCHITECTURE = {…}` data file. Paste it or pick the file.

---

## Templates

“New project” opens two steps: pick a starting point, then name it and aim it at a deployment
target. Six templates ship with the app, in English and French:

| Template | Components | What it answers |
|---|---|---|
| Serverless MVP | 15 | “We launch in six weeks, we are two, we do not want servers” |
| Multi-tenant B2B SaaS | 18 | “Several customer companies on one platform, isolated” |
| RAG — questions over documents | 17 | “Answer questions about our own corpus” |
| Event-driven processing | 16 | “Streams, queues, decoupling, replay” |
| Modular monolith | 14 | “One deployable application, well partitioned inside” |
| Multi-service architecture | 19 | “Several teams, several services, each with its own data” |

Each one carries components, dependencies, flows and three to four written sections — the
comparison of tenancy isolation models, the delivery-guarantee table, the “when to leave
serverless” thresholds. That editorial content is the point; the boxes are the easy part.

**Six templates, not thirty.** A template describes an *abstract* architecture, and every
component carries a per-target correspondence table. The target — vendor-neutral, AWS, Google
Cloud, Azure or self-hosted — is resolved once, at creation:

```
Template (abstract)          Target           Generated document
───────────────────          ──────           ──────────────────
"Message queue"        +     AWS        →     Amazon SQS
                             GCP        →     Cloud Pub/Sub
                             Azure      →     Azure Service Bus
                             self-hosted →    RabbitMQ / NATS JetStream
                             neutral    →     Message queue
```

The `id` never changes, so dependencies stay valid. Resolution filters components a target has no
equivalent for, rewires dependencies straight through the gap (and says so, on the component that
lost a hop), drops flow steps that no longer point anywhere, and generates a *Deployment* tab
listing the whole mapping.

A component whose identity is its business domain — “Service — orders”, “Module — billing” —
keeps its name and takes only the technologies from the target. Five service cards all reading
“ECS Fargate” would be a worse diagram than five cards saying what they do.

**A template is a starting point, not a recommendation**, and the app says so three times: in the
creation dialog, in each template's *Not this one when* list (shown before you choose), and in
`meta.principle` at the top of the generated document, where it is impossible to miss.

**The document has no link back to the template.** No inheritance, no “update from template”
that could overwrite someone's work. Adding a cloud means adding a column to
`src/lib/templates/services.ts`, not writing six more templates.

```
src/lib/templates/
  types.ts              the template contract, and the {en,fr} string helper
  services.ts           the cross-target service table — the file to re-read when a vendor renames something
  index.ts              registry + instantiate()
  serverless-mvp.ts  saas-multitenant.ts  rag.ts
  event-driven.ts    monolith.ts          multi-service.ts
  templates.test.ts     6 templates × 5 targets × 2 languages = 60 documents
  __snapshots__/        one digest per template, to catch silent drift
```

Service names were verified on 2026-08-14 and the date is in `services.ts`. They move — Cloud
Functions became Cloud Run functions, Azure AI Foundry became Microsoft Foundry, Azure AD B2C is
closing in favour of Entra External ID. Re-read that file once a year.

```bash
npm test                        # the 60 instantiations and their invariants
UPDATE_SNAPSHOTS=1 npm test     # accept a deliberate change
```

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
(`compare`, `cards`, `timeline`, `table`, `text`), all edited from the **Content** tab, plus the
one optional field the printable document reads — `sections[].doc.chapter`. See
`src/lib/types.ts` for the full contract.

---

## The design document

The viewer is tabbed and interactive; a design document is linear and numbered. The **Document**
button in the editor opens `/projects/:id/document` — the same JSON, rendered for paper, with a
cover, a table of contents, numbered chapters, and the diagram as a figure. Print it and choose
“Save as PDF”. **No dependency to install, and no headless browser on the server**: the one
prerequisite is a browser that can print, which is the browser you already opened it in.

The plan follows the Architecture Design Document structure:

```
1  Introduction                     meta.intro, header facts, the principle callout
2  Application architecture         the diagram, then the component inventory, then your chapters
3  Organisation architecture        your chapters
4  DevOps & delivery                your chapters
5  Cost estimation                  your chapters
6  Appendices                       unslotted sections, flows, the technology table
```

A section says where it belongs through one optional field, `doc.chapter` — `"2.4"` — edited in
the Sections panel. **The slot decides order, not the printed number**: numbering is recomputed
from the final position, so deleting a chapter renumbers the rest and an empty part disappears
instead of leaving a hole. A section with no slot lands in the appendices, and nothing else in
the document format changes — the viewer ignores the field entirely.

**The ADD preset.** The Sections panel offers to add the thirteen written chapters an ADD is
expected to carry: scope, data, scalability, tenancy, RPO/RTO, observability, resource
segmentation, IAM, networking, cost management, governance, delivery, cost estimate. They arrive
empty, structured, bilingual and *vendor-neutral* — service names belong to the components, which
already carry their per-target table. Applying it twice adds nothing.

They are also added **off the tab bar**: written for paper, absent from `ui.tabs`, so the
interactive viewer is exactly as it was. Turn one on from the Tabs panel if you want it on
screen too.

**One design, two media.** The print stylesheet is `viewer/style.css` transposed, not a second
look: same tokens, same card, same icon chip, same technology pills, same pole, same phase, same
note — the document's own `theme.brand` drives the page. A card carries its scope colour the way
the diagram does, on the chip and the pills, and its border stays neutral. Anything in
`document/document.css` that reads as a new visual idea is a bug. Two things are deliberately not
copied: hover and focus states, which paper does not have, and the shadow, which becomes a token
set to `none` when printing rather than a rule that disappears.

**The diagram is the hard part.** Edges are geometry measured after layout, and print layout is
not screen layout — measuring at `beforeprint` returns screen coordinates, which is the wrong
number by definition. So the diagram is laid out on a fixed 1000 px stage and scaled by a
transform, on screen and on paper alike: uniform scaling leaves the measured coordinates valid.
On paper the scale fits the page width, or the page height when the diagram is tall enough to
run off the bottom.

Two things a print stylesheet cannot do for you. Keep **background graphics on** in the print
dialog or the scope colours vanish; and the ADD's other diagrams — resource hierarchy, network
topology, CI/CD pipeline — have no equivalent in the document format, so those chapters are
prose and tables today.

If you want the PDF produced by the server rather than by a person, any headless Chrome will
render this route as it stands:

```bash
chrome --headless --no-pdf-header-footer \
  --print-to-pdf=architecture.pdf http://localhost:3000/projects/<id>/document
```

---

## Architecture of the app itself

```
src/app/                  Next.js 15 App Router
  page.tsx                workspace (server) → components/Workspace
  projects/[id]/page.tsx  editor (server)    → components/Editor
  projects/[id]/document/ the printable design document — plan, renderer, print CSS
  api/                    folders, projects, templates, export, import, revisions
src/components/           Workspace, Editor, Inspector, Icon
src/lib/
  db.ts                   node:sqlite connection + schema
  store.ts                every query in the app lives here
  types.ts                the document contract
  defaults.ts             blank document, palette, normalisation
  templates/              the six templates and instantiate()
  document/               the ADD outline (plan.ts) and its chapter preset
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

- Diagram placeholders for the document chapters that have none — network topology, CI/CD pipeline
- Revision history UI — the data is already there
- Keyboard navigation on the canvas, and undo/redo
- Optional auth for shared installs
- Multi-select and bulk move on the canvas

## License

MIT.
