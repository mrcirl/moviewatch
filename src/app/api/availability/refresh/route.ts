import { NextRequest, NextResponse } from 'next/server';
import { refreshAllAvailability } from '@/lib/availability';

/**
 * Not user-facing — called by server.js on a timer (see INTERNAL_TRIGGER_SECRET
 * there) so availability refreshes happen in the background instead of on
 * every watchlist page load. Gated on a random secret generated at process
 * startup rather than requireApiAuth, since this has no browser session to
 * check against.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-trigger');
  if (!secret || secret !== process.env.INTERNAL_TRIGGER_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await refreshAllAvailability();
  return NextResponse.json(result);
}
