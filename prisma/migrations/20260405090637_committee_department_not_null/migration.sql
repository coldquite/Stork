/*
  Warnings:

  - Made the column `defenseDepartmentCode` on table `Committee` required. This step will fail if there are existing NULL values in that column.
  - Made the column `defenseDepartmentName` on table `Committee` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Committee" ALTER COLUMN "defenseDepartmentCode" SET NOT NULL,
ALTER COLUMN "defenseDepartmentName" SET NOT NULL;
