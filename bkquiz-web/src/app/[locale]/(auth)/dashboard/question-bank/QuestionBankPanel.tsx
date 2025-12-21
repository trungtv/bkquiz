'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { TagFilter } from '@/components/ui/TagFilter';

type Pool = {
  id: string;
  name: string;
  visibility: 'private' | 'shared';
  updatedAt: string | Date;
  questionCount?: number;
  tagCount?: number;
  tags?: Array<{ id: string; name: string; normalizedName: string }>;
};

export function QuestionBankPanel(props: { initialOwned: Pool[] }) {
  const [owned, setOwned] = useState<Pool[]>(props.initialOwned);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPoolName, setNewPoolName] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [tagFilter, setTagFilter] = useState('');

  // Parse tag filter thành array
  const activeFilterTags = useMemo(() => {
    if (!tagFilter.trim()) {
      return [];
    }
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

  const sorted = useMemo(
    () => [...owned].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [owned],
  );

  async function refresh() {
    const url = new URL('/api/pools', window.location.origin);
    if (tagFilter.trim()) {
      url.searchParams.set('tags', tagFilter.trim());
    }
    try {
      const res = await fetch(url.toString(), { method: 'GET' });
      if (!res.ok) {
        return;
      }
      const text = await res.text();
      if (!text) {
        return;
      }
      let data: { owned: Pool[]; shared: Pool[] };
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error('Failed to parse pools response:', text, err);
        return;
      }
      setOwned(data.owned);
    } catch (err) {
      console.error('Error loading pools:', err);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagFilter]);

  async function createPool() {
    if (!newPoolName.trim()) {
      return;
    }
    setCreateBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPoolName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'CREATE_FAILED');
        return;
      }
      setNewPoolName('');
      setShowCreateForm(false);
      await refresh();
    } finally {
      setCreateBusy(false);
    }
  }

  async function importFile() {
    if (!file) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/pools/import', { method: 'POST', body: form });
      const raw = await res.text();
      const data = (() => {
        try {
          return JSON.parse(raw) as { error?: string; warnings?: string[] };
        } catch {
          return { error: raw || 'EMPTY_RESPONSE' };
        }
      })();
      if (!res.ok) {
        setError(data.error ?? 'IMPORT_FAILED');
        return;
      }
      if (data.warnings?.length) {
        setError(`Imported with warnings: ${data.warnings.slice(0, 3).join(' | ')}`);
      }
      setFile(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    setFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.md') || droppedFile.name.endsWith('.zip'))) {
      setFile(droppedFile);
    }
  };

  return (
    <div className="space-y-7">
      {/* Breadcrumb */}
      <nav className="text-sm text-text-muted">
        <Link href="/dashboard" className="hover:text-text-heading transition-colors">
          Dashboard
        </Link>
        <span className="mx-2">·</span>
        <span className="text-text-heading">Question Bank</span>
      </nav>

      <Card className="p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-text-heading">Question Bank</div>
            <div className="mt-1 text-sm text-text-muted">
              Quản lý question pools và import nhanh câu hỏi từ Markdown/ZIP.
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Hủy' : 'Tạo pool mới'}
            </Button>
          </div>
        </div>

        {/* Create Pool Form */}
        {showCreateForm
          ? (
              <div className="mt-4 rounded-md border border-border-subtle bg-bg-section p-4">
                <div className="text-sm font-medium text-text-heading mb-3">
                  Tạo pool mới
                </div>
                <div className="flex gap-3">
                  <Input
                    placeholder="Tên pool..."
                    value={newPoolName}
                    onChange={e => setNewPoolName(e.target.value)}
                    disabled={createBusy}
                    className="flex-1"
                  />
                  <Button
                    variant="primary"
                    onClick={createPool}
                    disabled={createBusy || !newPoolName.trim()}
                  >
                    {createBusy ? 'Đang tạo...' : 'Tạo'}
                  </Button>
                </div>
              </div>
            )
          : null}

        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-text-heading">Import từ Markdown/ZIP</div>
            <a
              href="/docs/import.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Xem hướng dẫn →
            </a>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`mt-2 rounded-md border-2 border-dashed transition-colors ${
              file
                ? 'border-primary/40 bg-primary/5'
                : 'border-border-subtle bg-bg-section hover:border-border-strong'
            }`}
          >
            {file
              ? (
                  <div className="p-6 text-center">
                    <div className="text-sm font-medium text-text-heading mb-1">
                      {file.name}
                    </div>
                    <div className="text-xs text-text-muted mb-3">
                      {(file.size / 1024).toFixed(1)}
                      {' '}
                      KB
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setFile(null)}
                      disabled={busy}
                    >
                      Xóa file
                    </Button>
                  </div>
                )
              : (
                  <label className="block p-8 text-center cursor-pointer">
                    <div className="text-sm text-text-muted mb-2">
                      Kéo thả file vào đây hoặc click để chọn
                    </div>
                    <div className="text-xs text-text-muted">
                      Hỗ trợ file
                      {' '}
                      <span className="font-mono">.md</span>
                      {' '}
                      hoặc
                      {' '}
                      <span className="font-mono">.zip</span>
                    </div>
                    <input
                      type="file"
                      accept=".md,.zip"
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={busy}
                    />
                  </label>
                )}
          </div>

          <div className="mt-3 flex justify-end">
            <Button variant="primary" onClick={importFile} disabled={busy || !file}>
              {busy ? 'Đang import...' : 'Import'}
            </Button>
          </div>
        </div>

        {error
          ? (
              <div className="mt-3 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                {error}
              </div>
            )
          : null}
      </Card>

      {/* Tag Filter */}
      <Card className="p-5 md:p-6">
        <TagFilter
          value={tagFilter}
          onChange={setTagFilter}
          onClear={() => setTagFilter('')}
        />
      </Card>

      <Card className="p-5 md:p-6 animate-slideUp" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-text-heading">Pools của bạn</div>
            <div className="mt-1 text-sm text-text-muted">
              {sorted.length}
              {' '}
              pools
            </div>
          </div>
        </div>

        {busy && sorted.length === 0
          ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            )
          : sorted.length === 0
            ? (
                <div className="mt-6 rounded-md border border-dashed border-border-subtle px-4 py-8 text-center">
                  <div className="text-sm text-text-muted">
                    Chưa có question pool nào.
                  </div>
                  <div className="mt-2 text-xs text-text-muted">
                    Bắt đầu bằng cách import từ Markdown/ZIP hoặc tạo pool mới.
                  </div>
                </div>
              )
            : (
                <div className="mt-4 space-y-3">
                  {sorted.map((p, idx) => (
                    <Link key={p.id} href={`/dashboard/question-bank/${p.id}`}>
                      <div
                        className="rounded-md border border-border-subtle bg-bg-section transition-all duration-200 hover:translate-x-1 hover:shadow-md hover:border-primary/30"
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_auto_auto] items-center gap-4 md:grid-cols-[2fr_auto_120px_100px]">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-text-heading">{p.name}</div>
                              <div className="mt-1 text-xs text-text-muted">
                                {p.questionCount ?? 0}
                                {' '}
                                câu
                              </div>
                            </div>
                            {p.tags && p.tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                {p.tags.slice(0, 5).map((tag) => {
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
                                {p.tags.length > 5 && (
                                  <Badge variant="neutral" className="text-xs">
                                    +
                                    {p.tags.length - 5}
                                  </Badge>
                                )}
                              </div>
                            )}
                            <Badge
                              variant={p.visibility === 'shared' ? 'info' : 'neutral'}
                              className="text-xs"
                            >
                              {p.visibility}
                            </Badge>
                            <div className="text-xs text-text-muted">
                              <span className="font-mono">
                                {new Date(p.updatedAt).toLocaleDateString('vi-VN')}
                              </span>
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
    </div>
  );
}
