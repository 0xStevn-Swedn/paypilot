import { createConfig, getQuote, getChains } from '@lifi/sdk'

// Initialize THE LI.FI SDK
createConfig({
  integrator: 'paypilot',
})

// Using mainnet USDC for quotes (LI.FI doesn't support testnets)
// In production this would match the actual vault deployment chain
const DEST_USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const DEST_CHAIN_ID = 1 // Ethereum mainnet

// Get a cross-chain quote for depositing into the vault
export async function getCrossChainQuote(params: {
  fromChainId: number
  fromTokenAddress: string
  fromAmount: string
  fromAddress: string
}) {
  try {
    const quote = await getQuote({
      fromChain: params.fromChainId,
      toChain: DEST_CHAIN_ID,
      fromToken: params.fromTokenAddress,
      toToken: DEST_USDC,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
    })

    return {
      estimate: {
        fromAmount: quote.estimate.fromAmount,
        toAmount: quote.estimate.toAmount,
        gasCosts: quote.estimate.gasCosts,
        executionDuration: quote.estimate.executionDuration,
      },
      tool: quote.tool,
      type: quote.type,
    }
  } catch (error) {
    console.error('LI.FI quote error:', error)
    return { error: 'Failed to get cross-chain quote' }
  }
}

// Get list of the supported chains
export async function getSupportedChains() {
  try {
    const chains = await getChains()
    // Return a simplified list of the supported chains
    return chains.map(chain => ({
      id: chain.id,
      name: chain.name,
      nativeToken: chain.nativeToken?.symbol,
    }))
  } catch (error) {
    console.error('LI.FI chains error:', error)
    return []
  }
}
