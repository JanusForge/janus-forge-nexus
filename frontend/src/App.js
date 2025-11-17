import React, { useState, useEffect, useCallback, useReducer } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, useNavigate, useParams } from 'react-router-dom';
import Joyride from 'react-joyride';
import axios from 'axios';
import './App.css';
import logo from './logo.jpg'; // Assuming logo.jpg is in src/

// --- CONFIGURATION ---
const API_BASE_URL = process.env.REACT_APP_NEXUS_HUB_URL || 'http://localhost:8000/api/v1';
const API_KEY = process.env.REACT_APP_NEXUS_API_KEY || 'test-key';
const hubClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Authorization': `Bearer ${API_KEY}` }
});

// Steps for onboarding tour
const TOUR_STEPS = [
  { target: '.logo', content: 'Your Forge Emblem—Thesis to Synthesis.' },
  { target: '.human-gate', content: 'Synthesize & Broadcast—Your Baton.' },
  { target: '.response-grid', content: 'AI Columns: Compare, Converge, Conquer.' }
];

// --- DASHBOARD COMPONENT ---
function Dashboard({ sessionIdFromUrl }) {
  const [sessionId, setSessionId] = useState(sessionIdFromUrl || null);
  const [sessionHistory, setSessionHistory] = useState([]); // This will hold the 'messages' array
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('Idle. Ignite a black swan?');
  const [runTour, setRunTour] = useState(true);
  const [participants] = useState(['grok', 'gemini', 'deepseek']);
  const navigate = useNavigate();
  const [, forceUpdate] = useReducer(x => x + 1, 0); 

  // API: Create New Session
  const createNewSession = async () => {
    try {
      setStatus('Forging Session...');
      const response = await hubClient.post('/broadcast', {
        initial_prompt: 'Janus Forge: Initializing Black Swan Protocol.',
        ai_participants: participants
      });
      const data = response.data;
      setSessionId(data.session_id);
      setStatus(`Session Forged: ${data.session_id}. Awaiting first poll.`);
      navigate(`/session/${data.session_id}`);
    } catch (error) {
      console.error('Session error:', error);
      setStatus('Error: Hub silent. Check backend (localhost:8000).');
    }
  };

  // API: Broadcast a new prompt
  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!sessionId || !prompt) return;
    setStatus('Broadcasting Flames...');
    try {
      await hubClient.post(`/broadcast`, { 
        session_id: sessionId, 
        moderator_prompt: prompt,
        ai_participants: participants 
      });
      setPrompt('');
    } catch (error) {
      console.error('Broadcast error:', error);
      setStatus('Error: Broadcast failed—check console/Network tab.');
    }
  };

  // API: Poll for updates
  const pollForUpdates = useCallback(async () => {
    if (!sessionId) return;
    try {
      const response = await hubClient.get(`/session/${sessionId}`);
      const session = response.data; // This is the JSON { session_id: "...", messages: [...] }

      // *** BUG FIX: Look for 'messages', not 'history' ***
      if (session.messages && JSON.stringify(session.messages) !== JSON.stringify(sessionHistory)) {
        setSessionHistory(session.messages); // <-- Set state with 'messages'
        setStatus('Cycle Forged. Human Gate: Synthesize & Direct?');
        forceUpdate(); // Force a re-render
      }
    } catch (error) {
      console.error('Poll error:', error);
      if (error.response && error.response.status === 404) {
        setStatus(`Error: Session ${sessionId} not found.`);
        setSessionId(null);
        navigate('/');
      }
    }
  }, [sessionId, sessionHistory, navigate]);

  // Initial load effect
  useEffect(() => {
    if (sessionId) {
      pollForUpdates();
    }
  }, [sessionId, pollForUpdates]);

  // Polling timer
  useEffect(() => {
    if (sessionId) {
      const interval = setInterval(pollForUpdates, 5000);
      return () => clearInterval(interval);
    }
  }, [sessionId, pollForUpdates]);

  // *** THIS IS THE NEW, 100% CORRECTED FUNCTION ***
  const getLastResponse = (aiName) => {
    if (!sessionHistory || !Array.isArray(sessionHistory) || sessionHistory.length === 0) {
      return null;
    }
    // Search from the end of the array to find the most recent entry for this AI
    // *** BUG FIX: Check role === 'ai' AND ai_name === aiName ***
    const lastResponse = sessionHistory.slice().reverse().find(entry => entry.role === 'ai' && entry.ai_name === aiName);

    return lastResponse || null; // Return the full message object or null
  };

  return (
    <div className="dashboard-page">
      <Joyride steps={TOUR_STEPS} run={runTour} continuous={true} showSkip={false} callback={(data) => data.status === 'finished' && setRunTour(false)} />
      <header className="app-header">
        <img src={logo} alt="Janus Forge Emblem" className="logo" />
        <h1>Janus Forge Nexus</h1>
        <p className="status">{status}</p>
        {sessionId && <p>Session ID: {sessionId}</p>}
      </header>
      {!sessionId ? (
        <button onClick={createNewSession} className="start-btn">Ignite New Black Swan Session</button>
      ) : (
        <>
          <main className="response-grid">
            {participants.map(aiName => {
              const lastResponse = getLastResponse(aiName);
              return (
                <div key={aiName} className={`ai-column ${aiName}`} data-ai={aiName}>
                  <h2>{aiName.toUpperCase()}</h2>
                  <div className="ai-response-card">
                    {/* This logic will now correctly find and display the content */}
                    {lastResponse ? (
                      <p>{lastResponse.content}</p>
                    ) : (
                      <p><i>Awaiting forge...</i></p>
                    )}
                  </div>
                </div>
              );
            })}
          </main>
          <footer className="human-gate">
            <form onSubmit={handleBroadcast}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Synthesize flames & broadcast directive..."
              />
              <button type="submit">Broadcast to Forge</button>
              <button type="button" onClick={() => {/* Voice stub */}}>Speak Gate</button>
            </form>
          </footer>
        </>
      )}
    </div>
  );
}

