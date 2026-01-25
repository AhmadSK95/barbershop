import React, { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';

// Generate simple UUID
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId] = useState(() => generateUUID());
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    const token = localStorage.getItem('token');
    const apiUrl = process.env.REACT_APP_API_URL || '/api';

    try {
      const response = await fetch(`${apiUrl}/admin/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId,
          message: input
        })
      });

      if (!response.ok) throw new Error('Failed to connect');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let assistantMessage = {
        role: 'assistant',
        content: '',
        toolCalls: [],
        toolResults: [],
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          if (line.startsWith('event:')) {
            const event = line.slice(6).trim();
            const nextLine = lines[i + 1];
            
            if (nextLine && nextLine.startsWith('data:')) {
              try {
                const data = JSON.parse(nextLine.slice(5).trim());

                if (event === 'token') {
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1].content += data.content;
                    return updated;
                  });
                }

                if (event === 'tool_calls_start') {
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1].toolCalls = data.tools;
                    return updated;
                  });
                }

                if (event === 'tool_result') {
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1].toolResults.push(data);
                    return updated;
                  });
                }

                if (event === 'complete') {
                  setIsStreaming(false);
                }

                if (event === 'error') {
                  console.error('Stream error:', data);
                  setIsStreaming(false);
                }
              } catch (err) {
                console.error('Parse error:', err);
              }
            }
          }
        }
      }

      setIsStreaming(false);

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      }]);
      setIsStreaming(false);
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
            {msg.toolResults?.map((result, ridx) => (
              <div key={ridx} className="tool-result">
                <strong>📊 {result.toolName}</strong>
                {result.success && result.data?.rows && (
                  <table>
                    <thead>
                      <tr>
                        {Object.keys(result.data.rows[0] || {}).map(key => (
                          <th key={key}>{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.rows.slice(0, 10).map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((val, j) => (
                            <td key={j}>{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        ))}
        {isStreaming && <div className="typing-indicator">●●●</div>}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your business data..."
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
