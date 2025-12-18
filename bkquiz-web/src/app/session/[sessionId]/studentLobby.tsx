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
    classroom: { id: string; name: string; classCode: string };
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
    <div className="space-y-4">
      <Card className="p-6">
        <div className="text-lg font-semibold text-text-heading">{data.quiz.title}</div>
        <div className="mt-1 text-sm text-text-body">
          Lớp:
          {' '}
          <span className="font-medium">{data.quiz.classroom.name}</span>
        </div>
        <div className="mt-1 text-xs text-text-muted">
          Session ID:
          {' '}
          <span className="font-mono">{data.id}</span>
        </div>
      </Card>

      {data.status === 'lobby'
        ? (
            <Card className="p-6">
              <div className="text-lg font-semibold text-text-heading">Đang chờ giảng viên bắt đầu</div>
              <div className="mt-2 text-sm text-text-body">
                Khi bắt đầu bài, hệ thống sẽ tự chuyển sang màn hình làm bài.
              </div>
            </Card>
          )
        : data.status === 'active'
          ? (
              <Card className="p-6">
                <div className="text-lg font-semibold">Session đã bắt đầu</div>
                <div className="mt-3">
                  <Button variant="primary" onClick={() => void join()} disabled={busy}>
                    {busy ? 'Đang vào...' : 'Vào làm bài'}
                  </Button>
                </div>
              </Card>
            )
          : (
              <Card className="p-6">
                <div className="text-lg font-semibold">Session đã kết thúc</div>
              </Card>
            )}
    </div>
  );
}
// EOF
