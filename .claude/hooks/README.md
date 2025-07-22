# Claude Code Slack通知フック設定ガイド

このディレクトリには、Claude CodeのフックでSlack通知を送信するためのスクリプトが含まれています。

## セットアップ

### 1. Slack Webhook URLの取得

1. Slackワークスペースにログイン
2. [Incoming Webhooks](https://api.slack.com/messaging/webhooks) アプリを追加
3. 通知を送信したいチャンネルを選択
4. Webhook URLをコピー

### 2. 環境変数の設定

#### macOSの場合

```bash
# ~/.zshrc または ~/.bash_profile に追加
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# オプション設定
export SLACK_USERNAME="Claude Code Bot"  # デフォルト: "Claude Code"
export SLACK_ICON_EMOJI=":robot_face:"   # デフォルト: ":robot_face:"
export SLACK_CHANNEL="#your-channel"      # 省略可能（Webhookのデフォルトチャンネルを使用）

# 設定を反映
source ~/.zshrc  # または source ~/.bash_profile
```

#### Windowsの場合

```powershell
# システム環境変数として設定（管理者権限が必要）
[System.Environment]::SetEnvironmentVariable("SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/YOUR/WEBHOOK/URL", "User")

# オプション設定
[System.Environment]::SetEnvironmentVariable("SLACK_USERNAME", "Claude Code Bot", "User")
[System.Environment]::SetEnvironmentVariable("SLACK_ICON_EMOJI", ":robot_face:", "User")
[System.Environment]::SetEnvironmentVariable("SLACK_CHANNEL", "#your-channel", "User")
```

### 3. 動作確認

```bash
# スクリプトの実行権限を確認
ls -la .claude/hooks/slack-notify.sh

# テスト送信
.claude/hooks/slack-notify.sh "テストメッセージ" "good"
```

## フックの種類と通知内容

### Stopフック
- **タイミング**: Claude Codeが停止したとき
- **メッセージ**: "Claude Codeが停止しました :stop_sign:"
- **色**: warning（黄色）

### Notificationフック
- **タイミング**: Claude Codeから通知があるとき
- **メッセージ**: "Claude Codeから通知があります :bell:"
- **色**: #36a64f（緑色）

## カスタマイズ

### メッセージのカスタマイズ

`.claude/settings.local.json`のフック設定を編集することで、メッセージや色をカスタマイズできます：

```json
{
  "hooks": {
    "stop": {
      "enabled": true,
      "timeout": 10000,
      "command": ".claude/hooks/slack-notify.sh",
      "args": ["カスタムメッセージ", "danger"]  // 赤色
    }
  }
}
```

### 色の設定

第2引数で以下の色を指定できます：
- `good`: 緑色
- `warning`: 黄色
- `danger`: 赤色
- 16進数カラーコード（例: `#FF0000`）

## トラブルシューティング

### 通知が送信されない場合

1. 環境変数が正しく設定されているか確認：
   ```bash
   echo $SLACK_WEBHOOK_URL
   ```

2. スクリプトの実行権限を確認：
   ```bash
   chmod +x .claude/hooks/slack-notify.sh
   ```

3. curlコマンドが利用可能か確認：
   ```bash
   which curl
   ```

4. エラーメッセージを確認：
   スクリプトは標準出力にエラーメッセージを表示します。

### セキュリティ上の注意

- Webhook URLは機密情報です。公開リポジトリにコミットしないでください。
- `.gitignore`に`.claude/settings.local.json`が含まれていることを確認してください。
- 環境変数として設定することで、コードから分離して管理できます。