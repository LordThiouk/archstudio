# Services catalog export — 2026-08-15

Inventory from `src/lib/templates/services.ts` (categories match the Lego brick catalog).

**38 ServiceRoles** × 4 targets (aws, gcp, azure, selfhosted).

## By category

### Edge & identity

| Role | AWS | GCP | Azure | Self-hosted |
|------|-----|-----|-------|-------------|
| `apiGateway` | API Gateway (HTTP API) · _API Gateway_ | API Gateway · _API Gateway_ | Azure API Management · _APIM_ | Traefik / Kong · _Traefik, Kong_ |
| `cdn` | Amazon CloudFront · _CloudFront_ | Cloud CDN · _Cloud CDN_ | Azure Front Door · _Front Door_ | Nginx / Varnish edge cache · _Nginx, Varnish_ |
| `waf` | AWS WAF · _AWS WAF_ | Cloud Armor · _Cloud Armor_ | Azure WAF · _Azure WAF_ | Coraza / ModSecurity · _Coraza, OWASP CRS_ |
| `loadBalancer` | Application Load Balancer · _ALB, ACM_ | Cloud Load Balancing · _GCLB_ | Azure Application Gateway · _App Gateway_ | HAProxy / Traefik · _HAProxy, Let\_ |
| `staticHosting` | S3 + CloudFront · _S3, CloudFront_ | Firebase Hosting · _Firebase Hosting_ | Azure Static Web Apps · _Static Web Apps_ | Caddy / Nginx · _Caddy_ |
| `identity` | Amazon Cognito · _Cognito_ | Identity Platform · _Identity Platform, Firebase Auth_ | Microsoft Entra External ID · _Entra External ID_ | Keycloak / Zitadel · _Keycloak, OIDC_ |

### Compute

| Role | AWS | GCP | Azure | Self-hosted |
|------|-----|-----|-------|-------------|
| `functions` | AWS Lambda · _Lambda_ | Cloud Run functions · _Cloud Run functions_ | Azure Functions · _Azure Functions, Flex Consumption_ | OpenFaaS / Knative · _Knative, Kubernetes_ |
| `containers` | ECS Fargate · _ECS, Fargate_ | Cloud Run · _Cloud Run_ | Azure Container Apps · _Container Apps_ | Docker Compose / Nomad · _Docker, Nomad_ |
| `kubernetes` | Amazon EKS · _EKS_ | GKE Autopilot · _GKE_ | Azure Kubernetes Service · _AKS_ | k3s / Talos · _k3s, Talos Linux_ |
| `orchestration` | AWS Step Functions · _Step Functions_ | Workflows · _Workflows_ | Durable Functions · _Durable Functions_ | Temporal · _Temporal_ |
| `jobs` | ECS scheduled tasks · _ECS, EventBridge Scheduler_ | Cloud Run Jobs · _Cloud Run Jobs, Cloud Scheduler_ | Container Apps Jobs · _Container Apps Jobs_ | systemd timers / Nomad periodic · _systemd, Nomad_ |

### Data

| Role | AWS | GCP | Azure | Self-hosted |
|------|-----|-----|-------|-------------|
| `sql` | Amazon Aurora PostgreSQL · _Aurora, PostgreSQL_ | Cloud SQL / AlloyDB · _Cloud SQL, PostgreSQL_ | Azure Database for PostgreSQL · _Flexible Server, PostgreSQL_ | PostgreSQL (Patroni) · _PostgreSQL, Patroni_ |
| `nosql` | Amazon DynamoDB · _DynamoDB_ | Firestore · _Firestore_ | Azure Cosmos DB · _Cosmos DB_ | MongoDB · _MongoDB_ |
| `cache` | Amazon ElastiCache · _ElastiCache, Valkey_ | Memorystore · _Memorystore, Redis_ | Azure Managed Redis · _Managed Redis_ | Valkey · _Valkey, Redis protocol_ |
| `objects` | Amazon S3 · _S3_ | Cloud Storage · _GCS_ | Azure Blob Storage · _Blob Storage_ | MinIO · _MinIO, S3 API_ |
| `search` | Amazon OpenSearch Service · _OpenSearch_ | Elastic Cloud · _Elasticsearch_ | Azure AI Search · _AI Search_ | OpenSearch / Meilisearch · _OpenSearch, Meilisearch_ |
| `vector` | OpenSearch Serverless (vector engine) · _OpenSearch, S3 Vectors alternative_ | Vector Search (Agent Platform) · _Vector Search, AlloyDB pgvector_ | Azure AI Search · _AI Search, hybrid + semantic_ | Qdrant / pgvector · _Qdrant, pgvector_ |
| `warehouse` | Amazon Redshift · _Redshift, S3 + Athena alternative_ | BigQuery · _BigQuery_ | Microsoft Fabric · _Fabric, Synapse_ | ClickHouse · _ClickHouse, DuckDB_ |

### Messages & events

