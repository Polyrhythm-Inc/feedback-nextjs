'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, checkAuthStatus, getClientLoginUrl } from '@polyrhythm-inc/nextjs-auth-client';

interface AuthContextType {
  user: User | null;
  role: string | null;
  isPowerUser: boolean;
  loading: boolean;
  redirectToLogin: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isPowerUser: false,
  loading: true,
  redirectToLogin: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isPowerUser = role === 'power_user' || role === 'admin';

  const redirectToLogin = () => {
    const loginUrl = getClientLoginUrl();
    window.location.href = loginUrl;
  };

  useEffect(() => {
    const validateAuth = async () => {
      try {
        const userData = await checkAuthStatus();
        if (userData) {
          setUser(userData);
          
          // ロール情報を取得
          try {
            const hostname = window.location.hostname;
            const response = await fetch(`https://auth.feedback-suite.polyrhythm.tokyo/api/app/me?hostname=${encodeURIComponent(hostname)}`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              const data = await response.json();
              setRole(data.role || null);
            }
          } catch (error) {
            console.error('Failed to fetch user role:', error);
          }
        } else {
          // 未認証の場合、ログイン画面にリダイレクト
          redirectToLogin();
        }
      } catch (error) {
        console.error('認証チェックエラー:', error);
        // エラー時もログイン画面にリダイレクト
        redirectToLogin();
      } finally {
        setLoading(false);
      }
    };

    validateAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, isPowerUser, loading, redirectToLogin }}>
      {children}
    </AuthContext.Provider>
  );
}