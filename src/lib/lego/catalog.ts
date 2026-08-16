import type { HostingMode, LegoCatalogSnapshot, LegoVariant } from './types';

export type LegoScope = string;
export type { HostingMode, LegoVariant } from './types';

export const HOSTING_MODES: readonly HostingMode[] = ['client', 'baas', 'cloud', 'selfhosted'];

export function variantsFor(
  snapshot: LegoCatalogSnapshot,
  filter: { intent?: string; mode?: HostingMode; scope?: LegoScope; shape?: string }
): LegoVariant[] {
  const candidates = snapshot.variants.filter(variant =>
    (!filter.intent || variant.intent === filter.intent)
    && (!filter.mode || variant.mode === filter.mode)
    && (!filter.shape || variantShape(variant) === filter.shape)
  );
  const scope = filter.scope && (snapshot.aliases[filter.scope] || filter.scope);
  if (!scope || scope === 'all') return candidates;
  return candidates.filter(variant => snapshot.bricks[variant.maps_to]?.affinities.includes(scope));
}

export function variantById(snapshot: LegoCatalogSnapshot, id: string): LegoVariant | undefined {
  return snapshot.variants.find(variant => variant.id === id);
}

export function variantShape(variant: LegoVariant): string | undefined {
  const role = variant.maps_to;
  switch (variant.intent) {
    case 'api':
      return role === 'apiGateway' ? 'gateway' : 'compute';
    case 'cdn':
      return role === 'staticHosting' ? 'static' : 'cdn';
    case 'workers':
      if (role === 'orchestration') return 'workflow';
      if (role === 'jobs') return 'schedule';
      return 'worker';
    case 'database':
      if (role === 'sql') return 'sql';
      if (role === 'nosql') return 'nosql';
      return 'cache';
    case 'search':
      return role === 'vector' ? 'vector' : 'fulltext';
    case 'messaging':
      if (role === 'queue') return 'queue';
      if (role === 'pubsub') return 'bus';
      return 'stream';
    case 'ops':
      if (role === 'observability' || role === 'tracing') return 'observe';
      if (role === 'cicd' || role === 'gitops') return 'ship';
      return 'mail';
    default:
      return undefined;
  }
}
