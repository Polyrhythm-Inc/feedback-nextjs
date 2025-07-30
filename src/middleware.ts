import { createAuthMiddleware } from '@polyrhythm-inc/nextjs-auth-client';

// 認証ミドルウェアを作成
const authMiddleware = createAuthMiddleware({
  protectedPaths: [
    '/'
  ],
  excludePaths: [
    '/api/health',
    '/api/feedback',
    '/api/feedback/:path*',
    '/api/uploads/:path*',
    '/api/s3/:path*',
    '/api/logs',
  ]
});

export default authMiddleware;

// middleware.configの設定
export const config = {
  matcher: [
    '/'
  ]
};