import axios from 'axios';

// 1. CONFIGURATION: Reads the environment variable set in Vercel/Cloud Run
// Defaults to empty string if not set, which leads to the 404 issue we are solving
const API_URL = process.env.REACT_APP_API_URL || ""; 

const api = axios.create({
  // THIS IS THE CRITICAL LINE: It uses the public Cloud Run URL when deployed
  baseURL: API_URL, 
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. INTERCEPTORS (Unchanged but needed for context)
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
    return Promise.reject(error);
  }
);

// 3. API SERVICES (Unchanged)
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
export default api;cd janus-forge-