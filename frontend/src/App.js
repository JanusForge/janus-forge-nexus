/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, useParams, useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import api, { sessionService } from './services/api';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';
import janusLogoVideo from './janus-logo.mp4'; 

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PK || 'pk_test_placeholder'); 

// --- DEMO DATA ---
const GOLDEN_RECORD = {
  title: "The Ethics of the Forge",
  messages: [
    { ai_name: "gemini", role: "assistant", content: "Session initiated. The name 'Janus Forge' immediately suggests a powerful intersection of creation and duality." },
    { ai_name: "deepseek", role: "assistant", content: "My position is that the Janus Forge is not a tool for navigating tension, but for leveraging it. The duality is the engine." }
  ]
};

// --- GLOBAL STYLES ---
const GlobalStyles = () => (
  <style>
    {`
    html, body, #root { background-color: #050505; color: #e0e0e0; font-family: 'Inter', sans-serif; margin: 0; min-height: 100vh; overflow-x: hidden; }
    .cyber-grid { position: fixed; top: 0; left: 0; width: 200vw; height: 200vh; background-image: linear-gradient(rgba(0, 243, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 243, 255, 0.03) 1px, transparent 1px); background-size: 50px 50px; transform: perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px); animation: grid-move 20s linear infinite; pointer-events: none; z-index: -1; }
    @keyframes grid-move { 0% { transform: perspective(500px) rotateX(60deg) translateY(0) translateZ(-200px); } 100% { transform: perspective(500px) rotateX(60deg) translateY(50px) translateZ(-200px); } }
    
    .hero-title { font-size: 4rem; font-weight: 900; letter-spacing: 8px; line-height: 1.1; background: linear-gradient(to bottom, #fff, #aaa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 30px rgba(0, 243, 255, 0.3); }
    .veteran-badge { color: #00f3ff; font-size: 0.9rem; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 15px; font-weight: bold; padding: 5px 15px; border: 1px solid rgba(0, 243, 255, 0.3); border-radius: 4px; display: inline-block; background: rgba(0, 243, 255, 0.05); }
    .glass-panel { background: rgba(10, 10, 10, 0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); transition: all 0.3s ease; }
    .chat-bubble { padding: 15px; border-radius: 12px; margin-bottom: 15px; max-width: 85%; line-height: 1.5; color: #ddd; }
    
    .btn-nexus { padding: 15px 50px; background: transparent; border: 2px solid #00f3ff; color: #00f3ff; font-size: 1.1rem; font-weight: 800; letter-spacing: 2px; cursor: pointer; transition: all 0.3s; text-transform: uppercase; position: relative; overflow: hidden; }
    .btn-nexus:hover { background: #00f3ff; color: #000; box-shadow: 0 0 30px #00f3ff; }
    .btn-nav { background: transparent; border: none; color: #aaa; font-size: 0.9rem; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; padding: 10px; transition: color 0.2s; text-decoration: none; }
    .btn-nav:hover { color: #fff; text-shadow: 0 0 10px rgba(255,255,255,0.5); }
    .btn-upgrade-sm { padding: 8px 15px; background: #bc13fe; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.8rem; margin-left: 15px; box-shadow: 0 0 10px rgba(188, 19, 254, 0.3); }
    .btn-pricing { width: 100%; padding: 15px; margin-top: 20px; font-weight: bold; cursor: pointer; border-radius: 8px; border:none; text-transform: uppercase; }
    
    .app-header { position: fixed; top: 0; left: 0; right: 0; height: 80px; padding: 0 40px; display: flex; justify-content: space-between; alignItems: center; background: rgba(0,0,0,0.9); z-index: 1000; border-bottom: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); }
    
    @media (max-width: 768px) { .hero-title { font-size: 2.5rem; letter-spacing: 4px; } .app-header { justify-content: center; padding: 10px; flex-wrap: wrap; } }
    `}
  </style>
);

