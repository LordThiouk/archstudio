/* T4 — Event-driven and asynchronous processing. */

import { cloudOf } from './services';
import type { Template } from './types';

export const eventDriven: Template = {
  id: 'event-driven',
  name: { en: 'Event-driven processing', fr: 'Traitement événementiel' },
  tagline: {
    en: 'Streams, queues, decoupling and replay — producers and consumers on their own clocks.',
    fr: 'Flux, files, découplage et rejeu — producteurs et consommateurs à leur propre rythme.'
  },
  intro: {
    en: 'Asynchronous messaging buys independence between the side that produces and the side that reacts. It charges for it in debugging difficulty, so this template spends most of its attention on what goes wrong: duplicates, ordering, poison messages and replay.',
    fr: 'La messagerie asynchrone achète l\'indépendance entre ce qui produit et ce qui réagit. Elle la facture en difficulté de débogage, aussi ce modèle consacre l\'essentiel de son attention à ce qui tourne mal : doublons, ordre, messages empoisonnés et rejeu.'
  },
  icon: 'route',
  accent: '#B26B9B',
  accentDark: '#D686BC',
  supportedTargets: ['agnostic', 'aws', 'gcp', 'azure', 'selfhosted'],

  whenToUse: [
    { en: 'Producers and consumers have to evolve separately', fr: 'Producteurs et consommateurs doivent évoluer séparément' },
    { en: 'Load spikes must be absorbed without degrading the producer', fr: 'Des pics de charge à absorber sans dégrader le producteur' },
    { en: 'You need to replay history, or add a consumer after the fact', fr: 'Besoin de rejouer l\'historique, ou d\'ajouter un consommateur a posteriori' },
    { en: 'The same event legitimately interests three different teams', fr: 'Le même événement intéresse légitimement trois équipes différentes' }
  ],
  whenNotToUse: [
    { en: 'The caller needs the answer now — a synchronous call is simpler and easier to debug', fr: 'L\'appelant a besoin de la réponse tout de suite — un appel synchrone est plus simple et plus facile à déboguer' },
    { en: 'Fewer than three consumers: the bus adds latency and a component to operate, for nothing', fr: 'Moins de trois consommateurs : le bus ajoute de la latence et une pièce à opérer, pour rien' },
    { en: 'The team has no distributed tracing yet — you will be debugging blind', fr: 'L\'équipe n\'a pas encore de traçabilité distribuée — tu déboguerais à l\'aveugle' }
  ],

  groups: [
    { id: 'producers', name: { en: 'Producers', fr: 'Producteurs' }, short: { en: 'Producers', fr: 'Producteurs' },
      description: { en: 'Where a fact about the business first becomes a message.', fr: 'Là où un fait métier devient un message pour la première fois.' } },
    { id: 'bus', name: { en: 'Bus & routing', fr: 'Bus & routage' }, short: { en: 'Bus', fr: 'Bus' },
      description: { en: 'Transport, filtering and the contract between the two sides.', fr: 'Transport, filtrage et contrat entre les deux côtés.' } },
    { id: 'processing', name: { en: 'Processing', fr: 'Traitement' }, short: { en: 'Processing', fr: 'Traitement' },
      description: { en: 'Consumers, orchestration and everything that handles failure.', fr: 'Consommateurs, orchestration et tout ce qui gère l\'échec.' } },
    { id: 'destinations', name: { en: 'Destinations', fr: 'Destinations' }, short: { en: 'Sinks', fr: 'Destinations' },
      description: { en: 'Where the result finally lands.', fr: 'Là où le résultat atterrit finalement.' } }
  ],

  layers: [
    { id: 'producers', name: { en: 'Producers', fr: 'Producteurs' }, desc: { en: 'Services that emit facts', fr: 'Les services qui émettent des faits' } },
    { id: 'ingestion', name: { en: 'Ingestion & bus', fr: 'Ingestion & bus' }, desc: { en: 'Entry, schema, routing, transport', fr: 'Entrée, schéma, routage, transport' } },
    { id: 'processing', name: { en: 'Processing', fr: 'Traitement' }, desc: { en: 'Consumers · Saga · Failure handling', fr: 'Consommateurs · Saga · Gestion des échecs' } },
    { id: 'destinations', name: { en: 'Destinations', fr: 'Destinations' }, desc: { en: 'Event log · Warehouse · Notifications', fr: 'Journal d\'événements · Entrepôt · Notifications' } },
    { id: 'platform', name: { en: 'Platform', fr: 'Plateforme' }, desc: { en: 'Supports everything above', fr: 'Supporte tout ce qui précède' } }
  ],

  components: [
    {
      id: 'producers', name: { en: 'Producing services', fr: 'Services producteurs' },
      group: 'producers', layer: 'producers', icon: 'server',
      tech: ['Application'],
      role: { en: 'The services that know something happened before anyone else does.', fr: 'Les services qui savent qu\'un événement a eu lieu avant tout le monde.' },
      features: [
        { en: 'Emit facts in the past tense — "order placed", not "place order"', fr: 'Émettent des faits au passé — « commande passée », pas « passer commande »' },
        { en: 'Never wait for a consumer, and never learn who the consumers are', fr: 'N\'attendent jamais un consommateur, et n\'apprennent jamais qui ils sont' }
      ],
      notes: [
        { en: 'Vendor-neutral: these are your own services, whatever they run on.', fr: 'Agnostique : ce sont tes propres services, quel que soit leur support.' }
      ],
      deps: ['outbox']
    },
    {
      id: 'outbox', name: { en: 'Outbox table', fr: 'Table outbox' },
      group: 'producers', layer: 'producers', icon: 'save',
      tech: ['Transactional outbox'],
      role: { en: 'Makes "write the row" and "publish the event" one atomic act.', fr: 'Fait de « écrire la ligne » et « publier l\'événement » un seul acte atomique.' },
      features: [
        { en: 'Event written in the same transaction as the business change', fr: 'Événement écrit dans la même transaction que le changement métier' },
        { en: 'A relay publishes it afterwards, and retries until it succeeds', fr: 'Un relais le publie ensuite, et retente jusqu\'à réussir' },
        { en: 'Gives at-least-once publication — which is why consumers must be idempotent', fr: 'Donne une publication au moins une fois — d\'où l\'idempotence exigée des consommateurs' }
      ],
      notes: [
        { en: 'The pattern is the same on every target. Skipping it is the most common cause of "the database says yes and the event never arrived".', fr: 'Le motif est identique sur toutes les cibles. Le sauter est la première cause de « la base dit oui et l\'événement n\'est jamais arrivé ».' }
      ],
      deps: ['ingest']
    },
    {
      id: 'ingest', name: { en: 'Event entry point', fr: 'Point d\'entrée d\'événements' },
      group: 'bus', layer: 'ingestion', icon: 'plug',
      tech: ['Event bus'],
      role: { en: 'One place every event enters, whatever produced it.', fr: 'Un seul endroit par lequel entre chaque événement, quel qu\'en soit le producteur.' },
      features: [
        { en: 'Accepts from services, from vendors and from scheduled jobs alike', fr: 'Accepte indifféremment services, prestataires et tâches planifiées' },
        { en: 'Attaches the trace context so the event can be followed end to end', fr: 'Attache le contexte de trace pour suivre l\'événement de bout en bout' }
      ],
      deps: ['schema', 'router'],
      cloud: cloudOf('pubsub')
    },
    {
      id: 'schema', name: { en: 'Schema registry', fr: 'Registre de schémas' },
      group: 'bus', layer: 'ingestion', icon: 'layers',
      tech: ['Avro', 'JSON Schema'],
      role: { en: 'The written contract between a producer and consumers it has never met.', fr: 'Le contrat écrit entre un producteur et des consommateurs qu\'il n\'a jamais rencontrés.' },
      features: [
        { en: 'Compatibility checked in CI, before the producer deploys', fr: 'Compatibilité vérifiée en intégration continue, avant que le producteur ne déploie' },
        { en: 'Additive changes only — new optional fields, never a renamed one', fr: 'Changements additifs uniquement — nouveaux champs optionnels, jamais un champ renommé' },
        { en: 'A version on every message, from the very first one', fr: 'Une version sur chaque message, dès le tout premier' }
      ],
      cloud: cloudOf('schemaRegistry')
    },
    {
      id: 'router', name: { en: 'Routing & filtering', fr: 'Routage & filtrage' },
      group: 'bus', layer: 'ingestion', icon: 'route',
      tech: ['Rules'],
      role: { en: 'Decides which consumer sees which event, without the producer knowing.', fr: 'Décide quel consommateur voit quel événement, sans que le producteur le sache.' },
      features: [
        { en: 'Filter on attributes, not by parsing the payload', fr: 'Filtre sur les attributs, pas en analysant la charge utile' },
        { en: 'Adding a consumer is a rule, not a producer change — that is the whole benefit', fr: 'Ajouter un consommateur est une règle, pas une modification du producteur — c\'est tout le bénéfice' }
      ],
      deps: ['queue', 'stream'],
      cloud: cloudOf('pubsub', {
        aws: { name: 'EventBridge rules', tech: ['EventBridge'] },
        gcp: { name: 'Eventarc triggers', tech: ['Eventarc'] },
        azure: { name: 'Event Grid topics & subscriptions', tech: ['Event Grid'] },
        selfhosted: { name: 'NATS subjects & filters', tech: ['NATS'] }
      })
    },
    {
      id: 'queue', name: { en: 'Work queue', fr: 'File de travail' },
      group: 'bus', layer: 'ingestion', icon: 'box',
      tech: ['Queue'],
      role: { en: 'Holds work for consumers that pull at their own pace.', fr: 'Garde le travail pour des consommateurs qui tirent à leur rythme.' },
      features: [
        { en: 'Backpressure by construction — the queue grows instead of the producer failing', fr: 'Contre-pression par construction — la file grandit au lieu que le producteur échoue' },
        { en: 'Visibility timeout longer than the slowest handler', fr: 'Délai de visibilité plus long que le handler le plus lent' },
        { en: 'A message-group key when order within one entity matters', fr: 'Une clé de groupe quand l\'ordre compte au sein d\'une même entité' }
      ],
      cloud: cloudOf('queue')
    },
    {
      id: 'stream', name: { en: 'High-throughput stream', fr: 'Flux à haut débit' },
      group: 'bus', layer: 'ingestion', icon: 'chart',
      tech: ['Log', 'Partitions'],
      role: { en: 'A retained, ordered log several consumers read independently.', fr: 'Un journal ordonné et conservé, que plusieurs consommateurs lisent indépendamment.' },
      features: [
        { en: 'Retention is what makes replay possible — pick it deliberately', fr: 'La rétention est ce qui rend le rejeu possible — choisis-la délibérément' },
        { en: 'Ordering is per partition, never global', fr: 'L\'ordre est par partition, jamais global' },
        { en: 'Partition key chosen so one entity stays on one partition', fr: 'Clé de partition choisie pour qu\'une entité reste sur une seule partition' }
      ],
      cloud: cloudOf('stream')
    },
    {
      id: 'workers', name: { en: 'Consumers', fr: 'Consommateurs' },
      group: 'processing', layer: 'processing', icon: 'cog',
      tech: ['Consumer'],
      role: { en: 'Do the work the event asked for, exactly once in effect.', fr: 'Font le travail demandé par l\'événement, avec un effet exactement-une-fois.' },
      features: [
        { en: 'Check the idempotency key before doing anything with a side effect', fr: 'Vérifient la clé d\'idempotence avant tout effet de bord' },
        { en: 'Retry with exponential backoff and jitter', fr: 'Retentent avec temporisation exponentielle et gigue' },
        { en: 'Give up on a bounded count and hand the message to the dead-letter queue', fr: 'Abandonnent après un nombre borné d\'essais et remettent le message à la file de rebut' }
      ],
      deps: ['queue', 'idempotency', 'store', 'dlq', 'notify'],
      cloud: cloudOf('containers', {
        aws: { name: 'AWS Lambda or ECS', tech: ['Lambda', 'ECS'] },
        azure: { name: 'Container Apps or Azure Functions', tech: ['Container Apps', 'Azure Functions'] }
      })
    },
    {
      id: 'stream-proc', name: { en: 'Stream processing', fr: 'Traitement de flux' },
      group: 'processing', layer: 'processing', icon: 'bolt',
      tech: ['Windowing', 'Aggregation'],
      role: { en: 'Aggregates over time windows instead of one message at a time.', fr: 'Agrège sur des fenêtres de temps plutôt que message par message.' },
      features: [
        { en: 'Windows on event time, not on arrival time', fr: 'Fenêtres sur le temps de l\'événement, pas sur l\'heure d\'arrivée' },
        { en: 'A late-arrival policy decided up front — messages will arrive late', fr: 'Une politique d\'arrivée tardive décidée à l\'avance — des messages arriveront en retard' }
      ],
      deps: ['stream', 'warehouse'],
      cloud: cloudOf('streamProcessing')
    },
    {
      id: 'saga', name: { en: 'Saga orchestration', fr: 'Orchestration de saga' },
      group: 'processing', layer: 'processing', icon: 'hub',
      tech: ['Workflow', 'Compensation'],
      role: { en: 'Runs a multi-step business transaction that no database can roll back.', fr: 'Exécute une transaction métier multi-étapes qu\'aucune base ne peut annuler.' },
      features: [
        { en: 'A compensating action written for every step, at the time the step is written', fr: 'Une action de compensation écrite pour chaque étape, au moment où l\'étape est écrite' },
        { en: 'State held by the orchestrator, so a restart resumes rather than restarts', fr: 'État tenu par l\'orchestrateur, pour qu\'un redémarrage reprenne au lieu de recommencer' },
        { en: 'Visible progress — half-finished sagas are the ones you have to explain', fr: 'Progression visible — ce sont les sagas à moitié terminées qu\'il faudra expliquer' }
      ],
      deps: ['workers'],
      cloud: cloudOf('orchestration')
    },
    {
      id: 'idempotency', name: { en: 'Idempotency store', fr: 'Table d\'idempotence' },
      group: 'processing', layer: 'processing', icon: 'key',
      tech: ['Key-value', 'TTL'],
      role: { en: 'Remembers which messages have already been handled.', fr: 'Se souvient des messages déjà traités.' },
      features: [
        { en: 'Key from the business event, never from the broker\'s message id', fr: 'Clé issue de l\'événement métier, jamais de l\'identifiant de message du broker' },
        { en: 'TTL longer than the maximum redelivery window', fr: 'Durée de vie supérieure à la fenêtre maximale de relivraison' },
        { en: 'Written in the same transaction as the effect, or it guarantees nothing', fr: 'Écrite dans la même transaction que l\'effet, sinon elle ne garantit rien' }
      ],
      cloud: cloudOf('nosql')
    },
    {
      id: 'dlq', name: { en: 'Dead-letter queue', fr: 'File de rebut (DLQ)' },
      group: 'processing', layer: 'processing', icon: 'alert',
      tech: ['DLQ'],
      role: { en: 'Where a message goes when it cannot be handled, so the queue keeps moving.', fr: 'Où va un message impossible à traiter, pour que la file continue d\'avancer.' },
      features: [
        { en: 'Alert on depth above zero — a silent dead-letter queue is a data loss report nobody read', fr: 'Alerte dès que la profondeur dépasse zéro — une file de rebut silencieuse est une perte de données que personne n\'a lue' },
        { en: 'Keeps the original message and the failure reason together', fr: 'Conserve ensemble le message d\'origine et la raison de l\'échec' },
        { en: 'Replay tooling that exists before the first incident', fr: 'Outillage de rejeu disponible avant le premier incident' }
      ],
      cloud: cloudOf('queue', {
        aws: { name: 'Amazon SQS dead-letter queue', tech: ['SQS DLQ'] },
        gcp: { name: 'Pub/Sub dead-letter topic', tech: ['Pub/Sub'] },
        azure: { name: 'Service Bus dead-letter queue', tech: ['Service Bus DLQ'] },
        selfhosted: { name: 'RabbitMQ dead-letter exchange', tech: ['RabbitMQ DLX'] }
      })
    },
    {
      id: 'store', name: { en: 'Event log', fr: 'Journal d\'événements' },
      group: 'destinations', layer: 'destinations', icon: 'db',
      tech: ['Append-only'],
      role: { en: 'The durable record of what happened, kept beyond the bus retention.', fr: 'La trace durable de ce qui s\'est passé, conservée au-delà de la rétention du bus.' },
      features: [
        { en: 'Append-only, partitioned by day', fr: 'En ajout seul, partitionné par jour' },
        { en: 'The thing you replay from when the stream no longer has it', fr: 'Ce depuis quoi on rejoue quand le flux ne l\'a plus' }
      ],
      cloud: cloudOf('objects', {
        aws: { name: 'Amazon S3 (event archive)', tech: ['S3', 'DynamoDB'] },
        gcp: { name: 'Cloud Storage (event archive)', tech: ['GCS', 'Firestore'] },
        azure: { name: 'Blob Storage (event archive)', tech: ['Blob Storage', 'Cosmos DB'] },
        selfhosted: { name: 'MinIO (event archive)', tech: ['MinIO', 'PostgreSQL'] }
      })
    },
    {
      id: 'warehouse', name: { en: 'Analytical warehouse', fr: 'Entrepôt analytique' },
      group: 'destinations', layer: 'destinations', icon: 'chart',
      tech: ['Columnar'],
      role: { en: 'Where the aggregates land for people who ask questions in SQL.', fr: 'Là où atterrissent les agrégats pour ceux qui posent leurs questions en SQL.' },
      features: [
        { en: 'Loaded from the stream, not by querying the operational database', fr: 'Chargé depuis le flux, pas en interrogeant la base opérationnelle' },
        { en: 'Late-arriving data reconciled on a schedule', fr: 'Données tardives rapprochées périodiquement' }
      ],
      cloud: cloudOf('warehouse')
    },
    {
      id: 'notify', name: { en: 'Outbound notifications', fr: 'Notifications sortantes' },
      group: 'destinations', layer: 'destinations', icon: 'bell',
      tech: ['Email', 'Push', 'Webhook'],
      role: { en: 'The visible consequence: an email, a push, a webhook to a customer.', fr: 'La conséquence visible : un email, un push, un webhook vers un client.' },
      features: [
        { en: 'The one place where a duplicate is not harmless — the user sees it twice', fr: 'Le seul endroit où un doublon n\'est pas anodin — l\'utilisateur le voit deux fois' },
        { en: 'Outbound webhooks signed and retried with backoff', fr: 'Webhooks sortants signés et retentés avec temporisation' }
      ],
      cloud: cloudOf('email', {
        aws: { name: 'Amazon SNS + SES', tech: ['SNS', 'SES'] },
        azure: { name: 'Azure Communication Services', tech: ['ACS'] }
      })
    },
    {
      id: 'obs', name: { en: 'Tracing & queue metrics', fr: 'Traçage & métriques de file' },
      group: 'processing', layer: 'platform', icon: 'eye',
      tech: ['OpenTelemetry', 'Metrics'],
      role: { en: 'The only way to answer "where is my message?" without guessing.', fr: 'Le seul moyen de répondre à « où est mon message ? » sans deviner.' },
      features: [
        { en: 'Trace context propagated through the message, not lost at the broker', fr: 'Contexte de trace propagé dans le message, pas perdu au broker' },
        { en: 'Queue depth, oldest-message age and dead-letter rate on one dashboard', fr: 'Profondeur de file, âge du plus vieux message et taux de rebut sur un seul tableau de bord' },
        { en: 'A correlation id that survives every hop, chosen by the producer', fr: 'Un identifiant de corrélation qui survit à chaque saut, choisi par le producteur' }
      ],
      cloud: cloudOf('tracing')
    }
  ],

  flows: [
    {
      id: 'order-events',
      name: { en: 'An order becomes events', fr: 'Une commande devient des événements' },
      group: 'producers',
      sub: { en: 'Transaction → outbox → bus → routing → consumers → destinations', fr: 'Transaction → outbox → bus → routage → consommateurs → destinations' },
      note: {
        en: '<b>The atomic step is the second one.</b> If the event is published outside the transaction, sooner or later you will have an order with no event, or an event with no order.',
        fr: '<b>L\'étape atomique est la deuxième.</b> Si l\'événement est publié hors de la transaction, tôt ou tard tu auras une commande sans événement, ou un événement sans commande.'
      },
      steps: [
        { component: 'producers', title: { en: 'Order confirmed', fr: 'Commande confirmée' },
          description: { en: 'The service writes the order and considers the job done.', fr: 'Le service écrit la commande et considère son travail terminé.' } },
        { component: 'outbox', title: { en: 'Event written atomically', fr: 'Événement écrit atomiquement' },
          description: { en: 'Same transaction as the order. Either both exist or neither does.', fr: 'Même transaction que la commande. Soit les deux existent, soit aucun.' } },
        { component: 'ingest', title: { en: 'Published', fr: 'Publié' },
          description: { en: 'The relay pushes it to the bus and retries until it is accepted.', fr: 'Le relais le pousse sur le bus et retente jusqu\'à acceptation.' } },
        { component: 'schema', title: { en: 'Contract checked', fr: 'Contrat vérifié' },
          description: { en: 'The version is on the message; consumers know how to read it.', fr: 'La version est sur le message ; les consommateurs savent le lire.' } },
        { component: 'router', title: { en: 'Routed', fr: 'Routé' },
          description: { en: 'Three subscriptions match. The producer knows about none of them.', fr: 'Trois abonnements correspondent. Le producteur n\'en connaît aucun.' } },
        { component: 'queue', title: { en: 'Queued per consumer', fr: 'Mis en file par consommateur' },
          description: { en: 'One queue each, so a slow consumer slows only itself.', fr: 'Une file chacun, pour qu\'un consommateur lent ne ralentisse que lui-même.' } },
        { component: 'workers', title: { en: 'Handled', fr: 'Traité' },
          description: { en: 'Idempotency key checked first, effect applied second.', fr: 'Clé d\'idempotence vérifiée d\'abord, effet appliqué ensuite.' } },
        { component: 'store', title: { en: 'Archived', fr: 'Archivé' },
          description: { en: 'Kept beyond the bus retention, because replay will need it.', fr: 'Conservé au-delà de la rétention du bus, parce que le rejeu en aura besoin.' } },
        { component: 'notify', title: { en: 'Customer told', fr: 'Client informé' },
          description: { en: 'The confirmation email — the only step the customer ever sees.', fr: 'L\'email de confirmation — la seule étape que le client verra jamais.' } }
      ]
    },
    {
      id: 'poison',
      name: { en: 'A poison message', fr: 'Un message empoisonné' },
      group: 'processing',
      sub: { en: 'Failure → retries → dead letter → alert → fix → replay', fr: 'Échec → retentatives → rebut → alerte → correction → rejeu' },
      note: {
        en: '<b>The most useful flow in this template.</b> It is the one nobody writes down, and the one everybody wishes they had at 3am.',
        fr: '<b>Le flux le plus utile de ce modèle.</b> C\'est celui que personne n\'écrit, et celui qu\'on regrette à 3 h du matin.'
      },
      steps: [
        { component: 'workers', title: { en: 'Handler throws', fr: 'Le handler échoue' },
          description: { en: 'One malformed field, or a downstream service that is down.', fr: 'Un champ malformé, ou un service en aval indisponible.' } },
        { component: 'queue', title: { en: 'Redelivered', fr: 'Relivré' },
          description: { en: 'Backoff with jitter. A fixed interval turns one failure into a synchronised storm.', fr: 'Temporisation avec gigue. Un intervalle fixe transforme un échec en tempête synchronisée.' } },
        { component: 'dlq', title: { en: 'Dead-lettered', fr: 'Mis au rebut' },
          description: { en: 'After a bounded number of attempts, with the failure reason attached.', fr: 'Après un nombre borné de tentatives, avec la raison de l\'échec.' } },
        { component: 'obs', title: { en: 'Alert fires', fr: 'Alerte déclenchée' },
          description: { en: 'Dead-letter depth above zero pages someone. This is not a dashboard metric.', fr: 'Une profondeur de rebut supérieure à zéro réveille quelqu\'un. Ce n\'est pas une métrique de tableau de bord.' } },
        { component: 'idempotency', title: { en: 'Effects checked', fr: 'Effets vérifiés' },
          description: { en: 'Before replaying, find out what the failed attempts already did.', fr: 'Avant de rejouer, cherche ce que les tentatives échouées ont déjà fait.' } },
        { component: 'workers', title: { en: 'Replayed', fr: 'Rejoué' },
          description: { en: 'Fix deployed, messages moved back, idempotency keeps the double effect away.', fr: 'Correctif déployé, messages remis en file, l\'idempotence écarte le double effet.' } }
      ]
    }
  ],

  sections: [
    {
      id: 'guarantees', tab: { en: 'Guarantees', fr: 'Garanties' }, type: 'table',
      title: { en: 'Delivery guarantees', fr: 'Garanties de livraison' },
      subtitle: {
        en: 'What the broker gives you, and what you still have to write yourself. The second column is where most of the surprises live.',
        fr: 'Ce que le broker fournit, et ce qu\'il reste à écrire soi-même. La deuxième colonne concentre l\'essentiel des surprises.'
      },
      note: {
        en: 'No mainstream broker gives you exactly-once end to end. What they offer is at-least-once delivery plus tooling; the "exactly once" your business needs is an idempotent consumer.',
        fr: 'Aucun broker courant ne fournit un exactement-une-fois de bout en bout. Ils offrent une livraison au moins une fois plus de l\'outillage ; l\'« exactement une fois » dont ton métier a besoin est un consommateur idempotent.'
      },
      columns: [
        { label: { en: 'Guarantee', fr: 'Garantie' }, width: '20%' },
        { label: { en: 'What it actually means', fr: 'Ce que cela veut dire réellement' } },
        { label: { en: 'What you have to write', fr: 'Ce qu\'il faut coder soi-même' }, width: '32%' }
      ],
      rows: [
        [{ en: 'At most once', fr: 'Au plus une fois' },
         { en: 'Fire and forget. A message can be lost and nobody finds out.', fr: 'On envoie et on oublie. Un message peut être perdu sans que personne ne l\'apprenne.' },
         { en: 'Nothing — but only use it for data you are willing to lose, such as metrics samples', fr: 'Rien — mais à réserver aux données qu\'on accepte de perdre, comme des échantillons de métriques' }],
        [{ en: 'At least once', fr: 'Au moins une fois' },
         { en: 'The default everywhere. Duplicates happen on redelivery, on retry, and on rebalance.', fr: 'Le défaut partout. Les doublons surviennent à la relivraison, à la retentative et au rééquilibrage.' },
         { en: 'An idempotency key, checked and written in the same transaction as the effect', fr: 'Une clé d\'idempotence, vérifiée et écrite dans la même transaction que l\'effet' }],
        [{ en: 'Effectively once', fr: 'Effectivement une fois' },
         { en: 'At-least-once delivery plus a consumer that makes repetition harmless.', fr: 'Livraison au moins une fois plus un consommateur qui rend la répétition inoffensive.' },
         { en: 'This is the target. It is a property of your code, not a broker setting', fr: 'C\'est la cible. C\'est une propriété de ton code, pas un réglage du broker' }],
        [{ en: 'Ordering', fr: 'Ordre' },
         { en: 'Guaranteed per partition or per message group, never across the whole topic.', fr: 'Garanti par partition ou par groupe de messages, jamais sur tout le sujet.' },
         { en: 'A partition key that keeps one entity on one partition, chosen before launch', fr: 'Une clé de partition qui garde une entité sur une seule partition, choisie avant le lancement' }],
        [{ en: 'Transactional publish', fr: 'Publication transactionnelle' },
         { en: 'No broker participates in your database transaction. None of them.', fr: 'Aucun broker ne participe à ta transaction de base de données. Aucun.' },
         { en: 'The outbox pattern. There is no second option', fr: 'Le motif outbox. Il n\'y a pas de deuxième option' }],
        [{ en: 'Replay', fr: 'Rejeu' },
         { en: 'Only where the transport retains data — a queue drops a message once it is acknowledged.', fr: 'Seulement là où le transport conserve les données — une file supprime un message une fois acquitté.' },
         { en: 'An archive you own, and a replay path that is separate from live traffic', fr: 'Une archive qui t\'appartient, et un chemin de rejeu séparé du trafic vivant' }]
      ]
    },
    {
      id: 'traps', tab: { en: 'Traps', fr: 'Pièges' }, type: 'cards',
      title: { en: 'The five traps', fr: 'Les cinq pièges' },
      subtitle: {
        en: 'Every one of these is discovered in production, on a Friday, by the team that did not think it applied to them.',
        fr: 'Chacun se découvre en production, un vendredi, par l\'équipe qui pensait ne pas être concernée.'
      },
      items: [
        { group: 'processing', icon: 'key', title: { en: 'Idempotency', fr: 'Idempotence' },
          body: { en: 'The same message will be delivered twice. Design for it rather than hoping.', fr: 'Le même message sera livré deux fois. Conçois pour cela plutôt que d\'espérer.' },
          bullets: [
            { en: 'Key from the business event, so a re-publish is caught too', fr: 'Clé issue de l\'événement métier, pour attraper aussi une republication' },
            { en: 'Check and write in one transaction, or the race window stays open', fr: 'Vérifie et écris dans une seule transaction, sinon la fenêtre de course reste ouverte' },
            { en: 'Sending an email twice is the failure your customer will report', fr: 'Envoyer un email deux fois est l\'échec que ton client signalera' }
          ] },
        { group: 'bus', icon: 'route', title: { en: 'Ordering', fr: 'Ordre des messages' },
          body: { en: 'Global ordering does not exist. Per-entity ordering is what you actually need.', fr: 'L\'ordre global n\'existe pas. C\'est l\'ordre par entité dont tu as réellement besoin.' },
          bullets: [
            { en: 'Partition by entity id — one order, one partition', fr: 'Partitionne par identifiant d\'entité — une commande, une partition' },
            { en: 'Parallelism within a partition destroys the ordering you just bought', fr: 'Le parallélisme au sein d\'une partition détruit l\'ordre que tu viens d\'acheter' },
            { en: 'Consider a version number on the entity so out-of-order updates are detectable', fr: 'Envisage un numéro de version sur l\'entité pour détecter les mises à jour désordonnées' }
          ] },
        { group: 'processing', icon: 'alert', title: { en: 'Poison messages', fr: 'Messages empoisonnés' },
          body: { en: 'One message that always fails will block a queue forever if nothing removes it.', fr: 'Un message qui échoue toujours bloquera une file indéfiniment si rien ne l\'en retire.' },
          bullets: [
            { en: 'Bounded retries, then dead-letter — never infinite retries', fr: 'Retentatives bornées, puis rebut — jamais de retentatives infinies' },
            { en: 'Alert on the dead-letter queue, not just chart it', fr: 'Alerte sur la file de rebut, pas seulement un graphique' },
            { en: 'Build the replay tool before you need it, not during the incident', fr: 'Construis l\'outil de rejeu avant d\'en avoir besoin, pas pendant l\'incident' }
          ] },
        { group: 'bus', icon: 'layers', title: { en: 'Schema evolution', fr: 'Évolution de schéma' },
          body: { en: 'The producer deploys on Tuesday; a consumer it has never heard of breaks on Wednesday.', fr: 'Le producteur déploie le mardi ; un consommateur qu\'il ne connaît pas casse le mercredi.' },
          bullets: [
            { en: 'Additive changes only: new optional fields', fr: 'Changements additifs uniquement : nouveaux champs optionnels' },
            { en: 'Compatibility checked in CI against the registry', fr: 'Compatibilité vérifiée en CI face au registre' },
            { en: 'To remove a field, stop reading it, wait a retention period, then stop writing it', fr: 'Pour supprimer un champ : cesse de le lire, attends une période de rétention, puis cesse de l\'écrire' }
          ] },
        { group: 'processing', icon: 'clock', title: { en: 'Redelivery storms', fr: 'Tempêtes de relivraison' },
          body: { en: 'A downstream outage makes every consumer retry at the same moment, forever.', fr: 'Une panne en aval fait retenter tous les consommateurs au même instant, indéfiniment.' },
          bullets: [
            { en: 'Exponential backoff with jitter — the jitter is the part people omit', fr: 'Temporisation exponentielle avec gigue — la gigue est la partie qu\'on omet' },
            { en: 'A circuit breaker so the consumer stops hammering a service that is already down', fr: 'Un disjoncteur pour que le consommateur cesse de marteler un service déjà à terre' },
            { en: 'Cap concurrency per consumer, so recovery does not become a second outage', fr: 'Plafonne la concurrence par consommateur, pour que la reprise ne devienne pas une deuxième panne' }
          ] }
      ]
    },
    {
      id: 'measure', tab: { en: 'Measure', fr: 'Mesures' }, type: 'table',
      title: { en: 'What to measure', fr: 'Ce qu\'il faut mesurer' },
      subtitle: {
        en: 'Asynchronous systems fail quietly. These five metrics are the difference between noticing in five minutes and noticing when a customer calls.',
        fr: 'Les systèmes asynchrones échouent en silence. Ces cinq métriques font la différence entre s\'en apercevoir en cinq minutes et s\'en apercevoir quand un client appelle.'
      },
      columns: [
        { label: { en: 'Metric', fr: 'Métrique' }, width: '24%' },
        { label: { en: 'What it tells you', fr: 'Ce qu\'elle indique' } },
        { label: { en: 'Alert when', fr: 'Alerte quand' }, width: '28%' }
      ],
      rows: [
        [{ en: 'Queue depth', fr: 'Profondeur de file' },
         { en: 'Whether consumers keep up with producers right now.', fr: 'Si les consommateurs suivent les producteurs en ce moment.' },
         { en: 'It grows for longer than one processing cycle', fr: 'Elle croît plus longtemps qu\'un cycle de traitement' }],
        [{ en: 'Age of the oldest message', fr: 'Âge du plus vieux message' },
         { en: 'The honest one. Depth can look fine while one message sits for an hour.', fr: 'La métrique honnête. La profondeur peut sembler correcte pendant qu\'un message attend une heure.' },
         { en: 'It exceeds the freshness you promised the business', fr: 'Il dépasse la fraîcheur promise au métier' }],
        [{ en: 'Dead-letter rate', fr: 'Taux de rebut' },
         { en: 'Messages the system gave up on. Each one is unfinished business.', fr: 'Les messages abandonnés par le système. Chacun est un travail non terminé.' },
         { en: 'Above zero. There is no acceptable background level', fr: 'Supérieur à zéro. Il n\'y a pas de niveau de fond acceptable' }],
        [{ en: 'End-to-end latency', fr: 'Latence bout-en-bout' },
         { en: 'From the producing transaction to the visible effect, measured on real events.', fr: 'De la transaction productrice à l\'effet visible, mesurée sur de vrais événements.' },
         { en: 'p95 crosses what the product promised', fr: 'Le p95 dépasse ce que le produit a promis' }],
        [{ en: 'Retry rate', fr: 'Taux de retentative' },
         { en: 'An early warning: it rises before the dead-letter queue does.', fr: 'Un signal précoce : il monte avant la file de rebut.' },
         { en: 'It doubles against the same period last week', fr: 'Il double par rapport à la même période la semaine précédente' }],
        [{ en: 'Consumer lag per partition', fr: 'Retard du consommateur par partition' },
         { en: 'Which partition is behind — an average across partitions hides the stuck one.', fr: 'Quelle partition est en retard — une moyenne masque celle qui est bloquée.' },
         { en: 'One partition lags while the others do not', fr: 'Une partition prend du retard et pas les autres' }]
      ]
    },
    {
      id: 'replay', tab: { en: 'Replay', fr: 'Rejeu' }, type: 'cards',
      title: { en: 'Replay', fr: 'Rejeu' },
      subtitle: {
        en: 'Replay is the reason to build this architecture, and the thing least often rehearsed. Answer these four questions before you need to.',
        fr: 'Le rejeu est la raison de construire cette architecture, et la chose la moins souvent répétée. Réponds à ces quatre questions avant d\'en avoir besoin.'
      },
      items: [
        { group: 'destinations', icon: 'clock', title: { en: 'From when?', fr: 'Depuis quand ?' },
          body: { en: 'Bus retention decides how far back you can go without an archive.', fr: 'La rétention du bus décide jusqu\'où on peut remonter sans archive.' },
          bullets: [
            { en: 'A queue keeps nothing once acknowledged — the archive is not optional', fr: 'Une file ne garde rien une fois acquittée — l\'archive n\'est pas optionnelle' },
            { en: 'Retention is a cost decision made once and regretted later', fr: 'La rétention est une décision de coût prise une fois et regrettée plus tard' }
          ] },
        { group: 'processing', icon: 'shield', title: { en: 'With what isolation?', fr: 'Avec quelle isolation ?' },
          body: { en: 'Replaying into live traffic mixes historical and current events at full speed.', fr: 'Rejouer dans le trafic vivant mélange événements historiques et courants à pleine vitesse.' },
          bullets: [
            { en: 'A separate queue and a separate consumer group', fr: 'Une file séparée et un groupe de consommateurs séparé' },
            { en: 'Rate-limited, so the replay does not become the incident', fr: 'Débit limité, pour que le rejeu ne devienne pas l\'incident' }
          ] },
        { group: 'destinations', icon: 'alert', title: { en: 'Which side effects to suppress?', fr: 'Quels effets de bord neutraliser ?' },
          body: { en: 'Replaying a month of orders must not send a month of emails.', fr: 'Rejouer un mois de commandes ne doit pas envoyer un mois d\'emails.' },
          bullets: [
            { en: 'A replay flag on the message that outbound consumers honour', fr: 'Un indicateur de rejeu sur le message, respecté par les consommateurs sortants' },
            { en: 'Idempotency helps, but only for effects already applied once', fr: 'L\'idempotence aide, mais seulement pour les effets déjà appliqués une fois' },
            { en: 'List the consumers with external side effects now, while it is calm', fr: 'Recense maintenant les consommateurs à effets de bord externes, pendant que c\'est calme' }
          ] },
        { group: 'processing', icon: 'bug', title: { en: 'Tested how?', fr: 'Testé comment ?' },
          body: { en: 'A replay path that has never been run is a plan, not a capability.', fr: 'Un chemin de rejeu jamais exécuté est un plan, pas une capacité.' },
          bullets: [
            { en: 'Replay one day of history into staging, on a schedule', fr: 'Rejoue une journée d\'historique en préproduction, périodiquement' },
            { en: 'Compare the resulting state against production — differences are bugs you had anyway', fr: 'Compare l\'état obtenu à la production — les écarts sont des bugs déjà présents' }
          ] }
      ]
    }
  ]
};
