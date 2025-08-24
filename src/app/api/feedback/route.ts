import { NextRequest, NextResponse } from 'next/server';
import { insertFeedbackNew, getFeedbackById } from '@/lib/database';
import { notifyFeedbackReceived, notifyGitHubIssueError } from '@/lib/slack';
import { findProjectByUrl, findProjectByGithubRepository } from '@/lib/projects';
import { parseGitHubRepository, createGitHubIssue, createIssueDataFromFeedback } from '@/lib/github';
import { createTaskFromFeedback, getTaskServerApiKey } from '@/lib/task-server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

// バックグラウンド処理用の型定義
interface BackgroundProcessParams {
  comment: string;
  uploadedDataId: string | null;
  errorDetails?: any;
  url?: string;
  githubRepository?: string;
  userName?: string;
  prefetchedData?: any; // 先読みしたフィードバックデータ
}

/**
 * バックグラウンドで外部API処理を実行する関数
 * GitHub Issue作成、タスク作成、Slack通知を並行実行
 */
async function processExternalApisInBackground(
  feedbackId: number,
  params: BackgroundProcessParams
): Promise<void> {
  const { comment, uploadedDataId, errorDetails, url, githubRepository, userName, prefetchedData } = params;

  try {
    // 先読みデータがあれば使用、なければ再取得
    let feedbackData = prefetchedData;
    if (!feedbackData) {
      console.log(`バックグラウンド処理: フィードバックデータを再取得中: ID ${feedbackId}`);
      feedbackData = await getFeedbackById(feedbackId);
      if (!feedbackData) {
        console.warn(`バックグラウンド処理: フィードバックデータが見つかりません: ID ${feedbackId}`);
        return;
      }
    } else {
      console.log(`バックグラウンド処理: 先読みデータを使用: ID ${feedbackId}`);
    }

    console.log(`バックグラウンド処理開始: フィードバックID ${feedbackId}`);

    // GitHub Issue作成とタスク作成を並行実行
    const [githubResult, taskResult] = await Promise.allSettled([
      processGitHubIssueCreation(feedbackId, feedbackData, errorDetails, githubRepository, userName),
      processTaskCreation(feedbackId, feedbackData, errorDetails, githubRepository, userName)
    ]);

    // GitHub Issue URLを取得
    let githubIssueUrl: string | undefined;
    if (githubResult.status === 'fulfilled' && githubResult.value.success) {
      githubIssueUrl = githubResult.value.issueUrl;
      console.log(`GitHub Issue処理完了: ${githubResult.value.message}`);
    } else {
      const errorMessage = githubResult.status === 'fulfilled' 
        ? githubResult.value.message 
        : githubResult.reason;
      console.error(`GitHub Issue処理失敗: ${errorMessage}`);
    }

    if (taskResult.status === 'fulfilled') {
      console.log(`タスク作成処理完了: ${taskResult.value}`);
    } else {
      console.error(`タスク作成処理失敗:`, taskResult.reason);
    }

    // GitHub Issue URLを含めてSlack通知を送信
    try {
      const slackResult = await processSlackNotification(
        feedbackId, 
        feedbackData, 
        comment, 
        uploadedDataId || undefined, 
        errorDetails, 
        githubRepository,
        githubIssueUrl
      );
      console.log(`Slack通知処理完了: ${slackResult}`);
    } catch (error) {
      console.error(`Slack通知処理失敗:`, error);
    }

    console.log(`バックグラウンド処理完了: フィードバックID ${feedbackId}`);
  } catch (error) {
    console.error(`バックグラウンド処理で予期しないエラー: フィードバックID ${feedbackId}`, error);
  }
}

/**
 * GitHub Issue作成処理
 */
