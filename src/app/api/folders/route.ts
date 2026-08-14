import { NextResponse } from 'next/server';
import { listFolders, createFolder } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(listFolders());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  return NextResponse.json(createFolder(name, body.parentId ?? null, body.color), { status: 201 });
}
