import axios from 'axios';

// SMART SWITCHER:
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"; 

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. INTERCEPTOR: OUTGOING (Attach Token)
api.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('janusForgeUser');
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user.access_token) {
      config.headers.Authorization = `Bearer ${user.access_token}`;
    }
  }
  return config;
});

// 2. INTERCEPTOR: INCOMING (Catch 401 Errors) <--- NEW!
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If the server says "Unauthorized", our token is bad/expired.
      // Clean up and reload to force the Login Modal to appear.
      localStorage.removeItem('janusForgeUser');
      window.location.reload(); 
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username, password) => {
    const formData = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    return api.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  },
  signup: async (email, password, name) => {
    return api.post('/api/auth/signup', { email, password, full_name: name });
  }
};

export const sessionService = {
  broadcast: (payload) => api.post('/api/v1/broadcast', payload),
  getLatestDaily: () => api.get('/api/v1/daily/latest'),
  generateDaily: () => api.post('/api/v1/daily/generate'),
};

export default api;
