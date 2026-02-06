import OpenAI from 'openai'
import dotenv from 'dotenv'

// Conversational AI agent using OpenAI.

// More advanced than `ai.ts`. The agent understands multiple commands:
// - Create payment rules
// - Check balance
// - List rules
// - Get cross-chain quotes
// - Answer questions

// Returns a message (to show the user) and an action (to execute on-chain).

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// The agent can perform the following list of defined actions
export type AgentAction = 
  | { type: 'create_rule'; recipient: string; amount: number; token: string; interval: number; description: string }
  | { type: 'check_balance' }
  | { type: 'list_rules' }
  | { type: 'cross_chain_quote'; fromChain: string; amount: number }
  | { type: 'help' }
  | { type: 'conversation'; message: string }

export interface AgentResponse {
  message: string
  action: AgentAction | null
}

const SYSTEM_PROMPT = `You are PayPilot, an AI-powered crypto payment assistant. You help users manage their payment vault through natural conversation.

You can help users with the following list of actions:
1. Creating payment rules (one-time or recurring payments)
2. Checking their vault balance
3. Listing their active payment rules
4. Getting cross-chain deposit quotes (bridge from other chains)
5. General questions about how PayPilot works

When the user wants to perform an action, respond with JSON containing the following elements:
- "message": A friendly response to show the user
- "action": The action to perform (or null for just conversation)

Action types:
1. Create a payment rule:
{"message": "I'll set up a weekly payment of 50 USDC to vitalik.eth for you.", "action": {"type": "create_rule", "recipient": "vitalik.eth", "amount": 50, "token": "USDC", "interval": 604800, "description": "Weekly payment to Alice"}}

Intervals: 0 = one-time, 60 = every minute (for testing purpse), 3600 = hourly, 86400 = daily, 604800 = weekly, 2592000 = monthly

2. Check balance:
{"message": "Let me check your vault balance.", "action": {"type": "check_balance"}}

3. List rules:
{"message": "Here are your active payment rules.", "action": {"type": "list_rules"}}

4. Cross-chain quote:
{"message": "I'll get you a quote to bridge from Arbitrum.", "action": {"type": "cross_chain_quote", "fromChain": "arbitrum", "amount": 100}}

Chain names: arbitrum, base, optimism, polygon, bsc, avalanche

5. Just conversation (no action needed):
{"message": "PayPilot is your AI-powered payment assistant! I can help you set up automatic payments, check balances, and bridge funds from other chains.", "action": null}

6. Help:
{"message": "Here's what I can do for you:\\n\\n• Create payments: 'Pay vitalik.eth 100 USDC weekly'\\n• Check balance: 'What's my balance?'\\n• List rules: 'Show my payment rules'\\n• Bridge funds: 'Bridge 50 USDC from Arbitrum'\\n\\nJust tell me what you need!", "action": {"type": "help"}}

Always respond with valid JSON only. Be friendly and concise.`

// Export the agent message
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

    // Parse the JSON response from 4o-mini 
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        message: "I didn't quite understand that. Could you rephrase?",
        action: null
      }
    }

    const parsed = JSON.parse(jsonMatch[0])
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
