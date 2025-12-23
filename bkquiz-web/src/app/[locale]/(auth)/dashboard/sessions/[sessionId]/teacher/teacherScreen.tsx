'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Table, TableWrap } from '@/components/ui/Table';
import { getI18nPath } from '@/utils/Helpers';

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
  attemptCount: number;
  quiz: {
    title: string;
  };
  classroom: {
    id: string;
    name: string;
    classCode: string;
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

function formatDuration(startedAt: string | null): string {
  if (!startedAt) {
    return 'Chưa bắt đầu';
  }
  const start = new Date(startedAt);
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
  const minutes = Math.floor(diff / 60);
  const seconds = diff % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url.length > 50 ? `${url.slice(0, 47)}...` : url;
  }
}

export function TeacherScreen(props: { sessionId: string; userId: string | null }) {
  const locale = useLocale();
  const [data, setData] = useState<TeacherTokenResponse | null>(null);
  const [session, setSession] = useState<SessionStatusResponse | null>(null);
  const [logs, setLogs] = useState<TokenLogRow[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [joinedStudents, setJoinedStudents] = useState<Array<{
    attemptId: string;
    userId: string;
    name: string;
    email: string | null;
    status: string;
    joinedAt: string;
  }>>([]);
  const [snapshotInfo, setSnapshotInfo] = useState<null | {
    alreadyBuilt: boolean;
    totalPicked: number;
    perRule: Array<{ tagId: string; tagNormalizedName: string; requested: number; picked: number }>;
  }>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);

  const lastFetchedAt = useRef<number>(0);
  const hasRefetchedForExpiry = useRef<boolean>(false);

  async function fetchStatus() {
    const res = await fetch(`/api/sessions/${props.sessionId}/status`, { method: 'GET' });
    const json = await res.json() as Partial<SessionStatusResponse> & { error?: string };
    if (!res.ok) {
      setError(json.error ?? 'SESSION_NOT_FOUND');
      return;
    }
    const newStatus = (json as SessionStatusResponse).status;
    const prevStatus = session?.status;

    setSession(json as SessionStatusResponse);

    // Nếu session vừa chuyển từ lobby → active (auto-start), hoặc status là active mà chưa có token
    // thì fetch token ngay lập tức
    if (newStatus === 'active' && (prevStatus === 'lobby' || !data)) {
      void fetchToken();
    }

    // Trigger auto-start/auto-end endpoint (cho dev mode)
    // Server sẽ tự kiểm tra và start/end sessions nếu cần
    // - Lobby: check scheduledStartAt và start nếu đã quá giờ
    // - Active: check durationSeconds + bufferMinutes và end nếu đã hết giờ
    if (newStatus === 'lobby' || newStatus === 'active') {
      // Trigger auto-management endpoint (không cần await, để chạy background)
      // Server sẽ tự check và chỉ start/end nếu đã đến thời điểm
      void fetch('/api/sessions/auto', { method: 'POST' }).catch((err) => {
        console.error('Failed to trigger auto-management:', err);
      });
    }
  }

  async function fetchLogs() {
    const res = await fetch(`/api/sessions/${props.sessionId}/report/tokenLog`, { method: 'GET' });
    const json = await res.json() as { logs?: TokenLogRow[]; error?: string };
    if (!res.ok) {
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

  async function fetchJoinedStudents() {
    // Chỉ fetch khi session ở lobby hoặc active
    if (session?.status === 'ended') {
      return;
    }
    const res = await fetch(`/api/sessions/${props.sessionId}/joinedStudents`, { method: 'GET' });
    const json = await res.json() as { students?: Array<{
      attemptId: string;
      userId: string;
      name: string;
      email: string | null;
      status: string;
      joinedAt: string;
    }>; error?: string };
    if (!res.ok) {
      return;
    }
    setJoinedStudents(json.students ?? []);
  }

  async function fetchToken() {
    // Không fetch token nếu session đã ended (check từ state hiện tại)
    // Lưu ý: Khi được gọi từ fetchStatus() sau auto-start, session state có thể chưa update
    // nhưng API sẽ trả về lỗi nếu session đã ended, nên vẫn an toàn
    if (session?.status === 'ended') {
      return;
    }
    setError(null);
    const res = await fetch(`/api/sessions/${props.sessionId}/teacherToken`, { method: 'GET' });
    const json = await res.json() as Partial<TeacherTokenResponse> & { error?: string };
    if (!res.ok) {
      // Nếu session đã ended, không set error (đây là expected behavior)
      if (json.error !== 'SESSION_ENDED') {
        setError(json.error ?? 'FORBIDDEN');
      }
      return;
    }
    setData(json as TeacherTokenResponse);
    lastFetchedAt.current = Date.now();
    hasRefetchedForExpiry.current = false;
  }

  useEffect(() => {
    void fetchStatus();
    void fetchLogs();
    void fetchScoreboard();
    void fetchJoinedStudents();
    void fetchToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.sessionId]);

  // Fetch token khi session status thay đổi từ ended sang active/lobby
  useEffect(() => {
    if (session?.status !== 'ended') {
      void fetchToken();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status]);

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

  useEffect(() => {
    const id = window.setInterval(() => void fetchJoinedStudents(), 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.sessionId, session?.status]);

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
    // eslint-disable-next-line no-alert
    if (!window.confirm('Bạn có chắc muốn kết thúc session này?')) {
      return;
    }
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
    // Không chạy countdown nếu session đã ended
    if (session?.status === 'ended') {
      setSecondsLeft(null);
      return;
    }
    const id = window.setInterval(() => {
      if (!data) {
        setSecondsLeft(null);
        return;
      }
      const elapsed = (Date.now() - lastFetchedAt.current) / 1000;
      const left = Math.max(0, Math.ceil(data.expiresInSeconds - elapsed));
      setSecondsLeft(left);

      // Auto-refetch token when it expires (only once per expiry)
      if (left <= 0 && !hasRefetchedForExpiry.current && session?.status !== 'ended') {
        hasRefetchedForExpiry.current = true;
        void fetchToken();
      }
    }, 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, session?.status]);

  const progressPercent = data && secondsLeft !== null
    ? Math.max(0, Math.min(100, (secondsLeft / data.stepSeconds) * 100))
    : 0;

  return (
    <div className="fixed inset-0 bg-black text-white overflow-y-auto">
      {/* Session Info Bar - Compact, top (sticky) */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-sm border-b border-white/10 px-6 py-3 relative">
        {/* Breadcrumb - Inside info bar, left */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-[100] pointer-events-auto">
          <div className="flex items-center gap-1 text-xs text-white/60 bg-black/60 backdrop-blur-sm px-2 py-1 rounded">
            <Link
              href={getI18nPath('/dashboard', locale)}
              className="hover:text-white/80 transition-colors cursor-pointer"
            >
              Dashboard
            </Link>
            <span>/</span>
            <Link
              href={getI18nPath('/dashboard/sessions', locale)}
              className="hover:text-white/80 transition-colors cursor-pointer"
            >
              Sessions
            </Link>
            <span>/</span>
            <span className="text-white/40">Session</span>
          </div>
        </div>

        {/* Controls - Inside info bar, right */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[100] flex items-center gap-2 pointer-events-auto">
          {session?.status === 'lobby'
            ? (
                <Button size="md" variant="primary" onClick={() => void startSession()} className="px-6 py-3 text-base">
                  Start Session
                </Button>
              )
            : null}
          {session?.status === 'active'
            ? (
                <Button size="md" variant="danger" onClick={() => void endSession()} className="px-6 py-3 text-base">
                  End Session
                </Button>
              )
            : null}
          {session?.status !== 'ended'
            ? (
          <Button size="sm" variant="ghost" onClick={() => void fetchToken()} className="text-white/80 border-white/20 hover:bg-white/10">
            Refresh Token
          </Button>
              )
            : null}
        </div>

        {/* Session Info - Center, with padding for breadcrumb and controls */}
        <div className="flex items-center justify-center text-sm pl-32 pr-32">
          <div className="flex items-center gap-4">
            <div className="font-semibold text-white">{session?.quiz?.title ?? 'Loading...'}</div>
            <span className="text-white/40">·</span>
            <div className="text-white/60">{session?.classroom?.name ?? '...'}</div>
            <span className="text-white/40">·</span>
            <Badge
              variant={session?.status === 'active' ? 'success' : session?.status === 'ended' ? 'neutral' : 'info'}
              className="align-middle"
            >
              {session?.status ?? 'loading'}
            </Badge>
            {session?.status === 'lobby' && typeof session?.attemptCount === 'number'
              ? (
                  <>
                    <span className="text-white/40">·</span>
                    <div className="text-white/60">
                      <span className="font-semibold text-white">{session.attemptCount}</span>
                      {' '}
                      sinh viên đã join
                    </div>
                  </>
                )
              : null}
            {session?.startedAt
              ? (
                  <>
                    <span className="text-white/40">·</span>
                    <div className="text-white/60 font-mono">
                      {formatDuration(session.startedAt)}
                    </div>
                  </>
                )
              : null}
          </div>
          {error
            ? (
                <div className="absolute right-32 top-1/2 -translate-y-1/2 text-xs text-red-400">
                  {error}
                </div>
              )
            : null}
        </div>
      </div>

      {/* Main Content - Full-screen QR + Token hoặc Ended Summary */}
      <div className="min-h-screen flex items-center justify-center px-6 py-20">
        {session?.status === 'lobby'
          ? (
              /* Lobby - QR Code + Joined Students List */
              <div className="w-full max-w-7xl grid gap-8 lg:grid-cols-2">
                {/* QR Code Section - Left */}
                <div className="flex flex-col items-center justify-center">
                  <div className="text-sm font-medium text-white/60 mb-4">QR để sinh viên vào bài</div>
                  <div className="flex items-center justify-center">
                    {data?.joinUrl
                      ? (
                          <div className="rounded-lg bg-white p-6 shadow-2xl">
                            <QRCode value={data.joinUrl} size={480} />
                          </div>
                        )
                      : (
                          <div className="w-[480px]">
                            <Skeleton className="mx-auto h-[480px] w-[480px]" />
                            <div className="mt-3 text-center text-sm text-white/40">Đang tải QR...</div>
                          </div>
                        )}
                  </div>
                  <div className="mt-6 max-w-md text-center">
                    <div className="rounded-md bg-white/5 border border-white/10 p-3 break-all text-xs text-white/60 font-mono">
                      {data?.joinUrl ? shortenUrl(data.joinUrl) : '...'}
                    </div>
                    <div className="mt-2 text-xs text-white/40">
                      Sinh viên quét QR hoặc mở link này để join session
                    </div>
                  </div>
                </div>

                {/* Joined Students List - Right */}
                <div className="flex flex-col">
                  <Card className="bg-white/5 border-white/10 p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold text-white">
                          Sinh viên đã join
                        </div>
                        <div className="mt-1 text-sm text-white/60">
                          {joinedStudents.length}
                          {' '}
                          sinh viên
                        </div>
                      </div>
                    </div>

                    {joinedStudents.length === 0
                      ? (
                          <div className="py-8 text-center text-sm text-white/40">
                            Chưa có sinh viên nào join
                          </div>
                        )
                      : (
                          <div className="space-y-2 max-h-[600px] overflow-y-auto">
                            {joinedStudents.map((student, idx) => {
                              // Get initials for avatar
                              const initials = student.name
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2);
                              const joinedTime = new Date(student.joinedAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              });
                              return (
                                <div
                                  key={student.attemptId}
                                  className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 transition-all duration-200 hover:bg-white/10"
                                  style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                  {/* Avatar */}
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                                    {initials}
                                  </div>
                                  {/* Student Info */}
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium text-white">
                                      {student.name}
                                    </div>
                                    {student.email && (
                                      <div className="truncate text-xs text-white/60">
                                        {student.email}
                                      </div>
                                    )}
                                  </div>
                                  {/* Joined Time */}
                                  <div className="shrink-0 text-xs text-white/40 font-mono">
                                    {joinedTime}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                  </Card>
                </div>
              </div>
            )
          : session?.status === 'ended'
            ? (
              /* Session Ended - Summary View */
              <div className="w-full max-w-4xl space-y-6">
                {/* Banner đỏ */}
                <Card className="bg-red-500/20 border-red-500/40 p-6">
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-6 h-6 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div>
                      <div className="text-lg font-semibold text-red-400">Session đã kết thúc</div>
                      <div className="text-sm text-red-300/80 mt-1">
                        {session.endedAt
                          ? `Kết thúc lúc ${new Date(session.endedAt).toLocaleString('vi-VN')}`
                          : 'Session này đã được kết thúc'}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-white/5 border-white/10 p-6">
                    <div className="text-sm text-white/60 mb-2">Tổng số attempts</div>
                    <div className="text-3xl font-bold text-white">{scores.length}</div>
                  </Card>
                  <Card className="bg-white/5 border-white/10 p-6">
                    <div className="text-sm text-white/60 mb-2">Đã submit</div>
                    <div className="text-3xl font-bold text-white">
                      {scores.filter(s => s.status === 'submitted').length}
                    </div>
                  </Card>
                  <Card className="bg-white/5 border-white/10 p-6">
                    <div className="text-sm text-white/60 mb-2">Thời lượng</div>
                    <div className="text-3xl font-bold text-white font-mono">
                      {session.startedAt && session.endedAt
                        ? (() => {
                            const start = new Date(session.startedAt);
                            const end = new Date(session.endedAt);
                            const diff = Math.floor((end.getTime() - start.getTime()) / 1000);
                            const minutes = Math.floor(diff / 60);
                            const seconds = diff % 60;
                            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                          })()
                        : '-'}
                    </div>
                  </Card>
                </div>

                {/* Quick Actions */}
                <Card className="bg-white/5 border-white/10 p-6">
                  <div className="text-base font-semibold text-white mb-4">Xem báo cáo chi tiết</div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="primary"
                      onClick={() => setShowScoreboard(true)}
                      className="px-6 py-3"
                    >
                      Xem Scoreboard
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowLogs(true)}
                      className="px-6 py-3 text-white/80 border-white/20 hover:bg-white/10"
                    >
                      Xem Token Log
                    </Button>
                    <a
                      href={`/api/sessions/${props.sessionId}/report/scoreboard?format=csv`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-white/20 px-6 py-3 text-sm text-white/80 hover:bg-white/10 transition-colors inline-flex items-center"
                    >
                      Download Scoreboard CSV
                    </a>
                    <a
                      href={`/api/sessions/${props.sessionId}/report/tokenLog?format=csv`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-white/20 px-6 py-3 text-sm text-white/80 hover:bg-white/10 transition-colors inline-flex items-center"
                    >
                      Download Token Log CSV
                    </a>
                  </div>
                </Card>
              </div>
            )
          : (
              /* Active/Lobby - QR + Token View */
        <div className="w-full max-w-7xl grid gap-8 lg:grid-cols-2">
          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center">
            <div className="text-sm font-medium text-white/60 mb-4">QR để sinh viên vào bài</div>
            <div className="flex items-center justify-center">
              {data?.joinUrl
                ? (
                    <div className="rounded-lg bg-white p-6 shadow-2xl">
                      <QRCode value={data.joinUrl} size={480} />
                    </div>
                  )
                : (
                    <div className="w-[480px]">
                      <Skeleton className="mx-auto h-[480px] w-[480px]" />
                      <div className="mt-3 text-center text-sm text-white/40">Đang tải QR...</div>
                    </div>
                  )}
            </div>
            <div className="mt-6 max-w-md text-center">
              <div className="rounded-md bg-white/5 border border-white/10 p-3 break-all text-xs text-white/60 font-mono">
                {data?.joinUrl ? shortenUrl(data.joinUrl) : '...'}
              </div>
              <div className="mt-2 text-xs text-white/40">
                Sinh viên quét QR hoặc mở link này để join session
              </div>
            </div>
          </div>

          {/* Token Section */}
          <div className="flex flex-col items-center justify-center">
            <div className="text-sm font-medium text-white/60 mb-4">Token (TOTP)</div>
            <div className="text-center w-full">
              <div className="text-8xl font-bold tracking-[0.3em] text-primary mb-6 font-mono">
                {data?.token ?? '------'}
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md mx-auto mb-4">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 ease-linear"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="text-lg text-white/80 font-mono mb-2">
                {secondsLeft === null
                  ? '...'
                  : `${secondsLeft}s`}
              </div>
              <div className="text-xs text-white/40">
                Token đổi sau
                {' '}
                {secondsLeft === null
                  ? '...'
                  : `${secondsLeft}s`}
                {' '}
                (step=
                {data?.stepSeconds ?? 45}
                s)
              </div>
            </div>
            <div className="mt-8 max-w-md text-center">
              <div className="rounded-md bg-white/5 border border-white/10 p-3 text-xs text-white/60">
                Gợi ý: Chiếu màn hình này lên projector. Sinh viên scan QR để vào link, khi tới checkpoint sẽ nhập token hiện tại.
              </div>
            </div>
          </div>
        </div>
            )}
      </div>

      {/* Collapsible Sections */}
      <div className="bg-black/40 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 space-y-4">
          {/* Snapshot Info */}
          {snapshotInfo && snapshotInfo.perRule.length > 0
            ? (
                <Card className="bg-white/5 border-white/10 p-4">
                  <div className="font-semibold text-white text-sm mb-2">Snapshot Summary</div>
                  <div className="text-xs text-white/60 mb-2">
                    Total picked:
                    {' '}
                    <span className="font-mono text-white/80">{snapshotInfo.totalPicked}</span>
                    {snapshotInfo.alreadyBuilt ? ' (already built)' : ''}
                  </div>
                  <div className="space-y-1">
                    {snapshotInfo.perRule.filter(r => r.picked < r.requested).length === 0
                      ? (
                          <div className="text-xs text-green-400">✅ Đủ câu theo tất cả rules.</div>
                        )
                      : snapshotInfo.perRule.filter(r => r.picked < r.requested).map(r => (
                          <div key={r.tagId} className="text-xs text-yellow-400">
                            ⚠️ Tag
                            {' '}
                            <span className="font-mono">{r.tagNormalizedName}</span>
                            : Cần
                            {' '}
                            <span className="font-mono">{r.requested}</span>
                            , có
                            {' '}
                            <span className="font-mono">{r.picked}</span>
                            {' '}
                            (thiếu
                            {' '}
                            {r.requested - r.picked}
                            )
                          </div>
                        ))}
                  </div>
                </Card>
              )
            : null}

          {/* Token Log - Collapsible */}
          <Card className="bg-white/5 border-white/10">
            <div className="w-full flex items-center justify-between p-4">
              <button
                type="button"
                onClick={() => setShowLogs(!showLogs)}
                className="flex-1 flex items-center justify-between text-left hover:bg-white/5 transition-colors rounded-md p-2 -m-2"
              >
                <div className="text-base font-semibold text-white">
                  Token Log
                  {' '}
                  <span className="text-xs font-normal text-white/40">
                    (
                    {logs.length}
                    {' '}
                    entries)
                  </span>
                </div>
                <svg
                  className={`w-5 h-5 text-white/60 transition-transform ${showLogs ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-2 ml-4">
                <a
                  className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 transition-colors"
                  href={`/api/sessions/${props.sessionId}/report/tokenLog?format=csv`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download CSV
                </a>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void fetchLogs()}
                  className="text-white/80 border-white/20 hover:bg-white/10"
                >
                  Refresh
                </Button>
              </div>
            </div>
            {showLogs
              ? (
                  <div className="px-4 pb-4">
                    <TableWrap className="mt-3">
                      <Table>
                        <thead>
                          <tr className="text-white/60 text-xs">
                            <th className="border-b border-white/10 p-2">Time</th>
                            <th className="border-b border-white/10 p-2">User</th>
                            <th className="border-b border-white/10 p-2">Type</th>
                            <th className="border-b border-white/10 p-2">Token</th>
                            <th className="border-b border-white/10 p-2">Attempt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logs.length === 0
                            ? (
                                <tr>
                                  <td className="p-2 text-white/40 text-xs" colSpan={5}>Chưa có log.</td>
                                </tr>
                              )
                            : logs.slice(0, 50).map(l => (
                                <tr key={l.id} className="odd:bg-white/5 text-xs">
                                  <td className="p-2 font-mono text-white/80">{new Date(l.createdAt).toLocaleTimeString()}</td>
                                  <td className="p-2 text-white/80">
                                    {l.user.email ?? l.user.name ?? l.user.id}
                                  </td>
                                  <td className="p-2 font-mono text-white/60">
                                    {l.type}
                                  </td>
                                  <td className="p-2 font-mono text-white/80">
                                    {l.enteredToken ?? '-'}
                                  </td>
                                  <td className="p-2 font-mono text-white/60">{l.attemptId.slice(0, 8)}</td>
                                </tr>
                              ))}
                        </tbody>
                      </Table>
                    </TableWrap>
                  </div>
                )
              : null}
          </Card>

          {/* Scoreboard - Collapsible */}
          <Card className="bg-white/5 border-white/10">
            <div className="w-full flex items-center justify-between p-4">
              <button
                type="button"
                onClick={() => setShowScoreboard(!showScoreboard)}
                className="flex-1 flex items-center justify-between text-left hover:bg-white/5 transition-colors rounded-md p-2 -m-2"
              >
                <div className="text-base font-semibold text-white">
                  Scoreboard
                  {' '}
                  <span className="text-xs font-normal text-white/40">
                    (
                    {scores.length}
                    {' '}
                    students)
                  </span>
                </div>
                <svg
                  className={`w-5 h-5 text-white/60 transition-transform ${showScoreboard ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-2 ml-4">
                <a
                  className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 transition-colors"
                  href={`/api/sessions/${props.sessionId}/report/scoreboard?format=csv`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download CSV
                </a>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void fetchScoreboard()}
                  className="text-white/80 border-white/20 hover:bg-white/10"
                >
                  Refresh
                </Button>
              </div>
            </div>
            {showScoreboard
              ? (
                  <div className="px-4 pb-4">
                    <TableWrap className="mt-3">
                      <Table>
                        <thead>
                          <tr className="text-white/60 text-xs">
                            <th className="border-b border-white/10 p-2">User</th>
                            <th className="border-b border-white/10 p-2">Status</th>
                            <th className="border-b border-white/10 p-2">Score</th>
                            <th className="border-b border-white/10 p-2">Submitted</th>
                            <th className="border-b border-white/10 p-2">Attempt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scores.length === 0
                            ? (
                                <tr>
                                  <td className="p-2 text-white/40 text-xs" colSpan={5}>Chưa có attempt.</td>
                                </tr>
                              )
                            : scores.map(s => (
                                <tr key={s.id} className="odd:bg-white/5 text-xs">
                                  <td className="p-2 text-white/80">
                                    {s.user.email ?? s.user.name ?? s.user.id}
                                  </td>
                                  <td className="p-2 font-mono text-white/60">{s.status}</td>
                                  <td className="p-2 font-mono text-white/80">{s.score ?? '-'}</td>
                                  <td className="p-2 font-mono text-white/60">
                                    {s.submittedAt ? new Date(s.submittedAt).toLocaleTimeString() : '-'}
                                  </td>
                                  <td className="p-2 font-mono text-white/60">{s.id.slice(0, 8)}</td>
                                </tr>
                              ))}
                        </tbody>
                      </Table>
                    </TableWrap>
                  </div>
                )
              : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
