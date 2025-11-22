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

  const login = async (email, password) => {
    setIsLoading(true);
    setAuthError('');
    try {
      const response = await authService.login(email, password);
      // We store the token AND the user details
      const userData = {
        email: email,
        name: response.data.user_name,
        tier: response.data.user_tier,
        access_token: response.data.access_token
      };
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      const msg = error.response?.data?.detail || 'Login failed';
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
      console.error("Signup error:", error);
      const msg = error.response?.data?.detail || 'Signup failed';
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
    // In a real app, you'd call an API to update the DB here too
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
