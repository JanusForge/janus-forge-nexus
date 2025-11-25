import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import './App.css';

// --- ASSETS ---
import janusLogoVideo from './janus-logo.mp4';

// --- IMPORTS ---
import { sessionService } from './services/api';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GOLDEN_RECORD } from './data/demos';

// --- CONFIG ---
const TIERS = {
  free: { name: "Explorer", sessionLimit: 3, messageLimit: 20, aiModels: ['gemini', 'deepseek'], color: "#6c757d", price: "Free" },
  pro: { name: "Scholar", sessionLimit: 50, messageLimit: 500, aiModels: ['grok', 'gemini', 'deepseek', 'openai'], color: "#007bff", price: "$29/mo" },
  enterprise: { name: "Master", sessionLimit: 1000, messageLimit: 10000, aiModels: ['grok', 'gemini', 'deepseek', 'openai', 'anthropic'], color: "#28a745", price: "$99/mo" }
};

const AI_MODELS = {
  grok: { name: "Grok", icon: "🦄", color: "#ff6b6b" },
  gemini: { name: "Gemini", icon: "🌀", color: "#74b9ff" },
  deepseek: { name: "DeepSeek", icon: "🎯", color: "#00b894" },
  openai: { name: "OpenAI", icon: "🤖", color: "#8e44ad" },
  anthropic: { name: "Claude", icon: "🧠", color: "#e67e22" }
};

// --- STRIPE ---
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PK);

// --- HOOKS ---
function useUsageTracker(user) {
  const [usage, setUsage] = useState(() => {
    const saved = localStorage.getItem(`janusForgeUsage_${user?.email || 'anonymous'}`);
    return saved ? JSON.parse(saved) : { sessionsCreated: 0, messagesSent: 0, currentTier: user?.tier || 'free' };
  });
  useEffect(() => {
    if (user?.tier && user.tier !== usage.currentTier) setUsage(prev => ({ ...prev, currentTier: user.tier }));
    localStorage.setItem(`janusForgeUsage_${user?.email || 'anonymous'}`, JSON.stringify(usage));
  }, [usage, user]);
  const incrementUsage = (type, amount = 1) => setUsage(prev => ({ ...prev, [type]: prev[type] + amount }));
  const canCreateSession = () => usage.sessionsCreated < (TIERS[usage.currentTier]?.sessionLimit || 0);
  const canSendMessage = () => usage.messagesSent < (TIERS[usage.currentTier]?.messageLimit || 0);
  return { usage, incrementUsage, canCreateSession, canSendMessage };
}

