import { createConfig, getQuote, getChains } from '@lifi/sdk'

// Initialize THE LI.FI SDK
createConfig({
  integrator: 'paypilot',
})

// Sepolia USDC address (where the vault lives)
const SEPOLIA_USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
const SEPOLIA_CHAIN_ID = 11155111

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
      toChain: SEPOLIA_CHAIN_ID,
      fromToken: params.fromTokenAddress,
      toToken: SEPOLIA_USDC,
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
