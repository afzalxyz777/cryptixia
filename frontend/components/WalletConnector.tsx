import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function WalletConnector() {
  return (
    <div className="flex flex-col items-center mt-6">
      <ConnectButton showBalance={true} accountStatus="address" />
    </div>
  )
}
