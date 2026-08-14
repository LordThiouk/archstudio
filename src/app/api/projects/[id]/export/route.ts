import { NextResponse } from 'next/server';
import { getProject } from '@/lib/store';
import { buildStandaloneHtml, buildDataFile, safeFilename } from '@/lib/exportHtml';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'html';
  const inline = url.searchParams.get('inline') === '1';

  if (format === 'json') {
    return new NextResponse(JSON.stringify(project.data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename(project.name, 'json')}"`
      }
    });
  }

  if (format === 'datafile') {
    return new NextResponse(buildDataFile(project.data), {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Content-Disposition': `attachment; filename="architecture.js"`
      }
    });
  }

  const html = buildStandaloneHtml(project.data);
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...(inline ? {} : { 'Content-Disposition': `attachment; filename="${safeFilename(project.name, 'html')}"` })
    }
  });
}
