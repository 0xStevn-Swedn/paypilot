import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useEffect, CSSProperties } from 'react'
import { formatUnits, parseUnits } from 'viem'
import { FACTORY_ADDRESS, SUPPORTED_TOKENS } from './contracts'
import factoryAbi from './abi/PayPilotFactory.json'
import vaultAbi from './abi/PayPilotVault.json'

// Inline styles for reliable rendering
const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0D1B2A',
    color: 'white',
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    backgroundColor: 'rgba(13, 27, 42, 0.95)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid #1f2937',
    padding: '12px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
  },
  main: {
    flex: 1,
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px',
    width: '100%',
  },
  card: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(55, 65, 81, 0.5)',
  },
  balanceGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '24px',
  },
  balanceCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(55, 65, 81, 0.5)',
  },
  balanceLabel: {
    color: '#9ca3af',
    fontSize: '18px',
    marginBottom: '8px',
  },
  balanceValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
  },
  balanceUnit: {
    fontSize: '20px',
    color: '#6b7280',
    marginLeft: '8px',
  },
  tabContainer: {
    borderBottom: '1px solid #1f2937',
    marginBottom: '24px',
  },
  tabNav: {
    display: 'flex',
  },
  tab: {
    flex: 1,
    padding: '16px',
    fontSize: '20px',
    fontWeight: 500,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    position: 'relative' as const,
    transition: 'all 0.2s',
  },
  tabActive: {
    color: 'white',
  },
  tabInactive: {
    color: '#6b7280',
  },
  tabIndicator: {
    position: 'absolute' as const,
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '60px',
    height: '4px',
    backgroundColor: '#06b6d4',
    borderRadius: '4px',
  },
  input: {
    width: '100%',
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '12px',
    padding: '12px 16px',
    color: 'white',
    fontSize: '20px',
    outline: 'none',
  },
  button: {
    backgroundColor: '#06b6d4',
    color: 'white',
    border: 'none',
    borderRadius: '9999px',
    padding: '12px 24px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    width: '100%',
  },
  buttonDisabled: {
    backgroundColor: '#374151',
    color: '#6b7280',
    cursor: 'not-allowed',
  },
  chatContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '400px',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto' as const,
    marginBottom: '16px',
  },
  chatBubbleUser: {
    backgroundColor: '#0891b2',
    color: 'white',
    borderRadius: '16px',
    padding: '12px 16px',
    maxWidth: '80%',
    marginLeft: 'auto',
    marginBottom: '12px',
  },
  chatBubbleAssistant: {
    backgroundColor: '#1f2937',
    color: 'white',
    borderRadius: '16px',
    padding: '14px 18px',
    maxWidth: '80%',
    marginBottom: '12px',
    border: '1px solid #374151',
  },
  chatInputRow: {
    display: 'flex',
    gap: '12px',
  },
  footer: {
    padding: '16px',
    textAlign: 'center' as const,
    color: '#6b7280',
    fontSize: '18px',
    borderTop: '1px solid #1f2937',
  },
}

const erc20Abi = [
  { name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { name: 'decimals', type: 'function', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
] as const

const API_URL = 'http://localhost:3001'

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

function App() {
  const { address, isConnected } = useAccount()

  return (
    <div style={styles.container}>
      {/* Fixed logo in top-left corner */}
      <img 
        src="/PayPilot_logo.png" 
        alt="" 
        style={{ 
          position: 'fixed',
          top: '20px',
          left: '20px',
          height: '200px',
          zIndex: 100,
        }} 
      />

      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#e0ecee',
            textShadow: '0 0 8px rgba(6, 182, 212, 0.6)',
            letterSpacing: '1px',
          }}>
            PayPilot
          </span>
        </div>
        <ConnectButton />
      </header>
    

      <main style={styles.main}>
        {isConnected ? (
          <Dashboard userAddress={address!} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
            <img src="/PayPilot_logo.png" alt="PayPilot" style={{ height: '180px', marginBottom: '24px' }} />
            <p style={{ color: '#06b6d4', fontSize: '20px', marginBottom: '8px' }}>Your AI co-pilot for crypto payments</p>
            <p style={{ color: '#6b7280', marginBottom: '32px' }}>Connect your wallet to get started</p>
            <ConnectButton />
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        Built for HackMoney 2026 • Powered by LI.FI & Arc
      </footer>
    </div>
  )
}

function Dashboard({ userAddress }: { userAddress: `0x${string}` }) {
  const { data: vaultAddress, refetch: refetchVault } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi.abi,
    functionName: 'getVault',
    args: [userAddress],
  })

  const vaultAddressStr = vaultAddress as string | undefined
  const hasVault = vaultAddressStr && vaultAddressStr !== '0x0000000000000000000000000000000000000000'

  if (!hasVault) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Welcome to PayPilot</h2>
        <p style={{ color: '#9ca3af', marginBottom: '32px' }}>Create your vault to start automating payments</p>
        <CreateVaultButton onSuccess={refetchVault} />
      </div>
    )
  }

  return <VaultDashboard vaultAddress={vaultAddressStr as `0x${string}`} userAddress={userAddress} />
}

