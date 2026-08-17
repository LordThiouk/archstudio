import type { Component } from '../types';
import { componentBrick } from './place';
import { protocolLabel } from './protocols';
import type { LegoCatalogSnapshot, LegoDependencySuggestion } from './types';

const strengthRank = { required: 0, recommended: 1, optional: 2 } as const;

export function visibleDependencies(snapshot: LegoCatalogSnapshot, from: Component): LegoDependencySuggestion[] {
  const brick = componentBrick(from);
  if (!brick) return [];
  /* Older memoized API payloads (or a version seeded before lego_dependencies)
   * can omit the field — treat missing as empty rather than crash Place. */
  return (snapshot.dependencies ?? [])
    .filter(dependency => dependency.from === brick && dependency.strength !== 'optional')
    .sort((a, b) => strengthRank[a.strength] - strengthRank[b.strength])
    .slice(0, 3);
}

export function matchingDependencyTarget(components: readonly Component[], targetBrick: string): Component | undefined {
  return components.find(component => componentBrick(component) === targetBrick);
}

export function matchesSuggestionTarget(component: Component, suggestion: LegoDependencySuggestion): boolean {
  return componentBrick(component) === suggestion.to;
}

/** Applies a suggestion only after the person chooses Link or confirms Add & link. */
export function addSuggestedDependency(
  caller: Component,
  calleeId: string,
  suggestion: LegoDependencySuggestion
): void {
  if (caller.id === calleeId) return;
  const protocol = protocolLabel(suggestion.protocol_id);
  caller.deps ??= [];
  if (!caller.deps.includes(calleeId)) caller.deps.push(calleeId);
  caller.links ??= [];
  const existing = caller.links.find(link => link.to === calleeId);
  if (existing) {
    existing.protocol = protocol;
    existing.kind = suggestion.kind;
  } else {
    caller.links.push({ to: calleeId, protocol, kind: suggestion.kind });
  }
}