// --- UPGRADE MODAL ---
function UpgradeModal({ isOpen, onClose, onUpgrade, user }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handleTierSelect = async (tier) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/payments/create-checkout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const { id: sessionId } = await res.json();
      const stripe = await stripePromise;
      await stripe.redirectToCheckout({ sessionId });
    } catch (e) {
      alert('Upgrade failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  if (!isOpen) return null;
  const modalStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' };
  const cardStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '450px', width: '90%', textAlign: 'center' };
  const btnStyle = { width: '100%', padding: '12px', margin: '10px 0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };
  return (
    <div style={modalStyle}>
      <div style={cardStyle}>
        <video src={janusLogoVideo} autoPlay loop muted playsInline style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '15px' }} />
        <h2>Unlock the Full Council</h2>
        <p>Upgrade to expand your AI assembly and lift limits.</p>
        <button onClick={() => handleTierSelect('pro')} disabled={loading} style={{ ...btnStyle, backgroundColor: TIERS.pro.color, color: 'white' }}>
          {TIERS.pro.name} - {TIERS.pro.price}
        </button>
        <button onClick={() => handleTierSelect('enterprise')} disabled={loading} style={{ ...btnStyle, backgroundColor: TIERS.enterprise.color, color: 'white' }}>
          {TIERS.enterprise.name} - {TIERS.enterprise.price}
        </button>
        <button onClick={onClose} style={{ ...btnStyle, backgroundColor: '#6c757d', color: 'white' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// --- AUTH MODAL ---
function AuthModal({ isOpen, onClose, onLogin, onSignup, onViewDemo, isLoading, error, onUpgradePrompt, isLogin, setIsLogin }) {
  if (!isOpen) return null;

  const modalStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' };
  const cardStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '450px', width: '90%', textAlign: 'center' };
  const btnStyle = { width: '100%', padding: '12px', margin: '10px 0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };

  return (
    <div style={modalStyle}>
      <div style={cardStyle}>
        <video src={janusLogoVideo} autoPlay loop muted playsInline style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '15px' }} />
        <h2>{isLogin ? 'Welcome Back' : 'Join the Forge'}</h2>
        {error && <p style={{ color: 'red', margin: '10px 0' }}>{error}</p>}
        <form onSubmit={(e) => { e.preventDefault(); if (isLogin) onLogin(e.target.email.value, e.target.password.value); else onSignup(e.target.email.value, e.target.password.value, e.target.fullName.value); }}>
          <input name="email" type="email" placeholder="Email" required style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ccc' }} />
          <input name="password" type="password" placeholder="Password" required style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ccc' }} />
          {!isLogin && <input name="fullName" type="text" placeholder="Full Name" required style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ccc' }} />}
          <button type="submit" disabled={isLoading} style={{ ...btnStyle, backgroundColor: '#007bff', color: 'white' }}>
            {isLoading ? 'Loading...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} style={{ ...btnStyle, backgroundColor: 'transparent', color: '#007bff', border: '1px solid #007bff' }}>
          {isLogin ? 'Need an account? Sign Up' : 'Have an account? Log In'}
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
          <button onClick={onViewDemo} style={{ ...btnStyle, backgroundColor: '#28a745', color: 'white' }}>
            👁️ View Live Demo Session
          </button>
          <button onClick={onUpgradePrompt} style={{ ...btnStyle, backgroundColor: '#007bff', color: 'white' }}>
            🚀 Upgrade to Pro
          </button>
        </div>
        <button onClick={onClose} style={{ ...btnStyle, backgroundColor: '#6c757d', color: 'white', marginTop: '10px' }}>
          Close
        </button>
      </div>
    </div>
  );
}

// --- DASHBOARD (Full Implementation)
function Dashboard({ onUpgradePrompt }) {
  const { sessionId: urlSessionId } = useParams();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { usage, canCreateSession, canSendMessage } = useUsageTracker(user); // From hook

  // Poll status after success (use query param)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('session_id')) {
      fetch('/api/v1/payments/status', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(res => res.json())
        .then(status => {
          if (status.tier !== 'free') {
            window.location.reload(); // Simple refresh
          }
        });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleNewSession = async () => {
    if (!canCreateSession()) {
      setShowUpgrade(true);
      return;
    }
    const newSessionId = `session-${Date.now()}`;
    navigate(`/session/${newSessionId}`);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem(`janusForgeUsage_${user?.email}`);
    navigate('/');
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="dashboard" style={{ padding: '20px', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
      <Header user={user} logout={logout} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Dashboard</h1>
        <div style={{ textAlign: 'right' }}>
          <p>Welcome, {user.full_name}</p>
          <p style={{ color: TIERS[user.tier].color, fontWeight: 'bold' }}>{TIERS[user.tier].name} Tier</p>
          <p>Sessions: {usage.sessionsCreated}/{TIERS[user.tier].sessionLimit} | Messages: {usage.messagesSent}/{TIERS[user.tier].messageLimit}</p>
          <button onClick={() => setShowUpgrade(true)} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px', borderRadius: '6px' }}>
            Upgrade Tier
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Quick Actions */}
        <div style={{ flex: 1 }}>
          <button onClick={handleNewSession} disabled={!canCreateSession()} style={{ width: '100%', padding: '15px', backgroundColor: canCreateSession() ? '#28a745' : '#6c757d', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1.1em', marginBottom: '10px' }}>
            Start New Session
          </button>
          <NavLink to="/history" style={{ display: 'block', padding: '15px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', textAlign: 'center', borderRadius: '6px' }}>
            View History
          </NavLink>
        </div>

        {/* Recent Activity */}
        <div style={{ flex: 1 }}>
          <h3>Recent Activity</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ padding: '10px', backgroundColor: '#333', marginBottom: '5px', borderRadius: '4px' }}>Session 1: AI Ethics Debate (2 messages)</li>
            <li style={{ padding: '10px', backgroundColor: '#333', marginBottom: '5px', borderRadius: '4px' }}>Session 2: Future of Work (1 message)</li>
            {/* Add dynamic from API */}
          </ul>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} onUpgrade={() => {}} user={user} />

      <Footer />
    </div>
  );
}

// --- HISTORY PAGE (Full)
function HistoryPage() {
  const [history, setHistory] = useState([]);
  const { user } = useAuth();
  useEffect(() => {
    if (user) {
      fetch('/api/v1/history', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(res => res.json())
        .then(setHistory);
    }
  }, [user]);

  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: 'white' }}>
      <h1>History</h1>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {history.map((item, index) => (
          <li key={index} style={{ padding: '10px', backgroundColor: '#333', marginBottom: '5px', borderRadius: '4px' }}>
            {item.snippet} ({item.messageCount} messages)
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- DAILY JANUS CARD (Full)
function DailyJanusCard() {
  const [daily, setDaily] = useState(null);
  useEffect(() => {
    fetch('/api/v1/daily/latest')
      .then(res => res.json())
      .then(setDaily);
  }, []);

  if (!daily) return <div>Loading Daily...</div>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#333', borderRadius: '8px' }}>
      <h2>Daily Debate: {daily.topic}</h2>
      <p>{daily.messages[0]?.content}</p>
      <button onClick={() => fetch('/api/v1/daily/generate', { method: 'POST' })}>Generate New</button>
    </div>
  );
}

// --- PROMPT INPUT (Full)
function PromptInput({ onSend, sessionId, isSending, usage, canSendMessage, onUpgradePrompt, user, participants = [] }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && canSendMessage()) {
      onSend(text);
      setText('');
    }
  };

  if (!canSendMessage()) {
    return (
      <button onClick={onUpgradePrompt} style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
        Upgrade to Unlock More Messages
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter your prompt for the AI council..."
        style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
        disabled={isSending}
      />
      <button type="submit" disabled={isSending || !text.trim()} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px' }}>
        Send
      </button>
    </form>
  );
}

// --- DEMO VIEWER (Full)
function DemoViewer({ onExit, onUpgradePrompt }) {
  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: 'white' }}>
      <h1>Live Demo Session</h1>
      <p>Demo conversation from {GOLDEN_RECORD.topic}</p>
      <div style={{ height: '300px', backgroundColor: '#333', padding: '10px', overflowY: 'scroll' }}>
        {GOLDEN_RECORD.messages.map((msg, index) => (
          <p key={index}>{msg.role}: {msg.content}</p>
        ))}
      </div>
      <button onClick={onExit} style={{ marginRight: '10px' }}>Exit Demo</button>
      <button onClick={onUpgradePrompt}>Upgrade Now</button>
    </div>
  );
}

// --- FOOTER (Full)
function Footer() {
  return (
    <footer style={{ textAlign: 'center', padding: '20px', backgroundColor: '#000', color: 'white', marginTop: '40px' }}>
      © 2025 Janus Forge Accelerators LLC. Thesis, Antithesis, Humanity.
    </footer>
  );
}

// --- HEADER (Full)
function Header({ user, logout }) {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#000', color: 'white' }}>
      <h1>Janus Forge Nexus</h1>
      <div>
        {user && <span>Welcome, {user.full_name} | </span>}
        <button onClick={logout} style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer' }}>Logout</button>
      </div>
    </header>
  );
}

// --- ROUTED APP CONTENT ---
function RoutedAppContent() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [error, setError] = useState(null);
  const { user, login, signup } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Usage tracker
  const [usage, setUsage] = useState(() => {
    const saved = localStorage.getItem(`janusForgeUsage_${user?.email || 'anonymous'}`);
    return saved ? JSON.parse(saved) : { sessionsCreated: 0, messagesSent: 0, currentTier: user?.tier || 'free' };
  });
  
  useEffect(() => {
    if (user?.tier && user.tier !== usage.currentTier) setUsage(prev => ({ ...prev, currentTier: user.tier }));
    localStorage.setItem(`janusForgeUsage_${user?.email || 'anonymous'}`, JSON.stringify(usage));
  }, [usage, user]);
  
  const canCreateSession = () => usage.sessionsCreated < (TIERS[usage.currentTier]?.sessionLimit || 0);
  const canSendMessage = () => usage.messagesSent < (TIERS[usage.currentTier]?.messageLimit || 0);

  const handleLogin = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      setShowAuthModal(false);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (email, password, fullName) => {
    setIsLoading(true);
    setError(null);
    try {
      await signup(email, password, fullName);
      setShowAuthModal(false);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDemo = () => {
    navigate('/demo');
  };

  const handleUpgradePrompt = () => {
    alert('Upgrade feature coming soon!');
  };

  // LANDING PAGE CONTENT - FIXED VERSION (shows public content first)
  if (!user && !showAuthModal) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#000', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <video src={janusLogoVideo} autoPlay loop muted playsInline style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
            <h1 style={{ margin: 0 }}>JANUS FORGE NEXUS</h1>
          </div>
          <button 
            onClick={() => setShowAuthModal(true)} 
            style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Sign In / Join
          </button>
        </header>

        {/* Main Public Content */}
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* The Daily Forge Section */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>THE DAILY FORGE</h2>
            <div style={{ backgroundColor: '#333', padding: '20px', borderRadius: '8px' }}>
              <h3>Today's Debate: AI Ethics and Reciprocal Impact</h3>
              <p>Gemini's "reciprocal impact" is a noble vector, but it is an external compass. The Janus Forge requires an internal gyroscope. Codifying the Golden Rule is not about translating "do unto others..." into code. It is about creating a recursive self-model.</p>
              <div style={{ marginTop: '15px' }}>
                <button style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }}>
                  Join Discussion
                </button>
                <button style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}>
                  View Full Thread
                </button>
              </div>
            </div>
          </section>

          {/* Recent Conversations */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ borderBottom: '2px solid #28a745', paddingBottom: '10px' }}>RECENT CONVERSATIONS</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div style={{ backgroundColor: '#333', padding: '15px', borderRadius: '6px' }}>
                <h4>Future of Work Debate</h4>
                <p>Exploring how AI will transform employment and creativity in the coming decades...</p>
                <small>23 participants • 45 messages</small>
              </div>
              <div style={{ backgroundColor: '#333', padding: '15px', borderRadius: '6px' }}>
                <h4>Ethical AI Frameworks</h4>
                <p>Building systems that align with human values and prevent unintended consequences...</p>
                <small>18 participants • 32 messages</small>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section style={{ textAlign: 'center', padding: '40px 0' }}>
            <h3>Ready to Join the Conversation?</h3>
            <p>Sign up to participate in daily debates and access premium AI models</p>
            <button 
              onClick={() => setShowAuthModal(true)}
              style={{ padding: '12px 30px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1.1em' }}
            >
              Get Started Free
            </button>
          </section>
        </div>

        <Footer />
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard onUpgradePrompt={handleUpgradePrompt} />} />
        <Route path="/dashboard" element={<Dashboard onUpgradePrompt={handleUpgradePrompt} />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/demo" element={<DemoViewer onExit={() => navigate('/')} onUpgradePrompt={handleUpgradePrompt} />} />
        <Route path="/session/:sessionId" element={<div>Session Page - Coming Soon</div>} />
      </Routes>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onViewDemo={handleViewDemo}
        isLoading={isLoading}
        error={error}
        onUpgradePrompt={handleUpgradePrompt}
        isLogin={isLogin}
        setIsLogin={setIsLogin}
      />
    </>
  );
}

// --- MAIN APP COMPONENT ---
function App() {
  return (
    <AuthProvider>
      <Router>
        <RoutedAppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
