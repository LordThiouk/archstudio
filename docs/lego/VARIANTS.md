# Variant catalogs by intent (LOCKED) — 2026-08-15

Full lists for step 4 of [VISION.md](./VISION.md), keyed by the **12** intents in [INTENTS.md](./INTENTS.md) (**LOCKED**).

Each row = one Lego choice after **mode** (+ scope).  
`maps_to` = [CATALOG](./CATALOG.md) brick id (`ServiceRole` or client kind `webApp` / `mobileApp`). No empty maps_to after 2026-08-15 gap pass.

**Status: LOCKED catalog** — 154 variant ids, their intent, mode, shape section (where applicable), and `maps_to` contract are frozen. Change only via ISA Decision + principal OK.

Columns: `id` · `label` · `mode` · `maps_to` · `notes`

---

## `web-app`

Mode: `client` only.

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `nextjs` | Next.js | client | `webApp` | Full-stack / App Router |
| `remix` | Remix | client | `webApp` | Client kind (not in services.ts) |
| `nuxt` | Nuxt | client | `webApp` | Vue |
| `sveltekit` | SvelteKit | client | `webApp` | Client kind (not in services.ts) |
| `spa-react` | SPA — React | client | `webApp` | Vite/CRA-style |
| `spa-vue` | SPA — Vue | client | `webApp` | Client kind (not in services.ts) |
| `spa-svelte` | SPA — Svelte | client | `webApp` | Client kind (not in services.ts) |
| `spa-angular` | SPA — Angular | client | `webApp` | Client kind (not in services.ts) |
| `astro` | Astro | client | `webApp` | Content-heavy sites |
| `admin-next` | Admin — Next.js | client | `webApp` | Same stack, admin badge |
| `admin-spa-react` | Admin — React SPA | client | `webApp` | Admin badge |

Suggested follow-up brick after place: `cdn` (static/edge).

---

## `mobile-app`

Mode: `client` only.

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `react-native` | React Native | client | `mobileApp` | Client kind (not in services.ts) |
| `flutter` | Flutter | client | `mobileApp` | Client kind (not in services.ts) |
| `swift-ios` | Native Swift (iOS) | client | `mobileApp` | Client kind (not in services.ts) |
| `kotlin-android` | Native Kotlin (Android) | client | `mobileApp` | Client kind (not in services.ts) |
| `expo` | Expo (React Native) | client | `mobileApp` | Managed RN |
| `capacitor` | Capacitor | client | `mobileApp` | Web→native shell |
| `kotlin-multiplatform` | Kotlin Multiplatform | client | `mobileApp` | Client kind (not in services.ts) |

---

## `auth`

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `firebase-auth` | Firebase Auth | baas | `identity` | maps to existing role |
| `supabase-auth` | Supabase Auth | baas | `identity` | — |
| `appwrite-auth` | Appwrite Auth | baas | `identity` | — |
| `clerk` | Clerk | baas | `identity` | — |
| `auth0` | Auth0 | cloud | identity | Also “CIAM SaaS” |
| `workos` | WorkOS | cloud | identity | |
| `cognito` | Amazon Cognito | cloud | identity | AWS |
| `identity-platform` | Google Identity Platform | cloud | identity | GCP (+ Firebase Auth related) |
| `entra-external-id` | Microsoft Entra External ID | cloud | identity | Azure |
| `keycloak` | Keycloak | selfhosted | identity | |
| `zitadel` | Zitadel | selfhosted | identity | |
| `ory-kratos` | Ory Kratos | selfhosted | identity | |
| `authentik` | Authentik | selfhosted | identity | |
| `supabase-auth-selfhost` | Supabase Auth (self-host) | selfhosted | `identity` | Optional |

---

## `api`

Split by **shape** (gateway vs compute). Mode filters hyperscaler vs self-hosted.

