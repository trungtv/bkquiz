'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';

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
    classroom: { name: string; classCode: string };
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
    const res = await fetch(`/api/sessions/${props.sessionId}/start`, { method: 'POST' });
    const json = await res.json() as { error?: string; snapshot?: any };
    if (!res.ok) {
      setError(json.error ?? 'START_FAILED');
      return;
    }
    if (json.snapshot) {
      setSnapshotInfo(json.snapshot);
    }
    await fetchStatus();
    await fetchLogs();
    await fetchScoreboard();
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
    }, 250);
    return () => window.clearInterval(id);
  }, [data]);

  useEffect(() => {
    if (!data) {
      return;
    }
    if ((secondsLeft ?? 999) <= 1) {
      void fetchToken();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, data]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-lg border bg-white p-4">
        <div className="text-lg font-semibold">Teacher Screen</div>
        <div className="mt-1 text-sm text-gray-600">
          <div>
            Session:
            {' '}
            <span className="font-mono">{props.sessionId}</span>
          </div>
          <div className="mt-1">
            Trạng thái:
            {' '}
            <span className="font-mono">{session?.status ?? '...'}</span>
            {session?.quiz?.title
              ? (
                  <>
                    {' '}
                    ·
                    {' '}
                    <span className="font-medium">{session.quiz.title}</span>
                    {' '}
                    (
                    <span className="font-mono">{session.quiz.classroom.classCode}</span>
                    )
                  </>
                )
              : null}
          </div>
        </div>
        {error
          ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )
          : null}
        {session?.status === 'active'
          ? (
              <div className="mt-3 rounded-md border bg-gray-50 p-3 text-sm text-gray-700">
                Nếu thấy “Chưa có câu hỏi” ở phía sinh viên, hãy kiểm tra quiz đã có rules và bấm Start lại (snapshot chỉ build 1 lần/1 session).
              </div>
            )
          : null}

        {snapshotInfo && snapshotInfo.perRule.length > 0
          ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="font-medium">Snapshot summary</div>
                <div className="mt-1 text-xs text-amber-900/80">
                  Total picked:
                  {' '}
                  <span className="font-mono">{snapshotInfo.totalPicked}</span>
                  {snapshotInfo.alreadyBuilt ? ' (already built)' : ''}
                </div>
                <div className="mt-2 grid gap-1">
                  {snapshotInfo.perRule.filter(r => r.picked < r.requested).length === 0
                    ? (
                        <div className="text-sm">Đủ câu theo tất cả rules.</div>
                      )
                    : snapshotInfo.perRule.filter(r => r.picked < r.requested).map(r => (
                        <div key={r.tagId} className="text-sm">
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
              </div>
            )
          : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-6">
          <div className="text-sm font-medium text-gray-700">QR để sinh viên vào bài</div>
          <div className="mt-4 flex items-center justify-center">
            {data?.joinUrl
              ? (
                  <div className="rounded-md bg-white p-4">
                    <QRCode value={data.joinUrl} size={360} />
                  </div>
                )
              : (
                  <div className="text-sm text-gray-500">Đang tải QR...</div>
                )}
          </div>
          {/* eslint-disable-next-line tailwindcss/classnames-order */}
          <div className="mt-4 rounded-md border bg-gray-50 p-3 break-all text-sm text-gray-700">
            {data?.joinUrl ?? '...'}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">Token (TOTP)</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                onClick={() => void fetchToken()}
              >
                Refresh token
              </button>
              {session?.status === 'lobby'
                ? (
                    <button
                      type="button"
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                      onClick={() => void startSession()}
                    >
                      Start
                    </button>
                  )
                : null}
              {session?.status === 'active'
                ? (
                    <button
                      type="button"
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                      onClick={() => void endSession()}
                    >
                      End
                    </button>
                  )
                : null}
            </div>
          </div>

          <div className="mt-6 text-center">
            <div className="text-6xl font-bold tracking-widest text-gray-900">
              {data?.token ?? '------'}
            </div>
            <div className="mt-3 text-sm text-gray-600">
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

          <div className="mt-6 rounded-md border bg-gray-50 p-3 text-sm text-gray-700">
            Gợi ý: chiếu màn hình này lên projector; sinh viên scan QR để vào link, khi tới checkpoint sẽ nhập token hiện tại.
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Token log</div>
          <div className="flex items-center gap-2">
            <a
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
              href={`/api/sessions/${props.sessionId}/report/tokenLog?format=csv`}
              target="_blank"
              rel="noreferrer"
            >
              Download CSV
            </a>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
              onClick={() => void fetchLogs()}
            >
              Refresh log
            </button>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-gray-600">
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
                      <td className="p-2 text-gray-500" colSpan={5}>Chưa có log.</td>
                    </tr>
                  )
                : logs.slice(0, 50).map(l => (
                    <tr key={l.id} className="odd:bg-gray-50">
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
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Scoreboard</div>
          <div className="flex items-center gap-2">
            <a
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
              href={`/api/sessions/${props.sessionId}/report/scoreboard?format=csv`}
              target="_blank"
              rel="noreferrer"
            >
              Download CSV
            </a>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
              onClick={() => void fetchScoreboard()}
            >
              Refresh scoreboard
            </button>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-gray-600">
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
                      <td className="p-2 text-gray-500" colSpan={5}>Chưa có attempt.</td>
                    </tr>
                  )
                : scores.map(s => (
                    <tr key={s.id} className="odd:bg-gray-50">
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
          </table>
        </div>
      </div>
    </div>
  );
}