function CreateVaultButton({ onSuccess }: { onSuccess: () => void }) {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => { if (isSuccess) onSuccess() }, [isSuccess, onSuccess])
  
  useEffect(() => {
    if (error) {
      console.error('CreateRuleForm error:', error.message, error)
      alert('Create rule failed: ' + error.message)
    }
  }, [error])

  return (
    <button
      onClick={() => writeContract({ address: FACTORY_ADDRESS, abi: factoryAbi.abi, functionName: 'createVault' })}
      disabled={isPending || isConfirming}
      style={{ ...styles.button, ...(isPending || isConfirming ? styles.buttonDisabled : {}), width: 'auto', padding: '12px 32px' }}
    >
      {isPending ? 'Confirm in wallet...' : isConfirming ? 'Creating...' : 'Create Vault'}
    </button>
  )
}

function VaultDashboard({ vaultAddress, userAddress }: { vaultAddress: `0x${string}`, userAddress: `0x${string}` }) {
  const [activeTab, setActiveTab] = useState<'agent' | 'deposit' | 'withdraw' | 'rules' | 'crosschain'>('agent')
  const [rulesRefreshKey, setRulesRefreshKey] = useState(0)

  const { data: vaultBalance, refetch: refetchVaultBalance } = useReadContract({
    address: SUPPORTED_TOKENS.USDC as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [vaultAddress],
  })

  const { data: userBalance, refetch: refetchUserBalance } = useReadContract({
    address: SUPPORTED_TOKENS.USDC as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress],
  })

  const refetchAll = () => { refetchVaultBalance(); refetchUserBalance() }
  const refreshRules = () => setRulesRefreshKey(prev => prev + 1)

  const tabs = [
    { id: 'agent', label: '🤖 Agent' },
    { id: 'deposit', label: 'Deposit' },
    { id: 'withdraw', label: 'Withdraw' },
    { id: 'rules', label: '⚡ Rules' },
    { id: 'crosschain', label: '🌐 Bridge' },
  ] as const

  return (
    <div>
      {/* Balance Cards */}
      <div style={styles.balanceGrid}>
        <div style={styles.balanceCard}>
          <p style={styles.balanceLabel}>Vault Balance</p>
          <p style={styles.balanceValue}>
            {vaultBalance ? formatUnits(vaultBalance as bigint, 6) : '0'}
            <span style={styles.balanceUnit}>USDC</span>
          </p>
        </div>
        <div style={styles.balanceCard}>
          <p style={styles.balanceLabel}>Wallet Balance</p>
          <p style={styles.balanceValue}>
            {userBalance ? formatUnits(userBalance as bigint, 6) : '0'}
            <span style={styles.balanceUnit}>USDC</span>
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabContainer}>
        <nav style={styles.tabNav}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : styles.tabInactive),
              }}
            >
              {tab.label}
              {activeTab === tab.id && <div style={styles.tabIndicator} />}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'agent' && <AgentChat vaultAddress={vaultAddress} userAddress={userAddress} onActionComplete={refetchAll} vaultBalance={vaultBalance as bigint | undefined} userBalance={userBalance as bigint | undefined} />}
        {activeTab === 'deposit' && <DepositForm vaultAddress={vaultAddress} userBalance={userBalance as bigint | undefined} onSuccess={refetchAll} />}
        {activeTab === 'withdraw' && <WithdrawForm vaultAddress={vaultAddress} vaultBalance={vaultBalance as bigint | undefined} onSuccess={refetchAll} />}
        {activeTab === 'rules' && <PaymentRulesTab vaultAddress={vaultAddress} refreshKey={rulesRefreshKey} onRuleCreated={refreshRules} onRuleExecuted={() => { refreshRules(); refetchAll() }} />}
        {activeTab === 'crosschain' && <CrossChainDeposit vaultAddress={vaultAddress} userAddress={userAddress} onSuccess={refetchAll} />}
      </div>
    </div>
  )
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  action?: { type: string; [key: string]: unknown } | null
}