### Gateway shape

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `aws-api-gateway` | Amazon API Gateway | cloud | apiGateway | |
| `gcp-api-gateway` | Google API Gateway | cloud | apiGateway | |
| `azure-apim` | Azure API Management | cloud | apiGateway | |
| `traefik` | Traefik | selfhosted | apiGateway | |
| `kong` | Kong | selfhosted | apiGateway | |
| `nginx-gateway` | Nginx / Ingress | selfhosted | apiGateway | |

### Compute shape (API handlers)

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `aws-lambda` | AWS Lambda | cloud | functions | |
| `gcp-cloud-run-functions` | Cloud Run functions | cloud | functions | |
| `azure-functions` | Azure Functions | cloud | functions | |
| `aws-ecs-fargate` | ECS Fargate | cloud | containers | |
| `gcp-cloud-run` | Cloud Run | cloud | containers | |
| `azure-container-apps` | Azure Container Apps | cloud | containers | |
| `aws-eks` | Amazon EKS | cloud | kubernetes | |
| `gcp-gke` | GKE Autopilot | cloud | kubernetes | |
| `azure-aks` | Azure Kubernetes Service | cloud | kubernetes | |
| `openfaas-knative` | OpenFaaS / Knative | selfhosted | functions | |
| `docker-compose` | Docker Compose / Nomad | selfhosted | containers | |
| `k3s-talos` | k3s / Talos | selfhosted | kubernetes | |

---

## `cdn`

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `cloudfront` | Amazon CloudFront | cloud | cdn | |
| `cloud-cdn` | Google Cloud CDN | cloud | cdn | |
| `front-door` | Azure Front Door | cloud | cdn | |
| `s3-cloudfront-static` | S3 + CloudFront (static) | cloud | staticHosting | |
| `firebase-hosting` | Firebase Hosting | cloud | staticHosting | Also baas-flavoured |
| `azure-static-web-apps` | Azure Static Web Apps | cloud | staticHosting | |
| `cloudflare-cdn` | Cloudflare CDN | cloud | `cdn` | maps to existing role |
| `nginx-varnish` | Nginx / Varnish | selfhosted | cdn | |
| `caddy-nginx-static` | Caddy / Nginx static | selfhosted | staticHosting | |

---

## `workers`

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `lambda-worker` | Lambda (async / queue consumer) | cloud | functions | |
| `cloud-run-jobs` | Cloud Run Jobs | cloud | jobs | |
| `azure-container-apps-jobs` | Container Apps Jobs | cloud | jobs | |
| `ecs-scheduled` | ECS scheduled tasks | cloud | jobs | |
| `gcp-cloud-scheduler` | Cloud Scheduler + Jobs | cloud | jobs | |
| `eventbridge-scheduler` | EventBridge Scheduler | cloud | jobs | |
| `step-functions` | AWS Step Functions | cloud | orchestration | Long workflows |
| `gcp-workflows` | Google Workflows | cloud | orchestration | |
| `durable-functions` | Azure Durable Functions | cloud | orchestration | |
| `temporal` | Temporal | selfhosted | orchestration | |
| `k8s-cronjob` | Kubernetes CronJob | selfhosted | jobs | |
| `systemd-nomad` | systemd / Nomad periodic | selfhosted | jobs | |
| `docker-worker` | Docker Compose worker | selfhosted | containers | |

---

## `database`

Includes **SQL · NoSQL · cache** as variant families.

### SQL / relational

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `supabase-postgres` | Supabase (Postgres) | baas | `sql` | — |
| `neon` | Neon | baas | `sql` | — |
| `planetscale` | PlanetScale | baas | `sql` | MySQL-compatible |
| `firebase-firestore` | Cloud Firestore | baas | nosql | Listed under NoSQL too |
| `aurora-postgres` | Amazon Aurora PostgreSQL | cloud | sql | |
| `cloud-sql` | Cloud SQL / AlloyDB | cloud | sql | |
| `azure-postgres` | Azure Database for PostgreSQL | cloud | sql | |
| `postgres-patroni` | PostgreSQL (Patroni) | selfhosted | sql | |

