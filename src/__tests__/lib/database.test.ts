import { jest } from '@jest/globals';
import {
  insertFeedback,
  getAllFeedback,
  getFeedbackById,
  deleteFeedback,
  getFeedbackStats,
} from '@/lib/database';
import { mockFeedbackRecord, mockStats } from '../utils/test-utils';

// Prismaクライアントのモック
const mockPrisma = {
  feedback: {
    create: jest.fn() as jest.MockedFunction<any>,
    findMany: jest.fn() as jest.MockedFunction<any>,
    findUnique: jest.fn() as jest.MockedFunction<any>,
    delete: jest.fn() as jest.MockedFunction<any>,
    count: jest.fn() as jest.MockedFunction<any>,
  },
};

// prismaのモック
jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('insertFeedback', () => {
    it('should insert feedback successfully', async () => {
      const mockData = {
        comment: 'テストコメント',
        screenshotUrl: 'https://test.com/image.png',
        tabUrl: 'https://example.com',
        tabTitle: 'テストページ',
        timestamp: 1640995200000,
        userAgent: 'Mozilla/5.0 (Test)',
      };

      (mockPrisma.feedback.create as any).mockResolvedValue({
        id: 1,
        ...mockData,
        timestamp: BigInt(mockData.timestamp),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await insertFeedback(mockData);

      expect(result).toBe(1);
      expect(mockPrisma.feedback.create).toHaveBeenCalledWith({
        data: {
          comment: mockData.comment,
          screenshotUrl: mockData.screenshotUrl,
          tabUrl: mockData.tabUrl,
          tabTitle: mockData.tabTitle,
          timestamp: BigInt(mockData.timestamp),
          userAgent: mockData.userAgent,
        },
      });
    });

    it('should throw error when insert fails', async () => {
      const mockData = {
        comment: 'テストコメント',
        screenshotUrl: 'https://test.com/image.png',
        tabUrl: 'https://example.com',
        tabTitle: 'テストページ',
        timestamp: 1640995200000,
        userAgent: 'Mozilla/5.0 (Test)',
      };

      (mockPrisma.feedback.create as any).mockRejectedValue(new Error('Database error'));

      await expect(insertFeedback(mockData)).rejects.toThrow('フィードバックの保存に失敗しました');
    });
  });

  describe('getAllFeedback', () => {
    it('should return all feedback records', async () => {
      const mockRecords = [mockFeedbackRecord];
      (mockPrisma.feedback.findMany as any).mockResolvedValue(mockRecords);

      const result = await getAllFeedback();

      expect(result).toEqual(mockRecords);
      expect(mockPrisma.feedback.findMany).toHaveBeenCalledWith({
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should throw error when retrieval fails', async () => {
      (mockPrisma.feedback.findMany as any).mockRejectedValue(new Error('Database error'));

      await expect(getAllFeedback()).rejects.toThrow('フィードバックの取得に失敗しました');
    });
  });

  describe('getFeedbackById', () => {
    it('should return feedback by id', async () => {
      (mockPrisma.feedback.findUnique as any).mockResolvedValue(mockFeedbackRecord);

      const result = await getFeedbackById(1);

      expect(result).toEqual(mockFeedbackRecord);
      expect(mockPrisma.feedback.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return null when feedback not found', async () => {
      (mockPrisma.feedback.findUnique as any).mockResolvedValue(null);

      const result = await getFeedbackById(999);

      expect(result).toBeNull();
    });

    it('should throw error when retrieval fails', async () => {
      (mockPrisma.feedback.findUnique as any).mockRejectedValue(new Error('Database error'));

      await expect(getFeedbackById(1)).rejects.toThrow('フィードバックの取得に失敗しました');
    });
  });

  describe('deleteFeedback', () => {
    it('should delete feedback successfully', async () => {
      (mockPrisma.feedback.delete as any).mockResolvedValue(mockFeedbackRecord);

      const result = await deleteFeedback(1);

      expect(result).toBe(true);
      expect(mockPrisma.feedback.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return false when feedback not found', async () => {
      const error = new Error('Record not found');
      (error as any).code = 'P2025';
      (mockPrisma.feedback.delete as any).mockRejectedValue(error);

      const result = await deleteFeedback(999);

      expect(result).toBe(false);
    });

    it('should throw error when deletion fails', async () => {
      (mockPrisma.feedback.delete as any).mockRejectedValue(new Error('Database error'));

      await expect(deleteFeedback(1)).rejects.toThrow('フィードバックの削除に失敗しました');
    });
  });

  describe('getFeedbackStats', () => {
    it('should return correct statistics', async () => {
      (mockPrisma.feedback.count as any)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3)  // today
        .mockResolvedValueOnce(7); // thisWeek

      const result = await getFeedbackStats();

      expect(result).toEqual(mockStats);
      expect(mockPrisma.feedback.count).toHaveBeenCalledTimes(3);
    });

    it('should throw error when stats retrieval fails', async () => {
      (mockPrisma.feedback.count as any).mockRejectedValue(new Error('Database error'));

      await expect(getFeedbackStats()).rejects.toThrow('統計情報の取得に失敗しました');
    });
  });
}); 