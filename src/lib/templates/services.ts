/* The cross-cutting service correspondence table.
 *
 * One entry per *role* ("a message queue"), one cell per target. Every template
 * pulls from here through `cloudOf()`, so a vendor rename is a one-line edit in
 * this file rather than a hunt across six templates.
 *
 * Service names verified 14 August 2026. Recent renames folded in:
 *   Google Cloud Functions      → Cloud Run functions
 *   Azure AI Foundry            → Microsoft Foundry        (Ignite 2025)
 *   Azure AD B2C                → Microsoft Entra External ID (B2C tenants close March 2026)
 *   Azure Cache for Redis       → Azure Managed Redis      (retirement announced)
 * These names move. Re-read this file once a year.
 */

import type { CloudOverride, L10n, ResolvedTarget } from './types';

export interface ServiceCell {
  name: L10n;
  tech?: string[];
  /** A caveat that belongs to the *service*, not to any one template. */
  note?: L10n;
}

export type ServiceRow = Record<ResolvedTarget, ServiceCell>;

/** The date the names above were last checked, surfaced in the generated doc. */
export const SERVICES_VERIFIED_ON = '2026-08-14';

const row = (r: ServiceRow) => r;

export const SERVICES = {
  functions: row({
    aws:        { name: 'AWS Lambda', tech: ['Lambda'] },
    gcp:        { name: 'Cloud Run functions', tech: ['Cloud Run functions'], note: { en: 'Renamed from Cloud Functions — the 1st gen product is now a Cloud Run deployment mode.', fr: 'Anciennement Cloud Functions — la 1re génération est devenue un mode de déploiement Cloud Run.' } },
    azure:      { name: 'Azure Functions', tech: ['Azure Functions', 'Flex Consumption'] },
    selfhosted: { name: 'OpenFaaS / Knative', tech: ['Knative', 'Kubernetes'], note: { en: 'Scale-to-zero on your own cluster means you still pay for the idle cluster.', fr: 'Le scale-to-zero sur ton propre cluster laisse quand même le cluster à payer au repos.' } }
  }),
  containers: row({
    aws:        { name: 'ECS Fargate', tech: ['ECS', 'Fargate'] },
    gcp:        { name: 'Cloud Run', tech: ['Cloud Run'] },
    azure:      { name: 'Azure Container Apps', tech: ['Container Apps'] },
    selfhosted: { name: 'Docker Compose / Nomad', tech: ['Docker', 'Nomad'] }
  }),
  kubernetes: row({
    aws:        { name: 'Amazon EKS', tech: ['EKS'] },
    gcp:        { name: 'GKE Autopilot', tech: ['GKE'] },
    azure:      { name: 'Azure Kubernetes Service', tech: ['AKS'] },
    selfhosted: { name: 'k3s / Talos', tech: ['k3s', 'Talos Linux'] }
  }),
  apiGateway: row({
    aws:        { name: 'API Gateway (HTTP API)', tech: ['API Gateway'] },
    gcp:        { name: 'API Gateway', tech: ['API Gateway'] },
    azure:      { name: 'Azure API Management', tech: ['APIM'] },
    selfhosted: { name: 'Traefik / Kong', tech: ['Traefik', 'Kong'] }
  }),
  cdn: row({
    aws:        { name: 'Amazon CloudFront', tech: ['CloudFront'] },
    gcp:        { name: 'Cloud CDN', tech: ['Cloud CDN'] },
    azure:      { name: 'Azure Front Door', tech: ['Front Door'] },
    selfhosted: { name: 'Nginx / Varnish edge cache', tech: ['Nginx', 'Varnish'], note: { en: 'A single-region cache is not a CDN. Below a few hundred ms of tolerated latency, buy one.', fr: 'Un cache mono-région n\'est pas un CDN. En dessous de quelques centaines de ms tolérées, achètes-en un.' } }
  }),
  waf: row({
    aws:        { name: 'AWS WAF', tech: ['AWS WAF'] },
    gcp:        { name: 'Cloud Armor', tech: ['Cloud Armor'] },
    azure:      { name: 'Azure WAF', tech: ['Azure WAF'] },
    selfhosted: { name: 'Coraza / ModSecurity', tech: ['Coraza', 'OWASP CRS'] }
  }),
  loadBalancer: row({
    aws:        { name: 'Application Load Balancer', tech: ['ALB', 'ACM'] },
    gcp:        { name: 'Cloud Load Balancing', tech: ['GCLB'] },
    azure:      { name: 'Azure Application Gateway', tech: ['App Gateway'] },
    selfhosted: { name: 'HAProxy / Traefik', tech: ['HAProxy', 'Let\'s Encrypt'] }
  }),
  staticHosting: row({
    aws:        { name: 'S3 + CloudFront', tech: ['S3', 'CloudFront'] },
    gcp:        { name: 'Firebase Hosting', tech: ['Firebase Hosting'] },
    azure:      { name: 'Azure Static Web Apps', tech: ['Static Web Apps'] },
    selfhosted: { name: 'Caddy / Nginx', tech: ['Caddy'] }
  }),
  identity: row({
    aws:        { name: 'Amazon Cognito', tech: ['Cognito'], note: { en: 'Cognito is cheap and rigid. WorkOS or Auth0 cost more and argue back less.', fr: 'Cognito est bon marché et rigide. WorkOS ou Auth0 coûtent plus cher et résistent moins.' } },
    gcp:        { name: 'Identity Platform', tech: ['Identity Platform', 'Firebase Auth'] },
    azure:      { name: 'Microsoft Entra External ID', tech: ['Entra External ID'], note: { en: 'Azure AD B2C tenants close in March 2026 — start here, not there.', fr: 'Les tenants Azure AD B2C ferment en mars 2026 — commence ici, pas là-bas.' } },
    selfhosted: { name: 'Keycloak / Zitadel', tech: ['Keycloak', 'OIDC'] }
  }),
  sql: row({
    aws:        { name: 'Amazon Aurora PostgreSQL', tech: ['Aurora', 'PostgreSQL'] },
    gcp:        { name: 'Cloud SQL / AlloyDB', tech: ['Cloud SQL', 'PostgreSQL'] },
    azure:      { name: 'Azure Database for PostgreSQL', tech: ['Flexible Server', 'PostgreSQL'] },
    selfhosted: { name: 'PostgreSQL (Patroni)', tech: ['PostgreSQL', 'Patroni'], note: { en: 'Managed failover is the single hardest thing to self-host well. Rehearse it.', fr: 'La bascule automatique est la chose la plus difficile à auto-héberger correctement. Répète-la.' } }
  }),
  nosql: row({
    aws:        { name: 'Amazon DynamoDB', tech: ['DynamoDB'] },
    gcp:        { name: 'Firestore', tech: ['Firestore'] },
    azure:      { name: 'Azure Cosmos DB', tech: ['Cosmos DB'] },
    selfhosted: { name: 'MongoDB', tech: ['MongoDB'], note: { en: 'PostgreSQL with JSONB covers most of this and is one database less to operate.', fr: 'PostgreSQL avec JSONB couvre l\'essentiel et fait une base de moins à opérer.' } }
  }),
  cache: row({
    aws:        { name: 'Amazon ElastiCache', tech: ['ElastiCache', 'Valkey'] },
    gcp:        { name: 'Memorystore', tech: ['Memorystore', 'Redis'] },
    azure:      { name: 'Azure Managed Redis', tech: ['Managed Redis'], note: { en: 'Azure Cache for Redis is on a retirement path — new work goes to Managed Redis.', fr: 'Azure Cache for Redis est en cours de retrait — le nouveau va sur Managed Redis.' } },
    selfhosted: { name: 'Valkey', tech: ['Valkey', 'Redis protocol'] }
  }),
  objects: row({
    aws:        { name: 'Amazon S3', tech: ['S3'] },
    gcp:        { name: 'Cloud Storage', tech: ['GCS'] },
    azure:      { name: 'Azure Blob Storage', tech: ['Blob Storage'] },
    selfhosted: { name: 'MinIO', tech: ['MinIO', 'S3 API'] }
  }),
  queue: row({
    aws:        { name: 'Amazon SQS', tech: ['SQS', 'FIFO optional'] },
    gcp:        { name: 'Cloud Pub/Sub (pull)', tech: ['Pub/Sub'] },
    azure:      { name: 'Azure Service Bus', tech: ['Service Bus'] },
    selfhosted: { name: 'RabbitMQ / NATS JetStream', tech: ['RabbitMQ', 'NATS'] }
  }),
  pubsub: row({
    aws:        { name: 'Amazon EventBridge', tech: ['EventBridge'] },
    gcp:        { name: 'Cloud Pub/Sub', tech: ['Pub/Sub', 'Eventarc'] },
    azure:      { name: 'Azure Event Grid', tech: ['Event Grid'] },
    selfhosted: { name: 'NATS JetStream', tech: ['NATS'] }
  }),
  stream: row({
    aws:        { name: 'Amazon Kinesis Data Streams', tech: ['Kinesis', 'MSK alternative'] },
    gcp:        { name: 'Cloud Pub/Sub', tech: ['Pub/Sub'] },
    azure:      { name: 'Azure Event Hubs', tech: ['Event Hubs', 'Kafka API'] },
    selfhosted: { name: 'Apache Kafka / Redpanda', tech: ['Kafka', 'Redpanda'] }
  }),
  streamProcessing: row({
    aws:        { name: 'Amazon Managed Service for Apache Flink', tech: ['Flink'] },
    gcp:        { name: 'Dataflow', tech: ['Dataflow', 'Beam'] },
    azure:      { name: 'Azure Stream Analytics', tech: ['Stream Analytics'] },
    selfhosted: { name: 'Apache Flink / Benthos', tech: ['Flink', 'Redpanda Connect'] }
  }),
  schemaRegistry: row({
    aws:        { name: 'EventBridge Schema Registry', tech: ['Schema Registry'] },
    gcp:        { name: 'Pub/Sub schemas', tech: ['Pub/Sub schemas', 'Avro'] },
    azure:      { name: 'Event Hubs Schema Registry', tech: ['Schema Registry'] },
    selfhosted: { name: 'Apicurio / Karapace', tech: ['Apicurio', 'Avro'] }
  }),
  orchestration: row({
    aws:        { name: 'AWS Step Functions', tech: ['Step Functions'] },
    gcp:        { name: 'Workflows', tech: ['Workflows'] },
    azure:      { name: 'Durable Functions', tech: ['Durable Functions'] },
    selfhosted: { name: 'Temporal', tech: ['Temporal'] }
  }),
  search: row({
    aws:        { name: 'Amazon OpenSearch Service', tech: ['OpenSearch'] },
    gcp:        { name: 'Elastic Cloud', tech: ['Elasticsearch'], note: { en: 'Google Cloud has no first-party managed full-text search — this stays third-party.', fr: 'Google Cloud n\'a pas de recherche plein-texte managée en propre — cela reste un tiers.' } },
    azure:      { name: 'Azure AI Search', tech: ['AI Search'] },
    selfhosted: { name: 'OpenSearch / Meilisearch', tech: ['OpenSearch', 'Meilisearch'] }
  }),
  vector: row({
    aws:        { name: 'OpenSearch Serverless (vector engine)', tech: ['OpenSearch', 'S3 Vectors alternative'], note: { en: 'No single AWS service combines lexical, vector and semantic reranking the way Azure AI Search does — expect to assemble it.', fr: 'Aucun service AWS ne combine lexical, vectoriel et reclassement sémantique comme Azure AI Search — il faudra assembler.' } },
    gcp:        { name: 'Vertex AI Vector Search', tech: ['Vector Search', 'AlloyDB pgvector'] },
    azure:      { name: 'Azure AI Search', tech: ['AI Search', 'hybrid + semantic'] },
    selfhosted: { name: 'Qdrant / pgvector', tech: ['Qdrant', 'pgvector'] }
  }),
  embeddings: row({
    aws:        { name: 'Amazon Bedrock (Titan / Cohere)', tech: ['Bedrock'] },
    gcp:        { name: 'Vertex AI Embeddings', tech: ['Vertex AI'] },
    azure:      { name: 'Microsoft Foundry', tech: ['Foundry'], note: { en: 'Azure AI Foundry was renamed Microsoft Foundry at Ignite 2025.', fr: 'Azure AI Foundry a été renommé Microsoft Foundry à Ignite 2025.' } },
    selfhosted: { name: 'Text Embeddings Inference', tech: ['TEI', 'BGE / E5'] }
  }),
  llm: row({
    aws:        { name: 'Amazon Bedrock', tech: ['Bedrock'] },
    gcp:        { name: 'Vertex AI', tech: ['Vertex AI'] },
    azure:      { name: 'Microsoft Foundry', tech: ['Foundry'] },
    selfhosted: { name: 'vLLM', tech: ['vLLM', 'open-weights model'], note: { en: 'A GPU you own is billed whether or not anyone asks a question.', fr: 'Un GPU qui t\'appartient est facturé que quelqu\'un pose une question ou non.' } }
  }),
  rerank: row({
    aws:        { name: 'Bedrock Rerank', tech: ['Bedrock'] },
    gcp:        { name: 'Vertex AI Ranking API', tech: ['Vertex AI'] },
    azure:      { name: 'Azure AI Search semantic ranker', tech: ['AI Search'] },
    selfhosted: { name: 'bge-reranker (TEI)', tech: ['TEI', 'cross-encoder'] }
  }),
  guardrails: row({
    aws:        { name: 'Bedrock Guardrails', tech: ['Guardrails'] },
    gcp:        { name: 'Vertex AI safety filters', tech: ['Vertex AI'] },
    azure:      { name: 'Azure AI Content Safety', tech: ['Content Safety'] },
    selfhosted: { name: 'Llama Guard + Presidio', tech: ['Llama Guard', 'Presidio'] }
  }),
  ocr: row({
    aws:        { name: 'Amazon Textract', tech: ['Textract'] },
    gcp:        { name: 'Document AI', tech: ['Document AI'] },
    azure:      { name: 'Azure AI Document Intelligence', tech: ['Document Intelligence'] },
    selfhosted: { name: 'Apache Tika + Tesseract', tech: ['Tika', 'Tesseract', 'docling'] }
  }),
  secrets: row({
    aws:        { name: 'AWS Secrets Manager', tech: ['Secrets Manager'] },
    gcp:        { name: 'Secret Manager', tech: ['Secret Manager'] },
    azure:      { name: 'Azure Key Vault', tech: ['Key Vault'] },
    selfhosted: { name: 'OpenBao / Vault', tech: ['OpenBao'] }
  }),
  config: row({
    aws:        { name: 'Parameter Store + Secrets Manager', tech: ['SSM', 'Secrets Manager'] },
    gcp:        { name: 'Secret Manager + runtime config', tech: ['Secret Manager'] },
    azure:      { name: 'App Configuration + Key Vault', tech: ['App Configuration', 'Key Vault'] },
    selfhosted: { name: 'Consul + OpenBao', tech: ['Consul', 'OpenBao'] }
  }),
  observability: row({
    aws:        { name: 'Amazon CloudWatch', tech: ['CloudWatch'] },
    gcp:        { name: 'Cloud Logging & Monitoring', tech: ['Cloud Logging', 'Cloud Monitoring'] },
    azure:      { name: 'Application Insights', tech: ['App Insights', 'Log Analytics'] },
    selfhosted: { name: 'Prometheus + Grafana + Loki', tech: ['Prometheus', 'Grafana', 'Loki'] }
  }),
  tracing: row({
    aws:        { name: 'AWS X-Ray', tech: ['X-Ray', 'OpenTelemetry'] },
    gcp:        { name: 'Cloud Trace', tech: ['Cloud Trace', 'OpenTelemetry'] },
    azure:      { name: 'Application Insights', tech: ['App Insights', 'OpenTelemetry'] },
    selfhosted: { name: 'Jaeger / Tempo', tech: ['OpenTelemetry', 'Tempo'] }
  }),
  warehouse: row({
    aws:        { name: 'Amazon Redshift', tech: ['Redshift', 'S3 + Athena alternative'] },
    gcp:        { name: 'BigQuery', tech: ['BigQuery'] },
    azure:      { name: 'Microsoft Fabric', tech: ['Fabric', 'Synapse'] },
    selfhosted: { name: 'ClickHouse', tech: ['ClickHouse', 'DuckDB'] }
  }),
  registry: row({
    aws:        { name: 'Amazon ECR', tech: ['ECR'] },
    gcp:        { name: 'Artifact Registry', tech: ['Artifact Registry'] },
    azure:      { name: 'Azure Container Registry', tech: ['ACR'] },
    selfhosted: { name: 'Harbor', tech: ['Harbor', 'Trivy'] }
  }),
  email: row({
    aws:        { name: 'Amazon SES', tech: ['SES'] },
    gcp:        { name: 'SendGrid / Resend', tech: ['SendGrid'], note: { en: 'Google Cloud has no native transactional email service. This one stays third-party on every target.', fr: 'Google Cloud n\'a pas de service natif d\'email transactionnel. Celui-ci reste un tiers sur toutes les cibles.' } },
    azure:      { name: 'Azure Communication Services', tech: ['ACS Email'] },
    selfhosted: { name: 'Postal / SMTP relay', tech: ['Postal'], note: { en: 'Self-hosting outbound email means owning IP reputation. Most teams should not.', fr: 'Auto-héberger l\'email sortant, c\'est assumer la réputation d\'IP. La plupart des équipes ne devraient pas.' } }
  }),
  backup: row({
    aws:        { name: 'AWS Backup', tech: ['AWS Backup', 'PITR'] },
    gcp:        { name: 'Backup and DR Service', tech: ['Backup and DR'] },
    azure:      { name: 'Azure Backup', tech: ['Azure Backup'] },
    selfhosted: { name: 'pgBackRest + restic', tech: ['pgBackRest', 'restic'] }
  }),
  jobs: row({
    aws:        { name: 'ECS scheduled tasks', tech: ['ECS', 'EventBridge Scheduler'] },
    gcp:        { name: 'Cloud Run Jobs', tech: ['Cloud Run Jobs', 'Cloud Scheduler'] },
    azure:      { name: 'Container Apps Jobs', tech: ['Container Apps Jobs'] },
    selfhosted: { name: 'systemd timers / Nomad periodic', tech: ['systemd', 'Nomad'] }
  }),
  cicd: row({
    aws:        { name: 'GitHub Actions + AWS CDK', tech: ['GitHub Actions', 'CDK'] },
    gcp:        { name: 'Cloud Build + Terraform', tech: ['Cloud Build', 'Terraform'] },
    azure:      { name: 'GitHub Actions + Bicep', tech: ['GitHub Actions', 'Bicep'] },
    selfhosted: { name: 'Forgejo Actions + Ansible', tech: ['Forgejo Actions', 'Ansible'] }
  }),
  gitops: row({
    aws:        { name: 'GitHub Actions + Argo CD', tech: ['GitHub Actions', 'Argo CD'] },
    gcp:        { name: 'Cloud Build + Argo CD', tech: ['Cloud Build', 'Argo CD'] },
    azure:      { name: 'GitHub Actions + Argo CD', tech: ['GitHub Actions', 'Argo CD'] },
    selfhosted: { name: 'Forgejo Actions + Argo CD', tech: ['Forgejo Actions', 'Argo CD'] }
  }),
  audit: row({
    aws:        { name: 'CloudWatch Logs + S3 (Object Lock)', tech: ['CloudWatch Logs', 'S3'] },
    gcp:        { name: 'Cloud Logging + BigQuery', tech: ['Cloud Logging', 'BigQuery'] },
    azure:      { name: 'Azure Log Analytics', tech: ['Log Analytics'] },
    selfhosted: { name: 'Loki + append-only PostgreSQL', tech: ['Loki', 'PostgreSQL'] }
  })
} satisfies Record<string, ServiceRow>;

