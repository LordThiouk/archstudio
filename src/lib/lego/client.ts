'use client';

import { api } from '@/lib/api';
import type { LegoCatalogSnapshot, LegoLanguage } from './types';

const snapshots = new Map<LegoLanguage, Promise<LegoCatalogSnapshot>>();

export function loadLegoCatalog(lang: LegoLanguage = 'en'): Promise<LegoCatalogSnapshot> {
  const cached = snapshots.get(lang);
  if (cached) return cached;
  const snapshot = api.json<LegoCatalogSnapshot>(`/api/lego/catalog?lang=${lang}`)
    .catch(error => {
      snapshots.delete(lang);
      throw error;
    });
  snapshots.set(lang, snapshot);
  return snapshot;
}
