import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('janusForgeUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (user) {
      localStorage.setItem('janusForgeUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('janusForgeUser');
    }
  }, [user]);

  // Helper to extract a readable error message
  const parseError = (error) => {
    console.error("Auth Error Details:", error);
    
    if (error.response?.data?.detail) {
      const detail = error.response.data.detail;
      
      // Case 1: Standard string error (e.g., "Incorrect email")
      if (typeof detail === 'string') {
        return detail;
      }
      
      // Case 2: Pydantic Validation Error (Array of objects)
      if (Array.isArray(detail)) {
        return detail.map(err => err.msg).join(', ');
      }
      
      // Case 3: Unknown object
      return JSON.stringify(detail);
    }
    
    return 'Authentication failed. Please check your connection.';
  };

  const login = async (email, password) => {
    setIsLoading(true);
    setAuthError('');
    try {
      const response = await authService.login(email, password);
      const userData = {
        email: email,
        name: response.data.user_name,
        tier: response.data.user_tier,
        access_token: response.data.access_token
      };
      setUser(userData);
      return { success: true };
    } catch (error) {
      const msg = parseError(error);
      setAuthError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email, password, name) => {
    setIsLoading(true);
    setAuthError('');
    try {
      const response = await authService.signup(email, password, name);
      const userData = {
        email: email,
        name: response.data.user_name,
        tier: response.data.user_tier,
        access_token: response.data.access_token
      };
      setUser(userData);
      return { success: true };
    } catch (error) {
      const msg = parseError(error);
      setAuthError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('janusForgeUser');
  };

  const upgradeAccount = (newTier) => {
    if (user) {
      setUser(prev => ({ ...prev, tier: newTier }));
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, authError, login, signup, logout, upgradeAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
