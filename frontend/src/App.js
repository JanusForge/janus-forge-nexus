/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import api, { sessionService } from './services/api';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

// --- ASSETS ---
import janusLogoVideo from './janus-logo.mp4'; 

// --- CONFIG ---
// Use the variable directly when loading Stripe (Vercel cannot duplicate this)
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PK || 'pk_test_placeholder');

// --- GLOBAL STYLES (Unchanged) ---
const GlobalStyles = () => (
  <style>
    {`
    /* RESET & BASE */
    html, body, #root { 
      background-color: #050505 !important; 
      color: #e0e0e0 !important; 
      font-family: 'Inter', sans-serif; 
      margin: 0; 
      min-height: 100vh; 
      overflow-x: hidden;
    }

    /* BACKGROUND GRID EFFECT */
    .cyber-grid {
      position: fixed; top: 0; left: 0; width: 200vw; height: 200vh;
      background-image: linear-gradient(rgba(0, 243, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 243, 255, 0.03) 1px, transparent 1px);
      background-size: 50px 50px;
      transform: perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px);
      animation: grid-move 20s linear infinite;
      pointer-events: none;
      z-index: -1;
    }

    @keyframes grid-move { 0% { transform: perspective(500px) rotateX(60deg) translateY(0) translateZ(-200px); } 100% { transform: perspective(500px) rotateX(60deg) translateY(50px) translateZ(-200px); } }
    @keyframes ring-pulse-fade { 0% { opacity: 0.8; box-shadow: 0 0 10px #00f3ff, inset 0 0 5px #00f3ff, 0 0 60px rgba(0, 243, 255, 0.2); } 100% { opacity: 1; box-shadow: 0 0 30px #00f3ff, inset 0 0 15px #00f3ff, 0 0 150px rgba(0, 243, 255, 0.5); } }
    @keyframes spin-slow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes fade-in-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
    
    .hero-title { font-size: 4rem; font-weight: 900; letter-spacing: 8px; line-height: 1.1; background: linear-gradient(to bottom, #fff, #aaa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 30px rgba(0, 243, 255, 0.3); }
    .hero-subtitle { font-size: 1.2rem; color: #00f3ff; letter-spacing: 4px; text-transform: uppercase; margin-top: 15px; opacity: 0.9; text-shadow: 0 0 10px rgba(0, 243, 255, 0.5); }
    .veteran-badge { color: #00f3ff; font-size: 0.9rem; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 15px; font-weight: bold; padding: 5px 15px; border: 1px solid rgba(0, 243, 255, 0.3); border-radius: 4px; display: inline-block; background: rgba(0, 243, 255, 0.05); }

    .glass-panel { 
      background: rgba(10, 10, 10, 0.6); 
      backdrop-filter: blur(20px); 
      border: 1px solid rgba(255, 255, 255, 0.08); 
      transition: all 0.3s ease; 
    }
    
    .btn-nexus {
      padding: 15px 50px; border: 2px solid #00f3ff; color: #00f3ff; font-size: 1.1rem; font-weight: 800; letter-spacing: 2px; cursor: pointer; transition: all 0.3s; text-transform: uppercase;
    }
    .btn-nexus:hover { background: #00f3ff; color: #000; box-shadow: 0 0 30px #00f3ff; }

    .btn-upgrade-sm { padding: 8px 15px; background: #bc13fe; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.8rem; margin-right: 15px; box-shadow: 0 0 10px rgba(188, 19, 254, 0.3); }

    @media (max-width: 768px) {
      .hero-title { font-size: 2.5rem; letter-spacing: 4px; }
      .hero-subtitle { font-size: 0.9rem; letter-spacing: 2px; }
      .btn-nexus { width: 100%; padding: 15px; }
      .glass-panel { padding: 20px !important; }
      .chat-bubble { font-size: 0.9rem; padding: 15px; }
      
      .app-header { padding: 10px 15px !important; flex-wrap: wrap; gap: 10px; justify-content: center !important; }
      .app-header-right { width: 100%; justify-content: space-between; display: flex; margin-top: 10px; }
      .reactor-logo-header { width: 60px !important; height: 60px !important; }
    }
    `}
  </style>
);



