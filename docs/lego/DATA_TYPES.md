# ArchStudio Lego data types

Inventory of the product domain types used by Lego. Primary sources are `src/lib/types.ts`, `src/lib/lego/types.ts`, `src/lib/flows/types.ts`, `src/lib/db.ts`, and the template types.

## Map (what Lego already covers vs rest)

| Layer of meaning | Artifact we have | Status for Lego |
|------------------|------------------|-----------------|
| Brick / cloud role | `ServiceRole` (38) + `SERVICES` cells | **CATALOG.md** filled |
| Horizontal bands | `Layer` free-form ids | **LAYERS.md** + **LAYERS_PACKS.md** locked |
| Everything else below | — | This inventory |

---

## 1. Core document — `Architecture`

Single JSON blob per project (`projects.data`). Export HTML = same shape.

| Type | Fields / variants | Notes |
|------|-------------------|-------|
| `Meta` | lang en\|fr, name, tagline, version, kicker, title, intro, facts[], tiles[], … | Cover / identity |
| `Theme` | brand, brandDark, logo | Colors |
| `Ui` | tabs, views, supportLayer, cluster/compact, flowSpeedMs | Viewer chrome |
| `Group` | id, name, short, description, color(s) | **Scopes** (LOCKED pack in SCOPES.md) |
| `Layer` | id, name, desc? | Bands — packs locked separately |
| `Component` | id, name, group, layer, icon?, badge?, tech[], url?, role?, features[], notes[], deps[], links[] | Placed brick instance |
| `Link` | to, kind?, protocol?, note? | Annotates an edge already in `deps` |
| `LinkKind` | `sync` \| `async` \| `batch` | Edge semantics |
| `Technology` | name, category?, description?, groups[] | Stack tab; **kept in sync** by upsert from `Component.tech[]` after place/plate (canonical chips live on the component) |
| `Flow` / `FlowStep` | id, name, group?, sub?, note?, steps[{component, title, description?}] | Runtime journeys |
| `Section` | type: cards\|timeline\|table\|compare\|text + `doc.chapter` | Editorial / ADD |
| `DocSlot` | chapter? ("2.4") | Printable ADD placement |


---

## Component prose fields (LOCKED) — 2026-08-16

Inspector copy and persisted JSON (see `src/components/Inspector.tsx`, `src/lib/types.ts`, `src/lib/diff.ts`).

| UI label (en) | Persisted field | Shape | Source of truth |
|---------------|-----------------|-------|-----------------|
| Role | `role` | string | Catalog brick **role** phrase (en/fr) in `CATALOG.md` — required on every brick |
| Responsibilities | `features` | `string[]` | Catalog **responsibilities** (≥2 en/fr); templates may also seed |
| Notes / known gaps | `notes` | `string[]` | Catalog **notes (known gaps)** (≥1 en/fr) + any document-raised caveats — AI must not invent filler |
| Depends on | `deps` (+ optional `links[]`) | ids + edge annotations | Catalog `depends_on` suggestions; user wires edges |

**Rules**

1. Diff labels already map `features` → `responsibilities` and `notes` → `notes` (`diff.ts`).
2. Every brick in `CATALOG.md` **must** ship `role` + `responsibilities` + `notes` (known gaps) — schema LOCKED 2026-08-16.
3. Lego place / catalog UI surfaces all three before place (ISA). On place, seed `role`, `features`, and `notes` from the locked catalog for `maps_to` (lang from doc).
4. Never rename these field keys. Display capitalization is UI-only.
5. Change only via ISA Decision + principal OK.

**Status:** **LOCKED** 2026-08-16 — CATALOG is complete source for role / responsibilities / known gaps.

**Implication Lego:** placing a brick creates a `Component` (needs group + layer + icon + optional cloud name via `ServiceRole`). Edges are `deps` + optional `Link`.

---

## 2. Workspace persistence (SQLite)

| Table | Record type | Payload |
|-------|-------------|---------|
| `folders` | `FolderRecord` | Nested folders (parent_id) |
| `projects` | `ProjectRecord` + `data: Architecture` | One architecture JSON |
| `revisions` | `RevisionRecord` | Snapshots; named label = checkpoint (never pruned) |
| `settings` | key/value JSON | AI config, flow library, etc. |

---

## 3. Lego catalog persistence (SQLite)

