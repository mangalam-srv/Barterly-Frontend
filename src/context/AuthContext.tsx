import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User } from '../types';
import { apiService } from '../services/apiService';
import { useNotification } from './NotificationContext';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean; // For initial auth state check
  actionLoading: boolean; // For login/register button states
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // Initial auth check loading
  const [actionLoading, setActionLoading] = useState(false); // Login/Register action loading
  const { addNotification } = useNotification();

useEffect(() => {
  try {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');

    console.log("AUTH INIT", {
      savedUser,
      savedToken,
    });

    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    // Persist user and token to localStorage whenever they change
    if (user && token) {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  }, [user, token]);

  const login = async (email: string, password: string) => {
    setActionLoading(true);
    try {
      const { user: userData, token: authToken } = await apiService.login(email, password);
      setUser(userData);
      setToken(authToken);
      addNotification('Logged in successfully!', 'success');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to login';
      addNotification(errorMessage, 'error');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setActionLoading(true);
    try {
      const { user: userData, token: authToken } = await apiService.register(name, email, password);
      setUser(userData);
      setToken(authToken);
      addNotification('Account created successfully!', 'success');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to register';
      addNotification(errorMessage, 'error');
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    addNotification('Logged out successfully.', 'info');
  };

  const contextValue: AuthContextType = {
    isAuthenticated: !!user,
    user,
    token,
    login,
    register,
    logout,
    loading,
    actionLoading,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};