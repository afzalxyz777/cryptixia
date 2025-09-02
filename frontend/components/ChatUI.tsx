// frontend/components/ChatUI.tsx (Robust version with actual AI responses)
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
      text: `Hi! I'm ${agentName}. I'm powered by HuggingFace AI models. You can type to me or use the microphone to speak!`,
      isUser: false,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [agentName]);

  // Test server connection
  const testServerConnection = async () => {
    try {
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://127.0.0.1:3001';
      const response = await fetch(`${serverUrl}/api/huggingface/test`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setConnectionStatus('connected');
        console.log('✅ Server connection successful');
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Server connection failed:', error);
      setConnectionStatus('error');
    }
  };

  // Function to make the computer talk (Text-to-Speech)
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1.1;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Store message in memory (with better error handling)
  const storeInMemory = async (text: string, messageType: 'user_message' | 'ai_response') => {
    try {
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://127.0.0.1:3001';
      const response = await fetch(`${serverUrl}/api/embeddings/upsert`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: agentId,
          text: text,
          metadata: {
            type: messageType,
            timestamp: new Date().toISOString(),
            agentId: agentId
          }
        })
      });

      if (response.ok) {
        console.log('✅ Memory stored successfully');
      } else {
        console.warn('⚠️ Memory storage failed:', response.statusText);
      }
    } catch (error) {
      console.warn('⚠️ Memory storage error:', error);
    }
  };

  // Retrieve relevant memories for context
  const getRelevantMemories = async (queryText: string) => {
    try {
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://127.0.0.1:3001';
      const response = await fetch(`${serverUrl}/api/embeddings/query`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: agentId,
          queryText: queryText,
          topK: 3
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📝 Retrieved memories:', data.results?.length || 0);
        return data.results || [];
      } else {
        console.warn('⚠️ Memory retrieval failed:', response.statusText);
        return [];
      }
    } catch (error) {
      console.warn('⚠️ Memory retrieval error:', error);
      return [];
    }
  };

  // Send message to the AI agent - MAIN FUNCTION
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
      console.log('🚀 Sending message to HuggingFace AI:', messageText);

      // STEP 1: Store user message in memory (async, don't wait)
      storeInMemory(messageText, 'user_message');

      // STEP 2: Get memories for context (async, don't wait)
      const memories = await getRelevantMemories(messageText);

      // STEP 3: Send to HuggingFace API
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://127.0.0.1:3001';
      
      const requestBody = {
        message: messageText,
        text: messageText, // HuggingFace route expects both
        agentId: agentId,
        agentName: agentName,
        context: memories.map((mem: any) => mem.text).slice(0, 2) // Use top 2 memories
      };

      console.log('📤 Sending request:', requestBody);

      const response = await fetch(`${serverUrl}/api/huggingface/chat`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Received AI response:', data);

      // Extract the actual AI response
      const aiResponse = data.reply || data.response || data.ai_response;
      
      if (!aiResponse || aiResponse.trim().length === 0) {
        throw new Error('Empty response from AI');
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

    } catch (error) {
      console.error('💥 Chat error:', error);
      setConnectionStatus('error');

      // Provide specific error messages based on the error type
      let errorResponse = "I'm having trouble connecting to my AI brain.";
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorResponse = "I can't reach my AI server right now. Is the server running on port 3001?";
      } else if (error instanceof Error) {
        if (error.message.includes('CORS')) {
          errorResponse = "There's a connection issue (CORS error). The server might need a restart.";
        } else if (error.message.includes('404')) {
          errorResponse = "The AI endpoint isn't found. Let me check if the server is properly configured.";
        } else if (error.message.includes('Empty response')) {
          errorResponse = "I got connected but the AI didn't have anything to say. That's unusual!";
        }
      }

      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        text: errorResponse,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);

      // Don't speak error messages automatically
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
          <p className="text-xs text-gray-400">Agent ID: {agentId} • HuggingFace AI</p>
          <p className={`text-xs ${getStatusColor()}`}>
            {getStatusText()}
          </p>
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
                <span>{agentName} is thinking with AI...</span>
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
            ⚠️ Connection issue detected. Responses may be limited. Try refreshing or check if server is running.
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
              "Ask me anything! I'm powered by real AI..." : 
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
      </div>
    </div>
  );
}