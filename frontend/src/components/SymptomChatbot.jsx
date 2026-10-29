import React, { useState, useEffect, useRef } from 'react';

// SVG Icons
const BotIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    <circle cx="12" cy="12" r="4"/>
  </svg>
);

const ChatBubbleIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    <path d="M8 10h.01M12 10h.01M16 10h.01"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6M1 20v-6h6"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const ShieldAlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

export default function SymptomChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      sender: 'bot',
      text: "Hello! I am **Prescura AI**, your clinical symptom triage assistant. Describe how you are feeling (e.g. *fever, headache, chills, stomach pain*) or tap any symptom below to predict potential conditions and recommended precautions.",
      prediction: null
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [popularSymptoms, setPopularSymptoms] = useState([]);
  const [allSymptoms, setAllSymptoms] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [showAllPicker, setShowAllPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'https://prescura-smif.onrender.com';

  // Fetch symptom reference data on mount
  useEffect(() => {
    const fetchSymptoms = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/chatbot/symptoms`);
        const data = await res.json();
        if (data.success) {
          setPopularSymptoms(data.popular || []);
          setAllSymptoms(data.all || []);
        }
      } catch (err) {
        console.warn('Could not pre-fetch symptoms:', err);
      }
    };
    fetchSymptoms();
  }, [apiUrl]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleToggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const resetChat = () => {
    setMessages([
      {
        id: 'init-1',
        sender: 'bot',
        text: "Conversation reset. What symptoms are you currently experiencing?",
        prediction: null
      }
    ]);
    setSelectedSymptoms([]);
    setInput('');
  };

  const toggleSymptomSelection = (sym) => {
    const exists = selectedSymptoms.some(s => s.id === sym.id);
    let updated;
    if (exists) {
      updated = selectedSymptoms.filter(s => s.id !== sym.id);
    } else {
      updated = [...selectedSymptoms, sym];
    }
    setSelectedSymptoms(updated);
  };

  const handleSend = async (messageText) => {
    const textToSend = messageText !== undefined ? messageText : input;
    if (!textToSend.trim() && selectedSymptoms.length === 0) return;

    const userMsgText = textToSend.trim() || `Checking symptoms: ${selectedSymptoms.map(s => s.label).join(', ')}`;
    
    // Append user message
    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: userMsgText
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const abortCtrl = new AbortController();
      const timeoutId = setTimeout(() => abortCtrl.abort(), 9500);

      const res = await fetch(`${apiUrl}/api/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortCtrl.signal,
        body: JSON.stringify({
          message: userMsgText,
          activeSymptoms: selectedSymptoms
        })
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (data.success) {
        // Sync detected active symptoms
        if (data.activeSymptoms && data.activeSymptoms.length > 0) {
          setSelectedSymptoms(data.activeSymptoms);
        }

        const botMsg = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: data.reply,
          prediction: data.prediction?.matched ? data.prediction : null
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            text: data.reply || "I couldn't process that request. Please try again or select symptoms from the chips below."
          }
        ]);
      }
    } catch (err) {
      console.warn('Chat request notice:', err);
      // If client timed out or backend is busy, fall back to direct local analysis call
      try {
        const fallbackRes = await fetch(`${apiUrl}/api/chatbot/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symptoms: userMsgText })
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackData.success && fallbackData.data?.matched) {
          const pred = fallbackData.data;
          setMessages(prev => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              sender: 'bot',
              text: `### Triage Assessment: **${pred.topPrediction.disease}** (${pred.topPrediction.confidence}% Match)\n\n**Overview:**\n${pred.topPrediction.description}`,
              prediction: pred
            }
          ]);
          return;
        }
      } catch (innerErr) {
        console.error('Fallback error:', innerErr);
      }

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: "I experienced a slight delay analyzing your symptoms. Please try selecting the symptoms directly from the quick chips above or rephrase."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUpClick = (symptom) => {
    toggleSymptomSelection(symptom);
    handleSend(`I also experience ${symptom.label}`);
  };

  const filteredAllSymptoms = allSymptoms.filter(s =>
    s.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Simple Markdown text renderer for bolding **text** and bullet items
  const renderFormattedText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        className={`chatbot-bubble-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={handleToggleOpen}
        aria-label={isOpen ? "Close AI Symptom Checker" : "Open AI Symptom Checker"}
        title="AI Symptom Checker & Disease Predictor"
      >
        <span className="chatbot-bubble-pulse" />
        {isOpen ? <CloseIcon /> : <ChatBubbleIcon />}
        <span className="chatbot-bubble-badge">AI</span>
      </button>

      {/* Floating Window Panel */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-header-avatar">
                <BotIcon />
              </div>
              <div>
                <h3 className="chatbot-header-title">
                  Prescura AI Health
                  <span className="chatbot-status-indicator" title="Dataset Prediction Online" />
                </h3>
                <p className="chatbot-header-sub">Trained on 41 diseases & 131 symptoms</p>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button
                className="chatbot-icon-btn"
                onClick={resetChat}
                title="Restart conversation"
              >
                <RefreshIcon />
              </button>
              <button
                className="chatbot-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Close chatbot"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Medical Disclaimer Alert */}
          <div className="chatbot-disclaimer">
            <ShieldAlertIcon />
            <span>AI triage guidance. For acute chest pain or breathlessness, seek emergency care.</span>
          </div>

          {/* Quick Symptoms Carousel */}
          <div className="chatbot-chips-bar">
            <div className="chatbot-chips-title">
              <span>Quick Symptoms</span>
              <button
                onClick={() => setShowAllPicker(!showAllPicker)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-color)',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 600
                }}
              >
                {showAllPicker ? 'Hide All' : '+ View All (131)'}
              </button>
            </div>

            {/* Popular Symptom Chips */}
            <div className="chatbot-chips-scroll">
              {popularSymptoms.map(sym => {
                const isSelected = selectedSymptoms.some(s => s.id === sym.id);
                return (
                  <button
                    key={sym.id}
                    className={`chatbot-symptom-chip ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleSymptomSelection(sym)}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{sym.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Full 131 Symptom Search Dropdown */}
          {showAllPicker && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--surface-color)',
              borderBottom: '1px solid var(--border-color)',
              maxHeight: '170px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <input
                type="text"
                placeholder="Search any symptom (e.g., fatigue, itching, cough)..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem',
                  outline: 'none'
                }}
              />
              <div style={{
                overflowY: 'auto',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '5px',
                maxHeight: '110px'
              }}>
                {filteredAllSymptoms.slice(0, 30).map(sym => {
                  const isSelected = selectedSymptoms.some(s => s.id === sym.id);
                  return (
                    <button
                      key={sym.id}
                      className={`chatbot-symptom-chip ${isSelected ? 'active' : ''}`}
                      onClick={() => toggleSymptomSelection(sym)}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {sym.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Symptoms Tag Bar */}
          {selectedSymptoms.length > 0 && (
            <div className="chatbot-active-tags">
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', alignSelf: 'center', marginRight: '2px' }}>
                Selected:
              </span>
              {selectedSymptoms.map(sym => (
                <span key={sym.id} className="chatbot-tag-pill">
                  {sym.label}
                  <button
                    className="chatbot-tag-remove"
                    onClick={() => toggleSymptomSelection(sym)}
                    title="Remove symptom"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                onClick={() => handleSend()}
                style={{
                  background: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Analyze Now →
              </button>
            </div>
          )}

          {/* Messages Stream */}
          <div className="chatbot-messages-container">
            {messages.map(msg => (
              <div key={msg.id} className={`chat-message-row ${msg.sender}`}>
                {msg.sender === 'bot' && (
                  <div className="chat-avatar-mini">
                    <BotIcon />
                  </div>
                )}
                <div style={{ maxWidth: '100%' }}>
                  <div className="chat-bubble">
                    <div style={{ whiteSpace: 'pre-line' }}>
                      {renderFormattedText(msg.text)}
                    </div>

                    {/* Rich Prediction Card if prediction exists */}
                    {msg.prediction && msg.prediction.topPrediction && (
                      <div className="prediction-card">
                        <div className="prediction-card-header">
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                              Primary Prediction
                            </div>
                            <h4 className="prediction-condition-title">
                              🩺 {msg.prediction.topPrediction.disease}
                            </h4>
                          </div>
                          <span className="prediction-confidence-badge">
                            {msg.prediction.topPrediction.confidence}% Match
                          </span>
                        </div>

                        {/* Triage / Urgency Badge */}
                        {msg.prediction.triage && (
                          <div
                            className="prediction-triage-badge"
                            style={{
                              backgroundColor: `${msg.prediction.triage.color}15`,
                              color: msg.prediction.triage.color,
                              border: `1px solid ${msg.prediction.triage.color}40`
                            }}
                          >
                            <span>●</span>
                            <span>{msg.prediction.triage.label}</span>
                          </div>
                        )}

                        {/* Description */}
                        <p className="prediction-desc">
                          {msg.prediction.topPrediction.description}
                        </p>

                        {/* Recommended Precautions Checklist */}
                        {msg.prediction.topPrediction.precautions?.length > 0 && (
                          <div className="prediction-precautions">
                            <div className="prediction-precautions-title">
                              <span>🛡️</span>
                              <span>Recommended Care Precautions:</span>
                            </div>
                            <ul className="precautions-list">
                              {msg.prediction.topPrediction.precautions.map((prec, idx) => (
                                <li key={idx}>{prec}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Differential Diagnoses */}
                        {msg.prediction.differentialDiagnoses?.length > 0 && (
                          <div className="differential-list">
                            <span style={{ fontWeight: 600 }}>Alternative Possibilities: </span>
                            {msg.prediction.differentialDiagnoses.map(diff => (
                              <span key={diff.disease} style={{ marginRight: '6px' }}>
                                • {diff.disease} ({diff.confidence}%)
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Follow-up question chips */}
                        {msg.prediction.followUpSuggestions?.length > 0 && (
                          <div style={{ marginTop: '6px' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                              Tap to refine prediction:
                            </div>
                            <div className="followup-suggestions">
                              {msg.prediction.followUpSuggestions.map(sym => (
                                <button
                                  key={sym.id}
                                  className="followup-btn"
                                  onClick={() => handleFollowUpClick(sym)}
                                >
                                  + {sym.label}?
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-message-row bot thinking-row">
                <div className="chat-avatar-mini thinking-avatar">
                  <BotIcon />
                </div>
                <div className="chat-bubble thinking-bubble">
                  <div className="thinking-content">
                    <div className="thinking-dots">
                      <div className="thinking-dot dot-1" />
                      <div className="thinking-dot dot-2" />
                      <div className="thinking-dot dot-3" />
                    </div>
                    <span className="thinking-text">
                      Analyzing symptoms with clinical AI...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            className="chatbot-input-bar"
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              className="chatbot-input-field"
              placeholder="Describe symptoms (e.g. fever, chills, cough)..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="chatbot-send-btn"
              disabled={loading || (!input.trim() && selectedSymptoms.length === 0)}
              title="Send message"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