function AgentChat({ vaultAddress, userAddress, onActionComplete, vaultBalance, userBalance }: { vaultAddress: `0x${string}`; userAddress: `0x${string}`; onActionComplete: () => void; vaultBalance: bigint | undefined; userBalance: bigint | undefined }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hey! I'm PayPilot, your AI payment assistant.\n\n• Create payments: \"Pay 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 50 USDC weekly\"\n• Check balance: \"What's my balance?\"\n• Bridge funds: \"Bridge 100 USDC from Arbitrum\"\n\nWhat would you like to do?", action: null }
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
      
      // Enhance message with real data for certain actions
      let enhancedMessage = data.message
      if (data.action?.type === 'check_balance') {
        const vaultBal = vaultBalance ? formatUnits(vaultBalance, 6) : '0'
        const walletBal = userBalance ? formatUnits(userBalance, 6) : '0'
        enhancedMessage = `Here's your current balance:\n\n💰 Vault Balance: ${vaultBal} USDC\n👛 Wallet Balance: ${walletBal} USDC\n\nYour vault balance is what's available for automated payments.`
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: enhancedMessage, action: data.action }])
      if (data.action) onActionComplete()
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't connect to the server.", action: null }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.chatContainer}>
      <div style={styles.chatMessages}>
        {messages.map((msg, i) => (
          <div key={i} style={msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant}>
            <p style={{ whiteSpace: 'pre-wrap', fontSize: '18px', margin: 0 }}>{msg.content}</p>
            {msg.action && <ActionCard action={msg.action} vaultAddress={vaultAddress} userAddress={userAddress} />}
          </div>
        ))}
        {loading && (
          <div style={styles.chatBubbleAssistant}>
            <p style={{ color: '#9ca3af', fontSize: '18px', margin: 0 }}>Thinking...</p>
          </div>
        )}
      </div>

      <div style={styles.chatInputRow}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          disabled={loading}
          style={{ ...styles.input, flex: 1, borderRadius: '9999px' }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{ ...styles.button, ...(loading || !input.trim() ? styles.buttonDisabled : {}), width: 'auto' }}
        >
          Send
        </button>
      </div>
    </div>
  )
}

function ActionCard({ action, vaultAddress, userAddress }: { action: { type: string; [key: string]: unknown }; vaultAddress: `0x${string}`; userAddress: `0x${string}` }) {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (error) {
      console.error('ActionCard writeContract error:', error.message, error)
    }
  }, [error])

  if (action.type === 'create_rule') {
    return (
      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #374151' }}>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
          → {String(action.amount)} USDC to {String(action.recipient).slice(0, 10)}...
        </p>
        {isSuccess ? (
          <p style={{ color: '#34d399', fontSize: '12px' }}>✓ Rule created!</p>
        ) : (
          <button
            onClick={() => writeContract({
              address: vaultAddress,
              abi: vaultAbi.abi,
              functionName: 'createRule',
              args: [SUPPORTED_TOKENS.USDC, action.recipient as string, parseUnits(String(action.amount), 6), BigInt(action.interval as number), (action.description as string) || 'Payment rule'],
            })}
            disabled={isPending || isConfirming}
            style={{ ...styles.button, padding: '8px 16px', fontSize: '12px', width: 'auto', ...(isPending || isConfirming ? styles.buttonDisabled : {}) }}
          >
            {isPending ? 'Confirm...' : isConfirming ? 'Creating...' : 'Create Rule'}
          </button>
        )}
      </div>
    )
  }

  if (action.type === 'cross_chain_quote') {
    return (
      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #374151' }}>
        <p style={{ fontSize: '12px', color: '#9ca3af' }}>→ Bridge {String(action.amount)} USDC from {String(action.fromChain)}</p>
        <p style={{ fontSize: '12px', color: '#06b6d4', marginTop: '4px' }}>Switch to Bridge tab to get quote</p>
      </div>
    )
  }

  return null
}

