import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useEffect } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { FACTORY_ADDRESS, SUPPORTED_TOKENS } from './contracts'
import factoryAbi from './abi/PayPilotFactory.json'
import vaultAbi from './abi/PayPilotVault.json'

// ERC20 ABI - Only the functions we need for token interactions
const erc20Abi = [
  {
    name: 'approve',
    type: 'function',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
] as const

// Convert interval in seconds to human readable text
function formatInterval(seconds: bigint): string {
  const secs = Number(seconds)
  if (secs === 0) return 'One-time'
  if (secs === 60) return 'Every minute'
  if (secs === 3600) return 'Hourly'
  if (secs === 86400) return 'Daily'
  if (secs === 604800) return 'Weekly'
  if (secs === 2592000) return 'Monthly'
  return `Every ${secs} seconds`
}

// Main App Component
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
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">Connect your wallet to get started</p>
          </div>
        )}
      </main>
    </div>
  )
}

// Dashboard - Shows vault status and controls
function Dashboard({ userAddress }: { userAddress: `0x${string}` }) {
  const { data: vaultAddress, refetch: refetchVault } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi.abi,
    functionName: 'getVault',
    args: [userAddress],
  })

  const vaultAddressStr = vaultAddress as string | undefined
  const hasVault = vaultAddressStr && vaultAddressStr !== '0x0000000000000000000000000000000000000000'

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
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

      {hasVault && (
        <VaultDashboard 
          vaultAddress={vaultAddressStr as `0x${string}`} 
          userAddress={userAddress}
        />
      )}
    </div>
  )
}

