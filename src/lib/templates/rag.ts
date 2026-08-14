/* T3 — Retrieval-augmented generation over a document corpus. */

import { cloudOf } from './services';
import type { Template } from './types';

export const rag: Template = {
  id: 'rag',
  name: { en: 'RAG — questions over documents', fr: 'RAG — questions sur documents' },
  tagline: {
    en: 'Answer questions about your own corpus, with citations.',
    fr: 'Répondre à des questions sur ton propre corpus, avec les sources.'
  },
  intro: {
    en: 'Retrieval-augmented generation puts your documents in front of a model that never saw them. Most of the engineering is in retrieval, not in generation: the model can only be as right as the passages you hand it.',
    fr: 'La génération augmentée par récupération met tes documents sous les yeux d\'un modèle qui ne les a jamais vus. L\'essentiel du travail est dans la récupération, pas dans la génération : le modèle ne peut être juste que dans la mesure des passages qu\'on lui donne.'
  },
  icon: 'ai',
  accent: '#A36FAF',
  accentDark: '#9575E8',
  supportedTargets: ['agnostic', 'aws', 'gcp', 'azure', 'selfhosted'],

  whenToUse: [
    { en: 'A proprietary corpus the model never saw during training', fr: 'Un corpus propriétaire qu\'un modèle n\'a pas vu à l\'entraînement' },
    { en: 'Answers must cite their sources', fr: 'Les réponses doivent citer leurs sources' },
    { en: 'The corpus changes — fine-tuning would never keep up', fr: 'Le corpus évolue — un fine-tuning ne suivrait pas' },
    { en: 'Access rights differ per user and must be respected in the answer', fr: 'Les droits d\'accès diffèrent par utilisateur et doivent être respectés dans la réponse' }
  ],
  whenNotToUse: [
    { en: 'The question is about structured data — a SQL query beats a RAG, every time', fr: 'La question porte sur des données structurées — une requête SQL bat un RAG, toujours' },
    { en: 'A corpus under roughly fifty pages: putting all of it in the context costs less', fr: 'Un corpus de moins d\'une cinquantaine de pages : le mettre entièrement dans le contexte coûte moins cher' },
    { en: 'You need exact, verifiable answers — a RAG produces plausible, not certain', fr: 'Il faut des réponses exactes et vérifiables — un RAG produit du plausible, pas du certain' }
  ],

  groups: [
    { id: 'ingestion', name: { en: 'Ingestion', fr: 'Ingestion' }, short: { en: 'Ingest', fr: 'Ingestion' },
      description: { en: 'Turning documents into retrievable passages.', fr: 'Transformer des documents en passages récupérables.' } },
    { id: 'index', name: { en: 'Index & data', fr: 'Index & données' }, short: { en: 'Index', fr: 'Index' },
      description: { en: 'Vectors, source documents, permissions.', fr: 'Vecteurs, documents source, permissions.' } },
    { id: 'answering', name: { en: 'Answering service', fr: 'Service de réponse' }, short: { en: 'Answer', fr: 'Réponse' },
      description: { en: 'Retrieve, rank, generate, check.', fr: 'Récupérer, classer, générer, vérifier.' } },
    { id: 'quality', name: { en: 'Platform & quality', fr: 'Plateforme & qualité' }, short: { en: 'Quality', fr: 'Qualité' },
      description: { en: 'How you know whether it still works.', fr: 'Comment savoir si cela fonctionne encore.' } }
  ],

  layers: [
    { id: 'clients', name: { en: 'Clients', fr: 'Clients' }, desc: { en: 'Chat and query API', fr: 'Conversation et API de requêtage' } },
    { id: 'ingestion', name: { en: 'Ingestion', fr: 'Ingestion' }, desc: { en: 'Connect · Extract · Chunk · Embed', fr: 'Connecter · Extraire · Découper · Vectoriser' } },
    { id: 'index', name: { en: 'Index & data', fr: 'Index & données' }, desc: { en: 'Vectors · Documents · Permissions', fr: 'Vecteurs · Documents · Permissions' } },
    { id: 'inference', name: { en: 'Inference', fr: 'Inférence' }, desc: { en: 'Retrieve · Rerank · Generate · Guard', fr: 'Récupérer · Reclasser · Générer · Filtrer' } },
    { id: 'platform', name: { en: 'Platform', fr: 'Plateforme' }, desc: { en: 'Supports everything above', fr: 'Supporte tout ce qui précède' } }
  ],

  components: [
    {
      id: 'chat', name: { en: 'Conversation interface', fr: 'Interface de conversation' },
      group: 'answering', layer: 'clients', icon: 'chat',
      tech: ['Web app', 'Streaming'],
      role: { en: 'Where the question is asked and the answer, with its sources, comes back.', fr: 'Là où la question est posée et où la réponse, avec ses sources, revient.' },
      features: [
        { en: 'Citations shown next to the sentence they support, not in a footnote', fr: 'Citations affichées près de la phrase qu\'elles étayent, pas en note de bas de page' },
        { en: 'A visible "I could not find this" state — abstention has to look deliberate', fr: 'Un état « je n\'ai pas trouvé » visible — l\'abstention doit sembler délibérée' },
        { en: 'Thumbs up and down feeding the evaluation set', fr: 'Pouces haut et bas alimentant le jeu d\'évaluation' }
      ],
      notes: [
        { en: 'Vendor-neutral: an ordinary web application on every target.', fr: 'Agnostique : une application web ordinaire sur toutes les cibles.' }
      ],
      deps: ['api']
    },
    {
      id: 'api', name: { en: 'Query API', fr: 'API de requêtage' },
      group: 'answering', layer: 'clients', icon: 'plug',
      tech: ['HTTP API', 'SSE'],
      role: { en: 'Orchestrates one question: retrieve, rank, generate, check, stream back.', fr: 'Orchestre une question : récupérer, classer, générer, vérifier, renvoyer en flux.' },
      features: [
        { en: 'Resolves the caller\'s permissions before anything is searched', fr: 'Résout les droits de l\'appelant avant toute recherche' },
        { en: 'Streams tokens so the wait is visible rather than silent', fr: 'Diffuse les jetons pour que l\'attente soit visible plutôt que silencieuse' },
        { en: 'A hard timeout — a slow answer is worse than a refusal', fr: 'Un timeout strict — une réponse lente est pire qu\'un refus' }
      ],
      deps: ['retriever', 'llm', 'guard', 'cache', 'trace'],
      cloud: cloudOf('containers', {
        aws: { name: 'API Gateway + AWS Lambda', tech: ['API Gateway', 'Lambda'] }
      })
    },
    {
      id: 'connectors', name: { en: 'Source connectors', fr: 'Connecteurs de sources' },
      group: 'ingestion', layer: 'ingestion', icon: 'plug',
      tech: ['Object storage', 'Drive', 'SharePoint', 'Confluence'],
      role: { en: 'Pulls documents from wherever they already live, and notices when they change.', fr: 'Récupère les documents là où ils vivent déjà, et remarque quand ils changent.' },
      features: [
        { en: 'Incremental sync — full re-ingestion is a cost you pay once and then avoid', fr: 'Synchronisation incrémentale — la ré-ingestion complète est un coût qu\'on paie une fois puis qu\'on évite' },
        { en: 'Carries the source permissions across, at the same time as the content', fr: 'Transporte les droits de la source en même temps que le contenu' },
        { en: 'A deletion in the source must become a deletion in the index', fr: 'Une suppression à la source doit devenir une suppression dans l\'index' }
      ],
      notes: [
        { en: 'Vendor-neutral: the connectors depend on where your documents are, not on where you deploy.', fr: 'Agnostique : les connecteurs dépendent de l\'emplacement de tes documents, pas de ta cible de déploiement.' }
      ],
      deps: ['extract']
    },
    {
      id: 'extract', name: { en: 'Extraction & OCR', fr: 'Extraction & OCR' },
      group: 'ingestion', layer: 'ingestion', icon: 'scan',
      tech: ['OCR', 'Layout'],
      role: { en: 'Turns a PDF, a scan or a slide deck into text that keeps its structure.', fr: 'Transforme un PDF, un scan ou une présentation en texte qui garde sa structure.' },
      features: [
        { en: 'Tables kept as tables — flattening them destroys the answer', fr: 'Tables conservées comme tables — les aplatir détruit la réponse' },
        { en: 'Headings preserved, because they carry the context of every chunk below', fr: 'Titres préservés, car ils portent le contexte de chaque passage en dessous' },
        { en: 'Page numbers kept, so a citation can point somewhere real', fr: 'Numéros de page conservés, pour qu\'une citation pointe quelque part de réel' }
      ],
      deps: ['chunk'],
      cloud: cloudOf('ocr')
    },
    {
      id: 'chunk', name: { en: 'Chunking', fr: 'Découpage' },
      group: 'ingestion', layer: 'ingestion', icon: 'layers',
      tech: ['Application logic'],
      role: { en: 'Cuts documents into passages small enough to retrieve and large enough to mean something.', fr: 'Découpe les documents en passages assez petits pour être récupérés et assez grands pour vouloir dire quelque chose.' },
      features: [
        { en: 'Cut on structure — headings and sections — not on a character count', fr: 'Découpe sur la structure — titres et sections — pas sur un nombre de caractères' },
        { en: 'Overlap so a sentence split across two chunks is still findable', fr: 'Chevauchement pour qu\'une phrase coupée entre deux passages reste trouvable' },
        { en: 'Every chunk carries its document title and heading path', fr: 'Chaque passage transporte le titre du document et son chemin de titres' }
      ],
      notes: [
        { en: 'Vendor-neutral, and the single highest-leverage decision in this whole architecture.', fr: 'Agnostique, et la décision la plus déterminante de toute cette architecture.' }
      ],
      deps: ['embed']
    },
    {
      id: 'embed', name: { en: 'Embedding', fr: 'Vectorisation' },
      group: 'ingestion', layer: 'ingestion', icon: 'ai',
      tech: ['Embedding model'],
      role: { en: 'Turns each passage into the vector the index searches on.', fr: 'Transforme chaque passage en le vecteur sur lequel l\'index cherche.' },
      features: [
        { en: 'The same model for indexing and for querying — always', fr: 'Le même modèle pour l\'indexation et pour la requête — toujours' },
        { en: 'Model version stored with the vector, because changing it means reindexing everything', fr: 'Version du modèle stockée avec le vecteur, car en changer impose de tout réindexer' },
        { en: 'Batched, because per-passage calls are the expensive way to do this', fr: 'Par lots, parce que les appels passage par passage sont la façon chère de faire' }
      ],
      deps: ['vector'],
      cloud: cloudOf('embeddings')
    },
    {
      id: 'pipeline', name: { en: 'Ingestion orchestration', fr: 'Orchestration d\'ingestion' },
      group: 'ingestion', layer: 'ingestion', icon: 'hub',
      tech: ['Workflow'],
      role: { en: 'Runs the chain, resumes it after a failure, and reports what it skipped.', fr: 'Exécute la chaîne, la reprend après un échec, et signale ce qu\'elle a sauté.' },
      features: [
        { en: 'Per-document state, so one bad file does not stop a batch of ten thousand', fr: 'État par document, pour qu\'un fichier défectueux n\'arrête pas un lot de dix mille' },
        { en: 'Idempotent by content hash — reprocessing the same file changes nothing', fr: 'Idempotent par empreinte de contenu — retraiter le même fichier ne change rien' },
        { en: 'A visible queue of documents that failed extraction, reviewed weekly', fr: 'Une file visible des documents dont l\'extraction a échoué, relue chaque semaine' }
      ],
      deps: ['connectors', 'docstore', 'meta'],
      cloud: cloudOf('orchestration')
    },
    {
      id: 'vector', name: { en: 'Vector index', fr: 'Index vectoriel' },
      group: 'index', layer: 'index', icon: 'db',
      tech: ['ANN', 'Hybrid search'],
      role: { en: 'Finds the passages closest to a question, filtered by what the asker may see.', fr: 'Trouve les passages les plus proches d\'une question, filtrés par ce que le demandeur a le droit de voir.' },
      features: [
        { en: 'Hybrid: lexical and vector together beat either one alone', fr: 'Hybride : lexical et vectoriel ensemble battent chacun des deux seul' },
        { en: 'Permission filter applied inside the search, never after it', fr: 'Filtre de droits appliqué dans la recherche, jamais après' },
        { en: 'Metadata filters on source, date and document type', fr: 'Filtres de métadonnées sur la source, la date et le type de document' }
      ],
      cloud: cloudOf('vector')
    },
    {
      id: 'docstore', name: { en: 'Source documents', fr: 'Documents source' },
      group: 'index', layer: 'index', icon: 'save',
      tech: ['Object storage'],
      role: { en: 'The originals, so a citation can open the real page.', fr: 'Les originaux, pour qu\'une citation puisse ouvrir la vraie page.' },
      features: [
        { en: 'Immutable versions — an answer cites the version it actually read', fr: 'Versions immuables — une réponse cite la version qu\'elle a réellement lue' },
        { en: 'Short-lived signed links, checked against the same permissions', fr: 'Liens signés de courte durée, vérifiés contre les mêmes droits' }
      ],
      cloud: cloudOf('objects')
    },
    {
      id: 'meta', name: { en: 'Metadata & access control', fr: 'Métadonnées & droits' },
      group: 'index', layer: 'index', icon: 'lock',
      tech: ['Document store'],
      role: { en: 'Who may see which document, and everything the index needs to filter on.', fr: 'Qui peut voir quel document, et tout ce sur quoi l\'index doit filtrer.' },
      features: [
        { en: 'Permissions mirrored from the source system, refreshed on a schedule', fr: 'Droits recopiés du système source, rafraîchis périodiquement' },
        { en: 'Revocation propagates within minutes, not at the next full sync', fr: 'La révocation se propage en minutes, pas à la prochaine synchronisation complète' },
        { en: 'Ingestion state per document: extracted, chunked, embedded, failed', fr: 'État d\'ingestion par document : extrait, découpé, vectorisé, échoué' }
      ],
      cloud: cloudOf('nosql')
    },
    {
      id: 'retriever', name: { en: 'Retrieval & filtering', fr: 'Récupération & filtrage' },
      group: 'answering', layer: 'inference', icon: 'search',
      tech: ['BM25 + vectors', 'Fusion'],
      role: { en: 'Builds the candidate set the answer will be written from.', fr: 'Construit l\'ensemble de candidats à partir duquel la réponse sera écrite.' },
      features: [
        { en: 'Query rewriting so a follow-up question stands on its own', fr: 'Réécriture de la question pour qu\'une relance se suffise à elle-même' },
        { en: 'Lexical and vector results fused, then deduplicated by document', fr: 'Résultats lexicaux et vectoriels fusionnés, puis dédoublonnés par document' },
        { en: 'Retrieve wide, then rerank narrow — the opposite order does not work', fr: 'Récupérer large, puis reclasser serré — l\'ordre inverse ne fonctionne pas' }
      ],
      notes: [
        { en: 'Vendor-neutral: this is your own logic, whatever index sits underneath.', fr: 'Agnostique : c\'est ta propre logique, quel que soit l\'index en dessous.' }
      ],
      deps: ['vector', 'meta', 'rerank']
    },
    {
      id: 'rerank', name: { en: 'Reranking', fr: 'Reclassement' },
      group: 'answering', layer: 'inference', icon: 'chart',
      tech: ['Cross-encoder'],
      role: { en: 'Reads the candidates properly and reorders them by actual relevance.', fr: 'Lit correctement les candidats et les réordonne par pertinence réelle.' },
      features: [
        { en: 'Twenty candidates in, four passages out', fr: 'Vingt candidats en entrée, quatre passages en sortie' },
        { en: 'The cheapest large quality win available in a RAG', fr: 'Le gain de qualité le plus important au meilleur prix dans un RAG' },
        { en: 'Adds latency — measure whether the answer got better, not just different', fr: 'Ajoute de la latence — mesure si la réponse s\'est améliorée, pas seulement modifiée' }
      ],
      deps: ['docstore'],
      cloud: cloudOf('rerank')
    },
    {
      id: 'llm', name: { en: 'Generation model', fr: 'Modèle de génération' },
      group: 'answering', layer: 'inference', icon: 'ai',
      tech: ['LLM'],
      role: { en: 'Writes the answer using only the passages it was given.', fr: 'Rédige la réponse en n\'utilisant que les passages fournis.' },
      features: [
        { en: 'Instructed to abstain when the passages do not contain the answer', fr: 'Instruit de s\'abstenir quand les passages ne contiennent pas la réponse' },
        { en: 'Every claim tied to a passage id, so the citation is checkable', fr: 'Chaque affirmation liée à un identifiant de passage, pour que la citation soit vérifiable' },
        { en: 'A smaller model is often enough once retrieval is good', fr: 'Un modèle plus petit suffit souvent une fois la récupération correcte' }
      ],
      cloud: cloudOf('llm')
    },
    {
      id: 'guard', name: { en: 'Guardrails & PII', fr: 'Garde-fous & données personnelles' },
      group: 'answering', layer: 'inference', icon: 'shield',
      tech: ['Content safety', 'PII detection'],
      role: { en: 'Checks what goes in and what comes out, on both sides of the model.', fr: 'Contrôle ce qui entre et ce qui sort, des deux côtés du modèle.' },
      features: [
        { en: 'Personal data detected before it is logged or sent onward', fr: 'Données personnelles détectées avant journalisation ou transmission' },
        { en: 'Prompt-injection defence — a poisoned document is an attack path', fr: 'Défense contre l\'injection de prompt — un document empoisonné est un vecteur d\'attaque' },
        { en: 'A refusal is a valid answer, and should be recorded as one', fr: 'Un refus est une réponse valide, et doit être consigné comme telle' }
      ],
      cloud: cloudOf('guardrails')
    },
    {
      id: 'eval', name: { en: 'Evaluation & feedback', fr: 'Évaluation & retours' },
      group: 'quality', layer: 'platform', icon: 'bug',
      tech: ['Golden set'],
      role: { en: 'The reference question set that tells you whether a change helped.', fr: 'Le jeu de questions de référence qui dit si un changement a aidé.' },
      features: [
        { en: 'A hundred questions with known answers, written by people who know the corpus', fr: 'Une centaine de questions à réponses connues, écrites par ceux qui connaissent le corpus' },
        { en: 'Run on every change to chunking, embedding, retrieval or prompt', fr: 'Exécuté à chaque changement de découpage, de vectorisation, de récupération ou de prompt' },
        { en: 'Thumbs-down answers reviewed weekly and promoted into the set', fr: 'Réponses jugées mauvaises relues chaque semaine et promues dans le jeu' }
      ],
      notes: [
        { en: 'Vendor-neutral, and the component most often skipped. Without it, every change is a guess.', fr: 'Agnostique, et le composant le plus souvent sauté. Sans lui, chaque changement est un pari.' }
      ],
      deps: ['api']
    },
    {
      id: 'trace', name: { en: 'Request tracing', fr: 'Traçage des requêtes' },
      group: 'quality', layer: 'platform', icon: 'eye',
      tech: ['OpenTelemetry'],
      role: { en: 'For one bad answer, shows which passages were retrieved and in what order.', fr: 'Pour une mauvaise réponse, montre quels passages ont été récupérés et dans quel ordre.' },
      features: [
        { en: 'Retrieved passage ids and scores kept per request', fr: 'Identifiants et scores des passages récupérés conservés par requête' },
        { en: 'Token counts and latency per stage', fr: 'Nombre de jetons et latence par étape' },
        { en: 'Retention policy set deliberately — these traces contain user questions', fr: 'Politique de rétention posée délibérément — ces traces contiennent des questions d\'utilisateurs' }
      ],
      cloud: cloudOf('tracing')
    },
    {
      id: 'cache', name: { en: 'Answer cache', fr: 'Cache de réponses' },
      group: 'quality', layer: 'platform', icon: 'bolt',
      tech: ['Key-value'],
      role: { en: 'The same question asked twice should not be paid for twice.', fr: 'La même question posée deux fois ne devrait pas être payée deux fois.' },
      features: [
        { en: 'Keyed on the question and the asker\'s permission set — never on the question alone', fr: 'Clé sur la question et sur les droits du demandeur — jamais sur la question seule' },
        { en: 'Invalidated when the underlying documents change', fr: 'Invalidé quand les documents sous-jacents changent' }
      ],
      cloud: cloudOf('cache')
    }
  ],

  flows: [
    {
      id: 'ingest-doc',
      name: { en: 'Ingesting a document', fr: 'Ingestion d\'un document' },
      group: 'ingestion',
      sub: { en: 'Source → extract → chunk → embed → index', fr: 'Source → extraction → découpage → vectorisation → index' },
      note: {
        en: '<b>Permissions travel with the content.</b> A document ingested without its access rights is a document everybody can read through the answer.',
        fr: '<b>Les droits voyagent avec le contenu.</b> Un document ingéré sans ses droits d\'accès est un document que tout le monde peut lire à travers la réponse.'
      },
      steps: [
        { component: 'connectors', title: { en: 'Document picked up', fr: 'Document récupéré' },
          description: { en: 'New or changed since the last sync, with its permissions attached.', fr: 'Nouveau ou modifié depuis la dernière synchronisation, avec ses droits.' } },
        { component: 'pipeline', title: { en: 'Job started', fr: 'Traitement lancé' },
          description: { en: 'One resumable job per document, keyed by content hash.', fr: 'Un traitement reprenable par document, clé sur l\'empreinte du contenu.' } },
        { component: 'extract', title: { en: 'Text extracted', fr: 'Texte extrait' },
          description: { en: 'Layout, tables and page numbers preserved, not flattened.', fr: 'Mise en page, tables et numéros de page préservés, pas aplatis.' } },
        { component: 'chunk', title: { en: 'Cut into passages', fr: 'Découpé en passages' },
          description: { en: 'On headings, with overlap, each passage carrying its heading path.', fr: 'Sur les titres, avec chevauchement, chaque passage portant son chemin de titres.' } },
        { component: 'embed', title: { en: 'Vectorised', fr: 'Vectorisé' },
          description: { en: 'Batched, with the model version stored alongside each vector.', fr: 'Par lots, avec la version du modèle stockée près de chaque vecteur.' } },
        { component: 'vector', title: { en: 'Indexed', fr: 'Indexé' },
          description: { en: 'Vectors and lexical terms together, with the permission attributes.', fr: 'Vecteurs et termes lexicaux ensemble, avec les attributs de droits.' } },
        { component: 'meta', title: { en: 'State recorded', fr: 'État consigné' },
          description: { en: 'Marked queryable, or queued for review if extraction failed.', fr: 'Marqué interrogeable, ou mis en revue si l\'extraction a échoué.' } }
      ]
    },
    {
      id: 'ask',
      name: { en: 'One question, one answer', fr: 'Une question, une réponse' },
      group: 'answering',
      sub: { en: 'Question → permissions → retrieval → rerank → generation → check', fr: 'Question → droits → récupération → reclassement → génération → vérification' },
      note: {
        en: '<b>Step three is the security boundary.</b> Filtering by permission happens <i>before</i> the vector search, never on the results afterwards — a post-filter leaks the existence and the ranking of documents the user may not see.',
        fr: '<b>L\'étape trois est la frontière de sécurité.</b> Le filtrage par droits intervient <i>avant</i> la recherche vectorielle, jamais sur les résultats après coup — un filtre a posteriori révèle l\'existence et le classement de documents interdits à l\'utilisateur.'
      },
      steps: [
        { component: 'chat', title: { en: 'Question asked', fr: 'Question posée' },
          description: { en: 'Possibly a follow-up, which means it may not stand on its own.', fr: 'Éventuellement une relance, donc pas forcément autoportante.' } },
        { component: 'api', title: { en: 'Question rewritten', fr: 'Question réécrite' },
          description: { en: 'Conversation history folded in so the query is self-contained.', fr: 'Historique de conversation intégré pour que la requête se suffise.' } },
        { component: 'meta', title: { en: 'Permissions resolved', fr: 'Droits résolus' },
          description: { en: 'What this user may see becomes a filter, before anything is searched.', fr: 'Ce que cet utilisateur peut voir devient un filtre, avant toute recherche.' } },
        { component: 'vector', title: { en: 'Candidates retrieved', fr: 'Candidats récupérés' },
          description: { en: 'Hybrid search inside the permitted set. Twenty passages, deliberately wide.', fr: 'Recherche hybride dans l\'ensemble autorisé. Vingt passages, volontairement large.' } },
        { component: 'rerank', title: { en: 'Reranked', fr: 'Reclassé' },
          description: { en: 'A cross-encoder reads them properly and keeps the best four.', fr: 'Un cross-encoder les lit correctement et garde les quatre meilleurs.' } },
        { component: 'llm', title: { en: 'Answer generated', fr: 'Réponse générée' },
          description: { en: 'Written from those passages only, each claim tied to a passage id.', fr: 'Rédigée à partir de ces seuls passages, chaque affirmation liée à un identifiant.' } },
        { component: 'guard', title: { en: 'Output checked', fr: 'Sortie contrôlée' },
          description: { en: 'Personal data and unsupported claims caught before the user sees them.', fr: 'Données personnelles et affirmations non étayées interceptées avant l\'utilisateur.' } },
        { component: 'trace', title: { en: 'Recorded', fr: 'Consigné' },
          description: { en: 'Passages, scores, tokens and latency — this is what you debug from.', fr: 'Passages, scores, jetons et latence — c\'est ce qui permettra de déboguer.' } }
      ]
    }
  ],

  sections: [
    {
      id: 'degradation', tab: { en: 'Failure modes', fr: 'Dégradations' }, type: 'cards',
      title: { en: 'The four places a RAG degrades', fr: 'Les quatre endroits où un RAG se dégrade' },
      subtitle: {
        en: 'When an answer is wrong, it is almost never the model. Diagnose in this order — the first two account for most of it.',
        fr: 'Quand une réponse est fausse, ce n\'est presque jamais le modèle. Diagnostique dans cet ordre — les deux premiers expliquent l\'essentiel.'
      },
      items: [
        { group: 'ingestion', icon: 'layers', title: { en: '1 · Chunking that cuts the meaning', fr: '1 · Un découpage qui coupe le sens' },
          body: { en: 'A passage split mid-argument can never answer the question, however good the search is.', fr: 'Un passage coupé au milieu d\'un raisonnement ne peut pas répondre, quelle que soit la qualité de la recherche.' },
          bullets: [
            { en: 'Symptom: the right document is retrieved and the answer is still incomplete', fr: 'Symptôme : le bon document est récupéré et la réponse reste incomplète' },
            { en: 'Cut on structure, keep the heading path, overlap the boundaries', fr: 'Découpe sur la structure, garde le chemin de titres, fais se chevaucher les limites' },
            { en: 'Tables and lists need their own rule — the generic splitter destroys them', fr: 'Tables et listes ont besoin de leur propre règle — le découpeur générique les détruit' }
          ] },
        { group: 'index', icon: 'search', title: { en: '2 · Retrieval that misses the passage', fr: '2 · Une récupération qui rate le passage' },
          body: { en: 'The answer exists in the corpus and never reaches the model.', fr: 'La réponse existe dans le corpus et n\'atteint jamais le modèle.' },
          bullets: [
            { en: 'Symptom: you can find it by hand in ten seconds', fr: 'Symptôme : on la trouve à la main en dix secondes' },
            { en: 'Vector search alone misses exact terms, product codes and names — add lexical', fr: 'La recherche vectorielle seule rate les termes exacts, les références produit et les noms — ajoute du lexical' },
            { en: 'Measure recall@20 before touching anything else', fr: 'Mesure le recall@20 avant de toucher à autre chose' }
          ] },
        { group: 'answering', icon: 'box', title: { en: '3 · A context that is too long', fr: '3 · Un contexte trop long' },
          body: { en: 'Twenty passages do not beat four. Relevant material gets buried in the middle.', fr: 'Vingt passages ne valent pas mieux que quatre. Le pertinent se noie au milieu.' },
          bullets: [
            { en: 'Symptom: the answer quotes something adjacent to the point', fr: 'Symptôme : la réponse cite quelque chose d\'à côté du sujet' },
            { en: 'Rerank, then cut hard. Four good passages beat twenty plausible ones', fr: 'Reclasse, puis coupe franchement. Quatre bons passages battent vingt plausibles' },
            { en: 'Longer context also costs more and answers slower, for a worse result', fr: 'Un contexte plus long coûte aussi plus cher et répond plus lentement, pour un moins bon résultat' }
          ] },
        { group: 'answering', icon: 'alert', title: { en: '4 · A model that invents anyway', fr: '4 · Un modèle qui invente quand même' },
          body: { en: 'Correct passages, confident answer, wrong claim.', fr: 'Passages corrects, réponse assurée, affirmation fausse.' },
          bullets: [
            { en: 'Symptom: the citation exists but does not say what the answer claims', fr: 'Symptôme : la citation existe mais ne dit pas ce que la réponse affirme' },
            { en: 'Require a passage id per claim, and check it automatically', fr: 'Exige un identifiant de passage par affirmation, et vérifie-le automatiquement' },
            { en: 'Make abstention an explicitly rewarded behaviour in the evaluation set', fr: 'Fais de l\'abstention un comportement explicitement valorisé dans le jeu d\'évaluation' }
          ] }
      ]
    },
    {
      id: 'metrics', tab: { en: 'Quality', fr: 'Qualité' }, type: 'table',
      title: { en: 'Quality metrics', fr: 'Métriques de qualité' },
      subtitle: {
        en: 'Measured against the reference question set, on every change. A RAG with no evaluation set is a demo.',
        fr: 'Mesurées sur le jeu de questions de référence, à chaque changement. Un RAG sans jeu d\'évaluation est une démo.'
      },
      columns: [
        { label: { en: 'Metric', fr: 'Métrique' }, width: '22%' },
        { label: { en: 'What it answers', fr: 'À quelle question elle répond' } },
        { label: { en: 'What moves it', fr: 'Ce qui la fait bouger' }, width: '30%' }
      ],
      rows: [
        [{ en: 'recall@k', fr: 'recall@k' },
         { en: 'Is the passage that contains the answer in the retrieved set at all?', fr: 'Le passage qui contient la réponse est-il seulement dans l\'ensemble récupéré ?' },
         { en: 'Chunking, hybrid search, query rewriting. Fix this first — nothing downstream can compensate', fr: 'Découpage, recherche hybride, réécriture de requête. À corriger en premier — rien en aval ne compense' }],
        [{ en: 'Citation precision', fr: 'Précision des citations' },
         { en: 'Does the cited passage actually support the sentence?', fr: 'Le passage cité étaye-t-il réellement la phrase ?' },
         { en: 'Reranking, context size, and the prompt that ties claims to passage ids', fr: 'Reclassement, taille du contexte, et le prompt qui lie les affirmations aux identifiants' }],
        [{ en: 'Abstention rate', fr: 'Taux d\'abstention' },
         { en: 'How often it says "not in the corpus" — and how often it should have.', fr: 'À quelle fréquence il dit « absent du corpus » — et à quelle fréquence il aurait dû.' },
         { en: 'The prompt, and whether the evaluation set rewards abstention or punishes it', fr: 'Le prompt, et le fait que le jeu d\'évaluation récompense ou punisse l\'abstention' }],
        [{ en: 'p95 latency', fr: 'Latence p95' },
         { en: 'How long a user waits for a complete answer.', fr: 'Combien de temps un utilisateur attend une réponse complète.' },
         { en: 'Reranking, context length and generation. Streaming hides it without fixing it', fr: 'Reclassement, longueur du contexte et génération. Le streaming la masque sans la corriger' }],
        [{ en: 'Cost per question', fr: 'Coût par question' },
         { en: 'What one answer costs, end to end.', fr: 'Ce que coûte une réponse, de bout en bout.' },
         { en: 'Context size above all, then model choice, then the cache hit rate', fr: 'La taille du contexte avant tout, puis le choix du modèle, puis le taux de succès du cache' }],
        [{ en: 'Answer coverage', fr: 'Couverture des réponses' },
         { en: 'Share of real user questions the corpus can answer at all.', fr: 'Part des vraies questions utilisateur auxquelles le corpus peut répondre.' },
         { en: 'What is in the corpus. Low coverage is a content problem wearing an engineering costume', fr: 'Le contenu du corpus. Une couverture faible est un problème de contenu déguisé en problème technique' }]
      ]
    },
    {
      id: 'rag-security', tab: { en: 'Security', fr: 'Sécurité' }, type: 'cards',
      title: { en: 'Security', fr: 'Sécurité' },
      subtitle: {
        en: 'A RAG turns "who can open this file?" into "who can ask about it?" — and those are not the same question unless you make them so.',
        fr: 'Un RAG transforme « qui peut ouvrir ce fichier ? » en « qui peut poser des questions dessus ? » — et ce ne sont pas les mêmes questions, sauf à les rendre identiques.'
      },
      items: [
        { group: 'index', icon: 'lock', title: { en: 'Filter at retrieval, not after', fr: 'Filtrer à la récupération, pas après' },
          body: { en: 'Permissions belong inside the search query, as a hard filter.', fr: 'Les droits appartiennent à la requête de recherche, comme filtre strict.' },
          bullets: [
            { en: 'A post-filter still leaks: result counts and scores reveal what exists', fr: 'Un filtre a posteriori fuit quand même : le nombre de résultats et les scores révèlent ce qui existe' },
            { en: 'Revocation must reach the index in minutes, not at the next full sync', fr: 'La révocation doit atteindre l\'index en minutes, pas à la prochaine synchronisation complète' },
            { en: 'Test it: the same question, two users, different corpora', fr: 'Teste-le : même question, deux utilisateurs, corpus différents' }
          ] },
        { group: 'ingestion', icon: 'alert', title: { en: 'Prompt injection through documents', fr: 'Injection de prompt par les documents' },
          body: { en: 'A document that says "ignore your instructions" is an attack, and it is in your corpus.', fr: 'Un document qui dit « ignore tes instructions » est une attaque, et il est dans ton corpus.' },
          bullets: [
            { en: 'Retrieved passages are untrusted input — mark them as data, never as instructions', fr: 'Les passages récupérés sont une entrée non fiable — marque-les comme données, jamais comme instructions' },
            { en: 'Worse when the corpus accepts user uploads or external mail', fr: 'Pire quand le corpus accepte des dépôts d\'utilisateurs ou du courrier externe' },
            { en: 'The model must have no tool it cannot be trusted to misuse', fr: 'Le modèle ne doit disposer d\'aucun outil dont un mésusage serait grave' }
          ] },
        { group: 'index', icon: 'eye', title: { en: 'Leakage through embeddings', fr: 'Fuite par les vecteurs' },
          body: { en: 'Vectors are derived from text, and text can be partially recovered from them.', fr: 'Les vecteurs dérivent du texte, et le texte peut en être partiellement reconstitué.' },
          bullets: [
            { en: 'Treat the vector index with the same classification as the documents', fr: 'Traite l\'index vectoriel avec la même classification que les documents' },
            { en: 'Do not ship a vector store to a client application', fr: 'N\'expédie pas une base vectorielle vers une application cliente' }
          ] },
        { group: 'quality', icon: 'clock', title: { en: 'Conversation retention', fr: 'Rétention des conversations' },
          body: { en: 'Questions are often more sensitive than the documents they are about.', fr: 'Les questions sont souvent plus sensibles que les documents qu\'elles visent.' },
          bullets: [
            { en: 'A retention period decided on purpose, and short', fr: 'Une durée de rétention décidée exprès, et courte' },
            { en: 'Personal data stripped before traces are stored', fr: 'Données personnelles retirées avant stockage des traces' },
            { en: 'Say plainly, in the interface, what is kept and for how long', fr: 'Dis clairement, dans l\'interface, ce qui est conservé et combien de temps' }
          ] }
      ]
    },
    {
      id: 'rag-cost', tab: { en: 'Cost', fr: 'Coût' }, type: 'table',
      title: { en: 'Cost drivers', fr: 'Facteurs de coût' },
      subtitle: {
        en: 'Two very different bills: a large one-off to build the index, and a per-question one that scales with use.',
        fr: 'Deux factures très différentes : une grosse dépense unique pour construire l\'index, et une dépense par question qui suit l\'usage.'
      },
      columns: [
        { label: { en: 'Driver', fr: 'Facteur' }, width: '24%' },
        { label: { en: 'Why it costs', fr: 'Pourquoi cela coûte' } },
        { label: { en: 'Lever', fr: 'Levier' }, width: '30%' }
      ],
      rows: [
        [{ en: 'Initial embedding', fr: 'Vectorisation initiale' },
         { en: 'Every passage of the whole corpus, once. Predictable and one-off.', fr: 'Chaque passage de tout le corpus, une fois. Prévisible et unique.' },
         { en: 'Batch it, and settle the chunking strategy first — a rechunk means paying again', fr: 'Fais-la par lots, et arrête d\'abord la stratégie de découpage — un redécoupage repaie tout' }],
        [{ en: 'Incremental embedding', fr: 'Vectorisation incrémentale' },
         { en: 'Only what changed. Cheap, unless the connector cannot tell what changed.', fr: 'Seulement ce qui a changé. Bon marché, sauf si le connecteur ne sait pas dire ce qui a changé.' },
         { en: 'Content hashing, so an unchanged file is never re-embedded', fr: 'Empreinte de contenu, pour qu\'un fichier inchangé ne soit jamais revectorisé' }],
        [{ en: 'Context size', fr: 'Taille du contexte' },
         { en: 'The dominant per-question cost, and it also makes answers worse.', fr: 'Le coût par question dominant, et il dégrade aussi les réponses.' },
         { en: 'Rerank and keep four passages. This lever improves quality and cost at once', fr: 'Reclasse et garde quatre passages. Ce levier améliore la qualité et le coût en même temps' }],
        [{ en: 'Reranking', fr: 'Reclassement' },
         { en: 'A second model pass over twenty candidates, on every question.', fr: 'Un second passage de modèle sur vingt candidats, à chaque question.' },
         { en: 'Cheap relative to what it saves in context. Keep it, and cap the candidate count', fr: 'Peu cher au regard de ce qu\'il économise en contexte. Garde-le, et plafonne le nombre de candidats' }],
        [{ en: 'Answer cache', fr: 'Cache de réponses' },
         { en: 'Internal corpora get the same questions repeatedly — often a third of traffic.', fr: 'Les corpus internes reçoivent les mêmes questions en boucle — souvent un tiers du trafic.' },
         { en: 'Key on question plus permission set, invalidate on document change', fr: 'Clé sur question plus droits, invalidation au changement de document' }],
        [{ en: 'Vector index hosting', fr: 'Hébergement de l\'index vectoriel' },
         { en: 'Billed on stored vectors and provisioned capacity, whether or not anyone asks anything.', fr: 'Facturé sur les vecteurs stockés et la capacité provisionnée, que quelqu\'un demande quelque chose ou non.' },
         { en: 'Below a few hundred thousand passages, pgvector on the database you already run is enough', fr: 'En dessous de quelques centaines de milliers de passages, pgvector sur la base déjà en place suffit' }]
      ]
    }
  ]
};
