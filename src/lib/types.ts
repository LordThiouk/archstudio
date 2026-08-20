/* The architecture document. Identical in shape to the standalone viewer's
 * `window.ARCHITECTURE`, so anything authored here exports to a self-contained
 * HTML file with no transformation. */

export interface Fact { label: string; value: string }
export interface Tile { value: string | number; label: string; hint?: string }

export interface Meta {
  lang?: 'en' | 'fr';
  name?: string;
  tagline?: string;
  version?: string;
  kicker?: string;
  title?: string;
  intro?: string;
  facts?: Fact[];
  tiles?: Tile[];
  distributionNote?: string;
  principle?: string;
  footer?: string;
  repo?: string;
}

export interface Theme {
  brand?: string;
  brandDark?: string;
  logo?: string;
}

export interface Ui {
  defaultTheme?: 'light' | 'dark';
  tabs?: string[];
  views?: { overview?: boolean; architecture?: boolean; flows?: boolean; stack?: boolean };
  supportLayer?: string | false;
  flowSpeedMs?: number;
  architecture?: {
    title?: string;
    subtitle?: string;
    /** Split each layer into one column per scope. Unset = on past ~24 components. */
    cluster?: boolean;
    /** Start with the nodes stripped to icon and name. Unset = on past ~24 components. */
    compact?: boolean;
  };
  flows?: { title?: string; subtitle?: string };
  stack?: { title?: string; subtitle?: string };
}

export interface Group {
  id: string;
  name: string;
  short?: string;
  description?: string;
  color?: string;
  colorDark?: string;
}

export interface Layer { id: string; name: string; desc?: string }

/* How a caller reaches a callee. `sync` is the default reading and is left
 * unset rather than written out, so a document that never says anything about
 * its edges exports exactly as it did before this field existed. */
export type LinkKind = 'sync' | 'async' | 'batch';

/** What a dependency *is*, beyond the fact that it exists.
 *
 * "Who calls whom" is the cheap half of an architecture review; "how, and does
 * a failure propagate" is the half that decides anything. `deps` stays the
 * single source of truth for whether an edge exists — a `Link` only annotates
 * one that already does, and normalisation drops any that does not. */
export interface Link {
  /** The callee's component id. Must appear in the same component's `deps`. */
  to: string;
  kind?: LinkKind;
  /** How it travels — "REST/HTTPS", "gRPC", "SQL", "Kafka", "S3 API". */
  protocol?: string;
  /** Anything the two fields above cannot say: "read replica", "nightly 02:00". */
  note?: string;
}

export interface Component {
  id: string;
  name: string;
  group: string;
  layer: string;
  icon?: string;
  badge?: string;
  tech?: string[];
  url?: string;
  role?: string;
  /** Snapshotted catalog purpose at placement; preferred over `role` in ADD. */
  purpose?: string;
  /** Snapshotted CAF gating tags at placement. */
  concernTags?: import('./document/concerns').ConcernTag[];
  /** Stable Lego catalog identity; `role` remains human-readable prose. */
  brick?: import('./lego/bricks').BrickId;
  features?: string[];
  notes?: string[];
  deps?: string[];
  links?: Link[];
}

export interface Technology {
  name: string;
  category?: string;
  description?: string;
  groups?: string[];
}

export interface FlowStep { component: string; title: string; description?: string }
export interface Flow {
  id: string; name: string; group?: string; sub?: string; note?: string; steps: FlowStep[];
}

/** One architecture decision record (Nygard ADR), stored in the document JSON. */
export interface ArchitectureDecision {
  id: string;
  title: string;
  context: string;
  decision: string;
  consequences: string;
  status: 'proposed' | 'accepted' | 'superseded';
  supersedes?: string;
}

export type SectionType = 'cards' | 'timeline' | 'table' | 'compare' | 'text';

/** Where a section sits in the printable design document.
 *
 * `chapter` is a dotted path — "2.4" — but it only decides *order*: the number
 * printed on the page is recomputed from the final position, so deleting a
 * chapter renumbers the rest instead of leaving a hole. Its first segment picks
 * the part (1 to 5); anything else, or no slot at all, lands in the appendices.
 * The viewer ignores this field entirely. */
export interface DocSlot {
  chapter?: string;
  /** Auto-added from brick `concernTags` gating — removed when the gate closes. */
  gated?: boolean;
}

export interface Section {
  id: string;
  tab?: string;
  type: SectionType;
  title: string;
  subtitle?: string;
  note?: string;
  doc?: DocSlot;
  [extra: string]: unknown;
}

/* The payload of each section type, mirroring the viewer's renderers. The index
 * signature on `Section` keeps these structurally compatible, so a section can
 * be narrowed to the shape its `type` promises. */

export interface CardItem { group?: string; icon?: string; title: string; body?: string; bullets?: string[] }
export interface CardsSection extends Section { type: 'cards'; items: CardItem[] }

export interface TimelinePhase { group?: string; period?: string; title: string; bullets?: string[] }
export interface TimelineSection extends Section {
  type: 'timeline'; lineTitle?: string; items: TimelinePhase[]; aside?: CardItem[];
}

export interface TableColumn { label: string; width?: string; group?: string }
export interface TableSection extends Section { type: 'table'; columns: TableColumn[]; rows: string[][] }

export interface ComparePole {
  group?: string; kicker?: string; title: string; short?: string; pitch?: string;
  rows?: string[][]; bullets?: string[];
}
export interface CompareTable { title?: string; subtitle?: string; firstColumn?: string; rows: string[][] }
export interface CompareCard { group?: string; title: string; subtitle?: string; bullets?: string[]; note?: string }
export interface CompareSection extends Section {
  type: 'compare'; columns: ComparePole[]; table?: CompareTable; cards?: CompareCard[];
}

export interface TextBlock { group?: string; title?: string; body?: string | string[] }
export interface TextSection extends Section { type: 'text'; blocks: TextBlock[] }

export interface Architecture {
  meta: Meta;
  theme: Theme;
  ui: Ui;
  groups: Group[];
  layers: Layer[];
  components: Component[];
  technologies: Technology[];
  flows: Flow[];
  sections: Section[];
  decisions: ArchitectureDecision[];
}

/* ------------------------------------------------------------------ records */

export interface FolderRecord {
  id: string;
  name: string;
  color: string | null;
  position: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string | null;
  accent: string | null;
  position: number;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithData extends ProjectRecord {
  data: Architecture;
}

export interface ProjectSummary extends ProjectRecord {
  componentCount: number;
  groupCount: number;
}

/** A snapshot of a project's document.
 *
 * `label` is what separates the two kinds: an automatic snapshot has none, a
 * checkpoint the user named has one — and a named checkpoint is never pruned. */
export interface RevisionRecord {
  id: string;
  projectId: string;
  label: string | null;
  createdAt: string;
  componentCount: number;
}
