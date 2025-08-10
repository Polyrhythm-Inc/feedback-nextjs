import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // データベース接続チェック（必要に応じて追加）
    // const db = await getDatabase();
    // await db.ping();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'feedback-suite',
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}