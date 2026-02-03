import OpenAI from 'openai'
import dotenv from 'dotenv'

// Load .env before reading the API key
dotenv.config()

// Initialie the OpenAI client
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY})

// The interface structure we want the AI to return
export interface PaymentIntent {
    recipient: string
    amount: number
    token: string
    interval: number
    description: string
    confidence: number
}

// THe system prompt thwt tells the AI how to parse the payement instructions for the PayPilot app
const SYSTEM_PROMPT = `You are a payment intent parser for the PayPilot app, a crypto payement automation app.

Parse user messages into structuresd payement data. Extract:
- recipient: Ethereum address or ENS name (like alice.eth)
- amount: numeric value
- token: the token mentioned (USDC, ETH, BTC) - default to USDC if not specified
- interval: payement frequency in seconds (0 = one-time)
- description: A brief description of the payement

Interval values:
- One-time or a single payement = 0
- every minute = 60
- hourly = 3600
- daily = 86400
- weekly = 604800
- monthly = 2592000

respond ONLY with a valid JSON like the following example, no other text:
{
    "recipient": "alice.eth",
    "amount": 100,
    "token": USDC,
    "interval": 604800,
    "description": "Weekly payment to Alice",
    "confidence": 0.95
}

If you cannot parse the message, respond with:
{
    "error": Could not understand. Please specify recipient and amount."
    "confidence": 0
}`

// Parse the natural language message of the user into a payment intent
export async function parsePaymentIntent(message: string): Promise<PaymentIntent | {error: string }> {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: message }            
            ],
            temperature: 0.1,
            max_tokens: 200,
        })

        const content = response.choices[0]?.message?.content || ''

            console.log('Raw AI response:', content)

        // Extract the JSON structure from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            return {error: 'Failed to parse the AI response' }
        }

        const parsed = JSON.parse(jsonMatch[0])
        return parsed

    } catch (error) {
     console.error('OpenAI API error:', error)
     return { error: 'AI service error. Please try again in a moment.' }
    }
}
