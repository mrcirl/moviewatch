import { getSettings } from '@/lib/settings';
import SettingsClient from './settings-client';

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-base-200">Settings</h1>
        <p className="text-sm text-base-400">Connect MovieWatch to TMDB, your Jellyfin/Plex server, and Seerr.</p>
      </div>
      <SettingsClient
        initialSettings={{
          tmdbApiKey: settings.tmdbApiKey ?? '',
          tmdbRegion: settings.tmdbRegion,
          jellyfinUrl: settings.jellyfinUrl ?? '',
          jellyfinApiKey: settings.jellyfinApiKey ?? '',
          plexUrl: settings.plexUrl ?? '',
          plexToken: settings.plexToken ?? '',
          seerrUrl: settings.seerrUrl ?? '',
          seerrApiKey: settings.seerrApiKey ?? '',
          authBypassCidrs: settings.authBypassCidrs ?? '',
        }}
      />
    </div>
  );
}
