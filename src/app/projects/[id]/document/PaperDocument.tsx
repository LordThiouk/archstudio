'use client';

/* The document, on paper.
 *
 * The viewer renders the same `Architecture` for a screen: tabs, hover, a
 * drawer. None of that survives a print, so this is a second renderer for a
 * second medium — linear, numbered, and complete: every section is printed,
 * including the ones deliberately kept off the viewer's tab bar.
 *
 * The diagram is the one hard part. Edges are geometry measured after layout,
 * and print layout is not screen layout — so the diagram is laid out at a
 * fixed 1000 px stage and scaled with a transform, on screen and on paper
 * alike. Uniform scaling leaves the measured coordinates valid, which a
 * reflow would not.
 */

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { anchor, buildOutline, supportLayerId, toc, type DocBody, type DocPart } from '@/lib/document/plan';
import type {
  Architecture, CardItem, CardsSection, CompareSection, Component, Flow,
  ProjectWithData, Section, TableSection, TextSection, TimelineSection
} from '@/lib/types';
import './document.css';

const STAGE_W = 1000;
/** A4 minus the page margins, in CSS pixels: 178 mm wide, 263 mm tall. */
const PAGE_W = 673;
const PAGE_H = 993;

const STRINGS = {
  en: {
    back: 'Back to the editor', print: 'Print · Save as PDF', contents: 'Contents',
    hint: 'Print to “Save as PDF”. Keep background graphics on, or the scope colours disappear.',
    version: 'Version', updated: 'Last edited', figure: 'Figure — component diagram',
    component: 'Component', scope: 'Scope', tech: 'Technologies', role: 'Role',
    dependsOn: 'Depends on', detail: 'Component detail', notes: 'Notes',
    technology: 'Technology', category: 'Category', description: 'Description',
    step: 'Step', dash: '—'
  },
  fr: {
    back: "Retour à l'éditeur", print: 'Imprimer · Enregistrer en PDF', contents: 'Sommaire',
    hint: 'Imprime vers « Enregistrer au format PDF ». Garde les graphiques d’arrière-plan activés, sinon les couleurs de périmètre disparaissent.',
    version: 'Version', updated: 'Dernière modification', figure: 'Figure — schéma des composants',
    component: 'Composant', scope: 'Périmètre', tech: 'Technologies', role: 'Rôle',
    dependsOn: 'Dépend de', detail: 'Détail des composants', notes: 'Notes',
    technology: 'Technologie', category: 'Catégorie', description: 'Description',
    step: 'Étape', dash: '—'
  }
} as const;

type Strings = Record<keyof typeof STRINGS['en'], string>;

/** Inline `<b>`, `<i>`, `<code>` render as markup — same contract as the viewer. */
const rich = (html: string) => ({ dangerouslySetInnerHTML: { __html: html } });

