# Intent menu — LOCKED

Step 1 of the placement funnel in [VISION.md](./VISION.md): **what is the user adding?**

Human labels first. Flow after pick:

1. **Intent** (this file)  
2. **Shape** (only if the intent has several families — see each card)  
3. **Mode** (display: Client · BaaS · Cloud · Self-hosted — ids `client` · `baas` · `cloud` · `selfhosted`)  
4. **Scope** ([SCOPES.md](./SCOPES.md))  
5. **Variant** ([VARIANTS.md](./VARIANTS.md))  
6. **Layer** (default from pack — [LAYERS_PACKS.md](./LAYERS_PACKS.md))

**Status: LOCKED** — **12** intent ids plus the hosting-mode schema. Change only via ISA Decision + principal approval. The runtime catalog and Placement Wizard consume this taxonomy.

Related: [GAPS.md](./GAPS.md) · [CATALOG.md](./CATALOG.md) · [VARIANTS.md](./VARIANTS.md) · [FLOWS.md](./FLOWS.md)

---

## Taxonomy consolidation (19 → 12)

| Removed / merged | Into | Why |
|------------------|------|-----|
| `admin-app` | `web-app` | Admin = same web client; badge/variant |
| `api-gateway` + `api-backend` | `api` | One shelf; **shape** = gateway vs compute |
| `scheduled-jobs` | `workers` | Same out-of-band family |
| `queue` + `events` | `messaging` | **Shape** = queue / bus / stream |
| `cache` | `database` | **Shape** = sql / nosql / cache |
| `observability` + `cicd` + `email` | `ops` | **Shape** = observe / ship / mail |

---

## Hosting modes (LOCKED schema)

| id | Label (en) | Label (fr) | Meaning |
|----|------------|------------|---------|
| `client` | Client | Client | Pick a **framework** (no cloud product) |
| `baas` | BaaS | BaaS | Firebase, Supabase, Clerk, OpenAI, Resend… — provider without picking AWS/GCP/Azure first |
| `cloud` | Cloud | Cloud | Hyperscaler managed (AWS / GCP / Azure) |
| `selfhosted` | Self-hosted | Auto-hébergé | You run it (Docker, K8s, VM) |

**Display rule (LOCKED):** wizard / UI show the **capitalized labels** above — never the raw id (`client`, `cloud`, …). Stored / API ids stay lowercase. Same rule as scope display labels in [SCOPES.md](./SCOPES.md).

Modes are **filters on [VARIANTS.md](./VARIANTS.md)**. Lego `HostingMode` is separate from the template `CloudTarget` type (`agnostic`/`aws`/`gcp`/`azure`/`selfhosted`).

---

## Menu overview — 12

| id | EN | FR | Icon | Layer | Valid scopes (wizard) | Modes (display) | Shapes? |
|----|----|----|------|-------|----------------------|------------------|---------|
| `web-app` | Web app | App web | `web` | `clients` | `front` | Client | — |
| `mobile-app` | Mobile app | App mobile | `mobile` | `clients` | `front` | Client | — |
| `auth` | Auth | Auth | `lock` | `edge` | `vendor` · `tenancy` | BaaS · Cloud · Self-hosted | — |
| `api` | API | API | `plug` | edge/services | `edge` · `app` · `services` · `modules` · `platform` | Cloud · Self-hosted | gateway · compute |
| `cdn` | CDN / static | CDN / statique | `globe` | `edge` | `edge` · `front` | Cloud · Self-hosted | cdn · static |
| `workers` | Workers / jobs | Workers / jobs | `clock` | `services` | `app` · `services` · `modules` · `processing` · `ingestion` | Cloud · Self-hosted | worker · schedule · workflow |
| `database` | Database / cache | Base / cache | `db` | `data` | `data` · `index` · `quality` | BaaS · Cloud · Self-hosted | sql · nosql · cache |
| `files` | Files / objects | Fichiers / objets | `save` | `data` | `data` · `ingestion` | BaaS · Cloud · Self-hosted | — |
| `search` | Search | Recherche | `search` | `data` | `data` · `index` | BaaS · Cloud · Self-hosted | fulltext · vector |
| `messaging` | Messaging | Messagerie | `bell` | `data` | `data` · `bus` · `producers` · `processing` | BaaS · Cloud · Self-hosted | queue · bus · stream |
| `llm` | LLM / AI | LLM / IA | `ai` | `services` | `answering` | BaaS · Cloud · Self-hosted | — |
| `ops` | Ops | Ops | `chart` | `platform` | `platform` · `quality` · `vendor` | BaaS · Cloud · Self-hosted | observe · ship · mail |

