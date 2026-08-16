import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { blankArchitecture } from '../defaults';
import { countMappableSteps, insertPlate, isMappableStep, PLATE_CREATE } from '../flows/plate';
import { resolveCatalog } from '../flows/catalog';
import { displayLayerLabel } from '../layers';
import { BRICK_IDS } from './bricks';
import { variantsFor } from './catalog';
import { componentBrick, ensurePlacementScaffold, placeVariant, brickProse } from './place';
import { hostingModeLabel, scopeOptionsForFilter, validScopeIds } from './scope';
import { buildCatalogSnapshot } from './seed-data';
import { syncTechnologies } from './stack';

const en = buildCatalogSnapshot('en');
const fr = buildCatalogSnapshot('fr');

test('seed snapshot retains locked catalog counts', () => {
  assert.equal(en.intents.length, 12);
  assert.equal(en.variants.length, 154);
  assert.equal(en.variants.every(variant => variant.maps_to.length > 0), true);
  assert(BRICK_IDS.includes('identity'));
});

test('scope filtering uses snapshot affinities and aliases', () => {
  assert(variantsFor(en, { intent: 'auth', mode: 'baas' }).some(variant => variant.id === 'firebase-auth'));
  assert.equal(variantsFor(en, { intent: 'auth', mode: 'cloud', scope: 'front' }).length, 0);
  assert.equal(variantsFor(en, { intent: 'auth', mode: 'cloud', scope: 'consumer' }).length, 0);
  assert(variantsFor(en, { intent: 'auth', mode: 'cloud', scope: 'all' }).some(variant => variant.id === 'cognito'));
});

test('valid scopes for intent match locked matrix and always include All scopes option', () => {
  assert.deepEqual(validScopeIds(en, { intent: 'web-app' }), ['front']);
  assert.deepEqual(validScopeIds(en, { intent: 'auth' }), ['vendor', 'tenancy']);
  assert.deepEqual(validScopeIds(en, { intent: 'llm' }), ['answering']);
  const authOptions = scopeOptionsForFilter(en, { intent: 'auth' }, 'en');
  assert.equal(authOptions[0]?.id, 'all');
  assert.equal(authOptions[0]?.label, 'All scopes');
  assert.deepEqual(authOptions.slice(1).map(option => option.id), ['vendor', 'tenancy']);
  assert.equal(scopeOptionsForFilter(fr, { intent: 'auth' }, 'fr')[0]?.label, 'Tous les scopes');
});

test('hosting mode labels are capitalized for display', () => {
  assert.equal(hostingModeLabel('client', 'en'), 'Client');
  assert.equal(hostingModeLabel('baas', 'en'), 'BaaS');
  assert.equal(hostingModeLabel('cloud', 'fr'), 'Cloud');
  assert.equal(hostingModeLabel('selfhosted', 'en'), 'Self-hosted');
  assert.equal(hostingModeLabel('selfhosted', 'fr'), 'Auto-hébergé');
});

test('scaffold creates capitalized layer names instead of raw ids', () => {
  const doc = blankArchitecture('Scaffold');
  const placed = placeVariant(en, { variantId: 'cognito', existingIds: [] });
  assert.equal(placed.layer, 'edge');
  assert.equal(doc.layers.some(layer => layer.id === 'edge'), false);
  ensurePlacementScaffold(placed, doc, en);
  const edge = doc.layers.find(layer => layer.id === 'edge');
  assert.equal(edge?.name, 'Edge & API');
  assert.equal(displayLayerLabel('edge', 'en'), 'Edge & API');
  assert.equal(displayLayerLabel('data', 'fr'), 'Données');
  assert.equal(displayLayerLabel('client channels'), 'Client Channels');
});

test('placement derives metadata from snapshot', () => {
  const placed = placeVariant(en, { variantId: 'cognito', existingIds: [] });
  assert.equal(placed.brick, 'identity');
  assert.equal(placed.role, en.bricks.identity.role);
  assert.equal(placed.icon, 'lock');
  const prose = brickProse(fr, 'identity');
  assert.equal(prose.role, fr.bricks.identity.role);
  assert(prose.features.length >= 2);
});

test('stack synchronization preserves authored fields', () => {
  const doc = blankArchitecture('Stack');
  doc.components.push({ id: 'web', name: 'Web', group: 'core', layer: 'clients', role: 'webApp', tech: ['TypeScript'] });
  doc.technologies.push({ name: 'TypeScript', description: 'Authored' });
  syncTechnologies(doc, en);
  assert.equal(doc.technologies[0].description, 'Authored');
  assert.equal(doc.technologies[0].groups?.[0], 'core');
});

test('plates receive their mappability and placements from snapshot', () => {
  const pattern = resolveCatalog('en').find(candidate => candidate.id === 'auth-login');
  assert(pattern);
  assert.equal(isMappableStep('file-upload', 'scan', en), false);
  assert.equal(countMappableSteps(pattern, en), 6);
  const doc = blankArchitecture('Plate');
  const result = insertPlate(doc, { pattern, bindings: [], createMissing: true }, en);
  assert(result);
  assert(doc.components.some(component => componentBrick(component) === 'identity'));
  assert(doc.technologies.some(technology => technology.name === 'Next.js'));
  const invalid = blankArchitecture('Atomic');
  assert.equal(insertPlate(invalid, { pattern, bindings: [PLATE_CREATE] }, en), null);
});
