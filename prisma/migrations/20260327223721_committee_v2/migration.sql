/*
  Warnings:

  - You are about to drop the column `code` on the `Committee` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `Committee` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[timeScheduleId,name]` on the table `Committee` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `chairName` to the `Committee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `defenseDepartmentCode` to the `Committee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `defenseDepartmentName` to the `Committee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language` to the `Committee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `member1Name` to the `Committee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `member2Name` to the `Committee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `member3Name` to the `Committee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Committee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `specializationCode` to the `Committee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `specializationName` to the `Committee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studyProgramCode` to the `Committee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studyProgramName` to the `Committee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studyProgramType` to the `Committee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `viceChairName` to the `Committee` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StudyProgramType" AS ENUM ('BACHELOR', 'MAGISTER');

-- CreateEnum
CREATE TYPE "CommitteeLanguage" AS ENUM ('CZECH', 'ENGLISH');


-- Drop obsolete constraint tied to removed column.
ALTER TABLE "Committee" DROP CONSTRAINT IF EXISTS "Committee_sortOrder_nonnegative_chk";

-- DropIndex
DROP INDEX "Committee_timeScheduleId_code_key";

-- DropIndex
DROP INDEX "Committee_timeScheduleId_sortOrder_key";

-- AlterTable
ALTER TABLE "Committee" DROP COLUMN "code",
DROP COLUMN "sortOrder",
ADD COLUMN     "chairName" TEXT NOT NULL,
ADD COLUMN     "defenseDepartmentCode" TEXT NOT NULL,
ADD COLUMN     "defenseDepartmentName" TEXT NOT NULL,
ADD COLUMN     "language" "CommitteeLanguage" NOT NULL,
ADD COLUMN     "member1Name" TEXT NOT NULL,
ADD COLUMN     "member2Name" TEXT NOT NULL,
ADD COLUMN     "member3Name" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "specializationCode" TEXT NOT NULL,
ADD COLUMN     "specializationName" TEXT NOT NULL,
ADD COLUMN     "studyProgramCode" TEXT NOT NULL,
ADD COLUMN     "studyProgramName" TEXT NOT NULL,
ADD COLUMN     "studyProgramType" "StudyProgramType" NOT NULL,
ADD COLUMN     "viceChairName" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Committee_timeScheduleId_name_key" ON "Committee"("timeScheduleId", "name");
