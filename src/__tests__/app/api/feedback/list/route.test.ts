import { jest } from '@jest/globals';
import { GET } from '@/app/api/feedback/list/route';
import { mockFeedbackRecord, mockStats } from '../../../../utils/test-utils';

// データベース操作のモック
const mockGetAllFeedback = jest.fn() as jest.MockedFunction<any>;
const mockGetFeedbackStats = jest.fn() as jest.MockedFunction<any>;

jest.mock('@/lib/database', () => ({
  getAllFeedback: mockGetAllFeedback,
  getFeedbackStats: mockGetFeedbackStats,
}));

describe('/api/feedback/list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return feedback list successfully', async () => {
      const mockRecords = [mockFeedbackRecord];
      mockGetAllFeedback.mockResolvedValue(mockRecords);
      mockGetFeedbackStats.mockResolvedValue(mockStats);

      const response = await GET();
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

      expect(mockGetAllFeedback).toHaveBeenCalledTimes(1);
      expect(mockGetFeedbackStats).toHaveBeenCalledTimes(1);
    });

    it('should return empty list when no feedback exists', async () => {
      mockGetAllFeedback.mockResolvedValue([]);
      mockGetFeedbackStats.mockResolvedValue({ total: 0, today: 0, thisWeek: 0 });

      const response = await GET();
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
      mockGetAllFeedback.mockResolvedValue(mockRecords);
      mockGetFeedbackStats.mockResolvedValue({ total: 3, today: 1, thisWeek: 2 });

      const response = await GET();
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

    it('should return 500 when getAllFeedback fails', async () => {
      mockGetAllFeedback.mockRejectedValue(new Error('Database error'));
      mockGetFeedbackStats.mockResolvedValue(mockStats);

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('データ取得中にエラーが発生しました');
      expect(json.details).toBe('Database error');
    });

    it('should return 500 when getFeedbackStats fails', async () => {
      mockGetAllFeedback.mockResolvedValue([]);
      mockGetFeedbackStats.mockRejectedValue(new Error('Stats error'));

      const response = await GET();
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
      mockGetAllFeedback.mockResolvedValue([mockRecord]);
      mockGetFeedbackStats.mockResolvedValue(mockStats);

      const response = await GET();
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
      
      mockGetAllFeedback.mockResolvedValue([mockFeedbackRecord]);
      mockGetFeedbackStats.mockResolvedValue(mockStats);

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      const feedback = json.feedbacks[0];
      
      expectedFields.forEach(field => {
        expect(feedback).toHaveProperty(field);
      });
    });

    it('should handle unknown error types', async () => {
      mockGetAllFeedback.mockRejectedValue('Unknown error');
      mockGetFeedbackStats.mockResolvedValue(mockStats);

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('データ取得中にエラーが発生しました');
      expect(json.details).toBe('不明なエラー');
    });
  });
}); 