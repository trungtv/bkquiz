import JSZip from 'jszip';
import { NextResponse } from 'next/server';
import { requireUser } from '@/server/authz';
import { extractQuestionsMdFromZip, parsePoolMarkdown } from '@/server/import/markdownPool';
import { prisma } from '@/server/prisma';
import { normalizeTagName } from '@/utils/tags';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { userId } = await requireUser();
    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'MISSING_FILE' }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    let md: string;

    if (filename.endsWith('.zip')) {
      const buf = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buf);
      md = await extractQuestionsMdFromZip(zip);
    } else if (filename.endsWith('.md')) {
      md = await file.text();
    } else {
      return NextResponse.json({ error: 'UNSUPPORTED_FILE' }, { status: 400 });
    }

    const parsed = parsePoolMarkdown(md);

    // Upsert pool (1 md = 1 pool). If same owner already has a pool with same name, reuse it.
    const existing = await prisma.questionPool.findFirst({
      where: { ownerTeacherId: userId, name: parsed.poolName },
      select: { id: true },
    });

    const pool = existing
      ? await prisma.questionPool.update({
          where: { id: existing.id },
          data: { visibility: parsed.visibility },
        })
      : await prisma.questionPool.create({
          data: {
            name: parsed.poolName,
            visibility: parsed.visibility,
            ownerTeacherId: userId,
          },
        });

    let createdTags = 0;
    let importedQuestions = 0;

    for (const q of parsed.questions) {
      const question = await prisma.question.create({
        data: {
          poolId: pool.id,
          type: q.type,
          prompt: q.prompt,
          createdByTeacherId: userId,
          options: {
            create: q.options.map(o => ({
              content: o.content,
              isCorrect: o.isCorrect,
              order: o.order,
            })),
          },
        },
        select: { id: true },
      });

      importedQuestions += 1;

      for (const tagName of q.tags) {
        const normalizedName = normalizeTagName(tagName);

        const before = await prisma.tag.findUnique({ where: { normalizedName }, select: { id: true } });

        const tag = await prisma.tag.upsert({
          where: { normalizedName },
          update: { name: tagName.trim() },
          create: { name: tagName.trim(), normalizedName },
          select: { id: true },
        });
        if (!before) {
          createdTags += 1;
        }

        await prisma.questionTag.create({
          data: { questionId: question.id, tagId: tag.id },
        }).catch(() => null);
      }
    }

    return NextResponse.json({
      poolId: pool.id,
      createdPool: !existing,
      createdTags,
      importedQuestions,
      skippedQuestions: parsed.warnings.length,
      warnings: parsed.warnings,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'IMPORT_EXCEPTION', message: msg }, { status: 500 });
  }
}