const POPULAR_CHAINS = [
  { id: 42161, name: 'Arbitrum' },
  { id: 8453, name: 'Base' },
  { id: 10, name: 'Optimism' },
  { id: 137, name: 'Polygon' },
  { id: 56, name: 'BSC' },
  { id: 43114, name: 'Avalanche' },
]

const CHAIN_USDC: Record<number, string> = {
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
}

function CrossChainDeposit({ vaultAddress, userAddress, onSuccess }: { vaultAddress: `0x${string}`; userAddress: `0x${string}`; onSuccess: () => void }) {
  const [selectedChain, setSelectedChain] = useState(42161)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [quote, setQuote] = useState<{ estimate: { fromAmount: string; toAmount: string; executionDuration: number }; tool: string } | null>(null)
  const [error, setError] = useState('')

  const handleGetQuote = async () => {
    if (!amount) return
    setLoading(true)
    setError('')
    setQuote(null)

    try {
      const fromAmount = String(Number(amount) * 1e6)
      const fromTokenAddress = CHAIN_USDC[selectedChain]
      if (!fromTokenAddress) { setError('USDC not available on this chain'); return }

      const response = await fetch(`${API_URL}/api/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromChainId: selectedChain, fromTokenAddress, fromAmount, fromAddress: userAddress }),
      })
      const data = await response.json()
      if (data.error) { setError(data.error); return }
      setQuote(data)
    } catch { setError('Could not connect to backend') }
    finally { setLoading(false) }
  }

  const selectedChainName = POPULAR_CHAINS.find(c => c.id === selectedChain)?.name || 'Unknown'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ color: '#9ca3af', fontSize: '18px' }}>Deposit USDC from another chain into your vault. Powered by LI.FI.</p>

      <div>
        <label style={{ display: 'block', fontSize: '18px', color: '#9ca3af', marginBottom: '8px' }}>Source Chain</label>
        <select value={selectedChain} onChange={(e) => { setSelectedChain(Number(e.target.value)); setQuote(null) }}
          style={{ ...styles.input, cursor: 'pointer' }}>
          {POPULAR_CHAINS.map(chain => <option key={chain.id} value={chain.id}>{chain.name}</option>)}
        </select>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '18px', color: '#9ca3af', marginBottom: '8px' }}>Amount (USDC)</label>
        <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setQuote(null) }} placeholder="0.00" style={styles.input} />
      </div>

      <button onClick={handleGetQuote} disabled={!amount || loading}
        style={{ ...styles.button, ...(!amount || loading ? styles.buttonDisabled : {}) }}>
        {loading ? 'Getting quote...' : 'Get Quote'}
      </button>

      {error && <p style={{ color: '#f87171', fontSize: '18px' }}>{error}</p>}

      {quote && (
        <div style={styles.card}>
          <h4 style={{ color: '#34d399', fontWeight: 500, marginBottom: '8px' }}>Quote Ready</h4>
          <p style={{ fontSize: '18px', color: '#d1d5db' }}>Send: {(Number(quote.estimate.fromAmount) / 1e6).toFixed(2)} USDC on {selectedChainName}</p>
          <p style={{ fontSize: '18px', color: '#d1d5db' }}>Receive: {(Number(quote.estimate.toAmount) / 1e6).toFixed(2)} USDC in vault</p>
          <p style={{ fontSize: '18px', color: '#6b7280' }}>Route: {quote.tool} • ~{Math.ceil(quote.estimate.executionDuration / 60)} min</p>
          <button onClick={() => alert('Cross-chain execution coming soon!')}
            style={{ ...styles.button, backgroundColor: '#22c55e', marginTop: '12px' }}>
            Execute Bridge
          </button>
        </div>
      )}
    </div>
  )
}

function DepositForm({ vaultAddress, userBalance, onSuccess }: { vaultAddress: `0x${string}`; userBalance: bigint | undefined; onSuccess: () => void }) {
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<'approve' | 'deposit'>('approve')

  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract()
  const { writeContract: writeDeposit, data: depositHash, isPending: isDepositPending } = useWriteContract()
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({ hash: depositHash })

  useEffect(() => { if (isApproveSuccess) setStep('deposit') }, [isApproveSuccess])
  useEffect(() => { if (isDepositSuccess) { setAmount(''); setStep('approve'); onSuccess() } }, [isDepositSuccess, onSuccess])

  const maxBalance = userBalance ? formatUnits(userBalance, 6) : '0'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '18px', color: '#9ca3af', marginBottom: '8px' }}>Amount (USDC)</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ ...styles.input, flex: 1 }} />
          <button onClick={() => setAmount(maxBalance)} style={{ backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '12px', padding: '12px 16px', cursor: 'pointer' }}>MAX</button>
        </div>
        <p style={{ fontSize: '18px', color: '#6b7280', marginTop: '8px' }}>Available: {maxBalance} USDC</p>
      </div>

      {step === 'approve' ? (
        <button onClick={() => writeApprove({ address: SUPPORTED_TOKENS.USDC as `0x${string}`, abi: erc20Abi, functionName: 'approve', args: [vaultAddress, parseUnits(amount || '0', 6)] })}
          disabled={!amount || isApprovePending || isApproveConfirming}
          style={{ ...styles.button, ...(!amount || isApprovePending || isApproveConfirming ? styles.buttonDisabled : {}) }}>
          {isApprovePending ? 'Confirm in wallet...' : isApproveConfirming ? 'Approving...' : '1. Approve USDC'}
        </button>
      ) : (
        <button onClick={() => writeDeposit({ address: vaultAddress, abi: vaultAbi.abi, functionName: 'deposit', args: [SUPPORTED_TOKENS.USDC, parseUnits(amount || '0', 6)] })}
          disabled={!amount || isDepositPending || isDepositConfirming}
          style={{ ...styles.button, backgroundColor: '#22c55e', ...(!amount || isDepositPending || isDepositConfirming ? styles.buttonDisabled : {}) }}>
          {isDepositPending ? 'Confirm in wallet...' : isDepositConfirming ? 'Depositing...' : '2. Deposit to Vault'}
        </button>
      )}
    </div>
  )
}

function WithdrawForm({ vaultAddress, vaultBalance, onSuccess }: { vaultAddress: `0x${string}`; vaultBalance: bigint | undefined; onSuccess: () => void }) {
  const [amount, setAmount] = useState('')
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => { if (isSuccess) { setAmount(''); onSuccess() } }, [isSuccess, onSuccess])

  const maxBalance = vaultBalance ? formatUnits(vaultBalance, 6) : '0'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '18px', color: '#9ca3af', marginBottom: '8px' }}>Amount (USDC)</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ ...styles.input, flex: 1 }} />
          <button onClick={() => setAmount(maxBalance)} style={{ backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '12px', padding: '12px 16px', cursor: 'pointer' }}>MAX</button>
        </div>
        <p style={{ fontSize: '18px', color: '#6b7280', marginTop: '8px' }}>Vault balance: {maxBalance} USDC</p>
      </div>

      <button onClick={() => writeContract({ address: vaultAddress, abi: vaultAbi.abi, functionName: 'withdraw', args: [SUPPORTED_TOKENS.USDC, parseUnits(amount || '0', 6)] })}
        disabled={!amount || isPending || isConfirming}
        style={{ ...styles.button, backgroundColor: '#f97316', ...(!amount || isPending || isConfirming ? styles.buttonDisabled : {}) }}>
        {isPending ? 'Confirm in wallet...' : isConfirming ? 'Withdrawing...' : 'Withdraw'}
      </button>
    </div>
  )
}

function AIInput({ onParsed }: { onParsed: (data: { recipient: string; amount: number; interval: number; description: string }) => void }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!message.trim()) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_URL}/api/parse`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })
      const data = await response.json()
      if (data.error) { setError(data.error); return }
      onParsed(data)
      setMessage('')
    } catch { setError('Could not connect to AI service') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ ...styles.card, marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '18px', color: '#d1d5db', fontWeight: 500, marginBottom: '12px' }}>Describe your payment in plain English</label>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder='e.g. "pay alice.eth 100 USDC every week"' disabled={loading}
          style={{ ...styles.input, flex: 1, borderRadius: '9999px' }} />
        <button onClick={handleSubmit} disabled={loading || !message.trim()}
          style={{ ...styles.button, width: 'auto', ...(loading || !message.trim() ? styles.buttonDisabled : {}) }}>
          {loading ? '...' : 'Parse'}
        </button>
      </div>
      {error && <p style={{ color: '#f87171', fontSize: '18px', marginTop: '8px' }}>{error}</p>}
    </div>
  )
}

