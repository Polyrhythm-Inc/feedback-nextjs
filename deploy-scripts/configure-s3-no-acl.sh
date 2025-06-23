#!/bin/bash

# ACLが無効化されたS3バケットの設定を行うスクリプト
# 最新のS3バケットではACLがデフォルトで無効化されているため、バケットポリシーで制御します

set -e

# カラーコード
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 S3バケット設定を開始します（ACL無効対応）...${NC}"

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

# バケットのACL設定を確認
echo -e "${YELLOW}🔍 バケットのACL設定を確認しています...${NC}"
ACL_STATUS=$(aws s3api get-bucket-acl --bucket "$BUCKET_NAME" 2>/dev/null || echo "ACL_DISABLED")

if [ "$ACL_STATUS" = "ACL_DISABLED" ]; then
    echo -e "${YELLOW}⚠️  このバケットではACLが無効化されています（推奨設定）${NC}"
    echo -e "${BLUE}📝 バケットポリシーでアクセス制御を行います${NC}"
else
    echo -e "${GREEN}✅ バケットでACLが有効です${NC}"
fi

# パブリックアクセス設定を確認・更新
echo -e "${YELLOW}🔓 パブリックアクセス設定を確認・更新しています...${NC}"
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"

echo -e "${GREEN}✅ パブリックアクセス設定を更新しました${NC}"

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

aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file://temp-bucket-policy.json
echo -e "${GREEN}✅ バケットポリシーを適用しました${NC}"

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

aws s3api put-bucket-cors --bucket "$BUCKET_NAME" --cors-configuration file://temp-cors-config.json
echo -e "${GREEN}✅ CORS設定を更新しました${NC}"

# 一時ファイルを削除
echo -e "${YELLOW}🗑️  一時ファイルを削除しています...${NC}"
rm -f temp-bucket-policy.json temp-cors-config.json

echo ""
echo -e "${GREEN}🎉 S3バケット設定が完了しました！${NC}"
echo ""
echo -e "${BLUE}📋 設定内容:${NC}"
echo -e "  • ACL: ${YELLOW}無効化されたまま（推奨）${NC}"
echo -e "  • アクセス制御: ${YELLOW}バケットポリシーで管理${NC}"
echo -e "  • パブリックリード: ${YELLOW}許可${NC}"
echo -e "  • CORS: ${YELLOW}設定済み${NC}"
echo ""
echo -e "${BLUE}🔗 テスト用URL例:${NC}"
echo "https://$BUCKET_NAME.s3.$REGION.amazonaws.com/temp/test-file.png"
echo ""
echo -e "${GREEN}✅ バケット設定完了！Chrome Extensionからの画像アップロードが可能になりました${NC}" 