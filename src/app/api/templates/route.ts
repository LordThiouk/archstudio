import { NextResponse } from 'next/server';
import { SERVICES_VERIFIED_ON, templateSummaries } from '@/lib/templates';

export const runtime = 'nodejs';

/* Metadata only — both languages, no component bodies and no editorial content.
 * The picker needs to switch language without a second round trip, and the full
 * templates are far too large to ship to the browser. */
export async function GET() {
  return NextResponse.json(
    { verifiedOn: SERVICES_VERIFIED_ON, templates: templateSummaries() },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
