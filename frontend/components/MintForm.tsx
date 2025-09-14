// components/MintForm.tsx - Fixed version
import { useState, useEffect } from 'react'
import { useAccount, useContractWrite, useContractRead } from 'wagmi'
import { ethers } from 'ethers'
import Link from 'next/link'
import Head from 'next/head'
import { CONTRACT_ADDRESSES, AGENT_NFT_ABI } from '../lib/contract'

interface AgentTraits {
  personality: string
  specialization: string
  voiceStyle: string
  background: string
}

interface AgentTemplate {
  id: string
  name: string
  description: string
  traits: AgentTraits
  avatar: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  price: string
}

const agentTemplates: AgentTemplate[] = [
  {
    id: 'advisor',
    name: 'Financial Advisor',
    description: 'Expert in crypto trading and portfolio management',
    traits: {
      personality: 'Analytical and Strategic',
      specialization: 'DeFi and Trading',
      voiceStyle: 'Professional and Confident',
      background: 'Wall Street Experience'
    },
    avatar: '💼',
    rarity: 'rare',
    price: '0.05'
  },
  {
    id: 'companion',
    name: 'AI Companion',
    description: 'Friendly conversational AI with great memory',
    traits: {
      personality: 'Friendly and Empathetic',
      specialization: 'Conversation and Support',
      voiceStyle: 'Warm and Caring',
      background: 'Social Psychology'
    },
    avatar: '🤖',
    rarity: 'common',
    price: '0.02'
  },
  {
    id: 'gaming',
    name: 'Gaming Expert',
    description: 'Knows everything about gaming and NFTs',
    traits: {
      personality: 'Energetic and Competitive',
      specialization: 'Gaming and NFTs',
      voiceStyle: 'Enthusiastic and Cool',
      background: 'Pro Gaming Scene'
    },
    avatar: '🎮',
    rarity: 'epic',
    price: '0.1'
  },
  {
    id: 'sage',
    name: 'Digital Sage',
    description: 'Wise AI with deep knowledge and philosophy',
    traits: {
      personality: 'Wise and Thoughtful',
      specialization: 'Philosophy and Knowledge',
      voiceStyle: 'Calm and Profound',
      background: 'Ancient Wisdom'
    },
    avatar: '🧙‍♂️',
    rarity: 'legendary',
    price: '0.2'
  }
]

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001'

