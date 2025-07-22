import { FeedbackRecord } from '@/lib/database';

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
 * フィードバックからタスクデータを作成
 */
export function createTaskDataFromFeedback(feedback: FeedbackRecord): CreateTaskRequest {
  const { comment, screenshotData } = feedback;
  const tabUrl = screenshotData?.tabUrl || 'URL不明';
  const tabTitle = screenshotData?.tabTitle || 'ページタイトル不明';
  const screenshotUrl = screenshotData?.screenshotUrl || '';
  
  // タイトルを作成（URLから抽出した情報を含む）
  const title = `[フィードバック] ${tabTitle}`;
  
  // 説明文を作成
  const description = `## フィードバック内容
${comment}

## ページ情報
- URL: ${tabUrl}
- タイトル: ${tabTitle}
${screenshotUrl ? `- スクリーンショット: ${screenshotUrl}` : ''}

## 受信日時
${new Date(feedback.timestamp * 1000).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}

---
*このタスクは自動的に作成されました*`;

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
  apiKey: string
): Promise<{ success: boolean; taskId?: number; taskUrl?: string; error?: string }> {
  try {
    const taskData = createTaskDataFromFeedback(feedback);
    
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