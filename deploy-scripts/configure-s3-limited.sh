#!/bin/bash

# 限定権限でS3バケット設定を行うスクリプト
# PutBucketPublicAccessBlockの権限がない場合でも動作します

set -e

# カラーコード
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 S3バケット設定を開始します（限定権限モード）...${NC}"

# 環境変数ファイルを読み込み
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}📄 .env ファイルを読み込みました${NC}"
elif [ -f "env.production" ]; then
    export $(cat env.production | grep -v '^#' | xargs)
    echo -e "${GREEN}📄 env.production ファイルを読み込みました${NC}"
else
    echo -e "${RED}❌ 環境変数ファイル (.env または env.production) が見つかりません${NC}"
    exit 1
fi

# 環境変数から値を取得
BUCKET_NAME=${AWS_S3_BUCKET_NAME}
REGION=${AWS_REGION}

if [ -z "$BUCKET_NAME" ] || [ -z "$REGION" ]; then
    echo -e "${RED}❌ AWS_S3_BUCKET_NAME または AWS_REGION が設定されていません${NC}"
    echo "環境変数を確認してください"
    exit 1
fi

echo -e "${BLUE}📦 対象バケット: ${BUCKET_NAME}${NC}"
echo -e "${BLUE}🌏 リージョン: ${REGION}${NC}"

# バケットの存在確認
echo -e "${YELLOW}🔍 バケットの存在を確認しています...${NC}"
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo -e "${GREEN}✅ バケットが見つかりました${NC}"
else
    echo -e "${RED}❌ バケット '$BUCKET_NAME' が見つかりません${NC}"
    echo "env.productionファイルでバケット名を確認してください"
    exit 1
fi

# パブリックアクセス設定を試行（権限がない場合はスキップ）
echo -e "${YELLOW}🔓 パブリックアクセス設定を試行しています...${NC}"
if aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false" 2>/dev/null; then
    echo -e "${GREEN}✅ パブリックアクセス設定を更新しました${NC}"
else
    echo -e "${YELLOW}⚠️  パブリックアクセス設定をスキップしました（権限不足）${NC}"
    echo -e "${BLUE}💡 AWS管理コンソールで手動設定してください：${NC}"
    echo -e "   • BlockPublicAcls: true"
    echo -e "   • IgnorePublicAcls: true"
    echo -e "   • BlockPublicPolicy: false"
    echo -e "   • RestrictPublicBuckets: false"
fi

# バケットポリシーを作成・適用
echo -e "${YELLOW}📝 バケットポリシーを作成・適用しています...${NC}"
cat > temp-bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

if aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file://temp-bucket-policy.json 2>/dev/null; then
    echo -e "${GREEN}✅ バケットポリシーを適用しました${NC}"
else
    echo -e "${YELLOW}⚠️  バケットポリシーの適用に失敗しました（権限不足の可能性）${NC}"
    echo -e "${BLUE}💡 AWS管理コンソールで手動でバケットポリシーを設定してください${NC}"
    echo -e "内容："
    cat temp-bucket-policy.json
fi

# CORS設定を更新
echo -e "${YELLOW}🌐 CORS設定を更新しています...${NC}"
cat > temp-cors-config.json << EOF
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": ["ETag", "x-amz-request-id"],
            "MaxAgeSeconds": 3000
        }
    ]
}
EOF

if aws s3api put-bucket-cors --bucket "$BUCKET_NAME" --cors-configuration file://temp-cors-config.json 2>/dev/null; then
    echo -e "${GREEN}✅ CORS設定を更新しました${NC}"
else
    echo -e "${YELLOW}⚠️  CORS設定の更新に失敗しました（権限不足の可能性）${NC}"
    echo -e "${BLUE}💡 AWS管理コンソールで手動でCORS設定を行ってください${NC}"
fi

# 一時ファイルを削除
echo -e "${YELLOW}🗑️  一時ファイルを削除しています...${NC}"
rm -f temp-bucket-policy.json temp-cors-config.json

echo ""
echo -e "${GREEN}🎉 S3バケット設定が完了しました（限定権限モード）${NC}"
echo ""
echo -e "${BLUE}📋 設定状況:${NC}"
echo -e "  • バケット存在確認: ${GREEN}✅ 完了${NC}"
echo -e "  • パブリックアクセス設定: ${YELLOW}⚠️  権限依存${NC}"
echo -e "  • バケットポリシー: ${YELLOW}⚠️  権限依存${NC}"
echo -e "  • CORS設定: ${YELLOW}⚠️  権限依存${NC}"
echo ""
echo -e "${BLUE}🔗 テスト用URL例:${NC}"
echo "https://$BUCKET_NAME.s3.$REGION.amazonaws.com/temp/test-file.png"
echo ""
echo -e "${YELLOW}💡 権限不足で失敗した設定がある場合は、AWS管理コンソールで手動設定を行ってください${NC}" 