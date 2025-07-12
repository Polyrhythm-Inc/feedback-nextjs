# GitHub Actions で Heroku にデプロイするセットアップガイド

## 📋 概要

このガイドでは、`feedback-nextjs` プロジェクトをGitHub Actionsを使ってHerokuに自動デプロイする設定について説明します。

## 🚀 設定手順

### 1. GitHubリポジトリの準備

```bash
# リポジトリをGitHubにプッシュ
git add .
git commit -m "Setup GitHub Actions for Heroku deployment"
git push origin main
```

### 2. Herokuアプリの作成

```bash
# Heroku CLIでログイン
heroku login

# アプリを作成（アプリ名は任意）
heroku create your-feedback-app-name

# PostgreSQL add-onを追加
heroku addons:create heroku-postgresql:essential-0 -a your-feedback-app-name

# 環境変数を設定
heroku config:set AWS_REGION="ap-northeast-1" -a your-feedback-app-name
heroku config:set AWS_ACCESS_KEY_ID="your-aws-access-key" -a your-feedback-app-name
heroku config:set AWS_SECRET_ACCESS_KEY="your-aws-secret-key" -a your-feedback-app-name
heroku config:set AWS_S3_BUCKET_NAME="your-s3-bucket-name" -a your-feedback-app-name
heroku config:set NODE_ENV="production" -a your-feedback-app-name
```

### 3. GitHub Secretsの設定

GitHubリポジトリの **Settings > Secrets and variables > Actions** で以下のSecretsを追加してください：

#### 必須のSecrets

