-- AlterTable
ALTER TABLE "feedbacks" ADD COLUMN     "screenshot_data_id" TEXT,
ALTER COLUMN "screenshot_url" DROP NOT NULL,
ALTER COLUMN "tab_url" DROP NOT NULL,
ALTER COLUMN "tab_title" DROP NOT NULL,
ALTER COLUMN "user_agent" DROP NOT NULL;

-- CreateTable
CREATE TABLE "screenshot_data" (
    "id" TEXT NOT NULL,
    "screenshot_url" VARCHAR(2048) NOT NULL,
    "dom_tree" TEXT NOT NULL,
    "tab_url" VARCHAR(2048) NOT NULL,
    "tab_title" VARCHAR(512) NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "page_info" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screenshot_data_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_screenshot_data_id_fkey" FOREIGN KEY ("screenshot_data_id") REFERENCES "screenshot_data"("id") ON DELETE SET NULL ON UPDATE CASCADE;
