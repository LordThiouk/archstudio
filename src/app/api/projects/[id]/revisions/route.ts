import { NextResponse } from 'next/server';
import {
  createRevision, deleteRevision, getRevisionData, labelRevision, listRevisions, restoreRevision
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

/** With `revisionId`, restore it. Without, snapshot the project as it stands —
 *  that is how a named checkpoint is created. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { revisionId, label } = await req.json().catch(() => ({}));

  if (revisionId) {
    const restored = restoreRevision(id, String(revisionId));
    return restored ? NextResponse.json(restored) : missing();
  }

  const created = createRevision(id, typeof label === 'string' ? label : undefined);
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