// --- REACTOR LOGO (Unchanged) ---
function ReactorLogo({ size = "150px", pulse = true }) {
  return (
    <div className="reactor-logo-wrapper" style={{ position: 'relative', width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: '-5px', borderRadius: '50%', background: 'conic-gradient(from 0deg, #00f3ff 0deg 5deg, transparent 5deg 15deg, #00f3ff 15deg 20deg, transparent 20deg 30deg, #00f3ff 30deg 35deg, transparent 35deg 45deg, #00f3ff 45deg 50deg, transparent 50deg 60deg, #00f3ff 60deg 65deg, transparent 65deg 75deg, #00f3ff 75deg 80deg, transparent 80deg 90deg, #00f3ff 90deg 95deg, transparent 95deg 105deg, #00f3ff 105deg 110deg, transparent 110deg 120deg, #00f3ff 120deg 125deg, transparent 125deg 135deg, #00f3ff 135deg 140deg, transparent 140deg 150deg, #00f3ff 150deg 155deg, transparent 155deg 165deg, #00f3ff 165deg 170deg, transparent 170deg 180deg, #00f3ff 180deg 185deg, transparent 185deg 195deg, #00f3ff 195deg 200deg, transparent 200deg 210deg, #00f3ff 210deg 215deg, transparent 215deg 225deg, #00f3ff 225deg 230deg, transparent 230deg 240deg, #00f3ff 240deg 245deg, transparent 245deg 255deg, #00f3ff 255deg 260deg, transparent 260deg 270deg, #00f3ff 270deg 275deg, transparent 275deg 285deg, #00f3ff 285deg 290deg, transparent 290deg 300deg, #00f3ff 300deg 305deg, transparent 305deg 315deg, #00f3ff 315deg 320deg, transparent 320deg 330deg, #00f3ff 330deg 335deg, transparent 335deg 345deg, #00f3ff 345deg 350deg, transparent 350deg 360deg)', mask: 'radial-gradient(closest-side, transparent 80%, black 81%)', WebkitMask: 'radial-gradient(closest-side, transparent 80%, black 81%)', animation: 'spin-slow 40s linear infinite, ring-pulse-fade 3s ease-in-out infinite alternate', pointerEvents: 'none' }}></div>
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#000', padding: '10px', boxSizing: 'border-box' }}>
         <video src={janusLogoVideo} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
      </div>
    </div>
  );
}

// --- AUTH MODAL (Unchanged) ---
function AuthModal({ isOpen, onClose, onLogin, requireUpgrade = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await onLogin(email, password, isSignup, fullName);
    } catch (err) {
      alert("Authentication Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fade-in-up 0.3s ease-out' }}>
      <div className="glass-panel" style={{ padding: '50px', borderRadius: '20px', width: '400px', textAlign: 'center', position: 'relative', border: '1px solid #00f3ff', boxShadow: '0 0 50px rgba(0,243,255,0.1)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '20px', background: 'none', border: 'none', color: '#666', fontSize: '2rem', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
        <ReactorLogo size="80px" />
        {requireUpgrade && <p style={{color: '#bc13fe', fontWeight:'bold', marginTop:'10px'}}>LIMIT REACHED. Access required.</p>}
        <h2 style={{ color: '#00f3ff', margin: '30px 0 10px 0', letterSpacing: '2px' }}>{isSignup ? "INITIATE ACCESS" : "VERIFY IDENTITY"}</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isSignup && (<input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ padding: '15px', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '6px', fontSize: '1rem' }} />)}
          <input type="text" placeholder="Email / ID" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '15px', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '6px', fontSize: '1rem' }} />
          <input type="password" placeholder="Access Code" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '15px', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '6px', fontSize: '1rem' }} />
          <button type="submit" disabled={loading} className="btn-nexus" style={{ width: '100%', marginTop: '15px', background: '#00f3ff', color: 'black' }}>
            {loading ? "PROCESSING..." : (isSignup ? "CREATE ACCOUNT" : "ENTER NEXUS")}
          </button>
        </form>

        <div style={{ marginTop: '20px', fontSize: '0.9rem', color: '#888' }}>
          {isSignup ? "Already have clearance? " : "Need clearance? "}
          <button onClick={() => setIsSignup(!isSignup)} style={{ background: 'none', border: 'none', color: '#00f3ff', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}>
            {isSignup ? "Log In" : "Request Access"}
          </button>
        </div>
      </div>
    </div>
  );
}


