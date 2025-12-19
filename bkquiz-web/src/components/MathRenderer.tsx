'use client';

import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import { useMemo } from 'react';

type MathRendererProps = {
  content: string;
  className?: string;
};

/**
 * Component to render text with LaTeX math expressions
 * Supports:
 * - Block math: \[ ... \]
 * - Inline math: \( ... \)
 */
export function MathRenderer({ content, className = '' }: MathRendererProps) {
  const rendered = useMemo(() => {
    // Split content by LaTeX expressions
    // Pattern: \[...\] (block math) or \(...\) (inline math)
    const parts: Array<{ type: 'text' | 'block-math' | 'inline-math'; content: string }> = [];

    // Find all LaTeX expressions (both block and inline)
    // Block math: \[ ... \]
    // Inline math: \( ... \)
    const regex = /(\\\[[\s\S]*?\\\])|(\\\([\s\S]*?\\\))/g;

    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        const text = content.slice(lastIndex, match.index);
        if (text) {
          parts.push({ type: 'text', content: text });
        }
      }

      // Determine if it's block or inline math
      if (match[1]) {
        // Block math: \[ ... \]
        const mathContent = match[1].slice(2, -2); // Remove \[ and \]
        parts.push({ type: 'block-math', content: mathContent });
      } else if (match[2]) {
        // Inline math: \( ... \)
        const mathContent = match[2].slice(2, -2); // Remove \( and \)
        parts.push({ type: 'inline-math', content: mathContent });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const text = content.slice(lastIndex);
      if (text) {
        parts.push({ type: 'text', content: text });
      }
    }

    // If no matches, return original content as text
    if (parts.length === 0) {
      parts.push({ type: 'text', content });
    }

    return parts;
  }, [content]);

  return (
    <span className={className}>
      {rendered.map((part, index) => {
        if (part.type === 'block-math') {
          return (
            <div key={index} className="my-2">
              <BlockMath math={part.content} />
            </div>
          );
        }
        if (part.type === 'inline-math') {
          return (
            <InlineMath key={index} math={part.content} />
          );
        }
        // Text content - preserve whitespace and newlines
        return (
          <span key={index} className="whitespace-pre-wrap">
            {part.content}
          </span>
        );
      })}
    </span>
  );
}

