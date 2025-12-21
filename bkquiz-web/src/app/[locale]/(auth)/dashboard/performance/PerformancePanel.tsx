'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

type PerformanceData = {
  totalAttempts: number;
  averageScore: number | null;
  highestScore: number | null;
  recentAttempts: Array<{
    id: string;
    score: number | null;
    submittedAt: string | null;
    quizTitle: string;
  }>;
};

export function PerformancePanel() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPerformance() {
      try {
        const res = await fetch('/api/students/performance');
        if (!res.ok) {
          throw new Error('Failed to load performance data');
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    loadPerformance();
  }, []);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  if (loading) {
    return (
      <div className="space-y-7">
        <Card className="p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-4 w-96" />
        </Card>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-sm text-text-muted">Lỗi</div>
        <div className="mt-2 text-text-body">{error}</div>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <Card className="p-6 border-indigo-500/30">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm text-indigo-400 uppercase tracking-wide">My Performance</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text-heading">
              Thống kê của tôi
            </h1>
            <div className="mt-2 text-sm text-text-muted">
              Xem điểm số và thống kê các bài quiz bạn đã làm.
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6 border-indigo-500/20">
          <div className="text-sm text-text-muted">Tổng số bài đã làm</div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-indigo-400">{data.totalAttempts}</div>
            <Badge variant="info">attempts</Badge>
          </div>
          <div className="mt-2 text-xs text-text-muted">
            Số bài quiz bạn đã nộp.
          </div>
        </Card>

        <Card className="p-6 border-indigo-500/20">
          <div className="text-sm text-text-muted">Điểm trung bình</div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-indigo-400">
              {data.averageScore !== null ? data.averageScore.toFixed(1) : '—'}
            </div>
            {data.averageScore !== null && (
              <Badge variant="info">/ 10</Badge>
            )}
          </div>
          <div className="mt-2 text-xs text-text-muted">
            Điểm trung bình tất cả các bài.
          </div>
        </Card>

        <Card className="p-6 border-indigo-500/20">
          <div className="text-sm text-text-muted">Điểm cao nhất</div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-indigo-400">
              {data.highestScore !== null ? data.highestScore.toFixed(1) : '—'}
            </div>
            {data.highestScore !== null && (
              <Badge variant="success">/ 10</Badge>
            )}
          </div>
          <div className="mt-2 text-xs text-text-muted">
            Điểm cao nhất bạn đạt được.
          </div>
        </Card>
      </div>

      {/* Recent Attempts */}
      {data.recentAttempts.length > 0 && (
        <Card className="p-6">
          <div className="text-lg font-semibold text-text-heading mb-4">
            Bài làm gần đây ({data.recentAttempts.length})
          </div>
          <div className="space-y-2">
            {data.recentAttempts.map(attempt => (
              <Link key={attempt.id} href={`/attempt/${attempt.id}`}>
                <div className="flex items-center justify-between gap-4 rounded-md border border-border-subtle bg-bg-section px-4 py-3 transition-colors hover:border-indigo-500/50">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-text-heading">
                      {attempt.quizTitle}
                    </div>
                    <div className="mt-1 text-xs text-text-muted">
                      Nộp lúc: {formatDate(attempt.submittedAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {attempt.score !== null
                      ? (
                          <Badge
                            variant={attempt.score >= 8 ? 'success' : (attempt.score >= 5 ? 'info' : 'neutral')}
                            className="text-xs"
                          >
                            {attempt.score.toFixed(1)} / 10
                          </Badge>
                        )
                      : (
                          <Badge variant="neutral" className="text-xs">
                            Chưa có điểm
                          </Badge>
                        )}
                    <span className="text-xs text-text-muted">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {data.totalAttempts === 0 && (
        <Card className="p-6">
          <div className="rounded-md border border-dashed border-indigo-500/30 px-4 py-8 text-center">
            <div className="text-sm text-text-muted">
              Chưa có bài làm nào.
            </div>
            <div className="mt-2 text-xs text-text-muted">
              Tham gia các session để bắt đầu làm bài quiz.
            </div>
            <div className="mt-4">
              <Link href="/dashboard/sessions">
                <button className="rounded-md bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-400 hover:bg-indigo-500/30 transition-colors">
                  Xem Sessions
                </button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

