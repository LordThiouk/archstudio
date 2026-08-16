# Scope (Group) pack — LOCKED

In code the type is `Group`; product copy says **scope**. This page defines the single canonical scope pack consumed by the runtime catalog and Placement Wizard.

## Rules

1. A **scope** is a palette column / grouping for components. It is never a **layer** (layers answer *where it sits*).
2. **One LOCKED pack** below is the canonical id vocabulary. A document’s `groups[]` is always a **subset** of these ids (templates already do this).
3. Blank starter docs may open with `{product, platform, vendor}`; pattern templates use area scopes (`front`, `data`, `tenancy`, …) plus `platform` as needed.
4. Palette ceiling: **5** hues in `defaults.ts` — extra scopes reuse the hue cycle; that is OK.
5. Display labels **must** be capitalized for humans (Product, Front & console, …). **Never** rename or re-case stored `id`s.
6. Hosting **mode** labels follow the same display rule — see [INTENTS.md](./INTENTS.md) (Client, BaaS, Cloud, Self-hosted / Auto-hébergé); ids stay `client` / `baas` / `cloud` / `selfhosted`.
7. Change only via ISA Decision + principal OK.

---

## Pack — `scopes` (LOCKED)

| # | id | name (en) | name (fr) | blurb (en) | blurb (fr) | Typical use |
|---|-----|-----------|-----------|------------|------------|-------------|
| 1 | `product` | Product | Produit | Written and operated by your team | Écrit et opéré par ton équipe | blank starter, serverless-mvp |
| 2 | `platform` | Platform | Plateforme | Shared plumbing every service leans on | Plomberie partagée dont tout le monde dépend | all major templates |
| 3 | `vendor` | Third party | Tiers | You depend on it; you do not run it | Tu en dépends ; tu ne l’opères pas | blank starter, serverless-mvp |
| 4 | `front` | Front & console | Front & console | Customer UI and internal consoles | UI client et consoles internes | saas-multitenant |
| 5 | `app` | Application | Application | Main application / process boundary | Application ou processus principal | saas-multitenant, monolith |
| 6 | `data` | Data | Données | Stores, files, queues, search | Bases, fichiers, files, recherche | saas, serverless, multi-service, monolith |
| 7 | `tenancy` | Tenancy & security | Tenancy & sécurité | Tenant resolution, identity, audit, billing | Tenant, identité, audit, facturation | saas-multitenant |
| 8 | `edge` | Edge | Edge | CDN, gateway, BFF, mesh entry | CDN, passerelle, BFF, entrée mesh | multi-service |
| 9 | `services` | Business services | Services métier | Bounded-context services | Services par contexte métier | multi-service |
| 10 | `modules` | Business modules | Modules métier | In-process modules inside a monolith | Modules dans un monolithe | monolith |
| 11 | `ingestion` | Ingestion | Ingestion | Connect · extract · chunk · embed | Connecter · extraire · découper · vectoriser | rag |
| 12 | `index` | Index & data | Index & données | Vectors, documents, ACL metadata | Vecteurs, documents, métadonnées | rag |
| 13 | `answering` | Answering service | Service de réponse | Retrieve · rerank · generate · guard | Récupérer · reclasser · générer · filtrer | rag |
| 14 | `quality` | Platform & quality | Plateforme & qualité | Eval, tracing, answer cache | Eval, traçage, cache de réponses | rag |
| 15 | `producers` | Producers | Producteurs | Services that emit facts | Services qui émettent des faits | event-driven |
| 16 | `bus` | Bus & routing | Bus & routage | Schema, routing, transport | Schéma, routage, transport | event-driven |
| 17 | `processing` | Processing | Traitement | Consumers, saga, failure handling | Consommateurs, saga, échecs | event-driven |
| 18 | `destinations` | Destinations | Destinations | Sinks and downstream systems | Puits et systèmes aval | event-driven |

**Aliases → pack ids**

| Alias | Maps to |
|-------|---------|
| `core` (howto, demo) | `product` |
| `business`, `consumer` | `product` |

**Lego UI contract**

- Wizard Scope selector lists **valid scopes for the current intent** (see matrix below), plus **All scopes** — not the full 18-pack blindly (avoids empty Variant lists).
- Mode selector shows **capitalized** labels from [INTENTS.md](./INTENTS.md); Scope selector shows capitalized pack names.
- Catalog filter matches by selected scope id + brick affinity; **All scopes** = no scope filter.
- On place, destination `component.group` = chosen pack id (or brick default when All scopes).
- Document `groups[]` remains a **subset** of this pack (created on demand if missing).
- Runtime `LegoScope` accepts any pack id (and aliases → pack ids).

---

## Valid scopes per intent (LOCKED)

Derived from variant `maps_to` → brick scope affinities. Wizard must only offer these (+ **All scopes**) after Intent (and Mode/Shape when set).

| Intent | Valid scope ids |
|--------|-----------------|
| `web-app` | `front` |
| `mobile-app` | `front` |
| `auth` | `vendor`, `tenancy` |
| `api` | `edge`, `app`, `services`, `modules`, `platform` |
| `cdn` | `edge`, `front` |
| `workers` | `app`, `services`, `modules`, `processing`, `ingestion` |
| `database` | `data`, `index`, `quality` |
| `files` | `data`, `ingestion` |
| `search` | `data`, `index` |
| `messaging` | `data`, `bus`, `producers`, `processing` |
| `llm` | `answering` |
| `ops` | `platform`, `quality`, `vendor` |

Pack ids absent from a row (e.g. `product`, `destinations` for most intents) stay valid document scopes but are **not** offered in the filtered wizard list for that intent.

Default column in [INTENTS.md](./INTENTS.md) overview may still name a primary scope for layer guidance; **wizard filter** uses this matrix.

---

## Suggested brick → scope

Default when adding a Lego brick. Prefer a scope that **already exists** on the open document; else use the row below (and create the group if missing).

| Scope | ServiceRoles (defaults) |
|-------|-------------------------|
| `front` | `webApp`, `mobileApp`, `staticHosting` |
| `app` / `services` / `modules` / `product` | `functions`, `containers`, `kubernetes`, `jobs`, `orchestration`, `apiGateway` |
| `edge` | `cdn`, `waf`, `loadBalancer`, `apiGateway` |
| `data` / `index` | `sql`, `nosql`, `cache`, `objects`, `warehouse`, `search`, `vector`, `queue`, `pubsub`, `stream`, `streamProcessing`, `schemaRegistry` |
| `tenancy` | `identity`, `audit` (+ tenancy-oriented `functions` / `jobs`) |
| `ingestion` | `ocr`, `embeddings`, `orchestration`, `objects` |
| `answering` | `llm`, `rerank`, `guardrails`, `embeddings` |
| `quality` | `observability`, `tracing`, `cache` |
| `producers` / `processing` / `bus` / `destinations` | `queue`, `pubsub`, `stream`, `streamProcessing`, `schemaRegistry`, `functions`, `jobs` |
| `platform` | `secrets`, `config`, `observability`, `tracing`, `backup`, `registry`, `cicd`, `gitops`, `audit` |
| `vendor` | `identity`, `email` (when bought; else prefer `tenancy` on saas docs) |

Notes:

- On saas docs, `identity` / billing / audit often sit in **`tenancy`**, not `vendor`.
- A shared company data platform team may move stores to `platform`.

---

## Contract status

**LOCKED** — single pack `scopes` with 18 ids. The former ownership and document groupings are represented by this unified vocabulary.
