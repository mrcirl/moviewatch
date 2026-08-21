'use client';

import { useState } from 'react';

interface SettingsForm {
  tmdbApiKey: string;
  tmdbRegion: string;
  jellyfinUrl: string;
  jellyfinApiKey: string;
  plexUrl: string;
  plexToken: string;
  seerrUrl: string;
  seerrApiKey: string;
  authBypassCidrs: string;
}

function Field({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-base-200">{label}</label>
      <input className="input" {...props} />
      {hint && <p className="text-xs text-base-400">{hint}</p>}
    </div>
  );
}

function TextAreaField({
  label,
  hint,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-base-200">{label}</label>
      <textarea className="input" rows={3} {...props} />
      {hint && <p className="text-xs text-base-400">{hint}</p>}
    </div>
  );
}

export default function SettingsClient({ initialSettings }: { initialSettings: SettingsForm }) {
  const [form, setForm] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function set<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setMessage(res.ok ? 'Saved.' : 'Could not save settings.');
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="card space-y-5 p-5">
        <div>
          <h2 className="font-medium text-base-200">TMDB</h2>
          <p className="text-xs text-base-400">Powers film search, posters, and streaming-provider info.</p>
        </div>
        <Field
          label="API key"
          hint="A v3 API key from your TMDB account settings → API."
          value={form.tmdbApiKey}
          onChange={(e) => set('tmdbApiKey', e.target.value)}
          placeholder="e.g. 1a2b3c4d5e6f…"
        />
        <Field
          label="Streaming region"
          hint="Two-letter country code used for streaming-availability lookups, e.g. US, GB, CA."
          value={form.tmdbRegion}
          onChange={(e) => set('tmdbRegion', e.target.value.toUpperCase())}
          maxLength={2}
        />

        <div className="border-t border-base-800 pt-5">
          <h2 className="font-medium text-base-200">Jellyfin</h2>
          <p className="text-xs text-base-400">Shows whether a film is already in your library, with a direct link to play it.</p>
        </div>
        <Field
          label="Server URL"
          value={form.jellyfinUrl}
          onChange={(e) => set('jellyfinUrl', e.target.value)}
          placeholder="https://jellyfin.example.com"
        />
        <Field
          label="API key"
          hint="Create one under Jellyfin admin dashboard → API Keys."
          value={form.jellyfinApiKey}
          onChange={(e) => set('jellyfinApiKey', e.target.value)}
        />

        <div className="border-t border-base-800 pt-5">
          <h2 className="font-medium text-base-200">Plex</h2>
          <p className="text-xs text-base-400">Same as Jellyfin, but for a Plex library.</p>
        </div>
        <Field
          label="Server URL"
          value={form.plexUrl}
          onChange={(e) => set('plexUrl', e.target.value)}
          placeholder="http://plex.example.com:32400"
        />
        <Field
          label="Token"
          hint="Your X-Plex-Token — see Plex's help article on finding an authentication token."
          value={form.plexToken}
          onChange={(e) => set('plexToken', e.target.value)}
        />

        <div className="border-t border-base-800 pt-5">
          <h2 className="font-medium text-base-200">Seerr</h2>
          <p className="text-xs text-base-400">Lets you request a film straight from your watchlist if it isn&apos;t available yet.</p>
        </div>
        <Field
          label="Server URL"
          value={form.seerrUrl}
          onChange={(e) => set('seerrUrl', e.target.value)}
          placeholder="https://seerr.example.com"
        />
        <Field
          label="API key"
          hint="Found under Seerr Settings → General."
          value={form.seerrApiKey}
          onChange={(e) => set('seerrApiKey', e.target.value)}
        />

        <div className="border-t border-base-800 pt-5">
          <h2 className="font-medium text-base-200">Trusted network (skip login)</h2>
          <p className="text-xs text-base-400">
            Requests from these IPs/ranges skip password login entirely — including the very first setup
            screen. Behind a reverse proxy, this checks the proxy&apos;s own address by default, not the
            original client&apos;s — set the <code className="text-base-300">TRUSTED_PROXY_CIDRS</code>{' '}
            environment variable to your proxy&apos;s address to fix that (see README).
          </p>
        </div>
        <TextAreaField
          label="Allowlisted IPs / CIDR ranges"
          hint="Comma or newline separated, e.g. 192.168.1.0/24, 10.0.0.5. Leave blank to always require login."
          value={form.authBypassCidrs}
          onChange={(e) => set('authBypassCidrs', e.target.value)}
          placeholder="192.168.1.0/24"
        />

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {message && <span className="text-sm text-base-400">{message}</span>}
        </div>
      </form>

      <JellyfinSyncPanel
        configured={Boolean(initialSettings.jellyfinUrl.trim() && initialSettings.jellyfinApiKey.trim())}
      />
      <PlexSyncPanel configured={Boolean(initialSettings.plexUrl.trim() && initialSettings.plexToken.trim())} />
      <PasswordForm />
    </div>
  );
}

