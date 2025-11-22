import axios from 'axios';

// SMART SWITCHER:
// If we are on Render, use the environment variable.
// If we are local, fallback to localhost.
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"; 

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// AUTOMATICALLY ATTACH TOKEN
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

export const authService = {
  login: async (username, password) => {
    // MANUALLY construct the form data string to guarantee correct format
    const formData = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    
    return api.post('/api/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  },
  signup: async (email, password, name) => {
    return api.post('/api/auth/signup', { 
      email, 
      password, 
      full_name: name 
    });
  }
};

export const sessionService = {
  broadcast: (payload) => api.post('/api/v1/broadcast', payload),
  // --- NEW DAILY JANUS ENDPOINTS ---
  getLatestDaily: () => api.get('/api/v1/daily/latest'),
  generateDaily: () => api.post('/api/v1/daily/generate'),
};

export default api;
