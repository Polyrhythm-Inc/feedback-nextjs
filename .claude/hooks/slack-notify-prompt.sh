#!/bin/bash
# UserPromptSubmit用のラッパースクリプト
export CLAUDE_HOOK_EVENT="UserPromptSubmit"
exec "$(dirname "$0")/slack-notify.sh" "$@"