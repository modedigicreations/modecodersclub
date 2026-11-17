-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "expiredNoticeSentAt" TIMESTAMP(3),
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

