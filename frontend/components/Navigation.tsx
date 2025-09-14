// frontend/components/Navigation.tsx
import Link from 'next/link';
import { useAccount } from 'wagmi';
import WalletConnector from './WalletConnector';

const Navigation = () => {
    const { address, isConnected } = useAccount();

    return (
        <nav className="bg-gray-800/90 backdrop-blur-sm shadow-lg border-b border-gray-700">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center py-4">
                    {/* Logo */}
                    <Link href="/">
                        <a className="text-2xl font-bold text-white hover:text-blue-400 transition-colors">
                            CRYPTIXIA
                        </a>
                    </Link>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link href="/">
                            <a className="text-gray-300 hover:text-white transition-colors">Home</a>
                        </Link>

                        <Link href="/mint">
                            <a className="text-gray-300 hover:text-white transition-colors">Mint Agent</a>
                        </Link>

                        <Link href="/agent/1">
                            <a className="text-gray-300 hover:text-white transition-colors flex items-center">
                                DeFi Agent
                                <span className="ml-1 bg-green-500 text-white text-xs px-2 py-1 rounded-full">New</span>
                            </a>
                        </Link>

                        <Link href="/demo">
                            <a className="text-gray-300 hover:text-white transition-colors">Voice Demo</a>
                        </Link>

                        <Link href="/marketplace">
                            <a className="text-gray-300 hover:text-gray-400 transition-colors">
                                Marketplace (Soon)
                            </a>
                        </Link>
                    </div>

                    {/* Wallet Connection */}
                    <div className="flex items-center space-x-4">
                        {isConnected && (
                            <div className="hidden sm:block text-sm text-gray-400">
                                {address?.slice(0, 6)}...{address?.slice(-4)}
                            </div>
                        )}
                        <WalletConnector />
                    </div>
                </div>

                {/* Mobile menu - you can expand this if needed */}
                <div className="md:hidden pb-4">
                    <div className="flex flex-wrap gap-4 text-sm">
                        <Link href="/mint"><a className="text-gray-300">Mint</a></Link>
                        <Link href="/agent/1"><a className="text-gray-300">DeFi Agent</a></Link>
                        <Link href="/demo"><a className="text-gray-300">Demo</a></Link>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;