// --- LIVE INTERACTIVE CHAT COMPONENT (The NEW CORE) ---
function LiveChatSection({ onUpgradeTrigger }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([{ role: 'system', content: 'Welcome to the Live Dialectic. Query the Council to begin.' }]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const MSG_LIMIT = user ? 20 : 3; // 3 messages for unauthenticated users, 20 for logged-in free users.
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (msgCount >= MSG_LIMIT) { setShowUpgradeModal(true); return; }

    const userMsg = { role: 'user', content: input, model: user ? user.email : 'Guest' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);
    
    try {
      // NOTE: This hits the BACKEND which implements the Gemini/DeepSeek dialectic
      const res = await sessionService.sendMessage(input, "dialectic", []);
      setMessages(prev => [...prev, ...res.data.messages.map(m => ({ role: 'ai', content: m.content, model: m.model }))]);
      setMsgCount(prev => prev + 1);
    } catch (err) { 
      console.error("Chat API Error:", err);
      setMessages(prev => [...prev, { role: 'system', content: 'Connection Error: Unable to reach AI Council.' }]); 
    } finally { 
      setIsSending(false); 
    }
  };

  const handleUnlockClick = () => {
    if (!user) {
      // If not logged in, trigger the main login/signup flow
      onUpgradeTrigger(true); 
    } else {
      // If logged in, send them directly to the payment flow (Scholar tier default)
      alert("Redirecting to Secure Payment Gateway for Scholar Access...");
      // Add Stripe logic here later when we integrate payment triggers from the frontend
    }
  };


  return (
    <>
      <div className="glass-panel" style={{ padding: '40px', borderRadius: '20px', position: 'relative', overflow: 'hidden', minHeight: '500px' }}>
        
        {/* Header */}
        <div style={{ borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '30px' }}>
            <h3 style={{ margin: 0, color: '#00f3ff', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>🔴 LIVE INTERACTIVE DIALECTIC</h3>
            <p style={{ fontSize: '0.9rem', color: '#aaa', fontStyle:'italic', marginTop: '10px' }}>{user ? `Welcome back, ${user.full_name}.` : 'Demonstration Mode.'} Interactions remaining: <span style={{ color: msgCount >= MSG_LIMIT ? 'red' : '#00f3ff', fontWeight: 'bold' }}>{MSG_LIMIT - msgCount}</span></p>
        </div>

        {/* Chat Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '350px', overflowY: 'auto', paddingRight: '10px', marginBottom: '20px' }}>
          {messages.map((msg, idx) => (
              <div key={idx} className="chat-bubble" style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', 
                background: msg.role === 'user' ? '#1a1a2e' : '#111', 
                border: msg.role === 'user' ? '1px solid #bc13fe' : '1px solid #333',
                boxShadow: msg.role === 'user' ? '0 0 15px rgba(188, 19, 254, 0.1)' : 'none',
                width: 'fit-content', maxWidth: '85%'
              }}>
                  {msg.model && <strong style={{display:'block', marginBottom:'5px', fontSize:'0.75rem', color: '#00f3ff', textTransform:'uppercase', letterSpacing:'1px'}}>{msg.model}</strong>} 
                  {msg.content}
              </div>
          ))}
          {isSending && <div style={{ color: '#666', fontStyle: 'italic', fontSize: '0.8rem', marginLeft: '10px' }}>Nexus processing...</div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} style={{ position: 'relative', marginTop: 'auto' }}>
          <input 
            value={input} onChange={(e) => setInput(e.target.value)} placeholder="Query the Council..." 
            style={{ width: '100%', padding: '15px 60px 15px 20px', borderRadius: '30px', background: '#0a0a0a', border: '1px solid #00f3ff', color: 'white', fontSize: '1rem', outline: 'none', boxShadow: '0 0 20px rgba(0, 243, 255, 0.1)' }} disabled={isSending || msgCount >= MSG_LIMIT} 
          />
          <button type="submit" style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#00f3ff', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem' }} disabled={isSending || msgCount >= MSG_LIMIT}>➤</button>
        </form>
      </div>
      
      {/* Upgrade Modal Triggered by Limit */}
      <AuthModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onLogin={onUpgradeTrigger} requireUpgrade={true} />
    </>
  );
}

// --- LANDING PAGE ---
function LandingPage() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  
  const handleLoginSignup = async (email, password, isSignup, fullName) => {
    let success = false;
    if (isSignup) {
      await api.post('/api/v1/auth/signup', { email, password, full_name: fullName });
    }
    const result = await login(email, password);
    if (result) {
      success = true;
      setShowAuth(false);
      navigate('/dashboard'); 
    }
    return success;
  };
  
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div className="cyber-grid"></div>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', boxSizing: 'border-box', paddingBottom: '80px' }}>
        
        {/* HERO SECTION */}
        <section style={{ minHeight: '40vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', width: '100%', padding: '20px', animation: 'fade-in-up 1.5s ease-out' }}>
          
          <div onClick={() => setShowAuth(true)} style={{ cursor: 'pointer', marginBottom: '30px' }}>
             <div style={{ width: 'clamp(150px, 20vw, 200px)', height: 'clamp(150px, 20vw, 200px)' }}><ReactorLogo size="100%" /></div>
          </div>
          
          <div className="veteran-badge">A Veteran Owned American Company</div>
          <h1 className="hero-title" style={{fontSize: '3rem', letterSpacing: '5px'}}>JANUS FORGE NEXUS<sup style={{fontSize:'0.3em'}}>TM</sup></h1>
          <div className="hero-subtitle" style={{marginTop: '5px'}}>Orchestrate the Intelligence</div>
          
          <button onClick={() => setShowAuth(true)} className="btn-nexus" style={{marginTop: '30px'}}>
            ENTER NEXUS
          </button>
        </section>

        {/* LIVE INTERACTIVE CHAT EMBED */}
        <section style={{ width: '100%', maxWidth: '900px', padding: '0 20px', boxSizing: 'border-box' }}>
            <LiveChatSection onUpgradeTrigger={() => setShowAuth(true)} />
        </section>

      </main>

      {/* LEGAL FOOTER */}
      <footer style={{ borderTop: '1px solid #222', padding: '40px 20px', textAlign: 'center', fontSize: '0.75rem', color: '#555', background: '#020202', width: '100%', boxSizing: 'border-box' }}>
        <p style={{ marginBottom: '8px', fontWeight: 'bold', color: '#777' }}>&copy; 2025 Janus Forge Accelerators, LLC.</p>
        <p style={{ marginBottom: '20px' }}>Janus Forge Nexus™ is a property of Janus Forge Accelerators, LLC, a Kentucky Limited Liability Company.</p>
      </footer>
      
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onLogin={handleLoginSignup} requireUpgrade={false} />
    </div>
  );
}

