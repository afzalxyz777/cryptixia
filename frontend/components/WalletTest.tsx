// components/WalletTest.tsx
import { useEffect, useState } from 'react';
import { useAccount, useNetwork, useConnect, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function WalletTest() {
    const [mounted, setMounted] = useState(false);
    const { address, isConnected, isConnecting, isDisconnected } = useAccount();
    const { chain, chains } = useNetwork();
    const { connect, connectors, error: connectError } = useConnect();
    const { disconnect } = useDisconnect();

    useEffect(() => {
        setMounted(true);
        console.log('=== WALLET TEST MOUNTED ===');
    }, []);

    useEffect(() => {
        console.log('=== WALLET STATE CHANGE ===');
        console.log('Mounted:', mounted);
        console.log('Address:', address);
        console.log('Is Connected:', isConnected);
        console.log('Is Connecting:', isConnecting);
        console.log('Is Disconnected:', isDisconnected);
        console.log('Current Chain:', chain);
        console.log('Available Chains:', chains);
        console.log('Connect Error:', connectError);
        console.log('============================');
    }, [mounted, address, isConnected, isConnecting, isDisconnected, chain, chains, connectError]);

    if (!mounted) {
        return <div>Loading wallet test...</div>;
    }

    return (
        <div style={{
            padding: '20px',
            border: '2px solid #333',
            borderRadius: '8px',
            margin: '20px',
            backgroundColor: '#f5f5f5'
        }}>
            <h2>🔍 Wallet Debug Test</h2>

            <div style={{ marginBottom: '15px' }}>
                <strong>Connection Status:</strong>
                <ul>
                    <li>Mounted: {mounted ? '✅' : '❌'}</li>
                    <li>Connected: {isConnected ? '✅' : '❌'}</li>
                    <li>Connecting: {isConnecting ? '⏳' : '❌'}</li>
                    <li>Disconnected: {isDisconnected ? '✅' : '❌'}</li>
                </ul>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <strong>Wallet Info:</strong>
                <ul>
                    <li>Address: {address || 'Not connected'}</li>
                    <li>Chain Name: {chain?.name || 'No chain detected'}</li>
                    <li>Chain ID: {chain?.id || 'No chain ID'}</li>
                    <li>Expected Fuji ID: 43113</li>
                </ul>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <strong>Available Chains:</strong>
                <ul>
                    {chains.map((c) => (
                        <li key={c.id}>
                            {c.name} (ID: {c.id}) {chain?.id === c.id ? '← Current' : ''}
                        </li>
                    ))}
                </ul>
            </div>

            <div style={{ marginBottom: '15px' }}>
                <strong>Available Connectors:</strong>
                <ul>
                    {connectors.map((connector) => (
                        <li key={connector.id}>
                            {connector.name} - Ready: {connector.ready ? '✅' : '❌'}
                        </li>
                    ))}
                </ul>
            </div>

            {connectError && (
                <div style={{ color: 'red', marginBottom: '15px' }}>
                    <strong>Connection Error:</strong> {connectError.message}
                </div>
            )}

            <div style={{ marginBottom: '15px' }}>
                <h3>🌈 RainbowKit Connect Button:</h3>
                <ConnectButton />
            </div>

            <div>
                <h3>⚡ Manual Connection:</h3>
                {!isConnected ? (
                    <div>
                        {connectors.map((connector) => (
                            <button
                                key={connector.id}
                                onClick={() => connect({ connector })}
                                disabled={!connector.ready}
                                style={{
                                    margin: '5px',
                                    padding: '10px',
                                    backgroundColor: connector.ready ? '#007bff' : '#ccc',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px'
                                }}
                            >
                                Connect {connector.name}
                            </button>
                        ))}
                    </div>
                ) : (
                    <button
                        onClick={() => disconnect()}
                        style={{
                            padding: '10px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px'
                        }}
                    >
                        Disconnect
                    </button>
                )}
            </div>
        </div>
    );
}