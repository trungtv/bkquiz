import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
import { requirePoolPermission } from '@/server/poolAuthz';
import { prisma } from '@/server/prisma';
import { generatePoolMarkdown } from '@/server/export/markdownPool';

export async function GET(_: Request, ctx: { params: Promise<{ poolId: string }> }) {
  const { userId } = await requireUser();
  const { poolId } = await ctx.params;

  await requirePoolPermission(userId, poolId, 'view');

  const pool = await prisma.questionPool.findUnique({
    where: { id: poolId },
    select: {
      name: true,
      visibility: true,
      questions: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: {
          type: true,
          prompt: true,
          options: {
            where: { deletedAt: null },
            orderBy: { order: 'asc' },
            select: {
              content: true,
              isCorrect: true,
              order: true,
            },
          },
          tags: {
            select: {
              tag: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!pool) {
    return NextResponse.json({ error: 'POOL_NOT_FOUND' }, { status: 404 });
  }

  // Transform data for export
  const exportData = {
    name: pool.name,
    visibility: pool.visibility,
    questions: pool.questions.map((q) => ({
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      tags: q.tags.map(t => t.tag),
    })),
  };

  const markdown = generatePoolMarkdown(exportData);

  // Return as text/markdown
  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${pool.name.replace(/[^a-z0-9]/gi, '_')}.md"`,
    },
  });
}

