import { NextRequest, NextResponse } from 'next/server';
import { insertFeedbackNew, getFeedbackById } from '@/lib/database';
import { notifyFeedbackReceived } from '@/lib/slack';
import { findProjectByUrl } from '@/lib/projects';
import { parseGitHubRepository, createGitHubIssue, createIssueDataFromFeedback } from '@/lib/github';

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
    const { comment, uploadedDataId, timestamp } = body;

    if (!comment) {
      return NextResponse.json(
        { error: 'コメントが必須です' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!uploadedDataId) {
      return NextResponse.json(
        { error: 'uploadedDataId が必須です。新しいAPIフォーマットを使用してください。' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 新しい形式のみをサポート
    console.log('フィードバック受信:', { uploadedDataId, comment });

    const feedbackId = await insertFeedbackNew({
      comment,
      screenshotDataId: uploadedDataId,
      timestamp: timestamp || Date.now(),
      userAgent: request.headers.get('user-agent') || undefined
    });

    console.log(`フィードバックを受信しました: ID ${feedbackId}, スクリーンショットデータID: ${uploadedDataId}`);

    // Slack通知
    try {
      const notificationSent = await notifyFeedbackReceived({
        id: feedbackId.toString(),
        comment,
        tabUrl: '(スクリーンショットデータを参照)',
        tabTitle: '(スクリーンショットデータを参照)',
        timestamp: timestamp || Date.now(), // Slack通知では元のミリ秒のまま使用
        userAgent: request.headers.get('user-agent') || 'Unknown',
        screenshotUrl: '(スクリーンショットデータを参照)',
        screenshotDataId: uploadedDataId
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

    // GitHub issue作成
    try {
      // フィードバックの詳細データを取得（スクリーンショットデータを含む）
      const feedbackData = await getFeedbackById(feedbackId);
      
      if (feedbackData && feedbackData.screenshotData) {
        console.log(`GitHub issue作成を開始: フィードバックID ${feedbackId}, URL: ${feedbackData.screenshotData.tabUrl}`);
        
        // URLからプロジェクトを検索
        const project = await findProjectByUrl(feedbackData.screenshotData.tabUrl);
        
        if (project && project.githubRepository) {
          console.log(`プロジェクトを発見: ${project.name} (${project.displayName}) - ${project.githubRepository}`);
          
          // GitHubリポジトリ情報を解析
          const repository = parseGitHubRepository(project.githubRepository);
          
          if (repository) {
            // GitHub issue作成
            const issueData = createIssueDataFromFeedback(feedbackData);
            const result = await createGitHubIssue(repository, issueData);
            
            if (result.success) {
              console.log(`GitHub issue作成成功: フィードバックID ${feedbackId}, Issue URL: ${result.issueUrl}`);
            } else {
              console.warn(`GitHub issue作成失敗: フィードバックID ${feedbackId}, Error: ${result.error}`);
            }
          } else {
            console.warn(`GitHubリポジトリURL解析失敗: ${project.githubRepository}`);
          }
        } else {
          console.log(`プロジェクトが見つからないか、GitHubリポジトリが設定されていません: URL ${feedbackData.screenshotData.tabUrl}`);
        }
      } else {
        console.warn(`フィードバックデータまたはスクリーンショットデータが見つかりません: ID ${feedbackId}`);
      }
    } catch (error) {
      console.error(`GitHub issue作成例外: フィードバックID ${feedbackId}`, error);
      // GitHub issue作成の失敗はレスポンスに影響させない
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