// --- DASHBOARD (Command Center) ---
function Dashboard() {
  // Logic remains the same: Renders the Command Center
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="cyber-grid"></div>
      <header className="app-header" style={{ padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.95)', zIndex: 50, backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="reactor-logo-header" style={{ width: '60px', height: '60px' }}><ReactorLogo size="100%" /></div>
          <div><h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', letterSpacing: '2px', textShadow: '0 0 15px rgba(0,243,255,0.3)' }}>NEXUS // COMMAND</h2></div>
        </div>
        <div className="app-header-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => alert("Redirect to Stripe Checkout")} className="btn-upgrade-sm">UPGRADE TIER</button>
          <span style={{ fontSize: '0.9rem', color: '#888' }}>{user?.full_name}</span>
          <button onClick={logout} className="btn-exit" style={{ padding: '8px 15px' }}>DISCONNECT</button>
        </div>
      </header>
      
      <main style={{ flex: 1, padding: '40px', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '40px', color: '#fff' }}>SYSTEM STATUS: <span style={{ color: '#00f3ff' }}>OPTIMAL</span></h2>
        
        {/* Simplified Dashboard Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div className="glass-panel" style={{ padding: '40px', borderRadius: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '300px' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Initiate New Dialectic</h3>
            <button onClick={() => alert("Starting new authenticated session...")} className="btn-nexus">INITIALIZE SESSION</button>
          </div>
          <div className="glass-panel" style={{ padding: '30px', borderRadius: '20px' }}>
            <h3 style={{ marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Council Status</h3>
            {['Gemini', 'DeepSeek', 'Grok', 'Claude'].map(ai => ( <div key={ai} style={{ padding: '10px', background: '#0a0a0a', borderRadius: '4px', marginBottom: '5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span className="status-dot status-online"></span><span style={{ fontWeight: 'bold' }}>{ai}</span><span style={{ fontSize: '0.8rem', color: '#00f3ff' }}>READY</span></div> ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- ROUTER ---
function RoutedAppContent() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  
  const handleLoginSignup = async (email, password, isSignup, fullName) => {
    let success = false;
    try {
      if (isSignup) {
        await api.post('/api/v1/auth/signup', { email, password, full_name: fullName });
      }
      const result = await login(email, password);
      if (result) {
        success = true;
        setShowAuth(false);
      }
    } catch (err) {
      alert("Authentication Failed: " + err.message);
    }
    return success;
  };
  
  // Logic to show Dashboard if logged in, otherwise Landing Page
  useEffect(() => {
    if (user && window.location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [user, navigate]);


  return (
    <>
      <GlobalStyles />
      <Routes>
        <Route path="/" element={user ? <Dashboard /> : <LandingPage onEnterNexus={() => setShowAuth(true)} />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <LandingPage onEnterNexus={() => setShowAuth(true)} />} />
      </Routes>
      
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onLogin={handleLoginSignup} requireUpgrade={false} />
    </>
  );
}

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