/**
 * Slack通知機能
 * フィードバック受信時にSlackチャンネルに通知を送信
 */

export interface SlackMessage {
    text: string;
    blocks?: SlackBlock[];
}

export interface SlackBlock {
    type: string;
    text?: {
        type: string;
        text: string;
    };
    fields?: Array<{
        type: string;
        text: string;
    }>;
}

export interface FeedbackNotificationData {
    id: string;
    comment: string;
    tabUrl: string;
    tabTitle: string;
    timestamp: string | number;
    userAgent: string;
    screenshotUrl?: string;
    screenshotDataId?: string;
    githubIssueUrl?: string;
}

/**
 * SlackにWebhook経由でメッセージを送信
 */
export async function sendSlackMessage(message: SlackMessage): Promise<boolean> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
        console.warn('SLACK_WEBHOOK_URL環境変数が設定されていません。Slack通知をスキップします。');
        return false;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Slack通知送信エラー:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            return false;
        }

        console.log('Slack通知送信成功');
        return true;
    } catch (error) {
        console.error('Slack通知送信例外:', error);
        return false;
    }
}

/**
 * フィードバック通知用のSlackメッセージを生成
 */
export function createFeedbackNotificationMessage(data: FeedbackNotificationData): SlackMessage {
    const timestamp = new Date(data.timestamp).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const message: SlackMessage = {
        text: `新しいフィードバックが届きました！`,
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '📝 新しいフィードバック'
                }
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*ID:*\n${data.id}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*投稿時刻:*\n${timestamp}`
                    }
                ]
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*ページタイトル:*\n${data.tabTitle}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*URL:*\n<${data.tabUrl}|${data.tabUrl}>`
                    }
                ]
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*コメント:*\n${data.comment}`
                }
            }
        ]
    };

    // GitHub Issue URLがある場合は追加
    if (data.githubIssueUrl) {
        message.blocks!.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*GitHub Issue:*\n<${data.githubIssueUrl}|Issue を確認>`
            }
        });
    }

    // スクリーンショットURLがある場合は画像を追加（HTTP/HTTPSのURLのみ）
    if (data.screenshotUrl && (data.screenshotUrl.startsWith('http://') || data.screenshotUrl.startsWith('https://'))) {
        message.blocks!.push({
            type: 'image',
            title: {
                type: 'plain_text',
                text: 'スクリーンショット'
            },
            image_url: data.screenshotUrl,
            alt_text: 'フィードバック時のスクリーンショット'
        } as any);
    }

    // ユーザーエージェント情報を追加
    message.blocks!.push({
        type: 'context',
        elements: [
            {
                type: 'mrkdwn',
                text: `*ユーザーエージェント:* ${data.userAgent}`
            }
        ]
    } as any);

    return message;
}

/**
 * フィードバック受信時のSlack通知を送信
 */
export async function notifyFeedbackReceived(data: FeedbackNotificationData): Promise<boolean> {
    try {
        const message = createFeedbackNotificationMessage(data);
        return await sendSlackMessage(message);
    } catch (error) {
        console.error('フィードバック通知生成エラー:', error);
        return false;
    }
}

/**
 * GitHub Issue作成エラー通知用のSlackメッセージを生成
 */
export function createGitHubIssueErrorMessage(feedbackId: number, error: string, projectName?: string, repoUrl?: string): SlackMessage {
    const message: SlackMessage = {
        text: `GitHub Issue作成に失敗しました`,
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '⚠️ GitHub Issue作成エラー'
                }
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*フィードバックID:*\n${feedbackId}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*エラー発生時刻:*\n${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`
                    }
                ]
            }
        ]
    };

    // プロジェクト情報がある場合は追加
    if (projectName || repoUrl) {
        message.blocks!.push({
            type: 'section',
            fields: [
                ...(projectName ? [{
                    type: 'mrkdwn' as const,
                    text: `*プロジェクト:*\n${projectName}`
                }] : []),
                ...(repoUrl ? [{
                    type: 'mrkdwn' as const,
                    text: `*リポジトリ:*\n${repoUrl}`
                }] : [])
            ]
        });
    }

    // エラー詳細を追加
    message.blocks!.push({
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: `*エラー内容:*\n\`\`\`${error}\`\`\``
        }
    });

    // 対処法の提案
    message.blocks!.push({
        type: 'context',
        elements: [
            {
                type: 'mrkdwn',
                text: '💡 *考えられる原因:* リポジトリが存在しない、アクセス権限がない、GitHub Tokenが無効など'
            }
        ]
    } as any);

    return message;
}

/**
 * GitHub Issue作成エラー時のSlack通知を送信
 */
export async function notifyGitHubIssueError(feedbackId: number, error: string, projectName?: string, repoUrl?: string): Promise<boolean> {
    try {
        const message = createGitHubIssueErrorMessage(feedbackId, error, projectName, repoUrl);
        return await sendSlackMessage(message);
    } catch (error) {
        console.error('GitHub Issueエラー通知生成エラー:', error);
        return false;
    }
} 