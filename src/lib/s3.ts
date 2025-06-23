import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// 開発環境かどうかチェック
const isDevelopment = process.env.NODE_ENV === 'development';

// AWS設定が有効かどうかチェック（プレースホルダーではない実際の値）
const hasValidAwsConfig =
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET_NAME &&
  process.env.AWS_REGION !== 'us-east-1' && // デフォルト値をチェック
  process.env.AWS_ACCESS_KEY_ID !== 'your-access-key-id' &&
  process.env.AWS_SECRET_ACCESS_KEY !== 'your-secret-access-key' &&
  process.env.AWS_S3_BUCKET_NAME !== 'your-bucket-name';

// S3クライアント（AWS設定がある場合のみ初期化）
let s3Client: S3Client | null = null;
if (hasValidAwsConfig) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

export interface PresignedUrlData {
  uploadUrl: string;
  key: string;
  fileUrl: string;
}

// ローカルストレージ用のアップロード関数
async function saveToLocalStorage(
  fileName: string,
  fileType: string,
  feedbackId?: number
): Promise<PresignedUrlData> {
  console.log('🔄 開発環境: ローカルファイルシステムを使用します');

  // ファイル拡張子を取得
  const fileExtension = fileName.split('.').pop() || 'png';

  // ローカルファイルパスを生成
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = Date.now();

  const prefix = feedbackId ? `feedbacks/${year}/${month}/${day}` : 'temp';
  const key = feedbackId
    ? `${prefix}/${feedbackId}_${timestamp}.${fileExtension}`
    : `${prefix}/${timestamp}.${fileExtension}`;

  // アップロード用のローカルエンドポイントを生成（ファイル情報をクエリパラメータに含める）
  const uploadUrl = `http://localhost:3300/api/uploads/local?fileName=${encodeURIComponent(fileName)}&fileType=${encodeURIComponent(fileType)}&key=${encodeURIComponent(key)}`;

  // ファイルアクセス用のURLを生成
  const fileUrl = `http://localhost:3300/uploads/${key}`;

  return {
    uploadUrl,
    key,
    fileUrl
  };
}

export async function generatePresignedUrl(
  fileName: string,
  fileType: string,
  feedbackId?: number
): Promise<PresignedUrlData> {
  // AWS設定がない場合はローカルストレージを使用（テスト用に開発環境チェックを一時無効化）
  if (!hasValidAwsConfig) {
    console.log('⚠️ AWS S3設定が不完全のため、ローカルストレージを使用します');
    console.log('設定状況:', {
      hasValidAwsConfig,
      isDevelopment,
      NODE_ENV: process.env.NODE_ENV,
      AWS_REGION: process.env.AWS_REGION,
      AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME
    });
    return saveToLocalStorage(fileName, fileType, feedbackId);
  }

  console.log('✅ S3モードを使用します', {
    bucket: process.env.AWS_S3_BUCKET_NAME,
    region: process.env.AWS_REGION
  });

  // ファイル拡張子を取得
  const fileExtension = fileName.split('.').pop() || 'png';

  // S3キーを生成（feedbacks/年/月/日/feedbackId_timestamp.extension）
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = Date.now();

  const prefix = feedbackId ? `feedbacks/${year}/${month}/${day}` : 'temp';
  const key = feedbackId
    ? `${prefix}/${feedbackId}_${timestamp}.${fileExtension}`
    : `${prefix}/${timestamp}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
    ContentType: fileType,
    // ACL設定を削除（新しいS3バケットではACLが無効化されているため）
  });

  try {
    // プリサインURLを生成（15分間有効）
    const uploadUrl = await getSignedUrl(s3Client!, command, {
      expiresIn: 900 // 15分
    });

    // アクセス用のURLを生成
    const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    console.log('✅ プリサインURL生成成功:', { key, bucket: process.env.AWS_S3_BUCKET_NAME });

    return {
      uploadUrl,
      key,
      fileUrl
    };
  } catch (error: any) {
    console.error('❌ プリサインURL生成エラー:', {
      message: error.message,
      code: error.code,
      name: error.name,
      bucket: process.env.AWS_S3_BUCKET_NAME,
      key,
      fileType
    });

    // ACL関連のエラーの場合は、より具体的なエラーメッセージを提供
    if (error.message?.includes('AccessControlListNotSupported') ||
      error.message?.includes('bucket does not allow ACLs')) {
      throw new Error('S3バケットでACLが無効化されています。deploy:configure-s3 コマンドを実行してバケット設定を修正してください。');
    }

    // その他のS3エラーの場合
    if (error.code) {
      throw new Error(`S3エラー (${error.code}): ${error.message}`);
    }

    throw new Error('プリサインURLの生成に失敗しました');
  }
}

export function getFileUrlFromKey(key: string): string {
  if (!hasValidAwsConfig || isDevelopment) {
    return `http://localhost:3300/uploads/${key}`;
  }
  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
} 