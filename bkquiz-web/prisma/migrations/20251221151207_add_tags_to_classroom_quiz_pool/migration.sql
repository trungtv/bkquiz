-- CreateTable
CREATE TABLE "ClassroomTag" (
    "classroomId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomTag_pkey" PRIMARY KEY ("classroomId","tagId")
);

-- CreateTable
CREATE TABLE "QuizTag" (
    "quizId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizTag_pkey" PRIMARY KEY ("quizId","tagId")
);

-- CreateTable
CREATE TABLE "QuestionPoolTag" (
    "poolId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionPoolTag_pkey" PRIMARY KEY ("poolId","tagId")
);

-- CreateIndex
CREATE INDEX "ClassroomTag_tagId_classroomId_idx" ON "ClassroomTag"("tagId", "classroomId");

-- CreateIndex
CREATE INDEX "QuizTag_tagId_quizId_idx" ON "QuizTag"("tagId", "quizId");

-- CreateIndex
CREATE INDEX "QuestionPoolTag_tagId_poolId_idx" ON "QuestionPoolTag"("tagId", "poolId");

-- AddForeignKey
ALTER TABLE "ClassroomTag" ADD CONSTRAINT "ClassroomTag_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomTag" ADD CONSTRAINT "ClassroomTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizTag" ADD CONSTRAINT "QuizTag_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizTag" ADD CONSTRAINT "QuizTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPoolTag" ADD CONSTRAINT "QuestionPoolTag_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "QuestionPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPoolTag" ADD CONSTRAINT "QuestionPoolTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
