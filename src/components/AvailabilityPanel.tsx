'use client';

import { useEffect, useState } from 'react';

interface JellyfinResult {
  available?: boolean;
  webUrl?: string;
  error?: string;
}

interface PlexResult {
  available?: boolean;
  webUrl?: string;
  error?: string;
}

interface SeerrResult {
  configured?: true;
  mediaInfo?: { status: number } | null;
  statusLabel?: string | null;
  requestUrl?: string;
  error?: string;
}

interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

interface StreamingResult {
  link?: string | null;
  flatrate?: Provider[];
  rent?: Provider[];
  buy?: Provider[];
  error?: string;
}

interface Availability {
  jellyfin: JellyfinResult | null;
  plex: PlexResult | null;
  seerr: SeerrResult | null;
  streaming: StreamingResult;
}

export default function AvailabilityPanel({ tmdbId }: { tmdbId: number }) {
  const [data, setData] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/availability/${tmdbId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tmdbId]);

  async function requestViaSeerr() {
    setRequesting(true);
    try {
      const res = await fetch('/api/seerr/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbId }),
      });
      if (res.ok) {
        setData((prev) =>
          prev ? { ...prev, seerr: { ...prev.seerr, mediaInfo: { status: 2 }, statusLabel: 'Requested' } } : prev
        );
      }
    } finally {
      setRequesting(false);
    }
  }

  if (loading) {
    return <p className="text-xs text-base-400">Checking availability…</p>;
  }
  if (!data) {
    return <p className="text-xs text-base-400">Couldn&apos;t check availability.</p>;
  }

  const jellyfinAvailable = data.jellyfin?.available;
  const plexAvailable = data.plex?.available;
  const seerrStatus = data.seerr?.mediaInfo?.status ?? null;
  const seerrAvailable = seerrStatus === 5;
  const alreadyRequested = seerrStatus === 2 || seerrStatus === 3 || seerrStatus === 4;
  const providers = data.streaming?.flatrate ?? [];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {jellyfinAvailable && (
        <a href={data.jellyfin?.webUrl} target="_blank" rel="noreferrer" className="badge bg-emerald-900 text-emerald-300">
          ▶ In Jellyfin
        </a>
      )}
      {!jellyfinAvailable && data.jellyfin && !data.jellyfin.error && (
        <span className="badge bg-base-800 text-base-400">Not in Jellyfin</span>
      )}

      {plexAvailable && (
        <a href={data.plex?.webUrl} target="_blank" rel="noreferrer" className="badge bg-emerald-900 text-emerald-300">
          ▶ In Plex
        </a>
      )}
      {!plexAvailable && data.plex && !data.plex.error && (
        <span className="badge bg-base-800 text-base-400">Not in Plex</span>
      )}

      {data.seerr && !data.seerr.error && seerrAvailable && (
        <span className="badge bg-emerald-900 text-emerald-300">Available on Seerr</span>
      )}
      {data.seerr && !data.seerr.error && !seerrAvailable && alreadyRequested && (
        <span className="badge bg-amber-900 text-amber-300">{data.seerr.statusLabel ?? 'Requested'}</span>
      )}
      {data.seerr && !data.seerr.error && !seerrAvailable && !alreadyRequested && (
        <button onClick={requestViaSeerr} disabled={requesting} className="badge bg-accent-500 text-white hover:bg-accent-400">
          {requesting ? 'Requesting…' : '+ Request via Seerr'}
        </button>
      )}

      {providers.slice(0, 4).map((p) => (
        <span key={p.provider_id} className="badge bg-base-800 text-base-200">
          {p.provider_name}
        </span>
      ))}

      {!data.jellyfin && !data.plex && !data.seerr && providers.length === 0 && (
        <span className="text-xs text-base-400">
          Configure Jellyfin, Plex, Seerr or a TMDB key in Settings to see availability.
        </span>
      )}
    </div>
  );
}
