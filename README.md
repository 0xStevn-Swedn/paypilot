# ✈️ PayPilot

**AI-Powered Autonomous Crypto Payment Agent**

PayPilot is a smart payment assistant that lets you manage crypto payments using natural language. Just tell it what you want: "Pay vitalik.eth 100 USDC every week" and it handles the rest.

Built for HackMoney 2026.

---

## 🎯 What It Does

- **Talk to your wallet**: Use plain English to create payments, check balances, and manage rules
- **Automated payments**: Set up one-time or recurring payments (daily, weekly, monthly)
- **Cross-chain deposits**: Bridge tokens from any chain into your vault using LI.FI
- **Safety limits**: Set daily and weekly spending limits to protect your funds
- **Multi-chain**: Deployed on Sepolia and Arc Testnet

---

## 🏗️ Architecture
```
┌────────────────────────────────────────────────────────────────────┐
│                            USER                                    │
│                     Browser + MetaMask                             │
└────────────────────────────────┬───────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                  │
│                      React + RainbowKit                            │
│                                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │   Agent     │  │   Deposit   │  │  Payment    │  │  Cross-   │  │
│  │   Chat      │  │  Withdraw   │  │   Rules     │  │  Chain    │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │
└─────────┼────────────────┼────────────────┼───────────────┼────────┘
          │                │                │               │
          │ HTTP           │ Transaction    │ Transaction   │ HTTP
          ▼                ▼                ▼               ▼
┌──────────────────┐    ┌─────────────────────────────────────────────┐
│     BACKEND      │    │              BLOCKCHAIN                     │
│  Node.js Server  │    │         Sepolia / Arc Testnet               │
│                  │    │                                             │
│ ┌──────────────┐ │    │  ┌─────────────────────────────────────┐    │
│ │   /api/agent │ │    │  │         PayPilotFactory             │    │
│ │   (OpenAI)   │ │    │  │  • createVault()                    │    │
│ └──────────────┘ │    │  │  • getVault(user)                   │    │
│                  │    │  └─────────────────────────────────────┘    │
│ ┌──────────────┐ │    │                    │                        │
│ │  /api/quote  │ │    │                    │ deploys                │
│ │   (LI.FI)    │ │    │                    ▼                        │
│ └──────────────┘ │    │  ┌─────────────────────────────────────┐    │
└──────────────────┘    │  │          PayPilotVault              │    │
          │             │  │  • deposit() / withdraw()           │    │
          │             │  │  • createRule() / executeRule()     │    │
          ▼             │  │  • Safety limits (daily/weekly)     │    │
┌──────────────────┐    │  └─────────────────────────────────────┘    │
│ EXTERNAL SERVICES│    └─────────────────────────────────────────────┘
│                  │
│ • OpenAI API     │
│   (GPT-4o-mini)  │
│                  │
│ • LI.FI SDK      │
│   (Cross-chain)  │
└──────────────────┘
```

---

## 🛠️ Tech Stack

| Layer           | Technology                      |
|-----------------|---------------------------------|
| Smart Contracts | Solidity, Foundry, OpenZeppelin |
| Backend         | Node.js, Express, TypeScript    |
| Frontend        | React, Vite, TailwindCSS        |
| Wallet          | RainbowKit, wagmi, viem         |
| AI              | OpenAI GPT-4o-mini              |
| Cross-chain     | LI.FI SDK                       |
| Chains          | Sepolia, Arc Testnet            |

---

## 📁 Project Structure
```
paypilot/
├── contracts/                 # Solidity smart contracts
│   ├── src/
│   │   ├── PayPilotVault.sol     # User vault with payment rules
│   │   └── PayPilotFactory.sol   # Factory to create vaults
│   └── script/
│       └── Deploy.s.sol          # Deployment script
│
├── backend/                   # Node.js API server
│   └── src/
│       ├── index.ts              # Express server and routes
│       ├── agent.ts              # Conversational AI agent
│       ├── ai.ts                 # Payment intent parser
│       └── lifi.ts               # Cross-chain quotes
│
└── frontend/                  # React web application
    └── src/
        ├── App.tsx               # Main UI components
        ├── wagmi.ts              # Chain configuration
        └── contracts.ts          # Contract addresses
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js
- Foundry (for contracts)
- MetaMask wallet
- OpenAI API key

### 1. Clone and Install
```bash
git clone https://github.com/yourusername/paypilot.git
cd paypilot

