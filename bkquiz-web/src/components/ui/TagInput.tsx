'use client';

import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface TagInputProps {
  value: string; // Comma-separated string
  onChange: (value: string) => void;
  onSave?: () => void;
  tags?: Array<{ id: string; name: string; normalizedName: string }>;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  showSaveButton?: boolean;
}

export function TagInput({
  value,
  onChange,
  onSave,
  tags = [],
  placeholder = 'tag1, tag2, tag3...',
  maxLength = 200,
  disabled = false,
  showSaveButton = false,
}: TagInputProps) {
  return (
    <div className="space-y-2">
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
      />

      {/* Hiển thị tags hiện có */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <Badge key={tag.id} variant="neutral" className="text-xs">
              {tag.name}
            </Badge>
          ))}
        </div>
      )}

      <p className="text-xs text-text-muted">
        Tối đa 5 tags. Ví dụ: 2025, IT, HCM
      </p>

      {showSaveButton && onSave && (
        <Button variant="primary" size="sm" onClick={onSave} disabled={disabled}>
          Lưu tags
        </Button>
      )}
    </div>
  );
}
