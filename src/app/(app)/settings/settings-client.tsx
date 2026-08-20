'use client';

import { useState } from 'react';

interface SettingsForm {
  tmdbApiKey: string;
  tmdbRegion: string;
  jellyfinUrl: string;
  jellyfinApiKey: string;
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
            screen. Only meaningful for a direct LAN exposure (e.g. a plain Docker port mapping on Unraid);
            it does <span className="italic">not</span> identify individual clients if this app sits behind
            a reverse proxy, since the proxy&apos;s own address is what gets checked.
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

      <PasswordForm />
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
