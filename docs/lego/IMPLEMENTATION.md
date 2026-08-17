# Lego runtime implementation

This page describes the Lego functionality that is implemented in ArchStudio today: the SQLite-backed catalog, catalog API, Placement Wizard, brick insertion, stack synchronization, and flow plates.

## Runtime architecture

```text
seed-data.ts
    │ first catalog read, once per version
    ▼
SQLite catalog tables ── repository.ts ── GET /api/lego/catalog
                                              │
                                              ▼
                                      Placement Wizard
                                              │
                          placeVariant + ensurePlacementScaffold
                                              │
                                              ▼
                                Architecture.components[]
                                              │
                                      syncTechnologies
                                              ▼
                               Architecture.technologies[]
```

The catalog version is `2026-08-16.1`. `ensureLegoCatalog()` opens an immediate transaction and inserts the versioned seed only when that version is absent. Runtime catalog reads then build an English or French `LegoCatalogSnapshot` from SQLite.

The database defaults to `data/studio.db`. `DATABASE_PATH` can point tests or another runtime at a different file. The shared database layer uses `node:sqlite`, enables foreign keys and WAL, and opens lazily on the first query.

## Catalog storage

The runtime schema separates stable identifiers from localized or many-to-many data:

| Table | Purpose |
|---|---|
| `lego_catalog_versions` | Records each seeded catalog version |
| `lego_scopes` | Scope ids and English/French labels |
| `lego_scope_aliases` | Normalizes aliases such as `core` to `product` |
| `lego_bricks` | Icon, layer, default scope, and capability values |
| `lego_brick_texts` | Localized role, responsibilities, and known gaps |
| `lego_brick_scope_affinities` | Scopes in which each brick may be offered |
| `lego_capability_phrases` | Localized phrases used in generated stack descriptions |
| `lego_intents` | Placement intent ids and labels |
| `lego_intent_modes` | Ordered hosting modes per intent |
| `lego_intent_shapes` | Optional ordered shape choices per intent |
| `lego_variants` | Concrete choices and their target brick (`maps_to`) |
| `lego_technology_descriptions` | Localized descriptions for known stack technologies |

The current seed and repository tests assert:

- 18 scopes
- 26 runtime bricks
- 12 intents
- 154 variants
- 38 localized technology-description keys

The broader [catalog contract](./CATALOG.md) documents 40 conceptual brick kinds. Not all 40 are currently included in the runtime SQLite seed. Treat the tested runtime count as the product behavior and the 40-brick document as the complete domain catalog.

## Catalog API

`GET /api/lego/catalog` returns a complete `LegoCatalogSnapshot`.

| Query | Behavior |
|---|---|
| `lang=fr` | Returns French scope labels and brick prose |
| Missing or any other `lang` value | Returns English content |

The route runs on the Node.js runtime, is force-dynamic, and returns `Cache-Control: no-store`. The browser client memoizes one in-flight/resolved request per language for the current page lifetime and evicts failed requests so they can be retried.

The response contains:

- `version` and `lang`
- `scopes` and `aliases`
- `bricks`, keyed by brick id
- `intents`
- `variants`
- `technologyDescriptions`

## Placement Wizard

The editor loads the catalog for the document language and opens the wizard from **Add brick**. The user follows this sequence:

```text
Intent → [Shape] → Mode → Scope → Variant → Place brick
```

`Shape` appears only for intents that define multiple families. Intent selection resets mode, shape, scope, and variant to compatible defaults.

### Filtering rules

1. Intent, mode, and optional shape filter the 154 variants.
2. The scope list is derived from the affinities of the remaining target bricks.
3. **All scopes** disables scope filtering and is the default.
4. Choosing a scope filters variants by the target brick's scope affinities.
5. If a previous scope becomes invalid after another selection changes, the wizard returns to **All scopes**.

The preview displays localized role, responsibilities, and known gaps before insertion. See [INTENTS.md](./INTENTS.md), [SCOPES.md](./SCOPES.md), and [VARIANTS.md](./VARIANTS.md) for the taxonomy.

## Intent, mode, scope, variant, and layer

These values answer different questions and must not be collapsed:

