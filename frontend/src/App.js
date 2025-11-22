import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink } from 'react-router-dom';
import './App.css';

// --- IMPORTS FROM NEW STRUCTURE ---
import { sessionService } from './services/api';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GOLDEN_RECORD } from './data/demos';

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
  grok: { name: "Grok", icon: "🦄", color: "#ff6b6b", description: "Witty, unconventional thinking" },
  gemini: { name: "Gemini", icon: "🌀", color: "#74b9ff", description: "Comprehensive analysis" },
  deepseek: { name: "DeepSeek", icon: "🎯", color: "#00b894", description: "Focused, analytical insights" },
  openai: { name: "OpenAI", icon: "🤖", color: "#8e44ad", description: "Balanced, nuanced responses" },
  anthropic: { name: "Claude", icon: "🧠", color: "#e67e22", description: "Thoughtful, principled analysis" }
};

// --- USAGE TRACKING HOOK ---
function useUsageTracker(user) {
  const [usage, setUsage] = useState(() => {
    const saved = localStorage.getItem(`janusForgeUsage_${user?.email || 'anonymous'}`);
    return saved ? JSON.parse(saved) : {
      sessionsCreated: 0,
      messagesSent: 0,
      currentTier: user?.tier || 'free',
      tierStartDate: new Date().toISOString()
    };
  });

  useEffect(() => {
    if (user?.tier && user.tier !== usage.currentTier) {
      setUsage(prev => ({ ...prev, currentTier: user.tier }));
    }
    localStorage.setItem(`janusForgeUsage_${user?.email || 'anonymous'}`, JSON.stringify(usage));
  }, [usage, user]);

  const incrementUsage = (type, amount = 1) => {
    setUsage(prev => ({
      ...prev,
      [type]: prev[type] + amount
    }));
  };

  const canCreateSession = () => {
    const limit = TIERS[usage.currentTier]?.sessionLimit || 0;
    return usage.sessionsCreated < limit;
  };

  const canSendMessage = () => {
    const limit = TIERS[usage.currentTier]?.messageLimit || 0;
    return usage.messagesSent < limit;
  };

  return { usage, incrementUsage, canCreateSession, canSendMessage };
}

// --- AUTH MODAL COMPONENT ---
function AuthModal({ isOpen, onClose, onLogin, onSignup, onViewDemo, isLoading, error }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoginMode) {
      onLogin(formData.email, formData.password);
    } else {
      onSignup(formData.email, formData.password, formData.name);
    }
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '400px', width: '90%' }}>
        <h2 style={{ textAlign: 'center', color: '#333' }}>{isLoginMode ? 'Welcome Back' : 'Join Janus Forge'}</h2>
        {error && <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {!isLoginMode && (
            <input 
              type="text" 
              placeholder="Full Name" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
              required 
            />
          )}
          <input 
            type="email" 
            placeholder="Email" 
            value={formData.email} 
            onChange={e => setFormData({...formData, email: e.target.value})}
            style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={formData.password} 
            onChange={e => setFormData({...formData, password: e.target.value})}
            style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '6px', border: '1px solid #ddd' }}
            required 
          />
          <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
            {isLoading ? 'Processing...' : (isLoginMode ? 'Sign In' : 'Create Account')}
          </button>
        </form>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
          <button onClick={onViewDemo} style={{ width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            👁️ View Live Demo Session
          </button>
          
          <p style={{ textAlign: 'center', fontSize: '14px', cursor: 'pointer', color: 'blue', margin: 0 }} onClick={() => setIsLoginMode(!isLoginMode)}>
            {isLoginMode ? "Need an account? Sign up" : "Have an account? Sign in"}
          </p>
        </div>

        {user && <button onClick={onClose} style={{ marginTop: '10px', width: '100%', padding: '8px' }}>Close</button>}
      </div>
    </div>
  );
}

// --- PROMPT INPUT COMPONENT ---
function PromptInput({ onSend, sessionId, isSending, usage, canSendMessage, onUpgradePrompt, user }) {
  const [localPrompt, setLocalPrompt] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = () => {
    const trimmed = localPrompt.trim();
    if (trimmed && sessionId && !isSending) {
      if (!canSendMessage) {
        onUpgradePrompt();
        return;
      }
      onSend(trimmed);
      setLocalPrompt('');
    }
  };

  return (
    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '10px' }}>
        <span>{user?.name || 'User'} • Messages: {usage.messagesSent}/{TIERS[usage.currentTier].messageLimit}</span>
      </div>
      <textarea
        ref={inputRef}
        value={localPrompt}
        onChange={(e) => setLocalPrompt(e.target.value)}
        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
        disabled={isSending || !canSendMessage}
        placeholder={canSendMessage ? "Ask the Council..." : "Limit reached."}
        style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
      />
      <button 
        onClick={handleSubmit} 
        disabled={!localPrompt.trim() || isSending}
        style={{ marginTop: '10px', padding: '10px 20px', backgroundColor: TIERS[usage.currentTier].color, color: 'white', border: 'none', borderRadius: '6px', width: '100%', cursor: 'pointer' }}
      >
        {isSending ? 'Synthesizing...' : 'Send to Council'}
      </button>
    </div>
  );
}

