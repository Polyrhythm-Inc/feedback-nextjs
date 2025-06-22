import { prisma } from './prisma';

export interface FeedbackRecord {
  id: number;
  comment: string;
  screenshotUrl: string; // S3 URL
  tabUrl: string;
  tabTitle: string;
  timestamp: bigint;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackCreateData {
  comment: string;
  screenshotUrl: string;
  tabUrl: string;
  tabTitle: string;
  timestamp: number;
  userAgent: string;
}

// フィードバックの挿入
export async function insertFeedback(data: FeedbackCreateData): Promise<number> {
  try {
    const feedback = await prisma.feedback.create({
      data: {
        comment: data.comment,
        screenshotUrl: data.screenshotUrl,
        tabUrl: data.tabUrl,
        tabTitle: data.tabTitle,
        timestamp: BigInt(data.timestamp),
        userAgent: data.userAgent,
      },
    });

    console.log(`フィードバックを保存しました: ID ${feedback.id}`);
    return feedback.id;
  } catch (error) {
    console.error('フィードバック保存エラー:', error);
    throw new Error('フィードバックの保存に失敗しました');
  }
}

// 全フィードバックの取得
export async function getAllFeedback(): Promise<FeedbackRecord[]> {
  try {
    const feedbacks = await prisma.feedback.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    return feedbacks.map((feedback: any) => ({
      ...feedback,
      timestamp: feedback.timestamp
    }));
  } catch (error) {
    console.error('フィードバック取得エラー:', error);
    throw new Error('フィードバックの取得に失敗しました');
  }
}

// IDによるフィードバック取得
export async function getFeedbackById(id: number): Promise<FeedbackRecord | null> {
  try {
    const feedback = await prisma.feedback.findUnique({
      where: { id }
    });

    if (!feedback) return null;

    return {
      ...feedback,
      timestamp: feedback.timestamp
    };
  } catch (error) {
    console.error('フィードバック取得エラー:', error);
    throw new Error('フィードバックの取得に失敗しました');
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