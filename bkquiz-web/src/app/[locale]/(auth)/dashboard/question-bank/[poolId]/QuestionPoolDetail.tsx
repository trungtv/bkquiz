'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MathRenderer } from '@/components/MathRenderer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import { TagInput } from '@/components/ui/TagInput';
import { generateQuestionMarkdown } from '@/server/export/markdownPool';

type Pool = {
  id: string;
  name: string;
  visibility: 'private' | 'shared';
  updatedAt: string | Date;
  permission?: 'view' | 'use' | 'edit';
  questionCount?: number;
  tagCount?: number;
};

type Question = {
  id: string;
  type: 'mcq_single' | 'mcq_multi';
  prompt: string;
  createdAt: string | Date;
  options: Array<{ order: number; content: string; isCorrect: boolean }>;
  tags: Array<{ name: string; normalizedName: string }>;
};

type Share = {
  permission: 'view' | 'use' | 'edit';
  createdAt: string | Date;
  sharedWith: { id: string; email: string | null; name: string | null };
};

type QuestionOption = {
  content: string;
  isCorrect: boolean;
};

export function QuestionPoolDetail(props: { poolId: string; userId: string | null }) {
  const t = useTranslations('QuestionBank.detail');
  const tQB = useTranslations('QuestionBank');
  const [pool, setPool] = useState<Pool | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [qType, setQType] = useState<'mcq_single' | 'mcq_multi'>('mcq_single');
  const [qPrompt, setQPrompt] = useState('');
  const [qTags, setQTags] = useState('');
  const [qOptions, setQOptions] = useState<QuestionOption[]>([
    { content: '', isCorrect: false },
    { content: '', isCorrect: false },
  ]);

  // Edit pool state
  const [showEditPool, setShowEditPool] = useState(false);
  const [editPoolName, setEditPoolName] = useState('');
  const [editPoolVisibility, setEditPoolVisibility] = useState<'private' | 'shared'>('private');

  // Markdown editor state (for pool export/import)
  const [showMarkdownEditor, setShowMarkdownEditor] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [markdownBusy, setMarkdownBusy] = useState(false);

  // Question markdown editor state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionMarkdown, setQuestionMarkdown] = useState('');
  const [questionMarkdownBusy, setQuestionMarkdownBusy] = useState(false);

  // Share state
  const [shareEmail, setShareEmail] = useState('');
  const [sharePerm, setSharePerm] = useState<'view' | 'use' | 'edit'>('use');

  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // Pool tags state
  const [poolTagsInput, setPoolTagsInput] = useState('');
  const [poolTags, setPoolTags] = useState<Array<{ id: string; name: string; normalizedName: string }>>([]);
  const [poolTagsBusy, setPoolTagsBusy] = useState(false);

  const filteredQuestions = useMemo(() => {
    let filtered = questions;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q =>
        q.prompt.toLowerCase().includes(query)
        || q.tags.some(t => t.name.toLowerCase().includes(query)),
      );
    }
    if (filterTag) {
      filtered = filtered.filter(q => q.tags.some(t => t.normalizedName === filterTag));
    }
    return filtered;
  }, [questions, searchQuery, filterTag]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    questions.forEach((q) => {
      q.tags.forEach(t => tagSet.add(t.normalizedName));
    });
    return Array.from(tagSet).sort();
  }, [questions]);

  async function loadAll() {
    setError(null);
    const [p, q, s] = await Promise.all([
      fetch(`/api/pools/${props.poolId}`).then(r => r.json()),
      fetch(`/api/pools/${props.poolId}/questions`).then(r => r.json()),
      fetch(`/api/pools/${props.poolId}/share`).then(async r => (r.ok ? r.json() : ({ shares: [] }))),
    ]);
    if (p?.error) {
      setError(p.error);
      return;
    }
    setPool(p);
    setQuestions(q.questions ?? []);
    setShares(s.shares ?? []);
    if (p && !showEditPool) {
      setEditPoolName(p.name);
      setEditPoolVisibility(p.visibility);
    }
  }

  async function loadPoolTags() {
    try {
      const res = await fetch(`/api/pools/${props.poolId}/tags`);
      const json = await res.json() as { tags?: Array<{ id: string; name: string; normalizedName: string }>; error?: string };
      if (res.ok) {
        setPoolTags(json.tags ?? []);
        setPoolTagsInput(json.tags?.map(t => t.name).join(', ') ?? '');
      }
    } catch (err) {
      console.error('Error loading pool tags:', err);
    }
  }

  async function savePoolTags() {
    setPoolTagsBusy(true);
    try {
      const res = await fetch(`/api/pools/${props.poolId}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: poolTagsInput }),
      });
      const json = await res.json() as { tags?: Array<{ id: string; name: string; normalizedName: string }>; error?: string };
      if (res.ok) {
        setPoolTags(json.tags ?? []);
        setToast({ message: t('tags_saved_success'), type: 'success' });
      } else {
        setToast({ message: json.error ?? t('error_saving_tags'), type: 'error' });
      }
    } catch (err) {
      console.error('Error saving pool tags:', err);
      setToast({ message: t('error_saving_tags'), type: 'error' });
    } finally {
      setPoolTagsBusy(false);
    }
  }

  useEffect(() => {
    void loadAll();
    void loadPoolTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.poolId]);

  async function addQuestion() {
    setBusy(true);
    setError(null);
    try {
      const validOptions = qOptions.filter(o => o.content.trim());
      if (validOptions.length < 2) {
        setError(t('need_at_least_2_options'));
        return;
      }
      const correctCount = validOptions.filter(o => o.isCorrect).length;
      if (qType === 'mcq_single' && correctCount !== 1) {
        setError(t('mcq_single_needs_1_correct'));
        return;
      }
      if (qType === 'mcq_multi' && correctCount < 1) {
        setError(t('mcq_multi_needs_at_least_1_correct'));
        return;
      }
      const res = await fetch(`/api/pools/${props.poolId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: qType,
          prompt: qPrompt.trim(),
          options: validOptions.map(o => ({ content: o.content.trim(), isCorrect: o.isCorrect })),
          tags: qTags.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'ADD_FAILED');
        return;
      }
      // Reset form
      setQPrompt('');
      setQTags('');
      setQOptions([
        { content: '', isCorrect: false },
        { content: '', isCorrect: false },
      ]);
      setShowAddForm(false);
      setToast({ message: t('question_added_success'), type: 'success' });
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  async function deleteQuestion(questionId: string) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(t('confirm_delete_question'))) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/questions/${questionId}`, { method: 'DELETE' });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'DELETE_FAILED');
        setToast({ message: t('cannot_delete_question'), type: 'error' });
        return;
      }
      setToast({ message: t('question_deleted_success'), type: 'success' });
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  function openQuestionMarkdownEditor(question: Question) {
    const markdown = generateQuestionMarkdown({
      type: question.type,
      prompt: question.prompt,
      options: question.options,
      tags: question.tags.map(t => ({ name: t.name })),
    });
    setQuestionMarkdown(markdown);
    setEditingQuestionId(question.id);
  }

  async function updateQuestionFromMarkdown() {
    if (!editingQuestionId) {
      return;
    }

    setQuestionMarkdownBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/questions/${editingQuestionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: questionMarkdown }),
      });
      const data = await res.json() as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? data.message ?? 'UPDATE_FAILED');
        setToast({ message: t('cannot_update_question'), type: 'error' });
        return;
      }
      setToast({ message: t('question_updated_success'), type: 'success' });
      setEditingQuestionId(null);
      setQuestionMarkdown('');
      await loadAll();
    } finally {
      setQuestionMarkdownBusy(false);
    }
  }

  async function updatePool() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pools/${props.poolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editPoolName.trim(),
          visibility: editPoolVisibility,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'UPDATE_FAILED');
        return;
      }
      setShowEditPool(false);
      setToast({ message: t('pool_updated_success'), type: 'success' });
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  async function sharePool() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pools/${props.poolId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: shareEmail, permission: sharePerm }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'SHARE_FAILED');
        return;
      }
      setShareEmail('');
      setToast({ message: t('share_pool_success'), type: 'success' });
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  async function unsharePool(email: string) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(t('confirm_unshare'))) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pools/${props.poolId}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'UNSHARE_FAILED');
        setToast({ message: t('cannot_unshare'), type: 'error' });
        return;
      }
      setToast({ message: t('unshare_success'), type: 'success' });
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  function addOption() {
    setQOptions([...qOptions, { content: '', isCorrect: false }]);
  }

  function removeOption(index: number) {
    if (qOptions.length <= 2) {
      return;
    }
    setQOptions(qOptions.filter((_, i) => i !== index));
  }

  function updateOption(index: number, field: 'content' | 'isCorrect', value: string | boolean) {
    const newOptions = [...qOptions];
    if (field === 'content') {
      newOptions[index] = { content: value as string, isCorrect: newOptions[index]?.isCorrect ?? false };
    } else {
      newOptions[index] = { content: newOptions[index]?.content ?? '', isCorrect: value as boolean };
    }
    setQOptions(newOptions);
  }

  async function exportMarkdown() {
    setMarkdownBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pools/${props.poolId}/export`);
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'EXPORT_FAILED');
        setToast({ message: t('cannot_export_markdown'), type: 'error' });
        return;
      }
      const text = await res.text();
      setMarkdownContent(text);
      setShowMarkdownEditor(true);
      setToast({ message: t('markdown_loaded_success'), type: 'success' });
    } finally {
      setMarkdownBusy(false);
    }
  }

  async function downloadMarkdown() {
    setMarkdownBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pools/${props.poolId}/export`);
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'EXPORT_FAILED');
        setToast({ message: t('cannot_export_markdown'), type: 'error' });
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pool?.name.replace(/[^a-z0-9]/gi, '_') || 'pool'}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setToast({ message: t('markdown_file_downloaded'), type: 'success' });
    } finally {
      setMarkdownBusy(false);
    }
  }

  async function importMarkdown() {
    if (!markdownContent.trim()) {
      setError(t('markdown_content_empty'));
      return;
    }
    setMarkdownBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      const blob = new Blob([markdownContent], { type: 'text/markdown' });
      formData.append('file', blob, 'questions.md');
      formData.append('poolId', props.poolId);

      const res = await fetch('/api/pools/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json() as { error?: string; importedQuestions?: number };
      if (!res.ok) {
        setError(data.error ?? 'IMPORT_FAILED');
        setToast({ message: t('cannot_import_markdown'), type: 'error' });
        return;
      }
      setToast({ message: t('imported_questions_success', { count: data.importedQuestions ?? 0 }), type: 'success' });
      setShowMarkdownEditor(false);
      setMarkdownContent('');
      await loadAll();
    } finally {
      setMarkdownBusy(false);
    }
  }

  const canEdit = pool?.permission === 'edit';
  const formatDate = (date: string | Date | undefined) => {
    if (!date) {
      return '';
    }
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Breadcrumb */}
      <nav className="text-sm text-text-muted">
        <Link href="/dashboard" className="hover:text-text-heading transition-colors">
          {tQB('breadcrumb_dashboard')}
        </Link>
        <span className="mx-2">·</span>
        <Link href="/dashboard/question-bank" className="hover:text-text-heading transition-colors">
          {tQB('title')}
        </Link>
        <span className="mx-2">·</span>
        <span className="text-text-heading">{pool?.name || t('loading')}</span>
      </nav>

      {/* Pool Header */}
      <Card className="p-5 md:p-6">
        {pool
          ? (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {showEditPool
                      ? (
                          <div className="space-y-3">
                            <Input
                              value={editPoolName}
                              onChange={e => setEditPoolName(e.target.value)}
                              placeholder={tQB('pool_name_placeholder')}
                              disabled={busy}
                            />
                            <select
                              value={editPoolVisibility}
                              onChange={e => setEditPoolVisibility(e.target.value as 'private' | 'shared')}
                              className="rounded-sm border border-border-subtle bg-bg-section px-3 py-2 text-sm text-text-body"
                              disabled={busy}
                            >
                              <option value="private">{t('private')}</option>
                              <option value="shared">{t('shared')}</option>
                            </select>
                            <div className="flex gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={updatePool}
                                disabled={busy || !editPoolName.trim()}
                              >
                                {t('save')}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setShowEditPool(false);
                                  setEditPoolName(pool.name);
                                  setEditPoolVisibility(pool.visibility);
                                }}
                                disabled={busy}
                              >
                                {tQB('cancel')}
                              </Button>
                            </div>
                          </div>
                        )
                      : (
                          <>
                            <h1 className="text-2xl font-semibold text-text-heading">{pool.name}</h1>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-muted">
                              <Badge variant="neutral">{pool.visibility}</Badge>
                              {pool.permission && (
                                <Badge variant="info">{pool.permission}</Badge>
                              )}
                              <span>
                                {pool.questionCount ?? 0}
                                {' '}
                                {t('questions')}
                              </span>
                              <span>·</span>
                              <span>
                                {pool.tagCount ?? 0}
                                {' '}
                                {t('tags')}
                              </span>
                              <span>·</span>
                              <span>
                                {t('updated')}
                                {' '}
                                {formatDate(pool.updatedAt)}
                              </span>
                            </div>
                          </>
                        )}
                  </div>
                  <div className="flex gap-2">
                    {!showEditPool && canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowEditPool(true)}
                      >
                        {t('edit_pool')}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={exportMarkdown}
                      disabled={markdownBusy}
                    >
                      {markdownBusy ? t('downloading') : t('export_markdown')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={downloadMarkdown}
                      disabled={markdownBusy}
                    >
                      {markdownBusy ? t('downloading') : t('download_md_file')}
                    </Button>
                  </div>
                </div>
              </>
            )
          : (
              <div className="text-text-muted">{t('loading')}</div>
            )}
        {error
          ? (
              <div className="mt-3 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                {error}
              </div>
            )
          : null}
      </Card>

      {/* Markdown Editor */}
      {showMarkdownEditor && (
        <Card className="p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-heading">{t('edit_markdown')}</h2>
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={importMarkdown}
                  disabled={markdownBusy || !markdownContent.trim()}
                >
                  {markdownBusy ? t('importing_markdown') : t('import_again')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowMarkdownEditor(false);
                  setMarkdownContent('');
                }}
                disabled={markdownBusy}
              >
                {t('close')}
              </Button>
            </div>
          </div>
          <div className="text-sm text-text-muted mb-2">
            {t('edit_markdown_hint')}
          </div>
          <textarea
            value={markdownContent}
            onChange={e => setMarkdownContent(e.target.value)}
            className="w-full min-h-[400px] rounded-sm border border-border-subtle bg-bg-section px-3 py-2 font-mono text-sm text-text-body"
            placeholder={t('markdown_content_placeholder')}
            disabled={markdownBusy}
          />
          <div className="mt-2 text-xs text-text-muted">
            {t('markdown_tip')}
          </div>
        </Card>
      )}

      {/* Question Markdown Editor */}
      {editingQuestionId && (
        <Card className="mt-4 p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-heading">{t('edit_question_markdown')}</h2>
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={updateQuestionFromMarkdown}
                  disabled={questionMarkdownBusy || !questionMarkdown.trim()}
                >
                  {questionMarkdownBusy ? t('updating') : t('update')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingQuestionId(null);
                  setQuestionMarkdown('');
                }}
              >
                {t('close')}
              </Button>
            </div>
          </div>
          <div className="mb-2 text-sm text-text-muted">
            {t('edit_question_hint')}
          </div>
          <textarea
            value={questionMarkdown}
            onChange={e => setQuestionMarkdown(e.target.value)}
            className="w-full min-h-[300px] rounded-sm border border-border-subtle bg-bg-section px-3 py-2 font-mono text-sm text-text-body"
            placeholder={t('question_markdown_placeholder')}
          />
        </Card>
      )}

      {/* Questions Section */}
      <Card className="p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-heading">
              {t('questions_section', { count: filteredQuestions.length })}
            </h2>
            <div className="mt-1 text-sm text-text-muted">
              {t('total_questions', { count: questions.length })}
            </div>
          </div>
          {canEdit && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? t('close_form') : t('add_question')}
            </Button>
          )}
        </div>

        {/* Search and Filter */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder={t('search_questions_placeholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          {allTags.length > 0 && (
            <select
              value={filterTag || ''}
              onChange={e => setFilterTag(e.target.value || null)}
              className="rounded-sm border border-border-subtle bg-bg-section px-3 py-2 text-sm text-text-body"
            >
              <option value="">{t('all_tags')}</option>
              {allTags.map((tagNorm) => {
                const tag = questions.find(q => q.tags.some(t => t.normalizedName === tagNorm))?.tags.find(t => t.normalizedName === tagNorm);
                return (
                  <option key={tagNorm} value={tagNorm}>
                    {tag?.name || tagNorm}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        {/* Add Question Form */}
        {showAddForm && canEdit && (
          <Card className="mt-4 border-dashed bg-bg-section p-4">
            <div className="mb-4 text-sm font-medium text-text-heading">{t('add_new_question')}</div>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-text-heading">{t('type')}</span>
                  <select
                    className="rounded-sm border border-border-subtle bg-bg-section px-3 py-2 text-sm text-text-body"
                    value={qType}
                    onChange={e => setQType(e.target.value as 'mcq_single' | 'mcq_multi')}
                    disabled={busy}
                  >
                    <option value="mcq_single">mcq_single</option>
                    <option value="mcq_multi">mcq_multi</option>
                  </select>
                </label>
                <div className="grid gap-1 text-sm">
                  <label htmlFor="q-tags" className="font-medium text-text-heading">{t('tags_comma_separated')}</label>
                  <Input
                    id="q-tags"
                    value={qTags}
                    onChange={e => setQTags(e.target.value)}
                    placeholder={t('tags_placeholder')}
                    disabled={busy}
                  />
                </div>
              </div>

              <label className="grid gap-1 text-sm">
                <span className="font-medium text-text-heading">{t('prompt')}</span>
                <textarea
                  className="min-h-24 rounded-sm border border-border-subtle bg-bg-section px-3 py-2 text-sm text-text-body"
                  value={qPrompt}
                  onChange={e => setQPrompt(e.target.value)}
                  disabled={busy}
                  placeholder={t('question_placeholder')}
                />
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-heading">{t('options')}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addOption}
                    disabled={busy || qOptions.length >= 12}
                  >
                    {t('add_option')}
                  </Button>
                </div>
                {qOptions.map((opt, idx) => {
                  const optionKey = `opt-${idx}-${opt.content.slice(0, 10)}`;
                  return (
                    <div key={optionKey} className="flex items-center gap-2">
                      <Input
                        value={opt.content}
                        onChange={e => updateOption(idx, 'content', e.target.value)}
                        placeholder={t('option_placeholder', { number: idx + 1 })}
                        disabled={busy}
                        className="flex-1"
                      />
                      {qType === 'mcq_multi' && (
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={opt.isCorrect}
                            onChange={e => updateOption(idx, 'isCorrect', e.target.checked)}
                            disabled={busy}
                            className="rounded border-border-subtle"
                          />
                          <span className="text-text-muted">{t('correct')}</span>
                        </label>
                      )}
                      {qType === 'mcq_single' && (
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="correct-option"
                            checked={opt.isCorrect}
                            onChange={() => {
                              setQOptions(qOptions.map((o, i) => ({ ...o, isCorrect: i === idx })));
                            }}
                            disabled={busy}
                          />
                          <span className="text-text-muted">{t('correct')}</span>
                        </label>
                      )}
                      {qOptions.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(idx)}
                          disabled={busy}
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={addQuestion}
                disabled={busy || !qPrompt.trim()}
              >
                {busy ? t('saving') : t('add_question')}
              </Button>
            </div>
        </Card>
      )}

      {/* Pool Tags Section */}
      {pool && canEdit && (
        <Card className="p-5 md:p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-heading">
              {t('pool_tags')}
            </label>
            <TagInput
              value={poolTagsInput}
              onChange={setPoolTagsInput}
              onSave={savePoolTags}
              tags={poolTags}
              showSaveButton={true}
              disabled={poolTagsBusy}
              placeholder={t('pool_tags_placeholder')}
            />
            </div>
          </Card>
        )}

        {/* Questions List */}
        <div className="mt-4 space-y-3">
          {filteredQuestions.length === 0
            ? (
                <div className="rounded-md border border-dashed border-border-subtle px-4 py-8 text-center text-sm text-text-muted">
                  {questions.length === 0
                    ? t('no_questions')
                    : t('no_matching_questions')}
                </div>
              )
            : (
                filteredQuestions.map((q, idx) => (
                  <Card key={q.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm text-text-muted">
                          <span className="font-mono">
                            #
                            {filteredQuestions.length - idx}
                          </span>
                          <span>·</span>
                          <Badge variant="neutral" className="text-xs">
                            {q.type}
                          </Badge>
                          <span>·</span>
                          <span className="text-xs">
                            {formatDate(q.createdAt)}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-text-body">
                          <MathRenderer content={q.prompt} />
                        </div>
                        <div className="mt-3 space-y-1">
                          {q.options.map(o => (
                            <div key={o.order} className="flex items-start gap-2 text-sm">
                              <div className="w-6 shrink-0 font-mono text-text-muted">
                                {o.order + 1}
                                .
                              </div>
                              <div className={o.isCorrect ? 'font-medium text-success' : 'text-text-body'}>
                                <MathRenderer content={o.content} />
                                {o.isCorrect && (
                                  <Badge variant="success" className="ml-2 text-xs">
                                    {t('correct')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {q.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {q.tags.map(t => (
                              <Badge
                                key={t.normalizedName}
                                variant="info"
                                className="text-xs cursor-pointer"
                                onClick={() => setFilterTag(t.normalizedName)}
                              >
                                {t.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {canEdit && (
                        <div className="ml-4 flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openQuestionMarkdownEditor(q)}
                            disabled={busy}
                          >
                            {t('edit_markdown_button')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteQuestion(q.id)}
                            disabled={busy}
                          >
                            {t('delete')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
        </div>
      </Card>

      {/* Share Section */}
      {canEdit && (
        <Card className="p-5 md:p-6">
          <h2 className="text-lg font-semibold text-text-heading">{t('share_pool_section')}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input
              value={shareEmail}
              onChange={e => setShareEmail(e.target.value)}
              placeholder={t('teacher_email_placeholder')}
              disabled={busy}
            />
            <select
              value={sharePerm}
              onChange={e => setSharePerm(e.target.value as 'view' | 'use' | 'edit')}
              className="rounded-sm border border-border-subtle bg-bg-section px-3 py-2 text-sm text-text-body"
              disabled={busy}
            >
              <option value="view">view</option>
              <option value="use">use</option>
              <option value="edit">edit</option>
            </select>
          </div>
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={sharePool}
              disabled={busy || !shareEmail.trim()}
            >
              {t('share_button')}
            </Button>
          </div>

          {shares.length > 0 && (
            <div className="mt-5">
              <div className="mb-3 text-sm font-medium text-text-heading">{t('share_list')}</div>
              <div className="space-y-2">
                {shares.map(s => (
                  <div
                    key={s.sharedWith.id}
                    className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-section px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-text-heading">
                        {s.sharedWith.name || s.sharedWith.email || t('no_name')}
                      </div>
                      <div className="mt-1 text-xs text-text-muted">
                        <Badge variant="neutral" className="text-xs">
                          {s.permission}
                        </Badge>
                        <span className="ml-2">
                          {s.sharedWith.email}
                        </span>
                        <span className="mx-2">·</span>
                        <span>
                          {formatDate(s.createdAt)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unsharePool(s.sharedWith.email || '')}
                      disabled={busy}
                    >
                      {t('unshare')}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
