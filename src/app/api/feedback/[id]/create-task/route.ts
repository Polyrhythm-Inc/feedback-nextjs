import { NextRequest, NextResponse } from 'next/server';
import { getFeedbackById } from '@/lib/database';
import { createTaskFromFeedback, getTaskServerApiKey } from '@/lib/task-server';

// CORS対応のヘッダー
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const feedbackId = parseInt(params.id);
    
    if (isNaN(feedbackId)) {
      return NextResponse.json(
        { success: false, error: '無効なフィードバックIDです' },
        { status: 400, headers: corsHeaders }
      );
    }

    // APIキーの確認
    const apiKey = getTaskServerApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'タスク管理サーバのAPIキーが設定されていません' },
        { status: 503, headers: corsHeaders }
      );
    }

    // フィードバックデータの取得
    const feedbackData = await getFeedbackById(feedbackId);
    
    if (!feedbackData) {
      return NextResponse.json(
        { success: false, error: 'フィードバックが見つかりません' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (!feedbackData.screenshotData) {
      return NextResponse.json(
        { success: false, error: 'スクリーンショットデータが見つかりません' },
        { status: 404, headers: corsHeaders }
      );
    }

    console.log(`タスク作成APIが呼び出されました: フィードバックID ${feedbackId}`);

    // タスクの作成
    const result = await createTaskFromFeedback(feedbackData, apiKey);

    if (result.success) {
      console.log(`タスク作成成功: フィードバックID ${feedbackId}, タスクID: ${result.taskId}`);
      
      return NextResponse.json({
        success: true,
        taskId: result.taskId,
        taskUrl: result.taskUrl,
        message: 'タスクが作成されました'
      }, { headers: corsHeaders });
    } else {
      console.error(`タスク作成失敗: フィードバックID ${feedbackId}, エラー: ${result.error}`);
      
      return NextResponse.json({
        success: false,
        error: result.error || 'タスクの作成に失敗しました'
      }, { status: 500, headers: corsHeaders });
    }

  } catch (error) {
    console.error('タスク作成API例外:', error);
    
    return NextResponse.json({
      success: false,
      error: 'サーバーエラーが発生しました',
      details: error instanceof Error ? error.message : '不明なエラー'
    }, { status: 500, headers: corsHeaders });
  }
}

// プリフライトリクエストのためのOPTIONSメソッド
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}