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
      <div 
        className="flex flex-col items-center justify-center h-screen px-6 text-center"
        style={{ background: 'linear-gradient(90deg, #4b6cb7 0%, #182848 100%)' }}
      >
        <div className="text-white">Loading mint page...</div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col items-center min-h-screen px-6 py-12"
      style={{ background: 'linear-gradient(90deg, #4b6cb7 0%, #182848 100%)' }}
    >
      <h1 className="text-3xl font-bold text-white mb-8 text-center">Mint Your AI Agent NFT</h1>
      
      {/* Mint Form Section */}
      <div className="w-full max-w-2xl">
        <MintForm />
      </div>

      {/* Voice Input Section */}
      <div className="w-full max-w-2xl mt-10">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-semibold text-white">Voice Command</h2>
          <p className="text-gray-300 text-sm mt-1">
            Use your voice to interact with the minting process
          </p>
        </div>
        
        <div className="flex justify-center">
          <VoiceButton onSpeechResult={handleVoiceInput} />
        </div>

        {response && (
          <div className="mt-4 p-4 rounded-xl bg-gray-700/80 text-white text-left">
            <h2 className="font-semibold mb-2">🤖 AI Response:</h2>
            <pre className="text-sm whitespace-pre-wrap">{response}</pre>
          </div>
        )}
      </div>
      
      {/* Back to Home Link */}
      <a 
        href="/" 
        className="mt-10 text-gray-300 hover:text-white transition-colors flex items-center"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Home
      </a>
    </div>
  );
}