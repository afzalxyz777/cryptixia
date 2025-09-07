// frontend/components/ChatUI.tsx - FIXED VERSION for Day 10 Integration
import { useState, useEffect, useRef } from 'react';
import VoiceButton from './VoiceButton';

interface ChatMessage {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatUIProps {
  agentId: string;
  agentName: string;
}

export default function ChatUI({ agentId, agentName }: ChatUIProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Test server connection on mount
  useEffect(() => {
    testServerConnection();
  }, []);

  // Add a welcome message when chat starts
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 1,
      text: `Hi! I'm ${agentName}. I'm powered by AI and can remember our conversations. You can type to me or use the microphone to speak!`,
      isUser: false,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [agentName]);

  // Test server connection - FIX: Use consistent env var and multiple endpoints
  const testServerConnection = async () => {
    try {
      // FIX: Use consistent environment variable
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';
      
      // Try multiple test endpoints based on your server structure
      const testEndpoints = [
        `/api/huggingface/test`,
        `/api/openai`,
        `/api/chat`,
        `/health` // Generic health check
      ];

      let connected = false;
      for (const endpoint of testEndpoints) {
        try {
          const response = await fetch(`${serverUrl}${endpoint}`, {
            method: 'GET',
            mode: 'cors',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            setConnectionStatus('connected');
            console.log(`✅ Server connection successful via ${endpoint}`);
            connected = true;
            break;
          }
        } catch (error) {
          console.warn(`Failed to connect via ${endpoint}:`, error);
        }
      }

      if (!connected) {
        throw new Error('All connection attempts failed');
      }
    } catch (error) {
      console.error('❌ Server connection failed:', error);
      setConnectionStatus('error');
    }
  };

  // Function to make the computer talk (Text-to-Speech) - FIX: Add error handling
  const speakText = (text: string) => {
    if ('speechSynthesis' in window && text.trim()) {
      try {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
        utterance.volume = 0.8;
        
        utterance.onerror = (event) => {
          console.warn('Speech synthesis error:', event);
        };
        
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.warn('Text-to-speech failed:', error);
      }
    }
  };

  // Store message in memory - FIX: Use consistent endpoint naming
  const storeInMemory = async (text: string, messageType: 'user_message' | 'ai_response') => {
    try {
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';
      
      // Try multiple possible endpoint patterns
      const memoryEndpoints = [
        `/api/embeddings/upsert`,
        `/api/embeddings`,
        `/api/memories`
      ];

      for (const endpoint of memoryEndpoints) {
        try {
          const response = await fetch(`${serverUrl}${endpoint}`, {
            method: 'POST',
            mode: 'cors',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: agentId,
              agentId: agentId,
              tokenId: agentId,
              text: text,
              message: text, // Some endpoints might expect 'message'
              metadata: {
                type: messageType,
                timestamp: new Date().toISOString(),
                agentId: agentId
              }
            })
          });

          if (response.ok) {
            console.log(`✅ Memory stored successfully via ${endpoint}`);
            return;
          }
        } catch (error) {
          console.warn(`Memory storage failed via ${endpoint}:`, error);
        }
      }
      
      console.warn('⚠️ All memory storage attempts failed');
    } catch (error) {
      console.warn('⚠️ Memory storage error:', error);
    }
  };

  // Retrieve relevant memories for context - FIX: Use consistent endpoint naming
  const getRelevantMemories = async (queryText: string) => {
    try {
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';
      
      // Try multiple possible endpoint patterns
      const queryEndpoints = [
        `/api/embeddings/query`,
        `/api/listMemories?tokenId=${agentId}&topK=3`,
        `/api/memories?query=${encodeURIComponent(queryText)}`
      ];

      for (const endpoint of queryEndpoints) {
        try {
          const response = await fetch(`${serverUrl}${endpoint}`, {
            method: endpoint.includes('?') ? 'GET' : 'POST',
            mode: 'cors',
            headers: {
              'Content-Type': 'application/json',
            },
            ...(endpoint.includes('?') ? {} : {
              body: JSON.stringify({
                userId: agentId,
                tokenId: agentId,
                queryText: queryText,
                topK: 3
              })
            })
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`📝 Retrieved memories via ${endpoint}:`, data.results?.length || data.memories?.length || 0);
            return data.results || data.memories || [];
          }
        } catch (error) {
          console.warn(`Memory retrieval failed via ${endpoint}:`, error);
        }
      }
      
      console.warn('⚠️ All memory retrieval attempts failed');
      return [];
    } catch (error) {
      console.warn('⚠️ Memory retrieval error:', error);
      return [];
    }
  };

  // Send message to the AI agent - MAIN FUNCTION - FIX: Multiple endpoint support
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    // Add your message to the chat immediately
    const userMessage: ChatMessage = {
      id: Date.now(),
      text: messageText,
      isUser: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setTextInput('');
    setIsAgentTyping(true);

    try {
      console.log('🚀 Sending message to AI:', messageText);

      // STEP 1: Store user message in memory (async, don't wait)
      storeInMemory(messageText, 'user_message');

      // STEP 2: Get memories for context (async, but wait for it)
      const memories = await getRelevantMemories(messageText);

      // STEP 3: Send to AI API - FIX: Try multiple possible endpoints
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';
      
      // Try different AI endpoints in order of preference
      const aiEndpoints = [
        `/api/chat`,
        `/api/openai`,
        `/api/huggingface/chat`
      ];

      let aiResponse = '';
      let endpointUsed = '';

      for (const endpoint of aiEndpoints) {
        try {
          const requestBody = {
            message: messageText,
            text: messageText,
            agentId: agentId,
            tokenId: agentId,
            agentName: agentName,
            context: memories.map((mem: any) => mem.text).slice(0, 2), // Use top 2 memories
            memories: memories.slice(0, 2) // Alternative format
          };

          console.log(`📤 Trying endpoint ${endpoint}:`, requestBody);

          const response = await fetch(`${serverUrl}${endpoint}`, {
            method: 'POST',
            mode: 'cors',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(requestBody)
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Received AI response from ${endpoint}:`, data);

            // Extract the actual AI response - try multiple possible field names
            aiResponse = data.reply || data.response || data.ai_response || data.answer || data.message;
            endpointUsed = endpoint;
            break;
          } else {
            console.warn(`❌ ${endpoint} failed with status:`, response.status);
          }
        } catch (error) {
          console.warn(`❌ ${endpoint} error:`, error);
        }
      }

      if (!aiResponse || aiResponse.trim().length === 0) {
        throw new Error('No valid AI response received from any endpoint');
      }

      // Add AI's response to chat
      const agentMessage: ChatMessage = {
        id: Date.now() + 1,
        text: aiResponse,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMessage]);

      // STEP 4: Store AI reply in memory
      storeInMemory(aiResponse, 'ai_response');

      // STEP 5: Make the agent speak!
      speakText(aiResponse);

      // Update connection status
      setConnectionStatus('connected');
      console.log(`✅ Successfully used endpoint: ${endpointUsed}`);

    } catch (error) {
      console.error('💥 Chat error:', error);
      setConnectionStatus('error');

      // Provide specific error messages with troubleshooting tips
      let errorResponse = "I'm having trouble connecting to my AI brain. ";
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorResponse += "The server might be down. Check if your server is running on port 3001.";
      } else if (error instanceof Error) {
        if (error.message.includes('CORS')) {
          errorResponse += "There's a CORS issue. Make sure your server allows requests from this domain.";
        } else if (error.message.includes('404')) {
          errorResponse += "The AI endpoint wasn't found. Your server might be missing some API routes.";
        } else if (error.message.includes('No valid AI response')) {
          errorResponse += "I connected but didn't get a proper response. Check server logs for AI service issues.";
        } else {
          errorResponse += `Error details: ${error.message}`;
        }
      }

      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        text: errorResponse,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);

    } finally {
      setIsAgentTyping(false);
    }
  };

  // When voice button gets speech result
  const handleVoiceInput = (transcript: string) => {
    console.log('🎤 Voice input received:', transcript);
    sendMessage(transcript);
  };

  // When user types and presses Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(textInput);
    }
  };

  // Connection status indicator
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-400';
      case 'error': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'AI Connected';
      case 'error': return 'Connection Error';
      default: return 'Connecting...';
    }
  };

  return (
    <div className="flex flex-col h-96 bg-gray-800 rounded-lg border border-gray-600">
      {/* Chat Header */}
      <div className="bg-gray-700 px-4 py-3 rounded-t-lg border-b border-gray-600">
        <h3 className="text-white font-medium">Chat with {agentName}</h3>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Agent ID: {agentId} • AI with Memory</p>
          <div className="flex items-center space-x-2">
            <p className={`text-xs ${getStatusColor()}`}>
              {getStatusText()}
            </p>
            {connectionStatus === 'error' && (
              <button
                onClick={testServerConnection}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg text-sm ${message.isUser
                ? 'bg-blue-600 text-white'
                : 'bg-gray-600 text-white'
                }`}
            >
              {message.text}
              <div className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {/* "Agent is typing..." indicator */}
        {isAgentTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm">
              <div className="flex items-center space-x-1">
                <span>{agentName} is thinking...</span>
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-600 p-4">
        {/* Connection warning */}
        {connectionStatus === 'error' && (
          <div className="mb-3 p-2 bg-red-900 text-red-200 rounded text-xs">
            ⚠️ Connection issue detected. Check if server is running on port 3001. Try refreshing or check console for details.
          </div>
        )}

        <div className="flex items-center space-x-3">
          {/* Text Input */}
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={connectionStatus === 'connected' ? 
              "Ask me anything! I can remember our conversation..." : 
              "Waiting for AI connection..."
            }
            disabled={isAgentTyping}
            className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />

          {/* Send Button */}
          <button
            onClick={() => sendMessage(textInput)}
            disabled={!textInput.trim() || isAgentTyping}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Send
          </button>
        </div>

        {/* Voice Input */}
        <div className="mt-3 flex justify-center">
          <VoiceButton
            onSpeechResult={handleVoiceInput}
            isDisabled={isAgentTyping || connectionStatus === 'error'}
          />
        </div>

        {/* Debug info for Day 10 testing */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            Server: {process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'} | 
            Agent: {agentId} | Status: {connectionStatus}
          </div>
        )}
      </div>
    </div>
  );
}