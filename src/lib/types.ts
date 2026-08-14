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
