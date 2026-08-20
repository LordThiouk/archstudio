'use client';

/* Everything the Overview tab renders, plus the headings of the Architecture
 * view. The diagram inspector edits a handful of these too — both write the
 * same `meta`, so the two stay in step. */

import { Area, CardList, CellGrid, Choice, Group, IconPicker, Panel, RICH_HINT, Text } from './Fields';
import type { ProtocolLabels } from '@/lib/links';
import type { Architecture, Tile } from '@/lib/types';

type Patch = (fn: (d: Architecture) => Architecture) => void;

export default function DocumentEditor({ doc, patch }: { doc: Architecture; patch: Patch }) {
  const meta = (fn: (m: Architecture['meta']) => void) => patch(d => { fn(d.meta); return d; });
  const m = doc.meta;

  const facts = m.facts || [];
  const factRows = facts.map(f => [f.label, f.value]);

  return (
    <Panel title="Document"
      subtitle="The header, the opening page and the headings of the architecture view.">

      <Group title="Identity" cols={2}>
        <Text label="Display name" value={m.name || ''} placeholder="Acme Platform"
          onChange={v => meta(x => { x.name = v; })} />
        <Text label="Tagline" value={m.tagline || ''} placeholder="Architecture Explorer"
          onChange={v => meta(x => { x.tagline = v || undefined; })} />
        <Text label="Version" value={m.version || ''} placeholder="v2.1 — August 2026"
          onChange={v => meta(x => { x.version = v || undefined; })} />
        <Text label="Kicker" value={m.kicker || ''} placeholder="Technical dossier · 2026"
          onChange={v => meta(x => { x.kicker = v || undefined; })} />
      </Group>

      <Group title="Opening page">
        <Text label="Headline" value={m.title || ''} placeholder="One sentence that frames the system"
          onChange={v => meta(x => { x.title = v; })} />
        <Area label="Introduction" value={m.intro || ''} minHeight={110} hint={RICH_HINT}
          onChange={v => meta(x => { x.intro = v; })} />
        <Area label="Guiding principle (callout)" value={m.principle || ''}
          placeholder="<b>Principle.</b> The two platforms share no database."
          hint={RICH_HINT} onChange={v => meta(x => { x.principle = v || undefined; })} />
      </Group>

      <Group title="Header facts" hint="The label/value pairs printed under the headline.">
        <CellGrid headers={['Label', 'Value']} rows={factRows} widths={['minmax(0,38%)', 'minmax(0,1fr)']}
          onChange={rows => meta(x => {
            x.facts = rows.map(r => ({ label: r[0] ?? '', value: r[1] ?? '' }));
          })} />
      </Group>

      <Group title="Key figures"
        hint="The tiles at the top of the overview — a number and what it counts.">
        <CardList<Tile>
          items={m.tiles || []}
          onChange={next => meta(x => { x.tiles = next; })}
          blank={() => ({ value: '', label: '' })}
          addLabel="Add a figure"
          empty="No figures yet. The overview reads fine without them."
          summary={t => [t.value, t.label].filter(Boolean).join(' — ')}
          render={(t, set) => (
            <>
              <div className="frow">
                <Text label="Value" value={String(t.value ?? '')} placeholder="99.9%"
                  onChange={v => set(x => { x.value = v; })} />
                <Text label="Label" value={t.label || ''} placeholder="Uptime, rolling 90 days"
                  onChange={v => set(x => { x.label = v; })} />
              </div>
              <Text label="Hint" value={t.hint || ''} placeholder="Measured at the edge"
                onChange={v => set(x => { x.hint = v || undefined; })} />
            </>
          )} />
      </Group>

      <Group title="Architecture view">
        <div className="frow">
          <Text label="Title override" value={doc.ui.architecture?.title || ''} placeholder="Architecture"
            onChange={v => patch(d => {
              d.ui.architecture = { ...d.ui.architecture, title: v || undefined }; return d;
            })} />
          <IconPicker label="Logo" value={doc.theme.logo || 'cube'}
            onChange={v => patch(d => { d.theme.logo = v; return d; })} />
        </div>
        <Area label="Subtitle" value={doc.ui.architecture?.subtitle || ''} hint={RICH_HINT}
          placeholder="Five layers, from the client channel down to infrastructure."
          onChange={v => patch(d => {
            d.ui.architecture = { ...d.ui.architecture, subtitle: v || undefined }; return d;
          })} />
        <Area label="Distribution note" value={m.distributionNote || ''} hint={RICH_HINT}
          placeholder="Read the bars as ownership, not as effort."
          onChange={v => meta(x => { x.distributionNote = v || undefined; })} />

        {/* Naming the protocol the architecture speaks is what turns edge
            labels on, so the two fields sit together and the second one only
            appears once the first has an answer to override. */}
        <div className="frow">
          <Text label="Default protocol" mono
            value={doc.ui.architecture?.defaultProtocol || ''} placeholder="REST"
            hint="Named, and only the edges that depart from it are labelled."
            onChange={v => patch(d => {
              d.ui.architecture = { ...d.ui.architecture, defaultProtocol: v || undefined };
              return d;
            })} />
          {!!doc.ui.architecture?.defaultProtocol?.trim() && (
            <Choice label="Edge labels" value={doc.ui.architecture?.protocolLabels || 'exceptions'}
              options={[
                { value: 'exceptions', label: 'Exceptions only' },
                { value: 'all', label: 'Every annotated edge' },
                { value: 'off', label: 'None — keep the note' }
              ]}
              onChange={v => patch(d => {
                d.ui.architecture = {
                  ...d.ui.architecture,
                  protocolLabels: v === 'exceptions' ? undefined : (v as ProtocolLabels)
                };
                return d;
              })} />
          )}
        </div>
      </Group>

      <Group title="Scope descriptions"
        hint="One paragraph per scope, printed on its card at the bottom of the overview.">
        {doc.groups.map(g => (
          <Area key={g.id} label={g.name} value={g.description || ''} hint={undefined}
            placeholder={`What "${g.name}" covers, in one or two sentences.`}
            onChange={v => patch(d => {
              const x = d.groups.find(y => y.id === g.id);
              if (x) x.description = v || undefined;
              return d;
            })} />
        ))}
      </Group>

      <Group title="Footer" cols={2}>
        <Text label="Footer line" value={m.footer || ''} placeholder="Internal document — do not circulate"
          onChange={v => meta(x => { x.footer = v || undefined; })} />
        <Text label="Repository" value={m.repo || ''} placeholder="github.com/acme/platform"
          onChange={v => meta(x => { x.repo = v || undefined; })} />
      </Group>
    </Panel>
  );
}
