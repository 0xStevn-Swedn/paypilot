import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useEffect } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { FACTORY_ADDRESS, SUPPORTED_TOKENS } from './contracts'
import factoryAbi from './abi/PayPilotFactory.json'
import vaultAbi from './abi/PayPilotVault.json'

// The main React application
// This is a big file with all the UI components

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

// Backend local API URL
const API_URL = 'http://localhost:3001'

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
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'rules' | 'crosschain' | 'agent'>('agent')
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
          <button
            onClick={() => setActiveTab('crosschain')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'crosschain' ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            🌐 Cross-Chain
          </button>
          <button
            onClick={() => setActiveTab('agent')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'agent' ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            🤖 Agent
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
        {activeTab === 'crosschain' && (
          <CrossChainDeposit 
            vaultAddress={vaultAddress}
            userAddress={userAddress}
            onSuccess={refetchAll}
          />
        )}
        {activeTab === 'agent' && (
          <AgentChat
            vaultAddress={vaultAddress}
            userAddress={userAddress}
            onActionComplete={refetchAll}
          />
        )}

      </div>
    </div>
  )
}

// Chat message type
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  action?: {
    type: string
    [key: string]: unknown
  } | null
}

// Agent Chat - The AI interface for conversation
function AgentChat({
  vaultAddress,
  userAddress,
  onActionComplete
}: {
  vaultAddress: `0x${string}`
  userAddress: `0x${string}`
  onActionComplete: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hey! I'm PayPilot, your AI payment assistant. I can help you:\n\n• Create payments: \"Pay vitalik.eth 50 USDC weekly\"\n• Check balance: \"What's my balance?\"\n• Bridge funds: \"Bridge 100 USDC from Arbitrum\"\n\nWhat would you like to do?",
      action: null
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      })

      const data = await response.json()

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        action: data.action
      }])

      // If action completed, refresh balances
      if (data.action) {
        onActionComplete()
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I couldn't connect to the server. Please try again.",
        action: null
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-96">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md rounded-lg px-4 py-2 ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-100'
            }`}>
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              {msg.action && (
                <ActionCard action={msg.action} vaultAddress={vaultAddress} userAddress={userAddress} />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 rounded-lg px-4 py-2">
              <p className="text-gray-400 text-sm">Thinking...</p>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          disabled={loading}
          className="flex-1 bg-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-2 rounded-lg font-medium"
        >
          Send
        </button>
      </div>
    </div>
  )
}

// Action Card - Shows the actionable buttons for all the responses of the agent
function ActionCard({ 
  action, 
  vaultAddress,
  userAddress 
}: { 
  action: { type: string; [key: string]: unknown }
  vaultAddress: `0x${string}`
  userAddress: `0x${string}`
}) {
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const handleCreateRule = () => {
    if (action.type !== 'create_rule') return
    writeContract({
      address: vaultAddress,
      abi: vaultAbi.abi,
      functionName: 'createRule',
      args: [
        SUPPORTED_TOKENS.USDC,
        action.recipient as string,
        parseUnits(String(action.amount), 6),
        BigInt(action.interval as number),
        (action.description as string) || 'Payment rule'
      ],
    })
  }

  // New rule creation
  if (action.type === 'create_rule') {
    return (
      <div className="mt-2 pt-2 border-t border-gray-600">
        <p className="text-xs text-gray-400 mb-2">
          → {String(action.amount)} USDC to {String(action.recipient).slice(0, 10)}...
        </p>
        {isSuccess ? (
          <p className="text-green-400 text-xs">✓ Rule created!</p>
        ) : (
          <button
            onClick={handleCreateRule}
            disabled={isPending || isConfirming}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-3 py-1 rounded text-xs font-medium"
          >
            {isPending ? 'Confirm...' : isConfirming ? 'Creating...' : 'Create Rule'}
          </button>
        )}
      </div>
    )
  }

  // To get a quote between the different chaines
  if (action.type === 'cross_chain_quote') {
    return (
      <div className="mt-2 pt-2 border-t border-gray-600">
        <p className="text-xs text-gray-400">
          → Bridge {String(action.amount)} USDC from {String(action.fromChain)}
        </p>
        <p className="text-xs text-blue-400 mt-1">Switch to Cross-Chain tab to get quote</p>
      </div>
    )
  }

  return null
}

// Popular chains for the dropdown (subset of all the LI.FI supported chains)
const POPULAR_CHAINS = [
  { id: 42161, name: 'Arbitrum', nativeToken: 'ETH' },
  { id: 8453, name: 'Base', nativeToken: 'ETH' },
  { id: 10, name: 'Optimism', nativeToken: 'ETH' },
  { id: 137, name: 'Polygon', nativeToken: 'POL' },
  { id: 56, name: 'BSC', nativeToken: 'BNB' },
  { id: 43114, name: 'Avalanche', nativeToken: 'AVAX' },
]

// Common token addresses per chain (against USDC)
const CHAIN_USDC: Record<number, string> = {
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
  10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',   // Optimism
  137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',   // Polygon
  56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',    // BSC
  43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // Avalanche
}

// Cross-Chain Deposit - Deposit from another chain into the vault using the LI.FI protocol
function CrossChainDeposit({ 
  vaultAddress, 
  userAddress,
  onSuccess 
}: { 
  vaultAddress: `0x${string}`
  userAddress: `0x${string}`
  onSuccess: () => void 
}) {
  const [selectedChain, setSelectedChain] = useState(42161) // Default to Arbitrum
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [quote, setQuote] = useState<{
    estimate: {
      fromAmount: string
      toAmount: string
      executionDuration: number
    }
    tool: string
  } | null>(null)
  const [error, setError] = useState('')

  // Get a cross-chain "quote" from the backend
  const handleGetQuote = async () => {
    if (!amount) return

    setLoading(true)
    setError('')
    setQuote(null)

    try {
      // Convert the amount to wei - Lowest unit of ETH (6 decimals for USDC)
      const fromAmount = String(Number(amount) * 1e6)
      const fromTokenAddress = CHAIN_USDC[selectedChain]

      if (!fromTokenAddress) {
        setError('USDC not available on this chain')
        return
      }

      const response = await fetch(`${API_URL}/api/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromChainId: selectedChain,
          fromTokenAddress,
          fromAmount,
          fromAddress: userAddress,
        }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        return
      }

      setQuote(data)
    } catch (err) {
      setError('Could not connect to backend')
    } finally {
      setLoading(false)
    }
  }

  const selectedChainName = POPULAR_CHAINS.find(c => c.id === selectedChain)?.name || 'Unknown'

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">
        Deposit USDC from another chain into your vault. Powered by LI.FI.
      </p>

      {/* Selector of the source chain */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Source Chain</label>
        <select
          value={selectedChain}
          onChange={(e) => {
            setSelectedChain(Number(e.target.value))
            setQuote(null)
          }}
          className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
        >
          {POPULAR_CHAINS.map(chain => (
            <option key={chain.id} value={chain.id}>
              {chain.name}
            </option>
          ))}
        </select>
      </div>

      {/* Amount to input */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Amount (USDC on {selectedChainName})</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            setQuote(null)
          }}
          placeholder="0.00"
          className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white"
        />
      </div>

      {/* Get a "quote" button */}
      <button
        onClick={handleGetQuote}
        disabled={!amount || loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-medium"
      >
        {loading ? 'Getting quote...' : 'Get Cross-Chain Quote'}
      </button>

      {/* Error message */}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Quote result */}
      {quote && (
        <div className="bg-gray-700 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-green-400">Quote Ready</h4>
          <div className="text-sm space-y-1">
            <p className="text-gray-300">
              Send: {(Number(quote.estimate.fromAmount) / 1e6).toFixed(2)} USDC on {selectedChainName}
            </p>
            <p className="text-gray-300">
              Receive: {(Number(quote.estimate.toAmount) / 1e6).toFixed(2)} USDC in vault
            </p>
            <p className="text-gray-400">
              Route: {quote.tool}
            </p>
            <p className="text-gray-400">
              Estimated time: ~{Math.ceil(quote.estimate.executionDuration / 60)} minutes
            </p>
          </div>
          <button
            className="w-full bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-medium mt-2"
            onClick={() => {
              alert('Cross-chain execution coming soon! For now, use same-chain deposits.')
            }}
          >
            Execute Cross-Chain Deposit
          </button>
        </div>
      )}
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

