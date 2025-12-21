'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type SessionStatus = {
  id: string;
  status: 'lobby' | 'active' | 'ended';
  totpStepSeconds: number;
  quiz: {
    id: string;
    title: string;
  };
};

export function Lobby(props: { sessionId: string }) {
  const [data, setData] = useState<SessionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setError(null);
    const res = await fetch(`/api/sessions/${props.sessionId}/status`, { method: 'GET' });
    const json = await res.json() as SessionStatus & { error?: string };
    if (!res.ok) {
      setError(json.error ?? 'SESSION_NOT_FOUND');
      return;
    }
    setData(json);
  }

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${props.sessionId}/join`, { method: 'POST' });
      const json = await res.json() as { attemptId?: string; error?: string };
      if (!res.ok || !json.attemptId) {
        setError(json.error ?? 'JOIN_FAILED');
        return;
      }
      window.location.href = `/attempt/${json.attemptId}`;
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.sessionId]);

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-lg font-semibold">Không vào được session</div>
        <div className="mt-2 text-sm text-danger">{error}</div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <div className="text-lg font-semibold">Đang tải...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      <Card className="p-6 border-indigo-500/30 animate-slideUp">
        <div className="text-lg font-semibold text-text-heading">{data.quiz.title}</div>
        <div className="mt-1 text-xs text-text-muted">
          Session ID:
          {' '}
          <span className="font-mono">{data.id}</span>
        </div>
      </Card>

      {data.status === 'lobby'
        ? (
            <Card className="p-6 border-indigo-500/30 animate-slideUp" style={{ animationDelay: '50ms' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-indigo-400"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold text-text-heading">Đang chờ giảng viên bắt đầu</div>
                  <div className="mt-1 text-sm text-text-body">
                    Khi bắt đầu bài, hệ thống sẽ tự chuyển sang màn hình làm bài.
                  </div>
                </div>
              </div>
            </Card>
          )
        : data.status === 'active'
          ? (
              <Card className="p-6 border-indigo-500/50 bg-indigo-500/5 animate-slideUp" style={{ animationDelay: '50ms' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-indigo-400"
                    >
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-text-heading">Session đã bắt đầu</div>
                    <div className="mt-1 text-sm text-text-body">
                      Bấm nút bên dưới để vào làm bài.
                    </div>
                  </div>
                </div>
                <Button
                  variant="primary"
                  className="w-full bg-indigo-500 hover:bg-indigo-600 hover:scale-105"
                  onClick={() => void join()}
                  disabled={busy}
                >
                  {busy ? 'Đang vào...' : 'Vào làm bài →'}
                </Button>
              </Card>
            )
          : (
              <Card className="p-6 border-border-subtle animate-slideUp" style={{ animationDelay: '50ms' }}>
                <div className="text-lg font-semibold text-text-heading">Session đã kết thúc</div>
                <div className="mt-2 text-sm text-text-muted">
                  Hỏi giảng viên nếu cần xem lại kết quả.
                </div>
              </Card>
            )}
    </div>
  );
}
// EOF
