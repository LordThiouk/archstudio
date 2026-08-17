'use client';

import { api } from '@/lib/api';
import type { LegoCatalogSnapshot, LegoLanguage } from './types';

const snapshots = new Map<LegoLanguage, Promise<LegoCatalogSnapshot>>();

function normalizeSnapshot(snapshot: LegoCatalogSnapshot): LegoCatalogSnapshot {
  return {
    ...snapshot,
    dependencies: snapshot.dependencies ?? [],
    aliases: snapshot.aliases ?? {},
    bricks: snapshot.bricks ?? {},
    intents: snapshot.intents ?? [],
    variants: snapshot.variants ?? [],
    scopes: snapshot.scopes ?? [],
    technologyDescriptions: snapshot.technologyDescriptions ?? {}
  };
}

export function loadLegoCatalog(lang: LegoLanguage = 'en'): Promise<LegoCatalogSnapshot> {
  const cached = snapshots.get(lang);
  if (cached) {
    return cached.then(snapshot => {
      if (Array.isArray(snapshot.dependencies)) return normalizeSnapshot(snapshot);
      /* Stale in-memory payload from before the dependencies field existed. */
      snapshots.delete(lang);
      return loadLegoCatalog(lang);
    });
  }
  const snapshot = api.json<LegoCatalogSnapshot>(`/api/lego/catalog?lang=${lang}`)
    .then(normalizeSnapshot)
    .catch(error => {
      snapshots.delete(lang);
      throw error;
    });
  snapshots.set(lang, snapshot);
  return snapshot;
}
