# Capability vocabulary (LOCKED) — 2026-08-15

Principal: « figer vocabulaire capability ».

## Rules

1. **Capabilities** = what a brick *does* (HTTP API, Queue, LLM) — not the cloud product name (Lambda, SQS).
2. **service_tech** stays product/vendor tags from `services.ts` (not replaced by this list).
3. Suggested `tech[]` on a placed Lego brick = capability **labels** below (user may still add free text).
4. Free-form template labels normalize via **Aliases** when matching.
5. Change only via Decision + principal OK.

## Vocabulary (LOCKED) — 49

| id | Label (for `tech[]`) | Aliases (normalize → id) |
|----|----------------------|--------------------------|
| `http-api` | `HTTP API` | `SSE` |
| `cdn` | `CDN` | — |
| `tls` | `TLS` | `Let's Encrypt` |
| `waf` | `WAF` | — |
| `jwt` | `JWT` | — |
| `health-checks` | `Health checks` | — |
| `spa` | `SPA` | — |
| `oidc` | `OIDC` | — |
| `saml` | `SAML` | — |
| `scim` | `SCIM` | — |
| `functions` | `Functions` | — |
| `container` | `Container` | `Runtime` |
| `kubernetes` | `Kubernetes` | — |
| `worker` | `Worker` | `Consumer`, `Queue consumer` |
| `scheduler` | `Scheduler` | — |
| `workflow` | `Workflow` | `Compensation` |
| `relational` | `Relational DB` | `PostgreSQL`, `Replication`, `RLS`, `OLTP` |
| `document-store` | `Document store` | — |
| `key-value` | `Key-value` | `TTL` |
| `object-storage` | `Object storage` | — |
| `full-text` | `Full-text search` | `Full-text` |
| `vector-search` | `Vector search` | `ANN`, `Hybrid search` |
| `columnar` | `Columnar / warehouse` | `Columnar` |
| `queue` | `Queue` | — |
| `dlq` | `Dead-letter queue` | `DLQ` |
| `event-bus` | `Event bus` | `Events`, `Rules` |
| `event-log` | `Event log / stream` | `Log`, `Partitions` |
| `stream-processing` | `Stream processing` | `Windowing`, `Aggregation` |
| `schema` | `Schema contract` | `Avro`, `JSON Schema` |
| `llm` | `LLM` | — |
| `embedding` | `Embedding model` | — |
| `rerank` | `Rerank` | `Cross-encoder` |
| `content-safety` | `Content safety` | — |
| `pii` | `PII detection` | — |
| `ocr` | `OCR` | `Layout` |
| `secrets` | `Secrets` | — |
| `config` | `Config` | — |
| `logs` | `Logs` | — |
| `metrics` | `Metrics` | — |
| `traces` | `Traces` | `OpenTelemetry` |
| `alerts` | `Alerts` | — |
| `ci` | `CI` | `Migrations` |
| `iac` | `Infrastructure as code` | `IaC` |
| `gitops` | `GitOps` | — |
| `oci` | `OCI registry` | `OCI` |
| `scanning` | `Image scanning` | `Scanning` |
| `email` | `Email` | `SMTP`, `Templates` |
| `backup` | `Backup / PITR` | `Snapshots`, `PITR` |
| `audit-log` | `Audit log` | `Append-only` |

### Out of vocabulary (keep free-form if needed)

Language / framework noise from templates is **not** locked: e.g. `TypeScript`, `Framework`, `Push`, `Webhook` (prefer `PROTOCOLS.md` for webhook).

## Default capabilities per brick

| ServiceRole | capability ids (primary first) | Labels |
|-------------|--------------------------------|--------|
| `webApp` | `spa` | `SPA` |
| `mobileApp` | `spa` | `SPA` |
| `apiGateway` | `http-api`, `jwt`, `waf` | `HTTP API`, `JWT`, `WAF` |
| `audit` | `audit-log` | `Audit log` |
| `backup` | `backup` | `Backup / PITR` |
| `cache` | `key-value` | `Key-value` |
| `cdn` | `cdn`, `tls`, `waf` | `CDN`, `TLS`, `WAF` |
| `cicd` | `ci`, `iac` | `CI`, `Infrastructure as code` |
| `config` | `config`, `secrets` | `Config`, `Secrets` |
| `containers` | `container`, `http-api`, `worker` | `Container`, `HTTP API`, `Worker` |
| `email` | `email` | `Email` |
| `embeddings` | `embedding` | `Embedding model` |
| `functions` | `functions`, `worker` | `Functions`, `Worker` |
| `gitops` | `gitops`, `ci` | `GitOps`, `CI` |
| `guardrails` | `content-safety`, `pii` | `Content safety`, `PII detection` |
| `identity` | `oidc`, `jwt`, `saml`, `scim` | `OIDC`, `JWT`, `SAML`, `SCIM` |
| `jobs` | `scheduler`, `worker` | `Scheduler`, `Worker` |
| `kubernetes` | `kubernetes`, `container` | `Kubernetes`, `Container` |
| `llm` | `llm` | `LLM` |
| `loadBalancer` | `tls`, `health-checks` | `TLS`, `Health checks` |
| `nosql` | `document-store`, `key-value` | `Document store`, `Key-value` |
| `objects` | `object-storage` | `Object storage` |
| `observability` | `logs`, `metrics`, `alerts` | `Logs`, `Metrics`, `Alerts` |
| `ocr` | `ocr` | `OCR` |
| `orchestration` | `workflow` | `Workflow` |
| `pubsub` | `event-bus`, `dlq` | `Event bus`, `Dead-letter queue` |
| `queue` | `queue`, `dlq` | `Queue`, `Dead-letter queue` |
| `registry` | `oci`, `scanning` | `OCI registry`, `Image scanning` |
| `rerank` | `rerank` | `Rerank` |
| `schemaRegistry` | `schema` | `Schema contract` |
| `search` | `full-text` | `Full-text search` |
| `secrets` | `secrets` | `Secrets` |
| `sql` | `relational` | `Relational DB` |
| `staticHosting` | `spa`, `cdn` | `SPA`, `CDN` |
| `stream` | `event-log` | `Event log / stream` |
| `streamProcessing` | `stream-processing` | `Stream processing` |
| `tracing` | `traces`, `metrics` | `Traces`, `Metrics` |
| `vector` | `vector-search`, `full-text` | `Vector search`, `Full-text search` |
| `waf` | `waf` | `WAF` |
| `warehouse` | `columnar` | `Columnar / warehouse` |

## Status

**LOCKED** 2026-08-15 — 49 capability ids + per-brick defaults. Injected into CATALOG as `capabilities`.

