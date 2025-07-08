/*
  Warnings:

  - You are about to alter the column `timestamp` on the `feedbacks` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `timestamp` on the `screenshot_data` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "feedbacks" ALTER COLUMN "timestamp" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "screenshot_data" ALTER COLUMN "timestamp" SET DATA TYPE INTEGER;
