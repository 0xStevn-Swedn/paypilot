export const FACTORY_ADDRESS = "0x17A4aadAAc179d5bf9Aff2e5fb00aCBd551f45C3" as const

export const SUPPORTED_TOKENS = {
  // Sepolia USDC (Circle's testnet USDC)
  USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
} as const

// The Arc testnet uses USDC - native gas token, also available as ERC20
// On Arc, USDC is the native currency so vault deposits work differently
// For this hackathon, we will use multi-chain support via the chain switcher
export const ARC_CHAIN_ID = 5042002
export const SEPOLIA_CHAIN_ID = 11155111