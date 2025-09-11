import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function WalletConnector() {
  return (
    <div className="flex flex-col items-center mt-6">
      {/* Add wallet-connect-override class to the wrapper */}
      <div className="glow-on-hover wallet-connect-override flex items-center justify-center rounded-lg">
        <ConnectButton 
          showBalance={true} 
          accountStatus="address"
          chainStatus="none"
        />
      </div>
    </div>
  )
}