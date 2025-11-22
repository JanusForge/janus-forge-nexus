import axios from 'axios';

// Points to your running FastAPI server
const API_URL = "http://localhost:8000"; 

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// AUTOMATICALLY ATTACH TOKEN
// This interceptor checks if we have a token every time we make a request
api.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('janusForgeUser');
  if (userStr) {
    const user = JSON.parse(userStr);
    // The backend returns 'access_token', so we attach it here
    if (user.access_token) {
      config.headers.Authorization = `Bearer ${user.access_token}`;
    }
  }
  return config;
});

export const authService = {
  login: async (username, password) => {
    // FastAPI OAuth2 expects form data, not JSON, for the token endpoint
    const formData = new FormData();
    formData.append('username', username); // OAuth2 standard uses 'username' field for email
    formData.append('password', password);
    return api.post('/api/auth/login', formData);
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
  // This now hits the PROTECTED route on your backend
  broadcast: (payload) => api.post('/api/v1/broadcast', payload),
};

export default api;
