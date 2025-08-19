import { prisma } from './prisma';

export interface FeedbackRecord {
  id: number;
  comment: string;
  screenshotDataId: string | null;
  timestamp: number;
  userAgent: string | null;
  url: string | null;
  createdAt: Date;
  updatedAt: Date;
  screenshotData: ScreenshotDataRecord | null;
}

// 古いFeedbackCreateData（削除予定）
export interface FeedbackCreateData {
  comment: string;
  screenshotUrl: string;
  tabUrl: string;
  tabTitle: string;
  timestamp: number;
  userAgent: string;
}

export interface ScreenshotDataRecord {
  id: string;
  screenshotUrl: string;
  domTree: string;
  tabUrl: string;
  tabTitle: string;
  timestamp: number;
  pageInfo: any;
  createdAt: Date;
  updatedAt: Date;
}

// DOMツリーデータをデコードするヘルパー関数
function decodeDomTree(encodedDomTree: string): string {
  try {
    return Buffer.from(encodedDomTree, 'base64').toString('utf8');
  } catch (error) {
    console.warn('DOMツリーのデコードに失敗しました、元のデータを返します:', error);
    return encodedDomTree; // デコードに失敗した場合は元のデータを返す（後方互換性のため）
  }
}

export interface ScreenshotDataCreateData {
  screenshotUrl: string;
  domTree: string;
  tabUrl: string;
  tabTitle: string;
  timestamp: number;
  pageInfo?: any;
}

export interface FeedbackCreateDataNew {
  comment: string;
  screenshotDataId?: string | null;
  timestamp: number;
  userAgent?: string;
  url?: string;
  userName?: string;
}

// スクリーンショットデータの挿入
export async function insertScreenshotData(data: ScreenshotDataCreateData): Promise<string> {
  try {
    // DOMツリーデータをBase64エンコードして特殊文字問題を回避
    const encodedDomTree = Buffer.from(data.domTree, 'utf8').toString('base64');
    
    const screenshotData = await prisma.screenshotData.create({
      data: {
        screenshotUrl: data.screenshotUrl,
        domTree: encodedDomTree,
        tabUrl: data.tabUrl,
        tabTitle: data.tabTitle,
        timestamp: Math.floor(data.timestamp / 1000), // ミリ秒を秒に変換
        pageInfo: data.pageInfo || null,
      },
    });

    console.log(`スクリーンショットデータを保存しました: ID ${screenshotData.id}`);
    return screenshotData.id;
  } catch (error) {
    console.error('スクリーンショットデータ保存エラー:', error);
    throw new Error('スクリーンショットデータの保存に失敗しました');
  }
}

// フィードバックの挿入（既存フィールドを使用）- 削除予定
export async function insertFeedback(data: FeedbackCreateData): Promise<number> {
  try {
    // この関数は削除予定です - 新しいスキーマでは使用できません
    throw new Error('この関数は削除されました。insertFeedbackNewを使用してください。');
  } catch (error) {
    console.error('フィードバック保存エラー:', error);
    throw new Error('フィードバックの保存に失敗しました');
  }
}

// フィードバックの挿入（新しい標準形式）
export async function insertFeedbackNew(data: FeedbackCreateDataNew): Promise<number> {
  try {
    const feedback = await prisma.feedback.create({
      data: {
        comment: data.comment,
        screenshotDataId: data.screenshotDataId || null,
        timestamp: Math.floor(data.timestamp / 1000), // ミリ秒を秒に変換
        userAgent: data.userAgent || null,
        url: data.url || null,
        userName: data.userName || null,
      },
    });

    const screenshotInfo = data.screenshotDataId ? ` (スクリーンショットデータID: ${data.screenshotDataId})` : ' (スクリーンショットデータなし)';
    console.log(`フィードバックを保存しました: ID ${feedback.id}${screenshotInfo}`);
    return feedback.id;
  } catch (error) {
    console.error('フィードバック保存エラー:', error);
    throw new Error('フィードバックの保存に失敗しました');
  }
}

