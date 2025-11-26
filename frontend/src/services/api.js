import axios from 'axios';

// 1. CONFIGURATION: Reads the environment variable set in Vercel/Cloud Run
const API_URL = process.env.REACT_APP_API_URL || ""; 

const api = axios.create({
  baseURL: API_URL, 
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. INTERCEPTORS (Security and Token Handling)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('janus_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('janus_token');
      localStorage.removeItem('janus_user');
      window.location.href = '/';
    }
    // FIX: Manually inserting semicolon to satisfy Vercel's strict compiler
    return Promise.reject(error);
  }
);

// 3. API SERVICES
export const authService = {
  login: async (email, password) => {
    return api.post('/api/v1/auth/login', { username: email, password: password });
  },
  signup: async (email, password, name) => {
    return api.post('/api/v1/auth/signup', { email, password, full_name: name });
  }
};

export const sessionService = {
  getHistory: () => api.get('/api/v1/history'),
  getLatestDaily: () => api.get('/api/v1/daily/latest'),
  generateDaily: () => api.post('/api/v1/daily/generate'),
  createCheckout: (tier) => api.post('/api/v1/payments/create-checkout', { tier }),
  sendMessage: (message, mode, history) => api.post('/api/v1/chat', { message, mode, history })
};

export const login = authService.login;
export default api;