#!/bin/bash
# PostToolUse用のラッパースクリプト
export CLAUDE_HOOK_EVENT="PostToolUse"
exec "$(dirname "$0")/slack-notify.sh" "$@"