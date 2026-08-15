/* The worked example behind /how-it-works.
 *
 * A checkout, small enough to read in one screen and large enough to need
 * every word the model knows: four layers, three scopes, ten components, the
 * three kinds of dependency, and one flow that crosses all of it — including a
 * third party nobody on the team operates.
 *
 * Nothing here is loaded from the database. The page teaches the format, so it
 * carries its own document rather than depending on whatever the reader
 * happens to have in their workspace.
 *
 * The geometry is fixed rather than measured. The studio's canvas and the
 * exported viewer lay nodes out with flexbox and read the boxes back to draw
 * the edges; a teaching diagram has to be identical on every reload, so the
 * columns are numbers and the paths are computed from them — using the same
 * three geometries the viewer uses (down the layers, back up, and an arc under
 * the row for a call inside one layer). */

import type { LinkKind } from '@/lib/types';

export interface DemoLayer { id: string; name: string; desc: string }
export interface DemoGroup { id: string; name: string; blurb: string }
export type DemoKind = LinkKind;

export interface DemoNode {
  id: string; name: string; group: string; layer: string;
  icon: string; tech: string; badge?: string;
  /** Column on the grid. Halves are allowed: a gateway sits between two clients. */
  col: number;
}

export interface DemoEdge {
  from: string; to: string; kind: DemoKind; protocol: string; note?: string;
}

export interface DemoStep { component: string; title: string; body: string }

export const LAYERS: DemoLayer[] = [
  { id: 'clients',  name: 'Client channels',  desc: 'What a person touches' },
  { id: 'edge',     name: 'Edge',             desc: 'One way in · auth · rate limits' },
  { id: 'services', name: 'Services',         desc: 'Where the business rules live' },
  { id: 'data',     name: 'Data & messaging', desc: 'State that outlives a request' }
];

export const GROUPS: DemoGroup[] = [
  { id: 'core',     name: 'Core',         blurb: 'Written and operated by your team.' },
  { id: 'platform', name: 'Platform',     blurb: 'Shared plumbing every service leans on.' },
  { id: 'vendor',   name: 'Third party',  blurb: 'You depend on it. You do not run it.' }
];

export const NODES: DemoNode[] = [
  { id: 'web',       name: 'Web app',        group: 'core',     layer: 'clients',  icon: 'web',    tech: 'React · Next',      col: 0 },
  { id: 'mobile',    name: 'Mobile app',     group: 'core',     layer: 'clients',  icon: 'mobile', tech: 'Swift · Kotlin',    col: 1 },
  { id: 'gateway',   name: 'API gateway',    group: 'platform', layer: 'edge',     icon: 'route',  tech: 'Kong · OAuth2',     col: 0.5, badge: 'entry' },
  { id: 'orders',    name: 'Order service',  group: 'core',     layer: 'services', icon: 'box',    tech: 'Node · TypeScript', col: 0 },
  { id: 'payments',  name: 'Payment service',group: 'core',     layer: 'services', icon: 'card',   tech: 'Go',                col: 1 },
  { id: 'processor', name: 'Card processor', group: 'vendor',   layer: 'services', icon: 'plug',   tech: 'Stripe',            col: 2, badge: 'SaaS' },
  { id: 'notifier',  name: 'Notifier',       group: 'core',     layer: 'services', icon: 'mail',   tech: 'Python · SES',      col: 3 },
  { id: 'db',        name: 'Orders database',group: 'core',     layer: 'data',     icon: 'db',     tech: 'PostgreSQL',        col: 0 },
  { id: 'bus',       name: 'Event bus',      group: 'platform', layer: 'data',     icon: 'bolt',   tech: 'Kafka',             col: 2 },
  { id: 'warehouse', name: 'Warehouse',      group: 'platform', layer: 'data',     icon: 'chart',  tech: 'BigQuery',          col: 3 }
];

export const EDGES: DemoEdge[] = [
  { from: 'web',       to: 'gateway',   kind: 'sync',  protocol: 'REST/HTTPS' },
  { from: 'mobile',    to: 'gateway',   kind: 'sync',  protocol: 'REST/HTTPS' },
  { from: 'gateway',   to: 'orders',    kind: 'sync',  protocol: 'REST/HTTPS' },
  { from: 'gateway',   to: 'payments',  kind: 'sync',  protocol: 'REST/HTTPS' },
  { from: 'orders',    to: 'db',        kind: 'sync',  protocol: 'SQL' },
  { from: 'orders',    to: 'bus',       kind: 'async', protocol: 'Kafka', note: 'publishes order.paid' },
  { from: 'payments',  to: 'processor', kind: 'sync',  protocol: 'HTTPS', note: 'card authorisation' },
  { from: 'notifier',  to: 'bus',       kind: 'async', protocol: 'Kafka', note: 'consumer group' },
  { from: 'db',        to: 'warehouse', kind: 'batch', protocol: 'CDC',   note: 'nightly 02:00' }
];

