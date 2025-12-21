import { Lobby } from './studentLobby';

export default async function SessionLobbyPage(props: {
  params: Promise<{ locale: string; sessionId: string }>;
}) {
  const { sessionId } = await props.params;
  return (
    <div className="mx-auto max-w-3xl py-10">
      <Lobby sessionId={sessionId} />
    </div>
  );
}
// EOF