### NoSQL / document

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `dynamodb` | Amazon DynamoDB | cloud | nosql | |
| `firestore` | Firestore | cloud | nosql | |
| `cosmosdb` | Azure Cosmos DB | cloud | nosql | |
| `mongodb` | MongoDB | selfhosted | nosql | |
| `mongodb-atlas` | MongoDB Atlas | baas | `nosql` | — |

### Cache

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `elasticache` | Amazon ElastiCache | cloud | cache | |
| `memorystore` | Memorystore | cloud | cache | |
| `azure-managed-redis` | Azure Managed Redis | cloud | cache | |
| `upstash-redis` | Upstash Redis | baas | `cache` | — |
| `valkey` | Valkey / Redis | selfhosted | cache | |

---

## `files`

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `s3` | Amazon S3 | cloud | objects | |
| `gcs` | Google Cloud Storage | cloud | objects | |
| `azure-blob` | Azure Blob Storage | cloud | objects | |
| `supabase-storage` | Supabase Storage | baas | `objects` | — |
| `firebase-storage` | Firebase Storage | baas | `objects` | — |
| `cloudflare-r2` | Cloudflare R2 | cloud | `objects` | maps to existing role |
| `minio` | MinIO | selfhosted | objects | |

---

## `search`

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `opensearch-aws` | Amazon OpenSearch Service | cloud | search | |
| `elastic-cloud` | Elastic Cloud | cloud | search | |
| `azure-ai-search` | Azure AI Search | cloud | search | Also vectors |
| `algolia` | Algolia | baas | `search` | — |
| `typesense-cloud` | Typesense Cloud | baas | `search` | — |
| `opensearch-self` | OpenSearch | selfhosted | search | |
| `meilisearch` | Meilisearch | selfhosted | search | |
| `qdrant` | Qdrant | selfhosted | vector | Vector-first |
| `pgvector` | pgvector | selfhosted | vector | |
| `vertex-vector` | Vertex / Agent Platform Vector Search | cloud | vector | |
| `opensearch-vector-aws` | OpenSearch vector engine | cloud | vector | |

---

## `messaging`

### Queue

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `sqs` | Amazon SQS | cloud | queue | |
| `pubsub-pull` | Cloud Pub/Sub (pull) | cloud | queue | |
| `service-bus` | Azure Service Bus | cloud | queue | |
| `rabbitmq` | RabbitMQ | selfhosted | queue | |
| `nats-jetstream` | NATS JetStream | selfhosted | queue | |

### Pub/sub / bus

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `eventbridge` | Amazon EventBridge | cloud | pubsub | |
| `pubsub` | Cloud Pub/Sub | cloud | pubsub | |
| `event-grid` | Azure Event Grid | cloud | pubsub | |
| `supabase-realtime` | Supabase Realtime | baas | `pubsub` | — |
| `firebase-pubsub` | Firebase / FCM-style fan-out | baas | `pubsub` | Approximate |

### Stream / log

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `kinesis` | Amazon Kinesis Data Streams | cloud | stream | |
| `msk` | Amazon MSK | cloud | stream | |
| `event-hubs` | Azure Event Hubs | cloud | stream | |
| `kafka` | Apache Kafka | selfhosted | stream | |
| `redpanda` | Redpanda | selfhosted | stream | |

---

## `llm`

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `openai` | OpenAI API | baas | `llm` | — |
| `anthropic` | Anthropic API | baas | `llm` | — |
| `bedrock` | Amazon Bedrock | cloud | llm | |
| `agent-platform` | Gemini Enterprise Agent Platform | cloud | llm | |
| `foundry` | Microsoft Foundry | cloud | llm | |
| `groq` | Groq | baas | `llm` | — |
| `mistral-api` | Mistral API | baas | `llm` | — |
| `vllm` | vLLM | selfhosted | llm | |
| `ollama` | Ollama | selfhosted | llm | |
| `tgi` | Text Generation Inference | selfhosted | llm | |

