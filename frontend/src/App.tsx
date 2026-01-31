import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useEffect } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { FACTORY_ADDRESS, SUPPORTED_TOKENS } from './contracts'
import factoryAbi from './abi/PayPilotFactory.json'
import vaultAbi from './abi/PayPilotVault.json'

// ----------
// ERC20 Application Binary Interface - Minimal ABI for token interactions
// We only need the function "approve()"" and "balanceOf()"" for deposits
// ----------
const erc20Abi = [
  // approve const
  {
    name: 'approve',
    type: 'function',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
  // balanceOf const
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  // decimals const
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
] as const

// ----------
// Main App Component
// ----------
function App() {
  // Get the connected wallet information from RainbowKit/wagmi
  const { address, isConnected } = useAccount()

  return (
    <div className="min-h-screen p-8">
      {/* Header with logo and wallet connect button */}
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">✈️ PayPilot</h1>
        <ConnectButton />
      </header>

      {/* Main content - show dashboard if connected, otherwise prompt to connect */}
      <main>
        {isConnected ? (
          <Dashboard userAddress={address!} />
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">Connect your wallet to get started</p>
          </div>
        )}
      </main>
    </div>
  )
}

// ----------
// Dashboard Component
// Shows the vault status and available controls
// ----------
function Dashboard({ userAddress }: { userAddress: `0x${string}` }) {
  // Check if the user already has a vault by calling factory.getVault()
  const { data: vaultAddress, refetch: refetchVault } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi.abi,
    functionName: 'getVault',
    args: [userAddress],
  })

  // Cast to a string for display and comparison
  const vaultAddressStr = vaultAddress as string | undefined
  
  // Check if the vault exists (address is not zero)
  const hasVault = vaultAddressStr && vaultAddressStr !== '0x0000000000000000000000000000000000000000'

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Vault status */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Your Vault</h2>
        
        {hasVault ? (
          <div>
            <p className="text-green-400 mb-2">✅ Vault Active</p>
            <p className="text-gray-400 text-sm font-mono">{vaultAddressStr}</p>
          </div>
        ) : (
          <CreateVaultButton onSuccess={refetchVault} />
        )}
      </div>

      {/* Show the vault dashboard only if the vault exists */}
      {hasVault && (
        <VaultDashboard 
          vaultAddress={vaultAddressStr as `0x${string}`} 
          userAddress={userAddress}
        />
      )}
    </div>
  )
}

// ----------
// Create Vault Button Component
// Calls factory.createVault() to deploy a new vault
// ----------
function CreateVaultButton({ onSuccess }: { onSuccess: () => void }) {
  // Hook to write to the contract
  const { writeContract, data: hash, isPending } = useWriteContract()
  
  // Hook to wait for the transaction confirmation
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Refresh the vault data when the transaction succeeds
  useEffect(() => {
    if (isSuccess) {
      onSuccess()
    }
  }, [isSuccess, onSuccess])

  // Call the factory to create a new vault
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

// ----------
// Vault Dashboard Component
// Shows balances and deposit/withdraw tabs
// ----------
function VaultDashboard({ vaultAddress, userAddress }: { vaultAddress: `0x${string}`, userAddress: `0x${string}` }) {
  // Track which tab is active
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit')

  // Get the vault's USDC balance
  const { data: vaultBalance, refetch: refetchVaultBalance } = useReadContract({
    address: SUPPORTED_TOKENS.USDC as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [vaultAddress],
  })

  // Get the user's wallet USDC balance
  const { data: userBalance, refetch: refetchUserBalance } = useReadContract({
    address: SUPPORTED_TOKENS.USDC as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress],
  })

  // Helper to refresh all balances after a transaction
  const refetchAll = () => {
    refetchVaultBalance()
    refetchUserBalance()
  }

  return (
    <div className="space-y-6">
      {/* Balance cards - show vault and wallet balances side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Vault Balance</p>
          <p className="text-2xl font-bold">
            {vaultBalance ? formatUnits(vaultBalance as bigint, 6) : '0'} USDC
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Your Wallet</p>
          <p className="text-2xl font-bold">
            {userBalance ? formatUnits(userBalance as bigint, 6) : '0'} USDC
          </p>
        </div>
      </div>

      {/* Tab switcher and forms */}
      <div className="bg-gray-800 rounded-lg p-6">
        {/* Tab buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'deposit' ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'withdraw' ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            Withdraw
          </button>
        </div>

        {/* Show active form */}
        {activeTab === 'deposit' ? (
          <DepositForm 
            vaultAddress={vaultAddress} 
            userBalance={userBalance as bigint | undefined}
            onSuccess={refetchAll}
          />
        ) : (
          <WithdrawForm 
            vaultAddress={vaultAddress}
            vaultBalance={vaultBalance as bigint | undefined}
            onSuccess={refetchAll}
          />
        )}
      </div>
    </div>
  )
}

