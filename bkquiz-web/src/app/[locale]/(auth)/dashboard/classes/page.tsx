import type { Metadata } from 'next';
import { getUserRole, requireUser } from '@/server/authz';
import { ClassesPanel } from './ClassesPanel';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Classes - BKquiz' };
}

export default async function ClassesPage() {
  const { userId, devRole } = await requireUser();
  const role = await getUserRole(userId, devRole as 'teacher' | 'student' | undefined);

  return (
    <div className="py-5">
      <ClassesPanel role={role} />
    </div>
  );
}