async function processGitHubIssueCreation(
  feedbackId: number,
  feedbackData: any,
  errorDetails?: any,
  githubRepository?: string,
  userName?: string
): Promise<{ success: boolean; issueUrl?: string; message: string }> {
  try {
    // URLを取得（url > スクリーンショットデータ > errorDetailsの優先順位）
    let tabUrl: string | undefined;

    if (feedbackData.url) {
      tabUrl = feedbackData.url;
    } else if (feedbackData.screenshotData) {
      tabUrl = feedbackData.screenshotData.tabUrl;
    } else if (errorDetails?.pageUrl) {
      tabUrl = errorDetails.pageUrl;
    }

    // プロジェクトを検索
    let project = null;
    
    if (tabUrl) {
      console.log(`GitHub issue作成を開始: フィードバックID ${feedbackId}, URL: ${tabUrl}`);
      project = await findProjectByUrl(tabUrl);
    }
    
    if (!project && githubRepository) {
      console.log(`GitHubリポジトリでプロジェクトを検索: ${githubRepository}`);
      project = await findProjectByGithubRepository(githubRepository);
    }

    if (project && project.githubRepository) {
      console.log(`プロジェクトを発見: ${project.name} (${project.displayName}) - ${project.githubRepository}`);

      const repository = parseGitHubRepository(project.githubRepository);
      if (repository) {
        const issueData = createIssueDataFromFeedback({
          id: feedbackData.id,
          comment: feedbackData.comment,
          screenshotData: feedbackData.screenshotData,
          userAgent: feedbackData.userAgent,
          timestamp: feedbackData.timestamp,
          userName: userName
        });
        const result = await createGitHubIssue(repository, issueData);

        if (result.success) {
          return {
            success: true,
            issueUrl: result.issueUrl,
            message: `GitHub issue作成成功: Issue URL: ${result.issueUrl}`
          };
        } else {
          // エラー時にSlack通知を送信
          await notifyGitHubIssueError(
            feedbackId,
            result.error || 'Unknown error',
            `${project.displayName} (${project.name})`,
            project.githubRepository
          );
          return {
            success: false,
            message: `GitHub issue作成失敗: ${result.error}`
          };
        }
      } else {
        return {
          success: false,
          message: `GitHubリポジトリURL解析失敗: ${project.githubRepository}`
        };
      }
    } else {
      return {
        success: false,
        message: `GitHub issue作成スキップ: プロジェクトが見つからないか設定されていません`
      };
    }
  } catch (error) {
    // 例外時にもSlack通知を送信
    await notifyGitHubIssueError(
      feedbackId,
      error instanceof Error ? error.message : 'Unknown error',
      undefined,
      undefined
    ).catch(notifyError => {
      console.error('エラー通知の送信にも失敗しました:', notifyError);
    });
    
    return {
      success: false,
      message: `GitHub issue作成例外: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * タスク作成処理
 */
async function processTaskCreation(
  feedbackId: number,
  feedbackData: any,
  errorDetails?: any,
  githubRepository?: string,
  userName?: string
): Promise<string> {
  try {
    const apiKey = getTaskServerApiKey();

    if (!apiKey) {
      return 'タスク管理サーバのAPIキーが設定されていないため、タスク作成をスキップしました';
    }

    console.log(`タスク管理サーバへのタスク作成を開始: フィードバックID ${feedbackId}`);

    const taskResult = await createTaskFromFeedback(feedbackData, apiKey, errorDetails, githubRepository, userName);

    if (taskResult.success) {
      return `タスク作成成功: タスクID: ${taskResult.taskId}, URL: ${taskResult.taskUrl}`;
    } else {
      return `タスク作成失敗: ${taskResult.error}`;
    }
  } catch (error) {
    return `タスク作成例外: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Slack通知処理（GitHub Issue URLを待ってから送信）
 */
async function processSlackNotification(
  feedbackId: number,
  feedbackData: any,
  comment: string,
  uploadedDataId?: string,
  errorDetails?: any,
  githubRepository?: string,
  githubIssueUrl?: string
): Promise<string> {
  try {
    // URLとタイトルを取得
    let tabUrl = 'Unknown URL';
    let tabTitle = 'フィードバック';
    let screenshotUrl: string | undefined;

    if (feedbackData.url) {
      tabUrl = feedbackData.url;
      tabTitle = feedbackData.screenshotData?.tabTitle || 'フィードバック';
      screenshotUrl = feedbackData.screenshotData?.screenshotUrl;
    } else if (feedbackData.screenshotData) {
      tabUrl = feedbackData.screenshotData.tabUrl;
      tabTitle = feedbackData.screenshotData.tabTitle;
      screenshotUrl = feedbackData.screenshotData.screenshotUrl;
    } else if (errorDetails?.pageUrl) {
      tabUrl = errorDetails.pageUrl;
      tabTitle = `エラーレポート - ${uploadedDataId || 'unknown'}`;
    }

    const notificationSent = await notifyFeedbackReceived({
      id: feedbackId.toString(),
      comment,
      tabUrl,
      tabTitle,
      timestamp: feedbackData.timestamp,
      userAgent: feedbackData.userAgent || 'Unknown',
      screenshotUrl,
      screenshotDataId: uploadedDataId,
      githubIssueUrl: githubIssueUrl,
      githubRepository: githubRepository
    });

    if (notificationSent) {
      return `Slack通知送信成功`;
    } else {
      return `Slack通知送信失敗`;
    }
  } catch (error) {
    return `Slack通知送信例外: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// CORS対応のヘッダー
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Bearerトークンまたはクッキーから認証ユーザー情報を取得
    const authenticatedUser = await getAuthenticatedUser(request);
    const userName = authenticatedUser?.name || authenticatedUser?.email;

    // リクエストデータの検証
    const { comment, uploadedDataId, timestamp, errorDetails, url, githubRepository } = body;

    if (!comment) {
      return NextResponse.json(
        { error: 'コメントが必須です' },
        { status: 400, headers: corsHeaders }
      );
    }

    // uploadedDataIdがある場合、対応するスクリーンショットデータが存在するかチェック
    let validScreenshotDataId: string | null = null;

    if (uploadedDataId) {
      try {
        // スクリーンショットデータの存在確認
        const existingScreenshotData = await prisma.screenshotData.findUnique({
          where: { id: uploadedDataId }
        });

        if (existingScreenshotData) {
          validScreenshotDataId = uploadedDataId;
          console.log('フィードバック受信: 既存のスクリーンショットデータあり', { uploadedDataId, comment });
        } else {
          console.log('フィードバック受信: uploadedDataIdが指定されましたが、対応するスクリーンショットデータが見つかりません', { uploadedDataId, comment });
          validScreenshotDataId = null;
        }
      } catch (error) {
        console.warn('スクリーンショットデータの存在確認でエラー:', error);
        validScreenshotDataId = null;
      }
    } else {
      console.log('フィードバック受信: スクリーンショットデータなし', { comment });
    }

    const feedbackId = await insertFeedbackNew({
      comment,
      screenshotDataId: validScreenshotDataId,
      timestamp: timestamp || Date.now(),
      userAgent: request.headers.get('user-agent') || undefined,
      url: url || undefined,
      userName: userName || undefined
    });

    console.log(`フィードバックを受信しました: ID ${feedbackId}, スクリーンショットデータID: ${uploadedDataId || 'なし'}`);

    // レスポンス前にフィードバックデータを先読みしてキャッシュ（バックグラウンド処理の信頼性向上）
    let prefetchedFeedbackData: any = null;
    try {
      prefetchedFeedbackData = await getFeedbackById(feedbackId);
    } catch (prefetchError) {
      console.warn(`フィードバックデータの先読みに失敗: ID ${feedbackId}`, prefetchError);
    }

    // setImmediate()とprocess.nextTick()を使用してレスポンス後にバックグラウンド処理を実行
    // クライアント接続が切れても処理が継続される可能性を向上
    setImmediate(() => {
      process.nextTick(async () => {
        try {
          console.log(`バックグラウンド処理開始（setImmediate + nextTick）: フィードバックID ${feedbackId}`);
          
          // 先読みしたデータがあればそれを使用、なければ再取得
          const backgroundParams = {
            comment,
            uploadedDataId,
            errorDetails,
            url,
            githubRepository,
            userName,
            prefetchedData: prefetchedFeedbackData // 先読みデータを渡す
          };
          
          await processExternalApisInBackground(feedbackId, backgroundParams);
          console.log(`バックグラウンド処理完了（setImmediate + nextTick）: フィードバックID ${feedbackId}`);
        } catch (error) {
          console.error(`バックグラウンド処理でエラーが発生しました（setImmediate + nextTick）: フィードバックID ${feedbackId}`, error);
        }
      });
    });

    return NextResponse.json({
      success: true,
      id: feedbackId.toString(),
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