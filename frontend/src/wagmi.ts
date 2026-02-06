import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia } from 'wagmi/chains'
import { defineChain } from 'viem'

// Wallet and chain configuration.

// Configures RainbowKit (wallet connection) and defines which chains to support:
// - Sepolia (Ethereum testnet)
// - Arc Testnet (Circle's new L1)

// Define the Arc testnet as a custom chain
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
})

export const config = getDefaultConfig({
  appName: 'PayPilot',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
  chains: [sepolia, arcTestnet],
})
