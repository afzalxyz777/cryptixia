// components/Web3Provider.tsx
import { WagmiConfig } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { wagmiClient, chains } from '../lib/wagmi'

interface Web3ProviderProps {
  children: React.ReactNode
}

export default function Web3Provider({ children }: Web3ProviderProps) {
  // Create QueryClient only on client side
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig client={wagmiClient}>
        <RainbowKitProvider chains={chains}>
          {children}
        </RainbowKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  )
}