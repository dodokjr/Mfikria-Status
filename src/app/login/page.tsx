import { redirect } from 'next/navigation';
import { AuthTopBar } from '@/components/AuthTopBar';
import { LoginForm } from '@/components/LoginForm';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const NOTICES: Record<string, string> = {
  exists: 'Akun GitHub ini sudah terdaftar. Silakan masuk dengan email dan password Anda.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  if (await getSession()) redirect('/dashboard');
  const { notice } = await searchParams;
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <AuthTopBar />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
      <LoginForm notice={notice ? NOTICES[notice] : undefined} />
    </main>
  );
}
