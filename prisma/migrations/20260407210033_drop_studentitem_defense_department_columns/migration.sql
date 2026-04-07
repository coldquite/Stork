/*
  Warnings:

  - You are about to drop the column `defenseDepartmentCode` on the `StudentItem` table. All the data in the column will be lost.
  - You are about to drop the column `defenseDepartmentName` on the `StudentItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StudentItem" DROP COLUMN "defenseDepartmentCode",
DROP COLUMN "defenseDepartmentName";
