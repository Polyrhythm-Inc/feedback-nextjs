#!/bin/bash

# S3ユーザーに不足している権限を追加するスクリプト

set -e

# カラーコード
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 S3ユーザー権限の修正を開始します...${NC}"

# 環境変数ファイルを読み込み
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}📄 .env ファイルを読み込みました${NC}"
elif [ -f ".env.production" ]; then
export $(cat .env.production | grep -v '^#' | xargs)
echo -e "${GREEN}📄 .env.production ファイルを読み込みました${NC}"
else
echo -e "${RED}❌ 環境変数ファイル (.env または .env.production) が見つかりません${NC}"
    exit 1
fi

# 環境変数から値を取得
BUCKET_NAME=${AWS_S3_BUCKET_NAME}
REGION=${AWS_REGION}
USERNAME="feedback-s3-user"
POLICY_NAME="FeedbackAppS3AdminPolicy"

if [ -z "$BUCKET_NAME" ] || [ -z "$REGION" ]; then
    echo -e "${RED}❌ AWS_S3_BUCKET_NAME または AWS_REGION が設定されていません${NC}"
    echo "環境変数を確認してください"
    exit 1
fi

echo -e "${BLUE}📦 対象バケット: ${BUCKET_NAME}${NC}"
echo -e "${BLUE}🌏 リージョン: ${REGION}${NC}"
echo -e "${BLUE}👤 IAMユーザー: ${USERNAME}${NC}"

# 拡張権限を持つIAMポリシーを作成
echo -e "${YELLOW}📄 拡張IAMポリシーを作成しています...${NC}"
cat > temp-iam-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:GetObjectAcl",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetBucketLocation",
                "s3:GetBucketCors",
                "s3:PutBucketCors",
                "s3:GetBucketPolicy",
                "s3:PutBucketPolicy",
                "s3:GetBucketPublicAccessBlock",
                "s3:PutBucketPublicAccessBlock",
                "s3:GetBucketAcl",
                "s3:PutBucketAcl"
            ],
            "Resource": "arn:aws:s3:::$BUCKET_NAME"
        }
    ]
}
EOF

# 既存のポリシーを削除（存在する場合）
echo -e "${YELLOW}🗑️  既存のポリシーを確認・削除しています...${NC}"
aws iam delete-user-policy --user-name "$USERNAME" --policy-name "$POLICY_NAME" 2>/dev/null || echo -e "${YELLOW}既存のポリシーは存在しませんでした${NC}"

# 新しいポリシーを適用
echo -e "${YELLOW}📝 新しいポリシーを適用しています...${NC}"
aws iam put-user-policy --user-name "$USERNAME" --policy-name "$POLICY_NAME" --policy-document file://temp-iam-policy.json

echo -e "${GREEN}✅ ポリシーを適用しました${NC}"

# IAMユーザーの現在のポリシーを確認
echo -e "${YELLOW}🔍 現在のユーザー権限を確認しています...${NC}"
aws iam list-user-policies --user-name "$USERNAME" || echo -e "${YELLOW}ポリシー一覧の取得に失敗しました${NC}"

# 一時ファイルを削除
echo -e "${YELLOW}🗑️  一時ファイルを削除しています...${NC}"
rm -f temp-iam-policy.json

echo ""
echo -e "${GREEN}🎉 S3ユーザー権限の修正が完了しました！${NC}"
echo ""
echo -e "${BLUE}📋 追加された権限:${NC}"
echo -e "  • ${YELLOW}s3:PutBucketPublicAccessBlock${NC} - パブリックアクセス設定"
echo -e "  • ${YELLOW}s3:PutBucketPolicy${NC} - バケットポリシー設定"
echo -e "  • ${YELLOW}s3:PutBucketCors${NC} - CORS設定"
echo -e "  • ${YELLOW}その他バケット管理権限${NC}"
echo ""
echo -e "${GREEN}✅ 権限修正完了！再度 configure-s3 を実行してください${NC}" 