function PaymentRulesTab({ vaultAddress, refreshKey, onRuleCreated, onRuleExecuted }: { vaultAddress: `0x${string}`; refreshKey: number; onRuleCreated: () => void; onRuleExecuted: () => void }) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [prefill, setPrefill] = useState<{ recipient: string; amount: string; interval: string; description: string } | null>(null)

  const handleAIParsed = (data: { recipient: string; amount: number; interval: number; description: string }) => {
    setPrefill({ recipient: data.recipient, amount: String(data.amount), interval: String(data.interval), description: data.description })
    setShowCreateForm(true)
  }

  return (
    <div>
      <AIInput onParsed={handleAIParsed} />

      {!showCreateForm ? (
        <button onClick={() => { setPrefill(null); setShowCreateForm(true) }}
          style={{ ...styles.button, backgroundColor: '#374151', marginBottom: '24px' }}>
          + Create Payment Rule
        </button>
      ) : (
        <CreateRuleForm vaultAddress={vaultAddress} prefill={prefill}
          onSuccess={() => { setShowCreateForm(false); setPrefill(null); onRuleCreated() }}
          onCancel={() => { setShowCreateForm(false); setPrefill(null) }} />
      )}

      <RulesList vaultAddress={vaultAddress} refreshKey={refreshKey} onRuleExecuted={onRuleExecuted} onRuleCancelled={onRuleCreated} />
    </div>
  )
}

