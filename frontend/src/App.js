/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import api, { sessionService } from './services/api';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';
import janusLogoVideo from './janus-logo.mp4'; 

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PK || 'pk_test_placeholder'); 

const GlobalStyles = () => (
  <style>
    {`
    html, body, #root { background-color: #050505; color: #e0e0e0; font-family: 'Inter', sans-serif; margin: 0; min-height: 100vh; overflow-x: hidden; }
    .cyber-grid { position: fixed; top: 0; left: 0; width: 200vw; height: 200vh; background-image: linear-gradient(rgba(0, 243, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 243, 255, 0.03) 1px, transparent 1px); background-size: 50px 50px; transform: perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px); animation: grid-move 20s linear infinite; pointer-events: none; z-index: -1; }
    @keyframes grid-move { 0% { transform: perspective(500px) rotateX(60deg) translateY(0) translateZ(-200px); } 100% { transform: perspective(500px) rotateX(60deg) translateY(50px) translateZ(-200px); } }
    @keyframes fade-in-up { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
    
    .hero-title { font-size: 4rem; font-weight: 900; letter-spacing: 8px; line-height: 1.1; background: linear-gradient(to bottom, #fff, #aaa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 30px rgba(0, 243, 255, 0.3); }
    .hero-subtitle { font-size: 1.2rem; color: #00f3ff; letter-spacing: 4px; text-transform: uppercase; margin-top: 15px; opacity: 0.9; text-shadow: 0 0 10px rgba(0, 243, 255, 0.5); }
    .veteran-badge { color: #00f3ff; font-size: 0.9rem; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 15px; font-weight: bold; padding: 5px 15px; border: 1px solid rgba(0, 243, 255, 0.3); border-radius: 4px; display: inline-block; background: rgba(0, 243, 255, 0.05); }
    .glass-panel { background: rgba(10, 10, 10, 0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); transition: all 0.3s ease; }
    .chat-bubble { padding: 15px; border-radius: 12px; margin-bottom: 15px; max-width: 85%; line-height: 1.5; color: #ddd; }
    .btn-nexus { padding: 15px 50px; background: transparent; border: 2px solid #00f3ff; color: #00f3ff; font-size: 1.1rem; font-weight: 800; letter-spacing: 2px; cursor: pointer; transition: all 0.3s; text-transform: uppercase; position: relative; overflow: hidden; }
    .btn-nexus:hover { background: #00f3ff; color: #000; box-shadow: 0 0 30px #00f3ff; }
    .btn-nav { background: transparent; border: none; color: #aaa; font-size: 0.9rem; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; padding: 10px; transition: color 0.2s; text-decoration: none; }
    .btn-nav:hover { color: #fff; text-shadow: 0 0 10px rgba(255,255,255,0.5); }
    .btn-nav.active { color: #00f3ff; border-bottom: 1px solid #00f3ff; }
    .btn-upgrade-sm { padding: 8px 15px; background: #bc13fe; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.8rem; margin-left: 15px; box-shadow: 0 0 10px rgba(188, 19, 254, 0.3); }
    .app-header { position: fixed; top: 0; left: 0; right: 0; height: 70px; padding: 0 40px; display: flex; justify-content: flex-end; alignItems: center; background: rgba(0,0,0,0.9); z-index: 1000; border-bottom: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); }
    @media (max-width: 768px) { .hero-title { font-size: 2.5rem; letter-spacing: 4px; } .app-header { justify-content: center; padding: 10px; } }
    `}
  </style>
);

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

