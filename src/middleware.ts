import { createAuthMiddleware } from '@polyrhythm-inc/nextjs-auth-client';

// 認証ミドルウェアを作成
const authMiddleware = createAuthMiddleware({
  protectedPaths: [
    '/'
  ],
  excludePaths: [
    '/api/health'
  ]
});

export default authMiddleware;

// middleware.configの設定
export const config = {
  matcher: [
    '/'
  ]
};