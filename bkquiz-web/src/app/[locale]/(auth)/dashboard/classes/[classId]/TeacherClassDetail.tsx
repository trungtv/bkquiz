'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import { TagInput } from '@/components/ui/TagInput';
import { cn } from '@/utils/cn';
import { ClassHeader } from './shared/ClassHeader';
import { MembersList } from './shared/MembersList';
import { SessionsList } from './shared/SessionsList';
import { StatsCards } from './shared/StatsCards';
import type { ClassInfo, Member, QuizLite, Session } from './types';

type TeacherClassDetailProps = {
  classId: string;
};

export function TeacherClassDetail(props: TeacherClassDetailProps) {
  const { classId } = props;
  const router = useRouter();
  const t = useTranslations('Classes.detail');
  const tClasses = useTranslations('Classes');
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'sessions' | 'settings'>('members');
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [quizzes, setQuizzes] = useState<QuizLite[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [quizSearchQuery, setQuizSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [scheduledStartTime, setScheduledStartTime] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [sessionName, setSessionName] = useState<string>('');
  const [bufferMinutes, setBufferMinutes] = useState<number>(5); // Mặc định 5 phút
  const [reviewDelayMinutes, setReviewDelayMinutes] = useState<number | null>(null); // null = không cho xem, số = phút sau khi session kết thúc

  // Helper function: Tính thời gian với offset phút, làm tròn chẵn 5 phút
  function getRoundedTime(minutesOffset: number): string {
    const now = new Date();
    const target = new Date(now.getTime() + minutesOffset * 60 * 1000);
    // Làm tròn chẵn 5 phút (làm tròn lên)
    const minutes = target.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 5) * 5;
    target.setMinutes(roundedMinutes);
    target.setSeconds(0);
    target.setMilliseconds(0);
    // Format cho datetime-local input (YYYY-MM-DDTHH:mm)
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    const hours = String(target.getHours()).padStart(2, '0');
    const mins = String(target.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${mins}`;
  }
  const [createSessionBusy, setCreateSessionBusy] = useState(false);
  const [createSessionError, setCreateSessionError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Toggle tag filter
  const toggleTagFilter = (tagName: string) => {
    const normalizedTagName = tagName.trim().toLowerCase();
    setSelectedTags(prev => {
      const isSelected = prev.some(t => t.toLowerCase() === normalizedTagName);
      if (isSelected) {
        return prev.filter(t => t.toLowerCase() !== normalizedTagName);
      }
      return [...prev, tagName.trim()];
    });
  };

  // Check if tag is selected
  const isTagSelected = (tagName: string) => {
    return selectedTags.some(t => t.toLowerCase() === tagName.trim().toLowerCase());
  };

  // Tags state
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<Array<{ id: string; name: string; normalizedName: string }>>([]);
  const [tagsBusy, setTagsBusy] = useState(false);

  async function loadClassInfo() {
    const res = await fetch(`/api/classes/${classId}`, { method: 'GET' });
    const json = await res.json() as ClassInfo | { error?: string };
    if (!res.ok) {
      return;
    }
    setClassInfo(json as ClassInfo);
  }

  async function loadMembers() {
    const res = await fetch(`/api/classes/${classId}/members`, { method: 'GET' });
    const json = await res.json() as { members?: Member[]; error?: string };
    if (!res.ok) {
      return;
    }
    setMembers(json.members ?? []);
  }

  async function loadSessions() {
    const res = await fetch(`/api/classes/${classId}/sessions`, { method: 'GET' });
    const json = await res.json() as { sessions?: Session[]; error?: string };
    if (!res.ok) {
      return;
    }
    setSessions(json.sessions ?? []);
  }

  async function loadQuizzes() {
    const res = await fetch('/api/quizzes', { method: 'GET' });
    const json = await res.json() as { quizzes?: QuizLite[]; error?: string };
    if (!res.ok) {
      return;
    }
    setQuizzes(json.quizzes ?? []);
  }

  async function loadTags() {
    try {
      const res = await fetch(`/api/classes/${classId}/tags`);
      const json = await res.json() as { tags?: Array<{ id: string; name: string; normalizedName: string }>; error?: string };
      if (res.ok) {
        setTags(json.tags ?? []);
        setTagsInput(json.tags?.map(t => t.name).join(', ') ?? '');
      }
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  }

  async function saveTags() {
    setTagsBusy(true);
    try {
      const res = await fetch(`/api/classes/${classId}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: tagsInput }),
      });
      const json = await res.json() as { tags?: Array<{ id: string; name: string; normalizedName: string }>; error?: string };
      if (res.ok) {
        setTags(json.tags ?? []);
        setToast({ message: 'Đã lưu tags thành công', type: 'success' });
      } else {
        setToast({ message: json.error ?? 'Lỗi khi lưu tags', type: 'error' });
      }
    } catch (err) {
      console.error('Error saving tags:', err);
      setToast({ message: 'Lỗi khi lưu tags', type: 'error' });
    } finally {
      setTagsBusy(false);
    }
  }

  async function createSession() {
    if (!selectedQuizId) {
      setCreateSessionError('Vui lòng chọn quiz');
      return;
    }
    const selectedQuiz = quizzes.find(q => q.id === selectedQuizId);
    if (!selectedQuiz) {
      setCreateSessionError('Vui lòng chọn quiz');
      return;
    }
    if (selectedQuiz.ruleCount === 0) {
      setCreateSessionError('Quiz này chưa có rule. Vào Quizzes để cấu hình rule trước.');
      return;
    }
    setCreateSessionBusy(true);
    setCreateSessionError(null);
    try {
      const body: any = {
        classroomId: classId,
        quizId: selectedQuizId,
      };
      // Add session name (use quiz title if empty)
      if (sessionName.trim()) {
        body.sessionName = sessionName.trim();
      } else if (selectedQuiz) {
        body.sessionName = selectedQuiz.title;
      }
      if (scheduledStartTime) {
        body.scheduledStartAt = scheduledStartTime;
      }
      // Use duration from input if set, otherwise use quiz's default duration
      if (durationMinutes !== null && durationMinutes > 0) {
        body.durationSeconds = durationMinutes * 60;
      } else if (selectedQuiz.durationSeconds !== null && selectedQuiz.durationSeconds > 0) {
        // Fallback to quiz's duration if no override
        body.durationSeconds = selectedQuiz.durationSeconds;
      }
      // Add buffer minutes for auto-end
      if (bufferMinutes > 0) {
        body.bufferMinutes = bufferMinutes;
      }
      // Add reviewDelayMinutes (null = không cho xem, số = phút sau khi session kết thúc)
      if (reviewDelayMinutes !== null) {
        body.reviewDelayMinutes = reviewDelayMinutes;
      } else {
        body.reviewDelayMinutes = null;
      }
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { sessionId?: string; error?: string };
      if (!res.ok || !json.sessionId) {
        setCreateSessionError(json.error ?? 'CREATE_SESSION_FAILED');
        return;
      }
      setShowCreateSessionModal(false);
      setSelectedQuizId('');
      setScheduledStartTime('');
      setDurationMinutes(null);
      setSessionName('');
      setBufferMinutes(5);
      setReviewDelayMinutes(null);
      setSelectedTags([]);
      setQuizSearchQuery('');
      setToast({ message: t('session_created_success'), type: 'success' });
      await loadSessions();
      setTimeout(() => {
        router.push(`/dashboard/sessions/${json.sessionId}/teacher`);
      }, 1000);
    } catch {
      setCreateSessionError(t('cannot_create_session'));
    } finally {
      setCreateSessionBusy(false);
    }
  }

  useEffect(() => {
    void Promise.all([loadClassInfo(), loadMembers(), loadSessions(), loadQuizzes(), loadTags()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  if (!classInfo) {
    return (
      <div className="space-y-7">
        <Card className="p-5 md:p-6">
          <div className="text-center text-text-muted">{t('loading')}</div>
        </Card>
      </div>
    );
  }

  const isOwner = classInfo.userRole === 'teacher';

  return (
    <div className="space-y-7 animate-fadeIn">
      {/* Breadcrumb */}
      <nav className="text-sm animate-slideUp">
        <div className="flex items-center gap-2 text-text-muted">
          <Link href="/dashboard" className="hover:text-text-heading transition-colors">
            {tClasses('breadcrumb_dashboard')}
          </Link>
          <span>·</span>
          <Link href="/dashboard/classes" className="hover:text-text-heading transition-colors">
            {tClasses('my_classes')}
          </Link>
          <span>·</span>
          <span className="text-text-heading">{classInfo.name}</span>
          <Badge variant="success" className="text-[10px] px-1.5 py-0.5 ml-2">
            {t('teacher')}
          </Badge>
        </div>
      </nav>

      {/* Class Header */}
      <ClassHeader
        classInfo={classInfo}
        isOwner={isOwner}
        onCreateSession={() => {
          setShowCreateSessionModal(true);
          // Set default start time when opening modal
          setScheduledStartTime(getRoundedTime(5));
        }}
      />

      {/* Stats Cards */}
      <StatsCards members={members} sessions={sessions} isOwner={isOwner} />

      {/* Tabs */}
      <Card className="p-5 md:p-6 animate-slideUp" style={{ animationDelay: '150ms' }}>
        <div className="flex gap-2 border-b border-border-subtle">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'members'
                ? 'border-b-2 border-primary text-text-heading'
                : 'text-text-muted hover:text-text-heading'
            }`}
            onClick={() => setActiveTab('members')}
          >
            {t('members')}
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'sessions'
                ? 'border-b-2 border-primary text-text-heading'
                : 'text-text-muted hover:text-text-heading'
            }`}
            onClick={() => setActiveTab('sessions')}
          >
            {t('sessions')}
          </button>
          {isOwner && (
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'border-b-2 border-primary text-text-heading'
                  : 'text-text-muted hover:text-text-heading'
              }`}
              onClick={() => setActiveTab('settings')}
            >
              {t('settings')}
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'members' && (
            <MembersList
              members={members}
              isOwner={isOwner}
              onAddMember={() => {
                // TODO: Implement add member
              }}
            />
          )}

          {activeTab === 'sessions' && (
            <SessionsList
              sessions={sessions}
              isStudent={false}
              onCreateSession={() => {
          setShowCreateSessionModal(true);
          // Set default start time when opening modal
          setScheduledStartTime(getRoundedTime(5));
        }}
            />
          )}

          {activeTab === 'settings' && isOwner && (
            <div className="space-y-4">
              <div className="rounded-md border border-border-subtle bg-bg-section p-4">
                <div className="text-sm font-medium text-text-heading">{t('class_code_label')}</div>
                <div className="mt-2 flex items-center gap-2">
                  <code className="rounded bg-bg-card px-3 py-2 font-mono text-sm">
                    {classInfo.classCode}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(classInfo.classCode);
                    }}
                  >
                    {t('copy')}
                  </Button>
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  {t('share_class_code_hint')}
                </div>
              </div>

              <Card className="p-5 md:p-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-heading">
                    {t('tags')}
                  </label>
                  <TagInput
                    value={tagsInput}
                    onChange={setTagsInput}
                    onSave={saveTags}
                    tags={tags}
                    showSaveButton={true}
                    disabled={tagsBusy}
                    placeholder={t('tags_placeholder')}
                  />
                  <p className="text-xs text-text-muted">
                    {t('tags_hint')}
                  </p>
                </div>
              </Card>

              <div className="rounded-md border border-dashed border-border-subtle p-4">
                <div className="text-sm font-medium text-text-heading">{t('danger_zone')}</div>
                <div className="mt-2 text-xs text-text-muted">
                  {t('danger_zone_hint')}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Create Session Modal */}
      {showCreateSessionModal && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-heading">{t('create_session')}</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateSessionModal(false);
                  setSelectedQuizId('');
                  setQuizSearchQuery('');
                  setSelectedTags([]);
                  setCreateSessionError(null);
                }}
                className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-heading"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
              {/* Left: Quiz List */}
              <div className={cn(
                'flex flex-col space-y-4',
                selectedQuizId ? 'w-1/3' : 'w-full',
                selectedQuizId && 'border-r border-border-subtle pr-6',
              )}
              >
                {quizzes.length === 0
                  ? (
                    <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border-subtle px-4 py-8 text-center text-sm text-text-muted">
                      <div>
                        <div>{t('no_quizzes_yet')}</div>
                        <div className="mt-2">
                          <Link href="/dashboard/quizzes">
                            <Button variant="primary" size="sm" className="hover:scale-105">
                              {t('create_new_quiz')}
                            </Button>
                          </Link>
                        </div>
                        </div>
                      </div>
                    )
                  : (
                    <>
                      {/* Search Input */}
                      <div>
                        <Input
                          type="text"
                          placeholder={t('search_quiz_placeholder')}
                          value={quizSearchQuery}
                          onChange={e => setQuizSearchQuery(e.target.value)}
                          className="w-full"
                        />
                      </div>

                      {/* Selected Tags Filter */}
                      {selectedTags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                          <span className="text-xs text-text-muted">{t('filter')}</span>
                          {selectedTags.map((tag, idx) => (
                            <Badge
                              key={idx}
                              variant="info"
                              className="text-xs cursor-pointer bg-primary/20 border-primary/40 hover:bg-primary/30"
                              onClick={(e) => {
                                e.preventDefault();
                                toggleTagFilter(tag);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  toggleTagFilter(tag);
                                }
                              }}
                              role="button"
                              tabIndex={0}
                            >
                              {tag}
                              {' '}
                              ×
                            </Badge>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-5 px-2 text-xs"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedTags([]);
                            }}
                          >
                            {t('clear')}
                          </Button>
                        </div>
                      )}

                      {/* Quiz List */}
                      <div className="flex-1 space-y-2 overflow-y-auto">
                        {quizzes
                          .filter(q => {
                            // Filter by search query
                            if (quizSearchQuery.trim()) {
                              const query = quizSearchQuery.toLowerCase();
                              const matchesSearch = q.title.toLowerCase().includes(query)
                                || q.tags?.some(t => t.name.toLowerCase().includes(query));
                              if (!matchesSearch) {
                                return false;
                              }
                            }
                            // Filter by selected tags (AND logic - quiz must have ALL selected tags)
                            if (selectedTags.length > 0) {
                              const quizTagNames = (q.tags || []).map(t => t.name.trim().toLowerCase());
                              const hasAllTags = selectedTags.every(selectedTag =>
                                quizTagNames.includes(selectedTag.toLowerCase())
                              );
                              if (!hasAllTags) {
                                return false;
                              }
                            }
                            return true;
                          })
                          .map(q => {
                            const isSelected = selectedQuizId === q.id;
                            return (
                              <button
                                key={q.id}
                                type="button"
                                onClick={() => {
                                  setSelectedQuizId(q.id);
                                  // Auto-set session name to quiz title (default)
                                  setSessionName(q.title);
                                  // Auto-set duration from quiz (always set when selecting a quiz)
                                  if (q.durationSeconds !== null) {
                                    setDurationMinutes(Math.floor(q.durationSeconds / 60));
                                  } else {
                                    setDurationMinutes(null);
                                  }
                                }}
                                className={cn(
                                  'w-full rounded-md border transition-all duration-200 text-left',
                                  isSelected
                                    ? 'border-primary bg-primary/10 hover:border-primary/70'
                                    : 'border-border-subtle bg-bg-section hover:border-primary/30 hover:translate-x-1 hover:shadow-md cursor-pointer',
                                )}
                              >
                                <div className="flex items-center justify-between gap-4 px-4 py-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className="truncate text-sm font-medium text-text-heading">
                            {q.title}
                                      </div>
                                      <Badge
                                        variant={q.status === 'published' ? 'success' : 'neutral'}
                                        className="text-xs shrink-0"
                                      >
                                        {q.status}
                                      </Badge>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      {q.tags && q.tags.length > 0
                                        ? (
                                            <>
                                              {q.tags.slice(0, 5).map((tag) => {
                                                const tagIsSelected = isTagSelected(tag.name);
                                                return (
                                                  <Badge
                                                    key={tag.id}
                                                    variant={tagIsSelected ? 'info' : 'neutral'}
                                                    className={`text-xs cursor-pointer transition-colors ${
                                                      tagIsSelected
                                                        ? 'bg-primary/20 border-primary/40 hover:bg-primary/30'
                                                        : 'hover:bg-primary/10'
                                                    }`}
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      toggleTagFilter(tag.name);
                                                    }}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        toggleTagFilter(tag.name);
                                                      }
                                                    }}
                                                    role="button"
                                                    tabIndex={0}
                                                  >
                                                    {tag.name}
                                                  </Badge>
                                                );
                                              })}
                                              {q.tags.length > 5 && (
                                                <Badge variant="neutral" className="text-xs">
                                                  +
                                                  {q.tags.length - 5}
                                                </Badge>
                                              )}
                                            </>
                                          )
                                        : (
                                            <span className="text-xs text-text-muted">{t('no_tags')}</span>
                                          )}
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                                      <span>
                                        {q.ruleCount}
                                        {' '}
                                        {t('rules')}
                                      </span>
                                      {q.durationSeconds !== null && (
                                        <span>
                                          ·
                                          {' '}
                                          {q.durationSeconds >= 3600
                                            ? `${Math.floor(q.durationSeconds / 3600)}h ${Math.floor((q.durationSeconds % 3600) / 60)}m`
                                            : `${Math.floor(q.durationSeconds / 60)} ${t('minutes')}`}
                                        </span>
                                      )}
                                      {q.ruleCount === 0 && (
                                        <Badge variant="neutral" className="text-xs bg-yellow-500/20 border-yellow-500/40 text-yellow-400">
                                          {t('no_rules_warning')}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="shrink-0">
                                    {isSelected
                                      ? (
                                          <div className="h-5 w-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center">
                                            <div className="h-2 w-2 rounded-full bg-white" />
                                          </div>
                                        )
                                      : (
                                          <div className="h-5 w-5 rounded-full border-2 border-border-strong" />
                                        )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </>
                  )}
              </div>

              {/* Right: Session Configuration - Show when quiz is selected */}
              {selectedQuizId && (
                <div className="w-2/3 space-y-4 overflow-y-auto pl-6">
                  {(() => {
                    const selectedQuiz = quizzes.find(q => q.id === selectedQuizId);
                    const quizDurationMinutes = selectedQuiz?.durationSeconds
                      ? Math.floor(selectedQuiz.durationSeconds / 60)
                      : null;
                    return (
                      <>
                        <div>
                          <label htmlFor="sessionName" className="mb-2 block text-sm font-medium text-text-heading">
                            {t('session_name')}
                          </label>
                          <Input
                            id="sessionName"
                            type="text"
                            value={sessionName}
                            onChange={e => setSessionName(e.target.value)}
                            placeholder={selectedQuiz?.title || t('session_name_placeholder')}
                            className="w-full"
                          />
                          <p className="mt-1 text-xs text-text-muted">
                            {t('session_name_hint')}
                          </p>
                        </div>

                        <div>
                          <label htmlFor="scheduledStartTime" className="mb-2 block text-sm font-medium text-text-heading">
                            {t('scheduled_start_time')}
                          </label>
                          <div className="space-y-2">
                            <Input
                              id="scheduledStartTime"
                              type="datetime-local"
                              value={scheduledStartTime || getRoundedTime(5)}
                              onChange={e => setScheduledStartTime(e.target.value)}
                              className="w-full"
                              min={new Date().toISOString().slice(0, 16)}
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setScheduledStartTime(getRoundedTime(5))}
                                className="text-xs"
                              >
                                {t('default_plus_5')}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setScheduledStartTime(getRoundedTime(15))}
                                className="text-xs"
                              >
                                {t('plus_15_minutes')}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setScheduledStartTime(getRoundedTime(30))}
                                className="text-xs"
                              >
                                {t('plus_30_minutes')}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setScheduledStartTime('')}
                                className="text-xs text-danger/80 hover:text-danger"
                              >
                                {t('remove')}
                              </Button>
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-text-muted">
                            {t('scheduled_start_time_hint')}
                          </p>
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <label htmlFor="durationMinutes" className="text-sm font-medium text-text-heading">
                              {t('duration_minutes')}
                            </label>
                            {quizDurationMinutes && (
                              <Badge variant="info" className="text-xs">
                                {t('quiz_duration', { 
                                  duration: quizDurationMinutes >= 60
                                    ? `${Math.floor(quizDurationMinutes / 60)}h ${quizDurationMinutes % 60 > 0 ? `${quizDurationMinutes % 60}m` : ''}`
                                    : `${quizDurationMinutes} ${t('minutes')}`
                                })}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <Input
                              id="durationMinutes"
                              type="number"
                              min={1}
                              max={1440}
                              value={durationMinutes ?? ''}
                              onChange={e => {
                                const val = e.target.value === '' ? null : Number(e.target.value);
                                setDurationMinutes(val);
                              }}
                              placeholder={quizDurationMinutes ? `${quizDurationMinutes} ${t('minutes')}` : t('unlimited')}
                              className="w-32"
                            />
                            <span className="text-sm text-text-muted">
                              {durationMinutes !== null && durationMinutes > 0
                                ? (
                                    <>
                                      (
                                      {durationMinutes >= 60
                                        ? `${Math.floor(durationMinutes / 60)} giờ ${durationMinutes % 60 > 0 ? `${durationMinutes % 60} ${t('minutes')}` : ''}`
                                        : `${durationMinutes} ${t('minutes')}`}
                                      )
                                    </>
                                  )
                                : quizDurationMinutes
                                  ? (
                                      <span className="text-text-muted">
                                        {t('using_default_from_quiz', {
                                          duration: quizDurationMinutes >= 60
                                            ? `${Math.floor(quizDurationMinutes / 60)}h ${quizDurationMinutes % 60}m`
                                            : `${quizDurationMinutes} ${t('minutes')}`
                                        })}
                                      </span>
                                    )
                                  : t('unlimited')}
                            </span>
                          </div>
                          {quizDurationMinutes && (
                            <p className="mt-1 text-xs text-text-muted">
                              {t('duration_hint_with_default')}
                            </p>
                          )}
                          {!quizDurationMinutes && (
                            <p className="mt-1 text-xs text-text-muted">
                              {t('duration_hint_no_default')}
                            </p>
                          )}
                        </div>

                        {durationMinutes && durationMinutes > 0 && (
                          <div>
                            <label htmlFor="bufferMinutes" className="mb-2 block text-sm font-medium text-text-heading">
                              {t('buffer_minutes')}
                            </label>
                            <div className="flex items-center gap-3">
                              <Input
                                id="bufferMinutes"
                                type="number"
                                min={0}
                                max={60}
                                value={bufferMinutes}
                                onChange={e => setBufferMinutes(Number(e.target.value))}
                                className="w-32"
                              />
                              <span className="text-sm text-text-muted">
                                {t('buffer_hint', { minutes: bufferMinutes })}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-text-muted">
                              {t('buffer_default_hint')}
                            </p>
                          </div>
                        )}

                        <div>
                          <label htmlFor="reviewDelayMinutes" className="mb-2 block text-sm font-medium text-text-heading">
                            {t('allow_review')}
                          </label>
                          <select
                            id="reviewDelayMinutes"
                            value={reviewDelayMinutes === null ? '' : reviewDelayMinutes}
                            onChange={e => setReviewDelayMinutes(e.target.value === '' ? null : Number(e.target.value))}
                            className="w-full rounded-md border border-border-subtle bg-bg-section px-3 py-2 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">{t('no_review')}</option>
                            <option value="10">{t('allow_review_10')}</option>
                            <option value="20">{t('allow_review_20')}</option>
                            <option value="30">{t('allow_review_30')}</option>
                            <option value="60">{t('allow_review_60')}</option>
                          </select>
                          <p className="mt-1 text-xs text-text-muted">
                            {reviewDelayMinutes === null
                              ? t('no_review_hint')
                              : t('review_hint', { minutes: reviewDelayMinutes })}
                          </p>
                        </div>
                      </>
                    );
                  })()}

                  {createSessionError && (
                    <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                      {createSessionError}
                    </div>
                  )}

                  <div className="flex gap-2 border-t border-border-subtle pt-4">
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={() => {
                        setShowCreateSessionModal(false);
                        setSelectedQuizId('');
                        setQuizSearchQuery('');
                        setSelectedTags([]);
                        setScheduledStartTime('');
                        setDurationMinutes(null);
                        setSessionName('');
                        setBufferMinutes(5);
                        setReviewDelayMinutes(null);
                        setCreateSessionError(null);
                      }}
                    >
                      {t('cancel')}
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-1"
                      disabled={createSessionBusy || !selectedQuizId}
                      onClick={() => void createSession()}
                    >
                      {createSessionBusy ? t('creating') : t('create_session_button')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

