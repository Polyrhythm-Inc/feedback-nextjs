#!/bin/bash

# Slack通知スクリプト（デバッグ版）
# 環境変数SLACK_WEBHOOK_URLが必要

# デバッグログ出力
echo "[DEBUG] スクリプト開始: $(date '+%Y-%m-%d %H:%M:%S')" >&2
echo "[DEBUG] 引数数: $#" >&2
echo "[DEBUG] 引数: $@" >&2

# デフォルト値
WEBHOOK_URL="${SLACK_WEBHOOK_URL:-https://hooks.slack.com/services/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}"
USERNAME="${SLACK_USERNAME:-Claude Code}"
ICON_EMOJI="${SLACK_ICON_EMOJI:-:robot_face:}"
CHANNEL="${SLACK_CHANNEL}"  # 省略可能

echo "[DEBUG] WEBHOOK_URL: ${WEBHOOK_URL:0:50}..." >&2
echo "[DEBUG] USERNAME: $USERNAME" >&2

# 引数チェック
if [ $# -lt 1 ]; then
    echo "[ERROR] 引数が不足しています" >&2
    echo "Usage: $0 <message> [color]"
    echo "  message: 送信するメッセージ"
    echo "  color: メッセージの色 (good, warning, danger, または任意の16進数カラーコード)"
    exit 1
fi

# Webhook URLチェック
if [ -z "$WEBHOOK_URL" ]; then
    echo "[ERROR] SLACK_WEBHOOK_URL環境変数が設定されていません" >&2
    echo "Error: SLACK_WEBHOOK_URL環境変数が設定されていません"
    exit 1
fi

MESSAGE="$1"
COLOR="${2:-#36a64f}"  # デフォルトは緑色

echo "[DEBUG] MESSAGE: $MESSAGE" >&2
echo "[DEBUG] COLOR: $COLOR" >&2

# 現在時刻を取得
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# プロジェクト名を取得（カレントディレクトリから推測）
PROJECT_NAME=$(basename "$(pwd)")

# ホスト名を取得
HOSTNAME=$(hostname)

echo "[DEBUG] PROJECT_NAME: $PROJECT_NAME" >&2
echo "[DEBUG] HOSTNAME: $HOSTNAME" >&2

# Slack送信用のJSON作成
JSON_PAYLOAD=$(cat <<EOF
{
  "username": "$USERNAME",
  "icon_emoji": "$ICON_EMOJI"$([ -n "$CHANNEL" ] && echo ",\n  \"channel\": \"$CHANNEL\"" || echo ""),
  "attachments": [
    {
      "color": "$COLOR",
      "text": "$MESSAGE",
      "footer": "Claude Code | $PROJECT_NAME",
      "footer_icon": "https://www.anthropic.com/favicon.ico",
      "ts": $(date +%s),
      "fields": [
        {
          "title": "ホスト",
          "value": "$HOSTNAME",
          "short": true
        },
        {
          "title": "時刻",
          "value": "$TIMESTAMP",
          "short": true
        }
      ]
    }
  ]
}
EOF
)

echo "[DEBUG] JSONペイロード作成完了" >&2
echo "[DEBUG] JSON長さ: ${#JSON_PAYLOAD}" >&2

# Slackに送信
echo "[DEBUG] Slackに送信中..." >&2
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$JSON_PAYLOAD" "$WEBHOOK_URL" 2>&1)
CURL_EXIT_CODE=$?

echo "[DEBUG] curl終了コード: $CURL_EXIT_CODE" >&2
echo "[DEBUG] Slackレスポンス: $RESPONSE" >&2

# curlのエラーチェック
if [ $CURL_EXIT_CODE -ne 0 ]; then
    echo "[ERROR] curlコマンドが失敗しました: 終了コード $CURL_EXIT_CODE" >&2
    exit 1
fi

# エラーチェック
if [ "$RESPONSE" != "ok" ]; then
    echo "[ERROR] Slack通知の送信に失敗しました" >&2
    echo "Error: Slack通知の送信に失敗しました: $RESPONSE"
    exit 1
fi

echo "[DEBUG] 送信成功" >&2
echo "Slack通知を送信しました"