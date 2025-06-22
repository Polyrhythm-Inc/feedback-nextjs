import { NextRequest, NextResponse } from 'next/server';
import { deleteFeedback, getFeedbackById } from '@/lib/database';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '無効なIDです' },
        { status: 400 }
      );
    }
    
    // フィードバックが存在するかチェック
    const existingFeedback = await getFeedbackById(id);
    if (!existingFeedback) {
      return NextResponse.json(
        { error: '指定されたフィードバックが見つかりません' },
        { status: 404 }
      );
    }
    
    // 削除実行
    const success = await deleteFeedback(id);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'フィードバックを削除しました'
      });
    } else {
      return NextResponse.json(
        { error: '削除に失敗しました' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('フィードバック削除エラー:', error);
    
    return NextResponse.json(
      { 
        error: '削除中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  }
} 