Full matrix + All-scopes rule: [SCOPES.md](./SCOPES.md#valid-scopes-per-intent-locked).

---

## Intent cards

### `web-app`

| | |
|--|--|
| **EN** | Web app |
| **FR** | App web |
| **Blurb (en)** | Browser UI for customers or internal users (including admin). |
| **Blurb (fr)** | UI navigateur pour clients ou équipe (y compris admin). |
| **When** | Users open a site or SPA / admin console. |
| **When not** | Mobile-only native with no web surface → `mobile-app`. |
| **Icon / layer / scope** | `web` · `clients` · `product` |
| **Modes** | `client` only |
| **Maps to** | `webApp` |
| **Variants** | [VARIANTS § web-app](./VARIANTS.md#web-app) — Next, Remix, Nuxt, SPAs, admin badges… |
| **Suggest next** | Often place `cdn` and/or `auth` + `api` after. |
| **Related flow** | `auth-login`, `checkout` (client steps) |

---

### `mobile-app`

| | |
|--|--|
| **EN** | Mobile app |
| **FR** | App mobile |
| **Blurb (en)** | Phone / tablet client — store or installable. |
| **Blurb (fr)** | Client téléphone / tablette — store ou installable. |
| **When** | Native or cross-platform mobile is a product surface. |
| **When not** | Responsive web is enough → `web-app`. |
| **Icon / layer / scope** | `mobile` · `clients` · `product` |
| **Modes** | `client` only |
| **Maps to** | `mobileApp` |
| **Variants** | [VARIANTS § mobile-app](./VARIANTS.md#mobile-app) — RN, Flutter, Expo, Swift, Kotlin… |
| **Suggest next** | `auth`, `api`. |
| **Related flow** | `auth-login`, `file-upload` |

---

### `auth`

| | |
|--|--|
| **EN** | Auth |
| **FR** | Auth |
| **Blurb (en)** | Who the user is — sign-up, login, tokens, SSO. |
| **Blurb (fr)** | Qui est l’utilisateur — inscription, login, jetons, SSO. |
| **When** | Any product with accounts or staff login. |
| **When not** | Fully public read-only site with no identity. |
| **Icon / layer / scope** | `lock` · `edge` · default `vendor` (bought IdP); use `product` if you own Keycloak ops |
| **Modes** | `baas` · `cloud` · `selfhosted` |
| **Maps to** | `identity` |
| **Variants** | [VARIANTS § auth](./VARIANTS.md#auth) — Firebase, Supabase, Cognito, Entra, Keycloak… |
| **Suggest next** | Wire to `api` / `web-app` / `mobile-app`. |
| **Capabilities** | `oidc`, `jwt` ([CAPABILITIES.md](./CAPABILITIES.md)) |
| **Related flow** | `auth-login` |

---

### `api`

| | |
|--|--|
| **EN** | API |
| **FR** | API |
| **Blurb (en)** | HTTP entry and/or the code that serves business requests. |
| **Blurb (fr)** | Entrée HTTP et/ou le code qui sert les requêtes métier. |
| **When** | Clients need a backend HTTP surface. |
| **When not** | Only static files → `cdn`; only async workers → `workers`. |
| **Icon / layer / scope** | `plug` · gateway→`edge`, compute→`services` · `product` |
| **Modes** | `cloud` · `selfhosted` |
| **Shapes** | **`gateway`** (front door) · **`compute`** (functions / containers / k8s) — user picks shape before variant list |
| **Maps to** | `apiGateway` · `functions` · `containers` · `kubernetes` |
| **Variants** | [VARIANTS § api](./VARIANTS.md#api) |
| **Suggest next** | `auth`, `database`, `messaging`. |
| **Related flow** | Most catalog flows |

---

### `cdn`

| | |
|--|--|
| **EN** | CDN / static |
| **FR** | CDN / statique |
| **Blurb (en)** | Edge cache and/or static site hosting. |
| **Blurb (fr)** | Cache de bordure et/ou hébergement de site statique. |
| **When** | Global assets, SPA hosting, TLS at the edge. |
| **When not** | Dynamic API-only with no static/CDN need. |
| **Icon / layer / scope** | `globe` · `edge` · `product` |
| **Modes** | `cloud` · `selfhosted` |
| **Shapes** | **`cdn`** · **`static`** (hosting) |
| **Maps to** | `cdn` · `staticHosting` |
| **Variants** | [VARIANTS § cdn](./VARIANTS.md#cdn) |
| **Suggest next** | After `web-app`. |
| **Capabilities** | `cdn`, `tls`, `spa` |

---

### `workers`

| | |
|--|--|
| **EN** | Workers / jobs |
| **FR** | Workers / jobs |
| **Blurb (en)** | Work that should not block the user request — queues, cron, workflows. |
| **Blurb (fr)** | Travail hors requête utilisateur — files, cron, workflows. |
| **When** | Emails, imports, reports, sagas, schedules. |
| **When not** | Everything fits in a short sync API handler. |
| **Icon / layer / scope** | `clock` · `services` · `product` |
| **Modes** | `cloud` · `selfhosted` |
| **Shapes** | **`worker`** · **`schedule`** · **`workflow`** |
| **Maps to** | `functions` · `jobs` · `containers` · `orchestration` |
| **Variants** | [VARIANTS § workers](./VARIANTS.md#workers) |
| **Suggest next** | `messaging`, then `database` / `files`. |
| **Related flow** | `async-job`, `webhook-inbound` |

---

### `database`

| | |
|--|--|
| **EN** | Database / cache |
| **FR** | Base / cache |
| **Blurb (en)** | Durable records and/or fast ephemeral state. |
| **Blurb (fr)** | Données durables et/ou état rapide éphémère. |
| **When** | You persist users, orders, sessions, feature state. |
| **When not** | Only files/blobs → `files`; only search index → `search`. |
| **Icon / layer / scope** | `db` · `data` · `product` (or `platform` if a shared DBA team) |
| **Modes** | `baas` · `cloud` · `selfhosted` |
| **Shapes** | **`sql`** · **`nosql`** · **`cache`** |
| **Maps to** | `sql` · `nosql` · `cache` |
| **Variants** | [VARIANTS § database](./VARIANTS.md#database) |
| **Suggest next** | `api`, `workers`. |
| **Capabilities** | `relational`, `document-store`, `key-value` |
| **Related flow** | Almost all |

---

### `files`

| | |
|--|--|
| **EN** | Files / objects |
| **FR** | Fichiers / objets |
| **Blurb (en)** | Blobs — uploads, media, backups of files, data lake objects. |
| **Blurb (fr)** | Blobs — uploads, médias, fichiers, objets data lake. |
| **When** | User uploads or large opaque objects. |
| **When not** | Structured rows only → `database`. |
| **Icon / layer / scope** | `save` · `data` · `product` |
| **Modes** | `baas` · `cloud` · `selfhosted` |
| **Maps to** | `objects` |
| **Variants** | [VARIANTS § files](./VARIANTS.md#files) |
| **Suggest next** | `cdn` for public assets; `workers` for processing. |
| **Related flow** | `file-upload` |
| **Capabilities** | `object-storage` |

---

### `search`

| | |
|--|--|
| **EN** | Search |
| **FR** | Recherche |
| **Blurb (en)** | Full-text and/or vector retrieval over content. |
| **Blurb (fr)** | Recherche plein texte et/ou vectorielle sur du contenu. |
| **When** | Product search, RAG retrieval, filters at scale. |
| **When not** | Simple SQL `LIKE` on a tiny table is enough. |
| **Icon / layer / scope** | `search` · `data` · `product` |
| **Modes** | `baas` · `cloud` · `selfhosted` |
| **Shapes** | **`fulltext`** · **`vector`** |
| **Maps to** | `search` · `vector` |
| **Variants** | [VARIANTS § search](./VARIANTS.md#search) |
| **Suggest next** | For RAG: `llm` + `files` / `database`. |
| **Related flow** | `rag-query` |
| **Layer pack tip** | Prefer pack `rag` when the doc is RAG-centric ([LAYERS_PACKS.md](./LAYERS_PACKS.md)). |

---

### `messaging`

| | |
|--|--|
| **EN** | Messaging |
| **FR** | Messagerie |
| **Blurb (en)** | Async communication — queues, buses, streams. |
| **Blurb (fr)** | Com. async — files, bus, streams. |
| **When** | Decouple producers/consumers; buffer load; event log. |
| **When not** | Sync REST between two services is enough. |
| **Icon / layer / scope** | `bell` · `data` · `product` |
| **Modes** | `baas` · `cloud` · `selfhosted` |
| **Shapes** | **`queue`** · **`bus`** · **`stream`** |
| **Maps to** | `queue` · `pubsub` · `stream` |
| **Variants** | [VARIANTS § messaging](./VARIANTS.md#messaging) |
| **Suggest next** | `workers`. |
| **Related flow** | `async-job`, `webhook-inbound` |
| **Layer pack tip** | Prefer pack `events` for event-driven docs. |
| **Capabilities** | `queue`, `event-bus`, `event-log`, `dlq` |

---

### `llm`

| | |
|--|--|
| **EN** | LLM / AI |
| **FR** | LLM / IA |
| **Blurb (en)** | Generative model endpoint — hosted API or self-hosted runtime. |
| **Blurb (fr)** | Endpoint de modèle génératif — API hébergée ou runtime self-host. |
| **When** | Chat, generation, agents, grounded answers. |
| **When not** | Classical ML only with no generative API (out of v1 menu). |
| **Icon / layer / scope** | `ai` · `services` · default `vendor` |
| **Modes** | `baas` · `cloud` · `selfhosted` |
| **Maps to** | `llm` (siblings embeddings/rerank/guardrails stay advanced / CATALOG) |
| **Variants** | [VARIANTS § llm](./VARIANTS.md#llm) |
| **Suggest next** | `search` (RAG), `guardrails` via advanced catalog. |
| **Related flow** | `rag-query` |
| **Capabilities** | `llm` |

---

### `ops`

| | |
|--|--|
| **EN** | Ops |
| **FR** | Ops |
| **Blurb (en)** | Keep the system observable, shipable, and able to email users. |
| **Blurb (fr)** | Rendre le système observable, déployable, et capable d’envoyer des emails. |
| **When** | You need logs/metrics/traces, CI/CD/GitOps, or transactional email. |
| **When not** | Pure throwaway prototype with no deploy/observe yet (optional). |
| **Icon / layer / scope** | `chart` · `platform` · `platform` (email variants often `vendor`) |
| **Modes** | `baas` · `cloud` · `selfhosted` (`baas` mainly for **mail** / SaaS email; observe/ship stay cloud · selfhosted in practice) |
| **Shapes** | **`observe`** · **`ship`** · **`mail`** |
| **Maps to** | `observability` · `tracing` · `cicd` · `gitops` · `email` |
| **Variants** | [VARIANTS § ops](./VARIANTS.md#ops) |
| **Suggest next** | After first `api` / `workers`. |
| **Related flow** | `ci-cd`, `incident` |
| **Capabilities** | `logs`, `metrics`, `traces`, `ci`, `iac`, `email` |

---

## Funnel cheat-sheet

```
Intent → [Shape?] → Mode → Scope → Variant → (auto Layer + icon + capabilities)
```

Example — Auth cloud Cognito:

`auth` → (no shape) → `cloud` → scope `vendor` → variant `cognito` → role `identity` · layer `edge` · icon `lock`

Example — API Lambda:

`api` → shape `compute` → `cloud` → scope `product` → variant `aws-lambda` → role `functions` · layer `services`

Example — Mobile Flutter:

`mobile-app` → (no shape) → `client` → scope `product` → variant `flutter` → kind `mobileApp` · layer `clients`

---

## Out of menu (advanced)

Mesh, feature flags, DNS, payments, OCR, warehouse, schema registry, secrets-only, embeddings/rerank as top-level intents, etc. → [SHORTLIST.md](./SHORTLIST.md) / full [CATALOG.md](./CATALOG.md).

---

## Locked decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Keep **12** or split `ops` mail out? | **Keep 12** — mail stays shape `mail` under `ops`. |
| 2 | `baas` on ops? | **Yes** — `ops` modes include `baas` (email SaaS); observe/ship remain cloud/selfhosted-first. |
| 3 | FR on every VARIANTS row? | **Out of scope for this lock** — track on [VARIANTS.md](./VARIANTS.md). |
| 4 | Default scope for `auth`? | **Default `vendor`**; allow `product` when the team owns the IdP (e.g. Keycloak). Wizard may confirm, not re-ask from zero. |

Do not add/remove intent **ids** or rename hosting mode **ids** without ISA Decision + principal OK. Card blurbs/when copy may polish without a new Decision if ids/modes/shapes/`maps_to` stay stable.

---

## Runtime status

**LOCKED** — 12 intent ids, 4 hosting modes, optional shapes, and card-level `maps_to` values. These values are seeded into the versioned SQLite catalog and consumed by the Placement Wizard. See [IMPLEMENTATION.md](./IMPLEMENTATION.md#placement-wizard).
