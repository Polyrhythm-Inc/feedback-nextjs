import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/feedback/list/route';
import { mockFeedbackRecord, mockStats } from '../../../../utils/test-utils';

// データベース操作のモック
const mockGetPaginatedFeedback = jest.fn();
const mockGetFeedbackStats = jest.fn();

// 権限チェックのモック  
const mockIsPowerUser = jest.fn();

// モジュールをモック
jest.unstable_mockModule('@/lib/database', () => ({
  getPaginatedFeedback: mockGetPaginatedFeedback,
  getFeedbackStats: mockGetFeedbackStats,
}));

jest.unstable_mockModule('@/lib/auth', () => ({
  isPowerUser: mockIsPowerUser,
}));

describe('/api/feedback/list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // fetchのモック
    global.fetch = jest.fn() as jest.MockedFunction<any>;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET', () => {
    const createMockRequest = (searchParams = {}) => {
      const url = new URL('http://localhost:3000/api/feedback/list');
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
      return new NextRequest(url, {
        headers: {
          'host': 'feedback-suite.polyrhythm.tokyo',
          'cookie': 'feedback-suite.polyrhythm.tokyo_user_prod_session=test-session'
        }
      });
    };

    it('should return feedback list successfully', async () => {
      const mockRecords = [mockFeedbackRecord];
      mockIsPowerUser.mockResolvedValue(true);
      mockGetPaginatedFeedback.mockResolvedValue({
        feedbacks: mockRecords,
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1
      });
      mockGetFeedbackStats.mockResolvedValue(mockStats);

      const request = createMockRequest();
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.feedbacks).toHaveLength(1);
      expect(json.feedbacks[0]).toEqual({
        ...mockFeedbackRecord,
        timestamp: mockFeedbackRecord.timestamp.toString(),
        createdAt: mockFeedbackRecord.createdAt.toISOString(),
        updatedAt: mockFeedbackRecord.updatedAt.toISOString(),
      });
      expect(json.stats).toEqual(mockStats);
      expect(json.count).toBe(1);
      expect(json.total).toBe(1);
      expect(json.page).toBe(1);
      expect(json.limit).toBe(50);
      expect(json.totalPages).toBe(1);

      expect(mockIsPowerUser).toHaveBeenCalledWith('feedback-suite.polyrhythm.tokyo', request);
      expect(mockGetPaginatedFeedback).toHaveBeenCalledWith(1, 50);
      expect(mockGetFeedbackStats).toHaveBeenCalledTimes(1);
    });

    it('should return empty list when no feedback exists', async () => {
      mockIsPowerUser.mockResolvedValue(true);
      mockGetPaginatedFeedback.mockResolvedValue({
        feedbacks: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0
      });
      mockGetFeedbackStats.mockResolvedValue({ total: 0, today: 0, thisWeek: 0 });

      const request = createMockRequest();
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.feedbacks).toHaveLength(0);
      expect(json.count).toBe(0);
      expect(json.stats.total).toBe(0);
    });

    it('should handle multiple feedback records', async () => {
      const mockRecords = [
        { ...mockFeedbackRecord, id: 1 },
        { ...mockFeedbackRecord, id: 2, comment: '2つ目のコメント' },
        { ...mockFeedbackRecord, id: 3, comment: '3つ目のコメント' },
      ];
      mockIsPowerUser.mockResolvedValue(true);
      mockGetPaginatedFeedback.mockResolvedValue({
        feedbacks: mockRecords,
        total: 3,
        page: 1,
        limit: 50,
        totalPages: 1
      });
      mockGetFeedbackStats.mockResolvedValue({ total: 3, today: 1, thisWeek: 2 });

      const request = createMockRequest();
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.feedbacks).toHaveLength(3);
      expect(json.count).toBe(3);
      expect(json.feedbacks[0].id).toBe(1);
      expect(json.feedbacks[1].id).toBe(2);
      expect(json.feedbacks[2].id).toBe(3);
      expect(json.stats.total).toBe(3);
    });

    it('should return 500 when getPaginatedFeedback fails', async () => {
      mockIsPowerUser.mockResolvedValue(true);
      mockGetPaginatedFeedback.mockRejectedValue(new Error('Database error'));
      mockGetFeedbackStats.mockResolvedValue(mockStats);

      const request = createMockRequest();
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('データ取得中にエラーが発生しました');
      expect(json.details).toBe('Database error');
    });

    it('should return 500 when getFeedbackStats fails', async () => {
      mockIsPowerUser.mockResolvedValue(true);
      mockGetPaginatedFeedback.mockResolvedValue({
        feedbacks: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0
      });
      mockGetFeedbackStats.mockRejectedValue(new Error('Stats error'));

      const request = createMockRequest();
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('データ取得中にエラーが発生しました');
      expect(json.details).toBe('Stats error');
    });

    it('should correctly serialize BigInt timestamps and Dates', async () => {
      const mockRecord = {
        ...mockFeedbackRecord,
        timestamp: BigInt(1640995200000),
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      };
      mockIsPowerUser.mockResolvedValue(true);
      mockGetPaginatedFeedback.mockResolvedValue({
        feedbacks: [mockRecord],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1
      });
      mockGetFeedbackStats.mockResolvedValue(mockStats);

      const request = createMockRequest();
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.feedbacks[0].timestamp).toBe('1640995200000');
      expect(json.feedbacks[0].createdAt).toBe('2023-01-01T00:00:00.000Z');
      expect(json.feedbacks[0].updatedAt).toBe('2023-01-01T00:00:00.000Z');
      expect(typeof json.feedbacks[0].timestamp).toBe('string');
      expect(typeof json.feedbacks[0].createdAt).toBe('string');
      expect(typeof json.feedbacks[0].updatedAt).toBe('string');
    });

    it('should preserve all feedback fields', async () => {
      const expectedFields = [
        'id', 'comment', 'screenshotUrl', 'tabUrl', 'tabTitle', 
        'timestamp', 'userAgent', 'createdAt', 'updatedAt'
      ];
      
      mockIsPowerUser.mockResolvedValue(true);
      mockGetPaginatedFeedback.mockResolvedValue({
        feedbacks: [mockFeedbackRecord],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1
      });
      mockGetFeedbackStats.mockResolvedValue(mockStats);

      const request = createMockRequest();
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      const feedback = json.feedbacks[0];
      
      expectedFields.forEach(field => {
        expect(feedback).toHaveProperty(field);
      });
    });

    it('should handle unknown error types', async () => {
      mockIsPowerUser.mockResolvedValue(true);
      mockGetPaginatedFeedback.mockRejectedValue('Unknown error');
      mockGetFeedbackStats.mockResolvedValue(mockStats);

      const request = createMockRequest();
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('データ取得中にエラーが発生しました');
      expect(json.details).toBe('不明なエラー');
    });
    
    it('should return 403 when user is not a power user', async () => {
      mockIsPowerUser.mockResolvedValue(false);

      const request = createMockRequest();
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toBe('アクセス権限がありません');
      expect(json.details).toBe('このAPIにアクセスするにはパワーユーザー権限が必要です');
      expect(mockGetPaginatedFeedback).not.toHaveBeenCalled();
      expect(mockGetFeedbackStats).not.toHaveBeenCalled();
    });
    
    it('should support pagination parameters', async () => {
      mockIsPowerUser.mockResolvedValue(true);
      mockGetPaginatedFeedback.mockResolvedValue({
        feedbacks: [],
        total: 100,
        page: 2,
        limit: 25,
        totalPages: 4
      });
      mockGetFeedbackStats.mockResolvedValue(mockStats);

      const request = createMockRequest({ page: '2', limit: '25' });
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(mockGetPaginatedFeedback).toHaveBeenCalledWith(2, 25);
      expect(json.page).toBe(2);
      expect(json.limit).toBe(25);
      expect(json.totalPages).toBe(4);
    });
  });
}); 