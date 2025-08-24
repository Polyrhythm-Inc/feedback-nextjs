import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
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

        const screenshotData = await prisma.screenshotData.findUnique({
            where: { id },
            select: {
                id: true,
                tempComment: true,
            },
        });

        if (!screenshotData) {
            return NextResponse.json(
                { error: 'スクリーンショットデータが見つかりません' },
                { status: 404, headers: corsHeaders }
            );
        }

        return NextResponse.json({
            id: screenshotData.id,
            tempComment: screenshotData.tempComment || '',
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('一時コメント取得エラー:', error);

        return NextResponse.json(
            {
                error: 'サーバーエラーが発生しました',
                details: error instanceof Error ? error.message : '不明なエラー'
            },
            { status: 500, headers: corsHeaders }
        );
    }
}

export async function POST(
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

        const body = await request.json();
        const { tempComment } = body;

        if (typeof tempComment !== 'string') {
            return NextResponse.json(
                { error: '一時コメントが正しく指定されていません' },
                { status: 400, headers: corsHeaders }
            );
        }

        const existingData = await prisma.screenshotData.findUnique({
            where: { id },
        });

        if (!existingData) {
            return NextResponse.json(
                { error: 'スクリーンショットデータが見つかりません' },
                { status: 404, headers: corsHeaders }
            );
        }

        const updatedData = await prisma.screenshotData.update({
            where: { id },
            data: {
                tempComment: tempComment || null,
            },
            select: {
                id: true,
                tempComment: true,
                updatedAt: true,
            },
        });

        return NextResponse.json({
            id: updatedData.id,
            tempComment: updatedData.tempComment || '',
            updatedAt: updatedData.updatedAt,
            message: '一時コメントを保存しました',
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('一時コメント保存エラー:', error);

        return NextResponse.json(
            {
                error: 'サーバーエラーが発生しました',
                details: error instanceof Error ? error.message : '不明なエラー'
            },
            { status: 500, headers: corsHeaders }
        );
    }
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    });
}