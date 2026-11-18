-- AlterTable
ALTER TABLE "user" ADD COLUMN     "schoolName" VARCHAR(160);

-- CreateTable
CREATE TABLE "TutorSkillProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" VARCHAR(40) NOT NULL,
    "track" VARCHAR(16) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "recent" VARCHAR(10) NOT NULL DEFAULT '',
    "masteredAt" TIMESTAMP(3),
    "placed" BOOLEAN NOT NULL DEFAULT false,
    "reviewStep" INTEGER NOT NULL DEFAULT 0,
    "reviewDueAt" TIMESTAMP(3),
    "lastPracticedAt" TIMESTAMP(3),
    "lastItemIssuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorSkillProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorPlacement" (
    "userId" TEXT NOT NULL,
    "track" VARCHAR(16) NOT NULL,
    "startSkill" VARCHAR(40) NOT NULL,
    "questions" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorPlacement_pkey" PRIMARY KEY ("userId","track")
);

-- CreateTable
CREATE TABLE "TutorWriting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" VARCHAR(40) NOT NULL,
    "prompt" VARCHAR(300) NOT NULL,
    "text" VARCHAR(4000) NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" JSONB NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "aiChecked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorWriting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorParentLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEmailedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "TutorParentLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TutorSkillProgress_userId_track_idx" ON "TutorSkillProgress"("userId", "track");

-- CreateIndex
CREATE UNIQUE INDEX "TutorSkillProgress_userId_skillId_key" ON "TutorSkillProgress"("userId", "skillId");

-- CreateIndex
CREATE INDEX "TutorWriting_userId_createdAt_idx" ON "TutorWriting"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TutorParentLink_token_key" ON "TutorParentLink"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TutorParentLink_userId_email_key" ON "TutorParentLink"("userId", "email");

-- AddForeignKey
ALTER TABLE "TutorSkillProgress" ADD CONSTRAINT "TutorSkillProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorPlacement" ADD CONSTRAINT "TutorPlacement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorWriting" ADD CONSTRAINT "TutorWriting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorParentLink" ADD CONSTRAINT "TutorParentLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

