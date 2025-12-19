import matter from 'gray-matter';

type Question = {
  type: 'mcq_single' | 'mcq_multi';
  prompt: string;
  options: Array<{ content: string; isCorrect: boolean; order: number }>;
  tags: Array<{ name: string }>;
};

type Pool = {
  name: string;
  visibility: 'private' | 'shared';
  questions: Question[];
};

/**
 * Generate Markdown content from a pool
 * Format matches docs/questions.md
 *
 * Format:
 * - Pool front-matter: YAML with `---`
 * - Question blocks: `# QUESTION:`, `## TAGS:`, `## ANSWER:`
 */
export function generatePoolMarkdown(pool: Pool): string {
  // Pool-level front-matter (match format in docs/questions.md)
  // Note: defaults are optional, not stored in DB, so we don't export them
  const poolFrontMatter = {
    pool: {
      name: pool.name,
      visibility: pool.visibility,
    },
  };

  // Generate question blocks
  const questionBlocks: string[] = [];

  for (const q of pool.questions) {
    const blockLines: string[] = [];

    // Question marker
    blockLines.push('# QUESTION:');

    // Prompt
    blockLines.push(q.prompt);

    // Tags (inline JSON array)
    const tagsArray = q.tags.map(t => t.name);
    blockLines.push(`## TAGS: ${JSON.stringify(tagsArray)}`);

    // Answer section marker
    blockLines.push('## ANSWER:');

    // Sort options by order
    const sortedOptions = [...q.options].sort((a, b) => a.order - b.order);

    // Options
    for (const opt of sortedOptions) {
      const marker = q.type === 'mcq_single' ? '(x)' : '[x]';
      const emptyMarker = q.type === 'mcq_single' ? '( )' : '[ ]';
      const prefix = opt.isCorrect ? marker : emptyMarker;
      blockLines.push(`${prefix} ${opt.content}`);
    }

    questionBlocks.push(blockLines.join('\n'));
  }

  // Combine: pool front-matter + question blocks
  // Format: pool front-matter at top, then question blocks separated by double newline
  const poolHeader = matter.stringify('', poolFrontMatter);
  const poolContent = questionBlocks.join('\n\n');

  // Combine: pool header (with trailing newline) + question blocks
  const fullMarkdown = `${poolHeader.trim()}\n\n${poolContent}`;

  return fullMarkdown;
}
