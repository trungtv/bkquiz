import { requireUser } from '@/server/authz';
import { TeacherScreen } from './teacherScreen';

export default async function TeacherScreenPage(props: {
  params: Promise<{ sessionId: string }>;
}) {
  const { userId } = await requireUser();
  const { sessionId } = await props.params;

  return (
    <div className="py-5">
      <TeacherScreen sessionId={sessionId} userId={userId} />
    </div>
  );
}
// EOF
