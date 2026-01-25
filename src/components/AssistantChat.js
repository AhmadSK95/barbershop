import React, { useState, useRef, useEffect } from 'react';
import AssistantMessage from './AssistantMessage';
import { assistantAPI } from '../services/api';
import { toast } from 'react-toastify';
import './AssistantChat.css';

const AssistantChat = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m your data assistant. Ask me questions about your barbershop data, like "What\'s my revenue this month?" or "Show me top performing barbers".',
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableMetrics, setAvailableMetrics] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Fetch available metrics on mount
    loadMetrics();
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMetrics = async () => {
    try {
      const response = await assistantAPI.getMetrics();
      if (response.success) {
        setAvailableMetrics(response.data.metrics);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call the assistant API
      const response = await assistantAPI.query(userMessage.content);
      
      if (response.success) {
        const assistantMessage = {
          role: 'assistant',
          content: response.message || 'Here are the results:',
          data: response.data,
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(response.message || 'Query failed');
      }
    } catch (error) {
      console.error('Error querying assistant:', error);
      
      const errorMessage = {
        role: 'assistant',
        content: `❌ Error: ${error.response?.data?.message || error.message || 'Failed to process your question'}`,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to get response');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleQuickQuestion = (question) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const faqQuestions = [
    { emoji: '💰', question: "What is revenue numbers for the month of January 2026" },
    { emoji: '⭐', question: "Show me top performing barbers" },
    { emoji: '📊', question: "What's my no-show rate?" },
    { emoji: '📈', question: "Show me booking status breakdown" },
    { emoji: '✂️', question: "Which services are most popular?" },
    { emoji: '👥', question: "How many customers this month?" },
    { emoji: '💵', question: "Average transaction value" },
    { emoji: '🎯', question: "Busiest day of the week" },
  ];

  return (
    <div className="assistant-chat">
      <div className="chat-header">
        <div className="chat-header-content">
          <h2>🤖 Data Assistant</h2>
          <p className="chat-subtitle">
            Ask questions about your business data in natural language
          </p>
        </div>
        {availableMetrics.length > 0 && (
          <div className="metrics-count">
            {availableMetrics.length} metrics available
          </div>
        )}
      </div>

      <div className="chat-messages">
        {messages.map((message, index) => (
          <AssistantMessage key={index} message={message} />
        ))}
        
        {loading && (
          <div className="assistant-message assistant loading-message">
            <div className="message-header">
              <span className="message-role">🤖 Assistant</span>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="loading-text">Analyzing your question...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="faq-section">
        <div className="faq-header">
          <h3>📋 Frequently Asked Questions</h3>
          <p className="faq-subtitle">Click any question below or type your own</p>
        </div>
        <div className="faq-grid">
          {faqQuestions.map((item, index) => (
            <button
              key={index}
              className="faq-btn"
              onClick={() => handleQuickQuestion(item.question)}
              disabled={loading}
            >
              <span className="faq-emoji">{item.emoji}</span>
              <span className="faq-text">{item.question}</span>
            </button>
          ))}
        </div>
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="chat-input-container">
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="Ask a question about your data..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            className="chat-submit-btn"
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <span className="btn-spinner">⏳</span>
            ) : (
              <span className="btn-icon">➤</span>
            )}
          </button>
        </div>
        <div className="chat-input-hint">
          💡 Tip: Ask specific questions like "revenue last 30 days" or "top 5 barbers this week"
        </div>
      </form>
    </div>
  );
};

export default AssistantChat;
