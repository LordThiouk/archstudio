'use client';

/* /how-it-works — the studio explaining its own format.
 *
 * The page teaches one worked example (src/components/howto/demo.ts) rather
 * than a tour of the buttons: what a layer is, what a scope is, what an edge
 * says that a line cannot, and what a flow is once the drawing exists. Buttons
 * are findable; a format is not, and everything downstream — the exported
 * viewer, the printed document, the model prompt — is that format.
 *
 * Motion is a teaching aid and never the message. Each section auto-advances
 * only while it is on screen, stops for good the moment the reader takes the
 * controls, and does not start at all under `prefers-reduced-motion`, where
 * every stage is still reachable by hand. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Lockup } from '@/components/Brand';
import Diagram, { type Stage } from './Diagram';
import {
  GROUPS, LAYERS, FLOW, EDGES, NODES,
  LINK_KINDS, LINK_DASH, LINK_KIND_LABELS, LINK_KIND_BLURBS, node
} from './demo';

/* ------------------------------------------------------------------ hooks */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);
  return reduced;
}

/** True while the element is on screen. Nothing animates off screen. */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setSeen(e.isIntersecting), { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

/* ------------------------------------------------------------------ chrome */

function Topbar() {
  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('studio-theme', next); } catch { /* private mode */ }
  }
  return (
    <header className="h-top">
      <a className="h-brand" href="/"><Lockup size={26} sub="How it works" /></a>
      <div style={{ flex: 1 }} />
      <button className="iconbtn" onClick={toggleTheme} title="Light / dark" aria-label="Light or dark">
        <Icon name="moon" size={15} />
      </button>
      <a className="btn" href="/"><Icon name="back" size={15} />Back to projects</a>
    </header>
  );
}

/* -------------------------------------------------------------------- hero */

const OUTPUTS = [
  { icon: 'grid', title: 'Draw it once',
    body: 'Components on layers, a line between the ones that talk. Ten minutes for a system you already know by heart.' },
  { icon: 'file', title: 'Write around it',
    body: 'Context, decisions, risks, phases — filed into chapters that renumber themselves as you move them.' },
  { icon: 'download', title: 'Send one file',
    body: 'A self-contained HTML page with the fonts inside it, or a numbered document to print. No server, no login, no link that rots.' }
];

