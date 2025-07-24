#!/bin/bash

# Herokuへのデプロイスクリプト
set -e

APP_NAME="feedback"

echo "🚀 Starting deployment to Heroku for $APP_NAME..."

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

# 3. アプリの存在確認
echo "📱 Checking Heroku app: $APP_NAME"
if ! heroku apps:info $APP_NAME &> /dev/null; then
    echo "❌ App $APP_NAME not found. Please run initial-deploy.sh first."
    exit 1
fi

# 4. Git remoteの確認と設定
if ! git remote | grep -q "^heroku$"; then
    echo "🔗 Adding Heroku remote..."
    heroku git:remote -a $APP_NAME
fi

# 5. 変更のコミット確認
echo "📝 Checking for uncommitted changes..."
if ! git diff --quiet || ! git diff --staged --quiet; then
    echo "⚠️  Uncommitted changes found. Committing them now..."
    git add .
    git commit -m "Deploy updates $(date +%Y-%m-%d_%H:%M:%S)" || echo "Nothing to commit"
fi

# 6. mainブランチの確認
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Current branch is $CURRENT_BRANCH. Switching to main..."
    git checkout main
fi

# 7. Herokuにプッシュ
echo "🚀 Pushing to Heroku..."
git push heroku main

# 8. データベースマイグレーション実行
echo "🗄️  Running database migrations..."
heroku run npx prisma migrate deploy -a $APP_NAME

# 9. アプリケーションの再起動
echo "🔄 Restarting application..."
heroku restart -a $APP_NAME

# 10. デプロイ後の確認
echo "🔍 Checking application status..."
heroku ps -a $APP_NAME

# 11. 最新のログを表示
echo "📋 Recent logs:"
heroku logs --tail --num=30 -a $APP_NAME &
LOGS_PID=$!

# 12. ヘルスチェック
sleep 10
echo ""
echo "🏥 Checking application health..."
APP_URL="https://$APP_NAME.herokuapp.com"
if curl -s -o /dev/null -w "%{http_code}" "$APP_URL" | grep -q "200\|301\|302"; then
    echo "✅ Application is responding"
else
    echo "⚠️  Application may not be responding correctly"
fi

# ログを停止
kill $LOGS_PID 2>/dev/null || true

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📋 Deployment Summary:"
echo "   App Name: $APP_NAME" 
echo "   URL: $APP_URL"
echo "   Time: $(date +%Y-%m-%d_%H:%M:%S)"
echo ""
echo "🔧 Post-deployment commands:"
echo "   heroku logs --tail -a $APP_NAME     # View live logs"
echo "   heroku open -a $APP_NAME             # Open app in browser"
echo "   heroku run bash -a $APP_NAME         # Access app shell"