export type ServiceRole = keyof typeof SERVICES;

/**
 * Build a component's `cloud` block from a role, optionally patching a cell.
 * `cloudOf('queue', { azure: { note: '…' } })` keeps the Service Bus name and
 * adds a note that only this template cares about.
 */
export function cloudOf(
  role: ServiceRole,
  patch?: Partial<Record<ResolvedTarget, CloudOverride>>
): Partial<Record<ResolvedTarget, CloudOverride>> {
  const base = SERVICES[role] as ServiceRow;
  const out: Partial<Record<ResolvedTarget, CloudOverride>> = {};
  (Object.keys(base) as ResolvedTarget[]).forEach(target => {
    const cell = base[target];
    out[target] = { name: cell.name, tech: cell.tech, ...(cell.note ? { note: cell.note } : {}), ...(patch?.[target] || {}) };
  });
  /* a patched target that has no row (rare) still deserves its override */
  Object.entries(patch || {}).forEach(([target, o]) => {
    if (!out[target as ResolvedTarget]) out[target as ResolvedTarget] = o;
  });
  return out;
}

/**
 * Take the technologies from a service row but keep the component's abstract
 * name. For components whose identity is the business domain rather than the
 * infrastructure: five cards all reading "ECS Fargate" is a strictly worse
 * diagram than five cards reading what they actually do, and the mapping is
 * still stated on the chips and in the generated deployment table.
 */
export function techOf(
  role: ServiceRole,
  patch?: Partial<Record<ResolvedTarget, CloudOverride>>
): Partial<Record<ResolvedTarget, CloudOverride>> {
  const base = SERVICES[role] as ServiceRow;
  const out: Partial<Record<ResolvedTarget, CloudOverride>> = {};
  (Object.keys(base) as ResolvedTarget[]).forEach(target => {
    const cell = base[target];
    out[target] = { tech: cell.tech, ...(cell.note ? { note: cell.note } : {}), ...(patch?.[target] || {}) };
  });
  return out;
}

/** Same, but the component simply does not exist on the listed targets. */
export function omitOn(...targets: ResolvedTarget[]): Partial<Record<ResolvedTarget, CloudOverride>> {
  return Object.fromEntries(targets.map(target => [target, { omit: true }]));
}
