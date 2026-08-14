/* T5 — Modular monolith. */

import { cloudOf } from './services';
import type { Template } from './types';

export const monolith: Template = {
  id: 'monolith',
  name: { en: 'Modular monolith', fr: 'Monolithe modulaire' },
  tagline: {
    en: 'One deployable application, properly partitioned on the inside.',
    fr: 'Une seule application déployable, bien découpée à l\'intérieur.'
  },
  intro: {
    en: 'This describes a modular monolith, not an accidental one. Modules are named components with explicit dependencies — which is exactly what makes a future split possible instead of theoretical.',
    fr: 'Ceci décrit un monolithe modulaire, pas un monolithe accidentel. Les modules sont des composants nommés avec des dépendances explicites — c\'est précisément ce qui rend un découpage futur possible plutôt que théorique.'
  },
  icon: 'box',
  accent: '#8A8C34',
  accentDark: '#D2668F',
  supportedTargets: ['agnostic', 'aws', 'gcp', 'azure', 'selfhosted'],

  whenToUse: [
    { en: 'One team, one deployment, a domain that is still moving', fr: 'Une équipe, un déploiement, un domaine métier encore mouvant' },
    { en: 'Transactions naturally cross several modules', fr: 'Les transactions traversent naturellement plusieurs modules' },
    { en: 'You want to move a boundary without negotiating an API contract', fr: 'On veut déplacer une frontière sans négocier de contrat d\'API' },
    { en: 'Operating one thing well beats operating six things badly', fr: 'Opérer une chose correctement vaut mieux qu\'en opérer six mal' }
  ],
  whenNotToUse: [
    { en: 'Several teams blocking each other on the same release', fr: 'Plusieurs équipes qui se bloquent sur la même release' },
    { en: 'One module scales radically differently from the rest', fr: 'Un module a des besoins de montée en charge radicalement différents' },
    { en: 'Build or test time has passed what the team tolerates', fr: 'Le temps de build ou de test dépasse ce que l\'équipe tolère' }
  ],

  groups: [
    { id: 'app', name: { en: 'Application', fr: 'Application' }, short: { en: 'App', fr: 'App' },
      description: { en: 'The single deployable unit and its entry points.', fr: 'L\'unité déployable unique et ses points d\'entrée.' } },
    { id: 'modules', name: { en: 'Business modules', fr: 'Modules métier' }, short: { en: 'Modules', fr: 'Modules' },
      description: { en: 'Inside one process, but with boundaries you can name.', fr: 'Dans un même processus, mais avec des frontières nommables.' } },
    { id: 'data', name: { en: 'Data', fr: 'Données' }, short: { en: 'Data', fr: 'Données' },
      description: { en: 'One database, one schema per module.', fr: 'Une base, un schéma par module.' } },
    { id: 'platform', name: { en: 'Platform', fr: 'Plateforme' }, short: { en: 'Platform', fr: 'Plateforme' },
      description: { en: 'Backups, observability, delivery.', fr: 'Sauvegardes, observabilité, livraison.' } }
  ],

  layers: [
    { id: 'clients', name: { en: 'Clients', fr: 'Clients' }, desc: { en: 'Browser', fr: 'Navigateur' } },
    { id: 'edge', name: { en: 'Edge', fr: 'Edge' }, desc: { en: 'TLS and load balancing', fr: 'TLS et répartition de charge' } },
    { id: 'app', name: { en: 'Application', fr: 'Application' }, desc: { en: 'One process, several modules', fr: 'Un processus, plusieurs modules' } },
    { id: 'data', name: { en: 'Data', fr: 'Données' }, desc: { en: 'Relational · Cache · Files', fr: 'Relationnel · Cache · Fichiers' } },
    { id: 'platform', name: { en: 'Platform', fr: 'Plateforme' }, desc: { en: 'Supports everything above', fr: 'Supporte tout ce qui précède' } }
  ],

  components: [
    {
      id: 'web', name: { en: 'Web interface (server-rendered)', fr: 'Interface web (rendu serveur)' },
      group: 'app', layer: 'clients', icon: 'web',
      tech: ['SSR', 'HTML'],
      role: { en: 'The user interface, rendered by the application itself.', fr: 'L\'interface utilisateur, rendue par l\'application elle-même.' },
      features: [
        { en: 'Server-side rendering — no separate front-end deployment', fr: 'Rendu côté serveur — pas de déploiement front séparé' },
        { en: 'Progressive enhancement rather than a second application', fr: 'Amélioration progressive plutôt qu\'une deuxième application' }
      ],
      notes: [
        { en: 'Rendered by the application on every target. This is the simplification a monolith buys you.', fr: 'Rendu par l\'application sur toutes les cibles. C\'est la simplification qu\'achète un monolithe.' }
      ],
      deps: ['lb']
    },
    {
      id: 'lb', name: { en: 'Load balancer & TLS', fr: 'Répartiteur & TLS' },
      group: 'app', layer: 'edge', icon: 'route',
      tech: ['TLS', 'Health checks'],
      role: { en: 'Terminates TLS and spreads traffic across the running instances.', fr: 'Termine le TLS et répartit le trafic sur les instances actives.' },
      features: [
        { en: 'Health checks that actually check the database connection', fr: 'Contrôles de santé qui vérifient réellement la connexion à la base' },
        { en: 'Connection draining on deploy', fr: 'Vidange des connexions au déploiement' }
      ],
      deps: ['app'],
      cloud: cloudOf('loadBalancer')
    },
    {
      id: 'app', name: { en: 'Application', fr: 'Application' },
      group: 'app', layer: 'app', icon: 'server',
      tech: ['Runtime', 'Framework'],
      role: { en: 'The single deployable unit. Every module lives inside this process.', fr: 'L\'unité déployable unique. Chaque module vit dans ce processus.' },
      features: [
        { en: 'Horizontal scaling by running more identical instances', fr: 'Montée en charge horizontale en lançant plus d\'instances identiques' },
        { en: 'Stateless: no session on disk, no sticky routing', fr: 'Sans état : pas de session sur disque, pas de routage collant' },
        { en: 'One version of everything, deployed at once', fr: 'Une seule version de tout, déployée d\'un coup' }
      ],
      deps: ['mod-core', 'mod-billing', 'mod-notify', 'replica', 'cache'],
      cloud: cloudOf('containers', {
        aws: { name: 'ECS Fargate', tech: ['ECS', 'Fargate'], note: { en: 'Elastic Beanstalk is the lower-ceremony alternative if nobody on the team knows ECS.', fr: 'Elastic Beanstalk est l\'alternative moins cérémonieuse si personne dans l\'équipe ne connaît ECS.' } },
        azure: { name: 'Azure App Service', tech: ['App Service'] },
        selfhosted: { name: 'Docker Compose on a VM', tech: ['Docker Compose', 'systemd'], note: { en: 'Two VMs behind the load balancer, not one. A monolith on a single host is a single point of failure with extra steps.', fr: 'Deux VM derrière le répartiteur, pas une. Un monolithe sur un seul hôte est un point de défaillance unique avec des étapes en plus.' } }
      })
    },
    {
      id: 'mod-core', name: { en: 'Module — core domain', fr: 'Module — domaine principal' },
      group: 'modules', layer: 'app', icon: 'cube',
      tech: ['Internal module'],
      role: { en: 'The business the company is actually in.', fr: 'Le métier dans lequel l\'entreprise est réellement.' },
      features: [
        { en: 'Owns its own database schema', fr: 'Possède son propre schéma de base' },
        { en: 'Public interface other modules call; everything else is private', fr: 'Interface publique appelée par les autres modules ; tout le reste est privé' }
      ],
      notes: [
        { en: 'An internal module on every target — this is code organisation, not infrastructure.', fr: 'Un module interne sur toutes les cibles — c\'est de l\'organisation de code, pas de l\'infrastructure.' }
      ],
      deps: ['db', 'cache']
    },
    {
      id: 'mod-billing', name: { en: 'Module — billing', fr: 'Module — facturation' },
      group: 'modules', layer: 'app', icon: 'card',
      tech: ['Internal module'],
      role: { en: 'Invoices, subscriptions, dunning.', fr: 'Factures, abonnements, relances.' },
      features: [
        { en: 'Its own schema, joined to the core only through the public interface', fr: 'Son propre schéma, relié au domaine principal uniquement par l\'interface publique' },
        { en: 'Usually the first module worth extracting — it changes on its own rhythm', fr: 'Souvent le premier module qui vaut d\'être extrait — il évolue à son propre rythme' }
      ],
      deps: ['db']
    },
    {
      id: 'mod-notify', name: { en: 'Module — notifications', fr: 'Module — notifications' },
      group: 'modules', layer: 'app', icon: 'bell',
      tech: ['Internal module'],
      role: { en: 'Email, push and in-app messages, triggered by the other modules.', fr: 'Emails, push et messages in-app, déclenchés par les autres modules.' },
      features: [
        { en: 'Templates and rendering in one place', fr: 'Gabarits et rendu au même endroit' },
        { en: 'Called through events, never by reaching into another module\'s tables', fr: 'Appelé par événements, jamais en allant lire les tables d\'un autre module' }
      ],
      deps: ['files']
    },
    {
      id: 'jobs', name: { en: 'Background jobs', fr: 'Tâches de fond' },
      group: 'app', layer: 'app', icon: 'clock',
      tech: ['Scheduler'],
      role: { en: 'Scheduled work: reports, cleanups, reconciliations.', fr: 'Travail planifié : rapports, nettoyages, rapprochements.' },
      features: [
        { en: 'Same image as the application, different entry point', fr: 'Même image que l\'application, point d\'entrée différent' },
        { en: 'One lock so two instances never run the same job', fr: 'Un verrou pour que deux instances ne lancent jamais la même tâche' }
      ],
      deps: ['db', 'files'],
      cloud: cloudOf('jobs')
    },
    {
      id: 'db', name: { en: 'Relational database', fr: 'Base relationnelle' },
      group: 'data', layer: 'data', icon: 'db',
      tech: ['PostgreSQL'],
      role: { en: 'One database, one schema per module. Transactions are the whole point.', fr: 'Une base, un schéma par module. Les transactions sont tout l\'intérêt.' },
      features: [
        { en: 'Multi-AZ or streaming replication — an unreplicated primary is not a plan', fr: 'Multi-AZ ou réplication en flux — un primaire non répliqué n\'est pas un plan' },
        { en: 'Migrations run before the new version takes traffic', fr: 'Les migrations passent avant que la nouvelle version ne prenne du trafic' },
        { en: 'Grants per module schema, enforced by the database', fr: 'Droits par schéma de module, appliqués par la base' }
      ],
      cloud: cloudOf('sql', {
        aws: { name: 'Amazon RDS for PostgreSQL (Multi-AZ)', tech: ['RDS', 'PostgreSQL'] }
      })
    },
    {
      id: 'replica', name: { en: 'Read replica', fr: 'Réplica de lecture' },
      group: 'data', layer: 'data', icon: 'db',
      tech: ['Replication'],
      role: { en: 'Absorbs reporting and list queries so they cannot hurt writes.', fr: 'Absorbe les requêtes de reporting et de listes pour qu\'elles ne gênent pas les écritures.' },
      features: [
        { en: 'Read-only by construction', fr: 'Lecture seule par construction' },
        { en: 'Replication lag is visible to the application, or it will bite', fr: 'Le retard de réplication est visible pour l\'application, sinon il mordra' }
      ],
      notes: [
        { en: 'Never route a read-after-write through the replica. That bug is intermittent and expensive.', fr: 'Ne route jamais une lecture après écriture vers le réplica. Ce bug est intermittent et coûteux.' }
      ],
      cloud: cloudOf('sql', {
        aws: { name: 'RDS read replica', tech: ['RDS'] },
        gcp: { name: 'Cloud SQL read replica', tech: ['Cloud SQL'] },
        azure: { name: 'PostgreSQL read replica', tech: ['Flexible Server'] },
        selfhosted: { name: 'Streaming replica (hot standby)', tech: ['PostgreSQL', 'Patroni'] }
      })
    },
    {
      id: 'cache', name: { en: 'Cache', fr: 'Cache' },
      group: 'data', layer: 'data', icon: 'bolt',
      tech: ['Key-value'],
      role: { en: 'Sessions, rate limits and the handful of queries that hurt.', fr: 'Sessions, limitation de débit et la poignée de requêtes qui font mal.' },
      features: [
        { en: 'Every key has a TTL', fr: 'Chaque clé a une durée de vie' },
        { en: 'The application must still work when the cache is empty', fr: 'L\'application doit continuer à fonctionner cache vide' }
      ],
      cloud: cloudOf('cache')
    },
    {
      id: 'files', name: { en: 'Files', fr: 'Fichiers' },
      group: 'data', layer: 'data', icon: 'save',
      tech: ['Object storage'],
      role: { en: 'Uploads, exports and generated documents.', fr: 'Dépôts, exports et documents générés.' },
      features: [
        { en: 'Never on the instance disk — instances are replaceable', fr: 'Jamais sur le disque de l\'instance — les instances sont remplaçables' },
        { en: 'Pre-signed URLs for upload and download', fr: 'URL pré-signées pour le dépôt et le téléchargement' }
      ],
      cloud: cloudOf('objects')
    },
    {
      id: 'backup', name: { en: 'Backup & restore', fr: 'Sauvegarde & restauration' },
      group: 'platform', layer: 'platform', icon: 'shield',
      tech: ['Snapshots', 'PITR'],
      role: { en: 'The thing that turns a bad migration into an inconvenience.', fr: 'Ce qui transforme une mauvaise migration en désagrément.' },
      features: [
        { en: 'Point-in-time recovery on the database', fr: 'Restauration à un instant donné sur la base' },
        { en: 'A restore rehearsed on a schedule, not improvised during an incident', fr: 'Une restauration répétée à intervalle régulier, pas improvisée pendant un incident' },
        { en: 'A written recovery time objective, agreed with the business', fr: 'Un objectif de temps de reprise écrit, validé avec le métier' }
      ],
      cloud: cloudOf('backup')
    },
    {
      id: 'obs', name: { en: 'Logs & metrics', fr: 'Logs & métriques' },
      group: 'platform', layer: 'platform', icon: 'chart',
      tech: ['Logs', 'Metrics'],
      role: { en: 'One process is easy to observe. Use the advantage.', fr: 'Un seul processus est facile à observer. Profite de l\'avantage.' },
      features: [
        { en: 'Request logs with a correlation id', fr: 'Logs de requêtes avec un identifiant de corrélation' },
        { en: 'Slow-query log on, and read weekly', fr: 'Journal des requêtes lentes activé, et relu chaque semaine' },
        { en: 'Alerts on error rate, latency and replication lag', fr: 'Alertes sur le taux d\'erreur, la latence et le retard de réplication' }
      ],
      cloud: cloudOf('observability')
    },
    {
      id: 'cicd', name: { en: 'CI/CD', fr: 'CI/CD' },
      group: 'platform', layer: 'platform', icon: 'git',
      tech: ['CI', 'Migrations'],
      role: { en: 'Build once, migrate, roll out, and be able to go back.', fr: 'Construire une fois, migrer, déployer, et pouvoir revenir.' },
      features: [
        { en: 'Architecture tests that fail when a module boundary is crossed', fr: 'Tests d\'architecture qui échouent quand une frontière de module est franchie' },
        { en: 'Migrations applied as a separate, reversible step', fr: 'Migrations appliquées comme une étape séparée et réversible' },
        { en: 'Rolling deploy with the old version still able to read the new schema', fr: 'Déploiement progressif où l\'ancienne version sait encore lire le nouveau schéma' }
      ],
      cloud: cloudOf('cicd', {
        aws: { name: 'GitHub Actions + CodeDeploy', tech: ['GitHub Actions', 'CodeDeploy'] },
        gcp: { name: 'Cloud Build', tech: ['Cloud Build'] },
        azure: { name: 'GitHub Actions', tech: ['GitHub Actions'] }
      })
    }
  ],

  flows: [
    {
      id: 'request',
      name: { en: 'Life of a request', fr: 'Cycle de vie d\'une requête' },
      group: 'app',
      sub: { en: 'Browser → load balancer → application → module → database', fr: 'Navigateur → répartiteur → application → module → base' },
      steps: [
        { component: 'web', title: { en: 'Request issued', fr: 'Requête émise' },
          description: { en: 'The browser posts a form or asks for a page.', fr: 'Le navigateur poste un formulaire ou demande une page.' } },
        { component: 'lb', title: { en: 'TLS and routing', fr: 'TLS et routage' },
          description: { en: 'The balancer terminates TLS and picks a healthy instance.', fr: 'Le répartiteur termine le TLS et choisit une instance saine.' } },
        { component: 'app', title: { en: 'Session resolved', fr: 'Session résolue' },
          description: { en: 'The application reads the session from the cache and identifies the user.', fr: 'L\'application lit la session dans le cache et identifie l\'utilisateur.' } },
        { component: 'mod-core', title: { en: 'Business rule applied', fr: 'Règle métier appliquée' },
          description: { en: 'The core module executes inside a single transaction.', fr: 'Le module principal s\'exécute dans une seule transaction.' } },
        { component: 'db', title: { en: 'Committed', fr: 'Commit' },
          description: { en: 'One transaction across several module schemas — the monolith\'s real advantage.', fr: 'Une transaction sur plusieurs schémas de modules — le vrai avantage du monolithe.' } },
        { component: 'mod-notify', title: { en: 'Notification queued', fr: 'Notification mise en attente' },
          description: { en: 'The notification module reacts to the domain event and sends afterwards.', fr: 'Le module notifications réagit à l\'événement métier et envoie ensuite.' } }
      ]
    },
    {
      id: 'deploy',
      name: { en: 'A deployment', fr: 'Un déploiement' },
      group: 'platform',
      sub: { en: 'Build → migrate → roll out → verify → roll back', fr: 'Build → migration → bascule → vérification → rollback' },
      note: {
        en: '<b>The schema migration is the real risk of a monolith.</b> Everything else here is reversible in a minute; a destructive migration is not reversible at all.',
        fr: '<b>La migration de schéma est le vrai risque d\'un monolithe.</b> Tout le reste est réversible en une minute ; une migration destructrice ne l\'est pas du tout.'
      },
      steps: [
        { component: 'cicd', title: { en: 'Build and test', fr: 'Build et tests' },
          description: { en: 'One image, tagged with the commit. Architecture tests run here.', fr: 'Une image, taguée avec le commit. Les tests d\'architecture passent ici.' } },
        { component: 'backup', title: { en: 'Snapshot taken', fr: 'Instantané pris' },
          description: { en: 'A restore point immediately before the migration.', fr: 'Un point de restauration juste avant la migration.' } },
        { component: 'db', title: { en: 'Migration applied', fr: 'Migration appliquée' },
          description: { en: 'Additive only: add columns, never drop one in the same release that stops writing it.', fr: 'Additif uniquement : ajouter des colonnes, jamais en supprimer dans la release qui cesse de les écrire.' } },
        { component: 'app', title: { en: 'New instances started', fr: 'Nouvelles instances démarrées' },
          description: { en: 'Started alongside the old ones, not instead of them.', fr: 'Démarrées à côté des anciennes, pas à leur place.' } },
        { component: 'lb', title: { en: 'Traffic switched', fr: 'Trafic basculé' },
          description: { en: 'Health checks pass, old connections drain, traffic moves.', fr: 'Les contrôles de santé passent, les anciennes connexions se vident, le trafic bascule.' } },
        { component: 'obs', title: { en: 'Verified', fr: 'Vérifié' },
          description: { en: 'Error rate and latency watched for the next few minutes, not the next few seconds.', fr: 'Taux d\'erreur et latence surveillés les minutes suivantes, pas les secondes suivantes.' } },
        { component: 'cicd', title: { en: 'Roll back if needed', fr: 'Rollback si nécessaire' },
          description: { en: 'Redeploy the previous image. It still reads the new schema — that is why the migration was additive.', fr: 'Redéployer l\'image précédente. Elle sait encore lire le nouveau schéma — c\'est pour cela que la migration était additive.' } }
      ]
    }
  ],

  sections: [
    {
      id: 'boundaries', tab: { en: 'Boundaries', fr: 'Frontières' }, type: 'cards',
      title: { en: 'Holding the internal boundaries', fr: 'Tenir les frontières internes' },
      subtitle: {
        en: 'A monolith degrades into a big ball of mud through a hundred small shortcuts, each individually reasonable. These are the four that stop it.',
        fr: 'Un monolithe se dégrade en plat de spaghettis par cent petits raccourcis, chacun raisonnable pris isolément. Voici les quatre qui l\'en empêchent.'
      },
      items: [
        { group: 'modules', icon: 'layers', title: { en: 'One schema per module', fr: 'Un schéma par module' },
          body: { en: 'Each module owns its tables and grants access to nobody else.', fr: 'Chaque module possède ses tables et n\'en donne l\'accès à personne d\'autre.' },
          bullets: [
            { en: 'Enforced by database grants, not by convention', fr: 'Appliqué par les droits de la base, pas par convention' },
            { en: 'A cross-schema join is the first symptom of a boundary going', fr: 'Une jointure inter-schémas est le premier symptôme d\'une frontière qui cède' },
            { en: 'This is what makes a later extraction a move rather than a rewrite', fr: 'C\'est ce qui fait d\'une extraction ultérieure un déplacement plutôt qu\'une réécriture' }
          ] },
        { group: 'modules', icon: 'shield', title: { en: 'Public interface only', fr: 'Interface publique uniquement' },
          body: { en: 'Modules call each other through a declared interface, never by importing internals.', fr: 'Les modules s\'appellent par une interface déclarée, jamais en important les entrailles.' },
          bullets: [
            { en: 'One entry file per module; everything else is package-private', fr: 'Un fichier d\'entrée par module ; tout le reste est privé au paquet' },
            { en: 'The interface is the future API contract — write it as if it were remote', fr: 'L\'interface est le futur contrat d\'API — écris-la comme si elle était distante' }
          ] },
        { group: 'platform', icon: 'bug', title: { en: 'Architecture tests', fr: 'Tests d\'architecture' },
          body: { en: 'A test that fails the build when a module reaches somewhere it should not.', fr: 'Un test qui casse le build quand un module va là où il ne devrait pas.' },
          bullets: [
            { en: 'Forbidden import graph, checked in CI', fr: 'Graphe d\'imports interdits, vérifié en intégration continue' },
            { en: 'Cheap to add on day one, near impossible to retrofit at year three', fr: 'Peu coûteux à ajouter le premier jour, presque impossible à rétro-ajouter la troisième année' },
            { en: 'A failing boundary test is a design conversation, not a chore', fr: 'Un test de frontière qui échoue est une conversation de conception, pas une corvée' }
          ] },
        { group: 'app', icon: 'route', title: { en: 'Events inside the process', fr: 'Événements dans le processus' },
          body: { en: 'Modules react to domain events rather than calling each other directly.', fr: 'Les modules réagissent à des événements métier plutôt que de s\'appeler directement.' },
          bullets: [
            { en: 'An in-process event bus, published in the same transaction', fr: 'Un bus d\'événements en mémoire, publié dans la même transaction' },
            { en: 'The day a module leaves, its subscription becomes a queue and nothing else changes', fr: 'Le jour où un module part, son abonnement devient une file et rien d\'autre ne change' }
          ] }
      ]
    },
    {
      id: 'signals', tab: { en: 'Split signals', fr: 'Signaux' }, type: 'table',
      title: { en: 'Signals it is time to split', fr: 'Signaux de découpage' },
      subtitle: {
        en: 'Split on an observable symptom, never on a diagram. Each row is something you can measure this week.',
        fr: 'On découpe sur un symptôme observable, jamais sur un schéma. Chaque ligne est mesurable cette semaine.'
      },
      columns: [
        { label: { en: 'Symptom', fr: 'Symptôme' }, width: '26%' },
        { label: { en: 'How to measure it', fr: 'Comment le mesurer' } },
        { label: { en: 'What to extract first', fr: 'Ce qu\'on extrait en premier' }, width: '28%' }
      ],
      rows: [
        [{ en: 'Releases queue up behind each other', fr: 'Les releases s\'empilent les unes derrière les autres' },
         { en: 'Time between "merged" and "in production", split by team', fr: 'Délai entre « fusionné » et « en production », par équipe' },
         { en: 'The module of the team that waits the most', fr: 'Le module de l\'équipe qui attend le plus' }],
        [{ en: 'One module dominates the load', fr: 'Un module domine la charge' },
         { en: 'CPU time per module, from the profiler or per-endpoint metrics', fr: 'Temps CPU par module, via le profileur ou les métriques par endpoint' },
         { en: 'That module — it is the one that needs its own scaling curve', fr: 'Ce module — c\'est lui qui a besoin de sa propre courbe de charge' }],
        [{ en: 'The test suite has become a coffee break', fr: 'La suite de tests est devenue une pause café' },
         { en: 'Wall-clock time of a full CI run on a cold cache', fr: 'Durée réelle d\'une exécution complète de CI à cache froid' },
         { en: 'Nothing yet — first parallelise and split the suite by module', fr: 'Rien encore — parallélise d\'abord et découpe la suite par module' }],
        [{ en: 'A failure in one area takes everything down', fr: 'Une panne dans un domaine fait tout tomber' },
         { en: 'Incident post-mortems: how often the blast radius exceeded the module', fr: 'Post-mortems : combien de fois le rayon d\'impact a dépassé le module' },
         { en: 'The module involved in the last three incidents', fr: 'Le module impliqué dans les trois derniers incidents' }],
        [{ en: 'Two modules change for opposite reasons', fr: 'Deux modules changent pour des raisons opposées' },
         { en: 'Commit coupling: how often the same commit touches both', fr: 'Couplage de commits : combien de fois un même commit touche les deux' },
         { en: 'Neither — low coupling means splitting buys you nothing here', fr: 'Aucun — un couplage faible signifie que le découpage n\'apporte rien ici' }],
        [{ en: 'Onboarding takes more than a fortnight', fr: 'L\'intégration d\'un nouveau dépasse deux semaines' },
         { en: 'Time until a new joiner ships to production unaided', fr: 'Délai avant qu\'un nouvel arrivant livre seul en production' },
         { en: 'Usually a documentation problem wearing an architecture costume', fr: 'Souvent un problème de documentation déguisé en problème d\'architecture' }]
      ]
    },
    {
      id: 'extract', tab: { en: 'First split', fr: 'Premier découpage' }, type: 'timeline',
      title: { en: 'Extracting a first service', fr: 'Extraire un premier service' },
      subtitle: {
        en: 'Start with the least coupled module, not the most painful one. The first extraction is a rehearsal — you want it boring.',
        fr: 'Commence par le module le moins couplé, pas le plus douloureux. La première extraction est une répétition — elle doit être ennuyeuse.'
      },
      lineTitle: { en: 'Three steps', fr: 'Trois étapes' },
      items: [
        { group: 'modules', period: { en: 'Step 1', fr: 'Étape 1' },
          title: { en: 'Make the boundary real, in place', fr: 'Rendre la frontière réelle, sur place' },
          bullets: [
            { en: 'Route every call through the public interface, still in-process', fr: 'Fais passer chaque appel par l\'interface publique, toujours en processus' },
            { en: 'Remove every cross-schema query, replacing joins with interface calls', fr: 'Supprime chaque requête inter-schémas, en remplaçant les jointures par des appels d\'interface' },
            { en: 'When this hurts, you have found out what the extraction would have cost anyway', fr: 'Si cela fait mal, tu viens d\'apprendre ce que l\'extraction aurait coûté de toute façon' }
          ] },
        { group: 'app', period: { en: 'Step 2', fr: 'Étape 2' },
          title: { en: 'Move the data', fr: 'Déplacer les données' },
          bullets: [
            { en: 'Its schema becomes its own database, replicated until cutover', fr: 'Son schéma devient sa propre base, répliquée jusqu\'à la bascule' },
            { en: 'Anything that was a transaction across the boundary becomes a compensation', fr: 'Tout ce qui était une transaction traversant la frontière devient une compensation' },
            { en: 'This is the step that fails. Do it on the least coupled module', fr: 'C\'est l\'étape qui échoue. Fais-la sur le module le moins couplé' }
          ] },
        { group: 'platform', period: { en: 'Step 3', fr: 'Étape 3' },
          title: { en: 'Move the process', fr: 'Déplacer le processus' },
          bullets: [
            { en: 'The interface becomes a remote call; the caller gains a timeout and a fallback', fr: 'L\'interface devient un appel distant ; l\'appelant gagne un timeout et un repli' },
            { en: 'Its own pipeline, its own alerts, its own on-call rota', fr: 'Son pipeline, ses alertes, sa propre astreinte' },
            { en: 'Only now count the cost — and decide whether a second extraction is worth it', fr: 'Ce n\'est qu\'ici qu\'on compte le coût — et qu\'on décide si une deuxième extraction en vaut la peine' }
          ] }
      ],
      aside: [
        { group: 'platform', title: { en: 'Do not skip step one', fr: 'Ne saute pas la première étape' },
          body: { en: 'Teams that extract a service before making the boundary real in-process end up with a distributed monolith: the same coupling, now over the network, with timeouts. Step one is cheap and reversible. Step three is neither.', fr: 'Les équipes qui extraient un service avant d\'avoir rendu la frontière réelle en processus obtiennent un monolithe distribué : le même couplage, mais sur le réseau, avec des timeouts. L\'étape 1 est bon marché et réversible. L\'étape 3 n\'est ni l\'un ni l\'autre.' } }
      ]
    }
  ]
};
