import axios from 'axios';

// Use your Google Cloud URL
const API_URL = process.env.REACT_APP_API_URL || 'https://janus-forge-nexus-82338337346.europe-west1.run.app';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. ATTACH TOKEN (Outgoing)
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

// 2. HANDLE EXPIRED TOKENS (Incoming)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('janusForgeUser');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const authService = {
  // FIXED: Use JSON format with correct parameter names
  login: async (email, password) => {
    return api.post('/api/auth/login', {
      username: email,  // FastAPI OAuth2 expects 'username' field
      password: password
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
  getLatestDaily: () => api.get('/api/v1/daily/latest'),
  generateDaily: () => api.post('/api/v1/daily/generate'),
  getHistory: () => api.get('/api/v1/history'),
  getSession: (id) => api.get(`/api/v1/session/${id}`),
};

export default api;