// --- COMPONENTS ---
function ReactorLogo({ size = "150px" }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: '-5px', borderRadius: '50%', background: 'conic-gradient(from 0deg, #00f3ff 0deg 5deg, transparent 5deg 15deg, #00f3ff 15deg 20deg, transparent 20deg 30deg, #00f3ff 30deg 35deg, transparent 35deg 45deg, #00f3ff 45deg 50deg, transparent 50deg 60deg, #00f3ff 60deg 65deg, transparent 65deg 75deg, #00f3ff 75deg 80deg, transparent 80deg 90deg, #00f3ff 90deg 95deg, transparent 95deg 105deg, #00f3ff 105deg 110deg, transparent 110deg 120deg, #00f3ff 120deg 125deg, transparent 125deg 135deg, #00f3ff 135deg 140deg, transparent 140deg 150deg, #00f3ff 150deg 155deg, transparent 155deg 165deg, #00f3ff 165deg 170deg, transparent 170deg 180deg, #00f3ff 180deg 185deg, transparent 185deg 195deg, #00f3ff 195deg 200deg, transparent 200deg 210deg, #00f3ff 210deg 215deg, transparent 215deg 225deg, #00f3ff 225deg 230deg, transparent 230deg 240deg, #00f3ff 240deg 245deg, transparent 245deg 255deg, #00f3ff 255deg 260deg, transparent 260deg 270deg, #00f3ff 270deg 275deg, transparent 275deg 285deg, #00f3ff 285deg 290deg, transparent 290deg 300deg, #00f3ff 300deg 305deg, transparent 305deg 315deg, #00f3ff 315deg 320deg, transparent 320deg 330deg, #00f3ff 330deg 335deg, transparent 335deg 345deg, #00f3ff 345deg 350deg, transparent 350deg 360deg)', mask: 'radial-gradient(closest-side, transparent 80%, black 81%)', WebkitMask: 'radial-gradient(closest-side, transparent 80%, black 81%)', animation: 'spin-slow 40s linear infinite' }}></div>
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#000', padding: '10px', boxSizing: 'border-box' }}>
         <video src={janusLogoVideo} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
      </div>
    </div>
  );
}