| Secret名 | 説明 | 取得方法 |
|----------|------|----------|
| `HEROKU_API_KEY` | Heroku API キー | [Heroku Dashboard](https://dashboard.heroku.com/account) > Account Settings > API Key |
| `HEROKU_EMAIL` | Herokuアカウントのメール | あなたのHerokuアカウントのメールアドレス |
| `HEROKU_APP_NAME` | Herokuアプリ名 | 作成したHerokuアプリの名前 |
| `DATABASE_URL` | PostgreSQL接続URL | `heroku config:get DATABASE_URL -a your-app-name` |
| `AWS_REGION` | AWSリージョン | `ap-northeast-1` |
| `AWS_ACCESS_KEY_ID` | AWS アクセスキー | AWS IAMで作成 |
| `AWS_SECRET_ACCESS_KEY` | AWS シークレットキー | AWS IAMで作成 |
| `AWS_S3_BUCKET_NAME` | S3バケット名 | 作成したS3バケット名 |
| `DEPLOYMENT_API_KEY` | デプロイメント通知APIキー | `kIfRiS5xHSQvJf5qEJdfHQR8LVVGho3y` |

#### ✅ 設定完了済み

以下のSecretsは既に設定されています：

- ✅ `HEROKU_API_KEY`
- ✅ `HEROKU_EMAIL`
- ✅ `HEROKU_APP_NAME`
- ✅ `DATABASE_URL`
- ✅ `AWS_REGION`
- ✅ `AWS_ACCESS_KEY_ID`
- ✅ `AWS_SECRET_ACCESS_KEY`
- ✅ `AWS_S3_BUCKET_NAME`
- ✅ `DEPLOYMENT_API_KEY`

### 4. GitHub CLI を使用したSecretsの設定

```bash
# Heroku関連
gh secret set HEROKU_API_KEY --body "$(heroku auth:token)"
gh secret set HEROKU_EMAIL --body "your-email@example.com"
gh secret set HEROKU_APP_NAME --body "your-app-name"
gh secret set DATABASE_URL --body "$(heroku config:get DATABASE_URL --app your-app-name)"

# AWS関連
gh secret set AWS_REGION --body "ap-northeast-1"
gh secret set AWS_ACCESS_KEY_ID --body "your-aws-access-key"
gh secret set AWS_SECRET_ACCESS_KEY --body "your-aws-secret-key"
gh secret set AWS_S3_BUCKET_NAME --body "your-s3-bucket-name"

# デプロイメント通知API関連
gh secret set DEPLOYMENT_API_KEY --body "kIfRiS5xHSQvJf5qEJdfHQR8LVVGho3y"
```

### 5. Heroku API Keyの取得

1. [Heroku Dashboard](https://dashboard.heroku.com/account) にログイン
2. **Account Settings** に移動
3. **API Key** セクションで **Reveal** をクリック
4. 表示されたAPIキーをコピーしてGitHub Secretsに設定

### 6. AWS S3の設定

S3バケットを作成し、適切な権限を設定してください：

```bash
# S3セットアップスクリプトを実行
cd feedback-nextjs
npm run deploy:setup-s3
npm run deploy:configure-s3
```

## 🔄 デプロイフロー

### 自動デプロイのトリガー

以下の操作で自動デプロイが実行されます：

- `main` または `master` ブランチへの**プッシュ**
- `main` または `master` ブランチへの**プルリクエストのマージ**
- **手動実行** (GitHub UI または CLI)

### 手動デプロイの実行

```bash
# GitHub CLIを使用
gh workflow run deploy.yml -f environment=production

# 環境の選択
gh workflow run deploy.yml -f environment=staging
gh workflow run deploy.yml -f environment=development
```

### デプロイプロセス

1. **テスト実行**
   - Node.js 18環境の構築
   - PostgreSQL サービスの起動
   - 依存関係のインストール
   - Prisma Client生成
   - データベースマイグレーション実行
   - テストの実行
   - リンティング実行

2. **デプロイ実行**（テスト成功時のみ）
   - Node.js 18環境の構築
   - 依存関係のインストール
   - アプリケーションのビルド
   - Herokuへのデプロイ
   - データベースマイグレーション実行
   - ヘルスチェック実行
   - **デプロイメント通知API呼び出し**
   - デプロイ結果の通知

## 🔗 デプロイメント通知API

### APIエンドポイント

```
POST https://auth-suite.polyrhythm.tokyo/api/external/deployments
```

### 認証

```
Authorization: Bearer kIfRiS5xHSQvJf5qEJdfHQR8LVVGho3y
```

### 送信データ

```json
{
  "applicationName": "feedback-suite.polyrhythm.tokyo",
  "environment": "production",
  "version": "v1.0.0",
  "commitHash": "abc123...",
  "branch": "main",
  "tag": "v1.0.0",
  "deployedBy": "github-actions",
  "status": "SUCCESS",
  "workflowRunId": "123456789",
  "jobId": "deploy",
  "notes": "Heroku deployment via GitHub Actions",
  "metadata": {
    "repository": "jinyunoki/feedback-nextjs",
    "actor": "jinyunoki",
    "platform": "heroku",
    "appName": "feedback",
    "deploymentUrl": "https://feedback.herokuapp.com"
  }
}
```

### 通知タイミング

- **成功時**: デプロイメントが成功した場合に`status: "SUCCESS"`で通知
- **失敗時**: デプロイメントが失敗した場合に`status: "FAILED"`で通知

## 🛠️ トラブルシューティング

### よくある問題と解決方法

#### 1. ビルドエラー

```bash
# ローカルでビルドテスト
cd feedback-nextjs
npm run build
```

#### 2. 環境変数の問題

```bash
# Herokuの環境変数確認
heroku config -a your-app-name

# GitHub Secretsの確認
# GitHub > Settings > Secrets and variables > Actions
```

#### 3. データベース接続エラー

```bash
# PostgreSQLの状態確認
heroku pg:info -a your-app-name

# マイグレーション手動実行
heroku run npx prisma migrate deploy -a your-app-name
```

#### 4. S3アップロードエラー

```bash
# S3設定テスト
npm run deploy:test-s3

# S3権限修正
npm run deploy:configure-s3
```

#### 5. デプロイメント通知APIエラー

```bash
# APIキーの確認
curl -X POST "https://auth-suite.polyrhythm.tokyo/api/external/deployments" \
  -H "Authorization: Bearer kIfRiS5xHSQvJf5qEJdfHQR8LVVGho3y" \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "feedback-suite.polyrhythm.tokyo",
    "environment": "production",
    "version": "v1.0.0",
    "status": "SUCCESS"
  }'
```

## 📊 GitHub Actions実行結果の確認

### 実行状況の確認

1. GitHubリポジトリの **Actions** タブを開く
2. 最新のワークフロー実行を確認
3. 各ステップの詳細ログを確認

### 成功時の表示

```
✅ Deployment successful!
🌐 App URL: https://your-app-name.herokuapp.com
```

### エラー時の対応

1. **Actions** タブで失敗したステップを確認
2. ログを詳しく確認
3. 必要に応じて環境変数やコードを修正
4. 再度プッシュして自動デプロイを実行

## 🔧 手動デプロイの実行

緊急時や手動でデプロイしたい場合：

```bash
# 手動デプロイ
cd feedback-nextjs
git push heroku main

# またはスクリプトを使用
npm run deploy:heroku
```

## 📝 設定ファイルの説明

### `.github/workflows/deploy.yml`

- GitHub Actionsのワークフロー定義
- テストとデプロイの自動化
- 環境変数の設定
- Herokuへのデプロイ
- **デプロイメント通知API呼び出し**

### `package.json`

- Node.js 18.xの指定
- ビルドとスタートスクリプト
- Heroku用のpostinstallスクリプト

### `Procfile`

- Heroku用のプロセス定義
- リリース時のマイグレーション自動実行

## 🎯 次のステップ

1. **モニタリング設定**: Herokuのログ監視とアラート設定
2. **ステージング環境**: 開発用のステージング環境構築
3. **セキュリティ**: 定期的なセキュリティアップデート
4. **パフォーマンス**: 本番環境でのパフォーマンス最適化
5. **デプロイメント管理**: auth-suite での デプロイメント履歴確認

## 📚 参考資料

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Heroku Node.js Deployment](https://devcenter.heroku.com/articles/deploying-nodejs)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment/deploying-to-heroku)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Auth Suite デプロイメント管理ガイド](https://auth-suite.polyrhythm.tokyo/public/docs/deployment-management-guide.md)

---

🎉 **完了！** GitHub ActionsでのHeroku自動デプロイとデプロイメント通知APIの設定が完了しました。 