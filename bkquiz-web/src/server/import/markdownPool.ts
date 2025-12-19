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

/**
 * Split markdown content into question blocks
 * Format: Each question block starts with `# QUESTION:`
 */
function splitQuestionBlocks(markdownAfterPoolHeader: string): string[] {
  const normalized = markdownAfterPoolHeader.trim();

  // Split by `# QUESTION:` marker (at start of line)
  // Use regex with multiline flag to match `^# QUESTION:`
  const parts = normalized.split(/\n# QUESTION:\n/).map(s => s.trim()).filter(Boolean);

  // Re-add the marker to each block (except first if it doesn't start with it)
  const blocks: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) {
      continue;
    }

    // If this is the first part and it doesn't start with `# QUESTION:`, skip it
    // (it's likely empty content after pool header)
    if (i === 0 && !part.includes('## TAGS:') && !part.includes('## ANSWER:')) {
      continue;
    }

    // Re-add the marker
    blocks.push(`# QUESTION:\n${part}`);
  }

  return blocks;
}

/**
 * Extract prompt from question block
 * Format: Between `# QUESTION:\n` and `## TAGS:`
 */
function extractPrompt(block: string): string {
  const match = block.match(/# QUESTION:\n([\s\S]*?)\n## TAGS:/);
  if (match && match[1]) {
    return match[1].trim();
  }

  // Fallback: if no TAGS section, try to extract until `## ANSWER:`
  const match2 = block.match(/# QUESTION:\n([\s\S]*?)\n## ANSWER:/);
  if (match2 && match2[1]) {
    return match2[1].trim();
  }

  return '';
}

/**
 * Extract tags from question block
 * Format: Between `## TAGS: ` and `\n## ANSWER:`
 * Tags are in JSON array format: `["tag1", "tag2"]`
 */
function extractTags(block: string): string[] {
  const match = block.match(/## TAGS:\s*([^\n]+)/);
  if (!match || !match[1]) {
    return [];
  }

  const tagsStr = match[1].trim();

  try {
    // Parse JSON array
    const parsed = JSON.parse(tagsStr);
    if (Array.isArray(parsed)) {
      return parsed.map(t => String(t).trim()).filter(Boolean);
    }
  } catch {
    // If JSON parse fails, try to extract tags manually
    // This handles edge cases like multi-line tags
    const tagsMatch = block.match(/## TAGS:\s*\[([\s\S]*?)\]/);
    if (tagsMatch && tagsMatch[1]) {
      const tagsContent = tagsMatch[1];
      // Extract quoted strings
      const tagMatches = tagsContent.match(/"([^"]+)"/g);
      if (tagMatches) {
        return tagMatches.map(t => t.slice(1, -1).trim()).filter(Boolean);
      }
    }
  }

  return [];
}

/**
 * Extract options text from question block
 * Format: After `## ANSWER:\n`
 */
function extractOptionsText(block: string): string {
  const match = block.match(/## ANSWER:\n([\s\S]*)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return '';
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
    // Extract sections from question block
    const prompt = extractPrompt(block);
    const tags = extractTags(block);
    const optionsText = extractOptionsText(block);

    if (!prompt) {
      warnings.push('Question block missing prompt; skipped.');
      continue;
    }

    if (!optionsText) {
      warnings.push('Question block missing ## ANSWER: section; skipped.');
      continue;
    }

    // Parse options from text
    const optionsLines = optionsText.split('\n').filter(line => line.trim());

    // Auto-detect type from first option format: (x) = single, [x] = multi
    let detectedType: 'mcq_single' | 'mcq_multi' | null = null;
    for (const line of optionsLines) {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('(')) {
        detectedType = 'mcq_single';
        break;
      }
      if (trimmed.startsWith('[')) {
        detectedType = 'mcq_multi';
        break;
      }
    }

    if (!detectedType) {
      warnings.push('Question has no options or cannot detect type; skipped.');
      continue;
    }

    // Parse options
    const parsed = parseOptions(optionsLines, detectedType);

    if (parsed.options.length < 2) {
      warnings.push('Question has < 2 options and will be skipped.');
      continue;
    }

    const correctCount = parsed.options.filter(o => o.isCorrect).length;
    if (detectedType === 'mcq_single' && correctCount !== 1) {
      warnings.push('mcq_single must have exactly 1 correct option; skipped.');
      continue;
    }
    if (detectedType === 'mcq_multi' && correctCount < 1) {
      warnings.push('mcq_multi must have >=1 correct option; skipped.');
      continue;
    }

    questions.push({
      tags: tags.map(t => t.trim()).filter(Boolean),
      type: detectedType,
      prompt: prompt.trim(),
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
