import { prisma } from './prisma';

export interface FeedbackRecord {
  id: number;
  comment: string;
  screenshotDataId: string;
  timestamp: number;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
  screenshotData: ScreenshotDataRecord;
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
  screenshotDataId: string;
  timestamp: number;
  userAgent?: string;
}

// スクリーンショットデータの挿入
export async function insertScreenshotData(data: ScreenshotDataCreateData): Promise<string> {
  try {
    const screenshotData = await prisma.screenshotData.create({
      data: {
        screenshotUrl: data.screenshotUrl,
        domTree: data.domTree,
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
        screenshotDataId: data.screenshotDataId,
        timestamp: Math.floor(data.timestamp / 1000), // ミリ秒を秒に変換
        userAgent: data.userAgent || null,
      },
    });

    console.log(`フィードバックを保存しました: ID ${feedback.id} (スクリーンショットデータID: ${data.screenshotDataId})`);
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

    return feedbacks;
  } catch (error) {
    console.error('フィードバック取得エラー:', error);
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

    return feedback;
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