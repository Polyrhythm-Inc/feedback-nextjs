-- CreateTable
CREATE TABLE "feedbacks" (
    "id" SERIAL NOT NULL,
    "comment" TEXT NOT NULL,
    "screenshot_url" VARCHAR(2048) NOT NULL,
    "tab_url" VARCHAR(2048) NOT NULL,
    "tab_title" VARCHAR(512) NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "user_agent" VARCHAR(512) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);
