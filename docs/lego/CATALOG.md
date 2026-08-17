# ArchStudio Lego catalog — LOCKED schema

Seed: 38 `ServiceRole` keys from `src/lib/templates/services.ts` **+** 2 client kinds (`webApp`, `mobileApp`).

## Required fields per brick (LOCKED)

Every brick entry in this file **must** provide:

| Field | Maps to | Rule |
|-------|---------|------|
| `role` | `Component.role` | One phrase (en/fr): *what this is for*, not the tech name |
| `responsibilities` | `Component.features` | ≥2 bullets (en/fr): what it does |
| `notes` (known gaps) | `Component.notes` | ≥1 bullet (en/fr): caveats, unfinished policy, misuse risks |
| `depends_on` | suggested `deps` | Advisory brick ids — ranked UX in [DEPENDENCIES.md](./DEPENDENCIES.md) |
| `when_to_use` / `when_not_to_use` | catalog UI only | Placement guidance |
| `icon` / `scope` / capabilities / tech | defaults | See ICONS, SCOPES, CAPABILITIES, BRICK_TECH |

Status: **filled + LOCKED prose** — role, responsibilities, notes/known gaps on all 40 conceptual bricks. Icons, scopes, and capabilities are locked in their dedicated contracts. Persisted mapping is documented in [DATA_TYPES.md](./DATA_TYPES.md).
Enrichment backlog (new bricks only): see [SHORTLIST.md](./SHORTLIST.md).

