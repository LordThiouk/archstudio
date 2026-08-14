/* T2 — Multi-tenant B2B SaaS. */

import { cloudOf } from './services';
import type { Template } from './types';

export const saasMultitenant: Template = {
  id: 'saas-multitenant',
  name: { en: 'Multi-tenant B2B SaaS', fr: 'SaaS B2B multi-tenant' },
  tagline: {
    en: 'Several customer companies on one platform, isolated from each other.',
    fr: 'Plusieurs entreprises clientes sur une même plateforme, isolées les unes des autres.'
  },
  intro: {
    en: 'The whole design turns on one question: where is the tenant resolved, and where is the data filtered? Get those two points right and everything else is ordinary application architecture.',
    fr: 'Toute la conception tient sur une question : où le tenant est-il résolu, et où la donnée est-elle filtrée ? Ces deux points réglés, le reste est de l\'architecture applicative ordinaire.'
  },
  icon: 'users',
  accent: '#28519F',
  accentDark: '#5B8DEF',
  supportedTargets: ['agnostic', 'aws', 'gcp', 'azure', 'selfhosted'],

  whenToUse: [
    { en: 'Several customer companies sharing one platform', fr: 'Plusieurs entreprises clientes sur une même plateforme' },
    { en: 'Enterprise SSO, contracts and usage-based billing are required', fr: 'SSO d\'entreprise, contrats et facturation à l\'usage sont exigés' },
    { en: 'Data isolation is required, but not to the point of one deployment per customer', fr: 'Isolation des données exigée, mais pas au point d\'un déploiement par client' },
    { en: 'You want one version in production, for everyone', fr: 'On veut une seule version en production, pour tout le monde' }
  ],
  whenNotToUse: [
    { en: 'Pure B2C — tenancy complexity buys you nothing', fr: 'B2C pur — la complexité de tenancy n\'apporte rien' },
    { en: 'Fewer than three customers: start single-tenant and extract later, it costs less', fr: 'Moins de trois clients : commence en mono-tenant et extrais plus tard, cela coûte moins cher' },
    { en: 'A regulator requires physical isolation per customer — then it is silo, not pool', fr: 'Un régulateur exige l\'isolation physique par client — alors c\'est silo, pas pool' }
  ],

  groups: [
    { id: 'front', name: { en: 'Front & console', fr: 'Front & console' }, short: { en: 'Front', fr: 'Front' },
      description: { en: 'What customers and your own staff open.', fr: 'Ce qu\'ouvrent les clients et tes propres équipes.' } },
    { id: 'app', name: { en: 'Application', fr: 'Application' }, short: { en: 'App', fr: 'App' },
      description: { en: 'The product logic, identical for every tenant.', fr: 'La logique produit, identique pour chaque tenant.' } },
    { id: 'data', name: { en: 'Data', fr: 'Données' }, short: { en: 'Data', fr: 'Données' },
      description: { en: 'Shared stores, filtered by tenant on every access.', fr: 'Bases partagées, filtrées par tenant à chaque accès.' } },
    { id: 'tenancy', name: { en: 'Tenancy & security', fr: 'Tenancy & sécurité' }, short: { en: 'Tenancy', fr: 'Tenancy' },
      description: { en: 'Who the tenant is, what they bought, what they did.', fr: 'Qui est le tenant, ce qu\'il a acheté, ce qu\'il a fait.' } },
    { id: 'platform', name: { en: 'Platform', fr: 'Plateforme' }, short: { en: 'Platform', fr: 'Plateforme' },
      description: { en: 'Delivery, flags, observability.', fr: 'Livraison, feature flags, observabilité.' } }
  ],

  layers: [
    { id: 'clients', name: { en: 'Clients', fr: 'Clients' }, desc: { en: 'Customer app · internal console', fr: 'App client · console interne' } },
    { id: 'edge', name: { en: 'Edge & API', fr: 'Edge & API' }, desc: { en: 'Where the tenant is resolved', fr: 'Là où le tenant est résolu' } },
    { id: 'services', name: { en: 'Services', fr: 'Services' }, desc: { en: 'Product logic and tenancy services', fr: 'Logique produit et services de tenancy' } },
    { id: 'data', name: { en: 'Data', fr: 'Données' }, desc: { en: 'OLTP · Cache · Files · Search · Bus', fr: 'OLTP · Cache · Fichiers · Recherche · Bus' } },
    { id: 'platform', name: { en: 'Platform', fr: 'Plateforme' }, desc: { en: 'Supports everything above', fr: 'Supporte tout ce qui précède' } }
  ],

  components: [
    {
      id: 'app', name: { en: 'Customer application', fr: 'Application cliente' },
      group: 'front', layer: 'clients', icon: 'web',
      tech: ['SPA', 'TypeScript'],
      role: { en: 'What the customer\'s employees use every day.', fr: 'Ce que les employés du client utilisent tous les jours.' },
      features: [
        { en: 'Per-tenant subdomain or path', fr: 'Sous-domaine ou chemin par tenant' },
        { en: 'Tenant branding, without a separate build', fr: 'Personnalisation par tenant, sans build séparé' },
        { en: 'Roles inside the tenant: admin, member, read-only', fr: 'Rôles dans le tenant : admin, membre, lecture seule' }
      ],
      deps: ['gw'],
      cloud: cloudOf('staticHosting')
    },
    {
      id: 'admin', name: { en: 'Internal admin console', fr: 'Console d\'administration interne' },
      group: 'front', layer: 'clients', icon: 'cog',
      tech: ['SPA'],
      role: { en: 'Your own support and operations view across every tenant.', fr: 'La vue support et exploitation de tes équipes, tous tenants confondus.' },
      features: [
        { en: 'Impersonation, with the reason recorded in the audit log', fr: 'Usurpation d\'identité, avec le motif consigné au journal d\'audit' },
        { en: 'Quotas, plan changes and manual provisioning', fr: 'Quotas, changements de forfait et provisionnement manuel' }
      ],
      notes: [
        { en: 'Same hosting as the customer app, restricted access. The dangerous part is not where it runs, it is who it lets you become.', fr: 'Même hébergement que l\'app cliente, accès restreint. Le danger n\'est pas où elle tourne, mais qui elle permet de devenir.' }
      ],
      deps: ['gw']
    },
    {
      id: 'gw', name: { en: 'API gateway & WAF', fr: 'Passerelle API & WAF' },
      group: 'front', layer: 'edge', icon: 'plug',
      tech: ['HTTP API', 'WAF'],
      role: { en: 'One front door: TLS, filtering, rate limits, token validation.', fr: 'Une seule porte d\'entrée : TLS, filtrage, limitation de débit, validation des jetons.' },
      features: [
        { en: 'Rate limits per tenant, not per IP', fr: 'Limitation de débit par tenant, pas par IP' },
        { en: 'Token signature checked before anything else', fr: 'Signature du jeton vérifiée avant toute chose' }
      ],
      deps: ['tenant-router'],
      cloud: cloudOf('apiGateway', {
        aws: { name: 'API Gateway + AWS WAF', tech: ['API Gateway', 'AWS WAF'] },
        gcp: { name: 'API Gateway + Cloud Armor', tech: ['API Gateway', 'Cloud Armor'] },
        azure: { name: 'API Management + Azure WAF', tech: ['APIM', 'Azure WAF'] },
        selfhosted: { name: 'Traefik + Coraza', tech: ['Traefik', 'Coraza'] }
      })
    },
    {
      id: 'tenant-router', name: { en: 'Tenant resolution', fr: 'Résolution du tenant' },
      group: 'tenancy', layer: 'edge', icon: 'route',
      tech: ['Middleware', 'JWT claim'],
      role: { en: 'Turns a request into a tenant id, once, before any business code runs.', fr: 'Transforme une requête en identifiant de tenant, une fois, avant tout code métier.' },
      features: [
        { en: 'From the subdomain, or from a signed claim in the token — never from a request body', fr: 'Depuis le sous-domaine, ou depuis un claim signé du jeton — jamais depuis le corps de la requête' },
        { en: 'Rejects the request outright when the tenant cannot be resolved', fr: 'Rejette la requête d\'emblée quand le tenant ne peut pas être résolu' },
        { en: 'Puts the tenant id where the data layer will read it, not where handlers might forget it', fr: 'Place l\'identifiant là où la couche données le lira, pas là où les handlers pourraient l\'oublier' }
      ],
      notes: [
        { en: 'Application middleware on every target. It is the single most security-sensitive piece of this architecture, and no cloud sells it to you.', fr: 'Un middleware applicatif sur toutes les cibles. C\'est la pièce la plus sensible de cette architecture, et aucun cloud ne te la vend.' }
      ],
      deps: ['api', 'auth']
    },
    {
      id: 'api', name: { en: 'Application service', fr: 'Service applicatif' },
      group: 'app', layer: 'services', icon: 'server',
      tech: ['Container'],
      role: { en: 'The product. One codebase, one version, every tenant.', fr: 'Le produit. Une base de code, une version, tous les tenants.' },
      features: [
        { en: 'Tenant id read from the context, never from user input', fr: 'Identifiant de tenant lu dans le contexte, jamais dans l\'entrée utilisateur' },
        { en: 'Data access goes through one layer that always applies the filter', fr: 'L\'accès aux données passe par une seule couche qui applique toujours le filtre' },
        { en: 'Emits domain events rather than calling workers directly', fr: 'Émet des événements métier plutôt que d\'appeler les workers directement' }
      ],
      deps: ['db', 'cache', 'files', 'search', 'bus', 'audit', 'billing'],
      cloud: cloudOf('containers')
    },
    {
      id: 'workers', name: { en: 'Background workers', fr: 'Traitements de fond' },
      group: 'app', layer: 'services', icon: 'cog',
      tech: ['Container', 'Queue consumer'],
      role: { en: 'Exports, imports, recomputations and scheduled work.', fr: 'Exports, imports, recalculs et travail planifié.' },
      features: [
        { en: 'Carries the tenant id through the message, then applies the same filter', fr: 'Transporte l\'identifiant de tenant dans le message, puis applique le même filtre' },
        { en: 'One big tenant must not starve the others — bound concurrency per tenant', fr: 'Un gros tenant ne doit pas affamer les autres — borne la concurrence par tenant' }
      ],
      deps: ['bus', 'db', 'files'],
      cloud: cloudOf('containers', {
        aws: { name: 'ECS Fargate (SQS consumers)', tech: ['ECS', 'SQS'] },
        gcp: { name: 'Cloud Run Jobs (Pub/Sub)', tech: ['Cloud Run Jobs', 'Pub/Sub'] },
        azure: { name: 'Container Apps Jobs (Service Bus)', tech: ['Container Apps Jobs', 'Service Bus'] },
        selfhosted: { name: 'Worker containers (RabbitMQ)', tech: ['Docker', 'RabbitMQ'] }
      })
    },
    {
      id: 'auth', name: { en: 'Identity & SSO', fr: 'Identité & SSO' },
      group: 'tenancy', layer: 'services', icon: 'lock',
      tech: ['OIDC', 'SAML', 'SCIM'],
      role: { en: 'Who the user is, and which tenant they belong to.', fr: 'Qui est l\'utilisateur, et à quel tenant il appartient.' },
      features: [
        { en: 'One SSO connection per enterprise tenant', fr: 'Une connexion SSO par tenant entreprise' },
        { en: 'SCIM provisioning — enterprise buyers ask for it by the third deal', fr: 'Provisionnement SCIM — les acheteurs entreprise le demandent dès le troisième contrat' },
        { en: 'The tenant id lands in the token as a signed claim', fr: 'L\'identifiant de tenant arrive dans le jeton comme claim signé' }
      ],
      cloud: cloudOf('identity', {
        aws: { name: 'Amazon Cognito', tech: ['Cognito'], note: { en: 'Per-tenant SAML federation is where Cognito starts to hurt. WorkOS and Auth0 exist for exactly this.', fr: 'La fédération SAML par tenant est là où Cognito commence à faire mal. WorkOS et Auth0 existent précisément pour cela.' } }
      })
    },
    {
      id: 'provisioning', name: { en: 'Tenant provisioning', fr: 'Provisionnement de tenant' },
      group: 'tenancy', layer: 'services', icon: 'layers',
      tech: ['Workflow'],
      role: { en: 'Turns a signed contract into a working tenant, repeatably.', fr: 'Transforme un contrat signé en tenant fonctionnel, de façon reproductible.' },
      features: [
        { en: 'Creates the tenant record, the SSO connection and the first admin', fr: 'Crée l\'enregistrement du tenant, la connexion SSO et le premier administrateur' },
        { en: 'Idempotent and resumable — it will fail halfway one day', fr: 'Idempotent et reprenable — il échouera à mi-parcours un jour' },
        { en: 'Seeds default data and quotas from the plan', fr: 'Amorce les données par défaut et les quotas depuis le forfait' }
      ],
      deps: ['db', 'auth', 'billing'],
      cloud: cloudOf('orchestration')
    },
    {
      id: 'billing', name: { en: 'Subscriptions & usage', fr: 'Abonnements & usage' },
      group: 'tenancy', layer: 'services', icon: 'card',
      tech: ['Stripe Billing'],
      role: { en: 'Plans, seats, metered usage and invoices.', fr: 'Forfaits, sièges, usage mesuré et factures.' },
      features: [
        { en: 'Usage metered per tenant and reported on a schedule', fr: 'Usage mesuré par tenant et remonté périodiquement' },
        { en: 'Plan limits enforced in the product, not only on the invoice', fr: 'Limites de forfait appliquées dans le produit, pas seulement sur la facture' }
      ],
      notes: [
        { en: 'Identical on every target — billing is a vendor choice, not an infrastructure one.', fr: 'Identique sur toutes les cibles — la facturation est un choix fournisseur, pas d\'infrastructure.' },
        { en: 'Never let the billing provider be the source of truth for entitlements. Mirror them in your own database.', fr: 'Ne laisse jamais le prestataire de facturation être la source de vérité des droits. Recopie-les dans ta propre base.' }
      ]
    },
    {
      id: 'audit', name: { en: 'Audit log', fr: 'Journal d\'audit' },
      group: 'tenancy', layer: 'services', icon: 'eye',
      tech: ['Append-only'],
      role: { en: 'Who did what, in which tenant, when. Sold as a feature, needed as evidence.', fr: 'Qui a fait quoi, dans quel tenant, quand. Vendu comme fonctionnalité, nécessaire comme preuve.' },
      features: [
        { en: 'Append-only — an audit log you can edit is not an audit log', fr: 'En ajout seul — un journal d\'audit modifiable n\'est pas un journal d\'audit' },
        { en: 'Readable by the tenant, for their own events only', fr: 'Consultable par le tenant, pour ses propres événements uniquement' },
        { en: 'Retention set by contract, not by disk space', fr: 'Rétention fixée par contrat, pas par l\'espace disque' }
      ],
      cloud: cloudOf('audit')
    },
    {
      id: 'db', name: { en: 'Transactional database', fr: 'Base transactionnelle' },
      group: 'data', layer: 'data', icon: 'db',
      tech: ['PostgreSQL', 'RLS'],
      role: { en: 'Shared tables, one tenant column, one policy that cannot be forgotten.', fr: 'Tables partagées, une colonne tenant, une politique qu\'on ne peut pas oublier.' },
      features: [
        { en: 'Row-level security so the filter lives in the database, not in each query', fr: 'Sécurité au niveau ligne pour que le filtre vive dans la base, pas dans chaque requête' },
        { en: 'Tenant id in the primary key of every shared table', fr: 'Identifiant de tenant dans la clé primaire de chaque table partagée' },
        { en: 'The largest tenant sets the shape of every index', fr: 'Le plus gros tenant détermine la forme de chaque index' }
      ],
      cloud: cloudOf('sql')
    },
    {
      id: 'cache', name: { en: 'Cache & sessions', fr: 'Cache & sessions' },
      group: 'data', layer: 'data', icon: 'bolt',
      tech: ['Key-value'],
      role: { en: 'Sessions, per-tenant rate limits, hot lookups.', fr: 'Sessions, limitation de débit par tenant, recherches fréquentes.' },
      features: [
        { en: 'Tenant id in every key prefix — this is where cross-tenant leaks actually happen', fr: 'Identifiant de tenant dans chaque préfixe de clé — c\'est là que les fuites inter-tenants se produisent réellement' },
        { en: 'Eviction policy chosen deliberately, not left at the default', fr: 'Politique d\'éviction choisie délibérément, pas laissée par défaut' }
      ],
      cloud: cloudOf('cache')
    },
    {
      id: 'files', name: { en: 'Per-tenant files', fr: 'Fichiers par tenant' },
      group: 'data', layer: 'data', icon: 'save',
      tech: ['Object storage'],
      role: { en: 'Uploads and exports, partitioned so a mistake is visible.', fr: 'Dépôts et exports, partitionnés pour qu\'une erreur soit visible.' },
      features: [
        { en: 'One prefix or container per tenant', fr: 'Un préfixe ou conteneur par tenant' },
        { en: 'Pre-signed URLs scoped to that prefix, and short-lived', fr: 'URL pré-signées limitées à ce préfixe, et de courte durée' }
      ],
      cloud: cloudOf('objects', {
        aws: { name: 'Amazon S3 (prefix per tenant)', tech: ['S3'] },
        azure: { name: 'Blob Storage (container per tenant)', tech: ['Blob Storage'] }
      })
    },
    {
      id: 'search', name: { en: 'Search', fr: 'Recherche' },
      group: 'data', layer: 'data', icon: 'search',
      tech: ['Full-text'],
      role: { en: 'Finding things across a tenant\'s data, quickly.', fr: 'Retrouver des éléments dans les données d\'un tenant, rapidement.' },
      features: [
        { en: 'Tenant filter applied in the query, and enforced by an alias or index per tenant', fr: 'Filtre de tenant appliqué dans la requête, et garanti par un alias ou un index par tenant' },
        { en: 'Reindexing a single tenant must be possible without touching the others', fr: 'Réindexer un seul tenant doit être possible sans toucher aux autres' }
      ],
      cloud: cloudOf('search')
    },
    {
      id: 'bus', name: { en: 'Event bus', fr: 'Bus d\'événements' },
      group: 'data', layer: 'data', icon: 'hub',
      tech: ['Events', 'DLQ'],
      role: { en: 'Decouples the request from the work it sets off.', fr: 'Découple la requête du travail qu\'elle déclenche.' },
      features: [
        { en: 'Tenant id on every message, as a first-class attribute', fr: 'Identifiant de tenant sur chaque message, comme attribut de premier ordre' },
        { en: 'Dead-letter queue, watched', fr: 'File de rebut, surveillée' }
      ],
      cloud: cloudOf('pubsub')
    },
    {
      id: 'flags', name: { en: 'Feature flags', fr: 'Feature flags' },
      group: 'platform', layer: 'platform', icon: 'flag',
      tech: ['Unleash', 'Flagsmith'],
      role: { en: 'One version in production, different behaviour per tenant.', fr: 'Une version en production, un comportement différent par tenant.' },
      features: [
        { en: 'Targeting by tenant, not only by percentage', fr: 'Ciblage par tenant, pas seulement par pourcentage' },
        { en: 'Every flag has an owner and a removal date', fr: 'Chaque flag a un propriétaire et une date de suppression' }
      ],
      notes: [
        { en: 'Vendor-neutral on purpose: no cloud has a good first-party answer here.', fr: 'Agnostique volontairement : aucun cloud n\'a de bonne réponse en propre ici.' },
        { en: 'Flags are how you avoid a per-customer branch. A per-customer branch is how multi-tenant SaaS dies.', fr: 'Les flags évitent la branche par client. La branche par client est la mort du SaaS multi-tenant.' }
      ]
    },
    {
      id: 'obs', name: { en: 'Observability', fr: 'Observabilité' },
      group: 'platform', layer: 'platform', icon: 'chart',
      tech: ['Metrics', 'Traces'],
      role: { en: 'Per-tenant answers to "is it slow?" and "is it broken?"', fr: 'Des réponses par tenant à « c\'est lent ? » et « c\'est cassé ? »' },
      features: [
        { en: 'Tenant id as a dimension on every metric and span', fr: 'Identifiant de tenant en dimension sur chaque métrique et chaque trace' },
        { en: 'Alerts that fire per tenant — a global average hides a broken customer', fr: 'Alertes déclenchées par tenant — une moyenne globale masque un client en panne' }
      ],
      cloud: cloudOf('tracing')
    },
    {
      id: 'cicd', name: { en: 'CI/CD & infrastructure as code', fr: 'CI/CD & infrastructure as code' },
      group: 'platform', layer: 'platform', icon: 'git',
      tech: ['CI', 'IaC'],
      role: { en: 'One pipeline, one version, every tenant at once.', fr: 'Un pipeline, une version, tous les tenants d\'un coup.' },
      features: [
        { en: 'Migrations that work while both versions are running', fr: 'Migrations qui fonctionnent pendant que les deux versions tournent' },
        { en: 'A cross-tenant leak test in the pipeline, not in the review checklist', fr: 'Un test de fuite inter-tenants dans le pipeline, pas dans la checklist de relecture' }
      ],
      cloud: cloudOf('cicd', {
        aws: { name: 'GitHub Actions + Terraform', tech: ['GitHub Actions', 'Terraform'] }
      })
    }
  ],

  flows: [
    {
      id: 'onboarding',
      name: { en: 'Onboarding a new tenant', fr: 'Onboarding d\'un nouveau tenant' },
      group: 'tenancy',
      sub: { en: 'Contract → provisioning → SSO → first user', fr: 'Contrat → provisionnement → SSO → premier utilisateur' },
      note: {
        en: '<b>Make this repeatable early.</b> The first three tenants get onboarded by hand and nobody notices. The tenth one exposes every undocumented step at once.',
        fr: '<b>Rends ceci reproductible tôt.</b> Les trois premiers tenants sont provisionnés à la main sans que personne ne s\'en aperçoive. Le dixième révèle d\'un coup chaque étape non documentée.'
      },
      steps: [
        { component: 'admin', title: { en: 'Contract recorded', fr: 'Contrat enregistré' },
          description: { en: 'Sales records the plan, the seat count and the technical contact.', fr: 'Le commerce enregistre le forfait, le nombre de sièges et le contact technique.' } },
        { component: 'provisioning', title: { en: 'Workflow started', fr: 'Workflow lancé' },
          description: { en: 'One idempotent workflow, resumable if a step fails.', fr: 'Un workflow idempotent, reprenable si une étape échoue.' } },
        { component: 'db', title: { en: 'Tenant created', fr: 'Tenant créé' },
          description: { en: 'The tenant record, its quotas and its default settings.', fr: 'L\'enregistrement du tenant, ses quotas et ses réglages par défaut.' } },
        { component: 'billing', title: { en: 'Subscription opened', fr: 'Abonnement ouvert' },
          description: { en: 'The plan is mirrored into your own entitlements table.', fr: 'Le forfait est recopié dans ta propre table de droits.' } },
        { component: 'auth', title: { en: 'SSO connection configured', fr: 'Connexion SSO configurée' },
          description: { en: 'Their identity provider is federated; the tenant id becomes a token claim.', fr: 'Leur fournisseur d\'identité est fédéré ; l\'identifiant de tenant devient un claim du jeton.' } },
        { component: 'bus', title: { en: 'Tenant-created event', fr: 'Événement tenant créé' },
          description: { en: 'Published once, so seeding and indexing can react independently.', fr: 'Publié une fois, pour que l\'amorçage et l\'indexation réagissent indépendamment.' } },
        { component: 'workers', title: { en: 'Default data seeded', fr: 'Données par défaut amorcées' },
          description: { en: 'Templates, sample records, the search index.', fr: 'Gabarits, enregistrements d\'exemple, index de recherche.' } },
        { component: 'app', title: { en: 'First admin signs in', fr: 'Le premier administrateur se connecte' },
          description: { en: 'Through their own SSO, into a tenant that already has something in it.', fr: 'Via son propre SSO, dans un tenant qui contient déjà quelque chose.' } }
      ]
    },
    {
      id: 'request',
      name: { en: 'One user request', fr: 'Une requête utilisateur' },
      group: 'app',
      sub: { en: 'Where the tenant is resolved, and where the data is filtered', fr: 'Où le tenant est résolu, et où la donnée est filtrée' },
      note: {
        en: '<b>This is the flow that makes isolation concrete.</b> Two steps carry all the risk: resolution and filtering. Everything else is ordinary.',
        fr: '<b>C\'est le flux qui rend l\'isolation concrète.</b> Deux étapes portent tout le risque : la résolution et le filtrage. Le reste est ordinaire.'
      },
      steps: [
        { component: 'app', title: { en: 'Request sent', fr: 'Requête envoyée' },
          description: { en: 'From the tenant\'s subdomain, with the access token attached.', fr: 'Depuis le sous-domaine du tenant, avec le jeton d\'accès.' } },
        { component: 'gw', title: { en: 'Token validated', fr: 'Jeton validé' },
          description: { en: 'Signature and expiry checked at the edge. Per-tenant rate limit applied.', fr: 'Signature et expiration vérifiées en périphérie. Limitation de débit par tenant appliquée.' } },
        { component: 'tenant-router', title: { en: 'Tenant resolved', fr: 'Tenant résolu' },
          description: { en: 'From the signed claim — never from a header or a body field the caller controls.', fr: 'Depuis le claim signé — jamais depuis un en-tête ou un champ du corps que l\'appelant contrôle.' } },
        { component: 'api', title: { en: 'Business logic runs', fr: 'La logique métier s\'exécute' },
          description: { en: 'The tenant id is in the context. No handler reads it from user input.', fr: 'L\'identifiant de tenant est dans le contexte. Aucun handler ne le lit depuis l\'entrée utilisateur.' } },
        { component: 'db', title: { en: 'Data filtered', fr: 'Données filtrées' },
          description: { en: 'Row-level security applies the filter even when the query forgot to.', fr: 'La sécurité au niveau ligne applique le filtre même quand la requête l\'a oublié.' } },
        { component: 'audit', title: { en: 'Action recorded', fr: 'Action consignée' },
          description: { en: 'Written for anything that changes state or reads sensitive data.', fr: 'Écrit pour tout ce qui modifie l\'état ou lit une donnée sensible.' } }
      ]
    }
  ],

  sections: [
    {
      id: 'isolation', tab: { en: 'Isolation', fr: 'Isolation' }, type: 'compare',
      title: { en: 'Three isolation models', fr: 'Trois modèles d\'isolation' },
      subtitle: {
        en: 'This document assumes pool. Read the other two before you accept that assumption — the choice is expensive to reverse.',
        fr: 'Ce document suppose le modèle pool. Lis les deux autres avant d\'accepter cette hypothèse — le choix est cher à inverser.'
      },
      columns: [
        { group: 'data', kicker: { en: 'Model 1', fr: 'Modèle 1' },
          title: { en: 'Silo — one database per customer', fr: 'Silo — une base par client' },
          short: { en: 'Silo', fr: 'Silo' },
          pitch: { en: 'Strongest isolation, highest operational cost. What regulators ask for by name.', fr: 'Isolation maximale, coût opérationnel maximal. Ce que les régulateurs demandent nommément.' },
          rows: [
            [{ en: 'Isolation', fr: 'Isolation' }, { en: '<b>Physical.</b> A query cannot reach another tenant', fr: '<b>Physique.</b> Une requête ne peut pas atteindre un autre tenant' }],
            [{ en: 'Cost', fr: 'Coût' }, { en: 'Linear in the number of customers', fr: 'Linéaire dans le nombre de clients' }],
            [{ en: 'Migrations', fr: 'Migrations' }, { en: 'N times, and N can fail differently', fr: 'N fois, et N peuvent échouer différemment' }],
            [{ en: 'Ceiling', fr: 'Plafond' }, { en: 'A few dozen customers before operations dominate', fr: 'Quelques dizaines de clients avant que l\'exploitation ne domine' }]
          ],
          bullets: [
            { en: 'The right answer when a contract requires physical isolation', fr: 'La bonne réponse quand un contrat exige l\'isolation physique' },
            { en: 'Also the right answer for three enormous customers', fr: 'Aussi la bonne réponse pour trois clients énormes' }
          ] },
        { group: 'app', kicker: { en: 'Model 2', fr: 'Modèle 2' },
          title: { en: 'Pool — shared tables, tenant column', fr: 'Pool — tables partagées, colonne tenant' },
          short: { en: 'Pool', fr: 'Pool' },
          pitch: { en: 'Cheapest to run, most demanding to write. One forgotten filter is a breach.', fr: 'Le moins cher à opérer, le plus exigeant à écrire. Un filtre oublié est une fuite.' },
          rows: [
            [{ en: 'Isolation', fr: 'Isolation' }, { en: '<b>Logical.</b> Guaranteed by row-level security, not by discipline', fr: '<b>Logique.</b> Garantie par la sécurité au niveau ligne, pas par la discipline' }],
            [{ en: 'Cost', fr: 'Coût' }, { en: 'Nearly flat as customers are added', fr: 'Quasi constant à mesure que les clients arrivent' }],
            [{ en: 'Migrations', fr: 'Migrations' }, { en: 'Once, for everybody, including the customer who is asleep', fr: 'Une fois, pour tout le monde, y compris le client qui dort' }],
            [{ en: 'Ceiling', fr: 'Plafond' }, { en: 'Thousands, until one tenant\'s volume distorts every index', fr: 'Des milliers, jusqu\'à ce qu\'un tenant déforme tous les index' }]
          ],
          bullets: [
            { en: 'The default for a B2B SaaS with more than ten customers', fr: 'Le choix par défaut d\'un SaaS B2B au-delà de dix clients' },
            { en: 'Requires the leak test in CI, permanently', fr: 'Exige le test de fuite en intégration continue, définitivement' }
          ] },
        { group: 'tenancy', kicker: { en: 'Model 3', fr: 'Modèle 3' },
          title: { en: 'Bridge — one schema per customer', fr: 'Bridge — un schéma par client' },
          short: { en: 'Bridge', fr: 'Bridge' },
          pitch: { en: 'One database, separate schemas. Sits between the other two, and inherits problems from both.', fr: 'Une base, des schémas séparés. Entre les deux autres, et hérite des problèmes des deux.' },
          rows: [
            [{ en: 'Isolation', fr: 'Isolation' }, { en: '<b>Schema-level.</b> Enforced by grants', fr: '<b>Au niveau du schéma.</b> Appliquée par les droits' }],
            [{ en: 'Cost', fr: 'Coût' }, { en: 'One database, but connection pooling gets awkward', fr: 'Une seule base, mais le pooling de connexions devient délicat' }],
            [{ en: 'Migrations', fr: 'Migrations' }, { en: 'N times, in one place — better than silo, worse than pool', fr: 'N fois, au même endroit — mieux que silo, moins bien que pool' }],
            [{ en: 'Ceiling', fr: 'Plafond' }, { en: 'A few hundred schemas before the catalogue itself slows down', fr: 'Quelques centaines de schémas avant que le catalogue lui-même ralentisse' }]
          ],
          bullets: [
            { en: 'A credible compromise when isolation must be demonstrable but not physical', fr: 'Un compromis crédible quand l\'isolation doit être démontrable sans être physique' },
            { en: 'Rarely the right first choice; often the right migration target', fr: 'Rarement le bon premier choix ; souvent la bonne cible de migration' }
          ] }
      ],
      table: {
        title: { en: 'Point by point', fr: 'Point par point' },
        firstColumn: { en: 'Dimension', fr: 'Dimension' },
        rows: [
          [{ en: 'Isolation', fr: 'Isolation' }, { en: 'Physical', fr: 'Physique' }, { en: 'Logical', fr: 'Logique' }, { en: 'Schema', fr: 'Schéma' }],
          [{ en: 'Infrastructure cost', fr: 'Coût d\'infrastructure' }, { en: 'High, linear', fr: 'Élevé, linéaire' }, { en: 'Low, flat', fr: 'Faible, constant' }, { en: 'Medium', fr: 'Moyen' }],
          [{ en: 'Operational complexity', fr: 'Complexité opérationnelle' }, { en: 'High', fr: 'Élevée' }, { en: 'Low', fr: 'Faible' }, { en: 'Medium', fr: 'Moyenne' }],
          [{ en: 'Noisy-neighbour risk', fr: 'Risque de voisin bruyant' }, { en: 'None', fr: 'Nul' }, { en: 'Real, needs quotas', fr: 'Réel, exige des quotas' }, { en: 'Partial', fr: 'Partiel' }],
          [{ en: 'Cross-tenant leak risk', fr: 'Risque de fuite inter-tenants' }, { en: 'Near zero', fr: 'Quasi nul' }, { en: 'The main risk of the model', fr: 'Le risque principal du modèle' }, { en: 'Low', fr: 'Faible' }],
          [{ en: 'Per-customer restore', fr: 'Restauration par client' }, { en: 'Trivial', fr: 'Triviale' }, { en: 'Hard — the hidden cost of pool', fr: 'Difficile — le coût caché du pool' }, { en: 'Doable', fr: 'Faisable' }],
          [{ en: 'Customer ceiling', fr: 'Plafond de clients' }, { en: 'Dozens', fr: 'Dizaines' }, { en: 'Thousands', fr: 'Milliers' }, { en: 'Hundreds', fr: 'Centaines' }],
          [{ en: 'Migration out', fr: 'Migration de sortie' }, { en: 'Easy towards pool', fr: 'Facile vers le pool' }, { en: 'Hard — pool to silo means splitting live data', fr: 'Difficile — pool vers silo demande de scinder des données vivantes' }, { en: 'Easy either way', fr: 'Facile dans les deux sens' }]
        ]
      },
      cards: [
        { group: 'data', title: { en: 'Mixing models is normal', fr: 'Mélanger les modèles est normal' },
          bullets: [
            { en: 'Pool for the long tail, silo for the two customers whose contract demands it', fr: 'Pool pour la longue traîne, silo pour les deux clients dont le contrat l\'exige' },
            { en: 'Same code, same version — only the connection string differs', fr: 'Même code, même version — seule la chaîne de connexion change' }
          ],
          note: { en: 'Design the data layer so the model is a per-tenant setting, and this stays cheap.', fr: 'Conçois la couche données pour que le modèle soit un réglage par tenant, et cela reste bon marché.' } }
      ]
    },
    {
      id: 'tenancy-security', tab: { en: 'Security', fr: 'Sécurité' }, type: 'cards',
      title: { en: 'Tenancy security', fr: 'Sécurité de la tenancy' },
      subtitle: {
        en: 'A cross-tenant leak is the one bug that ends a B2B contract on the same day it is found.',
        fr: 'Une fuite inter-tenants est le seul bug qui met fin à un contrat B2B le jour même où on le trouve.'
      },
      items: [
        { group: 'data', icon: 'shield', title: { en: 'Filter in the database', fr: 'Filtrer dans la base' },
          body: { en: 'Row-level security applies the tenant filter even when a query forgets it.', fr: 'La sécurité au niveau ligne applique le filtre même quand une requête l\'oublie.' },
          bullets: [
            { en: 'The session sets the tenant; the policy does the rest', fr: 'La session pose le tenant ; la politique fait le reste' },
            { en: 'One connection role that cannot bypass the policy', fr: 'Un rôle de connexion incapable de contourner la politique' },
            { en: 'Application-level filtering alone will fail on the query somebody wrote at 6pm', fr: 'Le filtrage applicatif seul cédera sur la requête écrite un soir à 18 h' }
          ] },
        { group: 'platform', icon: 'bug', title: { en: 'A leak test in CI', fr: 'Un test de fuite en CI' },
          body: { en: 'Two tenants, one fixture, every endpoint called as the wrong one.', fr: 'Deux tenants, un jeu de données, chaque endpoint appelé au nom du mauvais.' },
          bullets: [
            { en: 'Expect 403 or 404, never 200 with an empty list — that hides a filter that half works', fr: 'Attends un 403 ou un 404, jamais un 200 avec une liste vide — cela masque un filtre à moitié bon' },
            { en: 'Run it on every endpoint automatically, including the ones added last week', fr: 'Lance-le sur chaque endpoint automatiquement, y compris ceux ajoutés la semaine dernière' }
          ] },
        { group: 'tenancy', icon: 'key', title: { en: 'Per-tenant encryption', fr: 'Chiffrement par tenant' },
          body: { en: 'A key per tenant turns "delete my data" into "destroy one key".', fr: 'Une clé par tenant transforme « supprime mes données » en « détruis une clé ».' },
          bullets: [
            { en: 'Worth it when contracts mention crypto-shredding or key custody', fr: 'Utile quand les contrats parlent d\'effacement cryptographique ou de garde des clés' },
            { en: 'Costly on search and analytics — decide before you index, not after', fr: 'Coûteux pour la recherche et l\'analytique — décide avant d\'indexer, pas après' }
          ] },
        { group: 'app', icon: 'chart', title: { en: 'Quotas and the noisy neighbour', fr: 'Quotas et voisin bruyant' },
          body: { en: 'In a pool model, one tenant\'s bulk import is every other tenant\'s outage.', fr: 'En modèle pool, l\'import massif d\'un tenant est la panne de tous les autres.' },
          bullets: [
            { en: 'Rate limits per tenant at the gateway', fr: 'Limitation de débit par tenant à la passerelle' },
            { en: 'Bounded worker concurrency per tenant, with a separate lane for bulk work', fr: 'Concurrence de workers bornée par tenant, avec une voie séparée pour le travail massif' },
            { en: 'Alert on p95 latency per tenant, not globally', fr: 'Alerte sur la latence p95 par tenant, pas globalement' }
          ] },
        { group: 'tenancy', icon: 'eye', title: { en: 'Impersonation, on the record', fr: 'Usurpation, tracée' },
          body: { en: 'Support needs to see what the customer sees. The customer needs to know when they did.', fr: 'Le support doit voir ce que voit le client. Le client doit savoir quand cela a eu lieu.' },
          bullets: [
            { en: 'A reason required before the session starts, and a hard time limit', fr: 'Un motif exigé avant l\'ouverture de session, et une limite de durée stricte' },
            { en: 'Visible in the tenant\'s own audit log — not only in yours', fr: 'Visible dans le journal d\'audit du tenant — pas seulement dans le tien' }
          ] },
        { group: 'data', icon: 'save', title: { en: 'Restoring one tenant', fr: 'Restaurer un seul tenant' },
          body: { en: 'The question nobody asks until a customer deletes a year of work.', fr: 'La question que personne ne pose avant qu\'un client n\'efface un an de travail.' },
          bullets: [
            { en: 'In a pool model this is an export-and-replay exercise, not a snapshot restore', fr: 'En modèle pool, c\'est un export-rejeu, pas une restauration d\'instantané' },
            { en: 'Rehearse it once. The rehearsal is what tells you whether you can promise it', fr: 'Répète-la une fois. C\'est la répétition qui dit si tu peux le promettre' }
          ] }
      ]
    },
    {
      id: 'at-scale', tab: { en: 'At scale', fr: 'À l\'échelle' }, type: 'table',
      title: { en: 'What breaks as you grow', fr: 'Ce qui casse à l\'échelle' },
      subtitle: {
        en: 'Each of these arrives with a customer, not with a date. The threshold column is what to watch.',
        fr: 'Chacun arrive avec un client, pas avec une date. La colonne seuil est ce qu\'il faut surveiller.'
      },
      columns: [
        { label: { en: 'Symptom', fr: 'Symptôme' }, width: '26%' },
        { label: { en: 'Threshold', fr: 'Seuil' }, width: '30%' },
        { label: { en: 'Countermeasure', fr: 'Parade' } }
      ],
      rows: [
        [{ en: 'One tenant dominates the data volume', fr: 'Un tenant domine le volume de données' },
         { en: 'The largest tenant holds more than a fifth of the rows', fr: 'Le plus gros tenant détient plus d\'un cinquième des lignes' },
         { en: 'Partition by tenant, or move that one to its own database and keep the code identical', fr: 'Partitionne par tenant, ou déplace celui-là dans sa propre base en gardant le code identique' }],
        [{ en: 'Queries get slower for everyone at once', fr: 'Les requêtes ralentissent pour tout le monde en même temps' },
         { en: 'Any index whose leading column is not the tenant id', fr: 'Tout index dont la colonne de tête n\'est pas l\'identifiant de tenant' },
         { en: 'Tenant id first in every composite index — this is the single highest-value fix', fr: 'Identifiant de tenant en tête de chaque index composite — le correctif le plus rentable' }],
        [{ en: 'A bulk import blocks the product', fr: 'Un import massif bloque le produit' },
         { en: 'Any single tenant holding more than half the worker capacity', fr: 'Un tenant occupant plus de la moitié de la capacité des workers' },
         { en: 'A separate queue for bulk work, with its own concurrency budget', fr: 'Une file séparée pour le travail massif, avec son propre budget de concurrence' }],
        [{ en: 'Migrations take longer than the deploy window', fr: 'Les migrations dépassent la fenêtre de déploiement' },
         { en: 'Any migration that rewrites a table above a few million rows', fr: 'Toute migration qui réécrit une table de plusieurs millions de lignes' },
         { en: 'Additive migrations plus a backfill job — never a blocking rewrite', fr: 'Migrations additives plus une tâche de remplissage — jamais une réécriture bloquante' }],
        [{ en: 'Enterprise deals stall on security review', fr: 'Les contrats entreprise bloquent en revue de sécurité' },
         { en: 'The third prospect asking for SSO, SCIM and an audit export', fr: 'Le troisième prospect qui demande SSO, SCIM et un export d\'audit' },
         { en: 'Build the three of them once, deliberately — they are a product feature, not a favour', fr: 'Construis les trois une fois, délibérément — c\'est une fonctionnalité produit, pas une faveur' }],
        [{ en: 'Support cannot answer "is it slow for us?"', fr: 'Le support ne sait pas répondre à « c\'est lent chez nous ? »' },
         { en: 'The first time a customer reports what your dashboards do not show', fr: 'La première fois qu\'un client signale ce que tes tableaux de bord ne montrent pas' },
         { en: 'Tenant id as a dimension on every metric, and a per-tenant view in the admin console', fr: 'Identifiant de tenant en dimension sur chaque métrique, et une vue par tenant dans la console' }]
      ]
    },
    {
      id: 'growth', tab: { en: 'Growth', fr: 'Croissance' }, type: 'timeline',
      title: { en: 'From the first customer to the hundredth', fr: 'Du premier client au centième' },
      subtitle: {
        en: 'Three stages. What changes at each one is smaller than teams fear, provided the tenant id was in the right place from the start.',
        fr: 'Trois paliers. Ce qui change à chacun est plus petit qu\'on ne le craint, à condition que l\'identifiant de tenant ait été au bon endroit dès le départ.'
      },
      lineTitle: { en: 'Stages', fr: 'Paliers' },
      items: [
        { group: 'front', period: { en: '1 to 5 customers', fr: '1 à 5 clients' },
          title: { en: 'Multi-tenant in shape, manual in practice', fr: 'Multi-tenant dans la forme, manuel en pratique' },
          bullets: [
            { en: 'Tenant id in every table and every key from the first migration', fr: 'Identifiant de tenant dans chaque table et chaque clé dès la première migration' },
            { en: 'Onboarding by hand is fine — write down each step as you do it', fr: 'L\'onboarding manuel convient — note chaque étape en la faisant' },
            { en: 'No SSO yet. Email and password will not lose you these deals', fr: 'Pas encore de SSO. Email et mot de passe ne te feront pas perdre ces contrats' }
          ] },
        { group: 'tenancy', period: { en: '5 to 30 customers', fr: '5 à 30 clients' },
          title: { en: 'Make it repeatable', fr: 'Rendre reproductible' },
          bullets: [
            { en: 'Provisioning becomes a workflow; the written steps become code', fr: 'Le provisionnement devient un workflow ; les étapes écrites deviennent du code' },
            { en: 'SSO, SCIM and the audit log ship — three deals will have asked', fr: 'SSO, SCIM et journal d\'audit sont livrés — trois contrats les auront demandés' },
            { en: 'Row-level security and the leak test go in before the codebase gets large', fr: 'La sécurité au niveau ligne et le test de fuite arrivent avant que la base de code ne grossisse' }
          ] },
        { group: 'data', period: { en: '30 to 100 customers', fr: '30 à 100 clients' },
          title: { en: 'Manage the outliers', fr: 'Gérer les cas extrêmes' },
          bullets: [
            { en: 'Two or three tenants now behave nothing like the others — measure them separately', fr: 'Deux ou trois tenants ne ressemblent plus du tout aux autres — mesure-les séparément' },
            { en: 'Quotas and separate lanes stop one customer from being everyone\'s incident', fr: 'Quotas et voies séparées empêchent un client de devenir l\'incident de tous' },
            { en: 'The largest tenant may move to its own database, on the same code', fr: 'Le plus gros tenant peut passer dans sa propre base, avec le même code' }
          ] }
      ],
      aside: [
        { group: 'platform', title: { en: 'The decision you cannot defer', fr: 'La décision qu\'on ne peut pas repousser' },
          body: { en: 'Everything on this timeline can be added later except one thing: the tenant id in the primary key of every table. Retrofitting it into a live schema means rewriting every table and every index, under load, with customers watching. Put it there on day one even if you only have one customer.', fr: 'Tout ce qui figure sur cette frise peut être ajouté plus tard, sauf une chose : l\'identifiant de tenant dans la clé primaire de chaque table. Le rétro-ajouter dans un schéma vivant, c\'est réécrire chaque table et chaque index, sous charge, avec des clients qui regardent. Mets-le dès le premier jour, même avec un seul client.' } }
      ]
    }
  ]
};