function CreateRuleForm({ vaultAddress, prefill, onSuccess, onCancel }: { vaultAddress: `0x${string}`; prefill: { recipient: string; amount: string; interval: string; description: string } | null; onSuccess: () => void; onCancel: () => void }) {
  const [recipient, setRecipient] = useState(prefill?.recipient || '')
  const [amount, setAmount] = useState(prefill?.amount || '')
  const [interval, setInterval] = useState(prefill?.interval || '0')
  const [description, setDescription] = useState(prefill?.description || '')

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => { if (isSuccess) onSuccess() }, [isSuccess, onSuccess])

  return (
    <div style={{ ...styles.card, marginBottom: '24px' }}>
      <h3 style={{ fontWeight: 600, marginBottom: '16px' }}>Create Payment Rule</h3>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '18px', color: '#9ca3af', marginBottom: '8px' }}>Recipient Address</label>
        <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0x..." style={styles.input} />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '18px', color: '#9ca3af', marginBottom: '8px' }}>Amount (USDC)</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={styles.input} />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '18px', color: '#9ca3af', marginBottom: '8px' }}>Frequency</label>
        <select value={interval} onChange={(e) => setInterval(e.target.value)} style={styles.input}>
          <option value="0">One-time payment</option>
          <option value="60">Every minute (testing)</option>
          <option value="3600">Hourly</option>
          <option value="86400">Daily</option>
          <option value="604800">Weekly</option>
          <option value="2592000">Monthly (30 days)</option>
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '18px', color: '#9ca3af', marginBottom: '8px' }}>Description</label>
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Rent payment" style={styles.input} />
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button onClick={() => writeContract({ address: vaultAddress, abi: vaultAbi.abi, functionName: 'createRule', args: [SUPPORTED_TOKENS.USDC, recipient, parseUnits(amount || '0', 6), BigInt(interval), description || 'Payment rule'] })}
          disabled={!recipient || !amount || isPending || isConfirming}
          style={{ ...styles.button, flex: 1, ...(!recipient || !amount || isPending || isConfirming ? styles.buttonDisabled : {}) }}>
          {isPending ? 'Confirm...' : isConfirming ? 'Creating...' : 'Create Rule'}
        </button>
        <button onClick={onCancel} style={{ backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '9999px', padding: '12px 24px', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

function RulesList({ vaultAddress, refreshKey, onRuleExecuted, onRuleCancelled }: { vaultAddress: `0x${string}`; refreshKey: number; onRuleExecuted: () => void; onRuleCancelled: () => void }) {
  const { data: ruleCount } = useReadContract({ address: vaultAddress, abi: vaultAbi.abi, functionName: 'ruleCount', scopeKey: `rules-${refreshKey}` })
  const count = Number(ruleCount || 0)

  if (count === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280' }}>
        <p>No payment rules yet.</p>
        <p style={{ fontSize: '18px' }}>Create your first autopilot payment above!</p>
      </div>
    )
  }

  return (
    <div>
      <h3 style={{ fontWeight: 600, color: '#d1d5db', marginBottom: '12px' }}>Your Payment Rules</h3>
      {Array.from({ length: count }, (_, i) => (
        <RuleCard key={`${refreshKey}-${i}`} vaultAddress={vaultAddress} ruleId={i} onExecuted={onRuleExecuted} onCancelled={onRuleCancelled} />
      ))}
    </div>
  )
}

function RuleCard({ vaultAddress, ruleId, onExecuted, onCancelled }: { vaultAddress: `0x${string}`; ruleId: number; onExecuted: () => void; onCancelled: () => void }) {
  const { data: rule } = useReadContract({ address: vaultAddress, abi: vaultAbi.abi, functionName: 'getRule', args: [BigInt(ruleId)] })
  const { writeContract: executeWrite, data: executeHash, isPending: isExecuting } = useWriteContract()
  const { isLoading: isExecuteConfirming, isSuccess: isExecuteSuccess } = useWaitForTransactionReceipt({ hash: executeHash })
  const { writeContract: cancelWrite, data: cancelHash, isPending: isCancelling } = useWriteContract()
  const { isLoading: isCancelConfirming, isSuccess: isCancelSuccess } = useWaitForTransactionReceipt({ hash: cancelHash })

  useEffect(() => { if (isExecuteSuccess) onExecuted() }, [isExecuteSuccess, onExecuted])
  useEffect(() => { if (isCancelSuccess) onCancelled() }, [isCancelSuccess, onCancelled])

  const ruleData = rule as { id: bigint; token: string; recipient: string; amount: bigint; interval: bigint; lastExecuted: bigint; active: boolean; description: string } | undefined
  if (!ruleData || !ruleData.active) return null

  return (
    <div style={{ ...styles.card, marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <p style={{ fontWeight: 500 }}>{ruleData.description}</p>
          <p style={{ fontSize: '18px', color: '#6b7280' }}>To: {ruleData.recipient.slice(0, 6)}...{ruleData.recipient.slice(-4)}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 'bold', color: '#34d399' }}>{formatUnits(ruleData.amount, 6)} USDC</p>
          <p style={{ fontSize: '18px', color: '#6b7280' }}>{formatInterval(ruleData.interval)}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => executeWrite({ address: vaultAddress, abi: vaultAbi.abi, functionName: 'executeRule', args: [BigInt(ruleId)] })}
          disabled={isExecuting || isExecuteConfirming}
          style={{ ...styles.button, flex: 1, backgroundColor: '#22c55e', padding: '8px 16px', fontSize: '18px', ...(isExecuting || isExecuteConfirming ? styles.buttonDisabled : {}) }}>
          {isExecuting || isExecuteConfirming ? 'Executing...' : '▶ Execute'}
        </button>
        <button onClick={() => cancelWrite({ address: vaultAddress, abi: vaultAbi.abi, functionName: 'cancelRule', args: [BigInt(ruleId)] })}
          disabled={isCancelling || isCancelConfirming}
          style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '9999px', padding: '8px 16px', cursor: 'pointer', ...(isCancelling || isCancelConfirming ? styles.buttonDisabled : {}) }}>
          {isCancelling || isCancelConfirming ? '...' : '✕'}
        </button>
      </div>
    </div>
  )
}

export default App
