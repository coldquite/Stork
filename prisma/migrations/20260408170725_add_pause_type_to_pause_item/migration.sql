/*
  Warnings:

  - Added the required column `pauseType` to the `PauseItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PauseType" AS ENUM ('BREAK', 'LUNCH');

-- AlterTable
ALTER TABLE "PauseItem" ADD COLUMN     "pauseType" "PauseType" NOT NULL;