The runtime SQLite seed currently exposes 26 of these brick kinds. The Placement Wizard and flow plates can place only bricks present in that runtime snapshot. See [IMPLEMENTATION.md](./IMPLEMENTATION.md#catalog-storage) for the database boundary and tested counts.

## Category map

- **Edge & identity** — `apiGateway`, `cdn`, `waf`, `loadBalancer`, `staticHosting`, `identity`
- **Compute** — `functions`, `containers`, `kubernetes`, `jobs`, `orchestration`
- **Data** — `sql`, `nosql`, `cache`, `objects`, `warehouse`, `search`, `vector`
- **Messages & events** — `queue`, `pubsub`, `stream`, `streamProcessing`, `schemaRegistry`
- **AI & ops** — `embeddings`, `llm`, `rerank`, `guardrails`, `ocr`, `secrets`, `config`, `observability`, `tracing`, `backup`, `registry`, `email`, `cicd`, `gitops`, `audit`
- **Clients** — `webApp`, `mobileApp` (framework variants; not in services.ts yet)

## Clients (Lego kinds outside `services.ts`)

These are **client surface** bricks; their variants are frameworks in [VARIANTS.md](./VARIANTS.md).

### `webApp`

- **category:** Clients
- **icon:** `web`
- **scope:** `product`
- **service_tech:** —
- **capability_tech:** —
- **capabilities:** `spa` → `SPA`
- **role:** (en) Browser UI that presents the product to people. / (fr) UI navigateur qui présente le produit aux personnes.
- **notes** (known gaps):
  - (en) Often conflated with the API or BFF behind it — keep the client boundary clear.
  - (fr) Souvent confondu avec l’API ou le BFF derrière — garder la frontière client claire.
  - (en) SEO, auth cookies, and CSP are product decisions not encoded in the brick.
  - (fr) SEO, cookies auth et CSP sont des choix produit non encodés dans la brique.
- **responsibilities:**
  - (en) Present the product UI in a browser
  - (fr) Présenter l’UI produit dans un navigateur
  - (en) Call backend APIs as a client
  - (fr) Appeler les API backend en tant que client
- **depends_on:** `apiGateway`, `identity`, `cdn`
- **when_to_use:** (en) Users interact through a web or admin UI / (fr) Les utilisateurs passent par une UI web ou admin
- **when_not_to_use:** (en) Pure mobile-native without a web surface / (fr) Uniquement du natif mobile, sans surface web
- **status:** filled (client kind) — role + notes LOCKED

### `mobileApp`

- **category:** Clients
- **icon:** `mobile`
- **scope:** `product`
- **service_tech:** —
- **capability_tech:** —
- **capabilities:** `spa` → `SPA`
- **role:** (en) Installable mobile client for phones and tablets. / (fr) Client mobile installable pour téléphone et tablette.
- **notes** (known gaps):
  - (en) Store review, push certs, and offline sync are outside this brick’s scope.
  - (fr) Review store, certificats push et sync offline hors scope de cette brique.
  - (en) A responsive webApp may already cover the same journeys.
  - (fr) Une webApp responsive peut déjà couvrir les mêmes parcours.
- **responsibilities:**
  - (en) Present the product UI on phones and tablets
  - (fr) Présenter l’UI produit sur téléphone et tablette
  - (en) Call backend APIs as a mobile client
  - (fr) Appeler les API backend en tant que client mobile
- **depends_on:** `apiGateway`, `identity`
- **when_to_use:** (en) Users need an installable or store-shipped mobile app / (fr) Il faut une app mobile installable ou store
- **when_not_to_use:** (en) Responsive web only is enough / (fr) Le web responsive suffit
- **status:** filled (client kind) — role + notes LOCKED

## Edge & identity

### `apiGateway`

- **category:** Edge & identity
- **icon:** `plug`
- **scope:** `product`
- **service_tech:** `API Gateway`, `APIM`, `Kong`, `Traefik`
- **capability_tech:** `HTTP API`, `JWT`, `WAF`
- **capabilities:** `http-api`, `jwt`, `waf` → `HTTP API`, `JWT`, `WAF`
- **role:** (en) Public or internal HTTP front door that routes and protects APIs. / (fr) Porte d’entrée HTTP publique ou interne qui route et protège les API.
- **notes** (known gaps):
  - (en) Business rules do not belong here — keep it thin.
  - (fr) Les règles métier n’appartiennent pas ici — rester mince.
  - (en) WAF and auth can live on the gateway or as sibling bricks; avoid double ownership.
  - (fr) WAF et auth peuvent vivre sur la gateway ou en briques sœurs ; éviter le double ownership.
- **responsibilities:**
  - (en) Route HTTP to the right backend
  - (fr) Router le HTTP vers le bon backend
  - (en) Throttle and authenticate at the edge before business code
  - (fr) Limiter le débit et authentifier à la bordure avant le code métier
  - (en) Terminate TLS and expose a stable public API
  - (fr) Terminer le TLS et exposer une API publique stable
- **depends_on:** `identity`, `functions`, `containers`
- **when_to_use:** (en) Many clients hit one API surface; you need a single front door / (fr) Plusieurs clients frappent une seule API ; il faut une porte d’entrée unique
- **when_not_to_use:** (en) A single internal service with no public HTTP API / (fr) Un seul service interne sans API HTTP publique
- **status:** filled — role + notes LOCKED

### `cdn`

- **category:** Edge & identity
- **icon:** `globe`
- **scope:** `product`
- **service_tech:** `Cloud CDN`, `CloudFront`, `Front Door`, `Nginx`, `Varnish`
- **capability_tech:** `CDN`, `TLS`, `WAF`
- **capabilities:** `cdn`, `tls`, `waf` → `CDN`, `TLS`, `WAF`
- **role:** (en) Edge cache that serves static or cacheable content close to users. / (fr) Cache de bordure qui sert du contenu statique ou cacheable près des utilisateurs.
- **notes** (known gaps):
  - (en) Cache invalidation and TTL mistakes are the usual production pain.
  - (fr) Invalidation de cache et TTL mal réglés sont la douleur prod habituelle.
  - (en) Does not replace an origin API for personalized or mutating traffic.
  - (fr) Ne remplace pas une API d’origine pour du trafic personnalisé ou mutatif.
- **responsibilities:**
  - (en) Cache static assets close to users
  - (fr) Mettre en cache les assets près des utilisateurs
  - (en) Reduce origin load and latency for files and pages
  - (fr) Réduire la charge et la latence vers l’origine
- **depends_on:** `staticHosting`, `objects`
- **when_to_use:** (en) Global users download the same images, JS, or media often / (fr) Des utilisateurs mondiaux retéléchargent souvent les mêmes fichiers
- **when_not_to_use:** (en) Only internal traffic inside one region / VPC / (fr) Uniquement du trafic interne dans une région / VPC
- **status:** filled — role + notes LOCKED

### `waf`

- **category:** Edge & identity
- **icon:** `shield`
- **scope:** `product`
- **service_tech:** `AWS WAF`, `Azure WAF`, `Cloud Armor`, `Coraza`, `OWASP CRS`
- **capability_tech:** —
- **capabilities:** `waf` → `WAF`
- **role:** (en) Request filter that blocks common web attacks before apps see traffic. / (fr) Filtre de requêtes qui bloque les attaques web courantes avant les apps.
- **notes** (known gaps):
  - (en) False positives can break legit clients — tune rules with observability.
  - (fr) Les faux positifs peuvent casser des clients légitimes — régler avec de l’observabilité.
  - (en) Not a substitute for secure application code.
  - (fr) Pas un substitut au code applicatif sécurisé.
- **responsibilities:**
  - (en) Block common web attacks (injection, bots, bad IPs)
  - (fr) Bloquer les attaques web courantes (injection, bots, IPs)
  - (en) Apply request rules before traffic reaches apps
  - (fr) Appliquer des règles avant que le trafic n’atteigne les apps
- **depends_on:** `apiGateway`, `cdn`, `loadBalancer`
- **when_to_use:** (en) Public HTTP endpoints face the internet / (fr) Des endpoints HTTP publics font face à Internet
- **when_not_to_use:** (en) No public web surface; only private APIs / (fr) Pas de surface web publique ; seulement des API privées
- **status:** filled — role + notes LOCKED

### `loadBalancer`

- **category:** Edge & identity
- **icon:** `route`
- **scope:** `product`
- **service_tech:** `ACM`, `ALB`, `App Gateway`, `GCLB`, `HAProxy`, `Let's Encrypt`
- **capability_tech:** `TLS`, `Health checks`
- **capabilities:** `tls`, `health-checks` → `TLS`, `Health checks`
- **role:** (en) Distributes traffic across instances and terminates or forwards TLS. / (fr) Répartit le trafic entre instances et termine ou relaie le TLS.
- **notes** (known gaps):
  - (en) Health checks and sticky sessions must match how the app actually behaves.
  - (fr) Health checks et sessions sticky doivent coller au comportement réel de l’app.
  - (en) Often overlaps with apiGateway/CDN — pick one owner per path.
  - (fr) Chevauche souvent apiGateway/CDN — un seul owner par chemin.
- **responsibilities:**
  - (en) Distribute traffic across healthy instances
  - (fr) Répartir le trafic entre instances saines
  - (en) Health-check backends and fail over
  - (fr) Surveiller la santé des backends et basculer
- **depends_on:** `containers`, `kubernetes`, `functions`
- **when_to_use:** (en) Several identical instances serve the same workload / (fr) Plusieurs instances identiques servent la même charge
- **when_not_to_use:** (en) One process or a fully managed function with built-in routing / (fr) Un seul process ou une fonction managée avec routage intégré
- **status:** filled — role + notes LOCKED

### `staticHosting`

- **category:** Edge & identity
- **icon:** `web`
- **scope:** `product`
- **service_tech:** `Caddy`, `CloudFront`, `Firebase Hosting`, `S3`, `Static Web Apps`
- **capability_tech:** `SPA`, `TypeScript`
- **capabilities:** `spa`, `cdn` → `SPA`, `CDN`
- **role:** (en) Hosts static files (SPA shells, assets) without a custom app server. / (fr) Héberge des fichiers statiques (shells SPA, assets) sans serveur d’app custom.
- **notes** (known gaps):
  - (en) SPA routing (404→index) and cache headers are easy to misconfigure.
  - (fr) Routage SPA (404→index) et headers de cache faciles à mal configurer.
  - (en) Secrets must never ship in the static bundle.
  - (fr) Les secrets ne doivent jamais partir dans le bundle statique.
- **responsibilities:**
  - (en) Serve HTML/CSS/JS and static files
  - (fr) Servir HTML/CSS/JS et fichiers statiques
  - (en) Host the web front-end without app servers
  - (fr) Héberger le front web sans serveurs d’app
- **depends_on:** `cdn`
- **when_to_use:** (en) You ship a SPA or marketing site as files / (fr) Tu livres une SPA ou un site marketing en fichiers
- **when_not_to_use:** (en) The UI must be rendered server-side on every request with session state / (fr) L’UI doit être rendue côté serveur à chaque requête avec session
- **status:** filled — role + notes LOCKED

### `identity`

- **category:** Edge & identity
- **icon:** `lock`
- **scope:** `vendor`
- **service_tech:** `Cognito`, `Entra External ID`, `Firebase Auth`, `Identity Platform`, `Keycloak`, `OIDC`
- **capability_tech:** `OIDC`, `JWT`, `SAML`, `SCIM`
- **capabilities:** `oidc`, `jwt`, `saml`, `scim` → `OIDC`, `JWT`, `SAML`, `SCIM`
- **role:** (en) Proves who callers are and issues tokens other services trust. / (fr) Prouve qui sont les appelants et émet des jetons auxquels d’autres services font confiance.
- **notes** (known gaps):
  - (en) Vendor IdP vs self-hosted changes scope (vendor vs tenancy/product).
  - (fr) IdP tiers vs self-hosted change le scope (vendor vs tenancy/product).
  - (en) Token lifetimes, MFA, and session revocation are product policy gaps until specified.
  - (fr) Durée des jetons, MFA et révocation de session restent des trous produit tant qu’ils ne sont pas spécifiés.
- **responsibilities:**
  - (en) Prove who the caller is (sign-in, tokens)
  - (fr) Prouver qui est l’appelant (connexion, jetons)
  - (en) Issue tokens other services can validate
  - (fr) Émettre des jetons que d’autres services valident
  - (en) Handle password reset and social/OIDC sign-in
  - (fr) Gérer reset mot de passe et connexion sociale/OIDC
- **depends_on:** `email`
- **when_to_use:** (en) Humans or apps must log in before using the product / (fr) Des humains ou apps doivent se connecter avant d’utiliser le produit
- **when_not_to_use:** (en) Fully internal batch jobs with no end-user identity / (fr) Jobs batch purement internes sans identité utilisateur
- **status:** filled — role + notes LOCKED

## Compute

### `functions`

- **category:** Compute
- **icon:** `bolt`
- **scope:** `product`
- **service_tech:** `Azure Functions`, `Cloud Run functions`, `Flex Consumption`, `Knative`, `Kubernetes`, `Lambda`
- **capability_tech:** `Functions`, `Worker`
- **capabilities:** `functions`, `worker` → `Functions`, `Worker`
- **role:** (en) Runs short request- or event-driven units of work with managed scale. / (fr) Exécute de courtes unités de travail sur requête ou événement avec scale managé.
- **notes** (known gaps):
  - (en) Cold starts, timeouts, and payload size limits are platform-specific gaps.
  - (fr) Cold starts, timeouts et limites de payload sont des trous spécifiques plateforme.
  - (en) Long workflows usually need jobs or orchestration instead.
  - (fr) Les workflows longs demandent plutôt jobs ou orchestration.
- **responsibilities:**
  - (en) Run short request-driven or event-driven units of work
  - (fr) Exécuter de courtes unités de travail sur requête ou événement
  - (en) Scale to zero when idle when the platform allows
  - (fr) Passer à zéro au repos quand la plateforme le permet
- **depends_on:** `secrets`, `sql`, `nosql`, `objects`, `queue`
- **when_to_use:** (en) Spiky or infrequent workloads; you want managed scale / (fr) Charge irrégulière ou rare ; tu veux du scale managé
- **when_not_to_use:** (en) Long-running processes, heavy local state, or fixed always-on fleets / (fr) Process longs, état local lourd, ou flotte toujours allumée
- **status:** filled — role + notes LOCKED

### `containers`

- **category:** Compute
- **icon:** `docker`
- **scope:** `product`
- **service_tech:** `Cloud Run`, `Container Apps`, `Docker`, `ECS`, `Fargate`, `Nomad`
- **capability_tech:** `Container`, `HTTP API`, `SSE`, `Runtime`, `Framework`, `Queue consumer`, `Consumer`
- **capabilities:** `container`, `http-api`, `worker` → `Container`, `HTTP API`, `Worker`
- **role:** (en) Runs a packaged application image with a custom runtime stack. / (fr) Exécute une image d’application empaquetée avec une stack runtime custom.
- **notes** (known gaps):
  - (en) Image size, base CVEs, and local state across restarts are recurring gaps.
  - (fr) Taille d’image, CVE de base et état local entre restarts sont des trous récurrents.
  - (en) Needs a registry and a deploy path (cicd/gitops) to be operable.
  - (fr) Besoin d’un registry et d’un chemin de deploy (cicd/gitops) pour être opérable.
- **responsibilities:**
  - (en) Package an app with its runtime and ship the same image everywhere
  - (fr) Empaqueter une app avec son runtime et déployer la même image partout
  - (en) Run services that need a custom OS/library stack
  - (fr) Faire tourner des services qui demandent une stack OS/libs custom
- **depends_on:** `registry`, `secrets`, `loadBalancer`
- **when_to_use:** (en) You need a portable runtime beyond a single language function / (fr) Il te faut un runtime portable au-delà d’une fonction mono-langage
- **when_not_to_use:** (en) A few scripts fit cleanly in managed functions / (fr) Quelques scripts tiennent clairement dans des fonctions managées
- **status:** filled — role + notes LOCKED

### `kubernetes`

- **category:** Compute
- **icon:** `layers`
- **scope:** `product`
- **service_tech:** `AKS`, `EKS`, `GKE`, `Talos Linux`, `k3s`
- **capability_tech:** `Kubernetes`
- **capabilities:** `kubernetes`, `container` → `Kubernetes`, `Container`
- **role:** (en) Orchestrates many containers: schedule, heal, and scale a cluster. / (fr) Orchestre beaucoup de conteneurs : placer, soigner et scaler un cluster.
- **notes** (known gaps):
  - (en) Operational cost is high; overkill for one or two services.
  - (fr) Coût opérationnel élevé ; excessif pour un ou deux services.
  - (en) Network policies, ingress, and RBAC are not implied by placing this brick.
  - (fr) Network policies, ingress et RBAC ne sont pas implicites en posant cette brique.
- **responsibilities:**
  - (en) Orchestrate many containers: schedule, restart, scale
  - (fr) Orchestrer beaucoup de conteneurs : placement, restart, scale
  - (en) Declare desired state for clusters of services
  - (fr) Déclarer l’état désiré d’un cluster de services
- **depends_on:** `containers`, `registry`, `observability`
- **when_to_use:** (en) Many services, teams, and deployment policies on shared infra / (fr) Beaucoup de services, équipes et politiques sur une infra partagée
- **when_not_to_use:** (en) One or two containers; managed container apps are enough / (fr) Un ou deux conteneurs ; une offre containers managée suffit
- **status:** filled — role + notes LOCKED

### `jobs`

- **category:** Compute
- **icon:** `clock`
- **scope:** `product`
- **service_tech:** `Cloud Run Jobs`, `Cloud Scheduler`, `Container Apps Jobs`, `ECS`, `EventBridge Scheduler`, `Nomad`, `systemd`
- **capability_tech:** `Scheduler`
- **capabilities:** `scheduler`, `worker` → `Scheduler`, `Worker`
- **role:** (en) Runs finite batch or scheduled work to completion off the request path. / (fr) Exécute un travail batch ou planifié jusqu’au bout hors chemin requête.
- **notes** (known gaps):
  - (en) Idempotency and partial-failure recovery are usually underspecified.
  - (fr) Idempotence et reprise après échec partiel sont souvent sous-spécifiés.
  - (en) Overlaps with queue consumers — clarify who owns retries.
  - (fr) Chevauche les consumers de file — clarifier qui possède les retries.
- **responsibilities:**
  - (en) Run finite batch or scheduled tasks to completion
  - (fr) Exécuter des tâches batch ou planifiées jusqu’au bout
  - (en) Retry failed runs without blocking interactive APIs
  - (fr) Relancer les échecs sans bloquer les API interactives
- **depends_on:** `queue`, `objects`, `secrets`
- **when_to_use:** (en) Nightly imports, reports, migrations, one-shot workers / (fr) Imports nocturnes, rapports, migrations, workers one-shot
- **when_not_to_use:** (en) Every piece of work must answer an interactive user in milliseconds / (fr) Chaque travail doit répondre à un utilisateur en millisecondes
- **status:** filled — role + notes LOCKED

### `orchestration`

- **category:** Compute
- **icon:** `hub`
- **scope:** `product`
- **service_tech:** `Durable Functions`, `Step Functions`, `Temporal`, `Workflows`
- **capability_tech:** `Workflow`, `Compensation`
- **capabilities:** `workflow` → `Workflow`
- **role:** (en) Coordinates multi-step workflows across services with durable state. / (fr) Coordonne des workflows multi-étapes entre services avec état durable.
- **notes** (known gaps):
  - (en) Saga compensation and poison messages need explicit design.
  - (fr) Compensation de saga et messages poison demandent un design explicite.
  - (en) Easy to over-centralize business logic into the orchestrator.
  - (fr) Facile de trop centraliser la logique métier dans l’orchestrateur.
- **responsibilities:**
  - (en) Coordinate multi-step workflows with retries and state
  - (fr) Coordonner des workflows multi-étapes avec retries et état
  - (en) Keep long-running business processes durable
  - (fr) Rendre durables les process métier longs
- **depends_on:** `functions`, `containers`, `queue`, `sql`
- **when_to_use:** (en) A process spans many steps, waits, and compensations / (fr) Un process traverse beaucoup d’étapes, d’attentes et de compensations
- **when_not_to_use:** (en) A single request-handler does the whole job synchronously / (fr) Un seul handler fait tout le travail en synchrone
- **status:** filled — role + notes LOCKED

## Data

### `sql`

- **category:** Data
- **icon:** `db`
- **scope:** `product`
- **service_tech:** `Aurora`, `Cloud SQL`, `Flexible Server`, `Patroni`, `PostgreSQL`
- **capability_tech:** `PostgreSQL`, `Replication`, `RLS`
- **capabilities:** `relational` → `Relational DB`
- **role:** (en) Transactional relational store for structured records. / (fr) Store relationnel transactionnel pour des enregistrements structurés.
- **notes** (known gaps):
  - (en) Schema migrations, connection pooling, and multi-tenant isolation are open design points.
  - (fr) Migrations de schéma, pooling et isolation multi-tenant sont des points de design ouverts.
  - (en) Read replicas and failover are not automatic just because the brick exists.
  - (fr) Réplicas lecture et failover ne sont pas automatiques du seul fait de la brique.
- **responsibilities:**
  - (en) Store relational truth with transactions and queries
  - (fr) Stocker la vérité relationnelle avec transactions et requêtes
  - (en) Enforce schemas and joins for structured business data
  - (fr) Imposer schémas et jointures pour des données métier structurées
- **depends_on:** `secrets`, `backup`
- **when_to_use:** (en) You need transactions, relations, and ad-hoc queries / (fr) Tu as besoin de transactions, relations et requêtes ad hoc
- **when_not_to_use:** (en) Simple key-value access patterns at massive scale with no joins / (fr) Accès clé-valeur simple à très grande échelle sans jointures
- **status:** filled — role + notes LOCKED

### `nosql`

- **category:** Data
- **icon:** `cube`
- **scope:** `product`
- **service_tech:** `Cosmos DB`, `DynamoDB`, `Firestore`, `MongoDB`
- **capability_tech:** `OLTP`, `Document store`, `Key-value`, `TTL`
- **capabilities:** `document-store`, `key-value` → `Document store`, `Key-value`
- **role:** (en) Flexible document or key-value store for non-relational data shapes. / (fr) Store document ou clé-valeur flexible pour des formes de données non relationnelles.
- **notes** (known gaps):
  - (en) Consistency model and query patterns must match the product — easy to misuse as SQL.
  - (fr) Modèle de cohérence et patterns de requête doivent coller au produit — facile à mal utiliser comme SQL.
  - (en) Secondary indexes and hot partitions are common production gaps.
  - (fr) Index secondaires et partitions chaudes sont des trous prod courants.
- **responsibilities:**
  - (en) Store flexible or key-value documents at scale
  - (fr) Stocker documents flexibles ou clé-valeur à l’échelle
  - (en) Serve access patterns designed up front (keys/indexes)
  - (fr) Servir des motifs d’accès décidés à l’avance (clés/index)
- **depends_on:** `secrets`, `backup`
- **when_to_use:** (en) High scale with known access patterns; schema flexibility / (fr) Forte échelle avec motifs d’accès connus ; schéma flexible
- **when_not_to_use:** (en) Heavy multi-table joins and reporting are the core workload / (fr) Les jointures multi-tables et le reporting sont le cœur
- **status:** filled — role + notes LOCKED

### `cache`

- **category:** Data
- **icon:** `bolt`
- **scope:** `product`
- **service_tech:** `ElastiCache`, `Managed Redis`, `Memorystore`, `Redis`, `Redis protocol`, `Valkey`
- **capability_tech:** `Key-value`
- **capabilities:** `key-value` → `Key-value`
- **role:** (en) Low-latency store for ephemeral or frequently read data. / (fr) Store basse latence pour données éphémères ou lues souvent.
- **notes** (known gaps):
  - (en) Cache stampede, TTLs, and invalidation vs source of truth need an explicit policy.
  - (fr) Stampede, TTL et invalidation vs source de vérité demandent une politique explicite.
  - (en) Not durable storage — do not treat as the system of record.
  - (fr) Pas un stockage durable — ne pas traiter comme système d’enregistrement.
- **responsibilities:**
  - (en) Keep hot data in memory for fast reads
  - (fr) Garder les données chaudes en mémoire pour des lectures rapides
  - (en) Absorb read spikes off the primary store
  - (fr) Absorber les pics de lecture hors de la base principale
- **depends_on:** `sql`, `nosql`
- **when_to_use:** (en) The same reads dominate latency or cost / (fr) Les mêmes lectures dominent latence ou coût
- **when_not_to_use:** (en) Every read must be strongly consistent from the source of truth / (fr) Chaque lecture doit être fortement cohérente depuis la source de vérité
- **status:** filled — role + notes LOCKED

### `objects`

- **category:** Data
- **icon:** `save`
- **scope:** `product`
- **service_tech:** `Blob Storage`, `GCS`, `MinIO`, `S3`, `S3 API`
- **capability_tech:** `Object storage`, `Append-only`
- **capabilities:** `object-storage` → `Object storage`
- **role:** (en) Stores large binary objects and files addressed by key. / (fr) Stocke de gros objets binaires et fichiers adressés par clé.
- **notes** (known gaps):
  - (en) Access control (signed URLs, buckets) and lifecycle rules are product gaps until set.
  - (fr) Contrôle d’accès (URL signées, buckets) et lifecycle sont des trous produit tant qu’ils ne sont pas fixés.
  - (en) Virus scanning and PII in uploads are often forgotten.
  - (fr) Scan antivirus et PII dans les uploads sont souvent oubliés.
- **responsibilities:**
  - (en) Store large blobs: files, images, backups, exports
  - (fr) Stocker de gros blobs : fichiers, images, backups, exports
  - (en) Serve or generate pre-signed access to objects
  - (fr) Servir ou générer un accès pré-signé aux objets
- **depends_on:** `secrets`
- **when_to_use:** (en) Users upload files or you produce large artifacts / (fr) Les utilisateurs envoient des fichiers ou tu produis de gros artefacts
- **when_not_to_use:** (en) Only tiny structured rows belong in a database / (fr) Seules de petites lignes structurées vont en base
- **status:** filled — role + notes LOCKED

### `warehouse`

- **category:** Data
- **icon:** `chart`
- **scope:** `product`
- **service_tech:** `BigQuery`, `ClickHouse`, `DuckDB`, `Fabric`, `Redshift`, `S3 + Athena alternative`, `Synapse`
- **capability_tech:** `Columnar`
- **capabilities:** `columnar` → `Columnar / warehouse`
- **role:** (en) Analytical store optimized for reporting and large scans, not OLTP. / (fr) Store analytique optimisé reporting et grands scans, pas OLTP.
- **notes** (known gaps):
  - (en) ETL freshness and PII in analytics copies are usual compliance gaps.
  - (fr) Fraîcheur ETL et PII dans les copies analytiques sont des trous conformité habituels.
  - (en) Do not put interactive product transactions here.
  - (fr) Ne pas y mettre les transactions produit interactives.
- **responsibilities:**
  - (en) Run analytical queries over large historical datasets
  - (fr) Lancer des requêtes analytiques sur de gros historiques
  - (en) Separate analytics load from the operational database
  - (fr) Séparer la charge analytique de la base opérationnelle
- **depends_on:** `objects`, `sql`
- **when_to_use:** (en) BI, reporting, and product analytics on lots of history / (fr) BI, reporting et analytics produit sur beaucoup d’historique
- **when_not_to_use:** (en) Only live OLTP queries on small working sets / (fr) Seulement de l’OLTP live sur de petits ensembles
- **status:** filled — role + notes LOCKED

### `search`

- **category:** Data
- **icon:** `search`
- **scope:** `product`
- **service_tech:** `AI Search`, `Elasticsearch`, `Meilisearch`, `OpenSearch`
- **capability_tech:** `Full-text`
- **capabilities:** `full-text` → `Full-text search`
- **role:** (en) Full-text or structured search index over product content. / (fr) Index de recherche plein texte ou structurée sur le contenu produit.
- **notes** (known gaps):
  - (en) Index lag vs primary store causes stale results unless specified.
  - (fr) Le retard d’index vs store primaire cause des résultats périmés sauf spécification.
  - (en) Relevance tuning is ongoing product work, not a one-time place.
  - (fr) Le réglage de pertinence est un travail produit continu, pas un placement unique.
- **responsibilities:**
  - (en) Full-text search and relevance ranking over documents
  - (fr) Recherche plein texte et pertinence sur des documents
  - (en) Index content for keyword and filter queries
  - (fr) Indexer le contenu pour mots-clés et filtres
- **depends_on:** `objects`, `sql`, `nosql`
- **when_to_use:** (en) Users search text, catalogs, or logs by keywords / (fr) Les utilisateurs cherchent texte, catalogues ou logs par mots-clés
- **when_not_to_use:** (en) Exact ID lookups only; no text search UX / (fr) Seulement des lookups par ID ; pas d’UX recherche texte
- **status:** filled — role + notes LOCKED

### `vector`

- **category:** Data
- **icon:** `hub`
- **scope:** `product`
- **service_tech:** `AI Search`, `AlloyDB pgvector`, `OpenSearch`, `Qdrant`, `S3 Vectors alternative`, `Vector Search`, `hybrid + semantic`, `pgvector`
- **capability_tech:** `ANN`, `Hybrid search`
- **capabilities:** `vector-search`, `full-text` → `Vector search`, `Full-text search`
- **role:** (en) Stores embeddings for similarity search in RAG and recommendations. / (fr) Stocke des embeddings pour recherche de similarité (RAG, reco).
- **notes** (known gaps):
  - (en) Embedding model version changes invalidate or drift the index.
  - (fr) Changer de modèle d’embedding invalide ou fait dériver l’index.
  - (en) Metadata filters and tenancy isolation must be designed with the index.
  - (fr) Filtres métadonnées et isolation tenancy doivent être conçus avec l’index.
- **responsibilities:**
  - (en) Store embeddings and retrieve by similarity
  - (fr) Stocker des embeddings et retrouver par similarité
  - (en) Power semantic search and RAG retrieval
  - (fr) Alimenter recherche sémantique et retrieval RAG
- **depends_on:** `embeddings`, `objects`
- **when_to_use:** (en) You need “find similar meaning”, not only keywords / (fr) Tu as besoin du “sens proche”, pas seulement des mots-clés
- **when_not_to_use:** (en) No ML retrieval; classic CRUD and keyword search suffice / (fr) Pas de retrieval ML ; CRUD et mots-clés suffisent
- **status:** filled — role + notes LOCKED

## Messages & events

### `queue`

- **category:** Messages & events
- **icon:** `box`
- **scope:** `product`
- **service_tech:** `FIFO optional`, `NATS`, `Pub/Sub`, `RabbitMQ`, `SQS`, `Service Bus`
- **capability_tech:** `Queue`, `DLQ`
- **capabilities:** `queue`, `dlq` → `Queue`, `Dead-letter queue`
- **role:** (en) Buffers work between producers and consumers with at-least-once delivery. / (fr) Tamponne le travail entre producteurs et consommateurs (au moins une fois).
- **notes** (known gaps):
  - (en) Poison messages and DLQ ownership are common underspecified gaps.
  - (fr) Messages poison et ownership de DLQ sont des trous souvent sous-spécifiés.
  - (en) Ordering guarantees vary by product — do not assume FIFO.
  - (fr) Les garanties d’ordre varient selon le produit — ne pas assumer FIFO.
- **responsibilities:**
  - (en) Hold work between a producer and a consumer
  - (fr) Garder le travail entre un producteur et un consommateur
  - (en) Decouple slow work from the interactive request
  - (fr) Découpler le travail lent de la requête interactive
- **depends_on:** `functions`, `containers`, `jobs`
- **when_to_use:** (en) Something can wait; you need retries and buffering / (fr) Quelque chose peut attendre ; il faut retries et tampon
- **when_not_to_use:** (en) Every step must finish inside the same synchronous call / (fr) Chaque étape doit finir dans le même appel synchrone
- **status:** filled — role + notes LOCKED

### `pubsub`

- **category:** Messages & events
- **icon:** `bell`
- **scope:** `product`
- **service_tech:** `Event Grid`, `EventBridge`, `Eventarc`, `NATS`, `Pub/Sub`
- **capability_tech:** `Events`, `DLQ`, `Event bus`, `Rules`
- **capabilities:** `event-bus`, `dlq` → `Event bus`, `Dead-letter queue`
- **role:** (en) Fan-out event bus so many subscribers react to the same facts. / (fr) Bus d’événements fan-out pour que plusieurs abonnés réagissent aux mêmes faits.
- **notes** (known gaps):
  - (en) Schema evolution and consumer lag need an explicit contract.
  - (fr) Évolution de schéma et lag consommateur demandent un contrat explicite.
  - (en) Exactly-once is rare — design for idempotent handlers.
  - (fr) Exactly-once est rare — concevoir des handlers idempotents.
- **responsibilities:**
  - (en) Broadcast events to many subscribers
  - (fr) Diffuser des événements à plusieurs abonnés
  - (en) Decouple producers from who reacts
  - (fr) Découpler les producteurs de ceux qui réagissent
- **depends_on:** `functions`, `containers`, `stream`
- **when_to_use:** (en) Many services must react to the same fact / (fr) Plusieurs services doivent réagir au même fait
- **when_not_to_use:** (en) Exactly one consumer must process each message (use queue) / (fr) Exactement un consommateur doit traiter chaque message (file)
- **status:** filled — role + notes LOCKED

### `stream`

- **category:** Messages & events
- **icon:** `chart`
- **scope:** `product`
- **service_tech:** `Event Hubs`, `Kafka`, `Kafka API`, `Kinesis`, `MSK alternative`, `Pub/Sub`, `Redpanda`
- **capability_tech:** `Log`, `Partitions`
- **capabilities:** `event-log` → `Event log / stream`
- **role:** (en) Durable ordered log of events for replay and stream consumers. / (fr) Journal d’événements ordonné et durable pour replay et consumers.
- **notes** (known gaps):
  - (en) Retention, partition keys, and replay strategy are open until chosen.
  - (fr) Rétention, clés de partition et stratégie de replay ouverts jusqu’au choix.
  - (en) Operational cost rises quickly with volume and fan-out.
  - (fr) Le coût ops monte vite avec le volume et le fan-out.
- **responsibilities:**
  - (en) Ingest ordered high-volume event streams
  - (fr) Ingérer des flux d’événements ordonnés à fort volume
  - (en) Retain events for replay and multiple readers
  - (fr) Retenir les événements pour replay et lecteurs multiples
- **depends_on:** `streamProcessing`, `objects`
- **when_to_use:** (en) Continuous high throughput, ordering, or replay matters / (fr) Débit continu élevé, ordre ou replay comptent
- **when_not_to_use:** (en) Occasional async jobs fit a simple queue / (fr) Des jobs async occasionnels tiennent dans une simple file
- **status:** filled — role + notes LOCKED

### `streamProcessing`

- **category:** Messages & events
- **icon:** `cog`
- **scope:** `product`
- **service_tech:** `Beam`, `Dataflow`, `Flink`, `Redpanda Connect`, `Stream Analytics`
- **capability_tech:** `Windowing`, `Aggregation`
- **capabilities:** `stream-processing` → `Stream processing`
- **role:** (en) Transforms or aggregates event streams in near real time. / (fr) Transforme ou agrège des flux d’événements en quasi temps réel.
- **notes** (known gaps):
  - (en) Watermarks, late data, and state checkpoints are the hard parts.
  - (fr) Watermarks, données tardives et checkpoints d’état sont le dur.
  - (en) Easy to duplicate business logic already in services.
  - (fr) Facile de dupliquer la logique métier déjà dans les services.
- **responsibilities:**
  - (en) Transform/aggregate streams in near real time
  - (fr) Transformer/agréger des flux en quasi temps réel
  - (en) Emit derived events or write sinks continuously
  - (fr) Émettre des événements dérivés ou écrire des sinks en continu
- **depends_on:** `stream`, `sql`, `warehouse`
- **when_to_use:** (en) You enrich or aggregate live events as they arrive / (fr) Tu enrichis ou agrèges des événements live à l’arrivée
- **when_not_to_use:** (en) Nightly batch on files is enough / (fr) Un batch nocturne sur fichiers suffit
- **status:** filled — role + notes LOCKED

### `schemaRegistry`

- **category:** Messages & events
- **icon:** `layers`
- **scope:** `product`
- **service_tech:** `Apicurio`, `Avro`, `Pub/Sub schemas`, `Schema Registry`
- **capability_tech:** `Avro`, `JSON Schema`
- **capabilities:** `schema` → `Schema contract`
- **role:** (en) Holds shared event/API schemas and compatibility rules. / (fr) Détient les schémas d’événements/API partagés et les règles de compatibilité.
- **notes** (known gaps):
  - (en) Without enforced compatibility checks, the registry becomes documentation theater.
  - (fr) Sans contrôles de compatibilité imposés, le registry devient du théâtre documentaire.
  - (en) Ownership of schema changes across teams is a social gap.
  - (fr) L’ownership des changements de schéma entre équipes est un trou social.
- **responsibilities:**
  - (en) Version event/message schemas centrally
  - (fr) Versionner centralement les schémas d’événements/messages
  - (en) Prevent incompatible producers/consumers
  - (fr) Éviter producteurs/consommateurs incompatibles
- **depends_on:** `stream`, `pubsub`, `queue`
- **when_to_use:** (en) Many teams share event contracts across services / (fr) Plusieurs équipes partagent des contrats d’événements
- **when_not_to_use:** (en) One producer and one consumer own the payload forever / (fr) Un producteur et un consommateur possèdent le payload pour toujours
- **status:** filled — role + notes LOCKED

## AI & ops

### `embeddings`

- **category:** AI & ops
- **icon:** `ai`
- **scope:** `product`
- **service_tech:** `Agent Platform`, `BGE / E5`, `Bedrock`, `Foundry`, `TEI`
- **capability_tech:** `Embedding model`
- **capabilities:** `embedding` → `Embedding model`
- **role:** (en) Turns text or media into vectors for retrieval and similarity. / (fr) Transforme texte ou média en vecteurs pour retrieval et similarité.
- **notes** (known gaps):
  - (en) Model and chunking choices dominate quality — brick alone is incomplete.
  - (fr) Choix de modèle et de découpage dominent la qualité — la brique seule est incomplète.
  - (en) Cost and rate limits on embedding APIs are operational gaps.
  - (fr) Coût et rate limits des API d’embedding sont des trous opérationnels.
- **responsibilities:**
  - (en) Turn text or other inputs into vectors
  - (fr) Transformer texte ou autres entrées en vecteurs
  - (en) Feed vector search and RAG pipelines
  - (fr) Alimenter recherche vectorielle et pipelines RAG
- **depends_on:** `llm`, `vector`, `objects`
- **when_to_use:** (en) You build semantic search or RAG over a corpus / (fr) Tu construis recherche sémantique ou RAG sur un corpus
- **when_not_to_use:** (en) No similarity search or generative retrieval / (fr) Pas de similarité ni de retrieval génératif
- **status:** filled — role + notes LOCKED

### `llm`

- **category:** AI & ops
- **icon:** `ai`
- **scope:** `product`
- **service_tech:** `Agent Platform`, `Bedrock`, `Foundry`, `open-weights model`, `vLLM`
- **capability_tech:** `LLM`
- **capabilities:** `llm` → `LLM`
- **role:** (en) Generates or reasons over language for product features. / (fr) Génère ou raisonne sur du langage pour des fonctionnalités produit.
- **notes** (known gaps):
  - (en) Hallucinations, prompt injection, and eval harnesses are open until designed.
  - (fr) Hallucinations, injection de prompt et harness d’eval ouverts jusqu’au design.
  - (en) Vendor lock-in and token cost need an explicit posture.
  - (fr) Vendor lock-in et coût tokens demandent une posture explicite.
- **responsibilities:**
  - (en) Generate or reason over language with a model API
  - (fr) Générer ou raisonner en langage via une API modèle
  - (en) Power assistants, summarization, and extraction
  - (fr) Alimenter assistants, résumé et extraction
- **depends_on:** `guardrails`, `secrets`
- **when_to_use:** (en) You need generative language capabilities in the product / (fr) Tu as besoin de capacités de langage génératif dans le produit
- **when_not_to_use:** (en) Deterministic rules and forms cover every case / (fr) Règles déterministes et formulaires couvrent tous les cas
- **status:** filled — role + notes LOCKED

### `rerank`

- **category:** AI & ops
- **icon:** `layers`
- **scope:** `product`
- **service_tech:** `AI Search`, `Agent Platform`, `Bedrock`, `TEI`, `cross-encoder`
- **capability_tech:** `Cross-encoder`
- **capabilities:** `rerank` → `Rerank`
- **role:** (en) Reorders retrieval candidates so the best context reaches the LLM. / (fr) Réordonne les candidats de retrieval pour que le meilleur contexte atteigne le LLM.
- **notes** (known gaps):
  - (en) Adds latency and cost; measure lift vs plain retrieval.
  - (fr) Ajoute latence et coût ; mesurer le gain vs retrieval simple.
  - (en) Training or choosing a reranker is often deferred as a known gap.
  - (fr) Entraîner ou choisir un reranker est souvent reporté comme trou connu.
- **responsibilities:**
  - (en) Reorder retrieved candidates by relevance to a query
  - (fr) Réordonner les candidats récupérés selon la pertinence
  - (en) Improve RAG/search quality after a first retrieval
  - (fr) Améliorer la qualité RAG/search après un premier retrieval
- **depends_on:** `search`, `vector`, `llm`
- **when_to_use:** (en) First-pass retrieval returns too much noise / (fr) Le premier retrieval renvoie trop de bruit
- **when_not_to_use:** (en) A single keyword or vector hit is always enough / (fr) Un seul hit mot-clé ou vectoriel suffit toujours
- **status:** filled — role + notes LOCKED

### `guardrails`

- **category:** AI & ops
- **icon:** `shield`
- **scope:** `product`
- **service_tech:** `Agent Platform`, `Content Safety`, `Guardrails`, `Llama Guard`, `Presidio`
- **capability_tech:** `Content safety`, `PII detection`
- **capabilities:** `content-safety`, `pii` → `Content safety`, `PII detection`
- **role:** (en) Filters prompts and outputs for safety, PII, and policy. / (fr) Filtre prompts et sorties pour sûreté, PII et politique.
- **notes** (known gaps):
  - (en) Rules drift; false blocks hurt UX — need monitoring and allowlists.
  - (fr) Les règles dérivent ; les faux blocages blessent l’UX — monitoring et allowlists.
  - (en) Not a full security boundary for authz.
  - (fr) Pas une frontière de sécurité complète pour l’authz.
- **responsibilities:**
  - (en) Filter unsafe or policy-breaking model inputs/outputs
  - (fr) Filtrer entrées/sorties modèle dangereuses ou hors politique
  - (en) Reduce prompt-injection and toxic content risk
  - (fr) Réduire injection de prompts et contenu toxique
- **depends_on:** `llm`
- **when_to_use:** (en) User-facing generative AI needs safety controls / (fr) Une IA générative face utilisateur demande des contrôles
- **when_not_to_use:** (en) No LLM; only deterministic backend logic / (fr) Pas de LLM ; seulement de la logique déterministe
- **status:** filled — role + notes LOCKED

### `ocr`

- **category:** AI & ops
- **icon:** `scan`
- **scope:** `product`
- **service_tech:** `Document AI`, `Document Intelligence`, `Tesseract`, `Textract`, `Tika`, `docling`
- **capability_tech:** `OCR`, `Layout`
- **capabilities:** `ocr` → `OCR`
- **role:** (en) Extracts text from images and scanned documents. / (fr) Extrait le texte d’images et de documents scannés.
- **notes** (known gaps):
  - (en) Quality varies by language, layout, and scan quality.
  - (fr) La qualité varie selon langue, mise en page et qualité de scan.
  - (en) PII in documents needs retention and access policy.
  - (fr) La PII dans les documents demande rétention et politique d’accès.
- **responsibilities:**
  - (en) Extract text from images and PDFs
  - (fr) Extraire le texte d’images et de PDF
  - (en) Feed downstream search, RAG, or workflows
  - (fr) Alimenter search, RAG ou workflows en aval
- **depends_on:** `objects`, `queue`
- **when_to_use:** (en) Documents arrive as scans or image PDFs / (fr) Les documents arrivent en scans ou PDF image
- **when_not_to_use:** (en) All inputs are already clean digital text / (fr) Toutes les entrées sont déjà du texte numérique propre
- **status:** filled — role + notes LOCKED

### `secrets`

- **category:** AI & ops
- **icon:** `key`
- **scope:** `platform`
- **service_tech:** `Key Vault`, `OpenBao`, `Secret Manager`, `Secrets Manager`
- **capability_tech:** `Secrets`
- **capabilities:** `secrets` → `Secrets`
- **role:** (en) Stores and delivers credentials and keys to runtimes safely. / (fr) Stocke et délivre identifiants et clés aux runtimes en sécurité.
- **notes** (known gaps):
  - (en) Rotation and least-privilege grants are usually the unfinished part.
  - (fr) Rotation et grants least-privilege sont souvent la partie inachevée.
  - (en) Apps still hard-code secrets until this brick is wired everywhere.
  - (fr) Les apps hardcodent encore des secrets tant que cette brique n’est pas branchée partout.
- **responsibilities:**
  - (en) Store API keys and credentials outside the repo
  - (fr) Stocker clés API et credentials hors du dépôt
  - (en) Inject secrets into runtimes at deploy/runtime
  - (fr) Injecter les secrets dans les runtimes au deploy/runtime
- **depends_on:** `none`
- **when_to_use:** (en) Any service talks to a third party or database with credentials / (fr) Un service parle à un tiers ou une base avec des credentials
- **when_not_to_use:** (en) Truly secretless public static content only / (fr) Vraiment sans secret : contenu statique public uniquement
- **status:** filled — role + notes LOCKED

### `config`

- **category:** AI & ops
- **icon:** `flag`
- **scope:** `platform`
- **service_tech:** `App Configuration`, `Consul`, `Key Vault`, `OpenBao`, `SSM`, `Secret Manager`, `Secrets Manager`
- **capability_tech:** `Secrets`, `Config`
- **capabilities:** `config`, `secrets` → `Config`, `Secrets`
- **role:** (en) Centralizes non-secret configuration for services and feature flags. / (fr) Centralise la configuration non secrète des services et feature flags.
- **notes** (known gaps):
  - (en) Config vs secrets boundary is often blurred in practice.
  - (fr) La frontière config vs secrets est souvent floue en pratique.
  - (en) Dynamic reload vs restart semantics need an explicit choice.
  - (fr) Reload dynamique vs restart demande un choix explicite.
- **responsibilities:**
  - (en) Centralize non-secret app settings by environment
  - (fr) Centraliser les settings non secrets par environnement
  - (en) Change flags/settings without rebuilding images when possible
  - (fr) Changer flags/settings sans rebuild d’image quand possible
- **depends_on:** `secrets`
- **when_to_use:** (en) Many services share environment-specific settings / (fr) Plusieurs services partagent des settings par environnement
- **when_not_to_use:** (en) One hard-coded config file for a tiny prototype / (fr) Un seul fichier config en dur pour un mini prototype
- **status:** filled — role + notes LOCKED

### `observability`

- **category:** AI & ops
- **icon:** `chart`
- **scope:** `platform`
- **service_tech:** `App Insights`, `Cloud Logging`, `Cloud Monitoring`, `CloudWatch`, `Grafana`, `Log Analytics`, `Loki`, `Prometheus`
- **capability_tech:** `Logs`, `Metrics`, `Alerts`
- **capabilities:** `logs`, `metrics`, `alerts` → `Logs`, `Metrics`, `Alerts`
- **role:** (en) Collects logs, metrics, and alerts so operators see system health. / (fr) Collecte logs, métriques et alertes pour que les ops voient la santé système.
- **notes** (known gaps):
  - (en) Without SLOs and alert routing, dashboards become noise.
  - (fr) Sans SLO et routage d’alertes, les dashboards deviennent du bruit.
  - (en) Cardinality explosions in metrics are a common cost gap.
  - (fr) Les explosions de cardinalité métriques sont un trou de coût courant.
- **responsibilities:**
  - (en) Collect logs and metrics for health and debugging
  - (fr) Collecter logs et métriques pour santé et debug
  - (en) Alert when SLOs or error rates break
  - (fr) Alerter quand les SLO ou taux d’erreur cassent
- **depends_on:** `none`
- **when_to_use:** (en) You run production software you must operate / (fr) Tu fais tourner du logiciel en prod que tu dois opérer
- **when_not_to_use:** (en) Throwaway local experiments with no operators / (fr) Expériences locales jetables sans opérateurs
- **status:** filled — role + notes LOCKED

### `tracing`

- **category:** AI & ops
- **icon:** `eye`
- **scope:** `platform`
- **service_tech:** `App Insights`, `Cloud Trace`, `OpenTelemetry`, `Tempo`, `X-Ray`
- **capability_tech:** `OpenTelemetry`, `Metrics`, `Traces`
- **capabilities:** `traces`, `metrics` → `Traces`, `Metrics`
- **role:** (en) Follows a request across services to find latency and failures. / (fr) Suit une requête à travers les services pour trouver latence et pannes.
- **notes** (known gaps):
  - (en) Sampling and PII in spans must be decided or traces hurt privacy/cost.
  - (fr) Sampling et PII dans les spans à décider sinon traces coûtent privacy/coût.
  - (en) Only useful if every hop propagates context.
  - (fr) Utile seulement si chaque hop propage le contexte.
- **responsibilities:**
  - (en) Follow a request across services with distributed traces
  - (fr) Suivre une requête entre services avec des traces distribuées
  - (en) Find latency bottlenecks in multi-hop calls
  - (fr) Trouver les goulots de latence dans les appels multi-sauts
- **depends_on:** `observability`
- **when_to_use:** (en) Many services participate in one user request / (fr) Plusieurs services participent à une requête utilisateur
- **when_not_to_use:** (en) A single process handles every request end-to-end / (fr) Un seul process gère chaque requête de bout en bout
- **status:** filled — role + notes LOCKED

### `backup`

- **category:** AI & ops
- **icon:** `cloudup`
- **scope:** `platform`
- **service_tech:** `AWS Backup`, `Azure Backup`, `Backup and DR`, `PITR`, `pgBackRest`, `restic`
- **capability_tech:** `Snapshots`, `PITR`
- **capabilities:** `backup` → `Backup / PITR`
- **role:** (en) Copies and restores durable data for disaster recovery. / (fr) Copie et restaure les données durables pour la reprise après sinistre.
- **notes** (known gaps):
  - (en) Untested restores are a known gap — schedule restore drills.
  - (fr) Restores non testés = trou connu — planifier des drills de restore.
  - (en) RPO/RTO targets are product decisions not implied by the brick.
  - (fr) Cibles RPO/RTO sont des décisions produit non implicites à la brique.
- **responsibilities:**
  - (en) Take recoverable copies of stateful data
  - (fr) Prendre des copies récupérables des données à état
  - (en) Support restore and retention policies
  - (fr) Supporter restore et politiques de rétention
- **depends_on:** `sql`, `nosql`, `objects`
- **when_to_use:** (en) Data loss would hurt customers or compliance / (fr) Une perte de données blesserait clients ou conformité
- **when_not_to_use:** (en) Ephemeral caches and regenerable derived data only / (fr) Seulement caches éphémères et dérivés régénérables
- **status:** filled — role + notes LOCKED

### `registry`

- **category:** AI & ops
- **icon:** `docker`
- **scope:** `platform`
- **service_tech:** `ACR`, `Artifact Registry`, `ECR`, `Harbor`, `Trivy`
- **capability_tech:** `OCI`, `Scanning`
- **capabilities:** `oci`, `scanning` → `OCI registry`, `Image scanning`
- **role:** (en) Stores container (or package) images for deployable artifacts. / (fr) Stocke les images conteneur (ou packages) pour artefacts déployables.
- **notes** (known gaps):
  - (en) Image retention, scanning, and promotion between envs are often missing.
  - (fr) Rétention d’images, scan et promotion entre envs souvent absents.
  - (en) Public vs private pull access is a security gap until locked.
  - (fr) Accès pull public vs privé est un trou sécu tant qu’il n’est pas figé.
- **responsibilities:**
  - (en) Store versioned container (or artifact) images
  - (fr) Stocker des images de conteneurs (ou artefacts) versionnées
  - (en) Feed deploy pipelines with immutable artifacts
  - (fr) Alimenter les pipelines avec des artefacts immuables
- **depends_on:** `cicd`
- **when_to_use:** (en) You deploy containers or versioned build artifacts / (fr) Tu déploies des conteneurs ou artefacts de build versionnés
- **when_not_to_use:** (en) Only managed functions with no custom images / (fr) Seulement des fonctions managées sans images custom
- **status:** filled — role + notes LOCKED

### `email`

- **category:** AI & ops
- **icon:** `mail`
- **scope:** `vendor`
- **service_tech:** `ACS Email`, `Postal`, `SES`, `SendGrid`
- **capability_tech:** `SMTP`, `Templates`, `Email`, `Push`, `Webhook`
- **capabilities:** `email` → `Email`
- **role:** (en) Sends transactional email (verify, reset, receipts) to users. / (fr) Envoie des emails transactionnels (vérif, reset, reçus) aux utilisateurs.
- **notes** (known gaps):
  - (en) Deliverability, templates, and bounce handling are usual unfinished work.
  - (fr) Délivrabilité, templates et gestion des bounces sont du travail souvent inachevé.
  - (en) Often a vendor; self-hosted mail has heavy ops cost.
  - (fr) Souvent un tiers ; le mail self-hosted a un lourd coût ops.
- **responsibilities:**
  - (en) Send transactional email (signup, reset, receipts)
  - (fr) Envoyer de l’email transactionnel (inscription, reset, reçus)
  - (en) Own deliverability concerns for outbound mail
  - (fr) Assumer la délivrabilité du mail sortant
- **depends_on:** `secrets`
- **when_to_use:** (en) The product must email users reliably / (fr) Le produit doit emailer les users de façon fiable
- **when_not_to_use:** (en) In-app notifications only; no email channel / (fr) Seulement des notifs in-app ; pas de canal email
- **status:** filled — role + notes LOCKED

### `cicd`

- **category:** AI & ops
- **icon:** `git`
- **scope:** `platform`
- **service_tech:** `Ansible`, `Bicep`, `CDK`, `Cloud Build`, `Forgejo Actions`, `GitHub Actions`, `Terraform`
- **capability_tech:** `CI`, `IaC`, `Migrations`
- **capabilities:** `ci`, `iac` → `CI`, `Infrastructure as code`
- **role:** (en) Builds, tests, and deploys changes through an automated pipeline. / (fr) Build, teste et déploie les changements via un pipeline automatisé.
- **notes** (known gaps):
  - (en) Env promotion, secrets in CI, and rollback path are common gaps.
  - (fr) Promotion d’env, secrets dans la CI et chemin de rollback sont des trous courants.
  - (en) Pipeline as the only gate still needs human ownership of failures.
  - (fr) Le pipeline comme seul gate demande encore un ownership humain des échecs.
- **responsibilities:**
  - (en) Build, test, and deploy on every change
  - (fr) Builder, tester et déployer à chaque changement
  - (en) Make releases repeatable from day one
  - (fr) Rendre les releases reproductibles dès le premier jour
- **depends_on:** `registry`, `secrets`
- **when_to_use:** (en) More than one person ships code to an environment / (fr) Plus d’une personne livre du code vers un environnement
- **when_not_to_use:** (en) Manual copy-paste deploy for a weekend prototype / (fr) Deploy manuel copier-coller pour un proto weekend
- **status:** filled — role + notes LOCKED

### `gitops`

- **category:** AI & ops
- **icon:** `cloudup`
- **scope:** `platform`
- **service_tech:** `Argo CD`, `Cloud Build`, `Forgejo Actions`, `GitHub Actions`
- **capability_tech:** `CI`, `GitOps`
- **capabilities:** `gitops`, `ci` → `GitOps`, `CI`
- **role:** (en) Keeps cluster desired state in git and reconciles toward it. / (fr) Garde l’état désiré du cluster dans git et réconcilie vers lui.
- **notes** (known gaps):
  - (en) Drift detection and emergency break-glass must be designed.
  - (fr) Détection de drift et break-glass d’urgence doivent être conçus.
  - (en) Useless without kubernetes (or similar) and a real git source of truth.
  - (fr) Inutile sans kubernetes (ou proche) et une vraie source de vérité git.
- **responsibilities:**
  - (en) Declare desired infra/app state in git
  - (fr) Déclarer l’état désiré infra/app dans git
  - (en) Reconcile clusters toward git as source of truth
  - (fr) Réconcilier les clusters vers git comme source de vérité
- **depends_on:** `cicd`, `kubernetes`
- **when_to_use:** (en) Kubernetes (or similar) fleets need audited desired state / (fr) Des flottes Kubernetes (ou proches) demandent un état désiré audité
- **when_not_to_use:** (en) No cluster; simple PaaS push deploys / (fr) Pas de cluster ; simples deploys PaaS push
- **status:** filled — role + notes LOCKED

### `audit`

- **category:** AI & ops
- **icon:** `file`
- **scope:** `platform`
- **service_tech:** `BigQuery`, `Cloud Logging`, `CloudWatch Logs`, `Log Analytics`, `Loki`, `PostgreSQL`, `S3`
- **capability_tech:** `Append-only`
- **capabilities:** `audit-log` → `Audit log`
- **role:** (en) Records who did what and when for security and compliance evidence. / (fr) Enregistre qui a fait quoi et quand pour preuves sécu et conformité.
- **notes** (known gaps):
  - (en) Retention, immutability, and who can query audits are policy gaps.
  - (fr) Rétention, immutabilité et qui peut requêter les audits sont des trous de politique.
  - (en) App events must be instrumented — the brick alone does not capture them.
  - (fr) Les événements app doivent être instrumentés — la brique seule ne les capture pas.
- **responsibilities:**
  - (en) Record who did what, when, for security and compliance
  - (fr) Enregistrer qui a fait quoi, quand, pour sécurité et conformité
  - (en) Keep tamper-resistant operational history
  - (fr) Garder un historique opérationnel difficile à altérer
- **depends_on:** `observability`, `objects`, `sql`
- **when_to_use:** (en) Regulated actions or admin powers need evidence / (fr) Actions régulées ou pouvoirs admin demandent des preuves
- **when_not_to_use:** (en) No sensitive actions and no compliance need / (fr) Pas d’actions sensibles ni besoin de conformité
- **status:** filled — role + notes LOCKED

