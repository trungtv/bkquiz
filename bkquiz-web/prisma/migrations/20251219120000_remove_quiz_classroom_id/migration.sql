-- AlterTable
ALTER TABLE "Quiz" DROP CONSTRAINT "Quiz_classroomId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Quiz_classroomId_idx";

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "classroomId";

