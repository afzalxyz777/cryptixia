// pages/chat.tsx
import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import Head from 'next/head'

interface Message {
    id: string
    text: string
    sender: 'user' | 'agent'
    timestamp: Date
    isVoice?: boolean
}

interface VoiceCommand {
    command: string
    description: string
    example: string
}

export default function ChatPage() {
    const { address, isConnected } = useAccount()
    const [messages, setMessages] = useState<Message[]>([])
    const [inputText, setInputText] = useState('')
    const [isListening, setIsListening] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [selectedAgent, setSelectedAgent] = useState('Agent #1')
    const [activeTab, setActiveTab] = useState<'chat' | 'voice'>('chat')
    const [balance, setBalance] = useState('0.0')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const recognitionRef = useRef<any>(null)

    const voiceCommands: VoiceCommand[] = [
        {
            command: "Send [amount] AVAX to [address]",
            description: "Transfer AVAX to another wallet",
            example: "Send 0.01 AVAX to 0x742d35..."
        },
        {
            command: "Check my balance",
            description: "Get your current wallet balance",
            example: "Check my balance"
        },
        {
            command: "What's my wallet balance",
            description: "Alternative balance check command",
            example: "What's my wallet balance"
        },
        {
            command: "Transfer [amount] to [address]",
            description: "Generic transfer command",
            example: "Transfer 0.5 to 0x123..."
        }
    ]

    useEffect(() => {
        // Initialize welcome message
        setMessages([{
            id: '1',
            text: `Hello! I'm ${selectedAgent}. I can help you with voice commands and chat. Try saying "Check my balance" or ask me anything!`,
            sender: 'agent',
            timestamp: new Date()
        }])

        // Get balance
        if (isConnected && address) {
            fetchBalance()
        }

        // Initialize speech recognition
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            const recognition = new (window as any).webkitSpeechRecognition()
            recognition.continuous = false
            recognition.interimResults = false
            recognition.lang = 'en-US'

            recognition.onstart = () => setIsListening(true)
            recognition.onend = () => setIsListening(false)
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript
                handleVoiceCommand(transcript)
            }
            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error)
                setIsListening(false)
            }

            recognitionRef.current = recognition
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
        }
    }, [isConnected, address])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const fetchBalance = async () => {
        try {
            // TODO: Implement actual balance fetching
            setBalance('1.25') // Mock balance
        } catch (error) {
            console.error('Error fetching balance:', error)
        }
    }

    const addMessage = (text: string, sender: 'user' | 'agent', isVoice = false) => {
        const newMessage: Message = {
            id: Date.now().toString(),
            text,
            sender,
            timestamp: new Date(),
            isVoice
        }
        setMessages(prev => [...prev, newMessage])
    }

    const handleSendMessage = async () => {
        if (!inputText.trim()) return

        addMessage(inputText, 'user')
        const userMessage = inputText
        setInputText('')
        setIsProcessing(true)

        try {
            // Send to your Express server API
            const response = await fetch('http://127.0.0.1:3001/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    agentId: selectedAgent,
                    walletAddress: address,
                    sessionId: `chat_session_${Date.now()}`
                })
            })

            if (!response.ok) {
                throw new Error(`API responded with ${response.status}`)
            }

            const data = await response.json()
            addMessage(data.response || 'Sorry, I had trouble processing that.', 'agent')
        } catch (error) {
            console.error('Chat error:', error)
            addMessage('Sorry, I encountered an error. Please make sure the backend server is running on port 3001.', 'agent')
        } finally {
            setIsProcessing(false)
        }
    }

    const startVoiceRecognition = () => {
        if (recognitionRef.current && !isListening) {
            recognitionRef.current.start()
        }
    }

    const stopVoiceRecognition = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop()
        }
    }

    const handleVoiceCommand = async (transcript: string) => {
        addMessage(transcript, 'user', true)
        setIsProcessing(true)

        try {
            // Check if it's a voice command or regular chat
            if (isVoiceCommand(transcript)) {
                const response = await processVoiceCommand(transcript)
                addMessage(response, 'agent', true)
            } else {
                // Regular chat
                const response = await fetch('http://127.0.0.1:3001/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: transcript,
                        agentId: selectedAgent,
                        walletAddress: address,
                        isVoice: true,
                        sessionId: `voice_session_${Date.now()}`
                    })
                })

                if (!response.ok) {
                    throw new Error(`API responded with ${response.status}`)
                }

                const data = await response.json()
                addMessage(data.response || 'Sorry, I had trouble processing that.', 'agent', true)
            }
        } catch (error) {
            console.error('Voice processing error:', error)
            addMessage('Sorry, I encountered an error with voice processing. Make sure the backend server is running.', 'agent', true)
        } finally {
            setIsProcessing(false)
        }
    }

    const isVoiceCommand = (text: string): boolean => {
        const lowerText = text.toLowerCase()
        return (
            lowerText.includes('send') && lowerText.includes('avax') ||
            lowerText.includes('transfer') ||
            lowerText.includes('balance') ||
            lowerText.includes('check my') ||
            lowerText.includes('what\'s my wallet')
        )
    }

    const processVoiceCommand = async (command: string): Promise<string> => {
        const lowerCommand = command.toLowerCase()

        if (lowerCommand.includes('balance') || lowerCommand.includes('what\'s my wallet')) {
            return `Your current AVAX balance is ${balance} AVAX.`
        }

        if (lowerCommand.includes('send') || lowerCommand.includes('transfer')) {
            // Parse amount and address from command
            const amountMatch = command.match(/(\d+\.?\d*)/);
            const amount = amountMatch ? amountMatch[1] : null;

            if (!amount) {
                return "I couldn't detect the amount to send. Please specify an amount like '0.01 AVAX'."
            }

            // TODO: Implement actual transfer logic
            return `Preparing to transfer ${amount} AVAX. This would normally execute the transaction after confirmation.`
        }

        return "I didn't recognize that voice command. Try saying 'Check my balance' or 'Send 0.01 AVAX to [address]'."
    }

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex items-center justify-center">
                <div className="text-center text-white p-8 rounded-2xl bg-black/50 backdrop-blur-md shadow-lg shadow-purple-500/20">
                    <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
                    <p className="text-gray-300 mb-8">You need to connect your wallet to access the chat interface.</p>
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
                <title>Chat & Voice - Cryptixia</title>
                <meta name="description" content="Chat with your AI agents and use voice commands" />
            </Head>

            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-white">
                {/* Header */}
                <div className="bg-black/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                                    CRYPTIXIA
                                </Link>
                                <div className="h-6 w-px bg-white/20"></div>
                                <h1 className="text-xl font-semibold">Chat & Voice Interface</h1>
                            </div>

                            <div className="flex items-center space-x-4">
                                <div className="text-sm text-gray-400">
                                    Balance: <span className="text-green-400 font-mono">{balance} AVAX</span>
                                </div>
                                <div className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
                                    {address?.slice(0, 6)}...{address?.slice(-4)}
                                </div>
                            </div>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex mt-4 space-x-1 bg-white/5 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTab('chat')}
                                className={`flex-1 py-2 px-4 rounded-md transition-all ${activeTab === 'chat'
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                💬 Text Chat
                            </button>
                            <button
                                onClick={() => setActiveTab('voice')}
                                className={`flex-1 py-2 px-4 rounded-md transition-all ${activeTab === 'voice'
                                    ? 'bg-cyan-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                🎤 Voice Commands
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="grid lg:grid-cols-4 gap-8">
                        {/* Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                                <h3 className="font-semibold mb-4">Current Agent</h3>
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
                                        🤖
                                    </div>
                                    <div>
                                        <div className="font-medium">{selectedAgent}</div>
                                        <div className="text-sm text-gray-400">AI Assistant</div>
                                    </div>
                                </div>

                                {activeTab === 'voice' && (
                                    <div>
                                        <h4 className="font-medium mb-3 text-cyan-400">Voice Commands</h4>
                                        <div className="space-y-3">
                                            {voiceCommands.map((cmd, index) => (
                                                <div key={index} className="p-3 bg-white/5 rounded-lg border border-white/5">
                                                    <div className="font-mono text-xs text-cyan-300 mb-1">
                                                        {cmd.command}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {cmd.description}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Main Chat Area */}
                        <div className="lg:col-span-3">
                            <div className="bg-white/5 rounded-2xl border border-white/10 h-[600px] flex flex-col">
                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${message.sender === 'user'
                                                    ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                                                    : 'bg-white/10 text-white border border-white/10'
                                                    }`}
                                            >
                                                <div className="flex items-center space-x-2 mb-1">
                                                    {message.isVoice && <span className="text-xs">🎤</span>}
                                                    <span className="text-xs opacity-60">
                                                        {message.timestamp.toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm">{message.text}</p>
                                            </div>
                                        </div>
                                    ))}

                                    {isProcessing && (
                                        <div className="flex justify-start">
                                            <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10">
                                                <div className="flex space-x-1">
                                                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                                                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-100"></div>
                                                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-200"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="p-6 border-t border-white/10">
                                    {activeTab === 'chat' ? (
                                        <div className="flex space-x-4">
                                            <input
                                                type="text"
                                                value={inputText}
                                                onChange={(e) => setInputText(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                                placeholder="Type your message..."
                                                className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                                            />
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={!inputText.trim() || isProcessing}
                                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full font-medium hover:from-purple-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Send
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <button
                                                onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                                                className={`w-20 h-20 rounded-full border-4 transition-all duration-300 ${isListening
                                                    ? 'bg-red-500 border-red-400 animate-pulse'
                                                    : 'bg-gradient-to-r from-purple-600 to-cyan-600 border-purple-400 hover:scale-105'
                                                    }`}
                                            >
                                                🎤
                                            </button>
                                            <p className="mt-4 text-gray-400">
                                                {isListening
                                                    ? 'Listening... Speak now!'
                                                    : 'Click to start voice command'}
                                            </p>
                                            <p className="mt-2 text-xs text-gray-500">
                                                Try: "Check my balance" or "Send 0.01 AVAX to [address]"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}