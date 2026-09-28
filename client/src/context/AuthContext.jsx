import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Restore authenticated session from backend via /auth/me
  const restoreSession = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      if (response.data && response.data.success) {
        const userData = response.data.data;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        throw new Error('Failed to retrieve current user');
      }
    } catch (err) {
      console.warn('Session verification failed, logging out:', err.response?.data?.message || err.message);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Login handler
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data && response.data.success) {
        const { token: receivedToken, user: receivedUser } = response.data.data;
        
        localStorage.setItem('token', receivedToken);
        localStorage.setItem('user', JSON.stringify(receivedUser));

        setToken(receivedToken);
        setUser(receivedUser);

        return { success: true, user: receivedUser };
      }
      return { success: false, message: response.data.message || 'Login failed' };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Invalid credentials';
      return { success: false, message };
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  // Update current user cached in context
  const updateUser = (updatedUser) => {
    const merged = { ...user, ...updatedUser };
    setUser(merged);
    localStorage.setItem('user', JSON.stringify(merged));
  };

  const value = {
    user,
    token,
    role: user?.role || null,
    loading,
    isAuthenticated: Boolean(token && user),
    login,
    logout,
    restoreSession,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
