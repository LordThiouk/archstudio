import { NextResponse } from 'next/server';
import { listProjects, createProject } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(listProjects());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  const project = createProject({
    name,
    folderId: body.folderId ?? null,
    description: body.description,
    accent: body.accent,
    data: body.data
  });
  return NextResponse.json(project, { status: 201 });
}
