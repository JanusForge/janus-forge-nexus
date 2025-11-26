/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import api, { sessionService } from './services/api';
import './App.css';

// --- ASSETS ---
import janusLogoVideo from './janus-logo.mp4'; 
import { AuthProvider, useAuth } from './context/AuthContext';

// --- GLOBAL STYLES ---
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
      position: fixed;
      top: 0; left: 0; width: 200vw; height: 200vh;
      background-image: 
        linear-gradient(rgba(0, 243, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 243, 255, 0.03) 1px, transparent 1px);
      background-size: 50px 50px;
      transform: perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px);
      animation: grid-move 20s linear infinite;
      pointer-events: none;
      z-index: -1;
    }

    @keyframes grid-move {
      0% { transform: perspective(500px) rotateX(60deg) translateY(0) translateZ(-200px); }
      100% { transform: perspective(500px) rotateX(60deg) translateY(50px) translateZ(-200px); }
    }

    /* ANIMATIONS */
    @keyframes ring-pulse-fade {
      0% { opacity: 0.8; box-shadow: 0 0 10px #00f3ff, inset 0 0 5px #00f3ff, 0 0 60px rgba(0, 243, 255, 0.2); }
      100% { opacity: 1; box-shadow: 0 0 30px #00f3ff, inset 0 0 15px #00f3ff, 0 0 150px rgba(0, 243, 255, 0.5); }
    }
    @keyframes spin-slow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes fade-in-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
    
    /* TYPOGRAPHY */
    .hero-title {
      font-size: 4rem;
      font-weight: 900;
      letter-spacing: 8px;
      margin: 0;
      background: linear-gradient(to bottom, #fff, #aaa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 0 30px rgba(0, 243, 255, 0.3);
    }
    
    .hero-subtitle {
      font-size: 1.2rem;
      color: #00f3ff;
      letter-spacing: 4px;
      text-transform: uppercase;
      margin-top: 15px;
      opacity: 0.9;
      text-shadow: 0 0 10px rgba(0, 243, 255, 0.5);
    }

    .veteran-badge {
      color: #00f3ff;
      font-size: 0.9rem;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 15px;
      font-weight: bold;
      padding: 5px 15px;
      border: 1px solid rgba(0, 243, 255, 0.3);
      border-radius: 4px;
      display: inline-block;
      background: rgba(0, 243, 255, 0.05);
    }

    /* COMPONENTS */
    .glass-panel { 
      background: rgba(10, 10, 10, 0.6); 
      backdrop-filter: blur(20px); 
      border: 1px solid rgba(255, 255, 255, 0.08); 
      transition: all 0.3s ease; 
    }
    .glass-panel:hover { border-color: #00f3ff; box-shadow: 0 0 20px rgba(0, 243, 255, 0.15); }
    
    .chat-bubble { padding: 15px; border-radius: 12px; margin-bottom: 15px; max-width: 85%; line-height: 1.5; color: #ddd; }
    
    .status-dot { height: 10px; width: 10px; border-radius: 50%; display: inline-block; margin-right: 8px; }
    .status-online { background-color: #00f3ff; box-shadow: 0 0 8px #00f3ff; }
    
    /* BUTTONS */
    .btn-nexus {
      padding: 15px 50px;
      background: transparent;
      border: 2px solid #00f3ff;
      color: #00f3ff;
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: 2px;
      cursor: pointer;
      transition: all 0.3s;
      text-transform: uppercase;
      position: relative;
      overflow: hidden;
    }
    .btn-nexus:hover {
      background: #00f3ff;
      color: #000;
      box-shadow: 0 0 30px #00f3ff;
    }

    .btn-exit {
      padding: 8px 20px;
      background: rgba(255, 0, 0, 0.1);
      border: 1px solid #ff4444;
      color: #ff4444;
      font-weight: bold;
      letter-spacing: 1px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 0.8rem;
    }
    .btn-exit:hover {
      background: #ff4444;
      color: black;
      box-shadow: 0 0 15px rgba(255, 68, 68, 0.5);
    }

    .btn-upgrade-sm {
      padding: 8px 15px;
      background: #bc13fe;
      color: white;
      border: none;
      border-radius: 4px;
      font-weight: bold;
      cursor: pointer;
      font-size: 0.8rem;
      margin-right: 15px;
      box-shadow: 0 0 10px rgba(188, 19, 254, 0.3);
    }
    .btn-upgrade-sm:hover {
      transform: scale(1.05);
      box-shadow: 0 0 20px rgba(188, 19, 254, 0.5);
    }
    
    /* MOBILE TWEAKS */
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

const STRIPE_KEY = process.env.REACT_APP_STRIPE_PK || 'pk_test_placeholder';
const stripePromise = loadStripe(STRIPE_KEY); 

// --- COMPONENTS ---

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

// --- AUTH MODAL ---
function AuthModal({ isOpen, onClose, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Pass extra param 'isSignup' + name if needed
      await onLogin(email, password, isSignup, fullName);
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
        <h2 style={{ color: '#00f3ff', margin: '30px 0 10px 0', letterSpacing: '2px' }}>{isSignup ? "INITIATE ACCESS" : "VERIFY IDENTITY"}</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isSignup && (
            <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ padding: '15px', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '6px', fontSize: '1rem' }} />
          )}
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

// --- LANDING PAGE ---
function LandingPage({ onEnterNexus }) {
  const [daily, setDaily] = useState(null);
  useEffect(() => { sessionService.getLatestDaily().then(res => setDaily(res.data)).catch(console.error); }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div className="cyber-grid"></div>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', boxSizing: 'border-box', paddingBottom: '80px' }}>
        <section style={{ minHeight: '85vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', width: '100%', padding: '20px', animation: 'fade-in-up 1.5s ease-out' }}>
          <div onClick={onEnterNexus} style={{ cursor: 'pointer', marginBottom: '30px' }}>
             <div style={{ width: 'clamp(250px, 50vw, 400px)', height: 'clamp(250px, 50vw, 400px)' }}><ReactorLogo size="100%" /></div>
          </div>
          <div className="veteran-badge">A Veteran Owned American Company</div>
          <h1 className="hero-title">JANUS FORGE NEXUS<sup style={{fontSize:'0.4em', verticalAlign:'top', color:'#555'}}>TM</sup></h1>
          <div className="hero-subtitle">Orchestrate the Intelligence</div>
          <p style={{ fontSize: '1.1rem', color: '#888', maxWidth: '600px', margin: '30px auto 50px auto', lineHeight: '1.6', padding: '0 10px' }}>The Council is deliberating. Witness an autonomous multi-ai dialectic conversation.</p>
          <button onClick={onEnterNexus} className="btn-nexus">ENTER NEXUS</button>
          <div style={{ marginTop: '60px', color: '#444', fontSize: '2rem', animation: 'bounce 2s infinite', cursor: 'pointer' }} onClick={() => window.scrollTo({top: 800, behavior: 'smooth'})}>↓</div>
        </section>

        <section style={{ width: '100%', maxWidth: '900px', padding: '0 20px', boxSizing: 'border-box' }}>
          <div className="glass-panel" style={{ padding: '40px', borderRadius: '20px', position: 'relative', overflow: 'hidden', minHeight: '500px' }}>
            <div style={{ borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '30px' }}>
               <div style={{ display:'flex', flexWrap: 'wrap', gap: '10px', justifyContent:'space-between', alignItems:'center', marginBottom: '15px' }}>
                 <h3 style={{ margin: 0, color: '#00f3ff', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>🔴 LIVE: THE DAILY FORGE</h3>
                 <span style={{ color:'#666', fontSize:'0.8rem', fontFamily: 'monospace' }}>{daily ? daily.date : 'INITIALIZING...'}</span>
               </div>
               <p style={{ fontSize: '0.9rem', color: '#aaa', fontStyle:'italic', lineHeight:'1.5' }}>Every 24 hours, our autonomous Scout Agent scans the global datasphere for emerging patterns. It presents the critical vector to The Council for an unscripted, real-time dialectic.</p>
            </div>
            {daily && (
              <>
                <h2 style={{ textAlign: 'center', marginBottom: '40px', fontStyle:'italic', fontSize: '1.5rem', color: '#fff' }}>"{daily.topic}"</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {daily.messages.map((msg, index) => (
                    <div key={index} className="chat-bubble" style={{ alignSelf: index % 2 === 0 ? 'flex-start' : 'flex-end', background: index % 2 === 0 ? '#111' : '#1a1a2e', border: index % 2 === 0 ? '1px solid #333' : '1px solid #bc13fe', width: '100%', maxWidth: '100%' }}>
                      <strong style={{ color: index % 2 === 0 ? '#00f3ff' : '#bc13fe', display: 'block', marginBottom: '5px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{msg.role}</strong>{msg.text}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '40px', textAlign: 'center', borderTop: '1px solid #333', paddingTop: '20px', color: '#555', fontStyle:'italic', fontSize: '0.8rem' }}>~ END TRANSMISSION ~</div>
              </>
            )}
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid #222', padding: '40px 20px', textAlign: 'center', fontSize: '0.75rem', color: '#555', background: '#020202', width: '100%', boxSizing: 'border-box' }}>
        <p style={{ marginBottom: '8px', fontWeight: 'bold', color: '#777' }}>&copy; 2025 Janus Forge Accelerators, LLC.</p>
        <p style={{ marginBottom: '20px' }}>Janus Forge Nexus™ is a property of Janus Forge Accelerators, LLC, a Kentucky Limited Liability Company.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px' }}>
          <span style={{ cursor: 'pointer', textDecoration: 'none', color: '#444', transition: 'color 0.2s' }} className="footer-link">Privacy Policy</span>
          <span style={{ cursor: 'pointer', textDecoration: 'none', color: '#444', transition: 'color 0.2s' }} className="footer-link">Terms of Service</span>
          <span style={{ cursor: 'pointer', textDecoration: 'none', color: '#444', transition: 'color 0.2s' }} className="footer-link">Legal Disclaimer</span>
        </div>
      </footer>
    </div>
  );
}

// --- FREE PLAYGROUND (Refined) ---
function DemoPlayground({ onUnlockClick }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([{ role: 'system', content: 'Welcome to the Free Nexus Playground. Two council members are online.' }]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const MSG_LIMIT = 5;
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (msgCount >= MSG_LIMIT) { setShowUpgrade(true); return; }

    const newMsgs = [...messages, { role: 'user', content: input }];
    setMessages(newMsgs);
    setInput('');
    setIsSending(true);
    setMsgCount(prev => prev + 1);

    try {
      const res = await sessionService.sendMessage(input, "standard", []);
      if (res.data && res.data.messages) {
        const aiMsgs = res.data.messages.map(m => ({ role: 'ai', content: m.content, model: m.model }));
        setMessages([...newMsgs, ...aiMsgs]);
      }
    } catch (err) { setMessages([...newMsgs, { role: 'system', content: 'Connection Error. Please try again.' }]); } finally { setIsSending(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div className="cyber-grid"></div>
      
      <header className="app-header" style={{ padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.95)', zIndex: 50, backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="reactor-logo-header" style={{ width: '80px', height: '80px' }}><ReactorLogo size="100%" /></div>
          <div><h2 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', letterSpacing: '2px', textShadow: '0 0 15px rgba(0,243,255,0.3)' }}>JANUS FORGE</h2><span style={{ fontSize: '0.9rem', color: '#00f3ff', letterSpacing: '4px' }}>PLAYGROUND</span></div>
        </div>
        <div className="app-header-right" style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={onUnlockClick} className="btn-upgrade-sm">UNLOCK FULL ACCESS</button>
          <button onClick={() => navigate('/')} className="btn-exit">EXIT SIMULATION</button>
        </div>
      </header>

      <div style={{ flex: 1, width: '100%', maxWidth: '900px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', height: 'calc(100vh - 120px)' }}>
        <div style={{ marginBottom: '20px', textAlign: 'center', fontSize: '0.9rem', padding: '12px', background: 'rgba(0, 243, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(0, 243, 255, 0.1)', letterSpacing: '1px' }}>
          <span style={{ color: '#888' }}>FREE INTERACTIONS REMAINING:</span> <span style={{ color: msgCount >= MSG_LIMIT ? 'red' : '#00f3ff', fontWeight: 'bold', marginLeft: '10px', fontSize: '1.1rem' }}>{MSG_LIMIT - msgCount}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px', overflowY: 'auto', paddingRight: '10px' }}>
          {messages.map((msg, idx) => (
              <div key={idx} className="chat-bubble" style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', background: msg.role === 'user' ? '#1a1a2e' : '#111', border: msg.role === 'user' ? '1px solid #bc13fe' : '1px solid #333', boxShadow: msg.role === 'user' ? '0 0 15px rgba(188, 19, 254, 0.1)' : 'none', color: '#ddd', width: 'fit-content', maxWidth: '85%' }}>
                  {msg.model && <strong style={{display:'block', marginBottom:'5px', fontSize:'0.75rem', color: '#00f3ff', textTransform:'uppercase', letterSpacing:'1px'}}>{msg.model}</strong>} {msg.content}
              </div>
          ))}
          {isSending && <div style={{ color: '#666', fontStyle: 'italic', fontSize: '0.8rem', marginLeft: '10px' }}>Nexus processing...</div>}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSend} style={{ position: 'relative', marginTop: 'auto' }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Query the Council..." style={{ width: '100%', padding: '25px 70px 25px 30px', borderRadius: '40px', background: '#0a0a0a', border: '1px solid #00f3ff', color: 'white', fontSize: '1.1rem', outline: 'none', boxShadow: '0 0 25px rgba(0, 243, 255, 0.15)', boxSizing: 'border-box' }} disabled={isSending} />
          <button type="submit" style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#00f3ff', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.5rem', transition: 'transform 0.2s' }} disabled={isSending}>➤</button>
        </form>
      </div>

      {showUpgrade && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ padding: '40px', borderRadius: '15px', width: '100%', maxWidth: '400px', textAlign: 'center', border: '1px solid #bc13fe', boxShadow: '0 0 40px rgba(188, 19, 254, 0.2)' }}>
            <div style={{width: '80px', height: '80px', margin: '0 auto 20px auto'}}><ReactorLogo size="100%" /></div>
            <h2 style={{ color: '#bc13fe', margin: '20px 0', fontSize: '1.5rem' }}>LIMIT REACHED</h2>
            <p style={{ color: '#aaa', marginBottom: '30px', lineHeight: '1.6' }}>You have exhausted your free trial. Join the Council to unlock unlimited dialectics.</p>
            <button className="btn-nexus" style={{ width: '100%', borderColor: '#bc13fe', color: '#bc13fe' }} onClick={onUnlockClick}>SUBSCRIBE ($29/mo)</button>
            <button onClick={() => navigate('/')} style={{ display: 'block', margin: '20px auto 0', background: 'none', border: 'none', color: '#666', textDecoration:'underline', cursor:'pointer' }}>Return to Home</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SESSION & DASHBOARD (Unchanged for now) ---
function SessionView() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([{ role: 'system', content: 'Janus Forge Nexus initialized.' }]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const handleSend = async (e) => { e.preventDefault(); if (!input.trim()) return; const newMsgs = [...messages, { role: 'user', content: input }]; setMessages(newMsgs); setInput(''); setIsSending(true); try { const res = await sessionService.sendMessage(input, "standard", []); if (res.data && res.data.messages) { const aiMsgs = res.data.messages.map(m => ({ role: 'ai', content: m.content, model: m.model })); setMessages([...newMsgs, ...aiMsgs]); } } catch (err) { console.error(err); setMessages([...newMsgs, { role: 'system', content: 'Error: Nexus connection interrupted.' }]); } finally { setIsSending(false); } };
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}><button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#00f3ff', fontSize: '1.5rem', cursor: 'pointer' }}>←</button><h2 style={{ margin: 0 }}>Session: {sessionId}</h2></header>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', overflowY: 'auto' }}>{messages.map((msg, idx) => (<div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%', background: msg.role === 'user' ? '#00f3ff' : '#222', color: msg.role === 'user' ? 'black' : 'white', padding: '15px', borderRadius: '12px' }}>{msg.model && <strong style={{display:'block', marginBottom:'5px', fontSize:'0.8em', color:'#888'}}>{msg.model}</strong>}{msg.content}</div>))}</div>
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px' }}><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Address the Forge..." style={{ flex: 1, padding: '15px', borderRadius: '8px', background: '#222', border: '1px solid #444', color: 'white' }} disabled={isSending} /><button type="submit" className="btn-nexus" style={{ fontSize: '0.9rem', padding: '10px 30px' }} disabled={isSending}>SEND</button></form>
    </div>
  );
}

function Dashboard({ onLogout }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><ReactorLogo size="40px" /><span style={{ fontWeight: 'bold', letterSpacing: '1px' }}>NEXUS // COMMAND</span></div><div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}><span style={{ fontSize: '0.9rem', color: '#888' }}>{user?.email}</span><button onClick={onLogout} style={{ background: 'none', border: '1px solid #444', color: '#888', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>DISCONNECT</button></div></header>
      <main style={{ flex: 1, padding: '40px', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}><h2 style={{ fontSize: '2rem', marginBottom: '40px', color: '#fff' }}>SYSTEM STATUS: <span style={{ color: '#00f3ff' }}>OPTIMAL</span></h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>{['Gemini', 'DeepSeek', 'Grok', 'Claude'].map(ai => ( <div key={ai} className="glass-panel" style={{ padding: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}><span className="status-dot status-online"></span><span style={{ fontWeight: 'bold' }}>{ai}</span><span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#00f3ff' }}>READY</span></div> ))}</div><div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}><div className="glass-panel" style={{ padding: '40px', borderRadius: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '300px' }}><h3 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Initiate New Dialectic</h3><p style={{ color: '#aaa', marginBottom: '30px' }}>Create a new query for the Council to process.</p><button onClick={() => navigate(`/session/new-${Date.now()}`)} className="btn-nexus">INITIALIZE SESSION</button></div><div className="glass-panel" style={{ padding: '30px', borderRadius: '20px' }}><h3 style={{ marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Recent Logs</h3><ul style={{ listStyle: 'none', padding: 0, margin: 0 }}><li style={{ padding: '15px', background: '#222', borderRadius: '8px', marginBottom: '10px', cursor: 'pointer', borderLeft: '3px solid #00f3ff' }}><div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Synthetic Sentience</div></li></ul></div></div></main>
    </div>
  );
}

// --- ROUTER & MAIN APP ---
function RoutedAppContent() {
  const { user, login, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  
  // Auth Flow
  const handleLogin = async (email, password, isSignup, fullName) => {
    if (isSignup) {
      await api.post('/api/v1/auth/signup', { email, password, full_name: fullName });
    }
    await login(email, password);
    setShowAuth(false);
  };

  // Payment Flow (Triggered by "Unlock" or Limit Reached)
  const handleUnlock = async () => {
    if (!user) {
      setShowAuth(true); // Force login first
    } else {
      try {
        alert("Redirecting to Secure Payment Gateway...");
        const res = await sessionService.createCheckout('pro'); // Default to Pro
        if (res.data.url) window.location.href = res.data.url;
      } catch (e) {
        alert("Payment Error: " + e.message);
      }
    }
  };

  // If user is logged in, they see Dashboard
  // If not, they see Landing Page -> Playground
  // But the Playground also has an "Unlock" button that uses handleUnlock
  
  return (
    <>
      <GlobalStyles />
      <Routes>
        <Route path="/" element={
          user ? <Dashboard onLogout={logout} /> : <LandingPage onEnterNexus={() => setShowAuth(false) || window.location.replace('/playground')} />
        } />
        
        <Route path="/playground" element={
          <DemoPlayground onUnlockClick={handleUnlock} />
        } />
        
        <Route path="/dashboard" element={user ? <Dashboard onLogout={logout} /> : <LandingPage onEnterNexus={() => setShowAuth(true)} />} />
        <Route path="/session/:sessionId" element={user ? <SessionView /> : <LandingPage onEnterNexus={() => setShowAuth(true)} />} />
      </Routes>
      
      <AuthModal 
        isOpen={showAuth} 
        onClose={() => setShowAuth(false)} 
        onLogin={handleLogin} 
      />
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