// frontend/components/MintFormClient.tsx
import React, { useState } from 'react';
import { useAccount, useContractWrite, useWaitForTransaction } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../lib/contract';

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
  const [step, setStep] = useState(1);
  const [tokenURI, setTokenURI] = useState('');

  // Contract write hook
  const { data: txData, write: mintNFT, isLoading: isMintLoading, error: mintError } = useContractWrite({
    mode: 'recklesslyUnprepared',
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'publicMint',
  });

  // Wait for transaction
  const { isLoading: isWaitingForTx, isSuccess: isTxSuccess } = useWaitForTransaction({
    hash: txData?.hash,
  });

  const handlePersonalitySelect = () => {
    setStep(2);
  };

  const handleMint = async () => {

    console.log('Environment URL:', process.env.NEXT_PUBLIC_SERVER_URL);

    if (!isConnected || !address) {
      setStatus('❌ Please connect your wallet first');
      return;
    }

    if (!isConnected || !address) {
      setStatus('❌ Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      setStatus('🔧 Creating agent profile...');

      // Step 1: Create agent profile and get memory_uri
      const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/initAgentProfile`, {
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

      const { memory_uri } = await profileResponse.json();

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
        avatar_seed: Date.now()
      };

      const metadataResponse = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/pinMetadata`, {
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
      const uri = `ipfs://${cid}`;
      setTokenURI(uri);

      setStatus('⛓️ Minting NFT on blockchain...');

      // Step 3: Mint NFT on blockchain
      if (!mintNFT) {
        throw new Error('Contract write function not available');
      }

      mintNFT({
        recklesslySetUnpreparedArgs: [uri]
      });

    } catch (error: any) {
      console.error('Mint error:', error);
      setStatus(`❌ Error: ${error.message || 'Something went wrong'}`);
      setIsLoading(false);
    }
  };

  // Handle transaction states
  React.useEffect(() => {
    if (isMintLoading || isWaitingForTx) {
      setStatus('⛓️ Transaction pending...');
    } else if (isTxSuccess) {
      setStatus('✅ Agent NFT minted successfully!');
      setIsLoading(false);
    } else if (mintError) {
      setStatus(`❌ Transaction failed: ${mintError.message}`);
      setIsLoading(false);
    }
  }, [isMintLoading, isWaitingForTx, isTxSuccess, mintError]);

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
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedPersonality === personality.id
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
            className={`w-full py-3 rounded-lg font-medium text-white ${isConnected
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

          {/* Transaction hash */}
          {txData?.hash && (
            <div className="mb-4 p-3 rounded-lg bg-blue-900 text-blue-200 text-sm">
              Transaction: {txData.hash.slice(0, 10)}...{txData.hash.slice(-8)}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleMint}
              disabled={isLoading || isMintLoading || isWaitingForTx || !isConnected || isTxSuccess}
              className={`w-full py-3 rounded-lg font-medium text-white ${isLoading || isMintLoading || isWaitingForTx
                ? 'bg-gray-600 cursor-not-allowed'
                : isTxSuccess
                  ? 'bg-green-600'
                  : isConnected
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
            >
              {isLoading || isMintLoading || isWaitingForTx
                ? 'Creating Agent...'
                : isTxSuccess
                  ? '✅ Agent Created!'
                  : 'Mint Agent NFT'
              }
            </button>

            <button
              onClick={() => setStep(1)}
              disabled={isLoading || isMintLoading || isWaitingForTx}
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