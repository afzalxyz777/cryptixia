import { configureChains, createClient } from 'wagmi'
import { mainnet, polygon, optimism, arbitrum, avalancheFuji } from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'
import { getDefaultWallets } from '@rainbow-me/rainbowkit'

// 1. Configure chains (added avalancheFuji 👇)
const { chains, provider } = configureChains(
  [mainnet, polygon, optimism, arbitrum, avalancheFuji],
  [publicProvider()]
)

// 2. Setup connectors
const { connectors } = getDefaultWallets({
  appName: 'Cryptixia',
  chains,
})

// 3. Create wagmi client
export const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
})

// 4. Export chains so RainbowKitProvider can use them
export { chains }
