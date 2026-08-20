import { redirect } from 'next/navigation';
import { isPasswordSet, redirectIfAuthenticated } from '@/lib/auth';
import SetupForm from './setup-form';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const alreadySetUp = await isPasswordSet();
  if (alreadySetUp) redirect('/login');
  await redirectIfAuthenticated();

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-base-200">🎬 MovieWatch</h1>
          <p className="mt-1 text-sm text-base-400">Set a password to secure your watchlist.</p>
        </div>
        <SetupForm />
      </div>
    </main>
  );
}
