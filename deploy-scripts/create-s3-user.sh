#!/bin/bash

# S3用IAMユーザー作成スクリプト
set -e

USER_NAME="feedback-s3-user"
POLICY_NAME="feedback-s3-policy"
BUCKET_NAME="feedback-app-bucket"

echo "🚀 Creating S3 IAM user for feedback app..."

# IAMユーザー作成
echo "📝 Creating IAM user: $USER_NAME"
aws iam create-user --user-name $USER_NAME --tags Key=Project,Value=feedback-app Key=Environment,Value=production

# S3用のポリシー作成
echo "📋 Creating S3 policy: $POLICY_NAME"
cat > s3-policy.json << EOF
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

aws iam create-policy --policy-name $POLICY_NAME --policy-document file://s3-policy.json

# ポリシーをユーザーにアタッチ
echo "🔗 Attaching policy to user..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws iam attach-user-policy --user-name $USER_NAME --policy-arn "arn:aws:iam::$ACCOUNT_ID:policy/$POLICY_NAME"

# S3バケット作成
echo "🪣 Creating S3 bucket: $BUCKET_NAME"
aws s3 mb s3://$BUCKET_NAME --region ap-northeast-1

# CORS設定
echo "🌐 Setting up CORS configuration..."
cat > cors-config.json << EOF
{
    "CORSRules": [
        {
            "AllowedOrigins": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
            "AllowedHeaders": ["*"],
            "MaxAgeSeconds": 3000
        }
    ]
}
EOF

aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration file://cors-config.json

# バケットポリシー設定（プライベートアクセス）
echo "🔒 Setting bucket policy..."
cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowFeedbackAppAccess",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::$ACCOUNT_ID:user/$USER_NAME"
            },
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json

# 一時ファイル削除
rm -f s3-policy.json cors-config.json bucket-policy.json

echo "✅ S3 setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Create access keys for user '$USER_NAME' in AWS Console:"
echo "   https://console.aws.amazon.com/iam/home#/users/$USER_NAME?section=security_credentials"
echo "2. Add the access keys to .env.production file"
echo "3. Update BUCKET_NAME in .env.production to: $BUCKET_NAME"
echo ""
echo "🔧 Environment variables to set:"
echo "AWS_ACCESS_KEY_ID=<your-access-key-id>"
echo "AWS_SECRET_ACCESS_KEY=<your-secret-access-key>"
echo "AWS_S3_BUCKET_NAME=$BUCKET_NAME"
echo "AWS_REGION=ap-northeast-1" 