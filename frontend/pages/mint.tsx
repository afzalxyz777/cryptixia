// pages/mint.tsx
import { useEffect, useState } from "react";
import MintForm from "../components/MintForm";
import VoiceButton from "../components/VoiceButton";

export default function MintPage() {
  const [mounted, setMounted] = useState(false);
  const [response, setResponse] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle voice input
  const handleVoiceInput = async (transcript: string) => {
    console.log("Voice input received:", transcript);
    setResponse(`You said: "${transcript}"`);

    // Optional: Send to AI for processing
    try {
      const aiResponse = await fetch('http://localhost:3001/api/huggingface/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript })
      });

      if (aiResponse.ok) {
        const data = await aiResponse.json();
        setResponse(data.reply || data.response || "AI received your message!");
      }
    } catch (error) {
      console.error("Error sending to AI:", error);
      setResponse(`Voice recognized: "${transcript}" (AI processing failed)`);
    }
  };

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
        <div className="text-white">Loading mint page...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 px-6 text-center">
      <h1 className="text-3xl font-bold text-white mb-6">Mint Page</h1>

      {/* Mint NFT */}
      <MintForm />

      {/* Voice Input */}
      <div className="mt-8 w-full max-w-md">
        <VoiceButton onSpeechResult={handleVoiceInput} />

        {response && (
          <div className="mt-4 p-4 rounded-xl bg-gray-800 text-white shadow text-left">
            <h2 className="font-semibold mb-2">🤖 AI Response:</h2>
            <pre className="text-sm whitespace-pre-wrap">{response}</pre>
          </div>
        )}
      </div>
    </div>
  );
}