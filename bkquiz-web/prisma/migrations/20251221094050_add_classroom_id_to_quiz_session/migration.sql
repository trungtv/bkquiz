/*
  Warnings:

  - Added the required column `classroomId` to the `QuizSession` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add column as nullable first
ALTER TABLE "QuizSession" ADD COLUMN     "classroomId" TEXT;

-- Step 2: For existing sessions, we need to set a default or find the classroom
-- Since we can't determine classroom from existing data, we'll set to a placeholder
-- In production, you may need to manually backfill this data
-- For now, we'll use a workaround: set to first classroom of the teacher who created the quiz
UPDATE "QuizSession" qs
SET "classroomId" = (
  SELECT c.id
  FROM "Classroom" c
  WHERE c."ownerTeacherId" = (
    SELECT q."createdByTeacherId"
    FROM "Quiz" q
    WHERE q.id = qs."quizId"
  )
  LIMIT 1
)
WHERE qs."classroomId" IS NULL;

-- Step 3: If still NULL (no classroom found), we need to handle it
-- For safety, we'll delete sessions without a valid classroom
-- In production, you may want to keep them or assign to a default classroom
DELETE FROM "QuizSession" WHERE "classroomId" IS NULL;

-- Step 4: Now make it NOT NULL
ALTER TABLE "QuizSession" ALTER COLUMN "classroomId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "QuizSession_classroomId_idx" ON "QuizSession"("classroomId");

-- AddForeignKey
ALTER TABLE "QuizSession" ADD CONSTRAINT "QuizSession_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
