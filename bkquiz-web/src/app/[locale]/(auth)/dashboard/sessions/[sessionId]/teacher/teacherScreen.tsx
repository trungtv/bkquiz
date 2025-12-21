'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, TableWrap } from '@/components/ui/Table';

type TeacherTokenResponse = {
  sessionId: string;
  joinUrl: string;
  token: string;
  expiresInSeconds: number;
  stepSeconds: number;
};

type SessionStatusResponse = {
  id: string;
  status: 'lobby' | 'active' | 'ended';
  startedAt: string | null;
  endedAt: string | null;
  totpStepSeconds: number;
  quiz: {
    title: string;
  };
};

type TokenLogRow = {
  id: string;
  type: 'scheduled' | 'verify_ok' | 'verify_fail' | 'locked';
  ok: boolean | null;
  createdAt: string;
  dueAt: string | null;
  enteredToken: string | null;
  attemptId: string;
  user: { id: string; email: string | null; name: string | null };
};

type ScoreRow = {
  id: string;
  status: 'active' | 'submitted' | 'locked';
  score: number | null;
  submittedAt: string | null;
  user: { id: string; email: string | null; name: string | null };
};

export function TeacherScreen(props: { sessionId: string; userId: string | null }) {
  const [data, setData] = useState<TeacherTokenResponse | null>(null);
  const [session, setSession] = useState<SessionStatusResponse | null>(null);
  const [logs, setLogs] = useState<TokenLogRow[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [snapshotInfo, setSnapshotInfo] = useState<null | {
    alreadyBuilt: boolean;
    totalPicked: number;
    perRule: Array<{ tagId: string; tagNormalizedName: string; requested: number; picked: number }>;
  }>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const lastFetchedAt = useRef<number>(0);
  const hasRefetchedForExpiry = useRef<boolean>(false);

  async function fetchStatus() {
    const res = await fetch(`/api/sessions/${props.sessionId}/status`, { method: 'GET' });
    const json = await res.json() as Partial<SessionStatusResponse> & { error?: string };
    if (!res.ok) {
      setError(json.error ?? 'SESSION_NOT_FOUND');
      return;
    }
    setSession(json as SessionStatusResponse);
  }

  async function fetchLogs() {
    const res = await fetch(`/api/sessions/${props.sessionId}/report/tokenLog`, { method: 'GET' });
    const json = await res.json() as { logs?: TokenLogRow[]; error?: string };
    if (!res.ok) {
      // don't overwrite main error; just skip
      return;
    }
    setLogs(json.logs ?? []);
  }

  async function fetchScoreboard() {
    const res = await fetch(`/api/sessions/${props.sessionId}/report/scoreboard`, { method: 'GET' });
    const json = await res.json() as { attempts?: ScoreRow[]; error?: string };
    if (!res.ok) {
      return;
    }
    setScores(json.attempts ?? []);
  }

  async function fetchToken() {
    setError(null);
    const res = await fetch(`/api/sessions/${props.sessionId}/teacherToken`, { method: 'GET' });
    const json = await res.json() as Partial<TeacherTokenResponse> & { error?: string };
    if (!res.ok) {
      setError(json.error ?? 'FORBIDDEN');
      return;
    }
    setData(json as TeacherTokenResponse);
    lastFetchedAt.current = Date.now();
    hasRefetchedForExpiry.current = false; // Reset flag when new token is fetched
  }

  useEffect(() => {
    void fetchToken();
    void fetchStatus();
    void fetchLogs();
    void fetchScoreboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.sessionId]);

  useEffect(() => {
    const id = window.setInterval(() => void fetchStatus(), 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.sessionId]);

  useEffect(() => {
    const id = window.setInterval(() => void fetchLogs(), 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.sessionId]);

  useEffect(() => {
    const id = window.setInterval(() => void fetchScoreboard(), 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.sessionId]);

  async function startSession() {
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${props.sessionId}/start`, { method: 'POST' });
      if (!res.ok) {
        const text = await res.text();
        let json: { error?: string; snapshot?: any };
        try {
          json = JSON.parse(text);
        } catch {
          setError(`START_FAILED: ${res.status} ${res.statusText}`);
          return;
        }
        setError(json.error ?? 'START_FAILED');
        return;
      }
      const text = await res.text();
      if (!text) {
        setError('START_FAILED: Empty response');
        return;
      }
      let json: { error?: string; snapshot?: any };
      try {
        json = JSON.parse(text);
      } catch (err) {
        setError(`START_FAILED: Invalid JSON response`);
        console.error('Failed to parse response:', text, err);
        return;
      }
      if (json.snapshot) {
        setSnapshotInfo(json.snapshot);
      }
      await fetchStatus();
      await fetchLogs();
      await fetchScoreboard();
    } catch (err) {
      setError(`START_FAILED: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error starting session:', err);
    }
  }

  async function endSession() {
    setError(null);
    const res = await fetch(`/api/sessions/${props.sessionId}/end`, { method: 'POST' });
    const json = await res.json() as { error?: string };
    if (!res.ok) {
      setError(json.error ?? 'END_FAILED');
      return;
    }
    await fetchStatus();
  }

  // Local countdown tick (no extra server calls).
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!data) {
        setSecondsLeft(null);
        return;
      }
      const elapsed = (Date.now() - lastFetchedAt.current) / 1000;
      const left = Math.max(0, Math.ceil(data.expiresInSeconds - elapsed));
      setSecondsLeft(left);

      // Auto-refetch token when it expires (only once per expiry)
      if (left <= 0 && !hasRefetchedForExpiry.current) {
        hasRefetchedForExpiry.current = true;
        void fetchToken();
      }
    }, 3000); // Update countdown every 3 seconds
    return () => window.clearInterval(id);
  }, [data]);

  return (
    <div className="mx-auto max-w-6xl">
      <Card>
        <div className="text-lg font-semibold">Teacher Screen</div>
        <div className="mt-1 text-sm text-text-muted">
          <div>
            Session:
            {' '}
            <span className="font-mono">{props.sessionId}</span>
          </div>
          <div className="mt-1">
            Trạng thái:
            {' '}
            <span className="font-mono">{session?.status ?? '...'}</span>
            {' '}
            <Badge
              variant={session?.status === 'active' ? 'success' : session?.status === 'ended' ? 'neutral' : 'info'}
              className="align-middle"
            >
              {session?.status ?? 'loading'}
            </Badge>
            {session?.quiz?.title
              ? (
                  <>
                    {' '}
                    ·
                    {' '}
                    <span className="font-medium">{session.quiz.title}</span>
                  </>
                )
              : null}
          </div>
        </div>
        {error
          ? (
              <div className="mt-3 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                {error}
              </div>
            )
          : null}
        {session?.status === 'active'
          ? (
              <Card className="mt-3 p-3 text-sm text-text-body">
                Nếu thấy "Chưa có câu hỏi" ở phía sinh viên, hãy kiểm tra quiz đã có rules và bấm Start lại (snapshot chỉ build 1 lần/1 session).
              </Card>
            )
          : null}

      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="text-sm font-medium text-text-heading">QR để sinh viên vào bài</div>
          <div className="mt-4 flex items-center justify-center">
            {data?.joinUrl
              ? (
                  <div className="rounded-md bg-bg-card p-4">
                    <QRCode value={data.joinUrl} size={360} />
                  </div>
                )
              : (
                  <div className="w-full max-w-[420px]">
                    <Skeleton className="mx-auto h-[360px] w-[360px]" />
                    <div className="mt-3 text-center text-sm text-text-muted">Đang tải QR...</div>
                  </div>
                )}
          </div>
          {/* eslint-disable-next-line tailwindcss/classnames-order */}
          <Card className="mt-4 p-3 break-all text-sm text-text-body">
            {data?.joinUrl ?? '...'}
          </Card>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-text-heading">Token (TOTP)</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => void fetchToken()}>
                Refresh token
              </Button>
              {session?.status === 'lobby'
                ? (
                    <Button size="sm" variant="primary" onClick={() => void startSession()}>
                      Start
                    </Button>
                  )
                : null}
              {session?.status === 'active'
                ? (
                    <Button size="sm" variant="danger" onClick={() => void endSession()}>
                      End
                    </Button>
                  )
                : null}
            </div>
          </div>

          <div className="mt-6 text-center">
            <div className="text-7xl font-bold tracking-[0.25em] text-text-heading">
              {data?.token ?? '------'}
            </div>
            <div className="mt-3 text-sm text-text-muted">
              Đổi sau:
              {' '}
              <span className="font-mono">
                {secondsLeft === null
                  ? '...'
                  : `${secondsLeft}s`}
              </span>
              {' '}
              (step=
              {data?.stepSeconds ?? 45}
              s)
            </div>
          </div>

          <Card className="mt-6 p-3 text-sm text-text-body">
            Gợi ý: chiếu màn hình này lên projector; sinh viên scan QR để vào link, khi tới checkpoint sẽ nhập token hiện tại.
          </Card>
        </Card>
      </div>

      {snapshotInfo && snapshotInfo.perRule.length > 0
        ? (
            <Card className="mt-6 p-6">
              <div className="font-semibold text-text-heading">Snapshot summary</div>
              <div className="mt-1 text-xs text-text-muted">
                Total picked:
                {' '}
                <span className="font-mono">{snapshotInfo.totalPicked}</span>
                {snapshotInfo.alreadyBuilt ? ' (already built)' : ''}
              </div>
              <div className="mt-2 grid gap-1">
                {snapshotInfo.perRule.filter(r => r.picked < r.requested).length === 0
                  ? (
                      <div className="text-sm text-text-body">Đủ câu theo tất cả rules.</div>
                    )
                  : snapshotInfo.perRule.filter(r => r.picked < r.requested).map(r => (
                      <div key={r.tagId} className="text-sm text-text-body">
                        Tag
                        {' '}
                        <span className="font-mono">{r.tagNormalizedName}</span>
                        : requested
                        {' '}
                        <span className="font-mono">{r.requested}</span>
                        , picked
                        {' '}
                        <span className="font-mono">{r.picked}</span>
                      </div>
                    ))}
              </div>
            </Card>
          )
        : null}

      <Card className="mt-6 p-6">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Token log</div>
          <div className="flex items-center gap-2">
            <a
              className="rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-body hover:bg-bg-card"
              href={`/api/sessions/${props.sessionId}/report/tokenLog?format=csv`}
              target="_blank"
              rel="noreferrer"
            >
              Download CSV
            </a>
            <Button size="sm" variant="ghost" onClick={() => void fetchLogs()}>Refresh log</Button>
          </div>
        </div>
        <TableWrap className="mt-3">
          <Table>
            <thead>
              <tr className="text-text-muted">
                <th className="border-b p-2">Time</th>
                <th className="border-b p-2">User</th>
                <th className="border-b p-2">Type</th>
                <th className="border-b p-2">Token</th>
                <th className="border-b p-2">Attempt</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0
                ? (
                    <tr>
                      <td className="p-2 text-text-muted" colSpan={5}>Chưa có log.</td>
                    </tr>
                  )
                : logs.slice(0, 50).map(l => (
                    <tr key={l.id} className="odd:bg-bg-elevated">
                      <td className="p-2 font-mono">{new Date(l.createdAt).toLocaleTimeString()}</td>
                      <td className="p-2">
                        {l.user.email ?? l.user.name ?? l.user.id}
                      </td>
                      <td className="p-2 font-mono">
                        {l.type}
                      </td>
                      <td className="p-2 font-mono">
                        {l.enteredToken ?? '-'}
                      </td>
                      <td className="p-2 font-mono">{l.attemptId.slice(0, 8)}</td>
                    </tr>
                  ))}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <Card className="mt-6 p-6">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Scoreboard</div>
          <div className="flex items-center gap-2">
            <a
              className="rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-body hover:bg-bg-card"
              href={`/api/sessions/${props.sessionId}/report/scoreboard?format=csv`}
              target="_blank"
              rel="noreferrer"
            >
              Download CSV
            </a>
            <Button size="sm" variant="ghost" onClick={() => void fetchScoreboard()}>Refresh scoreboard</Button>
          </div>
        </div>
        <TableWrap className="mt-3">
          <Table>
            <thead>
              <tr className="text-text-muted">
                <th className="border-b p-2">User</th>
                <th className="border-b p-2">Status</th>
                <th className="border-b p-2">Score</th>
                <th className="border-b p-2">Submitted</th>
                <th className="border-b p-2">Attempt</th>
              </tr>
            </thead>
            <tbody>
              {scores.length === 0
                ? (
                    <tr>
                      <td className="p-2 text-text-muted" colSpan={5}>Chưa có attempt.</td>
                    </tr>
                  )
                : scores.map(s => (
                    <tr key={s.id} className="odd:bg-bg-elevated">
                      <td className="p-2">
                        {s.user.email ?? s.user.name ?? s.user.id}
                      </td>
                      <td className="p-2 font-mono">{s.status}</td>
                      <td className="p-2 font-mono">{s.score ?? '-'}</td>
                      <td className="p-2 font-mono">
                        {s.submittedAt ? new Date(s.submittedAt).toLocaleTimeString() : '-'}
                      </td>
                      <td className="p-2 font-mono">{s.id.slice(0, 8)}</td>
                    </tr>
                  ))}
            </tbody>
          </Table>
        </TableWrap>
      </Card>
    </div>
  );
}
