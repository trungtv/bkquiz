'use client';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface TagFilterProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export function TagFilter({
  value,
  onChange,
  onClear,
  placeholder = 'Filter by tags (comma-separated): tag1, tag2...',
}: TagFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      {value && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      )}
    </div>
  );
}
