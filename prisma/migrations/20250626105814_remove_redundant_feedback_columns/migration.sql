/*
Warnings:

- You are about to drop the column `screenshot_url` on the `feedbacks` table. All the data in the column will be lost.
- You are about to drop the column `tab_title` on the `feedbacks` table. All the data in the column will be lost.
- You are about to drop the column `tab_url` on the `feedbacks` table. All the data in the column will be lost.
- Made the column `screenshot_data_id` on table `feedbacks` required. This step will fail if there are existing NULL values in that column.

*/

-- Step 1: 既存のNULLレコード用にダミーのScreenshotDataを作成
INSERT INTO "screenshot_data" (id, screenshot_url, dom_tree, tab_url, tab_title, timestamp, page_info, created_at, updated_at)
SELECT 
  'legacy-' || f.id::text,
  COALESCE(f.screenshot_url, 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY5NzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TGVnYWN5IERhdGE8L3RleHQ+PC9zdmc+'),
  '<html><body><!-- レガシーデータ: DOMツリー情報なし --></body></html>',
  COALESCE(f.tab_url, 'https://example.com/legacy'),
  COALESCE(f.tab_title, 'レガシーデータ'),
  f.timestamp,
  '{"legacy": true}'::jsonb,
  f.created_at,
  f.updated_at
FROM "feedbacks" f
WHERE f.screenshot_data_id IS NULL;

-- Step 2: 既存のNULLレコードのscreenshot_data_idを更新
UPDATE "feedbacks" 
SET screenshot_data_id = 'legacy-' || id::text 
WHERE screenshot_data_id IS NULL;

-- Step 3: DropForeignKey
ALTER TABLE "feedbacks"
DROP CONSTRAINT "feedbacks_screenshot_data_id_fkey";

-- Step 4: AlterTable - カラムを削除してNOT NULL制約を追加
ALTER TABLE "feedbacks"
DROP COLUMN "screenshot_url",
DROP COLUMN "tab_title",
DROP COLUMN "tab_url",
ALTER COLUMN "screenshot_data_id"
SET
    NOT NULL;

-- Step 5: AddForeignKey
ALTER TABLE "feedbacks"
ADD CONSTRAINT "feedbacks_screenshot_data_id_fkey" FOREIGN KEY ("screenshot_data_id") REFERENCES "screenshot_data" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;