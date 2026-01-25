/**
 * Streaming Chat Controller
 * Handles ChatGPT-like conversations with SSE streaming
 */

const OpenAI = require('openai');
const { getSession } = require('../services/assistant/chatSessionManager');
const { generateOpenAITools } = require('../config/metricsRegistry');
const { SYSTEM_PROMPT } = require('../config/assistantPrompt');
const { executeToolCalls, formatToolResultsForOpenAI } = require('../services/assistant/toolExecutor');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * Chat endpoint with streaming SSE
 * @route POST /api/admin/assistant/chat
 * @access Private (Admin only)
 */
const streamChat = async (req, res) => {
  const { sessionId, message, revealPII = false } = req.body;
  const userId = req.user.id;

  if (!sessionId || !message) {
    return res.status(400).json({
      success: false,
      message: 'sessionId and message are required'
    });
  }

  try {
    // Get or create session
    const session = getSession(sessionId, userId);
    
    // Add user message to session
    session.addMessage('user', message);

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Helper to send SSE events
    const sendEvent = (event, data) => {
      res.write(`event: ${event}\\n`);
      res.write(`data: ${JSON.stringify(data)}\\n\\n`);
    };

    // Build conversation history
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...session.getConversationHistory()
    ];

    // Get available tools
    const tools = generateOpenAITools();

    let fullResponse = '';
    let toolCalls = [];
    let finishReason = null;

    try {
      // Stream from OpenAI
      const stream = await openai.chat.completions.create({
        model: MODEL,
        messages,
        tools,
        tool_choice: 'auto',
        stream: true,
        temperature: 0.7,
        max_tokens: 1000
      });

      // Process stream
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (!delta) continue;

        // Handle content tokens
        if (delta.content) {
          fullResponse += delta.content;
          sendEvent('token', { content: delta.content });
        }

        // Handle tool calls
        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const index = toolCall.index;
            
            if (!toolCalls[index]) {
              toolCalls[index] = {
                id: toolCall.id || `call_${index}`,
                type: 'function',
                function: {
                  name: '',
                  arguments: ''
                }
              };
            }

            if (toolCall.function?.name) {
              toolCalls[index].function.name = toolCall.function.name;
            }

            if (toolCall.function?.arguments) {
              toolCalls[index].function.arguments += toolCall.function.arguments;
            }
          }
        }

        // Check finish reason
        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason;
        }
      }

      // If tool calls were made, execute them
      if (toolCalls.length > 0) {
        // Notify frontend that tools are starting
        sendEvent('tool_calls_start', { 
          tools: toolCalls.map(tc => ({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments || '{}')
          }))
        });

        // Execute tools
        const toolResults = await executeToolCalls(toolCalls, revealPII);

        // Send tool results to frontend
        for (const result of toolResults) {
          sendEvent('tool_result', {
            toolCallId: result.toolCallId,
            toolName: result.toolName,
            success: result.success,
            data: result.success ? result.result : null,
            error: result.error || null
          });
        }

        // Add assistant message with tool calls to session
        session.addMessage('assistant', fullResponse, toolCalls, null);

        // Format tool results for OpenAI
        const toolMessages = formatToolResultsForOpenAI(toolResults);
        
        // Add tool result messages to session history
        for (const toolMessage of toolMessages) {
          session.addMessage('tool', toolMessage.content, null, toolMessage.tool_call_id);
        }

        // Continue conversation with tool results
        const followUpMessages = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...session.getConversationHistory(),
          {
            role: 'assistant',
            content: fullResponse || null,
            tool_calls: toolCalls
          },
          ...toolMessages
        ];

        // Stream follow-up response
        const followUpStream = await openai.chat.completions.create({
          model: MODEL,
          messages: followUpMessages,
          stream: true,
          temperature: 0.7,
          max_tokens: 1000
        });

        let followUpResponse = '';

        for await (const chunk of followUpStream) {
          const delta = chunk.choices[0]?.delta;
          
          if (delta?.content) {
            followUpResponse += delta.content;
            sendEvent('token', { content: delta.content });
          }
        }

        // Add follow-up response to session
        session.addMessage('assistant', followUpResponse);

        // Send completion event
        sendEvent('complete', {
          fullResponse: followUpResponse,
          toolCalls: toolCalls.map(tc => tc.function.name),
          toolResults: toolResults.map(tr => ({
            tool: tr.toolName,
            success: tr.success,
            rowCount: tr.result?.rowCount || 0
          }))
        });

      } else {
        // No tool calls - just a regular response
        session.addMessage('assistant', fullResponse);
        
        sendEvent('complete', {
          fullResponse,
          toolCalls: [],
          toolResults: []
        });
      }

      res.end();

    } catch (streamError) {
      console.error('Streaming error:', streamError);
      sendEvent('error', {
        message: 'Failed to generate response',
        details: streamError.message
      });
      res.end();
    }

  } catch (error) {
    console.error('Chat error:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to process chat message'
      });
    }
    
    res.end();
  }
};

/**
 * Get chat session history
 * @route GET /api/admin/assistant/chat/:sessionId
 * @access Private (Admin only)
 */
const getChatHistory = async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  try {
    const session = getSession(sessionId, userId);
    
    res.json({
      success: true,
      data: {
        sessionId,
        messages: session.getMessages(),
        context: session.getContext(),
        messageCount: session.messages.length
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  streamChat,
  getChatHistory
};
