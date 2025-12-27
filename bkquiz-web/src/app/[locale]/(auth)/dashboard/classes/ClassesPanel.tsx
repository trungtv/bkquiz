'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { TagFilter } from '@/components/ui/TagFilter';
import { Toast } from '@/components/ui/Toast';

type ClassroomLite = {
  id: string;
  name: string;
  classCode: string;
  createdAt: string;
  ownerTeacherId: string;
  roleInClass: 'student' | 'ta' | 'teacher';
  joinedAt: string;
  memberCount: number;
  tags?: Array<{ id: string; name: string; normalizedName: string }>;
};

type ClassesPanelProps = {
  role: 'teacher' | 'student';
};

export function ClassesPanel(props: ClassesPanelProps) {
  const { role } = props;
  const t = useTranslations('Classes');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [classes, setClasses] = useState<ClassroomLite[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [tagFilter, setTagFilter] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [pendingClassCode, setPendingClassCode] = useState<string | null>(null);
  const [classPreview, setClassPreview] = useState<{
    id: string;
    name: string;
    classCode: string;
    ownerTeacher: { name: string | null; email: string | null };
    memberCount: number;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Parse tag filter thành array
  const activeFilterTags = useMemo(() => {
    if (!tagFilter.trim()) return [];
    return tagFilter.split(',').map(t => t.trim()).filter(Boolean);
  }, [tagFilter]);

  // Helper function để toggle tag trong filter
  const toggleTagFilter = (tagName: string) => {
    const normalizedTagName = tagName.trim();
    const currentTags = activeFilterTags;
    const isSelected = currentTags.some(t => t.toLowerCase() === normalizedTagName.toLowerCase());

    if (isSelected) {
      // Remove tag nếu đã được chọn
      const newTags = currentTags.filter(t => t.toLowerCase() !== normalizedTagName.toLowerCase());
      setTagFilter(newTags.join(', '));
    } else {
      // Add tag nếu chưa được chọn
      const newTags = [...currentTags, normalizedTagName];
      setTagFilter(newTags.join(', '));
    }
  };

  // Check nếu tag đang được filter
  const isTagSelected = (tagName: string) => {
    return activeFilterTags.some(t => t.toLowerCase() === tagName.trim().toLowerCase());
  };

  const stats = useMemo(() => {
    const owned = classes.filter(c => c.roleInClass === 'teacher').length;
    const joined = classes.filter(c => c.roleInClass !== 'teacher').length;
    return { total: classes.length, owned, joined };
  }, [classes]);

  async function load() {
    const url = new URL('/api/classes', window.location.origin);
    if (tagFilter.trim()) {
      url.searchParams.set('tags', tagFilter.trim());
    }
    try {
      const res = await fetch(url.toString(), { method: 'GET' });
    if (!res.ok) {
        const text = await res.text();
        let json: { classes?: ClassroomLite[]; error?: string };
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
      let json: { classes?: ClassroomLite[]; error?: string };
      try {
        json = JSON.parse(text);
      } catch (err) {
        setError('LOAD_FAILED: Invalid JSON response');
        console.error('Failed to parse response:', text, err);
        return;
      }
    setError(null);
    setClasses(json.classes ?? []);
    } catch (err) {
      setError(`LOAD_FAILED: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Error loading classes:', err);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagFilter]);

  async function createClass() {
    if (newClassName.trim().length === 0) {
      setError(t('please_enter_class_name'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newClassName }),
      });
      const json = await res.json() as { id?: string; error?: string };
      if (!res.ok || !json.id) {
        setError(json.error ?? 'CREATE_FAILED');
        return;
      }
      setNewClassName('');
      setToast({ message: t('class_created_success'), type: 'success' });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function joinClass(code?: string) {
    const codeToJoin = code || joinCode.trim();
    if (codeToJoin.length === 0) {
      setError('Vui lòng nhập class code');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ classCode: codeToJoin }),
      });
      const text = await res.text();
      if (!text) {
        setError('JOIN_FAILED: Empty response');
        return;
      }
      let json: { id?: string; error?: string };
      try {
        json = JSON.parse(text);
      } catch (err) {
        setError('JOIN_FAILED: Invalid JSON response');
        console.error('Failed to parse response:', text, err);
        return;
      }
      if (!res.ok || !json.id) {
        setError(json.error ?? 'JOIN_FAILED');
        return;
      }
      setJoinCode('');
      setToast({ message: t('class_joined_success'), type: 'success' });
      await load();
      // Redirect to class detail page
      if (json.id) {
        setTimeout(() => {
          router.push(`/dashboard/classes/${json.id}`);
        }, 1000);
      }
      return json.id;
    } finally {
      setBusy(false);
    }
  }

  // Fetch class preview when join param is present
  async function fetchClassPreview(classCode: string) {
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/classes/preview?classCode=${encodeURIComponent(classCode)}`);
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        setError(json.error ?? 'CLASS_NOT_FOUND');
        setShowJoinModal(false);
        setPendingClassCode(null);
        // Clear query param on error
        router.replace('/dashboard/classes');
        return;
      }
      const preview = await res.json() as {
        id: string;
        name: string;
        classCode: string;
        ownerTeacher: { name: string | null; email: string | null };
        memberCount: number;
      };
      setClassPreview(preview);
      setShowJoinModal(true);
    } catch (err) {
      setError(`PREVIEW_FAILED: ${err instanceof Error ? err.message : String(err)}`);
      setShowJoinModal(false);
      setPendingClassCode(null);
      router.replace('/dashboard/classes');
    } finally {
      setLoadingPreview(false);
    }
  }

  // Show join confirmation modal when join param is present
  useEffect(() => {
    const joinParam = searchParams.get('join');
    if (joinParam && !showJoinModal && !pendingClassCode) {
      setPendingClassCode(joinParam);
      void fetchClassPreview(joinParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleConfirmJoin() {
    if (!pendingClassCode) {
      return;
    }
    setShowJoinModal(false);
    const classId = await joinClass(pendingClassCode);
    setPendingClassCode(null);
    setClassPreview(null);
    if (classId) {
      // Clear query param
      router.replace('/dashboard/classes');
    }
  }

  function handleCancelJoin() {
    setShowJoinModal(false);
    setPendingClassCode(null);
    setClassPreview(null);
    // Clear query param
    router.replace('/dashboard/classes');
  }

  return (
    <div className="space-y-7">
      {/* Breadcrumb */}
      <nav className="text-sm animate-fadeIn">
        <div className="flex items-center gap-2 text-text-muted">
          <Link href="/dashboard" className="hover:text-text-heading transition-colors">
            Dashboard
          </Link>
          <span>·</span>
          <span className="text-text-heading">Classes</span>
          <Badge
            variant={role === 'teacher' ? 'success' : 'info'}
            className="text-[10px] px-1.5 py-0.5 ml-2"
          >
            {role === 'teacher' ? 'Teacher' : 'Student'}
          </Badge>
        </div>
      </nav>

      {/* Header */}
      <Card className="p-5 md:p-6 animate-slideUp">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-text-heading">Classes</h1>
            <div className="mt-1 text-sm text-text-muted">
              {role === 'teacher'
                ? t('manage_your_classes')
                : t('classes_you_joined')}
            </div>
          </div>
        </div>

        {role === 'teacher'
          ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm" htmlFor="newClassName">
                  <div className="font-medium text-text-muted">{t('create_new_class')}</div>
                  <div className="flex gap-2">
                    <Input
                      id="newClassName"
                      className="w-full"
                      placeholder="VD: Toán 10A"
                      value={newClassName}
                      onChange={e => setNewClassName(e.target.value)}
                      disabled={busy}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          void createClass();
                        }
                      }}
                    />
                    <Button
                      variant="primary"
                      disabled={busy || newClassName.trim().length === 0}
                      onClick={() => void createClass()}
                      className="hover:scale-105"
                    >
                      Tạo
                    </Button>
                  </div>
                </label>

                <label className="grid gap-1 text-sm" htmlFor="joinCode">
                  <div className="font-medium text-text-muted">{t('join_class_by_code')}</div>
                  <div className="flex gap-2">
                    <Input
                      id="joinCode"
                      className="w-full"
                      placeholder="VD: ABC123"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      disabled={busy}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          void joinClass();
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      disabled={busy || joinCode.trim().length === 0}
                      onClick={() => void joinClass()}
                      className="hover:scale-105"
                    >
                      Join
                    </Button>
                  </div>
                </label>
              </div>
            )
          : (
              <div className="mt-4">
                <label className="grid gap-1 text-sm" htmlFor="joinCode">
                  <div className="font-medium text-text-muted">{t('join_class_by_code')}</div>
                  <div className="flex gap-2">
                    <Input
                      id="joinCode"
                      className="w-full"
                      placeholder="VD: ABC123"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      disabled={busy}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          void joinClass();
                        }
                      }}
                    />
                    <Button
                      variant="primary"
                      disabled={busy || joinCode.trim().length === 0}
                      onClick={() => void joinClass()}
                      className="bg-indigo-500 hover:bg-indigo-600 hover:scale-105"
                    >
                      Join
                    </Button>
                  </div>
                </label>
              </div>
            )}

        {error
          ? (
              <div className="mt-3 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                {error}
              </div>
            )
          : null}
      </Card>

      {/* Stats Cards */}
      {classes.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3 animate-slideUp" style={{ animationDelay: '50ms' }}>
          <Card className="p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
            <div className="text-xs text-text-muted">{t('total_classes')}</div>
            <div className="mt-1 text-2xl font-semibold text-text-heading">{stats.total}</div>
          </Card>
          {role === 'teacher'
            ? (
                <>
                  <Card className="p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
                    <div className="text-xs text-text-muted">Lớp bạn tạo</div>
                    <div className="mt-1 text-2xl font-semibold text-text-heading">{stats.owned}</div>
                  </Card>
                  <Card className="p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
                    <div className="text-xs text-text-muted">Lớp đã join</div>
                    <div className="mt-1 text-2xl font-semibold text-text-heading">{stats.joined}</div>
                  </Card>
                </>
              )
            : (
                <>
                  <Card className="p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg border-indigo-500/20">
                    <div className="text-xs text-text-muted">Active Sessions</div>
                    <div className="mt-1 text-2xl font-semibold text-indigo-400">
                      {classes.filter(c => c.roleInClass !== 'teacher').length}
                    </div>
                  </Card>
                  <Card className="p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg border-indigo-500/20">
                    <div className="text-xs text-text-muted">Total Members</div>
                    <div className="mt-1 text-2xl font-semibold text-indigo-400">
                      {classes.reduce((sum, c) => sum + c.memberCount, 0)}
                    </div>
                  </Card>
                </>
              )}
        </div>
      )}

      {/* Tag Filter */}
      <Card className="p-5 md:p-6">
        <TagFilter
          value={tagFilter}
          onChange={setTagFilter}
          onClear={() => setTagFilter('')}
        />
      </Card>

      {/* Classes List */}
      <Card className="p-5 md:p-6 animate-slideUp" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-text-heading">
              {t('my_classes')}
            </div>
            <div className="mt-1 text-sm text-text-muted">
              {t('classes_count', { count: classes.length })}
            </div>
          </div>
        </div>

        {classes.length === 0
          ? (
              <div className="mt-6 rounded-md border border-dashed border-border-subtle px-4 py-8 text-center">
                <div className="text-sm text-text-muted">
                  {t('no_classes_yet')}
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  {role === 'teacher'
                    ? t('create_or_join_hint_teacher')
                    : t('create_or_join_hint_student')}
                </div>
              </div>
            )
          : (
              <div className="mt-4 space-y-3">
                {classes.map((c, idx) => (
                  <Link key={c.id} href={`/dashboard/classes/${c.id}`}>
                    <div
                      className="rounded-md border border-border-subtle bg-bg-section transition-all duration-200 hover:translate-x-1 hover:shadow-md hover:border-primary/30"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <div className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_auto_auto] items-center gap-4 md:grid-cols-[2fr_auto_120px_100px]">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-text-heading">{c.name}</div>
                            <div className="mt-1 text-xs text-text-muted">
                              {c.memberCount}
                              {' '}
                              thành viên
                            </div>
                          </div>
                          {c.tags && c.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              {c.tags.slice(0, 5).map((tag) => {
                                const isSelected = isTagSelected(tag.name);
                                return (
                                  <Badge
                                    key={tag.id}
                                    variant={isSelected ? 'info' : 'neutral'}
                                    className={`text-xs cursor-pointer transition-colors ${
                                      isSelected
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
                              {c.tags.length > 5 && (
                                <Badge variant="neutral" className="text-xs">
                                  +
                                  {c.tags.length - 5}
                                </Badge>
                              )}
                            </div>
                          )}
                          <Badge
                            variant={c.roleInClass === 'teacher' ? 'success' : (c.roleInClass === 'ta' ? 'info' : 'neutral')}
                            className="text-xs"
                          >
                            {c.roleInClass === 'teacher' ? 'Owner' : (c.roleInClass === 'ta' ? 'TA' : 'Student')}
                          </Badge>
                          <div className="text-xs text-text-muted">
                            <span className="font-mono">{c.classCode}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted">→</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
      </Card>

      {/* Join Confirmation Modal */}
      {showJoinModal && classPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-6 animate-slideUp">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-text-heading mb-2">
                {t('confirm_join_class')}
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-text-muted">{t('class_name')}</div>
                  <div className="font-semibold text-text-heading">{classPreview.name}</div>
                </div>
                <div>
                  <div className="text-text-muted">{t('class_code')}</div>
                  <div className="font-mono font-semibold text-text-heading">{classPreview.classCode}</div>
                </div>
                <div>
                  <div className="text-text-muted">Giảng viên:</div>
                  <div className="font-semibold text-text-heading">
                    {classPreview.ownerTeacher.name || classPreview.ownerTeacher.email || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-text-muted">Số thành viên:</div>
                  <div className="font-semibold text-text-heading">{classPreview.memberCount}</div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={handleCancelJoin}
                disabled={busy}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-indigo-500 hover:bg-indigo-600"
                onClick={() => void handleConfirmJoin()}
                disabled={busy}
              >
                {busy ? 'Đang tham gia...' : 'Đồng ý tham gia'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Loading overlay when fetching preview */}
      {loadingPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="p-6">
            <div className="text-center">
              <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <div className="text-sm text-text-muted">{t('loading_class_info')}</div>
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
