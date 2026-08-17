# Brick → icon map (LOCKED) — 2026-08-15

Principal: « Oui on fige les icones ».
Icons must exist in `src/components/Icon.tsx` (`ICONS` keys).

## Rules

1. One default icon per `ServiceRole` when placing a Lego brick.
2. User may change the icon on the component after place.
3. Prefer template majority (`cloudOf` + nearby `icon`) when clear; diverge only to keep Lego roles visually distinct (noted below).
4. Change only via ISA Decision + principal OK.

## Locked map (40 = 38 roles + 2 client kinds)

| ServiceRole | icon | Source |
|-------------|------|--------|
| `webApp` | `web` | client kind (VISION) |
| `mobileApp` | `mobile` | client kind (VISION) |
| `apiGateway` | `plug` | templates ×2 |
| `cdn` | `globe` | templates ×2 |
| `waf` | `shield` | curated (no template role use) |
| `loadBalancer` | `route` | templates ×1 |
| `staticHosting` | `web` | templates ×2 |
| `identity` | `lock` | templates ×2 |
| `functions` | `bolt` | templates (bolt vs cog worker) — role default = request handlers |
| `containers` | `docker` | curated (templates mix server/cog) |
| `kubernetes` | `layers` | curated (templates used server; distinguish from containers) |
| `jobs` | `clock` | templates ×1 |
| `orchestration` | `hub` | templates ×2 |
| `sql` | `db` | templates ×3 |
| `nosql` | `cube` | diverge (templates often `db`) — distinguish from sql |
| `cache` | `bolt` | templates ×3 |
| `objects` | `save` | templates ×4 |
| `warehouse` | `chart` | templates ×1 |
| `search` | `search` | templates ×1 |
| `vector` | `hub` | diverge (template `db`) — distinguish from sql |
| `queue` | `box` | diverge (mixed route/box/alert) — hold work |
| `pubsub` | `bell` | diverge (templates often route) — fan-out |
| `stream` | `chart` | templates ×1 |
| `streamProcessing` | `cog` | diverge (template bolt) — processing |
| `schemaRegistry` | `layers` | templates ×1 |
| `embeddings` | `ai` | templates ×1 |
| `llm` | `ai` | templates ×1 |
| `rerank` | `layers` | diverge (template chart) — avoid chart pile-up |
| `guardrails` | `shield` | templates ×1 |
| `ocr` | `scan` | templates ×1 |
| `secrets` | `key` | templates ×1 |
| `config` | `flag` | diverge (template key) — secrets owns key |
| `observability` | `chart` | templates ×2 |
| `tracing` | `eye` | templates ×3 |
| `backup` | `cloudup` | diverge (template shield) — shield = security bricks |
| `registry` | `docker` | templates ×1 |
| `email` | `mail` | templates ×1 |
| `cicd` | `git` | templates ×3 |
| `gitops` | `cloudup` | diverge (template git) — distinguish from cicd |
| `audit` | `file` | diverge (template eye) — tracing owns eye |

## Intentional shared icons

Same glyph, different roles — acceptable:

- `bolt` — `functions`, `cache`
- `ai` — `embeddings`, `llm`
- `shield` — `waf`, `guardrails`
- `hub` — `orchestration`, `vector`
- `layers` — `kubernetes`, `schemaRegistry`, `rerank`
- `chart` — `stream`, `warehouse`, `observability`
- `docker` — `containers`, `registry`
- `cloudup` — `backup`, `gitops`

## Status

**LOCKED** 2026-08-15 (+ `webApp`/`mobileApp` 2026-08-15). UI / `services.ts` wiring later.
