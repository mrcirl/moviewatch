import { prisma } from '@/lib/db';
import type { Settings } from '@prisma/client';

let cached: Settings | null = null;

export async function getSettings(): Promise<Settings> {
  if (cached) return cached;
  let settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings) {
    try {
      settings = await prisma.settings.create({ data: { id: 1 } });
    } catch {
      // Another concurrent request created it first.
      settings = await prisma.settings.findUnique({ where: { id: 1 } });
    }
  }
  if (!settings) throw new Error('Failed to load settings');
  cached = settings;
  return settings;
}

export async function updateSettings(data: Partial<Settings>): Promise<Settings> {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  cached = settings;
  return settings;
}

export function invalidateSettingsCache() {
  cached = null;
}
