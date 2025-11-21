import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import { loadStripe } from '@stripe/stripe-js';

// --- CONFIGURATION ---
const API_BASE_URL = "https://janusforge-api-gateway.onrender.com/api/v1";
const hubClient = axios.create({
  baseURL: API_BASE_URL,
});

// --- AUTHENTICATION MANAGEMENT ---
const useAuth = () => {
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
      // For now, simulate login - replace with actual backend auth
      const userData = {
        id: 'user_' + Date.now(),
        email,
        name: email.split('@')[0],
        tier: 'free',
        joined: new Date().toISOString()
      };
      
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      setAuthError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email, password, name) => {
    setIsLoading(true);
    setAuthError('');
    
    try {
      // For now, simulate signup - replace with actual backend auth
      const userData = {
        id: 'user_' + Date.now(),
        email,
        name: name || email.split('@')[0],
        tier: 'free',
        joined: new Date().toISOString()
      };
      
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.message || 'Signup failed';
      setAuthError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('janusForgeUser');
    localStorage.removeItem('janusForgeUsage');
    localStorage.removeItem('janusForgeOnboardingCompleted');
  };

  const upgradeAccount = (newTier) => {
    if (user) {
      setUser(prev => ({ ...prev, tier: newTier }));
    }
  };

  return {
    user,
    isLoading,
    authError,
    login,
    signup,
    logout,
    upgradeAccount
  };
};

// --- TIER MANAGEMENT ---
const TIERS = {
  free: {
    name: "Explorer",
    sessionLimit: 3,
    messageLimit: 20,
    aiModels: ['gemini', 'deepseek'],
    features: ["2 AI Models", "Basic Debate", "Session History", "User Account"],
    color: "#6c757d",
    price: "Free",
    requiresAuth: true
  },
  pro: {
    name: "Scholar", 
    sessionLimit: 50,
    messageLimit: 500,
    aiModels: ['grok', 'gemini', 'deepseek', 'openai'],
    features: ["4 AI Models", "Advanced Controls", "Export Features", "Priority Support", "User Account"],
    color: "#007bff",
    price: "$29/month",
    requiresAuth: true
  },
  enterprise: {
    name: "Master",
    sessionLimit: 1000,
    messageLimit: 10000,
    aiModels: ['grok', 'gemini', 'deepseek', 'openai', 'anthropic'],
    features: ["All 5 AI Models", "API Access", "White Label", "Dedicated Support", "User Account"],
    color: "#28a745",
    price: "$99/month",
    requiresAuth: true
  }
};

// --- AI MODEL CONFIGURATION ---
const AI_MODELS = {
  grok: {
    name: "Grok",
    icon: "🦄",
    color: "#ff6b6b",
    description: "Witty, unconventional thinking",
    availableIn: ['pro', 'enterprise']
  },
  gemini: {
    name: "Gemini",
    icon: "🌀",
    color: "#74b9ff",
    description: "Comprehensive analysis",
    availableIn: ['free', 'pro', 'enterprise']
  },
  deepseek: {
    name: "DeepSeek",
    icon: "🎯",
    color: "#00b894",
    description: "Focused, analytical insights",
    availableIn: ['free', 'pro', 'enterprise']
  },
  openai: {
    name: "OpenAI",
    icon: "🤖",
    color: "#8e44ad",
    description: "Balanced, nuanced responses",
    availableIn: ['pro', 'enterprise']
  }, // ✅ ADD THIS COMMA
  anthropic: {
    name: "Claude",
    icon: "🧠",
    color: "#e67e22",
    description: "Thoughtful, principled analysis",
    availableIn: ['enterprise']
  }
};


// --- USAGE TRACKING HOOK ---
function useUsageTracker(user) {
  const [usage, setUsage] = useState(() => {
    const saved = localStorage.getItem(`janusForgeUsage_${user?.id || 'anonymous'}`);
    return saved ? JSON.parse(saved) : {
      sessionsCreated: 0,
      messagesSent: 0,
      currentTier: user?.tier || 'free',
      tierStartDate: new Date().toISOString()
    };
  });

  useEffect(() => {
    localStorage.setItem(`janusForgeUsage_${user?.id || 'anonymous'}`, JSON.stringify(usage));
  }, [usage, user]);

  const incrementUsage = (type, amount = 1) => {
    setUsage(prev => ({
      ...prev,
      [type]: prev[type] + amount
    }));
  };

  const canCreateSession = () => {
    return usage.sessionsCreated < TIERS[usage.currentTier].sessionLimit;
  };

  const canSendMessage = () => {
    return usage.messagesSent < TIERS[usage.currentTier].messageLimit;
  };

  const upgradeTier = (newTier) => {
    setUsage(prev => ({
      ...prev,
      currentTier: newTier,
      tierStartDate: new Date().toISOString()
    }));
  };

  return { usage, incrementUsage, canCreateSession, canSendMessage, upgradeTier };
}

