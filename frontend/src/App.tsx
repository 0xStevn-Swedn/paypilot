import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'

function App() {
  const { address, isConnected } = useAccount()

  return (
    <div className="min-h-screen p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">✈️ PayPilot</h1>
        <ConnectButton />
      </header>

      <main>
        {isConnected ? (
          <div>
            <p className="text-green-400">Connected: {address}</p>
            <p className="text-gray-400 mt-4">Vault features coming soon...</p>
          </div>
        ) : (
          <p className="text-gray-400">Connect your wallet to get started</p>
        )}
      </main>
    </div>
  )
}

export default App