// 全フィードバックの取得（スクリーンショットデータを含む）
export async function getAllFeedback(): Promise<FeedbackRecord[]> {
  try {
    const feedbacks = await prisma.feedback.findMany({
      include: {
        screenshotData: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // DOMツリーをデコード
    return feedbacks.map(feedback => ({
      ...feedback,
      screenshotData: feedback.screenshotData ? {
        ...feedback.screenshotData,
        domTree: decodeDomTree(feedback.screenshotData.domTree)
      } : null
    }));
  } catch (error) {
    console.error('フィードバック取得エラー:', error);
    throw new Error('フィードバックの取得に失敗しました');
  }
}

// ページネーション付きフィードバック取得
export async function getPaginatedFeedback(page: number = 1, limit: number = 50): Promise<{
  feedbacks: FeedbackRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  try {
    const skip = (page - 1) * limit;

    // 総件数を取得
    const total = await prisma.feedback.count();

    // ページネーションしたデータを取得
    const feedbacks = await prisma.feedback.findMany({
      include: {
        screenshotData: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    // DOMツリーをデコード
    const decodedFeedbacks = feedbacks.map(feedback => ({
      ...feedback,
      screenshotData: feedback.screenshotData ? {
        ...feedback.screenshotData,
        domTree: decodeDomTree(feedback.screenshotData.domTree)
      } : null
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      feedbacks: decodedFeedbacks,
      total,
      page,
      limit,
      totalPages
    };
  } catch (error) {
    console.error('ページネーション付きフィードバック取得エラー:', error);
    throw new Error('フィードバックの取得に失敗しました');
  }
}

// IDによるフィードバック取得（スクリーンショットデータを含む）
export async function getFeedbackById(id: number): Promise<FeedbackRecord | null> {
  try {
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        screenshotData: true
      }
    });

    if (!feedback) return null;

    // DOMツリーをデコード
    return {
      ...feedback,
      screenshotData: feedback.screenshotData ? {
        ...feedback.screenshotData,
        domTree: decodeDomTree(feedback.screenshotData.domTree)
      } : null
    };
  } catch (error) {
    console.error('フィードバック取得エラー:', error);
    throw new Error('フィードバックの取得に失敗しました');
  }
}

// フィードバックのコメント更新
export async function updateFeedbackComment(id: number, comment: string): Promise<boolean> {
  try {
    await prisma.feedback.update({
      where: { id },
      data: { comment }
    });

    console.log(`フィードバックのコメントを更新しました: ID ${id}`);
    return true;
  } catch (error: any) {
    if (error && error.code === 'P2025') {
      // レコードが見つからない場合
      return false;
    }
    console.error('フィードバックコメント更新エラー:', error);
    throw new Error('フィードバックのコメント更新に失敗しました');
  }
}

// フィードバックの削除
export async function deleteFeedback(id: number): Promise<boolean> {
  try {
    await prisma.feedback.delete({
      where: { id }
    });

    console.log(`フィードバックを削除しました: ID ${id}`);
    return true;
  } catch (error: any) {
    if (error && error.code === 'P2025') {
      // レコードが見つからない場合
      return false;
    }
    console.error('フィードバック削除エラー:', error);
    throw new Error('フィードバックの削除に失敗しました');
  }
}

// 統計情報の取得
export async function getFeedbackStats() {
  try {
    const total = await prisma.feedback.count();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCount = await prisma.feedback.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const thisWeekCount = await prisma.feedback.count({
      where: {
        createdAt: {
          gte: weekAgo
        }
      }
    });

    return {
      total,
      today: todayCount,
      thisWeek: thisWeekCount
    };
  } catch (error) {
    console.error('統計情報取得エラー:', error);
    throw new Error('統計情報の取得に失敗しました');
  }
} 