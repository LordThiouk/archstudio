# Lego placement vision

The user does not start from “Amazon Cognito” or “React Native”. They start from **what they want to add**, then narrow the catalog with Lego choices until a concrete box lands on the diagram.

> Add **auth** → place an **Auth** brick → choose **cloud vs self-hosted** → pick **scope** → pick a **service** from a filtered list (Firebase, Supabase, Cognito, Keycloak…).  
> Same for **mobile app** → place the brick → choose **tech** (React Native, Flutter…).  
> **Everything is Lego** — successive filters, not a blank canvas.

This document defines the product principles behind placement. The locked catalogs (`CATALOG`, `CAPABILITIES`, `SERVICES`, and related pages) are the **parts bins**; the Placement Wizard is how the user **assembles** them.

---

## The placement funnel (Lego steps)

| Step | User question | What we show | Lands on |
|------|---------------|--------------|----------|
| 1. **Intent / brick kind** | “What am I adding?” | Auth, Mobile app, API, Database, Queue… | Brick type (capability family) |
| 2. **Hosting mode** | “Who runs the software?” | Cloud · Self-hosted · (maybe BaaS / vendor SaaS) | Filters the next list |
| 3. **Scope** | “Which palette group is this box in?” | Single pack in [SCOPES.md](./SCOPES.md) (`front` · `data` · `tenancy` · `product` · `platform` · `vendor` · …) | `Component.group` |
| 4. **Concrete choice** | “Which product / framework?” | Filtered catalog | `name` + `tech[]` + cloud notes |
| 5. **Layer** (often automatic) | “Where on the stack?” | Pack default ([LAYERS_PACKS.md](./LAYERS_PACKS.md)) | `Component.layer` |

Journeys: browse patterns in the **Flows editor** ([FLOWS.md](./FLOWS.md)) — not in the Lego brick modal. Stack stays synced via upsert from `Component.tech[]`.

### Example A — Auth

1. Intent: **Auth**  
2. Mode: **Cloud** (not self-hosted)  
3. Scope: e.g. **vendor** (bought IdP) or **product** if the team owns the integration box  
4. Service list (cloud auth): Firebase Auth · Supabase Auth · Cognito · Entra External ID · Auth0 / WorkOS…  
5. Layer: `edge` (default pack)

If mode = **Self-hosted** → list flips to Keycloak · Zitadel · Ory… (today’s `identity` selfhosted cell, expanded).

### Example B — Mobile app

1. Intent: **Mobile app** (client surface — not a cloud `ServiceRole` today)  
2. Mode: n/a or “our app”  
3. Scope: **product**  
4. Tech list: React Native · Flutter · Native Swift/Kotlin…  
5. Layer: `clients`

---

## Two kinds of “Lego piece”

| Piece | Meaning | Examples |
|-------|---------|----------|
| **Capability brick** | What the box *is for* | Auth, Mobile app, Queue, LLM |
| **Variant** | What you *pick inside* the brick | Firebase vs Keycloak; React Native vs Flutter |

Variants are either:

- **Services** (backends / BaaS / cloud products) — today’s [SERVICES.md](./SERVICES.md) / `ServiceRole` × target, **plus** gaps (Firebase, Supabase as first-class auth options), or  
- **Client / app technologies** (frameworks) — mostly **missing** from the current 38 roles (those roles are infrastructure-shaped).

Capabilities ([CAPABILITIES.md](./CAPABILITIES.md)) label *what it does*; they are not the picker labels for step 1 (those should stay human: “Auth”, “Mobile”).

---

## Gap vs catalogs we already wrote

| Catalog or behavior | Product status | Remaining limit |
|------------------------------|-------------------|-----|
| 38 `ServiceRole` + client kinds | Complete domain bins | Runtime SQLite seed currently exposes 26 bricks |
| Scopes (single LOCKED pack, 18 ids) | Yes — step 3 | — |
| Layer packs | Yes — step 5 auto | — |
| Capabilities vocabulary | Labels on the box after place | Not the step-1 menu |
| Client apps (web/mobile) as bricks | `webApp` / `mobileApp` + variants | Not part of the legacy `ServiceRole` union |
| Progressive picker UI | Implemented in Placement Wizard | Deeper UX polish and provider choice within flow plates |

**Important:** template `CloudTarget` (`agnostic` \| `aws` \| `gcp` \| `azure` \| `selfhosted`) remains hyperscaler-shaped. Lego uses the separate `HostingMode` taxonomy so Firebase and Supabase can appear next to Cognito without forcing a cloud target first.

---

## Placement taxonomies

1. **Intent catalog** — [INTENTS.md](./INTENTS.md): 12 locked intents plus optional shapes.  
2. **Hosting mode** — `client` \| `baas` \| `cloud` \| `selfhosted`, locked in INTENTS.  
3. **Variant lists per intent × mode** — [VARIANTS.md](./VARIANTS.md): 154 locked rows.  
4. **Scope** — selected from compatible brick affinities.  
5. **Layer** — derived from the selected brick.

---

## Implementation

The runtime behavior is documented in [IMPLEMENTATION.md](./IMPLEMENTATION.md). The editor implements single-brick placement through the Placement Wizard; multi-step journeys remain in the Flows editor.
