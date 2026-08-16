# Enrichment shortlist (LOCKED) — 2026-08-15

Principal: « Fige la shortlist d’abord ».
Source: Standard Research (Sterling · Rivera · Johannes · Chen).

## Rule

- **v1** = fill the **38** seed bricks in `CATALOG.md` (responsibilities, deps, when).
- **This shortlist** = backlog only. Do **not** add these ids to `CATALOG.md` / `services.ts` until a later Decision after v1 is complete.
- Max **8** tech roles. No domain bricks (payment product, mobile app, “orders service”).

## Locked 8

| # | id | category (proposed) | why | confidence |
|---|-----|---------------------|-----|------------|
| 1 | `featureFlags` | Compute / config-adjacent | CNCF Feature Flagging; distinct from `config` | HIGH |
| 2 | `serviceMesh` | Edge / compute | CNCF mesh ≠ `apiGateway` | HIGH |
| 3 | `policyEngine` | AI & ops / security | OPA-style runtime policy ≠ `waf` / `audit` | HIGH |
| 4 | `dns` | Edge & identity | Networking gap vs icons/CAF catalogs | HIGH |
| 5 | `privateNetwork` | Edge & identity | VPN / private connectivity gap | HIGH |
| 6 | `serviceDiscovery` | Messages / compute | CNCF Coordination & Discovery | HIGH |
| 7 | `notifications` | AI & ops | SMS/push beyond `email` | MED→accepted |
| 8 | `rateLimiter` | Edge & identity | Often first-class outside `apiGateway` | MED→accepted |

## Explicitly deferred (not in shortlist)

| id / theme | reason |
|------------|--------|
| `paymentOrchestrator`, `paymentVault`, `fraudEngine`, `ledger` | Domain/SaaS — templates/systems later, not Lego seed |
| mobile as domain system | Superseded by client kinds `webApp`/`mobileApp` in CATALOG (2026-08-15) |
| `chaosEngineering` | Niche; after platform maturity |
| `bastion`, `ddos`, `iot`, `media`, `finops` | Nice-to-have; would break 8-cap |
| `webhookDispatcher` | Fold into `notifications` / API patterns later |

## Admission gate (before promoting any shortlist id)

1. v1 CATALOG 38 rows complete (ISC-2).
2. Named gap: a template or user flow needs the brick (Decision + example).
3. Vendor-neutral `role` + ≥2 responsibilities + deps only to existing or shortlist ids.
4. Still ≤ 38+8 = 46 visible bricks unless principal raises the ceiling.

## Status

**LOCKED** 2026-08-15 — change only via ISA Decision + principal OK.

### Note (2026-08-15)

VARIANTS maps_to gaps closed without promoting the 8 shortlist infra roles.
