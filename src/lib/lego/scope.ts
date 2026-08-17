import type { HostingMode, LegoCatalogSnapshot } from './types';
import { variantsFor } from './catalog';

export type LegoScope = string;

const SCOPE_ALIASES: Record<string, string> = {
  core: 'product',
  business: 'product',
  consumer: 'product'
};

const HOSTING_MODE_LABELS: Record<HostingMode, { en: string; fr: string }> = {
  client: { en: 'Client', fr: 'Client' },
  baas: { en: 'BaaS', fr: 'BaaS' },
  cloud: { en: 'Cloud', fr: 'Cloud' },
  selfhosted: { en: 'Self-hosted', fr: 'Auto-hébergé' }
};

export function displayScopeLabel(label: string): string {
  return label ? `${label[0].toUpperCase()}${label.slice(1)}` : label;
}

export function hostingModeLabel(mode: HostingMode, lang: 'en' | 'fr' = 'en'): string {
  return HOSTING_MODE_LABELS[mode][lang];
}

export function normalizeScope(scope: string | undefined): string | undefined {
  return scope ? SCOPE_ALIASES[scope] || scope : scope;
}

/** Pack scope ids that have at least one matching variant for the filter (doc matrix). */
export function validScopeIds(
  snapshot: LegoCatalogSnapshot,
  filter: { intent?: string; mode?: HostingMode; shape?: string } = {}
): string[] {
  const candidates = variantsFor(snapshot, { ...filter, scope: 'all' });
  const affinities = new Set<string>();
  for (const variant of candidates) {
    const brick = snapshot.bricks[variant.maps_to];
    if (!brick) continue;
    for (const affinity of brick.affinities) {
      const canonical = normalizeScope(affinity) || affinity;
      affinities.add(canonical);
    }
  }
  return snapshot.scopes.map(scope => scope.id).filter(id => affinities.has(id));
}

export function scopeOptions(snapshot: LegoCatalogSnapshot, lang: 'en' | 'fr' = 'en') {
  return [
    { id: 'all', label: lang === 'fr' ? 'Tous les scopes' : 'All scopes' },
    ...snapshot.scopes
  ];
}

export function scopeOptionsForFilter(
  snapshot: LegoCatalogSnapshot,
  filter: { intent?: string; mode?: HostingMode; shape?: string },
  lang: 'en' | 'fr' = 'en'
) {
  const valid = new Set(validScopeIds(snapshot, filter));
  return [
    { id: 'all', label: lang === 'fr' ? 'Tous les scopes' : 'All scopes' },
    ...snapshot.scopes.filter(scope => valid.has(scope.id))
  ];
}

export function scopeLabel(snapshot: LegoCatalogSnapshot, scope: string): string {
  const canonical = normalizeScope(scope) || scope;
  return snapshot.scopes.find(candidate => candidate.id === canonical)?.label
    || displayScopeLabel(scope);
}

/** Seed blank Lego starter scopes without renaming existing group ids. */
export function seedStarterScopes(
  groups: { id: string; name: string }[],
  snapshot: LegoCatalogSnapshot
): void {
  for (const id of ['product', 'platform', 'vendor'] as const) {
    if (groups.some(group => group.id === id)) continue;
    const label = snapshot.scopes.find(scope => scope.id === id)?.label || displayScopeLabel(id);
    groups.push({ id, name: label });
  }
}
