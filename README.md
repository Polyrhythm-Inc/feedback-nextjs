# 📋 フィードバック管理システム (Prisma + MySQL + S3)

Chrome Extensionから送信されたフィードバックを保存・管理するNext.jsアプリケーションです。

## ✨ 機能

- 📨 Chrome Extensionからのフィードバック受信API
- 📊 統計ダッシュボード（総数、今日、今週の件数）
- 📋 フィードバック一覧表示
- 🔍 詳細情報の表示（コメント、スクリーンショット、メタデータ）
- 🗑️ フィードバックの削除機能
- 🗄️ Prisma + MySQLによるデータ永続化
- 📸 AWS S3によるスクリーンショット保存
- 🎨 レスポンシブ対応のモダンUI
- 💬 Slack通知機能（フィードバック受信時の自動通知）

## 🏗️ アーキテクチャ

```
Chrome Extension → API → Prisma → MySQL
                    ↓
                  S3 (画像保存)
                    ↓
               Dashboard (管理画面)
```

## 🚀 セットアップ

### 1. 前提条件

- Node.js 18+
- MySQL 8.0+
- AWS S3アカウント

### 2. データベース作成

MySQLでデータベースを作成：

\`\`\`sql
CREATE DATABASE `test-suite` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
\`\`\`

### 3. 環境変数設定

\`.env\`ファイルを作成し、以下の内容を設定：

\`\`\`env
# Database
DATABASE_URL="mysql://root:secret@localhost:3306/test-suite?schema=public&sslmode=prefer"

# AWS S3 Configuration
AWS_REGION="ap-northeast-1"
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
AWS_S3_BUCKET_NAME="your-bucket-name"

# Slack Configuration (オプション)
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
\`\`\`

### 4. 依存関係のインストール

\`\`\`bash
npm install
\`\`\`

### 5. データベースマイグレーション

\`\`\`bash
npx prisma migrate dev
npx prisma generate
\`\`\`

### 6. 開発サーバーの起動

\`\`\`bash
npm run dev
\`\`\`

アプリケーションは \`http://localhost:3300\` で起動します。

## 🔌 API エンドポイント

### フィードバック受信
- **URL**: \`POST /api/feedback\`
- **説明**: Chrome Extensionからのフィードバックを受信
- **CORS対応**: ✅
- **リクエスト形式**:
\`\`\`json
{
  "comment": "ユーザーのコメント",
  "screenshotUrl": "https://bucket.s3.region.amazonaws.com/path/to/image.png",
  "metadata": {
    "url": "https://example.com",
    "title": "ページタイトル",
    "timestamp": 1640995200000,
    "userAgent": "Mozilla/5.0..."
  }
}
\`\`\`

### S3プリサインURL生成
- **URL**: \`POST /api/s3/presigned-url\`
- **説明**: S3アップロード用のプリサインURLを生成
- **リクエスト形式**:
\`\`\`json
{
  "fileName": "screenshot.png",
  "fileType": "image/png",
  "feedbackId": 123
}
\`\`\`

### フィードバック一覧取得
- **URL**: \`GET /api/feedback/list\`
- **説明**: 保存されたフィードバック一覧と統計情報を取得

### フィードバック削除
- **URL**: \`DELETE /api/feedback/[id]\`
- **説明**: 指定されたIDのフィードバックを削除

## 🗄️ データベーススキーマ

### feedbacks テーブル

| カラム名 | 型 | 説明 |
|----------|----|----|
| id | INT | 主キー（自動増分） |
| comment | TEXT | コメント内容 |
| screenshot_url | VARCHAR(500) | S3画像URL |
| tab_url | VARCHAR(2000) | ページURL |
| tab_title | VARCHAR(500) | ページタイトル |
| timestamp | BIGINT | 送信時のタイムスタンプ |
| user_agent | TEXT | ユーザーエージェント |
| created_at | DATETIME | 作成日時 |
| updated_at | DATETIME | 更新日時 |

## 📸 S3画像管理

### ディレクトリ構造

\`\`\`
bucket-name/
├── feedbacks/
│   ├── 2024/
│   │   ├── 01/
│   │   │   ├── 01/
│   │   │   │   ├── 1_1640995200000.png
│   │   │   │   └── 2_1640995300000.png
│   │   │   └── 02/
│   │   └── 02/
│   └── temp/ (一時ファイル)
\`\`\`

### プリサインURL

- **有効期限**: 15分
- **アクセス制御**: プライベート
- **直接アップロード**: ブラウザから直接S3にアップロード

## 💬 Slack通知機能

### 概要

フィードバックが受信されると、自動的にSlackチャンネルに通知が送信されます。

### 機能詳細

- **リアルタイム通知**: フィードバック受信と同時に通知
- **リッチメッセージ**: フィードバック内容を整理された形で表示
- **スクリーンショット表示**: 画像が含まれる場合は通知内に表示
- **メタデータ情報**: URL、ページタイトル、投稿時刻、ユーザーエージェント
- **堅牢なエラーハンドリング**: 通知失敗時もフィードバック処理は継続

### 通知形式

Slackには以下の情報が含まれた通知が送信されます：

- 📝 **フィードバックID**: 識別用の一意ID
- ⏰ **投稿時刻**: 日本時間で表示
- 🌐 **ページ情報**: タイトルとURL（リンク付き）
- 💬 **コメント内容**: ユーザーが入力したフィードバック
- 📸 **スクリーンショット**: 画像がある場合は表示
- 🖥️ **ユーザーエージェント**: ブラウザ・OS情報

### 設定方法

1. **Slack WebhookURLの取得**
   - Slackワークスペースの管理画面にアクセス
   - 「Incoming Webhooks」アプリを追加
   - 通知先チャンネルを選択してWebhook URLを生成

2. **環境変数の設定**
   ```env
   SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
   ```

3. **通知の有効化**
   - 環境変数が設定されると自動的に有効化
   - 環境変数が未設定の場合は通知をスキップ（エラーにはならない）

### エラーハンドリング

- ❌ **Webhook URL未設定**: 警告ログを出力してスキップ
- ❌ **Slack API エラー**: エラーログを記録して処理継続
- ❌ **ネットワーク例外**: 例外ログを記録して処理継続
- ✅ **フィードバック処理**: 通知失敗時もフィードバック保存は成功

## 🎯 使用方法

### 1. 開発サーバーを起動
\`\`\`bash
npm run dev
\`\`\`

### 2. Chrome Extensionでフィードバックを送信
- 拡張機能を使用してコメント入力
- 自動でスクリーンショット取得
- S3にアップロード後、メタデータをMySQLに保存

### 3. ダッシュボードでフィードバックを確認
- \`http://localhost:3300\` にアクセス
- 統計情報とフィードバック一覧を確認
- S3画像の表示と管理

### 4. フィードバックの管理
- 一覧からフィードバックを選択して詳細を確認
- 不要なフィードバックを削除

## 📁 ディレクトリ構造

\`\`\`
nextjs/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── feedback/
│   │   │   │   ├── route.ts          # フィードバック受信API
│   │   │   │   ├── list/
│   │   │   │   │   └── route.ts      # 一覧取得API
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # 削除API
│   │   │   └── s3/
│   │   │       └── presigned-url/
│   │   │           └── route.ts      # S3プリサインURL API
│   │   ├── globals.css               # グローバルスタイル
│   │   ├── layout.tsx                # ルートレイアウト
│   │   └── page.tsx                  # メインダッシュボード
│   ├── lib/
│   │   ├── prisma.ts                 # Prismaクライアント
│   │   ├── database.ts               # データベース操作
│   │   ├── s3.ts                     # S3操作
│   │   └── slack.ts                  # Slack通知機能
├── prisma/
│   ├── schema.prisma                 # Prismaスキーマ
│   └── migrations/                   # マイグレーションファイル
├── .env                              # 環境変数
├── package.json
└── README.md
\`\`\`

## 🛡️ セキュリティ

- **データベース**: MySQLのutf8mb4文字セット使用
- **S3アクセス**: プリサインURLによる時間制限付きアクセス
- **CORS設定**: Chrome Extensionからのリクエストを許可
- **入力検証**: 全APIエンドポイントで適切な検証
- **エラーハンドリング**: 詳細なログとエラー処理

## 📊 統計機能

- **総フィードバック数**: Prismaによる高速カウント
- **今日の件数**: 日付フィルタリング
- **今週の件数**: 7日間のデータ集計

## ⚙️ 技術スタック

- ⚡ **Next.js 15.3.3** (App Router)  
- 📘 **TypeScript**
- 🎨 **Tailwind CSS**
- 🗄️ **Prisma ORM** + **MySQL**
- 📸 **AWS S3** (プリサインURL)
- 🌐 **CORS対応**
- 💬 **Slack Webhook API** (通知機能)

## 🚀 デプロイメント

### プロダクション環境

1. **環境変数の設定**
   - 本番用のMySQL接続情報
   - 本番用のS3バケット情報

2. **ビルドとデプロイ**
   \`\`\`bash
   npm run build
   npm start
   \`\`\`

3. **マイグレーション**
   \`\`\`bash
   npx prisma migrate deploy
   \`\`\`

## ⚠️ 注意事項

- MySQLサーバーが localhost:3306 で起動している必要があります
- AWS S3バケットが作成済みで、適切な権限が設定されている必要があります
- Chrome Extensionのmanifestでローカルホストへのアクセスを許可してください
- プロダクション環境では適切なログ収集とモニタリングを設定してください

## 🤝 Chrome Extensionとの連携

このアプリケーションは、Chrome Extensionと完全に統合されています：

1. **画像アップロード**: S3プリサインURLで直接アップロード
2. **メタデータ保存**: PrismaでMySQLに永続化
3. **リアルタイム管理**: ダッシュボードで即座に確認・管理

### データフロー

\`\`\`
Chrome Extension
    ↓ (スクリーンショット取得)
S3プリサインURL API
    ↓ (プリサインURL取得)
Chrome Extension
    ↓ (S3に直接アップロード)
フィードバック受信API
    ↓ (メタデータ保存)
MySQL Database
    ↓ (データ表示)
管理ダッシュボード
\`\`\`

## 🚀 本番デプロイ手順

### 推奨：GitHub Actions による自動デプロイ

**📋 詳細な手順は [`GITHUB_ACTIONS_SETUP.md`](./GITHUB_ACTIONS_SETUP.md) を参照してください。**

1. **GitHubリポジトリの作成**
   ```bash
   git remote add origin https://github.com/your-username/your-repo.git
   git push -u origin main
   ```

2. **GitHub Secretsの設定**
   リポジトリの Settings > Secrets and variables > Actions で以下を設定:
   - `HEROKU_API_KEY`: Heroku API キー
   - `HEROKU_EMAIL`: Herokuアカウントのメールアドレス
   - `HEROKU_APP_NAME`: Herokuアプリ名
   - `DATABASE_URL`: HerokuのPostgreSQL URL
   - `AWS_REGION`: ap-northeast-1
   - `AWS_ACCESS_KEY_ID`: AWS アクセスキー
   - `AWS_SECRET_ACCESS_KEY`: AWS シークレットキー
   - `AWS_S3_BUCKET_NAME`: S3バケット名

3. **自動デプロイ**
   - `main` ブランチへのプッシュで自動デプロイ
   - プルリクエストのマージで自動デプロイ
   - テスト実行 → ビルド → デプロイ → ヘルスチェックの自動実行

### 手動デプロイ（従来の方法）

#### 初回デプロイ

1. **AWS S3セットアップ**
   ```bash
   npm run deploy:setup-s3
   ```

2. **env.productionファイルの設定**
   - AWS管理コンソールでアクセスキーを作成
   - `env.production`ファイルに実際の値を設定

3. **S3バケット設定（ACL無効対応）**
   ```bash
   npm run deploy:configure-s3
   ```
   ※ 新しいS3バケットではACLが無効化されているため、バケットポリシーで設定します

4. **S3アップロードテスト**
   ```bash
   npm run deploy:test-s3
   ```

5. **初回デプロイ実行**
   ```bash
   npm run deploy:initial
   ```

#### S3アップロードエラーの解決

`AccessControlListNotSupported` エラーが発生した場合：

```bash
# 現代的なS3バケット設定（ACL無効）を適用
npm run deploy:configure-s3

# 設定が正しく適用されたかテスト
npm run deploy:test-s3
```

#### 手動デプロイコマンド

```bash
# 環境変数設定
npm run deploy:set-env

# Herokuにデプロイ
npm run deploy:heroku
```

## 🆘 サポート・リソース

- [Heroku Documentation](https://devcenter.heroku.com/)
- [Prisma Heroku Guide](https://www.prisma.io/docs/guides/deployment/deploying-to-heroku)
- [Next.js Heroku Deployment](https://nextjs.org/docs/deployment)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

完全なエンタープライズ級フィードバック収集・管理システムが構築されました！🎉
