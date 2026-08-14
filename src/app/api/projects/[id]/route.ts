import { NextResponse } from 'next/server';
import { getProject, updateProject, deleteProject, duplicateProject } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const p = getProject(id);
  return p ? NextResponse.json(p) : NextResponse.json({ error: 'not found' }, { status: 404 });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const updated = updateProject(id, body);
  return updated ? NextResponse.json(updated) : NextResponse.json({ error: 'not found' }, { status: 404 });
}

/** POST /api/projects/:id  → duplicate */
export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const copy = duplicateProject(id);
  return copy ? NextResponse.json(copy, { status: 201 }) : NextResponse.json({ error: 'not found' }, { status: 404 });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  deleteProject(id);
  return NextResponse.json({ ok: true });
}
