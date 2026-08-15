/* The diagram on /how-it-works, drawn once and read four ways.
 *
 * It is the same drawing the canvas and the exported viewer make — paper
 * nodes, a neutral edge, the scope on the icon chip, a filled disc at the
 * caller and an open circle at the callee — rebuilt in one SVG so a stylesheet
 * can take pieces of it away. What each `stage` shows is a matter of CSS
 * opacity, not of conditional markup: the geometry never moves between stages,
 * so the reader keeps the same picture in their head from the first band to
 * the last flow step.
 *
 * Everything that animates here is decorative. Every stage is legible with all
 * of it switched off, which is exactly what `prefers-reduced-motion` does. */

import { ICONS } from '@/components/Icon';
import {
  LAYERS, NODES, EDGES, LINK_DASH,
  NODE_W, VB_W, VB_H, BAND_INNER, bandY, box, node, edgeGeometry, hopPath
} from './demo';

export type Stage = 'layers' | 'scopes' | 'components' | 'deps' | 'flow';

/* Mono at 9 px is near enough to 5.5 px a character for a plate that never
 * holds more than one word. */
const badgeWidth = (text: string) => text.length * 5.5 + 12;

function Node({ id, className }: { id: string; className?: string }) {
  const n = node(id);
  const b = box(id);
  return (
    <g
      className={['hnode', className].filter(Boolean).join(' ')}
      style={{ ['--gc' as string]: `var(--g-${n.group})` }}
    >
      <rect className="body" x={b.x} y={b.y} width={b.w} height={b.h} />
      <rect className="chip" x={b.x + 12} y={b.y + 12} width={20} height={20} />
      <g
        className="glyph" transform={`translate(${b.x + 16} ${b.y + 16}) scale(.5)`}
        dangerouslySetInnerHTML={{ __html: ICONS[n.icon] || ICONS.box }}
      />
      <text className="nm" x={b.x + 42} y={b.y + 27}>{n.name}</text>
      <text className="tech" x={b.x + 42} y={b.y + 43}>{n.tech}</text>
      {n.badge && (
        <>
          <rect
            className="badgeplate" x={b.x + b.w - badgeWidth(n.badge)} y={b.y - 1}
            width={badgeWidth(n.badge)} height={15}
          />
          <text className="badge" x={b.x + b.w - badgeWidth(n.badge) / 2} y={b.y + 10}>{n.badge}</text>
        </>
      )}
    </g>
  );
}

/** The three leads naming the parts of a component, hung off the mobile app —
 *  the one node with empty diagram to its right at every width. */
function Anatomy() {
  const b = box('mobile');
  const x = b.x + NODE_W + 34;
  const g = box('gateway');
  return (
    <g className="hcallout" aria-hidden="true">
      <line className="lead" x1={b.x + NODE_W + 4} y1={b.y + 22} x2={x - 8} y2={b.y + 12} />
      <text className="ctxt" x={x} y={b.y + 15}>icon, filled with the scope colour</text>
      <line className="lead" x1={b.x + NODE_W + 4} y1={b.y + 27} x2={x - 8} y2={b.y + 30} />
      <text className="ctxt" x={x} y={b.y + 33}>name — what people call it, not its repo</text>
      <line className="lead" x1={b.x + NODE_W + 4} y1={b.y + 40} x2={x - 8} y2={b.y + 48} />
      <text className="ctxt" x={x} y={b.y + 51}>technologies, in the machine voice</text>

      <line className="lead" x1={g.x + NODE_W + 4} y1={g.y + 6} x2={g.x + NODE_W + 26} y2={g.y + 6} />
      <text className="ctxt" x={g.x + NODE_W + 32} y={g.y + 9}>badge — one word the reviewer must not miss</text>
    </g>
  );
}

export default function Diagram({ stage, step = -1, flowIds = [], animate = true }: {
  /** Which half of the drawing is being talked about. */
  stage: Stage;
  /** Index into the flow's steps, or -1 for none. */
  step?: number;
  /** The flow's step components, in order — the hop and the trail come from it. */
  flowIds?: string[];
  /** False under `prefers-reduced-motion`: the step still highlights, the
   *  packet is simply not sent across the diagram. */
  animate?: boolean;
}) {
  const current = step >= 0 ? flowIds[step] : null;
  const previous = step > 0 ? flowIds[step - 1] : null;
  const visited = new Set(flowIds.slice(0, Math.max(0, step + 1)));

  return (
    <svg
      className={`hdiag stage-${stage}`} viewBox={`0 0 ${VB_W} ${VB_H}`}
      role="img"
      aria-label="Example architecture: a web and mobile client, an API gateway, an order service, a payment service, a card processor, a notifier, a database, an event bus and a warehouse, laid out over four layers."
    >
      {/* bands — the horizontal reading, behind everything */}
      {LAYERS.map(l => {
        const y = bandY(l.id);
        return (
          <g className="hband" key={l.id}>
            <rect className="fill" x={0} y={y} width={VB_W} height={BAND_INNER - 8} />
            <line className="rule" x1={0} y1={y + BAND_INNER - 8} x2={VB_W} y2={y + BAND_INNER - 8} />
            <text className="blabel" x={14} y={y + 18}>
              {l.name}<tspan className="bdesc" dx={12}>{l.desc}</tspan>
            </text>
          </g>
        );
      })}

      {/* edges — under the nodes, so the open circle at the callee is punched
          out by the box it answers from rather than drawn across it */}
      <g className="hedges">
        {EDGES.map((e, i) => {
          const { x1, y1, x2, y2, d } = edgeGeometry(e.from, e.to);
          const lit = !current || (visited.has(e.from) && visited.has(e.to));
          return (
            <g
              className={`hedge${lit ? '' : ' faint'}`} key={`${e.from}-${e.to}`}
              style={{ ['--gc' as string]: `var(--g-${node(e.from).group})`, ['--i' as string]: i }}
            >
              <path d={d} fill="none" strokeDasharray={LINK_DASH[e.kind] || undefined} />
              <circle className="caller" cx={x1} cy={y1} r={3.5} />
              <circle className="callee" cx={x2} cy={y2} r={3} />
            </g>
          );
        })}
      </g>

      {/* the hop the flow is taking, over the dependencies: it is the only
          thing being said at that moment */}
      {current && previous && (
        <g className="hhop" key={`hop-${step}`}>
          <path className="trail" d={hopPath(previous, current)} pathLength={100} fill="none" />
          {animate && (
            <circle className="packet" r={5}>
              <animateMotion
                dur="0.8s" fill="freeze" calcMode="spline" keyPoints="0;1" keyTimes="0;1"
                keySplines="0.4 0 0.2 1" path={hopPath(previous, current)}
              />
            </circle>
          )}
        </g>
      )}

      <g className="hnodes">
        {NODES.map(n => (
          <Node
            key={n.id} id={n.id}
            className={
              !current ? ''
                : current === n.id ? 'on'
                : visited.has(n.id) ? 'past'
                : 'dim'
            }
          />
        ))}
      </g>

      <Anatomy />
    </svg>
  );
}
