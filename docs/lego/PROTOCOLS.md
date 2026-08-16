# Edge protocols + link kinds (LOCKED) — 2026-08-15

Principal: « Oui fige ca ».
Code: `Link` + `LinkKind` in `src/lib/types.ts`. `deps` = edge exists; `links[]` only annotates.

## Rules

1. **Kind** = does the caller wait? Closed enum in code — do not invent values.
2. **Protocol** = how it travels. Stored as a **string** on `Link.protocol` (no code enum yet). This file is the Lego **suggested vocabulary**.
3. UI may still accept a custom string; suggestions should prefer ids below.
4. Change only via ISA Decision + principal OK.

---

## LinkKind (already in product — LOCKED)

| kind | Meaning (en) | Meaning (fr) | Stroke cue (howto) |
|------|--------------|--------------|--------------------|
| `sync` | Caller waits | L’appelant attend | Solid (default; often omitted in JSON) |
| `async` | Caller does not wait | L’appelant n’attend pas | Dashed |
| `batch` | Scheduled / bulk | Planifié / en lot | Batch reading |

---

## Protocol vocabulary (LOCKED) — 15

Canonical **label** is what we write on `Link.protocol` (matches examples already in the codebase where possible).

| id | Label (`protocol` string) | Default kind | Aliases normalize to label |
|----|---------------------------|--------------|----------------------------|
| `rest` | `REST/HTTPS` | `sync` | `REST`, `HTTPS`, `HTTP` |
| `grpc` | `gRPC` | `sync` | |
| `graphql` | `GraphQL` | `sync` | |
| `sql` | `SQL` | `sync` | |
| `nosql` | `Document API` | `sync` | `MongoDB`, `NoSQL` |
| `redis` | `Redis` | `sync` | |
| `object` | `S3 API` | `sync` | `Object storage`, `Blob API` |
| `queue` | `Message queue` | `async` | `SQS`, `AMQP`, `Service Bus` |
| `kafka` | `Kafka` | `async` | `Event stream` |
| `pubsub` | `Pub/Sub` | `async` | |
| `webhook` | `Webhook` | `async` | |
| `smtp` | `SMTP` | `async` | `Email API` |
| `oidc` | `OIDC/OAuth` | `sync` | `OAuth`, `OIDC` |
| `cdc` | `CDC` | `async` | `Change data capture` |
| `batch` | `Batch transfer` | `batch` | `batch load`, `ETL` |

Soft ceiling ~15 so the picker stays usable.

Evidence in repo before lock: `SQL`, `Kafka`, `REST`/`REST/HTTPS`, `Redis`, `gRPC`, `HTTPS`, `CDC`, `batch load` (+ noise from tests).

---

## Suggest protocol from **callee** brick (ServiceRole)

When the user draws A → B, default suggestion from B’s role:

| Callee `ServiceRole` | Suggested protocol id | Kind |
|----------------------|-----------------------|------|
| `sql` | `sql` | sync |
| `nosql` | `nosql` | sync |
| `cache` | `redis` | sync |
| `objects` | `object` | sync |
| `warehouse` | `sql` | sync *(or `batch` if noted as load)* |
| `search` / `vector` | `rest` | sync |
| `queue` | `queue` | async |
| `stream` | `kafka` | async |
| `pubsub` | `pubsub` | async |
| `streamProcessing` / `schemaRegistry` | `kafka` | async |
| `apiGateway` / `functions` / `containers` / `kubernetes` / `jobs` / `orchestration` | `rest` | sync |
| `cdn` / `staticHosting` / `waf` / `loadBalancer` | `rest` | sync |
| `identity` | `oidc` | sync |
| `email` | `smtp` | async |
| `llm` / `embeddings` / `rerank` / `guardrails` / `ocr` | `rest` | sync |
| `secrets` / `config` / `observability` / `tracing` / `cicd` / `gitops` / `audit` / `backup` / `registry` | `rest` | sync |

Caller-side overrides (optional hints):

- Producer → `queue`/`stream`/`pubsub` → prefer **async** + queue/kafka/pubsub even if callee table says sync elsewhere.
- Nightly warehouse load → `batch` + `Batch transfer`.
- DB replica note stays in `Link.note`, not a new protocol.

---

## Status

**LOCKED** 2026-08-15 — kinds (code) + 15 protocol labels + callee suggestions. Wiring into the editor is out of scope until a later ISA.
