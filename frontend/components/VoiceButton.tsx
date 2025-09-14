"use client";

import { useEffect, useRef, useState } from "react";

type SRConstructor = new () => SpeechRecognition;

interface VoiceButtonProps {
  onSpeechResult?: (transcript: string) => void;
  isDisabled?: boolean;
  variant?: 'default' | 'compact' | 'floating';
  theme?: 'dark' | 'light' | 'gradient';
  showWaveform?: boolean;
}

export default function VoiceButton({
  onSpeechResult,
  isDisabled,
  variant = 'default',
  theme = 'gradient',
  showWaveform = true
}: VoiceButtonProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const recRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SR: SRConstructor | undefined =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SR) return setSupported(false);

    setSupported(true);

    // ✅ Define extended interface only once here
    interface SpeechRecognitionWithEvents extends SpeechRecognition {
      onstart: (() => void) | null;
      onresult: ((event: SpeechRecognitionEvent) => void) | null;
      onend: (() => void) | null;
      onerror: ((event: any) => void) | null;
    }

    // ✅ Explicitly cast to extended type
    const rec = new SR() as SpeechRecognitionWithEvents;

    rec.lang = "en-US";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onresult = async (e: SpeechRecognitionEvent) => {
      const results = Array.from(e.results);
      const transcript = results.map(result => result[0].transcript).join('');

      if (e.results[0].isFinal) {
        const finalTranscript = e.results[0][0].transcript;
        const confidence = e.results[0][0].confidence;

        console.log('Final speech recognized:', finalTranscript, 'Confidence:', confidence);

        setTranscript(finalTranscript);
        setConfidence(confidence);
        setListening(false);

        if (onSpeechResult) onSpeechResult(finalTranscript);

        setTimeout(() => {
          setTranscript('');
          setConfidence(0);
        }, 3000);
      } else {
        setTranscript(transcript);
      }
    };

    rec.onerror = (event) => {
      console.error('Speech recognition error:', event);
      setListening(false);
      setTranscript('');
    };

    rec.onstart = () => {
      console.log('Speech recognition started');
      setListening(true);
    };

    rec.onend = () => {
      console.log('Speech recognition ended');
      setListening(false);
    };

    recRef.current = rec;

    return () => {
      try {
        recRef.current?.stop();
      } catch { }
      recRef.current = null;
    };
  }, [onSpeechResult]);


  const start = () => {
    if (!supported || !recRef.current || isDisabled || listening) return;

    try {
      console.log('Starting speech recognition...');
      setTranscript('');
      setConfidence(0);
      recRef.current.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setListening(false);
    }
  };

  const stop = () => {
    if (recRef.current && listening) {
      try {
        recRef.current.stop();
      } catch (error) {
        console.error('Failed to stop speech recognition:', error);
      }
    }
  };

  // Theme configurations
  const themes = {
    dark: {
      button: `bg-gray-800 hover:bg-gray-700 border-gray-600 text-white`,
      listening: `bg-purple-600 border-purple-500`,
      disabled: `bg-gray-600 opacity-50`,
      transcript: `bg-gray-800/80 text-white border-gray-600`
    },
    light: {
      button: `bg-white hover:bg-gray-50 border-gray-300 text-gray-800`,
      listening: `bg-purple-100 border-purple-300 text-purple-800`,
      disabled: `bg-gray-200 opacity-50`,
      transcript: `bg-white/90 text-gray-800 border-gray-300`
    },
    gradient: {
      button: `bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-transparent text-white`,
      listening: `bg-gradient-to-r from-green-500 to-emerald-500 border-transparent animate-pulse`,
      disabled: `bg-gray-600 opacity-50`,
      transcript: `bg-white/10 backdrop-blur-sm text-white border-white/20`
    }
  };

  const currentTheme = themes[theme];

  // Variant configurations
  const getButtonClasses = () => {
    const baseClasses = "relative transition-all duration-300 font-medium shadow-lg border-2 flex items-center justify-center";

    switch (variant) {
      case 'compact':
        return `${baseClasses} px-4 py-2 rounded-lg text-sm`;
      case 'floating':
        return `${baseClasses} w-16 h-16 rounded-full fixed bottom-6 right-6 z-50 shadow-2xl`;
      default:
        return `${baseClasses} px-6 py-3 rounded-xl text-base`;
    }
  };

  const getButtonContent = () => {
    if (variant === 'floating') {
      return listening ? "🎧" : supported ? "🎤" : "🚫";
    }

    if (listening) {
      return (
        <div className="flex items-center">
          <div className="flex space-x-1 mr-3">
            {showWaveform && [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-current rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 12 + 8}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.8s'
                }}
              />
            ))}
          </div>
          <span>Listening...</span>
        </div>
      );
    }

    if (!supported) {
      return variant === 'compact' ? "🚫" : "🚫 Not Supported";
    }

    return (
      <div className="flex items-center">
        <span className="mr-2">🎤</span>
        <span>{variant === 'compact' ? 'Speak' : 'Start Voice Input'}</span>
      </div>
    );
  };

  return (
    <div className="relative">
      <button
        onClick={listening ? stop : start}
        disabled={!supported || isDisabled}
        className={`
          ${getButtonClasses()}
          ${listening
            ? currentTheme.listening
            : isDisabled || !supported
              ? currentTheme.disabled
              : currentTheme.button
          }
        `}
        title={listening ? "Click to stop" : "Click to start voice input"}
      >
        {getButtonContent()}

        {/* Listening pulse effect */}
        {listening && (
          <div className="absolute inset-0 rounded-full bg-current opacity-20 animate-ping"></div>
        )}
      </button>

      {/* Transcript Display */}
      {transcript && variant !== 'floating' && (
        <div className={`
          absolute top-full left-0 right-0 mt-2 p-3 rounded-lg border backdrop-blur-sm z-10
          ${currentTheme.transcript}
        `}>
          <div className="text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium opacity-75">Transcript:</span>
              {confidence > 0 && (
                <span className="text-xs opacity-60">
                  {Math.round(confidence * 100)}% confident
                </span>
              )}
            </div>
            <div className="italic">"{transcript}"</div>
          </div>
        </div>
      )}

      {/* Voice visualization for floating variant */}
      {listening && variant === 'floating' && showWaveform && (
        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 flex items-end space-x-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-2 bg-white/60 rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 30 + 10}px`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '0.6s'
              }}
            />
          ))}
        </div>
      )}

      {/* Status indicator for floating variant */}
      {variant === 'floating' && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className={`
            px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm
            ${listening
              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
              : 'bg-white/10 text-white/70 border border-white/20'
            }
          `}>
            {listening ? 'Listening...' : 'Voice Ready'}
          </div>
        </div>
      )}
    </div>
  );
}