import { NextRequest, NextResponse } from 'next/server';
import { insertFeedbackNew, getFeedbackById } from '@/lib/database';
import { notifyFeedbackReceived, notifyGitHubIssueError } from '@/lib/slack';
import { findProjectByUrl, findProjectByGithubRepository } from '@/lib/projects';
import { parseGitHubRepository, createGitHubIssue, createIssueDataFromFeedback } from '@/lib/github';
import { createTaskFromFeedback, getTaskServerApiKey } from '@/lib/task-server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

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

    // GitHub Issue URLを保存するための変数
    let githubIssueUrl: string | undefined;

    // GitHub issue作成
    try {
      // フィードバックの詳細データを取得
      const feedbackData = await getFeedbackById(feedbackId);

      if (feedbackData) {
        // URLを取得（url > スクリーンショットデータ > errorDetailsの優先順位）
        let tabUrl: string | undefined;

        if (feedbackData.url) {
          tabUrl = feedbackData.url;
        } else if (feedbackData.screenshotData) {
          tabUrl = feedbackData.screenshotData.tabUrl;
        } else if (errorDetails?.pageUrl) {
          tabUrl = errorDetails.pageUrl;
        }

        // プロジェクトを検索（URLとgithubRepositoryの両方で試行）
        let project = null;
        
        if (tabUrl) {
          console.log(`GitHub issue作成を開始: フィードバックID ${feedbackId}, URL: ${tabUrl}`);
          // URLからプロジェクトを検索
          project = await findProjectByUrl(tabUrl);
        }
        
        // URLが空またはプロジェクトが見つからない場合、githubRepositoryで検索
        if (!project && githubRepository) {
          console.log(`GitHubリポジトリでプロジェクトを検索: ${githubRepository}`);
          project = await findProjectByGithubRepository(githubRepository);
        }

        if (project && project.githubRepository) {
            console.log(`プロジェクトを発見: ${project.name} (${project.displayName}) - ${project.githubRepository}`);

            // GitHubリポジトリ情報を解析
            const repository = parseGitHubRepository(project.githubRepository);

            if (repository) {
              // GitHub issue作成
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
                console.log(`GitHub issue作成成功: フィードバックID ${feedbackId}, Issue URL: ${result.issueUrl}`);
                githubIssueUrl = result.issueUrl;
              } else {
                console.warn(`GitHub issue作成失敗: フィードバックID ${feedbackId}, Error: ${result.error}`);
                // エラー時にSlack通知を送信
                await notifyGitHubIssueError(
                  feedbackId,
                  result.error || 'Unknown error',
                  `${project.displayName} (${project.name})`,
                  project.githubRepository
                );
              }
            } else {
              console.warn(`GitHubリポジトリURL解析失敗: ${project.githubRepository}`);
            }
          } else {
            if (tabUrl) {
              console.log(`プロジェクトが見つからないか、GitHubリポジトリが設定されていません: URL ${tabUrl}`);
            } else if (githubRepository) {
              console.log(`プロジェクトが見つからないか、一致するGitHubリポジトリが設定されていません: ${githubRepository}`);
            } else {
              console.log(`GitHub issue作成スキップ: URLもGitHubリポジトリも指定されていません (フィードバックID ${feedbackId})`);
            }
          }
      } else {
        console.warn(`フィードバックデータが見つかりません: ID ${feedbackId}`);
      }
    } catch (error) {
      console.error(`GitHub issue作成例外: フィードバックID ${feedbackId}`, error);
      // 例外時にもSlack通知を送信
      await notifyGitHubIssueError(
        feedbackId,
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        undefined
      );
      // GitHub issue作成の失敗はレスポンスに影響させない
    }

    // タスク管理サーバへのタスク作成
    try {
      const apiKey = getTaskServerApiKey();

      if (apiKey) {
        // フィードバックの詳細データを取得（既に取得済みの場合は再利用）
        const feedbackData = await getFeedbackById(feedbackId);

        if (feedbackData) {
          console.log(`タスク管理サーバへのタスク作成を開始: フィードバックID ${feedbackId}`);

          const taskResult = await createTaskFromFeedback(feedbackData, apiKey, errorDetails, githubRepository, userName);

          if (taskResult.success) {
            console.log(`タスク作成成功: フィードバックID ${feedbackId}, タスクID: ${taskResult.taskId}, URL: ${taskResult.taskUrl}`);
          } else {
            console.warn(`タスク作成失敗: フィードバックID ${feedbackId}, Error: ${taskResult.error}`);
          }
        } else {
          console.warn(`タスク作成スキップ: フィードバックデータが見つかりません: ID ${feedbackId}`);
        }
      } else {
        console.log('タスク管理サーバのAPIキーが設定されていないため、タスク作成をスキップします');
      }
    } catch (error) {
      console.error(`タスク作成例外: フィードバックID ${feedbackId}`, error);
      // タスク作成の失敗はレスポンスに影響させない
    }

    // Slack通知（GitHub Issue作成後に実行）
    try {
      // フィードバックの詳細データを取得（既に取得済みの場合は再利用）
      const feedbackData = await getFeedbackById(feedbackId);

      if (feedbackData) {
        // URLとタイトルを取得（url > スクリーンショットデータ > エラー詳細の優先順位）
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
          timestamp: feedbackData.timestamp, // Slack通知では元のミリ秒のまま使用
          userAgent: feedbackData.userAgent || 'Unknown',
          screenshotUrl,
          screenshotDataId: uploadedDataId,
          githubIssueUrl: githubIssueUrl, // GitHub Issue URLを追加
          githubRepository: githubRepository // GitHubリポジトリを追加
        });

        if (notificationSent) {
          console.log(`Slack通知送信成功: フィードバックID ${feedbackId}`);
        } else {
          console.warn(`Slack通知送信失敗: フィードバックID ${feedbackId}`);
        }
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