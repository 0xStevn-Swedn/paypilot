import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useEffect } from 'react'
import { FACTORY_ADDRESS } from './contracts'
import factoryAbi from './abi/PayPilotFactory.json'

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
          <Dashboard userAddress={address!} />
        ) : (
          <p className="text-gray-400">Connect your wallet to get started</p>
        )}
      </main>
    </div>
  )
}

function Dashboard({ userAddress }: { userAddress: `0x${string}` }) {
  // Check if user has a vault
  const { data: vaultAddress, refetch: refetchVault } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi.abi,
    functionName: 'getVault',
    args: [userAddress],
  })

  const hasVault = vaultAddress && vaultAddress !== '0x0000000000000000000000000000000000000000'

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Your Vault</h2>
        
        {hasVault ? (
          <div>
            <p className="text-green-400 mb-2">✅ Vault Active</p>
            <p className="text-gray-400 text-sm font-mono">{vaultAddress}</p>
          </div>
        ) : (
          <CreateVaultButton onSuccess={refetchVault} />
        )}
      </div>

      {hasVault && (
        <VaultDashboard vaultAddress={vaultAddress as `0x${string}`} />
      )}
    </div>
  )
}

function CreateVaultButton({ onSuccess }: { onSuccess: () => void }) {
  const { writeContract, data: hash, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  useEffect(() => {
    if (isSuccess) {
      onSuccess()
    }
  }, [isSuccess, onSuccess])

  const handleCreate = () => {
    writeContract({
      address: FACTORY_ADDRESS,
      abi: factoryAbi.abi,
      functionName: 'createVault',
    })
  }

  return (
    <div>
      <p className="text-gray-400 mb-4">You don't have a vault yet.</p>
      <button
        onClick={handleCreate}
        disabled={isPending || isConfirming}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-2 rounded-lg font-medium"
      >
        {isPending ? 'Confirm in wallet...' : isConfirming ? 'Creating...' : 'Create Vault'}
      </button>
    </div>
  )
}

function VaultDashboard({ vaultAddress }: { vaultAddress: `0x${string}` }) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Vault Dashboard</h2>
      <p className="text-gray-400">Deposit & payment rules coming next...</p>
      <p className="text-gray-500 text-sm mt-2">Vault: {vaultAddress}</p>
    </div>
  )
}

export default App
