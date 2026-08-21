import { redirect } from 'next/navigation';
import { isPasswordSet, redirectIfAuthenticated } from '@/lib/auth';
import Logo from '@/components/Logo';
import SetupForm from './setup-form';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const alreadySetUp = await isPasswordSet();
  if (alreadySetUp) redirect('/login');
  await redirectIfAuthenticated();

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={44} />
          <p className="mt-3 text-sm text-base-400">Set a password to secure your watchlist.</p>
        </div>
        <SetupForm />
      </div>
    </main>
  );
}
