# ChatGPT-like Data Assistant - Implementation Guide

## ✅ COMPLETED (Backend - 100%)

### Files Created:
1. **backend/src/config/metricsRegistry.js** - Metrics registry with OpenAI tool definitions
2. **backend/src/config/assistantPrompt.js** - System prompt for ChatGPT-like behavior
3. **backend/src/services/assistant/chatSessionManager.js** - Session management (30min timeout)
4. **backend/src/services/assistant/toolExecutor.js** - Safe tool execution
5. **backend/src/controllers/chatController.js** - **SSE streaming controller** ⭐
6. **backend/src/routes/assistantRoutes.js** - Updated with `/chat` endpoint

### API Endpoints Ready:
- `POST /api/admin/assistant/chat` - Streaming chat with SSE
- `GET /api/admin/assistant/chat/:sessionId` - Get chat history

---

## 🚧 REMAINING (Frontend)

### Critical Frontend Files Needed:

#### 1. Main Chat Interface
**File:** `src/components/assistant/ChatInterface.js`
```javascript
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './ChatInterface.css';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId] = useState(() => uuidv4());
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n');

        for (const line of lines) {
          if (line.startsWith('event:')) {
            const event = line.slice(6).trim();
            const nextLine = lines[lines.indexOf(line) + 1];
            if (nextLine?.startsWith('data:')) {
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
            }
          }
        }
      }
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
                            <td key={j}>{val}</td>
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
```

#### 2. CSS for Chat Interface
**File:** `src/components/assistant/ChatInterface.css`
```css
.chat-interface {
  display: flex;
  flex-direction: column;
  height: 600px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 12px;
  animation: fadeIn 0.3s;
}

.message.user {
  background: #007bff;
  color: white;
  align-self: flex-end;
  margin-left: auto;
}

.message.assistant {
  background: #f1f3f4;
  color: #333;
  align-self: flex-start;
}

.message-content {
  white-space: pre-wrap;
  line-height: 1.5;
}

.tool-result {
  margin-top: 12px;
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.tool-result table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
  font-size: 14px;
}

.tool-result th,
.tool-result td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.tool-result th {
  background: #f8f9fa;
  font-weight: 600;
}

.typing-indicator {
  padding: 12px 16px;
  background: #f1f3f4;
  border-radius: 12px;
  width: 60px;
  text-align: center;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.chat-input-form {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #eee;
  background: white;
}

.chat-input-form input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
}

.chat-input-form input:focus {
  border-color: #007bff;
}

.chat-input-form button {
  padding: 12px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 24px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.chat-input-form button:hover:not(:disabled) {
  background: #0056b3;
}

.chat-input-form button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

#### 3. Update AdminPage to Use New Chat
**File:** `src/pages/AdminPage.js`
Find where `AssistantChat` is imported and replace with:
```javascript
import ChatInterface from '../components/assistant/ChatInterface';

// Then in the render, replace <AssistantChat /> with:
<ChatInterface />
```

---

## 📦 NPM Dependencies Needed

Add to frontend `package.json`:
```bash
npm install uuid
```

---

## 🚀 How to Test Locally

### 1. Start Backend:
```bash
cd backend
npm run dev
```

### 2. Start Frontend:
```bash
npm start
```

### 3. Test Flow:
1. Login as admin
2. Go to Admin Dashboard
3. Click "Assistant" tab
4. Type: "What's my revenue this month?"
5. Watch streaming response with data tables!

---

## 🔧 Environment Variables

Ensure `.env` has:
```
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
```

---

## 🎯 Key Features Implemented

✅ **Streaming Responses** - Token-by-token like ChatGPT
✅ **Tool Calling** - Automatic metric selection
✅ **Conversation Memory** - 30-minute sessions
✅ **Safety** - Read-only, validated tools
✅ **Date Intelligence** - Smart date parsing
✅ **PII Masking** - Privacy by default
✅ **Clarifying Questions** - Asks when ambiguous
✅ **Follow-up Suggestions** - Contextual next questions

---

## 💰 Cost Estimate

- Backend implementation: ~$0.70 in tokens
- Per chat message: ~$0.001-0.005 (gpt-4o-mini)
- Very affordable for production use!

---

## 🐛 Troubleshooting

### "Event stream not working"
- Check CORS allows SSE
- Ensure `/api/admin/assistant/chat` is accessible
- Verify authentication token in localStorage

### "No streaming, just blank"
- Open browser console
- Check Network tab for `/chat` request
- Look for EventStream connection

### "Tool calls fail"
- Check database connection
- Verify metrics in `assistantTools.js` work
- Check `parseDateShortcut()` handles "all" dates

---

## 🎨 Optional Enhancements

Add later (not critical):
- Export CSV button for tables
- Chart visualization toggle
- "Suggested questions" chips
- Explanation panel (show SQL queries)
- Rate limiting UI feedback
- Voice input
- Dark mode

---

## Next Steps:

1. Create the 3 frontend files above
2. Install `uuid` package
3. Test locally
4. Deploy to AWS (git push, rebuild frontend)
5. Enjoy your ChatGPT-like assistant! 🎉