// Create Vault Button - Deploys a new vault via the factory
function CreateVaultButton({ onSuccess }: { onSuccess: () => void }) {
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

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

// Vault Dashboard - Shows balances and tabs for deposit/withdraw/rules
function VaultDashboard({ vaultAddress, userAddress }: { vaultAddress: `0x${string}`, userAddress: `0x${string}` }) {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'rules'>('deposit')
  const [rulesRefreshKey, setRulesRefreshKey] = useState(0)

  // Get vault USDC balance
  const { data: vaultBalance, refetch: refetchVaultBalance } = useReadContract({
    address: SUPPORTED_TOKENS.USDC as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [vaultAddress],
  })

  // Get user wallet USDC balance
  const { data: userBalance, refetch: refetchUserBalance } = useReadContract({
    address: SUPPORTED_TOKENS.USDC as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress],
  })

  const refetchAll = () => {
    refetchVaultBalance()
    refetchUserBalance()
  }

  const refreshRules = () => {
    setRulesRefreshKey(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Balance cards */}
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

      {/* Tab navigation and content */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex gap-2 mb-6">
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
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'rules' ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            ⚡ Payment Rules
          </button>
        </div>

        {activeTab === 'deposit' && (
          <DepositForm 
            vaultAddress={vaultAddress} 
            userBalance={userBalance as bigint | undefined}
            onSuccess={refetchAll}
          />
        )}
        {activeTab === 'withdraw' && (
          <WithdrawForm 
            vaultAddress={vaultAddress}
            vaultBalance={vaultBalance as bigint | undefined}
            onSuccess={refetchAll}
          />
        )}
        {activeTab === 'rules' && (
          <PaymentRulesTab 
            vaultAddress={vaultAddress}
            refreshKey={rulesRefreshKey}
            onRuleCreated={refreshRules}
            onRuleExecuted={() => {
              refreshRules()
              refetchAll()
            }}
          />
        )}
      </div>
    </div>
  )
}

// Deposit Form - Two-step: approve then deposit
function DepositForm({ 
  vaultAddress, 
  userBalance,
  onSuccess 
}: { 
  vaultAddress: `0x${string}`
  userBalance: bigint | undefined
  onSuccess: () => void 
}) {
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<'approve' | 'deposit'>('approve')

  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract()
  const { writeContract: writeDeposit, data: depositHash, isPending: isDepositPending } = useWriteContract()

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  })

  useEffect(() => {
    if (isApproveSuccess) {
      setStep('deposit')
    }
  }, [isApproveSuccess])

  useEffect(() => {
    if (isDepositSuccess) {
      setAmount('')
      setStep('approve')
      onSuccess()
    }
  }, [isDepositSuccess, onSuccess])

  const handleApprove = () => {
    if (!amount) return
    const amountWei = parseUnits(amount, 6)
    writeApprove({
      address: SUPPORTED_TOKENS.USDC as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [vaultAddress, amountWei],
    })
  }

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

  const maxBalance = userBalance ? formatUnits(userBalance, 6) : '0'

  return (
    <div className="space-y-4">
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

// Withdraw Form - Single step withdrawal
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
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (isSuccess) {
      setAmount('')
      onSuccess()
    }
  }, [isSuccess, onSuccess])

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

  const maxBalance = vaultBalance ? formatUnits(vaultBalance, 6) : '0'

  return (
    <div className="space-y-4">
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

// Payment Rules Tab - Create and manage automated payments
function PaymentRulesTab({ 
  vaultAddress, 
  refreshKey,
  onRuleCreated,
  onRuleExecuted
}: { 
  vaultAddress: `0x${string}`
  refreshKey: number
  onRuleCreated: () => void
  onRuleExecuted: () => void
}) {
  const [showCreateForm, setShowCreateForm] = useState(false)

  return (
    <div className="space-y-6">
      {!showCreateForm ? (
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-medium"
        >
          + Create Payment Rule
        </button>
      ) : (
        <CreateRuleForm 
          vaultAddress={vaultAddress}
          onSuccess={() => {
            setShowCreateForm(false)
            onRuleCreated()
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <RulesList 
        vaultAddress={vaultAddress} 
        refreshKey={refreshKey}
        onRuleExecuted={onRuleExecuted}
        onRuleCancelled={onRuleCreated}
      />
    </div>
  )
}

// Create Rule Form - Form to create a new payment rule
function CreateRuleForm({ 
  vaultAddress, 
  onSuccess,
  onCancel
}: { 
  vaultAddress: `0x${string}`
  onSuccess: () => void
  onCancel: () => void
}) {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [interval, setInterval] = useState('0')
  const [description, setDescription] = useState('')

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (isSuccess) {
      onSuccess()
    }
  }, [isSuccess, onSuccess])

  const handleCreate = () => {
    if (!recipient || !amount) return

    writeContract({
      address: vaultAddress,
      abi: vaultAbi.abi,
      functionName: 'createRule',
      args: [
        SUPPORTED_TOKENS.USDC,
        recipient,
        parseUnits(amount, 6),
        BigInt(interval),
        description || 'Payment rule'
      ],
    })
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-4">
      <h3 className="font-semibold">Create Payment Rule</h3>
      
      <div>
        <label className="block text-sm text-gray-400 mb-1">Recipient Address</label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
          className="w-full bg-gray-600 rounded-lg px-4 py-2 text-white"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Amount (USDC)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-gray-600 rounded-lg px-4 py-2 text-white"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Frequency</label>
        <select
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
          className="w-full bg-gray-600 rounded-lg px-4 py-2 text-white"
        >
          <option value="0">One-time payment</option>
          <option value="60">Every minute (testing)</option>
          <option value="3600">Hourly</option>
          <option value="86400">Daily</option>
          <option value="604800">Weekly</option>
          <option value="2592000">Monthly (30 days)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Rent payment"
          className="w-full bg-gray-600 rounded-lg px-4 py-2 text-white"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleCreate}
          disabled={!recipient || !amount || isPending || isConfirming}
          className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-2 rounded-lg font-medium"
        >
          {isPending ? 'Confirm...' : isConfirming ? 'Creating...' : 'Create Rule'}
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// Rules List - Displays all payment rules from the vault
function RulesList({ 
  vaultAddress,
  refreshKey,
  onRuleExecuted,
  onRuleCancelled
}: { 
  vaultAddress: `0x${string}`
  refreshKey: number
  onRuleExecuted: () => void
  onRuleCancelled: () => void
}) {
  const { data: ruleCount } = useReadContract({
    address: vaultAddress,
    abi: vaultAbi.abi,
    functionName: 'ruleCount',
    scopeKey: `rules-${refreshKey}`,
  })

  const count = Number(ruleCount || 0)

  if (count === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No payment rules yet.</p>
        <p className="text-sm">Create your first autopilot payment above!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-300">Your Payment Rules</h3>
      {Array.from({ length: count }, (_, i) => (
        <RuleCard 
          key={`${refreshKey}-${i}`}
          vaultAddress={vaultAddress} 
          ruleId={i}
          onExecuted={onRuleExecuted}
          onCancelled={onRuleCancelled}
        />
      ))}
    </div>
  )
}

// Rule Card - Single payment rule with execute and cancel buttons
function RuleCard({ 
  vaultAddress, 
  ruleId,
  onExecuted,
  onCancelled
}: { 
  vaultAddress: `0x${string}`
  ruleId: number
  onExecuted: () => void
  onCancelled: () => void
}) {
  const { data: rule } = useReadContract({
    address: vaultAddress,
    abi: vaultAbi.abi,
    functionName: 'getRule',
    args: [BigInt(ruleId)],
  })

  const { writeContract: executeWrite, data: executeHash, isPending: isExecuting } = useWriteContract()
  const { isLoading: isExecuteConfirming, isSuccess: isExecuteSuccess } = useWaitForTransactionReceipt({ 
    hash: executeHash 
  })

  const { writeContract: cancelWrite, data: cancelHash, isPending: isCancelling } = useWriteContract()
  const { isLoading: isCancelConfirming, isSuccess: isCancelSuccess } = useWaitForTransactionReceipt({ 
    hash: cancelHash 
  })

  useEffect(() => {
    if (isExecuteSuccess) onExecuted()
  }, [isExecuteSuccess, onExecuted])

  useEffect(() => {
    if (isCancelSuccess) onCancelled()
  }, [isCancelSuccess, onCancelled])

  const ruleData = rule as {
    id: bigint
    token: string
    recipient: string
    amount: bigint
    interval: bigint
    lastExecuted: bigint
    active: boolean
    description: string
  } | undefined

  if (!ruleData || !ruleData.active) {
    return null
  }

  const handleExecute = () => {
    executeWrite({
      address: vaultAddress,
      abi: vaultAbi.abi,
      functionName: 'executeRule',
      args: [BigInt(ruleId)],
    })
  }

  const handleCancel = () => {
    cancelWrite({
      address: vaultAddress,
      abi: vaultAbi.abi,
      functionName: 'cancelRule',
      args: [BigInt(ruleId)],
    })
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-medium">{ruleData.description}</p>
          <p className="text-sm text-gray-400">
            To: {ruleData.recipient.slice(0, 6)}...{ruleData.recipient.slice(-4)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-green-400">
            {formatUnits(ruleData.amount, 6)} USDC
          </p>
          <p className="text-sm text-gray-400">
            {formatInterval(ruleData.interval)}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleExecute}
          disabled={isExecuting || isExecuteConfirming}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-3 py-1 rounded text-sm font-medium"
        >
          {isExecuting || isExecuteConfirming ? 'Executing...' : '▶ Execute Now'}
        </button>
        <button
          onClick={handleCancel}
          disabled={isCancelling || isCancelConfirming}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-3 py-1 rounded text-sm font-medium"
        >
          {isCancelling || isCancelConfirming ? '...' : '✕'}
        </button>
      </div>
    </div>
  )
}

export default App
