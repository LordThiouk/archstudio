/* T6 — Multi-service architecture. */

import { cloudOf, techOf } from './services';
import type { Template } from './types';

export const multiService: Template = {
  id: 'multi-service',
  name: { en: 'Multi-service architecture', fr: 'Architecture multi-services' },
  tagline: {
    en: 'Several teams, several services, each owning its own data.',
    fr: 'Plusieurs équipes, plusieurs services, chacun propriétaire de ses données.'
  },
  intro: {
    en: 'Services are a way of splitting an organisation, not a way of splitting code. The diagram makes the one rule visible that prose never does: no arrow runs from a service to another service\'s database.',
    fr: 'Les services découpent une organisation, pas du code. Le diagramme rend visible la règle que le texte ne montre jamais : aucune flèche ne va d\'un service vers la base d\'un autre.'
  },
  icon: 'hub',
  accent: '#0E7490',
  accentDark: '#3AA8C0',
  supportedTargets: ['agnostic', 'aws', 'gcp', 'azure', 'selfhosted'],

  whenToUse: [
    { en: 'Several teams that must ship independently', fr: 'Plusieurs équipes qui doivent livrer indépendamment' },
    { en: 'Domains with very different load or availability profiles', fr: 'Des domaines aux profils de charge ou de disponibilité très différents' },
    { en: 'An organisation able to operate several deployments a day', fr: 'Une organisation capable d\'opérer plusieurs déploiements par jour' },
    { en: 'Boundaries that have already proved stable inside a monolith', fr: 'Des frontières déjà éprouvées comme stables dans un monolithe' }
  ],
  whenNotToUse: [
    { en: 'Fewer than three teams — coordination cost exceeds the gain', fr: 'Moins de trois équipes — le coût de coordination dépasse le gain' },
    { en: 'No distributed tracing and no per-service CI yet', fr: 'Pas encore de traçabilité distribuée ni de CI par service' },
    { en: 'Domain boundaries still unstable — splitting early freezes the wrong lines', fr: 'Frontières de domaine encore instables — découper trop tôt fige les mauvaises lignes' }
  ],

  groups: [
    { id: 'edge', name: { en: 'Edge', fr: 'Edge' }, short: { en: 'Edge', fr: 'Edge' },
      description: { en: 'One way in, whatever is behind it.', fr: 'Une seule entrée, quoi qu\'il y ait derrière.' } },
    { id: 'services', name: { en: 'Business services', fr: 'Services métier' }, short: { en: 'Services', fr: 'Services' },
      description: { en: 'One team, one deployment, one bounded context each.', fr: 'Une équipe, un déploiement, un contexte délimité chacun.' } },
    { id: 'data', name: { en: 'Data per service', fr: 'Données par service' }, short: { en: 'Data', fr: 'Données' },
      description: { en: 'Private by construction. This is the rule the diagram exists to show.', fr: 'Privées par construction. C\'est la règle que ce diagramme existe pour montrer.' } },
    { id: 'platform', name: { en: 'Platform', fr: 'Plateforme' }, short: { en: 'Platform', fr: 'Plateforme' },
      description: { en: 'What every team shares so no team builds it twice.', fr: 'Ce que toutes les équipes partagent pour qu\'aucune ne le construise deux fois.' } }
  ],

  layers: [
    { id: 'clients', name: { en: 'Clients', fr: 'Clients' }, desc: { en: 'Web · Mobile · Partners', fr: 'Web · Mobile · Partenaires' } },
    { id: 'edge', name: { en: 'Edge & gateway', fr: 'Edge & passerelle' }, desc: { en: 'CDN · BFF · Service mesh', fr: 'CDN · BFF · Maillage' } },
    { id: 'services', name: { en: 'Services', fr: 'Services' }, desc: { en: 'Five bounded contexts and the bus between them', fr: 'Cinq contextes délimités et le bus entre eux' } },
    { id: 'data', name: { en: 'Data', fr: 'Données' }, desc: { en: 'One store per service', fr: 'Une base par service' } },
    { id: 'platform', name: { en: 'Platform', fr: 'Plateforme' }, desc: { en: 'Supports everything above', fr: 'Supporte tout ce qui précède' } }
  ],

  components: [
    {
      id: 'clients', name: { en: 'Client applications', fr: 'Applications clientes' },
      group: 'edge', layer: 'clients', icon: 'web',
      tech: ['Web', 'Mobile'],
      role: { en: 'Web, mobile and partner integrations. None of them know a service exists.', fr: 'Web, mobile et intégrations partenaires. Aucun ne sait qu\'un service existe.' },
      features: [
        { en: 'One API to call, whatever happens behind it', fr: 'Une seule API à appeler, quoi qu\'il se passe derrière' },
        { en: 'A service split must be invisible from here', fr: 'Un découpage de service doit être invisible d\'ici' }
      ],
      notes: [
        { en: 'Vendor-neutral on every target.', fr: 'Agnostique sur toutes les cibles.' }
      ],
      deps: ['cdn']
    },
    {
      id: 'cdn', name: { en: 'CDN & WAF', fr: 'CDN & WAF' },
      group: 'edge', layer: 'edge', icon: 'globe',
      tech: ['CDN', 'WAF'],
      role: { en: 'Static assets, TLS and the first line of filtering.', fr: 'Fichiers statiques, TLS et première ligne de filtrage.' },
      features: [
        { en: 'Managed rules against the common attack classes', fr: 'Règles managées contre les classes d\'attaques courantes' },
        { en: 'Caches what is public, forwards the rest untouched', fr: 'Cache ce qui est public, transmet le reste tel quel' }
      ],
      deps: ['bff'],
      /* Self-hosting means the same reverse proxy serves assets and routes the
       * API. There is no distinct edge tier to describe. */
      cloud: {
        ...cloudOf('cdn', {
          aws: { name: 'CloudFront + AWS WAF', tech: ['CloudFront', 'AWS WAF'] },
          gcp: { name: 'Cloud CDN + Cloud Armor', tech: ['Cloud CDN', 'Cloud Armor'] },
          azure: { name: 'Front Door + Azure WAF', tech: ['Front Door', 'Azure WAF'] }
        }),
        selfhosted: { omit: true }
      }
    },
    {
      id: 'bff', name: { en: 'BFF / gateway', fr: 'BFF / passerelle' },
      group: 'edge', layer: 'edge', icon: 'plug',
      tech: ['API gateway', 'Aggregation'],
      role: { en: 'One public contract. Aggregates several services into one client response.', fr: 'Un seul contrat public. Agrège plusieurs services en une réponse client.' },
      features: [
        { en: 'Authentication and rate limiting once, at the edge', fr: 'Authentification et limitation de débit une seule fois, en périphérie' },
        { en: 'Fans out to services in parallel, with a timeout on each', fr: 'Appelle les services en parallèle, avec un timeout sur chacun' },
        { en: 'Degrades to a partial response rather than failing whole', fr: 'Dégrade en réponse partielle plutôt que d\'échouer entièrement' }
      ],
      notes: [
        { en: 'The gateway must not hold business logic. When it starts to, it becomes a distributed monolith with extra latency.', fr: 'La passerelle ne doit pas porter de logique métier. Quand elle commence à le faire, elle devient un monolithe distribué avec de la latence en plus.' }
      ],
      deps: ['svc-identity', 'svc-catalog', 'svc-order'],
      cloud: cloudOf('apiGateway')
    },
    {
      id: 'mesh', name: { en: 'Service mesh', fr: 'Maillage de services' },
      group: 'edge', layer: 'edge', icon: 'hub',
      tech: ['Istio', 'Linkerd', 'mTLS'],
      role: { en: 'Mutual TLS, retries and timeouts as infrastructure rather than as library code.', fr: 'TLS mutuel, retentatives et timeouts en infrastructure plutôt qu\'en bibliothèque.' },
      features: [
        { en: 'Encrypted service-to-service traffic without touching applications', fr: 'Trafic inter-services chiffré sans toucher aux applications' },
        { en: 'Consistent timeout and retry policy, enforced outside the code', fr: 'Politique de timeout et de retentative cohérente, appliquée hors du code' },
        { en: 'Traffic shifting for canary releases', fr: 'Bascule de trafic pour les déploiements canari' }
      ],
      notes: [
        { en: 'Vendor-neutral, and genuinely optional below about ten services. A mesh is an operational commitment, not a free upgrade.', fr: 'Agnostique, et réellement optionnel en dessous d\'une dizaine de services. Un maillage est un engagement d\'exploitation, pas une amélioration gratuite.' }
      ]
    },
    {
      id: 'svc-identity', name: { en: 'Service — identity', fr: 'Service — identité' },
      group: 'services', layer: 'services', icon: 'lock',
      tech: ['Container'],
      role: { en: 'Accounts, sessions and permissions. Everyone depends on it, so it must never be down.', fr: 'Comptes, sessions et droits. Tout le monde en dépend, donc il ne doit jamais tomber.' },
      features: [
        { en: 'Issues tokens the others validate without calling back', fr: 'Émet des jetons que les autres valident sans le rappeler' },
        { en: 'The highest availability requirement of the five', fr: 'L\'exigence de disponibilité la plus élevée des cinq' }
      ],
      deps: ['db-identity', 'bus'],
      cloud: techOf('containers', { aws: { tech: ['ECS Fargate', 'EKS'] } })
    },
    {
      id: 'svc-catalog', name: { en: 'Service — catalogue', fr: 'Service — catalogue' },
      group: 'services', layer: 'services', icon: 'box',
      tech: ['Container'],
      role: { en: 'Products, prices and availability. Read-heavy, write-light.', fr: 'Produits, prix et disponibilité. Beaucoup de lectures, peu d\'écritures.' },
      features: [
        { en: 'Its load profile is nothing like the others — this is why it is its own service', fr: 'Son profil de charge n\'a rien à voir avec les autres — c\'est pourquoi c\'est un service à part' },
        { en: 'Cached aggressively, invalidated by its own events', fr: 'Fortement caché, invalidé par ses propres événements' }
      ],
      deps: ['db-catalog', 'cache', 'bus'],
      cloud: techOf('containers', { aws: { tech: ['ECS Fargate', 'EKS'] } })
    },
    {
      id: 'svc-order', name: { en: 'Service — orders', fr: 'Service — commandes' },
      group: 'services', layer: 'services', icon: 'card',
      tech: ['Container'],
      role: { en: 'The order lifecycle, and the only service allowed to change it.', fr: 'Le cycle de vie d\'une commande, et le seul service autorisé à le modifier.' },
      features: [
        { en: 'Calls the catalogue synchronously to price an order', fr: 'Appelle le catalogue en synchrone pour valoriser une commande' },
        { en: 'Publishes an event instead of calling billing and notifications', fr: 'Publie un événement au lieu d\'appeler la facturation et les notifications' },
        { en: 'Compensates rather than rolls back — there is no distributed transaction', fr: 'Compense plutôt qu\'annule — il n\'y a pas de transaction distribuée' }
      ],
      deps: ['db-order', 'svc-catalog', 'bus'],
      cloud: techOf('containers', { aws: { tech: ['ECS Fargate', 'EKS'] } })
    },
    {
      id: 'svc-billing', name: { en: 'Service — billing', fr: 'Service — facturation' },
      group: 'services', layer: 'services', icon: 'chart',
      tech: ['Container'],
      role: { en: 'Turns orders into invoices, on its own schedule.', fr: 'Transforme les commandes en factures, à son propre rythme.' },
      features: [
        { en: 'Reacts to order events; never queries the order service directly', fr: 'Réagit aux événements de commande ; n\'interroge jamais le service commandes directement' },
        { en: 'Keeps the copy of order data it needs — duplication is the price of independence', fr: 'Garde la copie des données de commande dont il a besoin — la duplication est le prix de l\'indépendance' }
      ],
      notes: [
        { en: 'A real billing service owns a store of its own; it is left off this diagram to keep the data layer readable. What it must never do is read the order database.', fr: 'Un vrai service de facturation possède sa propre base ; elle est absente de ce diagramme pour garder la couche données lisible. Ce qu\'il ne doit jamais faire, c\'est lire la base des commandes.' }
      ],
      deps: ['bus'],
      cloud: techOf('containers', { aws: { tech: ['ECS Fargate', 'EKS'] } })
    },
    {
      id: 'svc-notify', name: { en: 'Service — notifications', fr: 'Service — notifications' },
      group: 'services', layer: 'services', icon: 'bell',
      tech: ['Container'],
      role: { en: 'Email, push and webhooks, driven entirely by events.', fr: 'Emails, push et webhooks, pilotés entièrement par événements.' },
      features: [
        { en: 'The easiest service to extract first — no synchronous caller, no shared data', fr: 'Le service le plus facile à extraire en premier — aucun appelant synchrone, aucune donnée partagée' },
        { en: 'Idempotent, because a duplicate here is visible to the customer', fr: 'Idempotent, parce qu\'un doublon ici est visible par le client' }
      ],
      deps: ['bus'],
      cloud: techOf('containers', { aws: { tech: ['ECS Fargate', 'EKS'] } })
    },
    {
      id: 'bus', name: { en: 'Inter-service bus', fr: 'Bus inter-services' },
      group: 'services', layer: 'services', icon: 'route',
      tech: ['Events', 'DLQ'],
      role: { en: 'How services tell each other things without knowing each other.', fr: 'Comment les services se disent des choses sans se connaître.' },
      features: [
        { en: 'Versioned event contracts, checked in CI', fr: 'Contrats d\'événements versionnés, vérifiés en intégration continue' },
        { en: 'One subscription per consumer, each with its own dead-letter queue', fr: 'Un abonnement par consommateur, chacun avec sa file de rebut' },
        { en: 'Adding a consumer changes nothing on the producer — the point of the whole thing', fr: 'Ajouter un consommateur ne change rien chez le producteur — tout l\'intérêt de la chose' }
      ],
      cloud: cloudOf('pubsub', {
        aws: { name: 'EventBridge + SQS', tech: ['EventBridge', 'SQS'] },
        azure: { name: 'Service Bus + Event Grid', tech: ['Service Bus', 'Event Grid'] }
      })
    },
    {
      id: 'db-identity', name: { en: 'Store — identity', fr: 'Base — identité' },
      group: 'data', layer: 'data', icon: 'db',
      tech: ['PostgreSQL'],
      role: { en: 'Private to the identity service. No other service has credentials for it.', fr: 'Privée au service identité. Aucun autre service n\'en a les identifiants.' },
      features: [
        { en: 'Relational, because accounts and permissions are relational', fr: 'Relationnelle, parce que comptes et droits le sont' },
        { en: 'Credentials scoped to one service, enforced by the platform', fr: 'Identifiants limités à un seul service, garantis par la plateforme' }
      ],
      cloud: techOf('sql', { aws: { tech: ['RDS', 'PostgreSQL'] } })
    },
    {
      id: 'db-catalog', name: { en: 'Store — catalogue', fr: 'Base — catalogue' },
      group: 'data', layer: 'data', icon: 'db',
      tech: ['Document store'],
      role: { en: 'Private to the catalogue service, and shaped for reads.', fr: 'Privée au service catalogue, et façonnée pour la lecture.' },
      features: [
        { en: 'Denormalised on purpose — a product page is one read', fr: 'Dénormalisée exprès — une fiche produit est une seule lecture' },
        { en: 'A different database engine from its neighbours, and that is allowed', fr: 'Un moteur différent de ses voisines, et c\'est permis' }
      ],
      cloud: techOf('nosql')
    },
    {
      id: 'db-order', name: { en: 'Store — orders', fr: 'Base — commandes' },
      group: 'data', layer: 'data', icon: 'db',
      tech: ['PostgreSQL'],
      role: { en: 'Private to the order service. The one place order state is true.', fr: 'Privée au service commandes. Le seul endroit où l\'état d\'une commande est vrai.' },
      features: [
        { en: 'Strong consistency inside the service boundary', fr: 'Cohérence forte à l\'intérieur de la frontière du service' },
        { en: 'The outbox table lives here, so events cannot be lost', fr: 'La table outbox vit ici, pour que les événements ne se perdent pas' }
      ],
      cloud: techOf('sql')
    },
    {
      id: 'cache', name: { en: 'Shared cache', fr: 'Cache partagé' },
      group: 'data', layer: 'data', icon: 'bolt',
      tech: ['Key-value'],
      role: { en: 'Shared infrastructure, strictly separate namespaces.', fr: 'Infrastructure partagée, espaces de noms strictement séparés.' },
      features: [
        { en: 'One key prefix per service, and no service reads another\'s prefix', fr: 'Un préfixe de clé par service, et aucun service ne lit celui d\'un autre' },
        { en: 'Cache only what the service itself owns', fr: 'Ne cache que ce que le service possède lui-même' }
      ],
      notes: [
        { en: 'The one shared data component here, and the one most likely to erode the boundary rule. Give each service its own instance the day a prefix collision costs you an incident.', fr: 'Le seul composant de données partagé, et le plus susceptible d\'éroder la règle de frontière. Donne une instance par service le jour où une collision de préfixe coûte un incident.' }
      ],
      cloud: cloudOf('cache')
    },
    {
      id: 'registry', name: { en: 'Image registry', fr: 'Registre d\'images' },
      group: 'platform', layer: 'platform', icon: 'docker',
      tech: ['OCI', 'Scanning'],
      role: { en: 'Where every service\'s build artefact lives, scanned and signed.', fr: 'Où vit l\'artefact de build de chaque service, scanné et signé.' },
      features: [
        { en: 'Vulnerability scan on push, blocking on critical findings', fr: 'Scan de vulnérabilités au push, bloquant sur les critiques' },
        { en: 'Immutable tags — deploying "latest" is how you lose a rollback', fr: 'Tags immuables — déployer « latest » est la façon de perdre un rollback' }
      ],
      cloud: cloudOf('registry')
    },
    {
      id: 'platform', name: { en: 'Container platform', fr: 'Plateforme de conteneurs' },
      group: 'platform', layer: 'platform', icon: 'server',
      tech: ['Kubernetes'],
      role: { en: 'Where the services actually run, and the one thing every team shares.', fr: 'Là où les services tournent réellement, et la seule chose que toutes les équipes partagent.' },
      features: [
        { en: 'Namespace and quota per team', fr: 'Espace de noms et quota par équipe' },
        { en: 'Autoscaling per service, because the load profiles differ', fr: 'Mise à l\'échelle par service, puisque les profils de charge diffèrent' },
        { en: 'Someone owns this platform full time. If nobody does, that is the finding', fr: 'Quelqu\'un possède cette plateforme à plein temps. Si personne ne le fait, c\'est le constat' }
      ],
      cloud: cloudOf('kubernetes')
    },
    {
      id: 'config', name: { en: 'Configuration & secrets', fr: 'Configuration & secrets' },
      group: 'platform', layer: 'platform', icon: 'key',
      tech: ['Secrets', 'Config'],
      role: { en: 'Per-service credentials, so "private database" is enforced and not merely agreed.', fr: 'Identifiants par service, pour que « base privée » soit appliqué et pas seulement convenu.' },
      features: [
        { en: 'One identity per service, one set of credentials per store', fr: 'Une identité par service, un jeu d\'identifiants par base' },
        { en: 'Rotation without redeploying every service', fr: 'Rotation sans redéployer tous les services' }
      ],
      cloud: cloudOf('config')
    },
    {
      id: 'trace', name: { en: 'Distributed tracing', fr: 'Traçage distribué' },
      group: 'platform', layer: 'platform', icon: 'eye',
      tech: ['OpenTelemetry'],
      role: { en: 'The prerequisite, not the nice-to-have. Without it you cannot debug this drawing.', fr: 'Le prérequis, pas le confort. Sans lui, on ne peut pas déboguer ce schéma.' },
      features: [
        { en: 'Trace context propagated across HTTP calls and across the bus', fr: 'Contexte de trace propagé sur les appels HTTP et à travers le bus' },
        { en: 'One trace showing every hop of one customer request', fr: 'Une trace montrant chaque saut d\'une même requête client' },
        { en: 'Service-level objectives per service, owned by the team that runs it', fr: 'Objectifs de niveau de service par service, portés par l\'équipe qui l\'opère' }
      ],
      cloud: cloudOf('tracing')
    },
    {
      id: 'cicd', name: { en: 'CI/CD per service', fr: 'CI/CD par service' },
      group: 'platform', layer: 'platform', icon: 'git',
      tech: ['CI', 'GitOps'],
      role: { en: 'Each service ships on its own, or none of this was worth it.', fr: 'Chaque service livre seul, sinon rien de tout cela n\'en valait la peine.' },
      features: [
        { en: 'One pipeline per service, and no shared release train', fr: 'Un pipeline par service, et aucun train de release partagé' },
        { en: 'Contract tests between producer and consumer, run on both sides', fr: 'Tests de contrat entre producteur et consommateur, exécutés des deux côtés' },
        { en: 'Deploy state declared in git, reconciled continuously', fr: 'État de déploiement déclaré dans git, réconcilié en continu' }
      ],
      cloud: cloudOf('gitops')
    }
  ],

  flows: [
    {
      id: 'order-end-to-end',
      name: { en: 'An order, end to end', fr: 'Une commande de bout en bout' },
      group: 'services',
      sub: { en: 'Four services, two synchronous calls, three events', fr: 'Quatre services, deux appels synchrones, trois événements' },
      note: {
        en: '<b>Notice which calls are synchronous.</b> Only pricing has to happen before the customer gets an answer. Billing and notification are events, which is why a billing outage does not stop an order.',
        fr: '<b>Observe quels appels sont synchrones.</b> Seule la valorisation doit avoir lieu avant la réponse au client. Facturation et notification sont des événements, c\'est pourquoi une panne de facturation n\'arrête pas une commande.'
      },
      steps: [
        { component: 'clients', title: { en: 'Order submitted', fr: 'Commande soumise' },
          description: { en: 'One call to one API. The client knows nothing about services.', fr: 'Un seul appel vers une seule API. Le client ignore tout des services.' } },
        { component: 'cdn', title: { en: 'Filtered at the edge', fr: 'Filtré en périphérie' },
          description: { en: 'WAF rules applied before anything of yours runs.', fr: 'Règles WAF appliquées avant que ton code ne tourne.' } },
        { component: 'bff', title: { en: 'Authenticated and routed', fr: 'Authentifié et routé' },
          description: { en: 'The token is validated once, at the edge, and passed on.', fr: 'Le jeton est validé une fois, en périphérie, puis transmis.' } },
        { component: 'svc-order', title: { en: 'Order created', fr: 'Commande créée' },
          description: { en: 'The only service allowed to change order state.', fr: 'Le seul service autorisé à modifier l\'état d\'une commande.' } },
        { component: 'svc-catalog', title: { en: 'Priced', fr: 'Valorisée' },
          description: { en: 'A synchronous call with a timeout — the customer is waiting for this one.', fr: 'Un appel synchrone avec timeout — le client attend celui-là.' } },
        { component: 'db-order', title: { en: 'Persisted with its outbox', fr: 'Persistée avec son outbox' },
          description: { en: 'Order and event written in one transaction, in the service\'s own database.', fr: 'Commande et événement écrits dans une seule transaction, dans la base du service.' } },
        { component: 'bus', title: { en: 'Event published', fr: 'Événement publié' },
          description: { en: '"Order placed". The order service does not know who is listening.', fr: '« Commande passée ». Le service commandes ignore qui écoute.' } },
        { component: 'svc-billing', title: { en: 'Invoiced', fr: 'Facturée' },
          description: { en: 'On its own schedule. Its delay is invisible to the customer.', fr: 'À son propre rythme. Son délai est invisible pour le client.' } },
        { component: 'svc-notify', title: { en: 'Customer notified', fr: 'Client notifié' },
          description: { en: 'The same event, a second independent consumer, added without touching the producer.', fr: 'Le même événement, un deuxième consommateur indépendant, ajouté sans toucher au producteur.' } }
      ]
    },
    {
      id: 'partial-failure',
      name: { en: 'A partial failure', fr: 'Une défaillance partielle' },
      group: 'platform',
      sub: { en: 'Timeout → circuit breaker → degradation → compensation', fr: 'Timeout → disjoncteur → dégradation → compensation' },
      note: {
        en: '<b>This is the flow that justifies the architecture, or condemns it.</b> If a failure in one service takes the whole product down, you have a distributed monolith and all of the cost with none of the benefit.',
        fr: '<b>C\'est le flux qui justifie l\'architecture, ou la condamne.</b> Si la panne d\'un service fait tomber tout le produit, tu as un monolithe distribué : tout le coût, aucun des bénéfices.'
      },
      steps: [
        { component: 'svc-catalog', title: { en: 'The catalogue slows down', fr: 'Le catalogue ralentit' },
          description: { en: 'Its database is saturated. It does not fail — it answers late, which is worse.', fr: 'Sa base est saturée. Il n\'échoue pas — il répond tard, ce qui est pire.' } },
        { component: 'svc-order', title: { en: 'Timeout fires', fr: 'Le timeout se déclenche' },
          description: { en: 'A short, explicit deadline. No timeout means the caller fails with the callee.', fr: 'Une échéance courte et explicite. Sans timeout, l\'appelant tombe avec l\'appelé.' } },
        { component: 'mesh', title: { en: 'Circuit opens', fr: 'Le disjoncteur s\'ouvre' },
          description: { en: 'Calls stop being sent, giving the catalogue room to recover.', fr: 'Les appels cessent d\'être émis, laissant au catalogue de la place pour se rétablir.' } },
        { component: 'bff', title: { en: 'Degraded response', fr: 'Réponse dégradée' },
          description: { en: 'The page renders with cached prices and a visible notice, rather than an error.', fr: 'La page s\'affiche avec des prix en cache et un avertissement visible, plutôt qu\'une erreur.' } },
        { component: 'svc-order', title: { en: 'Compensation', fr: 'Compensation' },
          description: { en: 'Orders already accepted at an unconfirmed price are flagged for review, not silently kept.', fr: 'Les commandes acceptées à un prix non confirmé sont signalées pour revue, pas gardées en silence.' } },
        { component: 'trace', title: { en: 'One trace, one culprit', fr: 'Une trace, un coupable' },
          description: { en: 'The trace shows which hop was slow. Without it, four teams debug for an hour.', fr: 'La trace montre quel saut était lent. Sans elle, quatre équipes cherchent pendant une heure.' } }
      ]
    }
  ],

  sections: [
    {
      id: 'rules', tab: { en: 'Rules', fr: 'Règles' }, type: 'cards',
      title: { en: 'Boundary rules', fr: 'Règles de frontière' },
      subtitle: {
        en: 'Four rules. Break the first one and everything else on this page becomes decoration.',
        fr: 'Quatre règles. Enfreins la première et tout le reste de cette page devient décoratif.'
      },
      items: [
        { group: 'data', icon: 'db', title: { en: 'One store per service', fr: 'Une base par service' },
          body: { en: 'A service reads its own database and nobody else\'s. There is no exception worth the precedent.', fr: 'Un service lit sa base et celle de personne d\'autre. Aucune exception ne vaut le précédent.' },
          bullets: [
            { en: 'Enforced by credentials, not by agreement', fr: 'Appliqué par les identifiants, pas par accord' },
            { en: 'The read-only replica of a neighbour is the same violation, more politely dressed', fr: 'Le réplica en lecture seule du voisin est la même violation, mieux habillée' },
            { en: 'Need someone else\'s data? Subscribe to their events and keep your own copy', fr: 'Besoin des données d\'un autre ? Abonne-toi à ses événements et garde ta propre copie' }
          ] },
        { group: 'services', icon: 'route', title: { en: 'No distributed transaction', fr: 'Pas de transaction distribuée' },
          body: { en: 'Two services cannot commit together. Design the compensation instead of wishing they could.', fr: 'Deux services ne peuvent pas committer ensemble. Conçois la compensation plutôt que d\'espérer le contraire.' },
          bullets: [
            { en: 'Every step gets a compensating action, written at the same time', fr: 'Chaque étape reçoit une action de compensation, écrite en même temps' },
            { en: 'Eventual consistency is a product decision — the interface must say so', fr: 'La cohérence à terme est une décision produit — l\'interface doit le dire' },
            { en: 'If a business rule truly needs one transaction, those two services are one service', fr: 'Si une règle métier exige vraiment une transaction unique, ces deux services n\'en sont qu\'un' }
          ] },
        { group: 'services', icon: 'layers', title: { en: 'Versioned contracts', fr: 'Contrats versionnés' },
          body: { en: 'The API and the event schema are the product a service sells to its peers.', fr: 'L\'API et le schéma d\'événement sont le produit qu\'un service vend à ses pairs.' },
          bullets: [
            { en: 'Backward compatibility is mandatory; a breaking change means a new version, side by side', fr: 'La compatibilité ascendante est obligatoire ; un changement cassant impose une nouvelle version, côte à côte' },
            { en: 'Contract tests run in the consumer\'s pipeline and in the producer\'s', fr: 'Les tests de contrat s\'exécutent dans le pipeline du consommateur et dans celui du producteur' },
            { en: 'You may not know who your consumers are. Assume there is one more', fr: 'Tu peux ignorer qui sont tes consommateurs. Suppose qu\'il y en a un de plus' }
          ] },
        { group: 'edge', icon: 'shield', title: { en: 'The gateway stays thin', fr: 'La passerelle reste fine' },
          body: { en: 'Aggregation and authentication, never business rules.', fr: 'Agrégation et authentification, jamais de règles métier.' },
          bullets: [
            { en: 'A rule in the gateway is a rule five teams must coordinate to change', fr: 'Une règle dans la passerelle est une règle que cinq équipes doivent coordonner pour changer' },
            { en: 'Watch its deployment frequency: if it ships on every feature, the logic has migrated', fr: 'Surveille sa fréquence de déploiement : si elle livre à chaque fonctionnalité, la logique a migré' }
          ] }
      ]
    },
    {
      id: 'sync-or-event', tab: { en: 'Sync or event', fr: 'Sync ou événement' }, type: 'compare',
      title: { en: 'Synchronous call or event?', fr: 'Appel synchrone ou événement ?' },
      subtitle: {
        en: 'The decision you make dozens of times, usually by habit. One question settles most cases: does the caller need the answer to reply to its own caller?',
        fr: 'La décision qu\'on prend des dizaines de fois, le plus souvent par habitude. Une question tranche la majorité des cas : l\'appelant a-t-il besoin de la réponse pour répondre au sien ?'
      },
      columns: [
        { group: 'services', kicker: { en: 'Option A', fr: 'Option A' },
          title: { en: 'Synchronous call', fr: 'Appel synchrone' },
          short: { en: 'Sync', fr: 'Sync' },
          pitch: { en: 'Simple to reason about, simple to debug, and it couples availability.', fr: 'Simple à raisonner, simple à déboguer, et il couple la disponibilité.' },
          rows: [
            [{ en: 'Use when', fr: 'À utiliser quand' }, { en: 'The caller cannot answer without it', fr: 'L\'appelant ne peut pas répondre sans' }],
            [{ en: 'Failure', fr: 'Échec' }, { en: 'Propagates immediately, unless you catch it', fr: 'Se propage immédiatement, sauf à l\'attraper' }],
            [{ en: 'Availability', fr: 'Disponibilité' }, { en: '<b>Multiplied.</b> Two services at 99.9% give 99.8%', fr: '<b>Multipliée.</b> Deux services à 99,9 % donnent 99,8 %' }],
            [{ en: 'Debugging', fr: 'Débogage' }, { en: 'One trace, one stack, one culprit', fr: 'Une trace, une pile, un coupable' }]
          ],
          bullets: [
            { en: 'Always with a timeout, a retry budget and a fallback', fr: 'Toujours avec un timeout, un budget de retentatives et un repli' },
            { en: 'Two synchronous hops is a smell; three is a design to revisit', fr: 'Deux sauts synchrones est une odeur ; trois est une conception à revoir' }
          ] },
        { group: 'services', kicker: { en: 'Option B', fr: 'Option B' },
          title: { en: 'Event', fr: 'Événement' },
          short: { en: 'Event', fr: 'Événement' },
          pitch: { en: 'Independence between producer and consumer, paid for in debugging difficulty.', fr: 'Indépendance entre producteur et consommateur, payée en difficulté de débogage.' },
          rows: [
            [{ en: 'Use when', fr: 'À utiliser quand' }, { en: 'The consequence can happen a second later', fr: 'La conséquence peut arriver une seconde plus tard' }],
            [{ en: 'Failure', fr: 'Échec' }, { en: 'Contained: it retries, then dead-letters', fr: 'Contenu : il retente, puis part au rebut' }],
            [{ en: 'Availability', fr: 'Disponibilité' }, { en: '<b>Independent.</b> The consumer can be down for an hour', fr: '<b>Indépendante.</b> Le consommateur peut être absent une heure' }],
            [{ en: 'Debugging', fr: 'Débogage' }, { en: 'Needs tracing across the bus, or it is guesswork', fr: 'Exige un traçage à travers le bus, sinon c\'est de la divination' }]
          ],
          bullets: [
            { en: 'Adding a consumer costs the producer nothing — the main reason to choose this', fr: 'Ajouter un consommateur ne coûte rien au producteur — la raison principale de ce choix' },
            { en: 'Requires idempotent consumers, always', fr: 'Exige des consommateurs idempotents, toujours' }
          ] }
      ],
      table: {
        title: { en: 'Choosing between them', fr: 'Choisir entre les deux' },
        firstColumn: { en: 'Criterion', fr: 'Critère' },
        rows: [
          [{ en: 'Caller needs the result', fr: 'L\'appelant a besoin du résultat' }, { en: 'Yes', fr: 'Oui' }, { en: 'No', fr: 'Non' }],
          [{ en: 'Acceptable delay', fr: 'Délai acceptable' }, { en: 'Milliseconds', fr: 'Millisecondes' }, { en: 'Seconds to minutes', fr: 'Secondes à minutes' }],
          [{ en: 'Consumers', fr: 'Consommateurs' }, { en: 'One, known', fr: 'Un, connu' }, { en: 'Several, some not yet written', fr: 'Plusieurs, dont certains pas encore écrits' }],
          [{ en: 'Coupling introduced', fr: 'Couplage introduit' }, { en: 'Availability and latency', fr: 'Disponibilité et latence' }, { en: 'Schema only', fr: 'Schéma seulement' }],
          [{ en: 'Cost of a consumer outage', fr: 'Coût d\'une panne du consommateur' }, { en: 'The caller fails too', fr: 'L\'appelant échoue aussi' }, { en: 'A backlog that drains later', fr: 'Un retard qui se résorbe ensuite' }],
          [{ en: 'Operational burden', fr: 'Charge d\'exploitation' }, { en: 'Low', fr: 'Faible' }, { en: 'A bus, dead-letter queues, replay tooling', fr: 'Un bus, des files de rebut, un outillage de rejeu' }]
        ]
      },
      cards: [
        { group: 'edge', title: { en: 'The usual mistake', fr: 'L\'erreur habituelle' },
          bullets: [
            { en: 'Chaining three synchronous calls because each one alone looked harmless', fr: 'Enchaîner trois appels synchrones parce que chacun paraissait anodin isolément' },
            { en: 'The result is a request that fails if any of four services blinks', fr: 'Le résultat est une requête qui échoue si l\'un des quatre services cligne des yeux' }
          ],
          note: { en: 'Count the synchronous hops on your busiest endpoint. That number is your availability ceiling.', fr: 'Compte les sauts synchrones de ton endpoint le plus fréquenté. Ce nombre est ton plafond de disponibilité.' } }
      ]
    },
    {
      id: 'real-cost', tab: { en: 'Real cost', fr: 'Coût réel' }, type: 'table',
      title: { en: 'What you need in place before splitting', fr: 'Ce qu\'il faut avoir en place avant de découper' },
      subtitle: {
        en: 'None of this is optional, and none of it is visible on the diagram. Missing two rows of this table is the most common reason a service split fails.',
        fr: 'Rien de tout cela n\'est optionnel, et rien n\'apparaît sur le schéma. Deux lignes manquantes de cette table sont la première cause d\'échec d\'un découpage.'
      },
      columns: [
        { label: { en: 'Prerequisite', fr: 'Prérequis' }, width: '24%' },
        { label: { en: 'Why, concretely', fr: 'Pourquoi, concrètement' } },
        { label: { en: 'Ready when', fr: 'Prêt quand' }, width: '28%' }
      ],
      rows: [
        [{ en: 'CI per service', fr: 'CI par service' },
         { en: 'A shared release train removes the only benefit you were buying.', fr: 'Un train de release partagé supprime le seul bénéfice recherché.' },
         { en: 'Any service can go to production without asking another team', fr: 'N\'importe quel service peut aller en production sans demander à une autre équipe' }],
        [{ en: 'Distributed tracing', fr: 'Traçage distribué' },
         { en: 'Without it, a slow request is four teams saying "not us".', fr: 'Sans lui, une requête lente devient quatre équipes qui disent « pas nous ».' },
         { en: 'One customer request is visible as one trace, bus hops included', fr: 'Une requête client est visible comme une seule trace, sauts de bus compris' }],
        [{ en: 'Image registry and platform', fr: 'Registre d\'images et plateforme' },
         { en: 'Each team deploying its own way multiplies the operating manual by five.', fr: 'Chaque équipe déployant à sa façon multiplie le manuel d\'exploitation par cinq.' },
         { en: 'A new service is running in production within a day, from a template', fr: 'Un nouveau service tourne en production en un jour, depuis un gabarit' }],
        [{ en: 'On-call rota per service', fr: 'Astreinte par service' },
         { en: 'A service nobody is woken for is a service nobody fixes.', fr: 'Un service pour lequel personne n\'est réveillé est un service que personne ne répare.' },
         { en: 'Every service has a named owner and a documented escalation path', fr: 'Chaque service a un propriétaire nommé et une escalade documentée' }],
        [{ en: 'Contract tests', fr: 'Tests de contrat' },
         { en: 'The alternative is finding a breaking change in production, on someone else\'s deploy.', fr: 'L\'alternative est de découvrir un changement cassant en production, au déploiement de quelqu\'un d\'autre.' },
         { en: 'A producer\'s pipeline fails when it breaks a known consumer', fr: 'Le pipeline d\'un producteur échoue quand il casse un consommateur connu' }],
        [{ en: 'Stable domain boundaries', fr: 'Frontières de domaine stables' },
         { en: 'Moving a boundary between services costs a hundred times what moving it inside a monolith costs.', fr: 'Déplacer une frontière entre services coûte cent fois ce que coûte le même déplacement dans un monolithe.' },
         { en: 'The boundary has survived six months of features without moving', fr: 'La frontière a survécu six mois de fonctionnalités sans bouger' }]
      ]
    },
    {
      id: 'resilience', tab: { en: 'Resilience', fr: 'Résilience' }, type: 'cards',
      title: { en: 'Resilience', fr: 'Résilience' },
      subtitle: {
        en: 'In one process, a failed call is an exception. Across the network it is a timeout, a retry, a duplicate and a half-finished business transaction.',
        fr: 'Dans un processus, un appel échoué est une exception. Sur le réseau, c\'est un timeout, une retentative, un doublon et une transaction métier à moitié terminée.'
      },
      items: [
        { group: 'services', icon: 'clock', title: { en: 'Timeouts', fr: 'Timeouts' },
          body: { en: 'A call with no deadline waits as long as the network lets it — which can be minutes.', fr: 'Un appel sans échéance attend aussi longtemps que le réseau le permet — cela peut durer des minutes.' },
          bullets: [
            { en: 'Set below the caller\'s own deadline, so it can still answer', fr: 'À régler en dessous de l\'échéance de l\'appelant, pour qu\'il puisse encore répondre' },
            { en: 'The default in most HTTP clients is "forever". Check yours', fr: 'Le défaut de la plupart des clients HTTP est « indéfiniment ». Vérifie le tien' }
          ] },
        { group: 'services', icon: 'route', title: { en: 'Retries with jitter', fr: 'Retentatives avec gigue' },
          body: { en: 'Retrying is how a small failure becomes a large one.', fr: 'La retentative est la façon dont une petite panne en devient une grande.' },
          bullets: [
            { en: 'Exponential backoff, plus jitter so clients do not synchronise', fr: 'Temporisation exponentielle, plus une gigue pour que les clients ne se synchronisent pas' },
            { en: 'A retry budget across the whole call chain, not per hop', fr: 'Un budget de retentatives pour toute la chaîne d\'appels, pas par saut' },
            { en: 'Never retry a non-idempotent write without an idempotency key', fr: 'Ne retente jamais une écriture non idempotente sans clé d\'idempotence' }
          ] },
        { group: 'edge', icon: 'alert', title: { en: 'Circuit breakers', fr: 'Disjoncteurs' },
          body: { en: 'Stop calling a service that is already failing. It needs the quiet to recover.', fr: 'Cesse d\'appeler un service déjà en échec. Il a besoin de calme pour se rétablir.' },
          bullets: [
            { en: 'Opens on an error rate, half-opens to test, closes on success', fr: 'S\'ouvre sur un taux d\'erreur, se rouvre à moitié pour tester, se referme au succès' },
            { en: 'Requires a defined fallback — an open circuit with no fallback is just a faster error', fr: 'Exige un repli défini — un disjoncteur ouvert sans repli n\'est qu\'une erreur plus rapide' }
          ] },
        { group: 'platform', icon: 'shield', title: { en: 'Bulkheads', fr: 'Cloisonnement' },
          body: { en: 'One slow dependency must not consume every thread or connection you have.', fr: 'Une dépendance lente ne doit pas consommer tous tes fils d\'exécution ou toutes tes connexions.' },
          bullets: [
            { en: 'A separate connection pool per downstream dependency', fr: 'Un pool de connexions séparé par dépendance en aval' },
            { en: 'Bounded queues, so backpressure is visible instead of memory quietly filling', fr: 'Files bornées, pour que la contre-pression soit visible plutôt que la mémoire se remplisse en silence' }
          ] },
        { group: 'edge', icon: 'eye', title: { en: 'Graceful degradation', fr: 'Dégradation gracieuse' },
          body: { en: 'Decide in advance what the product looks like without each service.', fr: 'Décide à l\'avance à quoi ressemble le produit sans chacun des services.' },
          bullets: [
            { en: 'Catalogue down: cached prices, with a visible notice', fr: 'Catalogue indisponible : prix en cache, avec un avertissement visible' },
            { en: 'Notifications down: nothing visible, the backlog drains later', fr: 'Notifications indisponibles : rien de visible, le retard se résorbe ensuite' },
            { en: 'Identity down: nothing works, which is why it gets the highest availability budget', fr: 'Identité indisponible : plus rien ne marche, d\'où son budget de disponibilité le plus élevé' }
          ] },
        { group: 'services', icon: 'bug', title: { en: 'Rehearse the failure', fr: 'Répéter la panne' },
          body: { en: 'Every mitigation above is a hypothesis until it has been tested with the service actually stopped.', fr: 'Chaque parade ci-dessus est une hypothèse tant qu\'elle n\'a pas été testée service réellement arrêté.' },
          bullets: [
            { en: 'Stop one service in staging, on purpose, on a schedule', fr: 'Arrête un service en préproduction, exprès, périodiquement' },
            { en: 'Check that the degradation is the one you designed, not the one you got', fr: 'Vérifie que la dégradation est celle que tu as conçue, pas celle que tu as obtenue' }
          ] }
      ]
    }
  ]
};
