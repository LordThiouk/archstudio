import { NextResponse } from 'next/server';
import { listRevisions, restoreRevision } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return NextResponse.json(listRevisions(id));
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { revisionId } = await req.json().catch(() => ({}));
  const restored = restoreRevision(id, String(revisionId || ''));
  return restored ? NextResponse.json(restored) : NextResponse.json({ error: 'not found' }, { status: 404 });
}
