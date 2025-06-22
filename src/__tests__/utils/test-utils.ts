import { NextRequest } from 'next/server';

// NextRequestのモックを作成するヘルパー関数
export function createMockRequest(
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
): NextRequest {
  const requestInit: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(url, requestInit);
}

// レスポンスのJSONを取得するヘルパー関数
export async function getResponseJson(response: Response) {
  return await response.json();
}

// テスト用のサンプルデータ
export const mockFeedbackData = {
  comment: 'テストコメント',
  screenshotUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/test/image.png',
  metadata: {
    url: 'https://example.com',
    title: 'テストページ',
    timestamp: 1640995200000,
    userAgent: 'Mozilla/5.0 (Test Browser)',
  },
};

export const mockFeedbackRecord = {
  id: 1,
  comment: 'テストコメント',
  screenshotUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/test/image.png',
  tabUrl: 'https://example.com',
  tabTitle: 'テストページ',
  timestamp: BigInt(1640995200000),
  userAgent: 'Mozilla/5.0 (Test Browser)',
  createdAt: new Date('2023-01-01T00:00:00.000Z'),
  updatedAt: new Date('2023-01-01T00:00:00.000Z'),
};

export const mockS3PresignedData = {
  uploadUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/test/presigned-url',
  key: 'test/image.png',
  fileUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/test/image.png',
};

export const mockStats = {
  total: 10,
  today: 3,
  thisWeek: 7,
}; 