| Dimension | Question | Runtime effect |
|---|---|---|
| Intent | What capability is being added? | Selects a variant family |
| Shape | Which sub-family is needed? | Narrows multi-role intents such as API or messaging |
| Mode | Who runs or supplies it? | Filters `client`, `baas`, `cloud`, or `selfhosted` variants |
| Scope | Which architectural ownership/area group contains it? | Sets `Component.group` |
| Variant | Which concrete framework or service is selected? | Supplies the label and resolves `maps_to` |
| Layer | Where does the component sit vertically? | Sets `Component.layer` from the target brick |

Scope is user-selectable; layer is derived from brick metadata. A missing destination group or layer is created when the component is inserted. Existing stored ids are preserved, while generated display names are localized and capitalized.

## Brick insertion

`placeVariant()` resolves a variant and its target brick, rejects unknown ids, and creates a `Component` with:

- a collision-safe id derived from the variant id
- the variant label as `name`
- the target brick id in `brick`
- localized `role`, `features`, and `notes`
- selected/default `group`
- catalog `layer` and `icon`
- `tech[]` containing brick capabilities plus the variant label
- empty `deps` and `links`

The editor then calls `ensurePlacementScaffold()`, appends the component to `Architecture.components`, and synchronizes the technology stack.

## Stack synchronization

`syncTechnologies()` scans every component's `tech[]` and performs a case-insensitive upsert into `Architecture.technologies`.

For a new technology, it can derive:

- `category` from the first component's layer label
- `description` from catalog descriptions, a variant description, or a localized capability phrase
- `groups` from the components that use the technology

Authored values are preserved: synchronization fills fields only when they are `undefined`. The operation is additive. It does not remove stack entries that are no longer referenced, and it does not continuously recompute fields that already exist.

## Flow plates

The Flows editor owns journey insertion; the brick modal remains focused on one component. A plate combines a reusable flow pattern with reviewed step bindings.

For each pattern step, insertion may:

- bind an existing component id
- skip the step
- create a component when the step has a runtime role and at least one matching variant

Creation reuses an existing component with the same brick role before adding another. New components use the first runtime variant mapped to that role. After the document flow is inserted, consecutive bound steps are wired with `deps` and a suggested `Link` protocol/kind. Stack synchronization runs once at the end.

If no actionable flow can be inserted, newly created components, groups, and layers are rolled back. Intentionally unmappable steps remain skipped, including the checkout PSP step.

The eight locked pattern ids and their step-to-brick crosswalk are documented in [FLOWS.md](./FLOWS.md).

## Source of truth: database vs code

SQLite is the runtime read source for catalog snapshots, but it is not yet an authoring interface.

| Data | Runtime source | Authoring source |
|---|---|---|
| Scopes, aliases, bricks, prose, affinities, intents, modes, shapes, variants, technology descriptions | Versioned SQLite rows | `src/lib/lego/seed-data.ts` |
| Catalog version | `lego_catalog_versions` | `LEGO_CATALOG_VERSION` in `repository.ts` |
| Catalog response | SQLite via `repository.ts` | API projection in `route.ts` |
| Flow pattern definitions | In-memory code catalog | `src/lib/flows/catalog.ts` |
| Flow step → brick mapping | In-memory map | `STEP_ROLES` in `plate.ts` |
| Suggested link protocols | In-memory switch | `protocolFor()` in `plate.ts` |
| Project diagram, flows, and stack | `projects.data` JSON | User edits and insertion helpers |

Changing seed data without incrementing the catalog version does not update rows already seeded for that version because inserts are idempotent. Catalog changes therefore require an explicit versioning decision.

## Tests

The Lego suites use Node's test runner through the project test script.

| Suite | Coverage |
|---|---|
| `src/lib/lego/repository.test.ts` | Fresh SQLite seed, exact row counts, idempotence, English/French snapshots |
| `src/lib/lego/lego.test.ts` | Locked intent/variant counts, scope filtering, labels, placement metadata, scaffold creation, stack preservation, and plate insertion |

Run the full test suite with `npm test`.

## Current limits

- The runtime SQLite seed exposes 26 bricks, not all 40 conceptual catalog entries.
- Catalog authoring remains code-first; there is no catalog administration UI.
- The browser caches catalog snapshots for the page lifetime even though the HTTP route is uncached.
- Flow plate creation chooses the first variant mapped to a role; it does not ask for a preferred provider per step.
- Flow step mappings and protocol suggestions are coded maps, not database records.
- Stack synchronization is additive and does not prune stale entries.
- Scope aliases are normalized, but legacy documents may still contain older group ids.
- Checkout has no payment/PSP runtime brick and intentionally skips that step.