Related (advanced, not separate intents yet): embeddings / rerank / guardrails → still in [CATALOG.md](./CATALOG.md).

---

## `ops`

### Observability

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `cloudwatch` | Amazon CloudWatch | cloud | observability | |
| `gcp-ops` | Cloud Logging & Monitoring | cloud | observability | |
| `app-insights` | Application Insights | cloud | observability | |
| `xray` | AWS X-Ray | cloud | tracing | |
| `cloud-trace` | Cloud Trace | cloud | tracing | |
| `grafana-stack` | Prometheus + Grafana + Loki | selfhosted | observability | |
| `tempo-jaeger` | Tempo / Jaeger | selfhosted | tracing | |
| `datadog` | Datadog | baas | `observability` | maps to existing role |
| `sentry` | Sentry | baas | `observability` | maps to existing role |

### CI/CD & GitOps

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `github-actions-aws` | GitHub Actions + AWS CDK | cloud | cicd | |
| `cloud-build` | Cloud Build + Terraform | cloud | cicd | |
| `github-actions-bicep` | GitHub Actions + Bicep | cloud | cicd | |
| `forgejo-ansible` | Forgejo Actions + Ansible | selfhosted | cicd | |
| `argo-cd` | Argo CD | selfhosted | gitops | Also paired on cloud rows in SERVICES |
| `github-actions-argo` | GitHub Actions + Argo CD | cloud | gitops | |

### Email

| id | label | mode | maps_to | notes |
|----|-------|------|---------|-------|
| `ses` | Amazon SES | cloud | email | |
| `sendgrid` | SendGrid / Resend | cloud | email | GCP cell in SERVICES |
| `acs-email` | Azure Communication Services Email | cloud | email | |
| `postal` | Postal / SMTP relay | selfhosted | email | |
| `postmark` | Postmark | baas | `email` | maps to existing role |
| `resend` | Resend | baas | `email` | maps to existing role |

---

## Lock decisions (2026-08-15)

| Contract | Decision |
|----------|----------|
| Catalog scope | **Lock all 12 intent catalogs** — not only `auth` and `mobile-app`. |
| Identity | Variant `id`, parent intent, `mode`, and `maps_to` are locked. |
| Shapes | A variant stays in its current intent shape section (for example API gateway/compute or Ops observe/ship/mail) unless a Decision changes that contract. |
| Product gap | `webApp` / `mobileApp` and BaaS entries remain documentation-only until product types and the runtime catalog are built; this does not reopen the catalog. |
| Editorial copy | Labels and notes may be polished without a Decision only if the locked fields above do not change. |

---

## Gaps closed (2026-08-15)

| Former gap | Resolution |
|------------|------------|
| Client frameworks | New kinds `webApp`, `mobileApp` |
| BaaS auth | -> `identity` |
| BaaS DB / cache / files / search / messaging | -> matching data/message roles |
| LLM APIs | -> `llm` |
| Cloudflare CDN / R2 | -> `cdn` / `objects` |
| Datadog / Sentry | -> `observability` |
| Postmark / Resend | -> `email` |

Code follow-up later: extend `services.ts`; register client kinds in product types.

## Counts (LOCKED)

| Intent | # variants |
|--------|------------|
| web-app | 11 |
| mobile-app | 7 |
| auth | 14 |
| api | 18 |
| cdn | 9 |
| workers | 13 |
| database | 18 |
| files | 7 |
| search | 11 |
| messaging | 15 |
| llm | 10 |
| ops | 21 |
| **Total** | **154** |

---

## Status

**LOCKED** 2026-08-15 — 154 variants across 12 intents; every row has a `maps_to`. Product wiring remains backlog in [GAPS.md](./GAPS.md).
