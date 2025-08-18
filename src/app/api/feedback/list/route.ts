import { NextRequest, NextResponse } from 'next/server';
import { getPaginatedFeedback, getFeedbackStats } from '@/lib/database';
import { isPowerUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 権限チェック
    const hostname = request.headers.get('host') || 'feedback-suite.polyrhythm.tokyo';
    const isAuthorized = await isPowerUser(hostname, request);
    
    if (!isAuthorized) {
      return NextResponse.json(
        { 
          error: 'アクセス権限がありません',
          details: 'このAPIにアクセスするにはパワーユーザー権限が必要です'
        },
        { status: 403 }
      );
    }
    // URLパラメータからページ番号と件数を取得
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // ページ番号と件数の検証
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100); // 最大100件まで

    // ページネーション付きでフィードバックを取得
    const result = await getPaginatedFeedback(validPage, validLimit);
    const stats = await getFeedbackStats();
    
    // BigIntを文字列に変換してJSONシリアライズ可能にする
    const serializedFeedbacks = result.feedbacks.map(feedback => ({
      ...feedback,
      timestamp: feedback.timestamp.toString(),
      createdAt: feedback.createdAt.toISOString(),
      updatedAt: feedback.updatedAt.toISOString(),
    }));
    
    return NextResponse.json({
      success: true,
      feedbacks: serializedFeedbacks,
      count: result.feedbacks.length,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
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