#!/bin/bash
# Stop用のラッパースクリプト
export CLAUDE_HOOK_EVENT="Stop"
exec "$(dirname "$0")/slack-notify.sh" "$@"