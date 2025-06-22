import { jest } from '@jest/globals';
import { POST } from '@/app/api/s3/presigned-url/route';
import { createMockRequest, getResponseJson, mockS3PresignedData } from '../../../../utils/test-utils';

// S3操作のモック
const mockGeneratePresignedUrl = jest.fn() as jest.MockedFunction<any>;

jest.mock('@/lib/s3', () => ({
  generatePresignedUrl: mockGeneratePresignedUrl,
}));

describe('/api/s3/presigned-url', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should generate presigned URL successfully', async () => {
      mockGeneratePresignedUrl.mockResolvedValue(mockS3PresignedData);

      const requestData = {
        fileName: 'test.png',
        contentType: 'image/png',
        feedbackId: 1,
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3300/api/s3/presigned-url',
        requestData
      );

      const response = await POST(request);
      const json = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.uploadUrl).toBe(mockS3PresignedData.uploadUrl);
      expect(json.key).toBe(mockS3PresignedData.key);
      expect(json.fileUrl).toBe(mockS3PresignedData.fileUrl);

      expect(mockGeneratePresignedUrl).toHaveBeenCalledWith(
        requestData.fileName,
        requestData.contentType,
        requestData.feedbackId
      );
    });

    it('should generate presigned URL without feedbackId', async () => {
      mockGeneratePresignedUrl.mockResolvedValue(mockS3PresignedData);

      const requestData = {
        fileName: 'test.jpg',
        contentType: 'image/jpeg',
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3300/api/s3/presigned-url',
        requestData
      );

      const response = await POST(request);
      const json = await getResponseJson(response);

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.uploadUrl).toBe(mockS3PresignedData.uploadUrl);

      expect(mockGeneratePresignedUrl).toHaveBeenCalledWith(
        requestData.fileName,
        requestData.contentType,
        undefined
      );
    });

    it('should return 400 when fileName is missing', async () => {
      const requestData = {
        contentType: 'image/png',
        feedbackId: 1,
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3300/api/s3/presigned-url',
        requestData
      );

      const response = await POST(request);
      const json = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(json.error).toBe('ファイル名とコンテンツタイプが必要です');
    });

    it('should return 400 when contentType is missing', async () => {
      const requestData = {
        fileName: 'test.png',
        feedbackId: 1,
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3300/api/s3/presigned-url',
        requestData
      );

      const response = await POST(request);
      const json = await getResponseJson(response);

      expect(response.status).toBe(400);
      expect(json.error).toBe('ファイル名とコンテンツタイプが必要です');
    });

    it('should return 500 when S3 operation fails', async () => {
      mockGeneratePresignedUrl.mockRejectedValue(new Error('S3 error'));

      const requestData = {
        fileName: 'test.png',
        contentType: 'image/png',
        feedbackId: 1,
      };

      const request = createMockRequest(
        'POST',
        'http://localhost:3300/api/s3/presigned-url',
        requestData
      );

      const response = await POST(request);
      const json = await getResponseJson(response);

      expect(response.status).toBe(500);
      expect(json.error).toBe('プリサインURLの生成に失敗しました');
      expect(json.details).toBe('S3 error');
    });
  });
}); 