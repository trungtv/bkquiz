import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUserRole, requireUser } from '@/server/authz';
import { PerformancePanel } from './PerformancePanel';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'My Performance' };
}

export default async function PerformancePage() {
  const { userId, devRole } = await requireUser();
  const role = await getUserRole(userId, devRole as 'teacher' | 'student' | undefined);

  if (role !== 'student') {
    redirect('/dashboard');
  }

  return (
    <div className="py-5">
      <PerformancePanel />
    </div>
  );
}

