# 🚀 Herokuデプロイガイド

## 📋 前提条件

- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)がインストール済み
- Herokuアカウント作成済み
- AWS S3バケット作成済み（本番用）
- PostgreSQLローカル環境でのテスト完了

## 🛠️ デプロイ手順

### 1. Heroku CLIログイン

```bash
heroku login
```

### 2. Herokuアプリ作成

```bash
# nextjsフォルダに移動
cd nextjs

# Herokuアプリ作成（アプリ名は任意）
heroku create your-feedback-app-name

# または既存アプリを使用
heroku git:remote -a your-feedback-app-name
```

### 3. PostgreSQL Add-on追加

```bash
# Heroku PostgreSQL（無料プラン）
heroku addons:create heroku-postgresql:mini

# データベースURL確認
heroku config:get DATABASE_URL
```

### 4. 環境変数設定

```bash
# AWS S3設定
heroku config:set AWS_REGION="ap-northeast-1"
heroku config:set AWS_ACCESS_KEY_ID="your-access-key-id"
heroku config:set AWS_SECRET_ACCESS_KEY="your-secret-access-key"
heroku config:set AWS_S3_BUCKET_NAME="your-production-bucket-name"

# Next.js設定
heroku config:set NODE_ENV="production"
heroku config:set NEXTAUTH_URL="https://your-feedback-app-name.herokuapp.com"

# 設定確認
heroku config
```

### 5. Git設定とデプロイ

```bash
# nextjsフォルダをGitリポジトリとして初期化（まだの場合）
git init
git add .
git commit -m "Initial commit for Heroku deployment"

# Herokuにデプロイ
git push heroku main

# または別ブランチからデプロイ
git push heroku your-branch:main
```

### 6. データベースマイグレーション実行

```bash
# Prismaマイグレーション実行（Procfileで自動実行されますが、手動でも可能）
heroku run npx prisma migrate deploy

# Prismaクライアント生成確認
heroku run npx prisma generate
```

### 7. アプリケーション起動確認

```bash
# ログ確認
heroku logs --tail

# アプリケーション開く
heroku open
```

## 🔧 トラブルシューティング

### ビルドエラーが発生した場合

```bash
# ビルドログ確認
heroku logs --tail

# 依存関係の問題の場合
heroku run npm install

# キャッシュクリア
heroku repo:purge_cache -a your-app-name
```

### データベース接続エラーの場合

```bash
# DATABASE_URL確認
heroku config:get DATABASE_URL

# PostgreSQL接続テスト
heroku pg:psql
```

### 環境変数の問題の場合

```bash
# 全環境変数確認
heroku config

# 特定の環境変数設定
heroku config:set VARIABLE_NAME="value"

# 環境変数削除
heroku config:unset VARIABLE_NAME
```

## 📊 デプロイ後の確認項目

### 1. アプリケーション動作確認
- [ ] トップページ表示
- [ ] API エンドポイント動作確認
- [ ] データベース接続確認

### 2. フィードバック機能テスト
- [ ] Chrome Extensionからのデータ送信
- [ ] S3画像アップロード
- [ ] データベース保存確認
- [ ] 管理画面での表示確認

### 3. パフォーマンス確認
- [ ] 応答速度チェック
- [ ] メモリ使用量確認
- [ ] ログエラーチェック

## 🚀 継続的デプロイ設定

### GitHub連携（推奨）

```bash
# GitHub連携設定
heroku git:remote -a your-app-name

# 自動デプロイ有効化（Heroku Dashboard）
# Settings > Deployment method > GitHub
# Automatic deploys > Enable Automatic Deploys
```

## 📈 スケーリング・監視

### リソース監視

```bash
# アプリケーション状態確認
heroku ps

# メトリクス確認
heroku logs --tail

# リソース使用量確認
heroku run top
```

### スケールアップ

```bash
# Dyno数増加
heroku ps:scale web=2

# プラン変更
heroku addons:upgrade heroku-postgresql:basic
```

## 🔒 セキュリティ設定

### SSL設定
- Herokuは自動的にHTTPS対応
- カスタムドメインの場合はSSL証明書設定

### 環境変数管理
- 本番用の強力なシークレットキー設定
- AWS IAMロールによる最小権限設定
- 定期的なアクセスキーローテーション

## 📝 運用時の注意事項

1. **ログ監視**: 定期的にログを確認し、エラーを早期発見
2. **バックアップ**: データベースの定期バックアップ設定
3. **アップデート**: 依存関係の定期更新
4. **監視**: アプリケーションの稼働監視設定

## 🆘 サポート・リソース

- [Heroku Documentation](https://devcenter.heroku.com/)
- [Prisma Heroku Guide](https://www.prisma.io/docs/guides/deployment/deploying-to-heroku)
- [Next.js Heroku Deployment](https://nextjs.org/docs/deployment) 