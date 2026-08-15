import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { LINK_KINDS } from '../links';
import { ANALYSIS_SCHEMA, COMPONENT_FIELDS, analysisSchema } from './schema';
import type { Component } from '../types';

/* The schema is sent to an API that compiles it and then holds the model to
 * it, so a mistake here is not a type error — it is a 400 at the moment a
 * reader presses the button, or worse, a document that validates and means
 * something else. These tests hold it to the two things that are true of it by
 * construction and easy to break by hand. */

/** Compile-time: every field the schema declares is a field of `Component`.
 *  If a name drifts, `tsc` fails before any test runs. */
const _fields: readonly (keyof Component)[] = COMPONENT_FIELDS;
void _fields;

type Node = { type?: string; properties?: Record<string, Node>; items?: Node;
              required?: string[]; additionalProperties?: boolean; enum?: string[] };

function walk(node: Node, path: string, visit: (n: Node, path: string) => void): void {
  visit(node, path);
  if (node.properties) {
    for (const [key, child] of Object.entries(node.properties)) walk(child, `${path}.${key}`, visit);
  }
  if (node.items) walk(node.items, `${path}[]`, visit);
}

test('every object closes itself and requires everything it declares', () => {
  /* Structured outputs reject an open object, and an optional property is a
   * bet on how the API reads optionality. Requiring all of them is the shape
   * `convert.ts` is written against: "unknown" is "" or [], never absent. */
  walk(ANALYSIS_SCHEMA as Node, 'root', (n, path) => {
    if (n.type !== 'object') return;
    assert.equal(n.additionalProperties, false, `${path} must be closed`);
    assert.deepEqual(
      [...(n.required ?? [])].sort(),
      Object.keys(n.properties ?? {}).sort(),
      `${path} must require every property it declares`
    );
  });
});

test('the one enum left is the studio’s own set, not a copy that can drift', () => {
  let kinds: string[] | undefined;
  walk(ANALYSIS_SCHEMA as Node, 'root', (n, path) => {
    if (path.endsWith('links[].kind')) kinds = n.enum;
  });
  /* Plus the empty string, which is how the model declines to guess. */
  assert.deepEqual(kinds, ['', ...LINK_KINDS]);
});

test('the schema stays small enough to compile into a grammar', () => {
  /* A provider turns this into a grammar before it generates, and past a size
   * none of them publishes it refuses outright. Two things drive that size:
   * long enums, and objects nested inside arrays inside arrays. Both are
   * bounded here, and the bound is a test rather than a comment because the
   * failure lands on a reader mid-upload, not on us. */
  let enumValues = 0;
  let deepestObject = 0;
  walk(ANALYSIS_SCHEMA as Node, 'root', (n, path) => {
    enumValues += n.enum?.length ?? 0;
    if (n.type === 'object') {
      deepestObject = Math.max(deepestObject, path.split('[]').length - 1);
    }
  });

  assert.ok(enumValues <= 16, `enum values across the schema: ${enumValues}`);
  /* An object may live inside one array (components[], links[]), never inside
   * two — that is what moved the annotations out of the components. */
  assert.ok(deepestObject <= 1, `objects nested ${deepestObject} arrays deep`);
  assert.ok(
    JSON.stringify(ANALYSIS_SCHEMA).length < 4_000,
    `serialised schema: ${JSON.stringify(ANALYSIS_SCHEMA).length} characters`
  );
});

test('the lean fallback drops the deepest branches and stays valid', () => {
  const lean = analysisSchema('lean') as Node;
  const document = lean.properties!.document;
  assert.equal('flows' in document.properties!, false);
  assert.equal('technologies' in document.properties!, false);
  /* Still a complete, closed object: what it does ask for is unchanged. */
  assert.deepEqual(
    [...(document.required ?? [])].sort(),
    ['components', 'groups', 'layers', 'links', 'meta']
  );
  assert.ok(JSON.stringify(lean).length < JSON.stringify(ANALYSIS_SCHEMA).length);
});

test('the answer carries its own caveats', () => {
  const root = ANALYSIS_SCHEMA as Node;
  assert.deepEqual([...(root.required ?? [])].sort(), ['assumptions', 'document', 'questions']);
});
