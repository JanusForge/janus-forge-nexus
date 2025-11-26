import axios from 'axios';

// --- CONFIGURATION ---
// We leave this empty so it uses the "proxy" value defined in package.json.
// This ensures requests go to your Backend (Port 8000) correctly.
const API_URL = ""; 

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- INTERCEPTORS (The Security Guards) ---

// 1. OUTGOING: Attach the Token to every request if we have one
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('janus_token'); // Matches AuthContext key
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. INCOMING: Handle Expired Sessions (401 Errors)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token is dead. Clear storage and kick to login screen.
      localStorage.removeItem('janus_token');
      localStorage.removeItem('janus_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// --- API SERVICES ---

export const authService = {
  // FIX #1: Added '/v1' to match main.py
  // FIX #2: Changed 'email' to 'username' to satisfy FastAPI requirements
  login: async (email, password) => {
    return api.post('/api/v1/auth/login', { 
      username: email, 
      password: password 
    });
  },
  
  signup: async (email, password, name) => {
    return api.post('/api/v1/auth/signup', { 
      email, 
      password, 
      full_name: name 
    });
  }
};

export const sessionService = {
  // Dashboard Data
  getHistory: () => api.get('/api/v1/history'),
  getLatestDaily: () => api.get('/api/v1/daily/latest'),
  
  // Actions
  generateDaily: () => api.post('/api/v1/daily/generate'),
  createCheckout: (tier) => api.post('/api/v1/payments/create-checkout', { tier }),
  
  // The Chat Brain
  sendMessage: (message, mode, history) => api.post('/api/v1/chat', { message, mode, history })
};

// --- EXPORTS ---
// We export 'login' directly just in case AuthContext imports it specifically
export const login = authService.login;

export default api;