function Header({ user, onLogin, onLogout }) {
    const handleUpgrade = async () => {
        alert("Contacting Payment Gateway...");
        try {
            const res = await sessionService.createCheckout('pro');
            if (res.data.url) window.location.href = res.data.url;
        } catch (e) { alert("Payment System Busy: " + e.message); }
    };

    return (
        <header className="app-header">
            <div style={{ flex: 1 }}></div>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <NavLink to="/" className={({ isActive }) => isActive ? "btn-nav active" : "btn-nav"}>HOME</NavLink>
                {user && (
                    <>
                        <NavLink to="/dialectic" className={({ isActive }) => isActive ? "btn-nav active" : "btn-nav"}>DIALECTIC</NavLink>
                        <NavLink to="/dashboard" className={({ isActive }) => isActive ? "btn-nav active" : "btn-nav"}>DASHBOARD</NavLink>
                        <NavLink to="/history" className={({ isActive }) => isActive ? "btn-nav active" : "btn-nav"}>HISTORY</NavLink>
                    </>
                )}
                <button onClick={handleUpgrade} className="btn-upgrade-sm">UNLOCK FULL ACCESS</button>
                {user ? <button onClick={onLogout} className="btn-nav" style={{color: '#ff4444'}}>LOGOUT</button> : <button onClick={onLogin} className="btn-nav" style={{color: '#00f3ff'}}>LOGIN</button>}
            </nav>
        </header>
    );
}

function LiveChatSection({ onUpgradeTrigger }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([{ model: 'THE COUNCIL', content: 'Welcome to the Live Dialectic. Query the Council to begin.' }]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const messagesEndRef = useRef(null);

  const isAdmin = user && (user.tier === 'visionary' || user.email.includes('admin'));
  const MSG_LIMIT = isAdmin ? 9999 : (user ? 20 : 5);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (msgCount >= MSG_LIMIT) { onUpgradeTrigger(true); return; }

    const userMsg = { role: 'user', content: input, model: user ? user.full_name : 'Guest' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);
    
    try {
      const res = await sessionService.sendMessage(input, "dialectic", []);
      const aiMsgs = res.data.messages.map(m => ({ role: 'ai', content: m.content, model: m.model }));
      setMessages(prev => [...prev, ...aiMsgs]);
      setMsgCount(prev => prev + 1);
    } catch (err) { 
      setMessages(prev => [...prev, { model: 'System', content: 'Connection Error. Please try again.' }]); 
    } finally { setIsSending(false); }
  };

  return (
    <div className="glass-panel" style={{ padding: '40px', borderRadius: '20px', position: 'relative', overflow: 'hidden', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '30px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ margin: 0, color: '#00f3ff', fontSize: '1.2rem', letterSpacing: '1px' }}>🔴 LIVE DIALECTIC</h3>
          {!isAdmin && <p style={{ fontSize: '0.9rem', color: '#aaa' }}>Remaining: <span style={{ color: msgCount >= MSG_LIMIT ? 'red' : '#00f3ff' }}>{MSG_LIMIT - msgCount}</span></p>}
          {isAdmin && <p style={{ fontSize: '0.9rem', color: '#bc13fe' }}>ADMIN ACCESS GRANTED</p>}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '10px', marginBottom: '20px' }}>
        {messages.map((msg, idx) => (
            <div key={idx} className="chat-bubble" style={{ 
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', 
              background: msg.role === 'user' ? '#1a1a2e' : (msg.model === 'Gemini' ? '#111' : '#0a0a0a'), 
              border: msg.role === 'user' ? '1px solid #bc13fe' : (msg.model === 'Gemini' ? '1px solid #00f3ff' : '1px solid #ffaa00'),
              width: 'fit-content', maxWidth: '85%' 
            }}>
                <strong style={{display:'block', marginBottom:'5px', fontSize:'0.75rem', color: msg.model === 'Gemini' ? '#00f3ff' : (msg.model === 'DeepSeek' ? '#ffaa00' : '#bc13fe'), textTransform:'uppercase', letterSpacing:'1px'}}>{msg.model}</strong>
                {msg.content}
            </div>
        ))}
        {isSending && <div style={{ color: '#666', fontStyle: 'italic', fontSize: '0.8rem', marginLeft: '10px' }}>Nexus processing...</div>}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} style={{ position: 'relative', marginTop: 'auto' }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Query the Council..." style={{ width: '100%', padding: '20px 70px 20px 30px', borderRadius: '40px', background: '#0a0a0a', border: '1px solid #00f3ff', color: 'white', fontSize: '1.1rem', outline: 'none', boxSizing: 'border-box' }} disabled={isSending} />
        <button type="submit" style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#00f3ff', fontSize: '1.5rem', cursor: 'pointer' }}>➤</button>
      </form>
    </div>
  );
}

