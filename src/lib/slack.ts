/**
 * Slack通知機能
 * フィードバック受信時にSlackチャンネルに通知を送信
 */

export interface SlackMessage {
    channel: string;
    text: string;
    blocks?: SlackBlock[];
    thread_ts?: string;
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
    githubRepository?: string;
    projectName?: string;
    reporterName?: string;
}

/**
 * Slack Web API経由でメッセージを送信
 */
export async function sendSlackMessage(message: SlackMessage): Promise<{ success: boolean; ts?: string }> {
    const botToken = process.env.SLACK_BOT_TOKEN;

    if (!botToken) {
        console.warn('SLACK_BOT_TOKEN環境変数が設定されていません。Slack通知をスキップします。');
        return { success: false };
    }

    try {
        const response = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${botToken}`,
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
            return { success: false };
        }

        const responseData = await response.json();

        if (!responseData.ok) {
            console.error('Slack API エラー:', responseData.error);
            return { success: false };
        }

        console.log('Slack通知送信成功');
        return { success: true, ts: responseData.ts };
    } catch (error) {
        console.error('Slack通知送信例外:', error);
        return { success: false };
    }
}

/**
 * フィードバック通知用のタイトルメッセージを生成（スレッドの親メッセージ）
 */
export function createFeedbackTitleMessage(data: FeedbackNotificationData): SlackMessage {
    const channelId = process.env.SLACK_CHANNEL_ID || '#general';
    
    // タイトルの形式: [FB]{プロジェクト名} ({報告者名})
    const titleText = `[FB]${data.projectName || 'プロジェクト'} (${data.reporterName || '匿名'})`;
    
    return {
        channel: channelId,
        text: titleText,
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: titleText
                }
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*${data.tabTitle}*\n<${data.tabUrl}|${data.tabUrl}>`
                }
            }
        ]
    };
}

/**
 * フィードバック通知用の詳細メッセージを生成（スレッド内で使用）
 */
export function createFeedbackDetailMessage(data: FeedbackNotificationData, threadTs: string): SlackMessage {
    const channelId = process.env.SLACK_CHANNEL_ID || '#general';
    // timestampを適切な形式に変換
    let timestampMs: number;
    
    if (typeof data.timestamp === 'number') {
        // 数値の場合：秒単位（< 10000000000）ならミリ秒に変換
        timestampMs = data.timestamp < 10000000000 ? data.timestamp * 1000 : data.timestamp;
    } else {
        // 文字列の場合：数値に変換
        const numericTimestamp = Number(data.timestamp);
        if (isNaN(numericTimestamp)) {
            // 文字列がISO形式などの場合はDateコンストラクタで処理
            timestampMs = new Date(data.timestamp).getTime();
        } else {
            // 数値文字列の場合：秒単位ならミリ秒に変換
            timestampMs = numericTimestamp < 10000000000 ? numericTimestamp * 1000 : numericTimestamp;
        }
    }
    
    const timestamp = new Date(timestampMs).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const message: SlackMessage = {
        channel: channelId,
        text: `フィードバックの詳細`,
        thread_ts: threadTs,
        blocks: [
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
                text: {
                    type: 'mrkdwn',
                    text: `*コメント:*\n${data.comment}`
                }
            }
        ]
    };

    // GitHubリポジトリがある場合は追加
    if (data.githubRepository) {
        message.blocks!.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*GitHubリポジトリ:*\n${data.githubRepository}`
            }
        });
    }

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
 * フィードバック受信時のSlack通知を送信（タイトル先行 + スレッド化）
 */
export async function notifyFeedbackReceived(data: FeedbackNotificationData): Promise<boolean> {
    try {
        // 1. タイトルメッセージを送信
        const titleMessage = createFeedbackTitleMessage(data);
        const titleResult = await sendSlackMessage(titleMessage);

        if (!titleResult.success) {
            console.error('Slackタイトル送信失敗');
            return false;
        }

        console.log('Slackタイトル送信成功');

        // 2. Bot APIではtsが確実に取得できるので、スレッドで詳細を送信
        const threadTs = titleResult.ts;
        
        if (!threadTs) {
            console.error('タイムスタンプが取得できませんでした');
            return false;
        }

        // スレッドで詳細を送信
        console.log(`スレッドで詳細を送信中... (ts: ${threadTs})`);
        const detailMessage = createFeedbackDetailMessage(data, threadTs);
        const detailResult = await sendSlackMessage(detailMessage);
        
        if (!detailResult.success) {
            console.error('Slackスレッド詳細送信失敗');
            return false;
        }
        
        console.log('Slackスレッド詳細送信成功');
        return true;
    } catch (error) {
        console.error('フィードバック通知生成エラー:', error);
        return false;
    }
}

/**
 * GitHub Issue作成エラー通知用のSlackメッセージを生成
 */
export function createGitHubIssueErrorMessage(feedbackId: number, error: string, projectName?: string, repoUrl?: string): SlackMessage {
    const channelId = process.env.SLACK_CHANNEL_ID || '#general';
    
    const message: SlackMessage = {
        channel: channelId,
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
        const result = await sendSlackMessage(message);
        return result.success;
    } catch (error) {
        console.error('GitHub Issueエラー通知生成エラー:', error);
        return false;
    }
} 