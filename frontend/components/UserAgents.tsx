// components/UserAgents.tsx - ENHANCED VERSION
import React, { useState, useEffect } from 'react';
import { useAccount, useProvider } from 'wagmi';
import { ethers, Contract } from 'ethers';
import { CONTRACT_ADDRESSES, AGENT_NFT_ABI } from '../lib/contract';
import AgentCard from './AgentCard';

// Define types
interface AgentMetadata {
    personality?: string;
    traits?: any[];
    name?: string;
    description?: string;
    image?: string;
    attributes?: any[];
    created_at?: string;
}

interface CleanedAgentData {
    tokenId: string;
    name: string;
    description: string;
    image: string;
    attributes: any[];
    personality: string;
    traits: any[];
    created_at: string;
    _source: string;
}

// Utility functions
const cleanPersonality = (personality?: string): string => {
    return personality ? personality.trim() : 'Default personality';
};

const cleanTraits = (traits?: any[]): any[] => {
    return traits && Array.isArray(traits) ? traits : [];
};

// Utility function to safely get error message
const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    } else if (typeof error === 'string') {
        return error;
    } else {
        return 'Unknown error occurred';
    }
};

// Generate realistic test metadata for tokens with test CIDs
const generateTestMetadata = (tokenId: string): AgentMetadata => {
    console.log(`Generating test metadata for token ${tokenId}`);

    const personalities = [
        "Friendly and helpful AI assistant",
        "Creative and artistic digital being",
        "Analytical and logical problem solver",
        "Energetic and enthusiastic companion",
        "Calm and thoughtful conversationalist"
    ];

    const traitsLists = [
        ["intelligent", "creative", "curious"],
        ["analytical", "precise", "logical"],
        ["artistic", "expressive", "imaginative"],
        ["friendly", "helpful", "empathetic"],
        ["energetic", "optimistic", "adventurous"]
    ];

    const names = [
        "Neural Navigator",
        "Digital Dreamer",
        "Logic Weaver",
        "Creative Catalyst",
        "AI Artisan",
        "Data Druid",
        "Pattern Seeker",
        "Mind Mender",
        "Byte Bard",
        "Circuit Sage"
    ];

    const randomIndex = Math.floor(Math.random() * personalities.length);
    const nameIndex = Math.floor(Math.random() * names.length);

    return {
        name: `${names[nameIndex]} #${tokenId}`,
        description: `A unique AI agent with specialized capabilities. This agent excels at ${traitsLists[randomIndex].join(' and ')}.`,
        image: `/api/generateAvatar?tokenId=${tokenId}`,
        personality: personalities[randomIndex],
        traits: traitsLists[randomIndex],
        created_at: new Date().toISOString(),
        attributes: [
            { trait_type: "Intelligence", value: (70 + Math.floor(Math.random() * 30)).toString() },
            { trait_type: "Creativity", value: (60 + Math.floor(Math.random() * 40)).toString() },
            { trait_type: "Speed", value: (80 + Math.floor(Math.random() * 20)).toString() },
            { trait_type: "Memory", value: (65 + Math.floor(Math.random() * 35)).toString() }
        ]
    };
};

// Main metadata processing function
const connect_agent_metadata = async (
    tokenId: string,
    metadata: AgentMetadata = {},
    ipfsSuccess: boolean = false
): Promise<CleanedAgentData> => {
    const personality = cleanPersonality(metadata.personality);
    const traits = cleanTraits(metadata.traits);

    const imageUrl = metadata.image || `/api/generateAvatar?tokenId=${tokenId}`;

    return {
        tokenId,
        name: metadata.name || `Agent ${tokenId}`,
        description: metadata.description || 'AI Agent NFT',
        image: imageUrl,
        attributes: metadata.attributes || [],
        personality: personality,
        traits: traits,
        created_at: metadata.created_at || new Date().toISOString(),
        _source: ipfsSuccess ? 'ipfs' : 'fallback'
    };
};

