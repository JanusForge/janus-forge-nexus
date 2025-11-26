import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in from a previous session
  useEffect(() => {
    const savedUser = localStorage.getItem('janus_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // 1. Send credentials to our new Backend Doorman
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password: password }), // sending 'username' to match standard OAuth logic
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // 2. If success, save the user and let them in!
      console.log("Login Successful:", data);
      setUser(data.user);
      localStorage.setItem('janus_token', data.access_token);
      localStorage.setItem('janus_user', JSON.stringify(data.user));
      
      return true;
    } catch (error) {
      console.error("Login Error:", error);
      alert("Connection Error: " + error.message); // Alert so we know if it fails!
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('janus_token');
    localStorage.removeItem('janus_user');
  };

  const signup = async (email, password, fullName) => {
    // For mock purposes, signup is just login
    return login(email, password);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);