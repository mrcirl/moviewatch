import { getSettings } from '@/lib/settings';

export const MEDIA_STATUS_LABEL: Record<number, string> = {
  1: 'Unknown',
  2: 'Requested',
  3: 'Processing',
  4: 'Partially available',
  5: 'Available',
};

export interface SeerrMediaInfo {
  status: number;
  requests?: { id: number; status: number }[];
}

export interface SeerrStatus {
  configured: true;
  mediaInfo: SeerrMediaInfo | null;
  requestUrl: string;
}

async function seerrFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const settings = await getSettings();
  if (!settings.seerrUrl || !settings.seerrApiKey) {
    throw new Error('Seerr is not configured. Add a URL and API key in Settings.');
  }
  const base = settings.seerrUrl.replace(/\/+$/, '');
  const res = await fetch(`${base}/api/v1${path}`, {
    ...init,
    headers: {
      'X-Api-Key': settings.seerrApiKey,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Seerr request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

/** Fetches request/availability status for a movie from Seerr, if configured. */
export async function getSeerrStatus(tmdbId: number): Promise<SeerrStatus | null> {
  const settings = await getSettings();
  if (!settings.seerrUrl || !settings.seerrApiKey) return null;

  const base = settings.seerrUrl.replace(/\/+$/, '');
  let mediaInfo: SeerrMediaInfo | null = null;
  try {
    const details = await seerrFetch<{ mediaInfo?: SeerrMediaInfo }>(`/movie/${tmdbId}`);
    mediaInfo = details.mediaInfo ?? null;
  } catch {
    mediaInfo = null;
  }

  return {
    configured: true,
    mediaInfo,
    requestUrl: `${base}/movie/${tmdbId}`,
  };
}

export async function createSeerrRequest(tmdbId: number): Promise<{ id: number; status: number }> {
  return seerrFetch(`/request`, {
    method: 'POST',
    body: JSON.stringify({ mediaType: 'movie', mediaId: tmdbId }),
  });
}