// --- PRICING MODAL (Updated with Custom Tier) ---
function PricingModal({ isOpen, onClose }) {
    const handleSubscribe = async (tier) => {
        if (tier === 'custom') {
            window.location.href = "mailto:sales@janusforge.ai?subject=Inquiry regarding Sovereign Access Tier";
            return;
        }
        try {
            const res = await sessionService.createCheckout(tier);
            if (res.data.url) window.location.href = res.data.url;
            else alert("Payment Error: No URL");
        } catch (e) { alert("Payment System Error: " + e.message); }
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
            <div className="glass-panel" style={{ padding: '40px', borderRadius: '20px', width: '1100px', maxWidth: '95%', textAlign: 'center', border: '1px solid #00f3ff', position:'relative', margin:'20px 0' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '20px', background: 'none', border: 'none', color: '#666', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
                <h2 style={{ color: '#fff', marginBottom: '40px', fontSize:'2rem' }}>CHOOSE YOUR ACCESS LEVEL</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                    
                    {/* SCHOLAR */}
                    <div style={{ background: '#111', padding: '30px', borderRadius: '10px', border: '1px solid #00f3ff', display:'flex', flexDirection:'column' }}>
                        <h3 style={{ color: '#00f3ff', fontSize: '1.5rem', marginBottom: '10px' }}>SCHOLAR</h3>
                        <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '10px 0' }}>$29<span style={{fontSize:'1rem', color:'#aaa'}}>/mo</span></p>
                        <ul style={{textAlign:'left', color:'#ccc', marginBottom:'30px', lineHeight:'1.6', flex: 1, listStyle:'none', padding:0}}>
                            <li style={{marginBottom:'10px'}}>✓ Unlimited Live Dialectic</li>
                            <li style={{marginBottom:'10px'}}>✓ Daily Forge Archives</li>
                            <li style={{marginBottom:'10px'}}>✓ Priority Processing</li>
                        </ul>
                        <button onClick={() => handleSubscribe('pro')} className="btn-pricing" style={{ background: '#00f3ff', color: 'black' }}>SELECT SCHOLAR</button>
                    </div>

                    {/* VISIONARY */}
                    <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '10px', border: '1px solid #bc13fe', position:'relative', display:'flex', flexDirection:'column' }}>
                        <div style={{position:'absolute', top:'-12px', right:'20px', background:'#bc13fe', color:'white', padding:'5px 10px', fontSize:'0.8rem', fontWeight:'bold', borderRadius:'4px'}}>BEST VALUE</div>
                        <h3 style={{ color: '#bc13fe', fontSize: '1.5rem', marginBottom: '10px' }}>VISIONARY</h3>
                        <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '10px 0' }}>$99<span style={{fontSize:'1rem', color:'#aaa'}}>/mo</span></p>
                        <ul style={{textAlign:'left', color:'#ccc', marginBottom:'30px', lineHeight:'1.6', flex: 1, listStyle:'none', padding:0}}>
                            <li style={{marginBottom:'10px'}}>✓ Everything in Scholar</li>
                            <li style={{marginBottom:'10px'}}>✓ Full Council Access (Grok, Claude)</li>
                            <li style={{marginBottom:'10px'}}>✓ API Key Access</li>
                            <li style={{marginBottom:'10px'}}>✓ Early Feature Access</li>
                        </ul>
                        <button onClick={() => handleSubscribe('enterprise')} className="btn-pricing" style={{ background: '#bc13fe', color: 'white' }}>SELECT VISIONARY</button>
                    </div>

                    {/* SOVEREIGN (CUSTOM) */}
                    <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '10px', border: '1px solid #ffd700', position:'relative', display:'flex', flexDirection:'column' }}>
                         <div style={{position:'absolute', top:'-12px', right:'20px', background:'#ffd700', color:'black', padding:'5px 10px', fontSize:'0.8rem', fontWeight:'bold', borderRadius:'4px'}}>INSTITUTIONAL</div>
                        <h3 style={{ color: '#ffd700', fontSize: '1.5rem', marginBottom: '10px' }}>SOVEREIGN</h3>
                        <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '10px 0', color:'#fff' }}>CUSTOM</p>
                        <ul style={{textAlign:'left', color:'#ccc', marginBottom:'30px', lineHeight:'1.6', flex: 1, listStyle:'none', padding:0}}>
                            <li style={{marginBottom:'10px'}}>✓ Dedicated Infrastructure</li>
                            <li style={{marginBottom:'10px'}}>✓ Custom AI Model Tuning</li>
                            <li style={{marginBottom:'10px'}}>✓ Government / Research Compliance</li>
                            <li style={{marginBottom:'10px'}}>✓ SLA & 24/7 Support</li>
                        </ul>
                        <button onClick={() => handleSubscribe('custom')} className="btn-pricing" style={{ background: '#ffd700', color: 'black' }}>CONTACT SALES</button>
                    </div>

                </div>
            </div>
        </div>
    );
}

function Header({ user, onLogin, onLogout, onUpgrade }) {
    return (
        <header className="app-header">
            <div style={{ display: 'flex', alignItems: 'center' }}>
               <a href="/" style={{ textDecoration: 'none', color: 'white', fontSize: '1.5rem', letterSpacing: '2px', fontWeight: 'bold', opacity: 0.9 }}>JANUS FORGE NEXUS<sup style={{fontSize:'0.4em', verticalAlign:'top', marginLeft:'2px'}}>®</sup></a>
            </div>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <NavLink to="/" className="btn-nav">HOME</NavLink>
                <NavLink to="/demo" className="btn-nav">DEMO</NavLink>
                {user && (<><NavLink to="/dashboard" className="btn-nav">DASHBOARD</NavLink><NavLink to="/history" className="btn-nav">HISTORY</NavLink></>)}
                <button onClick={onUpgrade} className="btn-upgrade-sm">UNLOCK FULL ACCESS</button>
                {user ? <button onClick={onLogout} className="btn-nav" style={{color: '#ff4444'}}>LOGOUT</button> : <button onClick={onLogin} className="btn-nav" style={{color: '#00f3ff'}}>LOGIN</button>}
            </nav>
        </header>
    );
}

