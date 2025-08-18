import { NextRequest } from 'next/server';
import { checkAuth } from '@polyrhythm-inc/nextjs-auth-client';
import { checkIsPowerUser } from './roleUtils';

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

/**
 * ユーザーのロール情報を取得
 * @param hostname ホスト名
 * @param request NextRequest object (オプション - Cookieを転送するため)
 * @returns ロール情報またはnull
 */
export async function getUserRole(hostname: string, request?: NextRequest) {
  try {
    // リクエストからCookieを取得
    const cookieHeader = request?.headers.get('cookie') || '';
    console.log('request.cookies', request?.cookies);
    console.log('cookieHeader', cookieHeader);

    // 認証サーバーからユーザー情報を取得
    const response = await fetch(`https://auth.feedback-suite.polyrhythm.tokyo/api/app/me?hostname=${encodeURIComponent(hostname)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cookieHeader}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch user role:', response.status);
      return null;
    }

    const data = await response.json();
    return data.role || null;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

/**
 * ユーザーがパワーユーザーかどうかを確認
 * @param hostname ホスト名
 * @param request NextRequest object (オプション - Cookieを転送するため)
 * @returns パワーユーザーの場合true
 */
export async function isPowerUser(hostname: string, request?: NextRequest): Promise<boolean> {
  const role = await getUserRole(hostname, request);
  return checkIsPowerUser(role);
}