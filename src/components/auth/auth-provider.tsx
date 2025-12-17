'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ZoUser, ZoAuthSession } from '@/types/auth';

interface AuthContextType {
  user: ZoUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (session: ZoAuthSession) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ZoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Failed to check session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback((session: ZoAuthSession) => {
    setUser(session.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', { method: 'POST' });
      if (!response.ok) {
        // Session expired, logout
        await logout();
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
    }
  }, [logout]);

  // Auto-refresh token every 20 minutes
  useEffect(() => {
    if (user) {
      const interval = setInterval(refreshSession, 20 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

