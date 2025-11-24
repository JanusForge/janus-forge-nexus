import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js'; // New: For client-side Stripe
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
};  // --- Needs a higher level for special purpose users ---

const AI_MODELS = {
  grok: { name: "Grok", icon: "🦄", color: "#ff6b6b" },
  gemini: { name: "Gemini", icon: "🌀", color: "#74b9ff" },
  deepseek: { name: "DeepSeek", icon: "🎯", color: "#00b894" },
  openai: { name: "OpenAI", icon: "🤖", color: "#8e44ad" },
  anthropic: { name: "Claude", icon: "🧠", color: "#e67e22" }
};

// frontend/src/app.js (Secured Implementation)
// --- STRIPE ---
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PK); // Loads key securely from Render environment variable


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
// --- NEW UPGRADE MODAL ---
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
        <button onClick={onClose} style={{ ...btnStyle, backgroundColor: '#6c757d', color: 'white' }}>Cancel</button>
      </div>
    </div>
  );
}
// --- COMPONENTS --- (Rest unchanged until Dashboard)
function AuthModal({ isOpen, onClose, onLogin, onSignup, onViewDemo, isLoading, error, onUpgradePrompt }) {
  if (!isOpen) return null;  // Only render if open

  const modalStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' };
  const cardStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '450px', width: '90%', textAlign: 'center' };
  const btnStyle = { width: '100%', padding: '12px', margin: '10px 0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };

  return (
    <div style={modalStyle}>
      <div style={cardStyle}>
        <video src={janusLogoVideo} autoPlay loop muted playsInline style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '15px' }} />
        <h2>Welcome Back</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form onSubmit={(e) => { e.preventDefault(); if (isLogin) onLogin(); else onSignup(); }}>
          <input type="email" placeholder="Email" required style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ccc' }} />
          <input type="password" placeholder="Password" required style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ccc' }} />
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
function HistoryPage() {
  // ... unchanged
}
function DailyJanusCard() {
  // ... unchanged, but add upgrade tease if free:
  // In the <p> tag: <span style={{ /* existing */ }} onClick={onUpgradePrompt}>Upgrade to Pro to expand the Council →</span>
}
function PromptInput({ onSend, sessionId, isSending, usage, canSendMessage, onUpgradePrompt, user, participants = [] }) {
  // ... existing, but if !canSendMessage, show upgrade button instead of placeholder.
  // In JSX:
  {!canSendMessage && (
    <button onClick={onUpgradePrompt} style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
      Upgrade to Unlock More Messages
    </button>
  )}
  // ... rest
}
function DemoViewer({ onExit, onUpgradePrompt }) {  // Added onUpgradePrompt
  // ... existing, add upgrade button in header:
  // <button onClick={onUpgradePrompt} style={{ /* similar to exit */ }}>Upgrade Now</button>
}
function Dashboard({ onUpgradePrompt }) {
  const { sessionId: urlSessionId } = useParams();
  // ... existing states
  const [showUpgrade, setShowUpgrade] = useState(false);  // New
  const navigate = useNavigate();  // For post-success redirect

  // New: Poll status after success (use query param)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('session_id')) {
      // Poll /payments/status to refresh tier
      fetch('/api/v1/payments/status', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(res => res.json())
        .then(status => {
          if (status.tier !== 'free') {
            // Refresh user/tier in context (assume AuthContext has refreshUser)
            // window.location.reload(); // Simple refresh
          }
        });
      // Clear query
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Update handleNewSession & handleSend to call onUpgradePrompt if limits hit
  const handleNewSession = async () => {
    if (!canCreateSession()) {
      setShowUpgrade(true);
      return;
    }
    // ... existing
  };
  const handleSend = async (text) => {
    if (!canSendMessage()) {
      setShowUpgrade(true);
      return;
    }
    // ... existing
  };

  // In JSX, add <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} onUpgrade={() => {}} user={user} />
  // Also, in header: <button onClick={() => setShowUpgrade(true)}>Upgrade Tier</button> near "Start New Debate"

  // ... rest of JSX unchanged
}
function Footer() {
  // ... unchanged
}
function Header({ user, logout }) {
  // ... unchanged
}
function AppContent() {
  const [showAuthModal, setShowAuthModal] = useState(false);  // Initial false: Show landing first
  const [isLogin, setIsLogin] = useState(false);  // For toggle in modal
  const [error, setError] = useState(null);  // For auth errors
  const { user, login, signup } = useAuth();  // From your context
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      setShowAuthModal(false);
    } catch (err) {
      setError(err.message || 'Login failed');
    }
    setIsLoading(false);
  };

  const handleSignup = async (email, password, fullName) => {
    setIsLoading(true);
    setError(null);
    try {
      await signup(email, password, fullName);
      setShowAuthModal(false);
    } catch (err) {
      setError(err.message || 'Signup failed');
    }
    setIsLoading(false);
  };

  const onViewDemo = () => {
    // If no user, maybe set a demo flag or route to demo without auth
    navigate('/demo');  // Or setShowAuthModal(true) if auth required
  };

  const onUpgradePrompt = () => {
    // Your upgrade logic
    setShowAuthModal(false);  // Close modal first
    // e.g., setShowUpgrade(true);
  };

  return (
    <div className="app">
      {/* Landing Page - Shows first */}
      {!showAuthModal && (
        <div className="landing-page">
          <h1>The Daily Janus</h1>
          <p>Explore provocative AI debates, synthesize humanity's edge.</p>
          <video src={janusLogoVideo} autoPlay loop muted playsInline style={{ width: '200px', height: '200px', borderRadius: '50%' }} />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { setIsLogin(false); setShowAuthModal(true); }}>Sign Up</button>
            <button onClick={() => { setIsLogin(true); setShowAuthModal(true); }}>Log In</button>
            <button onClick={onViewDemo}>View Live Demo</button>
          </div>
        </div>
      )}
      {/* Routes (dashboard, history, etc.) - Show if user */}
      {user && <Routes> ... </Routes>}
      {/* Auth Modal - Triggers on button */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onLogin={(email, password) => handleLogin(email, password)} 
        onSignup={(email, password, fullName) => handleSignup(email, password, fullName)} 
        onViewDemo={onViewDemo} 
        isLoading={isLoading} 
        error={error}
        onUpgradePrompt={onUpgradePrompt}
      />
    </div>
  );
}
export default function App() { return <AuthProvider><AppContent /></AuthProvider>; }
