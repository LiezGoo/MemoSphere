'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, authService } from '@/services/api';

export type AuthUser = { id: string; fullName: string; email: string; accountStatus: string; createdAt: string };
type AuthContextValue = { user: AuthUser | null; isLoading: boolean };
const AuthContext = createContext<AuthContextValue>({ user: null, isLoading: true });

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authService.me()
      .then((result) => setUser(result.data.user))
      .catch((error) => {
        if (!(error instanceof ApiError) || error.status !== 401) console.error(error);
        setUser(null);
        window.location.replace('/login');
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || !user) return <div className="auth-loading" aria-live="polite">Checking your secure session...</div>;
  return <AuthContext.Provider value={{ user, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
