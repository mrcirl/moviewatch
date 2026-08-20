import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth';
import { getSettings, updateSettings } from '@/lib/settings';

function publicSettings(settings: Awaited<ReturnType<typeof getSettings>>) {
  return {
    tmdbApiKey: settings.tmdbApiKey ?? '',
    tmdbRegion: settings.tmdbRegion,
    jellyfinUrl: settings.jellyfinUrl ?? '',
    jellyfinApiKey: settings.jellyfinApiKey ?? '',
    seerrUrl: settings.seerrUrl ?? '',
    seerrApiKey: settings.seerrApiKey ?? '',
  };
}

export async function GET() {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const settings = await getSettings();
  return NextResponse.json({ settings: publicSettings(settings) });
}

export async function PUT(req: NextRequest) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const allowed = ['tmdbApiKey', 'tmdbRegion', 'jellyfinUrl', 'jellyfinApiKey', 'seerrUrl', 'seerrApiKey'] as const;
  const data: Record<string, string | null> = {};
  for (const key of allowed) {
    if (key in body) {
      const value = body[key];
      data[key] = typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
    }
  }

  const settings = await updateSettings(data);
  return NextResponse.json({ settings: publicSettings(settings) });
}
