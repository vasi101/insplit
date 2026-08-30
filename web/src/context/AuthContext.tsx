import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { adminLogin, getMe, setStoredTokens, clearStoredTokens, getStoredTokens } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('insplit_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const { accessToken } = getStoredTokens();
      if (accessToken) {
        try {
          const profile = await getMe();
          if (profile.isAdmin) {
            setUser(profile);
            localStorage.setItem('insplit_admin_user', JSON.stringify(profile));
          } else {
            clearStoredTokens();
            setUser(null);
          }
        } catch {
          clearStoredTokens();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const data = await adminLogin(email, pass);
    setStoredTokens(data.tokens.accessToken, data.tokens.refreshToken);
    setUser(data.user);
    localStorage.setItem('insplit_admin_user', JSON.stringify(data.user));
  };

  const logout = () => {
    clearStoredTokens();
    setUser(null);
    window.location.href = '/login';
  };

  const refreshProfile = async () => {
    try {
      const profile = await getMe();
      setUser(profile);
      localStorage.setItem('insplit_admin_user', JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to refresh user profile:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && user.isAdmin,
        isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
