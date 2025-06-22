#!/bin/bash

# S3 バケットとIAMユーザーの作成スクリプト

set -e

echo "🚀 AWS S3とIAMの設定を開始します..."

# 設定値
BUCKET_NAME="feedback-app-bucket-$(date +%s)"
REGION="ap-northeast-1"
USERNAME="feedback-app-user"
POLICY_NAME="FeedbackAppS3Policy"

echo "📦 S3バケット名: $BUCKET_NAME"
echo "🌏 リージョン: $REGION"
echo "👤 IAMユーザー名: $USERNAME"

# S3バケットの作成
echo "📦 S3バケットを作成しています..."
aws s3 mb s3://$BUCKET_NAME --region $REGION

# パブリックアクセスブロック設定を削除（パブリックリードを許可するため）
echo "🔓 パブリックアクセス設定を更新しています..."
aws s3api put-public-access-block \
    --bucket $BUCKET_NAME \
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# バケットポリシーファイルを動的に作成
echo "📝 バケットポリシーを作成しています..."
cat > s3-bucket-policy.json << EOF
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

# バケットポリシーの適用
echo "🔒 バケットポリシーを適用しています..."
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://s3-bucket-policy.json

# CORS設定
echo "🌐 CORS設定を適用しています..."
cat > s3-cors-config.json << EOF
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3000
        }
    ]
}
EOF

aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration file://s3-cors-config.json

# IAMユーザーの作成
echo "👤 IAMユーザーを作成しています..."
aws iam create-user --user-name $USERNAME || echo "ユーザーは既に存在します"

# IAMポリシーの作成
echo "📄 IAMポリシーを作成しています..."
cat > iam-policy.json << EOF
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
                "s3:GetBucketLocation"
            ],
            "Resource": "arn:aws:s3:::$BUCKET_NAME"
        }
    ]
}
EOF

# ポリシーをIAMに適用
aws iam put-user-policy --user-name $USERNAME --policy-name $POLICY_NAME --policy-document file://iam-policy.json

# アクセスキーの作成
echo "🔑 アクセスキーを作成しています..."
ACCESS_KEY_INFO=$(aws iam create-access-key --user-name $USERNAME)
ACCESS_KEY_ID=$(echo $ACCESS_KEY_INFO | jq -r '.AccessKey.AccessKeyId')
SECRET_ACCESS_KEY=$(echo $ACCESS_KEY_INFO | jq -r '.AccessKey.SecretAccessKey')

# 環境変数を出力
echo ""
echo "✅ AWS S3とIAMの設定が完了しました！"
echo ""
echo "📝 以下の環境変数を設定してください："
echo "AWS_REGION=$REGION"
echo "AWS_S3_BUCKET_NAME=$BUCKET_NAME"
echo "AWS_ACCESS_KEY_ID=$ACCESS_KEY_ID"
echo "AWS_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY"
echo ""
echo "🗑️  一時ファイルを削除しています..."
rm -f s3-bucket-policy.json s3-cors-config.json iam-policy.json

echo "🎉 設定完了！" 