import React, { useState, useRef, useEffect } from 'react';

const ChatPanel = ({ 
  onRoomEdit, 
  onResetRoom, 
  onDownloadRoom, 
  onUndo,
  onRedo,
  isLoading,
  canUndo,
  canRedo,
  isMobileMenuOpen, 
  onToggleMobileMenu 
}) => {
  const [messages, setMessages] = useState([
    {
      type: 'system',
      content: 'Welcome! Your room is ready for editing. Try saying something like "Add a red sofa" or "Change the wall color to blue".'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const prompt = inputValue.trim();
    if (!prompt || isLoading) return;

    // Add user message
    setMessages(prev => [...prev, { type: 'user', content: prompt }]);
    setInputValue('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Process room edit
    const result = await onRoomEdit(prompt);
    
    // Add response message
    setMessages(prev => [...prev, { 
      type: result.success ? 'assistant' : 'error', 
      content: result.message 
    }]);
  };

  const handleReset = async () => {
    if (isLoading) return;
    
    const result = await onResetRoom();
    setMessages(prev => [...prev, { 
      type: result.success ? 'system' : 'error', 
      content: result.message 
    }]);
  };

  const handleDownload = () => {
    const result = onDownloadRoom();
    setMessages(prev => [...prev, { 
      type: result.success ? 'system' : 'error', 
      content: result.message 
    }]);
  };

  const handleUndo = async () => {
    if (isLoading || !canUndo) return;
    
    const result = await onUndo();
    setMessages(prev => [...prev, { 
      type: result.success ? 'system' : 'error', 
      content: result.message 
    }]);
  };

  const handleRedo = async () => {
    if (isLoading || !canRedo) return;
    
    const result = await onRedo();
    setMessages(prev => [...prev, { 
      type: result.success ? 'system' : 'error', 
      content: result.message 
    }]);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const handleExampleClick = (prompt) => {
    setInputValue(prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const examplePrompts = [
    "Add a comfortable red sofa to the room",
    "Change the wall color to a warm blue", 
    "Add more plants to make it feel more natural",
    "Move the desk to the corner near the window",
    "Add warm lighting with table lamps",
    "Remove the bookshelf"
  ];

  return (
    <div className={`chat-panel ${isMobileMenuOpen ? 'open' : ''}`}>
      <div className="chat-header">
        <h1>🎨 AI Room Editor</h1>
        <p>Describe what you want to change in your room, and I'll make it happen!</p>
      </div>

      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.type}`}>
            {message.content}
          </div>
        ))}
        
        {/* Show loading indicator in chat when AI is thinking */}
        {isLoading && (
          <div className="message system loading-message">
            <div className="loading-content-chat">
              <div className="spinner-small"></div>
              <span>🤖 AI is redesigning your room...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <form onSubmit={handleSubmit} className="input-group">
          <textarea
            ref={textareaRef}
            className="chat-input"
            placeholder="Describe your room changes..."
            value={inputValue}
            onChange={handleInputChange}
            disabled={isLoading}
            rows="1"
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={isLoading || !inputValue.trim()}
          >
            ➤
          </button>
        </form>

        <div className="controls">
          <button 
            className="control-button" 
            onClick={handleUndo}
            disabled={isLoading || !canUndo}
            title="Undo last change"
          >
            ⬅️ Undo
          </button>
          <button 
            className="control-button" 
            onClick={handleRedo}
            disabled={isLoading || !canRedo}
            title="Redo last change"
          >
            ➡️ Redo
          </button>
          <button 
            className="control-button" 
            onClick={handleReset}
            disabled={isLoading}
          >
            🔄 Reset Room
          </button>
          <button 
            className="control-button" 
            onClick={handleDownload}
            disabled={isLoading}
          >
            💾 Download
          </button>
        </div>

        <div className="example-prompts">
          <h4>Try these examples:</h4>
          {examplePrompts.map((prompt, index) => (
            <button
              key={index}
              className="example-prompt"
              onClick={() => handleExampleClick(prompt)}
              disabled={isLoading}
            >
              {prompt.split(' ').slice(0, 4).join(' ')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;