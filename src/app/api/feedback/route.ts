import { NextRequest, NextResponse } from 'next/server';
import { insertFeedback } from '@/lib/database';
import { notifyFeedbackReceived } from '@/lib/slack';

// CORS対応のヘッダー
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // リクエストデータの検証
    const { comment, screenshotUrl, metadata } = body;

    if (!comment || !screenshotUrl || !metadata) {
      return NextResponse.json(
        { error: '必須項目が不足しています (comment, screenshotUrl, metadata)' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { url, title, timestamp, userAgent } = metadata;

    if (!url || !title || !timestamp || !userAgent) {
      return NextResponse.json(
        { error: 'メタデータが不完全です (url, title, timestamp, userAgent)' },
        { status: 400, headers: corsHeaders }
      );
    }

    // データベースに保存
    const feedbackId = await insertFeedback({
      comment,
      screenshotUrl,
      tabUrl: url,
      tabTitle: title,
      timestamp,
      userAgent
    });

    console.log(`フィードバックを受信しました: ID ${feedbackId}`);

    // Slack通知を送信（非同期・エラーが発生してもレスポンスには影響しない）
    try {
      const notificationSent = await notifyFeedbackReceived({
        id: feedbackId.toString(),
        comment,
        tabUrl: url,
        tabTitle: title,
        timestamp,
        userAgent,
        screenshotUrl
      });

      if (notificationSent) {
        console.log(`Slack通知送信成功: フィードバックID ${feedbackId}`);
      } else {
        console.warn(`Slack通知送信失敗: フィードバックID ${feedbackId}`);
      }
    } catch (error) {
      console.error(`Slack通知送信例外: フィードバックID ${feedbackId}`, error);
      // Slack通知の失敗はレスポンスに影響させない
    }

    return NextResponse.json({
      success: true,
      id: feedbackId,
      message: 'フィードバックを受信しました'
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('フィードバック保存エラー:', error);

    return NextResponse.json(
      {
        error: 'サーバーエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Chrome ExtensionからのプリフライトリクエストのためのOPTIONSメソッド
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
} 