// Contract hook using wagmi hooks
const useAgentContract = () => {
    const { address: account } = useAccount();
    const provider = useProvider();

    const getContract = (): ethers.Contract | null => {
        if (!account) return null;

        try {
            return new ethers.Contract(CONTRACT_ADDRESSES.AGENT_NFT, AGENT_NFT_ABI, provider);
        } catch (error) {
            console.error('Error creating contract instance:', getErrorMessage(error));
            return null;
        }
    };

    const getAgentMetadata = async (tokenId: string): Promise<AgentMetadata> => {
        const contract = getContract();
        if (!contract) return {};

        try {
            const tokenURI = await contract.tokenURI(tokenId);
            console.log(`Token ${tokenId} URI:`, tokenURI);

            // Handle test CIDs (QmTest...) - generate metadata on-demand
            if (tokenURI.includes('QmTest') || tokenURI.includes('ipfs://QmTest')) {
                console.log(`Test CID detected for token ${tokenId}, generating metadata...`);
                return generateTestMetadata(tokenId);
            }

            let metadataUrl: string;

            // Handle real IPFS URLs
            if (tokenURI.startsWith('ipfs://')) {
                const ipfsHash = tokenURI.replace('ipfs://', '');
                metadataUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
                console.log(`Converted IPFS to: ${metadataUrl}`);
            }
            // Handle HTTP URLs directly
            else if (tokenURI.startsWith('http')) {
                metadataUrl = tokenURI;
            }
            // Handle any other format
            else {
                console.warn(`Unexpected tokenURI format: ${tokenURI}`);
                return generateTestMetadata(tokenId);
            }

            console.log(`Fetching metadata from: ${metadataUrl}`);

            const response = await fetch(metadataUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const metadata = await response.json();
            console.log(`Token ${tokenId} metadata:`, metadata);

            return metadata;
        } catch (error) {
            console.error(`Error fetching metadata for token ${tokenId}:`, getErrorMessage(error));

            // Generate test metadata as fallback
            return generateTestMetadata(tokenId);
        }
    };

    const getAgentsByOwner = async (ownerAddress: string): Promise<string[]> => {
        const contract = getContract();
        if (!contract) return [];

        try {
            console.log('Starting optimized token discovery for:', ownerAddress);

            // Get the current nextTokenId to know the maximum token ID
            const nextTokenId = await contract.nextTokenId();
            const maxTokenId = Number(nextTokenId) - 1;

            if (maxTokenId <= 0) {
                console.log('No tokens minted yet');
                return [];
            }

            console.log(`Checking tokens 1 to ${maxTokenId}`);

            const tokens: string[] = [];
            const BATCH_SIZE = 10;
            const promises: Promise<void>[] = [];

            // Process tokens in parallel batches
            for (let tokenId = 1; tokenId <= maxTokenId; tokenId += BATCH_SIZE) {
                const batchEnd = Math.min(tokenId + BATCH_SIZE - 1, maxTokenId);

                const batchPromise = (async () => {
                    for (let i = tokenId; i <= batchEnd; i++) {
                        try {
                            const owner = await contract.ownerOf(i);
                            if (owner.toLowerCase() === ownerAddress.toLowerCase()) {
                                tokens.push(i.toString());
                                console.log(`✅ Found token ${i} for owner ${ownerAddress}`);
                            }
                        } catch (error) {
                            // Skip non-existent tokens
                            const errorMessage = getErrorMessage(error);
                            if (!errorMessage.includes('nonexistent token')) {
                                console.log(`Token ${i} error:`, errorMessage);
                            }
                        }
                    }
                })();

                promises.push(batchPromise);

                // Add delay between batches to avoid rate limiting
                if (promises.length % 2 === 0) {
                    await Promise.all(promises);
                    promises.length = 0;
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            // Wait for any remaining promises
            await Promise.all(promises);

            console.log(`Found ${tokens.length} tokens for owner ${ownerAddress}`);
            return tokens;

        } catch (error) {
            console.error('Error in token discovery:', getErrorMessage(error));
            return [];
        }
    };

    return {
        getContract,
        getAgentMetadata,
        getAgentsByOwner
    };
};

// Main UserAgents component - ENHANCED WITH BETTER UI
export const UserAgents: React.FC = () => {
    const [agents, setAgents] = useState<CleanedAgentData[]>([]);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    const { address: account, isConnected } = useAccount();
    const contract = useAgentContract();

    const fetchUserAgents = async () => {
        if (!account || !contract) return;

        setLoading(true);
        setProgress(0);
        try {
            const agentTokens = await contract.getAgentsByOwner(account);
            console.log('Found agent tokens:', agentTokens);

            if (agentTokens.length === 0) {
                setLoading(false);
                return;
            }

            const agentsData: CleanedAgentData[] = [];

            for (let i = 0; i < agentTokens.length; i++) {
                const tokenId = agentTokens[i];
                try {
                    console.log(`Processing token ${tokenId}... (${i + 1}/${agentTokens.length})`);
                    setProgress(Math.round(((i + 1) / agentTokens.length) * 100));

                    const metadata = await contract.getAgentMetadata(tokenId);
                    const agentData = await connect_agent_metadata(tokenId, metadata, true);
                    agentsData.push(agentData);
                } catch (error) {
                    console.error(`Error processing agent ${tokenId}:`, getErrorMessage(error));
                    const fallbackData = await connect_agent_metadata(tokenId, {}, false);
                    agentsData.push(fallbackData);
                }

                await new Promise(resolve => setTimeout(resolve, 50));
            }

            setAgents(agentsData);
        } catch (error) {
            console.error('Error fetching user agents:', getErrorMessage(error));
        } finally {
            setLoading(false);
            setProgress(100);
        }
    };

    useEffect(() => {
        if (account) {
            fetchUserAgents();
        } else {
            setAgents([]);
        }
    }, [account]);

    if (!isConnected) {
        return (
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm rounded-3xl border border-gray-700/50 shadow-2xl p-12 text-center">
                <div className="mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🔗</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h3>
                    <p className="text-gray-400 max-w-md mx-auto">
                        Connect your wallet to view and interact with your AI agent NFTs
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        Your AI Agents
                    </h2>
                    <p className="text-gray-400 mt-1">Manage and interact with your AI companions</p>
                </div>
                <button
                    onClick={fetchUserAgents}
                    disabled={loading}
                    className={`px-6 py-3 rounded-2xl font-medium text-white transition-all duration-300 ${loading
                            ? 'bg-gray-600/50 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 hover:scale-105 shadow-lg hover:shadow-xl'
                        }`}
                >
                    {loading ? (
                        <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Scanning...</span>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-2">
                            <span>🔄</span>
                            <span>Refresh Agents</span>
                        </div>
                    )}
                </button>
            </div>

            {loading && (
                <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mb-8 border border-purple-500/20">
                    <div className="text-center">
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mr-3"></div>
                            <h3 className="text-xl font-bold text-white">Scanning Blockchain</h3>
                        </div>
                        <p className="text-purple-200 mb-6">
                            Searching for your AI agents... {progress}%
                        </p>
                        <div className="w-full bg-purple-900/30 rounded-full h-3 mb-4 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-purple-500 to-cyan-500 h-3 rounded-full transition-all duration-300 relative"
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </div>
                        </div>
                        <p className="text-sm text-purple-300">
                            Found {agents.length} agents so far
                        </p>
                    </div>
                </div>
            )}

            {!loading && agents.length === 0 ? (
                <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-600/50 shadow-2xl p-12 text-center">
                    <div className="mb-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-600/20 to-gray-700/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-4xl">🤖</span>
                        </div>
                        <h4 className="text-2xl font-bold text-white mb-2">No AI Agents Found</h4>
                        <p className="text-gray-400 max-w-md mx-auto mb-6">
                            You don't have any AI agent NFTs yet. Create your first AI companion to get started!
                        </p>
                        <a
                            href="/mint"
                            className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                            <span>🎭</span>
                            <span>Mint Your First Agent</span>
                        </a>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {agents.map((agent, index) => (
                        <div
                            key={agent.tokenId}
                            className="animate-fade-in-up"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <AgentCard
                                agent={{
                                    name: agent.name,
                                    description: agent.description,
                                    personality: agent.personality,
                                    traits: agent.traits.reduce((acc, trait, index) => {
                                        acc[`trait_${index}`] = true;
                                        return acc;
                                    }, {} as any),
                                    memory_uri: "",
                                    created_at: agent.created_at
                                }}
                                tokenId={agent.tokenId}
                            />
                        </div>
                    ))}
                </div>
            )}

            {agents.length > 0 && (
                <div className="mt-8 bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-green-500/20">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-green-300 font-medium">Connected</span>
                                <span className="text-green-200 font-mono">
                                    {account?.slice(0, 6)}...{account?.slice(-4)}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-green-300">
                                <span className="font-bold">{agents.length}</span> AI Agents
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserAgents;