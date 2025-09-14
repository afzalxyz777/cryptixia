import { useState, useEffect } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import Image from 'next/image'
import { useAccount, useNetwork } from 'wagmi'
import WalletConnector from '../components/WalletConnector'
import UserAgents from '../components/UserAgents'
import { Monoton } from 'next/font/google'

const monoton = Monoton({
  subsets: ['latin'],
  weight: '400',
})

export default function HomePage() {
  const { address, isConnected } = useAccount()
  const { chain } = useNetwork()
  const [emailSubmitted, setEmailSubmitted] = useState(false)
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showVoiceCommands, setShowVoiceCommands] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500)
    return () => clearTimeout(timer)
  }, [])

  const handleEmailSubmit = async (e: any) => {
    e.preventDefault()
    if (!email || !email.includes('@')) return

    try {
      setEmailSubmitted(true)
      setEmail('')
      setTimeout(() => setEmailSubmitted(false), 5000)
    } catch (error) {
      console.error('Failed to submit email:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-6"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-purple-500/30 border-b-purple-500 rounded-full animate-spin animate-reverse"></div>
          </div>
          <div className={`${monoton.className} text-2xl text-white mb-2`}>CRYPTIXIA</div>
          <div className="text-cyan-300 text-sm animate-pulse">Loading the future...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Cryptixia - AI Agents You Own</title>
        <meta name="description" content="Create and own AI agents as NFTs. Voice-controlled crypto operations with intelligent conversation." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-x-hidden relative">
        {/* Enhanced Animated Background */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-teal-900/30"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,119,198,0.4)_0%,transparent_60%)] animate-pulse"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,119,198,0.3)_0%,transparent_60%)] animate-pulse delay-700"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_40%,rgba(120,219,255,0.2)_0%,transparent_60%)] animate-pulse delay-1000"></div>

          {/* Floating particles */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${5 + Math.random() * 10}s`
                }}
              />
            ))}
          </div>
        </div>

        {/* Enhanced Navigation */}
        <nav className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-2xl border-b border-white/10 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <div className={`${monoton.className} text-2xl bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent`}>
                  CRYPTIXIA
                </div>
              </div>

              <div className="hidden md:flex items-center space-x-8">
                <a href="#home" className="text-gray-300 hover:text-cyan-400 transition-all duration-300 font-medium">Home</a>
                <a href="#features" className="text-gray-300 hover:text-cyan-400 transition-all duration-300 font-medium">Features</a>
                <a href="#agents" className="text-gray-300 hover:text-cyan-400 transition-all duration-300 font-medium">My Agents</a>
              </div>

              <div className="flex items-center space-x-4">
                {isConnected ? (
                  <div className="flex items-center space-x-3 bg-green-500/20 border border-green-500/30 px-4 py-2 rounded-full">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-300 text-sm font-medium">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                    <span className="text-xs text-green-400">{chain?.name}</span>
                  </div>
                ) : (
                  <WalletConnector />
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Enhanced Hero Section */}
        <section id="home" className="relative z-10 min-h-screen flex items-center justify-center pt-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="animate-fade-in-up">
              <div className="mb-6 inline-flex items-center bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 rounded-full px-6 py-3">
                <span className="text-2xl mr-3">🤖</span>
                <span className="text-purple-300 font-semibold">AI Agents You Actually Own</span>
              </div>

              <h1 className={`${monoton.className} text-6xl md:text-8xl font-black mb-6 bg-gradient-to-r from-white via-cyan-200 to-purple-300 bg-clip-text text-transparent leading-tight`}>
                CRYPTIXIA
              </h1>

              <h2 className="text-2xl md:text-4xl font-light mb-6 text-gray-200 animate-fade-in-up delay-300">
                AI agents you own. Voice-controlled crypto transfers. The future of personal AI.
              </h2>

              <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-3xl mx-auto animate-fade-in-up delay-500 leading-relaxed">
                Create unique AI personalities as NFTs. Chat with voice and memory. Execute crypto operations with natural speech.
              </p>

              {/* Network & Address Info */}
              {isConnected && (
                <div className="text-gray-200 text-sm text-center bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 max-w-md mx-auto mb-8 border border-gray-700">
                  <p>Network: {chain?.name || 'No chain detected'}</p>
                  <p className="font-mono">
                    Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                </div>
              )}
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
              <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced Action Cards */}
        <section id="features" className="relative z-10 py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Your AI-Powered Journey
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {/* Mint Agent Card */}
              <Link href="/mint">
                <div className="group relative bg-gradient-to-br from-purple-500/10 to-pink-600/10 hover:from-purple-500/20 hover:to-pink-600/20 transition-all duration-500 rounded-3xl shadow-2xl p-6 flex flex-col items-center cursor-pointer border border-purple-500/20 hover:border-purple-400/50 hover:transform hover:scale-105">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10 text-center">
                    <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <span className="text-3xl">🎭</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Mint Agent NFT</h3>
                    <p className="text-purple-300 text-sm">Create your personal AI companion</p>
                  </div>
                </div>
              </Link>

              {/* Voice Transfer Demo Card */}
              <Link href="/demo">
                <div className="group relative bg-gradient-to-br from-green-500/10 to-emerald-600/10 hover:from-green-500/20 hover:to-emerald-600/20 transition-all duration-500 rounded-3xl shadow-2xl p-6 flex flex-col items-center cursor-pointer border border-green-500/20 hover:border-green-400/50 hover:transform hover:scale-105">
                  <div className="relative z-10 text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <span className="text-3xl">🎤</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Voice Transfer Demo</h3>
                    <p className="text-green-300 text-sm">Send crypto with your voice</p>
                  </div>
                </div>
              </Link>

              {/* View Agent Card */}
              <Link href="/agent/1">
                <div className="group relative bg-gradient-to-br from-blue-500/10 to-cyan-600/10 hover:from-blue-500/20 hover:to-cyan-600/20 transition-all duration-500 rounded-3xl shadow-2xl p-6 flex flex-col items-center cursor-pointer border border-blue-500/20 hover:border-blue-400/50 hover:transform hover:scale-105">
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                    LIVE!
                  </div>
                  <div className="relative z-10 text-center">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <span className="text-3xl">💬</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Chat with Agent</h3>
                    <p className="text-blue-300 text-sm">Experience AI conversation</p>
                  </div>
                </div>
              </Link>

              {/* Coming Soon Card */}
              <div className="group relative bg-gradient-to-br from-gray-600/10 to-gray-700/10 rounded-3xl shadow-2xl p-6 flex flex-col items-center opacity-60 cursor-not-allowed border border-gray-500/20">
                <div className="relative z-10 text-center">
                  <div className="w-16 h-16 bg-gray-600/20 rounded-full flex items-center justify-center mb-4">
                    <span className="text-3xl">🏪</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-300 mb-2">Marketplace</h3>
                  <p className="text-gray-500 text-sm">Coming Soon</p>
                </div>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-gray-700/50">
              <h2 className="text-2xl font-bold text-white mb-8 text-center">
                What You Can Do
              </h2>
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="flex flex-col items-center">
                  <div className="mb-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-6 rounded-2xl border border-purple-500/30">
                    <span className="text-4xl">🎭</span>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">Mint AI Agents</h3>
                  <p className="text-gray-400 text-sm">
                    Create unique AI personalities as NFTs with custom traits and capabilities
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="mb-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-6 rounded-2xl border border-blue-500/30">
                    <span className="text-4xl">💬</span>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">Voice Chat</h3>
                  <p className="text-gray-400 text-sm">
                    Talk to your agents with voice commands and persistent memory
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="mb-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-6 rounded-2xl border border-green-500/30">
                    <span className="text-4xl">🚀</span>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">Voice Transfers</h3>
                  <p className="text-gray-400 text-sm">
                    Send cryptocurrency with natural voice commands
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced Voice Commands Section */}
        <section className="relative z-10 py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div
              className="group bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 transition-all duration-500 rounded-3xl shadow-2xl p-8 border border-purple-500/20 hover:border-purple-400/50 cursor-pointer backdrop-blur-sm"
              onClick={() => setShowVoiceCommands(!showVoiceCommands)}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <span className="text-4xl mr-4">🎤</span>
                  <div>
                    <h3 className="text-3xl font-bold text-white">Voice Command Center</h3>
                    <p className="text-purple-300">Control your crypto with natural speech</p>
                  </div>
                </div>
                <svg
                  className={`w-8 h-8 text-white transform transition-transform duration-300 ${showVoiceCommands ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {showVoiceCommands && (
                <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
                  <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-6">
                    <h4 className="text-yellow-200 font-bold text-xl mb-4 flex items-center">
                      <span className="mr-2">💸</span>
                      Transfer Commands
                    </h4>
                    <div className="space-y-3">
                      <div className="bg-yellow-500/10 rounded-lg p-3 font-mono text-yellow-100 text-sm">
                        "Send 0.01 AVAX to [address]"
                      </div>
                      <div className="bg-yellow-500/10 rounded-lg p-3 font-mono text-yellow-100 text-sm">
                        "Check my balance"
                      </div>
                      <div className="bg-yellow-500/10 rounded-lg p-3 font-mono text-yellow-100 text-sm">
                        "Transfer 100 USDC to alice.avax"
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6">
                    <h4 className="text-green-200 font-bold text-xl mb-4 flex items-center">
                      <span className="mr-2">🤖</span>
                      AI Commands
                    </h4>
                    <div className="space-y-3">
                      <div className="bg-green-500/10 rounded-lg p-3 font-mono text-green-100 text-sm">
                        "What's my wallet balance"
                      </div>
                      <div className="bg-green-500/10 rounded-lg p-3 font-mono text-green-100 text-sm">
                        "Remember my name is Alice"
                      </div>
                      <div className="bg-green-500/10 rounded-lg p-3 font-mono text-green-100 text-sm">
                        "Tell me about crypto prices"
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* User's Minted Agents Section */}
        <section id="agents" className="relative z-10 py-20">
          <div className="max-w-7xl mx-auto px-4">
            <UserAgents />
          </div>
        </section>

        {/* Enhanced Footer */}
        <footer className="relative z-10 py-12 border-t border-white/10 bg-black/40 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-8">
              <div className={`${monoton.className} text-2xl bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4`}>
                CRYPTIXIA
              </div>
              <p className="text-gray-400 text-sm max-w-2xl mx-auto">
                The future of personal AI. Own intelligent agents as NFTs, control them with voice, and experience the next generation of human-AI interaction.
              </p>
            </div>

            <div className="text-center">
              <p className="text-gray-500 text-xs mb-2">
                Built with Wagmi, RainbowKit, and Avalanche Fuji testnet
              </p>
              <p className="text-gray-600 text-xs">
                Powered by Next.js • Tailwind CSS • TypeScript
              </p>
            </div>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out forwards;
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        
        .animate-float {
          animation: float linear infinite;
        }
        
        .delay-300 {
          animation-delay: 0.3s;
        }
        
        .delay-500 {
          animation-delay: 0.5s;
        }
        
        .delay-700 {
          animation-delay: 0.7s;
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #06b6d4, #8b5cf6);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #0891b2, #7c3aed);
        }
      `}</style>
    </>
  )
}