/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `TimeSchedule` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "TimeSchedule_type_updatedAt_idx";

-- AlterTable
ALTER TABLE "TimeSchedule" DROP COLUMN "updatedAt";

-- CreateIndex
CREATE INDEX "TimeSchedule_type_createdAt_idx" ON "TimeSchedule"("type", "createdAt");
