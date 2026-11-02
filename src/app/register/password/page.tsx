import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthTopBar } from '@/components/AuthTopBar';
import { RegisterPasswordForm } from '@/components/RegisterPasswordForm';
import { getSession } from '@/lib/auth';
import { registrationMode } from '@/lib/registration';
import { PENDING_COOKIE, verifyPending } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function RegisterPasswordPage() {
  if (await getSession()) redirect('/dashboard');

  const pending = await verifyPending((await cookies()).get(PENDING_COOKIE)?.value);
  if (!pending) redirect('/register?error=expired');

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <AuthTopBar />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
      <RegisterPasswordForm
        profile={{ login: pending.login, name: pending.name, email: pending.email }}
        autoApprove={registrationMode() === 'auto'}
      />
    </main>
  );
}
