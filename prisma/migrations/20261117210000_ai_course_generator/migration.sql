-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "isDraft" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CourseGenerationJob" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "topic" VARCHAR(300) NOT NULL,
    "audience" VARCHAR(300) NOT NULL,
    "level" VARCHAR(40) NOT NULL,
    "lessonTarget" INTEGER NOT NULL,
    "includeLabs" BOOLEAN NOT NULL DEFAULT true,
    "autoPublish" BOOLEAN NOT NULL DEFAULT false,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "price" VARCHAR(80) NOT NULL DEFAULT '',
    "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
    "stage" VARCHAR(200) NOT NULL DEFAULT '',
    "lessonsTotal" INTEGER NOT NULL DEFAULT 0,
    "lessonsDone" INTEGER NOT NULL DEFAULT 0,
    "courseId" TEXT,
    "error" VARCHAR(500),
    "model" VARCHAR(60) NOT NULL DEFAULT '',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseGenerationJob_createdById_createdAt_idx" ON "CourseGenerationJob"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "CourseGenerationJob_status_idx" ON "CourseGenerationJob"("status");

-- AddForeignKey
ALTER TABLE "CourseGenerationJob" ADD CONSTRAINT "CourseGenerationJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGenerationJob" ADD CONSTRAINT "CourseGenerationJob_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

