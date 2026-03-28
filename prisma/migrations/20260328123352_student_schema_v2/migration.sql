/*
  Warnings:

  - The values [MAGISTER] on the enum `StudyProgramType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `studyProgramCode` on the `Committee` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `StudentItem` table. All the data in the column will be lost.
  - You are about to drop the column `mobilePhone` on the `StudentItem` table. All the data in the column will be lost.
  - You are about to drop the column `specialization` on the `StudentItem` table. All the data in the column will be lost.
  - Changed the type of `language` on the `Committee` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `defenseDepartmentCode` to the `StudentItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `defenseDepartmentName` to the `StudentItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `specializationCode` to the `StudentItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `specializationName` to the `StudentItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studyLanguage` to the `StudentItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studyProgramName` to the `StudentItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studyProgramType` to the `StudentItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StudyLanguage" AS ENUM ('CZECH', 'ENGLISH');

-- AlterEnum
BEGIN;
CREATE TYPE "StudyProgramType_new" AS ENUM ('BACHELOR', 'MASTER');
ALTER TABLE "Committee" ALTER COLUMN "studyProgramType" TYPE "StudyProgramType_new" USING ("studyProgramType"::text::"StudyProgramType_new");
ALTER TYPE "StudyProgramType" RENAME TO "StudyProgramType_old";
ALTER TYPE "StudyProgramType_new" RENAME TO "StudyProgramType";
DROP TYPE "public"."StudyProgramType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Committee" DROP COLUMN "studyProgramCode",
DROP COLUMN "language",
ADD COLUMN     "language" "StudyLanguage" NOT NULL;

-- AlterTable
ALTER TABLE "StudentItem" DROP COLUMN "email",
DROP COLUMN "mobilePhone",
DROP COLUMN "specialization",
ADD COLUMN     "additionalReviewerName" TEXT,
ADD COLUMN     "additionalSupervisorName" TEXT,
ADD COLUMN     "defenseDepartmentCode" TEXT NOT NULL,
ADD COLUMN     "defenseDepartmentName" TEXT NOT NULL,
ADD COLUMN     "specializationCode" TEXT NOT NULL,
ADD COLUMN     "specializationName" TEXT NOT NULL,
ADD COLUMN     "studyLanguage" "StudyLanguage" NOT NULL,
ADD COLUMN     "studyProgramName" TEXT NOT NULL,
ADD COLUMN     "studyProgramType" "StudyProgramType" NOT NULL,
ADD COLUMN     "thesisSubmissionAt" TIMESTAMP(3);

-- DropEnum
DROP TYPE "CommitteeLanguage";
