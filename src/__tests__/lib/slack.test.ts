/**
 * Slack通知機能のテスト
 */

import {
    sendSlackMessage,
    createFeedbackTitleMessage,
    createFeedbackDetailMessage,
    notifyFeedbackReceived,
    type SlackMessage,
    type FeedbackNotificationData
} from '@/lib/slack';

// fetchのモック
global.fetch = jest.fn();

describe('Slack通知機能', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // 環境変数のリセット
        delete process.env.SLACK_WEBHOOK_URL;
    });

    describe('sendSlackMessage', () => {
        const mockMessage: SlackMessage = {
            text: 'テストメッセージ',
            blocks: []
        };

        it('正常にSlackメッセージを送信できる', async () => {
            // 環境変数を設定
            process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/TEST/WEBHOOK';

            // fetchのモック設定
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: jest.fn().mockResolvedValue('ok')
            });

            const result = await sendSlackMessage(mockMessage);

            expect(result.success).toBe(true);
            expect(fetch).toHaveBeenCalledWith(
                'https://hooks.slack.com/services/TEST/WEBHOOK',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(mockMessage),
                }
            );
        });

        it('SLACK_WEBHOOK_URLが未設定の場合はfalseを返す', async () => {
            // 環境変数未設定
            const result = await sendSlackMessage(mockMessage);

            expect(result.success).toBe(false);
            expect(fetch).not.toHaveBeenCalled();
        });

        it('Slack APIエラー時はfalseを返す', async () => {
            process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/TEST/WEBHOOK';

            // fetchのモック設定（エラーレスポンス）
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                text: jest.fn().mockResolvedValue('Invalid payload')
            });

            const result = await sendSlackMessage(mockMessage);

            expect(result.success).toBe(false);
        });

        it('ネットワークエラー時はfalseを返す', async () => {
            process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/TEST/WEBHOOK';

            // fetchのモック設定（例外発生）
            (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const result = await sendSlackMessage(mockMessage);

            expect(result.success).toBe(false);
        });
    });

    describe('createFeedbackTitleMessage', () => {
        const mockFeedbackData: FeedbackNotificationData = {
            id: '123',
            comment: 'テストフィードバック',
            tabUrl: 'https://example.com/page',
            tabTitle: 'サンプルページ',
            timestamp: 1734944285, // 秒単位のUnix時間（2024-12-23 08:58:05 UTC）
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            screenshotUrl: 'https://s3.amazonaws.com/bucket/screenshot.png'
        };

        it('正常にタイトルメッセージを生成できる', () => {
            const message = createFeedbackTitleMessage(mockFeedbackData);

            expect(message.text).toBe('📝 新しいフィードバック: サンプルページ');
            expect(message.blocks).toHaveLength(2); // header, section

            // ヘッダーブロックの確認
            expect(message.blocks![0]).toEqual({
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '📝 新しいフィードバック'
                }
            });

            // ページ情報セクションの確認
            expect(message.blocks![1]).toEqual({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '*サンプルページ*\n<https://example.com/page|https://example.com/page>'
                }
            });
        });

    });

    describe('createFeedbackDetailMessage', () => {
        const mockFeedbackData: FeedbackNotificationData = {
            id: '123',
            comment: 'テストフィードバック',
            tabUrl: 'https://example.com/page',
            tabTitle: 'サンプルページ',
            timestamp: 1734944285, // 秒単位のUnix時間（2024-12-23 08:58:05 UTC）
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            screenshotUrl: 'https://s3.amazonaws.com/bucket/screenshot.png'
        };

        it('正常に詳細メッセージを生成できる', () => {
            const threadTs = '1234567890.123456';
            const message = createFeedbackDetailMessage(mockFeedbackData, threadTs);

            expect(message.text).toBe('フィードバックの詳細');
            expect(message.thread_ts).toBe(threadTs);
            expect(message.blocks).toHaveLength(4); // 2つのsection + image + context

            // ID・投稿時刻セクションの確認
            expect(message.blocks![0].fields).toEqual([
                {
                    type: 'mrkdwn',
                    text: '*ID:*\n123'
                },
                {
                    type: 'mrkdwn',
                    text: '*投稿時刻:*\n2024/12/23 17:58:05'
                }
            ]);

            // コメントセクションの確認
            expect(message.blocks![1]).toEqual({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '*コメント:*\nテストフィードバック'
                }
            });
        });

        it('timestampが秒単位（Unix時間）の場合は正しくミリ秒に変換される', () => {
            // 秒単位のUnix時間（1734944285 = 2024-12-23 08:58:05 UTC）
            const dataWithUnixSeconds = { 
                ...mockFeedbackData, 
                timestamp: 1734944285 
            };

            const message = createFeedbackDetailMessage(dataWithUnixSeconds, '1234567890.123456');

            // 日本時間で表示されることを確認（UTC+9）
            expect(message.blocks![0].fields![1].text).toBe('*投稿時刻:*\n2024/12/23 17:58:05');
        });
    });

    describe('notifyFeedbackReceived', () => {
        const mockFeedbackData: FeedbackNotificationData = {
            id: '123',
            comment: 'テストフィードバック',
            tabUrl: 'https://example.com/page',
            tabTitle: 'サンプルページ',
            timestamp: 1734944285, // 秒単位のUnix時間
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };

        it('正常にフィードバック通知を送信できる（Webhook環境）', async () => {
            process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/TEST/WEBHOOK';

            // Webhook環境では2回のAPI呼び出しが行われる（タイトル + 詳細）
            (fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    text: jest.fn().mockResolvedValue('ok')
                })
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    text: jest.fn().mockResolvedValue('ok')
                });

            const result = await notifyFeedbackReceived(mockFeedbackData);

            expect(result).toBe(true);
            expect(fetch).toHaveBeenCalledTimes(2); // タイトル + 詳細
        });

        it('タイトル送信失敗時はfalseを返す', async () => {
            process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/TEST/WEBHOOK';

            // タイトル送信で失敗
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                text: jest.fn().mockResolvedValue('Invalid payload')
            });

            const result = await notifyFeedbackReceived(mockFeedbackData);

            expect(result).toBe(false);
            expect(fetch).toHaveBeenCalledTimes(1); // タイトル送信のみ
        });
    });
}); 