/*
  Warnings:

  - Made the column `thesisTitleLocal` on table `StudentItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `thesisTitleEn` on table `StudentItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `thesisLanguage` on table `StudentItem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "StudentItem" ALTER COLUMN "thesisTitleLocal" SET NOT NULL,
ALTER COLUMN "thesisTitleEn" SET NOT NULL,
ALTER COLUMN "thesisLanguage" SET NOT NULL;
