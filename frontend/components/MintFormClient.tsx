// components/MintFormClient.tsx - Updated for new contract
import { useState, FormEvent, useEffect } from "react";
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";
import { usePrepareContractWrite, useContractWrite, useWaitForTransaction, useContractRead } from "wagmi";
import { avalancheFuji } from 'wagmi/chains';
import NFT_ABI from "../contracts/AgentNFT.json";

// New deployed contract address
const NFT_CONTRACT_ADDRESS = "0x2BDaBBa9831E84f9f94995Ef4B174b08c88E3b1D";

function MintFormClient() {
    const { address, isConnected } = useAccount();
    const [tokenURI, setTokenURI] = useState("");
    const { chain } = useNetwork();
    const { switchNetwork } = useSwitchNetwork();
    const [mounted, setMounted] = useState(false);

    const isCorrectNetwork = chain?.id === avalancheFuji.id;

    // Read contract info with proper typing
    const { data: contractName } = useContractRead({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'name',
        enabled: Boolean(isCorrectNetwork),
    }) as { data: string | undefined };

    const { data: totalSupply } = useContractRead({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'nextTokenId', // This gives us total minted
        enabled: Boolean(isCorrectNetwork),
    }) as { data: bigint | undefined };

    // Use publicMint if you chose Option B, or mint if you chose Option A
    const { config, error: prepareError } = usePrepareContractWrite({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'publicMint', // Change to 'mint' if using Option A
        args: [tokenURI], // publicMint only takes tokenURI, mint takes (address, tokenURI)
        enabled: Boolean(tokenURI && address && isCorrectNetwork && mounted),
    });

    const {
        data,
        isLoading: isMinting,
        isSuccess,
        write,
        error: writeError,
        reset
    } = useContractWrite(config);

    const {
        data: receipt,
        isLoading: isConfirming,
        isSuccess: isConfirmed
    } = useWaitForTransaction({
        hash: data?.hash,
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!isCorrectNetwork && switchNetwork) {
            switchNetwork(avalancheFuji.id);
            return;
        }

        if (write) {
            write();
        }
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div>Loading...</div>;
    }

    if (!isConnected) {
        return (
            <div style={{ padding: '20px', border: '2px solid red', borderRadius: '8px' }}>
                <h3>❌ Wallet Not Connected</h3>
                <p>Please connect your wallet first.</p>
            </div>
        );
    }

    if (!isCorrectNetwork) {
        return (
            <div style={{ padding: '20px', border: '2px solid orange', borderRadius: '8px' }}>
                <h3>⚠️ Wrong Network</h3>
                <p>Current: {chain?.name || 'Unknown'}</p>
                <p>Required: Avalanche Fuji</p>
                {switchNetwork && (
                    <button onClick={() => switchNetwork(avalancheFuji.id)}>
                        Switch to Avalanche Fuji
                    </button>
                )}
            </div>
        );
    }

    const isLoading = isMinting || isConfirming;

    return (
        <div style={{ padding: '20px', border: '2px solid green', borderRadius: '8px' }}>
            <h3>🎨 Mint Agent NFT</h3>

            <div style={{ marginBottom: '20px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                <h4>📊 Contract Info:</h4>
                <p><strong>Contract:</strong> {NFT_CONTRACT_ADDRESS}</p>
                <p><strong>Name:</strong> {contractName ? String(contractName) : 'Loading...'}</p>
                <p><strong>Total Minted:</strong> {totalSupply ? String(totalSupply) : '0'}</p>
                <p><strong>Your Address:</strong> {address?.slice(0, 6)}...{address?.slice(-4)}</p>
                <p><strong>Network:</strong> {chain?.name} (ID: {chain?.id})</p>
            </div>

            <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Token URI (Metadata URL):
                    </label>
                    <input
                        type="url"
                        value={tokenURI}
                        onChange={(e) => setTokenURI(e.target.value)}
                        placeholder="https://jsonkeeper.com/b/YOUR_JSON_ID"
                        required
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '14px'
                        }}
                    />
                    <small style={{ color: '#666' }}>
                        💡 Tip: Use a service like JSONKeeper or IPFS to host your metadata
                    </small>
                </div>

                <button
                    type="submit"
                    disabled={!write || !tokenURI.trim() || isLoading}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: write && tokenURI.trim() && !isLoading ? '#28a745' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: write && tokenURI.trim() && !isLoading ? 'pointer' : 'not-allowed',
                        fontSize: '16px',
                        fontWeight: 'bold'
                    }}
                >
                    {isLoading ? (isMinting ? "Sending Transaction..." : "Confirming...") : "🚀 Mint Agent NFT"}
                </button>
            </form>

            {/* Error Messages */}
            {prepareError && (
                <div style={{ padding: '10px', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px', marginBottom: '10px' }}>
                    <strong>❌ Error:</strong> {prepareError.message}
                </div>
            )}

            {writeError && (
                <div style={{ padding: '10px', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px', marginBottom: '10px' }}>
                    <strong>❌ Transaction Error:</strong> {writeError.message}
                </div>
            )}

            {/* Success Messages */}
            {data && !isConfirmed && (
                <div style={{ padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px', marginBottom: '10px' }}>
                    <strong>⏳ Transaction Sent:</strong><br />
                    Hash: <code>{data.hash}</code><br />
                    <small>Waiting for confirmation...</small>
                </div>
            )}

            {isConfirmed && receipt && (
                <div style={{ padding: '15px', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '4px' }}>
                    <h4>✅ NFT Minted Successfully! 🎉</h4>
                    <p><strong>Transaction:</strong> <code>{data?.hash}</code></p>
                    <p><strong>Block:</strong> {receipt.blockNumber?.toString()}</p>
                    <p><strong>Token ID:</strong> {totalSupply ? String(Number(totalSupply) - 1) : 'Unknown'}</p>
                    <p><strong>Gas Used:</strong> {receipt.gasUsed ? String(receipt.gasUsed) : 'Unknown'}</p>
                </div>
            )}

            {/* Contract Address Warning */}
            {NFT_CONTRACT_ADDRESS === "0x2BDaBBa9831E84f9f94995Ef4B174b08c88E3b1D" && (
                <div style={{ padding: '15px', backgroundColor: '#f8d7da', border: '2px solid #dc3545', borderRadius: '8px', marginTop: '20px' }}>
                    <h4>⚠️ IMPORTANT:</h4>
                    <p>Remember to update the contract address after redeployment!</p>
                </div>
            )}
        </div>
    );
}

export default MintFormClient;