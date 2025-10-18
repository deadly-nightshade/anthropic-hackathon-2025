import React, { useState, useRef, useEffect } from 'react';

const ChatPanel = ({ 
  onRoomEdit, 
  onRoomEditFallback,
  onResetRoom, 
  isLoading, 
  isOpen, 
  onClose 
}) => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [useVisionMode, setUseVisionMode] = useState(true);
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const addToChatHistory = (message, isUser = false, metadata = {}) => {
    const newMessage = {
      id: Date.now(),
      text: message,
      isUser,
      timestamp: new Date().toLocaleTimeString(),
      metadata
    };
    setChatHistory(prev => [...prev, newMessage]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    
    // Add user message to chat
    addToChatHistory(userMessage, true);
    
    try {
      let result;
      
      if (useVisionMode) {
        // Try vision-based editing first
        addToChatHistory('📸 Capturing room screenshot for visual analysis...', false);
        result = await onRoomEdit(userMessage);
        
        // If vision mode fails, fallback to text-based
        if (!result.success && onRoomEditFallback) {
          addToChatHistory('⚠️ Vision analysis failed, trying text-based approach...', false);
          result = await onRoomEditFallback(userMessage);
        }
      } else {
        // Use text-based editing directly
        result = onRoomEditFallback ? await onRoomEditFallback(userMessage) : await onRoomEdit(userMessage);
      }
      
      // Add result to chat with metadata
      addToChatHistory(result.message, false, {
        success: result.success,
        metadata: result.metadata,
        processingStats: result.processingStats,
        visualAnalysis: result.visualAnalysis
      });
      
    } catch (error) {
      addToChatHistory(`❌ Error: ${error.message}`, false, { success: false });
    }
  };

  const handleReset = async () => {
    if (isLoading) return;
    
    try {
      addToChatHistory('🔄 Resetting room to default state...', false);
      const result = await onResetRoom();
      addToChatHistory(result.message, false, { success: result.success });
    } catch (error) {
      addToChatHistory(`❌ Reset failed: ${error.message}`, false, { success: false });
    }
  };

  const toggleVisionMode = () => {
    setUseVisionMode(!useVisionMode);
    const mode = !useVisionMode ? 'Vision Mode' : 'Text Mode';
    addToChatHistory(`🔄 Switched to ${mode} ${!useVisionMode ? '(AI sees your room)' : '(Text-based analysis)'}`, false);
  };

  return (
    <div className={`chat-panel ${isOpen ? 'open' : ''}`}>
      <div className="chat-header">
        <h2>🏠 Room Designer</h2>
        <div className="mode-controls">
          <button 
            onClick={toggleVisionMode}
            className={`mode-toggle ${useVisionMode ? 'vision-active' : 'text-active'}`}
            disabled={isLoading}
          >
            {useVisionMode ? '👁️ Vision Mode' : '📝 Text Mode'}
          </button>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="chat-messages">
        {chatHistory.length === 0 && (
          <div className="welcome-message">
            <h3>Welcome to Vision-Enhanced Room Design! 👁️</h3>
            <p>
              <strong>Vision Mode:</strong> AI can see your room and understand spatial instructions like:
            </p>
            <ul>
              <li>"Add a bed to the right side of the room"</li>
              <li>"Put a lamp in the left corner"</li>
              <li>"Add a desk near the window"</li>
              <li>"Change the chair color to blue"</li>
            </ul>
            <p>
              <strong>Text Mode:</strong> Traditional text-based analysis (fallback)
            </p>
          </div>
        )}
        
        {chatHistory.map((msg) => (
          <div key={msg.id} className={`message ${msg.isUser ? 'user' : 'assistant'}`}>
            <div className="message-content">
              {msg.text}
              {msg.metadata?.visualAnalysis && (
                <div className="visual-analysis">
                  <details>
                    <summary>🔍 Visual Analysis Details</summary>
                    <pre>{JSON.stringify(msg.metadata.visualAnalysis, null, 2)}</pre>
                  </details>
                </div>
              )}
            </div>
            <div className="message-time">{msg.timestamp}</div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="chat-controls">
        <button 
          onClick={handleReset} 
          disabled={isLoading}
          className="reset-btn"
        >
          🔄 Reset Room
        </button>
      </div>

      <form onSubmit={handleSubmit} className="chat-input">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            useVisionMode 
              ? "Describe changes (AI will see your room)..." 
              : "Describe changes (text analysis)..."
          }
          disabled={isLoading}
          autoFocus
        />
        <button type="submit" disabled={isLoading || !message.trim()}>
          {isLoading ? '⏳' : useVisionMode ? '👁️' : '📝'}
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;