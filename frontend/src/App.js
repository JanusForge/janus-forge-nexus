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
      {/* Session Controls */}
      <div style={{
        background: 'white',
        padding: isMobile ? '12px' : '15px',
        margin: isMobile ? '5px' : '10px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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

// --- FIXED HISTORY PAGE COMPONENT ---
function HistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [deletingSession, setDeletingSession] = useState(null);
  const [error, setError] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    loadSessions();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadSessions = () => {
    setError('');
    hubClient.get('/sessions')
      .then(response => {
        setSessions(response.data.sessions || []);
      })
      .catch(error => {
        console.error('Failed to load sessions:', error);
        setError('Failed to load sessions. Please refresh the page.');
      });
  };

  const handleSessionClick = (sessionId) => {
    navigate(`/session/${sessionId}`);
  };

  const handleDeleteSession = async (sessionId, e) => {
    if (e) e.stopPropagation();
    setDeletingSession(sessionId);
    setError('');
    
    if (window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      try {
        // Try the actual delete first
        await hubClient.delete(`/session/${sessionId}`);
        setSessions(prev => prev.filter(s => s.session_id !== sessionId));
      } catch (error) {
        console.error('Session deletion failed:', error);
        
        // Show user-friendly error message
        if (error.response?.status === 405) {
          setError('Delete functionality coming soon! The backend DELETE endpoint needs to be implemented.');
        } else {
          setError('Failed to delete session. Please try again.');
        }
      } finally {
        setDeletingSession(null);
      }
    } else {
      setDeletingSession(null);
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  const exportAsJSON = (session) => {
    const dataStr = JSON.stringify(session, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `janus-forge-session-${session.session_id}.json`;
    link.click();
  };

  const exportAsText = (session) => {
    let textContent = `JANUS FORGE NEXUS - SESSION EXPORT\n`;
    textContent += `Session: ${session.session_id}\n`;
    textContent += `Date: ${new Date(session.last_updated).toLocaleString()}\n`;
    textContent += `Message Count: ${session.message_count || 'Unknown'}\n`;
    textContent += `========================================\n\n`;
    
    // Note: You'll need to load full session data to get messages
    textContent += `Full message export requires loading the session first.\n`;
    textContent += `Click the session to view messages, then export.`;
    
    const dataBlob = new Blob([textContent], {type: 'text/plain'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `janus-forge-${session.session_id}.txt`;
    link.click();
  };

  const printSession = async (sessionId) => {
    try {
      // Load full session data first
      const response = await hubClient.get(`/session/${sessionId}`);
      const sessionData = response.data;
      
      const printWindow = window.open('', '_blank');
      const sortedMessages = sessionData.messages ? 
        sessionData.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) : [];
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Janus Forge Session - ${sessionData.session_id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .message { margin-bottom: 20px; padding: 15px; border-left: 4px solid #007bff; background: #f8f9fa; }
            .user-message { border-left-color: #007bff; background: #e8f4fd; }
            .ai-message { border-left-color: #28a745; background: #f0fff4; }
            .message-header { font-weight: bold; margin-bottom: 8px; color: #333; }
            .timestamp { color: #666; font-size: 0.9em; margin-left: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Janus Forge Nexus</h1>
            <h2>Session: ${sessionData.session_id}</h2>
            <p>Exported on ${new Date().toLocaleString()}</p>
          </div>
          ${sortedMessages.map(message => `
            <div class="message ${message.role === 'user' ? 'user-message' : 'ai-message'}">
              <div class="message-header">
                ${message.role === 'user' ? 'You' : (message.ai_name || 'AI')}
                <span class="timestamp">${new Date(message.timestamp).toLocaleString()}</span>
              </div>
              <div>${message.content}</div>
            </div>
          `).join('')}
        </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } catch (error) {
      console.error('Failed to load session for printing:', error);
      alert('Failed to load session data for printing. Please try again.');
    }
  };

  const exportSession = (session, format, e) => {
    if (e) e.stopPropagation();
    setOpenDropdown(null);
    
    switch (format) {
      case 'json':
        exportAsJSON(session);
        break;
      case 'text':
        exportAsText(session);
        break;
      case 'print':
        printSession(session.session_id);
        break;
      default:
        exportAsText(session);
    }
  };

  const toggleDropdown = (sessionId, e) => {
    if (e) e.stopPropagation();
    setOpenDropdown(openDropdown === sessionId ? null : sessionId);
  };

  return (
    <div style={{ 
      padding: isMobile ? '15px' : '20px', 
      minHeight: '100vh', 
      backgroundColor: '#f0f0f0' 
    }}>
      <div style={{
        background: 'white',
        padding: isMobile ? '15px' : '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h2 style={{ 
          fontSize: isMobile ? '20px' : '24px', 
          margin: '0 0 10px 0',
          color: '#333'
        }}>
          Session History
        </h2>
        <p style={{ 
          fontSize: isMobile ? '14px' : '16px', 
          color: '#666',
          margin: 0
        }}>
          Click a session to load and review the conversation. Export in different formats or delete your sessions.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          <strong>Note:</strong> {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ color: '#666', fontSize: '16px', margin: 0 }}>
            No sessions found. Start a conversation on the Dashboard to see your history here.
          </p>
        </div>
      ) : (
        <div>
          {sessions.map(session => (
            <div key={session.session_id} style={{
              padding: isMobile ? '15px' : '20px',
              margin: '0 0 15px 0',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onClick={() => handleSessionClick(session.session_id)}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '15px' : '0',
                marginBottom: '15px'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: isMobile ? '16px' : '18px', 
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '8px',
                    wordBreak: 'break-all'
                  }}>
                    {session.session_id}
                  </div>
                  <div style={{ 
                    fontSize: isMobile ? '14px' : '15px', 
                    color: '#666',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '15px'
                  }}>
                    <span>
                      <strong>Last Active:</strong> {formatTimestamp(session.last_updated)}
                    </span>
                    <span>
                      <strong>Messages:</strong> {session.message_count || '0'}
                    </span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  flexDirection: isMobile ? 'row' : 'row',
                  alignItems: 'center'
                }}>
                  {/* Export Dropdown - FIXED */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={(e) => toggleDropdown(session.session_id, e)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      💾 Export ▼
                    </button>
                    
                    {openDropdown === session.session_id && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        backgroundColor: 'white',
                        minWidth: '140px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        borderRadius: '6px',
                        zIndex: 1000,
                        border: '1px solid #ddd',
                        marginTop: '5px'
                      }}>
                        <button
                          onClick={(e) => exportSession(session, 'text', e)}
                          style={{
                            width: '100%',
                            padding: '10px 15px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '14px',
                            borderBottom: '1px solid #eee'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          📝 Text File
                        </button>
                        <button
                          onClick={(e) => exportSession(session, 'json', e)}
                          style={{
                            width: '100%',
                            padding: '10px 15px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '14px',
                            borderBottom: '1px solid #eee'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          ⚙️ JSON File
                        </button>
                        <button
                          onClick={(e) => exportSession(session, 'print', e)}
                          style={{
                            width: '100%',
                            padding: '10px 15px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '14px'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          🖨️ Print
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteSession(session.session_id, e)}
                    disabled={deletingSession === session.session_id}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: deletingSession === session.session_id ? '#6c757d' : '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: deletingSession === session.session_id ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      opacity: deletingSession === session.session_id ? 0.6 : 1
                    }}
                  >
                    {deletingSession === session.session_id ? '🗑️ Deleting...' : '🗑️ Delete'}
                  </button>
                </div>
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
{/* Single Unified Header */}
<header style={{
  padding: isMobile ? '15px' : '20px',
  borderBottom: '1px solid #ccc',
  backgroundColor: 'white',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
}}>
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: isMobile ? 'column' : 'row',
    gap: isMobile ? '15px' : '0'
  }}>
    {/* Brand Section */}
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '20px',
      textAlign: isMobile ? 'center' : 'left'
    }}>
      {/* Janus Forge Logo - LARGER */}
      <img 
        src="/janus-forge-logo.jpg" 
        alt="Janus Forge"
        style={{
          width: isMobile ? '80px' : '100px',
          height: isMobile ? '80px' : '100px',
          borderRadius: '8px',
          objectFit: 'cover',
          border: '2px solid #333',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}
      />
      
      <div>
        <h1 style={{ 
          margin: 0, 
          color: '#333',
          fontSize: isMobile ? '22px' : '28px',
          fontWeight: '700'
        }}>
          Janus Forge Nexus
        </h1>
        <p style={{
          margin: '6px 0 0 0',
          color: '#666',
          fontSize: isMobile ? '15px' : '18px',
          fontStyle: 'italic',
          fontWeight: '500'
        }}>
          Thesis. Antithesis. Humanity
        </p>
        
        {/* Brand Tags */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '10px',
          flexWrap: 'wrap',
          justifyContent: isMobile ? 'center' : 'flex-start'
        }}>
          <span style={{
            padding: '6px 12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#495057',
            border: '1px solid #dee2e6',
            fontWeight: '500'
          }}>
            ACCELERATORS, LLC
          </span>
          <span style={{
            padding: '6px 12px',
            backgroundColor: '#fff3cd',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#856404',
            border: '1px solid #ffeaa7',
            fontWeight: '500'
          }}>
            VETERAN-OWNED
          </span>
          <span style={{
            padding: '6px 12px',
            backgroundColor: '#d1ecf1',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#0c5460',
            border: '1px solid #bee5eb',
            fontWeight: '500'
          }}>
            synthesis
          </span>
        </div>
      </div>
    </div>

    {/* Navigation */}
    <nav style={{
      display: 'flex',
      gap: isMobile ? '12px' : '20px',
      flexWrap: 'wrap',
      justifyContent: isMobile ? 'center' : 'flex-end'
    }}>
      <NavLink 
        to="/" 
        style={({ isActive }) => ({
          textDecoration: 'none',
          color: isActive ? '#007bff' : '#666',
          fontWeight: isActive ? '600' : '500',
          padding: '10px 20px',
          borderRadius: '8px',
          backgroundColor: isActive ? '#e8f4fd' : 'transparent',
          fontSize: isMobile ? '15px' : '17px',
          whiteSpace: 'nowrap',
          border: isActive ? '2px solid #007bff' : '2px solid transparent',
          transition: 'all 0.2s ease'
        })}
      >
        Dashboard
      </NavLink>
      <NavLink 
        to="/history" 
        style={({ isActive }) => ({
          textDecoration: 'none',
          color: isActive ? '#007bff' : '#666',
          fontWeight: isActive ? '600' : '500',
          padding: '10px 20px',
          borderRadius: '8px',
          backgroundColor: isActive ? '#e8f4fd' : 'transparent',
          fontSize: isMobile ? '15px' : '17px',
          whiteSpace: 'nowrap',
          border: isActive ? '2px solid #007bff' : '2px solid transparent',
          transition: 'all 0.2s ease'
        })}
      >
        History
      </NavLink>
      <NavLink 
        to="/contact" 
        style={({ isActive }) => ({
          textDecoration: 'none',
          color: isActive ? '#007bff' : '#666',
          fontWeight: isActive ? '600' : '500',
          padding: '10px 20px',
          borderRadius: '8px',
          backgroundColor: isActive ? '#e8f4fd' : 'transparent',
          fontSize: isMobile ? '15px' : '17px',
          whiteSpace: 'nowrap',
          border: isActive ? '2px solid #007bff' : '2px solid transparent',
          transition: 'all 0.2s ease'
        })}
      >
        Contact
      </NavLink>
    </nav>
  </div>
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
