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
        delete process.env.SLACK_BOT_TOKEN;
        delete process.env.SLACK_CHANNEL_ID;
    });

    describe('sendSlackMessage', () => {
        const mockMessage: SlackMessage = {
            channel: 'C1234567890',
            text: 'テストメッセージ',
            blocks: []
        };

        it('正常にSlackメッセージを送信できる', async () => {
            // 環境変数を設定
            process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';

            // fetchのモック設定
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({
                    ok: true,
                    ts: '1234567890.123456'
                })
            });

            const result = await sendSlackMessage(mockMessage);

            expect(result.success).toBe(true);
            expect(result.ts).toBe('1234567890.123456');
            expect(fetch).toHaveBeenCalledWith(
                'https://slack.com/api/chat.postMessage',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer xoxb-test-token',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(mockMessage),
                }
            );
        });

        it('SLACK_BOT_TOKENが未設定の場合はfalseを返す', async () => {
            // 環境変数未設定
            const result = await sendSlackMessage(mockMessage);

            expect(result.success).toBe(false);
            expect(fetch).not.toHaveBeenCalled();
        });

        it('Slack APIエラー時はfalseを返す', async () => {
            process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';

            // fetchのモック設定（HTTPエラー）
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                text: jest.fn().mockResolvedValue('Invalid payload')
            });

            const result = await sendSlackMessage(mockMessage);

            expect(result.success).toBe(false);
        });

        it('Slack API応答でエラーが返った場合はfalseを返す', async () => {
            process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';

            // fetchのモック設定（Slack APIエラー）
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({
                    ok: false,
                    error: 'invalid_auth'
                })
            });

            const result = await sendSlackMessage(mockMessage);

            expect(result.success).toBe(false);
        });

        it('ネットワークエラー時はfalseを返す', async () => {
            process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';

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
            process.env.SLACK_CHANNEL_ID = 'C1234567890';
            
            const message = createFeedbackTitleMessage(mockFeedbackData);

            expect(message.channel).toBe('C1234567890');
            expect(message.text).toBe('[FB]プロジェクト (匿名)');
            expect(message.blocks).toHaveLength(2); // header, section

            // ヘッダーブロックの確認
            expect(message.blocks![0]).toEqual({
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '[FB]プロジェクト (匿名)'
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

        it('SLACK_CHANNEL_IDが未設定の場合はデフォルトチャンネルを使用', () => {
            const message = createFeedbackTitleMessage(mockFeedbackData);
            expect(message.channel).toBe('#general');
        });

        it('プロジェクト名と報告者名が指定された場合は正しいタイトルを生成', () => {
            const dataWithProject = {
                ...mockFeedbackData,
                projectName: 'Feedback Suite',
                reporterName: '柚木'
            };
            
            const message = createFeedbackTitleMessage(dataWithProject);

            expect(message.text).toBe('[FB]Feedback Suite (柚木)');
            expect(message.blocks![0]).toEqual({
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '[FB]Feedback Suite (柚木)'
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
            process.env.SLACK_CHANNEL_ID = 'C1234567890';
            const threadTs = '1234567890.123456';
            const message = createFeedbackDetailMessage(mockFeedbackData, threadTs);

            expect(message.channel).toBe('C1234567890');
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

        it('正常にフィードバック通知を送信できる（Bot Token環境）', async () => {
            process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
            process.env.SLACK_CHANNEL_ID = 'C1234567890';

            // Bot API環境では2回のAPI呼び出しが行われる（タイトル + 詳細）
            (fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: jest.fn().mockResolvedValue({
                        ok: true,
                        ts: '1234567890.123456'
                    })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: jest.fn().mockResolvedValue({
                        ok: true,
                        ts: '1234567890.123457'
                    })
                });

            const result = await notifyFeedbackReceived(mockFeedbackData);

            expect(result).toBe(true);
            expect(fetch).toHaveBeenCalledTimes(2); // タイトル + 詳細
        });

        it('タイトル送信失敗時はfalseを返す', async () => {
            process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
            process.env.SLACK_CHANNEL_ID = 'C1234567890';

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

        it('タイムスタンプ取得失敗時はfalseを返す', async () => {
            process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
            process.env.SLACK_CHANNEL_ID = 'C1234567890';

            // tsが返ってこない場合
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({
                    ok: true
                    // tsが含まれていない
                })
            });

            const result = await notifyFeedbackReceived(mockFeedbackData);

            expect(result).toBe(false);
            expect(fetch).toHaveBeenCalledTimes(1); // タイトル送信のみ
        });
    });
}); 