function Hero() {
  return (
    <section className="h-hero">
      <span className="mlabel">How it works</span>
      <h1>Draw the architecture once.<br />Send the document.</h1>
      <p className="lede">
        ArchStudio is a drawing tool that ends in a deliverable. You lay out the systems you actually
        run, say how they call each other, walk a reader through a few flows — and the same model
        comes back out as an interactive page, a printable design document, and a JSON file you can
        keep in the repo. This page explains that model on one worked example: a checkout.
      </p>
      <div className="h-outputs">
        {OUTPUTS.map((o, i) => (
          <div className="h-out" key={o.title} style={{ ['--i' as string]: i }}>
            <span className="n mono">{String(i + 1).padStart(2, '0')}</span>
            <Icon name={o.icon} size={18} />
            <b>{o.title}</b>
            <p>{o.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- model */

const STAGES: { id: Stage; kicker: string; title: string; body: string }[] = [
  {
    id: 'layers', kicker: 'Layers', title: 'Where a thing sits',
    body: 'A layer is a horizontal band, and every component lands in exactly one. It answers where, '
      + 'never who: what a person touches at the top, the state that outlives a request at the bottom. '
      + 'Read the diagram downwards and you are reading the path of a request.'
  },
  {
    id: 'scopes', kicker: 'Scopes', title: 'Who owns it',
    body: 'A scope answers the other question: who runs this. Core is your team, platform is the shared '
      + 'plumbing, third party is the box nobody on the call can page at 3am. Scope is a colour on the '
      + 'icon chip and on the technology line — never on a border, because five framed colours in one '
      + 'row are five frames shouting.'
  },
  {
    id: 'components', kicker: 'Components', title: 'One box, one deployable thing',
    body: 'A component is something you deploy, name, and can be woken up for. On the diagram it carries '
      + 'an icon, a name, its technologies and an optional badge; behind it, in the inspector, the role, '
      + 'the features and the notes that end up as prose in the written document.'
  },
  {
    id: 'deps', kicker: 'Dependencies', title: 'Who calls whom — and who waits',
    body: 'An edge is one component calling another. The filled disc is the caller and the open circle '
      + 'answers, so direction reads without an arrowhead. The stroke carries the half that decides every '
      + 'resilience conversation: whether the caller is waiting. Colour is already spent on scope, so it '
      + 'cannot be spent here — and a dashed line survives a monochrome print.'
  }
];

const STAGE_MS = 6000;

function ModelSection() {
  const [ref, inView] = useInView<HTMLElement>();
  const reduced = usePrefersReducedMotion();
  const [i, setI] = useState(0);
  const [manual, setManual] = useState(false);

  const auto = inView && !reduced && !manual;
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setI(x => (x + 1) % STAGES.length), STAGE_MS);
    return () => clearInterval(t);
  }, [auto]);

  const pick = (n: number) => { setManual(true); setI(n); };
  const stage = STAGES[i];

  return (
    <section className="h-sec" ref={ref} id="model">
      <div className="h-sechead">
        <span className="mlabel">The model</span>
        <h2>Four words, and there is no fifth</h2>
        <p className="lede">
          Everything the studio stores about a system is layers, scopes, components and the
          dependencies between them. Learn those four and you can read any document it produces —
          including the ones a colleague drew.
        </p>
      </div>

      <div className="h-split">
        <div className="h-steps">
          {STAGES.map((s, n) => (
            <button
              key={s.id} className={`h-stage${n === i ? ' on' : ''}`}
              onClick={() => pick(n)} aria-current={n === i}
            >
              <span className="mlabel">{s.kicker}</span>
              <b>{s.title}</b>
              {n === i && <p>{s.body}</p>}
              {n === i && auto && <i className="h-tick" key={`t${i}`} style={{ animationDuration: `${STAGE_MS}ms` }} />}
            </button>
          ))}

          {stage.id === 'layers' && (
            <ul className="h-legend">
              {LAYERS.map(l => (
                <li key={l.id}>
                  <i className="bar" />
                  <span><b>{l.name}</b>{l.desc}</span>
                </li>
              ))}
            </ul>
          )}
          {stage.id === 'scopes' && (
            <ul className="h-legend">
              {GROUPS.map(g => (
                <li key={g.id}>
                  <i style={{ background: `var(--g-${g.id})` }} />
                  <span><b>{g.name}</b>{g.blurb}</span>
                </li>
              ))}
            </ul>
          )}
          {stage.id === 'components' && (
            <ul className="h-legend">
              <li>
                <i className="bar" />
                <span><b>{NODES.length} components</b>the whole example, on one screen</span>
              </li>
              <li>
                <i className="bar" />
                <span><b>{EDGES.length} dependencies</b>every one of them annotated with a protocol</span>
              </li>
            </ul>
          )}
          {stage.id === 'deps' && (
            <ul className="h-legend">
              {LINK_KINDS.map(k => (
                <li key={k}>
                  <svg className="kindline" viewBox="0 0 34 8" aria-hidden="true">
                    <path d="M2 4h30" strokeDasharray={LINK_DASH[k] || undefined} />
                    <circle cx="2" cy="4" r="2.6" className="caller" />
                    <circle cx="32" cy="4" r="2.2" className="callee" />
                  </svg>
                  <span><b>{LINK_KIND_LABELS[k].en}</b>{LINK_KIND_BLURBS[k]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="h-figure">
          <Diagram stage={stage.id} />
          <p className="h-cap mono">example.arch · checkout · {NODES.length} components</p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- flow */

const FLOW_MS = 2600;
const FLOW_IDS = FLOW.steps.map(s => s.component);

function FlowSection() {
  const [ref, inView] = useInView<HTMLElement>();
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [touched, setTouched] = useState(false);

  /* Autoplay is a demonstration, so it runs once when the reader arrives and
   * never again on its own — a diagram looping behind you while you read the
   * step beside it is worse than a still one. */
  useEffect(() => {
    if (inView && !reduced && !touched) { setTouched(true); setStep(0); setPlaying(true); }
  }, [inView, reduced, touched]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setStep(s => {
        if (s >= FLOW.steps.length - 1) { setPlaying(false); return s; }
        return s + 1;
      });
    }, FLOW_MS);
    return () => clearInterval(t);
  }, [playing]);

  const go = useCallback((n: number) => {
    setPlaying(false);
    setStep(Math.max(0, Math.min(FLOW.steps.length - 1, n)));
  }, []);

  const replay = () => {
    if (playing) { setPlaying(false); return; }
    setStep(0);
    setPlaying(true);
  };

  const active = node(FLOW_IDS[step]);

  return (
    <section className="h-sec alt" ref={ref} id="flow">
      <div className="h-sechead">
        <span className="mlabel">Flows</span>
        <h2>Then you walk someone through it</h2>
        <p className="lede">
          A flow is a story told over components that are already on the page. Seven steps of a
          checkout: two of them are not the customer waiting, and the diagram says which. Press play,
          or take the steps yourself.
        </p>
      </div>

      <div className="h-split flow">
        <div className="h-flow">
          <div className="h-flowhead">
            <h3>{FLOW.name}</h3>
            <span className="mono">{FLOW.sub}</span>
          </div>

          <ol className="h-steplist">
            {FLOW.steps.map((s, n) => {
              const c = node(s.component);
              return (
                <li key={n} className={n <= step ? 'on' : ''} style={{ ['--gc' as string]: `var(--g-${c.group})` }}>
                  <button onClick={() => go(n)} aria-current={n === step}>
                    <span className="n mono">{n + 1}</span>
                    <span className="tx">
                      <b>{s.title}</b>
                      <em>{s.body}</em>
                      <span className="who mono"><Icon name={c.icon} size={12} />{c.name}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="h-playbar">
            <button className="btn" onClick={() => go(step - 1)} disabled={step === 0}>
              <Icon name="back" size={14} />Previous
            </button>
            <button className="btn primary" onClick={() => go(step + 1)} disabled={step === FLOW.steps.length - 1}>
              Next<Icon name="chevron" size={14} />
            </button>
            <button className="btn" onClick={replay}>
              {playing ? 'Pause' : step === FLOW.steps.length - 1 ? 'Replay' : 'Play'}
            </button>
            <div className="h-progress">
              <i style={{ width: `${((step + 1) / FLOW.steps.length) * 100}%` }} />
            </div>
            <span className="mono count">{step + 1}/{FLOW.steps.length}</span>
          </div>

          <p className="h-note">{FLOW.note}</p>
        </div>

        <div className="h-figure">
          <Diagram stage="flow" step={step} flowIds={FLOW_IDS} animate={!reduced} />
          <p className="h-cap mono">
            step {step + 1} · {active.name} · {GROUPS.find(g => g.id === active.group)?.name.toLowerCase()}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- pipeline */

const PIPELINE = [
  { icon: 'grid', title: 'Start from something',
    body: 'A blank canvas, one of six templates — monolith, multi-service, event-driven, serverless, '
      + 'RAG, SaaS multi-tenant — or an existing document that a model reads and turns into a first draft.' },
  { icon: 'cube', title: 'Draw the systems',
    body: 'Drag a component onto a layer, drop a link from its handle onto whatever it calls, then annotate '
      + 'the edge with its protocol and whether the caller waits.' },
  { icon: 'route', title: 'Add the flows',
    body: 'Write the steps, or take a pattern from the library — checkout, sign-up, webhook, batch import — '
      + 'and bind each of its steps to one of your components.' },
  { icon: 'file', title: 'Write the document',
    body: 'Cards, timelines, tables, comparisons and prose, filed into chapters. Move a chapter and the '
      + 'numbering follows it.' },
  { icon: 'download', title: 'Ship it',
    body: 'One self-contained HTML file with the fonts inlined, the raw JSON, or the numbered document to '
      + 'print. History keeps the earlier versions and shows you what changed.' }
];

function PipelineSection() {
  return (
    <section className="h-sec" id="pipeline">
      <div className="h-sechead">
        <span className="mlabel">The loop</span>
        <h2>From an empty canvas to something you can send</h2>
        <p className="lede">
          The five moves, in the order most projects take them. Nothing here is a one-way door: the
          drawing, the prose and the export are the same document, so a component renamed on the canvas
          is renamed in the chapter that mentions it.
        </p>
      </div>

      <ol className="h-pipe">
        {PIPELINE.map((p, i) => (
          <li key={p.title} style={{ ['--i' as string]: i }}>
            <span className="n mono">{String(i + 1).padStart(2, '0')}</span>
            <Icon name={p.icon} size={17} />
            <b>{p.title}</b>
            <p>{p.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* --------------------------------------------------------------------- cta */

function Cta() {
  return (
    <section className="h-cta">
      <h2>That is the whole format.</h2>
      <p>
        Open a project and the demo architecture is already there to take apart. Everything lives in a
        local SQLite file next to the app; the only thing that ever leaves the machine is the document
        you deliberately hand to a model provider for analysis.
      </p>
      <div className="h-ctabtns">
        <a className="btn primary" href="/"><Icon name="grid" size={15} />Open the workspace</a>
        <a className="btn" href="https://tonuxcorp.com" target="_blank" rel="noreferrer">
          <Icon name="external" size={15} />tonuxcorp.com
        </a>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- page */

export default function HowItWorks() {
  return (
    <div className="howto">
      <Topbar />
      <main>
        <Hero />
        <ModelSection />
        <FlowSection />
        <PipelineSection />
        <Cta />
      </main>
      <footer className="h-foot">
        <span className="mono">ArchStudio · self-hosted · SQLite</span>
      </footer>
    </div>
  );
}
