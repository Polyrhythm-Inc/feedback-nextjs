import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedUrl } from '@/lib/s3';

// CORS対応のヘッダー
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, fileType, feedbackId } = body;
    
    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'ファイル名とファイルタイプは必須です' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // プリサインURLを生成
    const presignedData = await generatePresignedUrl(fileName, fileType, feedbackId);
    
    return NextResponse.json({
      success: true,
      ...presignedData
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error('プリサインURL生成エラー:', error);
    
    return NextResponse.json(
      { 
        error: 'プリサインURLの生成に失敗しました',
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