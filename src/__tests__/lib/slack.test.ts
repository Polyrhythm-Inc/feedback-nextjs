/**
 * Slack通知機能のテスト
 */

import {
    sendSlackMessage,
    createFeedbackNotificationMessage,
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
                status: 200
            });

            const result = await sendSlackMessage(mockMessage);

            expect(result).toBe(true);
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

            expect(result).toBe(false);
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

            expect(result).toBe(false);
        });

        it('ネットワークエラー時はfalseを返す', async () => {
            process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/TEST/WEBHOOK';

            // fetchのモック設定（例外発生）
            (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const result = await sendSlackMessage(mockMessage);

            expect(result).toBe(false);
        });
    });

    describe('createFeedbackNotificationMessage', () => {
        const mockFeedbackData: FeedbackNotificationData = {
            id: '123',
            comment: 'テストフィードバック',
            tabUrl: 'https://example.com/page',
            tabTitle: 'サンプルページ',
            timestamp: 1734944285, // 秒単位のUnix時間（2024-12-23 08:58:05 UTC）
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            screenshotUrl: 'https://s3.amazonaws.com/bucket/screenshot.png'
        };

        it('正常にSlackメッセージを生成できる', () => {
            const message = createFeedbackNotificationMessage(mockFeedbackData);

            expect(message.text).toBe('新しいフィードバックが届きました！');
            expect(message.blocks).toHaveLength(6); // header, 2つのsection, image, context

            // ヘッダーブロックの確認
            expect(message.blocks![0]).toEqual({
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '📝 新しいフィードバック'
                }
            });

            // ID・投稿時刻セクションの確認
            expect(message.blocks![1].fields).toEqual([
                {
                    type: 'mrkdwn',
                    text: '*ID:*\n123'
                },
                {
                    type: 'mrkdwn',
                    text: '*投稿時刻:*\n2024/12/23 17:58:05'
                }
            ]);

            // ページ情報セクションの確認
            expect(message.blocks![2].fields).toEqual([
                {
                    type: 'mrkdwn',
                    text: '*ページタイトル:*\nサンプルページ'
                },
                {
                    type: 'mrkdwn',
                    text: '*URL:*\n<https://example.com/page|https://example.com/page>'
                }
            ]);

            // コメントセクションの確認
            expect(message.blocks![3]).toEqual({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '*コメント:*\nテストフィードバック'
                }
            });
        });

        it('スクリーンショットURLが未設定の場合は画像ブロックを含まない', () => {
            const dataWithoutScreenshot = { ...mockFeedbackData };
            delete dataWithoutScreenshot.screenshotUrl;

            const message = createFeedbackNotificationMessage(dataWithoutScreenshot);

            expect(message.blocks).toHaveLength(5); // header + 3つのsection + context
        });

        it('timestampが秒単位（Unix時間）の場合は正しくミリ秒に変換される', () => {
            // 秒単位のUnix時間（1734944285 = 2024-12-23 08:58:05 UTC）
            const dataWithUnixSeconds = { 
                ...mockFeedbackData, 
                timestamp: 1734944285 
            };

            const message = createFeedbackNotificationMessage(dataWithUnixSeconds);

            // 日本時間で表示されることを確認（UTC+9）
            expect(message.blocks![1].fields![1].text).toBe('*投稿時刻:*\n2024/12/23 17:58:05');
        });

        it('timestampがミリ秒単位の場合はそのまま使用される', () => {
            // ミリ秒単位の時間
            const dataWithMilliseconds = { 
                ...mockFeedbackData, 
                timestamp: 1734944285000 
            };

            const message = createFeedbackNotificationMessage(dataWithMilliseconds);

            // 日本時間で表示されることを確認（UTC+9）
            expect(message.blocks![1].fields![1].text).toBe('*投稿時刻:*\n2024/12/23 17:58:05');
        });

        it('timestampが文字列（秒単位）の場合は適切に処理される', () => {
            // 文字列形式の秒単位時間
            const dataWithStringTimestamp = { 
                ...mockFeedbackData, 
                timestamp: '1734944285'  // 秒単位の文字列
            };

            const message = createFeedbackNotificationMessage(dataWithStringTimestamp);

            // 文字列は Number() で変換されて秒単位として扱われる
            expect(message.blocks![1].fields![1].text).toBe('*投稿時刻:*\n2024/12/23 17:58:05');
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

        it('正常にフィードバック通知を送信できる', async () => {
            process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/TEST/WEBHOOK';

            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200
            });

            const result = await notifyFeedbackReceived(mockFeedbackData);

            expect(result).toBe(true);
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('メッセージ生成エラー時はfalseを返す', async () => {
            // 不正なデータを渡してエラーを発生させる
            const invalidData = { ...mockFeedbackData, timestamp: 'invalid-date' };

            const result = await notifyFeedbackReceived(invalidData);

            // メッセージ生成でエラーが発生してもfalseを返す
            expect(result).toBe(false);
        });
    });
}); 