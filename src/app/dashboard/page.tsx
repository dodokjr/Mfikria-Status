import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/DashboardClient';
import { getSession } from '@/lib/auth';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  return <DashboardClient user={user} appName={config.appName} />;
}
