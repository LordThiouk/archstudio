import { NextResponse } from 'next/server';
import { getProject } from '@/lib/store';
import { buildStandaloneHtml, buildDataFile, inlineFontCss, safeFilename } from '@/lib/exportHtml';
import { buildDrawioXml } from '@/lib/export/drawio';
import { buildDiagramSvg } from '@/lib/export/svg';

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

  /* One shape for every format: a body, a type, and the name the browser should
   * save it under. `inline` drops the disposition — the preview iframe and the
   * PNG builder both read these over `fetch` and neither wants a download. */
  const send = (body: string, type: string, filename: string) =>
    new NextResponse(body, {
      headers: {
        'Content-Type': `${type}; charset=utf-8`,
        ...(inline ? {} : { 'Content-Disposition': `attachment; filename="${filename}"` })
      }
    });

  if (format === 'json') {
    return send(JSON.stringify(project.data, null, 2), 'application/json',
      safeFilename(project.name, 'json'));
  }

  if (format === 'datafile') {
    return send(buildDataFile(project.data), 'application/javascript', 'architecture.js');
  }

  if (format === 'drawio') {
    return send(buildDrawioXml(project.data), 'application/xml',
      safeFilename(project.name, 'drawio'));
  }

  if (format === 'svg') {
    /* The faces travel with the drawing. Without them an SVG opened anywhere
     * else falls back to the reader's Helvetica, and the PNG built from it in an
     * `<img>` cannot request a font at all. */
    return send(buildDiagramSvg(project.data, { fontCss: inlineFontCss() }), 'image/svg+xml',
      safeFilename(project.name, 'svg'));
  }

  return send(buildStandaloneHtml(project.data), 'text/html', safeFilename(project.name, 'html'));
}