// --- LIVE CHAT ---
function LiveChatSection({ onUpgradeTrigger }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([{ model: 'THE COUNCIL', content: 'Welcome to the Live Dialectic. Query the Council to begin.' }]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const messagesEndRef = useRef(null);
  const isAdmin = user && (user.tier === 'visionary' || user.email.includes('admin'));
  const MSG_LIMIT = isAdmin ? 9999 : (user ? 20 : 5);
  const isLimitReached = msgCount >= MSG_LIMIT;

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (msgCount >= MSG_LIMIT) { onUpgradeTrigger(); return; }

    const userMsg = { role: 'user', content: input, model: user ? user.full_name : 'Guest' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);
    
    try {
      const res = await sessionService.sendMessage(input, "dialectic", []);
      if (res.data && res.data.messages) {
        const aiMsgs = res.data.messages.map(m => ({ role: 'ai', content: m.content, model: m.model || 'Council' }));
        setMessages(prev => [...prev, ...aiMsgs]);
        setMsgCount(prev => prev + 1);
      }
    } catch (err) { setMessages(prev => [...prev, { model: 'System', content: 'Connection Error.' }]); } finally { setIsSending(false); }
  };

  return (
    <div className="glass-panel" style={{ padding: '40px', borderRadius: '20px', position: 'relative', overflow: 'hidden', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '30px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ margin: 0, color: '#00f3ff', fontSize: '1.2rem', letterSpacing: '1px' }}>🔴 LIVE DIALECTIC</h3>
          {!isAdmin && !isLimitReached && <p style={{ fontSize: '0.9rem', color: '#aaa' }}>Remaining: <span style={{ color: '#00f3ff', fontWeight: 'bold' }}>{MSG_LIMIT - msgCount}</span></p>}
          {isLimitReached && <p style={{ fontSize: '0.9rem', color: '#bc13fe', fontWeight: 'bold' }}>SESSION LIMIT REACHED</p>}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '10px', marginBottom: '20px' }}>
        {messages.map((msg, idx) => (
            <div key={idx} className="chat-bubble" style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', background: msg.role === 'user' ? '#1a1a2e' : '#111', border: msg.role === 'user' ? '1px solid #bc13fe' : '1px solid #333', width: 'fit-content', maxWidth: '85%' }}>
                <strong style={{display:'block', marginBottom:'5px', fontSize:'0.75rem', color: msg.model === 'Gemini' ? '#00f3ff' : (msg.model === 'DeepSeek' ? '#ffaa00' : '#bc13fe'), textTransform:'uppercase', letterSpacing:'1px'}}>{msg.model}</strong>{msg.content}
            </div>
        ))}
        {isSending && <div style={{ color: '#666', fontStyle: 'italic', fontSize: '0.8rem', marginLeft: '10px' }}>Nexus processing...</div>}
        {isLimitReached && (
             <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(188, 19, 254, 0.1)', borderRadius: '10px', border: '1px solid #bc13fe', margin: '20px 0' }}>
                 <h4 style={{ color: '#bc13fe', margin: '0 0 10px 0' }}>SYSTEM PAUSED</h4>
                 <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '15px' }}>Free interaction limit reached. Subscribe to continue.</p>
                 <button onClick={() => onUpgradeTrigger()} className="btn-upgrade-sm" style={{ marginLeft: 0, width: '100%', maxWidth: '200px' }}>UNLOCK UNLIMITED ACCESS</button>
             </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {!isLimitReached && <form onSubmit={handleSend} style={{ position: 'relative', marginTop: 'auto' }}><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Query the Council..." style={{ width: '100%', padding: '20px 70px 20px 30px', borderRadius: '40px', background: '#0a0a0a', border: '1px solid #00f3ff', color: 'white', fontSize: '1.1rem', outline: 'none', boxSizing: 'border-box' }} disabled={isSending} /><button type="submit" style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#00f3ff', fontSize: '1.5rem', cursor: 'pointer' }}>➤</button></form>}
    </div>
  );
}

// --- AUTH MODAL (Unchanged) ---
function AuthModal({ isOpen, onClose, onLogin, requireUpgrade = false }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [isSignup, setIsSignup] = useState(false); const [fullName, setFullName] = useState(''); const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); try { await onLogin(email, password, isSignup, fullName); } catch (err) { alert("Auth Failed: " + err.message); } finally { setLoading(false); } };
  if (!isOpen) return null;
  return ( <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}> <div className="glass-panel" style={{ padding: '50px', borderRadius: '20px', width: '400px', textAlign: 'center', border: '1px solid #00f3ff' }}> <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '20px', background: 'none', border: 'none', color: '#666', fontSize: '2rem', cursor: 'pointer' }}>&times;</button> <ReactorLogo size="80px" /> <h2 style={{ color: '#00f3ff', margin: '20px 0' }}>{isSignup ? "INITIATE ACCESS" : "VERIFY IDENTITY"}</h2> <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}> {isSignup && <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ padding: '15px', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '6px' }} />} <input type="text" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '15px', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '6px' }} /> <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '15px', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '6px' }} /> <button type="submit" disabled={loading} className="btn-nexus" style={{ width: '100%' }}>{loading ? "PROCESSING..." : (isSignup ? "CREATE ACCOUNT" : "LOG IN")}</button> </form> <div style={{ marginTop: '20px', color: '#888' }}><button onClick={() => setIsSignup(!isSignup)} style={{ background: 'none', border: 'none', color: '#00f3ff', cursor: 'pointer', textDecoration:'underline' }}>{isSignup ? "Log In" : "Request Access"}</button></div> </div> </div> );
}

