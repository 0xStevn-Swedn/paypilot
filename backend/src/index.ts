import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { parsePaymentIntent } from './ai.js'

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

app.listen(PORT, () => {
  console.log(`PayPilot backend running on http://localhost:${PORT}`)
})
