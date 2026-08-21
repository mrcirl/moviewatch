import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth';
import { getPlexMovieIndex } from '@/lib/plex';

/** Forces an immediate re-fetch of the Plex library index, bypassing the availability cache. */
export async function POST() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  try {
    const index = await getPlexMovieIndex({ force: true });
    if (!index) {
      return NextResponse.json(
        { error: 'Plex is not configured. Add a server URL and token in Settings.' },
        { status: 412 },
      );
    }
    return NextResponse.json({ ok: true, movieCount: index.size });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