export const FLOW: { name: string; sub: string; note: string; steps: DemoStep[] } = {
  name: 'Checkout',
  sub: 'card · web and mobile',
  note: 'Steps 1 to 5 are one request the customer waits on. Steps 6 and 7 are not: '
    + 'if the notifier is down the order is still paid, and the receipt goes out when it returns.',
  steps: [
    { component: 'web',       title: 'The basket is confirmed',
      body: 'The customer presses Pay. The web app posts the basket and the delivery address to the gateway.' },
    { component: 'gateway',   title: 'The caller is identified',
      body: 'The token is checked and the request is rate-limited, then forwarded. No service is exposed directly.' },
    { component: 'orders',    title: 'A pending order is written',
      body: 'The order service takes the basket, prices it, and writes an order in state pending.' },
    { component: 'payments',  title: 'The card is charged',
      body: 'The payment service is called with the order id and the amount. It never sees the basket.' },
    { component: 'processor', title: 'The provider authorises',
      body: 'The card processor approves and returns a reference. This is the one hop your team does not operate.' },
    { component: 'bus',       title: 'order.paid is published',
      body: 'The order flips to paid and an event lands on the bus. Nothing downstream is called by name.' },
    { component: 'notifier',  title: 'The receipt goes out',
      body: 'The notifier consumes order.paid and emails the receipt. The queue holds the message until it can.' }
  ]
};

/* ------------------------------------------------------------------ layout */

export const NODE_W = 168;
export const NODE_H = 58;
const X0 = 14;
const PITCH = 204;
const BAND_H = 112;
const TOP = 6;
/** Room under the last band for the arc an in-layer call takes. */
const BOTTOM = 36;

export const VB_W = X0 + 3 * PITCH + NODE_W + 4;
export const VB_H = TOP + LAYERS.length * BAND_H + BOTTOM;

export const bandY = (layer: string) => TOP + LAYERS.findIndex(l => l.id === layer) * BAND_H;
export const BAND_INNER = BAND_H;

const byId = new Map(NODES.map(n => [n.id, n]));
export const node = (id: string) => byId.get(id)!;

/** Top-left corner of a node's box, in viewBox units. */
export function box(id: string) {
  const n = node(id);
  return { x: X0 + n.col * PITCH, y: bandY(n.layer) + 36, w: NODE_W, h: NODE_H };
}

const layerIndex = (id: string) => LAYERS.findIndex(l => l.id === id);

/** The viewer's three geometries, verbatim: down the layers, back up, and an
 *  arc under the row when caller and callee share one. The ends come back with
 *  the path because the caller's disc and the callee's circle sit on them. */
export function edgeGeometry(fromId: string, toId: string) {
  const a = box(fromId), b = box(toId);
  const x1 = a.x + a.w / 2, x2 = b.x + b.w / 2;
  const la = layerIndex(node(fromId).layer), lb = layerIndex(node(toId).layer);

  if (la === lb) {
    const y1 = a.y + a.h, y2 = b.y + b.h;
    return { x1, y1, x2, y2, d: `M${x1},${y1} C${x1},${y1 + 30} ${x2},${y2 + 30} ${x2},${y2}` };
  }
  const up = la > lb;
  const y1 = up ? a.y : a.y + a.h;
  const y2 = up ? b.y + b.h : b.y;
  const k = (up ? -1 : 1) * Math.max(24, Math.abs(y2 - y1) * 0.5);
  return { x1, y1, x2, y2, d: `M${x1},${y1} C${x1},${y1 + k} ${x2},${y2 - k} ${x2},${y2}` };
}

/** Where a flow hop is drawn: the same curve, but from centre to centre, since
 *  a step is not required to follow a dependency the diagram already has. */
export function hopPath(fromId: string, toId: string): string {
  const a = box(fromId), b = box(toId);
  const x1 = a.x + a.w / 2, y1 = a.y + a.h / 2;
  const x2 = b.x + b.w / 2, y2 = b.y + b.h / 2;
  const dy = Math.abs(y2 - y1);
  if (dy < 4) {
    const lift = 46;
    return `M${x1},${y1} C${x1},${y1 + lift} ${x2},${y2 + lift} ${x2},${y2}`;
  }
  const k = Math.max(26, dy * 0.45) * (y2 > y1 ? 1 : -1);
  return `M${x1},${y1} C${x1},${y1 + k} ${x2},${y2 - k} ${x2},${y2}`;
}

/* The three kinds are named, dashed and explained in one place — this page
 * reads that table rather than keeping a fourth copy of it. */
export { LINK_KINDS, LINK_DASH, LINK_KIND_LABELS, LINK_KIND_BLURBS } from '@/lib/links';