function AuthModal({ isOpen, onClose, onLogin, requireUpgrade = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await onLogin(email, password, isSignup, fullName); } catch (err) { alert("Auth Failed: " + err.message); } finally { setLoading(false); }
  };

  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fade-in-up 0.3s ease-out' }}>
      <div className="glass-panel" style={{ padding: '50px', borderRadius: '20px', width: '400px', textAlign: 'center', border: '1px solid #00f3ff' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '20px', background: 'none', border: 'none', color: '#666', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
        <ReactorLogo size="80px" />
        {requireUpgrade ? <h2 style={{ color: '#bc13fe', margin: '20px 0' }}>LIMIT REACHED</h2> : <h2 style={{ color: '#00f3ff', margin: '20px 0' }}>{isSignup ? "INITIATE ACCESS" : "VERIFY IDENTITY"}</h2>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isSignup && <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ padding: '15px', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '6px' }} />}
          <input type="text" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '15px', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '6px' }} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '15px', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '6px' }} />
          <button type="submit" disabled={loading} className="btn-nexus" style={{ width: '100%' }}>{loading ? "PROCESSING..." : (isSignup ? "CREATE ACCOUNT" : "LOG IN")}</button>
        </form>
        <div style={{ marginTop: '20px', color: '#888' }}><button onClick={() => setIsSignup(!isSignup)} style={{ background: 'none', border: 'none', color: '#00f3ff', cursor: 'pointer', textDecoration:'underline' }}>{isSignup ? "Log In" : "Request Access"}</button></div>
      </div>
    </div>
  );
}

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
             <h3 style={{ margin: '0 0 20px 0', color: '#00f3ff' }}>🔴 THE DAILY FORGE</h3>
             {daily ? (
               <>
                 <h2 style={{ textAlign: 'center', marginBottom: '30px', fontStyle:'italic' }}>"{daily.topic}"</h2>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                   {daily.messages.map((msg, idx) => (
                     <div key={idx} className="chat-bubble" style={{ alignSelf: idx % 2 === 0 ? 'flex-start' : 'flex-end', background: idx % 2 === 0 ? '#111' : '#1a1a2e', border: idx % 2 === 0 ? '1px solid #333' : '1px solid #bc13fe', width: '100%' }}>
                       <strong style={{ color: idx % 2 === 0 ? '#00f3ff' : '#bc13fe', display: 'block', marginBottom: '5px' }}>{msg.role}</strong>{msg.text}
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

function Dashboard() { return <div style={{padding:'100px', textAlign:'center'}}><h2>DASHBOARD</h2><p>Welcome, Admin.</p></div> }
function HistoryPage() { return <div style={{padding:'100px', textAlign:'center'}}><h2>HISTORY</h2><p>Logs coming soon.</p></div> }
function DialecticPage() { return <div style={{padding:'100px', textAlign:'center'}}><h2>FULL DIALECTIC</h2><LiveChatSection onUpgradeTrigger={()=>{}} /></div> }
function DemoPage() { return <div style={{padding:'100px', textAlign:'center'}}><h2>DEMO</h2><p>Video here.</p></div> }

function RoutedAppContent() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  
  const handleLoginSignup = async (email, password, isSignup, name) => {
    if (isSignup) await api.post('/api/v1/auth/signup', { email, password, full_name: name });
    const result = await login(email, password);
    if (result) { setShowAuth(false); navigate('/dashboard'); }
  };

  return (
    <>
      <GlobalStyles />
      <div className="cyber-grid"></div>
      <Header onLogin={() => setShowAuth(true)} user={user} onLogout={logout} />
      <Routes>
        <Route path="/" element={<LandingPage onEnterNexus={() => setShowAuth(true)} />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <LandingPage onEnterNexus={() => setShowAuth(true)} />} />
        <Route path="/history" element={user ? <HistoryPage /> : <LandingPage onEnterNexus={() => setShowAuth(true)} />} />
        <Route path="/dialectic" element={user ? <DialecticPage /> : <LandingPage onEnterNexus={() => setShowAuth(true)} />} />
        <Route path="/demo" element={<DemoPage />} />
      </Routes>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onLogin={handleLoginSignup} />
    </>
  );
}

function App() { return <AuthProvider><Router><RoutedAppContent /></Router></AuthProvider>; }
export default App;