// --- HISTORY PAGE COMPONENT ---
function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await hubClient.get('/sessions');
        const sessionList = (response.data && Array.isArray(response.data.sessions)) 
          ? response.data.sessions 
          : [];
        setSessions(sessionList.reverse()); 
        setLoading(false);
      } catch (error) {
        console.error("Error fetching session list:", error);
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const loadSession = (sessionId) => {
    navigate(`/session/${sessionId}`);
  };

  if (loading) {
    return <h2>Loading Session History...</h2>;
  }

  return (
    <div className="history-page">
      <h2>Session History</h2>
      <p>Click a session to load and review the conversation.</p>
      <div className="session-list">
        {sessions.length > 0 ? (
          sessions
            .filter(session => session && session.session_id) // Filter out bad data
            .map((session, index) => (
              // Use session_id for the key and click handler
              <button key={session.session_id || index} onClick={() => loadSession(session.session_id)} className="session-item">
                <strong>Session:</strong> {session.session_id} <br />
                <strong>Last Active:</strong> {session.last_updated ? new Date(session.last_updated).toLocaleString() : 'N/A'}
              </button>
            ))
        ) : (
          <p>No past sessions found.</p>
        )}
      </div>
    </div>
  );
}

// --- NEW DASHBOARD WRAPPER ---
function DashboardWrapper() {
  const { sessionId } = useParams();
  return <Dashboard sessionIdFromUrl={sessionId} />;
}

// --- OTHER PAGE COMPONENTS ---
function Contact() {
  return (
    <div className="contact-page">
      <h2>Contact the Forge</h2>
      <form>
        <input type="email" placeholder="Your Email" />
        <textarea placeholder="Your Message" />
        <button type="submit">Send Sparks</button>
      </form>
      <p>Email: cassandraleighwilliamson@gmail.com</p>
    </div>
  );
}

// --- MAIN APP ROUTER ---
function App() {
  return (
    <Router>
      <nav className="sticky-nav">
        <NavLink to="/" className="nav-link">Dashboard</NavLink>
        <NavLink to="/history" className="nav-link">History</NavLink>
        <NavLink to="/contact" className="nav-link">Contact</NavLink>
        <NavLink to="/docs" className="nav-link">Docs</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/session/:sessionId" element={<DashboardWrapper />} /> 
        <Route path="/contact" element={<Contact />} />
        <Route path="/docs" element={<h2>API Forge Guide</h2>} />
      </Routes>
    </Router>
  );
}

export default App;
