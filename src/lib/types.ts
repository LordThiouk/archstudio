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
    /** The protocol the architecture speaks unless a line says otherwise —
     *  "REST", "HTTPS". Naming it draws the exceptions on their edges and puts
     *  the convention in words under the diagram. */
    defaultProtocol?: string;
    /** Tint each layer's label and the rule under it, from a ramp separate from
     *  the scope palette. On unless set to `false`, which emits no colour at all
     *  and leaves the neutral bands exactly as they were. */
    layerTint?: boolean;
    /** Where the Transition toggle starts. Unset = on as soon as the document
     *  marks anything, so a landscape opens on the delta it was drawn for; the
     *  reader can still flip to the target state from the toolbar. */
    transition?: boolean;
    /** Override what `defaultProtocol` implies: `exceptions` (the default once
     *  one is named), `all` to label every annotated edge, `off` to keep the
     *  note and draw no labels. Unset with no default = no labels at all. */
    protocolLabels?: import('./links').ProtocolLabels;
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

/** A boundary that cuts across the layers — a platform, a network zone, an API
 *  gateway, the perimeter of a migration.
 *
 *  Layers are rows and scopes are colours, and neither can say "these six run on
 *  OpenShift" when three are front ends and three are APIs. A zone can, and it
 *  nests: `parent` puts a gateway inside an internal network. See
 *  `src/lib/zones.ts` for how one is drawn and what the nesting costs. */
export interface Zone {
  id: string;
  name: string;
  kind?: import('./zones').ZoneKind;
  /** The zone this one sits inside. Unknown ids and cycles are dropped. */
  parent?: string;
  /** One line under the label — "All communications are REST calls". */
  note?: string;
  /** Sit on a shelf *below* the previous sibling, sharing its columns, instead
   *  of taking a band of its own. What keeps a zone that only draws on one layer
   *  from costing the whole sheet a column of width.
   *
   *  A request, not a guarantee: `bandPlan` ignores it when the zone is not
   *  eligible (see `canStack` there), because a flag that could break the
   *  containment rule has to be checked where the drawing is decided, not where
   *  it is stored. */
  stack?: boolean;
}

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
  /** Where this call sits in the transition. Unset = it already exists.
   *  See `src/lib/lifecycle.ts` for what each mark commits you to. */
  state?: import('./lifecycle').Lifecycle;
}

export interface Component {
  id: string;
  name: string;
  group: string;
  layer: string;
  /** The innermost zone holding this component. Its ancestors are implied. */
  zone?: string;
  icon?: string;
  badge?: string;
  /** How this component is reached, and what it holds — a closed set, drawn as
   *  glyphs on the card with a legend. `badge` stays for the one word that fits
   *  no category. See `src/lib/marks.ts`. */
  marks?: import('./marks').SecurityMark[];
  tech?: string[];
  url?: string;
  role?: string;
  /** Stable Lego catalog identity; `role` remains human-readable prose. */
  brick?: import('./lego/bricks').BrickId;
  features?: string[];
  notes?: string[];
  deps?: string[];
  links?: Link[];
  /** Where this component sits in the transition — new, changed, or on its way
   *  out. Unset = it already exists, which is the common case and stays unwritten
   *  so a document that describes no transition exports exactly as it did. */
  state?: import('./lifecycle').Lifecycle;
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

export type SectionType = 'cards' | 'timeline' | 'table' | 'compare' | 'text';

/** Where a section sits in the printable design document.
 *
 * `chapter` is a dotted path — "2.4" — but it only decides *order*: the number
 * printed on the page is recomputed from the final position, so deleting a
 * chapter renumbers the rest instead of leaving a hole. Its first segment picks
 * the part (1 to 5); anything else, or no slot at all, lands in the appendices.
 * The viewer ignores this field entirely. */
export interface DocSlot { chapter?: string }

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
  /** Optional throughout: a document with no zones draws exactly as it did
   *  before the field existed, and normalisation leaves the key at `[]`. */
  zones: Zone[];
  components: Component[];
  technologies: Technology[];
  flows: Flow[];
  sections: Section[];
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
