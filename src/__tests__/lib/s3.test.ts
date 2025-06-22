import { jest } from '@jest/globals';
import { generatePresignedUrl, getFileUrlFromKey } from '@/lib/s3';
import { mockS3PresignedData } from '../utils/test-utils';

// AWS SDKのモック
const mockS3Client = {
  send: jest.fn() as jest.MockedFunction<any>,
};

const mockGetSignedUrl = jest.fn() as jest.MockedFunction<any>;

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => mockS3Client),
  PutObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

describe('S3 Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 環境変数のモック
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.AWS_S3_BUCKET_NAME = 'test-bucket';
  });

  describe('generatePresignedUrl', () => {
    it('should generate presigned URL successfully', async () => {
      mockGetSignedUrl.mockResolvedValue(mockS3PresignedData.uploadUrl);

      const result = await generatePresignedUrl('test.png', 'image/png', 1);

      expect(result.uploadUrl).toBe(mockS3PresignedData.uploadUrl);
      expect(result.key).toMatch(/feedbacks\/\d{4}\/\d{2}\/\d{2}\/1_\d+\.png/);
      expect(result.fileUrl).toMatch(/https:\/\/test-bucket\.s3\.us-east-1\.amazonaws\.com\/feedbacks/);
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    });

    it('should generate presigned URL for temp file when no feedbackId', async () => {
      mockGetSignedUrl.mockResolvedValue(mockS3PresignedData.uploadUrl);

      const result = await generatePresignedUrl('test.png', 'image/png');

      expect(result.uploadUrl).toBe(mockS3PresignedData.uploadUrl);
      expect(result.key).toMatch(/temp\/\d+\.png/);
      expect(result.fileUrl).toMatch(/https:\/\/test-bucket\.s3\.us-east-1\.amazonaws\.com\/temp/);
    });

    it('should handle different file extensions', async () => {
      mockGetSignedUrl.mockResolvedValue(mockS3PresignedData.uploadUrl);

      const result = await generatePresignedUrl('test.jpg', 'image/jpeg', 1);

      expect(result.key).toMatch(/\.jpg$/);
    });

    it('should use png as default extension', async () => {
      mockGetSignedUrl.mockResolvedValue(mockS3PresignedData.uploadUrl);

      const result = await generatePresignedUrl('test', 'image/png', 1);

      expect(result.key).toMatch(/\.png$/);
    });

    it('should throw error when presigned URL generation fails', async () => {
      mockGetSignedUrl.mockRejectedValue(new Error('AWS Error'));

      await expect(generatePresignedUrl('test.png', 'image/png', 1))
        .rejects.toThrow('プリサインURLの生成に失敗しました');
    });

    it('should include current date in key for feedbackId', async () => {
      mockGetSignedUrl.mockResolvedValue(mockS3PresignedData.uploadUrl);
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');

      const result = await generatePresignedUrl('test.png', 'image/png', 1);

      expect(result.key).toMatch(new RegExp(`feedbacks/${year}/${month}/${day}/1_\\d+\\.png`));
    });
  });

  describe('getFileUrlFromKey', () => {
    beforeEach(() => {
      process.env.AWS_S3_BUCKET_NAME = 'test-bucket';
      process.env.AWS_REGION = 'us-east-1';
    });

    it('should generate correct file URL from key', () => {
      const key = 'feedbacks/2023/01/01/1_1640995200000.png';
      const result = getFileUrlFromKey(key);

      expect(result).toBe(`https://test-bucket.s3.us-east-1.amazonaws.com/${key}`);
    });

    it('should handle temp files', () => {
      const key = 'temp/1640995200000.png';
      const result = getFileUrlFromKey(key);

      expect(result).toBe(`https://test-bucket.s3.us-east-1.amazonaws.com/${key}`);
    });

    it('should handle keys with special characters', () => {
      const key = 'feedbacks/2023/01/01/test_file-name.png';
      const result = getFileUrlFromKey(key);

      expect(result).toBe(`https://test-bucket.s3.us-east-1.amazonaws.com/${key}`);
    });
  });
}); 