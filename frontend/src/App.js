import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// --- CONFIGURATION ---
const API_BASE_URL = "https://janus-forge-nexus.onrender.com/api/v1";
const hubClient = axios.create({
  baseURL: API_BASE_URL,
});

// --- TIER MANAGEMENT ---
const TIERS = {
  free: {
    name: "Explorer",
    sessionLimit: 3,
    messageLimit: 20,
    aiModels: ['gemini', 'deepseek'],
    features: ["2 AI Models", "Basic Debate", "Session History"],
    color: "#6c757d",
    price: "Free"
  },
  pro: {
    name: "Scholar", 
    sessionLimit: 50,
    messageLimit: 500,
    aiModels: ['grok', 'gemini', 'deepseek', 'openai'],
    features: ["4 AI Models", "Advanced Controls", "Export Features", "Priority Support"],
    color: "#007bff",
    price: "$29/month"
  },
  enterprise: {
    name: "Master",
    sessionLimit: 1000,
    messageLimit: 10000,
    aiModels: ['grok', 'gemini', 'deepseek', 'openai', 'anthropic'],
    features: ["All 5 AI Models", "API Access", "White Label", "Dedicated Support"],
    color: "#28a745",
    price: "$99/month"
  }
};

// --- AI MODEL CONFIGURATION ---
const AI_MODELS = {
  grok: {
    name: "Grok",
    icon: "🦄",
    color: "#ff6b6b",
    description: "Witty, unconventional thinking",
    availableIn: ['pro', 'enterprise']
  },
  gemini: {
    name: "Gemini", 
    icon: "🌀",
    color: "#74b9ff",
    description: "Comprehensive analysis",
    availableIn: ['free', 'pro', 'enterprise']
  },
  deepseek: {
    name: "DeepSeek",
    icon: "🎯", 
    color: "#00b894",
    description: "Focused, analytical insights",
    availableIn: ['free', 'pro', 'enterprise']
  },
  openai: {
    name: "OpenAI",
    icon: "🤖",
    color: "#8e44ad",
    description: "Balanced, nuanced responses", 
    availableIn: ['pro', 'enterprise']
  },
  anthropic: {
    name: "Claude",
    icon: "🧠",
    color: "#e67e22",
    description: "Thoughtful, principled analysis",
    availableIn: ['enterprise']
  }
};

// --- USAGE TRACKING HOOK ---
function useUsageTracker() {
  const [usage, setUsage] = useState(() => {
    const saved = localStorage.getItem('janusForgeUsage');
    return saved ? JSON.parse(saved) : {
      sessionsCreated: 0,
      messagesSent: 0,
      currentTier: 'free',
      tierStartDate: new Date().toISOString()
    };
  });

  useEffect(() => {
    localStorage.setItem('janusForgeUsage', JSON.stringify(usage));
  }, [usage]);

  const incrementUsage = (type, amount = 1) => {
    setUsage(prev => ({
      ...prev,
      [type]: prev[type] + amount
    }));
  };

  const canCreateSession = () => {
    return usage.sessionsCreated < TIERS[usage.currentTier].sessionLimit;
  };

  const canSendMessage = () => {
    return usage.messagesSent < TIERS[usage.currentTier].messageLimit;
  };

  const upgradeTier = (newTier) => {
    setUsage(prev => ({
      ...prev,
      currentTier: newTier,
      tierStartDate: new Date().toISOString()
    }));
  };

  return { usage, incrementUsage, canCreateSession, canSendMessage, upgradeTier };
}

