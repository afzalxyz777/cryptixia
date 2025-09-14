// components/ContractDebug.tsx
import { useAccount, useNetwork } from 'wagmi'
import { CONTRACT_ADDRESSES, AGENT_NFT_ABI } from '../lib/contract'

export default function ContractDebug() {
    const { address, isConnected } = useAccount()
    const { chain } = useNetwork()

    return (
        <div className="bg-gray-800 text-white p-4 rounded-lg text-sm font-mono">
            <h3 className="text-lg font-bold mb-4">Debug Info</h3>

            <div className="space-y-2">
                <div>
                    <strong>Wallet Connected:</strong> {isConnected ? 'Yes' : 'No'}
                </div>

                {isConnected && (
                    <div>
                        <strong>Address:</strong> {address}
                    </div>
                )}

                <div>
                    <strong>Chain:</strong> {chain ? `${chain.name} (${chain.id})` : 'Not connected'}
                </div>

                <div>
                    <strong>Expected Chain:</strong> Avalanche Fuji Testnet (43113)
                </div>

                <div>
                    <strong>Contract Address:</strong> {CONTRACT_ADDRESSES.AGENT_NFT}
                </div>

                <div>
                    <strong>ABI Functions:</strong> {AGENT_NFT_ABI.length} functions loaded
                </div>

                {AGENT_NFT_ABI.length > 0 && (
                    <div>
                        <strong>Available Functions:</strong>
                        <ul className="ml-4 mt-1">
                            {AGENT_NFT_ABI
                                .filter((item: any) => item.type === 'function')
                                .slice(0, 5)
                                .map((item: any, index: number) => (
                                    <li key={index}>• {item.name}</li>
                                ))}
                            {AGENT_NFT_ABI.filter((item: any) => item.type === 'function').length > 5 && (
                                <li>• ... and {AGENT_NFT_ABI.filter((item: any) => item.type === 'function').length - 5} more</li>
                            )}
                        </ul>
                    </div>
                )}

                <div className="mt-4 pt-2 border-t border-gray-600">
                    <strong>Status:</strong>{' '}
                    {!isConnected
                        ? 'Connect wallet to continue'
                        : chain?.id !== 43113
                            ? 'Switch to Avalanche Fuji Testnet'
                            : AGENT_NFT_ABI.length === 0
                                ? 'ABI not loaded properly'
                                : 'Ready to mint'
                    }
                </div>
            </div>
        </div>
    )
}