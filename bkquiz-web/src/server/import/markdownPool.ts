import type JSZip from 'jszip';
import matter from 'gray-matter';
import { z } from 'zod';

export type ImportedQuestion = {
  tags: string[];
  type: 'mcq_single' | 'mcq_multi';
  prompt: string;
  options: Array<{ content: string; isCorrect: boolean; order: number }>;
};

export type ImportedPool = {
  poolName: string;
  visibility: 'private' | 'shared';
  defaults: {
    difficulty?: number;
    shuffleOptions?: boolean;
    points?: number;
  };
  questions: ImportedQuestion[];
  warnings: string[];
};

const PoolFrontMatterSchema = z.object({
  pool: z.object({
    name: z.string().trim().min(1),
    visibility: z.enum(['private', 'shared']).optional(),
  }),
  defaults: z.object({
    difficulty: z.number().int().min(1).max(5).optional(),
    shuffleOptions: z.boolean().optional(),
    points: z.number().int().min(1).optional(),
  }).optional(),
});

const QuestionFrontMatterSchema = z.object({
  tags: z.array(z.string()).optional().default([]),
  type: z.enum(['mcq_single', 'mcq_multi']),
});

function splitQuestionBlocks(markdownAfterPoolHeader: string) {
  // IMPORTANT:
  // - We use YAML front-matter (`---`) inside each question block.
  // - Therefore we MUST NOT split on `\n---\n` (it would split inside front-matter).
  // Preferred convention (recommended): question blocks are separated by a dedicated delimiter line:
  //
  //   ===
  //
  // Fallback (legacy): a blank line + a `---` line.
  const normalized = markdownAfterPoolHeader.trim();

  const splitByTripleEq = normalized.split(/\n={3,}\n/g).map(s => s.trim()).filter(Boolean);
  const parts = splitByTripleEq.length > 1 ? splitByTripleEq : normalized.split(/\n\n---\n/g).map(s => s.trim()).filter(Boolean);

  return parts
    .map((s) => {
      const t = s.trim();
      if (!t) {
        return '';
      }
      return t.startsWith('---\n') ? t : `---\n${t}`;
    })
    .filter(Boolean);
}

function parseOptions(lines: string[], type: 'mcq_single' | 'mcq_multi') {
  const options: ImportedQuestion['options'] = [];
  const promptLines: string[] = [];

  // Avoid regexes that can trigger super-linear backtracking (lefthook lint rule).
  // We parse with string ops instead.

  for (const line of lines) {
    const trimmed = line.trimStart();
    const isSingle = type === 'mcq_single';
    const open = isSingle ? '(' : '[';
    const close = isSingle ? ')' : ']';

    if (trimmed.startsWith(open)) {
      const closeIdx = trimmed.indexOf(close);
      if (closeIdx > 0) {
        const inside = trimmed.slice(1, closeIdx).trim().toLowerCase();
        const isCorrect = inside === 'x';
        const after = trimmed.slice(closeIdx + 1).trimStart();
        if (after.length > 0) {
          options.push({
            content: after,
            isCorrect,
            order: options.length,
          });
          continue;
        }
      }
    }

    promptLines.push(line);
  }

  return { options, prompt: promptLines.join('\n').trim() };
}

export function parsePoolMarkdown(content: string): ImportedPool {
  const poolMatter = matter(content);
  const poolHeader = PoolFrontMatterSchema.parse(poolMatter.data);

  const poolName = poolHeader.pool.name.trim();
  const visibility = poolHeader.pool.visibility ?? 'private';
  const defaults = poolHeader.defaults ?? {};

  const warnings: string[] = [];

  const questionBlocks = splitQuestionBlocks(poolMatter.content);
  const questions: ImportedQuestion[] = [];

  for (const block of questionBlocks) {
    const qMatter = matter(block);
    const qMeta = QuestionFrontMatterSchema.parse(qMatter.data);
    const lines = qMatter.content.split('\n');
    const parsed = parseOptions(lines, qMeta.type);

    if (parsed.options.length < 2) {
      warnings.push('Question has < 2 options and will be skipped.');
      continue;
    }

    const correctCount = parsed.options.filter(o => o.isCorrect).length;
    if (qMeta.type === 'mcq_single' && correctCount !== 1) {
      warnings.push('mcq_single must have exactly 1 correct option; skipped.');
      continue;
    }
    if (qMeta.type === 'mcq_multi' && correctCount < 1) {
      warnings.push('mcq_multi must have >=1 correct option; skipped.');
      continue;
    }

    questions.push({
      tags: qMeta.tags.map(t => t.trim()).filter(Boolean),
      type: qMeta.type,
      prompt: parsed.prompt,
      options: parsed.options,
    });
  }

  return { poolName, visibility, defaults, questions, warnings };
}

export async function extractQuestionsMdFromZip(zip: JSZip) {
  const file = zip.file(/(^|\/)questions\.md$/i)?.[0];
  if (!file) {
    throw new Error('ZIP_MISSING_QUESTIONS_MD');
  }
  return await file.async('string');
}
