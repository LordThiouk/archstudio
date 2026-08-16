export type LegoLanguage = 'en' | 'fr';
export type HostingMode = 'client' | 'baas' | 'cloud' | 'selfhosted';

export interface LegoIntent {
  id: string;
  label: string;
  modes: HostingMode[];
  shapes?: string[];
}

export interface LegoVariant {
  id: string;
  intent: string;
  label: string;
  mode: HostingMode;
  maps_to: string;
}

export interface LegoBrick {
  id: string;
  icon: string;
  layer: string;
  defaultScope: string;
  capabilities: string[];
  role: string;
  responsibilities: string[];
  notes: string[];
  affinities: string[];
  capabilityPhrase: string;
}

export interface LegoCatalogSnapshot {
  version: string;
  lang: LegoLanguage;
  scopes: { id: string; label: string }[];
  aliases: Record<string, string>;
  bricks: Record<string, LegoBrick>;
  intents: LegoIntent[];
  variants: LegoVariant[];
  technologyDescriptions: Record<string, string>;
}
