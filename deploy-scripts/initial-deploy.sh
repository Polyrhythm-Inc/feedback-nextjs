#!/bin/bash

# 初期デプロイスクリプト
set -e

APP_NAME="feedback"
REGION="ap-northeast-1"

echo "🚀 Starting initial deployment for $APP_NAME..."

# 1. Heroku CLIの確認
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI is not installed. Please install it first:"
    echo "   https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# 2. Herokuログイン確認
echo "🔐 Checking Heroku authentication..."
if ! heroku auth:whoami &> /dev/null; then
    echo "🔑 Please login to Heroku:"
    heroku login
fi

# 3. Herokuアプリ作成
echo "📱 Creating Heroku app: $APP_NAME"
if heroku apps:info $APP_NAME &> /dev/null; then
    echo "⚠️  App $APP_NAME already exists. Using existing app."
    heroku git:remote -a $APP_NAME
else
    heroku create $APP_NAME --region us
    echo "✅ App created successfully"
fi

# 4. PostgreSQL Add-on追加
echo "🗄️  Adding PostgreSQL add-on..."
if heroku addons:info heroku-postgresql -a $APP_NAME &> /dev/null; then
    echo "⚠️  PostgreSQL add-on already exists"
else
    heroku addons:create heroku-postgresql:essential-0 -a $APP_NAME
    echo "✅ PostgreSQL add-on added"
fi

# 5. 環境変数設定の確認
echo "🔧 Checking environment variables..."
if [ ! -f "env.production" ]; then
    echo "❌ env.production file not found!"
    echo "📋 Please create env.production with the following variables:"
    echo "   AWS_REGION=ap-northeast-1"
    echo "   AWS_ACCESS_KEY_ID=your-access-key-id"
    echo "   AWS_SECRET_ACCESS_KEY=your-secret-access-key"
    echo "   AWS_S3_BUCKET_NAME=feedback-app-bucket"
    echo "   NODE_ENV=production"
    echo "   NEXTAUTH_URL=https://$APP_NAME.herokuapp.com"
    exit 1
fi

# 6. dotenvの確認・インストール
if ! npm list dotenv &> /dev/null; then
    echo "📦 Installing dotenv..."
    npm install dotenv
fi

# 7. 環境変数をHerokuに設定
echo "🔧 Setting environment variables..."
node deploy-scripts/set-heroku-env.js

# 8. Git設定確認
if [ ! -d ".git" ]; then
    echo "❌ Git repository not initialized. Please run 'git init' first."
    exit 1
fi

# 9. 変更をコミット
echo "📝 Committing changes..."
git add .
if git diff --staged --quiet; then
    echo "⚠️  No changes to commit"
else
    git commit -m "Deploy configuration updates" || echo "⚠️  Nothing to commit"
fi

# 10. Herokuにデプロイ
echo "🚀 Deploying to Heroku..."
git push heroku main

# 11. データベースマイグレーション実行
echo "🗄️  Running database migrations..."
heroku run npx prisma migrate deploy -a $APP_NAME

# 12. アプリケーション起動確認
echo "🔍 Checking application status..."
heroku ps -a $APP_NAME

# 13. ログ表示
echo "📋 Recent logs:"
heroku logs --tail --num=20 -a $APP_NAME &
LOGS_PID=$!

# 14. アプリケーションを開く
sleep 5
echo "🌐 Opening application..."
heroku open -a $APP_NAME

# ログを停止
sleep 10
kill $LOGS_PID 2>/dev/null || true

echo ""
echo "🎉 Initial deployment completed!"
echo ""
echo "📋 Summary:"
echo "   App Name: $APP_NAME"
echo "   URL: https://$APP_NAME.herokuapp.com"
echo "   Database: PostgreSQL (essential-0)"
echo ""
echo "🔧 Useful commands:"
echo "   heroku logs --tail -a $APP_NAME"
echo "   heroku ps -a $APP_NAME"
echo "   heroku config -a $APP_NAME"
echo "   heroku open -a $APP_NAME"
echo ""
echo "📝 Next steps:"
echo "1. Test your application functionality"
echo "2. Set up GitHub Actions for continuous deployment"
echo "3. Configure monitoring and alerts" 