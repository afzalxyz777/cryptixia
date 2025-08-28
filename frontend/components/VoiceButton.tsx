"use client";

import { useEffect, useRef, useState } from "react";

type SRConstructor = new () => SpeechRecognition;

export default function VoiceButton() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [lastUserText, setLastUserText] = useState("");
  const [reply, setReply] = useState("");
  const recRef = useRef<SpeechRecognition | null>(null);

  // Shorten long model replies to keep UI tidy
  const shorten = (s: string, n = 200) => (s.length > n ? s.slice(0, n).trim() + "…" : s);

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

    rec.onresult = async (e: SpeechRecognitionEvent) => {
      const text = e.results?.[0]?.[0]?.transcript || "";
      setLastUserText(text);
      setListening(false);

      try {
        const res = await fetch("http://localhost:3001/api/huggingface/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        // If backend throws HTML/error, avoid JSON parse crash
        const raw = await res.text();
        let data: any = {};
        try {
          data = JSON.parse(raw);
        } catch {
          data = { reply: raw };
        }

        const modelReply = typeof data === "string" ? data : (data.reply ?? raw);
        setReply(shorten(String(modelReply)));
      } catch (err: any) {
        setReply(shorten(`Error: ${err?.message || "request failed"}`));
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
  }, []);

  const start = () => {
    if (!supported || !recRef.current) return;
    try {
      setReply("");
      setLastUserText("");
      setListening(true);
      recRef.current.start();
    } catch {
      setListening(false);
    }
  };

  return (
    <div className="mt-6 w-full max-w-xl">
      <button
        onClick={start}
        disabled={!supported || listening}
        className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white"
      >
        {listening ? "Listening…" : supported ? "🎙️ Speak" : "Speech not supported"}
      </button>

      {lastUserText && (
        <div className="mt-3 text-sm text-gray-300">
          <span className="font-semibold">You:</span> {lastUserText}
        </div>
      )}
      {reply && (
        <div className="mt-2 p-3 rounded-lg bg-gray-800 text-sm text-gray-100 break-words">
          {reply}
        </div>
      )}
    </div>
  );
}
