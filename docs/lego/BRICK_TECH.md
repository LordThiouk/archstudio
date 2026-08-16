# Brick ↔ technology crosswalk — 2026-08-15

Links each `ServiceRole` (catalog brick) to:

- **service_tech** — `tech` tags on cloud cells in `src/lib/templates/services.ts` (product-oriented).
- **capability_tech** — `tech[]` on template components that call `cloudOf(role)` (capability-oriented; with occurrence counts).

Also injected into [CATALOG.md](./CATALOG.md) as `service_tech` / `capability_tech` fields.
Derived inventory of raw labels. **Locked** capability ids live in [CAPABILITIES.md](./CAPABILITIES.md).

| Role | Category | service_tech | capability_tech (templates) |
|------|----------|--------------|-----------------------------|
| `functions` | Compute | `Azure Functions`, `Cloud Run functions`, `Flex Consumption`, `Knative`, `Kubernetes`, `Lambda` | `Functions`×1, `Worker`×1 |
| `containers` | Compute | `Cloud Run`, `Container Apps`, `Docker`, `ECS`, `Fargate`, `Nomad` | `Container`×2, `HTTP API`×1, `SSE`×1, `Runtime`×1, `Framework`×1, `Queue consumer`×1, `Consumer`×1 |
| `kubernetes` | Compute | `AKS`, `EKS`, `GKE`, `Talos Linux`, `k3s` | `Kubernetes`×1 |
| `apiGateway` | Edge & identity | `API Gateway`, `APIM`, `Kong`, `Traefik` | `HTTP API`×2, `JWT`×1, `WAF`×1 |
| `cdn` | Edge & identity | `Cloud CDN`, `CloudFront`, `Front Door`, `Nginx`, `Varnish` | `CDN`×2, `TLS`×1, `WAF`×1 |
| `waf` | Edge & identity | `AWS WAF`, `Azure WAF`, `Cloud Armor`, `Coraza`, `OWASP CRS` | — |
| `loadBalancer` | Edge & identity | `ACM`, `ALB`, `App Gateway`, `GCLB`, `HAProxy`, `Let's Encrypt` | `TLS`×1, `Health checks`×1 |
| `staticHosting` | Edge & identity | `Caddy`, `CloudFront`, `Firebase Hosting`, `S3`, `Static Web Apps` | `SPA`×2, `TypeScript`×2 |
| `identity` | Edge & identity | `Cognito`, `Entra External ID`, `Firebase Auth`, `Identity Platform`, `Keycloak`, `OIDC` | `OIDC`×2, `JWT`×1, `SAML`×1, `SCIM`×1 |
| `sql` | Data | `Aurora`, `Cloud SQL`, `Flexible Server`, `Patroni`, `PostgreSQL` | `PostgreSQL`×2, `Replication`×1, `RLS`×1 |
| `nosql` | Data | `Cosmos DB`, `DynamoDB`, `Firestore`, `MongoDB` | `OLTP`×1, `Document store`×1, `Key-value`×1, `TTL`×1 |
| `cache` | Data | `ElastiCache`, `Managed Redis`, `Memorystore`, `Redis`, `Redis protocol`, `Valkey` | `Key-value`×4 |
| `objects` | Data | `Blob Storage`, `GCS`, `MinIO`, `S3`, `S3 API` | `Object storage`×4, `Append-only`×1 |
| `queue` | Messages & events | `FIFO optional`, `NATS`, `Pub/Sub`, `RabbitMQ`, `SQS`, `Service Bus` | `Queue`×2, `DLQ`×2 |
| `pubsub` | Messages & events | `Event Grid`, `EventBridge`, `Eventarc`, `NATS`, `Pub/Sub` | `Events`×2, `DLQ`×2, `Event bus`×1, `Rules`×1 |
| `stream` | Messages & events | `Event Hubs`, `Kafka`, `Kafka API`, `Kinesis`, `MSK alternative`, `Pub/Sub`, `Redpanda` | `Log`×1, `Partitions`×1 |
| `streamProcessing` | Messages & events | `Beam`, `Dataflow`, `Flink`, `Redpanda Connect`, `Stream Analytics` | `Windowing`×1, `Aggregation`×1 |
| `schemaRegistry` | Messages & events | `Apicurio`, `Avro`, `Pub/Sub schemas`, `Schema Registry` | `Avro`×1, `JSON Schema`×1 |
| `orchestration` | Compute | `Durable Functions`, `Step Functions`, `Temporal`, `Workflows` | `Workflow`×3, `Compensation`×1 |
| `search` | Data | `AI Search`, `Elasticsearch`, `Meilisearch`, `OpenSearch` | `Full-text`×1 |
| `vector` | Data | `AI Search`, `AlloyDB pgvector`, `OpenSearch`, `Qdrant`, `S3 Vectors alternative`, `Vector Search`, `hybrid + semantic`, `pgvector` | `ANN`×1, `Hybrid search`×1 |
| `embeddings` | AI & ops | `Agent Platform`, `BGE / E5`, `Bedrock`, `Foundry`, `TEI` | `Embedding model`×1 |
| `llm` | AI & ops | `Agent Platform`, `Bedrock`, `Foundry`, `open-weights model`, `vLLM` | `LLM`×1 |
| `rerank` | AI & ops | `AI Search`, `Agent Platform`, `Bedrock`, `TEI`, `cross-encoder` | `Cross-encoder`×1 |
| `guardrails` | AI & ops | `Agent Platform`, `Content Safety`, `Guardrails`, `Llama Guard`, `Presidio` | `Content safety`×1, `PII detection`×1 |
| `ocr` | AI & ops | `Document AI`, `Document Intelligence`, `Tesseract`, `Textract`, `Tika`, `docling` | `OCR`×1, `Layout`×1 |
| `secrets` | AI & ops | `Key Vault`, `OpenBao`, `Secret Manager`, `Secrets Manager` | `Secrets`×1 |
| `config` | AI & ops | `App Configuration`, `Consul`, `Key Vault`, `OpenBao`, `SSM`, `Secret Manager`, `Secrets Manager` | `Secrets`×1, `Config`×1 |
| `observability` | AI & ops | `App Insights`, `Cloud Logging`, `Cloud Monitoring`, `CloudWatch`, `Grafana`, `Log Analytics`, `Loki`, `Prometheus` | `Logs`×2, `Metrics`×2, `Alerts`×1 |
| `tracing` | AI & ops | `App Insights`, `Cloud Trace`, `OpenTelemetry`, `Tempo`, `X-Ray` | `OpenTelemetry`×3, `Metrics`×2, `Traces`×1 |
| `warehouse` | Data | `BigQuery`, `ClickHouse`, `DuckDB`, `Fabric`, `Redshift`, `S3 + Athena alternative`, `Synapse` | `Columnar`×1 |
| `registry` | AI & ops | `ACR`, `Artifact Registry`, `ECR`, `Harbor`, `Trivy` | `OCI`×1, `Scanning`×1 |
| `email` | AI & ops | `ACS Email`, `Postal`, `SES`, `SendGrid` | `SMTP`×1, `Templates`×1, `Email`×1, `Push`×1, `Webhook`×1 |
| `backup` | AI & ops | `AWS Backup`, `Azure Backup`, `Backup and DR`, `PITR`, `pgBackRest`, `restic` | `Snapshots`×1, `PITR`×1 |
| `jobs` | Compute | `Cloud Run Jobs`, `Cloud Scheduler`, `Container Apps Jobs`, `ECS`, `EventBridge Scheduler`, `Nomad`, `systemd` | `Scheduler`×1 |
| `cicd` | AI & ops | `Ansible`, `Bicep`, `CDK`, `Cloud Build`, `Forgejo Actions`, `GitHub Actions`, `Terraform` | `CI`×3, `IaC`×2, `Migrations`×1 |
| `gitops` | AI & ops | `Argo CD`, `Cloud Build`, `Forgejo Actions`, `GitHub Actions` | `CI`×1, `GitOps`×1 |
| `audit` | AI & ops | `BigQuery`, `Cloud Logging`, `CloudWatch Logs`, `Log Analytics`, `Loki`, `PostgreSQL`, `S3` | `Append-only`×1 |

## Coverage

- Roles: **38**
- With ≥1 service_tech: **38**
- With ≥1 capability_tech: **37**
- No template capability_tech yet: `waf`

