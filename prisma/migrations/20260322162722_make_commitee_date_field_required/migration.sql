/*
  Warnings:

  - Made the column `date` on table `Committee` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Committee" ALTER COLUMN "date" SET NOT NULL;
