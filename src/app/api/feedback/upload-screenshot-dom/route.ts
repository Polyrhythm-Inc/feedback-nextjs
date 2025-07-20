import { NextRequest, NextResponse } from 'next/server';
import { insertScreenshotData } from '@/lib/database';
import { uploadToS3 } from '@/lib/s3';

// CORS対応のヘッダー
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // リクエストデータの検証
        const { screenshot, domTree, pageInfo, timestamp } = body;

        if (!screenshot || !domTree || !pageInfo || !timestamp) {
            return NextResponse.json(
                { error: '必須項目が不足しています (screenshot, domTree, pageInfo, timestamp)' },
                { status: 400, headers: corsHeaders }
            );
        }

        const { url, title } = pageInfo;

        if (!url) {
            return NextResponse.json(
                { error: 'ページ情報が不完全です (url)' },
                { status: 400, headers: corsHeaders }
            );
        }

        console.log('スクリーンショット+DOMツリー アップロード開始', {
            url,
            title,
            screenshotLength: screenshot.length,
            domTreeLength: domTree.length
        });

        // Base64スクリーンショットをS3にアップロード
        let screenshotUrl: string;
        try {
            // スクリーンショットをS3にアップロード
            const fileName = `screenshot_${Date.now()}.png`;
            screenshotUrl = await uploadToS3(screenshot, fileName, 'image/png');
            console.log('S3アップロード成功:', screenshotUrl);
        } catch (s3Error) {
            console.error('S3アップロードエラー:', s3Error);
            return NextResponse.json(
                { error: 'スクリーンショットのアップロードに失敗しました' },
                { status: 500, headers: corsHeaders }
            );
        }

        // データベースに保存
        const screenshotDataId = await insertScreenshotData({
            screenshotUrl,
            domTree,
            tabUrl: url,
            tabTitle: title || '',  // タイトルが空の場合は空文字列を使用
            timestamp,
            pageInfo
        });

        console.log(`スクリーンショットデータを保存しました: ID ${screenshotDataId}`);

        return NextResponse.json({
            success: true,
            id: screenshotDataId,
            message: 'スクリーンショットとDOMツリーをアップロードしました'
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('スクリーンショット+DOMツリー アップロードエラー:', error);

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