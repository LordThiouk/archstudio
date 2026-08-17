# Layer inventory (from ArchStudio data) — 2026-08-15

Sources: `defaults.ts`, `seed/demo.json`, 6 templates under `src/lib/templates/`.
Not from external research — inventory of what the repo already uses.

## Rule in the product

- Layers = horizontal bands (top → bottom). Free-form per document (`Layer { id, name, desc? }`).
- From 4+ layers, the **last** is treated as *support* (no edges) unless `ui.supportLayer` says otherwise.
- Blank project ≠ templates ≠ demo seed (three different sets).
- **Display (LOCKED 2026-08-16):** layer names render **capitalized** in UI (editor, paper, viewer) — never ALL-CAPS via CSS, never raw ids. Stored `id`s stay lowercase.

## By source

### Blank project (`defaults.ts`) — 4 layers
| id | name |
|----|------|
| `clients` | Client channels |
| `services` | Services & APIs |
| `data` | Data & storage |
| `infra` | Infrastructure |

### Demo seed (`seed/demo.json`) — 5 layers
| id | name |
|----|------|
| `clients` | Client channels |
| `services` | Back-office, API & services |
| `data` | Data & storage |
| `vendors` | Third-party integrations |
| `infra` | Infrastructure & operations |

### Templates (each usually 5 layers)

| Template | layer ids (top → bottom) |
|----------|--------------------------|
| serverless-mvp | `clients` → `edge` → `compute` → `data` → `platform` |
| saas-multitenant | `clients` → `edge` → `services` → `data` → `platform` |
| multi-service | `clients` → `edge` → `services` → `data` → `platform` |
| monolith | `clients` → `edge` → `app` → `data` → `platform` |
| rag | `clients` → `ingestion` → `index` → `inference` → `platform` |
| event-driven | `producers` → `ingestion` → `processing` → `destinations` → `platform` |

## Unique layer ids across all sources

| id | Where it appears |
|----|------------------|
| `clients` | blank, demo, all templates except event-driven |
| `services` | blank, demo, saas, multi-service |
| `data` | blank, demo, most templates |
| `infra` | blank, demo only (templates use `platform` instead) |
| `platform` | all 6 templates (support band) |
| `edge` | serverless, saas, multi-service, monolith |
| `compute` | serverless-mvp |
| `app` | monolith |
| `ingestion` | rag, event-driven |
| `index` | rag |
| `inference` | rag |
| `producers` | event-driven |
| `processing` | event-driven |
| `destinations` | event-driven |
| `vendors` | demo seed only |

**Count:** 15 distinct ids (14 without counting blank-only overlap carefully: union of all = clients, services, data, infra, vendors, edge, compute, app, platform, ingestion, index, inference, producers, processing, destinations = **15**).

## Frequency (component `layer:` in templates)

Most used: `platform` (18), `data` (16), `services` (12), `ingestion` (10), `clients`/`edge` (8)…

## Implication for Lego

- Bricks (ServiceRoles) are **not** layers: a brick chooses which layer band it sits on when placed.
- There is **no single fixed layer taxonomy** in the product — templates specialize bands by architecture style.
- A Lego “default band map” could start from the common pattern: `clients` → `edge` → `services|compute|app` → `data` → `platform`, with style packs for RAG / event-driven.


## Locked packs

See **`LAYERS_PACKS.md`** — packs `default`, `rag`, `events` (LOCKED 2026-08-15).
