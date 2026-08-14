/* T1 — A startup's serverless MVP. */

import { cloudOf } from './services';
import type { Template } from './types';

export const serverlessMvp: Template = {
  id: 'serverless-mvp',
  name: { en: 'Serverless MVP', fr: 'MVP serverless' },
  tagline: {
    en: 'Ship in six weeks with two people and no servers to babysit.',
    fr: 'Livrer en six semaines, à deux, sans serveur à surveiller.'
  },
  intro: {
    en: 'Everything scales to zero and back up on its own. You trade unit cost and portability for the thing a young product needs most: not operating anything.',
    fr: 'Tout descend à zéro et remonte tout seul. On échange le coût unitaire et la portabilité contre ce dont un jeune produit a le plus besoin : ne rien opérer.'
  },
  icon: 'bolt',
  accent: '#0E9F6E',
  accentDark: '#17A272',
  supportedTargets: ['agnostic', 'aws', 'gcp', 'azure', 'selfhosted'],

  whenToUse: [
    { en: 'A team of one to five, with no dedicated infrastructure engineer', fr: 'Une équipe de 1 à 5, sans ingénieur infra dédié' },
    { en: 'Unpredictable traffic, possibly near zero overnight', fr: 'Trafic imprévisible, potentiellement proche de zéro la nuit' },
    { en: 'Time-to-market matters more than unit cost', fr: 'Le time-to-market prime sur le coût unitaire' },
    { en: 'You accept being coupled to the cloud you pick', fr: 'On accepte le couplage au cloud choisi' }
  ],
  whenNotToUse: [
    { en: 'Steady, predictable load — a VM costs five to ten times less', fr: 'Charge constante et prévisible — une VM coûte 5 à 10× moins cher' },
    { en: 'Long (> 15 min) or memory-hungry processing', fr: 'Traitements longs (> 15 min) ou gourmands en mémoire' },
    { en: 'Strict p99 latency targets — cold starts will breach them', fr: 'Contraintes de latence p99 strictes — les démarrages à froid les feront sauter' },
    { en: 'Multi-cloud portability required by contract', fr: 'Portabilité multi-cloud exigée contractuellement' }
  ],

  groups: [
    { id: 'product', name: { en: 'Product', fr: 'Produit' }, short: { en: 'Product', fr: 'Produit' },
      description: { en: 'What the customer touches, and the code behind it.', fr: 'Ce que le client touche, et le code derrière.' } },
    { id: 'data', name: { en: 'Data', fr: 'Données' }, short: { en: 'Data', fr: 'Données' },
      description: { en: 'State: records, files, pending work.', fr: 'L\'état : enregistrements, fichiers, travail en attente.' } },
    { id: 'platform', name: { en: 'Platform', fr: 'Plateforme' }, short: { en: 'Platform', fr: 'Plateforme' },
      description: { en: 'What makes the rest deployable and observable.', fr: 'Ce qui rend le reste déployable et observable.' } },
    { id: 'vendor', name: { en: 'Third parties', fr: 'Tiers' }, short: { en: 'Vendors', fr: 'Tiers' },
      description: { en: 'Bought, not built. Each one is an availability dependency.', fr: 'Acheté, pas construit. Chacun est une dépendance de disponibilité.' } }
  ],

  layers: [
    { id: 'clients', name: { en: 'Clients', fr: 'Clients' }, desc: { en: 'Web · Mobile', fr: 'Web · Mobile' } },
    { id: 'edge', name: { en: 'Edge & API', fr: 'Edge & API' }, desc: { en: 'Entry point, caching, routing', fr: 'Point d\'entrée, cache, routage' } },
    { id: 'compute', name: { en: 'Processing', fr: 'Traitement' }, desc: { en: 'Business logic, on demand', fr: 'Logique métier, à la demande' } },
    { id: 'data', name: { en: 'Data', fr: 'Données' }, desc: { en: 'Records · Files · Queue', fr: 'Enregistrements · Fichiers · File' } },
    { id: 'platform', name: { en: 'Platform', fr: 'Plateforme' }, desc: { en: 'Supports everything above', fr: 'Supporte tout ce qui précède' } }
  ],

  components: [
    {
      id: 'web', name: { en: 'Web application', fr: 'Application web' },
      group: 'product', layer: 'clients', icon: 'web',
      tech: ['SPA', 'TypeScript'],
      role: { en: 'The main surface: sign-up, product, account.', fr: 'La surface principale : inscription, produit, compte.' },
      features: [
        { en: 'Sign-up and sign-in', fr: 'Inscription et connexion' },
        { en: 'The product itself', fr: 'Le produit lui-même' },
        { en: 'Billing and account settings', fr: 'Facturation et paramètres du compte' }
      ],
      deps: ['cdn'],
      cloud: cloudOf('staticHosting')
    },
    {
      id: 'mobile', name: { en: 'Mobile application', fr: 'Application mobile' },
      group: 'product', layer: 'clients', icon: 'mobile',
      tech: ['React Native', 'Flutter'],
      role: { en: 'The same product on a phone. Same API, different constraints.', fr: 'Le même produit sur téléphone. Même API, contraintes différentes.' },
      notes: [
        { en: 'Vendor-neutral by nature — no cloud service decides this one.', fr: 'Agnostique par nature — aucun service cloud ne tranche celui-là.' },
        { en: 'Delete it on day one if you are not shipping an app yet. It is here so you do not forget it exists.', fr: 'À supprimer dès le premier jour si tu ne livres pas encore d\'app. Il est là pour ne pas l\'oublier.' }
      ],
      features: [
        { en: 'Push notifications', fr: 'Notifications push' },
        { en: 'Offline-tolerant drafts', fr: 'Brouillons tolérants au hors-ligne' }
      ],
      deps: ['api', 'auth', 'pay']
    },
    {
      id: 'cdn', name: { en: 'CDN & edge', fr: 'CDN & edge' },
      group: 'product', layer: 'edge', icon: 'globe',
      tech: ['CDN', 'TLS'],
      role: { en: 'Serves static assets close to the user and terminates TLS.', fr: 'Sert les fichiers statiques près de l\'utilisateur et termine le TLS.' },
      features: [
        { en: 'Static asset caching', fr: 'Cache des fichiers statiques' },
        { en: 'Custom domain and certificates', fr: 'Domaine personnalisé et certificats' }
      ],
      deps: ['api'],
      /* Self-hosting an MVP means one reverse proxy serving both assets and the
       * API. There is no separate edge tier to describe, so the component goes
       * and `web` is rewired straight to `api`. */
      cloud: { ...cloudOf('cdn'), selfhosted: { omit: true } }
    },
    {
      id: 'api', name: { en: 'API gateway', fr: 'Passerelle API' },
      group: 'product', layer: 'edge', icon: 'plug',
      tech: ['HTTP API', 'JWT'],
      role: { en: 'One front door: routing, throttling, token validation.', fr: 'Une seule porte d\'entrée : routage, limitation de débit, validation des jetons.' },
      features: [
        { en: 'Route to the right function', fr: 'Router vers la bonne fonction' },
        { en: 'Rate limiting per key', fr: 'Limitation de débit par clé' },
        { en: 'JWT validation before any business code runs', fr: 'Validation du JWT avant tout code métier' }
      ],
      deps: ['fn', 'auth'],
      cloud: cloudOf('apiGateway', {
        azure: { note: { en: 'API Management is expensive for an MVP. Container Apps ingress covers the same ground until it does not.', fr: 'API Management est cher pour un MVP. L\'ingress Container Apps suffit jusqu\'à ce qu\'il ne suffise plus.' } }
      })
    },
    {
      id: 'fn', name: { en: 'Business functions', fr: 'Fonctions métier' },
      group: 'product', layer: 'compute', icon: 'bolt',
      tech: ['Functions'],
      role: { en: 'Every synchronous endpoint, one handler at a time.', fr: 'Chaque endpoint synchrone, un handler à la fois.' },
      features: [
        { en: 'Request validation and business rules', fr: 'Validation des requêtes et règles métier' },
        { en: 'Reads and writes to the main store', fr: 'Lectures et écritures sur la base principale' },
        { en: 'Enqueues anything slow instead of doing it inline', fr: 'Met en file tout ce qui est lent plutôt que de le faire en ligne' }
      ],
      notes: [
        { en: 'Anything above a couple of seconds belongs on the queue, not here.', fr: 'Tout ce qui dépasse quelques secondes va sur la file, pas ici.' }
      ],
      deps: ['db', 'files', 'queue', 'pay', 'mail', 'secrets'],
      cloud: cloudOf('functions')
    },
    {
      id: 'worker', name: { en: 'Deferred processing', fr: 'Traitements différés' },
      group: 'product', layer: 'compute', icon: 'cog',
      tech: ['Worker'],
      role: { en: 'Does the slow work the request could not wait for.', fr: 'Fait le travail lent que la requête ne pouvait pas attendre.' },
      features: [
        { en: 'Thumbnails, exports, imports', fr: 'Vignettes, exports, imports' },
        { en: 'Retries with backoff', fr: 'Retentatives avec temporisation' },
        { en: 'Idempotent by construction', fr: 'Idempotent par construction' }
      ],
      deps: ['queue', 'db', 'files'],
      cloud: cloudOf('functions', {
        aws: { name: 'AWS Lambda (SQS trigger)', tech: ['Lambda', 'SQS'] },
        gcp: { name: 'Cloud Run (Pub/Sub push)', tech: ['Cloud Run', 'Pub/Sub'] },
        azure: { name: 'Azure Functions (Service Bus trigger)', tech: ['Azure Functions', 'Service Bus'] },
        selfhosted: { name: 'Worker process', tech: ['Docker', 'RabbitMQ'] }
      })
    },
    {
      id: 'auth', name: { en: 'Authentication', fr: 'Authentification' },
      group: 'product', layer: 'compute', icon: 'lock',
      tech: ['OIDC', 'JWT'],
      role: { en: 'Who the caller is. Bought, never written by hand.', fr: 'Qui est l\'appelant. Acheté, jamais écrit à la main.' },
      features: [
        { en: 'Email, password and social sign-in', fr: 'Connexion email, mot de passe et réseaux sociaux' },
        { en: 'Password reset and email verification', fr: 'Réinitialisation de mot de passe et vérification d\'email' },
        { en: 'Tokens the gateway can validate on its own', fr: 'Jetons que la passerelle valide seule' }
      ],
      deps: ['mail'],
      cloud: cloudOf('identity')
    },
    {
      id: 'db', name: { en: 'Primary store', fr: 'Base principale' },
      group: 'data', layer: 'data', icon: 'db',
      tech: ['OLTP'],
      role: { en: 'The source of truth for users, accounts and orders.', fr: 'La source de vérité pour les utilisateurs, les comptes et les commandes.' },
      features: [
        { en: 'Point-in-time recovery on', fr: 'Restauration à un instant donné activée' },
        { en: 'One access pattern per index, decided up front', fr: 'Un motif d\'accès par index, décidé à l\'avance' }
      ],
      notes: [
        { en: 'A serverless key-value store is cheap until you need a join. Decide with your eyes open.', fr: 'Une base clé-valeur serverless est bon marché jusqu\'à la première jointure. Choisis en connaissance de cause.' }
      ],
      cloud: cloudOf('nosql', {
        aws: { name: 'Amazon DynamoDB', tech: ['DynamoDB'], note: { en: 'Aurora Serverless v2 is the alternative when relational queries matter more than per-request cost.', fr: 'Aurora Serverless v2 est l\'alternative quand les requêtes relationnelles comptent plus que le coût par requête.' } },
        azure: { name: 'Azure Cosmos DB (serverless)', tech: ['Cosmos DB'] },
        selfhosted: { name: 'PostgreSQL', tech: ['PostgreSQL'], note: { en: 'On your own hardware, relational is the boring, correct default.', fr: 'Sur ton propre matériel, le relationnel est le choix par défaut ennuyeux et correct.' } }
      })
    },
    {
      id: 'files', name: { en: 'File storage', fr: 'Stockage de fichiers' },
      group: 'data', layer: 'data', icon: 'save',
      tech: ['Object storage'],
      role: { en: 'User uploads and generated documents.', fr: 'Fichiers déposés par les utilisateurs et documents générés.' },
      features: [
        { en: 'Direct upload with pre-signed URLs — never through the function', fr: 'Dépôt direct par URL pré-signée — jamais à travers la fonction' },
        { en: 'Lifecycle rules on anything temporary', fr: 'Règles de cycle de vie sur tout ce qui est temporaire' }
      ],
      cloud: cloudOf('objects')
    },
    {
      id: 'queue', name: { en: 'Message queue', fr: 'File de messages' },
      group: 'data', layer: 'data', icon: 'route',
      tech: ['Queue', 'DLQ'],
      role: { en: 'Holds work between the request that created it and the worker that does it.', fr: 'Garde le travail entre la requête qui l\'a créé et le worker qui l\'exécute.' },
      features: [
        { en: 'Dead-letter queue from day one', fr: 'File de rebut dès le premier jour' },
        { en: 'Visibility timeout longer than the worst-case job', fr: 'Délai de visibilité plus long que le pire cas' }
      ],
      cloud: cloudOf('queue')
    },
    {
      id: 'secrets', name: { en: 'Secrets & config', fr: 'Secrets & configuration' },
      group: 'platform', layer: 'platform', icon: 'key',
      tech: ['Secrets'],
      role: { en: 'Keys and connection strings, out of the repository.', fr: 'Clés et chaînes de connexion, hors du dépôt.' },
      features: [
        { en: 'One set of values per environment', fr: 'Un jeu de valeurs par environnement' },
        { en: 'Rotation without a redeploy', fr: 'Rotation sans redéploiement' }
      ],
      cloud: cloudOf('secrets')
    },
    {
      id: 'obs', name: { en: 'Logs & metrics', fr: 'Logs & métriques' },
      group: 'platform', layer: 'platform', icon: 'chart',
      tech: ['Logs', 'Metrics', 'Alerts'],
      role: { en: 'What happened, and an alarm when it should not have.', fr: 'Ce qui s\'est passé, et une alarme quand ça n\'aurait pas dû.' },
      features: [
        { en: 'Structured logs with a request id', fr: 'Logs structurés avec un identifiant de requête' },
        { en: 'Alerts on error rate and queue depth', fr: 'Alertes sur le taux d\'erreur et la profondeur de file' },
        { en: 'A billing alarm — the cheapest incident you will ever prevent', fr: 'Une alarme de facturation — l\'incident le moins cher que tu éviteras jamais' }
      ],
      cloud: cloudOf('observability')
    },
    {
      id: 'cicd', name: { en: 'CI/CD & infrastructure as code', fr: 'CI/CD & infrastructure as code' },
      group: 'platform', layer: 'platform', icon: 'git',
      tech: ['CI', 'IaC'],
      role: { en: 'Reproducible deployments from the first week, not the first outage.', fr: 'Des déploiements reproductibles dès la première semaine, pas au premier incident.' },
      features: [
        { en: 'One pipeline: test, build, deploy', fr: 'Un seul pipeline : test, build, déploiement' },
        { en: 'Two environments — staging and production', fr: 'Deux environnements — préproduction et production' },
        { en: 'Infrastructure declared in code, never clicked', fr: 'Infrastructure déclarée en code, jamais cliquée' }
      ],
      cloud: cloudOf('cicd')
    },
    {
      id: 'pay', name: { en: 'Payments', fr: 'Paiement' },
      group: 'vendor', layer: 'compute', icon: 'card',
      tech: ['Stripe'],
      role: { en: 'Takes the money and owns the card data so you never do.', fr: 'Encaisse et détient les données de carte pour que tu ne les détiennes jamais.' },
      features: [
        { en: 'Checkout and subscriptions', fr: 'Paiement et abonnements' },
        { en: 'Webhooks for every state change', fr: 'Webhooks à chaque changement d\'état' }
      ],
      notes: [
        { en: 'Identical on every target — this is a product decision, not an infrastructure one.', fr: 'Identique sur toutes les cibles — c\'est une décision produit, pas d\'infrastructure.' },
        { en: 'Verify the webhook signature. Every payment incident starts here.', fr: 'Vérifie la signature des webhooks. Tout incident de paiement commence là.' }
      ],
      deps: ['fn']
    },
    {
      id: 'mail', name: { en: 'Transactional email', fr: 'Email transactionnel' },
      group: 'vendor', layer: 'compute', icon: 'mail',
      tech: ['SMTP', 'Templates'],
      role: { en: 'Sign-up confirmation, password reset, receipts.', fr: 'Confirmation d\'inscription, réinitialisation de mot de passe, reçus.' },
      features: [
        { en: 'SPF, DKIM and DMARC before the first send', fr: 'SPF, DKIM et DMARC avant le premier envoi' },
        { en: 'Bounce and complaint handling', fr: 'Gestion des rejets et des plaintes' }
      ],
      cloud: cloudOf('email')
    }
  ],

  flows: [
    {
      id: 'signup-payment',
      name: { en: 'Sign-up and first payment', fr: 'Inscription et premier paiement' },
      group: 'product',
      sub: { en: 'Web → API → auth → functions → payment → email', fr: 'Web → API → auth → fonctions → paiement → email' },
      note: {
        en: '<b>Watch out.</b> The payment webhook arrives on its own schedule, sometimes before the browser comes back. Treat the two paths as independent.',
        fr: '<b>Attention.</b> Le webhook de paiement arrive à son rythme, parfois avant le retour du navigateur. Traite les deux chemins comme indépendants.'
      },
      steps: [
        { component: 'web', title: { en: 'Sign-up form', fr: 'Formulaire d\'inscription' },
          description: { en: 'The visitor fills in an email and a password.', fr: 'Le visiteur saisit un email et un mot de passe.' } },
        { component: 'auth', title: { en: 'Account created', fr: 'Compte créé' },
          description: { en: 'The identity provider creates the account and issues a token.', fr: 'Le fournisseur d\'identité crée le compte et émet un jeton.' } },
        { component: 'api', title: { en: 'Token validated', fr: 'Jeton validé' },
          description: { en: 'The gateway checks the signature before any business code runs.', fr: 'La passerelle vérifie la signature avant tout code métier.' } },
        { component: 'fn', title: { en: 'Profile written', fr: 'Profil écrit' },
          description: { en: 'A function creates the application-side profile.', fr: 'Une fonction crée le profil côté application.' } },
        { component: 'db', title: { en: 'Persisted', fr: 'Persisté' },
          description: { en: 'User and account land in the primary store.', fr: 'Utilisateur et compte atterrissent dans la base principale.' } },
        { component: 'pay', title: { en: 'Subscription taken', fr: 'Abonnement souscrit' },
          description: { en: 'Checkout runs on the provider; the card never touches your code.', fr: 'Le paiement se fait chez le fournisseur ; la carte ne touche jamais ton code.' } },
        { component: 'queue', title: { en: 'Welcome job queued', fr: 'Tâche de bienvenue mise en file' },
          description: { en: 'The webhook enqueues the onboarding work instead of doing it inline.', fr: 'Le webhook met le travail d\'accueil en file plutôt que de le faire en ligne.' } },
        { component: 'mail', title: { en: 'Confirmation sent', fr: 'Confirmation envoyée' },
          description: { en: 'The worker sends the receipt and the welcome email.', fr: 'Le worker envoie le reçu et l\'email de bienvenue.' } }
      ]
    }
  ],

  sections: [
    {
      id: 'traps', tab: { en: 'Traps', fr: 'Pièges' }, type: 'cards',
      title: { en: 'Serverless traps', fr: 'Pièges du serverless' },
      subtitle: {
        en: 'None of these are reasons not to start here. All of them are reasons to know what you signed.',
        fr: 'Aucun n\'est une raison de ne pas commencer ici. Tous sont des raisons de savoir ce qu\'on a signé.'
      },
      items: [
        { group: 'product', icon: 'clock', title: { en: 'Cold starts', fr: 'Démarrages à froid' },
          body: { en: 'The first request after an idle period pays for the runtime to boot.', fr: 'La première requête après une période d\'inactivité paie le démarrage du runtime.' },
          bullets: [
            { en: 'Worst on large dependency trees and JVM-style runtimes', fr: 'Pire avec de gros arbres de dépendances et les runtimes de type JVM' },
            { en: 'Provisioned concurrency fixes it and removes the scale-to-zero saving', fr: 'La concurrence provisionnée corrige le problème et supprime l\'économie du scale-to-zero' },
            { en: 'Measure p99, not the average — the average hides this entirely', fr: 'Mesure le p99, pas la moyenne — la moyenne masque complètement ce phénomène' }
          ] },
        { group: 'product', icon: 'alert', title: { en: 'Concurrency limits', fr: 'Limites de concurrence' },
          body: { en: 'Accounts have a ceiling on simultaneous executions, and it is shared.', fr: 'Les comptes ont un plafond d\'exécutions simultanées, et il est partagé.' },
          bullets: [
            { en: 'One runaway loop can starve every other function in the account', fr: 'Une boucle folle peut affamer toutes les autres fonctions du compte' },
            { en: 'Set a per-function reservation on anything customer-facing', fr: 'Réserve une part par fonction sur tout ce qui est face client' },
            { en: 'Separate accounts or projects per environment', fr: 'Sépare les comptes ou projets par environnement' }
          ] },
        { group: 'data', icon: 'clock', title: { en: 'The duration ceiling', fr: 'Le plafond de durée' },
          body: { en: 'Functions are capped — typically fifteen minutes.', fr: 'Les fonctions sont plafonnées — typiquement quinze minutes.' },
          bullets: [
            { en: 'Long imports and exports must be split or moved to a container', fr: 'Les imports et exports longs doivent être découpés ou déplacés vers un conteneur' },
            { en: 'A job that grows with your data will hit this without warning', fr: 'Une tâche qui grandit avec tes données touchera ce plafond sans prévenir' }
          ] },
        { group: 'data', icon: 'chart', title: { en: 'Invocation cost versus a VM', fr: 'Coût des invocations vs une VM' },
          body: { en: 'Per-request pricing wins at low and spiky volume, and loses at steady volume.', fr: 'La tarification à la requête gagne à volume faible et irrégulier, et perd à volume constant.' },
          bullets: [
            { en: 'The crossover is usually earlier than teams expect', fr: 'Le point de bascule arrive généralement plus tôt qu\'on ne le croit' },
            { en: 'Egress and per-request gateway charges are the quiet half of the bill', fr: 'La sortie réseau et le coût par requête de la passerelle sont la moitié silencieuse de la facture' }
          ] },
        { group: 'platform', icon: 'terminal', title: { en: 'Local testing', fr: 'Tests locaux' },
          body: { en: 'The local emulator is never the real thing.', fr: 'L\'émulateur local n\'est jamais la vraie chose.' },
          bullets: [
            { en: 'IAM and quotas only fail in the cloud', fr: 'IAM et quotas n\'échouent que dans le cloud' },
            { en: 'Budget for a real ephemeral environment per branch', fr: 'Prévois un vrai environnement éphémère par branche' }
          ] },
        { group: 'platform', icon: 'lock', title: { en: 'Vendor lock-in', fr: 'Verrouillage fournisseur' },
          body: { en: 'Business logic is portable. Triggers, IAM and event shapes are not.', fr: 'La logique métier est portable. Les déclencheurs, l\'IAM et la forme des événements ne le sont pas.' },
          bullets: [
            { en: 'Keep handlers thin and the domain free of SDK imports', fr: 'Garde des handlers fins et le domaine sans import de SDK' },
            { en: 'Accept the coupling deliberately rather than pretending it is not there', fr: 'Accepte le couplage délibérément plutôt que de faire comme s\'il n\'existait pas' }
          ] }
      ]
    },
    {
      id: 'cost', tab: { en: 'Cost drivers', fr: 'Coûts' }, type: 'table',
      title: { en: 'Cost drivers', fr: 'Facteurs de coût' },
      subtitle: {
        en: 'No figures: they depend on your volume and go stale in a quarter. What does not go stale is which lever moves the bill.',
        fr: 'Aucun chiffre : ils dépendent de ton volume et périment en un trimestre. Ce qui ne périme pas, c\'est le levier qui fait bouger la facture.'
      },
      note: {
        en: 'Set every alert below before launch, not after the first surprise invoice.',
        fr: 'Pose toutes les alertes ci-dessous avant le lancement, pas après la première facture surprise.'
      },
      columns: [
        { label: { en: 'Component', fr: 'Composant' }, width: '20%' },
        { label: { en: 'What runs up the bill', fr: 'Ce qui fait grimper la facture' } },
        { label: { en: 'Alert to set', fr: 'Alerte à poser' }, width: '30%' }
      ],
      rows: [
        [{ en: 'Business functions', fr: 'Fonctions métier' },
         { en: 'Invocation count × duration × memory. Memory is the multiplier people forget.', fr: 'Nombre d\'invocations × durée × mémoire. La mémoire est le multiplicateur qu\'on oublie.' },
         { en: 'Monthly compute spend above the cost of one equivalent container', fr: 'Dépense mensuelle de calcul supérieure au coût d\'un conteneur équivalent' }],
        [{ en: 'API gateway', fr: 'Passerelle API' },
         { en: 'Priced per request. Chatty front-ends pay twice — once here, once in compute.', fr: 'Tarifée à la requête. Un front bavard paie deux fois — ici, puis en calcul.' },
         { en: 'Requests per active user per session', fr: 'Requêtes par utilisateur actif et par session' }],
        [{ en: 'Primary store', fr: 'Base principale' },
         { en: 'On-demand read and write units, plus stored volume that only grows.', fr: 'Unités de lecture et d\'écriture à la demande, plus un volume stocké qui ne fait que croître.' },
         { en: 'Read units per request — a scan hidden behind an endpoint shows up here', fr: 'Unités de lecture par requête — un scan caché derrière un endpoint se voit ici' }],
        [{ en: 'File storage', fr: 'Stockage de fichiers' },
         { en: 'Egress, not storage. Serving files without a CDN in front is the classic mistake.', fr: 'La sortie réseau, pas le stockage. Servir des fichiers sans CDN devant est l\'erreur classique.' },
         { en: 'Egress volume, and cache hit ratio at the CDN', fr: 'Volume de sortie, et taux de succès du cache au CDN' }],
        [{ en: 'Message queue', fr: 'File de messages' },
         { en: 'Per-message cost is negligible; a poison-message retry storm is not.', fr: 'Le coût par message est négligeable ; une tempête de retentatives sur message empoisonné ne l\'est pas.' },
         { en: 'Dead-letter queue depth above zero', fr: 'Profondeur de la file de rebut supérieure à zéro' }],
        [{ en: 'Logs & metrics', fr: 'Logs & métriques' },
         { en: 'Ingestion and retention. Debug logging left on in production is the usual culprit.', fr: 'Ingestion et rétention. Le log de debug laissé en production est le coupable habituel.' },
         { en: 'Log volume per day, with a retention policy set on day one', fr: 'Volume de logs par jour, avec une politique de rétention posée dès le premier jour' }]
      ]
    },
    {
      id: 'exit', tab: { en: 'Exit', fr: 'Sortie' }, type: 'timeline',
      title: { en: 'When to leave serverless', fr: 'Quand sortir du serverless' },
      subtitle: {
        en: 'Three observable thresholds. Cross one and migrate that piece — not the whole architecture.',
        fr: 'Trois seuils observables. Quand l\'un est franchi, migre ce morceau — pas toute l\'architecture.'
      },
      lineTitle: { en: 'Thresholds', fr: 'Seuils' },
      items: [
        { group: 'product', period: { en: 'Threshold 1', fr: 'Seuil 1' },
          title: { en: 'The compute bill passes a container', fr: 'La facture de calcul dépasse un conteneur' },
          bullets: [
            { en: 'Compare monthly function spend against one always-on container of the same size', fr: 'Compare la dépense mensuelle des fonctions à un conteneur permanent de même taille' },
            { en: 'Move the hottest handler first — it is usually one endpoint carrying most of the traffic', fr: 'Déplace d\'abord le handler le plus chaud — c\'est souvent un endpoint qui porte l\'essentiel du trafic' },
            { en: 'Keep the rest serverless. This is not an all-or-nothing decision', fr: 'Garde le reste en serverless. Ce n\'est pas une décision tout ou rien' }
          ] },
        { group: 'product', period: { en: 'Threshold 2', fr: 'Seuil 2' },
          title: { en: 'Cold starts breach your p99', fr: 'Les démarrages à froid cassent ton p99' },
          bullets: [
            { en: 'Symptom: p50 is fine, p99 is several times worse, and it correlates with idle periods', fr: 'Symptôme : p50 correct, p99 plusieurs fois pire, corrélé aux périodes d\'inactivité' },
            { en: 'First try provisioned concurrency and price it honestly', fr: 'Essaie d\'abord la concurrence provisionnée et chiffre-la honnêtement' },
            { en: 'If that costs more than a container, you already have your answer', fr: 'Si cela coûte plus qu\'un conteneur, tu as déjà ta réponse' }
          ] },
        { group: 'data', period: { en: 'Threshold 3', fr: 'Seuil 3' },
          title: { en: 'A job outgrows the duration limit', fr: 'Un traitement dépasse la limite de durée' },
          bullets: [
            { en: 'Symptom: timeouts on the largest customers, and only on them', fr: 'Symptôme : des timeouts sur les plus gros clients, et seulement sur eux' },
            { en: 'Split into chunks and orchestrate, or move that worker to a container', fr: 'Découpe en morceaux et orchestre, ou déplace ce worker vers un conteneur' },
            { en: 'Splitting buys a year; a container buys the problem going away', fr: 'Le découpage achète un an ; le conteneur fait disparaître le problème' }
          ] }
      ],
      aside: [
        { group: 'platform', title: { en: 'What does not move', fr: 'Ce qui ne bouge pas' },
          body: { en: 'The queue, the object store, the identity provider and the secrets store stay exactly where they are. They are managed services, not serverless compute, and none of the thresholds above apply to them.', fr: 'La file, le stockage objet, le fournisseur d\'identité et le coffre à secrets restent exactement où ils sont. Ce sont des services managés, pas du calcul serverless, et aucun des seuils ci-dessus ne les concerne.' } }
      ]
    }
  ]
};
