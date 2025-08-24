import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// CORS対応のヘッダー
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const { id } = params;

        if (!id) {
            return NextResponse.json(
                { error: 'IDが指定されていません' },
                { status: 400, headers: corsHeaders }
            );
        }

        // データベースからスクリーンショットデータを取得
        const screenshotData = await prisma.screenshotData.findUnique({
            where: { id },
        });

        if (!screenshotData) {
            return NextResponse.json(
                { error: 'スクリーンショットデータが見つかりません' },
                { status: 404, headers: corsHeaders }
            );
        }

        // レスポンス用にデータを整形
        const responseData = {
            id: screenshotData.id,
            screenshotUrl: screenshotData.screenshotUrl,
            tabUrl: screenshotData.tabUrl,
            tabTitle: screenshotData.tabTitle,
            timestamp: screenshotData.timestamp,
            pageInfo: screenshotData.pageInfo,
            tempComment: screenshotData.tempComment || '',
            createdAt: screenshotData.createdAt,
        };

        return NextResponse.json(responseData, { headers: corsHeaders });

    } catch (error) {
        console.error('スクリーンショットデータ取得エラー:', error);

        return NextResponse.json(
            {
                error: 'サーバーエラーが発生しました',
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