import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, useParams } from 'react-router-dom';
import './App.css';

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

// --- COMPONENTS ---
function AuthModal({ isOpen, onClose, onLogin, onSignup, onViewDemo, isLoading, error }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    isLoginMode ? onLogin(formData.email, formData.password) : onSignup(formData.email, formData.password, formData.name);
  };

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd' };
  const btnStyle = { width: '100%', padding: '12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: isLoading ? 'not-allowed' : 'pointer' };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '400px', width: '90%' }}>
        <h2 style={{ textAlign: 'center', color: '#333' }}>{isLoginMode ? 'Welcome Back' : 'Join Janus Forge'}</h2>
        {error && <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          {!isLoginMode && <input type="text" placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} required />}
          <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={inputStyle} required />
          <input type="password" placeholder="Password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} style={{ ...inputStyle, marginBottom: '20px' }} required />
          <button type="submit" disabled={isLoading} style={btnStyle}>{isLoading ? 'Processing...' : (isLoginMode ? 'Sign In' : 'Create Account')}</button>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
          <button onClick={onViewDemo} style={{ width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>👁️ View Live Demo Session</button>
          <p style={{ textAlign: 'center', fontSize: '14px', cursor: 'pointer', color: 'blue', margin: 0 }} onClick={() => setIsLoginMode(!isLoginMode)}>{isLoginMode ? "Need an account? Sign up" : "Have an account? Sign in"}</p>
        </div>
        {user && <button onClick={onClose} style={{ marginTop: '10px', width: '100%', padding: '8px' }}>Close</button>}
      </div>
    </div>
  );
}

function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  
  useEffect(() => {
    sessionService.getHistory().then(res => setSessions(res.data)).catch(err => console.error(err));
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🏛️ Conversation History</h2>
      {sessions.length === 0 ? <p>No sessions found.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sessions.map(s => (
            <div key={s.session_id} style={{ padding: '15px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #ddd', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => window.location.href = `/session/${s.session_id}`}>
              <div><div style={{ fontWeight: 'bold', color: '#333' }}>{s.snippet}</div><div style={{ fontSize: '12px', color: '#888' }}>{new Date(s.created_at).toLocaleString()} • {s.message_count} messages</div></div><span style={{ fontSize: '20px' }}>➡️</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DailyJanusCard() {
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    sessionService.getLatestDaily().then(res => {
      setDaily(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleForge = async () => {
    setGenerating(true);
    try {
      const res = await sessionService.generateDaily();
      setDaily(res.data);
    } catch (e) {
      console.error(e);
      alert("Failed to forge daily edition.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div style={{ padding: '15px', textAlign: 'center', color: '#666' }}>Loading Daily Janus...</div>;
  const isToday = daily && daily.date === new Date().toISOString().split('T')[0];

  const getStageLabel = (idx) => {
    if (idx === 0) return "🏛️ THESIS (The Proposition)";
    if (idx === 1) return "⚔️ ANTITHESIS (The Challenge)";
    if (idx === 2) return "🔗 SYNTHESIS (The Resolution)";
    return "DISCUSSION";
  };

  const getStageColor = (idx) => {
    if (idx === 0) return "#e3f2fd"; 
    if (idx === 1) return "#ffebee"; 
    if (idx === 2) return "#e8f5e9"; 
    return "white";
  };

  return (
    <div style={{ marginBottom: '30px', padding: '30px', backgroundColor: '#f8f9fa', borderRadius: '16px', border: '1px solid #e9ecef', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#1565c0', fontWeight: '800' }}>
            📰 The Daily Janus {daily ? `• ${daily.date}` : ''}
          </span>
          <h2 style={{ margin: '10px 0 15px 0', color: '#2c3e50', fontSize: '28px' }}>
            {daily ? daily.topic : 'Awaiting Today\'s Topic'}
          </h2>
          <p style={{ margin: '0', color: '#555', lineHeight: '1.6', maxWidth: '700px', fontSize: '16px' }}>
            Every 24 hours, <strong>The Council</strong> (an autonomous assembly of AI models) selects a provocative topic, argues the <strong>Thesis</strong> vs. <strong>Antithesis</strong>, and forges a <strong>Synthesis</strong>.
            <span style={{ display: 'inline-block', color: '#e67e22', fontWeight: 'bold', marginLeft: '6px', cursor: 'pointer' }}>
               Upgrade to Pro to expand the Council →
            </span>
          </p>
        </div>
        {!isToday && (
          <button onClick={handleForge} disabled={generating} style={{ padding: '14px 28px', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '16px', boxShadow: '0 4px 6px rgba(25, 118, 210, 0.2)' }}>
            {generating ? 'Forging Debate...' : '🔨 Forge Today\'s Edition'}
          </button>
        )}
      </div>
      
      {daily ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {daily.messages.map((msg, idx) => {
            const labelStyle = { fontSize: '11px', fontWeight: 'bold', color: '#555', marginBottom: '6px', display: 'block', marginLeft: '5px', letterSpacing: '0.5px' };
            const bubbleStyle = {
              padding: '20px', 
              backgroundColor: 'white', 
              borderRadius: '12px', 
              borderLeft: `5px solid ${AI_MODELS[msg.ai_name]?.color || '#ccc'}`,
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              background: `linear-gradient(to right, ${getStageColor(idx)}, white 20%)`
            };

            return (
              <div key={idx} style={{ position: 'relative' }}>
                <span style={labelStyle}>{getStageLabel(idx)}</span>
                <div style={bubbleStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{AI_MODELS[msg.ai_name]?.icon}</span>
                    <strong style={{ fontSize: '16px', color: AI_MODELS[msg.ai_name]?.color }}>{AI_MODELS[msg.ai_name]?.name}</strong>
                  </div>
                  <div style={{ fontSize: '16px', lineHeight: '1.6', color: '#2c3e50' }}>{msg.content}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '50px', color: '#666', backgroundColor: 'white', borderRadius: '12px', border: '2px dashed #dde' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔨</div>
          <p style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '500' }}>No debate recorded for today.</p>
          <p style={{ fontSize: '15px', color: '#888' }}>Be the first to spark the Council's autonomous engine.</p>
        </div>
      )}
    </div>
  );
}

function PromptInput({ onSend, sessionId, isSending, usage, canSendMessage, onUpgradePrompt, user, participants = [] }) {
  const [localPrompt, setLocalPrompt] = useState('');
  const inputRef = useRef(null);
  
  const handleSubmit = () => {
    if (localPrompt.trim() && sessionId && !isSending) {
      if (!canSendMessage) return onUpgradePrompt();
      onSend(localPrompt.trim());
      setLocalPrompt('');
    }
  };

  const councilNames = participants.map(p => AI_MODELS[p]?.name).join(', ');
  const placeholderText = canSendMessage ? `Ask the Council (${councilNames})...` : "Limit reached.";
  const textAreaStyle = { width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' };
  const btnStyle = { marginTop: '10px', padding: '10px 20px', backgroundColor: TIERS[usage.currentTier].color, color: 'white', border: 'none', borderRadius: '6px', width: '100%', cursor: 'pointer' };

  return (
    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '10px' }}>
        <span>{user?.name || 'User'} • Messages: {usage.messagesSent}/{TIERS[usage.currentTier].messageLimit}</span>
      </div>
      <textarea ref={inputRef} value={localPrompt} onChange={(e) => setLocalPrompt(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} disabled={isSending || !canSendMessage} placeholder={placeholderText} style={textAreaStyle} />
      <button onClick={handleSubmit} disabled={!localPrompt.trim() || isSending} style={btnStyle}>{isSending ? 'Synthesizing...' : 'Send to Council'}</button>
    </div>
  );
}

function DemoViewer({ onExit }) {
  const messages = GOLDEN_RECORD.messages;
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeeba', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h2 style={{ margin: '0 0 5px 0', color: '#856404' }}>🏛️ Hall of Records: Demo Session</h2><p style={{ margin: 0, color: '#856404' }}>{GOLDEN_RECORD.title}</p></div>
        <button onClick={onExit} style={{ padding: '8px 16px', backgroundColor: '#856404', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Exit Demo & Sign Up</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingBottom: '50px' }}>
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const aiConfig = !isUser && msg.ai_name ? AI_MODELS[msg.ai_name] : null;
          const bubbleStyle = {
            alignSelf: isUser ? 'flex-end' : 'flex-start',
            backgroundColor: isUser ? '#007bff' : (aiConfig?.color ? `${aiConfig.color}15` : 'white'),
            color: isUser ? 'white' : '#333',
            borderLeft: !isUser && aiConfig ? `4px solid ${aiConfig.color}` : 'none',
            padding: '15px',
            borderRadius: '12px',
            maxWidth: '80%',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          };

          return (
            <div key={idx} style={bubbleStyle}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>{aiConfig ? <span>{aiConfig.icon} {aiConfig.name}</span> : '👤 You'}</strong>
              <div style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>{msg.content}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Dashboard({ onUpgradePrompt }) {
  const { sessionId: urlSessionId } = useParams();
  const [status, setStatus] = useState('');
  const [sessionId, setSessionId] = useState(urlSessionId || '');
  const [messages, setMessages] = useState([]);
  const { user } = useAuth();
  const { usage, incrementUsage, canCreateSession, canSendMessage } = useUsageTracker(user);
  const participants = TIERS[usage.currentTier].aiModels; 

  useEffect(() => {
      if (urlSessionId) {
          setStatus('Loading session...');
          sessionService.getSession(urlSessionId).then(res => {
              setMessages(res.data.responses);
              setStatus('Archive loaded.');
          }).catch(err => setStatus('Failed to load session.'));
      }
  }, [urlSessionId]);

  const councilDisplay = participants.map(p => AI_MODELS[p]?.name).join(' & ');

  const handleNewSession = async () => {
    if (!canCreateSession()) return onUpgradePrompt();
    setStatus('Initializing Council...');
    const newId = `sess_${Date.now()}`;
    try {
      const response = await sessionService.broadcast({ session_id: newId, ai_participants: participants, moderator_prompt: "Session Initialized." });
      setSessionId(newId);
      setMessages(response.data.responses || []);
      incrementUsage('sessionsCreated');
      setStatus('Ready.');
    } catch { setStatus('Failed.'); }
  };

  const handleSend = async (text) => {
    setStatus('The Council is deliberating...');
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    try {
      const response = await sessionService.broadcast({ session_id: sessionId, ai_participants: participants, moderator_prompt: text });
      setMessages(prev => [...prev, ...response.data.responses]);
      incrementUsage('messagesSent', response.data.responses.length);
      setStatus('Synthesis complete.');
    } catch { setStatus('Error.'); }
  };
  
  const handleExport = () => {
      const content = messages.map(m => `[${m.role === 'user' ? 'You' : m.ai_name}]: ${m.content}`).join('\n\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `janus-session-${sessionId}.txt`;
      a.click();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {!urlSessionId && <DailyJanusCard />}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 5px 0' }}>Janus Forge Dashboard</h2>
        <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px' }}>
          <strong>Council in Session:</strong> {councilDisplay}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
             <span style={{ padding: '5px 10px', backgroundColor: TIERS[usage.currentTier].color, color: 'white', borderRadius: '4px' }}>{TIERS[usage.currentTier].name} Tier</span>
             {!sessionId && <button onClick={handleNewSession} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Start New Debate</button>}
          </div>
          {sessionId && <button onClick={handleExport} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>📥 Save Transcript</button>}
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const aiConfig = !isUser && msg.ai_name ? AI_MODELS[msg.ai_name] : null;
          const bubbleStyle = {
            alignSelf: isUser ? 'flex-end' : 'flex-start',
            backgroundColor: isUser ? '#007bff' : (aiConfig?.color ? `${aiConfig.color}15` : 'white'),
            color: isUser ? 'white' : '#333',
            borderLeft: !isUser && aiConfig ? `4px solid ${aiConfig.color}` : 'none',
            padding: '15px',
            borderRadius: '12px',
            maxWidth: '80%',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          };
          
          return (
            <div key={idx} style={bubbleStyle}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>{aiConfig ? <span>{aiConfig.icon} {aiConfig.name}</span> : (msg.ai_name || 'You')}</strong>
              <div style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>{msg.content}</div>
            </div>
          );
        })}
      </div>
      {sessionId && <PromptInput onSend={handleSend} sessionId={sessionId} isSending={status.includes('...')} usage={usage} canSendMessage={canSendMessage()} onUpgradePrompt={onUpgradePrompt} user={user} participants={participants} />}
      <div style={{ textAlign: 'center', marginTop: '10px', color: '#666' }}>{status}</div>
    </div>
  );
}

function Header({ user, logout }) {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', backgroundColor: 'white', borderBottom: '1px solid #ddd' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><h1 style={{ margin: 0, fontSize: '20px', color: '#333' }}>Janus Forge Nexus</h1></div>
      <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <NavLink to="/" style={({isActive}) => ({ textDecoration: 'none', color: isActive ? '#007bff' : '#666', fontWeight: '600' })}>Dashboard</NavLink>
        <NavLink to="/history" style={({isActive}) => ({ textDecoration: 'none', color: isActive ? '#007bff' : '#666', fontWeight: '600' })}>History</NavLink>
        {user && <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '14px', color: '#333' }}>👋 {user.name || user.email}</span><button onClick={logout} style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Logout</button></div>}
      </nav>
    </header>
  );
}

function AppContent() {
  const { user, login, signup, logout, authError, isLoading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [viewingDemo, setViewingDemo] = useState(false);

  useEffect(() => { if (!user && !isLoading && !viewingDemo) setShowAuth(true); }, [user, isLoading, viewingDemo]);
  const handleUpgradePrompt = () => alert("Upgrade coming soon via Stripe!");
  const handleViewDemo = () => { setShowAuth(false); setViewingDemo(true); };

  if (viewingDemo) return <div className="App" style={{ backgroundColor: '#f4f6f8', minHeight: '100vh' }}><DemoViewer onExit={() => setViewingDemo(false)} /></div>;

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
            <Route path="/session/:sessionId" element={<Dashboard onUpgradePrompt={handleUpgradePrompt} />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default function App() { return <AuthProvider><AppContent /></AuthProvider>; }
