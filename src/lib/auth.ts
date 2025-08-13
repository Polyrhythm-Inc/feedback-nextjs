import { NextRequest } from 'next/server';
import { checkAuth } from '@polyrhythm-inc/nextjs-auth-client';

/**
 * Bearerトークンから認証ユーザー情報を取得
 * @param request NextRequest object
 * @returns ユーザー情報またはnull
 */
export async function getUserFromBearerToken(request: NextRequest) {
  try {
    // AuthorizationヘッダーからBearerトークンを取得
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    // Bearerトークンを使用して認証チェック
    // @polyrhythm-inc/nextjs-auth-clientのcheckAuth関数はクッキーベースの認証を行うため、
    // Bearerトークンの検証は別途実装が必要な場合があります
    // ここでは、トークンが存在する場合のみcheckAuthを呼び出します
    const user = await checkAuth(request);
    
    return user;
  } catch (error) {
    console.error('Bearer token authentication error:', error);
    return null;
  }
}

/**
 * リクエストから認証ユーザー情報を取得（クッキーまたはBearerトークン）
 * @param request NextRequest object
 * @returns ユーザー情報またはnull
 */
export async function getAuthenticatedUser(request: NextRequest) {
  // まずBearerトークンで認証を試みる
  const userFromToken = await getUserFromBearerToken(request);
  if (userFromToken) {
    return userFromToken;
  }

  // Bearerトークンがない場合、クッキーベースの認証を試みる
  try {
    const user = await checkAuth(request);
    return user;
  } catch (error) {
    console.error('Cookie-based authentication error:', error);
    return null;
  }
}