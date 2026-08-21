import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth';
import { checkJellyfinAvailability } from '@/lib/jellyfin';
import { checkPlexAvailability } from '@/lib/plex';
import { getSeerrStatus, MEDIA_STATUS_LABEL } from '@/lib/seerr';
import { getWatchProviders } from '@/lib/tmdb';

interface Params {
  params: Promise<{ tmdbId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const tmdbId = Number((await params).tmdbId);
  if (Number.isNaN(tmdbId)) return NextResponse.json({ error: 'Invalid tmdbId' }, { status: 400 });

  const [jellyfin, plex, seerr, streaming] = await Promise.allSettled([
    checkJellyfinAvailability(tmdbId),
    checkPlexAvailability(tmdbId),
    getSeerrStatus(tmdbId),
    getWatchProviders(tmdbId),
  ]);

  return NextResponse.json({
    jellyfin: jellyfin.status === 'fulfilled' ? jellyfin.value : { error: jellyfin.reason?.message },
    plex: plex.status === 'fulfilled' ? plex.value : { error: plex.reason?.message },
    seerr:
      seerr.status === 'fulfilled'
        ? seerr.value && {
            ...seerr.value,
            statusLabel: seerr.value.mediaInfo ? MEDIA_STATUS_LABEL[seerr.value.mediaInfo.status] : null,
          }
        : { error: seerr.reason?.message },
    streaming: streaming.status === 'fulfilled' ? streaming.value : { error: streaming.reason?.message },
  });
}
