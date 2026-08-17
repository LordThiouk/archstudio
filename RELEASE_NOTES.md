# ArchStudio 1.0.0

**Draw the architecture once. Send the document.**

The first stable release. A self-hosted studio for architecture documentation: organise many
architectures in folders, build each one by dragging components onto layers, and export a
self-contained HTML file anyone can open — or print the same architecture as a numbered design
document.

```bash
npm install
npm run dev          # http://localhost:3000
```

That is the whole setup. No database server, no accounts, no cloud. A SQLite file appears at
`data/studio.db` on first run, seeded with one example architecture so the editor has something
to open.

---

## What ships in 1.0

### The studio

**Workspace.** Every architecture is a project. Projects live in nested folders you create; drag
a project card onto a folder in the sidebar to move it. Search across all of them.

**Editor.** Layers are rows; drag components between them, drag a component onto another to
reorder, drag the dot under a card onto another card to create a dependency. The inspector on the
right edits whatever is selected. Nothing has a Save button — edits persist 700 ms after you stop
typing.

**Dependencies that say how, not just who.** A dependency takes a protocol, a note, and one of
three kinds — synchronous, asynchronous, batch. The kind is drawn rather than written: a solid
line waits for its answer, a dashed one is queued, a dotted one is scheduled. It is the stroke and
not the colour, because colour already means scope and a dash survives a monochrome print. All of
it is optional; an edge nobody annotated draws exactly as it always did.

**History.** Every save older than five minutes since the last one writes a snapshot. The History
panel lists them and, for each, what changed *since* it — components added and removed, renames,
moves between layers, edges gained and lost. Name a version ("sent to the client") and it is kept
for good; the 30-snapshot cap only prunes automatic ones. Restoring writes a *Before restore*
snapshot first, so a restore is itself undoable.

**Preview.** The preview tab is not a re-implementation. It renders, in an iframe, byte-for-byte
the file you get when you click Export. One renderer, no drift between what you see and what you
ship.

**Export.** A single self-contained HTML file (235–240 KB, no external requests) you can email,
attach to a ticket, commit, or host anywhere. "No external requests" includes the typefaces:
Archivo and Space Mono are inlined as base64, which is why the file looks like the studio on a
machine that has never heard of either. Raw JSON and a standalone `architecture.js` data file
export too.

**Import.** Accepts JSON or a `window.ARCHITECTURE = {…}` data file. Paste it or pick the file.

### The diagram at scale

Past about two dozen components the diagram reorganises itself. Each layer splits into one column
per scope instead of one long wrapping row, and cards drop to their icon and name so twice as many
fit — both switchable from the toolbar, both settable up front with `ui.architecture.cluster` and
`ui.architecture.compact`.

The sheet also gains a scale. **Fit** finds the largest size at which the whole thing is on screen
at once, Ctrl (or ⌘) and the wheel zooms, dragging the paper pans it, and the last button takes
the diagram full screen — with its toolbar, because a full screen you cannot filter or zoom is a
poster. Zooming out reflows rather than shrinking away from the frame, so a smaller scale means
more components per row and not just smaller type. Filtering by scope removes emptied columns
rather than fading them, so the drawing actually gets shorter when you narrow it. Printing ignores
all of it and lays the diagram out whole, at 1:1.

### Six templates, five deployment targets

"New project" opens two steps: pick a starting point, then name it and aim it at a deployment
target.

| Template | Components | What it answers |
|---|---|---|
| Serverless MVP | 15 | "We launch in six weeks, we are two, we do not want servers" |
| Multi-tenant B2B SaaS | 18 | "Several customer companies on one platform, isolated" |
| RAG — questions over documents | 17 | "Answer questions about our own corpus" |
| Event-driven processing | 16 | "Streams, queues, decoupling, replay" |
| Modular monolith | 14 | "One deployable application, well partitioned inside" |
| Multi-service architecture | 19 | "Several teams, several services, each with its own data" |

Each carries components, dependencies, flows and three to four written sections — the comparison
of tenancy isolation models, the delivery-guarantee table, the "when to leave serverless"
thresholds. That editorial content is the point; the boxes are the easy part.

