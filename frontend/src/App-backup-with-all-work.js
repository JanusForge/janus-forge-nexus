import React, { useState, useEffect, useCallback, useReducer } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, useNavigate, useParams } from 'react-router-dom';
import Joyride from 'react-joyride';
import axios from 'axios';
import './App.css';
import logo from './logo.jpg'; // Assuming logo.jpg is in src/

// --- CONFIGURATION ---
const API_BASE_URL = process.env.REACT_APP_NEXUS_HUB_URL || 'https://janus-forge-nexus-production.up.railway.app/api/v1';
const API_KEY = process.env.REACT_APP_NEXUS_API_KEY || 'test-key';
const hubClient = axios.create({
  baseURL: API_BASE_URL,
  // Remove or comment out the Authorization header if not needed
  // headers: { 'Authorization': `Bearer ${API_KEY}` }
});

// Steps for onboarding tour
const TOUR_STEPS = [
  { target: '.logo', content: 'Your Forge Emblem—Thesis to Synthesis.' },
  { target: '.human-gate', content: 'Synthesize & Broadcast—Your Baton.' },
  { target: '.response-grid', content: 'AI Columns: Compare, Converge, Conquer.' }
];


// --- MAIN APP COMPONENT ---
function App() {
  // --- STATE DECLARATIONS ---
  const [status, setStatus] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [sessionHistory, setSessionHistory] = useState([]);
  const [participants, setParticipants] = useState([]);
  // ⬇️ REMOVED useNavigate from here ⬇️

  // --- HELPER FUNCTIONS ---
  const getLastResponse = useCallback((aiName) => {
    if (!sessionHistory || sessionHistory.length === 0) {
      return { content: '🔄 Forge warming—awaiting first cycle.', key_takeaways: [] };
    }

    // Get the LAST session data (most recent)
    const currentSession = sessionHistory[sessionHistory.length - 1];

    if (!currentSession || !currentSession.messages) {
      return { content: '❌ No messages in session', key_takeaways: [] };
    }

    // Find the most recent AI response for this specific AI
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

    console.log(`✅ Found ${aiName} response:`, latestResponse.content.substring(0, 100));

    return {
      content: latestResponse.content,
      key_takeaways: latestResponse.key_takeaways || []
    };
  }, [sessionHistory]);

  // ⬇️ UPDATED: Remove navigate from these functions for now ⬇️
  const handleNewSession = () => {
    setStatus('Creating new session...');
    const newSessionId = `session-${Date.now()}`;
    
    hubClient.post('/session', {
      session_id: newSessionId,
      participants: participants
    })
    .then(response => {
      setSessionId(newSessionId);
      setStatus('New session created!');
      setSessionHistory([{ session_id: newSessionId, messages: [] }]);
      // ⬇️ REMOVED navigate call ⬇️
    })
    .catch(error => {
      console.error('Session creation failed:', error);
      setStatus('Failed to create session');
    });
  };

  const handleLoadSession = (sessionId) => {
    setStatus('Loading session...');
    
    hubClient.get(`/session/${sessionId}`)
    .then(response => {
      const sessionData = response.data;
      setSessionId(sessionId);
      setSessionHistory([sessionData]);
      setStatus('Session loaded!');
      // ⬇️ REMOVED navigate call ⬇️
    })
    .catch(error => {
      console.error('Session load failed:', error);
      setStatus('Failed to load session');
    });
  };

  const handleSendPrompt = () => {
    if (!prompt.trim() || !sessionId) return;
    
    setStatus('Sending to AI ensemble...');
    
    hubClient.post('/session/cycle', {
      session_id: sessionId,
      prompt: prompt,
      participants: participants
    })
    .then(response => {
      const cycleData = response.data;
      // Update session history with new responses
      setSessionHistory(prev => {
        const updated = [...prev];
        const currentSession = updated[updated.length - 1];
        if (currentSession && currentSession.session_id === sessionId) {
          currentSession.messages = [...(currentSession.messages || []), ...cycleData.messages];
        }
        return updated;
      });
      setPrompt('');
      setStatus('Cycle complete!');
    })
    .catch(error => {
      console.error('Cycle failed:', error);
      setStatus('Cycle failed');
    });
  };

  // --- DASHBOARD COMPONENT ---
  function Dashboard() {
    console.log('🎯 Dashboard component is rendering!');
    
    return (
      <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
        <h1>🎯 TEST - Dashboard Loaded Successfully!</h1>
        <p>If you see this, the React component is working.</p>
        <div style={{ background: 'white', padding: '10px', margin: '10px' }}>
          <h3>Column Test:</h3>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1, border: '2px solid red', padding: '10px' }}>
              Grok Column
            </div>
            <div style={{ flex: 1, border: '2px solid blue', padding: '10px' }}>
              Gemini Column  
            </div>
            <div style={{ flex: 1, border: '2px solid green', padding: '10px' }}>
              DeepSeek Column
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- HISTORY PAGE COMPONENT ---
  function HistoryPage() {
    // ⬇️ useNavigate can stay here since it's inside a routed component ⬇️
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);

    useEffect(() => {
      // Load session list
      hubClient.get('/sessions')
        .then(response => {
          setSessions(response.data.sessions || []);
        })
        .catch(error => {
          console.error('Failed to load sessions:', error);
        });
    }, []);

    // ⬇️ UPDATED: Use navigate in the click handler ⬇️
    const handleSessionClick = (sessionId) => {
      handleLoadSession(sessionId);
      navigate('/'); // Navigate to dashboard after loading
    };

    return (
      <div style={{ padding: '20px' }}>
        <h2>Session History</h2>
        <p>Click a session to load and review the conversation.</p>
        
        {sessions.length === 0 ? (
          <p>No sessions found.</p>
        ) : (
          <div>
            {sessions.map(session => (
              <div key={session.session_id} style={{ 
                padding: '10px', 
                margin: '5px 0', 
                border: '1px solid #ccc',
                cursor: 'pointer'
              }}
              onClick={() => handleSessionClick(session.session_id)}>
                <strong>Session:</strong> {session.session_id}<br/>
                <strong>Last Active:</strong> {new Date(session.last_active).toLocaleString()}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- MAIN APP RENDER ---
  return (
    <Router>
      <div className="App">
        {/* Header Navigation */}
        <header style={{ 
          padding: '10px 20px', 
          borderBottom: '1px solid #ccc',
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={logo} alt="Janus Forge Nexus" style={{ height: '40px' }} className="logo" />
            <h1 style={{ margin: 0 }}>Janus Forge Nexus</h1>
          </div>
          
          <nav>
            <NavLink to="/" style={{ margin: '0 10px', textDecoration: 'none' }}>
              Dashboard
            </NavLink>
            <NavLink to="/history" style={{ margin: '0 10px', textDecoration: 'none' }}>
              History
            </NavLink>
            <NavLink to="/contact" style={{ margin: '0 10px', textDecoration: 'none' }}>
              Contact
            </NavLink>
            <NavLink to="/docs" style={{ margin: '0 10px', textDecoration: 'none' }}>
              Docs
            </NavLink>
          </nav>
        </header>

        {/* Status Bar */}
        {status && (
          <div style={{ 
            padding: '5px 20px', 
            backgroundColor: '#f0f0f0',
            borderBottom: '1px solid #ddd'
          }}>
            {status}
          </div>
        )}

        {/* Main Content */}
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/contact" element={<div style={{ padding: '20px' }}>Contact Page - Coming Soon</div>} />
            <Route path="/docs" element={<div style={{ padding: '20px' }}>Documentation - Coming Soon</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

  // --- DASHBOARD COMPONENT ---
  function Dashboard() {
    console.log('🎯 Dashboard component is rendering!');
    
    return (
      <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
        <h1>🎯 TEST - Dashboard Loaded Successfully!</h1>
        <p>If you see this, the React component is working.</p>
        <div style={{ background: 'white', padding: '10px', margin: '10px' }}>
          <h3>Column Test:</h3>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1, border: '2px solid red', padding: '10px' }}>
              Grok Column
            </div>
            <div style={{ flex: 1, border: '2px solid blue', padding: '10px' }}>
              Gemini Column  
            </div>
            <div style={{ flex: 1, border: '2px solid green', padding: '10px' }}>
              DeepSeek Column
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- HISTORY PAGE COMPONENT ---
  function HistoryPage() {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);

    useEffect(() => {
      // Load session list
      hubClient.get('/sessions')
        .then(response => {
          setSessions(response.data.sessions || []);
        })
        .catch(error => {
          console.error('Failed to load sessions:', error);
        });
    }, []);

    const handleSessionClick = (sessionId) => {
      handleLoadSession(sessionId);
      navigate('/');
    };

    return (
      <div style={{ padding: '20px' }}>
        <h2>Session History</h2>
        <p>Click a session to load and review the conversation.</p>
        
        {sessions.length === 0 ? (
          <p>No sessions found.</p>
        ) : (
          <div>
            {sessions.map(session => (
              <div key={session.session_id} style={{ 
                padding: '10px', 
                margin: '5px 0', 
                border: '1px solid #ccc',
                cursor: 'pointer'
              }}
              onClick={() => handleSessionClick(session.session_id)}>
                <strong>Session:</strong> {session.session_id}<br/>
                <strong>Last Active:</strong> {new Date(session.last_active).toLocaleString()}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

}  // ⬅️⬅️⬅️ ADD THIS CLOSING BRACE FOR App() FUNCTION ⬅️⬅️⬅️

  // --- MAIN APP RENDER ---
  return (
    <Router>
      <div className="App">
        {/* Header Navigation */}
        <header style={{ 
          padding: '10px 20px', 
          borderBottom: '1px solid #ccc',
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={logo} alt="Janus Forge Nexus" style={{ height: '40px' }} className="logo" />
            <h1 style={{ margin: 0 }}>Janus Forge Nexus</h1>
          </div>
          
          <nav>
            <NavLink to="/" style={{ margin: '0 10px', textDecoration: 'none' }}>
              Dashboard
            </NavLink>
            <NavLink to="/history" style={{ margin: '0 10px', textDecoration: 'none' }}>
              History
            </NavLink>
            <NavLink to="/contact" style={{ margin: '0 10px', textDecoration: 'none' }}>
              Contact
            </NavLink>
            <NavLink to="/docs" style={{ margin: '0 10px', textDecoration: 'none' }}>
              Docs
            </NavLink>
          </nav>
        </header>

        {/* Status Bar */}
        {status && (
          <div style={{ 
            padding: '5px 20px', 
            backgroundColor: '#f0f0f0',
            borderBottom: '1px solid #ddd'
          }}>
            {status}
          </div>
        )}

        {/* Main Content */}
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/contact" element={<div style={{ padding: '20px' }}>Contact Page - Coming Soon</div>} />
            <Route path="/docs" element={<div style={{ padding: '20px' }}>Documentation - Coming Soon</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
