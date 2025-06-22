#!/bin/bash

# 既存のS3バケットの権限設定を修正するスクリプト

set -e

BUCKET_NAME="feedback-app-bucket-1750595506"
REGION="ap-northeast-1"

echo "🔧 S3バケット権限の修正を開始します..."
echo "📦 対象バケット: $BUCKET_NAME"

# パブリックアクセスブロック設定を更新（パブリックリードを許可）
echo "🔓 パブリックアクセス設定を更新しています..."
aws s3api put-public-access-block \
    --bucket $BUCKET_NAME \
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# バケットポリシーファイルを作成
echo "📝 バケットポリシーを作成しています..."
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

# バケットポリシーの適用
echo "🔒 バケットポリシーを適用しています..."
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://temp-bucket-policy.json

# CORS設定を更新
echo "🌐 CORS設定を更新しています..."
cat > temp-cors-config.json << EOF
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

aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration file://temp-cors-config.json

# 一時ファイルを削除
echo "🗑️  一時ファイルを削除しています..."
rm -f temp-bucket-policy.json temp-cors-config.json

echo ""
echo "✅ S3バケット権限の修正が完了しました！"
echo ""
echo "🔍 以下のURLでテストファイルにアクセスできるようになります："
echo "https://$BUCKET_NAME.s3.$REGION.amazonaws.com/temp/1750602634539.png"
echo ""
echo "🎉 修正完了！" 