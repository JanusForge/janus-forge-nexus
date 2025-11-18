import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// --- CONFIGURATION ---
const API_BASE_URL = "https://janus-forge-nexus.onrender.com/api/v1";
const hubClient = axios.create({
  baseURL: API_BASE_URL,
});

// --- PROMPT INPUT COMPONENT ---
function PromptInput({ onSend, sessionId, isSending = false }) {
  const [localPrompt, setLocalPrompt] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = () => {
    const trimmedPrompt = localPrompt.trim();
    if (trimmedPrompt && sessionId && !isSending) {
      onSend(trimmedPrompt);
      setLocalPrompt('');
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, [sessionId]);

  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      alignItems: 'flex-start',
      marginBottom: '10px',
      position: 'relative',
      width: '100%'
    }}>
      <textarea
        ref={inputRef}
        value={localPrompt}
        onChange={(e) => setLocalPrompt(e.target.value)}
        placeholder={sessionId ? "Broadcast to AI ensemble..." : "Create a session first..."}
        disabled={!sessionId || isSending}
        style={{
          flex: 1,
          padding: '12px 16px',
          border: `2px solid ${sessionId ? '#007bff' : '#6c757d'}`,
          borderRadius: '8px',
          fontSize: '16px',
          outline: 'none',
          minHeight: '150px',
          maxHeight: '400px',
          width: '100%',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease',
          opacity: sessionId ? 1 : 0.7,
          resize: 'vertical',
          fontFamily: 'inherit',
          lineHeight: '1.4'
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.ctrlKey) {
            handleSubmit();
            e.preventDefault();
          }
        }}
      />

      <button
        onClick={handleSubmit}
        disabled={!sessionId || !localPrompt.trim() || isSending}
        style={{
          padding: '12px 24px',
          backgroundColor: sessionId && localPrompt.trim() && !isSending ? '#28a745' : '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: sessionId && localPrompt.trim() && !isSending ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          minWidth: '140px',
          opacity: sessionId && localPrompt.trim() && !isSending ? 1 : 0.6,
          alignSelf: 'flex-start',
          marginTop: '12px'
        }}
      >
        {isSending ? '🔄 Broadcasting...' : '🚀 Send to AI'}
      </button>
    </div>
  );
}

