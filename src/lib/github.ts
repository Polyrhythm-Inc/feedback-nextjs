import { Octokit } from '@octokit/rest';

// GitHub API client
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
});

export interface GitHubIssueData {
    title: string;
    body: string;
    labels?: string[];
}

export interface GitHubRepository {
    owner: string;
    repo: string;
}

/**
 * GitHubリポジトリURLからowner/repoを抽出
 */
export function parseGitHubRepository(githubUrl: string): GitHubRepository | null {
    try {
        // git@github.com:owner/repo.git 形式
        const sshMatch = githubUrl.match(/git@github\.com:([^\/]+)\/([^\.]+)(?:\.git)?$/);
        if (sshMatch) {
            return {
                owner: sshMatch[1],
                repo: sshMatch[2],
            };
        }

        // https://github.com/owner/repo 形式
        const httpsMatch = githubUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
        if (httpsMatch) {
            return {
                owner: httpsMatch[1],
                repo: httpsMatch[2],
            };
        }

        console.warn('GitHubリポジトリURLの形式が不正です:', githubUrl);
        return null;
    } catch (error) {
        console.error('GitHubリポジトリURL解析エラー:', error);
        return null;
    }
}

/**
 * GitHub issueを作成
 */
export async function createGitHubIssue(
    repository: GitHubRepository,
    issueData: GitHubIssueData
): Promise<{ success: boolean; issueNumber?: number; issueUrl?: string; error?: string }> {
    try {
        if (!process.env.GITHUB_TOKEN) {
            throw new Error('GITHUB_TOKEN environment variable is not set');
        }

        const response = await octokit.rest.issues.create({
            owner: repository.owner,
            repo: repository.repo,
            title: issueData.title,
            body: issueData.body,
            labels: issueData.labels || [],
        });

        console.log(`GitHub issue created: ${response.data.html_url}`);

        return {
            success: true,
            issueNumber: response.data.number,
            issueUrl: response.data.html_url,
        };
    } catch (error) {
        console.error('GitHub issue creation error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * フィードバックからGitHub issueのデータを生成
 */
export function createIssueDataFromFeedback(feedback: {
    id: number;
    comment: string;
    screenshotData: {
        tabUrl: string;
        tabTitle: string;
        screenshotUrl: string;
        timestamp: number;
    } | null;
    userAgent: string | null;
    timestamp: number;
    userName?: string | null;
}): GitHubIssueData {
    const date = new Date(feedback.timestamp * 1000);
    const formattedDate = date.toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    // スクリーンショットデータがある場合とない場合で分岐
    const title = feedback.screenshotData
        ? `[フィードバック] ${feedback.screenshotData.tabTitle}`
        : `[フィードバック] エラーレポート`;

    let body = `## フィードバック詳細

**コメント:**
${feedback.comment}

**受信日時:** ${formattedDate}

`;

    // スクリーンショットデータがある場合の情報を追加
    if (feedback.screenshotData) {
        body += `**ページ情報:**
- URL: ${feedback.screenshotData.tabUrl}
- タイトル: ${feedback.screenshotData.tabTitle}

`;

        // スクリーンショットURLがある場合のみ画像を表示
        if (feedback.screenshotData.screenshotUrl) {
            body += `**スクリーンショット:**
![Screenshot](${feedback.screenshotData.screenshotUrl})

`;
        }
    }

    // ユーザー名がある場合は追加
    if (feedback.userName) {
        body += `**報告者:** ${feedback.userName}

`;
    }

    body += `**技術情報:**
- フィードバックID: ${feedback.id}
- User Agent: ${feedback.userAgent || 'Unknown'}

---
*このissueは自動的にフィードバックシステムから作成されました*`;

    return {
        title,
        body,
        labels: ['feedback', 'user-report'],
    };
} 