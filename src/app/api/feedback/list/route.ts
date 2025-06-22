import { NextResponse } from 'next/server';
import { getAllFeedback, getFeedbackStats } from '@/lib/database';

export async function GET() {
  try {
    const feedbacks = await getAllFeedback();
    const stats = await getFeedbackStats();
    
    // BigIntを文字列に変換してJSONシリアライズ可能にする
    const serializedFeedbacks = feedbacks.map(feedback => ({
      ...feedback,
      timestamp: feedback.timestamp.toString(),
      createdAt: feedback.createdAt.toISOString(),
      updatedAt: feedback.updatedAt.toISOString(),
    }));
    
    return NextResponse.json({
      success: true,
      feedbacks: serializedFeedbacks,
      count: feedbacks.length,
      stats: stats
    });
    
  } catch (error) {
    console.error('フィードバック取得エラー:', error);
    
    return NextResponse.json(
      { 
        error: 'データ取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  }
} 