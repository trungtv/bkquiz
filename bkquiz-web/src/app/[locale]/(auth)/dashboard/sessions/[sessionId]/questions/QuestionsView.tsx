'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MathRenderer } from '@/components/MathRenderer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

type Question = {
  id: string;
  order: number;
  type: 'mcq_single' | 'mcq_multi';
  prompt: string;
  sourceQuestionId: string;
  options: Array<{
    order: number;
    content: string;
    isCorrect: boolean;
  }>;
  tag?: {
    id: string;
    name: string;
    normalizedName: string;
  };
};

type SessionInfo = {
  id: string;
  status: 'lobby' | 'active' | 'ended';
  quiz: {
    title: string;
  };
  classroom: {
    name: string;
  };
};

type QuestionsResponse = {
  questions: Question[];
  total: number;
  sessionId: string;
};

export function QuestionsView(props: { sessionId: string; userId: string | null }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadQuestions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${props.sessionId}/questions`, { method: 'GET' });
      if (!res.ok) {
        const text = await res.text();
        let json: QuestionsResponse & { error?: string };
        try {
          json = JSON.parse(text);
        } catch {
          setError(`LOAD_FAILED: ${res.status} ${res.statusText}`);
          return;
        }
        setError(json.error ?? 'LOAD_FAILED');
        return;
      }
      const text = await res.text();
      if (!text) {
        setError('LOAD_FAILED: Empty response');
        return;
      }
      let json: QuestionsResponse & { error?: string };
      try {
        json = JSON.parse(text);
      } catch (err) {
        setError('LOAD_FAILED: Invalid JSON response');
        console.error('Failed to parse response:', text, err);
        return;
      }
      setQuestions(json.questions ?? []);
    } catch (err) {
      setError(`LOAD_FAILED: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error loading questions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSession() {
    try {
      const res = await fetch(`/api/sessions/${props.sessionId}/status`, { method: 'GET' });
      if (!res.ok) {
        return;
      }
      const text = await res.text();
      if (!text) {
        return;
      }
      let json: SessionInfo & { error?: string };
      try {
        json = JSON.parse(text);
      } catch (err) {
        console.error('Failed to parse session response:', text, err);
        return;
      }
      setSession(json);
    } catch (err) {
      console.error('Error loading session:', err);
    }
  }

  useEffect(() => {
    void loadQuestions();
    void loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.sessionId]);

  if (loading) {
    return (
      <div className="space-y-7 animate-fadeIn">
        <nav className="text-sm animate-slideUp">
          <div className="flex items-center gap-2 text-text-muted">
            <Skeleton className="h-4 w-20" />
            <span>·</span>
            <Skeleton className="h-4 w-24" />
            <span>·</span>
            <Skeleton className="h-4 w-20" />
          </div>
        </nav>
        <Card className="p-5 md:p-6 animate-slideUp">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-96" />
        </Card>
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-5 md:p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-7 animate-fadeIn">
        <nav className="text-sm animate-slideUp">
          <div className="flex items-center gap-2 text-text-muted">
            <Link href="/dashboard" className="hover:text-text-heading transition-colors">
              Dashboard
            </Link>
            <span>·</span>
            <Link href="/dashboard/sessions" className="hover:text-text-heading transition-colors">
              Sessions
            </Link>
            <span>·</span>
            <span className="text-text-heading">Questions</span>
          </div>
        </nav>
        <Card className="p-5 md:p-6">
          <div className="rounded-md border border-danger/40 bg-danger/10 p-4 text-center text-danger">
            {error === 'SESSION_NOT_FOUND'
              ? 'Không tìm thấy session'
              : error === 'FORBIDDEN'
                ? 'Bạn không có quyền xem questions của session này'
                : `Lỗi: ${error}`}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-fadeIn">
      {/* Breadcrumb */}
      <nav className="text-sm animate-slideUp">
        <div className="flex items-center gap-2 text-text-muted">
          <Link href="/dashboard" className="hover:text-text-heading transition-colors">
            Dashboard
          </Link>
          <span>·</span>
          <Link href="/dashboard/sessions" className="hover:text-text-heading transition-colors">
            Sessions
          </Link>
          <span>·</span>
          <span className="text-text-heading">Questions</span>
        </div>
      </nav>

      {/* Header Card */}
      <Card className="p-5 md:p-6 animate-slideUp">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-text-heading">
              Questions in Session
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-muted">
              {session?.quiz?.title && (
                <>
                  <span>{session.quiz.title}</span>
                  <span>·</span>
                </>
              )}
              {session?.classroom?.name && (
                <>
                  <span>{session.classroom.name}</span>
                  <span>·</span>
                </>
              )}
              <span>
                {questions.length}
                {' '}
                questions
              </span>
              {session?.status && (
                <>
                  <span>·</span>
                  <Badge
                    variant={
                      session.status === 'active'
                        ? 'success'
                        : session.status === 'ended'
                          ? 'neutral'
                          : 'info'
                    }
                  >
                    {session.status}
                  </Badge>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session?.status === 'lobby' && (
              <Link href={`/dashboard/sessions/${props.sessionId}/teacher`}>
                <Button variant="primary" size="sm">
                  Go to Teacher Screen
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={() => void loadQuestions()}>
              Refresh
            </Button>
            <Link href="/dashboard/sessions">
              <Button variant="ghost" size="sm">
                ← Quay lại
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Questions List */}
      <Card className="p-5 md:p-6 animate-slideUp" style={{ animationDelay: '150ms' }}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-text-heading">
            Câu hỏi (
            {questions.length}
            )
          </h2>
        </div>

        <div className="mt-4 space-y-3">
          {questions.length === 0
            ? (
                <div className="rounded-md border border-dashed border-border-subtle px-4 py-8 text-center text-sm text-text-muted">
                  {session?.status === 'lobby'
                    ? 'Session chưa bắt đầu, đang build questions...'
                    : 'Chưa có questions'}
                </div>
              )
            : (
                questions.map((question, index) => (
                  <Card key={question.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Metadata */}
                        <div className="flex items-center gap-2 text-sm text-text-muted">
                          <span className="font-mono">
                            Câu
                            {' '}
                            {index + 1}
                            /
                            {questions.length}
                          </span>
                          <span>·</span>
                          <Badge variant="neutral" className="text-xs">
                            {question.type === 'mcq_single' ? 'Chọn 1' : 'Chọn nhiều'}
                          </Badge>
                          {question.tag && (
                            <>
                              <span>·</span>
                              <Badge variant="info" className="text-xs">
                                {question.tag.name}
                              </Badge>
                            </>
                          )}
                        </div>

                        {/* Prompt */}
                        <div className="mt-2 text-sm text-text-body">
                          <MathRenderer content={question.prompt} />
                        </div>

                        {/* Options */}
                        <div className="mt-3 space-y-1">
                          {question.options.map((option, optIdx) => {
                            const optionLabel = String.fromCharCode(65 + optIdx); // A, B, C, D...
                            const isCorrect = option.isCorrect;
                            return (
                              <div key={`${question.id}-opt-${option.order}`} className="flex items-start gap-2 text-sm">
                                <div className="w-6 shrink-0 font-mono text-text-muted">
                                  {optionLabel}
                                  .
                                </div>
                                <div className={isCorrect ? 'font-medium text-success' : 'text-text-body'}>
                                  <MathRenderer content={option.content} />
                                  {isCorrect && (
                                    <Badge variant="success" className="ml-2 text-xs">
                                      Đúng
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
        </div>
      </Card>
    </div>
  );
}
