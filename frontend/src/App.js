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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

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
      <textarea
        ref={inputRef}
        value={localPrompt}
        onChange={(e) => setLocalPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={sessionId ? "Type your message to the AI ensemble... (Press Enter to send)" : "Create a session first..."}
        disabled={!sessionId || isSending}
        style={{
          padding: '12px 16px',
          border: `2px solid ${sessionId ? '#007bff' : '#6c757d'}`,
          borderRadius: '8px',
          fontSize: '16px',
          outline: 'none',
          minHeight: '80px',
          maxHeight: '150px',
          width: '100%',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease',
          opacity: sessionId ? 1 : 0.7,
          resize: 'vertical',
          fontFamily: 'inherit',
          lineHeight: '1.4'
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
          width: '100%',
          opacity: sessionId && localPrompt.trim() && !isSending ? 1 : 0.6
        }}
      >
        {isSending ? '🔄 Broadcasting...' : '🚀 Send to AI Ensemble'}
      </button>
      
      <div style={{
        fontSize: '12px',
        color: '#6c757d',
        textAlign: 'center',
        marginTop: '5px'
      }}>
        Press Enter to send • Shift+Enter for new line
      </div>
    </div>
  );
}

// --- DASHBOARD COMPONENT ---
function Dashboard({ sessionIdFromUrl }) {
  const [status, setStatus] = useState('');
  const [sessionId, setSessionId] = useState(sessionIdFromUrl || '');
  const [sessionHistory, setSessionHistory] = useState([]);
  const [participants, setParticipants] = useState(['grok', 'gemini', 'deepseek']);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const messagesEndRef = useRef(null);

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

    // First, add the user's message to session history immediately
    const userMessage = {
      role: 'user',
      content: promptText,
      timestamp: new Date().toISOString()
    };

    setSessionHistory(prev => {
      const updated = [...prev];
      const currentSession = updated[updated.length - 1];
      if (currentSession && currentSession.session_id === sessionId) {
        currentSession.messages = [
          ...(currentSession.messages || []),
          userMessage  // Add user message first
        ];
      }
      return updated;
    });

    // Then send to AI and add their responses
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
          // Add AI responses after the user message
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
      {/* Brand Header */}
      <div style={{
        background: 'white',
        padding: isMobile ? '12px' : '20px',
        margin: isMobile ? '5px' : '10px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
          {/* Janus Forge Logo */}
          <img 
            src="/janus-forge-logo.jpg" 
            alt="Janus Forge"
            style={{
              width: isMobile ? '50px' : '60px',
              height: isMobile ? '50px' : '60px',
              borderRadius: '8px',
              objectFit: 'cover',
              border: '2px solid #333'
            }}
          />
          <div>
            <h1 style={{ 
              color: '#333', 
              margin: '0 0 4px 0',
              fontSize: isMobile ? '20px' : '24px',
              fontWeight: '700'
            }}>Janus Forge Nexus</h1>
            <p style={{ 
              color: '#666', 
              margin: 0,
              fontSize: isMobile ? '14px' : '16px',
              fontStyle: 'italic'
            }}>Thesis. Antithesis. Humanity</p>
          </div>
        </div>
        <div style={{
          display: 'flex',
          gap: '15px',
          marginTop: '10px',
          flexWrap: 'wrap'
        }}>
          <span style={{
            padding: '4px 8px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#495057',
            border: '1px solid #dee2e6'
          }}>
            ACCELERATORS, LLC
          </span>
          <span style={{
            padding: '4px 8px',
            backgroundColor: '#fff3cd',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#856404',
            border: '1px solid #ffeaa7'
          }}>
            VETERAN-OWNED
          </span>
          <span style={{
            padding: '4px 8px',
            backgroundColor: '#d1ecf1',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#0c5460',
            border: '1px solid #bee5eb'
          }}>
            synthesis
          </span>
        </div>
      </div>

      {/* Session Controls */}
      <div style={{
        background: 'white',
        padding: isMobile ? '12px' : '15px',
        margin: isMobile ? '5px' : '10px',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        {!sessionId ? (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleNewSession}
              style={{
                padding: isMobile ? '14px 20px' : '16px 32px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: isMobile ? '16px' : '18px',
                fontWeight: '600',
                cursor: 'pointer',
                width: isMobile ? '100%' : 'auto',
                minWidth: isMobile ? 'auto' : '200px'
              }}
            >
              🚀 Start New Session
            </button>
            <p style={{ 
              margin: '12px 0 0 0', 
              fontSize: '14px', 
              color: '#666',
              textAlign: 'center'
            }}>
              Create a session to begin conversing with the AI ensemble
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
                  AI Participants: {participants.join(', ')}
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

      {/* Unified Conversation Thread with Integrated Input */}
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
                // Determine if this is a user message or AI message
                const isUserMessage = message.role === 'user' || !message.ai_name;
                const aiName = message.ai_name || '';
                
                return (
                  <div key={index} style={{
                    marginBottom: '15px',
                    padding: isMobile ? '10px' : '12px',
                    borderRadius: '8px',
                    backgroundColor: !isUserMessage ? 
                      (aiName === 'grok' ? '#fff5f5' : 
                       aiName === 'gemini' ? '#f0f8ff' : '#f0fff4') : '#e8f4fd',
                    borderLeft: `4px solid ${
                      !isUserMessage ? 
                        (aiName === 'grok' ? '#ff6b6b' : 
                         aiName === 'gemini' ? '#74b9ff' : '#00b894') : '#007bff'
                    }`
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: '5px',
                      fontWeight: '600',
                      fontSize: isMobile ? '14px' : '16px',
                      color: !isUserMessage ? 
                        (aiName === 'grok' ? '#d63031' : 
                         aiName === 'gemini' ? '#0984e3' : '#00a085') : '#007bff',
                      flexWrap: 'wrap'
                    }}>
                      {!isUserMessage ? (
                        <>
                          {aiName === 'grok' && '🦄 '}
                          {aiName === 'gemini' && '🌀 '}
                          {aiName === 'deepseek' && '🎯 '}
                          {aiName || 'AI'}
                        </>
                      ) : '👤 You'}
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

        {/* Input Area - Now integrated inside the conversation thread */}
        {sessionId && (
          <PromptInput 
            onSend={handleSendPrompt}
            sessionId={sessionId}
            isSending={status.includes('Sending') || status.includes('Broadcasting')}
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
function HistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    
    hubClient.get('/sessions')
      .then(response => {
        setSessions(response.data.sessions || []);
      })
      .catch(error => {
        console.error('Failed to load sessions:', error);
      });

    return () => window.removeEventListener('resize', handleResize);
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
    <div style={{ 
      padding: isMobile ? '15px' : '20px', 
      minHeight: '100vh', 
      backgroundColor: '#f0f0f0' 
    }}>
      <h2 style={{ fontSize: isMobile ? '20px' : '24px' }}>Session History</h2>
      <p style={{ fontSize: isMobile ? '14px' : '16px' }}>
        Click a session to load and review the conversation. Export to save sessions locally.
      </p>

      {sessions.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
          No sessions found.
        </p>
      ) : (
        <div>
          {sessions.map(session => (
            <div key={session.session_id} style={{
              padding: isMobile ? '12px' : '15px',
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
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '10px' : '0'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: isMobile ? '14px' : '16px' }}>
                    <strong>Session:</strong> {session.session_id}
                  </div>
                  <div style={{ fontSize: isMobile ? '13px' : '14px', color: '#666' }}>
                    <strong>Last Active:</strong> {new Date(session.last_updated).toLocaleString()}
                  </div>
                  <div style={{ fontSize: isMobile ? '13px' : '14px', color: '#666' }}>
                    <strong>Messages:</strong> {session.message_count || 'Unknown'}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportSession(session.session_id);
                  }}
                  style={{
                    padding: isMobile ? '6px 12px' : '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '13px' : '14px',
                    whiteSpace: 'nowrap'
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Router>
      <div className="App">
        <header style={{
          padding: isMobile ? '8px 15px' : '10px 20px',
          borderBottom: '1px solid #ccc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '10px' : '0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* Janus Forge Logo */}
            <img 
              src="/janus-forge-logo.jpg" 
              alt="Janus Forge"
              style={{
                width: isMobile ? '40px' : '50px',
                height: isMobile ? '40px' : '50px',
                borderRadius: '6px',
                objectFit: 'cover',
                border: '2px solid #333'
              }}
            />
            
            <div>
              <h1 style={{ 
                margin: 0, 
                color: '#333',
                fontSize: isMobile ? '18px' : '24px',
                fontWeight: '700'
              }}>
                Janus Forge Nexus
              </h1>
              <p style={{
                margin: 0,
                color: '#666',
                fontSize: isMobile ? '12px' : '14px',
                fontStyle: 'italic'
              }}>
                Multi-AI Conversation Platform
              </p>
            </div>
          </div>

          <nav style={{
            display: 'flex',
            gap: isMobile ? '5px' : '10px',
            flexWrap: 'wrap',
            justifyContent: isMobile ? 'center' : 'flex-end'
          }}>
            <NavLink 
              to="/" 
              style={({ isActive }) => ({
                margin: '0 5px', 
                textDecoration: 'none',
                color: isActive ? '#007bff' : '#666',
                fontWeight: isActive ? '600' : '400',
                padding: '5px 10px',
                borderRadius: '4px',
                backgroundColor: isActive ? '#e8f4fd' : 'transparent',
                fontSize: isMobile ? '14px' : '16px',
                whiteSpace: 'nowrap'
              })}
            >
              Dashboard
            </NavLink>
            <NavLink 
              to="/history" 
              style={({ isActive }) => ({
                margin: '0 5px', 
                textDecoration: 'none',
                color: isActive ? '#007bff' : '#666',
                fontWeight: isActive ? '600' : '400',
                padding: '5px 10px',
                borderRadius: '4px',
                backgroundColor: isActive ? '#e8f4fd' : 'transparent',
                fontSize: isMobile ? '14px' : '16px',
                whiteSpace: 'nowrap'
              })}
            >
              History
            </NavLink>
            <NavLink 
              to="/contact" 
              style={({ isActive }) => ({
                margin: '0 5px', 
                textDecoration: 'none',
                color: isActive ? '#007bff' : '#666',
                fontWeight: isActive ? '600' : '400',
                padding: '5px 10px',
                borderRadius: '4px',
                backgroundColor: isActive ? '#e8f4fd' : 'transparent',
                fontSize: isMobile ? '14px' : '16px',
                whiteSpace: 'nowrap'
              })}
            >
              Contact
            </NavLink>
          </nav>
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
            <Route path="/" element={<DashboardWrapper />} />
            <Route path="/session/:sessionId" element={<DashboardWrapper />} />
            <Route path="/history" element={<HistoryPage />} />
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
