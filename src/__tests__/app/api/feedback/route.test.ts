import { jest } from '@jest/globals';
import { POST, OPTIONS } from '@/app/api/feedback/route';
import { createMockRequest, getResponseJson, mockFeedbackData } from '../../../utils/test-utils';

// データベース操作のモック
const mockInsertFeedback = jest.fn() as jest.MockedFunction<any>;
// Slack通知のモック
const mockNotifyFeedbackReceived = jest.fn() as jest.MockedFunction<any>;

jest.mock('@/lib/database', () => ({
  insertFeedback: mockInsertFeedback,
}));

jest.mock('@/lib/slack', () => ({
  notifyFeedbackReceived: mockNotifyFeedbackReceived,
}));

describe('/api/feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotifyFeedbackReceived.mockResolvedValue(true); // デフォルトで成功
  });

  describe('POST', () => {
    it('should create feedback successfully and send Slack notification', async () => {
      mockInsertFeedback.mockResolvedValue(1);

      const request = createMockRequest(
        'POST',
        'http://localhost:3300/api/feedback',
        mockFeedbackData
      );

      const response = await POST(request);
      const json = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.id).toBe(1);
      expect(json.message).toBe('フィードバックを受信しました');

      expect(mockInsertFeedback).toHaveBeenCalledWith({
        comment: mockFeedbackData.comment,
        screenshotUrl: mockFeedbackData.screenshotUrl,
        tabUrl: mockFeedbackData.metadata.url,
        tabTitle: mockFeedbackData.metadata.title,
        timestamp: mockFeedbackData.metadata.timestamp,
        userAgent: mockFeedbackData.metadata.userAgent,
      });

      // Slack通知が正しく呼ばれることを確認
      expect(mockNotifyFeedbackReceived).toHaveBeenCalledWith({
        id: '1',
        comment: mockFeedbackData.comment,
        tabUrl: mockFeedbackData.metadata.url,
        tabTitle: mockFeedbackData.metadata.title,
        timestamp: mockFeedbackData.metadata.timestamp,
        userAgent: mockFeedbackData.metadata.userAgent,
        screenshotUrl: mockFeedbackData.screenshotUrl,
      });
    });

    it('should create feedback successfully even if Slack notification fails', async () => {
      mockInsertFeedback.mockResolvedValue(1);
      mockNotifyFeedbackReceived.mockResolvedValue(false); // Slack通知失敗

      const request = createMockRequest(
        'POST',
        'http://localhost:3300/api/feedback',
        mockFeedbackData
      );

      const response = await POST(request);
      const json = await getResponseJson(response);

      // Slack通知が失敗してもフィードバック作成は成功する
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.id).toBe(1);
      expect(json.message).toBe('フィードバックを受信しました');

      expect(mockInsertFeedback).toHaveBeenCalledTimes(1);
      expect(mockNotifyFeedbackReceived).toHaveBeenCalledTimes(1);
    });

    it('should create feedback successfully even if Slack notification throws error', async () => {
      mockInsertFeedback.mockResolvedValue(1);
      mockNotifyFeedbackReceived.mockRejectedValue(new Error('Slack error')); // Slack通知例外

      const request = createMockRequest(
        'POST',
        'http://localhost:3300/api/feedback',
        mockFeedbackData
      );

      const response = await POST(request);
      const json = await getResponseJson(response);

      // Slack通知で例外が発生してもフィードバック作成は成功する
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.id).toBe(1);
      expect(json.message).toBe('フィードバックを受信しました');

      expect(mockInsertFeedback).toHaveBeenCalledTimes(1);
      expect(mockNotifyFeedbackReceived).toHaveBeenCalledTimes(1);
    });

    it('should return 400 when comment is missing', async () => {
      const invalidData = {
        ...mockFeedbackData,
        comment: '',
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3300/api/feedback',
        invalidData
      );

      const response = await POST(request);
      const json = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(json.error).toBe('必須項目が不足しています (comment, screenshotUrl, metadata)');
    });

    it('should return 400 when screenshotUrl is missing', async () => {
      const invalidData = {
        ...mockFeedbackData,
        screenshotUrl: '',
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3300/api/feedback',
        invalidData
      );

      const response = await POST(request);
      const json = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(json.error).toBe('必須項目が不足しています (comment, screenshotUrl, metadata)');
    });

    it('should return 400 when metadata is missing', async () => {
      const invalidData = {
        comment: mockFeedbackData.comment,
        screenshotUrl: mockFeedbackData.screenshotUrl,
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3300/api/feedback',
        invalidData
      );

      const response = await POST(request);
      const json = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(json.error).toBe('必須項目が不足しています (comment, screenshotUrl, metadata)');
    });

    it('should return 400 when metadata fields are incomplete', async () => {
      const invalidData = {
        ...mockFeedbackData,
        metadata: {
          url: mockFeedbackData.metadata.url,
          // title, timestamp, userAgent が不足
        },
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3300/api/feedback',
        invalidData
      );

      const response = await POST(request);
      const json = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(json.error).toBe('メタデータが不完全です (url, title, timestamp, userAgent)');
    });

    it('should return 500 when database operation fails', async () => {
      mockInsertFeedback.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest(
        'POST',
        'http://localhost:3300/api/feedback',
        mockFeedbackData
      );

      const response = await POST(request);
      const json = await getResponseJson(response);

      expect(response.status).toBe(500);
      expect(json.error).toBe('サーバーエラーが発生しました');
      expect(json.details).toBe('Database error');
    });

    it('should include CORS headers in response', async () => {
      mockInsertFeedback.mockResolvedValue(1);

      const request = createMockRequest(
        'POST',
        'http://localhost:3300/api/feedback',
        mockFeedbackData
      );

      const response = await POST(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
    });

    it('should handle malformed JSON', async () => {
      const request = new Request('http://localhost:3300/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      const response = await POST(request as any);
      const json = await getResponseJson(response);

      expect(response.status).toBe(500);
      expect(json.error).toBe('サーバーエラーが発生しました');
    });
  });

  describe('OPTIONS', () => {
    it('should return CORS headers for preflight request', async () => {
      const request = createMockRequest('OPTIONS', 'http://localhost:3300/api/feedback');

      const response = await OPTIONS(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
    });
  });
}); 