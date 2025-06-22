import { jest } from '@jest/globals';
import { DELETE } from '@/app/api/feedback/[id]/route';
import { NextRequest } from 'next/server';

// データベース操作のモック
const mockDeleteFeedback = jest.fn() as jest.MockedFunction<any>;
const mockGetFeedbackById = jest.fn() as jest.MockedFunction<any>;

jest.mock('@/lib/database', () => ({
  deleteFeedback: mockDeleteFeedback,
  getFeedbackById: mockGetFeedbackById,
}));

describe('/api/feedback/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DELETE', () => {
    it('should delete feedback successfully', async () => {
      mockGetFeedbackById.mockResolvedValue({ id: 1, comment: 'test' });
      mockDeleteFeedback.mockResolvedValue(true);

      const response = await DELETE(
        new NextRequest('http://localhost:3300/api/feedback/1'),
        { params: Promise.resolve({ id: '1' }) }
      );
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe('フィードバックを削除しました');

      expect(mockGetFeedbackById).toHaveBeenCalledWith(1);
      expect(mockDeleteFeedback).toHaveBeenCalledWith(1);
    });

    it('should return 404 when feedback not found', async () => {
      mockGetFeedbackById.mockResolvedValue(null);

      const response = await DELETE(
        new NextRequest('http://localhost:3300/api/feedback/999'),
        { params: Promise.resolve({ id: '999' }) }
      );
      const json = await response.json();

      expect(response.status).toBe(404);
      expect(json.error).toBe('指定されたフィードバックが見つかりません');

      expect(mockGetFeedbackById).toHaveBeenCalledWith(999);
      expect(mockDeleteFeedback).not.toHaveBeenCalled();
    });

    it('should return 400 when id is invalid', async () => {
      const response = await DELETE(
        new NextRequest('http://localhost:3300/api/feedback/invalid'),
        { params: Promise.resolve({ id: 'invalid' }) }
      );
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('無効なIDです');

      expect(mockGetFeedbackById).not.toHaveBeenCalled();
      expect(mockDeleteFeedback).not.toHaveBeenCalled();
    });

    it('should return 400 when id is negative', async () => {
      const response = await DELETE(
        new NextRequest('http://localhost:3300/api/feedback/-1'),
        { params: Promise.resolve({ id: '-1' }) }
      );
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('無効なIDです');

      expect(mockGetFeedbackById).not.toHaveBeenCalled();
      expect(mockDeleteFeedback).not.toHaveBeenCalled();
    });

    it('should return 500 when deletion fails', async () => {
      mockGetFeedbackById.mockResolvedValue({ id: 1, comment: 'test' });
      mockDeleteFeedback.mockResolvedValue(false);

      const response = await DELETE(
        new NextRequest('http://localhost:3300/api/feedback/1'),
        { params: Promise.resolve({ id: '1' }) }
      );
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('削除に失敗しました');

      expect(mockGetFeedbackById).toHaveBeenCalledWith(1);
      expect(mockDeleteFeedback).toHaveBeenCalledWith(1);
    });

    it('should return 500 when database operation fails', async () => {
      mockGetFeedbackById.mockRejectedValue(new Error('Database error'));

      const response = await DELETE(
        new NextRequest('http://localhost:3300/api/feedback/1'),
        { params: Promise.resolve({ id: '1' }) }
      );
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('削除中にエラーが発生しました');
      expect(json.details).toBe('Database error');

      expect(mockGetFeedbackById).toHaveBeenCalledWith(1);
    });

    it('should handle string id conversion correctly', async () => {
      mockGetFeedbackById.mockResolvedValue({ id: 1, comment: 'test' });
      mockDeleteFeedback.mockResolvedValue(true);

      const testCases = ['1', '123', '9999'];

      for (const id of testCases) {
        const response = await DELETE(
          new NextRequest(`http://localhost:3300/api/feedback/${id}`),
          { params: Promise.resolve({ id }) }
        );
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(mockGetFeedbackById).toHaveBeenCalledWith(parseInt(id));
        expect(mockDeleteFeedback).toHaveBeenCalledWith(parseInt(id));
      }
    });

    it('should handle database error with unknown type', async () => {
      mockGetFeedbackById.mockRejectedValue('Unknown error');

      const response = await DELETE(
        new NextRequest('http://localhost:3300/api/feedback/1'),
        { params: Promise.resolve({ id: '1' }) }
      );
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('削除中にエラーが発生しました');
      expect(json.details).toBe('不明なエラー');
    });

    it('should handle empty id parameter', async () => {
      const response = await DELETE(
        new NextRequest('http://localhost:3300/api/feedback/'),
        { params: Promise.resolve({ id: '' }) }
      );
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('無効なIDです');

      expect(mockGetFeedbackById).not.toHaveBeenCalled();
      expect(mockDeleteFeedback).not.toHaveBeenCalled();
    });

    it('should handle id with decimal point', async () => {
      const response = await DELETE(
        new NextRequest('http://localhost:3300/api/feedback/1.5'),
        { params: Promise.resolve({ id: '1.5' }) }
      );
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('無効なIDです');

      expect(mockGetFeedbackById).not.toHaveBeenCalled();
      expect(mockDeleteFeedback).not.toHaveBeenCalled();
    });
  });
}); 