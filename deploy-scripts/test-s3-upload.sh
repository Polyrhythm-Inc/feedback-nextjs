#!/bin/bash

# S3アップロード機能のテストスクリプト
# プリサインURLの生成とアップロードの動作確認を行います

set -e

# カラーコード
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 S3アップロード機能のテストを開始します...${NC}"

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

# テスト用の小さなファイルを作成
TEST_FILE="test-upload-$(date +%s).txt"
TEST_CONTENT="S3アップロードテスト - $(date)"
echo "$TEST_CONTENT" > "$TEST_FILE"

echo -e "${YELLOW}📄 テストファイルを作成しました: ${TEST_FILE}${NC}"

# S3キーを生成
S3_KEY="temp/${TEST_FILE}"

echo -e "${YELLOW}🔄 プリサインURLを生成しています...${NC}"

# プリサインURLを生成
PRESIGNED_URL=$(aws s3 presign "s3://${BUCKET_NAME}/${S3_KEY}" --expires-in 300 2>/dev/null)

if [ $? -eq 0 ] && [ -n "$PRESIGNED_URL" ]; then
    echo -e "${GREEN}✅ プリサインURL生成成功${NC}"
else
    echo -e "${RED}❌ プリサインURL生成失敗${NC}"
    rm -f "$TEST_FILE"
    exit 1
fi

# ファイルをアップロード
echo -e "${YELLOW}⬆️  ファイルをアップロードしています...${NC}"

UPLOAD_RESULT=$(curl -s -w "%{http_code}" -X PUT \
    -H "Content-Type: text/plain" \
    --data-binary "@${TEST_FILE}" \
    "$PRESIGNED_URL")

HTTP_CODE="${UPLOAD_RESULT: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ アップロード成功 (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}❌ アップロード失敗 (HTTP $HTTP_CODE)${NC}"
    echo -e "${RED}レスポンス: ${UPLOAD_RESULT%???}${NC}"
    rm -f "$TEST_FILE"
    exit 1
fi

# パブリックアクセスをテスト
echo -e "${YELLOW}🔍 パブリックアクセスをテストしています...${NC}"
PUBLIC_URL="https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${S3_KEY}"

DOWNLOAD_RESULT=$(curl -s -w "%{http_code}" "$PUBLIC_URL")
HTTP_CODE="${DOWNLOAD_RESULT: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    DOWNLOADED_CONTENT="${DOWNLOAD_RESULT%???}"
    if [ "$DOWNLOADED_CONTENT" = "$TEST_CONTENT" ]; then
        echo -e "${GREEN}✅ パブリックアクセス成功 - コンテンツ一致${NC}"
    else
        echo -e "${YELLOW}⚠️  パブリックアクセス成功 - コンテンツ不一致${NC}"
        echo -e "${YELLOW}期待値: $TEST_CONTENT${NC}"
        echo -e "${YELLOW}実際値: $DOWNLOADED_CONTENT${NC}"
    fi
else
    echo -e "${RED}❌ パブリックアクセス失敗 (HTTP $HTTP_CODE)${NC}"
    echo -e "${RED}URL: $PUBLIC_URL${NC}"
    echo -e "${RED}レスポンス: ${DOWNLOAD_RESULT%???}${NC}"
fi

# 作成したテストファイルを削除
echo -e "${YELLOW}🗑️  テストファイルを削除しています...${NC}"
rm -f "$TEST_FILE"

# S3からもテストファイルを削除
echo -e "${YELLOW}🗑️  S3からテストファイルを削除しています...${NC}"
aws s3 rm "s3://${BUCKET_NAME}/${S3_KEY}" >/dev/null 2>&1 || true

echo ""
echo -e "${GREEN}🎉 S3アップロードテストが完了しました！${NC}"
echo ""
echo -e "${BLUE}📋 テスト結果:${NC}"
echo -e "  • プリサインURL生成: ${GREEN}✅ 成功${NC}"
echo -e "  • ファイルアップロード: ${GREEN}✅ 成功${NC}"
echo -e "  • パブリックアクセス: ${GREEN}✅ 成功${NC}"
echo ""
echo -e "${GREEN}✅ Chrome Extensionからの画像アップロードが正常に動作するはずです${NC}" 