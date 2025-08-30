"use client";

import { useEffect, useRef, useState } from "react";

// Complete type declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: 'no-speech' | 'aborted' | 'audio-capture' | 'network' | 'not-allowed' | 'service-not-allowed' | 'bad-grammar' | 'language-not-supported';
  message?: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface VoiceButtonProps {
  onResponse?: (msg: string) => void;
}

export default function VoiceButton({ onResponse }: VoiceButtonProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [lastUserText, setLastUserText] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string>("");
  const recRef = useRef<SpeechRecognitionInstance | null>(null);

  // Shorten long replies
  const shorten = (s: string, n = 200) => (s.length > n ? s.slice(0, n).trim() + "…" : s);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      setError("Speech recognition not supported in this browser");
      return;
    }

    setSupported(true);
    setError("");

    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onstart = () => {
      console.log("Speech recognition started");
      setError("");
    };

    rec.onresult = async (e: SpeechRecognitionEvent) => {
      const text = e.results?.[0]?.[0]?.transcript || "";
      console.log("Speech recognized:", text);
      setLastUserText(text);
      setListening(false);

      if (!text.trim()) {
        setError("No speech detected. Please try again.");
        return;
      }

      try {
        const res = await fetch("http://localhost:3001/api/huggingface/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, context: [] }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        const modelReply = data.response || data.reply || "No response received";
        setReply(shorten(String(modelReply)));

        if (onResponse) onResponse(String(modelReply));
      } catch (err: any) {
        console.error("API Error:", err);
        const errorMsg = `API Error: ${err?.message || "Request failed"}`;
        setReply(shorten(errorMsg));
        setError("Failed to get AI response. Make sure the server is running on port 3001.");
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event);
      setListening(false);

      const errorMessages: { [key: string]: string } = {
        'no-speech': 'No speech detected. Please speak clearly and try again.',
        'audio-capture': 'Microphone access error. Please check permissions.',
        'not-allowed': 'Microphone permission denied. Please allow microphone access.',
        'network': 'Network error. Please check your connection.',
        'service-not-allowed': 'Speech service not allowed. Try a different browser.',
        'bad-grammar': 'Speech not recognized. Please try again.',
        'language-not-supported': 'Language not supported.',
        'aborted': 'Speech recognition was aborted.'
      };

      const errorMsg = errorMessages[event.error] || `Speech error: ${event.error}`;
      setError(errorMsg);

      // Auto-clear error after 5 seconds
      setTimeout(() => setError(""), 5000);
    };

    rec.onend = () => {
      console.log("Speech recognition ended");
      setListening(false);
    };

    recRef.current = rec;

    return () => {
      try {
        recRef.current?.stop();
      } catch (e) {
        console.log("Cleanup error:", e);
      }
      recRef.current = null;
    };
  }, [onResponse]);

  const start = () => {
    if (!supported || !recRef.current) {
      setError("Speech recognition not available");
      return;
    }

    try {
      setReply("");
      setLastUserText("");
      setError("");
      setListening(true);
      recRef.current.start();
    } catch (err: any) {
      console.error("Start error:", err);
      setListening(false);
      setError("Failed to start speech recognition");
    }
  };

  const stop = () => {
    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch (err) {
        console.log("Stop error:", err);
      }
    }
    setListening(false);
  };

  return (
    <div className="mt-6 w-full max-w-xl">
      <div className="flex gap-3">
        <button
          onClick={start}
          disabled={!supported || listening}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white flex-1"
        >
          {listening ? "🎤 Listening..." : supported ? "🎙️ Speak" : "Speech not supported"}
        </button>

        {listening && (
          <button
            onClick={stop}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white"
          >
            ⏹️ Stop
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-900/50 border border-red-600 text-red-200 text-sm">
          <span className="font-semibold">⚠️ Error:</span> {error}
        </div>
      )}

      {/* User Speech */}
      {lastUserText && (
        <div className="mt-3 text-sm text-gray-300">
          <span className="font-semibold">You:</span> {lastUserText}
        </div>
      )}

      {/* AI Reply */}
      {reply && (
        <div className="mt-2 p-3 rounded-lg bg-gray-800 text-sm text-gray-100 break-words">
          <span className="font-semibold text-blue-400">🤖 AI:</span> {reply}
        </div>
      )}

      {/* Help Text */}
      {supported && !listening && !error && (
        <div className="mt-3 text-xs text-gray-400 text-center">
          Click the button and speak clearly. Make sure microphone permissions are enabled.
        </div>
      )}
    </div>
  );
}