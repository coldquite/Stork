/*
  Warnings:

  - You are about to drop the column `defenseDepartmentCode` on the `Committee` table. All the data in the column will be lost.
  - You are about to drop the column `defenseDepartmentName` on the `Committee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Committee" DROP COLUMN "defenseDepartmentCode",
DROP COLUMN "defenseDepartmentName";
