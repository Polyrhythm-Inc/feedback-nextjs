'use client';

import { useEffect } from 'react';
import { initializeAuthConfig } from '@polyrhythm-inc/nextjs-auth-client';

export default function AuthInitializer() {
  useEffect(() => {
    // 認証システムを初期化
    initializeAuthConfig({
      enableDebugLog: process.env.NODE_ENV === 'development'
    });
  }, []);

  return null;
}