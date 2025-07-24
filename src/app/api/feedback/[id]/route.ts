import { NextRequest, NextResponse } from 'next/server';
import { deleteFeedback, getFeedbackById, updateFeedbackComment } from '@/lib/database';

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

export async function PATCH(
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
    
    // リクエストボディを取得
    const body = await request.json();
    const { comment } = body;
    
    if (typeof comment !== 'string') {
      return NextResponse.json(
        { error: 'コメントは文字列である必要があります' },
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
    
    // コメント更新実行
    const success = await updateFeedbackComment(id, comment);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'コメントを更新しました'
      });
    } else {
      return NextResponse.json(
        { error: '更新に失敗しました' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('フィードバックコメント更新エラー:', error);
    
    return NextResponse.json(
      { 
        error: '更新中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  }
} 