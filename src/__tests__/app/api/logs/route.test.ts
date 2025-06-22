import { jest } from '@jest/globals';
import { POST, GET } from '@/app/api/logs/route';
import { createMockRequest, getResponseJson } from '../../../utils/test-utils';

describe('/api/logs', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST', () => {
        it('should record error log successfully', async () => {
            const requestData = {
                source: 'chrome-extension',
                level: 'error',
                message: 'テストエラーメッセージ',
                details: { errorStack: 'test stack trace' },
                url: 'https://example.com',
                userAgent: 'Mozilla/5.0 Test Browser'
            };

            const request = createMockRequest(
                'POST',
                'http://localhost:3300/api/logs',
                requestData
            );

            const response = await POST(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.id).toMatch(/^log_\d+$/);
            expect(json.message).toBe('エラーログを記録しました');
        });

        it('should record info log successfully', async () => {
            const requestData = {
                source: 's3-upload',
                level: 'info',
                message: 'S3アップロード成功',
                details: { fileUrl: 'https://s3.amazonaws.com/test.png' }
            };

            const request = createMockRequest(
                'POST',
                'http://localhost:3300/api/logs',
                requestData
            );

            const response = await POST(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.id).toMatch(/^log_\d+$/);
        });

        it('should record warning log successfully', async () => {
            const requestData = {
                source: 'api',
                level: 'warning',
                message: 'APIレート制限に近づいています',
                details: { remainingRequests: 10 }
            };

            const request = createMockRequest(
                'POST',
                'http://localhost:3300/api/logs',
                requestData
            );

            const response = await POST(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
        });

        it('should return 400 when source is missing', async () => {
            const requestData = {
                level: 'error',
                message: 'テストメッセージ'
            };

            const request = createMockRequest(
                'POST',
                'http://localhost:3300/api/logs',
                requestData
            );

            const response = await POST(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(400);
            expect(json.error).toBe('必須項目が不足しています (source, level, message)');
        });

        it('should return 400 when level is missing', async () => {
            const requestData = {
                source: 'chrome-extension',
                message: 'テストメッセージ'
            };

            const request = createMockRequest(
                'POST',
                'http://localhost:3300/api/logs',
                requestData
            );

            const response = await POST(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(400);
            expect(json.error).toBe('必須項目が不足しています (source, level, message)');
        });

        it('should return 400 when message is missing', async () => {
            const requestData = {
                source: 'chrome-extension',
                level: 'error'
            };

            const request = createMockRequest(
                'POST',
                'http://localhost:3300/api/logs',
                requestData
            );

            const response = await POST(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(400);
            expect(json.error).toBe('必須項目が不足しています (source, level, message)');
        });

        it('should handle optional fields correctly', async () => {
            const requestData = {
                source: 'unknown',
                level: 'error',
                message: 'シンプルなエラーメッセージ'
            };

            const request = createMockRequest(
                'POST',
                'http://localhost:3300/api/logs',
                requestData
            );

            const response = await POST(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
        });
    });

    describe('GET', () => {
        // 先にログを作成してからテスト
        beforeEach(async () => {
            // テスト用ログを作成
            const testLogs = [
                {
                    source: 'chrome-extension',
                    level: 'error',
                    message: 'エラーログ1',
                    details: { test: 'data1' }
                },
                {
                    source: 's3-upload',
                    level: 'info',
                    message: 'インフォログ1',
                    details: { test: 'data2' }
                },
                {
                    source: 'chrome-extension',
                    level: 'warning',
                    message: '警告ログ1',
                    details: { test: 'data3' }
                }
            ];

            for (const logData of testLogs) {
                const request = createMockRequest(
                    'POST',
                    'http://localhost:3300/api/logs',
                    logData
                );
                await POST(request);
            }
        });

        it('should retrieve logs successfully', async () => {
            const request = createMockRequest(
                'GET',
                'http://localhost:3300/api/logs'
            );

            const response = await GET(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(Array.isArray(json.logs)).toBe(true);
            expect(json.logs.length).toBeGreaterThan(0);
            expect(json.totalCount).toBeGreaterThan(0);
            expect(json.limit).toBe(50); // デフォルト制限
        });

        it('should limit logs by limit parameter', async () => {
            const request = createMockRequest(
                'GET',
                'http://localhost:3300/api/logs?limit=2'
            );

            const response = await GET(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(200);
            expect(json.logs.length).toBeLessThanOrEqual(2);
            expect(json.limit).toBe(2);
        });

        it('should filter logs by source', async () => {
            const request = createMockRequest(
                'GET',
                'http://localhost:3300/api/logs?source=chrome-extension'
            );

            const response = await GET(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(200);
            expect(json.logs.every(log => log.source === 'chrome-extension')).toBe(true);
        });

        it('should filter logs by level', async () => {
            const request = createMockRequest(
                'GET',
                'http://localhost:3300/api/logs?level=error'
            );

            const response = await GET(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(200);
            expect(json.logs.every(log => log.level === 'error')).toBe(true);
        });

        it('should filter logs by both source and level', async () => {
            const request = createMockRequest(
                'GET',
                'http://localhost:3300/api/logs?source=chrome-extension&level=error'
            );

            const response = await GET(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(200);
            expect(json.logs.every(log =>
                log.source === 'chrome-extension' && log.level === 'error'
            )).toBe(true);
        });

        it('should return empty array when no logs match filter', async () => {
            const request = createMockRequest(
                'GET',
                'http://localhost:3300/api/logs?source=nonexistent'
            );

            const response = await GET(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(200);
            expect(json.logs).toEqual([]);
            expect(json.totalCount).toBe(0);
        });

        it('should handle invalid limit parameter gracefully', async () => {
            const request = createMockRequest(
                'GET',
                'http://localhost:3300/api/logs?limit=invalid'
            );

            const response = await GET(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(200);
            expect(json.limit).toBe(50); // フォールバックしてデフォルト値
        });
    });

    describe('OPTIONS (CORS)', () => {
        it('should handle preflight request correctly', async () => {
            const request = createMockRequest(
                'OPTIONS',
                'http://localhost:3300/api/logs'
            );

            const response = await import('@/app/api/logs/route').then(module =>
                module.OPTIONS(request)
            );

            expect(response.status).toBe(200);
            expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
            expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
            expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
        });
    });
}); 