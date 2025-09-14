import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAccount, useProvider, useSigner } from 'wagmi';

interface DeFiAgentProps {
    onVoiceCommand?: (handler: (command: string) => Promise<void>) => void;
}

interface PortfolioData {
    totalValue: number;
    allocations: Record<string, number>;
    riskScore: number;
    recommendations: string[];
    opportunities: any[];
}

interface Transaction {
    hash: string;
    type: string;
    status: 'pending' | 'confirmed' | 'failed';
    timestamp: number;
}

const DeFiAgent: React.FC<DeFiAgentProps> = ({ onVoiceCommand }) => {
    const { address, isConnected } = useAccount();
    const provider = useProvider();
    const { data: signer } = useSigner();

    const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedStrategy, setSelectedStrategy] = useState('');
    const [amount, setAmount] = useState('');
    const [agentStatus, setAgentStatus] = useState<'idle' | 'listening' | 'processing' | 'executing'>('idle');
    const [lastCommand, setLastCommand] = useState('');

    const strategies = [
        {
            id: 'conservative',
            name: 'Stable Yield Strategy',
            description: 'Low-risk lending with stablecoins',
            apy: '8%',
            risk: 'Low',
            color: 'bg-green-100 border-green-300'
        },
        {
            id: 'moderate',
            name: 'Balanced DeFi Portfolio',
            description: 'Mixed lending, staking, and yield farming',
            apy: '15%',
            risk: 'Medium',
            color: 'bg-yellow-100 border-yellow-300'
        },
        {
            id: 'aggressive',
            name: 'High Yield Maximizer',
            description: 'Maximum yield through complex strategies',
            apy: '25%',
            risk: 'High',
            color: 'bg-red-100 border-red-300'
        }
    ];

    // Initialize DeFi Agent
    const initializeAgent = async () => {
        if (!provider || !signer) return null;

        try {
            // Dynamic import to avoid SSR issues
            const { DeFiAgent } = await import('../lib/defiagent');
            return new DeFiAgent(provider, signer);
        } catch (error) {
            console.error('Failed to initialize DeFi Agent:', error);
            return null;
        }
    };

    // Analyze portfolio
    const analyzePortfolio = async () => {
        if (!address || !isConnected) return;

        setIsAnalyzing(true);
        try {
            const agent = await initializeAgent();
            if (agent) {
                const analysis = await agent.analyzePortfolio(address);
                setPortfolio(analysis);
            }
        } catch (error) {
            console.error('Portfolio analysis failed:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Execute strategy
    const executeStrategy = async (strategyId: string, amount: string) => {
        if (!isConnected || !provider) return;

        setIsExecuting(true);
        setAgentStatus('executing');

        try {
            const agent = await initializeAgent();
            if (agent) {
                const txHashes = await agent.executeStrategy(strategyId, amount);

                // Add transactions to tracking
                const newTransactions = txHashes.map(hash => ({
                    hash,
                    type: strategyId,
                    status: 'pending' as const,
                    timestamp: Date.now()
                }));

                setTransactions(prev => [...prev, ...newTransactions]);

                // Monitor transactions
                for (const tx of newTransactions) {
                    monitorTransaction(tx.hash);
                }
            }
        } catch (error) {
            console.error('Strategy execution failed:', error);
        } finally {
            setIsExecuting(false);
            setAgentStatus('idle');
        }
    };

    // Monitor transaction status
    const monitorTransaction = async (txHash: string) => {
        if (!provider) return;

        try {
            const receipt = await provider.waitForTransaction(txHash);
            setTransactions(prev =>
                prev.map(tx =>
                    tx.hash === txHash
                        ? { ...tx, status: receipt?.status === 1 ? 'confirmed' : 'failed' }
                        : tx
                )
            );
        } catch (error) {
            console.error('Transaction monitoring failed:', error);
            setTransactions(prev =>
                prev.map(tx =>
                    tx.hash === txHash
                        ? { ...tx, status: 'failed' }
                        : tx
                )
            );
        }
    };

    // Voice command handler
    const handleVoiceCommand = async (command: string) => {
        setLastCommand(command);
        setAgentStatus('processing');

        try {
            const agent = await initializeAgent();
            if (!agent) return;

            const { action, params } = await agent.parseVoiceCommand(command);

            switch (action) {
                case 'analyze':
                    await analyzePortfolio();
                    break;
                case 'execute_strategy':
                    await executeStrategy(params.strategy, params.amount);
                    break;
                case 'rebalance':
                    console.log('Rebalancing portfolio...');
                    break;
                default:
                    console.log('Unknown command:', command);
            }
        } catch (error) {
            console.error('Voice command processing failed:', error);
        } finally {
            setAgentStatus('idle');
        }
    };

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    };

    // Get risk color
    const getRiskColor = (score: number) => {
        if (score < 30) return 'text-green-600';
        if (score < 70) return 'text-yellow-600';
        return 'text-red-600';
    };

    useEffect(() => {
        if (onVoiceCommand) {
            onVoiceCommand(handleVoiceCommand);
        }
    }, [onVoiceCommand]);

    if (!isConnected) {
        return (
            <div className="max-w-4xl mx-auto p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">DeFi AI Agent</h2>
                    <p className="text-gray-300">Please connect your wallet to use the DeFi Agent</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Agent Status Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl p-6 border border-white/20">
                <h1 className="text-2xl font-bold mb-2">AI Portfolio Manager</h1>
                <p className="text-green-100 mb-4">Your autonomous DeFi investment assistant</p>

                {/* Agent Status */}
                <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${agentStatus === 'idle' ? 'bg-green-400' :
                        agentStatus === 'listening' ? 'bg-blue-400 animate-pulse' :
                            agentStatus === 'processing' ? 'bg-yellow-400 animate-spin' :
                                'bg-red-400 animate-pulse'
                        }`}></div>
                    <span className="capitalize font-medium">{agentStatus}</span>
                    {lastCommand && (
                        <span className="text-sm text-green-200 ml-4">
                            Last: "{lastCommand}"
                        </span>
                    )}
                </div>
            </div>

            {/* Portfolio Overview */}
            {portfolio && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                        <h3 className="text-lg font-semibold text-white mb-2">Total Value</h3>
                        <p className="text-3xl font-bold text-green-400">
                            {formatCurrency(portfolio.totalValue)}
                        </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                        <h3 className="text-lg font-semibold text-white mb-2">Risk Score</h3>
                        <p className={`text-3xl font-bold ${getRiskColor(portfolio.riskScore)}`}>
                            {portfolio.riskScore}/100
                        </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                        <h3 className="text-lg font-semibold text-white mb-2">Active Strategies</h3>
                        <p className="text-3xl font-bold text-blue-400">{transactions.length}</p>
                    </div>
                </div>
            )}

            {/* Strategy Selection */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6">Investment Strategies</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {strategies.map((strategy) => (
                        <div
                            key={strategy.id}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedStrategy === strategy.id
                                ? 'border-blue-400 bg-blue-500/20'
                                : 'border-white/30 bg-white/5 hover:bg-white/10'
                                }`}
                            onClick={() => setSelectedStrategy(strategy.id)}
                        >
                            <h3 className="font-bold text-lg mb-2 text-white">{strategy.name}</h3>
                            <p className="text-sm text-gray-300 mb-3">{strategy.description}</p>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-green-400">APY: {strategy.apy}</span>
                                <span className="text-sm font-medium text-yellow-400">Risk: {strategy.risk}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Investment Amount (ETH)
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-3 py-2 border border-white/30 rounded-md bg-white/10 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., 1.5"
                            step="0.1"
                            min="0"
                        />
                    </div>

                    <button
                        onClick={() => selectedStrategy && amount && executeStrategy(selectedStrategy, amount)}
                        disabled={!selectedStrategy || !amount || isExecuting}
                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isExecuting ? 'Executing...' : 'Execute Strategy'}
                    </button>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        onClick={analyzePortfolio}
                        disabled={isAnalyzing}
                        className="p-4 bg-green-500/20 hover:bg-green-500/30 rounded-lg border border-green-500/30 transition-colors text-white font-medium"
                    >
                        {isAnalyzing ? 'Analyzing...' : 'Analyze Portfolio'}
                    </button>

                    <button
                        onClick={() => executeStrategy('conservative', '1')}
                        className="p-4 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg border border-blue-500/30 transition-colors text-white font-medium"
                    >
                        Safe Investment
                    </button>

                    <button
                        onClick={() => executeStrategy('aggressive', '1')}
                        className="p-4 bg-red-500/20 hover:bg-red-500/30 rounded-lg border border-red-500/30 transition-colors text-white font-medium"
                    >
                        High Yield
                    </button>

                    <button
                        className="p-4 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg border border-purple-500/30 transition-colors text-white font-medium"
                    >
                        Auto Rebalance
                    </button>
                </div>
            </div>

            {/* Recent Transactions */}
            {transactions.length > 0 && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                    <h2 className="text-2xl font-bold text-white mb-6">Recent Transactions</h2>

                    <div className="space-y-3">
                        {transactions.map((tx) => (
                            <div key={tx.hash} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                                <div>
                                    <p className="font-medium text-white capitalize">{tx.type} Strategy</p>
                                    <p className="text-sm text-gray-300">
                                        {tx.hash.substring(0, 10)}...{tx.hash.substring(tx.hash.length - 8)}
                                    </p>
                                </div>

                                <div className="flex items-center space-x-4">
                                    <span className="text-sm text-gray-400">
                                        {new Date(tx.timestamp).toLocaleTimeString()}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${tx.status === 'confirmed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                        tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                            'bg-red-500/20 text-red-400 border border-red-500/30'
                                        }`}>
                                        {tx.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Voice Commands Help */}
            <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-6 border border-purple-500/30">
                <h3 className="text-lg font-bold text-purple-200 mb-4">Voice Commands</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="font-medium text-purple-300">"Analyze my portfolio"</p>
                        <p className="text-purple-400">Get detailed portfolio analysis</p>
                    </div>
                    <div>
                        <p className="font-medium text-purple-300">"Execute conservative strategy with 2 ETH"</p>
                        <p className="text-purple-400">Run safe investment strategy</p>
                    </div>
                    <div>
                        <p className="font-medium text-purple-300">"Start aggressive high yield strategy"</p>
                        <p className="text-purple-400">Execute high-risk, high-reward strategy</p>
                    </div>
                    <div>
                        <p className="font-medium text-purple-300">"Rebalance my portfolio"</p>
                        <p className="text-purple-400">Auto-rebalance based on market conditions</p>
                    </div>
                </div>
            </div>

            {/* Demo Voice Input */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-lg font-bold text-white mb-4">Try Voice Commands (Demo)</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                        "Analyze my portfolio",
                        "Execute conservative strategy",
                        "Start aggressive strategy",
                        "Rebalance portfolio"
                    ].map((command, index) => (
                        <button
                            key={index}
                            onClick={() => handleVoiceCommand(command)}
                            disabled={agentStatus !== 'idle'}
                            className="p-3 text-sm bg-white/5 hover:bg-white/10 rounded-lg border border-white/20 transition-colors disabled:opacity-50 text-white"
                        >
                            "{command}"
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DeFiAgent;