# Install frontend
cd frontend && npm install

# Install backend
cd ../backend && npm install

# Install contracts
cd ../contracts && forge install
```

### 2. Environment Setup

Create `backend/.env`:
```
OPENAI_API_KEY=sk-your-key-here
PORT=3001
```

Create `contracts/.env`:
```
PRIVATE_KEY=0xyour-private-key
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
```

### 3. Run Locally

Terminal 1 - Backend:
```bash
cd backend && npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend && npm run dev
```

Open http://localhost:5173 in your browser.

---

## 📜 Smart Contract Addresses

| Chain       | Contract        | Address                                      |
|-------------|-----------------|----------------------------------------------|
| Sepolia     | PayPilotFactory | `0x17A4aadAAc179d5bf9Aff2e5fb00aCBd551f45C3` |
| Arc Testnet | PayPilotFactory | `0x17A4aadAAc179d5bf9Aff2e5fb00aCBd551f45C3` |

---

## 🤖 AI Agent Commands

The AI agent understands natural language. Try these:

| What you say                           | What happens                   |
|----------------------------------------|--------------------------------|
| "Pay alice.eth 100 USDC weekly"        | Creates a weekly payment rule  |
| "Send 50 USDC to 0x123... every month" | Creates a monthly payment rule |
| "What's my balance?"                   | Shows your vault balance       |
| "Show my payment rules"                | Lists all active rules         |
| "Bridge 100 USDC from Arbitrum"        | Gets a cross-chain quote       |
| "Help"                                 | Shows available commands       |

---

## 🏆 Sponsor Integrations

### LI.FI

**Best AI x LI.FI Smart App** — PayPilot uses LI.FI as its cross-chain execution layer. The AI agent can get bridge quotes and the frontend shows real-time routing from 6+ chains.

**Best Use of LI.FI Composer** — Users can deposit from any supported chain into their vault. LI.FI finds the best route automatically.

Integration:
- `backend/src/lifi.ts` — SDK integration for quotes
- `frontend/src/App.tsx` — CrossChainDeposit component

### Arc / Circle

**Build Global Payouts and Treasury Systems** — PayPilot is deployed on Arc Testnet, demonstrating automated USDC payouts with rule-based logic.

Integration:
- Contracts deployed on Arc Testnet (Chain ID: 5042002)
- USDC as native gas token
- Multi-chain support in frontend

---

## 🔒 Security Features

1. **Owner-only withdrawals** — Only vault owner can withdraw funds
2. **Spending limits** — Set daily and weekly caps
3. **Rule management** — Only owner can create and cancel rules
4. **No private key storage** — All transactions signed by user's wallet

---

## 📝 How It Works

### Creating a Payment Rule

1. User types: "Pay bob.eth 50 USDC every week"
2. Frontend sends message to `/api/agent`
3. OpenAI parses intent and returns structured data
4. Frontend shows "Create Rule" button
5. User clicks → MetaMask opens → Transaction signed
6. Smart contract stores the rule

### Executing a Payment

1. Anyone can call `executeRule(ruleId)` on the vault
2. Contract checks: Is rule active? Is timing correct? Is balance enough?
3. If all checks pass, tokens transfer to recipient
4. `lastExecuted` timestamp updates

### Cross-Chain Deposit

1. User selects source chain and amount
2. Frontend calls `/api/quote` with parameters
3. LI.FI SDK returns best route and estimated output
4. User sees quote (send X, receive Y, time estimate)
5. (Execution coming soon)

---

## 🎥 Demo Video

[Link to 3-minute demo video]

---

## 👨‍💻 Team

Built with coffee and <3 by StevnSwedn for HackMoney 2026.

---

## 📄 License

MIT License
