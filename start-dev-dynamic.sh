#!/bin/bash
set -euo pipefail
# ポート番号を生成
PORT=$(~/Dropbox/project/scripts/generate-port.sh)

# 環境変数を設定（.env.localファイルが存在する場合）
if [ -f .env.local ]; then
    # 既存のPORT設定を削除して新しいものを追加
    grep -v "^PORT=" .env.local > .env.local.tmp
    mv .env.local.tmp .env.local
    echo "PORT=$PORT" >> .env.local
else
    # .env.localが存在しない場合は作成
    echo "PORT=$PORT" > .env.local
fi

# サーバー情報を表示
echo ""
echo "開発サーバーを起動中..."
echo "URL: http://localhost:$PORT"
echo ""

# Slack通知を送信（オプション）
if [ -f ~/Dropbox/project/scripts/slack-notify.sh ]; then
    MESSAGE="Vibe Kanban 開発サーバーが起動しました
URL: http://localhost:$PORT"
    ~/Dropbox/project/scripts/slack-notify.sh "$MESSAGE" "good"
fi

# Next.jsサーバーを起動
echo "サーバーを終了するには Ctrl+C を押してください"
PORT=$PORT next dev --turbopack -p $PORT