// --- ONBOARDING TOUR COMPONENT ---
function OnboardingTour({ onComplete, currentTier }) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      title: "🎭 Welcome to Janus Forge Nexus",
      content: "Where thesis meets antithesis. Debate complex topics with multiple AI perspectives for deeper understanding.",
      position: "center"
    },
    {
      title: "🤖 Multi-AI Ensemble",
      content: `Access ${TIERS[currentTier].aiModels.length} AI models with unique personalities and expertise.`,
      position: "top"
    },
    {
      title: "💬 Create Meaningful Debates", 
      content: "Pose questions, watch AIs debate from different angles, and synthesize insights.",
      position: "bottom"
    },
    {
      title: "📊 Manage Your Journey",
      content: "Track conversations, export insights, and build your knowledge repository.",
      position: "bottom"
    }
  ];

  if (currentStep >= steps.length) {
    onComplete();
    return null;
  }

  const step = steps[currentStep];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        maxWidth: '500px',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{ color: '#333', marginBottom: '15px' }}>
          {step.title}
        </h2>
        <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.5', marginBottom: '25px' }}>
          {step.content}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#999' }}>
            Step {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            style={{
              padding: '10px 25px',
              backgroundColor: TIERS[currentTier].color,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            {currentStep === steps.length - 1 ? 'Get Started 🚀' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- UPGRADE MODAL COMPONENT ---
function UpgradeModal({ isOpen, onClose, currentTier, onUpgrade }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
          Upgrade Your AI Debate Experience
        </h2>
        
        <div style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
          {Object.entries(TIERS).map(([tierKey, tier]) => (
            <div key={tierKey} style={{
              border: `2px solid ${tierKey === currentTier ? tier.color : '#ddd'}`,
              borderRadius: '8px',
              padding: '20px',
              backgroundColor: tierKey === currentTier ? `${tier.color}10` : 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ color: tier.color, margin: 0 }}>{tier.name}</h3>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: tier.color }}>
                  {tier.price}
                </span>
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <strong>AI Models:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                  {tier.aiModels.map(modelKey => (
                    <span key={modelKey} style={{
                      padding: '2px 8px',
                      backgroundColor: AI_MODELS[modelKey].color + '20',
                      color: AI_MODELS[modelKey].color,
                      borderRadius: '4px',
                      fontSize: '12px',
                      border: `1px solid ${AI_MODELS[modelKey].color}`
                    }}>
                      {AI_MODELS[modelKey].icon} {AI_MODELS[modelKey].name}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <strong>Limits:</strong>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {tier.sessionLimit} sessions • {tier.messageLimit} messages
                </div>
              </div>

              <ul style={{ fontSize: '14px', color: '#666', paddingLeft: '20px', marginBottom: '15px' }}>
                {tier.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>

              <button
                onClick={() => onUpgrade(tierKey)}
                disabled={tierKey === currentTier}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: tierKey === currentTier ? '#6c757d' : tier.color,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: tierKey === currentTier ? 'default' : 'pointer',
                  fontWeight: '600'
                }}
              >
                {tierKey === currentTier ? 'Current Plan' : 'Upgrade Now'}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: '20px',
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// --- PROMPT INPUT COMPONENT ---
function PromptInput({ onSend, sessionId, isSending = false, usage, canSendMessage, onUpgradePrompt }) {
  const [localPrompt, setLocalPrompt] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = () => {
    const trimmedPrompt = localPrompt.trim();
    if (trimmedPrompt && sessionId && !isSending) {
      if (!canSendMessage) {
        onUpgradePrompt();
        return;
      }
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

  const messagesRemaining = TIERS[usage.currentTier].messageLimit - usage.messagesSent;

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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px',
        color: '#666'
      }}>
        <span>
          Messages: {usage.messagesSent} / {TIERS[usage.currentTier].messageLimit}
        </span>
        {messagesRemaining <= 10 && (
          <span style={{ color: messagesRemaining <= 5 ? '#dc3545' : '#ffc107', fontWeight: 'bold' }}>
            {messagesRemaining} messages remaining
          </span>
        )}
      </div>

      <textarea
        ref={inputRef}
        value={localPrompt}
        onChange={(e) => setLocalPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={sessionId ? 
          (canSendMessage ? 
            "Type your message to the AI ensemble... (Press Enter to send)" : 
            "Message limit reached - upgrade to continue") : 
          "Create a session first..."}
        disabled={!sessionId || isSending || !canSendMessage}
        style={{
          padding: '12px 16px',
          border: `2px solid ${sessionId && canSendMessage ? '#007bff' : '#6c757d'}`,
          borderRadius: '8px',
          fontSize: '16px',
          outline: 'none',
          minHeight: '80px',
          maxHeight: '150px',
          width: '100%',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease',
          opacity: sessionId && canSendMessage ? 1 : 0.7,
          resize: 'vertical',
          fontFamily: 'inherit',
          lineHeight: '1.4'
        }}
      />

      <button
        onClick={handleSubmit}
        disabled={!sessionId || !localPrompt.trim() || isSending || !canSendMessage}
        style={{
          padding: '12px 24px',
          backgroundColor: sessionId && localPrompt.trim() && !isSending && canSendMessage ? 
            TIERS[usage.currentTier].color : '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: sessionId && localPrompt.trim() && !isSending && canSendMessage ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          width: '100%',
          opacity: sessionId && localPrompt.trim() && !isSending && canSendMessage ? 1 : 0.6
        }}
      >
        {isSending ? '🔄 Broadcasting...' : 
         !canSendMessage ? '💎 Upgrade to Continue' : '🚀 Send to AI Ensemble'}
      </button>

      <div style={{
        fontSize: '12px',
        color: '#6c757d',
        textAlign: 'center',
        marginTop: '5px'
      }}>
        {canSendMessage ? 'Press Enter to send • Shift+Enter for new line' : 'Upgrade for unlimited messages'}
      </div>
    </div>
  );
}

// --- DASHBOARD COMPONENT ---
function Dashboard({ sessionIdFromUrl, usage, incrementUsage, canCreateSession, onUpgradePrompt }) {
  const [status, setStatus] = useState('');
  const [sessionId, setSessionId] = useState(sessionIdFromUrl || '');
  const [sessionHistory, setSessionHistory] = useState([]);
  const [participants, setParticipants] = useState(TIERS[usage.currentTier].aiModels);
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

  const handleNewSession = () => {
    if (!canCreateSession) {
      onUpgradePrompt();
      return;
    }

    setStatus('Creating new session...');
    const newSessionId = `session-${Date.now()}`;

    hubClient.post('/broadcast', {
      session_id: newSessionId,
      ai_participants: participants,
      initial_prompt: "Session initialized - ready for prompts!",
      tier: usage.currentTier
    })
    .then(response => {
      setSessionId(newSessionId);
      setStatus('New session created! Ready for prompts.');
      setSessionHistory([{
        session_id: newSessionId,
        messages: response.data.responses || []
      }]);
      incrementUsage('sessionsCreated');
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
          userMessage
        ];
      }
      return updated;
    });

    // Then send to AI and add their responses
    hubClient.post('/broadcast', {
      session_id: sessionId,
      ai_participants: participants,
      moderator_prompt: promptText,
      tier: usage.currentTier
    })
    .then(response => {
      const broadcastData = response.data;
      console.log('✅ BROADCAST RESPONSE:', broadcastData);

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

      incrementUsage('messagesSent', broadcastData.responses.length);
      setStatus(`AI synthesis complete! ${broadcastData.responses.length} responses received`);
    })
    .catch(error => {
      console.error('❌ BROADCAST FAILED:', error);
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
      {/* Usage Stats */}
      <div style={{
        background: 'white',
        padding: isMobile ? '12px' : '15px',
        margin: isMobile ? '5px' : '10px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '15px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <strong style={{ color: TIERS[usage.currentTier].color }}>
              {TIERS[usage.currentTier].name} Tier
            </strong>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Sessions: {usage.sessionsCreated}/{TIERS[usage.currentTier].sessionLimit} • 
              Messages: {usage.messagesSent}/{TIERS[usage.currentTier].messageLimit}
            </div>
          </div>
          {!canCreateSession && (
            <button
              onClick={onUpgradePrompt}
              style={{
                padding: '8px 16px',
                backgroundColor: TIERS.pro.color,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              💎 Upgrade
            </button>
          )}
        </div>
      </div>

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
              disabled={!canCreateSession}
              style={{
                padding: isMobile ? '14px 20px' : '16px 32px',
                backgroundColor: canCreateSession ? TIERS[usage.currentTier].color : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: isMobile ? '16px' : '18px',
                fontWeight: '600',
                cursor: canCreateSession ? 'pointer' : 'not-allowed',
                width: isMobile ? '100%' : 'auto',
                minWidth: isMobile ? 'auto' : '200px',
                opacity: canCreateSession ? 1 : 0.6
              }}
            >
              {canCreateSession ? '🚀 Start New Session' : '💎 Upgrade to Create Sessions'}
            </button>
            <p style={{
              margin: '12px 0 0 0',
              fontSize: '14px',
              color: '#666',
              textAlign: 'center'
            }}>
              {canCreateSession ? 
                `Create a session with ${participants.length} AI models` : 
                'Upgrade your plan to create more sessions'}
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
                  AI Participants: {participants.map(p => AI_MODELS[p].icon + ' ' + AI_MODELS[p].name).join(', ')}
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

      {/* Unified Conversation Thread */}
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
                const isUserMessage = message.role === 'user' || !message.ai_name;
                const aiName = message.ai_name || '';
                const aiConfig = AI_MODELS[aiName];

                return (
                  <div key={index} style={{
                    marginBottom: '15px',
                    padding: isMobile ? '10px' : '12px',
                    borderRadius: '8px',
                    backgroundColor: !isUserMessage && aiConfig ? 
                      `${aiConfig.color}10` : '#e8f4fd',
                    borderLeft: `4px solid ${
                      !isUserMessage && aiConfig ? aiConfig.color : '#007bff'
                    }`
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '5px',
                      fontWeight: '600',
                      fontSize: isMobile ? '14px' : '16px',
                      color: !isUserMessage && aiConfig ? aiConfig.color : '#007bff',
                      flexWrap: 'wrap'
                    }}>
                      {!isUserMessage ? (
                        <>
                          {aiConfig?.icon} {aiConfig?.name || aiName}
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

        {/* Input Area */}
        {sessionId && (
          <PromptInput
            onSend={handleSendPrompt}
            sessionId={sessionId}
            isSending={status.includes('Sending') || status.includes('Broadcasting')}
            usage={usage}
            canSendMessage={canSendMessage()} // FIXED: Call the function
            onUpgradePrompt={onUpgradePrompt}
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

// --- BULK OPERATIONS HISTORY PAGE ---
function HistoryPage({ usage, incrementUsage }) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [deletingSession, setDeletingSession] = useState(null);
  const [error, setError] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  
  // Bulk operations state
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    loadSessions();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Refresh when navigating to History tab
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (currentPath === '/history') {
      loadSessions();
    }
  }, [window.location.pathname]);

  const loadSessions = () => {
    setError('');
    hubClient.get('/sessions')
      .then(response => {
        setSessions(response.data.sessions || []);
        setSelectedSessions([]); // Clear selection on refresh
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
        await hubClient.delete(`/session/${sessionId}`);
        setSessions(prev => prev.filter(s => s.session_id !== sessionId));
        await loadSessions(); // Refresh from server
        console.log(`✅ Session ${sessionId} deleted`);
      } catch (error) {
        console.error('Session deletion failed:', error);
        if (error.response?.status === 405) {
          setError('Delete functionality coming soon! The backend DELETE endpoint needs to be implemented.');
        } else {
          setError('Failed to delete session. Please try again.');
        }
      } finally {
        setDeletingSession(null);
      }
    }
  };

  // Bulk operations handlers
  const handleSessionSelect = (sessionId, isSelected) => {
    setSelectedSessions(prev => 
      isSelected 
        ? [...prev, sessionId]
        : prev.filter(id => id !== sessionId)
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedSessions.length) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedSessions.length} session(s)? This cannot be undone.`)) {
      try {
        const deletePromises = selectedSessions.map(sessionId => 
          hubClient.delete(`/session/${sessionId}`)
        );
        
        await Promise.all(deletePromises);
        await loadSessions();
        
        setSelectedSessions([]);
        setIsBulkDeleteMode(false);
        
        console.log(`✅ Deleted ${selectedSessions.length} sessions`);
      } catch (error) {
        console.error('Bulk delete failed:', error);
        setError('Failed to delete some sessions. Please try again.');
      }
    }
  };

  const handleSelectAll = () => {
    if (selectedSessions.length === sessions.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions(sessions.map(s => s.session_id));
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Export functions remain the same as before...
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
    textContent += `Full message export requires loading the session first.\n`;
    textContent += `Click the session to view messages, then export.`;

    const dataBlob = new Blob([textContent], {type: 'text/plain'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `janus-forge-${session.session_id}.txt`;
    link.click();
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 style={{
              fontSize: isMobile ? '20px' : '24px',
              margin: '0 0 5px 0',
              color: '#333'
            }}>
              Session History
            </h2>
            <p style={{
              fontSize: isMobile ? '14px' : '16px',
              color: '#666',
              margin: 0
            }}>
              {sessions.length} session(s) • Click to review conversations
            </p>
          </div>

          {/* Bulk Operations Controls */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsBulkDeleteMode(!isBulkDeleteMode)}
              style={{
                padding: '8px 16px',
                backgroundColor: isBulkDeleteMode ? '#6c757d' : TIERS[usage.currentTier].color,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {isBulkDeleteMode ? '✖ Cancel' : '🗑️ Bulk Delete'}
            </button>
            
            {isBulkDeleteMode && (
              <button
                onClick={handleSelectAll}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {selectedSessions.length === sessions.length ? '❌ Deselect All' : '✅ Select All'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Delete Banner */}
      {isBulkDeleteMode && selectedSessions.length > 0 && (
        <div style={{
          background: '#fff3cd',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #ffeaa7',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ fontWeight: '600', color: '#856404' }}>
            🗑️ {selectedSessions.length} session(s) selected for deletion
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleBulkDelete}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Confirm Delete
            </button>
            <button
              onClick={() => {
                setSelectedSessions([]);
                setIsBulkDeleteMode(false);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
              border: `2px solid ${
                selectedSessions.includes(session.session_id) ? TIERS[usage.currentTier].color : '#ddd'
              }`,
              borderRadius: '8px',
              backgroundColor: selectedSessions.includes(session.session_id) ? 
                `${TIERS[usage.currentTier].color}10` : 'white',
              cursor: isBulkDeleteMode ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onClick={isBulkDeleteMode ? undefined : () => handleSessionClick(session.session_id)}
            onMouseEnter={(e) => !isBulkDeleteMode && (e.target.style.backgroundColor = '#f8f9fa')}
            onMouseLeave={(e) => !isBulkDeleteMode && (
              e.target.style.backgroundColor = selectedSessions.includes(session.session_id) ? 
                `${TIERS[usage.currentTier].color}10` : 'white'
            )}>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '15px' : '0',
                marginBottom: '15px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '15px',
                  flex: 1 
                }}>
                  {/* Checkbox for bulk operations */}
                  {isBulkDeleteMode && (
                    <input
                      type="checkbox"
                      checked={selectedSessions.includes(session.session_id)}
                      onChange={(e) => handleSessionSelect(session.session_id, e.target.checked)}
                      style={{ 
                        marginTop: '3px',
                        transform: 'scale(1.2)'
                      }}
                    />
                  )}

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
                </div>

                {/* Action Buttons */}
                {!isBulkDeleteMode && (
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    flexDirection: isMobile ? 'row' : 'row',
                    alignItems: 'center'
                  }}>
                    {/* Export Dropdown */}
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
                            onClick={(e) => {
                              exportAsText(session);
                              toggleDropdown(session.session_id, e);
                            }}
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
                            onClick={(e) => {
                              exportAsJSON(session);
                              toggleDropdown(session.session_id, e);
                            }}
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
                            ⚙️ JSON File
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
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- DASHBOARD WRAPPER ---
function DashboardWrapper({ usage, incrementUsage, canCreateSession, onUpgradePrompt }) {
  const { sessionId } = useParams();
  return <Dashboard 
    sessionIdFromUrl={sessionId} 
    usage={usage}
    incrementUsage={incrementUsage}
    canCreateSession={canCreateSession()} // FIXED: Call the function
    onUpgradePrompt={onUpgradePrompt}
  />;
}

// --- MAIN APP COMPONENT ---
function App() {
  const [status, setStatus] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('janusForgeOnboardingCompleted');
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const { usage, incrementUsage, canCreateSession, canSendMessage, upgradeTier } = useUsageTracker();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('janusForgeOnboardingCompleted', 'true');
  };

  const handleUpgradePrompt = () => {
    setShowUpgradeModal(true);
  };

  const handleTierUpgrade = (newTier) => {
    upgradeTier(newTier);
    setShowUpgradeModal(false);
  };

  return (
    <Router>
      <div className="App">
        {/* Onboarding Tour */}
        {showOnboarding && (
          <OnboardingTour 
            onComplete={handleOnboardingComplete} 
            currentTier={usage.currentTier}
          />
        )}

        {/* Upgrade Modal */}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentTier={usage.currentTier}
          onUpgrade={handleTierUpgrade}
        />

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
              {/* Janus Forge Logo */}
              <img
                src="/janus-forge-logo.jpg"
                alt="Janus Forge"
                style={{
                  width: isMobile ? '60px' : '80px',
                  height: isMobile ? '60px' : '80px',
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
                  fontSize: isMobile ? '20px' : '24px',
                  fontWeight: '700'
                }}>
                  Janus Forge Nexus
                </h1>
                <p style={{
                  margin: '4px 0 0 0',
                  color: '#666',
                  fontSize: isMobile ? '14px' : '16px',
                  fontStyle: 'italic',
                  fontWeight: '500'
                }}>
                  Thesis. Antithesis. Humanity
                </p>

                {/* Tier Badge */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '8px',
                  flexWrap: 'wrap',
                  justifyContent: isMobile ? 'center' : 'flex-start'
                }}>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: TIERS[usage.currentTier].color + '20',
                    color: TIERS[usage.currentTier].color,
                    borderRadius: '4px',
                    fontSize: '12px',
                    border: `1px solid ${TIERS[usage.currentTier].color}`,
                    fontWeight: '600'
                  }}>
                    {TIERS[usage.currentTier].name} Tier
                  </span>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: '#fff3cd',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#856404',
                    border: '1px solid #ffeaa7',
                    fontWeight: '500'
                  }}>
                    VETERAN-OWNED
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation & Upgrade Button */}
            <div style={{
              display: 'flex',
              gap: isMobile ? '10px' : '15px',
              flexWrap: 'wrap',
              justifyContent: isMobile ? 'center' : 'flex-end',
              alignItems: 'center'
            }}>
              <nav style={{
                display: 'flex',
                gap: isMobile ? '8px' : '15px',
                flexWrap: 'wrap'
              }}>
                <NavLink
                  to="/"
                  style={({ isActive }) => ({
                    textDecoration: 'none',
                    color: isActive ? '#007bff' : '#666',
                    fontWeight: isActive ? '600' : '500',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: isActive ? '#e8f4fd' : 'transparent',
                    fontSize: isMobile ? '14px' : '16px',
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
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: isActive ? '#e8f4fd' : 'transparent',
                    fontSize: isMobile ? '14px' : '16px',
                    whiteSpace: 'nowrap',
                    border: isActive ? '2px solid #007bff' : '2px solid transparent',
                    transition: 'all 0.2s ease'
                  })}
                >
                  History
                </NavLink>
              </nav>

              {/* Upgrade Button */}
              {usage.currentTier !== 'enterprise' && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: TIERS.pro.color,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}
                >
                  💎 Upgrade
                </button>
              )}
            </div>
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
            <Route path="/" element={
              <DashboardWrapper 
                usage={usage}
                incrementUsage={incrementUsage}
                canCreateSession={canCreateSession}
                onUpgradePrompt={handleUpgradePrompt}
              />
            } />
            <Route path="/session/:sessionId" element={
              <DashboardWrapper 
                usage={usage}
                incrementUsage={incrementUsage}
                canCreateSession={canCreateSession}
                onUpgradePrompt={handleUpgradePrompt}
              />
            } />
            <Route path="/history" element={
              <HistoryPage 
                usage={usage}
                incrementUsage={incrementUsage}
              />
            } />
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
