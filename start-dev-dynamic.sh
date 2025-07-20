#!/bin/bash
set -euo pipefail
# ポート番号を生成
PORT=$(~/Dropbox/project/scripts/generate-port.sh)

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
next dev --turbopack -p $PORT