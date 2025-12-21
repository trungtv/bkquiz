import { prisma } from '@/server/prisma';
import { normalizeTagName } from '@/utils/tags';

/**
 * Parse comma-separated tags string into array of tag names
 * Limits to maximum 5 tags
 */
export function parseTagsInput(input: string): string[] {
  return input
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, 5); // Giới hạn tối đa 5 tags
}

/**
 * Validate tags count (max 5)
 */
export function validateTagsCount(tags: string[]): { valid: boolean; error?: string } {
  if (tags.length > 5) {
    return { valid: false, error: 'Tối đa 5 tags' };
  }
  return { valid: true };
}

/**
 * Upsert tags và trả về tag IDs
 * Tạo mới nếu chưa có, update name nếu đã tồn tại
 */
export async function upsertTags(tagNames: string[]): Promise<string[]> {
  const tagIds: string[] = [];

  for (const name of tagNames) {
    const normalizedName = normalizeTagName(name);

    const tag = await prisma.tag.upsert({
      where: { normalizedName },
      update: { name }, // Update name nếu đã tồn tại
      create: { name, normalizedName },
      select: { id: true },
    });

    tagIds.push(tag.id);
  }

  return tagIds;
}
