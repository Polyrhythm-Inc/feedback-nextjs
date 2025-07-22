#!/bin/bash

# Slack通知スクリプト
# 環境変数SLACK_WEBHOOK_URLが必要

# デバッグ用: 実行時刻をテンポラリファイルに記録
DEBUG_LOG="/tmp/claude-hooks-debug.log"
echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] === slack-notify.sh START ===" >> "$DEBUG_LOG"
echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] Args: $@" >> "$DEBUG_LOG"
echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] Arg count: $#" >> "$DEBUG_LOG"

# デフォルト値
WEBHOOK_URL="${SLACK_WEBHOOK_URL:-https://hooks.slack.com/services/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}"
USERNAME="${SLACK_USERNAME:-Claude Code}"
ICON_EMOJI="${SLACK_ICON_EMOJI:-:robot_face:}"
CHANNEL="${SLACK_CHANNEL}"  # 省略可能

# 引数チェック
if [ $# -lt 1 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] Warning: 引数が不足しています (引数数: $#) - デフォルトメッセージを使用します" >> "$DEBUG_LOG"
    
    # Claude Code Hook環境変数からイベントタイプを取得
    HOOK_EVENT="${CLAUDE_HOOK_EVENT:-Unknown}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] CLAUDE_HOOK_EVENT: $HOOK_EVENT" >> "$DEBUG_LOG"
    
    # イベントタイプに応じたデフォルトメッセージ
    case "$HOOK_EVENT" in
        "UserPromptSubmit")
            MESSAGE="ユーザープロンプトが送信されました"
            COLOR="warning"
            ;;
        "PostToolUse")
            MESSAGE="ツールが使用されました"
            COLOR="good"
            ;;
        "Stop")
            MESSAGE="セッションが停止されました"
            COLOR="danger"
            ;;
        "Notification")
            MESSAGE="通知イベントが発生しました"
            COLOR="#3AA3E3"  # 青色
            ;;
        *)
            MESSAGE="Claude Code Hook実行 ($HOOK_EVENT)"
            COLOR="#36a64f"
            ;;
    esac
else
    MESSAGE="$1"
    COLOR="${2:-#36a64f}"  # デフォルトは緑色
fi

# Webhook URLチェック
echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] WEBHOOK_URL: ${WEBHOOK_URL:0:50}..." >> "$DEBUG_LOG"
if [ -z "$WEBHOOK_URL" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] Error: SLACK_WEBHOOK_URL環境変数が設定されていません" >> "$DEBUG_LOG"
    echo "Error: SLACK_WEBHOOK_URL環境変数が設定されていません"
    exit 1
fi
echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] MESSAGE: $MESSAGE" >> "$DEBUG_LOG"
echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] COLOR: $COLOR" >> "$DEBUG_LOG"

# 現在時刻を取得
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Git リポジトリ名を取得
PROJECT_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$PROJECT_ROOT"

# git remote origin URLからリポジトリ名を抽出
if git remote get-url origin >/dev/null 2>&1; then
    REMOTE_URL=$(git remote get-url origin)
    # URLからリポジトリ名を抽出（.gitを除去）
    PROJECT_NAME=$(basename "$REMOTE_URL" .git)
    echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] REMOTE_URL: $REMOTE_URL" >> "$DEBUG_LOG"
else
    # git remoteが設定されていない場合はフォルダ名を使用
    PROJECT_NAME=$(basename "$PROJECT_ROOT")
    echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] No git remote origin found, using folder name" >> "$DEBUG_LOG"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] PROJECT_NAME: $PROJECT_NAME" >> "$DEBUG_LOG"

# ホスト名を取得
HOSTNAME=$(hostname)
echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] HOSTNAME: $HOSTNAME" >> "$DEBUG_LOG"

# メッセージにプロジェクト名を追加
FULL_MESSAGE="[$PROJECT_NAME] $MESSAGE"

# Slack送信用のJSON作成
JSON_PAYLOAD=$(cat <<EOF
{
  "username": "$USERNAME",
  "icon_emoji": "$ICON_EMOJI"$([ -n "$CHANNEL" ] && echo ",\n  \"channel\": \"$CHANNEL\"" || echo ""),
  "attachments": [
    {
      "color": "$COLOR",
      "text": "$FULL_MESSAGE",
      "footer": "Claude Code",
      "footer_icon": "https://www.anthropic.com/favicon.ico",
      "ts": $(date +%s)
    }
  ]
}
EOF
)

echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] JSON_PAYLOAD:" >> "$DEBUG_LOG"
echo "$JSON_PAYLOAD" >> "$DEBUG_LOG"

# Slackに送信
echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] Sending to Slack..." >> "$DEBUG_LOG"
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$JSON_PAYLOAD" "$WEBHOOK_URL" 2>&1)
CURL_EXIT_CODE=$?
echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] curl exit code: $CURL_EXIT_CODE" >> "$DEBUG_LOG"
echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] RESPONSE: $RESPONSE" >> "$DEBUG_LOG"

# curlのエラーチェック
if [ $CURL_EXIT_CODE -ne 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] Error: curlコマンドが失敗しました: 終了コード $CURL_EXIT_CODE" >> "$DEBUG_LOG"
    echo "Error: curlコマンドが失敗しました: 終了コード $CURL_EXIT_CODE" >&2
    exit 1
fi

# エラーチェック
if [ "$RESPONSE" != "ok" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] Error: Slack通知の送信に失敗しました: $RESPONSE" >> "$DEBUG_LOG"
    echo "Error: Slack通知の送信に失敗しました: $RESPONSE" >&2
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] Success: Slack通知を送信しました" >> "$DEBUG_LOG"
echo "[$(date '+%Y-%m-%d %H:%M:%S.%3N')] === slack-notify.sh END ===" >> "$DEBUG_LOG"
echo "Slack通知を送信しました"