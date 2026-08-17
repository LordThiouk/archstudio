# ArchStudio Lego

Lego turns architecture modeling into a guided product workflow. A user starts with an intent such as **Auth**, **API**, or **Database**, narrows the choice by shape, hosting mode, and scope, then places a concrete variant on the diagram. ArchStudio derives the component's brick metadata, layer, prose, and technology stack entries.

Flow patterns complement single-brick placement. The Flows editor can bind existing components or create missing mapped bricks, wire the journey, and synchronize the stack.

## What is implemented

- A versioned Lego catalog seeded transactionally into SQLite and read from the database at runtime
- A localized `GET /api/lego/catalog` endpoint for English and French snapshots
- A Placement Wizard for `Intent → [Shape] → Mode → Scope → Variant`
- Brick insertion with catalog-derived role, responsibilities, known gaps, icon, scope, layer, and technologies
- Additive technology-stack synchronization from `Component.tech[]`
- Flow plates that reuse or create mapped bricks, insert a document flow, and wire consecutive steps
- Repository and domain tests for seed counts, localization, filtering, placement, synchronization, and plate insertion

Start with [Implementation](./IMPLEMENTATION.md) for the runtime design and verified behavior.

## Core model

| Concept | Meaning | Persisted result |
|---|---|---|
| Intent | Human goal: what capability to add | Filters catalog variants |
| Shape | Optional sub-family for broad intents | Further filters variants |
| Mode | Client, BaaS, Cloud, or Self-hosted | Filters variants by operating model |
| Scope | Architectural ownership/area group | `Component.group` |
| Variant | Concrete framework or service | Component name and target brick |
| Brick | Stable capability kind | `Component.brick` plus catalog metadata |
| Layer | Vertical architecture band | `Component.layer` |
| Flow pattern | Reusable multi-step journey | Bound `Flow`, components, dependencies, and links |

Scope and layer are independent: scope answers **which group owns or contains the component**, while layer answers **where it sits in the architecture**.

## Runtime data flow

```text
Code seed → versioned SQLite catalog → catalog API → Placement Wizard
                                                       │
                                                       ▼
                                                Component insertion
                                                       │
                              ┌────────────────────────┴───────────────────────┐
                              ▼                                                ▼
                         Diagram / flows                         Technology stack upsert
```

SQLite is the runtime source for catalog snapshots. Catalog authoring is still code-first: `src/lib/lego/seed-data.ts` supplies versioned seed content. Flow definitions, step mappings, and protocol suggestions also remain coded data. [Implementation](./IMPLEMENTATION.md#source-of-truth-database-vs-code) documents the boundary precisely.

## Documentation map

### Product and implementation

| Document | Purpose |
|---|---|
| [VISION.md](./VISION.md) | Product principles and placement experience |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Runtime architecture, API, insertion, synchronization, tests, and limits |
| [GAPS.md](./GAPS.md) | Current constraints and deferred work |
| [DATA_TYPES.md](./DATA_TYPES.md) | Domain and persistence type inventory |
| [DEPENDENCIES.md](./DEPENDENCIES.md) | Dependency suggestions for non-architects (locked; sheet + flow reflection shipped) |

### Placement taxonomy

| Document | Purpose | Contract |
|---|---|---|
| [INTENTS.md](./INTENTS.md) | 12 intent ids, hosting modes, optional shapes, and mappings | Locked |
| [VARIANTS.md](./VARIANTS.md) | 154 concrete choices and their `maps_to` brick | Locked |
| [SCOPES.md](./SCOPES.md) | Canonical 18-id scope pack and intent affinities | Locked |
| [LAYERS.md](./LAYERS.md) | Layer ids used by the product | Inventory |
| [LAYERS_PACKS.md](./LAYERS_PACKS.md) | Default, RAG, and event layer packs | Locked |

### Bricks and connections

| Document | Purpose | Contract |
|---|---|---|
| [CATALOG.md](./CATALOG.md) | Complete 40-brick domain catalog and required prose | Locked |
| [CAPABILITIES.md](./CAPABILITIES.md) | Capability vocabulary and brick defaults | Locked |
| [ICONS.md](./ICONS.md) | Default icon per brick | Locked |
| [BRICK_TECH.md](./BRICK_TECH.md) | Brick-to-technology crosswalk | Derived |
| [SERVICES.md](./SERVICES.md) | Service roles across cloud and self-hosted targets | Export |
| [TECHNOLOGIES.md](./TECHNOLOGIES.md) | Inventory of template and service technology labels | Inventory |
| [PROTOCOLS.md](./PROTOCOLS.md) | Link kinds, protocol vocabulary, and suggestions | Locked |
| [DEPENDENCIES.md](./DEPENDENCIES.md) | Ranked brick→brick dependency suggestions for non-architects | Locked |
| [FLOWS.md](./FLOWS.md) | Eight flow patterns and their brick crosswalk | Locked |
| [SHORTLIST.md](./SHORTLIST.md) | Deferred candidate brick kinds | Backlog |

## Contract boundaries

The locked documents preserve approved ids and semantics. Change locked intent ids, modes, scopes, variant mappings, flow ids, or required brick prose only through the project's decision process.

The conceptual and runtime catalogs are not identical:

- [CATALOG.md](./CATALOG.md) defines 40 domain brick kinds.
- The current SQLite seed exposes 26 runtime bricks.
- Repository tests enforce the runtime count together with 18 scopes, 12 intents, and 154 variants.

This distinction is intentional documentation of the current implementation, not a promise that every conceptual brick is placeable through the wizard.
