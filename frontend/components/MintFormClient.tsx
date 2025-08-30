// frontend/components/MintFormClient.tsx
import { useState } from 'react';
import { useAccount } from 'wagmi';

// Personality options from your Day 5 plan
const PERSONALITIES = [
  { 
    id: 'friendly', 
    name: 'Friendly', 
    description: 'Warm and welcoming, loves to chat',
    emoji: '😊',
    color: 'bg-green-500'
  },
  { 
    id: 'pragmatic', 
    name: 'Pragmatic', 
    description: 'Practical and focused on results',
    emoji: '🧠',
    color: 'bg-blue-500'
  },
  { 
    id: 'adventurous', 
    name: 'Adventurous', 
    description: 'Bold and curious about everything',
    emoji: '🚀',
    color: 'bg-orange-500'
  },
  { 
    id: 'cautious', 
    name: 'Cautious', 
    description: 'Careful and thoughtful in decisions',
    emoji: '🛡️',
    color: 'bg-purple-500'
  }
];

function MintFormClient() {
  const { address, isConnected } = useAccount();
  const [selectedPersonality, setSelectedPersonality] = useState(PERSONALITIES[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [step, setStep] = useState(1); // 1: Select personality, 2: Minting process

  const handlePersonalitySelect = () => {
    setStep(2);
  };

  const handleMint = async () => {
    if (!isConnected || !address) {
      setStatus('❌ Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      setStatus('🔧 Creating agent profile...');

      // Step 1: Create agent profile and get memory_uri
      const profileResponse = await fetch('http://localhost:3001/api/initAgentProfile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personality: selectedPersonality
        })
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to create agent profile');
      }

      const { memory_uri, agentProfile } = await profileResponse.json();

      setStatus('📦 Uploading metadata to IPFS...');

      // Step 2: Create and pin metadata to IPFS
      const metadata = {
        name: `Cryptixia Agent #${Date.now()}`,
        description: `A ${selectedPersonality} AI agent ready to learn and grow`,
        personality: selectedPersonality,
        traits: {
          personality: selectedPersonality,
          curious: selectedPersonality === 'adventurous',
          friendly: selectedPersonality === 'friendly',
          cautious: selectedPersonality === 'cautious',
          pragmatic: selectedPersonality === 'pragmatic'
        },
        memory_uri,
        created_at: new Date().toISOString(),
        avatar_seed: Date.now() // For deterministic avatar generation
      };

      const metadataResponse = await fetch('http://localhost:3001/api/pinMetadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata)
      });

      if (!metadataResponse.ok) {
        throw new Error('Failed to pin metadata to IPFS');
      }

      const { cid } = await metadataResponse.json();
      const tokenURI = `ipfs://${cid}`;

      setStatus(`✅ Agent created successfully!`);
      
      // TODO: Tomorrow (Day 6) we'll connect this to the actual smart contract
      console.log('Minting details:', {
        tokenURI,
        personality: selectedPersonality,
        memory_uri,
        cid
      });
      
    } catch (error: any) {
      console.error('Mint error:', error);
      setStatus(`❌ Error: ${error.message || 'Something went wrong'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPersonalityData = PERSONALITIES.find(p => p.id === selectedPersonality);

  if (!selectedPersonalityData) {
    return <div className="text-red-400">Error: Invalid personality selected</div>;
  }

  return (
    <div className="max-w-md mx-auto bg-gray-800 rounded-lg p-6 shadow-lg">
      {step === 1 ? (
        // Step 1: Personality Selection
        <>
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Choose Your Agent's Personality
          </h2>
          
          <div className="space-y-3 mb-6">
            {PERSONALITIES.map((personality) => (
              <div
                key={personality.id}
                onClick={() => setSelectedPersonality(personality.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPersonality === personality.id
                    ? 'border-blue-500 bg-gray-700'
                    : 'border-gray-600 bg-gray-750 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${personality.color} rounded-full flex items-center justify-center text-lg`}>
                    {personality.emoji}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{personality.name}</h3>
                    <p className="text-gray-400 text-sm">{personality.description}</p>
                  </div>
                  {selectedPersonality === personality.id && (
                    <div className="ml-auto text-blue-500">
                      ✓
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handlePersonalitySelect}
            disabled={!isConnected}
            className={`w-full py-3 rounded-lg font-medium text-white ${
              isConnected
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            {isConnected ? 'Continue →' : 'Connect Wallet First'}
          </button>
        </>
      ) : (
        // Step 2: Confirmation and Minting
        <>
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Create Your Agent
          </h2>

          {/* Selected personality preview */}
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 ${selectedPersonalityData.color} rounded-full flex items-center justify-center text-xl`}>
                {selectedPersonalityData.emoji}
              </div>
              <div>
                <h3 className="text-white font-medium">{selectedPersonalityData.name}</h3>
                <p className="text-gray-400 text-sm">{selectedPersonalityData.description}</p>
              </div>
            </div>
          </div>

          {/* Status */}
          {status && (
            <div className="mb-4 p-3 rounded-lg bg-gray-700 text-white text-sm">
              {status}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleMint}
              disabled={isLoading || !isConnected}
              className={`w-full py-3 rounded-lg font-medium text-white ${
                isLoading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : isConnected
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-600 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Creating Agent...' : 'Mint Agent NFT'}
            </button>

            <button
              onClick={() => setStep(1)}
              disabled={isLoading}
              className="w-full py-2 rounded-lg font-medium text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500"
            >
              ← Change Personality
            </button>
          </div>

          {!isConnected && (
            <p className="text-red-400 text-sm text-center mt-4">
              Please connect your wallet to continue
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default MintFormClient;