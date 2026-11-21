'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, authService } from '@/services/api';
import FloatingAssistant from '@/components/floating-assistant';
import MiniPlayer from '@/components/mini-player';

export type AuthUser = { id: string; fullName: string; email: string; accountStatus: string; createdAt: string };
type AuthContextValue = { user: AuthUser | null; isLoading: boolean };
const AuthContext = createContext<AuthContextValue>({ user: null, isLoading: true });

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
  let isMounted = true;

  authService.me()
    .then((result) => {
      if (isMounted) {
        setUser(result.data.user);
      }
    })
    .catch((error) => {
      if (!isMounted) return;

      setUser(null);

      if (error instanceof ApiError && error.status === 401) {
        window.location.replace('/login');
        return;
      }

      console.error('Session verification failed:', error);
    })
    .finally(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });

  return () => {
    isMounted = false;
  };
}, []);

  if (isLoading || !user) return <div className="auth-loading" aria-live="polite">Checking your secure session...</div>;
  return <AuthContext.Provider value={{ user, isLoading }}>{children}<FloatingAssistant userId={user.id} /><MiniPlayer /></AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
