# Layer packs (LOCKED) — 2026-08-15

Principal: « Oui » (figer pack défaut + RAG + events).
Based on inventory in `LAYERS.md` + Lego `CATALOG.md` brick ids.

## Rules

1. A **pack** is an ordered list of layer bands (top → bottom). Last band = support (`platform`).
2. When the user places a **brick**, the UI suggests a default layer from the active pack (user can move it).
3. **v1 Lego** uses these 3 packs only. Other template-specific ids (`app`, `compute`, `vendors`, `infra`) map as aliases (see below), not as separate packs.
4. Change only via ISA Decision + principal OK.
5. **Display:** pack `name` labels are shown capitalized (Clients, Edge & API, …). Ids stay lowercase (`clients`, `edge`, …).

---

## Pack A — `default` (LOCKED)

Use for: general SaaS, serverless, multi-service, monolith-style products.

| # | id | name (en) | name (fr) | desc (en) |
|---|-----|-----------|-----------|-----------|
| 1 | `clients` | Clients | Clients | Web · Mobile · partners |
| 2 | `edge` | Edge & API | Edge & API | Entry, CDN, gateway, identity at the door |
| 3 | `services` | Services | Services | Business logic and APIs |
| 4 | `data` | Data | Données | Stores · cache · files · search |
| 5 | `platform` | Platform | Plateforme | Secrets, CI/CD, observability (support) |

**Aliases → default pack**
| Alias (repo today) | Maps to |
|--------------------|---------|
| `compute` | `services` |
| `app` | `services` |
| `infra` | `platform` |
| `vendors` | (components stay; no dedicated band — put third parties in `edge` or `services`) |

---

## Pack B — `rag` (LOCKED)

Use for: questions-over-documents / RAG architectures.

| # | id | name (en) | name (fr) | desc (en) |
|---|-----|-----------|-----------|-----------|
| 1 | `clients` | Clients | Clients | Chat and query surfaces |
| 2 | `ingestion` | Ingestion | Ingestion | Connect · extract · chunk · embed |
| 3 | `index` | Index & data | Index & données | Vectors · documents · permissions |
| 4 | `inference` | Inference | Inférence | Retrieve · rerank · generate · guard |
| 5 | `platform` | Platform | Plateforme | Supports everything above |

---

## Pack C — `events` (LOCKED)

Use for: event-driven / streaming architectures.

| # | id | name (en) | name (fr) | desc (en) |
|---|-----|-----------|-----------|-----------|
| 1 | `producers` | Producers | Producteurs | Services that emit facts |
| 2 | `ingestion` | Ingestion & bus | Ingestion & bus | Entry, schema, routing, transport |
| 3 | `processing` | Processing | Traitement | Consumers · saga · failure handling |
| 4 | `destinations` | Destinations | Destinations | Log · warehouse · notifications |
| 5 | `platform` | Platform | Plateforme | Supports everything above |

---

## Suggested brick → layer (by pack)

Default placement when adding a Lego brick. User can override.

### Pack `default`

| Brick ids | Suggested layer |
|-----------|-----------------|
| `webApp`, `mobileApp` | `clients` |
| `cdn`, `waf`, `loadBalancer`, `staticHosting`, `apiGateway`, `identity` | `edge` |
| `functions`, `containers`, `kubernetes`, `jobs`, `orchestration`, `llm`, `rerank`, `guardrails`, `ocr`, `embeddings` | `services` |
| `sql`, `nosql`, `cache`, `objects`, `warehouse`, `search`, `vector`, `queue`, `pubsub`, `stream`, `streamProcessing`, `schemaRegistry` | `data` |
| `secrets`, `config`, `observability`, `tracing`, `backup`, `registry`, `email`, `cicd`, `gitops`, `audit` | `platform` |

### Pack `rag`

| Brick ids | Suggested layer |
|-----------|-----------------|
| *(chat UI — not a ServiceRole)* | `clients` |
| `ocr`, `objects`, `queue`, `embeddings` (pipeline side) | `ingestion` |
| `vector`, `search`, `sql`, `nosql`, `objects` (corpus) | `index` |
| `llm`, `rerank`, `guardrails`, `apiGateway`, `identity` | `inference` |
| `secrets`, `config`, `observability`, `tracing`, `cicd`, `audit`, `email` | `platform` |

### Pack `events`

| Brick ids | Suggested layer |
|-----------|-----------------|
| `functions`, `containers`, `apiGateway` (emitters) | `producers` |
| `queue`, `pubsub`, `stream`, `schemaRegistry`, `apiGateway` (ingress) | `ingestion` |
| `streamProcessing`, `orchestration`, `functions`, `jobs` | `processing` |
| `warehouse`, `objects`, `email`, `sql`, `nosql` | `destinations` |
| `secrets`, `observability`, `tracing`, `cicd`, `gitops`, `audit`, `registry` | `platform` |

---

## Status

**LOCKED** 2026-08-15 — packs A/B/C + brick suggestions. Implementation in ArchStudio UI is out of scope until a later ISA.