// AI Input - Natural language payment parsing to transform instruction in the standard JSON structure
function AIInput({ onParsed }: { 
  onParsed: (data: { recipient: string, amount: number, interval: number, description: string }) => void 
}) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!message.trim()) return
    
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        return
      }

      // Send parsed data to parent component
      onParsed(data)
      setMessage('')
    } catch (err) {
      setError('Could not connect to AI service')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <label className="block text-sm text-gray-300 font-medium">
        Describe your payment in plain English
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder='e.g. "pay alice.eth 100 USDC every week"'
          disabled={loading}
          className="flex-1 bg-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !message.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-lg font-medium"
        >
          {loading ? '...' : 'Parse'}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
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
  // Pre-filled values from AI parsing
  const [prefill, setPrefill] = useState<{
    recipient: string
    amount: string
    interval: string
    description: string
  } | null>(null)

  // Called when AI successfully parses a message
  const handleAIParsed = (data: { recipient: string, amount: number, interval: number, description: string }) => {
    setPrefill({
      recipient: data.recipient,
      amount: String(data.amount),
      interval: String(data.interval),
      description: data.description,
    })
    setShowCreateForm(true)
  }

  return (
    <div className="space-y-6">
      {/* AI natural language input */}
      <AIInput onParsed={handleAIParsed} />

      {/* Manual create button or form */}
      {!showCreateForm ? (
        <button
          onClick={() => {
            setPrefill(null)
            setShowCreateForm(true)
          }}
          className="w-full bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-medium"
        >
          + Create Payment Rule Manually
        </button>
      ) : (
        <CreateRuleForm 
          vaultAddress={vaultAddress}
          prefill={prefill}
          onSuccess={() => {
            setShowCreateForm(false)
            setPrefill(null)
            onRuleCreated()
          }}
          onCancel={() => {
            setShowCreateForm(false)
            setPrefill(null)
          }}
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
  prefill,
  onSuccess,
  onCancel
}: { 
  vaultAddress: `0x${string}`
  prefill: { recipient: string, amount: string, interval: string, description: string } | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const [recipient, setRecipient] = useState(prefill?.recipient || '')
  const [amount, setAmount] = useState(prefill?.amount || '')
  const [interval, setInterval] = useState(prefill?.interval || '0')
  const [description, setDescription] = useState(prefill?.description || '')

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
