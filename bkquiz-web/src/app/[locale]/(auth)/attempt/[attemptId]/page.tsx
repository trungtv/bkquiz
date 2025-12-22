import { AttemptClient } from './studentAttempt';

export default async function AttemptPage(props: {
  params: Promise<{ locale: string; attemptId: string }>;
}) {
  const { attemptId } = await props.params;
  return (
    <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 sm:py-6">
      <AttemptClient attemptId={attemptId} />
    </div>
  );
}
// EOF