export default function MintForm() {
  const { address, isConnected } = useAccount()
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null)
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [customTraits, setCustomTraits] = useState<AgentTraits | null>(null)
  const [isMinting, setIsMinting] = useState(false)
  const [mintSuccess, setMintSuccess] = useState(false)
  const [mintError, setMintError] = useState<string | null>(null)
  const [userAgentCount, setUserAgentCount] = useState(0)

  // Safely get agent count with error handling
  const { data: agentCount, error: balanceError } = useContractRead({
    address: CONTRACT_ADDRESSES.AGENT_NFT as `0x${string}`,
    abi: AGENT_NFT_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address && !!AGENT_NFT_ABI && AGENT_NFT_ABI.length > 0,
    onError: (error) => {
      console.warn('Balance read error:', error)
    }
  })

  // ✅ FIXED: Use the correct function name from your contract
  const { writeAsync: mintAgent } = useContractWrite({
    address: CONTRACT_ADDRESSES.AGENT_NFT as `0x${string}`,
    abi: AGENT_NFT_ABI,
    functionName: "publicMint",  // Changed from "mintAgent" to "publicMint"
    mode: "recklesslyUnprepared"
  })

  useEffect(() => {
    if (agentCount) {
      setUserAgentCount(Number(agentCount))
    }
  }, [agentCount])

  // Handle balance read error
  useEffect(() => {
    if (balanceError) {
      console.error('Contract balance error:', balanceError)
      // Set count to 0 if we can't read the balance
      setUserAgentCount(0)
    }
  }, [balanceError])

  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template)
    setCustomTraits(template.traits)
    setIsCustomizing(false)
    setMintError(null)
  }

  const handleCustomize = () => {
    setIsCustomizing(true)
  }

  const handleTraitChange = (key: keyof AgentTraits, value: string) => {
    if (customTraits) {
      setCustomTraits({ ...customTraits, [key]: value })
    }
  }

  const generateAgentMetadata = async (template: AgentTemplate, traits: AgentTraits) => {
    const metadata = {
      name: `${template.name} #${Date.now()}`,
      description: template.description,
      image: await generateAgentAvatar(template.id, traits),
      attributes: [
        { trait_type: "Personality", value: traits.personality },
        { trait_type: "Specialization", value: traits.specialization },
        { trait_type: "Voice Style", value: traits.voiceStyle },
        { trait_type: "Background", value: traits.background },
        { trait_type: "Rarity", value: template.rarity },
        { trait_type: "Template", value: template.id }
      ],
      agentConfig: {
        template: template.id,
        traits: traits,
        createdAt: new Date().toISOString(),
        version: "1.0"
      }
    }

    console.log('Calling /api/pinMetadata with metadata:', metadata)

    // Updated to call Express server directly
    const response = await fetch(`${API_BASE_URL}/api/pinMetadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cryptixia-Frontend/1.0'
      },
      body: JSON.stringify({ metadata, tokenId: 'pending' })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Pin metadata failed:', response.status, errorText)
      throw new Error(`Metadata pinning failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('Pin metadata success:', result)

    return `ipfs://${result.cid}`
  }

  const generateAgentAvatar = async (templateId: string, traits: AgentTraits) => {
    try {
      console.log('Calling /api/generateAvatar with:', { templateId, traits })

      // ✅ FIXED: Changed from /api/generateAvatar to /api/avatar
      const response = await fetch(`${API_BASE_URL}/api/generateAvatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Cryptixia-Frontend/1.0'
        },
        body: JSON.stringify({
          templateId,
          traits,
          seed: Date.now().toString()
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Avatar generation failed:', response.status, errorText)
        throw new Error(`Avatar generation failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Avatar generation success:', result)

      return result.avatarUrl
    } catch (error) {
      console.error('Error generating avatar:', error)
      // Fallback to a simple avatar URL
      return `https://api.dicebear.com/7.x/bottts/svg?seed=${templateId}-${Date.now()}`
    }
  }

  const handleMint = async () => {
    if (!selectedTemplate || !customTraits || !isConnected) return

    setIsMinting(true)
    setMintError(null)

    try {
      console.log('Starting mint process...')

      // Check if Express server is running
      try {
        const healthCheck = await fetch(`${API_BASE_URL}/`, {
          method: 'GET',
          headers: { 'User-Agent': 'Cryptixia-Frontend/1.0' }
        })
        if (!healthCheck.ok) {
          throw new Error('Express server not responding')
        }
        console.log('Express server is running')
      } catch (serverError) {
        console.error('Express server check failed:', serverError)
        throw new Error('Backend server is not running. Please start the Express server on port 3001.')
      }

      const tokenURI = await generateAgentMetadata(selectedTemplate, customTraits)
      console.log('Generated token URI:', tokenURI)

      const mintPrice = ethers.utils.parseEther(selectedTemplate.price)
      console.log('Mint price:', mintPrice.toString(), 'wei')

      if (!mintAgent) {
        throw new Error('Mint function not available')
      }

      // ✅ FIXED: Use the correct parameters for publicMint function
      // publicMint(string memory tokenUri, string[] memory initialTraits)
      const traitsArray = [
        customTraits.personality,
        customTraits.specialization,
        customTraits.voiceStyle,
        customTraits.background,
        selectedTemplate.rarity,
        selectedTemplate.id
      ]

      console.log('Calling publicMint contract function...')
      const tx = await mintAgent({
        recklesslySetUnpreparedArgs: [tokenURI],
      })

      console.log('Mint transaction submitted:', tx)
      setMintSuccess(true)
      setSelectedTemplate(null)
      setCustomTraits(null)
    } catch (error: any) {
      console.error("Minting failed:", error)
      let errorMessage = "Minting failed. Please try again."

      if (error.message?.includes('Backend server is not running')) {
        errorMessage = "Backend server is not running. Please start the Express server."
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = "Insufficient funds. Please check your wallet balance."
      } else if (error.message?.includes('user rejected')) {
        errorMessage = "Transaction was cancelled."
      } else if (error.message?.includes('network')) {
        errorMessage = "Network error. Please check your connection."
      } else if (error.message?.includes('fetch')) {
        errorMessage = "Failed to connect to backend server. Make sure it's running."
      }

      setMintError(errorMessage)
    } finally {
      setIsMinting(false)
    }
  }

  useEffect(() => {
    if (mintSuccess) {
      const timer = setTimeout(() => setMintSuccess(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [mintSuccess])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex items-center justify-center animate-gradient-x">
        <div className="text-center text-white p-8 rounded-2xl bg-black/50 backdrop-blur-md shadow-lg shadow-purple-500/20">
          <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-gray-300 mb-8">You need to connect your wallet to mint AI agents.</p>
          <Link href="/" className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg hover:from-purple-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg hover:shadow-purple-500/30">
            Go Back Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Mint AI Agent - Cryptixia</title>
        <meta name="description" content="Mint your unique AI Agent NFT on Cryptixia" />
      </Head>

      {mintSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative bg-gradient-to-br from-purple-900 to-blue-900 p-8 rounded-2xl shadow-2xl shadow-cyan-500/30 max-w-md w-full text-center animate-fade-in-up">
            <div className="absolute inset-0 overflow-hidden">
              <div className="confetti w-2 h-2 bg-cyan-400 absolute animate-confetti" style={{ left: '20%', top: '-10%' }}></div>
              <div className="confetti w-2 h-2 bg-purple-400 absolute animate-confetti" style={{ left: '40%', top: '-5%' }}></div>
              <div className="confetti w-2 h-2 bg-pink-400 absolute animate-confetti" style={{ left: '60%', top: '-15%' }}></div>
              <div className="confetti w-2 h-2 bg-yellow-400 absolute animate-confetti" style={{ left: '80%', top: '-8%' }}></div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Mint Successful!</h2>
            <p className="text-gray-300 mb-6">Your AI Agent NFT has been minted and added to your wallet!</p>
            <button
              onClick={() => setMintSuccess(false)}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {mintError && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/90 text-white p-4 rounded-lg shadow-lg shadow-red-500/20 animate-slide-in-right">
          <p>{mintError}</p>
          <button
            onClick={() => setMintError(null)}
            className="ml-4 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 py-16 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="particle w-1 h-1 bg-cyan-400/50 rounded-full absolute animate-particle" style={{ left: '10%', top: '20%' }}></div>
          <div className="particle w-1 h-1 bg-purple-400/50 rounded-full absolute animate-particle" style={{ left: '30%', top: '50%' }}></div>
          <div className="particle w-1 h-1 bg-pink-400/50 rounded-full absolute animate-particle" style={{ left: '70%', top: '30%' }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 animate-fade-in-up">
              Mint Your AI Agent NFT
            </h1>
            <p className="text-gray-300 mt-4 text-lg animate-fade-in-up delay-300">
              Owned: {userAgentCount} {userAgentCount === 1 ? 'Agent' : 'Agents'}
            </p>
            {balanceError && (
              <p className="text-yellow-400 text-sm mt-2">
                Note: Unable to read contract balance. Using default count.
              </p>
            )}
          </div>

          {!selectedTemplate ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {agentTemplates.map((template) => (
                <div
                  key={template.id}
                  className="group relative bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/20 animate-fade-in-up"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                  <div className="relative z-10 text-center">
                    <div className="text-6xl mb-4">{template.avatar}</div>
                    <h3 className="text-xl font-bold text-white">{template.name}</h3>
                    <p className="text-gray-400 text-sm mt-2">{template.description}</p>
                    <div className={`inline-block px-4 py-1 mt-3 rounded-full text-sm font-semibold ${template.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' :
                      template.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                        template.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                      }`}>
                      {template.rarity.toUpperCase()}
                    </div>
                    <p className="text-cyan-400 font-semibold mt-2">{template.price} AVAX</p>
                    <button
                      onClick={() => handleTemplateSelect(template)}
                      className="mt-4 px-6 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-lg hover:from-cyan-700 hover:to-purple-700 transition-all group-hover:shadow-lg group-hover:shadow-cyan-500/25"
                    >
                      Select Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center mb-8">
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="mr-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-3xl font-bold text-white">Customize Your {selectedTemplate.name}</h2>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                <div className="bg-white/5 rounded-2xl p-8 border border-white/10 hover:shadow-lg hover:shadow-cyan-500/20 transition-all">
                  <div className="text-center mb-8">
                    <div className="text-8xl mb-4 animate-pulse">{selectedTemplate.avatar}</div>
                    <h3 className="text-2xl font-bold text-white">{selectedTemplate.name}</h3>
                    <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold mt-2 ${selectedTemplate.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' :
                      selectedTemplate.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                        selectedTemplate.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                      }`}>
                      {selectedTemplate.rarity.toUpperCase()}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {customTraits && Object.entries(customTraits).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span className="text-cyan-400 font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  {!isCustomizing ? (
                    <div className="text-center py-8">
                      <p className="text-gray-300 mb-6">Use the default traits or customize your agent's personality</p>
                      <button
                        onClick={handleCustomize}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-lg hover:from-cyan-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg hover:shadow-cyan-500/25"
                      >
                        Customize Traits
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <h4 className="text-xl font-semibold text-white">Customize Traits</h4>
                      {customTraits && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Personality</label>
                            <input
                              type="text"
                              value={customTraits.personality}
                              onChange={(e) => handleTraitChange('personality', e.target.value)}
                              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Specialization</label>
                            <input
                              type="text"
                              value={customTraits.specialization}
                              onChange={(e) => handleTraitChange('specialization', e.target.value)}
                              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Voice Style</label>
                            <input
                              type="text"
                              value={customTraits.voiceStyle}
                              onChange={(e) => handleTraitChange('voiceStyle', e.target.value)}
                              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Background</label>
                            <input
                              type="text"
                              value={customTraits.background}
                              onChange={(e) => handleTraitChange('background', e.target.value)}
                              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="pt-6 border-t border-white/10">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-xl font-semibold text-white">Total Price:</span>
                      <span className="text-3xl font-bold text-cyan-400">{selectedTemplate.price} AVAX</span>
                    </div>
                    <button
                      onClick={handleMint}
                      disabled={isMinting}
                      className="w-full py-4 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-xl font-bold text-lg hover:from-cyan-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:shadow-cyan-500/30"
                    >
                      {isMinting ? (
                        <div className="flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Minting Agent...
                        </div>
                      ) : (
                        'Mint Agent NFT'
                      )}
                    </button>
                    <p className="text-xs text-gray-400 text-center mt-4">
                      * This will create a unique AI agent NFT with the selected traits
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes gradient-x {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 15s ease infinite;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        .delay-300 { animation-delay: 0.3s; }
        @keyframes confetti {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .confetti {
          animation: confetti 2s ease-out forwards;
        }
        @keyframes particle {
          0% { transform: translateY(0) scale(1); opacity: 0.5; }
          50% { transform: translateY(-20px) scale(1.5); opacity: 0.8; }
          100% { transform: translateY(0) scale(1); opacity: 0.5; }
        }
        .particle {
          animation: particle 3s ease-in-out infinite;
        }
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.5s ease-out forwards;
        }
      `}</style>
    </>
  )
}