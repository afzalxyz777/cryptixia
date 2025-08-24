import WalletConnector from '../components/WalletConnector'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
      <h1 className="text-3xl font-bold text-white">
        Hello Cryptixia 👋
      </h1>
      <WalletConnector />
    </div>
  )
}
