-- DropForeignKey
ALTER TABLE "feedbacks" DROP CONSTRAINT "feedbacks_screenshot_data_id_fkey";

-- AlterTable
ALTER TABLE "feedbacks" ALTER COLUMN "screenshot_data_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_screenshot_data_id_fkey" FOREIGN KEY ("screenshot_data_id") REFERENCES "screenshot_data"("id") ON DELETE SET NULL ON UPDATE CASCADE;