// ----------
// Deposit Form Component
// Two-step process: 1) Approve USDC, 2) Deposit to vault
// ----------
function DepositForm({ 
  vaultAddress, 
  userBalance,
  onSuccess 
}: { 
  vaultAddress: `0x${string}`
  userBalance: bigint | undefined
  onSuccess: () => void 
}) {
  // Form state
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<'approve' | 'deposit'>('approve')

  // Contract write hooks for approve and deposit
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract()
  const { writeContract: writeDeposit, data: depositHash, isPending: isDepositPending } = useWriteContract()

  // Wait for the approve transaction
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  // Wait for the deposit transaction
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  })

  // Move to deposit step after approve succeeds
  useEffect(() => {
    if (isApproveSuccess) {
      setStep('deposit')
    }
  }, [isApproveSuccess])

  // Reset the form after deposit succeeds
  useEffect(() => {
    if (isDepositSuccess) {
      setAmount('')
      setStep('approve')
      onSuccess()
    }
  }, [isDepositSuccess, onSuccess])

  // Step 1: Approve vault to spend USDC
  const handleApprove = () => {
    if (!amount) return
    const amountWei = parseUnits(amount, 6) // USDC has 6 decimals
    writeApprove({
      address: SUPPORTED_TOKENS.USDC as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [vaultAddress, amountWei],
    })
  }

  // Step 2: Deposit USDC into vault
  const handleDeposit = () => {
    if (!amount) return
    const amountWei = parseUnits(amount, 6)
    writeDeposit({
      address: vaultAddress,
      abi: vaultAbi.abi,
      functionName: 'deposit',
      args: [SUPPORTED_TOKENS.USDC, amountWei],
    })
  }

  // Calculate max deposit amount from the wallet balance
  const maxBalance = userBalance ? formatUnits(userBalance, 6) : '0'

  return (
    <div className="space-y-4">
      {/* Amount input */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Amount (USDC)</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-gray-700 rounded-lg px-4 py-2 text-white"
          />
          <button
            onClick={() => setAmount(maxBalance)}
            className="bg-gray-700 px-3 py-2 rounded-lg text-sm"
          >
            MAX
          </button>
        </div>
        <p className="text-gray-500 text-sm mt-1">Available: {maxBalance} USDC</p>
      </div>

      {/* Action button - changes based on current step */}
      {step === 'approve' ? (
        <button
          onClick={handleApprove}
          disabled={!amount || isApprovePending || isApproveConfirming}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-medium"
        >
          {isApprovePending ? 'Confirm in wallet...' : isApproveConfirming ? 'Approving...' : '1. Approve USDC'}
        </button>
      ) : (
        <button
          onClick={handleDeposit}
          disabled={!amount || isDepositPending || isDepositConfirming}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-medium"
        >
          {isDepositPending ? 'Confirm in wallet...' : isDepositConfirming ? 'Depositing...' : '2. Deposit to Vault'}
        </button>
      )}
    </div>
  )
}

// ----------
// Withdraw Form Component
// Single step: withdraw from vault to wallet
// ----------
function WithdrawForm({ 
  vaultAddress, 
  vaultBalance,
  onSuccess 
}: { 
  vaultAddress: `0x${string}`
  vaultBalance: bigint | undefined
  onSuccess: () => void 
}) {
  const [amount, setAmount] = useState('')

  const { writeContract, data: hash, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Reset form after withdraw succeeds
  useEffect(() => {
    if (isSuccess) {
      setAmount('')
      onSuccess()
    }
  }, [isSuccess, onSuccess])

  // Call vault.withdraw()
  const handleWithdraw = () => {
    if (!amount) return
    const amountWei = parseUnits(amount, 6)
    writeContract({
      address: vaultAddress,
      abi: vaultAbi.abi,
      functionName: 'withdraw',
      args: [SUPPORTED_TOKENS.USDC, amountWei],
    })
  }

  // Max withdraw is the vault balance
  const maxBalance = vaultBalance ? formatUnits(vaultBalance, 6) : '0'

  return (
    <div className="space-y-4">
      {/* Amount input */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Amount (USDC)</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-gray-700 rounded-lg px-4 py-2 text-white"
          />
          <button
            onClick={() => setAmount(maxBalance)}
            className="bg-gray-700 px-3 py-2 rounded-lg text-sm"
          >
            MAX
          </button>
        </div>
        <p className="text-gray-500 text-sm mt-1">Vault balance: {maxBalance} USDC</p>
      </div>

      {/* Withdraw button */}
      <button
        onClick={handleWithdraw}
        disabled={!amount || isPending || isConfirming}
        className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-medium"
      >
        {isPending ? 'Confirm in wallet...' : isConfirming ? 'Withdrawing...' : 'Withdraw'}
      </button>
    </div>
  )
}

export default App
