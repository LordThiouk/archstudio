# Lego limits and deferred work

Lego placement is implemented: ArchStudio reads a versioned SQLite catalog, exposes it through the catalog API, places bricks through the Placement Wizard, synchronizes the technology stack, and inserts flow plates from the Flows editor. See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for the runtime design.

This page records current constraints. It is not a release chronology.

## Coverage summary

| Area | Implemented | Current limit |
|---|---|---|
| Catalog persistence | Versioned transactional SQLite seed and runtime reads | Authoring remains in `seed-data.ts`; no catalog admin UI |
| Catalog API | Localized English/French snapshots | Browser memoization lasts for the page lifetime |
| Placement taxonomy | 12 intents, optional shapes, 4 modes, compatible scopes, 154 variants | Runtime seed covers 26 of the 40 conceptual bricks |
| Placement Wizard | Intent → shape → mode → scope → variant | No post-placement recommendations or multi-brick suggestions |
| Brick metadata | Role, responsibilities, known gaps, icon, scope, layer, and technologies | Protocols are not selected during single-brick placement |
| Stack sync | Case-insensitive additive upsert from all component `tech[]` values | No pruning; existing authored fields are not recomputed |
| Flow plates | Bind, skip, or create mapped steps; insert flow; wire links; sync stack | Provider selection uses the first variant mapped to a role |
| Locked catalogs | Scopes, intents, variants, flows, capabilities, icons, and protocols documented | Some derived inventories can drift from runtime seed data |

## Runtime catalog boundary

The complete [CATALOG.md](./CATALOG.md) defines 38 infrastructure roles plus `webApp` and `mobileApp`. The versioned SQLite seed currently exposes 26 bricks. Repository tests enforce the runtime count, so a documented brick is not automatically available to the wizard or a flow plate.

Catalog changes remain code-first:

- `src/lib/lego/seed-data.ts` contains the authoring seed.
- `LEGO_CATALOG_VERSION` controls whether a new version is inserted.
- Existing rows for a seeded version are not updated by editing the seed alone.
- The API reads SQLite; it does not read Markdown or parse the catalog documents.

## Placement constraints

- `maps_to` is complete for all 154 variants, but broad intents still depend on shape to distinguish target roles.
- Scope choices come from runtime brick affinities after intent, mode, and shape filtering.
- **All scopes** is the safe default and falls back to the target brick's default scope at insertion.
- Scope aliases normalize legacy ids such as `core`, `business`, and `consumer` to `product`.
- Layer is derived from the target brick; the wizard does not expose a layer picker.
- `depends_on` in [CATALOG.md](./CATALOG.md) remains advisory for single-brick placement.
- The protocol vocabulary in [PROTOCOLS.md](./PROTOCOLS.md) is locked, but the inspector still permits free-form values.

## Flow plate constraints

- The eight pattern ids are locked in [FLOWS.md](./FLOWS.md).
- Pattern definitions, step-to-brick mappings, and protocol suggestions are coded rather than stored in SQLite.
- Plate creation reuses the first existing component with the required brick role.
- If creation is required, the first runtime variant mapped to that role is selected without a provider prompt.
- Unmappable steps are skipped. The checkout PSP step intentionally has no runtime mapping because payments/commerce is outside the current seed.
- Flow insertion synchronizes the stack, but it does not highlight newly created components on the diagram.

## Taxonomy constraints

| Topic | Constraint |
|---|---|
| Template cloud targets | `CloudTarget` remains separate from Lego `HostingMode`; template instantiation is still hyperscaler-shaped |
| Capabilities and technologies | `CAPABILITIES.md` is a locked vocabulary; `TECHNOLOGIES.md` and `BRICK_TECH.md` are derived inventories and may drift |
| Layer packs | Default, RAG, and event packs exist, but placement does not switch packs automatically |
| Internationalization | Brick prose and scope labels support English/French; many variant labels remain product names or English-only |
| Legacy layers | Blank documents may contain `infra` while locked packs use `platform` |
| Deferred bricks | The eight entries in [SHORTLIST.md](./SHORTLIST.md) remain outside the runtime catalog |

## Deliberately deferred product work

- Recommend likely next bricks after placement, such as CDN after a web app.
- Offer provider selection for each created flow step.
- Add an explicit payment/commerce intent and PSP brick.
- Derive inventories automatically from the versioned runtime catalog.
- Add catalog administration and migration tooling.
- Prune stale stack entries safely.

The locked contracts remain authoritative for ids and semantics. Deferred work must preserve the distinction between a single capability brick and a multi-step flow pattern.
