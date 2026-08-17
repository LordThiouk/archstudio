import type { Architecture } from '../types';
import { componentBrick } from './place';
import { displayScopeLabel } from './scope';
import type { LegoCatalogSnapshot } from './types';

export function syncTechnologies(doc: Architecture, snapshot: LegoCatalogSnapshot): void {
  const technologies = new Map(doc.technologies.map(technology => [technology.name.toLocaleLowerCase(), technology]));
  const variantDescriptions = new Map(snapshot.variants.map(variant => [
    variant.label.toLocaleLowerCase(),
    snapshot.lang === 'fr'
      ? `${variant.label} est l’implémentation sélectionnée pour cette capacité d’architecture.`
      : `${variant.label} is the selected implementation for this architecture capability.`
  ]));
  const usages = new Map<string, { name: string; components: typeof doc.components }>();

  for (const component of doc.components) {
    for (const name of component.tech || []) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      const key = trimmed.toLocaleLowerCase();
      const usage = usages.get(key) ?? { name: trimmed, components: [] };
      if (!usage.components.some(candidate => candidate.id === component.id)) usage.components.push(component);
      usages.set(key, usage);
    }
  }

  for (const [key, usage] of usages) {
    let technology = technologies.get(key);
    if (!technology) {
      technology = { name: usage.name };
      doc.technologies.push(technology);
      technologies.set(key, technology);
    }
    const firstComponent = usage.components[0];
    if (technology.category === undefined) {
      technology.category = displayScopeLabel(
        doc.layers.find(candidate => candidate.id === firstComponent.layer)?.name ?? firstComponent.layer
      );
    }
    if (technology.description === undefined) {
      const capability = snapshot.bricks[componentBrick(firstComponent) || '']?.capabilityPhrase
        ?? (snapshot.lang === 'fr' ? 'la capacité d’architecture sélectionnée' : 'the selected architecture capability');
      technology.description = snapshot.technologyDescriptions[key]
        ?? variantDescriptions.get(key)
        ?? (snapshot.lang === 'fr'
          ? `${technology.name} fournit ${capability}.`
          : `${technology.name} provides ${capability}.`);
    }
    if (technology.groups === undefined) technology.groups = [...new Set(usage.components.map(component => component.group))];
  }
}