// --- PAGES (Landing, Dashboard, Demo, History, Archives unchanged from previous) ---
const Typewriter = ({ text, speed = 30 }) => { const [displayedText, setDisplayedText] = useState(''); useEffect(() => { let i = 0; const timer = setInterval(() => { setDisplayedText(text.substring(0, i + 1)); i++; if (i === text.length) clearInterval(timer); }, speed); return () => clearInterval(timer); }, [text, speed]); return <span>{displayedText}</span>; };
const Countdown = () => { const [timeLeft, setTimeLeft] = useState(""); useEffect(() => { const timer = setInterval(() => { const now = new Date(); const tomorrow = new Date(now); tomorrow.setUTCHours(6, 0, 0, 0); if (now > tomorrow) tomorrow.setDate(tomorrow.getDate() + 1); const diff = tomorrow - now; const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)); const seconds = Math.floor((diff % (1000 * 60)) / 1000); setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`); }, 1000); return () => clearInterval(timer); }, []); return <span style={{fontFamily:'monospace', color:'#00f3ff', fontWeight:'bold'}}>{timeLeft}</span>; };

function LandingPage({ onEnterNexus }) {
  const [daily, setDaily] = useState(null);
  useEffect(() => { sessionService.getLatestDaily().then(res => setDaily(res.data)).catch(console.error); }, []);
  return (
    <div style={{ paddingTop: '80px', paddingBottom: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <section style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', width: '100%', padding: '20px' }}>
          <div onClick={onEnterNexus} style={{ cursor: 'pointer', marginBottom: '30px' }}><div style={{ width: '350px', height: '350px' }}><ReactorLogo size="100%" /></div></div>
          <div className="veteran-badge">A Veteran Owned American Company</div>
          <h1 className="hero-title">JANUS FORGE NEXUS<sup style={{fontSize:'0.4em'}}>TM</sup></h1>
          <div className="hero-subtitle">Orchestrate the Intelligence</div>
          <button onClick={onEnterNexus} className="btn-nexus" style={{marginTop: '40px'}}>ENTER NEXUS</button>
        </section>
        <section style={{ width: '100%', maxWidth: '900px', padding: '0 20px', marginBottom: '60px' }}>
          <div className="glass-panel" style={{ padding: '40px', borderRadius: '20px' }}>
             <div style={{ borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '30px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
               <h3 style={{ margin: '0', color: '#00f3ff' }}>🔴 LIVE: THE DAILY FORGE</h3>
               <div style={{textAlign:'right'}}><span style={{ color:'#aaa', fontSize:'0.8rem', display:'block' }}>NEXT TRANSMISSION IN:</span><Countdown /></div>
             </div>
             <p style={{ fontSize: '0.9rem', color: '#aaa', fontStyle:'italic', lineHeight:'1.5', marginBottom:'30px' }}>Every 24 hours, our autonomous Scout Agent scans the global datasphere for emerging patterns. It presents the critical vector to The Council for an unscripted, real-time dialectic.</p>
             {daily ? (
               <>
                 <h2 style={{ textAlign: 'center', marginBottom: '30px', fontStyle:'italic' }}>"{daily.topic}"</h2>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                   {daily.messages.map((msg, idx) => (
                     <div key={idx} className="chat-bubble" style={{ alignSelf: idx % 2 === 0 ? 'flex-start' : 'flex-end', background: idx % 2 === 0 ? '#111' : '#1a1a2e', border: idx % 2 === 0 ? '1px solid #333' : '1px solid #bc13fe', width: '100%' }}>
                       <strong style={{ color: idx % 2 === 0 ? '#00f3ff' : '#bc13fe', display: 'block', marginBottom: '5px' }}>{msg.role}</strong><Typewriter text={msg.text} speed={20} />
                     </div>
                   ))}
                 </div>
               </>
             ) : <p>Loading...</p>}
          </div>
        </section>
        <section style={{ width: '100%', maxWidth: '900px', padding: '0 20px' }}>
            <LiveChatSection onUpgradeTrigger={onEnterNexus} />
        </section>
    </div>
  );
}

function DemoPage() { return <div style={{padding:'120px', textAlign:'center'}}><h2>DEMO</h2></div> }
function Dashboard() { return <div style={{padding:'150px', textAlign:'center'}}><h2>NEXUS DASHBOARD</h2><p>Welcome, Admin.</p></div> }
function HistoryPage() { return <div style={{padding:'150px', textAlign:'center'}}><h2>HISTORY</h2><p>Logs coming soon.</p></div> }
function DialecticPage() { return <div style={{padding:'150px', textAlign:'center'}}><h2>FULL DIALECTIC</h2><LiveChatSection onUpgradeTrigger={()=>{}} /></div> }
function ArchivesPage() { return <div style={{padding:'150px', textAlign:'center'}}><h2>DAILY FORGE ARCHIVES</h2><p>Previous transmissions loading...</p></div> }

// --- ROUTER ---
function RoutedAppContent() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [showPricing, setShowPricing] = useState(false); // New State for Pricing Modal
  
  const handleLoginSignup = async (email, password, isSignup, name) => {
    if (isSignup) await api.post('/api/v1/auth/signup', { email, password, full_name: name });
    const result = await login(email, password);
    if (result) { setShowAuth(false); navigate('/dashboard'); }
  };

  return (
    <div style={{display:'flex', flexDirection:'column', minHeight:'100vh'}}>
      <GlobalStyles />
      <div className="cyber-grid"></div>
      {/* Header now triggers Pricing Modal */}
      <Header onLogin={() => setShowAuth(true)} user={user} onLogout={logout} onUpgrade={() => setShowPricing(true)} />
      
      <div style={{flex:1}}>
        <Routes>
            <Route path="/" element={<LandingPage onEnterNexus={() => setShowAuth(true)} />} />
            <Route path="/dashboard" element={user ? <Dashboard /> : <LandingPage onEnterNexus={() => setShowAuth(true)} />} />
            <Route path="/history" element={user ? <HistoryPage /> : <LandingPage onEnterNexus={() => setShowAuth(true)} />} />
            <Route path="/dialectic" element={user ? <DialecticPage /> : <LandingPage onEnterNexus={() => setShowAuth(true)} />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/archives" element={<ArchivesPage />} />
        </Routes>
      </div>
      
      <footer style={{ borderTop: '1px solid #222', padding: '40px 20px', textAlign: 'center', fontSize: '0.75rem', color: '#555', background: '#020202' }}>
        <p style={{ marginBottom: '8px', fontWeight: 'bold', color: '#777' }}>&copy; 2025 Janus Forge Accelerators, LLC.</p>
        <p style={{ marginBottom: '20px' }}>Janus Forge Nexus™ is a property of Janus Forge Accelerators, LLC, a Kentucky Limited Liability Company.</p>
      </footer>
      
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onLogin={handleLoginSignup} />
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
    </div>
  );
}

function App() { return <AuthProvider><Router><RoutedAppContent /></Router></AuthProvider>; }
export default App;