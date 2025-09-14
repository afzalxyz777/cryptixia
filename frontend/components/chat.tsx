// components/chat.tsx - Enhanced with Voice Response
import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  audio?: AudioResponse;
}

interface AudioResponse {
  type: 'buffer' | 'web_speech';
  data?: number[];
  contentType?: string;
  text?: string;
  voice?: string;
  rate?: number;
  pitch?: number;
}

interface ChatUIProps {
  agentId?: string;
  agentName?: string;
  enableVoice?: boolean;
}

const ChatUI: React.FC<ChatUIProps> = ({
  agentId,
  agentName = "AI Agent",
  enableVoice = true
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(enableVoice);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add initial welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      text: `Hello! I'm ${agentName}. How can I help you today?`,
      sender: 'agent',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [agentName]);

  const addMessage = (text: string, sender: 'user' | 'agent', audio?: AudioResponse) => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random(),
      text,
      sender,
      timestamp: new Date(),
      audio
    };
    setMessages(prev => [...prev, newMessage]);

    // Play audio if available and voice is enabled
    if (audio && voiceEnabled && sender === 'agent') {
      playAudio(audio);
    }
  };

  const playAudio = async (audioResponse: AudioResponse) => {
    try {
      setAudioPlaying(true);

      if (audioResponse.type === 'buffer' && audioResponse.data) {
        // Play buffer audio
        const audioBlob = new Blob([new Uint8Array(audioResponse.data)], {
          type: audioResponse.contentType || 'audio/wav'
        });
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          await audioRef.current.play();
        }
      } else if (audioResponse.type === 'web_speech' && 'speechSynthesis' in window) {
        // Use Web Speech API
        const utterance = new SpeechSynthesisUtterance(audioResponse.text || '');
        if (audioResponse.voice) utterance.voice = speechSynthesis.getVoices().find(v => v.name.includes(audioResponse.voice!)) || null;
        if (audioResponse.rate) utterance.rate = audioResponse.rate;
        if (audioResponse.pitch) utterance.pitch = audioResponse.pitch;

        utterance.onend = () => setAudioPlaying(false);
        speechSynthesis.speak(utterance);
        return; // Don't set audioPlaying to false yet
      }
    } catch (error) {
      console.error('Audio playback error:', error);
    } finally {
      // Only set to false for buffer audio, web speech handles it in onend
      if (audioResponse.type === 'buffer') {
        setAudioPlaying(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    addMessage(userMessage, 'user');
    setIsLoading(true);

    try {
      // Use the TTS-enabled endpoint
      const endpoint = voiceEnabled ? '/api/chat-with-tts' : '/api/chat';

      const requestBody = {
        message: userMessage,
        tokenId: agentId || 'default',
        agentName: agentName,
        sessionId: `session_${agentId || 'default'}`,
        ...(voiceEnabled && {
          ttsConfig: {
            enabled: true,
            voice: 'en_US-amy-medium',
            speed: 1.0
          }
        })
      };

      const response = await fetch(`http://127.0.0.1:3001${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Handle the response with potential audio
      const responseText = data.response || 'Sorry, I encountered an error.';
      const audioData = data.audio || null;

      addMessage(responseText, 'agent', audioData);

      // Log TTS error if present but don't show to user
      if (data.ttsError) {
        console.warn('TTS Error:', data.ttsError);
      }

    } catch (error) {
      console.error('Chat error:', error);
      addMessage('Sorry, I encountered an error. Please try again.', 'agent');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = (transcript: string) => {
    if (transcript.trim()) {
      setInputValue(transcript);
      // Auto-submit voice input
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }, 100);
    }
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (!voiceEnabled && audioPlaying) {
      // Stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
      setAudioPlaying(false);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    setAudioPlaying(false);
  };

  return (
    <div className="flex flex-col h-96 bg-gray-900 rounded-lg border border-gray-700">
      {/* Audio element for playing buffer audio */}
      <audio
        ref={audioRef}
        onEnded={() => setAudioPlaying(false)}
        onError={() => setAudioPlaying(false)}
        style={{ display: 'none' }}
      />

      {/* Voice Status Bar */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Voice Response:</span>
          <button
            onClick={toggleVoice}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${voiceEnabled
                ? 'bg-green-600 text-white'
                : 'bg-gray-600 text-gray-300'
              }`}
          >
            {voiceEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {audioPlaying && (
          <button
            onClick={stopAudio}
            className="flex items-center space-x-1 px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
          >
            <span>🔇</span>
            <span>Stop</span>
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-100'
                }`}
            >
              <div className="flex items-start justify-between">
                <p className="text-sm">{message.text}</p>
                {message.sender === 'agent' && message.audio && voiceEnabled && (
                  <button
                    onClick={() => playAudio(message.audio!)}
                    disabled={audioPlaying}
                    className="ml-2 text-gray-400 hover:text-white disabled:opacity-50"
                    title="Replay audio"
                  >
                    🔊
                  </button>
                )}
              </div>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-200"></div>
              </div>
              {voiceEnabled && (
                <p className="text-xs text-gray-500 mt-1">Generating voice response...</p>
              )}
            </div>
          </div>
        )}

        {audioPlaying && (
          <div className="flex justify-start">
            <div className="bg-blue-700 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
                <span className="text-xs text-blue-200">Playing audio...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </form>

        {/* Voice Input Button */}
        <div className="mt-2 flex justify-between items-center">
          <button
            onClick={() => {
              // Simple voice recognition implementation
              if ('webkitSpeechRecognition' in window) {
                const recognition = new (window as any).webkitSpeechRecognition();
                recognition.lang = 'en-US';
                recognition.onresult = (event: any) => {
                  const transcript = event.results[0][0].transcript;
                  handleVoiceInput(transcript);
                };
                recognition.start();
              } else {
                alert('Speech recognition not supported in this browser');
              }
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            🎤 Voice Input
          </button>

          <div className="text-xs text-gray-500">
            {voiceEnabled ? 'Voice responses enabled' : 'Text only mode'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatUI;