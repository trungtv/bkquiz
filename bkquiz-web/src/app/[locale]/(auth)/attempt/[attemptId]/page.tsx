import { AttemptClient } from './studentAttempt';

export default async function AttemptPage(props: {
  params: Promise<{ locale: string; attemptId: string }>;
}) {
  const { attemptId } = await props.params;
  return (
    <div className="mx-auto max-w-3xl py-8">
      <AttemptClient attemptId={attemptId} />
    </div>
  );
}
// EOF