**Six templates, not thirty.** A template describes an *abstract* architecture, and every
component carries a per-target correspondence table. The target — vendor-neutral, AWS, Google
Cloud, Azure or self-hosted — is resolved once, at creation: "Message queue" becomes Amazon SQS,
Cloud Pub/Sub, Azure Service Bus, or RabbitMQ / NATS JetStream. The `id` never changes, so
dependencies stay valid. Resolution filters components a target has no equivalent for, rewires
dependencies straight through the gap (and says so, on the component that lost a hop), drops flow
steps that no longer point anywhere, and generates a *Deployment* tab listing the whole mapping.

A template is a starting point, not a recommendation, and the app says so three times — in the
creation dialog, in each template's *Not this one when* list, and in `meta.principle` at the top
of the generated document. The document keeps no link back to the template: no inheritance, no
"update from template" that could overwrite someone's work.

Both languages ship. `npm test` instantiates 6 templates × 5 targets × 2 languages = 60 documents
and checks their invariants against a snapshot digest, so silent drift is caught rather than
discovered.

### Flow patterns

Flows walk a reader through the architecture one step at a time, and 1.0 adds a catalogue of the
eight that recur everywhere: **auth/login, checkout, inbound webhook, async job, file upload, RAG
query, CI/CD, incident response.**

A flow step points at a component *by id*, and ids are local to a document — so a reusable flow
cannot carry its bindings. It carries a description of the component each step is looking for, and
the binding is decided again at insertion time against whatever the target document actually
contains. A scorer weighs each step's hints against your components, proposes a binding, and shows
you the result before anything is written. Every hint in the catalogue is checked against the demo
project and the six architecture templates by its test suite, which is the only reason to trust
any of them.

Flows you write yourself can be **saved to a personal library** and dropped into another project
the same way. Entries are normalised on read, so a shape change ages an old entry out rather than
breaking the picker.

### The printable design document

The viewer is tabbed and interactive; a design document is linear and numbered. **Document** in
the editor opens the same JSON rendered for paper — a cover, a table of contents, numbered
chapters, and the diagram as a figure. Print it and choose "Save as PDF". No dependency to
install and no headless browser on the server: the one prerequisite is a browser that can print.

The plan follows the Architecture Design Document structure — Introduction, Application
architecture, Organisation architecture, DevOps & delivery, Cost estimation, Appendices. A section
says where it belongs through one optional field, `doc.chapter`. The slot decides order, not the
printed number: numbering is recomputed from the final position, so deleting a chapter renumbers
the rest and an empty part disappears instead of leaving a hole.

**The ADD preset** adds the thirteen written chapters an ADD is expected to carry — scope, data,
scalability, tenancy, RPO/RTO, observability, resource segmentation, IAM, networking, cost
management, governance, delivery, cost estimate. Empty, structured, bilingual and vendor-neutral.
Applying it twice adds nothing. They arrive off the tab bar, so the interactive viewer is exactly
as it was.

One design, two media: the print stylesheet is the viewer's stylesheet transposed, not a second
look. Anything in `document.css` that reads as a new visual idea is a bug.

### Reading documents *(opt-in, off until you configure a model)*

Hand ArchStudio a design document, an RFC or an onboarding guide as PDF or Markdown and it drafts
the diagram the document describes: scopes, layers, components, dependencies, and the role and
responsibilities of each. The same reading runs against a project that already exists —
**Enrich** — where it can only add: new components, missing dependencies, and text in the fields
you left empty. Nothing you have written is ever overwritten, and applying leaves a named version
in History to go back to.

Nothing is written until you have read what came back. The review screen states what the model had
to assume, what it could not answer, and what had to be repaired before the document could open —
a dependency on a component it never defined, an icon that does not exist. Treat all of it as a
draft: it is one reading of one document, and the dependencies especially deserve a second pair of
eyes.

This is the one feature that leaves your machine, so it is yours to point:

| Provider | Endpoint | PDFs | Token count before a run |
|---|---|---|---|
| Anthropic | built in | yes | exact |
| Google Gemini | built in | yes | exact |
| OpenAI | built in | text only | estimated |
| NVIDIA NIM | built in | text only | estimated |
| OpenAI-compatible | yours | text only | estimated |

The last row is the interesting one: anything that speaks `/v1/chat/completions` — Ollama, LM
Studio, vLLM, Groq, Together, OpenRouter, a model on your own GPU — is a base URL away, and needs
no key at all when it is local and unauthenticated. Configure nothing and both entry points do not
exist.

