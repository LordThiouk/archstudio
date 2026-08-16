# Flow patterns

Source of truth in product: `src/lib/flows/catalog.ts` (`FLOW_CATALOG`).

**Lock:** the **8 catalog ids** below stay **LOCKED** (no add/remove without ISA Decision + principal approval).  
This page defines the locked pattern crosswalk and synchronization model. Runtime insertion is implemented by `insertPlate` in `src/lib/flows/plate.ts`; users browse patterns in the **Flows editor**, not the Lego brick modal.

## What a flow is (two shapes)

| Shape | Type | Meaning |
|-------|------|---------|
| **Document flow** | `Flow` in `Architecture` | A named journey **bound** to component ids in *this* project |
| **Flow pattern** | `FlowTemplate` / `FlowPattern` | A **reusable recipe**: steps + soft `FlowHint`s; binding happens at insert time |

Lego cares about **patterns** (recipes on top of bricks). **Flows editor** browse → `insertPlate` create-or-bind + wire deps; stack upsert from `Component.tech[]`. Lego **add modal** stays diagram-only.

Hints match on name/tech/layer/icon words — they are **signals**, not hard rules (see `flows/types.ts`).

---

## Sync with diagram and stack (LOCKED)

| View | Source |
|------|--------|
| Diagram | `doc.components` (+ deps) |
| Document flow | `doc.flows[].steps[].component` → component ids |
| Tech stack | Upsert from `Component.tech[]` into `doc.technologies` after place/plate |

Browse patterns live in the **Flows editor** (not the Lego add-brick modal). Choosing tech/service per step = bind existing brick or create via variant → `placeVariant` / `insertPlate`. No bidirectional Stack→Flow sync.

## Where flows sit in the Lego funnel

```
Intent → (shape?) → mode → scope → Variant → brick(s)
                                              ↑
Flow pattern ──────────────────────────── plate / journey
```

| Layer | Role vs flow |
|-------|----------------|
| **Intent** | *What capability* (Auth, Messaging, …) — may spawn **one brick** *or* a **journey** |
| **Variant** | Concrete stack pick (Cognito, Firebase Auth, …) → usually **one** brick (+ tech) |
| **Flow pattern** | **Multi-step story** across bricks (login path, checkout, RAG ask) — not a hosting mode |

**Rule of thumb**

- User wants **one** capability on the canvas → **Intent → Variant → brick**.
- User wants a **named journey** already drawn/bound → **Flow pattern** (`auth-login`, `checkout`, …).
- Same domain can appear in both: e.g. Intent `auth` *and* flow `auth-login` (brick vs full path).

Do **not** collapse intents into flows or vice versa.

---

## Pack — shipped catalog ids (LOCKED) — 8

Do not add/remove catalog ids without ISA Decision + principal OK. Library patterns (user-saved) stay open-ended (caps in `flows/types.ts`).

| id | Name (en) | Tagline (en) | Steps (keys) | Primary intent(s) |
|----|-----------|--------------|--------------|-------------------|
| `auth-login` | Authentication | Signing in → issued token | client → edge → auth → store → session → back | `auth` |
| `checkout` | Checkout and payment | Basket → recorded order | client → api → price → psp → store → notify | *(no intent yet — commerce / payments backlog)* |
| `webhook-inbound` | Inbound webhook | Accept fast, process later | source → endpoint → verify → queue → worker → store | `messaging` (+ edge) |
| `async-job` | Asynchronous processing | Accept now, work out of band | api → queue → worker → store → notify | `messaging` |
| `file-upload` | File upload | Picked file → usable artifact | client → api → objects → scan → index → notify | `files` (+ `search` / `llm`) |
| `rag-query` | RAG query | Question → grounded reply | client → api → embed → retrieve → rerank → llm → back | `llm` |
| `ci-cd` | CI/CD pipeline | Merge → running version | ci → artifact → deploy → edge → verify | `ops` shape `ship` |
| `incident` | Alert and on-call | Bad metric → fix + write-up | service → signal → notify → data → fix | `ops` shape `observe` |

Library / user-saved patterns: open-ended (caps in product).

---

## Suggested bricks per pattern (Lego crosswalk)

Soft map: pattern step → brick (`ServiceRole` or client kind). User overrides at insert.  
Align with `CATALOG.md`, `INTENTS.md`, `VARIANTS.md` — **UI steps use `webApp` / `mobileApp`**, not “not a role”.

### `auth-login` ↔ Intent `auth`
| Step | Suggest | Variant / note |
|------|---------|----------------|
| client | `webApp` / `mobileApp` | shapes `web` / `mobile` |
| edge | `apiGateway`, `cdn`, `waf` | Intents `api` / `cdn` |
| auth | `identity` *(or BaaS auth via Firebase/Supabase maps_to)* | Cognito, Auth0, Firebase Auth, … |
| store | `sql` / `nosql` | user/session persistence |
| session | `cache` | tokens / session store |
| back | `webApp` / `mobileApp` | same client |