| Role | AWS | GCP | Azure | Self-hosted |
|------|-----|-----|-------|-------------|
| `queue` | Amazon SQS · _SQS, FIFO optional_ | Cloud Pub/Sub (pull) · _Pub/Sub_ | Azure Service Bus · _Service Bus_ | RabbitMQ / NATS JetStream · _RabbitMQ, NATS_ |
| `pubsub` | Amazon EventBridge · _EventBridge_ | Cloud Pub/Sub · _Pub/Sub, Eventarc_ | Azure Event Grid · _Event Grid_ | NATS JetStream · _NATS_ |
| `stream` | Amazon Kinesis Data Streams · _Kinesis, MSK alternative_ | Cloud Pub/Sub · _Pub/Sub_ | Azure Event Hubs · _Event Hubs, Kafka API_ | Apache Kafka / Redpanda · _Kafka, Redpanda_ |
| `streamProcessing` | Amazon Managed Service for Apache Flink · _Flink_ | Dataflow · _Dataflow, Beam_ | Azure Stream Analytics · _Stream Analytics_ | Apache Flink / Redpanda Connect · _Flink, Redpanda Connect_ |
| `schemaRegistry` | EventBridge Schema Registry · _Schema Registry_ | Pub/Sub schemas · _Pub/Sub schemas, Avro_ | Event Hubs Schema Registry · _Schema Registry_ | Apicurio / Karapace · _Apicurio, Avro_ |

### AI & ops

| Role | AWS | GCP | Azure | Self-hosted |
|------|-----|-----|-------|-------------|
| `embeddings` | Amazon Bedrock (Titan / Cohere) · _Bedrock_ | Agent Platform Embeddings · _Agent Platform_ | Microsoft Foundry · _Foundry_ | Text Embeddings Inference · _TEI, BGE / E5_ |
| `llm` | Amazon Bedrock · _Bedrock_ | Gemini Enterprise Agent Platform · _Agent Platform_ | Microsoft Foundry · _Foundry_ | vLLM · _vLLM, open-weights model_ |
| `rerank` | Bedrock Rerank · _Bedrock_ | Agent Platform ranking API · _Agent Platform_ | Azure AI Search semantic ranker · _AI Search_ | bge-reranker (TEI) · _TEI, cross-encoder_ |
| `guardrails` | Bedrock Guardrails · _Guardrails_ | Agent Platform safety filters · _Agent Platform_ | Azure AI Content Safety · _Content Safety_ | Llama Guard + Presidio · _Llama Guard, Presidio_ |
| `ocr` | Amazon Textract · _Textract_ | Document AI · _Document AI_ | Azure AI Document Intelligence · _Document Intelligence_ | Apache Tika + Tesseract · _Tika, Tesseract, docling_ |
| `secrets` | AWS Secrets Manager · _Secrets Manager_ | Secret Manager · _Secret Manager_ | Azure Key Vault · _Key Vault_ | OpenBao / Vault · _OpenBao_ |
| `config` | Parameter Store + Secrets Manager · _SSM, Secrets Manager_ | Secret Manager + runtime config · _Secret Manager_ | App Configuration + Key Vault · _App Configuration, Key Vault_ | Consul + OpenBao · _Consul, OpenBao_ |
| `observability` | Amazon CloudWatch · _CloudWatch_ | Cloud Logging & Monitoring · _Cloud Logging, Cloud Monitoring_ | Application Insights · _App Insights, Log Analytics_ | Prometheus + Grafana + Loki · _Prometheus, Grafana, Loki_ |
| `tracing` | AWS X-Ray · _X-Ray, OpenTelemetry_ | Cloud Trace · _Cloud Trace, OpenTelemetry_ | Application Insights · _App Insights, OpenTelemetry_ | Jaeger / Tempo · _OpenTelemetry, Tempo_ |
| `registry` | Amazon ECR · _ECR_ | Artifact Registry · _Artifact Registry_ | Azure Container Registry · _ACR_ | Harbor · _Harbor, Trivy_ |
| `email` | Amazon SES · _SES_ | SendGrid / Resend · _SendGrid_ | Azure Communication Services · _ACS Email_ | Postal / SMTP relay · _Postal_ |
| `backup` | AWS Backup · _AWS Backup, PITR_ | Backup and DR Service · _Backup and DR_ | Azure Backup · _Azure Backup_ | pgBackRest + restic · _pgBackRest, restic_ |
| `cicd` | GitHub Actions + AWS CDK · _GitHub Actions, CDK_ | Cloud Build + Terraform · _Cloud Build, Terraform_ | GitHub Actions + Bicep · _GitHub Actions, Bicep_ | Forgejo Actions + Ansible · _Forgejo Actions, Ansible_ |
| `gitops` | GitHub Actions + Argo CD · _GitHub Actions, Argo CD_ | Cloud Build + Argo CD · _Cloud Build, Argo CD_ | GitHub Actions + Argo CD · _GitHub Actions, Argo CD_ | Forgejo Actions + Argo CD · _Forgejo Actions, Argo CD_ |
| `audit` | CloudWatch Logs + S3 (Object Lock) · _CloudWatch Logs, S3_ | Cloud Logging + BigQuery · _Cloud Logging, BigQuery_ | Azure Log Analytics · _Log Analytics_ | Loki + append-only PostgreSQL · _Loki, PostgreSQL_ |

## BaaS / extra providers (gap pass 2026-08-15)

Not separate columns in `services.ts` yet. They appear as **variants** in [VARIANTS.md](./VARIANTS.md) and map to the roles above:

- Auth BaaS (Firebase Auth, Supabase Auth, Clerk, ...) -> `identity`
- DB BaaS (Supabase, Neon, PlanetScale, Atlas, Upstash, ...) -> `sql` / `nosql` / `cache`
- Storage (Supabase/Firebase Storage, R2) -> `objects`
- Search SaaS (Algolia, Typesense Cloud) -> `search`
- LLM APIs (OpenAI, Anthropic, Groq, Mistral) -> `llm`
- Observability SaaS (Datadog, Sentry) -> `observability`
- Email SaaS (Postmark, Resend) -> `email`
- CDN (Cloudflare) -> `cdn`

Client frameworks are not services -- see kinds `webApp` / `mobileApp` in [CATALOG.md](./CATALOG.md).
