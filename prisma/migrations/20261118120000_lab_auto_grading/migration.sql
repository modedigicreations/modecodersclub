-- AlterTable
ALTER TABLE "Lab" ADD COLUMN     "checks" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "LabSubmission" ADD COLUMN     "checkedAt" TIMESTAMP(3),
ADD COLUMN     "checksPassed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "checksTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "passedAt" TIMESTAMP(3);