### `checkout` *(no Intent card yet)*
| Step | Suggest |
|------|---------|
| client | `webApp` / `mobileApp` |
| api | `apiGateway`, `functions` / `containers` |
| price | `functions` / `containers` *(domain)* |
| psp | *(vendor — not in seed 38; payment stays domain/vendor box)* |
| store | `sql` / `nosql` |
| notify | `email` *(or shortlist `notifications`)* |

### `webhook-inbound` ↔ Intent `messaging` (+ edge)
| Step | Suggest |
|------|---------|
| source | `vendor` scope component |
| endpoint | `apiGateway` |
| verify | `identity` / `guardrails` / `waf` |
| queue | `queue` |
| worker | `functions` / `jobs` / `containers` |
| store | `sql` / `nosql` |

### `async-job` ↔ Intent `messaging`
| Step | Suggest |
|------|---------|
| api | `apiGateway`, `functions` |
| queue | `queue` |
| worker | `functions` / `jobs` / `containers` |
| store | `sql` / `objects` |
| notify | `email` |

### `file-upload` ↔ Intent `files`
| Step | Suggest |
|------|---------|
| client | `webApp` / `mobileApp` |
| api | `apiGateway` |
| objects | `objects` |
| scan | `ocr` / `guardrails` |
| index | `search` / `vector` / `sql` |
| notify | `email` / `pubsub` |

### `rag-query` ↔ Intent `llm`
| Step | Suggest |
|------|---------|
| client | `webApp` / `mobileApp` |
| api | `apiGateway` |
| embed | `embeddings` |
| retrieve | `vector` / `search` |
| rerank | `rerank` |
| llm | `llm` (+ `guardrails`) |
| back | `webApp` / `mobileApp` |

### `ci-cd` ↔ Intent `ops` · shape `ship`
| Step | Suggest |
|------|---------|
| ci | `cicd` |
| artifact | `registry` |
| deploy | `containers` / `kubernetes` / `gitops` |
| edge | `apiGateway` / `cdn` / `loadBalancer` |
| verify | `observability` |

### `incident` ↔ Intent `ops` · shape `observe`
| Step | Suggest |
|------|---------|
| service | `functions` / `containers` *(any runtime)* |
| signal | `observability` / `tracing` |
| notify | `email` |
| data | `sql` / `warehouse` / `audit` |
| fix | `cicd` / `containers` |

---

## Intent → flow quick index

| Intent | Flow pattern(s) that tell the journey | Brick-first (variant) when no journey needed |
|--------|----------------------------------------|-----------------------------------------------|
| `auth` | `auth-login` | Cognito / Auth0 / Firebase Auth / … → identity |
| `messaging` | `webhook-inbound`, `async-job` | SQS / SNS / Kafka / … → queue/pubsub/stream |
| `files` | `file-upload` | S3 / GCS / R2 / … → objects |
| `llm` | `rag-query` | Bedrock / OpenAI / … → llm (+ RAG stack) |
| `ops` · `ship` | `ci-cd` | GitHub Actions / Argo / … → cicd/gitops |
| `ops` · `observe` | `incident` | CloudWatch / Datadog / … → observability |
| `web-app` / `mobile-app` | *(client steps inside several flows)* | React / Flutter / … → webApp/mobileApp |
| `database` / `api` / `cdn` / `workers` / `search` | *(appear as mid-steps)* | place brick directly |

**Gap:** no Intent for **checkout / payments** yet — flow `checkout` stands alone until a commerce Intent exists.

---

## Relation to other Lego docs

- **INTENTS / VARIANTS** — capability pick vs journey recipe (this file).
- **Layers** — a flow crosses bands; it does not replace layer packs.
- **Scopes** — steps often span several pack ids (e.g. `front` + `tenancy` + `vendor` for PSP / IdP).
- **Protocols** — consecutive steps imply edges; suggest protocols from callee brick (`PROTOCOLS.md`).
- **Shortlist** — `notifications` would strengthen checkout/incident notify steps later.
- **GAPS** — current runtime constraints and deferred flow work.

---

## Runtime behavior

| Piece | Status |
|-------|--------|
| 8 catalog ids | **LOCKED** |
| Brick + Intent crosswalk | Locked soft mapping; users may override reviewed bindings |
| `insertFlow` | Inserts a flow from resolved bindings |
| `insertPlate` | Reuses or creates mappable bricks, inserts the flow, wires consecutive steps, and synchronizes stack technologies |

At insertion time, each reviewed step can bind an existing component, be skipped, or request creation. Missing steps may also be created for the empty-canvas path. Creation uses the runtime catalog and therefore inherits the selected brick's icon, prose, scope, layer, and technology metadata.

The plate map intentionally skips steps without a supported runtime role, such as the checkout PSP. For mappable steps, an existing component with the same brick role is reused before a new component is created. The current implementation chooses the first variant mapped to the role rather than prompting for a provider.

After the flow is inserted, consecutive bound components receive `deps` and a suggested protocol/link kind. `syncTechnologies()` then performs the same additive stack upsert used by single-brick placement. See [IMPLEMENTATION.md](./IMPLEMENTATION.md#flow-plates) for transaction and rollback behavior.