// --- AUTH MODAL COMPONENT ---
function AuthModal({ isOpen, onClose, onLogin, onSignup, isLoading, error }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoginMode) {
      onLogin(formData.email, formData.password);
    } else {
      onSignup(formData.email, formData.password, formData.name);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    setFormData({ email: '', password: '', name: '' });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '25px', color: '#333' }}>
          {isLoginMode ? 'Welcome Back' : 'Join Janus Forge Nexus'}
        </h2>

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLoginMode && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required={!isLoginMode}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                placeholder="Enter your name"
              />
            </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              placeholder="Enter your email"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#333' }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="6"
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: isLoading ? '#6c757d' : TIERS.free.color,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginBottom: '15px'
            }}
          >
            {isLoading ? '🔄 Processing...' : (isLoginMode ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={switchMode}
            style={{
              background: 'none',
              border: 'none',
              color: TIERS.free.color,
              cursor: 'pointer',
              fontSize: '14px',
              textDecoration: 'underline'
            }}
          >
            {isLoginMode ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginTop: '15px'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// --- ONBOARDING TOUR COMPONENT ---
function OnboardingTour({ onComplete, currentTier, user }) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      title: `🎭 Welcome to Janus Forge Nexus${user ? `, ${user.name}` : ''}`,
      content: "Where thesis meets antithesis. Debate complex topics with multiple AI perspectives for deeper understanding.",
      position: "center"
    },
    {
      title: "🔐 Your AI Debate Account",
      content: `You're on the ${TIERS[currentTier].name} tier. Track your usage, save sessions, and continue debates anytime.`,
      position: "top"
    },
    {
      title: "🤖 Multi-AI Ensemble",
      content: `Access ${TIERS[currentTier].aiModels.length} AI models with unique personalities and expertise.`,
      position: "top"
    },
    {
      title: "💬 Create Meaningful Debates", 
      content: "Pose questions, watch AIs debate from different angles, and synthesize insights.",
      position: "bottom"
    },
    {
      title: "📊 Manage Your Journey",
      content: "Track conversations, export insights, and build your knowledge repository.",
      position: "bottom"
    }
  ];

  if (currentStep >= steps.length) {
    onComplete();
    return null;
  }

  const step = steps[currentStep];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        maxWidth: '500px',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{ color: '#333', marginBottom: '15px' }}>
          {step.title}
        </h2>
        <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.5', marginBottom: '25px' }}>
          {step.content}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#999' }}>
            Step {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            style={{
              padding: '10px 25px',
              backgroundColor: TIERS[currentTier].color,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            {currentStep === steps.length - 1 ? 'Start Debating 🚀' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- UPGRADE MODAL COMPONENT ---
function UpgradeModal({ isOpen, onClose, currentTier, onUpgrade, user }) {
  const [isProcessing, setIsProcessing] = useState(false);

  // Add Stripe checkout function
  const handleStripeCheckout = async (tierKey) => {
    setIsProcessing(true);
    try {
      // Call your backend to create Stripe checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tierKey,
          userId: user?.id,
          userEmail: user?.email
        })
      });

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        console.error('Stripe checkout error:', error);
        alert('Payment failed: ' + error.message);
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Payment processing error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
          Upgrade Your AI Debate Experience
        </h2>

        {user && (
          <div style={{
            backgroundColor: '#e8f4fd',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #74b9ff'
          }}>
            <p style={{ margin: 0, color: '#0984e3', textAlign: 'center' }}>
              <strong>Signed in as:</strong> {user.email}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
          {Object.entries(TIERS).map(([tierKey, tier]) => {
            if (!tier) return null;
            
            return (
              <div key={tierKey} style={{
                border: `2px solid ${tierKey === currentTier ? tier.color : '#ddd'}`,
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: tierKey === currentTier ? `${tier.color}10` : 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ color: tier.color, margin: 0 }}>{tier.name}</h3>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: tier.color }}>
                    {tier.price}
                  </span>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <strong>AI Models:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                    {tier.aiModels.map(modelKey => {
                      const model = AI_MODELS[modelKey];
                      if (!model) return null;

                      return (
                        <span key={modelKey} style={{
                          padding: '2px 8px',
                          backgroundColor: model.color + '20',
                          color: model.color,
                          borderRadius: '4px',
                          fontSize: '12px',
                          border: `1px solid ${model.color}`
                        }}>
                          {model.icon} {model.name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <strong>Limits:</strong>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {tier.sessionLimit} sessions • {tier.messageLimit} messages
                  </div>
                </div>

                <ul style={{ fontSize: '14px', color: '#666', paddingLeft: '20px', marginBottom: '15px' }}>
                  {tier.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>

                <button
                  onClick={() => handleStripeCheckout(tierKey)}
                  disabled={tierKey === currentTier || isProcessing}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: tierKey === currentTier ? '#6c757d' : (tier.color || '#ddd'),
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: tierKey === currentTier ? 'default' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {tierKey === currentTier
                    ? 'Current Plan'
                    : isProcessing
                      ? 'Processing...'
                      : 'Upgrade Now'
                  }
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: '20px',
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// --- PROMPT INPUT COMPONENT ---
function PromptInput({ onSend, sessionId, isSending = false, usage, canSendMessage, onUpgradePrompt, user }) {
  const [localPrompt, setLocalPrompt] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = () => {
    const trimmedPrompt = localPrompt.trim();
    if (trimmedPrompt && sessionId && !isSending) {
      if (!canSendMessage) {
        onUpgradePrompt();
        return;
      }
      onSend(trimmedPrompt);
      setLocalPrompt('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const messagesRemaining = TIERS[usage.currentTier].messageLimit - usage.messagesSent;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      alignItems: 'stretch',
      marginTop: '20px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #dee2e6'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px',
        color: '#666'
      }}>
        <span>
          {user ? `${user.name} • ` : ''}Messages: {usage.messagesSent} / {TIERS[usage.currentTier].messageLimit}
        </span>
        {messagesRemaining <= 10 && (
          <span style={{ color: messagesRemaining <= 5 ? '#dc3545' : '#ffc107', fontWeight: 'bold' }}>
            {messagesRemaining} messages remaining
          </span>
        )}
      </div>

      <textarea
        ref={inputRef}
        value={localPrompt}
        onChange={(e) => setLocalPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={sessionId ? 
          (canSendMessage ? 
            "Type your message to the AI ensemble... (Press Enter to send)" : 
            "Message limit reached - upgrade to continue") : 
          "Create a session first..."}
        disabled={!sessionId || isSending || !canSendMessage}
        style={{
          padding: '12px 16px',
          border: `2px solid ${sessionId && canSendMessage ? '#007bff' : '#6c757d'}`,
          borderRadius: '8px',
          fontSize: '16px',
          outline: 'none',
          minHeight: '80px',
          maxHeight: '150px',
          width: '100%',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease',
          opacity: sessionId && canSendMessage ? 1 : 0.7,
          resize: 'vertical',
          fontFamily: 'inherit',
          lineHeight: '1.4'
        }}
      />

      <button
        onClick={handleSubmit}
        disabled={!sessionId || !localPrompt.trim() || isSending || !canSendMessage}
        style={{
          padding: '12px 24px',
          backgroundColor: sessionId && localPrompt.trim() && !isSending && canSendMessage ? 
            TIERS[usage.currentTier].color : '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: sessionId && localPrompt.trim() && !isSending && canSendMessage ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          width: '100%',
          opacity: sessionId && localPrompt.trim() && !isSending && canSendMessage ? 1 : 0.6
        }}
      >
        {isSending ? '🔄 Broadcasting...' : 
         !canSendMessage ? '💎 Upgrade to Continue' : '🚀 Send to AI Ensemble'}
      </button>

      <div style={{
        fontSize: '12px',
        color: '#6c757d',
        textAlign: 'center',
        marginTop: '5px'
      }}>
        {canSendMessage ? 'Press Enter to send • Shift+Enter for new line' : 'Upgrade for unlimited messages'}
      </div>
    </div>
  );
}


// --- DASHBOARD COMPONENT ---
function Dashboard({ sessionIdFromUrl, usage, incrementUsage, canCreateSession, onUpgradePrompt, user }) {
  const [status, setStatus] = useState('');
  const [sessionId, setSessionId] = useState(sessionIdFromUrl || '');
  const [sessionHistory, setSessionHistory] = useState([]);
  const [participants, setParticipants] = useState(TIERS[usage.currentTier].aiModels);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const messagesEndRef = useRef(null);

  // === NEW: ADD THESE RIGHT HERE ===
  const { saveSession } = useSessionManager(user);

  // Auto-save sessions when they update
  useEffect(() => {
    if (sessionHistory.length > 0 && user) {
      const currentSession = sessionHistory[sessionHistory.length - 1];
      if (currentSession.messages && currentSession.messages.length > 0) {
        saveSession({
          ...currentSession,
          participants: participants
        });
      }
    }
  }, [sessionHistory, user, participants, saveSession]);

  // Handle session reloading from History page
  useEffect(() => {
    const reloadSessionData = localStorage.getItem('reloadSessionData');
    if (reloadSessionData && user) {
      const sessionToReload = JSON.parse(reloadSessionData);
      setSessionId(sessionToReload.session_id);
      setSessionHistory([sessionToReload]);
      setParticipants(sessionToReload.participants || TIERS[usage.currentTier].aiModels);
      localStorage.removeItem('reloadSessionData');
    }
  }, [user]);


  // Get the canSendMessage function from useUsageTracker
  const { canSendMessage } = useUsageTracker(user);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessionHistory]);

  // Handle responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNewSession = () => {
    if (!canCreateSession) {
      onUpgradePrompt();
      return;
    }

    setStatus('Creating new session...');
    const newSessionId = `session-${Date.now()}-${user?.id || 'anonymous'}`;

    hubClient.post('/broadcast', {
  session_id: newSessionId,
  ai_participants: participants,
  moderator_prompt: "Session initialized - ready for prompts!",  // ✅ CORRECT
  tier: usage.currentTier,
  user_id: user?.id
})

    .then(response => {
      setSessionId(newSessionId);
      setStatus('New session created! Ready for prompts.');
      setSessionHistory([{
        session_id: newSessionId,
        messages: response.data.responses || [],
        user_id: user?.id
      }]);
      incrementUsage('sessionsCreated');
    })
    .catch(error => {
      console.error('Session creation failed:', error);
      setStatus('Failed to create session');
    });
  };

  const handleSendPrompt = (promptText) => {
    if (!promptText.trim() || !sessionId) return;

    setStatus('Sending to AI ensemble...');

    // First, add the user's message to session history immediately
    const userMessage = {
      role: 'user',
      content: promptText,
      timestamp: new Date().toISOString(),
      user_id: user?.id,
      user_name: user?.name
    };

    setSessionHistory(prev => {
      const updated = [...prev];
      const currentSession = updated[updated.length - 1];
      if (currentSession && currentSession.session_id === sessionId) {
        currentSession.messages = [
          ...(currentSession.messages || []),
          userMessage
        ];
      }
      return updated;
    });

    // Then send to AI and add their responses
    hubClient.post('/broadcast', {
      session_id: sessionId,
      ai_participants: participants,
      moderator_prompt: promptText,
      tier: usage.currentTier,
      user_id: user?.id
    })
    .then(response => {
      const broadcastData = response.data;
      console.log('✅ BROADCAST RESPONSE:', broadcastData);

      setSessionHistory(prev => {
        const updated = [...prev];
        const currentSession = updated[updated.length - 1];
        if (currentSession && currentSession.session_id === sessionId) {
          currentSession.messages = [
            ...(currentSession.messages || []),
            ...broadcastData.responses
          ];
        }
        return updated;
      });

      incrementUsage('messagesSent', broadcastData.responses.length);
      setStatus(`AI synthesis complete! ${broadcastData.responses.length} responses received`);
    })
    .catch(error => {
      console.error('❌ BROADCAST FAILED:', error);
      setStatus('Broadcast failed - check console');
    });
  };

  const getCurrentMessages = () => {
    if (!sessionHistory.length || !sessionHistory[sessionHistory.length - 1].messages) {
      return [];
    }
    return sessionHistory[sessionHistory.length - 1].messages
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const currentMessages = getCurrentMessages();

  return (
    <div style={{
      padding: isMobile ? '10px' : '20px',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      {/* User Welcome & Usage Stats */}
      <div style={{
        background: 'white',
        padding: isMobile ? '12px' : '15px',
        margin: isMobile ? '5px' : '10px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '15px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontWeight: '600', color: '#333', marginBottom: '5px' }}>
              👋 Welcome{user ? `, ${user.name}` : ''}
            </div>
            <strong style={{ color: TIERS[usage.currentTier].color }}>
              {TIERS[usage.currentTier].name} Tier
            </strong>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Sessions: {usage.sessionsCreated}/{TIERS[usage.currentTier].sessionLimit} • 
              Messages: {usage.messagesSent}/{TIERS[usage.currentTier].messageLimit}
            </div>
          </div>
          {!canCreateSession && (
            <button
              onClick={onUpgradePrompt}
              style={{
                padding: '8px 16px',
                backgroundColor: TIERS.pro.color,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              💎 Upgrade
            </button>
          )}
        </div>
      </div>

      {/* Session Controls */}
      <div style={{
        background: 'white',
        padding: isMobile ? '12px' : '15px',
        margin: isMobile ? '5px' : '10px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {!sessionId ? (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleNewSession}
              disabled={!canCreateSession}
              style={{
                padding: isMobile ? '14px 20px' : '16px 32px',
                backgroundColor: canCreateSession ? TIERS[usage.currentTier].color : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: isMobile ? '16px' : '18px',
                fontWeight: '600',
                cursor: canCreateSession ? 'pointer' : 'not-allowed',
                width: isMobile ? '100%' : 'auto',
                minWidth: isMobile ? 'auto' : '200px',
                opacity: canCreateSession ? 1 : 0.6
              }}
            >
              {canCreateSession ? '🚀 Start New Session' : '💎 Upgrade to Create Sessions'}
            </button>
            <p style={{
              margin: '12px 0 0 0',
              fontSize: '14px',
              color: '#666',
              textAlign: 'center'
            }}>
              {canCreateSession ? 
                `Create a session with ${participants.length} AI models` : 
                'Upgrade your plan to create more sessions'}
            </p>
          </div>
        ) : (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '10px' : '0'
            }}>
              <div style={{ flex: 1 }}>
                <p style={{
                  margin: 0,
                  fontSize: isMobile ? '14px' : '16px',
                  color: '#666',
                  wordBreak: 'break-all'
                }}>
                  <strong>Active Session:</strong> {sessionId}
                </p>
                <p style={{
                  margin: '5px 0 0 0',
                  fontSize: isMobile ? '13px' : '14px',
                  color: '#888'
                }}>
                  AI Participants: {participants.map(p => AI_MODELS[p].icon + ' ' + AI_MODELS[p].name).join(', ')}
                </p>
              </div>
              <button
                onClick={() => setSessionId('')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '14px' : '16px',
                  whiteSpace: 'nowrap'
                }}
              >
                End Session
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Unified Conversation Thread */}
      <div style={{
        background: 'white',
        padding: isMobile ? '12px' : '20px',
        margin: isMobile ? '5px' : '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{
          color: '#333',
          marginBottom: '15px',
          fontSize: isMobile ? '18px' : '20px'
        }}>
          {sessionId ? 'AI Conversation Thread' : 'Ready to Start'}
        </h3>

        <div style={{
          border: '2px solid #e0e0e0',
          padding: isMobile ? '12px' : '20px',
          borderRadius: '8px',
          minHeight: isMobile ? '300px' : '500px',
          maxHeight: isMobile ? '400px' : '600px',
          overflowY: 'auto',
          backgroundColor: '#fafafa',
          marginBottom: '20px'
        }}>
          {currentMessages.length > 0 ? (
            <>
              {currentMessages.map((message, index) => {
                const isUserMessage = message.role === 'user' || !message.ai_name;
                const aiName = message.ai_name || '';
                const aiConfig = AI_MODELS[aiName];

                return (
                  <div key={index} style={{
                    marginBottom: '15px',
                    padding: isMobile ? '10px' : '12px',
                    borderRadius: '8px',
                    backgroundColor: !isUserMessage && aiConfig ? 
                      `${aiConfig.color}10` : '#e8f4fd',
                    borderLeft: `4px solid ${
                      !isUserMessage && aiConfig ? aiConfig.color : '#007bff'
                    }`
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '5px',
                      fontWeight: '600',
                      fontSize: isMobile ? '14px' : '16px',
                      color: !isUserMessage && aiConfig ? aiConfig.color : '#007bff',
                      flexWrap: 'wrap'
                    }}>
                      {!isUserMessage ? (
                        <>
                          {aiConfig?.icon} {aiConfig?.name || aiName}
                        </>
                       ) : (user ? `👤 ${user.name}` : '👤 You')}
                      <span style={{
                        marginLeft: '10px',
                        fontSize: isMobile ? '11px' : '12px',
                        fontWeight: 'normal',
                        color: '#666'
                      }}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{
                      color: '#333',
                      fontSize: isMobile ? '14px' : '15px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word'
                    }}>
                      {message.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#666',
              padding: '40px',
              fontStyle: 'italic',
              fontSize: isMobile ? '14px' : '16px'
            }}>
              {sessionId
                ? 'No messages yet. Start a conversation with the AI ensemble!'
                : 'Start a session to begin your AI conversation journey!'}
            </div>
          )}
        </div>

        {/* Input Area */}
        {sessionId && (
          <PromptInput
            onSend={handleSendPrompt}
            sessionId={sessionId}
            isSending={status.includes('Sending') || status.includes('Broadcasting')}
            usage={usage}
            canSendMessage={canSendMessage()}
            onUpgradePrompt={onUpgradePrompt}
            user={user}
          />
        )}
      </div>

      {/* Status Bar */}
      <div style={{
        background: '#e8f4fd',
        padding: isMobile ? '10px' : '15px',
        margin: isMobile ? '5px' : '10px',
        borderRadius: '8px',
        border: '1px solid #74b9ff'
      }}>
        <p style={{
          margin: 0,
          color: '#0984e3',
          fontSize: isMobile ? '14px' : '16px',
          textAlign: 'center'
        }}>
          <strong>Status:</strong> {status || (sessionId
            ? `Active session with ${currentMessages.length} messages`
            : 'Ready for new session')}
        </p>
      </div>
    </div>
  );
}


// --- HISTORY PAGE COMPONENT ---
function HistoryPage({ usage, user }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSessions, setFilteredSessions] = useState([]);
  const navigate = useNavigate();

  // Load session history from localStorage
  useEffect(() => {
    const loadSessions = () => {
      const savedSessions = localStorage.getItem(`janusForgeSessions_${user?.id}`);
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions);
        setSessions(parsedSessions);
        setFilteredSessions(parsedSessions);
      }
    };

    loadSessions();
    
    // Listen for session updates
    const handleStorageUpdate = () => loadSessions();
    window.addEventListener('storage', handleStorageUpdate);
    
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, [user]);

  // Filter sessions based on search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSessions(sessions);
    } else {
      const filtered = sessions.filter(session => 
        session.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.messages?.some(msg => 
          msg.content.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredSessions(filtered);
    }
  }, [searchTerm, sessions]);

  const exportSession = async (session, format) => {
    setExportLoading(true);
    try {
      if (format === 'pdf') {
        await exportToPDF(session);
      } else if (format === 'docx') {
        await exportToDOCX(session);
      } else if (format === 'print') {
        window.print();
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const reloadSession = (session) => {
    // Save session to reload and navigate to dashboard
    localStorage.setItem('reloadSessionData', JSON.stringify(session));
    navigate('/');
  };

  const deleteSession = (sessionId) => {
    if (window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      const updatedSessions = sessions.filter(s => s.session_id !== sessionId);
      setSessions(updatedSessions);
      localStorage.setItem(`janusForgeSessions_${user?.id}`, JSON.stringify(updatedSessions));
    }
  };

  const clearAllSessions = () => {
    if (window.confirm('Are you sure you want to delete ALL sessions? This action cannot be undone.')) {
      setSessions([]);
      setFilteredSessions([]);
      localStorage.removeItem(`janusForgeSessions_${user?.id}`);
    }
  };

  const getSessionPreview = (session) => {
    if (!session.messages || session.messages.length === 0) {
      return 'No messages in this session';
    }
    
    const userMessage = session.messages.find(msg => msg.role === 'user');
    return userMessage ? `${userMessage.content.slice(0, 80)}...` : 'AI-generated session';
  };

  const getParticipantIcons = (session) => {
    if (!session.participants) return '';
    return session.participants.map(p => AI_MODELS[p]?.icon || '❓').join(' ');
  };

  return (
    <div style={{ 
      padding: '20px', 
      minHeight: '100vh', 
      backgroundColor: '#f0f0f0',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <h2 style={{ margin: 0, color: '#333' }}>Conversation History</h2>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '200px'
            }}
          />
          
          {sessions.length > 0 && (
            <button
              onClick={clearAllSessions}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🗑️ Clear All
            </button>
          )}
        </div>
      </div>

      {sessions.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px', 
          color: '#666',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📚</div>
          <h3 style={{ color: '#333', marginBottom: '10px' }}>No Conversation History Yet</h3>
          <p style={{ marginBottom: '25px' }}>Start a session in the Dashboard to see your AI debates here!</p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              backgroundColor: TIERS[usage.currentTier].color,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            🚀 Start Your First Session
          </button>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px', 
          color: '#666',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '36px', marginBottom: '15px' }}>🔍</div>
          <h3 style={{ color: '#333', marginBottom: '10px' }}>No Matching Sessions</h3>
          <p>No sessions found matching "{searchTerm}"</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {filteredSessions.map(session => (
            <div key={session.session_id} style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: selectedSession?.session_id === session.session_id ? '2px solid #007bff' : '1px solid #e0e0e0',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '18px' }}>
                    {session.title || `Session ${session.session_id.slice(-8)}`}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#666', fontSize: '14px' }}>
                      📅 {new Date(session.created_at).toLocaleDateString()}
                    </span>
                    <span style={{ color: '#666', fontSize: '14px' }}>
                      💬 {session.message_count || session.messages?.length || 0} messages
                    </span>
                    <span style={{ color: '#666', fontSize: '14px' }}>
                      {getParticipantIcons(session)} {session.participants?.length || 0} AI models
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => reloadSession(session)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    🔄 Reload
                  </button>
                  
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        exportSession(session, e.target.value);
                        e.target.value = ''; // Reset selection
                      }
                    }}
                    disabled={exportLoading}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">📥 Export...</option>
                    <option value="pdf">PDF Document</option>
                    <option value="docx">Word Document</option>
                    <option value="print">Print</option>
                  </select>
                  
                  <button
                    onClick={() => deleteSession(session.session_id)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    title="Delete Session"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Session Preview */}
              <div style={{
                border: '1px solid #eee',
                borderRadius: '6px',
                padding: '15px',
                backgroundColor: '#fafafa',
                marginBottom: '15px'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                  Session Preview:
                </div>
                <div style={{ 
                  color: '#666', 
                  fontSize: '14px',
                  lineHeight: '1.4',
                  maxHeight: '60px',
                  overflow: 'hidden'
                }}>
                  {getSessionPreview(session)}
                </div>
              </div>

              {/* Quick Stats */}
              <div style={{ 
                display: 'flex', 
                gap: '15px', 
                fontSize: '12px', 
                color: '#888',
                flexWrap: 'wrap'
              }}>
                <span>🆔 {session.session_id.slice(-12)}</span>
                <span>⏱️ Last active: {new Date(session.last_activity || session.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- EXPORT UTILITY FUNCTIONS ---
const exportToPDF = async (session) => {
  // Simple PDF export implementation
  const content = `
    Janus Forge Nexus - Session Export
    Session: ${session.title || session.session_id}
    Created: ${new Date(session.created_at).toLocaleString()}
    Participants: ${session.participants?.map(p => AI_MODELS[p]?.name || p).join(', ')}
    Message Count: ${session.message_count || session.messages?.length || 0}
    
    ${'='.repeat(50)}
    
    ${session.messages?.map(msg => 
      `${msg.role === 'user' ? '👤 You' : `${AI_MODELS[msg.ai_name]?.icon} ${AI_MODELS[msg.ai_name]?.name}`} (${new Date(msg.timestamp).toLocaleTimeString()}):\n${msg.content}\n\n`
    ).join('')}
  `;
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `janus-session-${session.session_id.slice(-8)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  alert('Session exported as text file (PDF export coming soon!)');
};

const exportToDOCX = async (session) => {
  alert('DOCX export functionality coming soon! For now, use the text export.');
};

// --- ENHANCED SESSION SAVING LOGIC ---
const useSessionManager = (user) => {
  const saveSession = (sessionData) => {
    if (!user) return;
    
    const sessions = JSON.parse(localStorage.getItem(`janusForgeSessions_${user.id}`) || '[]');
    
    // Update existing session or add new one
    const existingIndex = sessions.findIndex(s => s.session_id === sessionData.session_id);
    const enhancedSession = {
      ...sessionData,
      title: sessionData.messages?.[0]?.content?.slice(0, 50) + '...' || 'New Session',
      message_count: sessionData.messages?.length || 0,
      last_activity: new Date().toISOString(),
      participants: sessionData.participants || []
    };
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = enhancedSession;
    } else {
      sessions.unshift(enhancedSession); // Add to beginning
    }
    
    // Keep only latest 50 sessions
    const trimmedSessions = sessions.slice(0, 50);
    localStorage.setItem(`janusForgeSessions_${user.id}`, JSON.stringify(trimmedSessions));
  };

  return { saveSession };
};



// --- MAIN APP COMPONENT ---
function App() {
  const [status, setStatus] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('janusForgeOnboardingCompleted');
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const { user, isLoading, authError, login, signup, logout, upgradeAccount } = useAuth();
  const { usage, incrementUsage, canCreateSession, canSendMessage, upgradeTier } = useUsageTracker(user);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    
    // Show auth modal if no user is logged in
    if (!user) {
      setShowAuthModal(true);
    }

    return () => window.removeEventListener('resize', handleResize);
  }, [user]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('janusForgeOnboardingCompleted', 'true');
  };

  const handleUpgradePrompt = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowUpgradeModal(true);
  };

  const handleTierUpgrade = (newTier) => {
    upgradeTier(newTier);
    upgradeAccount(newTier);
    setShowUpgradeModal(false);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    if (!localStorage.getItem('janusForgeOnboardingCompleted')) {
      setShowOnboarding(true);
    }
  };

  const handleLogin = async (email, password) => {
    const result = await login(email, password);
    if (result.success) {
      handleAuthSuccess();
    }
  };

  const handleSignup = async (email, password, name) => {
    const result = await signup(email, password, name);
    if (result.success) {
      handleAuthSuccess();
    }
  };

  return (
    <Router>
      <div className="App">
        {/* Authentication Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => user ? setShowAuthModal(false) : null} // Don't allow closing if no user
          onLogin={handleLogin}
          onSignup={handleSignup}
          isLoading={isLoading}
          error={authError}
        />

       
        {/* Onboarding Tour */}
        {showOnboarding && user && (
          <OnboardingTour 
            onComplete={handleOnboardingComplete} 
            currentTier={usage.currentTier}
            user={user}
          />
        )}

        {/* Upgrade Modal */}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentTier={usage.currentTier}
          onUpgrade={handleTierUpgrade}
          user={user}
        />

        {/* Single Unified Header */}
        <header style={{
          padding: isMobile ? '15px' : '20px',
          borderBottom: '1px solid #ccc',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '15px' : '0'
          }}>
            {/* Brand Section */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              textAlign: isMobile ? 'center' : 'left'
            }}>
              {/* Janus Forge Logo */}
              <img
                src="/janus-forge-logo.jpg"
                alt="Janus Forge"
                style={{
                  width: isMobile ? '60px' : '80px',
                  height: isMobile ? '60px' : '80px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '2px solid #333',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              />

              <div>
                <h1 style={{
                  margin: 0,
                  color: '#333',
                  fontSize: isMobile ? '20px' : '24px',
                  fontWeight: '700'
                }}>
                  Janus Forge Nexus
                </h1>
                <p style={{
                  margin: '4px 0 0 0',
                  color: '#666',
                  fontSize: isMobile ? '14px' : '16px',
                  fontStyle: 'italic',
                  fontWeight: '500'
                }}>
                  Thesis. Antithesis. Humanity
                </p>

                {/* Tier Badge */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '8px',
                  flexWrap: 'wrap',
                  justifyContent: isMobile ? 'center' : 'flex-start'
                }}>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: TIERS[usage.currentTier].color + '20',
                    color: TIERS[usage.currentTier].color,
                    borderRadius: '4px',
                    fontSize: '12px',
                    border: `1px solid ${TIERS[usage.currentTier].color}`,
                    fontWeight: '600'
                  }}>
                    {TIERS[usage.currentTier].name} Tier
                  </span>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: '#fff3cd',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#856404',
                    border: '1px solid #ffeaa7',
                    fontWeight: '500'
                  }}>
                    VETERAN-OWNED
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation & User Actions */}
            <div style={{
              display: 'flex',
              gap: isMobile ? '10px' : '15px',
              flexWrap: 'wrap',
              justifyContent: isMobile ? 'center' : 'flex-end',
              alignItems: 'center'
            }}>
              <nav style={{
                display: 'flex',
                gap: isMobile ? '8px' : '15px',
                flexWrap: 'wrap'
              }}>
                <NavLink
                  to="/"
                  style={({ isActive }) => ({
                    textDecoration: 'none',
                    color: isActive ? '#007bff' : '#666',
                    fontWeight: isActive ? '600' : '500',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: isActive ? '#e8f4fd' : 'transparent',
                    fontSize: isMobile ? '14px' : '16px',
                    whiteSpace: 'nowrap',
                    border: isActive ? '2px solid #007bff' : '2px solid transparent',
                    transition: 'all 0.2s ease'
                  })}
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/history"
                  style={({ isActive }) => ({
                    textDecoration: 'none',
                    color: isActive ? '#007bff' : '#666',
                    fontWeight: isActive ? '600' : '500',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: isActive ? '#e8f4fd' : 'transparent',
                    fontSize: isMobile ? '14px' : '16px',
                    whiteSpace: 'nowrap',
                    border: isActive ? '2px solid #007bff' : '2px solid transparent',
                    transition: 'all 0.2s ease'
                  })}
                >
                  History
                </NavLink>
              </nav>

              {/* User Actions */}
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontSize: '14px',
                    color: '#333',
                    fontWeight: '500'
                  }}>
                    👋 {user.name}
                  </span>
                  <button
                    onClick={logout}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: TIERS.free.color,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🔐 Sign In
                </button>
              )}

              {/* Upgrade Button */}
{user && usage?.currentTier !== 'master' && (
  <button
    onClick={() => setShowUpgradeModal(true)}
    style={{
      padding: '8px 16px',
      backgroundColor: TIERS.pro.color,
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      whiteSpace: 'nowrap'
    }}
  >
    💎 Upgrade
  </button>
)}
              
            </div>
          </div>
        </header>

        {status && (
          <div style={{
            padding: isMobile ? '8px 15px' : '10px 20px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #ddd',
            color: '#495057',
            fontSize: isMobile ? '14px' : '16px',
            textAlign: 'center'
          }}>
            {status}
          </div>
        )}

        <main>
          <Routes>
            <Route path="/" element={
              <Dashboard 
                usage={usage}
                incrementUsage={incrementUsage}
                canCreateSession={canCreateSession()}
                onUpgradePrompt={handleUpgradePrompt}
                user={user}
              />
            } />
            <Route path="/session/:sessionId" element={
              <Dashboard 
                usage={usage}
                incrementUsage={incrementUsage}
                canCreateSession={canCreateSession()}
                onUpgradePrompt={handleUpgradePrompt}
                user={user}
              />
            } />

            <Route path="/history" element={
              <HistoryPage
               usage={usage}
               user={user}
            />
            } />

            <Route path="/contact" element={
              <div style={{
                padding: isMobile ? '15px' : '20px',
                minHeight: '100vh',
                backgroundColor: '#f0f0f0'
              }}>
                <h2 style={{ fontSize: isMobile ? '20px' : '24px' }}>Contact the Forge</h2>
                <p style={{ fontSize: isMobile ? '14px' : '16px' }}>
                  Email: cassandraleighwilliamson@gmail.com
                </p>
                <p style={{ fontSize: isMobile ? '14px' : '16px' }}>
                  Join us in building the future of AI collaboration.
                </p>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
