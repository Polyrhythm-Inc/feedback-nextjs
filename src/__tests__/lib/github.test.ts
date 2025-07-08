// Mock the Octokit library to avoid ES module issues
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(() => ({
    rest: {
      issues: {
        create: jest.fn()
      }
    }
  }))
}));

import { parseGitHubRepository, createIssueDataFromFeedback } from '@/lib/github';

describe('GitHub Integration', () => {
    describe('parseGitHubRepository', () => {
        it('should parse SSH format GitHub URLs', () => {
            const sshUrl = 'git@github.com:Polyrhythm-Inc/poly-ide.git';
            const result = parseGitHubRepository(sshUrl);

            expect(result).toEqual({
                owner: 'Polyrhythm-Inc',
                repo: 'poly-ide',
            });
        });

        it('should parse SSH format GitHub URLs without .git', () => {
            const sshUrl = 'git@github.com:Polyrhythm-Inc/poly-ide';
            const result = parseGitHubRepository(sshUrl);

            expect(result).toEqual({
                owner: 'Polyrhythm-Inc',
                repo: 'poly-ide',
            });
        });

        it('should parse HTTPS format GitHub URLs', () => {
            const httpsUrl = 'https://github.com/Polyrhythm-Inc/simple-nextjs-example2.git';
            const result = parseGitHubRepository(httpsUrl);

            expect(result).toEqual({
                owner: 'Polyrhythm-Inc',
                repo: 'simple-nextjs-example2',
            });
        });

        it('should parse HTTPS format GitHub URLs without .git', () => {
            const httpsUrl = 'https://github.com/Polyrhythm-Inc/simple-nextjs-example2';
            const result = parseGitHubRepository(httpsUrl);

            expect(result).toEqual({
                owner: 'Polyrhythm-Inc',
                repo: 'simple-nextjs-example2',
            });
        });

        it('should return null for invalid URLs', () => {
            const invalidUrl = 'invalid-url';
            const result = parseGitHubRepository(invalidUrl);

            expect(result).toBeNull();
        });

        it('should return null for non-GitHub URLs', () => {
            const nonGithubUrl = 'https://gitlab.com/user/repo';
            const result = parseGitHubRepository(nonGithubUrl);

            expect(result).toBeNull();
        });
    });

    describe('createIssueDataFromFeedback', () => {
        const mockFeedback = {
            id: 123,
            comment: 'This is a test feedback comment',
            screenshotData: {
                tabUrl: 'https://example.com/test-page',
                tabTitle: 'Test Page Title',
                screenshotUrl: 'https://example.com/screenshot.png',
                timestamp: 1640995200, // 2022-01-01 00:00:00 UTC
            },
            userAgent: 'Mozilla/5.0 (Test Browser)',
            timestamp: 1640995200,
        };

        it('should create proper issue data from feedback', () => {
            const result = createIssueDataFromFeedback(mockFeedback);

            expect(result.title).toBe('[フィードバック] Test Page Title');
            expect(result.labels).toEqual(['feedback', 'user-report']);
            expect(result.body).toContain('This is a test feedback comment');
            expect(result.body).toContain('https://example.com/test-page');
            expect(result.body).toContain('Test Page Title');
            expect(result.body).toContain('https://example.com/screenshot.png');
            expect(result.body).toContain('Mozilla/5.0 (Test Browser)');
            expect(result.body).toContain('フィードバックID: 123');
        });

        it('should handle missing userAgent', () => {
            const feedbackWithoutUserAgent = {
                ...mockFeedback,
                userAgent: undefined,
            };

            const result = createIssueDataFromFeedback(feedbackWithoutUserAgent);

            expect(result.body).toContain('User Agent: Unknown');
        });

        it('should format timestamp correctly', () => {
            // Test with a specific timestamp
            const testTimestamp = 1640995200; // 2022-01-01 00:00:00 UTC
            const feedbackWithTimestamp = {
                ...mockFeedback,
                timestamp: testTimestamp,
            };

            const result = createIssueDataFromFeedback(feedbackWithTimestamp);

            // The exact format depends on the locale, but it should contain the date
            expect(result.body).toContain('受信日時:');
            expect(result.body).toMatch(/\d{4}\/\d{2}\/\d{2}/); // Should contain date format
        });

        it('should include screenshot in markdown format', () => {
            const result = createIssueDataFromFeedback(mockFeedback);

            expect(result.body).toContain('![Screenshot](https://example.com/screenshot.png)');
        });

        it('should include all required sections', () => {
            const result = createIssueDataFromFeedback(mockFeedback);

            expect(result.body).toContain('## フィードバック詳細');
            expect(result.body).toContain('**コメント:**');
            expect(result.body).toContain('**ページ情報:**');
            expect(result.body).toContain('**スクリーンショット:**');
            expect(result.body).toContain('**技術情報:**');
            expect(result.body).toContain('*このissueは自動的にフィードバックシステムから作成されました*');
        });
    });
}); 