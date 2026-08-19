/* The environments an architecture runs in — dev, SA, production.
 *
 * ------------------------------------------------------- why a document list
 *
 * A component could carry its own list of `{ name, url }` pairs and that would
 * be less plumbing. It would also be useless within a week: one component says
 * "SA", the next says "recette", the third says "staging", and the question
 * anyone actually asks — *give me every SA address* — has no answer that a table
 * can hold. So the environments are declared once on the document, the way
 * scopes and layers are, and a component fills in the ones it lives in.
 *
 * Declaration order is reading order, because it is the pipeline. A table with
 * production in the middle is one nobody trusts, and sorting alphabetically
 * would put dev after SA and prod first — which is exactly backwards.
 *
 * ------------------------------------------------------ what an entry holds
 *
 * An address, a version, and a line of prose. The version is the field to be
 * careful with: it is the only thing here that goes stale on its own, and a
 * document that says "prod = 2.4.1" three releases later is worse than one that
 * never said. So nothing derives from it, nothing warns on it, and it is left
 * blank by default — it earns its place during a migration, when "SA is two
 * versions ahead" is the whole conversation, and should be cleared after.
 *
 * ------------------------------------------------------- not `deployedOn`
 *
 * `deployedOn` says which platform a component runs on — OpenShift, AWS. This
 * says which *instance* of the architecture you are looking at. They are
 * orthogonal: the same component on OpenShift has a dev, an SA and a prod URL.
 */

import type { Component, EnvEntry, Environment } from './types';

/** An entry that names an environment and says nothing else is still an answer
 *  — "it is deployed there" — so only a fully blank one is dropped. */
export const envEntryIsEmpty = (e: EnvEntry): boolean =>
  !e.url?.trim() && !e.version?.trim() && !e.note?.trim();

export const environmentOf = (
  environments: Environment[], id: string | undefined
): Environment | undefined => (id ? environments.find(e => e.id === id) : undefined);

export const environmentName = (environments: Environment[], id: string): string =>
  environmentOf(environments, id)?.name || id;

/** A component's entries, in the document's environment order rather than
 *  whatever order they were typed in. Every table downstream reads across a row,
 *  so the columns have to line up without each one re-sorting. */
export function envsOf(component: Component, environments: Environment[]): EnvEntry[] {
  const at = new Map(environments.map((e, i) => [e.id, i]));
  return [...(component.envs || [])]
    .filter(e => at.has(e.env))
    .sort((a, b) => at.get(a.env)! - at.get(b.env)!);
}

/** Read one field out of one environment, for a table cell. */
export const envEntry = (component: Component, env: string): EnvEntry | undefined =>
  (component.envs || []).find(e => e.env === env);

/** The environments at least one component fills in.
 *
 *  Every table asks before drawing a column: a document that declared five
 *  environments and filled two should print two columns, not five and three
 *  columns of dashes. The same restraint `marksInUse` keeps for its legend. */
export function environmentsInUse(
  components: Component[], environments: Environment[]
): Environment[] {
  const held = new Set<string>();
  components.forEach(c => (c.envs || []).forEach(e => {
    if (!envEntryIsEmpty(e)) held.add(e.env);
  }));
  return environments.filter(e => held.has(e.id));
}

/** Components with something to say about at least one environment, in document
 *  order — the rows of the environments table. */
export const componentsWithEnvs = (components: Component[]): Component[] =>
  components.filter(c => (c.envs || []).some(e => !envEntryIsEmpty(e)));

/** Set or clear one field of one entry, creating or dropping the entry as
 *  needed. The editor calls nothing else: a form that has to decide whether an
 *  entry already exists before it can type into it is a form with a bug in it. */
export function setEnvField(
  component: Component, env: string, field: 'url' | 'version' | 'note', value: string
): void {
  const out = [...(component.envs || [])];
  const at = out.findIndex(e => e.env === env);
  const next: EnvEntry = at >= 0 ? { ...out[at] } : { env };
  const clean = value.trim();
  if (clean) next[field] = value; else delete next[field];

  if (envEntryIsEmpty(next)) {
    if (at >= 0) out.splice(at, 1);
  } else if (at >= 0) out[at] = next;
  else out.push(next);

  component.envs = out.length ? out : undefined;
}

/** Move an environment one place earlier or later. Order is the pipeline, so
 *  this is the only thing that decides what a table's columns read like.
 *
 *  Returns the list unchanged when there is nowhere to go, so the caller can
 *  compare identity to decide whether the button is live — the contract
 *  `moveZone` keeps. */
export function moveEnvironment(
  environments: Environment[], id: string, delta: -1 | 1
): Environment[] {
  const at = environments.findIndex(e => e.id === id);
  const to = at + delta;
  if (at < 0 || to < 0 || to >= environments.length) return environments;
  const out = [...environments];
  [out[at], out[to]] = [out[to], out[at]];
  return out;
}

export const canMoveEnvironment = (
  environments: Environment[], id: string, delta: -1 | 1
): boolean => moveEnvironment(environments, id, delta) !== environments;
