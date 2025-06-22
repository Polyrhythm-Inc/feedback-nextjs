import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// CORS対応のヘッダー
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function PUT(request: NextRequest) {
    try {
        console.log('📁 ローカルファイルアップロード処理開始');

        // リクエストからファイルデータを取得
        const buffer = await request.arrayBuffer();
        const fileBuffer = Buffer.from(buffer);

        console.log(`📄 ファイルサイズ: ${fileBuffer.length} bytes`);

        // URLからファイルパスを取得
        const url = new URL(request.url);
        const searchParams = url.searchParams;

        // ファイル情報をクエリパラメータから取得
        const fileName = searchParams.get('fileName') || `upload_${Date.now()}.png`;
        const fileType = searchParams.get('fileType') || 'image/png';
        const rawKey = searchParams.get('key') || `temp/${Date.now()}.png`;

        // セキュリティチェック: 不正なパスをブロック
        if (rawKey.includes('..') || rawKey.includes('\\') || rawKey.startsWith('/')) {
            console.error(`🚫 不正なファイルパス: ${rawKey}`);
            return NextResponse.json(
                {
                    error: '不正なファイルパスです',
                    details: 'ファイルパスに無効な文字が含まれています'
                },
                { status: 400, headers: corsHeaders }
            );
        }

        const key = rawKey;
        console.log(`📝 ファイル情報: ${fileName}, タイプ: ${fileType}, キー: ${key}`);

        // uploads ディレクトリを作成
        const uploadsDir = join(process.cwd(), 'public', 'uploads');
        const fileDir = join(uploadsDir, key.split('/').slice(0, -1).join('/'));

        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
            console.log('📁 uploadsディレクトリを作成しました');
        }

        if (!existsSync(fileDir)) {
            await mkdir(fileDir, { recursive: true });
            console.log(`📁 ${fileDir}ディレクトリを作成しました`);
        }

        // ファイルを保存
        const filePath = join(uploadsDir, key);
        await writeFile(filePath, fileBuffer);

        console.log(`✅ ファイル保存完了: ${filePath}`);

        // ファイルアクセス用のURLを生成
        const fileUrl = `http://localhost:3300/uploads/${key}`;

        // 成功ログをコンソールに出力
        console.log(`🎉 ローカルファイルアップロード成功: ${fileUrl}`);

        return NextResponse.json({
            success: true,
            key,
            fileUrl,
            message: 'ファイルをローカルに保存しました'
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('ローカルファイルアップロードエラー:', error);

        return NextResponse.json(
            {
                error: 'ファイルの保存に失敗しました',
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