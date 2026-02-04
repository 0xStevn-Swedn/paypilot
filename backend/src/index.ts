import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { parsePaymentIntent } from './ai.js'
import { getCrossChainQuote, getSupportedChains } from './lifi.js'
import { processAgentMessage } from './agent.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// SImple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'paypilot-backend' })
})

// Parse a natural language query into payment intention through OpenAI
app.post('/api/parse', async (req, res) => {
  const { message } = req.body

  if (!message) {
    return res.status(400).json({ error: 'A message is required' })
  }

  console.log('Parsing:', message)
  const result = await parsePaymentIntent(message)
  console.log('Result:', result)

  res.json(result)
})

// AI agent conversation (general) endpoint
app.post('/api/agent', async (req, res) => {
  const { message } = req.body

  if (!message) {
    return res.status(400).json({ error: 'Message is required' })
  }

  console.log('Agent input:', message)
  const result = await processAgentMessage(message)
  console.log('Agent output:', result)

  res.json(result)
})

// Get a cross-chain "quote" for depositing into vault
app.post('/api/quote', async (req, res) => {
  const { fromChainId, fromTokenAddress, fromAmount, fromAddress } = req.body

  if (!fromChainId || !fromTokenAddress || !fromAmount || !fromAddress) {
    return res.status(400).json({ error: 'Missing required fields: fromChainId, fromTokenAddress, fromAmount, fromAddress' })
  }

  console.log('Getting quote:', { fromChainId, fromTokenAddress, fromAmount })
  const result = await getCrossChainQuote({ fromChainId, fromTokenAddress, fromAmount, fromAddress })
  console.log('Quote result:', result)

  res.json(result)
})

// Get the supported chains
app.get('/api/chains', async (req, res) => {
  const chains = await getSupportedChains()
  res.json(chains)
})

app.listen(PORT, () => {
  console.log(`PayPilot backend running on http://localhost:${PORT}`)
})
