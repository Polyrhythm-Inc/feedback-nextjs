import { FeedbackRecord } from '@/lib/database';
import { GoogleGenerativeAI } from '@google/generative-ai';

// タスク管理サーバのAPIエンドポイント
const TASK_SERVER_API_URL = 'https://tasks.polyrhythm.tokyo/api/external/tasks';

// タスク作成リクエストの型定義
interface CreateTaskRequest {
  title: string;
  description: string;
  projectId?: number;
  phaseId?: number;
  userId?: number;
  dueDate?: string;
  estimatedMinutes?: number;
  targetMinutes?: number;
  points?: number;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELED';
  level?: number;
  parentId?: number;
  startDate?: string;
  endDate?: string;
  tags?: string[];
}

// タスク作成レスポンスの型定義
interface CreateTaskResponse {
  success: boolean;
  data?: {
    id: number;
    title: string;
    description: string;
    [key: string]: any;
  };
  message?: string;
  error?: string;
}

/**
 * コメントを要約してタスクタイトルを生成
 */
async function generateTaskTitle(comment: string): Promise<string> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Gemini APIキーが設定されていません。フォールバック処理を使用します。');
      return `[FB] ${comment.slice(0, 50)}${comment.length > 50 ? '...' : ''}`;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `以下のフィードバックコメントを15文字以内で要約してください。要約のみを返してください。

コメント: ${comment}`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    // 要約が長すぎる場合は切り詰める
    const truncatedSummary = summary.length > 30 ? summary.slice(0, 30) + '...' : summary;

    return `[FB] ${truncatedSummary}`;
  } catch (error) {
    console.error('Gemini APIエラー:', error);
    // エラー時はコメントの最初の50文字を使用
    return `[FB] ${comment.slice(0, 50)}${comment.length > 50 ? '...' : ''}`;
  }
}

/**
 * フィードバックからタスクデータを作成
 */
export async function createTaskDataFromFeedback(feedback: FeedbackRecord, errorDetails?: any, githubRepository?: string, userName?: string | null): Promise<CreateTaskRequest> {
  const { comment, screenshotData, url } = feedback;
  // URLの優先順位: url > screenshotData.tabUrl > errorDetails.pageUrl
  const tabUrl = url || screenshotData?.tabUrl || errorDetails?.pageUrl || 'URL不明';
  const tabTitle = screenshotData?.tabTitle || 'ページタイトル不明';
  const screenshotUrl = screenshotData?.screenshotUrl || '';

  // タイトルを生成（コメントの要約を使用）
  const title = await generateTaskTitle(comment);

  // 説明文を作成
  let description = `## フィードバック内容
${comment}

## ページ情報
- URL: ${tabUrl}
- タイトル: ${tabTitle}
${screenshotUrl ? `- スクリーンショット: ${screenshotUrl} (curlコマンドで/tmpフォルダ内にダウンロードして読み取ってください)` : ''}
${userName ? `
## 報告者
${userName}` : ''}

## 受信日時
${new Date(feedback.timestamp * 1000).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`;

  // errorDetailsがある場合は詳細情報を追加
  if (errorDetails) {
    description += `\n\n## エラー詳細情報`;

    if (errorDetails.source) {
      description += `\n- ソース: ${errorDetails.source}`;
    }

    if (errorDetails.pageUrl) {
      description += `\n- ページURL: ${errorDetails.pageUrl}`;
    }

    if (errorDetails.userAgent) {
      description += `\n- ユーザーエージェント: ${errorDetails.userAgent}`;
    }

    if (errorDetails.stack) {
      description += `\n\n### スタックトレース\n\`\`\`\n${errorDetails.stack}\n\`\`\``;
    }

    // その他のプロパティも含める
    const knownProps = ['source', 'pageUrl', 'userAgent', 'stack'];
    const otherProps = Object.keys(errorDetails).filter(key => !knownProps.includes(key));

    if (otherProps.length > 0) {
      description += `\n\n### その他の情報`;
      for (const prop of otherProps) {
        const value = errorDetails[prop];
        if (typeof value === 'object') {
          description += `\n- ${prop}: ${JSON.stringify(value, null, 2)}`;
        } else {
          description += `\n- ${prop}: ${value}`;
        }
      }
    }
  }

  // GitHubリポジトリ情報を追加
  if (githubRepository) {
    description += `\n\n### GitHubリポジトリ\n${githubRepository}`;
  }

  description += `\n\n---\n*このタスクは自動的に作成されました*`;

  return {
    title,
    description,
    status: 'TODO',
    tags: ['フィードバック', '自動作成'],
    estimatedMinutes: 60, // デフォルトで1時間の見積もり
  };
}

/**
 * タスク管理サーバにタスクを作成
 */
export async function createTaskFromFeedback(
  feedback: FeedbackRecord,
  apiKey: string,
  errorDetails?: any,
  githubRepository?: string,
  userName?: string | null
): Promise<{ success: boolean; taskId?: number; taskUrl?: string; error?: string }> {
  try {
    const taskData = await createTaskDataFromFeedback(feedback, errorDetails, githubRepository, userName);

    console.log('タスク管理サーバにタスクを作成します:', {
      url: TASK_SERVER_API_URL,
      title: taskData.title,
    });

    const response = await fetch(TASK_SERVER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(taskData),
    });

    const responseData: CreateTaskResponse = await response.json();

    if (!response.ok) {
      console.error('タスク作成失敗:', {
        status: response.status,
        error: responseData.error || responseData.message,
      });
      return {
        success: false,
        error: responseData.error || `HTTPエラー: ${response.status}`,
      };
    }

    if (responseData.success && responseData.data) {
      console.log('タスク作成成功:', {
        taskId: responseData.data.id,
        title: responseData.data.title,
      });

      // タスクのURLを生成（推定）
      const taskUrl = `https://tasks.polyrhythm.tokyo/tasks/${responseData.data.id}`;

      return {
        success: true,
        taskId: responseData.data.id,
        taskUrl,
      };
    } else {
      return {
        success: false,
        error: responseData.error || '不明なエラー',
      };
    }
  } catch (error) {
    console.error('タスク作成中の例外:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

/**
 * 環境変数からAPIキーを取得
 */
export function getTaskServerApiKey(): string | undefined {
  return process.env.TASK_SERVER_API_KEY;
}