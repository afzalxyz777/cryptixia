// frontend/components/VoiceButton.tsx
import { useState, useRef } from 'react';

interface VoiceButtonProps {
  onSpeechResult: (text: string) => void;  // When we hear something, tell the parent
  isDisabled?: boolean;
}

export default function VoiceButton({ onSpeechResult, isDisabled = false }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    // Check if browser supports speech recognition (like checking if you have a microphone)
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Sorry! Your browser doesn\'t support voice input 😢');
      return;
    }

    try {
      // Create the speech recognizer (the thing that listens to you)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Set it up like teaching it how to listen
      recognition.continuous = false; // Stop after one sentence
      recognition.interimResults = false; // Only final results
      recognition.lang = 'en-US'; // Listen in English

      // What happens when it hears something
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('Heard:', transcript);
        onSpeechResult(transcript); // Tell the parent what we heard!
        setIsListening(false);
      };

      // What happens when it's done listening
      recognition.onend = () => {
        setIsListening(false);
        console.log('Stopped listening');
      };

      // What happens if there's an error
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(`Oops! ${event.error}`);
        setIsListening(false);
      };

      // Start listening!
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      setError('');

    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setError('Could not start voice input');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      {/* The Magic Voice Button! */}
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={isDisabled}
        className={`
          w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all
          ${isListening 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white' 
            : isDisabled
            ? 'bg-gray-600 cursor-not-allowed text-gray-400'
            : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-105'
          }
        `}
      >
        {isListening ? '🛑' : '🎤'}
      </button>

      {/* Status text */}
      <div className="text-center">
        {isListening ? (
          <p className="text-blue-400 text-sm animate-pulse">
            🎧 Listening... (Click to stop)
          </p>
        ) : (
          <p className="text-gray-400 text-sm">
            Click to speak
          </p>
        )}
        
        {/* Show errors in red */}
        {error && (
          <p className="text-red-400 text-xs mt-1">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}