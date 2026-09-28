import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Restore cached user from localStorage
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('user');
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Failed to parse cached user:', error);
      return null;
    }
  });

  // Restore JWT token from localStorage
  const [token, setToken] = useState(
    () => localStorage.getItem('token') || null
  );

  const [loading, setLoading] = useState(true);

  // =========================================================
  // RESTORE SESSION
  // =========================================================
  const restoreSession = useCallback(async () => {
    const storedToken = localStorage.getItem('token');

    // No token = user is not authenticated
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');

      console.log('AUTH ME RESPONSE:', response.data);

      if (response.data?.success) {
        // Backend response:
        // {
        //   success: true,
        //   data: {
        //     user: {...}
        //   }
        // }
        const userData = response.data.data?.user;

        if (!userData) {
          throw new Error('User data missing from authentication response');
        }

        setUser(userData);
        setToken(storedToken);

        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        throw new Error(
          response.data?.message || 'Failed to retrieve current user'
        );
      }
    } catch (error) {
      console.warn(
        'Session verification failed, logging out:',
        error.response?.data?.message || error.message
      );

      localStorage.removeItem('token');
      localStorage.removeItem('user');

      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore session when application starts
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // =========================================================
  // LOGIN
  // =========================================================
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      console.log('LOGIN API RESPONSE:', response.data);

      if (!response.data?.success) {
        return {
          success: false,
          message: response.data?.message || 'Login failed',
        };
      }

      // Backend response:
      // {
      //   success: true,
      //   message: "Login successful",
      //   data: {
      //     token: "...",
      //     user: {...}
      //   }
      // }

      const receivedToken = response.data.data?.token;
      const receivedUser = response.data.data?.user;

      // Make sure backend returned everything required
      if (!receivedToken || !receivedUser) {
        return {
          success: false,
          message: 'Login response is missing token or user data',
        };
      }

      // Store authentication data
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(receivedUser));

      // Update React state
      setToken(receivedToken);
      setUser(receivedUser);

      return {
        success: true,
        user: receivedUser,
      };
    } catch (error) {
      console.error('LOGIN ERROR:', error);

      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          'Invalid credentials',
      };
    }
  };

  // =========================================================
  // LOGOUT
  // =========================================================
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    setToken(null);
    setUser(null);

    window.location.href = '/login';
  };

  // =========================================================
  // UPDATE USER
  // =========================================================
  const updateUser = (updatedUser) => {
    const mergedUser = {
      ...user,
      ...updatedUser,
    };

    setUser(mergedUser);

    localStorage.setItem(
      'user',
      JSON.stringify(mergedUser)
    );
  };

  // =========================================================
  // AUTH CONTEXT VALUE
  // =========================================================
  const value = {
    user,
    token,

    // Convenient role access
    role: user?.role || null,

    loading,

    // User is authenticated only when both exist
    isAuthenticated: Boolean(token && user),

    // Authentication functions
    login,
    logout,
    restoreSession,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// =========================================================
// useAuth HOOK
// =========================================================
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
};

export default AuthContext;