import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';
import { isIpAllowlisted } from '@/lib/ip';
import { getSettings, updateSettings } from '@/lib/settings';

export const SESSION_COOKIE = 'mw_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * `next start` always sets NODE_ENV=production, so gating the cookie's Secure
 * flag on NODE_ENV marks it Secure even when served over plain HTTP (the
 * common case for a LAN-only self-hosted deploy) — browsers then silently
 * drop it. Key off the request's actual scheme instead, respecting
 * X-Forwarded-Proto from a reverse proxy.
 */
export function isSecureRequest(req: NextRequest): boolean {
  const forwardedProto = req.headers.get('x-forwarded-proto');
  if (forwardedProto) return forwardedProto.split(',')[0].trim() === 'https';
  return req.nextUrl.protocol === 'https:';
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function getAuthSecret(): Promise<string> {
  const settings = await getSettings();
  if (settings.authSecret) return settings.authSecret;
  const secret = crypto.randomBytes(32).toString('hex');
  await updateSettings({ authSecret: secret });
  return secret;
}

function base64url(input: Buffer): string {
  return input.toString('base64url');
}

async function sign(payload: string): Promise<string> {
  const secret = await getAuthSecret();
  const sig = crypto.createHmac('sha256', secret).update(payload).digest();
  return `${payload}.${base64url(sig)}`;
}

export async function createSessionToken(): Promise<string> {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = base64url(Buffer.from(JSON.stringify({ exp: expires })));
  return sign(payload);
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const secret = await getAuthSecret();
  const expectedSig = base64url(crypto.createHmac('sha256', secret).update(payload).digest());
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

/**
 * The client IP as seen by server.js (the raw TCP peer address, injected as
 * `x-client-ip` and not overridable by the client — see server.js). Behind a
 * reverse proxy this will be the proxy's own address, not the real client's.
 */
async function getClientIp(): Promise<string | null> {
  const store = await headers();
  return store.get('x-client-ip');
}

/** True if the requesting IP falls within the configured allowlist, skipping auth entirely. */
async function isIpBypassed(): Promise<boolean> {
  const settings = await getSettings();
  if (!settings.authBypassCidrs) return false;
  const ip = await getClientIp();
  return isIpAllowlisted(ip, settings.authBypassCidrs);
}

export async function isAuthenticated(): Promise<boolean> {
  if (await isIpBypassed()) return true;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function isPasswordSet(): Promise<boolean> {
  const settings = await getSettings();
  return Boolean(settings.passwordHash);
}

/** Call at the top of a protected server-component page. Redirects if not set up / not logged in. */
export async function requireAuth(): Promise<void> {
  if (await isAuthenticated()) return;
  const setup = await isPasswordSet();
  if (!setup) redirect('/setup');
  redirect('/login');
}

/** Call from /login and /setup pages to bounce already-authenticated users to the dashboard. */
export async function redirectIfAuthenticated(): Promise<void> {
  const authed = await isAuthenticated();
  if (authed) redirect('/');
}

/** Call at the top of a protected API route handler. Returns a 401 response if not logged in, else null. */
export async function requireApiAuth(): Promise<NextResponse | null> {
  const authed = await isAuthenticated();
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}
