"use client";

import { useEffect, useRef, useState } from "react";

type SRConstructor = new () => SpeechRecognition;

interface VoiceButtonProps {
  onSpeechResult?: (transcript: string) => void;
  isDisabled?: boolean;
}

export default function VoiceButton({ onSpeechResult, isDisabled }: VoiceButtonProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SR: SRConstructor | undefined =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SR) return setSupported(false);

    setSupported(true);
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    // ✅ When speech is recognized, call the callback function
    rec.onresult = async (e: SpeechRecognitionEvent) => {
      const text = e.results?.[0]?.[0]?.transcript || "";
      setListening(false);
      
      // If there's a callback (from ChatUI), use it
      if (onSpeechResult) {
        onSpeechResult(text);
      }
    };

    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recRef.current = rec;

    return () => {
      try {
        recRef.current?.stop();
      } catch {}
      recRef.current = null;
    };
  }, [onSpeechResult]);

  const start = () => {
    if (!supported || !recRef.current || isDisabled) return;
    try {
      setListening(true);
      recRef.current.start();
    } catch {
      setListening(false);
    }
  };

  return (
    <button
      onClick={start}
      disabled={!supported || listening || isDisabled}
      className="px-6 py-3 rounded-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold shadow-md"
    >
      {listening ? "🎧 Listening…" : supported ? "🎤 Speak" : "🚫 Not Supported"}
    </button>
  );
}