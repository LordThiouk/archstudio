'use client';

import { useEffect, useMemo, useState } from 'react';
import { type HostingMode, type LegoScope, variantsFor } from '@/lib/lego/catalog';
import { defaultGroupForRole, placeVariant } from '@/lib/lego/place';
import { hostingModeLabel, scopeOptionsForFilter } from '@/lib/lego/scope';
import type { LegoCatalogSnapshot } from '@/lib/lego/types';
import type { Component, Group } from '@/lib/types';

export default function PlacementWizard({ existingIds, groups: _groups, lang = 'en', catalog, onPlace, onClose }: {
  existingIds: readonly string[];
  groups: readonly Group[];
  lang?: 'en' | 'fr';
  catalog: LegoCatalogSnapshot | null;
  onPlace: (component: Component) => void;
  onClose: () => void;
}) {
  const [intentId, setIntentId] = useState('');
  const intent = catalog?.intents.find(candidate => candidate.id === intentId) || catalog?.intents[0];
  const [mode, setMode] = useState<HostingMode>('client');
  /* Default All scopes — document group ids rarely match catalog scope tags,
   * so starting on groups[0] left Variant empty and Place brick disabled. */
  const [scope, setScope] = useState<LegoScope>('all');
  const [shape, setShape] = useState('');
  const variants = useMemo(() => catalog && intent ? variantsFor(catalog, { intent: intent.id, mode, scope, shape }) : [], [catalog, intent, mode, scope, shape]);
  const scopes = useMemo(
    () => catalog && intent
      ? scopeOptionsForFilter(catalog, { intent: intent.id, mode, shape }, lang)
      : [{ id: 'all', label: lang === 'fr' ? 'Tous les scopes' : 'All scopes' }],
    [catalog, intent, mode, shape, lang]
  );
  const [variantId, setVariantId] = useState('');
  const selectedVariant = variants.find(variant => variant.id === variantId) || variants[0];
  const brick = selectedVariant && catalog ? catalog.bricks[selectedVariant.maps_to] : undefined;
  const shapes = intent?.shapes ?? [];
  const modeStep = shapes.length ? 3 : 2;
  const scopeStep = modeStep + 1;
  const variantStep = scopeStep + 1;

  useEffect(() => {
    if (!catalog) return;
    setIntentId(catalog.intents[0]?.id || '');
    setMode(catalog.intents[0]?.modes[0] || 'client');
    setShape(catalog.intents[0]?.shapes?.[0] || '');
  }, [catalog]);

  useEffect(() => {
    if (scope !== 'all' && !scopes.some(candidate => candidate.id === scope)) {
      setScope('all');
      setVariantId('');
    }
  }, [scopes, scope]);

  function selectIntent(nextId: string) {
    const next = catalog?.intents.find(candidate => candidate.id === nextId);
    if (!next) return;
    setIntentId(nextId);
    setMode(next.modes[0] as HostingMode);
    setShape(next.shapes?.[0] || '');
    setScope('all');
    setVariantId('');
  }

  function place() {
    if (!catalog || !selectedVariant || !brick) return;
    onPlace(placeVariant(catalog, {
      variantId: selectedVariant.id,
      existingIds,
      scope: scope === 'all' ? defaultGroupForRole(catalog, selectedVariant.maps_to) : scope
    }));
    onClose();
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={event => event.stopPropagation()} role="dialog" aria-label="Place a brick">
        <div className="modal-head">
          <div>
            <h2>Place a brick</h2>
            <p className="lede">
              Pick intent, hosting mode, scope and variant. The brick lands on the diagram;
              stack tech is upserted from the variant.
            </p>
          </div>
        </div>

        {!catalog ? <p className="muted">Loading Lego catalog…</p> : null}
        {catalog && intent ? <label className="field"><span>1. Intent</span><select className="select" value={intent.id} onChange={event => selectIntent(event.target.value)}>
          {catalog.intents.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}
        </select></label> : null}
        {shapes.length ? <label className="field"><span>2. Shape</span><select className="select" value={shape} onChange={event => setShape(event.target.value)}>
          {shapes.map(candidate => <option key={candidate} value={candidate}>{candidate}</option>)}
        </select></label> : null}
        <label className="field"><span>{modeStep}. Mode</span><select className="select" value={mode} onChange={event => { setMode(event.target.value as HostingMode); setVariantId(''); }}>
          {(intent?.modes || []).map(candidate => (
            <option key={candidate} value={candidate}>{hostingModeLabel(candidate, lang)}</option>
          ))}
        </select></label>
        <label className="field"><span>{scopeStep}. Scope</span><select className="select" value={scope} onChange={event => setScope(event.target.value as LegoScope)}>
          {scopes.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}
        </select></label>
        <label className="field"><span>{variantStep}. Variant</span><select className="select" value={selectedVariant?.id || ''} onChange={event => setVariantId(event.target.value)} disabled={!variants.length}>
          {variants.length
            ? variants.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)
            : <option value="">No variants for this scope</option>}
        </select></label>
        {!variants.length ? (
          <p className="hint">No catalog variants match this scope. Choose <b>All scopes</b> or another scope.</p>
        ) : null}
        {brick ? (
          <div className="hint" aria-label="Brick responsibilities">
            <div><b>Role</b> — {brick.role}</div>
            <div><b>Responsibilities</b>
              <ul>{brick.responsibilities.map(feature => <li key={feature}>{feature}</li>)}</ul>
            </div>
            <div><b>Notes / known gaps</b>
              <ul>{brick.notes.map(note => <li key={note}>{note}</li>)}</ul>
            </div>
          </div>
        ) : null}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn primary" disabled={!catalog || !selectedVariant} onClick={place}>Place brick</button>
        </div>
      </div>
    </div>
  );
}
