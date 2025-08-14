import { NextRequest, NextResponse } from 'next/server';
import { isPowerUser } from '@/lib/auth';

// CORS対応のヘッダー
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export interface ErrorLog {
    source: 'chrome-extension' | 's3-upload' | 'api' | 'unknown';
    level: 'error' | 'warning' | 'info';
    message: string;
    details?: any;
    url?: string;
    userAgent?: string;
    timestamp: number;
}

// メモリ内エラーログ（本格運用時はデータベースに保存）
const errorLogs: (ErrorLog & { id: string })[] = [];
let logId = 1;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { source, level, message, details, url, userAgent } = body;

        if (!source || !level || !message) {
            return NextResponse.json(
                { error: '必須項目が不足しています (source, level, message)' },
                { status: 400, headers: corsHeaders }
            );
        }

        // エラーログを記録
        const errorLog: ErrorLog & { id: string } = {
            id: `log_${logId++}`,
            source,
            level,
            message,
            details,
            url,
            userAgent,
            timestamp: Date.now(),
        };

        errorLogs.unshift(errorLog);

        // ログは最新1000件まで保持
        if (errorLogs.length > 1000) {
            errorLogs.splice(1000);
        }

        // コンソールにも出力
        const logLevel = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log';
        console[logLevel](`[${source}] ${message}`, details || '');

        return NextResponse.json({
            success: true,
            id: errorLog.id,
            message: 'エラーログを記録しました'
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('エラーログ記録エラー:', error);

        return NextResponse.json(
            {
                error: 'エラーログの記録に失敗しました',
                details: error instanceof Error ? error.message : '不明なエラー'
            },
            { status: 500, headers: corsHeaders }
        );
    }
}

// エラーログ一覧取得
export async function GET(request: NextRequest) {
    try {
        // 権限チェック
        const hostname = request.headers.get('host') || 'feedback-suite.polyrhythm.tokyo';
        const isAuthorized = await isPowerUser(hostname);
        
        if (!isAuthorized) {
            return NextResponse.json(
                { 
                    error: 'アクセス権限がありません',
                    details: 'このAPIにアクセスするにはパワーユーザー権限が必要です'
                },
                { status: 403, headers: corsHeaders }
            );
        }

        const url = new URL(request.url);
        const limitParam = url.searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam) || 50 : 50;
        const source = url.searchParams.get('source');
        const level = url.searchParams.get('level');

        let filteredLogs = [...errorLogs];

        // フィルタリング
        if (source) {
            filteredLogs = filteredLogs.filter(log => log.source === source);
        }

        if (level) {
            filteredLogs = filteredLogs.filter(log => log.level === level);
        }

        // 制限
        const logs = filteredLogs.slice(0, limit);

        return NextResponse.json({
            success: true,
            logs,
            totalCount: filteredLogs.length,
            limit
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('エラーログ取得エラー:', error);

        return NextResponse.json(
            {
                error: 'エラーログの取得に失敗しました',
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