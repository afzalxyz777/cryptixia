import { useState, useEffect, useRef } from 'react';
import VoiceButton from './VoiceButton';

interface ChatMessage {
  id: number;
  text: string;
  isUser: boolean; // true if you said it, false if agent said it
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add a welcome message when chat starts
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 1,
      text: `Hi! I'm ${agentName}. You can type to me or use the microphone to speak! 😊`,
      isUser: false,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [agentName]);

  // Function to store conversation as memory (non-blocking)
  const storeMemory = async (agentId: string, text: string): Promise<boolean> => {
    try {
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://127.0.0.1:3001';
      const response = await fetch(`${serverUrl}/api/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          text
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.warn('Memory storage failed:', result.error);
        return false;
      }
      
      console.log('Memory stored successfully:', result);
      return true;
    } catch (error) {
      console.warn('Failed to store memory:', error);
      return false; // Don't break the chat if memory fails
    }
  };

  // Function to make the computer talk (Text-to-Speech)
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8; // Speak a bit slower
      utterance.pitch = 1.1; // Slightly higher pitch
      window.speechSynthesis.speak(utterance);
    }
  };

  // Send message to the AI agent
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    // Add your message to the chat
    const userMessage: ChatMessage = {
      id: Date.now(),
      text: messageText,
      isUser: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setTextInput(''); // Clear the input
    setIsAgentTyping(true); // Show "agent is typing..."

    try {
      // Use the correct server URL - 127.0.0.1:3001
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://127.0.0.1:3001';
      const response = await fetch(`${serverUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          tokenId: agentId,
          agentName: agentName,
          context: []
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const agentResponse = data.response || data.reply || "I heard you, but I'm not sure how to respond!";

      // Add agent's response to chat
      const agentMessage: ChatMessage = {
        id: Date.now() + 1,
        text: agentResponse,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMessage]);

      // Store the conversation as memory (non-blocking - don't await)
      storeMemory(agentId, `User: ${messageText}\nAgent: ${agentResponse}`).then(success => {
        if (!success) {
          console.log('Memory storage failed, but chat completed successfully');
        }
      });

      // Make the agent speak the response!
      speakText(agentResponse);

    } catch (error) {
      console.error('Chat error:', error);

      // Provide helpful fallback response
      const fallbackResponses = [
        "I'm having some connection issues, but I'm still here to chat! 🤖",
        "The server might be starting up. I can still respond though!",
        "Connection hiccup! But I'm listening. What else would you like to talk about?",
        "I'm having trouble connecting to my brain, but I'm still here! 😊"
      ];

      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        text: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);

      // Speak the error message too
      speakText(errorMessage.text);
    } finally {
      setIsAgentTyping(false);
    }
  };

  // When voice button gets speech result
  const handleVoiceInput = (transcript: string) => {
    console.log('Voice input received:', transcript);
    sendMessage(transcript);
  };

  // When user types and presses Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(textInput);
    }
  };

  // Clear chat history
  const clearChat = () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      setMessages([{
        id: 1,
        text: `Chat cleared! Hi, I'm ${agentName}. How can I help you?`,
        isUser: false,
        timestamp: new Date()
      }]);
    }
  };

  return (
    <div className="flex flex-col h-96 bg-gray-800 rounded-lg border border-gray-600">
      {/* Chat Header */}
      <div className="bg-gray-700 px-4 py-3 rounded-t-lg border-b border-gray-600 flex justify-between items-center">
        <div>
          <h3 className="text-white font-medium">Chat with {agentName}</h3>
          <p className="text-xs text-gray-400">Agent ID: {agentId}</p>
        </div>
        <button
          onClick={clearChat}
          className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
          title="Clear chat history"
        >
          🗑️ Clear
        </button>
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
                ? 'bg-blue-600 text-white'  // Your messages in blue
                : 'bg-gray-600 text-white'  // Agent messages in gray
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
                <span>{agentName} is thinking</span>
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invisible div to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-600 p-4">
        <div className="flex items-center space-x-3">
          {/* Text Input */}
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
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

        {/* Voice Input and Status */}
        <div className="mt-3 flex justify-between items-center">
          <div className="flex justify-center flex-1">
            <VoiceButton
              onSpeechResult={handleVoiceInput}
              isDisabled={isAgentTyping}
            />
          </div>
          
          {/* Memory Status Indicator */}
          <div className="text-xs text-gray-400 flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1"></span>
            Memory: Active
          </div>
        </div>
      </div>
    </div>
  );
}