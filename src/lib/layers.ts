/** Display labels for architecture layer bands (ids stay lowercase). */

type Lang = 'en' | 'fr';

/** Pack layer ids → bilingual display labels (admin system_copy seed source). */
export const LAYER_DISPLAY: Record<string, { en: string; fr: string }> = {
  clients: { en: 'Clients', fr: 'Clients' },
  edge: { en: 'Edge & API', fr: 'Edge & API' },
  services: { en: 'Services', fr: 'Services' },
  data: { en: 'Data', fr: 'Données' },
  platform: { en: 'Platform', fr: 'Plateforme' },
  infra: { en: 'Infrastructure', fr: 'Infrastructure' },
  compute: { en: 'Services', fr: 'Services' },
  app: { en: 'Application', fr: 'Application' },
  vendors: { en: 'Third parties', fr: 'Tiers' },
  ingestion: { en: 'Ingestion', fr: 'Ingestion' },
  index: { en: 'Index & data', fr: 'Index & données' },
  inference: { en: 'Inference', fr: 'Inférence' },
  producers: { en: 'Producers', fr: 'Producteurs' },
  processing: { en: 'Processing', fr: 'Traitement' },
  destinations: { en: 'Destinations', fr: 'Destinations' }
};

/**
 * Title-case free-form names; pack ids resolve to locked labels.
 * Code fallback for client canvas / place.ts. Server paths that need
 * published system_copy overrides should call resolveLayerLabel from
 * system-copy.resolve.server.ts (CONTENT_FROM_ADMIN=1 + published).
 */
export function displayLayerLabel(idOrName: string, lang: Lang = 'en'): string {
  if (!idOrName) return idOrName;
  const known = LAYER_DISPLAY[idOrName];
  if (known) return known[lang];
  return idOrName.replace(/(^|[\s/_-]| & )(\p{Ll})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}
