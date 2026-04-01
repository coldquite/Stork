/*
  Warnings:

  - You are about to drop the column `elsa` on the `StudentItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Committee" ALTER COLUMN "defenseDepartmentCode" DROP NOT NULL,
ALTER COLUMN "defenseDepartmentName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PauseItem" ALTER COLUMN "durationMinutes" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StudentItem" DROP COLUMN "elsa",
ALTER COLUMN "repeatType" DROP DEFAULT,
ALTER COLUMN "prepareMinutes" DROP DEFAULT,
ALTER COLUMN "examMinutes" DROP DEFAULT,
ALTER COLUMN "defenseDepartmentCode" DROP NOT NULL,
ALTER COLUMN "defenseDepartmentName" DROP NOT NULL;
