import { insertFlow } from './apply';
import type { FlowPattern } from './types';
import { componentBrick, ensurePlacementScaffold, placeVariant } from '../lego/place';
import { syncTechnologies } from '../lego/stack';
import type { LegoCatalogSnapshot } from '../lego/types';
import type { Architecture, Component, LinkKind } from '../types';

/** Sentinel binding: create a brick for this step's mappable role. */
export const PLATE_CREATE = '__plate_create__';

export interface PlateInsertion {
  pattern: FlowPattern;
  /**
   * One entry per pattern step, in order:
   * - component id string → use that existing brick
   * - `null` → omit/skip (do not create, do not include in the flow)
   * - `PLATE_CREATE` → create a brick when the step has a mappable role
   *
   * Missing indices are unbound: with `createMissing: true` they create;
   * otherwise they skip (same as `null`).
   */
  bindings: (string | null)[];
  /** When true, unbound/missing mappable steps are created (empty-canvas path). */
  createMissing?: boolean;
  name?: string;
  group?: string;
}

export interface PlateResult { id: string; created: number; skipped: number; wired: number }

const STEP_ROLES: Record<string, Record<string, string | null>> = {
  'auth-login': { client: 'webApp', edge: 'apiGateway', auth: 'identity', store: 'sql', session: 'cache', back: 'webApp' },
  checkout: { client: 'webApp', api: 'apiGateway', price: 'functions', psp: null, store: 'sql', notify: 'email' },
  'webhook-inbound': { source: null, endpoint: 'apiGateway', verify: 'identity', queue: 'queue', worker: 'functions', store: 'sql' },
  'async-job': { api: 'apiGateway', queue: 'queue', worker: 'functions', store: 'sql', notify: 'email' },
  'file-upload': { client: 'webApp', api: 'apiGateway', objects: 'objects', scan: 'ocr', index: 'search', notify: 'email' },
  'rag-query': { client: 'webApp', api: 'apiGateway', embed: 'embeddings', retrieve: 'vector', rerank: 'rerank', llm: 'llm', back: 'webApp' },
  'ci-cd': { ci: 'cicd', artifact: 'registry', deploy: 'containers', edge: 'apiGateway', verify: 'observability' },
  incident: { service: 'functions', signal: 'observability', notify: 'email', data: 'sql', fix: 'cicd' }
};

/** Role mapped for a pattern step, or null when intentionally unmappable (e.g. PSP). */
export function stepRole(patternId: string, stepKey: string): string | null | undefined {
  const roles = STEP_ROLES[patternId];
  if (!roles || !Object.hasOwn(roles, stepKey)) return undefined;
  return roles[stepKey];
}

/** True when the step has a non-null role in the plate map (a brick can be created). */
export function isMappableStep(patternId: string, stepKey: string, snapshot: LegoCatalogSnapshot): boolean {
  const role = stepRole(patternId, stepKey);
  return typeof role === 'string' && snapshot.variants.some(variant => variant.maps_to === role);
}

/** Count of pattern steps that can receive a created brick. */
export function countMappableSteps(pattern: Pick<FlowPattern, 'id' | 'steps'>, snapshot: LegoCatalogSnapshot): number {
  return pattern.steps.filter(step => isMappableStep(pattern.id, step.key, snapshot)).length;
}

/**
 * How many reviewed bindings will survive insert (kept ids + creates), for UI gating.
 * Skips and unmappable create attempts do not count.
 */
export function countActionableBindings(
  pattern: Pick<FlowPattern, 'id' | 'steps'>,
  bindings: (string | null)[],
  snapshot: LegoCatalogSnapshot,
  options?: { createMissing?: boolean }
): number {
  let count = 0;
  for (let index = 0; index < pattern.steps.length; index++) {
    const step = pattern.steps[index];
    const bound = index < bindings.length ? bindings[index] : undefined;

    if (typeof bound === 'string' && bound !== PLATE_CREATE && bound.length > 0) {
      count++;
      continue;
    }

    const wantsCreate =
      bound === PLATE_CREATE ||
      (options?.createMissing === true && bound == null);

    if (wantsCreate && isMappableStep(pattern.id, step.key, snapshot)) count++;
  }
  return count;
}

/** Missing index reads as undefined; create-missing treats unbound as create. */
function wantsCreateForStep(bound: string | null | undefined, createMissing: boolean): boolean {
  return bound === PLATE_CREATE || (createMissing && bound == null);
}

export function insertPlate(doc: Architecture, insertion: PlateInsertion, snapshot: LegoCatalogSnapshot): PlateResult | null {
  let created = 0;
  const createMissing = insertion.createMissing === true;
  const componentCount = doc.components.length;
  const groupCount = doc.groups.length;
  const layerCount = doc.layers.length;

  const bindings = insertion.pattern.steps.map((step, index) => {
    const bound = index < insertion.bindings.length ? insertion.bindings[index] : undefined;

    if (typeof bound === 'string' && bound !== PLATE_CREATE) {
      return doc.components.some(component => component.id === bound) ? bound : null;
    }

    if (!wantsCreateForStep(bound, createMissing)) return null;

    const role = stepRole(insertion.pattern.id, step.key);
    if (!role || !isMappableStep(insertion.pattern.id, step.key, snapshot)) return null;

    const existing = doc.components.find(component => componentBrick(component) === role);
    if (existing) return existing.id;

    const variant = snapshot.variants.find(candidate => candidate.maps_to === role);
    if (!variant) return null;

    const component = placeVariant(snapshot, {
      variantId: variant.id,
      existingIds: doc.components.map(candidate => candidate.id),
    });
    ensurePlacementScaffold(component, doc, snapshot);
    doc.components.push(component);
    created++;
    return component.id;
  });

  const result = insertFlow(doc, { ...insertion, bindings });
  if (!result) {
    doc.components.splice(componentCount);
    doc.groups.splice(groupCount);
    doc.layers.splice(layerCount);
    return null;
  }

  let wired = 0;
  for (let index = 0; index < bindings.length - 1; index++) {
    const from = bindings[index], to = bindings[index + 1];
    if (!from || !to || from === to) continue;
    const caller = doc.components.find(component => component.id === from);
    const callee = doc.components.find(component => component.id === to);
    if (!caller || !callee) continue;
    caller.deps = [...new Set([...(caller.deps || []), to])];
    const suggestion = protocolFor(callee);
    caller.links = [...(caller.links || []).filter(link => link.to !== to), { to, ...suggestion }];
    wired++;
  }

  syncTechnologies(doc, snapshot);
  return { id: result.id, created, skipped: bindings.filter(binding => !binding).length, wired };
}

function protocolFor(component: Component): { protocol: string; kind: LinkKind } {
  switch (componentBrick(component)) {
    case 'identity': return { protocol: 'OIDC/OAuth', kind: 'sync' };
    case 'sql': return { protocol: 'SQL', kind: 'sync' };
    case 'cache': return { protocol: 'Redis', kind: 'sync' };
    case 'queue': return { protocol: 'Message queue', kind: 'async' };
    case 'pubsub': return { protocol: 'Pub/Sub', kind: 'async' };
    case 'stream': return { protocol: 'Kafka', kind: 'async' };
    case 'email': return { protocol: 'SMTP', kind: 'async' };
    default: return { protocol: 'REST/HTTPS', kind: 'sync' };
  }
}
