#!/bin/bash
# Notification用のラッパースクリプト
export CLAUDE_HOOK_EVENT="Notification"
exec "$(dirname "$0")/slack-notify.sh" "$@"