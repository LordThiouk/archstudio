# Dependency suggestions (LOCKED) — 2026-08-16

Principal: « Vérouille doc d’abord » — suggestions of dependencies so non-architects can wire a diagram without guessing.

Related: [CATALOG.md](./CATALOG.md) (`depends_on` inventory) · [PROTOCOLS.md](./PROTOCOLS.md) · [FLOWS.md](./FLOWS.md) · [VISION.md](./VISION.md) · [GAPS.md](./GAPS.md)

**Status: LOCKED contract** — schema, UX rules, primary suggestion matrix, and **diagram ↔ flow reflection**. Runtime sheet + flow chips/hints shipped; see backlog below for remaining polish.

---

## Goal

After placing a brick, ArchStudio suggests **what this box usually needs to talk to**, in plain language, then offers to **link** an existing component or **add + link** a missing one.

This is guidance, not automatic architecture. The user always confirms.

---

## Rules (LOCKED)

1. **Suggest brick roles, not cloud vendors.** Targets are catalog brick ids (`identity`, `sql`, …), never “AWS Cognito” or “RDS”.
2. **Human copy first.** UI shows a localized *why* sentence — never raw ids as the primary label.
3. **Cap the list.** Post-placement UI shows at most **3** suggestions (all `required`, then `recommended`). `optional` only behind “Show more”.
4. **No silent wiring.** Never create `deps` / `links` without an explicit user action (Link / Add & link / Skip).
5. **Match by brick, not by name.** Prefer an existing diagram component whose `Component.brick` (or legacy id-valued `role`) equals the target brick.
6. **Protocol follows callee.** Default `protocol` + `kind` come from [PROTOCOLS.md](./PROTOCOLS.md) for the **target** brick (with the caller overrides listed there).
7. **Direction is caller → callee.** The placed brick is the caller; each suggestion is an outgoing dependency.
8. **Ids stay lowercase.** Display labels stay capitalized (same rule as Mode / Scope / Layer).
9. **Connections reflect in flows.** Accepting a diagram link must be visible in the Flows experience (see [Reflection in flows](#reflection-in-flows-locked)). Plates already write `deps` when they wire consecutive steps — the reverse direction is required too.
10. Change only via ISA Decision + principal OK.

---

## Suggestion record schema (LOCKED)

Each edge in this contract is one suggestion from a source brick to a target brick:

| Field | Type | Meaning |
|-------|------|---------|
| `from` | brick id | Caller (usually the brick just placed) |
| `to` | brick id | Callee role to suggest |
| `strength` | `required` \| `recommended` \| `optional` | Ranking for UI |
| `why_en` / `why_fr` | string | One plain sentence for non-architects |
| `protocol_id` | protocol id from PROTOCOLS | Default annotation when linking |
| `kind` | `sync` \| `async` \| `batch` | Default `LinkKind` |

Persistence target (future seed / SQLite): one row per `(from, to)` per catalog version. Authoring source remains code/docs until seeded.

`CATALOG.md` `depends_on` lists remain the **full advisory inventory**. This file ranks what the product may **surface** in UX.

---

## Strength meanings

| Strength | User-facing sense | UI default |
|----------|-------------------|------------|
| `required` | “Without this, the feature usually does not work.” | Always shown; primary CTA |
| `recommended` | “Most teams add this next.” | Shown if room under the 3-cap |
| `optional` | “Common later, not urgent.” | Hidden behind “Show more” |

Skipping is always allowed — even for `required`. The label explains risk; it does not block Place.

---

## UX moments (LOCKED product shape)

### A — Post-placement sheet

Trigger: user confirms **Place brick**.

Title (en): **What this usually needs**  
Title (fr): **Ce dont ça a souvent besoin**

For each visible suggestion:

| Diagram state | Actions |
|---------------|---------|
| A component with matching brick already exists | **Link** (writes `deps` + `links`) · **Skip** |
| No matching component | **Add & link** (opens Placement Wizard filtered to that brick intent family) · **Skip** |
| Already linked from this component | Show as done; no duplicate |

Dismiss / “Done” closes the sheet without forcing remaining items.

### Reflection in flows (LOCKED)

Diagram edges and document flows are two views of the same architecture. Non-architects must see that a connection drawn (or accepted from a suggestion) is not “diagram only”.

| Direction | Required behavior |
|-----------|-------------------|
| **Flow plate → diagram** | Already implemented: consecutive bound steps write `deps` + `links` (protocol/kind). |
| **Diagram link → flows** | Required: accepting Link / Add & link / manual edge **reflects in Flows**. |

**When the user confirms caller → callee:**

1. **Flow already contains both components as consecutive steps** — ensure `deps`/`links` match; Flows step list may show the protocol chip between those steps (same labels as the diagram).
2. **Flow contains both, but not adjacent** — do not silently reorder steps. Soft hint in Flows: “These two steps are connected on the diagram” with protocol; user may reorder or ignore.
3. **No flow contains both** — do **not** invent a full pattern. Offer one optional CTA: **Add short journey** (creates a 2-step document flow: caller → callee, named from the human *why* or component names). Skip remains default.
4. **Selected / focused flow** — if the Flows editor has a flow selected, prefer updating or hinting that flow first; otherwise use the most recently edited flow that contains either endpoint.

**Display rules in Flows editor**

- Between two consecutive steps whose components are linked on the diagram, show the edge annotation (`protocol` · `kind`) — same vocabulary as [PROTOCOLS.md](./PROTOCOLS.md).
- Removing a diagram dependency does not delete flow steps; it clears or dims the between-step connection cue until the user restores the link or edits the flow.
- Flow patterns (catalog recipes) stay recipes; reflection applies to **document flows** bound to this project’s component ids.

**Anti-goals for reflection**

- Auto-inserting an 8-step catalog pattern from one dependency
- Reordering flow steps without consent
- Duplicating the same edge into every flow that mentions either component

### B — Draw edge A → B

When the user draws a dependency manually, pre-fill `protocol` + `kind` from the callee brick using [PROTOCOLS.md](./PROTOCOLS.md). User may edit before save. On confirm, apply the same [Reflection in flows](#reflection-in-flows-locked) rules.

### C — Inspector

Outgoing deps keep manual add/remove. Optional later: show unmet `required` suggestions as soft hints under the dependency list.

---

## Primary suggestion matrix (LOCKED)

Ranked edges the product may show. Cap still applies at display time.

Protocol ids use the vocabulary in [PROTOCOLS.md](./PROTOCOLS.md).

### Clients

| from | to | strength | why (en) | why (fr) | protocol_id | kind |
|------|-----|----------|----------|----------|-------------|------|
| `webApp` | `identity` | required | People need to sign in before using the product. | Les gens doivent se connecter avant d’utiliser le produit. | `oidc` | sync |
| `webApp` | `apiGateway` | recommended | The browser should call a single API entry, not every backend directly. | Le navigateur devrait appeler une seule entrée API, pas chaque backend. | `rest` | sync |
| `webApp` | `cdn` | optional | Static assets and edge caching keep the UI fast. | Les assets et le cache edge gardent l’UI rapide. | `rest` | sync |
| `mobileApp` | `identity` | required | The app needs a login / token issuer. | L’app a besoin d’un login / émetteur de jetons. | `oidc` | sync |
| `mobileApp` | `apiGateway` | recommended | Mobile clients should hit one API front door. | Les clients mobiles devraient passer par une seule porte API. | `rest` | sync |

### Edge & identity

| from | to | strength | why (en) | why (fr) | protocol_id | kind |
|------|-----|----------|----------|----------|-------------|------|
| `apiGateway` | `identity` | recommended | The gateway often validates tokens before routing. | La passerelle valide souvent les jetons avant de router. | `oidc` | sync |
| `cdn` | `staticHosting` | recommended | CDN usually fronts the files or app shell you publish. | Le CDN sert en général les fichiers / shell que tu publies. | `rest` | sync |
| `staticHosting` | `cdn` | optional | A CDN in front of static hosting is the usual production shape. | Un CDN devant l’hébergement statique est la forme prod habituelle. | `rest` | sync |
| `waf` | `apiGateway` | recommended | WAF sits in front of the public entry you protect. | Le WAF se place devant l’entrée publique à protéger. | `rest` | sync |
| `loadBalancer` | `containers` | recommended | The load balancer spreads traffic across running instances. | Le load balancer répartit le trafic entre les instances. | `rest` | sync |
| `identity` | `secrets` | recommended | Auth providers need private keys and client secrets stored safely. | L’auth a besoin de clés et secrets stockés proprement. | `rest` | sync |

### Compute

| from | to | strength | why (en) | why (fr) | protocol_id | kind |
|------|-----|----------|----------|----------|-------------|------|
| `functions` | `secrets` | required | Serverless code needs credentials without hard-coding them. | Le code serverless a besoin de credentials sans les coder en dur. | `rest` | sync |
| `functions` | `sql` | recommended | Most backends persist business data in a database. | La plupart des backends stockent les données métier en base. | `sql` | sync |
| `containers` | `secrets` | required | Containers need runtime secrets and config injection. | Les conteneurs ont besoin de secrets et de config au runtime. | `rest` | sync |
| `containers` | `registry` | recommended | Images have to come from a container registry. | Les images doivent venir d’un registry. | `rest` | sync |
| `kubernetes` | `observability` | recommended | Clusters are hard to operate without metrics and logs. | Un cluster sans métriques / logs est difficile à opérer. | `rest` | sync |
| `jobs` | `queue` | recommended | Background work usually waits on a queue or schedule trigger. | Le travail de fond attend en général une file ou un schedule. | `queue` | async |
| `orchestration` | `queue` | recommended | Workflows coordinate steps through queues or events. | Les workflows coordonnent les étapes via files ou events. | `queue` | async |

### Data

| from | to | strength | why (en) | why (fr) | protocol_id | kind |
|------|-----|----------|----------|----------|-------------|------|
| `sql` | `secrets` | required | Databases need connection credentials. | Les bases ont besoin d’identifiants de connexion. | `rest` | sync |
| `sql` | `backup` | recommended | Durable data needs a backup path. | Des données durables ont besoin de sauvegarde. | `rest` | sync |
| `nosql` | `secrets` | required | Document stores need access credentials. | Les stores document ont besoin d’accès. | `rest` | sync |
| `cache` | `sql` | optional | Cache often sits in front of a primary database. | Le cache se place souvent devant une base primaire. | `sql` | sync |
| `objects` | `secrets` | recommended | Object storage needs access keys / IAM roles. | Le stockage objet a besoin de clés / rôles. | `rest` | sync |
| `search` | `objects` | optional | Search indexes are often built from documents in object storage. | Les index sont souvent construits depuis des docs en object storage. | `object` | sync |
| `vector` | `embeddings` | required | Vectors come from an embedding model. | Les vecteurs viennent d’un modèle d’embeddings. | `rest` | sync |

### Messaging

| from | to | strength | why (en) | why (fr) | protocol_id | kind |
|------|-----|----------|----------|----------|-------------|------|
| `queue` | `functions` | recommended | Something must consume the messages. | Quelque chose doit consommer les messages. | `queue` | async |
| `pubsub` | `functions` | recommended | Subscribers process published events. | Des subscribers traitent les events publiés. | `pubsub` | async |
| `stream` | `streamProcessing` | recommended | Streams usually feed a processor or consumer service. | Les streams alimentent en général un processeur. | `kafka` | async |

### AI & ops

| from | to | strength | why (en) | why (fr) | protocol_id | kind |
|------|-----|----------|----------|----------|-------------|------|
| `llm` | `guardrails` | recommended | LLM answers should pass safety / policy checks. | Les réponses LLM devraient passer des garde-fous. | `rest` | sync |
| `llm` | `secrets` | required | Model APIs need API keys. | Les APIs de modèles ont besoin de clés. | `rest` | sync |
| `embeddings` | `vector` | recommended | Embeddings are stored in a vector index. | Les embeddings sont stockés dans un index vectoriel. | `rest` | sync |
| `email` | `secrets` | recommended | Mail providers need SMTP / API credentials. | Les providers mail ont besoin de credentials. | `smtp` | async |
| `observability` | `secrets` | optional | Agents and exporters need sink credentials. | Agents / exporters ont besoin d’accès au sink. | `rest` | sync |
| `cicd` | `registry` | recommended | Pipelines publish build artifacts / images. | Les pipelines publient artefacts / images. | `rest` | sync |
| `gitops` | `kubernetes` | recommended | GitOps applies desired state to a cluster. | GitOps applique l’état désiré sur un cluster. | `rest` | sync |
| `audit` | `objects` | optional | Audit trails are often archived to object storage. | Les pistes d’audit partent souvent en object storage. | `object` | sync |

Bricks with `depends_on: none` in [CATALOG.md](./CATALOG.md) (`secrets`, `observability` as pure platforms, etc.) may still appear as **targets** of other suggestions; they need not emit outbound post-placement prompts.

---

## Relationship to catalog `depends_on`

| Source | Role |
|--------|------|
| [CATALOG.md](./CATALOG.md) `depends_on` | Full advisory set of related brick ids (may be longer than UX cap) |
| This file | Ranked, phrased, protocol-aware edges allowed in product UX |

If the two disagree, **this file wins for UX ranking**; update `CATALOG.md` in the same decision when changing target ids.

---

## Anti-goals

- Auto-creating a whole reference architecture from one brick
- Suggesting specific cloud SKUs in this step
- Blocking Place until suggestions are accepted
- Showing more than three cards by default
- Using brick ids as the only visible text

---

## Runtime delivery and backlog

Delivered:

1. Suggestion rows are seeded in SQLite with the catalog version and exposed on `LegoCatalogSnapshot`.
2. The post-placement sheet shows up to three required/recommended suggestions with explicit **Link / Add & link / Skip** actions.
3. Non-placeable targets stay visible with a manual-add explanation.
4. Confirmed diagram links reflect non-destructively in document flows: protocol/kind chips for consecutive steps and soft hints for non-adjacent steps.
5. Unit tests cover seed/snapshot, ranking/cap, match-by-brick, explicit writes, targeted placement, skip, and flow reflection.

Backlog:

1. **Show more optional** for suggestions beyond the default required/recommended cap.
2. Protocol prefill picker UI when drawing edges manually (defaults are now written from the callee brick).
3. ~~Optional **Add short journey** CTA when no document flow contains both endpoints.~~

See [GAPS.md](./GAPS.md).