export default function PaperDocument({ project }: { project: ProjectWithData }) {
  const doc = project.data;
  const outline = useMemo(() => buildOutline(doc), [doc]);
  const contents = useMemo(() => toc(outline), [outline]);
  const T = STRINGS[outline.lang];

  return (
    <div className="paper-desk">
      <div className="paper-bar">
        <Link className="paper-btn" href={`/projects/${project.id}`}>
          <Icon name="back" size={15} />{T.back}
        </Link>
        <b className="paper-bar-name">{project.name}</b>
        <span className="paper-bar-hint">{T.hint}</span>
        <button className="paper-btn primary" onClick={() => window.print()}>
          <Icon name="download" size={15} />{T.print}
        </button>
      </div>

      {/* The document's own brand drives the page, as it drives the viewer. */}
      <article className="paper" lang={outline.lang}
        style={doc.theme.brand ? { ['--brand' as string]: doc.theme.brand } : undefined}>
        <Cover doc={doc} project={project} T={T} />

        <section className="paper-contents">
          <h1>{T.contents}</h1>
          <ol className="paper-toc">
            {contents.map(row => (
              <li key={row.number} className={row.level === 1 ? 'lv1' : 'lv2'}>
                <a href={`#${anchor(row.number)}`}>
                  <span className="paper-num">{row.number}</span>
                  <span className="paper-toc-title">{row.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>

        {outline.parts.map(part => <PartBlock key={part.number} part={part} doc={doc} T={T} />)}

        {doc.meta.footer && <footer className="paper-foot">{doc.meta.footer}</footer>}
      </article>
    </div>
  );
}

/* -------------------------------------------------------------------- cover */

function Cover({ doc, project, T }: { doc: Architecture; project: ProjectWithData; T: Strings }) {
  const m = doc.meta;
  return (
    <section className="paper-cover">
      {m.kicker && <div className="paper-kicker">{m.kicker}</div>}
      <h1 className="paper-title">{m.title || m.name || project.name}</h1>
      {m.tagline && <p className="paper-tagline">{m.tagline}</p>}

      <dl className="paper-facts">
        {(m.facts || []).map(f => (
          <div key={f.label + f.value}><dt>{f.label}</dt><dd>{f.value}</dd></div>
        ))}
        {m.version && <div><dt>{T.version}</dt><dd>{m.version}</dd></div>}
        <div><dt>{T.updated}</dt><dd>{String(project.updatedAt).slice(0, 10)}</dd></div>
      </dl>

      {m.principle && <p className="paper-note" {...rich(m.principle)} />}
    </section>
  );
}

/* --------------------------------------------------------------------- parts */

function PartBlock({ part, doc, T }: { part: DocPart; doc: Architecture; T: Strings }) {
  return (
    <section className="paper-part">
      <h1 id={anchor(part.number)} className="paper-h1">
        <span className="paper-num">{part.number}</span>{part.title}
      </h1>

      {part.lead.map((body, i) => <Body key={i} body={body} doc={doc} T={T} />)}

      {part.entries.map(entry => (
        <section className="paper-entry" key={entry.number}>
          <h2 id={anchor(entry.number)} className="paper-h2">
            <span className="paper-num">{entry.number}</span>{entry.title}
          </h2>
          {entry.subtitle && <p className="paper-sub" {...rich(entry.subtitle)} />}
          <Body body={entry.body} doc={doc} T={T} />
          {entry.note && <p className="paper-note" {...rich(entry.note)} />}
        </section>
      ))}
    </section>
  );
}

function Body({ body, doc, T }: { body: DocBody; doc: Architecture; T: Strings }) {
  switch (body.kind) {
    case 'intro': return <Intro doc={doc} />;
    case 'diagram': return <Figure doc={doc} T={T} />;
    case 'inventory': return <Inventory doc={doc} T={T} />;
    case 'section': return <SectionBody doc={doc} section={body.section} />;
    case 'flow': return <FlowBody doc={doc} flow={body.flow} T={T} />;
    case 'stack': return <Stack doc={doc} T={T} />;
  }
}

function Intro({ doc }: { doc: Architecture }) {
  const paragraphs = (doc.meta.intro || '').split(/\n{2,}/).filter(Boolean);
  return (
    <>
      {paragraphs.map((p, i) => <p key={i} className="paper-lead" {...rich(p)} />)}
      {doc.meta.distributionNote && <p className="paper-note" {...rich(doc.meta.distributionNote)} />}
    </>
  );
}

/* ------------------------------------------------------------------ diagram */

function Figure({ doc, T }: { doc: Architecture; T: Strings }) {
  return (
    <figure className="paper-figure">
      <PaperDiagram doc={doc} />
      <figcaption>{T.figure}</figcaption>
      <ul className="paper-legend">
        {doc.groups.map(g => (
          <li key={g.id}>
            <i style={{ background: g.color }} />{g.name}
          </li>
        ))}
      </ul>
    </figure>
  );
}

function PaperDiagram({ doc }: { doc: Architecture }) {
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState('');
  const [height, setHeight] = useState(0);

  const colour = useCallback(
    (gid: string) => doc.groups.find(g => g.id === gid)?.color || '#28519F',
    [doc.groups]
  );

  /* Coordinates come from `offsetLeft/offsetTop`, not `getBoundingClientRect`:
   * the stage is scaled by a transform, and only the offset family is immune
   * to it. `.paper-stage` is the offset parent, so these are stage-local. */
  const draw = useCallback(() => {
    const host = stage.current;
    if (!host) return;
    const support = supportLayerId(doc);
    const index = Object.fromEntries(doc.layers.map((l, i) => [l.id, i]));
    const byId = Object.fromEntries(doc.components.map(c => [c.id, c]));
    let out = '';

    doc.components.forEach(c => (c.deps || []).forEach(dep => {
      const target = byId[dep];
      if (!target) return;
      if (support && (c.layer === support || target.layer === support)) return;
      const a = host.querySelector<HTMLElement>(`[data-comp="${CSS.escape(c.id)}"]`);
      const b = host.querySelector<HTMLElement>(`[data-comp="${CSS.escape(dep)}"]`);
      if (!a || !b) return;

      const x1 = a.offsetLeft + a.offsetWidth / 2;
      const x2 = b.offsetLeft + b.offsetWidth / 2;
      const la = index[c.layer], lb = index[target.layer];
      let y1: number, y2: number, k1: number, k2: number;
      if (la === lb) {
        y1 = a.offsetTop + a.offsetHeight; y2 = b.offsetTop + b.offsetHeight; k1 = 30; k2 = 30;
      } else {
        const up = la > lb;
        y1 = up ? a.offsetTop : a.offsetTop + a.offsetHeight;
        y2 = up ? b.offsetTop + b.offsetHeight : b.offsetTop;
        const k = (up ? -1 : 1) * Math.max(24, Math.abs(y2 - y1) * .5);
        k1 = k; k2 = -k;
      }
      out += `<path d="M${x1},${y1} C${x1},${y1 + k1} ${x2},${y2 + k2} ${x2},${y2}" fill="none" `
           + `stroke="${colour(c.group)}" stroke-width="1.2" stroke-opacity=".28" stroke-linecap="round"/>`;
    }));

    setEdges(out);
    setHeight(host.offsetHeight);
  }, [doc, colour]);

  useLayoutEffect(() => { draw(); }, [draw]);

  /* Web fonts land after first layout and move every card a few pixels. */
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) draw(); });
    return () => { alive = false; };
  }, [draw]);

  /* On screen the stage is scaled down to whatever width it is given; in print
   * a fixed scale takes over, from the stylesheet. Only `--fit-scale` is set
   * here — an inline `--paper-scale` would beat the print media query. */
  useEffect(() => {
    const host = frame.current;
    if (!host) return;
    let last = -1;
    const fit = () => {
      const w = host.clientWidth;
      if (w === last) return;
      last = w;
      host.style.setProperty('--fit-scale', String(Math.min(1, w / STAGE_W)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  /* Printed, the stage fits the page — whichever of the two dimensions binds
   * first. A figure is worth more small than cut off. */
  const printScale = Math.min(PAGE_W / STAGE_W, height ? PAGE_H / height : 1);

  return (
    <div ref={frame} className="paper-frame" style={{
      ['--stage-h' as string]: `${height}px`,
      ['--fit-print' as string]: printScale.toFixed(3)
    }}>
      <div ref={stage} className="paper-stage">
        <svg className="paper-edges" viewBox={`0 0 ${STAGE_W} ${height || 1}`}
          width={STAGE_W} height={height} dangerouslySetInnerHTML={{ __html: edges }} />
        {doc.layers.map(layer => (
          <div className="paper-layer" key={layer.id}>
            <div className="paper-layer-head">
              <b>{layer.name}</b>{layer.desc && <em>{layer.desc}</em>}
            </div>
            <div className="paper-layer-row">
              {doc.components.filter(c => c.layer === layer.id).map(c => (
                <div className="paper-node" key={c.id} data-comp={c.id}
                  style={{ ['--c' as string]: colour(c.group) }}>
                  <div className="nh">
                    <span className="ic"><Icon name={c.icon || 'box'} size={13} /></span>
                    <span className="nm">{c.name}</span>
                  </div>
                  {!!c.tech?.length && (
                    <div className="tech">{c.tech.map(t => <span key={t}>{t}</span>)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- inventory */

function Inventory({ doc, T }: { doc: Architecture; T: Strings }) {
  const groupName = (id: string) => doc.groups.find(g => g.id === id)?.name || id;
  const colour = (id: string) => doc.groups.find(g => g.id === id)?.color || '#94A3B8';
  const named = (id: string) => doc.components.find(c => c.id === id)?.name || id;
  const detailed = doc.components.filter(c => c.features?.length || c.notes?.length || c.deps?.length);

  return (
    <>
      <table className="paper-table">
        <thead>
          <tr>
            <th style={{ width: '24%' }}>{T.component}</th>
            <th style={{ width: '18%' }}>{T.scope}</th>
            <th style={{ width: '26%' }}>{T.tech}</th>
            <th>{T.role}</th>
          </tr>
        </thead>
        {doc.layers.map(layer => {
          const items = doc.components.filter(c => c.layer === layer.id);
          if (!items.length) return null;
          return (
            <tbody key={layer.id}>
              <tr className="paper-tr-group"><th colSpan={4}>{layer.name}</th></tr>
              {items.map(c => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>
                    <i className="paper-dot" style={{ background: colour(c.group) }} />
                    {groupName(c.group)}
                  </td>
                  <td>{c.tech?.length ? c.tech.join(' · ') : T.dash}</td>
                  <td>{c.role || T.dash}</td>
                </tr>
              ))}
            </tbody>
          );
        })}
      </table>

      {!!detailed.length && (
        <>
          <h3 className="paper-h3">{T.detail}</h3>
          <div className="paper-sheets">
            {detailed.map(c => <Sheet key={c.id} comp={c} named={named} colour={colour} T={T} />)}
          </div>
        </>
      )}
    </>
  );
}

function Sheet({ comp, named, colour, T }: {
  comp: Component; named: (id: string) => string; colour: (id: string) => string; T: Strings;
}) {
  return (
    <div className="paper-card" style={{ ['--c' as string]: colour(comp.group) }}>
      <h4>
        <span className="paper-ic"><Icon name={comp.icon || 'box'} size={14} /></span>
        {comp.name}
      </h4>
      {comp.role && <p {...rich(comp.role)} />}
      {!!comp.features?.length && (
        <ul className="paper-bullets">{comp.features.map((f, i) => <li key={i} {...rich(f)} />)}</ul>
      )}
      {!!comp.deps?.length && (
        <p className="paper-deps"><b>{T.dependsOn} :</b> {comp.deps.map(named).join(', ')}</p>
      )}
      {!!comp.notes?.length && (
        <p className="paper-note">{comp.notes.map((n, i) => <span key={i} {...rich(n)} />)}</p>
      )}
    </div>
  );
}


/* -------------------------------------------------------------------- flows */

function FlowBody({ doc, flow, T }: { doc: Architecture; flow: Flow; T: Strings }) {
  const at = (id: string) => doc.components.find(c => c.id === id);
  return (
    <ol className="paper-steps" style={{ ['--c' as string]: scopeColour(doc, flow.group) }}>
      {flow.steps.map((s, i) => {
        const comp = at(s.component);
        return (
          <li key={i}>
            <span className="n">{i + 1}</span>
            <div className="tx">
              <b>{s.title}</b>
              {s.description && <p {...rich(s.description)} />}
              <span className="who">
                <Icon name={comp?.icon || 'box'} size={12} />{comp?.name || s.component}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Stack({ doc, T }: { doc: Architecture; T: Strings }) {
  return (
    <table className="paper-table">
      <thead>
        <tr>
          <th style={{ width: '28%' }}>{T.technology}</th>
          <th style={{ width: '24%' }}>{T.category}</th>
          <th>{T.description}</th>
        </tr>
      </thead>
      <tbody>
        {doc.technologies.map(t => (
          <tr key={t.name}>
            <td>{t.name}</td>
            <td>{t.category || T.dash}</td>
            <td>{t.description || T.dash}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ----------------------------------------------------------------- sections */

function SectionBody({ doc, section }: { doc: Architecture; section: Section }) {
  switch (section.type) {
    case 'cards': return <Cards doc={doc} items={(section as CardsSection).items || []} />;
    case 'timeline': return <Timeline doc={doc} section={section as TimelineSection} />;
    case 'table': return <FreeTable section={section as TableSection} />;
    case 'compare': return <Compare doc={doc} section={section as CompareSection} />;
    case 'text': return <TextBlocks doc={doc} section={section as TextSection} />;
    default: return null;
  }
}

/* Every card carries a scope colour, falling back to the first scope — the
 * viewer does the same, and a chip with no colour is a chip with no meaning. */
const scopeColour = (doc: Architecture, id?: string) =>
  doc.groups.find(g => g.id === id)?.color || doc.groups[0]?.color || 'var(--brand)';

function Cards({ doc, items }: { doc: Architecture; items: CardItem[] }) {
  return (
    <div className="paper-cards">
      {items.map((item, i) => (
        <div className="paper-card" key={i} style={{ ['--c' as string]: scopeColour(doc, item.group) }}>
          <h4>
            <span className="paper-ic"><Icon name={item.icon || 'box'} size={14} /></span>
            {item.title}
          </h4>
          {item.body && <p {...rich(item.body)} />}
          {!!item.bullets?.length && (
            <ul className="paper-bullets">{item.bullets.map((b, j) => <li key={j} {...rich(b)} />)}</ul>
          )}
        </div>
      ))}
    </div>
  );
}

function Timeline({ doc, section }: { doc: Architecture; section: TimelineSection }) {
  return (
    <>
      <div className="paper-card">
        {section.lineTitle && <h4 className="paper-line-title">{section.lineTitle}</h4>}
        {(section.items || []).map((phase, i) => (
          <div className="paper-phase" key={i}
            style={{ ['--c' as string]: scopeColour(doc, phase.group) }}>
            {phase.period && <div className="w">{phase.period}</div>}
            <h4>{phase.title}</h4>
            {!!phase.bullets?.length && (
              <ul className="paper-bullets">{phase.bullets.map((b, j) => <li key={j} {...rich(b)} />)}</ul>
            )}
          </div>
        ))}
      </div>
      {!!section.aside?.length && <Cards doc={doc} items={section.aside} />}
    </>
  );
}

function FreeTable({ section }: { section: TableSection }) {
  const columns = section.columns || [];
  return (
    <table className="paper-table">
      <thead>
        <tr>{columns.map((c, i) => <th key={i} style={c.width ? { width: c.width } : undefined}>{c.label}</th>)}</tr>
      </thead>
      <tbody>
        {(section.rows || []).map((row, i) => (
          <tr key={i}>
            {columns.map((_, j) => <td key={j} {...rich(row[j] ?? '')} />)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Compare({ doc, section }: { doc: Architecture; section: CompareSection }) {
  const poles = section.columns || [];
  return (
    <>
      <div className="paper-poles">
        {poles.map((pole, i) => (
          <div className="paper-pole" key={i} style={{ ['--c' as string]: scopeColour(doc, pole.group) }}>
            <div className="top">
              {pole.kicker && <div className="k">{pole.kicker}</div>}
              <h4>{pole.title}</h4>
              {pole.pitch && <p {...rich(pole.pitch)} />}
            </div>
            <div className="body">
              {!!pole.rows?.length && (
                <dl className="paper-kv">
                  {pole.rows.map((r, j) => (
                    <Fragment key={j}>
                      <dt {...rich(r[0] ?? '')} />
                      <dd {...rich(r[1] ?? '')} />
                    </Fragment>
                  ))}
                </dl>
              )}
              {!!pole.bullets?.length && (
                <>
                  {!!pole.rows?.length && <div className="paper-divider" />}
                  <ul className="paper-bullets">{pole.bullets.map((b, j) => <li key={j} {...rich(b)} />)}</ul>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {section.table && (
        <>
          {section.table.title && <h3 className="paper-h3">{section.table.title}</h3>}
          {section.table.subtitle && <p className="paper-sub" {...rich(section.table.subtitle)} />}
          <table className="paper-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>{section.table.firstColumn || ''}</th>
                {poles.map((p, i) => (
                  <th key={i}>
                    <i className="paper-dot" style={{ background: scopeColour(doc, p.group) }} />
                    {p.short || p.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(section.table.rows || []).map((row, i) => (
                <tr key={i}>
                  <td {...rich(row[0] ?? '')} />
                  {poles.map((_, j) => <td key={j} {...rich(row[j + 1] ?? '')} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {!!section.cards?.length && (
        <div className="paper-cards">
          {section.cards.map((card, i) => (
            <div className="paper-card" key={i} style={{ ['--c' as string]: scopeColour(doc, card.group) }}>
              <h4>{card.title}</h4>
              {card.subtitle && <p {...rich(card.subtitle)} />}
              {!!card.bullets?.length && (
                <ul className="paper-bullets">{card.bullets.map((b, j) => <li key={j} {...rich(b)} />)}</ul>
              )}
              {card.note && <p className="paper-note" {...rich(card.note)} />}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function TextBlocks({ doc, section }: { doc: Architecture; section: TextSection }) {
  const paragraphs = (body?: string | string[]) =>
    Array.isArray(body) ? body : body ? [body] : [];
  return (
    <div className="paper-blocks">
      {(section.blocks || []).map((block, i) => (
        <div className="paper-card" key={i} style={{ ['--c' as string]: scopeColour(doc, block.group) }}>
          {block.title && <h4>{block.title}</h4>}
          {paragraphs(block.body).map((p, j) => <p key={j} {...rich(p)} />)}
        </div>
      ))}
    </div>
  );
}