The versioned Lego catalog is normalized across the `lego_*` tables documented in [IMPLEMENTATION.md](./IMPLEMENTATION.md#catalog-storage). `legoCatalog()` projects those rows into a localized `LegoCatalogSnapshot`:

| Type | Shape |
|---|---|
| `LegoCatalogSnapshot` | version, lang, scopes, aliases, bricks, intents, variants, technologyDescriptions |
| `LegoIntent` | id, label, modes[], optional shapes[] |
| `LegoVariant` | id, intent, label, mode, `maps_to` |
| `LegoBrick` | id, icon, layer, defaultScope, capabilities[], role, responsibilities[], notes[], affinities[], capabilityPhrase |
| `HostingMode` | `client` \| `baas` \| `cloud` \| `selfhosted` |

The snapshot is the runtime contract consumed by the Placement Wizard and flow plates. Markdown files do not populate the runtime directly; `seed-data.ts` is inserted into SQLite once per catalog version.

---

## 4. Templates factory

| Type | Values / shape |
|------|----------------|
| `Template` id | `serverless-mvp`, `saas-multitenant`, `multi-service`, `monolith`, `rag`, `event-driven` |
| `CloudTarget` | `agnostic` \| `aws` \| `gcp` \| `azure` \| `selfhosted` |
| `ResolvedTarget` | aws \| gcp \| azure \| selfhosted |
| `Lang` / `L10n` | en \| fr ; string or `{en,fr}` |
| `ServiceRole` | **38** keys in `SERVICES` (Lego bricks) |
| `ServiceCell` | name, tech?, note? per resolved target |
| `TemplateComponent` | Component + per-cloud `CloudOverride` + optional `role` |
| `CloudOverride` | name?, tech?, note?, omit? |
| Sections / flows / layers | Parallel to Architecture but L10n |

Instantiate → plain `Architecture` (no live template link).

---

## 5. Flows as reusable patterns

| Type | Count / notes |
|------|----------------|
| Shipped `FLOW_CATALOG` | **8**: auth-login, checkout, webhook-inbound, async-job, file-upload, rag-query, ci-cd, incident |
| `FlowHint` | name[], tech[], layers[], icons[], avoid[] — soft match to components |
| `FlowPattern` | wire shape (catalog \| library) |
| `LibraryPattern` | + savedAt, from?; caps 40 entries / 32KB / 24 steps |

Distinct from document `Flow` (bound to component ids).

---

## 6. Printable design document

| Type | Values |
|------|--------|
| ADD parts | 1 Introduction · 2 Application · 3 Organisation · 4 DevOps · 5 Cost · 6 Appendices |
| `DocBody` | intro \| diagram \| inventory \| section \| flow \| stack |
| Numbering | Derived from `doc.chapter` slots — not stored numbers |

---

## 7. Icons

`ICONS` in `Icon.tsx` — **55** keys (free string lookup; unknown → fallback).

Architecture-ish: cube, mobile, web, globe, scan, server, hub, plug, users, folder, chat, db, bolt, box, chart, card, sms, mail, bell, map, bug, docker, shield, cloud, cloudup, git, eye, save, lock, route, cog, clock, flag, alert, key, layers, terminal, ai, search, link, file, …

UI chrome also: plus, trash, chevron, dots, back, download, upload, copy, moon, sun, folderPlus, external, grid, home.

No closed TypeScript enum.

---

## 8. Diff / history UI

`ChangeArea`: component \| dependency \| layer \| scope \| flow \| section \| stack \| document  
`ChangeKind`: added \| removed \| changed

---

## 9. AI analyse wire

`WireDocument` / `WireComponent` / `WireLink` + `Analysis` — lean schema for PDF/text → diagram merge. Maps into Architecture; not a separate Lego taxonomy.

---

## Lego relevance ranking

1. **Already locked:** ServiceRole bricks, Layer packs, scopes, protocols, icons, capabilities, **intents + hosting modes + variants**, **Component prose** (`features`/`notes`)  
2. **Supporting taxonomies for Lego UX:**
   - **Groups / scopes** — ~~free-form~~ **LOCKED** single pack in `SCOPES.md`
   - **LinkKind + protocol vocabulary** — kinds in code; protocols **LOCKED** in `PROTOCOLS.md`
   - **Icons** — soft catalog exists; brick→default icon mapping missing in CATALOG
   - **Flow patterns** — 8 ids **LOCKED**; Intent/Variant crosswalk and plate behavior documented in `FLOWS.md`
3. **Lower priority for Lego:** Section types, Meta/Theme, SQLite records, Diff areas, AI wire

## Gaps vs CATALOG

- ~~No default `icon` per brick in CATALOG~~ → **LOCKED** in `ICONS.md` (2026-08-15)  
- ~~No default `group` strategy~~ → **LOCKED** single pack in `SCOPES.md` (18 ids; docs use a subset)
- ~~Component responsibilities / notes field contract~~ → **LOCKED** in this file (`features` / `notes`)  
- ~~No protocol suggestions when linking two bricks~~ → **LOCKED** in `PROTOCOLS.md`  
- ~~Flow catalog not yet cross-walked to brick sets~~ → **LOCKED** in `FLOWS.md`  
- ~~Intent menu / hosting modes~~ → **LOCKED** in `INTENTS.md` (2026-08-15)  
- ~~Variant catalogs still DRAFT~~ → **LOCKED** in `VARIANTS.md` (154 rows, 2026-08-15)

## Related inventories

- `SERVICES.md` — export of 38 ServiceRoles × clouds
- `TECHNOLOGIES.md` — template `tech[]` + SERVICES tags (not locked)
