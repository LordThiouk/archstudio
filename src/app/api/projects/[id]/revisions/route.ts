import { NextResponse } from 'next/server';
import {
  createRevision, deleteRevision, freezeVersion, getRevisionData, labelRevision, listRevisions,
  restoreRevision
} from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const missing = () => NextResponse.json({ error: 'not found' }, { status: 404 });

/** The list, or one snapshot's document when `?revisionId=` is given — the
 *  history panel needs the latter to diff a version against the current one. */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const revisionId = new URL(req.url).searchParams.get('revisionId');
  if (!revisionId) return NextResponse.json(listRevisions(id));

  const data = getRevisionData(id, revisionId);
  return data ? NextResponse.json({ id: revisionId, data }) : missing();
}

/** Three operations on one verb, told apart by what the body carries.
 *
 *  `revisionId`  restore it.
 *  `version`     freeze the current document as a numbered version — this also
 *                writes the number into the document, so it is a save as well.
 *  neither       snapshot the project as it stands, unnamed or named. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { revisionId, version, label } = await req.json().catch(() => ({}));
  const title = typeof label === 'string' ? label : undefined;

  if (revisionId) {
    const restored = restoreRevision(id, String(revisionId));
    return restored ? NextResponse.json(restored) : missing();
  }

  if (typeof version === 'string' && version.trim()) {
    const frozen = freezeVersion(id, version, title);
    return frozen ? NextResponse.json(frozen) : missing();
  }

  const created = createRevision(id, title);
  return created ? NextResponse.json(created) : missing();
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { revisionId, label } = await req.json().catch(() => ({}));
  if (!revisionId) return NextResponse.json({ error: 'revisionId required' }, { status: 400 });

  const updated = labelRevision(id, String(revisionId), String(label ?? ''));
  return updated ? NextResponse.json(updated) : missing();
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  const revisionId = new URL(req.url).searchParams.get('revisionId');
  if (!revisionId) return NextResponse.json({ error: 'revisionId required' }, { status: 400 });

  deleteRevision(id, revisionId);
  return NextResponse.json({ ok: true });
}