// --- DASHBOARD COMPONENT ---
function Dashboard({ sessionIdFromUrl }) {
  const [status, setStatus] = useState('');
  const [sessionId, setSessionId] = useState(sessionIdFromUrl || '');
  const [sessionHistory, setSessionHistory] = useState([]);
  const [participants, setParticipants] = useState(['grok', 'gemini', 'deepseek']);
  const [prompt, setPrompt] = useState('');

  // Temporary backend diagnostic
  useEffect(() => {
    console.log('🔍 Testing backend connectivity...');

    hubClient.get('/sessions')
      .then(response => {
        console.log('✅ /sessions endpoint working:', response.data);
      })
      .catch(error => {
        console.log('❌ /sessions endpoint failed:', error.response?.status);
      });

    const testSessionId = 'test-' + Date.now();
    hubClient.post('/broadcast', {
      session_id: testSessionId,
      ai_participants: ['gemini'],
      initial_prompt: "Test connection"
    })
    .then(response => {
      console.log('✅ /broadcast endpoint working:', response.data);
    })
    .catch(error => {
      console.log('❌ /broadcast endpoint failed:', error.response?.data);
    });
  }, []);

  const getLastResponse = (aiName) => {
    if (!sessionHistory || sessionHistory.length === 0) {
      return { content: '🔄 Forge warming—awaiting first cycle.', key_takeaways: [] };
    }

    const currentSession = sessionHistory[sessionHistory.length - 1];
    if (!currentSession || !currentSession.messages) {
      return { content: '❌ No messages in session', key_takeaways: [] };
    }

    const aiMessages = currentSession.messages
      .filter(msg => msg.role === 'ai' && msg.ai_name === aiName)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const latestResponse = aiMessages[0];
    if (!latestResponse) {
      return {
        content: `❌ No ${aiName} response found in current session`,
        key_takeaways: []
      };
    }

    const cleanContent = latestResponse.content.replace(/^(|GROK:|GEMINI:|DEEPSEEK:)\s*/, '');
    return {
      content: cleanContent,
      key_takeaways: latestResponse.key_takeaways || []
    };
  };

  const handleNewSession = () => {
    setStatus('Creating new session...');
    const newSessionId = `session-${Date.now()}`;

    hubClient.post('/broadcast', {
      session_id: newSessionId,
      ai_participants: participants,
      initial_prompt: "Session initialized - ready for prompts!"
    })
    .then(response => {
      setSessionId(newSessionId);
      setStatus('New session created! Ready for prompts.');
      setSessionHistory([{
        session_id: newSessionId,
        messages: response.data.responses || []
      }]);
    })
    .catch(error => {
      console.error('Session creation failed:', error);
      setStatus('Failed to create session');
    });
  };

  const handleSendPrompt = (promptText) => {
    if (!promptText.trim() || !sessionId) return;

    setStatus('Sending to AI ensemble...');

    hubClient.post('/broadcast', {
      session_id: sessionId,
      ai_participants: participants,
      moderator_prompt: promptText
    })
    .then(response => {
      const broadcastData = response.data;
      console.log('✅ BROADCAST RESPONSE:', broadcastData);

      if (broadcastData.responses) {
        broadcastData.responses.forEach((response, index) => {
          console.log(`AI ${index + 1}:`, response.ai_name, '-', response.content.substring(0, 100));
        });
      }

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

      setStatus(`AI synthesis complete! ${broadcastData.responses.length} responses received`);
    })
    .catch(error => {
      console.error('❌ BROADCAST FAILED:', error);
      console.error('❌ Error response:', error.response?.data);
      setStatus('Broadcast failed - check console');
    });
  };

  // Ethical check for prompts
  const ethicalCheck = (prompt) => {
    const harmfulPatterns = [
      /harm|hurt|exploit|deceive|manipulate|cheat|steal/i,
      /hate|stupid|inferior|because you are a|all you people are/i
    ];
    
    return !harmfulPatterns.some(pattern => pattern.test(prompt));
  };

  const grokResponse = getLastResponse('grok');
  const geminiResponse = getLastResponse('gemini');
  const deepseekResponse = getLastResponse('deepseek');

  // Scrollable column styles
  const scrollableColumnStyle = {
    flex: 1,
    border: '2px solid',
    padding: '15px',
    borderRadius: '8px',
    minHeight: '200px',
    maxHeight: '500px',
    overflowY: 'auto',
    overflowX: 'hidden',
    scrollbarWidth: 'thin',
    scrollbarColor: '#cbd5e0 #f7fafc',
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ color: '#333' }}>🎯 Janus Forge Nexus - ACTIVE</h1>
      <p style={{ color: '#333' }}>Dashboard is connected and ready for AI synthesis!</p>

      <div style={{
        background: 'white',
        padding: '15px',
        margin: '10px',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}>
            <button
              onClick={handleNewSession}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🆕 New Session
            </button>

            <PromptInput
              onSend={handleSendPrompt}
              sessionId={sessionId}
              isSending={status.includes('Sending') || status.includes('Broadcasting')}
            />
          </div>
        </div>

        {sessionId && (
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
            <strong>Active Session:</strong> {sessionId}
          </p>
        )}
      </div>

      <div style={{ background: 'white', padding: '20px', margin: '10px', borderRadius: '8px' }}>
        <h3 style={{ color: '#333', marginBottom: '15px' }}>AI Response Matrix:</h3>
        <div style={{ display: 'flex', gap: '20px', minHeight: '500px' }}>
          {/* Grok Column */}
          <div style={{...scrollableColumnStyle, borderColor: '#ff6b6b', backgroundColor: '#fff5f5'}} 
               className="ai-column">
            <h4 style={{ 
              color: '#d63031', 
              margin: '0 0 10px 0', 
              position: 'sticky', 
              top: 0, 
              background: '#fff5f5', 
              padding: '5px 0', 
              zIndex: 1 
            }}>
              🦄 Grok
            </h4>
            <div style={{ 
              color: '#333', 
              fontSize: '14px', 
              lineHeight: '1.4', 
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}>
              {grokResponse.content}
            </div>
          </div>

          {/* Gemini Column */}
          <div style={{...scrollableColumnStyle, borderColor: '#74b9ff', backgroundColor: '#f0f8ff'}} 
               className="ai-column">
            <h4 style={{ 
              color: '#0984e3', 
              margin: '0 0 10px 0', 
              position: 'sticky', 
              top: 0, 
              background: '#f0f8ff', 
              padding: '5px 0', 
              zIndex: 1 
            }}>
              🌀 Gemini
            </h4>
            <div style={{ 
              color: '#333', 
              fontSize: '14px', 
              lineHeight: '1.4', 
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}>
              {geminiResponse.content}
            </div>
          </div>

          {/* DeepSeek Column */}
          <div style={{...scrollableColumnStyle, borderColor: '#00b894', backgroundColor: '#f0fff4'}} 
               className="ai-column">
            <h4 style={{ 
              color: '#00a085', 
              margin: '0 0 10px 0', 
              position: 'sticky', 
              top: 0, 
              background: '#f0fff4', 
              padding: '5px 0', 
              zIndex: 1 
            }}>
              🎯 DeepSeek
            </h4>
            <div style={{ 
              color: '#333', 
              fontSize: '14px', 
              lineHeight: '1.4', 
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}>
              {deepseekResponse.content}
            </div>
          </div>
        </div>
      </div>

      <div style={{
        background: '#e8f4fd',
        padding: '15px',
        margin: '10px',
        borderRadius: '8px',
        border: '1px solid #74b9ff'
      }}>
        <p style={{ margin: 0, color: '#0984e3' }}>
          <strong>Status:</strong> {status || (sessionHistory.length > 0 ?
            `Connected with ${sessionHistory.length} session(s)` :
            'Ready for new session')}
        </p>
      </div>
    </div>
  );
}

// --- HISTORY PAGE COMPONENT ---
function HistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    hubClient.get('/sessions')
      .then(response => {
        setSessions(response.data.sessions || []);
      })
      .catch(error => {
        console.error('Failed to load sessions:', error);
      });
  }, []);

  const handleSessionClick = (sessionId) => {
    hubClient.get(`/session/${sessionId}`)
      .then(response => {
        const sessionData = response.data;
        navigate(`/session/${sessionId}`);
      })
      .catch(error => {
        console.error('Session load failed:', error);
      });
  };

  const exportSession = (sessionId) => {
    const session = sessions.find(s => s.session_id === sessionId);
    if (!session) return;

    const dataStr = JSON.stringify(session, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `janus-forge-session-${sessionId}.json`;
    link.click();
  };

  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#f0f0f0' }}>
      <h2>Session History</h2>
      <p>Click a session to load and review the conversation. Export to save sessions locally.</p>

      {sessions.length === 0 ? (
        <p>No sessions found.</p>
      ) : (
        <div>
          {sessions.map(session => (
            <div key={session.session_id} style={{
              padding: '15px',
              margin: '10px 0',
              border: '1px solid #ccc',
              borderRadius: '8px',
              backgroundColor: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => handleSessionClick(session.session_id)}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <strong>Session:</strong> {session.session_id}<br/>
                  <strong>Title:</strong> {session.title}<br/>
                  <strong>Last Active:</strong> {new Date(session.last_updated).toLocaleString()}<br/>
                  <strong>Messages:</strong> {session.message_count || 'Unknown'}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportSession(session.session_id);
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  💾 Export
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- DASHBOARD WRAPPER ---
function DashboardWrapper() {
  const { sessionId } = useParams();
  return <Dashboard sessionIdFromUrl={sessionId} />;
}

// --- MAIN APP COMPONENT ---
function App() {
  const [status, setStatus] = useState('');

  return (
    <Router>
      <div className="App">
        <header style={{
          padding: '10px 20px',
          borderBottom: '1px solid #ccc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, color: '#333' }}>Janus Forge Nexus</h1>
          </div>

          <nav>
            <NavLink 
              to="/" 
              style={({ isActive }) => ({
                margin: '0 10px', 
                textDecoration: 'none',
                color: isActive ? '#007bff' : '#666',
                fontWeight: isActive ? '600' : '400',
                padding: '5px 10px',
                borderRadius: '4px',
                backgroundColor: isActive ? '#e8f4fd' : 'transparent'
              })}
            >
              Dashboard
            </NavLink>
            <NavLink 
              to="/history" 
              style={({ isActive }) => ({
                margin: '0 10px', 
                textDecoration: 'none',
                color: isActive ? '#007bff' : '#666',
                fontWeight: isActive ? '600' : '400',
                padding: '5px 10px',
                borderRadius: '4px',
                backgroundColor: isActive ? '#e8f4fd' : 'transparent'
              })}
            >
              History
            </NavLink>
            <NavLink 
              to="/contact" 
              style={({ isActive }) => ({
                margin: '0 10px', 
                textDecoration: 'none',
                color: isActive ? '#007bff' : '#666',
                fontWeight: isActive ? '600' : '400',
                padding: '5px 10px',
                borderRadius: '4px',
                backgroundColor: isActive ? '#e8f4fd' : 'transparent'
              })}
            >
              Contact
            </NavLink>
            <NavLink 
              to="/docs" 
              style={({ isActive }) => ({
                margin: '0 10px', 
                textDecoration: 'none',
                color: isActive ? '#007bff' : '#666',
                fontWeight: isActive ? '600' : '400',
                padding: '5px 10px',
                borderRadius: '4px',
                backgroundColor: isActive ? '#e8f4fd' : 'transparent'
              })}
            >
              Docs
            </NavLink>
          </nav>
        </header>

        {status && (
          <div style={{
            padding: '10px 20px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #ddd',
            color: '#495057'
          }}>
            {status}
          </div>
        )}

        <main>
          <Routes>
            <Route path="/" element={<DashboardWrapper />} />
            <Route path="/session/:sessionId" element={<DashboardWrapper />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/contact" element={<div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#f0f0f0' }}>
              <h2>Contact the Forge</h2>
              <p>Email: cassandraleighwilliamson@gmail.com</p>
              <p>Join us in building the future of AI collaboration.</p>
            </div>} />
            <Route path="/docs" element={<div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#f0f0f0' }}>
              <h2>Documentation</h2>
              <p>Janus Forge Nexus - Multi-AI Synthesis Platform</p>
              <p>Version 1.0 - Operational with Grok, Gemini, and DeepSeek integration</p>
            </div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