function JellyfinSyncPanel({ configured }: { configured: boolean }) {
  const [refreshing, setRefreshing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);
    setMessage(null);
    setError(null);
    const res = await fetch('/api/jellyfin/refresh', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setRefreshing(false);
    if (!res.ok) {
      setError(data.error ?? 'Could not refresh from Jellyfin.');
      return;
    }
    setMessage(`Refreshed — ${data.movieCount} movie${data.movieCount === 1 ? '' : 's'} in your Jellyfin library.`);
  }

  async function importLibrary() {
    if (
      !confirm(
        'Pull in your whole Jellyfin library? New films land on the Browse available page until you tag who\'s watching.',
      )
    ) {
      return;
    }
    setImporting(true);
    setMessage(null);
    setError(null);
    const res = await fetch('/api/jellyfin/import', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setImporting(false);
    if (!res.ok) {
      setError(data.error ?? 'Could not import from Jellyfin.');
      return;
    }
    const failedNote = data.failed > 0 ? `, ${data.failed} failed` : '';
    setMessage(
      `Imported ${data.imported} new film${data.imported === 1 ? '' : 's'} to Browse available ` +
        `(${data.alreadyOnWatchlist} already on your watchlist${failedNote}).`,
    );
  }

  return (
    <div className="card space-y-4 p-5">
      <div>
        <h2 className="font-medium text-base-200">Resync from Jellyfin</h2>
        <p className="text-xs text-base-400">
          {configured
            ? 'Availability checks are cached for a minute at a time — refresh to pick up new Jellyfin content immediately, or pull your whole library into Browse available.'
            : 'Add a Jellyfin server URL and API key above, then save, to enable this.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-secondary" onClick={refresh} disabled={!configured || refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh availability now'}
        </button>
        <button type="button" className="btn-secondary" onClick={importLibrary} disabled={!configured || importing}>
          {importing ? 'Importing…' : 'Import library into watchlist'}
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-base-400">{message}</p>}
    </div>
  );
}

function PlexSyncPanel({ configured }: { configured: boolean }) {
  const [refreshing, setRefreshing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);
    setMessage(null);
    setError(null);
    const res = await fetch('/api/plex/refresh', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setRefreshing(false);
    if (!res.ok) {
      setError(data.error ?? 'Could not refresh from Plex.');
      return;
    }
    setMessage(`Refreshed — ${data.movieCount} movie${data.movieCount === 1 ? '' : 's'} in your Plex library.`);
  }

  async function importLibrary() {
    if (
      !confirm(
        'Pull in your whole Plex library? New films land on the Browse available page until you tag who\'s watching.',
      )
    ) {
      return;
    }
    setImporting(true);
    setMessage(null);
    setError(null);
    const res = await fetch('/api/plex/import', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setImporting(false);
    if (!res.ok) {
      setError(data.error ?? 'Could not import from Plex.');
      return;
    }
    const failedNote = data.failed > 0 ? `, ${data.failed} failed` : '';
    setMessage(
      `Imported ${data.imported} new film${data.imported === 1 ? '' : 's'} to Browse available ` +
        `(${data.alreadyOnWatchlist} already on your watchlist${failedNote}).`,
    );
  }

  return (
    <div className="card space-y-4 p-5">
      <div>
        <h2 className="font-medium text-base-200">Resync from Plex</h2>
        <p className="text-xs text-base-400">
          {configured
            ? 'Availability checks are cached for a minute at a time — refresh to pick up new Plex content immediately, or pull your whole library into Browse available.'
            : 'Add a Plex server URL and token above, then save, to enable this.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-secondary" onClick={refresh} disabled={!configured || refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh availability now'}
        </button>
        <button type="button" className="btn-secondary" onClick={importLibrary} disabled={!configured || importing}>
          {importing ? 'Importing…' : 'Import library into watchlist'}
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-base-400">{message}</p>}
    </div>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    const res = await fetch('/api/settings/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Could not change password.');
      return;
    }
    setMessage('Password changed.');
    setCurrentPassword('');
    setNewPassword('');
  }

  return (
    <form onSubmit={save} className="card space-y-4 p-5">
      <h2 className="font-medium text-base-200">Change password</h2>
      <Field
        label="Current password"
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <Field
        label="New password"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-secondary" disabled={saving}>
          {saving ? 'Saving…' : 'Change password'}
        </button>
        {message && <span className="text-sm text-base-400">{message}</span>}
      </div>
    </form>
  );
}
