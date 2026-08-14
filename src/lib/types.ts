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
  architecture?: { title?: string; subtitle?: string };
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
  features?: string[];
  notes?: string[];
  deps?: string[];
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
export interface Section {
  id: string;
  tab?: string;
  type: SectionType;
  title: string;
  subtitle?: string;
  note?: string;
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

export interface RevisionRecord {
  id: string;
  projectId: string;
  label: string | null;
  createdAt: string;
}