Two buttons in the dialog: *Load models* asks the provider what it can serve, *Test* runs a real
schema-constrained request. The second is the one that matters — the analysis depends on the model
honouring a JSON schema, and it is much better to learn that here than after uploading a 40-page
document.

Output is generated under a JSON Schema the provider enforces (`output_config.format` on
Anthropic, `response_format: json_schema` with `strict: true` on the OpenAI surface,
`responseSchema` on Gemini), so it cannot come back as prose or as half a document. What it sends
is the file you chose plus — for an enrichment — the id, name, scope and layer of each component
in *that one project*. Nothing else. One request per run, on your own account; enter your rates in
Settings and the dialog shows what a run costs before you start it.

### How It Works

A worked example at `/how-it-works` that teaches the whole format on one architecture: layers
(where a thing sits), scopes (who owns it), components (one box, one deployable thing) and
dependencies (who calls whom — and who waits), then flows, then the path from an empty canvas to
something you can send. The diagram on the page is interactive.

---

## The shape of the thing

**Six production dependencies.** Three `@dnd-kit` packages, `next`, `react`, `react-dom`, and
nothing at all for storage. `node:sqlite` ships inside Node, so the database layer costs no
install step — no query engine to download, no `generate` step. The cost is hand-written SQL and
an API Node still marks experimental; every query is in `src/lib/store.ts`, and if you outgrow it
that one file is what you rewrite.

**Requires Node ≥ 22.13** — not 22.5, which is when `node:sqlite` landed *behind*
`--experimental-sqlite`. It was unflagged in 22.13.0, and on anything older the app dies on the
first import. CI runs the suite on 22.13 as well as on current, so that floor is a tested number
rather than a remembered one.

**201 tests, all passing** — templates and their 60 instantiations, flow matching and the pattern
library, the AI schema checked against the type contract, settings and key handling, document
normalisation and diffing.

**The identity is enforced, not described.** Five rules, each written where it is applied: a scope
colour never touches a border; teal is reserved for what you can act on; monospace says only what
the machine knows; circles mean "a node in a graph"; paper does not copy hover, focus, or shadow.
The one known trade-off in the scope palette is measured rather than assumed — ΔE numbers under
each kind of colour vision are in `src/lib/defaults.ts`, along with the knob, and scope is never
carried by colour alone in either medium.

---

## Installing and running

```bash
npm install
npm run dev                         # development, http://localhost:3000
npm run build && npm start          # production
npm test                            # the suite
npm run typecheck
npm run reset                       # drop data/studio.db and re-seed
```

**Deployment.** A normal Next.js app with one caveat: it writes to the filesystem, so it does not
run on serverless platforms with a read-only disk (Vercel, Netlify functions). Run it where it can
keep a file — a VPS, a Raspberry Pi, a container with a volume.

---

## Known limits

- **There is no authentication.** Put it behind your VPN, a reverse-proxy basic-auth, or a
  Tailscale network — do not expose it to the open internet as is. Adding auth means one
  middleware and a session check in the API routes; the data model does not need to change.
- **An API key entered in Settings is stored in `data/studio.db` in clear text.** There is no
  login to encrypt it against, and a key derived from something on the machine would only look
  like encryption. Anyone who can read that file, or a backup of it, can read the key. It is never
  sent back to the browser, which only ever sees the last four characters. To keep it out of the
  data directory entirely, set `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` /
  `NVIDIA_API_KEY` in the environment and leave the field empty.
- **Five scopes is the ceiling.** The palette is one hue circle at fixed lightness and chroma, so
  a sixth group wraps onto the first hue.
- **Printing needs background graphics on** in the print dialog, or the scope colours vanish.
- **Analysis does not write your chapters.** `sections` are the editorial argument of the document
  and stay yours. It also does not cite its source: the APIs reject citations and
  schema-constrained output in the same request, and pretending to trace a component back to its
  paragraph would be worse than not trying.
- **Three ADD chapters are prose and tables today** — resource hierarchy, network topology and
  CI/CD pipeline have no diagram equivalent in the document format.
- **Service names were verified on 2026-08-14**, and the date is in `src/lib/templates/services.ts`.
  They move. Re-read that file once a year.

---

## Next

- Diagram placeholders for the document chapters that have none — network topology, CI/CD pipeline
- Keyboard navigation on the canvas, and undo/redo
- Optional auth for shared installs
- Multi-select and bulk move on the canvas

---

MIT. [tonuxcorp.com](https://tonuxcorp.com)
