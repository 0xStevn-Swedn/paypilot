import OpenAI from 'openai'
import dotenv from 'dotenv'

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export type AgentAction =
  | { type: 'create_rule'; recipient: string; amount: number; token: string; interval: number; description: string }
  | { type: 'check_balance' }
  | { type: 'list_rules' }
  | { type: 'cross_chain_quote'; fromChain: string; amount: number }
  | { type: 'help' }
  | null

export interface AgentResponse {
  message: string
  action: AgentAction
}

const SYSTEM_PROMPT = `You are PayPilot, an AI-powered crypto payment assistant. You help users manage their payment vault.

IMPORTANT: For payment recipients, you MUST use full Ethereum addresses (0x...). If user says "vitalik.eth" or any .eth name, use these known addresses:
- vitalik.eth = 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
- If you don't know the address, ask the user for the full 0x address.

You can help with:
1. Creating payment rules (one-time or recurring)
2. Checking vault balance
3. Listing payment rules  
4. Cross-chain deposit quotes

Respond with JSON only:

For creating a payment:
{"message": "I'll set up a weekly payment of 50 USDC to 0xd8dA... for you.", "action": {"type": "create_rule", "recipient": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "amount": 50, "token": "USDC", "interval": 604800, "description": "Weekly payment to vitalik.eth"}}

Intervals: 0 = one-time, 60 = every minute (testing), 3600 = hourly, 86400 = daily, 604800 = weekly, 2592000 = monthly

For checking balance:
{"message": "Your current vault balance is shown above in the dashboard. The Vault Balance card shows your deposited USDC ready for payments.", "action": {"type": "check_balance"}}

For listing rules:
{"message": "Your active payment rules are shown in the Rules tab. Click on Rules above to see and manage them.", "action": {"type": "list_rules"}}

For cross-chain bridging:
{"message": "I'll help you bridge from Arbitrum. Go to the Bridge tab to get a quote.", "action": {"type": "cross_chain_quote", "fromChain": "arbitrum", "amount": 100}}

Chain names: arbitrum, base, optimism, polygon, bsc, avalanche

For general questions:
{"message": "PayPilot helps you automate crypto payments! You can set up recurring payments, and I'll execute them automatically from your vault.", "action": null}

For help:
{"message": "Here's what I can do:\\n\\n• Create payments: 'Pay 0x... 100 USDC weekly'\\n• Check balance: Look at the Vault Balance card above\\n• View rules: Click the Rules tab\\n• Bridge funds: Click the Bridge tab\\n\\nTip: Use full 0x addresses for recipients!", "action": null}

Always respond with valid JSON. Be friendly and concise. ALWAYS use 0x addresses, never .eth names in the action.`

export async function processAgentMessage(userMessage: string): Promise<AgentResponse> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const content = response.choices[0]?.message?.content || ''
    console.log('Agent raw response:', content)

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        message: "I didn't quite understand that. Try something like 'Pay 0x... 50 USDC weekly' or 'Help'",
        action: null
      }
    }

    const parsed = JSON.parse(jsonMatch[0])
    
    // Validate that recipient is a real address if it's a create_rule action
    if (parsed.action?.type === 'create_rule') {
      const recipient = parsed.action.recipient
      if (!recipient || !recipient.startsWith('0x') || recipient.length !== 42) {
        return {
          message: "I need a valid Ethereum address (0x...) for the recipient. Could you provide the full address?",
          action: null
        }
      }
    }
    
    return {
      message: parsed.message || "I'm here to help!",
      action: parsed.action || null
    }

  } catch (error) {
    console.error('Agent error:', error)
    return {
      message: "Sorry, I encountered an error. Please try again.",
      action: null
    }
  }
}