// --- DEMO VIEWER COMPONENT ---
function DemoViewer({ onExit }) {
  const messages = GOLDEN_RECORD.messages;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeeba', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0', color: '#856404' }}>🏛️ Hall of Records: Demo Session</h2>
          <p style={{ margin: 0, color: '#856404' }}>{GOLDEN_RECORD.title}</p>
        </div>
        <button onClick={onExit} style={{ padding: '8px 16px', backgroundColor: '#856404', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Exit Demo & Sign Up
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingBottom: '50px' }}>
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const aiConfig = !isUser && msg.ai_name ? AI_MODELS[msg.ai_name] : null;
          
          return (
            <div
              key={idx}
              style={{ 
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                backgroundColor: isUser ? '#007bff' : (aiConfig?.color ? `${aiConfig.color}15` : 'white'),
                color: isUser ? 'white' : '#333',
                borderLeft: !isUser && aiConfig ? `4px solid ${aiConfig.color}` : 'none',
                padding: '15px',
                borderRadius: '12px',
                maxWidth: '80%',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <strong style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {aiConfig ? <span>{aiConfig.icon} {aiConfig.name}</span> : '👤 You'}
              </strong>
              <div style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>{msg.content}</div>
            </div>
          );
        })}
      </div>
      
      <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'white', borderRadius: '8px', marginTop: '20px' }}>
        <h3>Inspired by this debate?</h3>
        <p>Join the Council to start your own session.</p>
        <button onClick={onExit} style={{ padding: '12px 24px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
          Create Your Account
        </button>
      </div>
    </div>
  );
}

// --- DASHBOARD COMPONENT ---
function Dashboard({ onUpgradePrompt }) {
  const { user } = useAuth();
  const { usage, incrementUsage, canCreateSession, canSendMessage } = useUsageTracker(user);
  const [status, setStatus] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [participants] = useState(['gemini', 'deepseek']); 

  const handleNewSession = async () => {
    if (!canCreateSession()) return onUpgradePrompt();
    
    setStatus('Initializing Council...');
    const newId = `sess_${Date.now()}`;
    
    try {
      const response = await sessionService.broadcast({
        session_id: newId,
        ai_participants: participants,
        moderator_prompt: "Session Initialized.",
      });
      setSessionId(newId);
      setMessages(response.data.responses || []);
      incrementUsage('sessionsCreated');
      setStatus('Ready.');
    } catch (err) {
      console.error(err);
      setStatus('Failed to start session.');
    }
  };

  const handleSend = async (text) => {
    setStatus('The Council is deliberating...');
    
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await sessionService.broadcast({
        session_id: sessionId,
        ai_participants: participants,
        moderator_prompt: text
      });
      
      const newResponses = response.data.responses;
      setMessages(prev => [...prev, ...newResponses]);
      incrementUsage('messagesSent', newResponses.length);
      setStatus('Synthesis complete.');
    } catch (err) {
      console.error(err);
      setStatus('Error communicating with Council.');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <h2>Janus Forge Dashboard</h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <span style={{ padding: '5px 10px', backgroundColor: TIERS[usage.currentTier].color, color: 'white', borderRadius: '4px' }}>
            {TIERS[usage.currentTier].name} Tier
          </span>
          {!sessionId && (
            <button onClick={handleNewSession} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Start New Debate
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const aiConfig = !isUser && msg.ai_name ? AI_MODELS[msg.ai_name] : null;
          
          return (
            <div 
              key={idx} 
              style={{ 
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                backgroundColor: isUser ? '#007bff' : (aiConfig?.color ? `${aiConfig.color}15` : 'white'),
                color: isUser ? 'white' : '#333',
                borderLeft: !isUser && aiConfig ? `4px solid ${aiConfig.color}` : 'none',
                padding: '15px',
                borderRadius: '12px',
                maxWidth: '80%',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <strong style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {aiConfig ? <span>{aiConfig.icon} {aiConfig.name}</span> : (msg.ai_name || 'You')}
              </strong>
              <div style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>{msg.content}</div>
            </div>
          );
        })}
      </div>

      {sessionId && (
        <PromptInput 
          onSend={handleSend} 
          sessionId={sessionId} 
          isSending={status.includes('...')}
          usage={usage}
          canSendMessage={canSendMessage()}
          onUpgradePrompt={onUpgradePrompt}
          user={user}
        />
      )}
      
      <div style={{ textAlign: 'center', marginTop: '10px', color: '#666' }}>{status}</div>
    </div>
  );
}

// --- HEADER COMPONENT ---
function Header({ user, logout }) {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', backgroundColor: 'white', borderBottom: '1px solid #ddd' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: '#333' }}>Janus Forge Nexus</h1>
      </div>
      <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <NavLink to="/" style={({isActive}) => ({ textDecoration: 'none', color: isActive ? '#007bff' : '#666', fontWeight: '600' })}>Dashboard</NavLink>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', color: '#333' }}>👋 {user.name || user.email}</span>
            <button onClick={logout} style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Logout</button>
          </div>
        )}
      </nav>
    </header>
  );
}

// --- MAIN WRAPPER ---
function AppContent() {
  const { user, login, signup, logout, authError, isLoading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [viewingDemo, setViewingDemo] = useState(false);

  useEffect(() => {
    if (!user && !isLoading && !viewingDemo) setShowAuth(true);
  }, [user, isLoading, viewingDemo]);

  const handleUpgradePrompt = () => {
    alert("Upgrade coming soon via Stripe!");
  };

  const handleViewDemo = () => {
    setShowAuth(false);
    setViewingDemo(true);
  };

  if (viewingDemo) {
    return (
      <div className="App" style={{ backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
        <DemoViewer onExit={() => setViewingDemo(false)} />
      </div>
    );
  }

  return (
    <Router>
      <div className="App" style={{ backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
        {user && <Header user={user} logout={logout} />}
        
        <AuthModal 
          isOpen={showAuth && !user} 
          onClose={() => {}} 
          onLogin={login} 
          onSignup={signup} 
          onViewDemo={handleViewDemo}
          error={authError} 
          isLoading={isLoading} 
        />
        
        {user && (
          <Routes>
            <Route path="/" element={<Dashboard onUpgradePrompt={handleUpgradePrompt} />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
